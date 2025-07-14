import type { MaterialTheme } from './MaterialTheme.js';
import SystemUnifier from './SystemUnifier.ts';
import type TokenSetManager from './TokenSetManager.ts';
import {
  TextTransform,
  type Token,
  type TokenSet,
  TokenShapeFamily,
  type TokenTable,
  type Value,
} from './TokenTable.ts';
import {
  extractSetName,
  kebabCaseToCamelCase,
  tokenNameToSass,
} from './utils.ts';

export type SassDeclarationToken = readonly [
  name: string,
  value?: string | number,
];

export default class TokenSystemProcessor {
  readonly #unifier: SystemUnifier;
  readonly #theme: MaterialTheme;

  constructor(tables: readonly TokenTable[], theme: MaterialTheme) {
    this.#unifier = new SystemUnifier(tables.map(({ system }) => system));
    this.#theme = theme;
  }

  get tokens(): IteratorObject<Token> {
    return this.#unifier.tokens;
  }

  getTokenValue({ name }: Token): Value | undefined {
    const referenceTree = this.#unifier.getReferenceTree(name);

    if (!referenceTree) {
      return this.#unifier.values.find((value) => value.name.startsWith(name));
    }

    return this.#unifier.values.find(
      ({ name }) => referenceTree.value.name === name,
    );
  }

  findTokenSet({
    name,
    tokenName,
    tokenNameSuffix,
  }: Token): Pick<TokenSet, 'tokenSetName'> &
    Partial<Pick<TokenSet, 'displayName'>> {
    const tokenSet = this.#unifier.tokenSets.find((set) =>
      name.startsWith(set.name),
    );

    return {
      displayName: tokenSet?.displayName,
      tokenSetName:
        tokenSet?.tokenSetName ?? extractSetName(tokenName, tokenNameSuffix),
    };
  }

  processToken(
    token: Token,
    setManager: TokenSetManager,
  ): readonly SassDeclarationToken[] {
    const sassVarName = `$${tokenNameToSass(token.tokenNameSuffix)}`;
    const valueToken = this.getTokenValue(token);

    if (!valueToken) {
      console.error(`No value found for ${token.tokenName}`);
      return [[sassVarName]];
    }

    if (setManager.name === 'md.sys.color') {
      const colorName = kebabCaseToCamelCase(token.tokenNameSuffix);
      return [
        [sassVarName, this.#theme.schemes['light-medium-contrast'][colorName]],
      ];
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
      color,
      shape,
      cubicBezier,
      customComposite,
      axisValue,
      textTransform,
      tokenName: valueTokenName,
    } = valueToken;

    if (length != null) {
      return [[sassVarName, `${length.value ?? 0}px`]];
    } else if (opacity != null) {
      return [[sassVarName, opacity]];
    } else if (elevation != null) {
      return [[sassVarName, elevation.value ?? 0]];
    } else if (numeric != null) {
      return [[sassVarName, numeric]];
    } else if (durationMs != null) {
      return [[sassVarName, durationMs]];
    } else if (type != null) {
      const {
        fontNameTokenName,
        fontWeightTokenName,
        fontSizeTokenName,
        lineHeightTokenName,
      } = type;

      const fontNames = this.#convertToImported(fontNameTokenName, setManager);
      const fontWeight = this.#convertToImported(
        fontWeightTokenName,
        setManager,
      );
      const fontSize = this.#convertToImported(fontSizeTokenName, setManager);
      const lineHeight = this.#convertToImported(
        lineHeightTokenName,
        setManager,
      );

      const map = `(
  font-names: ${fontNames},
  font-weight: ${fontWeight},
  font-size: ${fontSize},
  line-height: ${lineHeight},
)`;

      return [[sassVarName, map]];
    } else if (fontNames != null) {
      return [
        [sassVarName, fontNames.values.map((name) => `'${name}'`).join(', ')],
      ];
    } else if (fontTracking != null) {
      return [[sassVarName, `${fontTracking.value ?? 0}px`]];
    } else if (fontWeight != null) {
      return [[sassVarName, fontWeight]];
    } else if (fontSize != null) {
      return [[sassVarName, `${fontSize.value}px`]];
    } else if (lineHeight != null) {
      return [[sassVarName, `${lineHeight.value}px`]];
    } else if (color != null) {
      const { red = 0, green = 0, blue = 0, alpha } = color;

      const result = `rgb(${Math.round(red * 255)} ${Math.round(
        green * 255,
      )} ${Math.round(blue * 255)}${
        alpha != null ? ` / ${Math.round(alpha * 255)}` : ''
      })`;

      return [[sassVarName, result]];
    } else if (shape != null) {
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
        return [[sassVarName, '9999px']];
      } else {
        if (defaultSize?.value != null) {
          return [[sassVarName, `${defaultSize.value}px`]];
        }

        const _topLeft = topLeft ?? top ?? { value: 0 };
        const _topRight = topRight ?? right ?? { value: 0 };
        const _bottomRight = bottomRight ?? bottom ?? { value: 0 };
        const _bottomLeft = bottomLeft ?? left ?? { value: 0 };

        return [
          [`${sassVarName}-top-left`, `${_topLeft.value}px`],
          [`${sassVarName}-top-right`, `${_topRight.value}px`],
          [`${sassVarName}-bottom-right`, `${_bottomRight.value}px`],
          [`${sassVarName}-bottom-left`, `${_bottomLeft.value}px`],
        ];
      }
    } else if (cubicBezier != null) {
      const { x0 = 0, y0 = 0, x1 = 0, y1 = 0 } = cubicBezier;

      return [[sassVarName, `cubic-bezier(${x0}, ${y0}, ${x1}, ${y1})`]];
    } else if (customComposite) {
      const { damping, stiffness } = customComposite.properties;

      const _damping = this.#convertToImported(damping.tokenName, setManager);
      const _stiffness = this.#convertToImported(
        stiffness.tokenName,
        setManager,
      );

      return [
        [
          sassVarName,
          `(
  damping:  ${_damping},
  stiffness: ${_stiffness},
)`,
        ],
      ];
    } else if (axisValue) {
      return [[sassVarName, axisValue.value ?? 0]];
    } else if (textTransform) {
      let value: string;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (textTransform === TextTransform.NONE) {
        value = 'none';
      } else {
        console.error('Unknown text transform', valueToken, token.tokenName);
        return [[sassVarName]];
      }

      return [[sassVarName, value]];
    } else if (valueTokenName != null) {
      const imported = this.#convertToImported(valueTokenName, setManager);

      if (!imported) {
        console.error("Token wasn't found: ", valueTokenName);
        return [[sassVarName]];
      }

      return [[sassVarName, imported]];
    } else {
      console.error(
        'Value token has no known properties',
        valueToken,
        token.tokenName,
      );
      return [[sassVarName]];
    }
  }

  #convertToImported(
    tokenName: string,
    setManager: TokenSetManager,
  ): string | undefined {
    const token = this.#unifier.tokens.find(
      (token) => token.tokenName === tokenName,
    );

    if (!token) {
      return undefined;
    }

    const tokenSetName = extractSetName(token.tokenName, token.tokenNameSuffix);
    const varName = `$${tokenNameToSass(token.tokenNameSuffix)}`;

    if (tokenSetName === setManager.name) {
      return varName;
    }

    const importedSet = tokenNameToSass(tokenSetName);
    setManager.add(`@use "${importedSet}";`);

    return `${importedSet}.${varName}`;
  }
}
