#!/usr/bin/env bash
# Launch RaccoonUI in dev mode (pnpm tools-dev) + open Electron desktop window.
#
# Spawns daemon + web from source so SKILL.md / design-systems / craft /
# prompt-templates edits in `creative/raccoonui/` are picked up immediately
# (no .raccoonui/ snapshot indirection, no prebuild dist), then attaches
# the Electron desktop shell on top.
#
#   - Daemon API port: $OD_PORT or 17456
#   - Web UI port:     $OD_WEB_PORT or 17573
#   - Electron desktop window opens automatically once web is ready.
#   - Closing the console (Ctrl-C / SIGTERM) OR the Electron window both
#     shut down daemon + web + desktop together (Electron-watchdog polls
#     main PID alongside DEV_PID).
#
# Note: this is the in-repo author/operator entry point. The packaged release
# path (for installable .app distribution) lives in `tools/pack` and still
# uses prebuild dist + .raccoonui/ seed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACCOONUI_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DAEMON_PORT="${OD_PORT:-17456}"
WEB_PORT="${OD_WEB_PORT:-17573}"

cd "$RACCOONUI_DIR"

if [ ! -d "node_modules" ]; then
    printf "❌ node_modules 不在 — 先跑 %s/install.sh 或 pnpm install\n" "$SCRIPT_DIR"
    exit 1
fi

# ── pre-start update ──
# Auto-update with no prompt so coworkers always boot the latest source.
# Detect phase is best-effort (network down / detached HEAD / no upstream
# silently skip with a visible note so the user knows they are running
# un-checked source); the update phase fails loud so the user never
# starts a half-rebuilt source.
detect_ok=1
detect_skip_reason=""
branch=""
behind=0
{
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then
        detect_ok=0
        detect_skip_reason="detached HEAD"
    fi
    if [ $detect_ok -eq 1 ]; then
        if ! git fetch origin --quiet 2>/dev/null; then
            detect_ok=0
            detect_skip_reason="git fetch failed (offline?)"
        fi
    fi
    if [ $detect_ok -eq 1 ]; then
        behind=$(git rev-list --count "${branch}..origin/${branch}" 2>/dev/null || echo "")
        if [ -z "$behind" ]; then
            detect_ok=0
            detect_skip_reason="no origin/${branch} tracking branch"
            behind=0
        fi
    fi
} || { detect_ok=0; detect_skip_reason="${detect_skip_reason:-unexpected error}"; }

if [ $detect_ok -eq 0 ]; then
    printf "ℹ️  跳過更新檢查 (%s) — 跑 local source\n" "$detect_skip_reason"
elif [ "$behind" -gt 0 ] 2>/dev/null; then
    printf "\n⚠️  origin/%s 領先本地 %s commits — 自動更新中\n" "$branch" "$behind"
    printf "🔄 Pulling origin/%s...\n" "$branch"
    git pull origin "$branch" --ff-only
    printf "📦 pnpm install...\n"
    pnpm install
    printf "✅ updated, continuing to start\n"
fi

printf "🦝 RaccoonUI starting (dev mode, source-of-truth)\n"
printf "   daemon API: http://127.0.0.1:%s\n" "$DAEMON_PORT"
printf "   web UI:     http://127.0.0.1:%s\n" "$WEB_PORT"

# ── stale process hardening ──
# A prior run may have left detached daemon / web on these ports. Match
# by commandline before kill so we never axe unrelated services.
if command -v lsof >/dev/null 2>&1; then
    for p in "$DAEMON_PORT" "$WEB_PORT"; do
        while read -r stale_pid; do
            [ -n "$stale_pid" ] || continue
            stale_cmd=$(ps -p "$stale_pid" -o args= 2>/dev/null || true)
            if printf '%s' "$stale_cmd" | grep -qE '(node|tools-dev|next|raccoonui|electron)'; then
                printf "⚠️  killing stale process PID %s on :%s\n" "$stale_pid" "$p"
                kill "$stale_pid" 2>/dev/null || true
                sleep 0.5
            fi
        done < <(lsof -ti ":$p" 2>/dev/null || true)
    done
fi

# ── spawn pnpm tools-dev run ──
# `run` keeps the parent alive (vs `start` which daemonizes). When this
# console closes, tools-dev shuts down daemon + web cleanly.
pnpm tools-dev run \
    --daemon-port "$DAEMON_PORT" \
    --web-port "$WEB_PORT" &
DEV_PID=$!

# Trap cleanup on exit (Ctrl-C / SIGTERM / normal exit)
cleanup() {
    if kill -0 "$DEV_PID" 2>/dev/null; then
        kill "$DEV_PID" 2>/dev/null || true
    fi
    # Best-effort: tell tools-dev to clean up daemon + web it spawned
    pnpm tools-dev stop 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Wait for web to listen (web is what the user opens; daemon is upstream)
ready=""
for i in $(seq 1 90); do  # dev mode is slower than dist — give 90s
    if curl -fsS "http://127.0.0.1:$WEB_PORT/" >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 1
done

if [ -z "$ready" ]; then
    printf "❌ web 啟動 timeout (90s) — 看 'pnpm tools-dev logs' 查錯\n"
    exit 1
fi

# ── attach Electron desktop ──
# `tools-dev start desktop` is a separate (background-stamped) spawn that
# discovers the running web URL via sidecar IPC and pops a native window.
# `run` itself only covers daemon+web (DEFAULT_RUN_APPS in tools/dev), so
# desktop has to be kicked explicitly.
printf "✅ web ready — launching Electron desktop window...\n"
if ! pnpm tools-dev start desktop; then
    printf "⚠️  desktop 啟動失敗 — 仍可在瀏覽器開 http://127.0.0.1:%s/\n" "$WEB_PORT"
fi

# ── Electron watchdog ──
# `tools-dev run` only supervises daemon+web; closing the Electron window
# leaves the supervisor + its pnpm/cmd wrapper chain as orphans (matches the
# zombie shape we kept cleaning up before this patch). Find the Electron main
# PID (parent NOT in the electron family — helpers/renderers are children of
# main) and poll. When either Electron or DEV_PID exits, fall through to the
# trap cleanup which kills the supervisor + runs `tools-dev stop`.
get_electron_pids() {
    if command -v pgrep >/dev/null 2>&1; then
        pgrep -f "${RACCOONUI_DIR}.*[Ee]lectron" 2>/dev/null || true
    else
        ps -e -o pid=,args= 2>/dev/null | grep -E "${RACCOONUI_DIR}.*[Ee]lectron" | grep -v grep | awk '{print $1}' || true
    fi
}

electron_main=""
for i in $(seq 1 30); do
    electron_pids=$(get_electron_pids)
    if [ -n "$electron_pids" ]; then
        for pid in $electron_pids; do
            ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
            if [ -n "$ppid" ] && ! printf '%s\n' "$electron_pids" | grep -qx "$ppid"; then
                electron_main="$pid"
                break
            fi
        done
        [ -n "$electron_main" ] && break
    fi
    sleep 0.5
done

if [ -z "$electron_main" ]; then
    printf "⚠️  could not locate Electron main PID — close console to stop\n"
    wait "$DEV_PID"
else
    printf "🔗 watching Electron PID %s — close window or console to stop\n" "$electron_main"
    while true; do
        kill -0 "$DEV_PID" 2>/dev/null || break
        if ! kill -0 "$electron_main" 2>/dev/null; then
            printf "🏁 Electron closed — shutting down daemon + web\n"
            break
        fi
        sleep 1
    done
fi
