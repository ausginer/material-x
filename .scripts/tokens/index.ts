import { mkdir, writeFile } from 'node:fs/promises';
import { tokensCacheDir, tokensDir } from '../utils.ts';
import DB from './DB.ts';
import DependencyManager from './DependencyManager.ts';
import download from './download.ts';
import { buildDefaultThemeSass, loadTheme } from './materialTheme.ts';
import processSingle from './processSingle.ts';
import { COLLATOR, getSetName, HEADER, sassName } from './utils.ts';

const overridableSets = ['md.ref.typeface'];

function makeOverridableIfFits(key: string, value: string, setName: string) {
  if (overridableSets.includes(setName)) {
    return `var(--${key}, ${value})`;
  }
  return value;
}

await Promise.all([
  mkdir(tokensDir, { recursive: true }),
  mkdir(tokensCacheDir, { recursive: true }),
]);

const [theme, ...systems] = await Promise.all([
  loadTheme(),
  ...[
    'https://m3.material.io/_dsm/data/dsdb-m3/latest/COLOR.20543ce18892f7d9.json',
    'https://m3.material.io/_dsm/data/dsdb-m3/latest/ELEVATION.20543ce18892f7d9.json',
    'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TYPE_UNSPECIFIED.20543ce18892f7d9.json',
    'https://m3.material.io/_dsm/data/dsdb-m3/latest/TYPOGRAPHY.20543ce18892f7d9.json',
    // Buttons
    'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.1c4257f8804f9478.json',
    // FAB
    'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.41587918e51cca98.json',
    // Text Fields
    'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.60990dd98dea0998.json',
  ].map(async (url) => (await download(new URL(url))).system),
]);

const db = new DB(systems, ['expressive', 'web']);

const setNames = new Set(db.tokens.map((token) => getSetName(token)));

await Promise.all([
  buildDefaultThemeSass(theme),
  ...setNames
    .values()
    .filter((setName) => setName !== 'md.sys.color')
    .map((setName) => {
      const manager = new DependencyManager(setName);

      const variables = db.tokens
        .filter((token) => !db.isTokenDeprecated(token))
        .filter((token) => getSetName(token) === setName)
        .map((token) => {
          const processed = processSingle(token, setName, manager, db);
          return processed ? ([token.tokenName, processed] as const) : null;
        })
        .filter((result) => result != null)
        .toArray()
        .sort(([nameA, processedA], [nameB, processedB]) =>
          processedA.order !== processedB.order
            ? processedA.order - processedB.order
            : COLLATOR.compare(nameA, nameB),
        );

      return [setName, manager, variables] as const;
    })
    .filter(([, , variables]) => variables.length > 0)
    .map(async ([setName, manager, variables]) => {
      const imports = Array.from(manager.statements).join('\n');

      const declarations = variables
        .map(
          ([name, { value }]) =>
            `$${sassName(name.substring(setName.length + 1))}: ${
              typeof value === 'string'
                ? makeOverridableIfFits(sassName(name), value, setName)
                : `(\n${Object.entries(value)
                    .map(([key, value]) =>
                      value == null ? null : ([key, value] as const),
                    )
                    .filter((entry) => entry != null)
                    .map(([key, value]) => `  '${sassName(key)}': ${value},`)
                    .join('\n')}\n)`
            };`,
        )
        .join('\n');

      const map = `$map: (\n${variables
        .map(([name]) => sassName(name.substring(setName.length + 1)))
        .map((name) => `  '${name}': $${name},`)
        .join('\n')}\n)`;

      const contents = `${HEADER}\n${imports}\n\n${declarations}\n\n${map}\n`;

      await writeFile(
        new URL(`_${sassName(setName)}.scss`, tokensDir),
        contents,
        'utf8',
      );
    }),
]);
