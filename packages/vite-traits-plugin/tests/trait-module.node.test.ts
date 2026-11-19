import { describe, expect, it } from 'vitest';
import { staticValueName } from '../src/composition/trait-module.ts';
import { transformTrait } from './helpers.ts';

const SOURCE = `import { trait } from '@ydinjs/core/traits/composition.js';

const targets = new WeakMap<object, number>();

export class Counted {
  static {
    trait(this);
  }

  static readonly tags: readonly string[] = ['counted'];

  get count(): number {
    return targets.get(this) ?? 0;
  }
}
`;

describe('transformTraitModule', () => {
  it('should hoist the brand into an exported symbol named after the class', () => {
    expect(transformTrait('counted.ts', SOURCE)).toContain(
      'export const $counted = Symbol("Counted");',
    );
  });

  it('should replace trait(this) with a static Symbol.hasInstance method', () => {
    expect(transformTrait('counted.ts', SOURCE)).toContain(
      'static [Symbol.hasInstance](o) {\n    return o != null && o[$counted] === true;\n  }',
    );
  });

  it("should remove trait's import once nothing else uses it", () => {
    expect(transformTrait('counted.ts', SOURCE)).not.toContain(
      'import { trait }',
    );
  });

  it('should make an object with the brand, and only one, an instance', async () => {
    const code = transformTrait('counted.ts', SOURCE)
      .replace('new WeakMap<object, number>()', 'new WeakMap()')
      .replace(': readonly string[]', '')
      .replace('static readonly', 'static')
      .replace('(): number', '()');
    const module = (await import(
      `data:text/javascript,${encodeURIComponent(code)}`
    )) as { Counted: abstract new () => object; $counted: symbol };

    expect([
      { [module.$counted]: true } instanceof module.Counted,
      {} instanceof module.Counted,
      (null as unknown) instanceof module.Counted,
    ]).toEqual([true, false, false]);
  });

  it("should hoist a static's value into an exported constant", () => {
    const name = staticValueName('Counted', 'tags');
    const code = transformTrait('counted.ts', SOURCE);

    expect([
      code.includes(`const ${name} = ['counted'];`),
      code.includes(`static readonly tags: readonly string[] = ${name};`),
    ]).toEqual([true, true]);
  });

  it('should export a private binding a member reads under its build-only name', () => {
    expect(transformTrait('counted.ts', SOURCE)).toMatch(
      /export \{ [^}]*targets as __mxflat_targets_\w+, targets/u,
    );
  });

  it('should change nothing in an already transformed module', () => {
    const once = transformTrait('counted.ts', SOURCE);

    expect(transformTrait('counted-again.ts', once)).toBe(once);
  });

  it("should keep a trait's instance members in a library build", () => {
    expect(transformTrait('counted.ts', SOURCE)).toContain('get count()');
  });

  it("should delete a trait's instance members in an application build", () => {
    expect(transformTrait('counted.ts', SOURCE, true)).not.toContain(
      'get count()',
    );
  });
});

describe('the brand of a built trait module', () => {
  const method =
    '  static [Symbol.hasInstance](o) {\n    return o != null && o[$linked] === true;\n  }';

  /** A built trait module with `declaration` and `extra`, in an application build. */
  const transformBuilt = (declaration: string, extra = ''): string =>
    transformTrait(
      'built.js',
      `${declaration}\nvar Linked = class {\n${method}\n  get href() {\n    return 'linked-member';\n  }\n};\n${extra}export { $linked, Linked };\n`,
      true,
    );

  it('should recognize a var brand that nothing assigns again', () => {
    expect(transformBuilt('var $linked = Symbol("Linked");')).not.toContain(
      'linked-member',
    );
  });

  it('should not recognize a brand that a destructuring assigns again', () => {
    expect(
      transformBuilt(
        'let $linked = Symbol("Linked");',
        '[$linked] = [Symbol("Other")];\n',
      ),
    ).toContain('linked-member');
  });

  it('should not recognize a brand that a for-of assigns again', () => {
    expect(
      transformBuilt(
        'let $linked = Symbol("Linked");',
        'for ($linked of [Symbol("Other")]) {}\n',
      ),
    ).toContain('linked-member');
  });

  it('should not recognize a brand that a var in a block declares again', () => {
    expect(
      transformBuilt(
        'var $linked = Symbol("Linked");',
        'if (globalThis.other) {\n  var $linked = Symbol("Other");\n}\n',
      ),
    ).toContain('linked-member');
  });

  it("should not recognize a brand that a for-of's var declares again", () => {
    expect(
      transformBuilt(
        'var $linked = Symbol("Linked");',
        'for (var $linked of [Symbol("Other")]) {}\n',
      ),
    ).toContain('linked-member');
  });

  it('should not recognize a brand that the module declares twice', () => {
    expect(
      transformBuilt(
        'var $linked = Symbol("Linked");',
        'var $linked = Symbol("Other");\n',
      ),
    ).toContain('linked-member');
  });
});
