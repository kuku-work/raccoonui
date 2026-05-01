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

export OD_RESOURCE_ROOT=".raccoonui"
export OD_PORT="$PORT"

printf "🦝 RaccoonUI starting on http://127.0.0.1:%s/\n" "$PORT"

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
