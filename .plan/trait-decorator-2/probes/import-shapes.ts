// Which import shapes a library build keeps as a bare import of an external
// module, once nothing reads the imported value. tsconfig.base.json sets
// `verbatimModuleSyntax`. Usage: node import-shapes.ts <plugin package dir>
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const pkg = process.argv[2]!;
const { build } = await import(
  join(pkg, '../../node_modules/tsdown/dist/index.mjs')
);
const SPEC = `'@ydinjs/core/traits/composition.js'`;
const BODY = `import { ControlledElement } from '@ydinjs/core/element.js';
export const C: Composed<any, []> = ControlledElement as any;
`;
const cases: Record<string, string> = {
  // What fix 1's lowering leaves in list-item.ts.
  valueAndType: `import { compose, type Composed } from ${SPEC};\n${BODY}`,
  // The `compose` specifier removed, the declaration kept.
  inlineTypeOnly: `import { type Composed } from ${SPEC};\n${BODY}`,
  importType: `import type { Composed } from ${SPEC};\n${BODY}`,
  declarationRemoved: `type Composed<A, B> = unknown;\n${BODY}`,
};

const dir = await mkdtemp(join(pkg, 'tests/fixtures/gen-import-shapes-'));
try {
  for (const [name, code] of Object.entries(cases)) {
    await writeFile(join(dir, `${name}.ts`), code);
    const out = join(dir, 'out', name);
    await build({
      config: false,
      entry: [join(dir, `${name}.ts`)],
      outDir: out,
      format: 'esm',
      platform: 'neutral',
      tsconfig: join(pkg, 'tsconfig.json'),
      dts: false,
      deps: { neverBundle: [/^@ydinjs\//u] },
      logLevel: 'silent',
    });
    const file = (await readdir(out)).find((f) => f.endsWith('.js'))!;
    const js = await readFile(join(out, file), 'utf8');
    const imports = js.split('\n').filter((line) => line.startsWith('import'));
    console.log(`${name}: ${imports.join(' / ')}`);
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
