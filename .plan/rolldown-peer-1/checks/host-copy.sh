#!/usr/bin/env bash
# RF-55's task 3: the packed `@ydinjs/vite-traits-plugin` in a consumer whose
# own tree holds two rolldown copies, the consumer-probe's D: Vite 8.3.8 beside
# tsdown 0.23.7, hoisted, with no rolldown declared. The plugin's peer resolves
# to the root's rolldown, which tsdown brings, and Vite runs its own. For each
# project it reports the rolldown that the plugin and Vite resolve, and whether
# a Vite build writes the flattened class.
#
# The fixture is the plugin's own test composition (tests/bundles.node.test.ts):
# one trait, `Linked`, and one component, `Link`, composed from it. A flattened
# build calls `impl(this, …)` in `Link` and no longer calls `compose(Base)`.
#
# Three projects:
# - D: the packed plugin in D's tree;
# - mutant-D: the same tarball with the host check replaced by `true`, so every
#   build keeps the native magic string, as before task 3;
# - one-copy: the packed plugin beside Vite 8.3.8 alone, which shares one copy.
#
# Usage: host-copy.sh <empty scratch directory> <plugin tarball> <core tarball>
# Run from the repository root after building both packages and packing them
# with `aube pack`. Reads the npm registry.
set -euo pipefail
S="${1:?scratch directory}"
PLUGIN="$(realpath "${2:?plugin tarball}")"
CORE="$(realpath "${3:?core tarball}")"

mkdir -p "${S:?}/mutant"
tar -xzf "$PLUGIN" -C "$S/mutant"
grep -c 'meta.rolldownVersion === VERSION' "$S/mutant/package/index.js" \
  | sed 's/^/host checks in the packed index.js: /'
sed -i 's/meta\.rolldownVersion === VERSION/true/' "$S/mutant/package/index.js"
tar -czf "$S/mutant.tgz" -C "$S/mutant" package

# name, plugin tarball, extra dependencies
consumer() {
  local d="${S:?}/c/${1:?}" plugin="${2:?}"
  mkdir -p "$d/src"
  cat > "$d/package.json" <<JSON
{
  "name": "$1",
  "private": true,
  "type": "module",
  "dependencies": {
    "@ydinjs/core": "file:$CORE",
    "@ydinjs/vite-traits-plugin": "file:$plugin",
    ${3:?}
  }
}
JSON
  echo 'node-linker=hoisted' > "$d/.npmrc"
  cat > "$d/src/linked.ts" <<'TS'
import { trait } from '@ydinjs/core/traits/composition.js';

@trait
export class Linked {
  get href(): string {
    return 'linked-member';
  }
}
TS
  cat > "$d/src/link.ts" <<'TS'
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { Linked } from './linked.ts';

class Base {}

const LinkBase: Composed<typeof Base, [typeof Linked]> = compose(Base);

export class Link extends LinkBase {}
TS
  echo "export { Link } from './link.ts';" > "$d/src/main.ts"
  cat > "$d/vite.config.js" <<'JS'
import { viteTraitsPlugin } from '@ydinjs/vite-traits-plugin';

export default {
  logLevel: 'error',
  plugins: [viteTraitsPlugin()],
  build: {
    lib: { entry: 'src/main.ts', formats: ['es'], fileName: 'main' },
    outDir: 'dist',
    minify: false,
  },
};
JS
  (cd "$d" && aube install --ignore-scripts > install.log 2>&1) || {
    echo "$1: aube install failed"
    tail -5 "$d/install.log"
    return
  }
  (cd "$d" && node -e "
    const { createRequire } = require('node:module'), fs = require('node:fs');
    const from = (p) => fs.realpathSync(createRequire(fs.realpathSync('node_modules/' + p + '/package.json')).resolve('rolldown/package.json'));
    const a = from('@ydinjs/vite-traits-plugin'), b = from('vite');
    const v = (f) => JSON.parse(fs.readFileSync(f, 'utf8')).version;
    const vite = JSON.parse(fs.readFileSync('node_modules/vite/package.json', 'utf8')).version;
    console.log('$1: vite ' + vite + ', plugin rolldown ' + v(a) + ', vite rolldown ' + v(b) + ', ' + (a === b ? 'one copy' : 'two copies'));")
  if (cd "$d" && node node_modules/vite/bin/vite.js build > build.log 2>&1); then
    local out="$d/dist/main.js"
    if grep -q 'impl(this' "$out" && ! grep -q 'compose(Base)' "$out"; then
      echo '  vite build: exit 0, Link flattened'
    else
      echo '  vite build: exit 0, Link NOT flattened'
    fi
    echo "  dist/main.js: $(grep -c 'compose(Base)' "$out") compose(Base), $(grep -c 'impl(this' "$out") impl(this"
  else
    echo '  vite build: FAILS'
    tail -5 "$d/build.log" | sed 's/^/    /'
  fi
}

consumer D-vite8.3.8-tsdown0.23.7         "$PLUGIN"       '"vite": "8.3.8", "tsdown": "0.23.7"'
consumer mutant-D-vite8.3.8-tsdown0.23.7  "$S/mutant.tgz" '"vite": "8.3.8", "tsdown": "0.23.7"'
consumer one-copy-vite8.3.8               "$PLUGIN"       '"vite": "8.3.8"'
