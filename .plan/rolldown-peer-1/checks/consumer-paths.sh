#!/usr/bin/env bash
# RF-55's task 4: the packed `@ydinjs/vite-traits-plugin` in task 2's
# consumers and in the consumer-probe's D, with the path each Vite build took.
# For each project it reports:
# - the rolldown that the plugin and Vite resolve;
# - what the plugin's transforms returned, which is the path: a magic string
#   (native) or a string and a map;
# - whether the build writes the flattened class.
#
# The fixture is the plugin's own test composition (tests/bundles.node.test.ts):
# one trait, `Linked`, and one component, `Link`, composed from it. A flattened
# build calls `impl(this, …)` in `Link` and no longer calls `compose(Base)`.
# The Vite config wraps each of the plugin's transforms to count what it
# returned, and writes the counts to `paths.json`.
#
# Task 2's consumers declare `rolldown` at the range that their Vite declares,
# as task 2's committed consumers do. D declares none, and has tsdown 0.23.7
# beside Vite 8.3.8. mutant-D is D with the packed check replaced by `true`.
#
# Usage: consumer-paths.sh <empty scratch directory> <plugin tarball> <core tarball>
# Run from the repository root after building both packages and packing them
# with `aube pack`. Reads the npm registry.
set -euo pipefail
S="${1:?scratch directory}"
PLUGIN="$(realpath "${2:?plugin tarball}")"
CORE="$(realpath "${3:?core tarball}")"

mkdir -p "${S:?}/mutant"
tar -xzf "$PLUGIN" -C "$S/mutant"
grep -c '"magicString" in meta ? magic === meta.magicString : rolldownVersion === VERSION' "$S/mutant/package/index.js" \
  | sed 's/^/host checks in the packed index.js: /'
sed -i 's/(meta \&\& "magicString" in meta ? magic === meta\.magicString : rolldownVersion === VERSION)/true/' "$S/mutant/package/index.js"
tar -czf "$S/mutant.tgz" -C "$S/mutant" package

# name, plugin tarball, linker, extra dependencies
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
    ${4:?}
  }
}
JSON
  echo "node-linker=${3:?}" > "$d/.npmrc"
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
import { writeFileSync } from 'node:fs';
import { viteTraitsPlugin } from '@ydinjs/vite-traits-plugin';

const paths = {};
const plugins = viteTraitsPlugin().map((plugin) => {
  const { transform } = plugin;
  return {
    ...plugin,
    async transform(code, id, meta) {
      // The descriptor, so that the probe doesn't build the host's instance.
      const own = meta && Object.getOwnPropertyDescriptor(meta, 'magicString');
      const offered = `third argument ${meta ? `{${Object.keys(meta).join(', ')}}` : 'absent'}, magicString ${own ? 'offered' : 'not offered'}`;
      paths[offered] = (paths[offered] ?? 0) + 1;
      const ret = await transform.call(this, code, id, meta);
      if (ret) {
        const path = typeof ret.code === 'string' ? 'string and map' : 'magic string';
        const key = `${plugin.name}: ${path}`;
        paths[key] = (paths[key] ?? 0) + 1;
      }
      return ret;
    },
  };
});

export default {
  logLevel: 'error',
  plugins: [
    ...plugins,
    { name: 'paths', closeBundle() { writeFileSync('paths.json', JSON.stringify(paths)); } },
  ],
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
    echo "  host: $(node -e "const p = require('$d/paths.json'); console.log(Object.keys(p).filter((k) => k.startsWith('third')).join('; '))")"
    echo "  returned: $(node -e "const p = require('$d/paths.json'); console.log(Object.entries(p).filter(([k]) => !k.startsWith('third')).map(([k, n]) => k + ' ×' + n).join('; ') || 'nothing')")"
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

consumer a-vite8.3.8-hoisted              "$PLUGIN"       hoisted  '"vite": "8.3.8", "rolldown": "~1.2.18"'
consumer a-vite8.3.8-isolated             "$PLUGIN"       isolated '"vite": "8.3.8", "rolldown": "~1.2.18"'
consumer b-vite8.1.4-hoisted              "$PLUGIN"       hoisted  '"vite": "8.1.4", "rolldown": "~1.1.4"'
consumer c-vite8.4.0-beta.1-hoisted       "$PLUGIN"       hoisted  '"vite": "8.4.0-beta.1", "rolldown": "~1.3.2"'
consumer D-vite8.3.8-tsdown0.23.7         "$PLUGIN"       hoisted  '"vite": "8.3.8", "tsdown": "0.23.7"'
consumer mutant-D-vite8.3.8-tsdown0.23.7  "$S/mutant.tgz" hoisted  '"vite": "8.3.8", "tsdown": "0.23.7"'
