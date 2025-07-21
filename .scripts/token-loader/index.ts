import { writeFile } from 'node:fs/promises';
import { downloadColorTokens } from './base/colors.ts';
import { downloadElevationTokens } from './base/elevation.ts';
import { downloadMotionTokens } from './base/motion.ts';
import { downloadTypographyTokens } from './base/typography.ts';
import { downloadButtonTokens } from './components/buttons.ts';
import { downloadFABTokens } from './components/fab.ts';
import { downloadTextFieldTokens } from './components/text-fields.ts';
import TokenSetManager from './TokenSetManager.ts';
import TokenSystemProcessor from './TokenSystemProcessor.ts';
import { COLLATOR, HEADER, root, states, tokenNameToSass } from './utils.ts';

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
    downloadFABTokens(),
  ]);

  const processor = new TokenSystemProcessor(tables, theme, [
    'expressive',
    'web',
  ]);

  const processedTokens = processor.tokens
    .map((token) => [token, processor.findTokenSet(token)] as const)
    .filter(([, { displayName }]) => !displayName?.startsWith('[Deprecated]'))
    .map(([token, { tokenSetName }]) => {
      const setManager = new TokenSetManager(tokenSetName);
      return [processor.processToken(token, setManager), setManager] as const;
    });

  await Promise.all(
    // Grouping by set name to make separate files (like "_md-sys-motion.scss",
    // "_md.ref.palette.scss", etc.)
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

        const _imports = [...imports].join('\n');

        const _declarations = declarations.filter(
          (d): d is readonly [string, string | number] => d[1] != null,
        );

        let _values;

        if (setName.startsWith('md.comp')) {
          _values = _declarations
            .map(
              ([declaration, value]) =>
                `${declaration.padStart(declaration.length + 2)}: ${value},`,
            )
            .toSorted(COLLATOR.compare)
            .join('\n');

          _values = `$values: (\n${_values}\n);`;
        } else {
          _values = _declarations
            .map(([k, v]) => [k, String(v)] as const)
            .map(([declaration, value]) => {
              const declarationValue = setName.startsWith('md.sys.color')
                ? `var(--${tokenNameToSass(setName)}-${declaration}, ${value})`
                : value;

              return `$${declaration}: ${declarationValue};`;
            })
            .toSorted(COLLATOR.compare)
            .join('\n');
        }

        await writeFile(fileURL, `${HEADER}${_imports}\n\n${_values}`, 'utf8');
      }),
  );
} catch (e) {
  console.error(e);
  process.exit(1);
}
