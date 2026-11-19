import { describe, expect, it } from 'vitest';
import { CODE } from '../src/diagnostics.ts';
import { fixtureId, transform } from './helpers.ts';

const HEADER = `import { compose, trait, bound, type Composed, type Bound } from '@ydinjs/core/traits/composition.js';
import { AnyElement, attributes } from '@ydinjs/core/traits/attribute-traits.js';
import { Bool, Str } from '@ydinjs/core/attribute.js';
import { Base } from './base.ts';
import { Checkable } from './checkable.ts';
`;

/**
 * Transforms a module that exists only in memory, beside the fixtures, with
 * `others` as more such modules by name.
 */
function run(body: string, others: Readonly<Record<string, string>> = {}) {
  const id = fixtureId('virtual.ts');
  const files = Object.fromEntries([
    [id, `${HEADER}${body}`],
    ...Object.entries(others).map(([name, code]) => [
      fixtureId(name),
      name.endsWith('.ts') ? `${HEADER}${code}` : code,
    ]),
  ]);

  return transform(id, { files });
}

/** A trait class in the module, `class Name extends AnyElement`. */
function traitClass(name: string, body: string): string {
  return `export class ${name} extends AnyElement {\n  static {\n    trait(this);\n  }\n${body}\n}\n`;
}

/** A component of `traits`, named `Foo`, with `body`. */
function component(traits: string, body = ''): string {
  return `const FooBase: Composed<typeof Base, [${traits}]> = compose(Base);\nexport class Foo extends FooBase {\n${body}\n}\n`;
}

describe('build errors', () => {
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    [
      'an exported composition',
      CODE.COMPOSITION_SHAPE,
      'export const FooBase: Composed<typeof Base, [typeof Checkable]> = compose(Base);\nexport class Foo extends FooBase {}\n',
    ],
    [
      'compose() in a heritage clause',
      CODE.COMPOSITION_SHAPE,
      'export class Foo extends compose(Base) {}\n',
    ],
    [
      'a composition that two classes extend',
      CODE.COMPOSITION_SHAPE,
      'const FooBase: Composed<typeof Base, [typeof Checkable]> = compose(Base);\nexport class Foo extends FooBase {}\nexport class Bar extends FooBase {}\n',
    ],
    [
      'a list element that is not typeof T',
      CODE.TRAIT_LIST,
      component('typeof Checkable, string'),
    ],
    [
      'a list alias that refers to itself',
      CODE.TRAIT_LIST,
      `type Loop = readonly [...Loop];\n${component('...Loop')}`,
    ],
    [
      'a class that is not a trait',
      CODE.TRAIT_UNRESOLVED,
      `class Plain {}\n${component('typeof Plain')}`,
    ],
    [
      'a trait with a constructor',
      CODE.TRAIT_MEMBER,
      `${traitClass('Made', '  constructor() { super(); }')}${component('typeof Made')}`,
    ],
    [
      'a trait member that uses super',
      CODE.TRAIT_MEMBER,
      `${traitClass('Calls', '  run(): unknown { return super.toString(); }')}${component('typeof Calls')}`,
    ],
    [
      'a trait member that reads a private name',
      CODE.TRAIT_MEMBER,
      `${traitClass('Private', '  #secret!: number;\n  run(): number { return this.#secret; }')}${component('typeof Private')}`,
    ],
    [
      'a trait static block that does more than call trait()',
      CODE.TRAIT_MEMBER,
      `export class Busy extends AnyElement {\n  static {\n    trait(this);\n    console.log(1);\n  }\n}\n${component('typeof Busy')}`,
    ],
    [
      'a trait instance field',
      CODE.TRAIT_FIELD,
      `${traitClass('Counted', '  count = 0;')}${component('typeof Counted')}`,
    ],
    [
      "a trait's lone getter over an earlier trait's pair",
      CODE.TRAIT_ACCESSOR_HALF,
      `${traitClass('Getter', '  get checked(): boolean { return true; }')}${component('typeof Checkable, typeof Getter')}`,
    ],
    [
      'a tuple static',
      CODE.STATIC_KIND,
      `${traitClass('Tuple', "  static readonly names: readonly ['a'] = ['a'];")}${component('typeof Tuple')}`,
    ],
    [
      'a class-instance static',
      CODE.STATIC_KIND,
      `${traitClass('Mapped', '  static readonly names: ReadonlyMap<string, string> = new Map();')}${component('typeof Mapped')}`,
    ],
    [
      'a static that two traits give different kinds',
      CODE.STATIC_KIND_MISMATCH,
      `${traitClass('Listed', "  static readonly names: readonly string[] = ['a'];")}${traitClass('Keyed', '  static readonly names: Readonly<{ a: number }> = { a: 1 };')}${component('typeof Listed, typeof Keyed')}`,
    ],
    [
      "the component's lone getter over a trait's pair",
      CODE.CLASS_ACCESSOR_HALF,
      component(
        'typeof Checkable',
        '  override get checked(): boolean { return true; }',
      ),
    ],
    [
      "super.key for a trait's key",
      CODE.CLASS_SUPER_TRAIT_MEMBER,
      component(
        'typeof Checkable',
        '  run(): boolean { return super.checked; }',
      ),
    ],
    [
      'a computed super member',
      CODE.CLASS_COMPUTED_SUPER,
      component(
        'typeof Checkable',
        "  run(): unknown { return super['checked']; }",
      ),
    ],
    [
      'an attribute table key with no accessor',
      CODE.ATTRIBUTE_TABLE,
      'export class Extra extends AnyElement {\n  static {\n    trait(this);\n    attributes(this, { open: Bool, label: Str });\n  }\n\n  accessor open!: boolean;\n}\n',
    ],
    [
      'an accessor with no table entry',
      CODE.ATTRIBUTE_TABLE,
      'export class Missing extends AnyElement {\n  static {\n    trait(this);\n    attributes(this, { open: Bool });\n  }\n\n  accessor open!: boolean;\n  accessor label!: string | null;\n}\n',
    ],
    [
      'a converter that is a call',
      CODE.ATTRIBUTE_TABLE,
      'export class Called extends AnyElement {\n  static {\n    trait(this);\n    attributes(this, { open: make() });\n  }\n\n  accessor open!: boolean;\n}\n',
    ],
    [
      'an accessor with an initializer',
      CODE.ATTRIBUTE_ACCESSOR,
      'export class Initialized extends AnyElement {\n  static {\n    trait(this);\n    attributes(this, { open: Bool });\n  }\n\n  accessor open = false;\n}\n',
    ],
  ];

  it.each(cases)('should fail the build for %s', async (_, code, body) => {
    await expect(run(body)).rejects.toMatchObject({ code });
  });

  it('should fail the build for a trait member that parses to another tree in TypeScript', async () => {
    await expect(
      run(
        `import type { Compare } from '@fixture/forwarding/compare.mjs';\n${component('typeof Compare')}`,
        {
          // Another package's built trait. It is kept out of the fixture
          // files, whose formatter would drop the parentheses.
          'packages/forwarding/compare.mjs': [
            "const $compare = Symbol('Compare');",
            'class Compare {',
            '  static [Symbol.hasInstance](o) {',
            '    return o != null && o[$compare] === true;',
            '  }',
            '  compare(a, b, c) {',
            '    return a < b > (c);',
            '  }',
            '}',
            'export { $compare, Compare };',
          ].join('\n'),
        },
      ),
    ).rejects.toMatchObject({ code: CODE.TRAIT_SOURCE_LANGUAGE });
  });

  it("should fail the build for a member that reads a global the component's module binds", async () => {
    await expect(
      run(
        `import { Global } from './virtual-global.ts';\nconst structuredClone = 1;\n${component('typeof Global')}`,
        {
          'virtual-global.ts': traitClass(
            'Global',
            '  run(): unknown { return structuredClone(1); }',
          ),
        },
      ),
    ).rejects.toMatchObject({ code: CODE.TRAIT_BINDING_SHADOWED });
  });
});

describe('the conflict warning', () => {
  const conflict = `${traitClass(
    'First',
    "  static readonly variant: 'a' | 'b' = 'a';\n  static readonly tags: readonly string[] = ['first'];\n  describe(): string { return 'first'; }",
  )}${traitClass(
    'Second',
    "  static readonly variant: 'a' | 'b' = 'b';\n  static readonly tags: readonly string[] = ['second'];\n  describe(): string { return 'second'; }",
  )}`;

  it('should warn for a method and a simple static that two traits supply', async () => {
    const { warnings } = await run(
      `${conflict}${component('typeof First, typeof Second')}`,
    );

    expect(warnings).toEqual([
      "traits First and Second both supply describe; Second's wins",
      "traits First and Second both supply variant; Second's wins",
    ]);
  });

  it("should emit the later trait's method after the earlier one's", async () => {
    const { code } = await run(
      `${conflict}${component('typeof First, typeof Second')}`,
    );
    const body = code.slice(code.indexOf('export class Foo'));

    expect(body.indexOf("return 'second'")).toBeGreaterThan(
      body.indexOf("return 'first'"),
    );
  });

  it("should take the later trait's simple static", async () => {
    const { code } = await run(
      `${conflict}${component('typeof First, typeof Second')}`,
    );

    expect(code).toMatch(/static variant = __mxflat_Second_variant_\w+;/u);
  });

  it('should concatenate an array static, with no warning for it', async () => {
    const { code } = await run(
      `${conflict}${component('typeof First, typeof Second')}`,
    );

    expect(code).toMatch(
      /static tags = \[\.\.\.\(Base\.tags \?\? \[\]\), \.\.\.__mxflat_First_tags_\w+, \.\.\.__mxflat_Second_tags_\w+\];/u,
    );
  });

  it('should not warn when the component declares the key', async () => {
    const { warnings } = await run(
      `${conflict}${component('typeof First, typeof Second', "  static readonly variant: 'a' | 'b' = 'a';\n  describe(): string { return 'own'; }")}`,
    );

    expect(warnings).toEqual([]);
  });
});
