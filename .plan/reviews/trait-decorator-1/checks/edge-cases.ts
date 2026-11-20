// Edge cases of the load stage and the decorator recognition, built through
// tsdown with declarations, as packages/vite-traits-plugin's declarations test
// does. Usage: node edge.ts <plugin package dir>
import { mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const pkg = process.argv[2]!;
const { build } = await import(
  join(pkg, '../../node_modules/tsdown/dist/index.mjs')
);
const { viteTraitsPlugin } = await import(join(pkg, 'src/plugin.ts'));

const HEAD = `import { AnyElement } from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';
`;
const cases: Record<string, string> = {
  e1_local_then_export: `${HEAD}
/** Doc of Local. */
@trait
class Local extends AnyElement {}
export { Local };
`,
  e2_line_comment_between: `${HEAD}
/** Doc of Commented. */
// a note
@trait
export class Commented extends AnyElement {}
`,
  e3_export_default: `${HEAD}
/** Doc of Defaulted. */
@trait
export default class Defaulted extends AnyElement {}
`,
  e4_parenthesized: `${HEAD}
/** Doc of Paren. */
@(trait)
export class Paren extends AnyElement {}
`,
  e5_export_before: `${HEAD}
/** Doc of After. */
export @trait class After extends AnyElement {}
`,
  e6_abstract: `${HEAD}
/** Doc of Abstract. */
@trait
export abstract class Abstract extends AnyElement {}
`,
};

const dir = await mkdtemp(join(pkg, 'tests/fixtures/gen-review-'));
try {
  for (const [name, code] of Object.entries(cases)) {
    await writeFile(join(dir, `${name}.ts`), code);
    let error = '';
    try {
      await build({
        config: false,
        entry: [join(dir, `${name}.ts`)],
        outDir: join(dir, 'out', name),
        format: 'esm',
        platform: 'neutral',
        tsconfig: join(pkg, 'tsconfig.json'),
        dts: true,
        deps: { neverBundle: [/^@ydinjs\//u] },
        plugins: viteTraitsPlugin(),
        logLevel: 'silent',
      });
    } catch (e) {
      error = String((e as Error).message)
        .split('\n')
        .filter(Boolean)
        .slice(1, 3)
        .join(' | ');
    }
    if (error) {
      console.log(`${name}: BUILD ERROR ${error}`);
      continue;
    }
    const out = join(dir, 'out', name);
    const files = await readdir(out);
    const js = await readFile(
      join(
        out,
        files.find((f) => f.endsWith('.js') && !f.endsWith('.map'))!,
      ),
      'utf8',
    );
    const dts = await readFile(
      join(
        out,
        files.find((f) => f.endsWith('.d.ts'))!,
      ),
      'utf8',
    );
    const docName = /Doc of (\w+)/u.exec(code)![1];
    const docKept = new RegExp(
      `/\\*\\* Doc of ${docName}\\. \\*/\\n(export )?declare class`,
      'u',
    ).test(dts);
    const branded =
      js.includes('Symbol.hasInstance') &&
      /export const \$\w+ = Symbol|\$\w+ as |Symbol\(/u.test(js);
    console.log(
      `${name}: doc in .d.ts ${docKept ? 'kept' : 'LOST'}; brand in .js ${branded ? 'installed' : 'NONE'}; decorator left in .js ${/@\(?trait/u.test(js) ? 'YES' : 'no'}`,
    );
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
