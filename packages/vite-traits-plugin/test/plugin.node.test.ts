import { describe, expect, it, vi } from 'vitest';
import { viteTraitsPlugin } from '../src/plugin.ts';
import { fixtureId, nodeLoader, readFixture } from './helpers.ts';

type TransformResult = { code: unknown } | null | undefined;
type Context = ReturnType<typeof mockContext>;

/**
 * Minimal Rollup/Vite plugin-context stand-in: only the hooks the transform
 * uses. `resolve` mirrors Node resolution so the on-disk fixtures are reached.
 */
function mockContext() {
  const warnings: string[] = [];
  const watched: string[] = [];

  return {
    warnings,
    watched,
    warn(warning: string | { message: string }) {
      warnings.push(typeof warning === 'string' ? warning : warning.message);
    },
    addWatchFile(id: string) {
      watched.push(id);
    },
    async resolve(specifier: string, importer: string) {
      const id = await nodeLoader.resolve(specifier, importer);
      return id ? { id, external: false } : null;
    },
  };
}

/** Invokes the plugin's transform hook (an `ObjectHook`) against `code`. */
function runTransform(
  context: Context,
  code: string,
  id: string,
): Promise<TransformResult> {
  const { transform } = viteTraitsPlugin();
  const handler =
    typeof transform === 'function' ? transform : transform!.handler;

  return (
    handler as unknown as (
      this: Context,
      code: string,
      id: string,
    ) => Promise<TransformResult>
  ).call(context, code, id);
}

describe('viteTraitsPlugin', () => {
  it('should run before other transforms', () => {
    expect(viteTraitsPlugin().enforce).toBe('pre');
  });

  it('should flatten an eligible consumer module', async () => {
    const result = await runTransform(
      mockContext(),
      await readFixture('consumer.ts'),
      fixtureId('consumer.ts'),
    );

    expect(String(result?.code)).toMatch(/class Foo extends Base/u);
  });

  it('should augment a descriptor origin module with synthetic exports', async () => {
    const result = await runTransform(
      mockContext(),
      await readFixture('checkable.ts'),
      fixtureId('checkable.ts'),
    );

    expect(String(result?.code)).toMatch(/export \{ \$checkable as __mxflat_/u);
  });

  it('should mark descriptor trait() calls pure for downstream tree-shaking', async () => {
    const result = await runTransform(
      mockContext(),
      await readFixture('checkable.ts'),
      fixtureId('checkable.ts'),
    );

    expect(String(result?.code)).toMatch(/\/\*@__PURE__\*\/ trait\(/u);
  });

  it('should skip modules with neither impl nor trait', async () => {
    const result = await runTransform(
      mockContext(),
      await readFixture('base.ts'),
      fixtureId('base.ts'),
    );

    expect(result).toBeNull();
  });

  it('should warn and make no edits when a site bails', async () => {
    const context = mockContext();
    const warnSpy = vi.spyOn(context, 'warn');
    const code = [
      "import { impl } from '@ydinjs/core/traits/attributes.js';",
      "import { Base } from './base.ts';",
      "import { Checkable } from './checkable.ts';",
      'const FooBase = impl(Base, [Checkable]);',
      'export default FooBase;',
    ].join('\n');

    const result = await runTransform(
      context,
      code,
      fixtureId('bailing-consumer.ts'),
    );

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(context.warnings[0]).toContain('impl-escapes');
    expect(result).toBeNull();
  });

  it('should register trait dependencies as watch files', async () => {
    const context = mockContext();

    await runTransform(
      context,
      await readFixture('consumer.ts'),
      fixtureId('consumer.ts'),
    );

    expect(context.watched.map((p) => p.replace(/^.*\//u, '')).sort()).toEqual([
      'checkable.ts',
      'nameable.ts',
    ]);
  });
});
