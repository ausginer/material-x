#!/usr/bin/env bash
# `repo:RF-55` task 3's limit: a host and a plugin on two copies of one rolldown
# version. Both plugins decide with `this.meta.rolldownVersion === VERSION`,
# and the host accepts a magic string only if it is `instanceof` the
# `BindingMagicString` of the native binding that the host loaded.
#
# The tree is made by copying the workspace's installed packages, with no
# package manager:
#   <S>/node_modules/rolldown                    the host
#   <S>/node_modules/@rolldown/binding-linux-x64-gnu, @rolldown/pluginutils
#   <S>/node_modules/shared-binding/             a stand-in plugin whose own
#     node_modules/rolldown                      copy has no binding, so it
#                                                resolves the host's binding
#   <S>/node_modules/own-binding/                a stand-in plugin whose own
#     node_modules/rolldown                      copy has a binding copy next
#     node_modules/@rolldown/binding-linux-x64-gnu  to it
# Each stand-in replaces `MARK` with `EDITED` in `transform` and returns the
# result with the plugins' check: the magic string when the versions are
# equal, and a string and a map otherwise. The host bundles a module that
# contains `MARK`.
#
# Usage: same-version-copies.sh <workspace root> <empty scratch directory>
set -euo pipefail
W="$(realpath "${1:?workspace root}")"
S="$(realpath "${2:?scratch directory}")"
NM="${S:?}/node_modules"
copy() { mkdir -p "$(dirname "${2:?}")"; cp -rL "${W:?}/node_modules/${1:?}" "${2:?}"; }

copy rolldown "${NM:?}/rolldown"
copy @rolldown/binding-linux-x64-gnu "${NM:?}/@rolldown/binding-linux-x64-gnu"
copy @rolldown/pluginutils "${NM:?}/@rolldown/pluginutils"
for plugin in shared-binding own-binding; do
  copy rolldown "${NM:?}/${plugin:?}/node_modules/rolldown"
  cat > "${NM:?}/${plugin:?}/index.mjs" <<'JS'
import { createRequire } from 'node:module';
import { RolldownMagicString, VERSION } from 'rolldown';

const require = createRequire(import.meta.url);
export const paths = {
  rolldown: require.resolve('rolldown'),
  binding: createRequire(require.resolve('rolldown')).resolve('@rolldown/binding-linux-x64-gnu'),
};
export const version = VERSION;
export const plugin = {
  name: 'stand-in',
  transform(code, id) {
    if (!code.includes('MARK')) return null;
    const s = new RolldownMagicString(code);
    s.replace('MARK', 'EDITED');
    return this.meta.rolldownVersion === VERSION
      ? { code: s }
      : { code: s.toString(), map: s.generateMap({ source: id, includeContent: true, hires: true }).toString() };
  },
};
JS
done
copy @rolldown/binding-linux-x64-gnu "${NM:?}/own-binding/node_modules/@rolldown/binding-linux-x64-gnu"
printf 'export const value = "MARK";\n' > "${S:?}/entry.js"

cat > "${S:?}/run.mjs" <<'JS'
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rolldown, VERSION } from 'rolldown';

const require = createRequire(import.meta.url);
const root = process.argv[2];
const rel = (p) => realpathSync(p).replace(root, '<S>');
console.log(`host: rolldown ${VERSION}, ${rel(require.resolve('rolldown'))}`);
console.log(`host binding: ${rel(require.resolve('@rolldown/binding-linux-x64-gnu'))}`);
for (const name of ['shared-binding', 'own-binding']) {
  const { paths, plugin, version } = await import(`${root}/node_modules/${name}/index.mjs`);
  const bundle = await rolldown({ input: `${root}/entry.js`, plugins: [plugin] });
  const { output } = await bundle.generate({ format: 'esm' });
  const code = output[0].code;
  console.log(`== ${name}`);
  console.log(`  plugin: rolldown ${version}, ${rel(paths.rolldown)}`);
  console.log(`  plugin binding: ${rel(paths.binding)}`);
  console.log(`  versions equal: ${version === VERSION}`);
  console.log(`  output: ${code.includes('EDITED') ? 'EDITED (kept)' : code.includes('MARK') ? 'MARK (edit dropped)' : 'neither'}`);
}
JS
cd "${S:?}" && node run.mjs "${S:?}"
