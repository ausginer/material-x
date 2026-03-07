#!/bin/bash
set -e

sudo chown -R node:node /workspaces/material-x

# Install npm dependencies
cd /workspaces/material-x
npm install

# Install Playwright browsers and system dependencies
npx playwright install chromium
npx playwright install-deps chromium
