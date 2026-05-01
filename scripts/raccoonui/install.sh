#!/usr/bin/env bash
# RaccoonUI installer for macOS / Linux.
# Detects node 22+, git, pnpm, native build toolchain (Xcode CLT on macOS,
# build-essential on Linux), installs deps, seeds .raccoonui/, builds.

set -euo pipefail

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

# ── 6. Seed .raccoonui/design-systems/ ──
DS_DIR=".raccoonui/design-systems"
if [ ! -d "$DS_DIR" ]; then
    step "Seeding .raccoonui/design-systems/..."
    mkdir -p "$DS_DIR"
    cp -r design-systems/. "$DS_DIR/"
    count=$(find "$DS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
    ok "seeded $count design systems"
else
    ok "user dir exists at $DS_DIR (skipped seed)"
fi

# ── 7. Build ──
step "Building daemon + web (this takes ~1-2 min)..."
pnpm -r --workspace-concurrency=1 build

# ── 8. Optional shortcut ──
if [ -f "$SCRIPT_DIR/make-shortcut.sh" ]; then
    step "Creating desktop shortcut..."
    bash "$SCRIPT_DIR/make-shortcut.sh"
fi

printf "\n"
ok "RaccoonUI 安裝完成!"
printf "\n  啟動: %s/start.sh\n" "$SCRIPT_DIR"
printf "  更新: %s/update.sh\n\n" "$SCRIPT_DIR"
