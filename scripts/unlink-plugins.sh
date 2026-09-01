#!/usr/bin/env bash
# Uninstall every workspace plugin from the local mm CLI.
set -uo pipefail
cd "$(dirname "$0")/.."
for dir in plugins/*/; do
  mm plugins uninstall "$(basename "$dir")"
done
