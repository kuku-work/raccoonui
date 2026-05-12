#!/usr/bin/env bash
# Update RaccoonUI fork — git pull current branch + reinstall + rebuild +
# top up missing .raccoonui/ resources.
# origin/<branch> is updated by kuku after daily upstream-audit. Coworkers
# run this whenever Slack posts "新版可用". Detects current branch rather
# than hardcoding main so dev / feature branches also work.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACCOONUI_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Resource layers the daemon expects under OD_RESOURCE_ROOT (= .raccoonui/).
# Mirrors the list in install.sh so update can top up directories the
# user never had (e.g. upstream added skills/ + prompt-templates/ but
# install.sh had only seeded design-systems/ in older revisions).
RACCOONUI_RESOURCES=(
    "design-systems:design-systems"
    "skills:skills"
    "design-templates:design-templates"
    "craft:craft"
    "assets/frames:frames"
    "assets/community-pets:community-pets"
    "prompt-templates:prompt-templates"
)

seed_missing_raccoonui_resources() {
    local root=$1 entry src dst src_path dst_path
    for entry in "${RACCOONUI_RESOURCES[@]}"; do
        src=${entry%%:*}
        dst=${entry##*:}
        src_path="$root/$src"
        dst_path="$root/.raccoonui/$dst"
        [ -d "$src_path" ] || continue
        [ -d "$dst_path" ] && continue
        printf "→ Seeding missing .raccoonui/%s/...\n" "$dst"
        mkdir -p "$dst_path"
        cp -r "$src_path"/. "$dst_path/"
        printf "✅ .raccoonui/%s/ seeded\n" "$dst"
    done
}

cd "$RACCOONUI_DIR"

# Branch detection — user might be on main, dev, or a feature branch.
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
if [ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ]; then
    printf "❌ Cannot detect current branch (detached HEAD?)\n"
    printf "   Check out a branch first: git checkout main\n"
    exit 1
fi

printf "🔄 Fetching latest from origin (branch: %s)...\n" "$BRANCH"
git fetch origin --quiet

if ! git rev-parse "origin/$BRANCH" >/dev/null 2>&1; then
    printf "❌ origin/%s does not exist — local-only branch?\n" "$BRANCH"
    printf "   Push it first or switch to a tracked branch.\n"
    exit 1
fi

LOCAL=$(git rev-parse "$BRANCH")
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    printf "✅ already up-to-date (%s on %s)\n" "${LOCAL:0:8}" "$BRANCH"
    # Still top up missing resources — handles older installs where
    # install.sh only seeded design-systems and never backfilled.
    seed_missing_raccoonui_resources "$RACCOONUI_DIR"
    exit 0
fi

printf "Pulling origin/%s...\n" "$BRANCH"
git pull origin "$BRANCH" --ff-only

printf "📦 Refreshing dependencies...\n"
pnpm install

printf "🔨 Rebuilding...\n"
pnpm -r --workspace-concurrency=1 build

# Top up any .raccoonui/ resource the user is still missing.
seed_missing_raccoonui_resources "$RACCOONUI_DIR"

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
# Only refresh if the user already has the shortcut on Desktop. Mac path
# accepts both .app (current) and .command (legacy) so users on the old
# entry get migrated to the .app bundle automatically on next update.
if [[ "$OSTYPE" == "darwin"* ]] && \
   ([ -d "$HOME/Desktop/RaccoonUI.app" ] || [ -f "$HOME/Desktop/RaccoonUI.command" ]); then
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
