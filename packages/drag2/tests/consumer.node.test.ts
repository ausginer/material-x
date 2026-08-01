/**
 * The pack/extract consumer fixture.
 *
 * Every other suite imports `src/` directly, so nothing else in this package
 * can see what a consumer actually receives: the `exports` map, the emitted
 * declarations, and whether the tarball contains the files those two promise.
 * This builds, packs and extracts the real package, then imports and compiles
 * against the extracted copy from outside the workspace.
 *
 * It is deliberately the slowest test here. It is also the only one that would
 * catch a subpath whose `default` condition points at a file the build never
 * emitted, or an internal SPI type becoming reachable through a public entry.
 */
import { spawn } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Runs a command to completion, rejecting with the captured output on a
 * non-zero exit — which is what makes the consumer's `tsc` run a usable
 * assertion rather than a bare boolean.
 */
function run(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<Readonly<{ stdout: string }>> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', fail);
    child.on('close', (code) => {
      if (code === 0) {
        done({ stdout });
        return;
      }

      fail(new Error(`${command} exited with ${code}\n${stdout}${stderr}`));
    });
  });
}

const ROOT = resolve(import.meta.dirname, '..');
const REPO = resolve(ROOT, '../..');
const MINUTE = 60_000;

/**
 * Subpaths declared in the export topology from phase 0 whose module is still a
 * stub, so the build has no runtime code to emit for them. Each one moves out of
 * this set in the phase that implements it — the four below in 8b — and the test
 * fails until it does, which is what stops a landed feature from shipping
 * unpacked.
 */
const PENDING = [
  './sortable/handle.js',
  './sortable/landing.js',
  './sortable/layout-animation.js',
  './sortable/placeholder.js',
];

const CONSUMER = `import { draggable, type Behavior } from '@ydinjs/drag2/drag.js';
import {
  ReorderResolution,
  type SortableFeature,
} from '@ydinjs/drag2/sortable.js';

type Controller = Readonly<{ destroy(): void }>;

declare const behavior: Behavior<Controller>;
declare const feature: SortableFeature;
declare const root: HTMLElement;

// Inference through the *packed* declarations, with no explicit type argument.
const controller = draggable(root, behavior);

controller.destroy();
void ReorderResolution.accept();
void feature;

// @ts-expect-error: the behavior value is opaque, so a bare install function is not one
const forgedBehavior: Behavior<Controller> = () => ({});
// A behavior that were still the install function would *also* reject the
// literal above, on its return type. Calling it is what separates the two.
// @ts-expect-error: a behavior is not callable
behavior(null as never);
// @ts-expect-error: the feature value is opaque
const forgedFeature: SortableFeature = () => ({});
// @ts-expect-error: a feature is not callable
feature(null as never);
// @ts-expect-error: the frame part is erased, so \`Behavior\` takes one type argument
type Part = Behavior<Controller, object>;
// @ts-expect-error: the install function type is internal and reaches no public entry
type Factory = import('@ydinjs/drag2/drag.js').BehaviorFactory<Controller, object>;

void forgedBehavior;
void forgedFeature;
`;

const TSCONFIG = JSON.stringify({
  compilerOptions: {
    strict: true,
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'esnext',
    lib: ['esnext', 'dom'],
    types: [],
    noEmit: true,
    // Deliberately on: the point is to typecheck the packed declaration graph,
    // not to trust that it resolves.
    skipLibCheck: false,
  },
  include: ['consumer.ts'],
});

type Packed = Readonly<{
  /** The extracted package root. */
  dir: string;
  /** The consumer project, outside the workspace, resolving the extracted copy. */
  consumer: string;
  /** `exports` as published, minus `./package.json`. */
  subpaths: ReadonlyMap<string, Readonly<{ types: string; default: string }>>;
}>;

let packed: Packed;

const exists = async (path: string): Promise<boolean> => {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
};

/** Every packed file whose extension `suffix` matches, as absolute paths. */
async function packedFiles(
  dir: string,
  suffix: string,
): Promise<readonly string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(entry.parentPath, entry.name));
}

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'drag2-consumer-'));

  await run('npx', ['tsdown', '--config', 'tsdown.config.ts'], ROOT);

  const { stdout } = await run(
    'npm',
    ['pack', '--pack-destination', dir, '--silent'],
    ROOT,
  );

  await run(
    'tar',
    ['-xzf', join(dir, stdout.trim().split('\n').at(-1)!), '-C', dir],
    ROOT,
  );

  const extracted = join(dir, 'package');
  const consumer = join(dir, 'consumer');
  // One scope directory above both the extracted package and the consumer, so
  // node's upward lookup finds it from either. The extracted copy needs it too:
  // `kernel/presentation.js` imports `@ydinjs/box-quad` at runtime, which is
  // the kind of dependency edge a tarball can only be proven to satisfy from
  // outside the workspace.
  const scope = join(dir, 'node_modules', '@ydinjs');

  await mkdir(scope, { recursive: true });
  await mkdir(consumer, { recursive: true });
  // The consumer resolves the extracted tarball, never `src/` — a deep import
  // the `exports` map does not declare has to fail here the way it would for a
  // real consumer.
  await symlink(extracted, join(scope, 'drag2'));
  await symlink(join(REPO, 'packages', 'box-quad'), join(scope, 'box-quad'));
  await writeFile(join(consumer, 'consumer.ts'), CONSUMER);
  await writeFile(join(consumer, 'tsconfig.json'), TSCONFIG);

  const manifest = JSON.parse(
    await readFile(join(extracted, 'package.json'), 'utf8'),
  ) as {
    exports: Record<
      string,
      string | Readonly<{ types: string; default: string }>
    >;
  };
  const subpaths = new Map<
    string,
    Readonly<{ types: string; default: string }>
  >();

  for (const [key, value] of Object.entries(manifest.exports)) {
    if (typeof value !== 'string') {
      subpaths.set(key, value);
    }
  }

  packed = { dir: extracted, consumer, subpaths };
}, 4 * MINUTE);

describe('the packed package', () => {
  it('should ship a runtime module for every landed subpath', async () => {
    // Runtime-imported, not merely stat-ed: a module that exists but cannot
    // resolve its own imports is exactly the B-01 failure this suite exists for.
    const landed = [...packed.subpaths].filter(
      ([key]) => !PENDING.includes(key),
    );

    expect(landed.length).toBeGreaterThan(0);

    const imported = await Promise.all(
      landed.map(([, value]) => import(join(packed.dir, value.default))),
    );

    for (const each of imported) {
      expect(each).toBeTypeOf('object');
    }
  });

  it('should expose sortable.js as a runtime module', async () => {
    // Named on its own because it is the entry the contract gives a runtime
    // export to (`ReorderResolution`) while every other sortable subpath is a
    // feature. A type-only entry emits no `.js`, and the `default` condition
    // would then point at nothing.
    const entry: Readonly<{
      ReorderResolution: Readonly<{ accept(): unknown }>;
    }> = await import(join(packed.dir, './sortable.js'));

    expect(entry.ReorderResolution.accept()).toEqual({ type: 'accepted' });
  });

  it('should leave exactly the unimplemented feature subpaths without runtime code', async () => {
    const missing: string[] = [];

    for (const [key, value] of packed.subpaths) {
      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(join(packed.dir, value.default)))) {
        missing.push(key);
      }
    }

    expect(missing.toSorted()).toEqual(PENDING);
  });

  it('should resolve the types target of every declared subpath', async () => {
    const missing: string[] = [];

    for (const [key, value] of packed.subpaths) {
      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(join(packed.dir, value.types)))) {
        missing.push(key);
      }
    }

    expect(missing).toEqual([]);
  });

  it('should pack every declaration its declarations reference', async () => {
    const files = await packedFiles(packed.dir, '.d.ts');
    const sources = await Promise.all(
      files.map((file) => readFile(file, 'utf8')),
    );
    const dangling: string[] = [];

    for (const [index, source] of sources.entries()) {
      for (const match of source.matchAll(/from\s*"(\.[^"]*)"/gu)) {
        // A declaration references `./x.js`; the file that has to be packed
        // alongside it is `./x.d.ts`.
        const target = resolve(
          dirname(files[index]!),
          match[1]!.replace(/\.js$/u, '.d.ts'),
        );

        // oxlint-disable-next-line no-await-in-loop
        if (!(await exists(target))) {
          dangling.push(`${files[index]!} -> ${match[1]!}`);
        }
      }
    }

    expect(dangling).toEqual([]);
  });

  it('should pack every sourcemap its modules point at', async () => {
    // `files` ships whole directories for `kernel/` and `sortable/`, which
    // carries their maps along, but names the root entries file by file — so a
    // root map is the one artefact the allowlist can silently drop.
    const files = await packedFiles(packed.dir, '.js');
    const sources = await Promise.all(
      files.map((file) => readFile(file, 'utf8')),
    );
    const dangling: string[] = [];

    for (const [index, source] of sources.entries()) {
      const match = /\/\/# sourceMappingURL=(\S+)/u.exec(source);

      if (match === null) {
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(resolve(dirname(files[index]!), match[1]!)))) {
        dangling.push(`${files[index]!} -> ${match[1]!}`);
      }
    }

    expect(dangling).toEqual([]);
  });

  it('should declare no subpath into the kernel', () => {
    // The kernel directory is *shipped*, because the entrypoints import it at
    // runtime, but nothing in it is addressable: the SPI stays internal because
    // no export key reaches it.
    expect(
      [...packed.subpaths.keys()].filter((key) => key.includes('kernel')),
    ).toEqual([]);
  });

  it(
    'should compile a consumer against the packed declarations',
    async () => {
      // The fixture carries the opacity checks as `@ts-expect-error` lines, so a
      // clean exit proves both directions at once: the public imports resolve and
      // typecheck, and neither `Behavior`'s frame part nor `BehaviorFactory` is
      // reachable through a public entry.
      await expect(
        run(
          join(REPO, 'node_modules', '.bin', 'tsc'),
          ['--noEmit', '-p', 'tsconfig.json'],
          packed.consumer,
        ),
      ).resolves.toBeDefined();
    },
    2 * MINUTE,
  );
});
