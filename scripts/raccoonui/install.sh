#!/usr/bin/env bash
# RaccoonUI installer for macOS / Linux.
# Detects node 22+, git, pnpm, native build toolchain (Xcode CLT on macOS,
# build-essential on Linux), installs deps, seeds .raccoonui/, builds.

set -euo pipefail

# OS guard — reject Windows shells (msys / cygwin / git-bash on Windows)
case "${OSTYPE:-}" in
    msys*|cygwin*|win32)
        printf "❌ 這個 script 是 macOS / Linux 用的。Windows 請跑：\n"
        printf "    雙擊  scripts\\\\raccoonui\\\\install.cmd  (友善版)\n"
        printf "    或    pwsh -File scripts\\\\raccoonui\\\\install.ps1\n"
        exit 1
        ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACCOONUI_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ERR_COUNT=0

step() { printf "→ %s\n" "$*"; }
ok()   { printf "✅ %s\n" "$*"; }
fail() {
    printf "❌ %s\n" "$1"
    [ -n "${2:-}" ] && printf "   %s\n" "$2"
    ERR_COUNT=$((ERR_COUNT + 1))
}

# Resource layers the daemon expects under OD_RESOURCE_ROOT (= .raccoonui/).
# Each entry is "<repo-relative-source>:<.raccoonui-relative-dest>" — keep
# in sync with apps/daemon/src/server.ts → resolveDaemonResourceDir.
RACCOONUI_RESOURCES=(
    "design-systems:design-systems"
    "skills:skills"
    "craft:craft"
    "assets/frames:frames"
    "assets/community-pets:community-pets"
    "prompt-templates:prompt-templates"
)

seed_raccoonui_resources() {
    local root=$1 entry src dst src_path dst_path count
    for entry in "${RACCOONUI_RESOURCES[@]}"; do
        src=${entry%%:*}
        dst=${entry##*:}
        src_path="$root/$src"
        dst_path="$root/.raccoonui/$dst"
        if [ ! -d "$src_path" ]; then
            printf "⚠️  source missing: %s (resource not seeded)\n" "$src"
            continue
        fi
        if [ -d "$dst_path" ]; then
            ok ".raccoonui/$dst/ already present (skipped)"
            continue
        fi
        step "Seeding .raccoonui/$dst/..."
        mkdir -p "$dst_path"
        cp -r "$src_path"/. "$dst_path/"
        count=$(find "$dst_path" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
        ok ".raccoonui/$dst/ seeded ($count entries)"
    done
}

# ── 1. node 22+ ──
if command -v node >/dev/null 2>&1; then
    version=$(node -v | tr -d 'v')
    major=${version%%.*}
    if [ "$major" -lt 22 ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            fail "node $version 太舊，需要 v22+" "brew install node@22"
        else
            fail "node $version 太舊，需要 v22+" "use nvm: https://github.com/nvm-sh/nvm  →  nvm install 22"
        fi
    else
        ok "node $version"
    fi
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        fail "node 未安裝" "brew install node@22"
    else
        fail "node 未安裝" "use nvm: https://github.com/nvm-sh/nvm  →  nvm install 22"
    fi
fi

# ── 2. git ──
if command -v git >/dev/null 2>&1; then
    ok "git ($(git --version))"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        fail "git 未安裝" "brew install git"
    else
        fail "git 未安裝" "sudo apt install git  /  sudo dnf install git"
    fi
fi

# ── 3. pnpm ──
if command -v pnpm >/dev/null 2>&1; then
    ok "pnpm ($(pnpm -v))"
elif command -v npm >/dev/null 2>&1; then
    step "Installing pnpm via npm..."
    if npm install -g pnpm; then
        ok "pnpm $(pnpm -v)"
    else
        fail "pnpm 安裝失敗" "manual: npm install -g pnpm"
    fi
else
    fail "pnpm 未安裝且找不到 npm" "先裝 node"
fi

# ── 4. Native build toolchain ──
if [[ "$OSTYPE" == "darwin"* ]]; then
    if xcode-select -p >/dev/null 2>&1; then
        ok "Xcode CLT at $(xcode-select -p)"
    else
        fail "Xcode Command Line Tools 未安裝" "xcode-select --install"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v gcc >/dev/null 2>&1 && command -v make >/dev/null 2>&1; then
        ok "gcc $(gcc -dumpversion)"
    else
        fail "build-essential 未安裝" "sudo apt install build-essential  /  sudo dnf groupinstall 'Development Tools'"
    fi
fi

if [ "$ERR_COUNT" -gt 0 ]; then
    printf "\n⚠️  %d issue(s) detected — fix above and re-run.\n" "$ERR_COUNT"
    exit 1
fi

# ── 5. Install deps ──
cd "$RACCOONUI_DIR"
step "pnpm install..."
pnpm install

# ── 6. Seed .raccoonui/ resource layers ──
# start.sh sets OD_RESOURCE_ROOT=.raccoonui, which makes the daemon
# resolve EVERY resource segment under that dir (skills, design-systems,
# craft, frames, community-pets, prompt-templates). Seed each one from
# the matching repo path; dir-already-exists → skip so user-edits in
# .raccoonui/ are preserved across re-runs.
seed_raccoonui_resources "$RACCOONUI_DIR"

# ── 7. Build ──
step "Building daemon + web (this takes ~1-2 min)..."
pnpm -r --workspace-concurrency=1 build

# ── 7.5. Link Claude Code skills (claude-skills/ → ~/.claude/commands/) ──
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
    ok "linked $linked Claude Code skill(s) into $CMDS_DST"
fi

# ── 8. Optional shortcut ──
if [ -f "$SCRIPT_DIR/make-shortcut.sh" ]; then
    step "Creating desktop shortcut..."
    bash "$SCRIPT_DIR/make-shortcut.sh"
fi

printf "\n"
ok "RaccoonUI 安裝完成!"
printf "\n  啟動: %s/start.sh\n" "$SCRIPT_DIR"
printf "  更新: %s/update.sh\n\n" "$SCRIPT_DIR"
