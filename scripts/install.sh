#!/usr/bin/env bash
#
# SyncForge — Installer for macOS / Linux
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/katrate/syncforge/master/scripts/install.sh | bash
#
# Or with options:
#   curl -fsSL https://raw.githubusercontent.com/katrate/syncforge/master/scripts/install.sh | bash -s -- --dir ~/dev --no-global
#
# NOTE: When using curl | bash, interactive prompts are skipped.
# Use --dir and --no-global flags to control installation non-interactively.
#

set -euo pipefail

REPO="katrate/syncforge"
BRANCH="master"
INSTALL_DIR="${HOME}/syncforge"
INSTALL_GLOBAL=true
SKIP_BUILD=false

# ─── Detect if stdin is a terminal (interactive) ───
HAS_TTY=false
if [ -t 0 ]; then
  HAS_TTY=true
fi

# ─── Parse arguments ───

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --no-global) INSTALL_GLOBAL=false; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --help)
      echo "Usage: curl -fsSL https://raw.githubusercontent.com/$REPO/$BRANCH/scripts/install.sh | bash"
      echo ""
      echo "Options:"
      echo "  --dir <path>     Install to a specific directory (default: ~/syncforge)"
      echo "  --no-global      Skip global npm install"
      echo "  --skip-build     Skip npm run build"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Colors ───

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()  { printf "${CYAN}◇${NC} %s\n" "$*"; }
ok()    { printf "${GREEN}✔${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
fail()  { printf "${RED}✖${NC} %s\n" "$*"; exit 1; }
bold()  { printf "${BOLD}%s${NC}\n" "$*"; }
dim()   { printf "${DIM}%s${NC}\n" "$*"; }

# ─── Detect OS ───

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)  PLATFORM="linux"   ;;
  Darwin) PLATFORM="macos"   ;;
  *)      fail "Unsupported OS: $OS (SyncForge requires macOS or Linux)" ;;
esac

echo ""
bold "  ⚡ SyncForge Installer"
echo ""

# ─── Step 1: Check prerequisites ───

info "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  fail "Node.js is required. Install it from https://nodejs.org (v18+)"
fi
if ! command -v git &>/dev/null; then
  fail "Git is required. Install it from https://git-scm.com"
fi
if ! command -v npm &>/dev/null; then
  fail "npm is required (comes with Node.js)"
fi

NODE_VER=$(node --version)
GIT_VER=$(git --version | awk '{print $3}')
dim "  Node: $NODE_VER"
dim "  Git:  $GIT_VER"
dim "  OS:   $PLATFORM ($ARCH)"
ok "Prerequisites met"

# ─── Step 2: Download ───

info "Downloading SyncForge to ${BOLD}$INSTALL_DIR${NC}"

if [ -d "$INSTALL_DIR" ]; then
  warn "Directory already exists: $INSTALL_DIR"
  if [ "$HAS_TTY" = true ]; then
    printf "  Overwrite? [y/N] "
    read -r answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
      echo "  Installation cancelled."
      exit 1
    fi
  else
    warn "Non-interactive mode — skipping overwrite prompt. Use --dir to specify a different directory."
    echo "  Run: curl ... | bash -s -- --dir /path/to/new/location"
    exit 1
  fi
  rm -rf "$INSTALL_DIR"
fi

git clone --depth 1 "https://github.com/$REPO.git" "$INSTALL_DIR"
ok "Downloaded SyncForge to $INSTALL_DIR"

cd "$INSTALL_DIR"

# ─── Step 3: Install dependencies ───

info "Installing dependencies..."
npm install --loglevel=warn
ok "Dependencies installed"

# ─── Step 4: Build ───

if [ "$SKIP_BUILD" = false ]; then
  info "Building..."
  npm run build
  ok "Built successfully"
fi

# ─── Step 5: Global install (optional) ───

GLOBAL_INSTALL=false
if [ "$INSTALL_GLOBAL" = true ]; then
  if [ "$HAS_TTY" = true ]; then
    printf "\n${YELLOW}?${NC} Install 'syncforge' globally? (run from anywhere) [Y/n] "
    read -r answer
    if [ "$answer" != "n" ] && [ "$answer" != "N" ]; then
      GLOBAL_INSTALL=true
    fi
  else
    # Non-interactive: install globally by default unless --no-global was passed
    GLOBAL_INSTALL=true
  fi

  if [ "$GLOBAL_INSTALL" = true ]; then
    info "Installing globally..."
    if npm install -g . 2>/dev/null; then
      ok "Installed globally! Run: syncforge"
    else
      warn "Global install failed (need permissions)"
      dim "  Try: sudo npm install -g ."
      dim "  Or:  npx tsx $INSTALL_DIR/src/agent.ts"
    fi
  fi
fi

# ─── Done ───

echo ""
ok "SyncForge installed successfully!"
echo ""
echo "  ${BOLD}Location:${NC} $INSTALL_DIR"
echo "  ${BOLD}Run:${NC}       cd $INSTALL_DIR"
echo "  ${BOLD}Server:${NC}    npm run server"
echo "  ${BOLD}Create:${NC}    npm run dev -- init --name \"my-project\""
echo "  ${BOLD}Sync:${NC}      npm run dev -- start"
echo ""
dim "Documentation: https://github.com/$REPO/blob/$BRANCH/DOCUMENTATION.md"
