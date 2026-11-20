import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'tsdown';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { viteTraitsPlugin } from '../src/plugin.ts';
import { FIXTURES } from './helpers.ts';

/**
 * A trait's declarations through tsdown, which records each module for its
 * declaration emitter in a transform that runs before the plugin's: only the
 * plugin's `load` hook comes earlier.
 */
const TRAIT = `import { Bool } from '@ydinjs/core/attribute.js';
import { AnyElement, attributes } from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';

/** An element with an \`open\` attribute. */
@trait
@attributes({ open: Bool })
export class Opened extends AnyElement {
  accessor open!: boolean;
}

/** An element that is only a trait. */
@trait
export class Plain extends AnyElement {}

/** A trait whose doc a line comment follows. */
// A note.
@trait
export class LineNoted extends AnyElement {}

/** A trait whose doc a block comment follows. */
/* A note. */
@trait
export class BlockNoted extends AnyElement {}

/** An abstract trait. */
@trait
export abstract class Abstracted extends AnyElement {}
`;

/** A trait that its module exports as the default. */
const DEFAULT_TRAIT = `import { AnyElement } from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';

/** A default trait. */
@trait
export default class Defaulted extends AnyElement {}
`;

let dir: string;
let declarations: string;
let defaultDeclarations: string;

beforeAll(async () => {
  dir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-dts-'));
  await writeFile(join(dir, 'opened.ts'), TRAIT);
  await writeFile(join(dir, 'defaulted.ts'), DEFAULT_TRAIT);
  await build({
    config: false,
    entry: [join(dir, 'opened.ts'), join(dir, 'defaulted.ts')],
    outDir: join(dir, 'out'),
    format: 'esm',
    platform: 'neutral',
    // The package's tsconfig sets `isolatedDeclarations`, so the declarations
    // come from oxc's emitter, as in the repository's builds.
    tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
    dts: true,
    deps: { neverBundle: [/^@ydinjs\//u] },
    plugins: viteTraitsPlugin(),
    logLevel: 'silent',
  });
  declarations = await readFile(join(dir, 'out', 'opened.d.ts'), 'utf8');
  defaultDeclarations = await readFile(
    join(dir, 'out', 'defaulted.d.ts'),
    'utf8',
  );
}, 60_000);

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("a trait's declarations through tsdown", () => {
  it('should keep the JSDoc in front of @trait and @attributes', () => {
    expect(declarations).toContain(
      '/** An element with an `open` attribute. */\nexport declare class Opened',
    );
  });

  it('should keep the JSDoc in front of @trait alone', () => {
    expect(declarations).toContain(
      '/** An element that is only a trait. */\nexport declare class Plain',
    );
  });

  it('should keep the JSDoc that a line comment follows', () => {
    expect(declarations).toContain(
      '/** A trait whose doc a line comment follows. */\nexport declare class LineNoted',
    );
  });

  it('should keep the JSDoc that a block comment follows', () => {
    expect(declarations).toContain(
      '/** A trait whose doc a block comment follows. */\nexport declare class BlockNoted',
    );
  });

  it('should keep the JSDoc of an export default class', () => {
    expect(defaultDeclarations).toContain(
      '/** A default trait. */\nexport default class Defaulted',
    );
  });

  it('should keep the JSDoc of an abstract class', () => {
    expect(declarations).toContain(
      '/** An abstract trait. */\nexport declare abstract class Abstracted',
    );
  });
});

describe("the plugin's load stage", () => {
  /**
   * The `trait-attributes` plugin's load hook, after `command`'s
   * configResolved, with each file it asks the host to watch in `watched`.
   */
  const loadHook = (command: 'build' | 'serve', watched: string[] = []) => {
    const [attributes] = viteTraitsPlugin();
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const plugin = attributes as unknown as {
      configResolved(config: unknown): void;
      load(
        this: { addWatchFile(id: string): void },
        id: string,
      ): Promise<{ code: string } | null>;
    };
    plugin.configResolved({ command, build: {} });
    const context = { addWatchFile: (id: string) => watched.push(id) };

    return (id: string) => plugin.load.call(context, id);
  };

  it('should move export before the decorators in a build', async () => {
    const result = await loadHook('build')(join(dir, 'opened.ts'));

    expect(result?.code).toContain(
      '/** An element with an `open` attribute. */\nexport @trait\n@attributes({ open: Bool })\nclass Opened',
    );
  });

  it('should ask the host to watch the file it loaded', async () => {
    const watched: string[] = [];
    await loadHook('build', watched)(join(dir, 'opened.ts'));

    expect(watched).toEqual([join(dir, 'opened.ts')]);
  });

  it('should load nothing on the dev server', async () => {
    expect(await loadHook('serve')(join(dir, 'opened.ts'))).toBeNull();
  });

  it('should give each load of one id the text it read', async () => {
    const load = loadHook('build');
    const file = join(dir, 'edited.ts');
    await writeFile(file, TRAIT);
    const before = await load(file);
    await writeFile(
      file,
      TRAIT.replace('An element that is only a trait.', 'An edited doc.'),
    );
    const after = await load(file);

    expect([
      before?.code.includes(
        '/** An element that is only a trait. */\nexport @trait',
      ),
      after?.code.includes('/** An edited doc. */\nexport @trait'),
    ]).toEqual([true, true]);
  });
});
