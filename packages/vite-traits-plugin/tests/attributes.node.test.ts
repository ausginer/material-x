import { describe, expect, it } from 'vitest';
import { lowerAttributes, operatorSpecifier } from '../src/attributes/lower.ts';
import { staticValueName } from '../src/composition/trait-module.ts';
import { parseModule } from '../src/syntax.ts';
import { transformTrait } from './helpers.ts';

const SOURCE = `import { Bool, Str } from '@ydinjs/core/attribute.js';
import { AnyElement, attributes } from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';

const TABLE = { open: Bool, 'label': Str };

@trait
@attributes(TABLE)
export class Opened extends AnyElement {
  accessor open!: boolean;
  accessor label!: string | null;
}

@trait
@attributes({ checked: Bool })
export class Inline extends AnyElement {
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

  it('should remove the @attributes decorator', () => {
    expect(lower(SOURCE)).not.toContain('@attributes');
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

describe('lowerAttributes on each form of @attributes', () => {
  const OPERATOR = 'import __mxflat_attr from "@ydinjs/core/attribute.js";\n';
  const BOOL = "import { Bool } from '@ydinjs/core/attribute.js';\n";
  const TRAIT = "import { trait } from '@ydinjs/core/traits/composition.js';\n";
  const ACCESSOR = '  accessor open!: boolean;\n}\n';
  const OBSERVED = '  static observedAttributes = ["open"];\n';
  const HOISTED = staticValueName('Open', 'observedAttributes');
  /** The lowered `open` accessor pair, reading `converter`. */
  const pair = (converter: string): string =>
    `  get open() { return __mxflat_attr.get(this, "open", ${converter}); }\n  set open(value) { __mxflat_attr.set(this, "open", value, ${converter}); }\n}\n`;
  /** The trait module's transform of class `Open` after layer (b). */
  const built = (heritage: string, converter: string): string =>
    `export const $open = Symbol("Open");\nconst ${HOISTED} = ["open"];\nexport class Open${heritage} {\n  static observedAttributes = ${HOISTED};\n  static [Symbol.hasInstance](o) {\n    return o != null && o[$open] === true;\n  }\n\n${pair(converter)}`;

  describe('an inline table', () => {
    const source = `${BOOL}import { AnyElement, attributes } from '@ydinjs/core/traits/attribute-traits.js';\n${TRAIT}\n@trait\n@attributes({ open: Bool })\nexport class Open extends AnyElement {\n${ACCESSOR}`;

    it('should remove @attributes, keep @trait, and keep the import of another name', () => {
      expect(lower(source)).toBe(
        `${OPERATOR}${BOOL}import { AnyElement } from '@ydinjs/core/traits/attribute-traits.js';\n${TRAIT}\n@trait\nexport class Open extends AnyElement {\n${OBSERVED}${pair('Bool')}`,
      );
    });

    it('should put the method after observedAttributes in the trait module', () => {
      expect(transformTrait('inline.ts', source)).toBe(
        `${OPERATOR}${BOOL}import { AnyElement } from '@ydinjs/core/traits/attribute-traits.js';\n\n\n${built(' extends AnyElement', 'Bool')}\nexport { ${HOISTED} };\n`,
      );
    });
  });

  describe('a module constant', () => {
    const source = `${BOOL}import { attributes } from '@ydinjs/core/traits/attribute-traits.js';\n${TRAIT}\nconst OPEN_ATTRS = { open: Bool };\n\n@trait\n@attributes(OPEN_ATTRS)\nexport class Open {\n${ACCESSOR}`;

    it('should read the constant and remove the unused import', () => {
      expect(lower(source)).toBe(
        `${OPERATOR}${BOOL}\n${TRAIT}\nconst OPEN_ATTRS = { open: Bool };\n\n@trait\nexport class Open {\n${OBSERVED}${pair('OPEN_ATTRS.open')}`,
      );
    });

    it('should put the method after observedAttributes in the trait module', () => {
      expect(transformTrait('constant.ts', source)).toBe(
        `${OPERATOR}${BOOL}\n\n\nconst OPEN_ATTRS = { open: Bool };\n\n${built('', 'OPEN_ATTRS.open')}\nexport { ${HOISTED}, OPEN_ATTRS as __mxflat_OPEN_ATTRS_c042a339, OPEN_ATTRS };\n`,
      );
    });
  });

  describe('an import left with an inline type', () => {
    const source = `${BOOL}import { attributes, type AttributeTable } from '@ydinjs/core/traits/attribute-traits.js';\n${TRAIT}\n@trait\n@attributes({ open: Bool })\nexport class Open {\n${ACCESSOR}`;

    it('should remove the import whole', () => {
      expect(lower(source)).toBe(
        `${OPERATOR}${BOOL}\n${TRAIT}\n@trait\nexport class Open {\n${OBSERVED}${pair('Bool')}`,
      );
    });
  });

  describe('aliased imports', () => {
    const source = `${BOOL}import { attributes as attrs } from '@ydinjs/core/traits/attribute-traits.js';\nimport { trait as brand } from '@ydinjs/core/traits/composition.js';\n\n@brand\n@attrs({ open: Bool })\nexport class Open {\n${ACCESSOR}`;

    it('should lower the aliased decorator and keep the aliased @trait', () => {
      expect(lower(source)).toBe(
        `${OPERATOR}${BOOL}\nimport { trait as brand } from '@ydinjs/core/traits/composition.js';\n\n@brand\nexport class Open {\n${OBSERVED}${pair('Bool')}`,
      );
    });

    it('should put the method after observedAttributes in the trait module', () => {
      expect(transformTrait('alias.ts', source)).toBe(
        `${OPERATOR}${BOOL}\n\n\n${built('', 'Bool')}\nexport { ${HOISTED} };\n`,
      );
    });
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
