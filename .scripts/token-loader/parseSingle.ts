import {
  TextTransform,
  type TokenColor,
  TokenShapeFamily,
} from './TokenTable.ts';
import { type ProcessedToken, TokenValueType } from '../utils.ts';
import type SystemToken from './SystemToken.ts';
import type SystemUnifier from './SystemUnifier.ts';

export default function parseSingle(
  token: SystemToken,
  unifier: SystemUnifier,
): ProcessedToken | null {
  const { value, set } = token;

  if (!value) {
    console.error(`No value found for ${token.valueOf().tokenName}`);
    return null;
  }

  if (set.valueOf().name === 'md.sys.color') {
    return null;
  }

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
  } = value.valueOf();

  const { order } = value;

  const { tokenName, tokenNameSuffix } = token.valueOf();

  if (length != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.LENGTH,
        value: length.value ?? 0,
        order,
      },
    };
  }

  if (opacity != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.OPACITY,
        value: opacity,
        order,
      },
    };
  }

  if (elevation != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.ELEVATION,
        value: elevation.value ?? 0,
        order,
      },
    };
  }

  if (numeric != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.NUMERIC,
        value: numeric,
        order,
      },
    };
  }

  if (durationMs != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.DURATION,
        value: durationMs,
        order,
      },
    };
  }

  if (type != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.FONT_TYPE,
        value: Object.fromEntries(
          Object.entries(type).map(([key, value]) => [
            key.replace('TokenName', ''),
            value,
          ]),
        ),
        order,
      },
    };
  }

  if (fontNames != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.FONT_NAMES,
        value: fontNames.values.map((name) => `'${name}'`),
        order,
      },
    };
  }

  if (fontTracking != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.LENGTH,
        value: fontTracking.value ?? 0,
        order,
      },
    };
  }

  if (fontWeight != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.FONT_WEIGHT,
        value: fontWeight,
        order,
      },
    };
  }

  if (fontSize != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.FONT_SIZE,
        value: fontSize.value,
        order,
      },
    };
  }

  if (lineHeight != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.LINE_HEIGHT,
        value: lineHeight.value,
        order,
      },
    };
  }

  if (color != null) {
    const {
      red = 0,
      green = 0,
      blue = 0,
      alpha,
    } = Object.fromEntries(
      Object.entries<number | undefined>(color).map(([key, value]) => [
        key,
        key !== 'alpha' && value != null ? Math.round(value * 255) : value,
      ]),
    ) as TokenColor;

    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.COLOR,
        value: { red, green, blue, alpha },
        order,
      },
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
      return {
        [tokenName]: {
          suffix: tokenNameSuffix,
          type: TokenValueType.SHAPE,
          value: 9999,
          order,
        },
      };
    } else {
      if (defaultSize?.value != null) {
        return {
          [tokenName]: {
            suffix: tokenNameSuffix,
            type: TokenValueType.SHAPE,
            value: defaultSize.value,
            order,
          },
        };
      }

      return {
        [tokenName]: {
          suffix: tokenNameSuffix,
          type: TokenValueType.SHAPE,
          value: {
            topLeft: topLeft?.value ?? top?.value ?? 0,
            topRight: topRight?.value ?? right?.value ?? 0,
            bottomRight: bottomRight?.value ?? bottom?.value ?? 0,
            bottomLeft: bottomLeft?.value ?? left?.value ?? 0,
          },
          order,
        },
      };
    }
  }

  if (cubicBezier != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.BEZIER,
        value: cubicBezier,
        order,
      },
    };
  }

  if (motionPath != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.MOTION_PATH,
        value: motionPath.standardPath.toLowerCase(),
        order,
      },
    };
  }

  if (axisValue != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.AXIS_VALUE,
        value: axisValue.value ?? 0,
        order,
      },
    };
  }

  if (textTransform != null) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (textTransform !== TextTransform.NONE) {
      console.error(
        'Unknown text transform',
        token.value?.valueOf(),
        token.valueOf().tokenName,
      );
      return null;
    }

    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.TEXT_TRANSFORM,
        value: 'none',
        order,
      },
    };
  }

  if (customComposite != null) {
    console.log(
      `Skipping ${token.valueOf().tokenName} because it provides customComposite property`,
    );

    return null;
  }

  if (valueTokenName != null) {
    const linkedToken = unifier.tokens.find(
      (token) => token.valueOf().tokenName === valueTokenName,
    );

    if (!linkedToken) {
      console.error("Token wasn't found: ", valueTokenName);
      return null;
    }

    if (linkedToken.deprecated) {
      console.warn('Token is deprecated: ', valueTokenName);
    }

    if (token.valueOf().tokenValueType === 'TYPOGRAPHY') {
      return {
        [tokenName]: {
          suffix: tokenNameSuffix,
          type: TokenValueType.TYPOGRAPHY,
          value: valueTokenName,
          order,
        },
      };
    }

    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.TOKEN_NAME,
        value: valueTokenName,
        order,
      },
    };
  }

  return null;
}
