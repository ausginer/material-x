import SystemUnifier from './SystemUnifier.js';
import {
  TextTransform,
  type Token,
  type TokenSet,
  TokenShapeFamily,
  type TokenTable,
  type Value,
} from './TokenTable.js';
import { tokenNameToSassVar } from './utils.js';

export type SassDeclarationToken = readonly [
  name: string,
  value?: string | number,
];

export default class TokenSystemProcessor {
  readonly #unifier: SystemUnifier;

  constructor(tables: readonly TokenTable[]) {
    this.#unifier = new SystemUnifier(tables.map(({ system }) => system));
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
        tokenSet?.tokenSetName ?? tokenName.replace(`.${tokenNameSuffix}`, ''),
    };
  }

  processToken(
    token: Token,
    tokenSetName: string,
  ): readonly SassDeclarationToken[] {
    const sassVarName = `$${token.tokenNameSuffix.replaceAll('.', '-')}`;
    const valueToken = this.getTokenValue(token);

    if (!valueToken) {
      console.error(`No value found for ${token.tokenName}`);
      return [[sassVarName]];
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

      const map = `(
  font-names: ${tokenNameToSassVar(fontNameTokenName, tokenSetName)},
  font-weight: ${tokenNameToSassVar(fontWeightTokenName, tokenSetName)},
  font-size: ${tokenNameToSassVar(fontSizeTokenName, tokenSetName)},
  line-height: ${tokenNameToSassVar(lineHeightTokenName, tokenSetName)},
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

      const result =
        alpha != null
          ? `rgba(${Math.round(red * 255)} ${Math.round(green * 255)} ${Math.round(blue * 255)} ${Math.round(alpha * 255)})`
          : `rgb(${Math.round(red * 255)} ${Math.round(green * 255)} ${Math.round(blue * 255)})`;

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

      return [
        [`${sassVarName}-damping`, damping.tokenName],
        [`${sassVarName}-stiffness`, stiffness.tokenName],
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
      return [[sassVarName, tokenNameToSassVar(valueTokenName, tokenSetName)]];
    } else {
      console.error(
        'Value token has no known properties',
        valueToken,
        token.tokenName,
      );
      return [[sassVarName]];
    }
  }

  // async writeTokenSet(
  //   { tokenSetName }: TokenSet,
  //   data: SassDeclaration,
  // ): Promise<void> {
  //   const fileURL = new URL(
  //     `src/core/tokens/_${tokenSetName.replace(/\./g, '-')}.scss`,
  //     root,
  //   );
  //
  //   await writeFile(
  //     fileURL,
  //     `${createHeader(this.#headerURL)}${Object.entries(data)
  //       .map(([declaration, value]) => `${declaration}: ${value};`)
  //       .toSorted(COLLATOR.compare)
  //       .join('\n')}`,
  //     'utf8',
  //   );
  // }
}
