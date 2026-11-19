import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer, type InlineConfig, type Rolldown } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { viteTraitsPlugin } from '../src/plugin.ts';
import { FIXTURES } from './helpers.ts';

/**
 * The plugin through Vite's own `build()` and `createServer()`, for each build
 * kind: only an application build deletes a trait's instance members, in a
 * source trait module and in one that a library build already transformed.
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

/** A component as the flattener emits it, and what instanceof answers. */
const entry = (
  from: string,
): string => `import { impl } from '@ydinjs/core/traits/composition.js';
import { $linked, Linked } from '${from}';

class Link {
  static {
    impl(this, $linked);
  }
}

class Other {}

globalThis.result = [new Link() instanceof Linked, new Other() instanceof Linked, null instanceof Linked];
`;

/** Another library's class whose hasInstance method only looks generated. */
const LOOKALIKE = `const kTag = 'tag';

export class Tagged {
  static [Symbol.hasInstance](o) {
    return typeof o === 'object' && o !== null && o[kTag] === true;
  }

  describe() {
    return 'lookalike-member';
  }
}
`;

const LOOKALIKE_ENTRY = `import { Tagged } from './lookalike.js';

globalThis.result = [({ tag: true }) instanceof Tagged, new Tagged().describe()];
`;

let dir: string;

/** Vite's options for a build of `input` in the test's directory. */
function config(input: string, lib: boolean): InlineConfig {
  return {
    configFile: false,
    root: dir,
    logLevel: 'silent',
    plugins: [viteTraitsPlugin()],
    build: {
      write: false,
      minify: false,
      ...(lib
        ? { lib: { entry: join(dir, input), formats: ['es'], fileName: 'out' } }
        : { rolldownOptions: { input: join(dir, input) } }),
    },
  };
}

/** The JavaScript of a build of `input`, all chunks joined. */
async function bundle(input: string, lib: boolean): Promise<string> {
  const result = (await build(config(input, lib))) as
    | Rolldown.RolldownOutput
    | Rolldown.RolldownOutput[];
  const outputs = Array.isArray(result) ? result : [result];

  return outputs
    .flatMap(({ output }) => output)
    .map((chunk) => ('code' in chunk ? chunk.code : ''))
    .join('\n');
}

/** Runs a bundle and returns what it put in `globalThis.result`. */
async function run(code: string): Promise<unknown> {
  await import(
    `data:text/javascript,${encodeURIComponent(`${code}\n//${Math.random()}`)}`
  );

  return (globalThis as { result?: unknown }).result;
}

beforeAll(async () => {
  dir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-'));
  await mkdir(join(dir, 'built'));
  await writeFile(join(dir, 'linked.ts'), TRAIT);
  // The built trait module is the plugin's own output: a Vite library build of
  // the source trait.
  const built = await bundle('linked.ts', true);
  await Promise.all([
    writeFile(join(dir, 'built', 'linked.js'), built),
    writeFile(join(dir, 'app-built.js'), entry('./built/linked.js')),
    writeFile(join(dir, 'app-source.js'), entry('./linked.ts')),
    writeFile(join(dir, 'lookalike.js'), LOOKALIKE),
    writeFile(join(dir, 'app-lookalike.js'), LOOKALIKE_ENTRY),
  ]);
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('the plugin in Vite', () => {
  it("should delete a built trait's members in an application build", async () => {
    const code = await bundle('app-built.js', false);

    expect([code.includes('linked-member'), await run(code)]).toEqual([
      false,
      [true, false, false],
    ]);
  });

  it("should keep a built trait's members in a library build", async () => {
    expect(await bundle('app-built.js', true)).toContain('linked-member');
  });

  it("should keep a built trait's members on the dev server", async () => {
    const server = await createServer({
      ...config('app-built.js', false),
      server: { middlewareMode: true, ws: false },
      appType: 'custom',
    });
    try {
      const result = await server.transformRequest('/built/linked.js');

      expect(result?.code).toContain('linked-member');
    } finally {
      await server.close();
    }
  });

  it("should leave a look-alike class's members in an application build", async () => {
    const code = await bundle('app-lookalike.js', false);

    expect([code.includes('lookalike-member'), await run(code)]).toEqual([
      true,
      [true, 'lookalike-member'],
    ]);
  });

  it('should give a source trait the same result as a built one in an application build', async () => {
    const code = await bundle('app-source.js', false);

    expect([code.includes('linked-member'), await run(code)]).toEqual([
      false,
      [true, false, false],
    ]);
  });
});
