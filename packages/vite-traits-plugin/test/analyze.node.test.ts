import { describe, expect, it } from 'vitest';
import { analyzeModule } from '../src/analyze.ts';
import { BailoutError, REASON } from '../src/diagnostics.ts';
import { fixtureId, nodeLoader, readFixture } from './helpers.ts';

const CONSUMER_HEAD = [
  "import { impl } from '@ydinjs/core/traits/attributes.js';",
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

  it('should resolve a trait list given as a const-array reference', async () => {
    const code = `${CONSUMER_HEAD}
const list = [Checkable];
const FooBase = impl(Base, list);
export default class Foo extends FooBase {}`;

    const { compositions } = await analyzeSource('list-ref.ts', code);
    expect(compositions[0]?.composition.traits.map((t) => t.name)).toEqual([
      'Checkable',
    ]);
  });

  it('should expand a spread element in the trait list', async () => {
    const code = `${CONSUMER_HEAD}
import { Nameable } from './nameable.ts';
const FooBase = impl(Base, [...[Checkable], Nameable]);
export default class Foo extends FooBase {}`;

    const { compositions } = await analyzeSource('list-spread.ts', code);
    expect(compositions[0]?.composition.traits.map((t) => t.name)).toEqual([
      'Checkable',
      'Nameable',
    ]);
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
