import type {
  Manifest,
  StoredContext,
  StoredSet,
  StoredToken,
} from '../src/store/schema.ts';
import { Store } from '../src/store/Store.ts';
import type { Conversion } from './convert.ts';

/** A store read back from its files, as the update script writes them. */
export function storeFromFiles(files: ReadonlyMap<string, string>): Store {
  const sets: StoredSet[] = [];
  let context: StoredContext = { contextTagGroups: [] };
  for (const [path, text] of files) {
    if (path === 'context.json') {
      context = JSON.parse(text) as StoredContext;
    } else if (path.startsWith('sets/')) {
      sets.push(JSON.parse(text) as StoredSet);
    }
  }
  return new Store({ context, sets });
}

/** The selected value's one value field: its one-hop reference or literal. */
function selectedValue(store: Store, token: StoredToken): string {
  const value = store.select(token)?.value;
  if (!value) {
    return '(none)';
  }
  const { contextTags: _tags, specificityScore: _score, ...field } = value;
  return JSON.stringify(field);
}

function describeRelease({ source }: Manifest): string {
  const databases = source.databases
    .map(({ versionName }) => versionName)
    .join(' and ');
  return `release ${source.release ?? 'unknown'}, database ${databases}`;
}

/** Lines naming each token by set, under a heading, or none when empty. */
function bySet(
  heading: string,
  rows: ReadonlyArray<readonly [set: string, line: string]>,
): string[] {
  const lines = [`## ${heading}: ${rows.length}`, ''];
  let current: string | undefined;
  for (const [set, line] of rows) {
    if (set !== current) {
      if (current != null) {
        lines.push('');
      }
      lines.push(`### \`${set}\``, '');
      current = set;
    }
    lines.push(line);
  }
  if (current != null) {
    lines.push('');
  }
  return lines;
}

/**
 * The differences from `before` to `after`: tokens added and removed,
 * deprecations added, and each token whose selected value, the one-hop
 * reference or literal for the default tags, changed. Each list is by token
 * set, in the store's order.
 */
export function diffStores(before: Store, after: Store): string[] {
  const added: Array<[string, string]> = [];
  const deprecated: Array<[string, string]> = [];
  const changed: Array<[string, string]> = [];
  for (const set of after.sets) {
    for (const token of set.tokens) {
      const old = before.getToken(token.tokenName);
      const name = `\`${token.tokenName}\``;
      if (!old) {
        added.push([set.tokenSetName, `- ${name}`]);
      }
      if (
        after.isTokenDeprecated(token) &&
        !(old && before.isTokenDeprecated(old))
      ) {
        const replacement = token.deprecationMessage?.replacementTokenName;
        deprecated.push([
          set.tokenSetName,
          `- ${name}${replacement == null ? '' : `, replaced by \`${replacement}\``}`,
        ]);
      }
      if (old) {
        const was = selectedValue(before, old);
        const is = selectedValue(after, token);
        if (was !== is) {
          changed.push([set.tokenSetName, `- ${name}: \`${was}\` → \`${is}\``]);
        }
      }
    }
  }

  const removed: Array<[string, string]> = [];
  for (const set of before.sets) {
    for (const token of set.tokens) {
      if (!after.getToken(token.tokenName)) {
        removed.push([set.tokenSetName, `- \`${token.tokenName}\``]);
      }
    }
  }

  return [
    ...bySet('Tokens added', added),
    ...bySet('Tokens removed', removed),
    ...bySet('Deprecations added', deprecated),
    ...bySet('Selected values changed, for expressive and web', changed),
  ];
}

/**
 * The update report as Markdown: the conversion's source and conflicts and,
 * given the store it replaces, the differences from that store.
 */
export function report(
  { manifest, conflicts, covered, files }: Conversion,
  previous?: Readonly<{ manifest: Manifest; store: Store }>,
): string {
  const lines = [
    '# Token store conversion',
    '',
    `- release: ${manifest.source.release ?? 'unknown'}`,
    ...manifest.source.databases.map(
      ({ versionName, versionId, publishTime }) =>
        `- database ${versionName} (version ${versionId}, published ${publishTime})`,
    ),
    `- sets: ${manifest.files.length - 1}`,
    `- covered copies: ${covered.copies}, of ${covered.tokens} tokens. Each is a table's copy of another table's token, kept from the copy that covers it.`,
    `- conflicts: ${conflicts.length}. A token, set, context or group conflict keeps the table read first. A value conflict is a child node stored without its value's index.`,
    '',
  ];
  if (conflicts.length > 0) {
    lines.push(
      '| Kind | Name | Kept from | Differs in |',
      '| --- | --- | --- | --- |',
    );
    for (const { kind, name, keptTable, otherTable } of conflicts) {
      lines.push(`| ${kind} | \`${name}\` | ${keptTable} | ${otherTable} |`);
    }
    lines.push('');
  }
  if (previous) {
    lines.push(
      `Against the store it replaces: ${describeRelease(previous.manifest)}.`,
      '',
      ...diffStores(previous.store, storeFromFiles(files)),
    );
  }
  return lines.join('\n');
}
