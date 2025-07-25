import {
  TextTransform,
  type TokenColor,
  TokenShapeFamily,
} from '../token-loader/TokenTable.ts';
import { type ProcessedToken, TokenValueType } from '../utils.ts';
import type SystemToken from './SystemToken.ts';
import type SystemUnifier from './SystemUnifier.ts';

export default function process(
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

  const { tokenName, tokenNameSuffix } = token.valueOf();

  if (length != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.LENGTH,
        value: length.value ?? 0,
      },
    };
  }

  if (opacity != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.OPACITY,
        value: opacity,
      },
    };
  }

  if (elevation != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.ELEVATION,
        value: elevation.value ?? 0,
      },
    };
  }

  if (numeric != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.NUMERIC,
        value: numeric,
      },
    };
  }

  if (durationMs != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.DURATION,
        value: durationMs,
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
            { type: TokenValueType.TOKEN_NAME, value },
          ]),
        ),
      },
    };
  }

  if (fontNames != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.FONT_NAMES,
        value: fontNames.values.map((name) => `'${name}'`),
      },
    };
  }

  if (fontTracking != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.LENGTH,
        value: fontTracking.value ?? 0,
      },
    };
  }

  if (fontWeight != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.FONT_WEIGHT,
        value: fontWeight,
      },
    };
  }

  if (fontSize != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.FONT_SIZE,
        value: fontSize.value,
      },
    };
  }

  if (lineHeight != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.LINE_HEIGHT,
        value: lineHeight.value,
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
        },
      };
    } else {
      if (defaultSize?.value != null) {
        return {
          [tokenName]: {
            suffix: tokenNameSuffix,
            type: TokenValueType.SHAPE,
            value: defaultSize.value,
          },
        };
      }

      return {
        [tokenName]: {
          suffix: tokenNameSuffix,
          type: TokenValueType.SHAPE,
          value: {
            'top-left': topLeft?.value ?? top?.value ?? 0,
            'top-right': topRight?.value ?? right?.value ?? 0,
            'bottom-right': bottomRight?.value ?? bottom?.value ?? 0,
            'bottom-left': bottomLeft?.value ?? left?.value ?? 0,
          },
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
      },
    };
  }

  if (motionPath != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.MOTION_PATH,
        value: motionPath.standardPath.toLowerCase(),
      },
    };
  }

  if (axisValue != null) {
    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.AXIS_VALUE,
        value: axisValue.value ?? 0,
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
      },
    };
  }

  if (customComposite != null) {
    console.log(
      `Skipping ${valueTokenName} because it provides customComposite property`,
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

    // if (token.valueOf().tokenValueType === 'TYPOGRAPHY') {
    //   return {
    //     [tokenName]: {
    //       suffix: tokenNameSuffix,
    //       type: TYPOGRAPHY,
    //       value: valueTokenName,
    //     },
    //   };
    // }

    return {
      [tokenName]: {
        suffix: tokenNameSuffix,
        type: TokenValueType.TOKEN_NAME,
        value: valueTokenName,
      },
    };
  }

  return null;
}
