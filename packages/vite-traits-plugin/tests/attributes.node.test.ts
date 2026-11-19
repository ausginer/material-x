import { describe, expect, it } from 'vitest';
import { lowerAttributes, operatorSpecifier } from '../src/attributes/lower.ts';
import { parseModule } from '../src/syntax.ts';

const SOURCE = `import { Bool, Str } from '@ydinjs/core/attribute.js';
import { AnyElement, attributes } from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';

const TABLE = { open: Bool, 'label': Str };

export class Opened extends AnyElement {
  static {
    trait(this);
    attributes(this, TABLE);
  }

  accessor open!: boolean;
  accessor label!: string | null;
}

export class Inline extends AnyElement {
  static {
    trait(this);
    attributes(this, { checked: Bool });
  }

  accessor checked!: boolean;
}
`;

function lower(code: string): string {
  return (
    lowerAttributes(code, parseModule('lowered.ts', code))?.toString() ?? code
  );
}

describe('lowerAttributes', () => {
  it('should turn an accessor line into a getter and a setter through the operator', () => {
    expect(lower(SOURCE)).toContain(
      'get open() { return __mxflat_attr.get(this, "open", TABLE.open); }\n  set open(value) { __mxflat_attr.set(this, "open", value, TABLE.open); }',
    );
  });

  it("should read an inline table's converter as it is written", () => {
    expect(lower(SOURCE)).toContain('__mxflat_attr.get(this, "checked", Bool)');
  });

  it("should list the table's keys in a static observedAttributes", () => {
    expect(lower(SOURCE)).toContain(
      'static observedAttributes = ["open","label"];',
    );
  });

  it('should remove the attributes() call', () => {
    expect(lower(SOURCE)).not.toContain('attributes(this');
  });

  it("should import core's attribute operator", () => {
    expect(lower(SOURCE)).toMatch(
      /^import __mxflat_attr from "@ydinjs\/core\/attribute\.js";/u,
    );
  });

  it('should leave a module that does not import attributes unchanged', () => {
    expect(
      lowerAttributes(
        'export const x = 1;',
        parseModule('plain.ts', 'export const x = 1;'),
      ),
    ).toBeNull();
  });
});

describe('operatorSpecifier', () => {
  it('should name the operator beside a package entry', () => {
    expect(operatorSpecifier('@ydinjs/core/traits/attribute-traits.js')).toBe(
      '@ydinjs/core/attribute.js',
    );
  });

  it("should name the operator from core's own traits", () => {
    expect(operatorSpecifier('./attribute-traits.ts')).toBe('../attribute.ts');
  });

  it("should name the operator from a path into core's source", () => {
    expect(operatorSpecifier('../../src/traits/attribute-traits.ts')).toBe(
      '../../src/attribute.ts',
    );
  });
});
