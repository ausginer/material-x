/**
 * Projects `.plan/contract/00-index.md` §Decision ledger against §Decision
 * status, as TSV on stdout. Nothing is written to disk: the projection is a
 * view of the record, and a copy of it in the tree would be a second record to
 * keep true.
 *
 * ```
 * node .scripts/decision-status.ts            # decision, status, statement
 * node .scripts/decision-status.ts --retired  # decision, status, retired
 * ```
 *
 * The reading is `tests/ledger.ts`, which `tests/decisions.node.test.ts`
 * imports too — one interpretation of the ledger, asserted in one place and
 * projected here.
 *
 * **It refuses rather than guesses.** A register that does not reconcile with
 * the canonical set has no status for some decision, and a projection that
 * defaulted it would print a fact nobody recorded. A surviving table row that
 * authors more cells than its header has content the renderer discards, which
 * is F-284. Both are the test's failures, reported here as a non-zero exit
 * rather than as a blank column or a silently short answer.
 */
import {
  index,
  malformed,
  projection,
  retired,
  surplus,
  unaccounted,
} from '../tests/ledger.ts';

const line = (cells: readonly string[]): void => {
  process.stdout.write(`${cells.join('\t')}\n`);
};

const flags = process.argv.slice(2);
const unknown = flags.filter(
  (flag) => flag !== '--status' && flag !== '--retired',
);

if (unknown.length > 0) {
  process.stderr.write(`unknown flag: ${unknown.join(' ')}\n`);
  process.exit(2);
}

const lines = await index();
const faults = [...malformed(lines), ...unaccounted(lines), ...surplus(lines)];

if (faults.length > 0) {
  process.stderr.write(
    `the ledger does not project:\n${faults.map((fault) => `  ${fault}`).join('\n')}\n`,
  );
  process.exitCode = 1;
} else if (flags.includes('--retired')) {
  line(['decision', 'status', 'retired']);

  for (const row of retired(lines)) {
    line([row.decision, row.status, row.text]);
  }
} else {
  line(['decision', 'status', 'statement']);

  for (const row of projection(lines)) {
    line([row.decision, row.status, row.statement]);
  }
}
