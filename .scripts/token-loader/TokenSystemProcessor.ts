import type { MaterialTheme } from './MaterialTheme.js';
import SystemUnifier from './SystemUnifier.ts';
import type TokenSetManager from './TokenSetManager.ts';
import {
  TextTransform,
  type Token,
  type TokenColor,
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
    const declaration = tokenNameToSass(token.tokenNameSuffix);
    const valueToken = this.getTokenValue(token);

    if (!valueToken) {
      console.error(`No value found for ${token.tokenName}`);
      return [[declaration]];
    }

    if (setManager.name === 'md.sys.color') {
      const colorName = kebabCaseToCamelCase(token.tokenNameSuffix);
      return [
        [declaration, this.#theme.schemes['light-medium-contrast'][colorName]],
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
      motionPath,
      color,
      shape,
      cubicBezier,
      customComposite,
      axisValue,
      textTransform,
      tokenName: valueTokenName,
    } = valueToken;

    if (length != null) {
      return [[declaration, `${length.value ?? 0}px`]];
    } else if (opacity != null) {
      return [[declaration, opacity]];
    } else if (elevation != null) {
      return [[declaration, elevation.value ?? 0]];
    } else if (numeric != null) {
      return [[declaration, numeric]];
    } else if (durationMs != null) {
      return [[declaration, durationMs]];
    } else if (type != null) {
      const { fontName, fontWeight, fontSize, lineHeight } = Object.fromEntries(
        Object.entries(type).map(([key, value]) => [
          key.replace('TokenName', ''),
          this.#convertToImported(value, setManager),
        ]),
      );

      return [
        [
          declaration,
          `${fontWeight ? `#{${fontWeight}} ` : ''}${
            fontSize ? `#{${fontSize}}/` : ''
          }${lineHeight ? `#{${lineHeight}} ` : ''}${
            fontName ? `#{${fontName}} ` : ''
          }`,
        ] as const,
      ];
    } else if (fontNames != null) {
      return [
        [declaration, fontNames.values.map((name) => `'${name}'`).join(', ')],
      ];
    } else if (fontTracking != null) {
      return [[declaration, `${fontTracking.value ?? 0}px`]];
    } else if (fontWeight != null) {
      return [[declaration, fontWeight]];
    } else if (fontSize != null) {
      return [[declaration, `${fontSize.value}px`]];
    } else if (lineHeight != null) {
      return [[declaration, `${lineHeight.value}px`]];
    } else if (color != null) {
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

      const result = `rgb(${red} ${green} ${blue}${alpha != null ? ` / ${alpha}` : ''})`;

      return [[declaration, result]];
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
        return [[declaration, '9999rem']];
      } else {
        if (defaultSize?.value != null) {
          return [[declaration, `${defaultSize.value}px`]];
        }

        const _topLeft = topLeft ?? top ?? { value: 0 };
        const _topRight = topRight ?? right ?? { value: 0 };
        const _bottomRight = bottomRight ?? bottom ?? { value: 0 };
        const _bottomLeft = bottomLeft ?? left ?? { value: 0 };

        return [
          [`${declaration}-top-left`, `${_topLeft.value}px`],
          [`${declaration}-top-right`, `${_topRight.value}px`],
          [`${declaration}-bottom-right`, `${_bottomRight.value}px`],
          [`${declaration}-bottom-left`, `${_bottomLeft.value}px`],
        ];
      }
    } else if (cubicBezier != null) {
      const { x0 = 0, y0 = 0, x1 = 0, y1 = 0 } = cubicBezier;

      return [[declaration, `cubic-bezier(${x0}, ${y0}, ${x1}, ${y1})`]];
    } else if (customComposite) {
      console.log(
        `Skipping ${valueTokenName} because it provides customComposite property`,
      );

      return [[declaration]];
    } else if (motionPath != null) {
      return [[declaration, motionPath.standardPath.toLowerCase()]];
    } else if (axisValue != null) {
      return [[declaration, axisValue.value ?? 0]];
    } else if (textTransform) {
      let value: string;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (textTransform === TextTransform.NONE) {
        value = 'none';
      } else {
        console.error('Unknown text transform', valueToken, token.tokenName);
        return [[declaration]];
      }

      return [[declaration, value]];
    } else if (valueTokenName != null) {
      const imported = this.#convertToImported(valueTokenName, setManager);

      if (!imported) {
        console.error("Token wasn't found: ", valueTokenName);
        return [[declaration]];
      }

      if (token.tokenValueType === 'TYPOGRAPHY') {
        return [
          [declaration, imported],
          [`${declaration}-font`, `${imported}-font`],
          [`${declaration}-size`, `${imported}-size`],
          [`${declaration}-weight`, `${imported}-weight`],
          [`${declaration}-line-height`, `${imported}-line-height`],
        ];
      }

      return [[declaration, imported]];
    } else {
      console.error(
        'Value token has no known properties',
        valueToken,
        token.tokenName,
      );
      return [[declaration]];
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
    const varName = tokenNameToSass(token.tokenNameSuffix);

    if (tokenSetName === setManager.name) {
      return `$${varName}`;
    }

    const importedSet = tokenNameToSass(tokenSetName);
    setManager.add(`@use "${importedSet}";`);

    // $default here is because all the imports are done from the second-level
    // token sets (e.g. `md.sys.color`), which have only one default token set.
    return `${importedSet}.$${varName}`;
  }
}
