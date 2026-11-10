#!/usr/bin/env bash
# Usage: bash fix-zed-terminal-size.sh [path/to/.bashrc]
# Run as the devcontainer user whose Bash configuration should be updated.
# Requires resize inside the container (Debian/Ubuntu: xterm; Fedora: xterm-resize).
set -euo pipefail

zed_bashrc=${1:-"$HOME/.bashrc"}
# Follow a symlink so an existing dotfiles link stays intact.
if [[ -L "$zed_bashrc" ]]; then
    zed_bashrc=$(readlink -f -- "$zed_bashrc")
fi
if [[ -e "$zed_bashrc" && ! -f "$zed_bashrc" ]]; then
    printf 'Not a regular file: %s\n' "$zed_bashrc" >&2
    exit 1
fi

zed_tmpdir=$(mktemp -d -- "$(dirname -- "$zed_bashrc")/.zed-terminal-size.XXXXXX")
trap 'rm -rf -- "$zed_tmpdir"' EXIT

cat > "$zed_tmpdir/block" <<'BASH'
# >>> zed-terminal-size >>>
if [[ $- == *i* && ${TERM_PROGRAM:-} == zed && -t 0 && -t 1 ]] &&
   command -v resize >/dev/null 2>&1; then
    resize -s >/dev/null
fi
# <<< zed-terminal-size <<<
BASH

zed_input=/dev/null
if [[ -f "$zed_bashrc" ]]; then
    zed_input=$zed_bashrc
fi

if ! awk -v block_file="$zed_tmpdir/block" '
BEGIN {
    while ((getline line < block_file) > 0) block = block line "\n"
    close(block_file)
}
$0 == "# >>> zed-terminal-size >>>" {
    if (inside) { invalid = 1; exit 1 }
    if (!written) { printf "%s", block; written = 1 }
    inside = 1
    next
}
$0 == "# <<< zed-terminal-size <<<" {
    if (!inside) { invalid = 1; exit 1 }
    inside = 0
    next
}
!inside { print }
END {
    if (invalid || inside) exit 1
    if (!written) {
        if (NR > 0) print ""
        printf "%s", block
    }
}
' "$zed_input" > "$zed_tmpdir/bashrc"; then
    printf 'Unpaired or nested zed-terminal-size markers; %s was not changed.\n' "$zed_bashrc" >&2
    exit 1
fi

if [[ -f "$zed_bashrc" ]]; then
    if cmp -s -- "$zed_bashrc" "$zed_tmpdir/bashrc"; then
        printf 'Already up to date: %s\n' "$zed_bashrc"
        exit 0
    fi
    chmod --reference="$zed_bashrc" -- "$zed_tmpdir/bashrc"
else
    chmod 600 -- "$zed_tmpdir/bashrc"
fi
mv -f -- "$zed_tmpdir/bashrc" "$zed_bashrc"
printf 'Updated: %s\n' "$zed_bashrc"
