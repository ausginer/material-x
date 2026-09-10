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
    nx run-many -t clean:build --projects=core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Docs
# ---------------------------------------------------------------------------

# Start the Storybook dev server (full stack: core API + material-x Storybook)
docs-dev:
    nx run @ydinjs/core:docs:api:prepare --skipNxCache --tui=false
    node .scripts/docs-api.ts --out node_modules/.cache/docs/api
    MATERIAL_X_API_STATIC_DIR=$PWD/node_modules/.cache/docs/api nx run @ydinjs/material-x:docs:dev --skipNxCache --tui=false

# Build the full docs site (Storybook + API)
docs-build:
    nx run @ydinjs/material-x:docs:build --skipNxCache --tui=false
    nx run @ydinjs/core:docs:api:build --skipNxCache --tui=false
    node .scripts/docs-api.ts --out .docs/api

# Debug a material-x .css.ts file — path is relative to packages/material-x/src
debug FILE:
    cd packages/material-x && just debug {{ FILE }}

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

# Run all tests across all packages declaring the target
test:
    nx run-many -t test --projects=box-quad,core,tproc,drag,drag2,vite-traits-plugin,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Bundle size
# ---------------------------------------------------------------------------

# Check bundle-size budgets for all measured packages
size:
    nx run-many -t size --projects=box-quad,core,drag,drag2 --skipNxCache

# ---------------------------------------------------------------------------
# Type checking
# ---------------------------------------------------------------------------

# Type-check all packages
typecheck:
    nx run-many -t typecheck --projects=box-quad,core,tproc,drag,drag2,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

# Format every package, then the repository-level files no package owns.
# Two authorities over disjoint sets: `oxfmt` writes what a package's `fmt`
# writes and everything outside `packages/` that is not Markdown; Prettier
# writes the Markdown outside `packages/`, which no `oxfmt` invocation reaches.
fmt:
    nx run-many -t fmt --projects=box-quad,core,tproc,drag,drag2,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache
    oxfmt . '!packages/**' '!**/*.md'
    prettier --write '**/*.md' '!packages/**'

# Check formatting everywhere without writing — the same two authorities
fmt-check:
    nx run-many -t fmt:check --projects=box-quad,core,tproc,drag,drag2,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache
    oxfmt --check . '!packages/**' '!**/*.md'
    prettier --check '**/*.md' '!packages/**'

# ---------------------------------------------------------------------------
# Linting
# ---------------------------------------------------------------------------

# Lint every package, then the repository-level files no package owns
lint:
    nx run-many -t lint --projects=box-quad,core,tproc,drag,drag2,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache
    oxlint --ignore-pattern 'packages/**' .
    eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts --ignore-pattern 'packages/**' .

# Lint and auto-fix everywhere
lint-fix:
    nx run-many -t lint:fix --projects=box-quad,core,tproc,drag,drag2,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache
    oxlint --fix --ignore-pattern 'packages/**' .
    eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts --ignore-pattern 'packages/**' --fix .

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

# Migrate oxlint config
oxlint-migrate:
    node .scripts/oxlint-migrate.ts

# Walk a cants call graph from a root callable — `just calls --help` for options
calls *ARGS:
    node .scripts/call-graph.ts {{ ARGS }}
