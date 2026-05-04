#!/usr/bin/env bash
# Initialize a raccoonui project with a slug-based id, init git inside it,
# create a private GitHub repo under the user's own account, and push.
#
# Usage:
#   ./git-init-project.sh <slug> [display-name]
#
# Env:
#   RACCOONUI_PORT   daemon port (default: 17456)
#
# Requires:
#   - daemon running (./start.sh)
#   - gh CLI installed and authed (`gh auth status`)
#   - gh token scope includes `repo` (delete_repo NOT required — we never delete remotes)

set -euo pipefail

usage() {
    printf "usage: %s <slug> [display-name]\n" "$(basename "$0")"
    printf "\n"
    printf "Creates a new raccoonui project with a slug-based id, inits git,\n"
    printf "creates a private GitHub repo under your own account, and pushes.\n"
    printf "\n"
    printf "Examples:\n"
    printf "  %s marketing-q3\n" "$(basename "$0")"
    printf "  %s pitch-deck \"James Pitch Deck\"\n" "$(basename "$0")"
    exit 1
}

SLUG="${1:-}"
NAME="${2:-$SLUG}"
[ -z "$SLUG" ] && usage

# Match daemon validator: /^[A-Za-z0-9._-]{1,128}$/
if ! [[ "$SLUG" =~ ^[A-Za-z0-9._-]{1,128}$ ]]; then
    printf "❌ invalid slug: must match [A-Za-z0-9._-] and be 1-128 chars\n"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACCOONUI_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PORT="${RACCOONUI_PORT:-17456}"
BASE="http://127.0.0.1:$PORT"

# --- 0. preflight ----------------------------------------------------------
if ! command -v gh >/dev/null 2>&1; then
    printf "❌ gh CLI not installed — install from https://cli.github.com/\n"
    exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
    printf "❌ gh CLI not authenticated — run: gh auth login\n"
    exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
    printf "❌ curl required\n"
    exit 1
fi
if ! curl -sS "$BASE/api/design-systems" >/dev/null 2>&1; then
    printf "❌ daemon not running on port %s — start it first: ./scripts/raccoonui/start.sh\n" "$PORT"
    exit 1
fi

GH_USER=$(gh api user --jq .login)
REPO_NAME="raccoonui-proj-$SLUG"
PROJECT_DIR="$RACCOONUI_DIR/.od/projects/$SLUG"

# --- 1. create project -----------------------------------------------------
printf "📝 creating project '%s' (slug=%s)...\n" "$NAME" "$SLUG"
NAME_JSON=$(printf '%s' "$NAME" | python -c 'import json,sys;print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '"%s"' "$NAME")
CREATE_RES=$(curl -sS -X POST "$BASE/api/projects" \
    -H 'Content-Type: application/json' \
    -d "{\"id\":\"$SLUG\",\"name\":$NAME_JSON}")
if echo "$CREATE_RES" | grep -q '"code"'; then
    printf "❌ POST /api/projects failed:\n  %s\n" "$CREATE_RES"
    exit 1
fi

# --- 2. git/init via daemon ------------------------------------------------
printf "🔧 git init...\n"
INIT_RES=$(curl -sS -X POST "$BASE/api/raccoonui/projects/$SLUG/git/init")
echo "  $INIT_RES"

# --- 3. gh repo create -----------------------------------------------------
printf "🚀 gh repo create %s/%s (private)...\n" "$GH_USER" "$REPO_NAME"
if gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
    printf "  ⚠️  repo already exists on GitHub — skipping create\n"
    if ! git -C "$PROJECT_DIR" remote get-url origin >/dev/null 2>&1; then
        REPO_URL=$(gh repo view "$GH_USER/$REPO_NAME" --json sshUrl --jq .sshUrl)
        git -C "$PROJECT_DIR" remote add origin "$REPO_URL"
        printf "  added existing repo as origin: %s\n" "$REPO_URL"
    fi
else
    gh repo create "$REPO_NAME" --private --source="$PROJECT_DIR" --remote="origin" --push=false 2>&1 | tail -1
fi

# --- 4. push via daemon ----------------------------------------------------
printf "📤 git push...\n"
PUSH_RES=$(curl -sS -X POST "$BASE/api/raccoonui/projects/$SLUG/git/push")
if echo "$PUSH_RES" | grep -q '"pushed":true'; then
    printf "  ✅ pushed\n"
else
    printf "  ⚠️  push response: %s\n" "$PUSH_RES"
fi

# --- 5. summary ------------------------------------------------------------
printf "\n✅ done\n"
printf "   project:   %s\n" "$PROJECT_DIR"
printf "   GitHub:    https://github.com/%s/%s\n" "$GH_USER" "$REPO_NAME"
printf "\n   next:\n"
printf "     - open RaccoonUI, picker shows '%s'\n" "$NAME"
printf "     - commit:   curl -X POST %s/api/raccoonui/projects/%s/git/commit -H 'Content-Type: application/json' -d '{\"message\":\"...\"}'\n" "$BASE" "$SLUG"
printf "     - push:     curl -X POST %s/api/raccoonui/projects/%s/git/push\n" "$BASE" "$SLUG"
printf "     - history:  curl %s/api/raccoonui/projects/%s/git/history\n" "$BASE" "$SLUG"
