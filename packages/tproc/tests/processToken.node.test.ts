import { describe, it, expect, vi } from 'vitest';
import processToken, { toCSSValue } from '../src/processToken.ts';
import {
  TextTransform,
  TokenShapeFamily,
  type StoredToken,
  type StoredValue,
  type TokenType,
  type TokenTypeVariationAxes,
} from '../src/store/schema.ts';
import {
  createToken,
  createTokenSet,
  createValue,
  useStore,
} from './helpers.ts';

describe('processToken', () => {
  const variationAxes: TokenTypeVariationAxes = {
    wght: { axisValueTokenName: 'md.ref.wght' },
    GRAD: { axisValueTokenName: 'md.ref.GRAD' },
    wdth: { axisValueTokenName: 'md.ref.wdth' },
    ROND: { axisValueTokenName: 'md.ref.ROND' },
    opsz: { axisValueTokenName: 'md.ref.opsz' },
    CRSV: { axisValueTokenName: 'md.ref.CRSV' },
    slnt: { axisValueTokenName: 'md.ref.slnt' },
    FILL: { axisValueTokenName: 'md.ref.FILL' },
    HEXP: { axisValueTokenName: 'md.ref.HEXP' },
  };

  const createType = (): TokenType => ({
    fontNameTokenName: 'md.ref.typeface',
    fontWeightTokenName: 'md.ref.weight',
    fontSizeTokenName: 'md.ref.size',
    fontTrackingTokenName: 'md.ref.tracking',
    lineHeightTokenName: 'md.ref.line',
    variationAxes,
  });

  const setupValue = (
    value: StoredValue,
    setName = 'md.comp.test',
    ...others: readonly StoredToken[]
  ): StoredToken => {
    const token = createToken({
      tokenName: `${setName}.token`,
      values: [value],
    });
    useStore(
      createTokenSet({ tokenSetName: setName, tokens: [token] }),
      createTokenSet({ tokenSetName: 'md.comp.other', tokens: others }),
    );
    return token;
  };

  it('should return null when no value is found', () => {
    const token = createToken();
    useStore(createTokenSet({ tokens: [token] }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(processToken(token)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      `No value found for ${token.tokenName}`,
    );
  });

  it('should return null for system color tokens', () => {
    const token = setupValue(createValue({ numeric: 1 }), 'md.sys.color');

    expect(processToken(token)).toBeNull();
  });

  it('should convert length tokens to px', () => {
    const token = setupValue(createValue({ length: { value: 4 } }));

    expect(processToken(token)).toBe('4px');
  });

  it('should convert percent length tokens to a percentage', () => {
    const token = setupValue(
      createValue({ length: { value: 50, unit: 'PERCENT' } }),
    );

    expect(processToken(token)).toBe('50%');
  });

  it('should convert opacity tokens to string', () => {
    const token = setupValue(createValue({ opacity: 0.5 }));

    expect(processToken(token)).toBe('0.5');
  });

  it('should convert elevation tokens to string', () => {
    const token = setupValue(createValue({ elevation: { value: 2 } }));

    expect(processToken(token)).toBe('2');
  });

  it('should convert numeric tokens to string', () => {
    const token = setupValue(createValue({ numeric: 3 }));

    expect(processToken(token)).toBe('3');
  });

  it('should convert duration tokens to ms', () => {
    const token = setupValue(createValue({ durationMs: 150 }));

    expect(processToken(token)).toBe('150ms');
  });

  it('should map type tokens to kebab keys', () => {
    const token = setupValue(createValue({ type: createType() }));

    expect(processToken(token)).toEqual({
      'font-name': 'md.ref.typeface',
      'font-weight': 'md.ref.weight',
      'font-size': 'md.ref.size',
      'font-tracking': 'md.ref.tracking',
      'line-height': 'md.ref.line',
      'variation-axes': variationAxes,
    });
  });

  it('should preserve type variation axes for resolution', () => {
    const token = setupValue(createValue({ type: createType() }));

    expect(processToken(token)).toMatchObject({
      'variation-axes': variationAxes,
    });
  });

  it('should format font names', () => {
    const token = setupValue(
      createValue({ fontNames: { values: ['Roboto', 'Arial'] } }),
    );

    expect(processToken(token)).toBe('"Roboto", "Arial"');
  });

  it('should convert font tracking to px', () => {
    const token = setupValue(createValue({ fontTracking: { value: 1 } }));

    expect(processToken(token)).toBe('1px');
  });

  it('should convert font weight to string', () => {
    const token = setupValue(createValue({ fontWeight: 500 }));

    expect(processToken(token)).toBe('500');
  });

  it('should convert font size to px', () => {
    const token = setupValue(createValue({ fontSize: { value: 14 } }));

    expect(processToken(token)).toBe('14px');
  });

  it('should convert line height to px', () => {
    const token = setupValue(createValue({ lineHeight: { value: 18 } }));

    expect(processToken(token)).toBe('18px');
  });

  it('should convert colors to hex', () => {
    const token = setupValue(
      createValue({
        color: { red: 1, green: 0, blue: 0, alpha: 0.5 },
      }),
    );

    expect(processToken(token)).toBe('#ff000080');
  });

  it('should return full for circular shapes', () => {
    const token = setupValue(
      createValue({
        shape: { family: TokenShapeFamily.FULL },
      }),
    );

    expect(processToken(token)).toBe('full');
  });

  it('should return default shape size when present', () => {
    const token = setupValue(
      createValue({
        shape: {
          family: TokenShapeFamily.ROUNDED,
          defaultSize: { value: 8 },
        },
      }),
    );

    expect(processToken(token)).toBe('8px');
  });

  it('should map shape corners', () => {
    const token = setupValue(
      createValue({
        shape: {
          family: TokenShapeFamily.ROUNDED,
          topLeft: { value: 1 },
          topRight: { value: 2 },
          bottomRight: { value: 3 },
          bottomLeft: { value: 4 },
        },
      }),
    );

    expect(processToken(token)).toEqual({
      'top-left': '1px',
      'top-right': '2px',
      'bottom-right': '3px',
      'bottom-left': '4px',
    });
  });

  it('should format cubic bezier tokens', () => {
    const token = setupValue(
      createValue({
        cubicBezier: { x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.4 },
      }),
    );

    expect(processToken(token)).toBe('cubic-bezier(0.1, 0.2, 0.3, 0.4)');
  });

  it('should lowercase motion paths', () => {
    const token = setupValue(
      createValue({ motionPath: { standardPath: 'PATH' } }),
    );

    expect(processToken(token)).toBe('path');
  });

  it('should convert axis values to string', () => {
    const token = setupValue(
      createValue({ axisValue: { tag: 'wdth', value: 12 } }),
    );

    expect(processToken(token)).toBe('12');
  });

  it('should map text transform none', () => {
    const token = setupValue(
      createValue({ textTransform: TextTransform.NONE }),
    );

    expect(processToken(token)).toBe('none');
  });

  it('should throw on unknown text transforms', () => {
    const value = createValue();
    Reflect.set(value, 'textTransform', 'TEXT_TRANSFORM_UPPER');
    const token = setupValue(value);

    expect(() => processToken(token)).toThrow(
      'Unknown text transform: TEXT_TRANSFORM_UPPER',
    );
  });

  it('should skip custom composite values', () => {
    const token = setupValue(
      createValue({
        customComposite: {
          properties: {
            damping: { tokenName: 'md.damping' },
            stiffness: { tokenName: 'md.stiffness' },
          },
        },
      }),
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(processToken(token)).toBeNull();
    expect(logSpy).toHaveBeenCalled();
  });

  it('should resolve linked token names', () => {
    const token = setupValue(
      createValue({ tokenName: 'md.comp.other.linked' }),
      'md.comp.test',
      createToken({
        tokenName: 'md.comp.other.linked',
        deprecationMessage: { message: 'Deprecated' },
      }),
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(processToken(token)).toBe('md.comp.other.linked');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('should throw when linked tokens are missing', () => {
    const token = setupValue(createValue({ tokenName: 'md.missing.token' }));

    expect(() => processToken(token)).toThrow(
      "Token wasn't found: md.missing.token",
    );
  });
});

describe('toCSSValue', () => {
  it('should map a literal without a store', () => {
    expect(toCSSValue({ length: { value: 4 } })).toBe('4px');
  });

  it('should map a one-hop reference to the referenced name', () => {
    expect(toCSSValue({ tokenName: 'md.sys.shape.corner.full' })).toBe(
      'md.sys.shape.corner.full',
    );
  });

  it('should map an undefined value to null', () => {
    expect(toCSSValue({ undefined: true })).toBeNull();
  });
});
