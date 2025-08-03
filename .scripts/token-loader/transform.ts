import { glob, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {
  JSONModule,
  ProcessedTokenDescriptor,
  ProcessedTokenSetDescriptor,
  TokenValueType,
} from '../utils.ts';
import DependencyManager from './DependencyManager.ts';
import { transformSingle } from './transformSingle.ts';
import TransformUnifier from './TransformUnifier.ts';
import {
  COLLATOR,
  HEADER,
  map,
  sassName,
  tokensCacheDir,
  tokensMainDir,
} from './utils.ts';

export type FontTokenValues = Readonly<{
  [K in
    | typeof TokenValueType.FONT_WEIGHT
    | typeof TokenValueType.FONT_SIZE
    | typeof TokenValueType.LINE_HEIGHT
    | typeof TokenValueType.FONT_NAMES]?: readonly [
    ProcessedTokenDescriptor<K>,
  ];
}>;

async function transform(): Promise<void> {
  const unifier = await TransformUnifier.create(
    map(
      glob('**/*.json', {
        cwd: fileURLToPath(tokensCacheDir),
      }),
      async (file) => {
        const {
          default: setDescriptor,
        }: JSONModule<ProcessedTokenSetDescriptor> = await import(
          fileURLToPath(new URL(file, tokensCacheDir)),
          { with: { type: 'json' } }
        );

        return setDescriptor;
      },
    ),
  );

  await Promise.all(
    Array.from(unifier.sets, async ([setName, tokens]) => {
      const fileName = `_${setName.replaceAll('.', '-')}.scss`;
      const dependencyManager = new DependencyManager(setName);

      const sassContents = Object.values(tokens)
        .map(
          (descriptor) =>
            [
              sassName(descriptor.suffix),
              transformSingle(descriptor, unifier, dependencyManager),
            ] as const,
        )
        .toSorted(([nameA, { order: orderA }], [nameB, { order: orderB }]) => {
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return COLLATOR.compare(nameA, nameB);
        });

      const imports = Array.from(dependencyManager.statements).join('\n');

      const variables = sassContents
        .map(([name, { value }]) => `$${name}: ${value};`)
        .join('\n');

      const map = `$values: (\n${sassContents
        .map(([name]) => `  ${name}: $${name},`)
        .join('\n')}\n);\n`;

      await writeFile(
        new URL(fileName, tokensMainDir),
        `${HEADER}\n${imports}\n\n${variables}\n\n${map}`,
        'utf8',
      );
    }),
  );
}

await rm(tokensMainDir, { recursive: true, force: true });
await mkdir(tokensMainDir, { recursive: true });
await transform();
