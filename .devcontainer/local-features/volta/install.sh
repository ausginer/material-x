#!/bin/bash
set -e

install_apt_packages() {
  echo "Installing apt packages: $*"
  apt-get update -y || { echo "Error: apt-get update failed." ; exit 1; }
  apt-get -y install --no-install-recommends "$@" || { echo "Error: apt-get install failed for: $*" ; exit 1; }
  rm -rf /var/lib/apt/lists/*
}

install_volta_package() {
  local package_name="$1"
  local package_version="$2"

  if [ "${package_version}" != "none" ]; then
    echo "Installing ${package_name} (version: ${package_version}) via Volta..."
    volta install "${package_name}@${package_version}" || { echo "Error: ${package_name} installation failed." ; exit 1; }
    echo "${package_name} version: $(${package_name} --version)"
  fi
}

# This script installs Volta and specified Node.js, npm, and Yarn versions.
VOLTA_HOME="${VOLTAHOME:-/usr/local/volta}" # Default to /usr/local/volta if not specified
VOLTA_VERSION="${VOLTAVERSION:-latest}" # Default to 'latest' if not specified
NODE_VERSION="${NODEVERSION:-lts}" # Default to 'lts' if not specified
NPM_VERSION="${NPMVERSION:-none}" # Default to 'none' if not specified
YARN_VERSION="${YARNVERSION:-none}" # Default to 'none' if not specified
TARGET_USER="${TARGETUSER:-vscode}" # Default to 'vscode' if not specified

echo "--- Starting Volta Node.js Toolchain installation (verbose) ---"
echo "Volta Version: ${VOLTA_VERSION}"
echo "Node Version: ${NODE_VERSION}"
echo "NPM Version: ${NPM_VERSION}"
echo "Yarn Version: ${YARN_VERSION}"
echo "Target User for permissions: ${TARGET_USER}"

echo "Installing Node.js runtime and decompression dependencies..."
install_apt_packages \
    libstdc++6 \
    libssl3 \
    zlib1g \
    ca-certificates \
    xz-utils \
    tar \
    gzip

echo "Installing Volta (version: ${VOLTA_VERSION}) to ${VOLTA_HOME}..."

mkdir -p "${VOLTA_HOME}" || { echo "Error: Failed to create Volta installation directory ${VOLTA_HOME}" ; exit 1; }

# Ensure the VOLTA_HOME and PATH variable is set in the environment for the future steps
echo "export VOLTA_HOME=\"${VOLTA_HOME}\"" | tee -a /etc/profile.d/volta.sh
echo "export PATH=\"\$VOLTA_HOME/bin:\$PATH\"" | tee -a /etc/profile.d/volta.sh

# Make sure the new PATH is active for the current script
export VOLTA_HOME="${VOLTA_HOME}"
export PATH="${VOLTA_HOME}/bin:${PATH}"

if [ "${VOLTA_VERSION}" = "latest" ]; then
    curl -fsSL https://get.volta.sh | bash || { echo "Error: Volta latest installation failed." ; exit 1; }
else
    curl -fsSL https://get.volta.sh | bash -s -- --version "${VOLTA_VERSION}" || { echo "Error: Volta version ${VOLTA_VERSION} installation failed." ; exit 1; }
fi


# Verify volta is now in PATH
if ! command -v volta &> /dev/null; then
    echo "Error: Volta command not found in PATH after installation."
    exit 1
fi
echo "Volta installed successfully: $(volta --version)"

install_volta_package "node" "${NODE_VERSION}"
install_volta_package "npm" "${NPM_VERSION}"
install_volta_package "yarn" "${YARN_VERSION}"

echo "Setting permissions for Volta installation directory to '${TARGET_USER}' user."
chown -R "${TARGET_USER}:${TARGET_USER}" "${VOLTA_HOME}" || { echo "Error: Failed to change ownership of Volta directory." ; exit 1; }

echo "--- Volta Node.js Toolchain installation complete. ---"
