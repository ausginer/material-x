/**
 * One interpretation of `.plan/contract/00-index.md`.
 *
 * The ledger is read by more than one instrument — `decisions.node.test.ts`
 * asserts things about it, `.scripts/decision-status.ts` projects it — and two
 * readers of one document are two definitions of that document unless the
 * reading itself is shared. Everything that decides *what a row is* lives here;
 * what a caller does with a row is the caller's.
 *
 * ## What a canonical occurrence is
 *
 * A `D-n` opens more rows than there are decisions, because the record also
 * tabulates decisions it is talking **about** — a precedence table above the
 * ledger, and the deferred-work table below it. So a decision's **canonical**
 * occurrence is its row inside `## Decision ledger` and that heading's
 * subsections, **excluding** `### Decisions not yet implemented`; every other
 * `D-n` is a reference. The canonical set is the vocabulary: a reference to an
 * id with no canonical row names nothing.
 *
 * ## Statements are flattened, not stripped
 *
 * A row's cells are asked of the parser rather than split on `|`, for the
 * reason `width` states, and each cell's inline markup is flattened by parsing
 * it — so an escaped pipe, a pipe inside a code span and a nested emphasis are
 * resolved by markdown-it and not by a regular expression here.
 *
 * **Strikethrough is content, not formatting.** A struck span in this record is
 * a clause that has been withdrawn, and it is the one span whose text must not
 * reach the statement: a projection that kept it would report the retracted
 * half of a decision as what the decision says. So flattening splits rather
 * than strips — the surviving text is the statement, and the struck spans are
 * kept beside it in document order.
 */
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import MarkdownIt from 'markdown-it';

export const PACKAGE: string = resolve(import.meta.dirname, '..');
export const INDEX: string = join(PACKAGE, '.plan/contract/00-index.md');

/** The heading whose subsections hold every canonical decision row. */
export const LEDGER = '## Decision ledger';

/** The heading whose table accounts for every marked decision. */
export const SECTION = '### Decisions not yet implemented';

/** The heading whose table gives every canonical decision a status. */
export const STATUS_SECTION = '## Decision status';

/**
 * **The closed destination vocabulary** (F-70), read by both halves. Kept as
 * one pattern rather than one per half, because the failure this replaced was
 * exactly the two halves agreeing on a form neither could parse.
 */
const DESTINATION = /^(?:Phase \d+|Before Phase \d+|Remediation)$/u;

/** The marker a decision row carries while its subject is not in the code. */
const MARKER = /^\| (D-\d+) \| \*\*Unimplemented \(([^)]*)\)\.\*\*/u;

/**
 * Anything claiming unimplementedness in a decision row, however spelled. A
 * line that is this and not `MARKER` is malformed, not absent.
 */
const MARKER_SHAPED = /^\| D-\d+ \|[^|]*\bUnimplemented\b/u;

/** A row of §Decisions not yet implemented. */
const LISTED =
  /^\| (D-\d+) \| ([^|]+?) \| [^|]+ \| (absent|present): `([^`]+)`(?: :: `([^`]+)`)? \|/u;

/** Anything shaped like one of that table's rows. */
const ROW_SHAPED = /^\| D-\d+ \|/u;

/** The id a decision row opens with. */
const OPENS = /^\| (D-\d+) \|/u;

/** Strikethrough delimiters, which never survive a span the parser consumed. */
const MARKUP = '~~';

/** A decision named anywhere at all, which is what makes it a reference. */
const DECISION = /D-\d+/gu;

/**
 * A row of §Decision status. The vocabulary is closed here rather than
 * downstream: a third value is an unparseable row, and an unparseable row is a
 * failure by the same rule that governs every other table in this record.
 */
const REGISTERED = /^\| (D-\d+) \| (active|inactive) \|\s*$/u;

/** Anything shaped like one of that table's rows. */
const STATUS_SHAPED = /^\| D-\d+ \|/u;

/**
 * A bold span, paired left to right. Bold is the discriminator because it is
 * already this record's typography for a live clause, while an italic or
 * backticked mention is how it quotes the term.
 */
const BOLD = /\*\*((?:[^*]|\*(?!\*))+?)\*\*/gu;

/**
 * The four condition lead-ins the record actually uses (D-116 (d)). Three name
 * the clause and are matched whole; the fourth is a sentence about what would
 * reopen a decision, and is matched on the two words that make it one. **The
 * vocabulary is still open** — a fifth spelling escapes this, which is why the
 * register entry is the load-bearing artifact and this is a backstop.
 */
const LEAD_IN =
  /^(?:Overturned by|Re-base conditions?|Revisit conditions?)$|\breopening conditions?\b/iu;

/** A reference to a standing condition, wherever it is written. */
const REFERENCE = /SC-\d+/gu;

export type Deferred = Readonly<{
  decision: string;
  destination: string;
  form: string;
  path: string;
  text: string | undefined;
}>;

export type Status = 'active' | 'inactive';

/** A canonical decision row, read as content rather than as markup. */
export type Decision = Readonly<{
  id: string;
  statement: string;
  struck: readonly string[];
}>;

/** A row of the status register. */
export type Entry = Readonly<{ decision: string; status: Status }>;

export async function index(): Promise<readonly string[]> {
  return (await readFile(INDEX, 'utf8')).split('\n');
}

/**
 * The half-open line range a heading owns, ending at the first line `ends`
 * accepts. An absent heading owns nothing, which is a state the callers report
 * rather than a reason to throw here.
 */
function span(
  lines: readonly string[],
  heading: string,
  ends: (line: string) => boolean,
): readonly [number, number] {
  const at = lines.indexOf(heading);

  if (at < 0) {
    return [0, 0];
  }

  const rest = lines.slice(at + 1);
  const stop = rest.findIndex(ends);

  return [at + 1, stop < 0 ? lines.length : at + 1 + stop];
}

const heading = (line: string): boolean => line.startsWith('#');

/** A heading that closes `## Decision ledger` rather than nesting under it. */
const outranks = (line: string): boolean => /^#{1,2} /u.test(line);

/**
 * The lines of §Decisions not yet implemented. Scoped, because "a row that
 * does not parse is a failure" is only a safe rule where every row is supposed
 * to be one of these — the decision tables above carry rows of another shape.
 */
export function section(lines: readonly string[]): readonly string[] {
  return lines.slice(...span(lines, SECTION, heading));
}

/** The lines of §Decision status, scoped for the same reason. */
export function statusSection(lines: readonly string[]): readonly string[] {
  return lines.slice(...span(lines, STATUS_SECTION, heading));
}

/**
 * The lines that can hold a canonical decision row: the ledger and its
 * subsections, less the deferred table nested inside it. The subtraction is by
 * position rather than by content, so a row repeated verbatim elsewhere in the
 * ledger is not removed along with it.
 */
export function ledger(lines: readonly string[]): readonly string[] {
  const [open, close] = span(lines, LEDGER, outranks);
  const [from, to] = span(lines, SECTION, heading);

  return lines
    .slice(open, close)
    .filter((_, offset) => open + offset < from || open + offset >= to);
}

/** Decisions whose own row says they are not implemented yet. */
export function marked(lines: readonly string[]): readonly string[] {
  return lines.flatMap((line) => {
    const match = MARKER.exec(line);

    return match === null ? [] : [`${match[1]!} (${match[2]!})`];
  });
}

/** The rows of the table that is supposed to account for them. */
export function listed(lines: readonly string[]): readonly Deferred[] {
  return section(lines).flatMap((line) => {
    const match = LISTED.exec(line);

    return match === null
      ? []
      : [
          {
            decision: match[1]!,
            destination: match[2]!,
            form: match[3]!,
            path: match[4]!,
            text: match[5],
          },
        ];
  });
}

/**
 * Everything the two readers above would drop on the floor: a marker or a row
 * that does not parse, and a destination outside the closed vocabulary. Each is
 * reported as one line rather than as a boolean, so the failure names the text
 * that has to change.
 */
export function unrecognized(lines: readonly string[]): readonly string[] {
  const bad: string[] = [];

  for (const line of lines) {
    const match = MARKER.exec(line);

    if (match === null) {
      if (MARKER_SHAPED.test(line)) {
        bad.push(`unparseable marker: ${line.slice(0, 60)}`);
      }

      continue;
    }

    if (!DESTINATION.test(match[2]!)) {
      bad.push(`marker destination: ${match[1]!} → "${match[2]!}"`);
    }
  }

  for (const line of section(lines)) {
    const match = LISTED.exec(line);

    if (match === null) {
      if (ROW_SHAPED.test(line)) {
        bad.push(`unparseable row: ${line.slice(0, 60)}`);
      }

      continue;
    }

    if (!DESTINATION.test(match[2]!)) {
      bad.push(`row destination: ${match[1]!} → "${match[2]!}"`);
    }
  }

  return bad;
}

/**
 * Every decision row whose bold condition lead-in names no `SC-n`. The clause
 * runs from its lead-in to the next one or to the end of the row, so a row
 * carrying two conditions is answered twice.
 */
export function embedded(lines: readonly string[]): readonly string[] {
  const bad: string[] = [];

  for (const line of lines.filter((row) => ROW_SHAPED.test(row))) {
    const at = [...line.matchAll(BOLD)].filter((bold) =>
      LEAD_IN.test(bold[1]!.trim()),
    );

    for (const [ordinal, lead] of at.entries()) {
      const end = at[ordinal + 1]?.index ?? line.length;
      const clause = line.slice(lead.index, end);

      if (!REFERENCE.test(clause)) {
        bad.push(`${OPENS.exec(line)![1]!}: ${lead[0]}`);
      }

      REFERENCE.lastIndex = 0;
    }
  }

  return bad;
}

export function cited(lines: readonly string[]): readonly string[] {
  return [
    ...new Set(
      lines
        .filter((line) => ROW_SHAPED.test(line))
        .flatMap((line) => [...line.matchAll(REFERENCE)].map(([id]) => id)),
    ),
  ];
}

const markdown = new MarkdownIt('commonmark').enable(['table']);

/**
 * A second reader, for cell content rather than for table shape. It differs
 * from `markdown` in one rule, and that rule is the reason it exists: commonmark
 * has no strikethrough, so a struck clause would arrive as ordinary text with
 * four stray tildes in it.
 */
const inline = new MarkdownIt('commonmark').enable(['strikethrough']);

/** The delimiter row, which is a table's shape and not one of its rows. */
const DELIMITER = /^\|(?:\s*:?-{2,}:?\s*\|)+$/u;

/**
 * How many cells a row **authors** — asked of the parser rather than counted.
 *
 * A parsed row is always its header's width, because the parser truncates and
 * pads to it, so comparing parsed lengths would compare one number with
 * itself: the vacuity F-83 is made of, and D-115 forbids. So the row is
 * offered to the parser **as a header** instead, whose width the delimiter row
 * must match for the block to be a table at all. The width the parser accepts
 * is the width the row authored, with escaped pipes and pipes inside code
 * spans resolved by the parser and not by this file.
 */
export function width(row: string): number | undefined {
  for (let count = 1; count <= 12; count += 1) {
    const table = `${row}\n|${' --- |'.repeat(count)}\n| x |\n`;

    if (
      markdown.parse(table, {}).some((token) => token.type === 'table_open')
    ) {
      return count;
    }
  }

  return undefined;
}

/**
 * A row's cells, as the markdown source each one holds. Read from the row
 * offered as its own header, for `width`'s reason: a row parsed as a body row
 * is padded and truncated to a width chosen elsewhere.
 */
function cells(row: string): readonly string[] {
  const count = width(row);

  if (count === undefined) {
    return [];
  }

  const tokens = markdown.parse(
    `${row}\n|${' --- |'.repeat(count)}\n| x |\n`,
    {},
  );
  const content: string[] = [];
  let head = false;

  for (const token of tokens) {
    if (token.type === 'thead_open') {
      head = true;
    } else if (token.type === 'thead_close') {
      break;
    } else if (head && token.type === 'inline') {
      content.push(token.content);
    }
  }

  return content;
}

const tidy = (text: string): string => text.replaceAll(/\s+/gu, ' ').trim();

/**
 * A cell's text with its struck spans lifted out of it. Nesting is counted
 * rather than assumed absent, so a span is closed by the `s_close` that
 * balances it.
 */
function flatten(source: string): Readonly<{
  text: string;
  struck: readonly string[];
}> {
  const struck: string[] = [];
  let text = '';
  let span = '';
  let depth = 0;

  for (const token of inline.parseInline(source, {})[0]?.children ?? []) {
    if (token.type === 's_open') {
      depth += 1;
      continue;
    }

    if (token.type === 's_close') {
      depth -= 1;

      if (depth === 0) {
        struck.push(tidy(span));
        span = '';
      }

      continue;
    }

    const piece =
      token.type === 'text' || token.type === 'code_inline'
        ? token.content
        : token.type === 'softbreak' || token.type === 'hardbreak'
          ? ' '
          : '';

    if (depth > 0) {
      span += piece;
    } else {
      text += piece;
    }
  }

  return { text: tidy(text), struck };
}

/**
 * Every decision at its canonical occurrence, in document order. The statement
 * is the `Decision` cell — the second one in every table the ledger uses —
 * which is why the cell is taken by position rather than by header name.
 */
export function canonical(lines: readonly string[]): readonly Decision[] {
  return ledger(lines).flatMap((line) => {
    const match = OPENS.exec(line);

    if (match === null) {
      return [];
    }

    const { text, struck } = flatten(cells(line)[1] ?? '');

    return [{ id: match[1]!, statement: text, struck }];
  });
}

/** Every decision the document names anywhere, canonically or not. */
export function referenced(lines: readonly string[]): readonly string[] {
  return [
    ...new Set(
      lines.flatMap((line) => [...line.matchAll(DECISION)].map(([id]) => id)),
    ),
  ];
}

/**
 * Every decision whose flattened content still carries strikethrough markup,
 * which means the parser never saw a span to consume.
 *
 * **The cause is always a span that is not inside one cell.** A table cell is
 * parsed on its own, so a `~~` opened in the `Decision` cell and closed in the
 * `Why` cell is one stray delimiter in each — the row's tilde count is even and
 * every cell's is odd. GFM renders both as literal tildes, so the clause is
 * struck nowhere and the retired projection cannot see it: a withdrawn clause
 * that reads as live text in the record and is absent from the list of what has
 * been withdrawn. Silent in both directions, which is why it is a failure here
 * rather than something the flattener quietly tidies away — stripping the
 * tildes would print the retracted half of a decision as what the decision
 * says, and remove the only evidence that anything is wrong.
 *
 * The repair is in the document: close the span before the cell boundary and
 * open a second one after it.
 */
export function residual(lines: readonly string[]): readonly string[] {
  return canonical(lines).flatMap(({ id, statement, struck }) =>
    statement.includes(MARKUP) || struck.some((span) => span.includes(MARKUP))
      ? [`unclosed strikethrough: ${id}`]
      : [],
  );
}

/** A reference naming a decision that has no canonical row. */
export function dangling(lines: readonly string[]): readonly string[] {
  const known = new Set(canonical(lines).map(({ id }) => id));

  return referenced(lines).filter((id) => !known.has(id));
}

/** The rows of §Decision status, in document order. */
export function registered(lines: readonly string[]): readonly Entry[] {
  return statusSection(lines).flatMap((line) => {
    const match = REGISTERED.exec(line);

    return match === null
      ? []
      : [{ decision: match[1]!, status: match[2]! as Status }];
  });
}

/**
 * Everything `registered` would drop on the floor: a row of that table which
 * does not parse — which is how a value outside `active`/`inactive` is
 * reported, since the vocabulary is part of the row's shape — and an id
 * entered twice, because two answers to one question is no answer.
 */
export function malformed(lines: readonly string[]): readonly string[] {
  const bad: string[] = [];
  const seen = new Set<string>();

  for (const line of statusSection(lines)) {
    const match = REGISTERED.exec(line);

    if (match === null) {
      if (STATUS_SHAPED.test(line)) {
        bad.push(`unparseable entry: ${line.slice(0, 60)}`);
      }

      continue;
    }

    if (seen.has(match[1]!)) {
      bad.push(`duplicate entry: ${match[1]!}`);
    }

    seen.add(match[1]!);
  }

  return bad;
}

/**
 * The two directions the register can be incomplete in, as one list. A
 * decision with no entry has no status, and an entry with no canonical row
 * gives a status to nothing — neither is a projection this file will guess at,
 * which is why `projection` and `retired` are only meaningful once this is
 * empty.
 */
export function unaccounted(lines: readonly string[]): readonly string[] {
  const known = new Set(canonical(lines).map(({ id }) => id));
  const entries = registered(lines);
  const given = new Set(entries.map(({ decision }) => decision));

  return [
    ...[...known]
      .filter((id) => !given.has(id))
      .map((id) => `no status: ${id}`),
    ...entries
      .filter(({ decision }) => !known.has(decision))
      .map(({ decision }) => `no decision: ${decision}`),
  ];
}

const statuses = (lines: readonly string[]): ReadonlyMap<string, Status> =>
  new Map(registered(lines).map(({ decision, status }) => [decision, status]));

/**
 * The projection itself: every canonical decision with the status the register
 * gives it, and the statement blanked where the decision is inactive — an
 * inactive statement is retired content, and this column is what the record
 * currently says. Requires an empty `unaccounted`.
 */
export function projection(lines: readonly string[]): ReadonlyArray<
  Readonly<{
    decision: string;
    status: Status;
    statement: string;
  }>
> {
  const status = statuses(lines);

  return canonical(lines).map(({ id, statement }) => ({
    decision: id,
    status: status.get(id)!,
    statement: status.get(id) === 'active' ? statement : '',
  }));
}

/**
 * Retired content, from its two sources in one shape: the whole statement of
 * an inactive decision, and every struck span of any decision. Document order
 * throughout, and a decision that is both inactive and struck answers twice —
 * the withdrawn clause and the withdrawn decision are different retirements.
 * Requires an empty `unaccounted`.
 */
export function retired(
  lines: readonly string[],
): ReadonlyArray<Readonly<{ decision: string; status: Status; text: string }>> {
  const status = statuses(lines);

  return canonical(lines).flatMap(({ id, statement, struck }) => {
    const value = status.get(id)!;
    const rows =
      value === 'inactive'
        ? [{ decision: id, status: value, text: statement }]
        : [];

    return [
      ...rows,
      ...struck.map((text) => ({ decision: id, status: value, text })),
    ];
  });
}

export type Shape = Readonly<{ rows: number; wrong: readonly string[] }>;

/** Every row whose authored width is not the width its own header declares. */
export function shape(lines: readonly string[]): Shape {
  const wrong: string[] = [];
  let header = 0;
  let rows = 0;

  for (const [at, line] of lines.entries()) {
    if (!line.startsWith('|')) {
      header = 0;
      continue;
    }

    if (DELIMITER.test(line)) {
      continue;
    }

    const count = width(line);

    if (header === 0) {
      header = count ?? 0;
      continue;
    }

    rows += 1;

    if (count !== header) {
      wrong.push(`${at + 1}: ${count ?? '?'} cells against ${header}`);
    }
  }

  return { rows, wrong };
}
