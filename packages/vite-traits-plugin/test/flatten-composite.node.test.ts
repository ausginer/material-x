import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { flattenToDir, type Flattening } from './helpers.ts';

type Ctor = new () => {
  group: string | null;
  size: string | null;
  checked: boolean;
  name: string | null;
  active: boolean;
  extra: string;
};

/**
 * Exercises the full resolver against a material-x-shaped composition:
 * `impl(Base, [...CORE_TRAITS, Nameable, Local])` where `CORE_TRAITS` is an
 * imported const array `[Groupable, Sizeable, Checkable]`. `Groupable` is a
 * trait DEFINED in the intermediate `core-traits.ts` (like `ButtonLike` inside
 * `ButtonCore`) — its brand/attrs must be linked THROUGH that module, not
 * mistaken for the consumer's scope. `Local` is a trait defined in the consumer
 * module itself (inline attrs + private brand, linked in place).
 */
describe('composite flattening runtime equivalence', () => {
  let gen: Flattening;
  let composed: Ctor;
  let flattened: Ctor;

  beforeAll(async () => {
    gen = await flattenToDir('composite-consumer.ts', {
      augment: ['sizeable.ts', 'checkable.ts', 'nameable.ts', 'core-traits.ts'],
      passthrough: ['base.ts'],
    });
    const [composedMod, flatMod] = (await Promise.all([
      import(gen.url('foo-composed.ts')),
      import(gen.url('foo-flat.ts')),
    ])) as [{ default: Ctor }, { default: Ctor }];
    ({ default: composed } = composedMod);
    ({ default: flattened } = flatMod);
  });

  afterAll(async () => {
    await gen.dispose();
  });

  const cases = (): ReadonlyArray<readonly [string, Ctor]> => [
    ['composed', composed],
    ['flattened', flattened],
  ];

  it('should install the intermediate-module-local trait accessor (group)', () => {
    // `Groupable` is defined inside the spread list's own module; its brand and
    // attrs must be linked through that module, not treated as consumer-scoped.
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      instance.group = 'primary';
      expect(instance.group, label).toBe('primary');
    }
  });

  it('should install the spread const-array accessors (size, checked)', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      instance.size = 'large';
      expect(instance.size, label).toBe('large');
      instance.checked = true;
      expect(instance.checked, label).toBe(true);
    }
  });

  it('should install the trailing imported trait accessor (name)', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      instance.name = 'hi';
      expect(instance.name, label).toBe('hi');
    }
  });

  it('should install the consumer-local inline trait accessor (active)', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      expect(instance.active, label).toBe(false);
      instance.active = true;
      expect(instance.active, label).toBe(true);
    }
  });

  it('should merge observedAttributes across every layer in order', () => {
    for (const [label, Ctor] of cases()) {
      const observed = (Ctor as unknown as { observedAttributes: string[] })
        .observedAttributes;
      expect([...observed].sort(), label).toEqual([
        'active',
        'checked',
        'data-base',
        'group',
        'name',
        'size',
      ]);
    }
  });
});
