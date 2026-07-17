import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { flattenToDir, type Flattening } from './helpers.ts';

type Ctor = new () => {
  checked: boolean;
  name: string | null;
  extra: string;
  getAttribute(name: string): string | null;
};

describe('descriptor flattening runtime equivalence', () => {
  let gen: Flattening;
  let composed: Ctor;
  let flattened: Ctor;
  let Checkable: abstract new () => object;
  let Nameable: abstract new () => object;

  beforeAll(async () => {
    gen = await flattenToDir('consumer.ts', {
      augment: ['checkable.ts', 'nameable.ts'],
      passthrough: ['base.ts'],
    });
    const [composedMod, flatMod, checkableMod, nameableMod] =
      (await Promise.all([
        import(gen.url('foo-composed.ts')),
        import(gen.url('foo-flat.ts')),
        import(gen.url('checkable.ts')),
        import(gen.url('nameable.ts')),
      ])) as [
        { default: Ctor },
        { default: Ctor },
        { Checkable: abstract new () => object },
        { Nameable: abstract new () => object },
      ];
    ({ default: composed } = composedMod);
    ({ default: flattened } = flatMod);
    ({ Checkable } = checkableMod);
    ({ Nameable } = nameableMod);
  });

  afterAll(async () => {
    await gen.dispose();
  });

  const cases = (): ReadonlyArray<readonly [string, Ctor]> => [
    ['composed', composed],
    ['flattened', flattened],
  ];

  it('should default the boolean accessor to false', () => {
    for (const [label, Ctor] of cases()) {
      expect(new Ctor().checked, label).toBe(false);
    }
  });

  it('should round-trip the boolean accessor through the attribute', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      instance.checked = true;
      expect(instance.checked, label).toBe(true);
      expect(instance.getAttribute('checked'), label).toBe('');
    }
  });

  it('should round-trip the string accessor', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      expect(instance.name, label).toBeNull();
      instance.name = 'hi';
      expect(instance.name, label).toBe('hi');
    }
  });

  it('should keep the component instance field', () => {
    for (const [label, Ctor] of cases()) {
      expect(new Ctor().extra, label).toBe('here');
    }
  });

  it('should preserve trait brands for instanceof', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      expect(instance, label).toBeInstanceOf(Checkable);
      expect(instance, label).toBeInstanceOf(Nameable);
    }
  });

  it('should merge observedAttributes with the base', () => {
    for (const [label, Ctor] of cases()) {
      const observed = (Ctor as unknown as { observedAttributes: string[] })
        .observedAttributes;
      expect([...observed].sort(), label).toEqual([
        'checked',
        'data-base',
        'name',
      ]);
    }
  });
});
