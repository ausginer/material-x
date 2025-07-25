import { mkdir, writeFile } from 'node:fs/promises';
import type { ProcessedToken } from '../utils.ts';
import download from './download.ts';
import process from './process.ts';
import type SystemToken from './SystemToken.ts';
import SystemUnifier from './SystemUnifier.ts';
import { COLLATOR, tokensCacheDir } from './utils.ts';

type ProcessResult = readonly [token: SystemToken, processed: ProcessedToken];
type GroupResult = [name: string, tokens: ProcessResult[]];

async function parse(): Promise<void> {
  const systems = await Promise.all(
    [
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
  );

  const unifier = new SystemUnifier(systems, ['expressive', 'web']);

  const processedTokens = unifier.tokens
    .filter(({ deprecated }) => !deprecated)
    .map((token) => [token, process(token, unifier)] as const)
    .filter((result): result is ProcessResult => result[1] != null)
    .toArray();

  const grouped = Object.groupBy(
    processedTokens,
    ([token]) => token.set.valueOf().tokenSetName,
  );

  await Promise.all([
    ...Object.entries(grouped)
      .filter((group): group is GroupResult => group[1] != null)
      .map(([name, tokens]) => {
        let result = {};

        for (const [, processed] of tokens) {
          Object.assign(result, processed);
        }

        result = Object.fromEntries(
          Object.entries(result).sort(([a], [b]) => COLLATOR.compare(a, b)),
        );

        return [name, result] as const;
      })
      .map(async ([name, result]) => {
        const url = new URL(
          `${name.replaceAll('.', '-')}.json`,
          tokensCacheDir,
        );

        await writeFile(url, JSON.stringify(result, null, 2));
      }),
  ]);
}

await mkdir(tokensCacheDir, { recursive: true });
await parse();
