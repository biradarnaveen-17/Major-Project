#!/usr/bin/env bash
set -euo pipefail

npm install
npm install --workspaces

echo "Workspace dependencies installed."
