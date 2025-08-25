import type DB from './DB.ts';
import type DependencyManager from './DependencyManager.ts';
import { TextTransform, TokenShapeFamily, type Token } from './TokenTable.ts';
import {
  camelCaseToKebabCase,
  getSetName,
  rgbaToHex,
  sassName,
} from './utils.ts';

export type TransformResult = Readonly<{
  order: number;
  value: string | Readonly<Record<string, string | undefined>>;
}>;

export default function processSingle(
  token: Token,
  setName: string,
  dependencyManager: DependencyManager,
  db: DB,
): TransformResult | null {
  const extendedValue = db.getValue(token);

  if (!extendedValue) {
    console.error(`No value found for ${token.tokenName}`);
    return null;
  }

  if (setName === 'md.sys.color') {
    return null;
  }

  const { value, order } = extendedValue;

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
    return { order, value: `${length.value ?? 0}px` };
  }

  if (opacity != null) {
    return { order, value: String(opacity) };
  }

  if (elevation != null) {
    return { order, value: String(elevation.value ?? 0) };
  }

  if (numeric != null) {
    return { order, value: String(numeric) };
  }

  if (durationMs != null) {
    return { order, value: `${durationMs}ms` };
  }

  if (type != null) {
    const value = Object.fromEntries(
      Object.entries(type).map(
        ([key, value]) =>
          [
            camelCaseToKebabCase(key.replace('TokenName', '')),
            value
              ? useImportedTokenName(
                  findLinkedToken(value, db),
                  dependencyManager,
                )
              : undefined,
          ] as const,
      ),
    );

    return { order, value };
  }

  if (fontNames != null) {
    return {
      order,
      value: fontNames.values.map((name) => `'${name}'`).join(', '),
    };
  }

  if (fontTracking != null) {
    return { order, value: `${fontTracking.value ?? 0}px` };
  }

  if (fontWeight != null) {
    return { order, value: String(fontWeight) };
  }

  if (fontSize != null) {
    return { order, value: String(fontSize.value ?? 0) };
  }

  if (lineHeight != null) {
    return { order, value: `${lineHeight.value ?? 0}px` };
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

    return {
      order,
      value: rgbaToHex(red, green, blue, alpha),
    };
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
      return { order, value: 'full' };
    } else {
      if (defaultSize?.value != null) {
        return { order, value: `${defaultSize.value ?? 0}px` };
      }

      return {
        order,
        value: {
          'top-left': `${topLeft?.value ?? top?.value ?? 0}px`,
          'top-right': `${topRight?.value ?? right?.value ?? 0}px`,
          'bottom-right': `${bottomRight?.value ?? bottom?.value ?? 0}px`,
          'bottom-left': `${bottomLeft?.value ?? left?.value ?? 0}px`,
        },
      };
    }
  }

  if (cubicBezier != null) {
    const { x0 = 0, y0 = 0, x1 = 0, y1 = 0 } = cubicBezier;
    return {
      order,
      value: `cubic-bezier(${x0}, ${y0}, ${x1}, ${y1})`,
    };
  }

  if (motionPath != null) {
    return { order, value: motionPath.standardPath.toLowerCase() };
  }

  if (axisValue != null) {
    return { order, value: String(axisValue.value ?? 0) };
  }

  if (textTransform != null) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (textTransform !== TextTransform.NONE) {
      console.error('Unknown text transform', value, token.tokenName);
      return null;
    }

    return { order, value: 'none' };
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
      console.error("Token wasn't found: ", valueTokenName);
      return null;
    }

    if (db.isTokenDeprecated(linkedToken)) {
      console.warn('Token is deprecated: ', valueTokenName);
    }

    const value = useImportedTokenName(
      findLinkedToken(valueTokenName, db),
      dependencyManager,
    );

    if (token.tokenValueType === 'TYPOGRAPHY') {
      return { order, value };
    }

    return { order, value };
  }

  return null;
}

function findLinkedToken(tokenLinkName: string, db: DB) {
  const token = db.getToken(tokenLinkName);

  if (!token) {
    throw new Error(`Token "${tokenLinkName}" not found.`);
  }

  return token;
}

function useImportedTokenName(
  token: Token,
  dependencyManager: DependencyManager,
) {
  const setName = getSetName(token);

  if (dependencyManager.set === setName) {
    return `$${sassName(token.tokenNameSuffix)}`;
  }

  dependencyManager.add(setName);
  return `${sassName(setName)}.$${sassName(token.tokenNameSuffix)}`;
}
