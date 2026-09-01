#!/usr/bin/env bash
# Install every workspace plugin into the local mm CLI from its directory.
# Directory (not tarball) installs are required so the CLI can read
# package.json#mm and persist capability approvals for local sources.
set -euo pipefail
cd "$(dirname "$0")/.."
for dir in plugins/*/; do
  mm plugins install "file:$PWD/${dir%/}" --accept-permissions
done
