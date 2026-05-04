#!/usr/bin/env bash
# Update RaccoonUI fork — git pull origin/main + reinstall + rebuild.
# origin/main is updated by kuku after daily upstream-audit. Coworkers
# run this whenever Slack posts "新版可用".

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACCOONUI_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$RACCOONUI_DIR"

printf "🔄 Fetching latest from origin...\n"
git fetch origin --quiet

LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    printf "✅ already up-to-date (%s)\n" "${LOCAL:0:8}"
    exit 0
fi

printf "Pulling...\n"
git pull origin main --ff-only

printf "📦 Refreshing dependencies...\n"
pnpm install

printf "🔨 Rebuilding...\n"
pnpm -r --workspace-concurrency=1 build

# Re-link Claude Code skills (claude-skills/ → ~/.claude/commands/)
SKILLS_SRC="$RACCOONUI_DIR/claude-skills"
if [ -d "$SKILLS_SRC" ]; then
    CMDS_DST="$HOME/.claude/commands"
    mkdir -p "$CMDS_DST"
    linked=0
    for f in "$SKILLS_SRC"/*.md; do
        [ -f "$f" ] || continue
        ln -sf "$f" "$CMDS_DST/$(basename "$f")"
        linked=$((linked + 1))
    done
    printf "✅ re-linked %d Claude Code skill(s)\n" "$linked"
fi

# Re-stamp desktop shortcut so existing users pick up icon / target changes.
# Only refresh if the user already has the shortcut on Desktop.
if [[ "$OSTYPE" == "darwin"* ]] && [ -f "$HOME/Desktop/RaccoonUI.command" ]; then
    "$SCRIPT_DIR/make-shortcut.sh" >/dev/null 2>&1 \
        && printf "✅ refreshed desktop shortcut (icon/target)\n" \
        || printf "⚠️  shortcut refresh failed (non-fatal)\n"
elif [[ "$OSTYPE" == "linux-gnu"* ]] && [ -f "$HOME/Desktop/RaccoonUI.desktop" ]; then
    "$SCRIPT_DIR/make-shortcut.sh" >/dev/null 2>&1 \
        && printf "✅ refreshed desktop shortcut (icon/target)\n" \
        || printf "⚠️  shortcut refresh failed (non-fatal)\n"
fi

NEW_HEAD=$(git rev-parse --short HEAD)
printf "\n✅ RaccoonUI updated to %s\n" "$NEW_HEAD"
printf "   重啟: %s/start.sh\n" "$SCRIPT_DIR"
