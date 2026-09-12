#!/usr/bin/env node
/**
 * Prints one entry of a current-state record, by qualified address.
 *
 * ```
 * .scripts/entry.sh drag2:D-171
 * .scripts/entry.sh drag2:F-283
 * .scripts/entry.sh drag2:SC-7
 * .scripts/entry.sh repo:RD-1
 * ```
 *
 * **The reading is `tests/ledger.ts`**, which `tests/decisions.node.test.ts`
 * asserts against and `.scripts/decision-status.ts` projects from. One
 * interpretation of what an entry is, in one place: a reader that carried its
 * own parser would be a second definition of the record, and the two would
 * drift on the first edit that neither was written for.
 *
 * ## The address is qualified from the first release
 *
 * `<scope>:<local-id>` — never a bare identifier. The headings themselves stay
 * local (`#### D-171 — …`), because a record naming its own package in every
 * heading would be noise to the only readers who ever open it; the scope is
 * resolved here instead. Qualifying from the start is what stops the interface
 * from having to change when a second package's records become addressable:
 * `box-quad:BQ-9` is a row in {@link SCOPES}, not a new syntax.
 *
 * **A bare `D-171` is refused rather than accepted as a convenience.** A
 * convenience form is the thing every caller ends up written against, and it
 * cannot answer once two scopes exist — so it would have to break exactly when
 * it was most used.
 *
 * ## It refuses rather than guesses, in three distinguishable ways
 *
 * An unknown scope, an unknown local identifier and a duplicated local
 * identifier are different failures with different repairs: the first is an
 * address for a package this build cannot see, the second is a citation of
 * something the record never states, and the third is a defect *in* the record
 * that a first match would hide. `decision-status.ts` refuses on the same
 * principle, and for the same reason: a blank answer is indistinguishable from
 * a true one.
 *
 * The local identifier is an **opaque exact key**. Nothing here knows that `D`
 * means a decision or that `SC` means a standing condition, and nothing
 * restricts a family to one letter — `SC-7` and a future `BQ-9` are the same
 * kind of thing to this file, which is what keeps the reader from acquiring a
 * vocabulary it would then have to be taught.
 */
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { CURRENT_STATE, documents, entries, PACKAGE } from '../tests/ledger.ts';

/** Where one scope's record lives, and where inside it an entry can sit. */
type Scope = Readonly<{
  root: string;
  currentState: readonly string[];
}>;

/**
 * The scopes this build can resolve. A second package is a row here.
 *
 * `repo` is the repository's own record, whose series are `RD-`/`RF-`/`RQ-`/
 * `RI-`: the bare families belong to `drag2` alone, so a scope marker is what
 * keeps a bare identifier unique across the tree. `drag2` stays first, because
 * the unqualified-address hint offers the first row as the example.
 */
const SCOPES: ReadonlyMap<string, Scope> = new Map([
  ['drag2', { root: PACKAGE, currentState: CURRENT_STATE }],
  [
    'repo',
    { root: resolve(PACKAGE, '../..'), currentState: ['.plan/00-index.md'] },
  ],
]);

const ADDRESS = /^([a-z][a-z0-9-]*):(.+)$/u;

const fail = (message: string): never => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const [address, ...rest] = process.argv.slice(2);

if (address === undefined || rest.length > 0) {
  fail('usage: .scripts/entry.sh <scope>:<local-id>    e.g. drag2:D-171');
}

const parsed = ADDRESS.exec(address!);

if (parsed === null) {
  fail(
    `not a qualified address: ${address!}\n` +
      `an address is <scope>:<local-id>, so write ${[...SCOPES.keys()][0]!}:${address!} rather than a bare identifier`,
  );
}

const [, scope, local] = parsed!;

if (!SCOPES.has(scope!)) {
  fail(
    `unknown scope: ${scope!}\n` +
      `this build resolves ${[...SCOPES.keys()].join(', ')}`,
  );
}

const { root, currentState } = SCOPES.get(scope!)!;
const paths = await documents(root, currentState);
const sources = await Promise.all(
  paths.map(async (path) => await readFile(path, 'utf8')),
);

const found = paths.flatMap((path, at) =>
  entries(sources[at]!.split('\n'))
    // exact, never a prefix: `D-16` is not `D-163`
    .filter((entry) => entry.id === local)
    .map((entry) => ({
      path,
      text: `${
        entry.title === undefined
          ? `#### ${entry.id}`
          : `#### ${entry.id} — ${entry.title}`
      }\n\n${entry.body}`,
    })),
);

if (found.length === 0) {
  fail(`unknown local id in ${scope!}: ${local!}`);
}

if (found.length > 1) {
  fail(
    `duplicated local id in ${scope!}: ${local!}\n${found
      .map(({ path }) => `  ${relative(root, path)}`)
      .join(
        '\n',
      )}\nthe record defines it more than once, which is a defect in the record rather than in this address`,
  );
}

process.stdout.write(`${found[0]!.text}\n`);
