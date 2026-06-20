#!/bin/bash
set -euo pipefail

sudo chown -R node:node /workspaces/material-x/node_modules

cat >> ~/.bashrc <<'EOF'

# --- zed pretty prompt fix ---
export LANG="${LANG:-C.UTF-8}"
export LC_CTYPE="${LC_CTYPE:-C.UTF-8}"
export TERM="${TERM:-xterm-256color}"

__zed_git_branch() {
  local branch
  branch="$(git --no-optional-locks symbolic-ref --short HEAD 2>/dev/null \
    || git --no-optional-locks rev-parse --short HEAD 2>/dev/null)" || return

  [[ -n "$branch" ]] && printf '%s' "$branch"
}

__zed_git_dirty() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return
  git diff --quiet --ignore-submodules -- 2>/dev/null &&
    git diff --cached --quiet --ignore-submodules -- 2>/dev/null &&
    return

  printf '✗'
}

__zed_prompt() {
  local exit_code=$?
  local branch
  local dirty
  local arrow='➜'

  branch="$(__zed_git_branch)"
  dirty="$(__zed_git_dirty)"

  # Green user/node-ish prefix
  PS1='\[\e[0;32m\]\u\[\e[0m\] '

  # Red arrow when previous command failed, normal arrow otherwise
  if (( exit_code != 0 )); then
    PS1+='\[\e[1;31m\]'"$arrow"'\[\e[0m\] '
  else
    PS1+='\[\e[0m\]'"$arrow"'\[\e[0m\] '
  fi

  # Blue cwd
  PS1+='\[\e[1;34m\]\w\[\e[0m\]'

  # Cyan/red git branch
  if [[ -n "$branch" ]]; then
    PS1+=' \[\e[0;36m\](\[\e[1;31m\]'"$branch"

    if [[ -n "$dirty" ]]; then
      PS1+=' \[\e[1;33m\]'"$dirty"
    fi

    PS1+='\[\e[0;36m\])\[\e[0m\]'
  fi

  PS1+=' \$ '
}

PROMPT_COMMAND=__zed_prompt
# --- /zed pretty prompt fix ---
EOF

exec bash
