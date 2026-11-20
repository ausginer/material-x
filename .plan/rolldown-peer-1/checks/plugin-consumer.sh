#!/usr/bin/env bash
# RF-55's task 2: the packed `@ydinjs/vite-traits-plugin` in empty consumer
# projects, installed with aube outside the checkout. For each project it
# reports the rolldown that the plugin and Vite resolve, whether they are one
# copy, a type-check of the plugin against the consumer's Vite and rolldown,
# and whether a Vite build writes the flattened class.
#
# The fixture is the plugin's own test composition (tests/bundles.node.test.ts):
# one trait, `Linked`, and one component, `Link`, composed from it. A flattened
# build calls `impl(this, …)` in `Link` and no longer calls `compose(Base)`.
# `@ydinjs/core`, which the fixture imports, is installed from its own tarball.
#
# Usage: plugin-consumer.sh <empty scratch directory> <plugin tarball> <core tarball>
# Run from the repository root after building both packages and packing them
# with `aube pack`. Reads the npm registry.
set -euo pipefail
S="${1:?scratch directory}"
PLUGIN="$(realpath "${2:?plugin tarball}")"
CORE="$(realpath "${3:?core tarball}")"
# The workspace's TypeScript and Node types, as the consumer projects declare
# them. Vite's declarations reference Node's types, so a consumer that
# type-checks them with `skipLibCheck` off needs `@types/node`.
TYPESCRIPT='npm:@typescript/typescript6@6.0.2'
NODE_TYPES='26.6.6'

# The mutation: the plugin's manifest as it was, `rolldown` 1.3.2 in
# `dependencies` and only `vite` as a peer.
mkdir -p "${S:?}/mutant"
tar -xzf "$PLUGIN" -C "$S/mutant"
node -e '
  const fs = require("node:fs"), f = process.argv[1];
  const m = JSON.parse(fs.readFileSync(f, "utf8"));
  m.dependencies = { ...m.dependencies, rolldown: "1.3.2" };
  m.peerDependencies = { vite: "^8.1.4" };
  fs.writeFileSync(f, JSON.stringify(m, null, 2) + "\n");
' "$S/mutant/package/package.json"
tar -czf "$S/mutant.tgz" -C "$S/mutant" package

# name, plugin tarball, vite version, linker, rolldown range. A module that
# imports `rolldown` declares it, and a consumer that keeps one copy declares
# the range its Vite declares: 8.1.4 `~1.1.4`, 8.3.8 `~1.2.18`, 8.4.0-beta.1
# `~1.3.2` (the registry, 2026-11-20).
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
    "@types/node": "$NODE_TYPES",
    "rolldown": "${5:?}",
    "typescript": "$TYPESCRIPT",
    "vite": "$3"
  }
}
JSON
  echo "node-linker=${4:?}" > "$d/.npmrc"
  cat > "$d/src/linked.ts" <<'TS'
import { trait } from '@ydinjs/core/traits/composition.js';

export class Linked {
  static {
    trait(this);
  }

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
  cat > "$d/types.ts" <<'TS'
import type { RolldownOptions } from 'rolldown';
import { defineConfig } from 'vite';
import { viteTraitsPlugin } from '@ydinjs/vite-traits-plugin';

export const viteConfig = defineConfig({ plugins: [viteTraitsPlugin()] });

export const rolldownOptions: RolldownOptions = {
  plugins: [viteTraitsPlugin()],
};
TS
  cat > "$d/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": false,
    "noEmit": true,
    "target": "esnext",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom", "dom.iterable"]
  },
  "files": ["types.ts"]
}
JSON
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
  if (cd "$d" && node node_modules/typescript/bin/tsc6 -p tsconfig.json > tsc.log 2>&1); then
    echo '  tsc --noEmit, skipLibCheck off: passes'
  else
    echo '  tsc --noEmit, skipLibCheck off: FAILS'
    sed 's/^/    /' "$d/tsc.log" | head -10
  fi
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

consumer a-vite8.3.8-hoisted               "$PLUGIN"        8.3.8        hoisted  '~1.2.18'
consumer a-vite8.3.8-isolated              "$PLUGIN"        8.3.8        isolated '~1.2.18'
consumer b-vite8.1.4-hoisted               "$PLUGIN"        8.1.4        hoisted  '~1.1.4'
consumer c-vite8.4.0-beta.1-hoisted        "$PLUGIN"        8.4.0-beta.1 hoisted  '~1.3.2'
consumer mutant-a-vite8.3.8-hoisted        "$S/mutant.tgz"  8.3.8        hoisted  '~1.2.18'
