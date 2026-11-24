// Mutates a copy of `.scripts/finding.ts` in a temporary directory and runs a
// copy of its tests there, for each row. It prints the rows that fail, or
// SURVIVED. It writes nothing into the repository.
// Run: node mutate.ts
import { execFile } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../../../..');
const SOURCE = readFileSync(join(ROOT, '.scripts/finding.ts'), 'utf8');
const cut = (from: string, to: string): string => {
  const a = SOURCE.indexOf(from);
  const b = SOURCE.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`no ${from}`);
  return SOURCE.slice(a, b);
};

type Row = readonly [name: string, from: string, to: string];
const ROWS: readonly Row[] = [
  // Checks removed, in the plan's numbers.
  ['0 nothing', 'const ACCOUNT', 'const ACCOUNT'],
  ['1 gh failure ignored', 'if (error) {', 'if (false) {'],
  ['1 message replaced', 'stderr.trim() || error.message', 'error.message'],
  [
    '1 message not used as a fallback',
    'stderr.trim() || error.message',
    'stderr.trim()',
  ],
  ['2 author removed', cut('if (author?.login', '// An absent editor'), ''],
  [
    '2 absent author passes',
    'author?.login !== ACCOUNT',
    'author && author.login !== ACCOUNT',
  ],
  ['2 editor removed', cut('if (editor &&', 'const tiers'), ''],
  [
    '2 absent editor refused',
    'editor && editor.login !== ACCOUNT',
    'editor?.login !== ACCOUNT',
  ],
  [
    '2 editor: absent with an edit refused',
    'editor && editor.login !== ACCOUNT',
    '(editor || lastEditedAt) && editor?.login !== ACCOUNT',
  ],
  ['3 removed', cut('if (tiers.length !== 1)', 'const body ='), ''],
  ['3 two pass', 'tiers.length !== 1', 'tiers.length === 0'],
  ['3 none passes', 'tiers.length !== 1', 'tiers.length > 1'],
  ['3 any tier: label', 'TIERS.has(name)', "name.startsWith('tier:')"],
  ['4 stamp removed', ' || ending.at(-1) !== STAMP', ''],
  [
    '4 revision not at the start of the line',
    '/^Revision (\\d+)$/u',
    '/Revision (\\d+)$/u',
  ],
  [
    '4 revision not at the end of the line',
    '/^Revision (\\d+)$/u',
    '/^Revision (\\d+)/u',
  ],
  [
    '4 stamp at the end of any line',
    'ending.at(-1) !== STAMP',
    '!ending.at(-1)!.endsWith(STAMP)',
  ],
  [
    '4 revision anywhere',
    "ending.at(-2) ?? ''",
    "ending.find((l) => l.startsWith('Revision')) ?? ''",
  ],
  ['4 empty lines kept', "line.trim() !== ''", 'true'],
  ['5 removed', cut('if (comments.totalCount >', 'const amendments ='), ''],
  [
    '5 100 refused',
    'comments.totalCount > COMMENTS_LIMIT',
    'comments.totalCount >= COMMENTS_LIMIT',
  ],
  ['6 stamp removed', cut('if (!text.endsWith', 'if (edited'), ''],
  [
    '6 edit removed',
    cut('if (edited !== null', '\n}\n\nif (\n  amendments.length'),
    '',
  ],
  [
    '6 stamp not a whole line',
    'text.endsWith(`\\n${STAMP}`)',
    'text.endsWith(STAMP)',
  ],
  ['6 stamp anywhere', 'text.endsWith(`\\n${STAMP}`)', 'text.includes(STAMP)'],
  [
    '6 only the last amendment checked',
    'of amendments) {',
    'of amendments.slice(-1)) {',
  ],
  [
    '6 only the first amendment checked',
    'of amendments) {',
    'of amendments.slice(0, 1)) {',
  ],
  ['6 heading with text after the number', '(?:\\n|$)/u.exec', '/u.exec'],
  ['6 heading on any line', '(?:\\n|$)/u.exec', '(?:\\n|$)/mu.exec'],
  ['6 heading of any level', '/^### Amendment', '/^#+ Amendment'],
  ['7 count removed', 'amendments.length !== current ||', ''],
  [
    '7 order removed',
    '  amendments.some(({ n }, index) => n !== index + 1)',
    '  false',
  ],
  [
    '7 sorted first',
    'amendmentsOf(comments.nodes)',
    'amendmentsOf(comments.nodes).sort((a, b) => a.n - b.n)',
  ],
  ['8 removed', cut('if (lastEditedAt !== null', 'const wanted'), ''],
  [
    '8 at r0 removed',
    '(!last || lastEditedAt > last.createdAt)',
    '(last && lastEditedAt > last.createdAt)',
  ],
  ['8 later removed', '(!last || lastEditedAt > last.createdAt)', '!last'],
  [
    '8 equal refused',
    'lastEditedAt > last.createdAt',
    'lastEditedAt >= last.createdAt',
  ],
  ['8 against the first amendment', 'amendments.at(-1);', 'amendments.at(0);'],
  ['9 removed', cut('if (wanted !== current)', 'process.stdout.write('), ''],
  ['9 later only', 'wanted !== current', 'wanted < current'],
  ['9 earlier only', 'wanted !== current', 'wanted > current'],
  [
    '9 the word',
    "current > wanted ? 'later' : 'earlier'",
    "current > wanted ? 'earlier' : 'later'",
  ],
  // Reading.
  [
    'read: another account counted',
    'author?.login === ACCOUNT && match',
    'author && match',
  ],
  [
    'read: an absent account counted',
    'author?.login === ACCOUNT && match',
    '(!author || author.login === ACCOUNT) && match',
  ],
  ['read: CRLF kept', ".replaceAll('\\r\\n', '\\n')", ''],
  [
    'read: trailing space kept',
    ".replaceAll('\\r\\n', '\\n').trimEnd()",
    ".replaceAll('\\r\\n', '\\n')",
  ],
  [
    'read: a closed issue refused',
    'const body = normalize',
    "if (issue.state !== 'OPEN') fail('closed');\nconst body = normalize",
  ],
  ['read: number not asked', '`number=${number}`', "'number=1'"],
  ['read: revision not anchored', '/^r\\d+$/u', '/r\\d+/u'],
  ['read: number not anchored', '/^[1-9]\\d*$/u', '/^[1-9]\\d*/u'],
  [
    'read: surplus argument',
    '|| \n  rest.length > 0'.replace('|| \n', '||\n'),
    '',
  ],
  [
    'print: closed comments count',
    'comments.totalCount - amendments.length',
    'comments.totalCount',
  ],
  // The question. The stub answers the same to any question.
  ['ask: no body editor', '      editor { login }\n', ''],
  ['ask: no time of the body edit', 'state body lastEditedAt', 'state body'],
  [
    'ask: no time of a comment edit',
    'createdAt lastEditedAt author',
    'createdAt author',
  ],
  ['ask: no creation time', 'nodes { body createdAt ', 'nodes { body '],
  ['ask: no total', '        totalCount\n', ''],
  ['ask: the first 10 comments', 'first: ${COMMENTS_LIMIT}', 'first: 10'],
  [
    'ask: the last 100 comments',
    'first: ${COMMENTS_LIMIT}',
    'last: ${COMMENTS_LIMIT}',
  ],
  ['ask: another repository', 'name: "material-x"', 'name: "other"'],
  [
    'ask: the last-updated order',
    'comments(first: ${COMMENTS_LIMIT})',
    'comments(first: ${COMMENTS_LIMIT}, orderBy: {field: UPDATED_AT, direction: ASC})',
  ],
];

const scratch = mkdtempSync(join(tmpdir(), 'finding-mutants-'));
const results: string[] = [];

async function one([name, from, to]: Row, index: number): Promise<void> {
  if (SOURCE.split(from).length < 2) {
    results[index] = `${name}: NOT APPLIED`;
    return;
  }
  const dir = join(scratch, String(index));
  mkdirSync(join(dir, '.scripts'), { recursive: true });
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  writeFileSync(
    join(dir, 'vitest.config.ts'),
    "export default { test: { include: ['.scripts/*.node.test.ts'] } };",
  );
  cpSync(
    join(ROOT, '.scripts/finding.node.test.ts'),
    join(dir, '.scripts/finding.node.test.ts'),
  );
  writeFileSync(
    join(dir, '.scripts/finding.ts'),
    SOURCE.replace(from, () => to),
  );
  await new Promise<void>((done) => {
    execFile(
      join(ROOT, 'node_modules/.bin/vitest'),
      ['run', '--reporter=json', '--outputFile=out.json'],
      { cwd: dir, maxBuffer: 1 << 26 },
      () => done(),
    );
  });
  const json = JSON.parse(readFileSync(join(dir, 'out.json'), 'utf8'));
  const failed = json.testResults
    .flatMap((f: any) => f.assertionResults)
    .filter((t: any) => t.status !== 'passed')
    .map((t: any) => t.title);
  results[index] =
    `${name}: ${failed.length === 0 ? `SURVIVED (${json.numPassedTests} rows pass)` : failed.length > 4 ? `${failed.length} rows` : failed.join(' | ')}`;
}

let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < ROWS.length) {
      const i = next++;
      await one(ROWS[i]!, i);
    }
  }),
);
rmSync(scratch, { recursive: true });
console.log(results.join('\n'));
