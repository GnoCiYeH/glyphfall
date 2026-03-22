#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_VERSION="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"

cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Missing required command: node"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Missing required command: npm"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Missing required command: python3"
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Missing required command: ffmpeg"
  exit 1
fi

if ! command -v ffprobe >/dev/null 2>&1; then
  echo "Missing required command: ffprobe"
  exit 1
fi

echo "Installing Node dependencies..."
npm install

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv "$VENV_DIR"
fi

if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "Python virtual environment is incomplete: $VENV_DIR/bin/python not found"
  echo "On Debian/Ubuntu, install the venv package first:"
  echo "  sudo apt install python${PYTHON_VERSION}-venv"
  exit 1
fi

if ! "$VENV_DIR/bin/python" -m pip --version >/dev/null 2>&1; then
  echo "pip is missing inside .venv, attempting to bootstrap with ensurepip..."

  if ! "$VENV_DIR/bin/python" -m ensurepip --upgrade >/dev/null 2>&1; then
    echo "Failed to bootstrap pip inside .venv"
    echo "Try recreating the virtual environment after installing the required system package:"
    echo "  sudo apt install python${PYTHON_VERSION}-venv"
    echo "  rm -rf .venv"
    echo "  ./install.sh"
    exit 1
  fi
fi

echo "Installing Python speech dependencies into .venv..."
"$VENV_DIR/bin/python" -m pip install -r scripts/requirements-speech.txt

cat <<EOF

Install complete.

Next steps:
1. source .venv/bin/activate
2. npm run speech:generate
3. npm run studio

EOF
