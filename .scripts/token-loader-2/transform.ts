import { glob } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type JSONModule,
  type ProcessedTokenDescriptor,
  type ProcessedTokenSet,
  type TokenDescriptor,
  TokenValueType,
} from '../utils.ts';
import type TransformUnifier from './TransformUnifier';
import { tokensCacheDir } from './utils.ts';

type FontTokenValues = Readonly<{
  [K in
    | typeof TokenValueType.FONT_WEIGHT
    | typeof TokenValueType.FONT_SIZE
    | typeof TokenValueType.LINE_HEIGHT
    | typeof TokenValueType.FONT_NAMES]?: readonly [
    ProcessedTokenDescriptor<K>,
  ];
}>;

function processTokenValue(
  descriptor: TokenDescriptor | undefined,
  unifier: TransformUnifier,
): string {
  if (!descriptor) {
    return '';
  }

  if (descriptor.type === TokenValueType.COLOR) {
    const { red, green, blue, alpha } = descriptor.value;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  if (
    descriptor.type === TokenValueType.LENGTH ||
    descriptor.type === TokenValueType.LINE_HEIGHT
  ) {
    return `${descriptor.value}px`;
  }

  if (
    descriptor.type === TokenValueType.NUMERIC ||
    descriptor.type === TokenValueType.FONT_WEIGHT ||
    descriptor.type === TokenValueType.FONT_SIZE ||
    descriptor.type === TokenValueType.OPACITY ||
    descriptor.type === TokenValueType.AXIS_VALUE ||
    descriptor.type === TokenValueType.ELEVATION
  ) {
    return String(descriptor.value);
  }

  if (descriptor.type === TokenValueType.FONT_NAMES) {
    return descriptor.value.join(', ');
  }

  if (descriptor.type === TokenValueType.DURATION) {
    return `${descriptor.value}ms`;
  }

  if (descriptor.type === TokenValueType.FONT_TYPE) {
    const tokenLinks = Object.values(descriptor.value).map(
      (link) => link.value,
    );
    const {
      [TokenValueType.FONT_WEIGHT]: [fontWeightDescriptor] = [],
      [TokenValueType.FONT_SIZE]: [fontSizeDescriptor] = [],
      [TokenValueType.FONT_NAMES]: [fontNamesDescriptor] = [],
      [TokenValueType.LINE_HEIGHT]: [lineHeightDescriptor] = [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    } = Object.groupBy(
      unifier.tokens.filter(([, name]) => tokenLinks.includes(name)),
      ([, , p]) => p.type,
    ) as FontTokenValues;

    const [fontWeight, fontSize, fontNames, lineHeight] = [
      fontWeightDescriptor,
      fontSizeDescriptor,
      fontNamesDescriptor,
      lineHeightDescriptor,
    ].map((descriptor) => processTokenValue(descriptor?.[2], unifier));

    return `${fontWeight ? `#{${fontWeight}} ` : ''}${
      fontSize ? `#{${fontSize}} / ` : ''
    }${lineHeight ? `#{${lineHeight}} ` : ''}${
      fontNames ? `#{${fontNames}} ` : ''
    }`;
  }

  if (descriptor.type === TokenValueType.SHAPE) {
  }
}

async function transform(): Promise<string> {
  for await (const file of glob('**/*.json', {
    cwd: fileURLToPath(tokensCacheDir),
  })) {
    const { default: contents }: JSONModule<ProcessedTokenSet> = await import(
      fileURLToPath(new URL(file, tokensCacheDir)),
      { with: { type: 'json' } }
    );

    const sassName = `_${basename(file, '.json').replaceAll('.', '-')}.scss`;
    const sassContents = Object.entries(contents).map(
      ([, { suffix, type, value }]) => {
        const tokenKey = suffix.replaceAll('.', '-');
      },
    );
  }
}
