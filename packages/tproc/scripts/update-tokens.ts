// oxlint-disable no-console
/**
 * Writes tproc's token store, `packages/tproc/tokens/`, which nothing else
 * writes.
 *
 *   node scripts/update-tokens.ts --release <id> [--report <file>]
 *   node scripts/update-tokens.ts --current [--report <file>]
 *   node scripts/update-tokens.ts --legacy <directory> [--report <file>]
 *
 * `--release` fetches every table that the manifest lists from one dated site
 * release, such as `2026-11-19_06-20-01`. `--current` reads that id from the
 * site first. `--legacy` converts the tables committed before the store, from
 * a directory, without fetching. The tables are converted in memory and never
 * written. `--report` writes the update report as Markdown: the conversion's
 * conflicts, and its differences from the store it replaces.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import type { Manifest, ManifestTable } from '../src/store/schema.ts';
import { loadStore } from '../src/store/Store.ts';
import {
  convert,
  SITE_BASE_URL,
  type Conversion,
  type SourceTable,
} from './convert.ts';
import { report } from './report.ts';
import { fetchText, readCurrentRelease } from './site.ts';

const STORE = new URL('../tokens/', import.meta.url);

/** The tables committed before the store, in the order `DB.load()` read them. */
const LEGACY_TABLES: ReadonlyArray<Omit<ManifestTable, 'componentName'>> = [
  { kind: 'COLOR', componentId: '20543ce18892f7d9' },
  { kind: 'ELEVATION', componentId: '20543ce18892f7d9' },
  { kind: 'TOKEN_TYPE_UNSPECIFIED', componentId: '20543ce18892f7d9' },
  { kind: 'TYPOGRAPHY', componentId: '20543ce18892f7d9' },
  { kind: 'TOKEN_TABLE', componentId: '1c4257f8804f9478' },
  { kind: 'TOKEN_TABLE', componentId: '41587918e51cca98' },
  { kind: 'TOKEN_TABLE', componentId: '60990dd98dea0998' },
  { kind: 'TOKEN_TABLE', componentId: '36500f77b86d20a5' },
  { kind: 'TOKEN_TABLE', componentId: '0fe2282006ae098b' },
  { kind: 'TOKEN_TABLE', componentId: '082d7fd6e058b011' },
  { kind: 'TOKEN_TABLE', componentId: '624e8f2da4007fc8' },
  { kind: 'TOKEN_TABLE', componentId: '31f16b44fe03b0c0' },
  { kind: 'TOKEN_TABLE', componentId: '6acb269a58d5f93f' },
  { kind: 'TOKEN_TABLE', componentId: '6c818a16475113bd' },
];

async function readManifest(): Promise<Manifest> {
  return JSON.parse(
    await readFile(new URL('manifest.json', STORE), 'utf8'),
  ) as Manifest;
}

async function fetchTables(release: string): Promise<SourceTable[]> {
  const { tables } = await readManifest();
  return await Promise.all(
    tables.map(async ({ kind, componentId }) => {
      const url = `${SITE_BASE_URL}${release}/${kind}.${componentId}.json`;
      return { kind, componentId, table: JSON.parse(await fetchText(url)) };
    }),
  );
}

async function readLegacyTables(directory: URL): Promise<SourceTable[]> {
  return await Promise.all(
    LEGACY_TABLES.map(async ({ kind, componentId }) => ({
      kind,
      componentId,
      table: JSON.parse(
        await readFile(
          new URL(`${kind}.${componentId}.json`, directory),
          'utf8',
        ),
      ),
    })),
  );
}

const { values } = parseArgs({
  options: {
    release: { type: 'string' },
    current: { type: 'boolean' },
    legacy: { type: 'string' },
    report: { type: 'string' },
  },
});

let conversion: Conversion;
if (values.legacy != null) {
  const directory = new URL(
    values.legacy.replace(/\/?$/u, '/'),
    `file://${process.cwd()}/`,
  );
  conversion = convert(await readLegacyTables(directory), {
    release: null,
    fetchDate: null,
    legacy: true,
  });
} else {
  const release = values.current ? await readCurrentRelease() : values.release;
  if (release == null) {
    throw new Error('Pass --release <id>, --current or --legacy <directory>');
  }
  conversion = convert(await fetchTables(release), {
    release,
    fetchDate: new Date().toISOString().slice(0, 10),
  });
}

// Read before the store is overwritten, so the report compares against it.
const previous =
  values.report == null
    ? undefined
    : { manifest: await readManifest(), store: await loadStore(STORE) };

// The store is written whole, so a set that no longer exists leaves no file.
await rm(new URL('sets/', STORE), { recursive: true, force: true });
await mkdir(new URL('sets/', STORE), { recursive: true });
await Promise.all(
  conversion.files
    .entries()
    .map(
      async ([path, text]) =>
        await writeFile(new URL(path, STORE), text, 'utf8'),
    ),
);

if (values.report != null) {
  await writeFile(values.report, report(conversion, previous), 'utf8');
}

console.log(
  `Wrote ${conversion.files.size} files to ${STORE.pathname}, with ${conversion.conflicts.length} conflicts`,
);
