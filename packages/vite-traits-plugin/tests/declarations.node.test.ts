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

/**
 * A module that exports a trait as the default, with `keywords` between
 * `@trait` and `class`.
 */
const defaultTrait = (keywords: string): string =>
  `import { AnyElement } from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';

/** A default trait. */
@trait
${keywords} class Defaulted extends AnyElement {}
`;

/** Each default trait's module, by file name. */
const DEFAULT_TRAITS: Readonly<Record<string, string>> = {
  'defaulted.ts': defaultTrait('export default'),
  'default-block.ts': defaultTrait('export /* A note. */ default'),
  'default-line.ts': defaultTrait('export // A note.\ndefault'),
};

let dir: string;
let declarations: string;
const defaultDeclarations = new Map<string, string>();

beforeAll(async () => {
  dir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-dts-'));
  await writeFile(join(dir, 'opened.ts'), TRAIT);
  const defaults = Object.keys(DEFAULT_TRAITS);
  await Promise.all(
    defaults.map((file) => writeFile(join(dir, file), DEFAULT_TRAITS[file]!)),
  );
  await build({
    config: false,
    entry: [join(dir, 'opened.ts'), ...defaults.map((file) => join(dir, file))],
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
  for (const file of defaults) {
    defaultDeclarations.set(
      file,
      // oxlint-disable-next-line no-await-in-loop
      await readFile(join(dir, 'out', file.replace(/\.ts$/u, '.d.ts')), 'utf8'),
    );
  }
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

  it.each([
    ['an export default class', 'defaulted.ts'],
    [
      'an export default class with a block comment after export',
      'default-block.ts',
    ],
    [
      'an export default class with a line comment after export',
      'default-line.ts',
    ],
  ])('should keep the JSDoc of %s', (_, file) => {
    expect(defaultDeclarations.get(file)).toContain(
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
