#!/usr/bin/env bash
# Clone a raccoonui project from a git URL into the local .od/projects/
# tree, then trigger daemon import-fs so the project shows up in the
# picker. Counterpart to git-init-project.sh on the receiving end.
#
# Usage:
#   ./clone-project.sh <repo-url>
#
# The remote repo must contain a .raccoonui-project.json sidecar at the
# root (created by git-init-project.sh on the publishing side). The slug
# in that sidecar determines the local directory name.

set -euo pipefail

usage() {
    printf "usage: %s <repo-url>\n" "$(basename "$0")"
    printf "\n"
    printf "Clone a raccoonui project from a git URL and import into local raccoonui.\n"
    printf "\n"
    printf "Examples:\n"
    printf "  %s git@github.com:kuku-work/raccoonui-proj-marketing-q3.git\n" "$(basename "$0")"
    printf "  %s https://github.com/kuku-work/raccoonui-proj-pitch.git\n" "$(basename "$0")"
    exit 1
}

REPO_URL="${1:-}"
[ -z "$REPO_URL" ] && usage

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACCOONUI_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PORT="${RACCOONUI_PORT:-17456}"
BASE="http://127.0.0.1:$PORT"

# --- 0. preflight ----------------------------------------------------------
if ! command -v git >/dev/null 2>&1; then
    printf "❌ git not installed\n"
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

PROJECTS_DIR="$RACCOONUI_DIR/.od/projects"
mkdir -p "$PROJECTS_DIR"

# --- 1. clone to a temp dir so we can inspect before committing to a name -
TMPDIR=$(mktemp -d "${TMPDIR:-/tmp}/raccoonui-clone-XXXXXX")
trap 'rm -rf "$TMPDIR" 2>/dev/null || true' EXIT

printf "📥 cloning %s...\n" "$REPO_URL"
git clone --quiet "$REPO_URL" "$TMPDIR/repo"

SIDECAR="$TMPDIR/repo/.raccoonui-project.json"
if [ ! -f "$SIDECAR" ]; then
    printf "❌ this repo has no .raccoonui-project.json — not a raccoonui project\n"
    exit 1
fi

# --- 2. extract slug from sidecar -----------------------------------------
SLUG=$(python -c "import json; print(json.load(open('$SIDECAR'))['id'])" 2>/dev/null || true)
if [ -z "$SLUG" ]; then
    printf "❌ could not parse id from sidecar:\n"
    cat "$SIDECAR" | head -20
    exit 1
fi
if ! [[ "$SLUG" =~ ^[A-Za-z0-9._-]{1,128}$ ]]; then
    printf "❌ sidecar slug invalid: %s\n" "$SLUG"
    exit 1
fi

DEST="$PROJECTS_DIR/$SLUG"
if [ -e "$DEST" ]; then
    printf "❌ project already exists locally: %s\n" "$DEST"
    printf "   if you want to update from remote, cd into it and run: git pull\n"
    exit 1
fi

# --- 3. move into place ----------------------------------------------------
mv "$TMPDIR/repo" "$DEST"
trap - EXIT
rm -rf "$TMPDIR"
printf "📂 placed at %s\n" "$DEST"

# --- 4. trigger import-fs --------------------------------------------------
printf "🔄 triggering daemon import-fs...\n"
IMPORT_RES=$(curl -sS -X POST "$BASE/api/raccoonui/projects/import-fs")
echo "  $IMPORT_RES"

# --- 5. summary ------------------------------------------------------------
NAME=$(python -c "import json; print(json.load(open('$DEST/.raccoonui-project.json'))['name'])" 2>/dev/null || echo "$SLUG")
printf "\n✅ done\n"
printf "   project:   %s\n" "$DEST"
printf "   name:      %s\n" "$NAME"
printf "   slug:      %s\n" "$SLUG"
printf "\n   open RaccoonUI — picker should show '%s'.\n" "$NAME"
printf "   pull updates later: git -C %s pull\n" "$DEST"
