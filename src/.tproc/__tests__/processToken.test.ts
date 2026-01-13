import { describe, it, expect, vi } from 'vitest';
import processToken from '../processToken.ts';
import { TextTransform, TokenShapeFamily } from '../TokenTable.ts';
import { createToken, createValue, mockDB } from './helpers.ts';

describe('processToken', () => {
  const setupValue = (
    value: ReturnType<typeof createValue>,
    setName?: string,
  ) => {
    mockDB.getSet.mockReturnValue({
      tokenSetName: setName ?? 'md.comp.test',
    });
    mockDB.getValue.mockReturnValue({ value });
  };

  it('should return null when no value is found', () => {
    const token = createToken();
    mockDB.getSet.mockReturnValue({ tokenSetName: 'md.comp.test' });
    mockDB.getValue.mockReturnValue(undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(processToken(token)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      `No value found for ${token.tokenName}`,
    );
  });

  it('should return null for system color tokens', () => {
    const token = createToken();
    setupValue(createValue({ numeric: 1 }), 'md.sys.color');

    expect(processToken(token)).toBeNull();
  });

  it('should convert length tokens to px', () => {
    const token = createToken();
    setupValue(createValue({ length: { value: 4 } }));

    expect(processToken(token)).toBe('4px');
  });

  it('should convert opacity tokens to string', () => {
    const token = createToken();
    setupValue(createValue({ opacity: 0.5 }));

    expect(processToken(token)).toBe('0.5');
  });

  it('should convert elevation tokens to string', () => {
    const token = createToken();
    setupValue(createValue({ elevation: { value: 2 } }));

    expect(processToken(token)).toBe('2');
  });

  it('should convert numeric tokens to string', () => {
    const token = createToken();
    setupValue(createValue({ numeric: 3 }));

    expect(processToken(token)).toBe('3');
  });

  it('should convert duration tokens to ms', () => {
    const token = createToken();
    setupValue(createValue({ durationMs: 150 }));

    expect(processToken(token)).toBe('150ms');
  });

  it('should map type tokens to kebab keys', () => {
    const token = createToken();
    setupValue(
      createValue({
        type: {
          fontNameTokenName: 'md.ref.typeface',
          fontWeightTokenName: 'md.ref.weight',
          fontSizeTokenName: 'md.ref.size',
          fontTrackingTokenName: 'md.ref.tracking',
          lineHeightTokenName: 'md.ref.line',
        },
      }),
    );

    expect(processToken(token)).toEqual({
      'font-name': 'md.ref.typeface',
      'font-weight': 'md.ref.weight',
      'font-size': 'md.ref.size',
      'font-tracking': 'md.ref.tracking',
      'line-height': 'md.ref.line',
    });
  });

  it('should format font names', () => {
    const token = createToken();
    setupValue(createValue({ fontNames: { values: ['Roboto', 'Arial'] } }));

    expect(processToken(token)).toBe('"Roboto", "Arial"');
  });

  it('should convert font tracking to px', () => {
    const token = createToken();
    setupValue(createValue({ fontTracking: { value: 1 } }));

    expect(processToken(token)).toBe('1px');
  });

  it('should convert font weight to string', () => {
    const token = createToken();
    setupValue(createValue({ fontWeight: 500 }));

    expect(processToken(token)).toBe('500');
  });

  it('should convert font size to px', () => {
    const token = createToken();
    setupValue(createValue({ fontSize: { value: 14 } }));

    expect(processToken(token)).toBe('14px');
  });

  it('should convert line height to px', () => {
    const token = createToken();
    setupValue(createValue({ lineHeight: { value: 18 } }));

    expect(processToken(token)).toBe('18px');
  });

  it('should convert colors to hex', () => {
    const token = createToken();
    setupValue(
      createValue({
        color: { red: 1, green: 0, blue: 0, alpha: 0.5 },
      }),
    );

    expect(processToken(token)).toBe('#ff000080');
  });

  it('should return full for circular shapes', () => {
    const token = createToken();
    setupValue(
      createValue({
        shape: { family: TokenShapeFamily.FULL },
      }),
    );

    expect(processToken(token)).toBe('full');
  });

  it('should return default shape size when present', () => {
    const token = createToken();
    setupValue(
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
    const token = createToken();
    setupValue(
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
    const token = createToken();
    setupValue(
      createValue({
        cubicBezier: { x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.4 },
      }),
    );

    expect(processToken(token)).toBe('cubic-bezier(0.1, 0.2, 0.3, 0.4)');
  });

  it('should lowercase motion paths', () => {
    const token = createToken();
    setupValue(createValue({ motionPath: { standardPath: 'PATH' } }));

    expect(processToken(token)).toBe('path');
  });

  it('should convert axis values to string', () => {
    const token = createToken();
    setupValue(createValue({ axisValue: { tag: 'wdth', value: 12 } }));

    expect(processToken(token)).toBe('12');
  });

  it('should map text transform none', () => {
    const token = createToken();
    setupValue(createValue({ textTransform: TextTransform.NONE }));

    expect(processToken(token)).toBe('none');
  });

  it('should throw on unknown text transforms', () => {
    const token = createToken();
    const value = createValue();
    Reflect.set(value, 'textTransform', 'TEXT_TRANSFORM_UPPER');
    setupValue(value);

    expect(() => processToken(token)).toThrow(
      'Unknown text transform: TEXT_TRANSFORM_UPPER',
    );
  });

  it('should skip custom composite values', () => {
    const token = createToken();
    setupValue(
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
    const token = createToken();
    setupValue(createValue({ tokenName: 'md.linked.token' }));
    mockDB.getToken.mockReturnValue(createToken());
    mockDB.isTokenDeprecated.mockReturnValue(true);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(processToken(token)).toBe('md.linked.token');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('should throw when linked tokens are missing', () => {
    const token = createToken();
    setupValue(createValue({ tokenName: 'md.missing.token' }));
    mockDB.getToken.mockReturnValue(undefined);

    expect(() => processToken(token)).toThrow(
      "Token wasn't found: md.missing.token",
    );
  });
});
