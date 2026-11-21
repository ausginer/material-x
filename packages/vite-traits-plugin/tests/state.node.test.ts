import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { materialize, type Materialized } from './helpers.ts';

type Counted = {
  readonly count: number;
  doubled: number;
  readonly cache: ReadonlyMap<string, number>;
  readonly label: string;
  readonly given: number;
  readonly countAtStart: number;
  readonly cached?: number;
  increment(): number;
};
type Ordered = { first: string; second: string; own: string };
type Sided = {
  readonly visits: number;
  readonly entered: string;
  readonly right: string;
  readonly args: readonly unknown[];
  greet(): string;
};
type Module = {
  Counted: new (value: number) => Counted;
  CountedSub: new (value: number) => Counted;
  Ordered: new () => Ordered;
  OrderedSub: new () => Ordered;
  Sided: new (...args: unknown[]) => Sided;
  Outer: new () => Ordered;
};
type Entry = { order: string[]; Counter: abstract new () => object };

/** Each own key of each prototype on the chain below `Object.prototype`. */
function prototypeKeys(instance: object): string[] {
  const keys: string[] = [];
  for (
    let proto = Object.getPrototypeOf(instance) as object | null;
    proto && proto !== Object.prototype;
    proto = Object.getPrototypeOf(proto) as object | null
  ) {
    for (const key of Reflect.ownKeys(proto)) {
      keys.push(typeof key === 'symbol' ? `symbol:${key.description}` : key);
    }
  }

  return keys;
}

describe('a trait with private members and a constructor', () => {
  let gen: Materialized;
  let flat: Module;
  let expected: Pick<Module, 'Counted'>;
  let packaged: {
    default: new (...args: unknown[]) => {
      readonly hits: number;
      readonly target: unknown;
      readonly kind: string;
    };
  };
  let entry: Entry;

  beforeAll(async () => {
    gen = await materialize({
      transformed: [
        'state-consumer.ts',
        'state-package-consumer.ts',
        'state.ts',
      ],
      verbatim: [
        'state-base.ts',
        'state-order.ts',
        'state-consumer.expected.ts',
      ],
      packages: ['forwarding'],
      exported: ['state.ts', 'state-order.ts'],
    });
    [flat, expected, packaged, entry] = (await Promise.all([
      import(gen.url('state-consumer.ts')),
      import(gen.url('state-consumer.expected.ts')),
      import(gen.url('state-package-consumer.ts')),
      import(gen.entryUrl),
    ])) as [Module, Module, typeof packaged, Entry];
  });

  afterAll(async () => {
    await gen.dispose();
  });

  beforeEach(() => {
    entry.order.length = 0;
  });

  /** The steps that constructing with `make` records. */
  const construct = (make: () => object): readonly string[] => {
    entry.order.length = 0;
    make();
    return [...entry.order];
  };

  const both = (): ReadonlyArray<
    readonly [string, new (value: number) => Counted]
  > => [
    ['flattened', flat.Counted],
    ['expected', expected.Counted],
  ];

  describe('against the hand-written class', () => {
    it('should have the same prototype keys', () => {
      expect(prototypeKeys(new flat.Counted(1))).toEqual(
        prototypeKeys(new expected.Counted(1)),
      );
    });

    it('should have the same own keys', () => {
      expect(Reflect.ownKeys(new flat.Counted(1))).toEqual(
        Reflect.ownKeys(new expected.Counted(1)),
      );
    });

    it('should have the same observedAttributes', () => {
      expect(
        (flat.Counted as unknown as { observedAttributes: unknown })
          .observedAttributes,
      ).toEqual(
        (expected.Counted as unknown as { observedAttributes: unknown })
          .observedAttributes,
      );
    });

    it('should be an instance of the trait', () => {
      for (const [label, Class] of both()) {
        expect(new Class(1) instanceof entry.Counter, label).toBe(true);
      }
    });

    it('should read and write the private field through a private accessor pair', () => {
      for (const [label, Class] of both()) {
        const instance = new Class(1);
        instance.doubled = 40;
        expect([instance.count, instance.doubled], label).toEqual([20, 40]);
      }
    });

    it('should call the private method', () => {
      for (const [label, Class] of both()) {
        expect(new Class(1).increment(), label).toBe(12);
      }
    });

    it("should read the trait module's bindings from an initializer", () => {
      for (const [label, Class] of both()) {
        expect(new Class(1).label, label).toBe('counter:Counter field');
      }
    });

    it("should run the trait's body once, after the fields, reading their state and the bindings", () => {
      for (const [label, Class] of both()) {
        const instance = new Class(1);
        expect(
          [instance.count, [...instance.cache], instance.countAtStart],
          label,
        ).toEqual([11, [['counter', 20]], 11]);
      }
    });

    it("should keep the component's parameter apart from the body's const of the same name", () => {
      for (const [label, Class] of both()) {
        const instance = new Class(7);
        expect([instance.given, instance.cache.get('counter')], label).toEqual([
          7, 20,
        ]);
      }
    });

    it('should give two instances two maps', () => {
      expect(new flat.Counted(1).cache).not.toBe(new flat.Counted(1).cache);
    });
  });

  describe('order', () => {
    it("should run the base, every field, every trait's body, then the component's statements", () => {
      expect(construct(() => new flat.Ordered())).toEqual([
        'before super',
        'super argument',
        'base field',
        'base body',
        'First field',
        'Second field',
        'component field',
        'First body',
        'Second body',
        'after super',
      ]);
    });

    it("should run the component's whole order before a subclass's field and body", () => {
      expect(construct(() => new flat.OrderedSub()).slice(-3)).toEqual([
        'after super',
        'subclass field',
        'subclass body',
      ]);
    });

    it("should run each class's traits' bodies after its own super()", () => {
      expect(construct(() => new flat.Outer()).slice(-5)).toEqual([
        'after super',
        'Third field',
        'Outer field',
        'Third body',
        'Outer body',
      ]);
    });

    it("should give a hand-written subclass's field the state the trait's body set up", () => {
      expect(new flat.CountedSub(1).cached).toBe(20);
    });
  });

  describe('two traits and the component that each declare #x', () => {
    it('should keep the three values apart', () => {
      const instance = new flat.Ordered();
      instance.first = 'a';
      instance.own = 'c';

      expect([instance.first, instance.second, instance.own]).toEqual([
        'a',
        'Second field',
        'c',
      ]);
    });
  });

  describe('a supertrait that two traits share', () => {
    it('should run its field and its body once per instance', () => {
      const instance = new flat.Sided();

      expect([
        instance.visits,
        entry.order.filter((step) => step.startsWith('Shared')),
      ]).toEqual([1, ['Shared field', 'Shared body']]);
    });

    it("should run its body before its subtrait's, which reads its state", () => {
      expect(construct(() => new flat.Sided())).toContain('Left body sees 1');
    });

    it("should keep the subtrait's override", () => {
      expect(new flat.Sided().greet()).toBe('left');
    });

    it('should copy it once, ahead of both traits', () => {
      const code = gen.code['state-consumer.ts']!;
      const sided = code.slice(code.indexOf('export class Sided'));

      expect([
        sided.match(/#visits_\w+ = 0;/gu)?.length,
        sided.indexOf('#visits_') < sided.indexOf('#side_'),
      ]).toEqual([1, true]);
    });
  });

  describe('a component with no constructor', () => {
    it('should pass every argument to the base through the generated constructor', () => {
      expect(new flat.Sided(1, 2).args).toEqual([1, 2]);
    });
  });

  describe("another package's built trait", () => {
    it('should run the copied initializer and body', () => {
      const instance = new packaged.default();

      expect([instance.hits, instance.kind, instance.target]).toEqual([
        3,
        'record',
        { calls: 1, options: 3 },
      ]);
    });
  });
});
