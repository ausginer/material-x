import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { flattenToDir, type Flattening } from './helpers.ts';

type Target = { calls: number; options: unknown };

type ForwardingCtor = new () => {
  checked: boolean;
  forwarded: number;
  readonly target: Target;
  focus(options?: unknown): string;
};

/** Loads the composed and flattened `default` and named exports of a consumer. */
async function loadForms<T>(
  gen: Flattening,
  name = 'default',
): Promise<ReadonlyArray<readonly [string, T]>> {
  const [composed, flattened] = (await Promise.all([
    import(gen.url('foo-composed.ts')),
    import(gen.url('foo-flat.ts')),
  ])) as [Record<string, T>, Record<string, T>];

  return [
    ['composed', composed[name]!],
    ['flattened', flattened[name]!],
  ];
}

describe('method trait flattening runtime equivalence', () => {
  let gen: Flattening;
  let forms: ReadonlyArray<readonly [string, ForwardingCtor]>;
  let subForms: ReadonlyArray<readonly [string, ForwardingCtor]>;
  let Forwarding: abstract new () => object;

  beforeAll(async () => {
    gen = await flattenToDir('method-consumer.ts', {
      augment: ['checkable.ts', 'forwarding.ts'],
      passthrough: ['base.ts'],
    });
    forms = await loadForms(gen);
    subForms = await loadForms(gen, 'Sub');
    ({ Forwarding } = (await import(gen.url('forwarding.ts'))) as {
      Forwarding: abstract new () => object;
    });
  });

  afterAll(async () => {
    await gen.dispose();
  });

  it('should flatten the composition', () => {
    expect([gen.bailouts, gen.flat.includes('impl(')]).toEqual([[], false]);
  });

  it('should call the trait method', () => {
    for (const [label, Ctor] of forms) {
      expect(new Ctor().focus(), label).toBe('trait');
    }
  });

  it('should reach the map that the use function writes', () => {
    for (const [label, Ctor] of forms) {
      const instance = new Ctor();
      instance.focus('options');
      expect(instance.target, label).toEqual({ calls: 1, options: 'options' });
    }
  });

  it('should read through the trait getter', () => {
    for (const [label, Ctor] of forms) {
      const instance = new Ctor();
      instance.focus();
      instance.focus();
      expect(instance.forwarded, label).toBe(2);
    }
  });

  it('should write through the trait setter', () => {
    for (const [label, Ctor] of forms) {
      const instance = new Ctor();
      instance.forwarded = 5;
      expect(instance.forwarded, label).toBe(5);
    }
  });

  it('should keep the descriptor trait beside the method trait', () => {
    for (const [label, Ctor] of forms) {
      const instance = new Ctor();
      instance.checked = true;
      expect(instance.checked, label).toBe(true);
    }
  });

  it('should preserve the trait brand for instanceof', () => {
    for (const [label, Ctor] of forms) {
      expect(new Ctor(), label).toBeInstanceOf(Forwarding);
    }
  });

  it("should reach the trait method from a subclass's super call", () => {
    for (const [label, Ctor] of subForms) {
      const instance = new Ctor();
      expect(instance.focus(), label).toBe('sub+trait');
      expect(instance.target.calls, label).toBe(1);
    }
  });

  it('should keep the trait method off the instance', () => {
    for (const [label, Ctor] of forms) {
      expect(Object.hasOwn(new Ctor(), 'focus'), label).toBe(false);
    }
  });
});

describe('method trait flattening of a class that overrides the method', () => {
  let gen: Flattening;
  let forms: ReadonlyArray<readonly [string, new () => { focus(): string }]>;

  beforeAll(async () => {
    gen = await flattenToDir('method-override-consumer.ts', {
      augment: ['forwarding.ts'],
      passthrough: ['base.ts'],
    });
    forms = await loadForms(gen);
  });

  afterAll(async () => {
    await gen.dispose();
  });

  it('should flatten the composition', () => {
    expect([gen.bailouts, gen.flat.includes('impl(')]).toEqual([[], false]);
  });

  it("should call the class's method, not the trait's", () => {
    for (const [label, Ctor] of forms) {
      expect(new Ctor().focus(), label).toBe('class');
    }
  });
});

describe('method trait flattening of traits in the consumer module', () => {
  type LocalCtor = new () => { label(): string; first(): string };

  let gen: Flattening;
  let forms: ReadonlyArray<readonly [string, LocalCtor]>;

  beforeAll(async () => {
    gen = await flattenToDir('method-local-consumer.ts', {
      augment: [],
      passthrough: ['base.ts'],
    });
    forms = await loadForms(gen);
  });

  afterAll(async () => {
    await gen.dispose();
  });

  it('should flatten the composition', () => {
    expect([gen.bailouts, gen.flat.includes('impl(')]).toEqual([[], false]);
  });

  it("should take the later trait's definition of a repeated key", () => {
    for (const [label, Ctor] of forms) {
      expect(new Ctor().label(), label).toBe('local:second');
    }
  });

  it("should keep the earlier trait's other members", () => {
    for (const [label, Ctor] of forms) {
      expect(new Ctor().first(), label).toBe('local:');
    }
  });
});

describe("method trait flattening of another package's built JavaScript", () => {
  let gen: Flattening;
  let forms: ReadonlyArray<readonly [string, ForwardingCtor]>;

  beforeAll(async () => {
    gen = await flattenToDir('method-package-consumer.ts', {
      augment: [],
      passthrough: ['base.ts'],
      packages: ['forwarding'],
    });
    forms = await loadForms(gen);
  });

  afterAll(async () => {
    await gen.dispose();
  });

  it('should flatten the composition', () => {
    expect([gen.bailouts, gen.flat.includes('impl(')]).toEqual([[], false]);
  });

  it('should call the trait method', () => {
    for (const [label, Ctor] of forms) {
      expect(new Ctor().focus(), label).toBe('package');
    }
  });

  it("should reach the package's private bindings and relative import", () => {
    for (const [label, Ctor] of forms) {
      const instance = new Ctor();
      instance.focus('options');
      expect(instance.target, label).toEqual({ calls: 1, options: 'options' });
    }
  });
});
