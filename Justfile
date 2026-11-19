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

# Build the full docs site (Storybook + API). Storybook collects every package's
# stories, and the packages they import resolve to their builds: `_package-builds`
# builds them first, as it does for the tests.
docs-build: _package-builds
    nx run @ydinjs/material-x:docs:build --skipNxCache --tui=false
    nx run @ydinjs/core:docs:api:build --skipNxCache --tui=false
    node .scripts/docs-api.ts --out .docs/api

# Load the built docs site in Chromium: every Storybook entry, the manager and
# the API page. Fails on any page error (`repo:RD-14`). Reads `.docs` and builds
# nothing: run `docs-build` first.
docs-smoke:
    node .scripts/docs-smoke.ts

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
# package. The root configuration contributes every project the per-package
# configurations do, for the engines in `MX_TEST_ENGINES` and with visual only
# under `MX_TEST_VISUAL=1`, so coverage is unchanged, and `repo`, which runs the
# repository's own `.scripts` tests. Per-package runs stay available:
# `cd packages/<name> && just test`.
#
# The packages the tests import are built first: `_package-builds` says why.
test *ARGS: _test-builds
    vitest run {{ ARGS }}

# Run the Safari projects, each in its own Vitest process (`repo:RD-12`).
#
# Safari allows one automation session, and `safaridriver` one driver per Node
# process, while Vitest opens the next project's browser before it releases the
# previous one. So the recipe lists the Safari projects, which opens no
# browser, and runs them one after another. It continues after a failing
# project and fails if any did, or if the listing fails or finds none.
test-safari *ARGS: _test-builds
    #!/usr/bin/env bash
    set -uo pipefail
    export MX_TEST_ENGINES=safari
    listing="$(vitest list --filesOnly --json --project '*/safari')" || { echo "The Safari project listing failed"; exit 1; }
    # One name per line. macOS's bash is 3.2, which has no `mapfile`.
    projects="$(node -e 'const s = require("fs").readFileSync(0, "utf8"); for (const name of new Set(JSON.parse(s).map((e) => e.projectName))) console.log(name);' <<< "$listing")" || { echo "The Safari project listing isn't readable"; exit 1; }
    if [ -z "$projects" ]; then echo "The listing found no Safari project"; exit 1; fi
    failed=0
    while IFS= read -r project; do
        echo "::group::$project"
        vitest run --project "$project" {{ ARGS }} < /dev/null
        status=$?
        echo "::endgroup::"
        echo "$project exited with $status"
        [ "$status" -eq 0 ] || failed=1
    done <<< "$projects"
    exit "$failed"

# The packages that tests, stories and the Vite configuration import by name
# resolve to their builds, as a consumer's do. drag's own build is the consumer
# project's global setup, and no package imports material-x's.
[private]
_package-builds:
    nx run-many -t build --projects=box-quad,core,tproc,vite-custom-element-assets,vite-traits-plugin --skipNxCache

# The CSS plugin also reads the custom property list that material-x's
# `build:prepare` collects.
[private]
_test-builds: _package-builds
    nx run @ydinjs/material-x:build:prepare --skipNxCache

# ---------------------------------------------------------------------------
# Bundle size
# ---------------------------------------------------------------------------

# Check bundle-size budgets for all measured packages
size:
    nx run-many -t size --projects=box-quad,core,drag,material-x --parallel=1 --skipNxCache

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

# Type-check every built declaration file as a consumer reads it: with
# `skipLibCheck` off and no ambient `types` (`repo:RF-51`). It builds every
# package that writes declarations first, because it reads their builds.
typecheck-declarations:
    nx run-many -t build --projects=box-quad,core,drag,material-x,size-limit-preset-rolldown,tproc,vite-custom-element-assets,vite-traits-plugin --skipNxCache
    tsc -p tsconfig.declarations.json

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
