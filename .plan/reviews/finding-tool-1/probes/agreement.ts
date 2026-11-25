// Runs the text of `.scripts/finding.ts` in this process on each state of
// `repair-model.mjs`, with the state written as GitHub's answer, and compares
// the exit code with the model's check. It also checks the state after the
// model's repair, and after each stop of the repair and the repair again.
// The model's functions are its own text, without its last part.
// Run: node agreement.ts [<ticks in one second> [unstamped]]
// With more than one tick in a second, equal times are compared too.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../../../..');
const COARSE = Number(process.argv[2] ?? '1');
/** An amendment that the model calls unsound is unstamped, or else edited. */
const UNSTAMPED = process.argv[3] === 'unstamped';

const model = readFileSync(
  join(ROOT, '.plan/findings-on-github-1/probes/repair-model.mjs'),
  'utf8',
);
const head = model.slice(0, model.indexOf('let total = 0;'));
const { check, repair, states, copy } = new Function(
  `${head.replace('(now += 1)', `(now += 1 / ${COARSE}, Math.ceil(now - 1e-9))`)}\nreturn { check, repair, states, copy };`,
)();

const tool = stripTypeScriptTypes(
  readFileSync(join(ROOT, '.scripts/finding.ts'), 'utf8').replace(
    /^#!.*\n/u,
    '',
  ),
)
  .replace(/import \{ execFile \} from 'node:child_process';/u, '')
  .replace('process.exit(1)', 'throw EXIT');
const AsyncFunction = (async () => {}).constructor as any;
const run = new AsyncFunction('execFile', 'process', 'EXIT', tool);

class Exit extends Error {}

async function finding(answer: string): Promise<[number, string, string]> {
  let out = '';
  let err = '';
  const exit = new Exit();
  try {
    await run(
      (_f: string, _a: string[], _o: object, cb: Function) =>
        cb(null, answer, ''),
      {
        argv: ['node', 'finding.ts', '300'],
        stdout: { write: (t: string) => (out += t) },
        stderr: { write: (t: string) => (err += t) },
      },
      exit,
    );
  } catch (error) {
    if (error !== exit) throw error;
    return [1, out, err];
  }
  return [0, out, err];
}

const iso = (t: number): string =>
  new Date(Date.UTC(2026, 10, 24) + t * 1000).toISOString().replace('.000', '');

function answerOf(state: any): string {
  const { revision, formed, owner, label, editedAt, amendments } = state;
  return JSON.stringify({
    data: {
      repository: {
        issue: {
          number: 300,
          title: 'T',
          url: 'u',
          state: 'OPEN',
          body: formed ? `It.\n\nRevision ${revision}\n\n— ARCHITECT` : 'It.',
          lastEditedAt: editedAt === null ? null : iso(editedAt),
          author: { login: 'Lodin' },
          editor: owner
            ? editedAt === null
              ? null
              : { login: 'Lodin' }
            : { login: 'other' },
          labels: { nodes: label ? [{ name: 'tier:B' }] : [] },
          comments: {
            totalCount: amendments.length,
            nodes: amendments.map(({ n, ok, at }: any) => ({
              author: { login: 'Lodin' },
              body: `### Amendment ${n}\n\nx\n\n${ok || !UNSTAMPED ? '— ARCHITECT' : '— COORDINATOR'}`,
              createdAt: iso(at),
              lastEditedAt: ok || UNSTAMPED ? null : iso(at + 1),
            })),
          },
        },
      },
    },
  });
}

let total = 0,
  differ = 0,
  order = 0,
  noise = 0,
  after = 0,
  afterRefused = 0;
let stopped = 0,
  stoppedRefused = 0,
  stoppedDiffer = 0;

async function same(state: any): Promise<[boolean, boolean]> {
  const [code, out, err] = await finding(answerOf(state));
  if (code === 1 && (out !== '' || err === '')) noise += 1;
  if (code === 0 && err !== '') noise += 1;
  return [code === 0, (code === 0) === check(state)];
}

for (const state of states()) {
  total += 1;
  const [passes, agrees] = await same(state);
  if (!agrees) differ += 1;
  if (passes) {
    order += 1;
    continue;
  }

  const whole = copy(state);
  let actions = 0;
  for (const _ of repair(whole)) actions += 1;
  after += 1;
  const [ok, agreesAfter] = await same(whole);
  if (!ok) afterRefused += 1;
  if (!agreesAfter) differ += 1;

  for (let stop = 1; stop < actions; stop += 1) {
    const issue = copy(state);
    const steps = repair(issue);
    for (let i = 0; i < stop; i += 1) steps.next();
    stopped += 1;
    const [okStop, agreesStop] = await same(issue);
    if (!agreesStop) stoppedDiffer += 1;
    if (okStop) continue;
    for (const _ of repair(issue));
    if (!(await same(issue))[0]) stoppedRefused += 1;
  }
}

console.log(
  `ticks in one second: ${COARSE}, an unsound amendment is ${UNSTAMPED ? 'unstamped' : 'edited'}`,
);
console.log(
  `states: ${total}, in order for the tool: ${order}, the model disagrees: ${differ}`,
);
console.log(`repaired: ${after}, the tool then refuses: ${afterRefused}`);
console.log(
  `stopped repairs read by the tool: ${stopped}, the model disagrees: ${stoppedDiffer}`,
);
console.log(`started again and then refused by the tool: ${stoppedRefused}`);
console.log(
  `a refusal with output, or without a cause, or a pass with an error: ${noise}`,
);
