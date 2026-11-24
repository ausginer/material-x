// The repair rule of the plan's second rulings, against a model of the stage 2
// checks 2 (the editor), 3, 4, 6, 7 and 8. It takes every state in the bounds
// below, stops the repair after each of its actions, starts it again, and
// counts the states that the checks refuse afterward.
// Run: node repair-model.mjs
let now = 0;
const tick = () => (now += 1);

function check({ revision, formed, owner, label, editedAt, amendments }) {
  if (!owner || !label || !formed) return false;
  if (amendments.some(({ ok }) => !ok)) return false;
  if (amendments.some(({ n }, i) => n !== i + 1)) return false;
  if (amendments.length !== revision) return false;
  const last = amendments.at(-1)?.at;
  return last === undefined ? editedAt === null : editedAt <= last;
}

/** One action for each write, so that a caller can stop between them. */
function* repair(issue) {
  // A body that isn't in its form can have lost its number.
  const known = issue.formed ? issue.revision : 0;
  const r = Math.max(known, ...issue.amendments.map(({ n }) => n)) + 1;
  const before = [...issue.amendments];
  let kept = 0;
  while (before[kept]?.ok && before[kept].n === kept + 1) kept += 1;

  Object.assign(issue, { revision: r, formed: true, owner: true });
  issue.editedAt = tick();
  yield;
  issue.label = true;
  yield;
  for (let n = kept + 1; n <= r; n += 1) {
    issue.amendments.push({ n, ok: true, at: tick() });
    yield;
  }
  for (const old of before.slice(kept)) {
    issue.amendments.splice(issue.amendments.indexOf(old), 1);
    yield;
  }
}

function* amendmentLists(length) {
  if (length === 0) {
    yield [];
    return;
  }
  for (const rest of amendmentLists(length - 1)) {
    for (const n of [1, 2, 3, 4]) {
      for (const ok of [true, false]) yield [...rest, { n, ok }];
    }
  }
}

function* states() {
  for (const length of [0, 1, 2, 3]) {
    for (const list of amendmentLists(length)) {
      for (const revision of [0, 1, 2, 3, 4]) {
        for (const formed of [true, false]) {
          for (const owner of [true, false]) {
            for (const label of [true, false]) {
              for (const late of [true, false]) {
                const amendments = list.map((a) => ({ ...a, at: tick() }));
                const editedAt = late ? tick() : null;
                yield { revision, formed, owner, label, editedAt, amendments };
              }
            }
          }
        }
      }
    }
  }
}

const copy = (issue) => ({
  ...issue,
  amendments: issue.amendments.map((a) => ({ ...a })),
});

let total = 0;
let refused = 0;
let interrupted = 0;
let refusedAfter = 0;
let reused = 0;
for (const state of states()) {
  if (check(state)) continue;
  total += 1;
  const whole = copy(state);
  let actions = 0;
  for (const _ of repair(whole)) actions += 1;
  if (!check(whole)) refused += 1;
  // A later revision than each one that the issue shows.
  const shown = Math.max(
    state.formed ? state.revision : 0,
    ...state.amendments.map(({ n }) => n),
  );
  if (whole.revision <= shown) reused += 1;
  for (let stop = 1; stop < actions; stop += 1) {
    const issue = copy(state);
    const run = repair(issue);
    for (let i = 0; i < stop; i += 1) run.next();
    if (check(issue)) continue;
    interrupted += 1;
    for (const _ of repair(issue));
    if (!check(issue)) refusedAfter += 1;
  }
}
console.log(`refused states: ${total}`);
console.log(`still refused after the repair: ${refused}`);
console.log(`repaired under a number that the issue already showed: ${reused}`);
console.log(`repairs stopped and started again: ${interrupted}`);
console.log(`still refused after that: ${refusedAfter}`);
