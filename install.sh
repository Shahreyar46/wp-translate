#!/usr/bin/env bash
# ============================================================
#  wp-translate — One-liner installer
#  WordPress Plugin Auto-Translation Toolkit
#  by MD. AL-Shahreyar (https://github.com/Shahreyar46)
#
#  Usage:
#    curl -fsSL https://raw.githubusercontent.com/Shahreyar46/wp-translate/main/install.sh | bash
# ============================================================

set -e

REPO="https://github.com/Shahreyar46/wp-translate.git"
SKILL_NAME="wp-translate"
GLOBAL_DIR="$HOME/.claude/skills/$SKILL_NAME"
LOCAL_DIR=".claude/skills/$SKILL_NAME"

# ── Colors ────────────────────────────────────────────────────
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║          wp-translate — AI Translation Skill         ║${RESET}"
echo -e "${BOLD}${CYAN}║     WordPress Plugin i18n Automation Toolkit         ║${RESET}"
echo -e "${BOLD}${CYAN}║     by MD. AL-Shahreyar  •  github.com/Shahreyar46  ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Check dependencies ────────────────────────────────────────
echo -e "${BOLD}Checking requirements...${RESET}"

if ! command -v git &>/dev/null; then
  echo -e "${RED}✗ git is not installed. Please install git and try again.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ git found${RESET}"

if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js is not installed.${RESET}"
  echo -e "  Install from: https://nodejs.org (v18 or higher)"
  exit 1
fi

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node)")
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${RED}✗ Node.js v18+ required. You have v$NODE_VERSION${RESET}"
  echo -e "  Download: https://nodejs.org"
  exit 1
fi
echo -e "${GREEN}✓ Node.js v$NODE_VERSION found${RESET}"

echo ""

# ── Ask install type ──────────────────────────────────────────
echo -e "${BOLD}Where would you like to install the skill?${RESET}"
echo ""
echo -e "  ${CYAN}[1]${RESET} ${BOLD}Global${RESET} (recommended) — available in ALL your projects"
echo -e "       Installs to: ${YELLOW}~/.claude/skills/$SKILL_NAME/${RESET}"
echo ""
echo -e "  ${CYAN}[2]${RESET} ${BOLD}Local${RESET} — only in the current project folder"
echo -e "       Installs to: ${YELLOW}./.claude/skills/$SKILL_NAME/${RESET}"
echo ""
read -r -p "  Enter choice [1/2] (default: 1): " CHOICE
CHOICE="${CHOICE:-1}"

if [ "$CHOICE" = "2" ]; then
  INSTALL_DIR="$LOCAL_DIR"
  INSTALL_TYPE="local"
else
  INSTALL_DIR="$GLOBAL_DIR"
  INSTALL_TYPE="global"
fi

echo ""
echo -e "${BOLD}Installing ${CYAN}$INSTALL_TYPE${RESET}${BOLD} to:${RESET} ${YELLOW}$INSTALL_DIR${RESET}"
echo ""

# ── Install ───────────────────────────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}⟳ Existing install found. Updating...${RESET}"
  cd "$INSTALL_DIR"
  git pull --ff-only origin main
  echo -e "${GREEN}✓ Updated to latest version${RESET}"
else
  mkdir -p "$(dirname "$INSTALL_DIR")"
  echo -e "Cloning from GitHub..."
  git clone --depth=1 "$REPO" "$INSTALL_DIR"
  echo -e "${GREEN}✓ Cloned successfully${RESET}"
fi

# ── Install Node.js dependencies ─────────────────────────────
echo ""
echo -e "${BOLD}Installing Node.js dependencies...${RESET}"
node "$INSTALL_DIR/scripts/setup.js" --install
echo -e "${GREEN}✓ Dependencies installed${RESET}"

# ── Deploy to other AI tools ──────────────────────────────────
echo ""
echo -e "${BOLD}Deploying to other AI tools found on this system...${RESET}"

DEPLOYED=()

# Helper: copy full skill folder (SKILL.md + scripts/) to a target skills dir
deploy_skill_folder() {
  local TARGET_DIR="$1"
  local LABEL="$2"
  rm -rf "$TARGET_DIR/wp-translate"
  cp -r "$INSTALL_DIR" "$TARGET_DIR/wp-translate"
  echo -e "${GREEN}✓ $LABEL — deployed to $TARGET_DIR/wp-translate/${RESET}"
}

# Gemini CLI — ~/.gemini/antigravity/skills/
if [ -d "$HOME/.gemini/antigravity/skills" ]; then
  deploy_skill_folder "$HOME/.gemini/antigravity/skills" "Gemini CLI"
  DEPLOYED+=("Gemini CLI")
fi

# Codex CLI — ~/.codex/skills/
if [ -d "$HOME/.codex" ]; then
  mkdir -p "$HOME/.codex/skills"
  deploy_skill_folder "$HOME/.codex/skills" "Codex CLI"
  DEPLOYED+=("Codex CLI")
fi

# Cursor — ~/.cursor/skills/
if [ -d "$HOME/.cursor" ]; then
  mkdir -p "$HOME/.cursor/skills"
  deploy_skill_folder "$HOME/.cursor/skills" "Cursor"
  DEPLOYED+=("Cursor")
fi

# Antigravity AI — ~/.antigravity/skills/
if [ -d "$HOME/.antigravity" ]; then
  mkdir -p "$HOME/.antigravity/skills"
  deploy_skill_folder "$HOME/.antigravity/skills" "Antigravity AI"
  DEPLOYED+=("Antigravity AI")
fi

# Cagent — ~/.cagent/skills/
if [ -d "$HOME/.cagent" ]; then
  mkdir -p "$HOME/.cagent/skills"
  deploy_skill_folder "$HOME/.cagent/skills" "Cagent"
  DEPLOYED+=("Cagent")
fi

# Kiro — ~/.kiro/skills/
if [ -d "$HOME/.kiro" ]; then
  mkdir -p "$HOME/.kiro/skills"
  deploy_skill_folder "$HOME/.kiro/skills" "Kiro"
  DEPLOYED+=("Kiro")
fi

if [ ${#DEPLOYED[@]} -eq 0 ]; then
  echo -e "${YELLOW}  No other AI tools detected (only Claude Code installed)${RESET}"
fi

# ── Success message ───────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║             Installation Complete!                  ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BOLD}Restart Claude Code, then use the skill:${RESET}"
echo ""
echo -e "  ${CYAN}/wp-translate${RESET} ./path/to/your-plugin fr_FR,de_DE,es_ES"
echo ""
echo -e "${BOLD}Or just say in any AI tool:${RESET}"
echo -e "  ${CYAN}\"Translate my plugin to French, German, and Arabic\"${RESET}"
echo ""
if [ ${#DEPLOYED[@]} -gt 0 ]; then
  echo -e "${BOLD}Also deployed to:${RESET} ${DEPLOYED[*]}"
  echo ""
fi
echo -e "${BOLD}Docs:${RESET} https://github.com/Shahreyar46/wp-translate"
echo ""
