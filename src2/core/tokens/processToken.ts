import kebabCase from 'just-kebab-case';
import db from './DB.ts';
import type { ProcessedTokenValue } from './processTokenSet.ts';
import { TextTransform, TokenShapeFamily, type Token } from './TokenTable.ts';
import { rgbaToHex } from './utils.ts';

export default function processToken(token: Token): ProcessedTokenValue | null {
  const set = db.getSet(token);
  const extendedValue = db.getValue(token);

  if (!extendedValue) {
    console.error(`No value found for ${token.tokenName}`);
    return null;
  }

  if (set.tokenSetName === 'md.sys.color') {
    return null;
  }

  const { value } = extendedValue;

  const {
    length,
    opacity,
    elevation,
    numeric,
    durationMs,
    type,
    fontNames,
    fontTracking,
    fontWeight,
    fontSize,
    lineHeight,
    motionPath,
    color,
    shape,
    cubicBezier,
    customComposite,
    axisValue,
    textTransform,
    tokenName: valueTokenName,
  } = value;

  if (length != null) {
    return `${length.value ?? 0}px`;
  }

  if (opacity != null) {
    return String(opacity);
  }

  if (elevation != null) {
    return String(elevation.value ?? 0);
  }

  if (numeric != null) {
    return String(numeric);
  }

  if (durationMs != null) {
    return `${durationMs}ms`;
  }

  if (type != null) {
    return Object.fromEntries(
      Object.entries(type).map(
        ([key, value]) =>
          [kebabCase(key.replace('TokenName', '')), value] as const,
      ),
    );
  }

  if (fontNames != null) {
    return fontNames.values.map((name) => `'${name}'`).join(', ');
  }

  if (fontTracking != null) {
    return `${fontTracking.value ?? 0}px`;
  }

  if (fontWeight != null) {
    return String(fontWeight);
  }

  if (fontSize != null) {
    return `${fontSize.value ?? 0}px`;
  }

  if (lineHeight != null) {
    return `${lineHeight.value ?? 0}px`;
  }

  if (color != null) {
    const {
      red = 0,
      green = 0,
      blue = 0,
      alpha = 255,
    } = Object.fromEntries(
      Object.entries<number | undefined>(color).map(([key, value]) => [
        key,
        value != null ? Math.round(value * 255) : value,
      ]),
    );

    return rgbaToHex(red, green, blue, alpha);
  }

  if (shape != null) {
    const {
      family,
      defaultSize,
      top,
      bottom,
      left,
      right,
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    } = shape;

    if (family === TokenShapeFamily.FULL) {
      return 'full';
    } else {
      if (defaultSize?.value != null) {
        return `${defaultSize.value ?? 0}px`;
      }

      return {
        'top-left': `${topLeft?.value ?? top?.value ?? 0}px`,
        'top-right': `${topRight?.value ?? right?.value ?? 0}px`,
        'bottom-right': `${bottomRight?.value ?? bottom?.value ?? 0}px`,
        'bottom-left': `${bottomLeft?.value ?? left?.value ?? 0}px`,
      };
    }
  }

  if (cubicBezier != null) {
    const { x0 = 0, y0 = 0, x1 = 0, y1 = 0 } = cubicBezier;
    return `cubic-bezier(${x0}, ${y0}, ${x1}, ${y1})`;
  }

  if (motionPath != null) {
    return motionPath.standardPath.toLowerCase();
  }

  if (axisValue != null) {
    return String(axisValue.value ?? 0);
  }

  if (textTransform != null) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (textTransform !== TextTransform.NONE) {
      throw new Error(`Unknown text transform: ${String(textTransform)}`);
    }

    return 'none';
  }

  if (customComposite != null) {
    console.log(
      `Skipping ${token.tokenName} because it provides customComposite property`,
    );

    return null;
  }

  if (valueTokenName != null) {
    const linkedToken = db.getToken(valueTokenName);

    if (!linkedToken) {
      throw new Error(`Token wasn't found: ${valueTokenName}`);
    }

    if (db.isTokenDeprecated(linkedToken)) {
      console.warn('Token is deprecated: ', valueTokenName);
    }

    return valueTokenName;
  }

  return null;
}
