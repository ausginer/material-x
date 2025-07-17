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

const states = [
  'hovered',
  'disabled',
  'focused',
  'pressed',
  'selected',
  'unselected',
];

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
    // Grouping by set name to make separate files (like "_md-sys-motion.scss",
    // "_md.ref.palette.scss", etc.
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
      // Grouping rules by state in separate SASS maps, e.g.,
      // `$default: ( container-color: #fff )`,
      // `$pressed: (container-color: #000)`, etc.
      .map(
        ([setName, { declarations, imports }]) =>
          [
            setName,
            {
              declarations: Object.entries(
                Object.groupBy(
                  declarations,
                  ([declaration]) =>
                    states.find((state) => declaration.startsWith(state)) ??
                    'default',
                ),
              ).map(
                ([stateName, declarations]) =>
                  [
                    stateName,
                    declarations!.map(
                      ([d, v]) => [d.replace(`${stateName}-`, ''), v] as const,
                    ),
                  ] as const,
              ),
              imports,
            },
          ] as const,
      )
      .map(async ([setName, { declarations, imports }]) => {
        const fileURL = new URL(
          `src/core/tokens/_${setName.replace(/\./g, '-')}.scss`,
          root,
        );

        const _imports = [...imports].join('\n');

        let _values;

        if (setName.startsWith('md.comp')) {
          _values = declarations
            .map(([stateName, declarations]) => {
              const _declarations = declarations
                .map(
                  ([declaration, value]) =>
                    `${declaration.padStart(declaration.length + 2)}: ${value},`,
                )
                .toSorted(COLLATOR.compare);

              return `$${stateName}: (\n${_declarations.join('\n')}\n);\n`;
            })
            .toSorted(COLLATOR.compare)
            .join('\n');
        } else {
          _values = declarations
            .flatMap(([stateName, declarations]) =>
              declarations.map(
                ([d, v]) =>
                  [
                    stateName == 'default' ? d : `${stateName}-${d}`,
                    v,
                  ] as const,
              ),
            )
            .map(
              ([declaration, value]) =>
                `$${declaration}: var(--${tokenNameToSass(setName)}-${declaration}, ${value});`,
            )
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
