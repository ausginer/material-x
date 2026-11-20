#!/usr/bin/env bash
# RF-55's task 4: the feature proof's same-version-copies probe
# (../../reviews/rolldown-peer-1/checks/same-version-copies.sh), with the built
# `@ydinjs/vite-traits-plugin` in place of the stand-in. A host and the plugin
# run two copies of one rolldown version. The host accepts a magic string only
# if it is `instanceof` the `BindingMagicString` of the native binding that the
# host loaded.
#
# The tree is made by copying the workspace's installed packages, with no
# package manager:
#   <S>/node_modules/rolldown                    the host
#   <S>/node_modules/@rolldown/binding-linux-x64-gnu, @rolldown/pluginutils,
#     oxc-parser, @oxc-parser/binding-linux-x64-gnu, @oxc-project/types
#   <S>/node_modules/shared-binding/             the built plugin, whose own
#     node_modules/rolldown                      copy has no binding, so it
#                                                resolves the host's binding
#   <S>/node_modules/own-binding/                the built plugin, whose own
#     node_modules/rolldown                      copy has a binding copy next
#     node_modules/@rolldown/binding-linux-x64-gnu  to it
#   <S>/node_modules/own-binding-mutant/         as own-binding, with the
#                                                check replaced by `true`
# The host bundles a trait module. Each of the plugin's transforms is wrapped
# to record what it returned, a magic string or a string. A transformed module
# has the brand's `Symbol.hasInstance` method and no `@trait`.
#
# Usage: same-version-copies-real.sh <workspace root> <empty scratch directory>
# Run after building the plugin.
set -euo pipefail
W="$(realpath "${1:?workspace root}")"
S="$(realpath "${2:?scratch directory}")"
NM="${S:?}/node_modules"
copy() { mkdir -p "$(dirname "${2:?}")"; cp -rL "${W:?}/node_modules/${1:?}" "${2:?}"; }

for p in rolldown @rolldown/binding-linux-x64-gnu @rolldown/pluginutils \
  oxc-parser @oxc-parser/binding-linux-x64-gnu @oxc-project/types; do
  copy "$p" "${NM:?}/$p"
done
for plugin in shared-binding own-binding own-binding-mutant; do
  mkdir -p "${NM:?}/${plugin:?}"
  cp "${W:?}/packages/vite-traits-plugin/package.json" \
    "${W:?}/packages/vite-traits-plugin/index.js" "${NM:?}/${plugin:?}/"
  copy rolldown "${NM:?}/${plugin:?}/node_modules/rolldown"
done
for plugin in own-binding own-binding-mutant; do
  copy @rolldown/binding-linux-x64-gnu "${NM:?}/${plugin:?}/node_modules/@rolldown/binding-linux-x64-gnu"
done
grep -c 'magic === meta?.magicString' "${NM:?}/own-binding-mutant/index.js" \
  | sed 's/^/host checks in the mutant'"'"'s index.js: /'
sed -i 's/magic === meta?\.magicString/true/' "${NM:?}/own-binding-mutant/index.js"

cat > "${S:?}/linked.ts" <<'TS'
import { trait } from '@ydinjs/core/traits/composition.js';

@trait
export class Linked {
  get href(): string {
    return 'linked-member';
  }
}
TS

cat > "${S:?}/run.mjs" <<'JS'
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rolldown, VERSION } from 'rolldown';

const require = createRequire(import.meta.url);
const root = process.argv[2];
const rel = (p) => realpathSync(p).replace(root, '<S>');
console.log(`host: rolldown ${VERSION}, ${rel(require.resolve('rolldown'))}`);
console.log(`host binding: ${rel(require.resolve('@rolldown/binding-linux-x64-gnu'))}`);
for (const name of ['shared-binding', 'own-binding', 'own-binding-mutant']) {
  const { viteTraitsPlugin } = await import(`${root}/node_modules/${name}/index.js`);
  const pluginRequire = createRequire(`${root}/node_modules/${name}/index.js`);
  const pluginRolldown = pluginRequire.resolve('rolldown');
  const returned = [];
  const plugins = viteTraitsPlugin().map((plugin) => {
    const transform = plugin.transform;
    return {
      ...plugin,
      async transform(code, id, meta) {
        const ret = await transform.call(this, code, id, meta);
        if (ret) {
          returned.push(`${plugin.name}: ${typeof ret.code === 'string' ? 'a string and a map' : 'a magic string'}`);
        }
        return ret;
      },
    };
  });
  const bundle = await rolldown({
    input: `${root}/linked.ts`,
    external: [/^@ydinjs\//],
    plugins,
  });
  const { output } = await bundle.generate({ format: 'esm' });
  const code = output[0].code;
  const pluginVersion = JSON.parse(
    (await import('node:fs')).readFileSync(pluginRequire.resolve('rolldown/package.json'), 'utf8'),
  ).version;
  console.log(`== ${name}`);
  console.log(`  plugin: rolldown ${pluginVersion}, ${rel(pluginRolldown)}`);
  console.log(`  plugin binding: ${rel(createRequire(pluginRolldown).resolve('@rolldown/binding-linux-x64-gnu'))}`);
  console.log(`  returned: ${returned.join('; ') || 'nothing'}`);
  const kept = code.includes('Symbol.hasInstance') && !code.includes('@trait');
  console.log(`  output: ${kept ? 'transformed (edit kept)' : 'not transformed (edit dropped)'}`);
}
JS
cd "${S:?}" && node run.mjs "${S:?}"
