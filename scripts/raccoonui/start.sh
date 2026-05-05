#!/usr/bin/env bash
# Launch RaccoonUI daemon + open browser. Usage-and-close mode.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACCOONUI_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PORT="${OD_PORT:-17456}"

cd "$RACCOONUI_DIR"

if [ ! -f "apps/daemon/dist/cli.js" ]; then
    printf "❌ daemon 還沒 build — 先跑 %s/install.sh\n" "$SCRIPT_DIR"
    exit 1
fi

# ── pre-start update check ──
# Notify-only: prompts but never auto-pulls without consent. Detect phase
# is best-effort (network errors / detached HEAD / no upstream branch
# silently skip); the update phase, once user picks Y, fails loud so the
# user never starts a half-rebuilt daemon. Default after 30s of no input
# is N → start with current build.
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
    # `read -t` exits non-zero on timeout; the trailing || keeps set -e from
    # firing so we fall through to the default-N branch.
    read -r -t 30 -n 1 choice || true
    printf "\n"
    case "${choice:-n}" in
        [Yy])
            printf "🔄 Pulling origin/%s...\n" "$branch"
            git pull origin "$branch" --ff-only
            printf "📦 pnpm install...\n"
            pnpm install
            printf "🔨 Rebuilding...\n"
            pnpm -r --workspace-concurrency=1 build
            printf "✅ updated, continuing to start\n"
            ;;
        *)
            printf "→ skipping update, starting current build\n"
            ;;
    esac
fi

export OD_RESOURCE_ROOT=".raccoonui"
export OD_PORT="$PORT"

printf "🦝 RaccoonUI starting on http://127.0.0.1:%s/\n" "$PORT"

# ── stale daemon hardening ──
# A prior start.sh may have left a detached daemon on this port. Without
# a kill the new spawn would EADDRINUSE. Match commandline before kill
# so we never axe an unrelated service that happens to bind the port.
if command -v lsof >/dev/null 2>&1; then
    while read -r stale_pid; do
        [ -n "$stale_pid" ] || continue
        stale_cmd=$(ps -p "$stale_pid" -o args= 2>/dev/null || true)
        if printf '%s' "$stale_cmd" | grep -q "apps/daemon/dist/cli.js"; then
            printf "⚠️  killing stale daemon PID %s on :%s\n" "$stale_pid" "$PORT"
            kill "$stale_pid" 2>/dev/null || true
            sleep 0.5
        fi
    done < <(lsof -ti ":$PORT" 2>/dev/null || true)
fi

# Background daemon
node apps/daemon/dist/cli.js --no-open --port "$PORT" &
DAEMON_PID=$!

# Trap cleanup on exit (Ctrl-C / SIGTERM / normal exit)
cleanup() {
    if kill -0 "$DAEMON_PID" 2>/dev/null; then
        kill "$DAEMON_PID" 2>/dev/null || true
    fi
}
trap cleanup INT TERM EXIT

# Wait for listen (30s timeout)
ready=""
for i in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:$PORT/api/design-systems" >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 1
done

if [ -z "$ready" ]; then
    printf "❌ daemon 啟動 timeout (30s)\n"
    exit 1
fi

printf "✅ daemon ready, opening browser...\n"

# Open browser (cross-platform)
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://127.0.0.1:$PORT/"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://127.0.0.1:$PORT/" >/dev/null 2>&1 &
fi

# Sit on daemon
wait "$DAEMON_PID"
