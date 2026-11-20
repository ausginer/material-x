// oxlint-disable no-console
import kebabCase from 'just-kebab-case';
import type { ProcessedTokenValue } from './processTokenSet.ts';
import store from './store/index.ts';
import {
  TextTransform,
  TokenShapeFamily,
  type StoredToken,
  type StoredValue,
  type TokenTypeVariationAxes,
} from './store/schema.ts';
import { rgbaToHex } from './utils.ts';

/**
 * Maps a stored value to its CSS value: a literal to CSS text, or a one-hop
 * reference to the referenced token's name. A `customComposite` value, and a
 * value with no field this maps, gives `null`.
 */
export function toCSSValue(value: StoredValue): ProcessedTokenValue | null {
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
    return `${length.value ?? 0}${length.unit === 'PERCENT' ? '%' : 'px'}`;
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
      // An absent variationAxes gives no entry, so no entry is undefined.
      Object.entries<string | TokenTypeVariationAxes>(type).map(
        ([key, value]) =>
          [kebabCase(key.replace('TokenName', '')), value] as const,
      ),
    );
  }

  if (fontNames != null) {
    return fontNames.values.map((name) => JSON.stringify(name)).join(', ');
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
    }
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
    // The token data is upstream's, and its type names only the value seen so
    // far. Read as `unknown`, the value can be any other upstream one, which is
    // what this check is for.
    if ((textTransform as unknown) !== TextTransform.NONE) {
      throw new Error(`Unknown text transform: ${textTransform}`);
    }

    return 'none';
  }

  if (customComposite != null) {
    return null;
  }

  return valueTokenName ?? null;
}

export default function processToken(
  token: StoredToken,
): ProcessedTokenValue | null {
  const set = store.getTokenSet(token);
  const selection = store.select(token);

  if (!selection) {
    console.error(`No value found for ${token.tokenName}`);
    return null;
  }

  if (set.tokenSetName === 'md.sys.color') {
    return null;
  }

  const { value } = selection;
  const cssValue = toCSSValue(value);

  if (cssValue == null) {
    if (value.customComposite != null) {
      console.log(
        `Skipping ${token.tokenName} because it provides customComposite property`,
      );
    }

    return null;
  }

  if (cssValue === value.tokenName) {
    const linkedToken = store.getToken(value.tokenName);

    if (!linkedToken) {
      throw new Error(`Token wasn't found: ${value.tokenName}`);
    }

    if (store.isTokenDeprecated(linkedToken)) {
      console.warn('Token is deprecated: ', value.tokenName);
    }
  }

  return cssValue;
}
