import { writeFile } from 'node:fs/promises';
import { downloadColorTokens } from './base/colors.ts';
import { downloadElevationTokens } from './base/elevation.ts';
import { downloadMotionTokens } from './base/motion.ts';
import { downloadTypographyTokens } from './base/typography.ts';
import { downloadButtonTokens } from './components/buttons.ts';
import { downloadTextFieldTokens } from './components/text-fields.ts';
import TokenSetManager from './TokenSetManager.ts';
import TokenSystemProcessor from './TokenSystemProcessor.ts';
import { COLLATOR, HEADER, root, tokenNameToSass } from './utils.ts';

const DEFAULT_THEME_URL = new URL('./base/default-theme.json', import.meta.url);

try {
  const [{ default: theme }, ...tables] = await Promise.all([
    import(String(DEFAULT_THEME_URL), { with: { type: 'json' } }),
    downloadColorTokens(),
    downloadElevationTokens(),
    downloadMotionTokens(),
    downloadTypographyTokens(),
    downloadButtonTokens(),
    downloadTextFieldTokens(),
  ]);

  const processor = new TokenSystemProcessor(tables, theme);

  const processedTokens = processor.tokens
    .map((token) => [token, processor.findTokenSet(token)] as const)
    .filter(([, { displayName }]) => !displayName?.startsWith('[Deprecated]'))
    .map(([token, { tokenSetName }]) => {
      const setManager = new TokenSetManager(tokenSetName);
      return [processor.processToken(token, setManager), setManager] as const;
    });

  await Promise.all(
    Object.entries(Object.groupBy(processedTokens, ([, { name }]) => name))
      .map(
        ([setName, group]) =>
          [
            setName,
            {
              declarations: group!.flatMap(([declarations]) => declarations),
              imports: new Set(
                group!.flatMap(([, { dependencies }]) => dependencies),
              ),
            },
          ] as const,
      )
      .map(async ([setName, { declarations, imports }]) => {
        const fileURL = new URL(
          `src/core/tokens/_${setName.replace(/\./g, '-')}.scss`,
          root,
        );

        await writeFile(
          fileURL,
          `${HEADER}${[...imports].join('\n')}
${declarations
  .map(
    ([declaration, value]) =>
      `${declaration}: ${
        setName.startsWith('md.sys') &&
        !(typeof value === 'string' && value.startsWith('('))
          ? `var(--${tokenNameToSass(setName)}-${declaration.substring(1)}, ${value})`
          : value
      };`,
  )
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
