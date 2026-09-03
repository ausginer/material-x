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
 * ## An entry is a heading, not a row
 *
 * D-171 moved every canonical entry out of a table cell and onto a `####`
 * heading, so nothing here counts cells any more. An entry owns every line
 * down to the next heading of rank four or shallower, which is what keeps its
 * own `#####` sub-clauses inside it — see {@link entries}.
 *
 * The tables that remain are the ones whose rows are *projections*: one
 * derived fact per identifier, which is what a table is for. Those are still
 * read as rows, and still tolerate the padding a formatter writes.
 *
 * ## Statements are flattened, not stripped
 *
 * **Strikethrough is content, not formatting.** A struck span in this record is
 * a clause that has been withdrawn, and it is the one span whose text must not
 * reach the statement: a projection that kept it would report the retracted
 * half of a decision as what the decision says. So flattening splits rather
 * than strips — the surviving text is the statement, and the struck spans are
 * kept beside it in document order.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import MarkdownIt from 'markdown-it';

export const PACKAGE: string = resolve(import.meta.dirname, '..');
export const INDEX: string = join(PACKAGE, '.plan/contract/00-index.md');

/**
 * Where a current-state entry can live, relative to the package.
 *
 * **The same boundary `references.node.test.ts` draws**, and drawn once: these
 * describe the tree as it is now, while `.plan/reviews/`, `.plan/plan.md` and
 * `.plan/measurements/` are dated provenance that a later record supersedes
 * rather than edits. An entry read out of history would answer with a fact
 * that was true.
 */
export const CURRENT_STATE: readonly string[] = [
  '.plan/contract',
  '.plan/obligations.md',
];

/** Every current-state Markdown document, as absolute paths. */
export async function documents(): Promise<readonly string[]> {
  const found = await Promise.all(
    CURRENT_STATE.map(async (relative) => {
      const path = join(PACKAGE, relative);

      if (!(await stat(path)).isDirectory()) {
        return [path];
      }

      const listing = await readdir(path);

      return listing
        .filter((name) => name.endsWith('.md'))
        .sort()
        .map((name) => join(path, name));
    }),
  );

  return found.flat();
}

/** The heading whose subsections hold every canonical decision row. */
export const LEDGER = '## Decision ledger';

/** The heading whose table accounts for every marked decision. */
export const SECTION = '### Decisions not yet implemented';

/** The heading whose table gives every canonical decision a status. */
export const STATUS_SECTION = '## Decision status';

/**
 * **Every pattern here tolerates the padding a Markdown formatter writes**, and
 * that is a property of the document rather than a convenience.
 *
 * A file this repository parses and `oxfmt` rewrites has two authors, and the
 * formatter wins on every save: `AGENTS.md` instructs every edited Markdown
 * file to be formatted, and formatting pads a table's cells to align its
 * columns. A parser admitting exactly one space around a cell therefore stops
 * seeing the rows the moment anyone formats the file — and stops seeing them
 * **silently**, because a row that matches nothing is absent rather than
 * malformed, so a shape assertion still passes while a completeness one reports
 * that every decision in the register has no status.
 *
 * So `\s*` rather than a literal space wherever a cell boundary meets a capture,
 * and every capture is trimmed. `tests/decisions.node.test.ts` holds a witness
 * written in formatter-shaped spacing.
 */

/**
 * **The closed destination vocabulary** (F-70), read by both halves. Kept as
 * one pattern rather than one per half, because the failure this replaced was
 * exactly the two halves agreeing on a form neither could parse.
 */
const DESTINATION = /^(?:Phase \d+|Before Phase \d+|Remediation)$/u;

/**
 * **One identifier grammar, shared by everything that recognises one** (D-175).
 *
 * A letter, then letters and digits, then a hyphen and a number. There is no
 * letter budget: `D`, `SC` and a future `BQ` are the same kind of thing, and a
 * cap is a rule about spelling masquerading as a rule about meaning. It was
 * already losing citations — `P18A-04` is four characters — and the widening
 * was measured to add nothing: 544 claim-shaped headings under the capped
 * grammar and 544 under this one.
 *
 * **Where it is deliberately not used**: `.scripts/corpus-equivalence.ts`
 * reads a frozen pre-migration ref, and a historical reader that grew with the
 * grammar would describe a document that cannot change; and
 * `references.node.test.ts`'s citation scanner stays capped, because widening
 * it is a separate question about review-scope identifiers (F-290).
 */
export const LOCAL_ID = '[A-Za-z][A-Za-z0-9]*-\\d+';

/**
 * An entry heading: the identifier alone, or the identifier, an em dash and a
 * title. **The identifier is matched whole**, which is the property a prefix
 * match does not have — `D-16` must not answer for `D-163`, and a `§`
 * sub-clause at `#####` must not answer for its parent.
 */
const ENTRY = new RegExp(`^#### (${LOCAL_ID})(?: — (.+))?$`, 'u');

/**
 * A heading that **claims** an identifier: one that opens with it, at any
 * depth. `ENTRY` answers *what can I address*; this answers *what claims to be
 * addressable*, and the two are separate on purpose — F-287 exists because
 * they had one answer, so forty-seven headings the extractor stepped over were
 * read as absent rather than as wrong. A reader's blind spot had become the
 * record's invariant.
 *
 * A heading merely *mentioning* an identifier — `### Pointer capture is not
 * here (D-17)` — is prose, and that is what makes the fix structural: the
 * distinction is the opening token, which a depth change cannot undo.
 */
const CLAIM = new RegExp(`^(#+) (${LOCAL_ID})(?: — (.+))?$`, 'u');

/**
 * A named **sub-clause** of an entry: `ID §…`. Legal below `####`, and
 * required to nest inside the entry claiming that same identifier — the form
 * `##### D-66 §The progress marker` already uses. The delimiter after the
 * identifier is therefore load-bearing: without this clause `### F-2 §analysis`
 * would claim an identifier at the wrong depth and pass a check that only
 * looked for an em dash.
 */
const SUB_CLAUSE = new RegExp(`^(#+) (${LOCAL_ID}) §(.*)$`, 'u');

/**
 * A heading **opening** with an identifier, whatever follows it. The two forms
 * above are the legal readings of this; anything else matching here and
 * neither of them is the third state the invariant names — an identifier in
 * heading-key position that is neither a claim nor a sub-clause.
 *
 * The trailing guard is what keeps the identifier whole: without it
 * `#### D-171: a note` would go unread rather than be reported.
 */
const IDENTIFIED = new RegExp(`^(#+) (${LOCAL_ID})(?![\\w-])`, 'u');

/** A heading that closes an entry. Four hashes or fewer; `#####` is inside. */
const CLOSES = /^#{1,4} /u;

/**
 * The marker an entry carries while its subject is not in the code. **Anchored
 * to a line**, where the table form had to reach past a cell boundary from the
 * row start.
 */
const MARKER = /^\*\*Unimplemented \(([^)]*)\)\.\*\*/u;

/**
 * Anything claiming unimplementedness in an entry's first sentence, however
 * spelled. A body that is this and not `MARKER` is malformed, not absent.
 */
const MARKER_SHAPED = /^\*\*[^*]*\bUnimplemented\b/u;

/** A row of §Decisions not yet implemented. */
const LISTED =
  /^\|\s*(D-\d+)\s*\|\s*([^|]+?)\s*\|[^|]+\|\s*(absent|present):\s*`([^`]+)`(?:\s*::\s*`([^`]+)`)?\s*\|/u;

/** Anything shaped like one of that table's rows. */
const ROW_SHAPED = /^\|\s*D-\d+\s*\|/u;

/** A decision named anywhere at all, which is what makes it a reference. */
const DECISION = /D-\d+/gu;

/**
 * A row of §Decision status. The vocabulary is closed here rather than
 * downstream: a third value is an unparseable row, and an unparseable row is a
 * failure by the same rule that governs every other table in this record.
 */
const REGISTERED = /^\|\s*(D-\d+)\s*\|\s*(active|inactive)\s*\|\s*$/u;

/** Anything shaped like one of that table's rows. */
const STATUS_SHAPED = /^\|\s*D-\d+\s*\|/u;

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

/** A row of the status register — a projection, so still a row. */
export type Registration = Readonly<{ decision: string; status: Status }>;

/**
 * An entry: a `####` heading and every line down to the next heading of rank
 * four or shallower. Its own `#####` sub-clauses are part of `body`, which is
 * the whole reason the terminator stops at four hashes rather than at any.
 */
export type Entry = Readonly<{
  id: string;
  title: string | undefined;
  body: string;
  at: number;
}>;

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

/**
 * Every entry in the given lines, in document order.
 *
 * **The terminator is the whole of the reading.** An entry ends at the next
 * heading of rank four or shallower, so a `#####` sub-clause — D-66's progress
 * marker, D-68's two — stays inside the entry that owns it rather than becoming
 * an entry of its own. Nothing else at `####` may open with an identifier, so
 * the heading pattern is both the recogniser and the boundary.
 */
export function entries(lines: readonly string[]): readonly Entry[] {
  const out: Entry[] = [];

  for (const [at, line] of lines.entries()) {
    const match = ENTRY.exec(line);

    if (match === null) {
      continue;
    }

    const rest = lines.slice(at + 1);
    const stop = rest.findIndex((next) => CLOSES.test(next));
    const body = (stop < 0 ? rest : rest.slice(0, stop)).join('\n').trim();

    out.push({ id: match[1]!, title: match[2], body, at });
  }

  return out;
}

/** The first sentence of an entry's body, where the status marker lives. */
const opening = (body: string): string => body.split('\n')[0] ?? '';

/** Decisions whose own entry says they are not implemented yet. */
export function marked(lines: readonly string[]): readonly string[] {
  return entries(lines).flatMap(({ id, body }) => {
    const match = MARKER.exec(opening(body));

    return match === null ? [] : [`${id} (${match[1]!})`];
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

  for (const { id, body } of entries(lines)) {
    const line = opening(body);
    const match = MARKER.exec(line);

    if (match === null) {
      if (MARKER_SHAPED.test(line)) {
        bad.push(`unparseable marker: ${line.slice(0, 60)}`);
      }

      continue;
    }

    if (!DESTINATION.test(match[1]!)) {
      bad.push(`marker destination: ${id} → "${match[1]!}"`);
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

  for (const { id, body } of entries(lines)) {
    const at = [...body.matchAll(BOLD)].filter((bold) =>
      LEAD_IN.test(bold[1]!.trim()),
    );

    for (const [ordinal, lead] of at.entries()) {
      const end = at[ordinal + 1]?.index ?? body.length;
      const clause = body.slice(lead.index, end);

      if (!REFERENCE.test(clause)) {
        bad.push(`${id}: ${lead[0]}`);
      }

      REFERENCE.lastIndex = 0;
    }
  }

  return bad;
}

export function cited(lines: readonly string[]): readonly string[] {
  return [
    ...new Set(
      entries(lines).flatMap(({ body }) =>
        [...body.matchAll(REFERENCE)].map(([id]) => id),
      ),
    ),
  ];
}

/**
 * The reader for an entry's prose. Commonmark alone has no strikethrough, so a
 * struck clause would arrive as ordinary text with four stray tildes in it —
 * and a struck clause is a withdrawn one, which {@link flatten} has to be able
 * to lift out rather than print.
 */
const inline = new MarkdownIt('commonmark').enable(['strikethrough']);

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
 * is the entry's whole body, sub-clauses included: since D-171 there is no
 * second cell to take it from, and no cell boundary for a struck span to fall
 * across.
 */
export function canonical(lines: readonly string[]): readonly Decision[] {
  return entries(ledger(lines))
    .filter(({ id }) => id.startsWith('D-'))
    .map(({ id, body }) => {
      const { text, struck } = flatten(body);

      return { id, statement: text, struck };
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

/** A reference naming a decision that has no canonical row. */
export function dangling(lines: readonly string[]): readonly string[] {
  const known = new Set(canonical(lines).map(({ id }) => id));

  return referenced(lines).filter((id) => !known.has(id));
}

/** The rows of §Decision status, in document order. */
export function registered(lines: readonly string[]): readonly Registration[] {
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

/* ---- the heading invariant D-174 states and D-175 completes ---- */

/**
 * A heading that puts an identifier in key position, classified.
 *
 * `kind` is the whole of the reading: `claim` is `ID` or `ID — title`, and it
 * is an assertion that this document owns that identifier; `sub` is `ID §…`,
 * a named part of the entry that owns it; `malformed` is neither, which the
 * invariant makes a defect rather than a third convention.
 */
export type Claim = Readonly<{
  id: string;
  kind: 'claim' | 'sub' | 'malformed';
  depth: number;
  title: string | undefined;
  at: number;
  text: string;
}>;

/** A document under the invariant: where it lives, and what it says. */
export type Document = Readonly<{ path: string; lines: readonly string[] }>;

/**
 * Every identifier-keyed heading in one document, at **every** depth.
 *
 * Depth is what the extractor cannot see. {@link entries} reads `####` and
 * steps over everything else, so a claim at `###` is invisible to it — absent
 * rather than wrong. This reads the claim regardless of depth, which is what
 * turns forty-eight silent restatements into forty-eight reportable ones.
 */
export function claims(lines: readonly string[]): readonly Claim[] {
  const out: Claim[] = [];

  for (const [at, text] of lines.entries()) {
    const identified = IDENTIFIED.exec(text);

    if (identified === null) {
      continue;
    }

    // `§` first: `##### D-62 §The unresolved arm — resolved by D-66` carries an
    // em dash too, and reading it as a claim is exactly the misreading the
    // second clause of the invariant exists to prevent.
    const sub = SUB_CLAUSE.exec(text);
    const claim = sub === null ? CLAIM.exec(text) : null;
    const match = sub ?? claim;

    out.push({
      id: identified[2]!,
      kind: sub !== null ? 'sub' : claim !== null ? 'claim' : 'malformed',
      depth: identified[1]!.length,
      title: match?.[3],
      at,
      text,
    });
  }

  return out;
}

/** How a defect names its site, so the failure says where to go. */
const site = ({ path }: Document, claim: Claim): string =>
  `${path}:${claim.at + 1}`;

/**
 * Every way the record can break the heading invariant, as one list.
 *
 * **Four clauses, and each is a different repair.** A claim below or above
 * `####` is a restatement that has to become a citation — that is F-287's
 * forty-eight. A second claim of one identifier is two documents asserting
 * ownership of one address, which is what makes an entry unaddressable. A
 * sub-clause outside the entry claiming its identifier is a clause filed under
 * the wrong owner. A heading opening with an identifier in neither form is a
 * shape nothing in the record reads.
 *
 * **Duplication is reported here and in `.scripts/entry.ts`, and the two are
 * not merged.** That reader reports a duplicate among the entries it can
 * *extract*; this reports one among everything that *claims* an identifier at
 * any depth. Only the second finds a `###` restatement — which is the whole of
 * F-287 — so collapsing them would restore the blind spot the invariant is for.
 */
export function violations(docs: readonly Document[]): readonly string[] {
  const bad: string[] = [];
  const owners = new Map<string, Array<readonly [Document, Claim]>>();

  for (const doc of docs) {
    for (const claim of claims(doc.lines)) {
      if (claim.kind === 'malformed') {
        bad.push(
          `identifier heading in neither form: ${site(doc, claim)} — ${claim.text}`,
        );
        continue;
      }

      if (claim.kind === 'claim') {
        if (claim.depth !== 4) {
          bad.push(
            `off-depth claim: ${site(doc, claim)} — ${'#'.repeat(claim.depth)} ${claim.id} claims an identifier outside ####`,
          );
        }

        owners.set(claim.id, [...(owners.get(claim.id) ?? []), [doc, claim]]);
        continue;
      }

      if (claim.depth <= 4) {
        bad.push(
          `sub-clause at claim depth: ${site(doc, claim)} — ${claim.id} §… must sit below ####`,
        );
      }
    }
  }

  for (const [id, held] of owners) {
    if (held.length > 1) {
      bad.push(
        `duplicate claim: ${id} — ${held.map(([doc, claim]) => site(doc, claim)).join(', ')}`,
      );
    }
  }

  // Nesting is checked after ownership, because "inside the entry that claims
  // this identifier" has no answer until every claim is known.
  for (const doc of docs) {
    const owned = new Map(
      claims(doc.lines)
        .filter(({ kind }) => kind === 'claim')
        .map((claim) => [claim.id, claim.at]),
    );

    for (const claim of claims(doc.lines)) {
      if (claim.kind !== 'sub' || claim.depth <= 4) {
        continue;
      }

      const opened = owned.get(claim.id);
      const enclosing = doc.lines
        .slice(0, claim.at)
        .findLastIndex((line) => CLOSES.test(line));

      if (opened === undefined || opened !== enclosing) {
        bad.push(
          `sub-clause outside its entry: ${site(doc, claim)} — ${claim.id} §… does not nest under the entry claiming ${claim.id}`,
        );
      }
    }
  }

  return bad;
}

/* ---- the defect class D-172 recorded as F-284 ---- */

/**
 * A parser for tables, and the *only* thing left here that counts cells.
 *
 * `shape()` also counted cells and was blind to F-284 by construction: it
 * reset its header on any non-pipe line, and every row of the record's long
 * tables is surrounded by blank lines, so each row became its own header and
 * was compared against nothing. **The header is carried across blank lines
 * here**, which is the whole difference between an instrument that finds this
 * and one that cannot.
 */
const TABLE = new MarkdownIt('commonmark').enable(['table']);

/** The delimiter row, which is a table's shape and not one of its rows. */
const DELIMITER = /^\|(?:\s*:?-{2,}:?\s*\|)+$/u;

/** An identifier opening a cell, which is what makes a surplus cell an entry. */
const OPENS_ENTRY = new RegExp(`^(?:\\*\\*)?${LOCAL_ID}(?:\\*\\*)?$`, 'u');

/**
 * How many cells a row **authors**, asked of the parser rather than counted.
 *
 * A parsed body row is always its header's width, because the parser truncates
 * and pads to it — comparing parsed lengths would compare one number with
 * itself. So the row is offered as a *header*, whose width the delimiter must
 * match for the block to be a table at all, and escaped pipes and pipes inside
 * code spans are resolved by the parser and not by a pattern here.
 */
function authored(row: string, cap = 60): readonly string[] {
  for (let count = 1; count <= cap; count += 1) {
    const tokens = TABLE.parse(
      `${row}\n|${' --- |'.repeat(count)}\n| x |\n`,
      {},
    );

    if (!tokens.some((token) => token.type === 'table_open')) {
      continue;
    }

    const cells: string[] = [];
    let head = false;

    for (const token of tokens) {
      if (token.type === 'thead_open') {
        head = true;
      } else if (token.type === 'thead_close') {
        break;
      } else if (head && token.type === 'inline') {
        cells.push(token.content);
      }
    }

    return cells;
  }

  return [];
}

/**
 * Every row authoring more cells than its own table declares — the defect
 * class F-284 names, where GFM discards the surplus and the record loses text
 * nobody can see is missing.
 *
 * **The two failures are reported apart**, because a count conflates them and
 * the repairs differ: a surplus cell that opens with an identifier is a whole
 * **entry** hidden behind the third cell, and one that does not is a
 * **clause** truncated off the end of a row. That discriminator is D-172's,
 * and it is why fourteen entries and ten clauses came out of thirteen rows.
 */
export function surplus(lines: readonly string[]): readonly string[] {
  const bad: string[] = [];
  let header: string | null = null;
  let width = 0;

  for (const [at, line] of lines.entries()) {
    if (!line.startsWith('|')) {
      continue; // **not** a header reset: that is the bug this replaces
    }

    if (DELIMITER.test(line)) {
      header = lines[at - 1] ?? null;
      width = authored(header ?? '').length;
      continue;
    }

    // A line the next one delimits is the header of a *new* table, not a row
    // of the one before it. Header inheritance is what finds F-284; inheriting
    // one across a table boundary would invent the defect instead.
    if (DELIMITER.test(lines[at + 1] ?? '')) {
      continue;
    }

    if (header === null || width === 0) {
      continue;
    }

    const cells = authored(line);

    if (cells.length <= width) {
      continue;
    }

    const extra = cells.slice(width);
    const hidden = extra.filter((cell) => OPENS_ENTRY.test(cell.trim()));

    bad.push(
      hidden.length > 0
        ? `hidden entries at line ${at + 1}, in the row of ${cells[0]!.trim()}: ${hidden.map((cell) => cell.trim()).join(', ')}`
        : `truncated clause at line ${at + 1}, in the row of ${cells[0]!.trim()}: ${extra.length} cell(s) past ${width}`,
    );
  }

  return bad;
}
