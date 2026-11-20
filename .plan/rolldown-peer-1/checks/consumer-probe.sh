#!/usr/bin/env bash
# RF-55's consumer probe. Installs a stand-in plugin into empty consumer
# projects with aube and reports, for each one, how many rolldown copies the
# tree holds and whether a Vite build keeps an edit that the plugin returns as
# a rolldown-native magic string.
#
# The stand-in imports `RolldownMagicString` from `rolldown`, as both Vite
# plugins do. `pinned` declares rolldown as both plugins do today; `peer`
# declares it as RF-55's decision does.
#
# Usage: consumer-probe.sh <empty scratch directory>. Reads the npm registry.
set -euo pipefail
S="${1:?scratch directory}"
mkdir -p "${S:?}/pkgs/peer" "${S:?}/pkgs/pinned" "${S:?}/c"

echo '{"name":"plugin-peer","version":"0.0.0","type":"module","main":"index.js","peerDependencies":{"vite":"^8.1.4","rolldown":"^1.1.4"}}' > "$S/pkgs/peer/package.json"
echo '{"name":"plugin-pinned","version":"0.0.0","type":"module","main":"index.js","dependencies":{"rolldown":"1.3.2"},"peerDependencies":{"vite":"^8.1.4"}}' > "$S/pkgs/pinned/package.json"
for p in peer pinned; do
  echo "export { RolldownMagicString as M, VERSION as v } from 'rolldown';" > "$S/pkgs/$p/index.js"
  (cd "$S/pkgs/$p" && tar czf "../$p.tgz" --transform 's,^,package/,' package.json index.js)
done

# name, plugin, linker, extra dependencies
consumer() {
  local d="${S:?}/c/${1:?}" plugin="${2:?}"
  mkdir -p "$d/src"
  echo "{\"name\":\"$1\",\"private\":true,\"type\":\"module\",\"dependencies\":{$4,\"plugin-$plugin\":\"file:../../pkgs/$plugin.tgz\"}}" > "$d/package.json"
  echo "node-linker=$3" > "$d/.npmrc"
  echo 'export const x = 1;' > "$d/src/main.js"
  cat > "$d/vite.config.js" <<JS
import { M } from 'plugin-$plugin';
export default {
  logLevel: 'error',
  build: { lib: { entry: 'src/main.js', formats: ['es'] }, outDir: 'dist', minify: false },
  plugins: [{ name: 'probe', transform(code, id) {
    if (!id.endsWith('main.js')) return;
    const m = new M(code);
    m.append('\nexport const marker = 42;');
    return { code: m };
  } }],
};
JS
  (cd "$d" && aube install --ignore-scripts > install.log 2>&1)
  (cd "$d" && node -e "
    const { createRequire } = require('node:module'), fs = require('node:fs');
    const from = (p) => fs.realpathSync(createRequire(fs.realpathSync('node_modules/' + p + '/package.json')).resolve('rolldown/package.json'));
    const a = from('plugin-$plugin'), b = from('vite');
    const v = (f) => JSON.parse(fs.readFileSync(f, 'utf8')).version;
    console.log('$1: plugin rolldown ' + v(a) + ', vite rolldown ' + v(b) + ', ' + (a === b ? 'one copy' : 'two copies'));")
  (cd "$d" && node node_modules/vite/bin/vite.js build > build.log 2>&1 \
    && { cat dist/*.js | grep -q 'marker = 42' && echo '  vite build: edit kept' || echo '  vite build: edit DROPPED, exit 0'; })
}

consumer A-peer-vite8.3.8-hoisted          peer   hoisted  '"vite":"8.3.8"'
consumer A-peer-vite8.3.8-isolated         peer   isolated '"vite":"8.3.8"'
consumer B-pinned-vite8.3.8-hoisted        pinned hoisted  '"vite":"8.3.8"'
consumer B-pinned-vite8.3.8-isolated       pinned isolated '"vite":"8.3.8"'
consumer C-peer-vite8.1.4-hoisted          peer   hoisted  '"vite":"8.1.4"'
consumer D-peer-vite8.3.8-tsdown0.23.7     peer   hoisted  '"vite":"8.3.8","tsdown":"0.23.7"'
consumer E-peer-vite8.4.0-beta.1-tsdown    peer   hoisted  '"vite":"8.4.0-beta.1","tsdown":"0.23.7"'
