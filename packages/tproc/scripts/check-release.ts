// oxlint-disable no-console
/**
 * Compares the database of the release m3.material.io shows now with the
 * databases the committed store's manifest records.
 *
 *   node scripts/check-release.ts
 *
 * It prints both, and with `GITHUB_OUTPUT` set it writes `changed`, `release`,
 * `database` and `stored` there. A different database is not a failure: the
 * weekly workflow reads `changed` and opens or updates its issue.
 */
import { appendFile, readFile } from 'node:fs/promises';
import type { Manifest } from '../src/store/schema.ts';
import { SITE_BASE_URL } from './convert.ts';
import { readCurrentRelease, readDatabase } from './site.ts';

const manifest = JSON.parse(
  await readFile(new URL('../tokens/manifest.json', import.meta.url), 'utf8'),
) as Manifest;

const release = await readCurrentRelease();
// Every table of a release reports the same database, which the update
// script checks, so the first one the manifest lists answers.
const [{ kind, componentId }] = manifest.tables as [Manifest['tables'][0]];
const database = await readDatabase(
  `${SITE_BASE_URL}${release}/${kind}.${componentId}.json`,
);

const changed = !manifest.source.databases.some(
  ({ versionName, versionId }) =>
    versionName === database.versionName && versionId === database.versionId,
);

const describe = ({
  versionName,
  versionId,
}: Manifest['source']['databases'][0]): string =>
  `${versionName} (version ${versionId})`;
const stored = `release ${manifest.source.release ?? 'unknown'}, database ${manifest.source.databases.map(describe).join(' and ')}`;
const current = `${describe(database)}, published ${database.publishTime}`;

console.log(`site: release ${release}, database ${current}`);
console.log(`store: ${stored}`);
console.log(
  changed
    ? 'The database differs from the store.'
    : 'The store has this database.',
);

if (process.env['GITHUB_OUTPUT']) {
  await appendFile(
    process.env['GITHUB_OUTPUT'],
    [
      `changed=${changed}`,
      `release=${release}`,
      `database=${current}`,
      `stored=${stored}`,
      '',
    ].join('\n'),
    'utf8',
  );
}
