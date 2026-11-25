// A model of the plan's stage 2 checks 4, 6, 7 and 8, which no tool implements
// yet, with the repairs of findings.md's "A fault" applied to each fault.
// Run: node fault-model.mjs
let now = 0;
const tick = () => (now += 1);
const amendment = (n, more = {}) => ({ n, at: tick(), ok: true, ...more });

function check({ revision, formed = true, editedAt, amendments }) {
  if (!formed) return 'refused 4: the body has no revision or stamp';
  if (amendments.some(({ ok }) => !ok)) return 'refused 6: out of form';
  if (amendments.some(({ edited }) => edited)) return 'refused 6: edited';
  const numbers = amendments.map(({ n }) => n).join();
  const expected = Array.from({ length: revision }, (_, i) => i + 1).join();
  if (numbers !== expected) return `refused 7: [${numbers}] at r${revision}`;
  const last = amendments.at(-1)?.at;
  if (last === undefined ? editedAt !== null : editedAt > last)
    return 'refused 8: the body was edited after the last amendment';
  return `accepted r${revision}`;
}

/** Registered, then amended `count` times in the stated order. */
function make(count) {
  const issue = { revision: 0, editedAt: null, amendments: [] };
  tick();
  for (let n = 1; n <= count; n += 1) {
    issue.revision = n;
    issue.editedAt = tick();
    issue.amendments.push(amendment(n));
  }
  return issue;
}

/** Bullet 1. The numbers are as they were posted unless `renumber`. */
function repost(issue, from, renumber = false) {
  const later = issue.amendments.splice(from);
  later.forEach(({ n }, i) =>
    issue.amendments.push(amendment(renumber ? from + i + 1 : n)),
  );
}

/** Bullet 2. */
function amend(issue, n) {
  issue.revision = n;
  issue.formed = true;
  issue.editedAt = tick();
  issue.amendments.push(amendment(n));
}

const CASES = [
  [
    'amendment 2 of 3 has no stamp',
    3,
    (i) => {
      i.amendments[1].ok = false;
    },
    { 'bullet 1': (i) => repost(i, 1) },
  ],
  [
    'amendment 2 of 2 was edited (neither bullet names it)',
    2,
    (i) => {
      i.amendments[1].edited = true;
    },
    { 'as bullet 1': (i) => repost(i, 1) },
  ],
  [
    'amendment 3 is posted as 4, the body is r3',
    2,
    (i) => {
      i.revision = 3;
      i.editedAt = tick();
      i.amendments.push(amendment(4));
    },
    {
      'bullet 1, the number as posted': (i) => repost(i, 2),
      'bullet 1, the number corrected': (i) => repost(i, 2, true),
    },
  ],
  [
    'amendment 2 is posted twice',
    2,
    (i) => {
      i.amendments.push(amendment(2));
    },
    {
      'bullet 1, as posted': (i) => repost(i, 2),
      'bullet 1, the number corrected': (i) => repost(i, 2, true),
      'deleted and not posted again': (i) => i.amendments.pop(),
    },
  ],
  [
    'amendment 3 is posted and the body stays r2',
    2,
    (i) => {
      i.amendments.push(amendment(3));
    },
    {
      'bullet 1': (i) => repost(i, 2),
      'deleted, then amended as r3': (i) => {
        i.amendments.pop();
        amend(i, 3);
      },
    },
  ],
  [
    'the body is edited and stays r2',
    2,
    (i) => {
      i.editedAt = tick();
    },
    { 'bullet 2, r3': (i) => amend(i, 3) },
  ],
  [
    'stopped between steps 2 and 3: the body is r3, amendments 1 and 2',
    2,
    (i) => {
      i.revision = 3;
      i.editedAt = tick();
    },
    {
      'bullet 2, next after the body, r4': (i) => amend(i, 4),
      'bullet 2, next after the last amendment, r3': (i) => amend(i, 3),
      'amendment 3 alone': (i) => i.amendments.push(amendment(3)),
    },
  ],
  [
    'the body lost its stamp, r2 (neither bullet names it)',
    2,
    (i) => {
      i.formed = false;
    },
    {
      'the stamp put back under r2': (i) => {
        i.formed = true;
        i.editedAt = tick();
      },
      'as bullet 2, r3': (i) => amend(i, 3),
    },
  ],
  [
    'registered without a stamp, r0 (neither bullet names it)',
    0,
    (i) => {
      i.formed = false;
    },
    {
      'the stamp put back under r0': (i) => {
        i.formed = true;
        i.editedAt = tick();
      },
      'as bullet 2, r1': (i) => amend(i, 1),
    },
  ],
];

for (const [name, count, fault, repairs] of CASES) {
  const faulty = make(count);
  fault(faulty);
  console.log(`${name}: ${check(faulty)}`);
  for (const [repair, apply] of Object.entries(repairs)) {
    const issue = make(count);
    fault(issue);
    apply(issue);
    console.log(`  ${repair}: ${check(issue)}`);
  }
}
