import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  fixtureId,
  materialize,
  transform,
  type Materialized,
} from './helpers.ts';

type Instance = {
  checked: boolean;
  name: string | null;
  forwarded: number;
  readonly target: { calls: number; options: unknown };
  focus(options?: unknown): string;
  getAttribute(name: string): string | null;
};
type Ctor = (new () => Instance) & { observedAttributes: readonly string[] };
type Module = { default: Ctor; Sub: Ctor };

/** Each own key of each prototype on the chain below `Object.prototype`. */
function shape(instance: object): string[] {
  const keys: string[] = [];
  for (
    let proto = Object.getPrototypeOf(instance) as object | null;
    proto && proto !== Object.prototype;
    proto = Object.getPrototypeOf(proto) as object | null
  ) {
    for (const key of Reflect.ownKeys(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, key)!;
      keys.push(
        `${typeof key === 'symbol' ? `symbol:${key.description}` : key} ${
          descriptor.get ? 'get' : ''
        }${descriptor.set ? 'set' : ''}${'value' in descriptor ? typeof descriptor.value : ''} ${String(descriptor.enumerable)}`,
      );
    }
  }

  return keys;
}

describe('flattening', () => {
  let gen: Materialized;
  let flat: Module;
  let expected: Module;
  let traits: Record<string, abstract new () => object>;

  beforeAll(async () => {
    gen = await materialize({
      transformed: [
        'consumer.ts',
        'checkable.ts',
        'nameable.ts',
        'forwarding.ts',
      ],
      verbatim: ['base.ts', 'lists.ts', 'consumer.expected.ts'],
      exported: ['checkable.ts', 'nameable.ts', 'forwarding.ts'],
    });
    [flat, expected, traits] = (await Promise.all([
      import(gen.url('consumer.ts')),
      import(gen.url('consumer.expected.ts')),
      import(gen.entryUrl),
    ])) as [Module, Module, Record<string, abstract new () => object>];
  });

  afterAll(async () => {
    await gen.dispose();
  });

  const both = (): ReadonlyArray<readonly [string, Module]> => [
    ['flattened', flat],
    ['expected', expected],
  ];

  it('should give the class the same prototype keys as the expected class', () => {
    expect(shape(new flat.default())).toEqual(shape(new expected.default()));
  });

  it("should merge observedAttributes with the base's", () => {
    for (const [label, module] of both()) {
      expect(module.default.observedAttributes, label).toEqual([
        'data-base',
        'checked',
        'name',
      ]);
    }
  });

  it('should read and write a boolean attribute', () => {
    for (const [label, module] of both()) {
      const instance = new module.default();
      instance.checked = true;
      expect(
        [instance.checked, instance.getAttribute('checked')],
        label,
      ).toEqual([true, '']);
    }
  });

  it('should read and write a string attribute', () => {
    for (const [label, module] of both()) {
      const instance = new module.default();
      instance.name = 'x';
      expect([instance.name, instance.getAttribute('name')], label).toEqual([
        'x',
        'x',
      ]);
    }
  });

  it("should read the trait module's private binding from the copied member", () => {
    for (const [label, module] of both()) {
      const instance = new module.default();
      expect([instance.focus(1), instance.target], label).toEqual([
        'trait',
        { calls: 1, options: 1 },
      ]);
    }
  });

  it('should reach the copied member through super from a subclass', () => {
    for (const [label, module] of both()) {
      expect(new module.Sub().focus(), label).toBe('sub+trait');
    }
  });

  it('should make the class an instance of each trait', () => {
    const list = ['Checkable', 'Nameable', 'Forwarding'].map(
      (name) => traits[name]!,
    );
    for (const [label, module] of both()) {
      const instance = new module.default();
      expect(
        list.map((trait) => instance instanceof trait),
        label,
      ).toEqual([true, true, true]);
    }
  });

  it('should not make a plain object an instance of a trait', () => {
    expect(
      {} instanceof (traits['Checkable'] as abstract new () => object),
    ).toBe(false);
  });
});

describe("flattening another package's built trait", () => {
  let gen: Materialized;
  let module: {
    default: new () => { focus(options?: unknown): string; target: unknown };
  };

  beforeAll(async () => {
    gen = await materialize({
      transformed: ['package-consumer.ts'],
      verbatim: ['base.ts'],
      packages: ['forwarding'],
      exported: [],
    });
    module = (await import(gen.url('package-consumer.ts'))) as typeof module;
  });

  afterAll(async () => {
    await gen.dispose();
  });

  it('should copy a JavaScript member that parses to the same tree in TypeScript', () => {
    expect(gen.code['package-consumer.ts']).toContain("return 'package';");
  });

  it('should reach the private binding and the relative import through the package', () => {
    const instance = new module.default();
    expect([instance.focus(2), instance.target]).toEqual([
      'package',
      { calls: 1, options: 2 },
    ]);
  });
});

describe("flattening over the base's declared static", () => {
  const header = `import { compose, trait, type Composed } from '@ydinjs/core/traits/composition.js';\n`;
  const styled = `export class Styled {\n  static {\n    trait(this);\n  }\n\n  static readonly observedAttributes: readonly string[] = ['styled'];\n}\n`;

  /** Flattens a component of `Styled` over the base `name`, after `classes`. */
  const flatten = async (name: string, classes: string): Promise<string> => {
    const id = fixtureId('virtual-base.ts');

    return (
      await transform(id, {
        files: {
          [id]: `${header}${classes}${styled}const FooBase: Composed<typeof ${name}, [typeof Styled]> = compose(${name});\nexport class Foo extends FooBase {}\n`,
        },
      })
    ).code;
  };

  it("should spread a base's array static before the traits'", async () => {
    expect(
      await flatten(
        'Observed',
        'class Observed extends HTMLElement {\n  static observedAttributes: readonly string[] = [];\n}\n',
      ),
    ).toMatch(
      /static observedAttributes = \[\.\.\.\(Observed\.observedAttributes \?\? \[\]\), \.\.\.__mxflat_Styled_observedAttributes_\w+\];/u,
    );
  });

  it('should flatten over a base that declares nothing above a global', async () => {
    expect(
      await flatten('Plain', 'class Plain extends HTMLElement {}\n'),
    ).toContain('export class Foo extends Plain');
  });
});
