import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  TextTransform,
  type Token,
  type TokenSet,
  TokenShapeFamily,
  type TokenSystem,
  type TokenTable,
  type Value,
} from './TokenTable.js';
import {
  COLLATOR,
  type JSONModule,
  root,
  type SassDeclaration,
  tokenNameToSassVar,
} from './utils.js';

export type SassDeclarationSingle = readonly [
  name: string,
  value?: string | number,
];

const CACHE_DIR = new URL('node_modules/.cache/tokens/', root);

function createHeader(url: URL) {
  return `/*
 * Tokens for the button component, according to the Material Design
 * specification: ${url}
 *
 * !!! THIS FILE WAS AUTOMATICALLY GENERATED !!!
 * !!! DO NOT MODIFY IT BY HAND !!!
 */
@use '../defaults/refs' as refs;
@use '../defaults/sys' as sys;

`;
}

export default class TokenSystemProcessor {
  static async init(
    loadURL: URL,
    headerURL: URL,
  ): Promise<TokenSystemProcessor> {
    const cacheFile = new URL(
      loadURL.pathname.substring(loadURL.pathname.lastIndexOf('/') + 1),
      CACHE_DIR,
    );

    try {
      const contents: JSONModule<TokenTable> = await import(
        fileURLToPath(cacheFile),
        {
          with: { type: 'json' },
        }
      );
      return new TokenSystemProcessor(contents.default, headerURL);
    } catch {
      console.log(`Caching tokens from ${loadURL}`);

      const response = await fetch(loadURL);
      const data = await response.text();

      await mkdir(new URL('./', cacheFile), { recursive: true });
      await writeFile(cacheFile, data, 'utf8');

      return new TokenSystemProcessor(JSON.parse(data), headerURL);
    }
  }

  readonly system: TokenSystem;
  readonly #headerURL: URL;

  constructor(table: TokenTable, headerURL: URL) {
    this.system = table.system;
    this.#headerURL = headerURL;
  }

  processTokenSet(
    tokenSet: TokenSet,
    converter: (
      set: string,
      declaration: SassDeclarationSingle,
    ) => SassDeclarationSingle = (_, v) => v,
  ): SassDeclaration {
    return Object.fromEntries(
      this.system.tokens
        .filter((token) => token.name.startsWith(tokenSet.name))
        .map((token) =>
          this.processToken(token, this.getTokenValue(token), tokenSet),
        )
        .flat()
        .map((value) => converter(tokenSet.tokenSetName, value))
        .filter(([, value]) => value != null),
    );
  }

  getTokenValue({ name }: Token): Value | undefined {
    const tokenTree = this.system.contextualReferenceTrees[name];

    if (!tokenTree) {
      return this.system.values.find((value) => value.name.startsWith(name));
    }

    const [{ referenceTree }] = tokenTree.contextualReferenceTree;

    return this.system.values.find(
      ({ name }) => referenceTree.value.name === name,
    );
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  processToken(
    { tokenName, tokenNameSuffix }: Token,
    valueToken: Value | undefined,
    { tokenSetName }: TokenSet,
  ): readonly SassDeclarationSingle[] {
    const sassVarName = `$${tokenNameSuffix.replaceAll('.', '-')}`;

    if (!valueToken) {
      console.error(`No value found for ${tokenName}`);
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

      const font = `#{${tokenNameToSassVar(fontWeightTokenName, tokenSetName)}} #{${tokenNameToSassVar(fontSizeTokenName, tokenSetName)}}/#{${tokenNameToSassVar(lineHeightTokenName, tokenSetName)}} #{${tokenNameToSassVar(fontNameTokenName, tokenSetName)}}`;

      return [[sassVarName, font]];
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
        console.error('Unknown text transform', valueToken, tokenName);
        return [[sassVarName]];
      }

      return [[sassVarName, value]];
    } else if (valueTokenName != null) {
      return [[sassVarName, tokenNameToSassVar(valueTokenName, tokenSetName)]];
    } else {
      console.error(
        'Value token has no known properties',
        valueToken,
        tokenName,
      );
      return [[sassVarName]];
    }
  }

  async writeTokenSet(
    { tokenSetName }: TokenSet,
    data: SassDeclaration,
  ): Promise<void> {
    const fileURL = new URL(
      `src/core/tokens/_${tokenSetName.replace(/\./g, '-')}.scss`,
      root,
    );

    await writeFile(
      fileURL,
      `${createHeader(this.#headerURL)}${Object.entries(data)
        .map(([declaration, value]) => `${declaration}: ${value};`)
        .toSorted(COLLATOR.compare)
        .join('\n')}`,
      'utf8',
    );
  }
}
