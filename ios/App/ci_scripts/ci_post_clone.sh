#!/bin/sh

# Xcode Cloud ci_post_clone script
# Runs after the repo is cloned, before the build starts
# Installs npm dependencies so Capacitor SPM packages (like push-notifications) are available

set -e

echo ">>> Current directory: $(pwd)"
echo ">>> CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
echo ">>> CI_WORKSPACE: $CI_WORKSPACE"

# Navigate to the repo root where package.json lives
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo ">>> Installing Node.js dependencies..."

# Check if node/npm is available
if ! command -v node &> /dev/null; then
    echo ">>> Node.js not found, installing via Homebrew..."
    brew install node
fi

echo ">>> Node version: $(node --version)"
echo ">>> NPM version: $(npm --version)"

npm install

echo ">>> Verifying @capacitor/push-notifications..."
ls -la node_modules/@capacitor/push-notifications/ || echo "WARNING: push-notifications not found!"

echo ">>> Node.js dependencies installed successfully"
