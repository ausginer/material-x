#!/usr/bin/env node
/**
 * Prints one entry of a current-state record, by qualified address.
 *
 * ```
 * .scripts/entry.sh drag:DRD-13
 * .scripts/entry.sh repo:RD-1
 * .scripts/entry.sh drag2:D-171
 * ```
 *
 * **The address is `<scope>:<local-id>`, and a bare identifier is refused.** A
 * convenience form is what every caller ends up written against, and it cannot
 * answer once a second scope exists. The local identifier is an opaque exact key:
 * nothing here knows what a family means, so `SC-7` and a future `BQ-9` are the
 * same kind of thing.
 *
 * **It refuses in three distinguishable ways**, because the repairs differ: an
 * unknown scope is an address for a package this build cannot see, an unknown
 * local identifier is a citation of something the record never states, and a
 * duplicated one is a defect in the record that a first match would hide.
 *
 * **`--duplicates [<commit>]` reads every register whole** and fails when one
 * scope's documents claim a local identifier more than once, naming each place.
 * It uses the lookup's own heading pattern, so the two can't disagree about what
 * a heading claims. It reads the working tree, or `<commit>` when one is given.
 * It leaves the retired scopes out: their commit can't change, so no merge can
 * add a duplicate to them, and a clone without that commit would fail for a
 * reason unrelated to the change under test.
 *
 * **A retired scope is read at the commit its row names, never from the working
 * tree.** Its record no longer changes, so that commit holds all of it. A clone
 * that does not hold the commit gets a fourth error, which names the commit,
 * because its repair is fetching history and not correcting the address.
 */
import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

/**
 * Where one scope's record lives, relative to the repository, and the
 * current-state documents or directories of Markdown inside it. A retired scope
 * names the commit it is read at.
 */
type Scope = Readonly<{
  root: string;
  currentState: readonly string[];
  commit?: string;
}>;

/**
 * The scopes this build resolves. A new package is a row here. The first row is
 * the example the unqualified-address hint offers.
 */
const SCOPES: ReadonlyMap<string, Scope> = new Map([
  [
    'drag',
    {
      root: 'packages/drag',
      currentState: [
        '.plan/00-index.md',
        '.plan/contract.md',
        '.plan/decisions',
      ],
    },
  ],
  [
    'repo',
    { root: '.', currentState: ['.plan/00-index.md', '.plan/decisions'] },
  ],
  [
    'drag2',
    {
      root: 'packages/drag2',
      currentState: ['.plan/contract', '.plan/obligations.md'],
      commit: '0870abd75',
    },
  ],
]);

const REPOSITORY = resolve(import.meta.dirname, '..');

const ADDRESS = /^([a-z][a-z0-9-]*):(.+)$/u;

/**
 * An entry heading: the identifier alone, or the identifier, an em dash and a
 * title. The identifier is matched whole, so `DRD-1` does not answer for `DRD-13`.
 */
const ENTRY = /^#### ([A-Za-z][A-Za-z0-9]*-\d+)(?: — (.+))?$/u;

/** A heading that closes an entry: four hashes or fewer, so `#####` stays inside. */
const CLOSES = /^#{1,4} /u;

/** Runs `git` in the repository and resolves with its standard output. */
const git = async (args: readonly string[]): Promise<string> =>
  await new Promise((done, reject) => {
    execFile(
      'git',
      [...args],
      { cwd: REPOSITORY, maxBuffer: 64 * 1024 * 1024 },
      (error: Error | null, stdout: string) => {
        if (error) {
          reject(error);
        } else {
          done(stdout);
        }
      },
    );
  });

const fail = (message: string): never => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

type Document = Readonly<{ path: string; source: string }>;

/**
 * The scope's current-state documents from the working tree, in path order. A
 * path that doesn't exist holds no documents, as `ls-tree` lists nothing for it
 * at a commit.
 */
async function workingTree({
  root,
  currentState,
}: Scope): Promise<readonly Document[]> {
  const paths = await Promise.all(
    currentState.map(async (entry) => {
      const path = join(REPOSITORY, root, entry);
      let directory: boolean;

      try {
        directory = (await stat(path)).isDirectory();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return [];
        }

        throw error;
      }

      if (!directory) {
        return [path];
      }

      return (await readdir(path))
        .filter((name) => name.endsWith('.md'))
        .sort()
        .map((name) => join(path, name));
    }),
  );

  return await Promise.all(
    paths.flat().map(async (path) => ({
      path: relative(join(REPOSITORY, root), path),
      source: await readFile(path, 'utf8'),
    })),
  );
}

/** The scope's current-state documents as they are at `commit`, in path order. */
async function atCommit(
  { root, currentState }: Scope,
  commit: string,
): Promise<readonly Document[]> {
  const listing = await git([
    'ls-tree',
    '-r',
    '--name-only',
    commit,
    '--',
    ...currentState.map((entry) => `${root}/${entry}`),
  ]);
  const paths = listing
    .split('\n')
    .filter((path) => path.endsWith('.md'))
    .sort();

  return await Promise.all(
    paths.map(async (path) => ({
      path: relative(root, path),
      source: await git(['show', `${commit}:${path}`]),
    })),
  );
}

/** Whether this clone holds `commit` as a commit object. */
async function holds(commit: string): Promise<boolean> {
  try {
    await git(['cat-file', '-e', `${commit}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

type Heading = Readonly<{ local: string; title?: string; at: number }>;

/** Every entry heading in `lines`, with its 0-based line index. */
function headings(lines: readonly string[]): Heading[] {
  return lines.flatMap((line, at) => {
    const match = ENTRY.exec(line);

    return match ? [{ local: match[1]!, title: match[2], at }] : [];
  });
}

/** Every entry in `source` whose identifier is exactly `local`, as printed text. */
function matching(source: string, local: string): string[] {
  const lines = source.split('\n');

  return headings(lines)
    .filter((heading) => heading.local === local)
    .map(({ title, at }) => {
      const rest = lines.slice(at + 1);
      const stop = rest.findIndex((next) => CLOSES.test(next));
      const body = (stop < 0 ? rest : rest.slice(0, stop)).join('\n').trim();
      const heading =
        title === undefined ? `#### ${local}` : `#### ${local} — ${title}`;

      return `${heading}\n\n${body}`;
    });
}

/**
 * Fails when a current scope's documents claim one local identifier more than
 * once, and prints each such address with every `<path>:<line>` that claims it.
 */
async function checkDuplicates(commit: string | undefined): Promise<void> {
  if (commit !== undefined && !(await holds(commit))) {
    fail(`cannot read ${commit}: this clone does not hold it as a commit`);
  }

  const current = [...SCOPES].filter(([, scope]) => scope.commit === undefined);
  const reports = await Promise.all(
    current.map(async ([name, scope]) => {
      const documents =
        commit === undefined
          ? await workingTree(scope)
          : await atCommit(scope, commit);
      const claims = new Map<string, string[]>();

      for (const { path, source } of documents) {
        for (const { local, at } of headings(source.split('\n'))) {
          const places = claims.get(local) ?? [];
          places.push(`${path}:${at + 1}`);
          claims.set(local, places);
        }
      }

      return [...claims]
        .filter(([, places]) => places.length > 1)
        .map(
          ([local, places]) =>
            `${name}:${local}\n${places.map((place) => `  ${place}`).join('\n')}`,
        );
    }),
  );
  const duplicates = reports.flat();

  if (duplicates.length > 0) {
    fail(
      `duplicated addresses: each is claimed by more than one entry heading\n${duplicates.join('\n')}`,
    );
  }

  process.stdout.write(
    `no duplicated address in ${current.map(([name]) => name).join(', ')}\n`,
  );
}

const [address, ...rest] = process.argv.slice(2);
const example = [...SCOPES.keys()][0]!;

if (address === '--duplicates' && rest.length <= 1) {
  await checkDuplicates(rest[0]);
  process.exit(0);
}

if (address === undefined || rest.length > 0) {
  fail(
    `usage: .scripts/entry.sh <scope>:<local-id>    e.g. ${example}:DRD-13\n` +
      `       .scripts/entry.sh --duplicates [<commit>]`,
  );
}

const parsed = ADDRESS.exec(address!);

if (parsed === null) {
  fail(
    `not a qualified address: ${address!}\n` +
      `an address is <scope>:<local-id>, so write ${example}:${address!} rather than a bare identifier`,
  );
}

const [, scope, local] = parsed!;
const resolved = SCOPES.get(scope!);

if (resolved === undefined) {
  fail(
    `unknown scope: ${scope!}\n` +
      `this build resolves ${[...SCOPES.keys()].join(', ')}`,
  );
}

const { commit } = resolved!;

if (commit !== undefined && !(await holds(commit))) {
  fail(
    `${scope!} is retired and read at ${commit}, which this clone does not hold\n` +
      `fetch the history that contains ${commit}`,
  );
}

const documents =
  commit === undefined
    ? await workingTree(resolved!)
    : await atCommit(resolved!, commit);
const found = documents.flatMap(({ path, source }) =>
  matching(source, local!).map((text) => ({ path, text })),
);

if (found.length === 0) {
  fail(`unknown local id in ${scope!}: ${local!}`);
}

if (found.length > 1) {
  fail(
    `duplicated local id in ${scope!}: ${local!}\n${found
      .map(({ path }) => `  ${path}`)
      .join(
        '\n',
      )}\nthe record defines it more than once, which is a defect in the record rather than in this address`,
  );
}

process.stdout.write(`${found[0]!.text}\n`);
