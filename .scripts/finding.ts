#!/usr/bin/env node
/**
 * Prints a finding that lives in a GitHub issue, or says why it isn't in order.
 *
 * ```
 * node .scripts/finding.ts 300
 * node .scripts/finding.ts 300 r2
 * ```
 *
 * The body is the contract, and each change of it is one amendment comment by
 * the owner's account. `Revision N` is a number that a writer types, so the
 * checks compare it with the amendments, and the time of the body's last edit
 * with the last amendment's. A body that was changed under the same number is
 * refused that way.
 *
 * It refuses with exit 1, the cause on standard error and nothing on standard
 * output. It stores nothing.
 */
import { execFile } from 'node:child_process';

const ACCOUNT = 'Lodin';
const STAMP = '— ARCHITECT';
const TIERS: ReadonlySet<string> = new Set(['tier:A', 'tier:B', 'tier:C']);
const COMMENTS_LIMIT = 100;

const QUERY = `query($number: Int!) {
  repository(owner: "ausginer", name: "material-x") {
    issue(number: $number) {
      number title url state body lastEditedAt
      author { login }
      editor { login }
      labels(first: 100) { nodes { name } }
      comments(first: ${COMMENTS_LIMIT}) {
        totalCount
        nodes { body createdAt lastEditedAt author { login } }
      }
    }
  }
}`;

type Account = Readonly<{ login: string }>;

type IssueComment = Readonly<{
  body: string;
  createdAt: string;
  lastEditedAt: string | null;
  author: Account | null;
}>;

type Issue = Readonly<{
  number: number;
  title: string;
  url: string;
  state: string;
  body: string;
  lastEditedAt: string | null;
  author: Account | null;
  editor: Account | null;
  labels: Readonly<{ nodes: ReadonlyArray<Readonly<{ name: string }>> }>;
  comments: Readonly<{
    totalCount: number;
    nodes: readonly IssueComment[];
  }>;
}>;

type Answer = Readonly<{
  data: Readonly<{ repository: Readonly<{ issue: Issue }> }>;
}>;

type Amendment = Readonly<{
  n: number;
  text: string;
  createdAt: string;
  lastEditedAt: string | null;
}>;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** The issue as GitHub has it. Fails with `gh`'s message when `gh` fails. */
async function read(number: string): Promise<Issue> {
  const stdout = await new Promise<string>((done) => {
    execFile(
      'gh',
      ['api', 'graphql', '-f', `query=${QUERY}`, '-F', `number=${number}`],
      { maxBuffer: 64 * 1024 * 1024 },
      (error, out, stderr) => {
        if (error) {
          fail(stderr.trim() || error.message);
        }

        done(out);
      },
    );
  });

  return (JSON.parse(stdout) as Answer).data.repository.issue;
}

/** Without CRLF, which GitHub's web editor writes, and without trailing space. */
function normalize(text: string): string {
  return text.replaceAll('\r\n', '\n').trimEnd();
}

/** The comments by the owner's account that are amendments, in their order. */
function amendmentsOf(comments: readonly IssueComment[]): Amendment[] {
  return comments.flatMap(({ author, body, createdAt, lastEditedAt }) => {
    const text = normalize(body);
    const match = /^### Amendment (\d+)(?:\n|$)/u.exec(text);

    return author?.login === ACCOUNT && match
      ? [{ n: Number(match[1]), text, createdAt, lastEditedAt }]
      : [];
  });
}

const [number = '', pinned, ...rest] = process.argv.slice(2);

if (
  !/^[1-9]\d*$/u.test(number) ||
  !/^r\d+$/u.test(pinned ?? 'r0') ||
  rest.length > 0
) {
  fail('usage: node .scripts/finding.ts <number> [r<revision>]');
}

const issue = await read(number);
const { author, editor, lastEditedAt, comments } = issue;

if (author?.login !== ACCOUNT) {
  fail(
    `#${number} was opened by ${author?.login ?? 'an absent account'}, not ${ACCOUNT}`,
  );
}

// An absent editor means that the body was never edited.
if (editor && editor.login !== ACCOUNT) {
  fail(`#${number} was last edited by ${editor.login}, not ${ACCOUNT}`);
}

const tiers = issue.labels.nodes
  .map(({ name }) => name)
  .filter((name) => TIERS.has(name));

if (tiers.length !== 1) {
  fail(
    `#${number} has ${tiers.length === 0 ? 'no tier label' : tiers.join(' and ')}, not exactly one of ${[...TIERS].join(', ')}`,
  );
}

const body = normalize(issue.body);
const ending = body.split('\n').filter((line) => line.trim() !== '');
const revision = /^Revision (\d+)$/u.exec(ending.at(-2) ?? '');

if (!revision || ending.at(-1) !== STAMP) {
  fail(`#${number}'s body doesn't end with "Revision <N>" and "${STAMP}"`);
}

const current = Number(revision[1]);

if (comments.totalCount > COMMENTS_LIMIT) {
  fail(
    `#${number} has ${comments.totalCount} comments, more than ${COMMENTS_LIMIT}`,
  );
}

const amendments = amendmentsOf(comments.nodes);

for (const { n, text, lastEditedAt: edited } of amendments) {
  if (!text.endsWith(`\n${STAMP}`)) {
    fail(`#${number}'s Amendment ${n} doesn't end with "${STAMP}"`);
  }

  if (edited !== null) {
    fail(`#${number}'s Amendment ${n} was edited at ${edited}`);
  }
}

if (
  amendments.length !== current ||
  amendments.some(({ n }, index) => n !== index + 1)
) {
  fail(
    `#${number}'s body is r${current} and its amendments are ${amendments.map(({ n }) => n).join(', ') || 'none'}, not 1 to ${current} in order`,
  );
}

const last = amendments.at(-1);

// GitHub's times are whole seconds in one ISO form, so their order is the
// order of their text, and an edit in the amendment's own second passes.
if (lastEditedAt !== null && (!last || lastEditedAt > last.createdAt)) {
  fail(
    last
      ? `#${number}'s body was edited at ${lastEditedAt}, after Amendment ${last.n} at ${last.createdAt}`
      : `#${number}'s body is r0 and was edited at ${lastEditedAt}`,
  );
}

const wanted = pinned === undefined ? current : Number(pinned.slice(1));

if (wanted !== current) {
  fail(
    `#${number} is at r${current}, ${current > wanted ? 'later' : 'earlier'} than the given r${wanted}`,
  );
}

process.stdout.write(
  `${[
    `#${issue.number} r${current} ${tiers[0]!} ${issue.state} ${issue.url}`,
    issue.title,
    body,
    ...(last
      ? [
          '--- Amendments. They explain the changes and are not the contract. ---',
          ...amendments.map(({ text, createdAt }) => `${createdAt}\n${text}`),
        ]
      : []),
    `Comments left out: ${comments.totalCount - amendments.length}`,
  ].join('\n\n')}\n`,
);
