import { writeFile } from 'node:fs/promises';
import { downloadColorTokens } from './base/colors.js';
import { downloadElevationTokens } from './base/elevation.js';
import { downloadMotionTokens } from './base/motion.js';
import { downloadTypographyTokens } from './base/typography.js';
import { downloadButtonTokens } from './components/buttons.js';
import { downloadTextFieldTokens } from './components/text-fields.js';
import TokenSystemProcessor from './TokenSystemProcessor.js';
import { COLLATOR, HEADER, root } from './utils.js';

try {
  const tables = await Promise.all([
    downloadColorTokens(),
    downloadElevationTokens(),
    downloadMotionTokens(),
    downloadTypographyTokens(),
    downloadButtonTokens(),
    downloadTextFieldTokens(),
  ]);

  const processor = new TokenSystemProcessor(tables);

  const processedTokens = processor.tokens
    .map((token) => [token, processor.findTokenSet(token)] as const)
    .filter(([, { displayName }]) => !displayName?.startsWith('[Deprecated]'))
    .map(
      ([token, { tokenSetName }]) =>
        [processor.processToken(token, tokenSetName), tokenSetName] as const,
    );

  await Promise.all(
    Object.entries(
      Object.groupBy(processedTokens, ([, tokenSetName]) => tokenSetName),
    )
      .map(
        ([setName, group]) =>
          [setName, group!.flatMap(([declarations]) => declarations)] as const,
      )
      .map(async ([setName, declarations]) => {
        const fileURL = new URL(
          `src/core/tokens/_${setName.replace(/\./g, '-')}.scss`,
          root,
        );

        await writeFile(
          fileURL,
          `${HEADER}${declarations
            .map(([declaration, value]) => `${declaration}: ${value};`)
            .toSorted(COLLATOR.compare)
            .join('\n')}`,
          'utf8',
        );
      }),
  );
} catch (e) {
  console.error(e);
  process.exit(1);
}
