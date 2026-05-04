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
# Ensure git uses gh CLI as credential helper. Without this, `git push` to
# a private repo returns 404 Not Found (GitHub deliberately hides the
# existence of private repos from unauthenticated requests). Idempotent —
# safe to re-run.
gh auth setup-git 2>/dev/null || true
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
REPO_URL_HTTPS="https://github.com/$GH_USER/$REPO_NAME.git"

# --- 0.5 detect prior state ------------------------------------------------
# Catch the "fresh local + existing remote" trap early. If the local project
# dir has no .git but the GitHub repo exists, a `git init` here would create
# a divergent history that can't be pushed (non-fast-forward). User wants
# clone-project.sh, not init.
HAD_LOCAL_GIT=0
[ -d "$PROJECT_DIR/.git" ] && HAD_LOCAL_GIT=1
REMOTE_EXISTS=0
gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1 && REMOTE_EXISTS=1

if [ "$HAD_LOCAL_GIT" = "0" ] && [ "$REMOTE_EXISTS" = "1" ]; then
    printf "⚠️  remote repo '%s/%s' exists but local has no .git.\n" "$GH_USER" "$REPO_NAME"
    printf "   running git init here would create a divergent history that\n"
    printf "   can't be pushed (non-fast-forward). use clone instead:\n"
    printf "     ./scripts/raccoonui/clone-project.sh %s\n" "$REPO_URL_HTTPS"
    exit 1
fi

# --- 1. create project -----------------------------------------------------
printf "📝 creating project '%s' (slug=%s)...\n" "$NAME" "$SLUG"
NAME_JSON=$(printf '%s' "$NAME" | python -c 'import json,sys;print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '"%s"' "$NAME")
CREATE_RES=$(curl -sS -X POST "$BASE/api/projects" \
    -H 'Content-Type: application/json' \
    -d "{\"id\":\"$SLUG\",\"name\":$NAME_JSON}")
if echo "$CREATE_RES" | grep -q '"code"'; then
    if echo "$CREATE_RES" | grep -q "UNIQUE constraint failed"; then
        printf "  ⚠️  project '%s' already in DB — continuing (idempotent)\n" "$SLUG"
    else
        printf "❌ POST /api/projects failed:\n  %s\n" "$CREATE_RES"
        exit 1
    fi
fi

# --- 2. git/init via daemon ------------------------------------------------
printf "🔧 git init...\n"
INIT_RES=$(curl -sS -X POST "$BASE/api/raccoonui/projects/$SLUG/git/init")
echo "  $INIT_RES"

# --- 3. gh repo create -----------------------------------------------------
printf "🚀 gh repo create %s/%s (private)...\n" "$GH_USER" "$REPO_NAME"
SKIP_PUSH=
if [ "$REMOTE_EXISTS" = "1" ]; then
    printf "  ⚠️  repo already exists on GitHub — skipping create\n"
    # Always pin origin to HTTPS. preflight ran `gh auth setup-git` so HTTPS
    # auth is guaranteed. SSH would require the user's own SSH key + first-
    # connect host trust prompt, which can hang the script on a fresh mac.
    # `remote set-url` is idempotent and overwrites any leftover SSH URL
    # from a prior run.
    if git -C "$PROJECT_DIR" remote get-url origin >/dev/null 2>&1; then
        git -C "$PROJECT_DIR" remote set-url origin "$REPO_URL_HTTPS"
    else
        git -C "$PROJECT_DIR" remote add origin "$REPO_URL_HTTPS"
    fi
    printf "  origin pinned to: %s\n" "$REPO_URL_HTTPS"
    # If local HEAD already matches origin/main, the previous run completed
    # successfully — skip step 4 push. If origin/main is missing (empty repo,
    # never pushed) or HEADs diverge (retry / new local commits), fall
    # through to push so retry stays functional.
    git -C "$PROJECT_DIR" fetch origin --quiet 2>/dev/null || true
    LOCAL_HEAD=$(git -C "$PROJECT_DIR" rev-parse --verify HEAD 2>/dev/null || echo "")
    REMOTE_HEAD=$(git -C "$PROJECT_DIR" rev-parse --verify origin/main 2>/dev/null || echo "")
    if [ -n "$LOCAL_HEAD" ] && [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
        SKIP_PUSH=1
    fi
else
    gh repo create "$REPO_NAME" --private --source="$PROJECT_DIR" --remote="origin" --push=false 2>&1 | tail -1
    # Verify the repo really exists on GitHub. gh CLI has been observed to
    # print a URL even when the underlying API call silently failed — this
    # check turns silent fail into actionable error before push tries.
    sleep 1
    if ! gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
        printf "❌ gh repo create reported success but repo not found on GitHub\n"
        printf "   diagnostics:\n"
        printf "     gh login: %s\n" "$(gh api user --jq .login 2>/dev/null || echo 'unknown')"
        printf "     gh version: %s\n" "$(gh --version 2>/dev/null | head -1)"
        printf "   try manual: gh repo create %s --private --source=%s\n" "$REPO_NAME" "$PROJECT_DIR"
        exit 1
    fi
    # gh repo create may have set origin to SSH if user's git_protocol=ssh.
    # Pin to HTTPS for the same reason as above.
    git -C "$PROJECT_DIR" remote set-url origin "$REPO_URL_HTTPS" 2>/dev/null || \
        git -C "$PROJECT_DIR" remote add origin "$REPO_URL_HTTPS"
fi

# --- 4. push via daemon ----------------------------------------------------
if [ -n "$SKIP_PUSH" ]; then
    printf "📤 git push... ✅ already up-to-date — skipping\n"
else
    printf "📤 git push...\n"
    PUSH_RES=$(curl -sS -X POST "$BASE/api/raccoonui/projects/$SLUG/git/push")
    if echo "$PUSH_RES" | grep -q '"pushed":true'; then
        printf "  ✅ pushed\n"
    else
        printf "  ⚠️  push response: %s\n" "$PUSH_RES"
    fi
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
