#!/usr/bin/env bash
set -euo pipefail

# A global install, at an exact version 7 days old or older, with aube
# (`repo:RD-16`). Its binary is linked into `~/.local/bin`, which is on `PATH`;
# aube's own global bin directory isn't. It runs outside the checkout, so the
# repository's `.npmrc` doesn't apply.
cd "$HOME"
AUBE_GLOBAL_BIN_DIR="$HOME/.local/bin" aube add -g typescript-language-server@6.0.3
