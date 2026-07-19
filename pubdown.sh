#!/usr/bin/env bash

set -euo pipefail

# The PubDown project root is the directory containing this script.
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v yarn >/dev/null 2>&1; then
  echo "Error: yarn is not installed or is not available in PATH." >&2
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
  echo "Error: package.json not found in: $PROJECT_DIR" >&2
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/scripts/build.ts" ]]; then
  echo "Error: scripts/build.ts not found in: $PROJECT_DIR" >&2
  exit 1
fi

exec yarn --cwd "$PROJECT_DIR" build -- "$@"