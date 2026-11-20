// RF-55's task 4: how often each transform of the two built plugins reads the
// host's lazy `meta.magicString`, in a rolldown host that offers it. rolldown
// 1.3.2 defines it as a getter that builds one `RolldownMagicString` of the
// module's code on the first read and returns that one on every later read
// (`bindingifyTransform`). Each transform is wrapped, and gets the host's meta
// behind an object whose `magicString` getter counts its reads and forwards
// them. `'magicString' in meta` doesn't read it.
//
// The bundle has three modules: `linked.ts`, a trait module that the
// flattener changes; `plain.ts`, which holds the words the plugin's cheap
// filters look for and that no transform changes; and `main.ts`, which
// re-exports both. For each transform and module, the probe prints the reads
// and what the transform returned: the host's instance, its own instance, a
// string, or null.
//
// Usage: node <workspace>/meta-getter-reads.mjs <workspace root> <empty dir>,
// with this file copied to the workspace root so that it resolves the
// workspace's `rolldown`, after `aube exec just build`.
import { writeFileSync } from 'node:fs';
import { rolldown } from 'rolldown';

const [root, dir] = process.argv.slice(2);
const { viteTraitsPlugin } = await import(
  `${root}/packages/vite-traits-plugin/index.js`
);
const { constructCSSTokens } = await import(
  `${root}/packages/vite-custom-element-assets/index.js`
);

writeFileSync(
  `${dir}/linked.ts`,
  `import { trait } from '@ydinjs/core/traits/composition.js';\n@trait\nexport class Linked { get href(): string { return 'x'; } }\n`,
);
writeFileSync(
  `${dir}/plain.ts`,
  `export const plain = 'compose attributes';\n`,
);
writeFileSync(
  `${dir}/main.ts`,
  `export * from './linked.ts';\nexport * from './plain.ts';\n`,
);

const reads = {};
const wrap = (plugin) => {
  const { transform } = plugin;
  if (!transform) {
    return plugin;
  }
  const handler =
    typeof transform === 'function' ? transform : transform.handler;
  return {
    ...plugin,
    transform: {
      ...(typeof transform === 'object' ? transform : {}),
      async handler(code, id, meta) {
        const key = `${plugin.name} ${id.split('/').pop()}`;
        reads[key] ??= { reads: 0, returned: 'null' };
        const counted = Object.create(meta);
        Object.defineProperty(counted, 'magicString', {
          get() {
            reads[key].reads++;
            return meta.magicString;
          },
        });
        const ret = await handler.call(this, code, id, counted);
        if (ret) {
          reads[key].returned =
            typeof ret.code === 'string'
              ? 'a string'
              : ret.code === meta.magicString
                ? "the host's instance"
                : 'its own instance';
        }
        return ret;
      },
    },
  };
};

const bundle = await rolldown({
  input: `${dir}/main.ts`,
  external: [/^@ydinjs\//],
  plugins: [...viteTraitsPlugin(), constructCSSTokens({ isProd: true })].map(
    wrap,
  ),
});
await bundle.generate({ format: 'esm' });
for (const [key, { reads: n, returned }] of Object.entries(reads).sort()) {
  console.log(`${key}: ${n} reads of meta.magicString, returned ${returned}`);
}
