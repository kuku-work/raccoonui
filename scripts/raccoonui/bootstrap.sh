#!/usr/bin/env bash
# RaccoonUI bootstrap — clone fork + run install in one step.
#
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/kuku-work/raccoonui/main/scripts/raccoonui/bootstrap.sh)
#
# Override target dir:
#   RACCOONUI_DIR=/path/to/dir bash <(curl ...)

set -euo pipefail

REPO="https://github.com/kuku-work/raccoonui.git"
TARGET="${RACCOONUI_DIR:-$HOME/RaccoonUI}"

echo "🦝 RaccoonUI bootstrap"
echo "  target: $TARGET"
echo ""

if ! command -v git >/dev/null 2>&1; then
    echo "❌ git not found — install it then re-run bootstrap:"
    case "$(uname -s)" in
        Darwin) echo "    xcode-select --install" ;;
        Linux)
            echo "    Ubuntu/Debian: sudo apt install git"
            echo "    Fedora: sudo dnf install git" ;;
        *) echo "    See https://git-scm.com" ;;
    esac
    exit 1
fi

if [ -d "$TARGET/.git" ]; then
    echo "→ existing fork at $TARGET — switching to main + pulling latest"
    cd "$TARGET"
    git checkout main
    git pull origin main --ff-only
else
    if [ -d "$TARGET" ]; then
        echo "❌ $TARGET exists but is not a git repo. Move it aside or set RACCOONUI_DIR."
        exit 1
    fi
    # Explicit --branch main: coworkers track main; kuku-only work lives in dev.
    git clone --branch main "$REPO" "$TARGET"
    cd "$TARGET"
fi

echo ""
echo "→ running install.sh"
exec ./scripts/raccoonui/install.sh
