set shell := ["bash", "-euo", "pipefail", "-c"]

_mx := "packages/material-x"
_ydin := "packages/ydin"
_eslint := "eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts"

# List available recipes
default:
    @just --list

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

# Build all packages
build:
    nx run-many -t build --projects=ydin,material-x --skipNxCache

# Build only the ydin library
build-ydin:
    cd {{ _ydin }} && tsdown --config tsdown.config.ts

# Build only the material-x library (lib + CEM manifest)
build-mx:
    just build-prepare-mx
    just build-lib-mx
    just build-cem-mx

# Collect CSS custom properties (material-x pre-build step)
build-prepare-mx:
    cd {{ _mx }} && node ../../.scripts/css/collect-props.ts

# Build only the material-x JS library
build-lib-mx:
    cd {{ _mx }} && tsdown --config tsdown.config.ts

# Build only the material-x Custom Elements Manifest
build-cem-mx:
    cd {{ _mx }} && custom-elements-manifest analyze --config cem.config.ts

# Delete build artefacts for all packages
clean-build:
    nx run-many -t clean:build --projects=ydin,material-x --skipNxCache

# Delete build artefacts for material-x
clean-build-mx:
    cd {{ _mx }} && node ../../.scripts/package-files.ts clean --package .

# Delete build artefacts for ydin
clean-build-ydin:
    cd {{ _ydin }} && node ../../.scripts/package-files.ts clean --package .

# Run publint against the material-x package
publint:
    cd {{ _mx }} && publint

# ---------------------------------------------------------------------------
# Docs
# ---------------------------------------------------------------------------

# Start the Storybook dev server (full stack: ydin API + material-x Storybook)
docs-dev:
    just build-ydin
    just docs-api-ydin
    node .scripts/docs-api.ts --out node_modules/.cache/docs/api
    MATERIAL_X_API_STATIC_DIR=$PWD/node_modules/.cache/docs/api just docs-dev-mx

# Build the full docs site (Storybook + API)
docs-build:
    just build-ydin
    just docs-build-mx
    just docs-api-build-ydin
    node .scripts/docs-api.ts --out .docs/api

# Generate Storybook themes for material-x
docs-themes-mx:
    cd {{ _mx }} && node ../../.scripts/storybook-theme.ts

# Prepare material-x docs (themes + CSS props + CEM, in parallel)
docs-prepare-mx:
    concurrently --kill-others-on-fail "just docs-themes-mx" "just build-prepare-mx" "just build-cem-mx"

# Start the material-x Storybook dev server
docs-dev-mx:
    just docs-prepare-mx
    cd {{ _mx }} && node ../../.scripts/storybook.ts dev --config-dir ../../.storybook -h 127.0.0.1 -p 6006 --ci

# Build the material-x Storybook site
docs-build-mx:
    just docs-prepare-mx
    cd {{ _mx }} && node ../../.scripts/storybook.ts build --config-dir ../../.storybook -o ../../.docs

# Build the ydin TypeDoc API into the cache (dev/watch use)
docs-api-ydin:
    cd {{ _ydin }} && typedoc --options typedoc.json --out ../../node_modules/.cache/docs/api/ydin

# Build the ydin TypeDoc API into the output directory
docs-api-build-ydin:
    cd {{ _ydin }} && typedoc --options typedoc.json --out ../../.docs/api/ydin

# Debug a .css.ts file — prints its compiled CSS to stdout (path relative to packages/material-x/src)
debug FILE:
    node .scripts/css/debug.ts {{ FILE }}

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

# Run all tests across all packages
test:
    nx run-many -t test --projects=ydin,material-x --skipNxCache

# Run all material-x tests (unit + browser)
test-mx:
    cd {{ _mx }} && vitest run -c vitest.config.ts && vitest run -c vitest.browser.config.ts

# Run only browser tests for material-x
test-mx-browser:
    cd {{ _mx }} && vitest run -c vitest.browser.config.ts

# Run only browser tests for ydin
test-ydin-browser:
    cd {{ _ydin }} && vitest run -c vitest.browser.config.ts

# Run ydin browser tests in inspect/debug mode
test-ydin-browser-inspect:
    cd {{ _ydin }} && vitest run --inspect-brk -c vitest.browser.config.ts

# ---------------------------------------------------------------------------
# Type checking
# ---------------------------------------------------------------------------

# Type-check all packages
typecheck:
    nx run-many -t typecheck --projects=ydin,material-x --skipNxCache

# Type-check material-x only
typecheck-mx:
    cd {{ _mx }} && tsgo -p tsconfig.json --noEmit

# Type-check ydin only
typecheck-ydin:
    cd {{ _ydin }} && tsgo -p tsconfig.json --noEmit

# ---------------------------------------------------------------------------
# Formatting  (FILES: space-separated paths relative to the package directory)
# ---------------------------------------------------------------------------

# Format material-x (or pass FILES="src/foo.ts ...")
fmt-mx *FILES:
    cd {{ _mx }} && oxfmt -c ../../.oxfmtrc.json {{ if FILES == "" { "." } else { FILES } }}

# Format ydin (or pass FILES="src/foo.ts ...")
fmt-ydin *FILES:
    cd {{ _ydin }} && oxfmt {{ if FILES == "" { "." } else { FILES } }}

# Check formatting for material-x without writing
fmt-check-mx *FILES:
    cd {{ _mx }} && oxfmt -c ../../.oxfmtrc.json --check {{ if FILES == "" { "." } else { FILES } }}

# Check formatting for ydin without writing
fmt-check-ydin *FILES:
    cd {{ _ydin }} && oxfmt --check {{ if FILES == "" { "." } else { FILES } }}

# ---------------------------------------------------------------------------
# Linting  (FILES: space-separated paths relative to the package directory)
# ---------------------------------------------------------------------------

# Lint material-x (or pass FILES="src/foo.ts ...")
lint-mx *FILES:
    cd {{ _mx }} && oxlint {{ if FILES == "" { "." } else { FILES } }} && {{ _eslint }} {{ if FILES == "" { "." } else { FILES } }}

# Lint ydin (or pass FILES="src/foo.ts ...")
lint-ydin *FILES:
    cd {{ _ydin }} && oxlint {{ if FILES == "" { "." } else { FILES } }} && {{ _eslint }} {{ if FILES == "" { "." } else { FILES } }}

# Lint and auto-fix material-x (or pass FILES="src/foo.ts ...")
lint-fix-mx *FILES:
    cd {{ _mx }} && oxlint --fix {{ if FILES == "" { "." } else { FILES } }} && {{ _eslint }} --fix {{ if FILES == "" { "." } else { FILES } }}

# Lint and auto-fix ydin (or pass FILES="src/foo.ts ...")
lint-fix-ydin *FILES:
    cd {{ _ydin }} && oxlint --fix {{ if FILES == "" { "." } else { FILES } }} && {{ _eslint }} --fix {{ if FILES == "" { "." } else { FILES } }}

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

# Migrate oxlint config
oxlint-migrate:
    node .scripts/oxlint-migrate.ts
