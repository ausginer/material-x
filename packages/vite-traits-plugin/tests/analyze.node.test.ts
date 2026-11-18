import { describe, expect, it } from 'vitest';
import { analyzeModule, parseModule } from '../src/analyze.ts';
import { BailoutError, REASON } from '../src/diagnostics.ts';
import { fixtureId, nodeLoader, readFixture } from './helpers.ts';

const CONSUMER_HEAD = [
  "import { impl } from '@ydinjs/core/traits/attributes.js';",
  "import { Base } from './base.ts';",
  "import { Checkable } from './checkable.ts';",
].join('\n');

/** Analyzes ad-hoc consumer source rooted at the fixtures directory. */
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

  it.each(['traits', 'piirre'])(
    'should not recognize impl from the pre-rename %s module',
    async (module) => {
      const code = `import { impl } from '@ydinjs/core/traits/${module}.js';
import { Base } from './base.ts';
import { Checkable } from './checkable.ts';
const FooBase = impl(Base, [Checkable]);
export class Foo extends FooBase {}`;

      const { compositions, bailouts } = await analyzeSource(
        `pre-rename-${module}.ts`,
        code,
      );
      expect([compositions.length, bailouts.length]).toEqual([0, 0]);
    },
  );

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

    const { bailouts } = await analyzeSource('impl-escapes.ts', code);
    expect(bailouts.map((b) => b.reason)).toEqual([REASON.IMPL_ESCAPES]);
  });

  it('should bail when the intermediary has multiple consumers', async () => {
    const code = `${CONSUMER_HEAD}
const FooBase = impl(Base, [Checkable]);
export class A extends FooBase {}
export const alias = FooBase;`;

    const { bailouts } = await analyzeSource('multi-consumer.ts', code);
    expect(bailouts.map((b) => b.reason)).toEqual([
      REASON.IMPL_MULTIPLE_CONSUMERS,
    ]);
  });

  it('should report a bailout as a BailoutError instance', async () => {
    const code = `${CONSUMER_HEAD}
const FooBase = impl(Base, [Checkable]);
export default FooBase;`;

    const { bailouts } = await analyzeSource('bailout-instance.ts', code);
    expect(bailouts[0]).toBeInstanceOf(BailoutError);
  });

  it('should bail on a class-based trait', async () => {
    const code = `${CONSUMER_HEAD}
import { Focusable } from './focusable.ts';
const FooBase = impl(Base, [Checkable, Focusable]);
export class Foo extends FooBase {}`;

    const { bailouts } = await analyzeSource('class-based.ts', code);
    expect(bailouts.map((b) => b.reason)).toEqual([REASON.UNSUPPORTED_TRAIT]);
  });

  it('should bail on a cyclic trait-list reference', async () => {
    const code = `${CONSUMER_HEAD}
const A = [...B];
const B = [...A];
const FooBase = impl(Base, A);
export class Foo extends FooBase {}`;

    const { bailouts } = await analyzeSource('cyclic-list.ts', code);
    expect(bailouts.map((b) => b.reason)).toEqual([
      REASON.UNSUPPORTED_TRAIT_LIST,
    ]);
  });

  it('should expand one trait list spread twice, which is not a cycle', async () => {
    const code = `${CONSUMER_HEAD}
const A = [Checkable];
const FooBase = impl(Base, [...A, ...A]);
export class Foo extends FooBase {}`;

    const { compositions } = await analyzeSource('repeated-list.ts', code);
    expect(compositions[0]?.composition.traits.map((t) => t.name)).toEqual([
      'Checkable',
      'Checkable',
    ]);
  });
});

describe('analyzeModule with two impl sites', () => {
  const code = `${CONSUMER_HEAD}
import { Focusable } from './focusable.ts';
const FirstBase = impl(Base, [Checkable]);
export class First extends FirstBase {}
const SecondBase = impl(Base, [Checkable, Focusable]);
export class Second extends SecondBase {}`;

  it('should flatten the eligible site when the other one bails', async () => {
    const { compositions } = await analyzeSource('two-sites.ts', code);
    expect(compositions.map((c) => c.className)).toEqual(['First']);
  });

  it('should report the bailout of the retained site', async () => {
    const { bailouts } = await analyzeSource('two-sites.ts', code);
    expect(bailouts.map((b) => [b.composition, b.reason] as const)).toEqual([
      ['SecondBase', REASON.UNSUPPORTED_TRAIT],
    ]);
  });
});

describe('analyzeModule and the component class', () => {
  const analyzeClass = (name: string, body: string) =>
    analyzeSource(
      name,
      `${CONSUMER_HEAD}
const FooBase = impl(Base, [Checkable]);
export class Foo extends FooBase {
${body}
}`,
    );

  it('should bail when the class declares only the getter of a trait key', async () => {
    const { bailouts } = await analyzeClass(
      'getter-half.ts',
      'get checked() { return true; }',
    );
    expect(bailouts.map((b) => b.reason)).toEqual([REASON.CLASS_ACCESSOR_HALF]);
  });

  it('should bail when the class declares only the setter of a trait key', async () => {
    const { bailouts } = await analyzeClass(
      'setter-half.ts',
      "set 'checked'(value) {}",
    );
    expect(bailouts.map((b) => b.reason)).toEqual([REASON.CLASS_ACCESSOR_HALF]);
  });

  it('should flatten a class that overrides both halves of a trait accessor', async () => {
    const { compositions, bailouts } = await analyzeClass(
      'accessor-pair.ts',
      'get checked() { return true; }\nset checked(value) {}',
    );
    expect([compositions.length, bailouts.length]).toEqual([1, 0]);
  });

  it('should flatten a class whose lone getter is not a trait key', async () => {
    const { compositions } = await analyzeClass(
      'own-getter.ts',
      'get label() { return super.label; }',
    );
    expect(compositions).toHaveLength(1);
  });

  it('should bail when the class reads super.key for a trait key', async () => {
    const { bailouts } = await analyzeClass(
      'super-key.ts',
      'toggle() { return !super.checked; }',
    );
    expect(bailouts.map((b) => b.reason)).toEqual([
      REASON.CLASS_SUPER_TRAIT_MEMBER,
    ]);
  });

  it('should bail when the class writes super.key for a trait key', async () => {
    const { bailouts } = await analyzeClass(
      'super-key-write.ts',
      'clear() { super.checked = false; }',
    );
    expect(bailouts.map((b) => b.reason)).toEqual([
      REASON.CLASS_SUPER_TRAIT_MEMBER,
    ]);
  });

  it('should bail when the class reads super.observedAttributes', async () => {
    const { bailouts } = await analyzeClass(
      'super-observed.ts',
      'static get observedAttributes() { return [...super.observedAttributes, "x"]; }',
    );
    expect(bailouts.map((b) => b.reason)).toEqual([
      REASON.CLASS_SUPER_TRAIT_MEMBER,
    ]);
  });

  it('should bail when the class uses a computed super member', async () => {
    const { bailouts } = await analyzeClass(
      'super-computed.ts',
      "read() { return super['checked']; }",
    );
    expect(bailouts.map((b) => b.reason)).toEqual([
      REASON.CLASS_COMPUTED_SUPER,
    ]);
  });
});

describe('parseModule', () => {
  it('should parse a module again when its source changes', () => {
    const id = fixtureId('reparsed.ts');
    parseModule(id, 'export const first = 1;');
    const program = parseModule(id, 'export const second = 2;');

    expect(program.body[0]?.end).toBe('export const second = 2;'.length);
  });

  it('should reuse the parse of an unchanged source', () => {
    const id = fixtureId('reused.ts');
    const code = 'export const same = 1;';

    expect(parseModule(id, code)).toBe(parseModule(id, code));
  });
});
