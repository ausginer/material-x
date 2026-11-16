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

# Run every test in the repository, in one Vitest process.
#
# One process rather than a package fan-out: Nx never ordered tests — its
# `targetDefaults` carry no `test` key — so it contributed scheduling and
# nothing else, while a fan-out pays a Chromium and a CSS evaluation isolate per
# package. The root configuration contributes 15 projects: the 14 the six
# per-package configurations do, so coverage is unchanged, and `repo`, which runs
# the repository's own `.scripts` tests. Per-package runs stay available:
# `cd packages/<name> && just test`.
#
# The packages the tests import resolve to their builds, as a consumer's do, so
# they are built first, and the CSS plugin reads the custom property list that
# material-x's `build:prepare` collects. drag's own build is the consumer
# project's global setup.
test *ARGS:
    nx run-many -t build --projects=box-quad,core,tproc,vite-custom-element-assets,vite-traits-plugin --skipNxCache
    nx run @ydinjs/material-x:build:prepare --skipNxCache
    vitest run {{ ARGS }}

# ---------------------------------------------------------------------------
# Bundle size
# ---------------------------------------------------------------------------

# Check bundle-size budgets for all measured packages
size:
    nx run-many -t size --projects=box-quad,core,drag --skipNxCache

# Write the rows that `size` measures, as JSON, to FILE (builds first)
size-reading FILE:
    node .scripts/size-reading.ts {{ FILE }}

# Write the size report's Markdown from a head reading, and optionally a base
# reading and Vitest's JSON report of the measurement rows
size-report *ARGS:
    node .scripts/size-report.ts {{ ARGS }}

# ---------------------------------------------------------------------------
# Type checking
# ---------------------------------------------------------------------------

# Type-check all packages
typecheck:
    nx run-many -t typecheck --projects=box-quad,core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache

# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

# Format every package, then the repository-level files no package owns.
# One authority over the whole tree: `oxfmt` writes every file type it
# supports, Markdown included, so no file is offered to a second formatter.
fmt:
    nx run-many -t fmt --projects=box-quad,core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache
    oxfmt . '!packages/**'

# Check formatting everywhere without writing — the same single authority
fmt-check:
    nx run-many -t fmt:check --projects=box-quad,core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache
    oxfmt --check . '!packages/**'

# ---------------------------------------------------------------------------
# Linting
# ---------------------------------------------------------------------------

# Lint every package, then the repository-level files no package owns. Each
# package's lint builds what its imports resolve to first, and the Storybook
# sources read material-x's custom elements manifest.
lint:
    nx run-many -t lint --projects=box-quad,core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache
    nx run @ydinjs/material-x:build:cem --skipNxCache
    oxlint --ignore-pattern 'packages/**' .
    eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts --ignore-pattern 'packages/**' .

# Lint and auto-fix everywhere
lint-fix:
    nx run-many -t lint:fix --projects=box-quad,core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x --skipNxCache
    nx run @ydinjs/material-x:build:cem --skipNxCache
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
