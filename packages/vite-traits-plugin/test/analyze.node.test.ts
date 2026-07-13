import { describe, expect, it } from 'vitest';
import { analyzeModule } from '../src/analyze.ts';
import { BailoutError, REASON } from '../src/diagnostics.ts';
import { fixtureId, nodeLoader, readFixture } from './helpers.ts';

const CONSUMER_HEAD = [
  "import { impl } from '@ydinjs/core/traits/traits.js';",
  "import { Base } from './base.ts';",
  "import { Checkable } from './checkable.ts';",
].join('\n');

/**
 * Analyzes ad-hoc consumer source rooted at the fixtures directory. Each call
 * needs a unique `name`: `parseModule` caches by id, so reusing one would serve
 * a stale AST for different source.
 */
function analyzeSource(name: string, code: string) {
  return analyzeModule(fixtureId(name), code, nodeLoader);
}

describe('analyzeModule', () => {
  it('should return no compositions when there is no impl site', async () => {
    const { compositions } = await analyzeSource(
      'no-impl.ts',
      'export const x = 1;',
    );
    expect(compositions).toEqual([]);
  });

  it('should analyze one eligible composition from the fixture', async () => {
    const id = fixtureId('consumer.ts');
    const { compositions } = await analyzeModule(
      id,
      await readFixture('consumer.ts'),
      nodeLoader,
    );

    expect(compositions).toHaveLength(1);
    expect(compositions[0]?.composition.traits.map((t) => t.name)).toEqual([
      'Checkable',
      'Nameable',
    ]);
  });

  it('should report both trait modules as dependencies', async () => {
    const id = fixtureId('consumer.ts');
    const { dependencies } = await analyzeModule(
      id,
      await readFixture('consumer.ts'),
      nodeLoader,
    );

    expect(dependencies).toHaveLength(2);
  });

  it('should bail when the trait list is not an inline array', async () => {
    const code = `${CONSUMER_HEAD}
const list = [Checkable];
const FooBase = impl(Base, list);
export default class Foo extends FooBase {}`;

    await expect(
      analyzeSource('list-not-array.ts', code),
    ).rejects.toMatchObject({
      reason: REASON.UNSUPPORTED_TRAIT_LIST,
    });
  });

  it('should bail when a trait list element is a spread', async () => {
    const code = `${CONSUMER_HEAD}
const FooBase = impl(Base, [...[Checkable]]);
export default class Foo extends FooBase {}`;

    await expect(analyzeSource('list-spread.ts', code)).rejects.toMatchObject({
      reason: REASON.UNSUPPORTED_TRAIT_LIST,
    });
  });

  it('should bail when the intermediary is never used as a superclass', async () => {
    const code = `${CONSUMER_HEAD}
const FooBase = impl(Base, [Checkable]);
export default FooBase;`;

    await expect(analyzeSource('impl-escapes.ts', code)).rejects.toMatchObject({
      reason: REASON.IMPL_ESCAPES,
    });
  });

  it('should bail when the intermediary has multiple consumers', async () => {
    const code = `${CONSUMER_HEAD}
const FooBase = impl(Base, [Checkable]);
export class A extends FooBase {}
export const alias = FooBase;`;

    await expect(
      analyzeSource('multi-consumer.ts', code),
    ).rejects.toMatchObject({
      reason: REASON.IMPL_MULTIPLE_CONSUMERS,
    });
  });

  it('should raise a BailoutError instance for unsupported sites', async () => {
    const code = `${CONSUMER_HEAD}
const FooBase = impl(Base, [Checkable]);
export default FooBase;`;

    await expect(
      analyzeSource('bailout-instance.ts', code),
    ).rejects.toBeInstanceOf(BailoutError);
  });
});
