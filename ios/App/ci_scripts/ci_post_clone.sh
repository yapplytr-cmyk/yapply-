#!/bin/sh

# Xcode Cloud ci_post_clone script
# Runs after the repo is cloned, before the build starts
# Installs npm dependencies so Capacitor packages are available

echo ">>> Installing Node.js dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install
echo ">>> Node.js dependencies installed successfully"
