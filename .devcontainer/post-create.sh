#!/bin/bash
set -euo pipefail

sudo chown -R node:node /workspaces/material-x/node_modules

# Zed SSH keys

PUBKEY_FILE="/tmp/zed_devcontainer.pub"
AUTHORIZED_KEYS="${HOME}/.ssh/authorized_keys"

mkdir -p "${HOME}/.ssh"
chmod 700 "${HOME}/.ssh"
touch "${AUTHORIZED_KEYS}"

if [[ -r "${PUBKEY_FILE}" ]]; then
  PUBKEY="$(cat "${PUBKEY_FILE}")"

  if [[ -n "${PUBKEY}" ]] && ! grep -qxF "${PUBKEY}" "${AUTHORIZED_KEYS}"; then
    echo "${PUBKEY}" >> "${AUTHORIZED_KEYS}"
  fi
else
  echo "Warning: ${PUBKEY_FILE} is not readable; SSH key was not installed" >&2
  ls -l "${PUBKEY_FILE}" >&2 || true
fi

chmod 600 "${AUTHORIZED_KEYS}"
