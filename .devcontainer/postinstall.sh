#!/bin/bash
set -e

checked_chown() {
  local dir="$1"

  echo "Attempting chown for directory: ${dir}..."
  sudo chown -R "${USERNAME}:${USERNAME}" "${dir}"
  local command_exit_code=$?

  if [ "${command_exit_code}" == 0 ]; then
      echo "SUCCESS: Chown for ${dir} completed."
      ls -ld "${HOME_DIR}"
  else
      echo "ERROR: Failed to chown ${dir}. Exit code: ${command_exit_code}"
      ls -ld "${dir}"
      exit 1
  fi
}

echo "--- Running postinstall.sh ---"
echo "Current user: $(whoami)"
echo "User ID and groups: $(id)"

# This ensures IntelliJ IDEA can write its settings, caches, and logs.
checked_chown "/home/${USERNAME}"

# This ensures the user can write project-specific settings (.idea folder) and build artifacts.
# This also recursively covers node_modules if it's within the project root.
checked_chown "${CONTAINER_WORKSPACE_FOLDER}"

echo 'DevContainer is ready!'
