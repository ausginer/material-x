set shell := ["bash", "-euo", "pipefail", "-c"]

# List available recipes
default:
    @just --list

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

# Build all packages
build:
    nx run-many -t build --projects=core,tproc,material-x --skipNxCache

# Delete build artefacts for all packages
clean-build:
    nx run-many -t clean:build --projects=core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-vite,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Docs
# ---------------------------------------------------------------------------

# Start the Storybook dev server (full stack: core API + material-x Storybook)
docs-dev:
    nx run @ydinjs/core:docs:api:dev --skipNxCache
    node .scripts/docs-api.ts --out node_modules/.cache/docs/api
    MATERIAL_X_API_STATIC_DIR=$PWD/node_modules/.cache/docs/api nx run @ydinjs/material-x:docs:dev --skipNxCache

# Build the full docs site (Storybook + API)
docs-build:
    nx run @ydinjs/material-x:docs:build --skipNxCache
    nx run @ydinjs/core:docs:api:build --skipNxCache
    node .scripts/docs-api.ts --out .docs/api

# Debug a material-x .css.ts file — path is relative to packages/material-x/src
debug FILE:
    cd packages/material-x && just debug {{ FILE }}

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

# Run all tests across all packages
test:
    nx run-many -t test --projects=core,tproc,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Bundle size
# ---------------------------------------------------------------------------

# Check bundle-size budgets for all measured packages
size:
    nx run-many -t size --projects=core,drag --skipNxCache

# ---------------------------------------------------------------------------
# Type checking
# ---------------------------------------------------------------------------

# Type-check all packages
typecheck:
    nx run-many -t typecheck --projects=core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-vite,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

# Format all packages
fmt:
    nx run-many -t fmt --projects=core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-vite,material-x --skipNxCache

# Check formatting for all packages without writing
fmt-check:
    nx run-many -t fmt:check --projects=core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-vite,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Linting
# ---------------------------------------------------------------------------

# Lint all packages
lint:
    nx run-many -t lint --projects=core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-vite,material-x --skipNxCache

# Lint and auto-fix all packages
lint-fix:
    nx run-many -t lint:fix --projects=core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-vite,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

# Migrate oxlint config
oxlint-migrate:
    node .scripts/oxlint-migrate.ts
