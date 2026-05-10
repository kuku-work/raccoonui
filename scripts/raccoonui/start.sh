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
#   - Closing the console (Ctrl-C / SIGTERM) terminates daemon + web + desktop.
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

# ── pre-start update check ──
# Notify-only: prompts but never auto-pulls without consent. Detect phase
# is best-effort (network errors / detached HEAD / no upstream branch
# silently skip); the update phase, once user picks Y, fails loud so the
# user never starts a half-rebuilt source. Default after 30s of no input
# is N → start with current source.
detect_ok=1
branch=""
behind=0
{
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then
        detect_ok=0
    fi
    if [ $detect_ok -eq 1 ]; then
        if ! git fetch origin --quiet 2>/dev/null; then
            detect_ok=0
        fi
    fi
    if [ $detect_ok -eq 1 ]; then
        behind=$(git rev-list --count "${branch}..origin/${branch}" 2>/dev/null || echo "")
        if [ -z "$behind" ]; then
            detect_ok=0
            behind=0
        fi
    fi
} || detect_ok=0

if [ $detect_ok -eq 1 ] && [ "$behind" -gt 0 ] 2>/dev/null; then
    printf "\n⚠️  origin/%s 領先本地 %s commits — 建議更新\n" "$branch" "$behind"
    printf "   立即更新? [Y/n]  (30 秒未輸入 → 直接啟動): "
    choice=""
    read -r -t 30 -n 1 choice || true
    printf "\n"
    case "${choice:-n}" in
        [Yy])
            printf "🔄 Pulling origin/%s...\n" "$branch"
            git pull origin "$branch" --ff-only
            printf "📦 pnpm install...\n"
            pnpm install
            printf "✅ updated, continuing to start\n"
            ;;
        *)
            printf "→ skipping update, starting current source\n"
            ;;
    esac
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

# Sit on tools-dev `run` (daemon+web). When user closes the console or the
# Electron window via tools-dev stop, this returns and trap cleanup runs.
wait "$DEV_PID"
