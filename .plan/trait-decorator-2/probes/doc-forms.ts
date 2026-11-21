// Which trait forms keep their class doc in the declarations. Each case is
// built through tsdown with declarations, with the trait plugin
// (`node doc-forms.ts <plugin package dir>`) and without it (`… raw`), as the
// plugin's declarations test builds. A case reads KEPT when its `.d.ts` still
// has the `/** Doc. */` line.
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const pkg = process.argv[2]!;
const withPlugin = process.argv[3] !== 'raw';
const { build } = await import(
  join(pkg, '../../node_modules/tsdown/dist/index.mjs')
);
const { viteTraitsPlugin } = await import(join(pkg, 'src/plugin.ts'));

const HEAD = `import { AnyElement } from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';
`;
const cases: Record<string, string> = {
  written: `/** Doc. */\n@trait\nexport class X extends AnyElement {}\n`,
  lineCommentBetween: `/** Doc. */\n// a note\n@trait\nexport class X extends AnyElement {}\n`,
  lineCommentBeforeExportFirst: `/** Doc. */\n// a note\nexport @trait class X extends AnyElement {}\n`,
  blockCommentBeforeExportFirst: `/** Doc. */\n/* a note */\nexport @trait class X extends AnyElement {}\n`,
  twoDocs: `/** Doc. */\n/** Other. */\n@trait\nexport class X extends AnyElement {}\n`,
  docAfterDecorator: `@trait\n/** Doc. */\nexport class X extends AnyElement {}\n`,
  exportDefault: `/** Doc. */\n@trait\nexport default class X extends AnyElement {}\n`,
  exportDefaultFirst: `/** Doc. */\nexport default @trait class X extends AnyElement {}\n`,
  exportDefaultAnonymous: `/** Doc. */\n@trait\nexport default class extends AnyElement {}\n`,
  abstract: `/** Doc. */\n@trait\nexport abstract class X extends AnyElement {}\n`,
  abstractExportFirst: `/** Doc. */\nexport @trait abstract class X extends AnyElement {}\n`,
};

const dir = await mkdtemp(join(pkg, 'tests/fixtures/gen-doc-forms-'));
try {
  for (const [name, body] of Object.entries(cases)) {
    await writeFile(join(dir, `${name}.ts`), `${HEAD}\n${body}`);
    const out = join(dir, 'out', name);
    try {
      await build({
        config: false,
        entry: [join(dir, `${name}.ts`)],
        outDir: out,
        format: 'esm',
        platform: 'neutral',
        tsconfig: join(pkg, 'tsconfig.json'),
        dts: true,
        deps: { neverBundle: [/^@ydinjs\//u] },
        plugins: withPlugin ? viteTraitsPlugin() : [],
        logLevel: 'silent',
      });
    } catch (error) {
      const [reason] = String((error as Error).message)
        .split('\n')
        .filter((line) => line.includes('trait-flattener ('));
      console.log(`${name}: BUILD ERROR ${reason?.trim() ?? ''}`);
      continue;
    }
    const files = await readdir(out);
    const dts = await readFile(
      join(
        out,
        files.find((file) => file.endsWith('.d.ts'))!,
      ),
      'utf8',
    );
    const lines = dts
      .split('\n')
      .filter((line) =>
        /Doc|Other|declare|export (default )?class/u.test(line),
      );
    console.log(
      `${name}: ${dts.includes('/** Doc. */') ? 'KEPT' : 'LOST'} | ${lines.join(' / ')}`,
    );
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
