import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { rolldown } from 'rolldown';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { viteTraitsPlugin } from '../src/plugin.ts';
import { FIXTURES, transform, transformTrait } from './helpers.ts';

/**
 * The brand install in bundles, on the plugin's own output: a trait module as
 * its build leaves it, a component as the flattener emits it, and
 * applications bundled from them, minified, with rolldown and with esbuild.
 */
const TRAIT = `import { trait } from '@ydinjs/core/traits/composition.js';

export class Linked {
  static {
    trait(this);
  }

  get href(): string {
    return 'linked-member';
  }
}
`;

const COMPONENT = `import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { Linked } from './linked.ts';

class Base {}

const LinkBase: Composed<typeof Base, [typeof Linked]> = compose(Base);

export class Link extends LinkBase {}
`;

const OTHER = 'export class Other {}\n';

const USES = `import { Link } from './link.ts';
import { Linked } from './linked.ts';
import { Other } from './other.ts';
globalThis.result = [new Link() instanceof Linked, new Other() instanceof Linked, null instanceof Linked];
`;

const IGNORES = `import { Link } from './link.ts';
globalThis.result = new Link();
`;

type Bundler = (entry: string) => Promise<string>;

const BUNDLERS: Readonly<Record<string, Bundler>> = {
  rolldown: async (entry) => {
    const bundle = await rolldown({ input: entry, logLevel: 'silent' });
    const { output } = await bundle.generate({ format: 'esm', minify: true });
    return output[0].code;
  },
  esbuild: async (entry) => {
    const result = await esbuild({
      entryPoints: [entry],
      bundle: true,
      minify: true,
      format: 'esm',
      write: false,
      logLevel: 'silent',
    });
    return result.outputFiles[0]!.text;
  },
};

/** Runs a bundle and returns what it put in `globalThis.result`. */
async function run(code: string): Promise<unknown> {
  await import(
    `data:text/javascript,${encodeURIComponent(`${code}\n//${Math.random()}`)}`
  );
  return (globalThis as { result?: unknown }).result;
}

describe('the brand install in bundles', () => {
  let dir: string;

  /** Writes the trait module and the component as the plugin emits them. */
  const write = async (
    applicationBuild: boolean,
    trait: string,
  ): Promise<void> => {
    const linked = join(dir, 'linked.ts');
    const link = join(dir, 'link.ts');
    await writeFile(linked, transformTrait(linked, trait, applicationBuild));
    await writeFile(link, COMPONENT);
    await writeFile(link, (await transform(link)).code);
  };

  beforeAll(async () => {
    dir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-'));
    await Promise.all([
      writeFile(join(dir, 'other.ts'), OTHER),
      writeFile(join(dir, 'uses.ts'), USES),
      writeFile(join(dir, 'ignores.ts'), IGNORES),
    ]);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe.each(Object.entries(BUNDLERS))('with %s', (_, bundle) => {
    it('should drop the trait class from a bundle that never uses instanceof', async () => {
      await write(false, TRAIT);

      expect(await bundle(join(dir, 'ignores.ts'))).not.toContain(
        'hasInstance',
      );
    });

    it('should keep the class and give instanceof its answers in a bundle that uses it', async () => {
      await write(false, TRAIT);

      expect(await run(await bundle(join(dir, 'uses.ts')))).toEqual([
        true,
        false,
        false,
      ]);
    });

    it("should keep the class without its members after an application build's deletion", async () => {
      await write(true, TRAIT);
      const code = await bundle(join(dir, 'uses.ts'));

      expect([code.includes('linked-member'), await run(code)]).toEqual([
        false,
        [true, false, false],
      ]);
    });

    it('should keep the brand install through a library build of the trait module', async () => {
      const source = join(dir, 'linked.source.ts');
      await writeFile(source, TRAIT);
      const library = await rolldown({
        input: source,
        plugins: viteTraitsPlugin(),
        external: [/^@ydinjs\//u],
        logLevel: 'silent',
      });
      const { output } = await library.generate({ format: 'esm' });
      await write(false, output[0].code);

      expect(await run(await bundle(join(dir, 'uses.ts')))).toEqual([
        true,
        false,
        false,
      ]);
    });
  });
});
