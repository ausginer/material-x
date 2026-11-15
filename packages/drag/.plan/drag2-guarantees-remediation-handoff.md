# Handoff: the guarantee tests' remediation, with the `y()` geometry follow-up

**Recipient:** the implementer. **Branch:** `drag2/removal`, or one the owner names. **Input:** the architect's record commit on `drag2/removal` that adds this handoff.

**Governing records**, in [`00-index.md`](00-index.md):

- `drag:DRF-45`, and §Disposition of the guarantee tests proof, on the independent [proof](reviews/drag2-guarantees/proof-reviewer.md) at `1c1e93bd9`.
- `drag:DRD-67`: property 2, property 4 as clarified, and its decided property 7 stop.
- `drag:DRD-65` property 6, and §Disposition of the `y()` geometry terms report.
- `drag:DRO-19`: the library code the tests run is the library code consumers receive.

Items 1 to 3 are the unrouted [`y-geometry-terms-follow-up-handoff.md`](y-geometry-terms-follow-up-handoff.md), unchanged.

**Scope:**

- Tests and test support: `tests/layout-animation.browser.test.ts`, `tests/y-geometry.browser.test.ts`, `tests/support/oracles.ts`, `tests/refusals.browser.test.ts` (or a new liveness file beside it), `tests/free-drag.browser.test.ts`, the S8 tests in `tests/sortable.browser.test.ts`, `tests/consumer-types.node.test.ts`, `tests/keyboard.browser.test.ts`, `tests/coordinates.browser.test.ts` and `tests/landing.browser.test.ts`.
- Comments in `bench/size/measure.ts`, `bench/compare.ts` and `src/sortable/y.ts`.
- Witnesses under `probes/drag2-guarantees/witnesses/`.

**Code in `src` and `bench` doesn't change.** The emitted `.js` differs from the input's only in comments. A mutation is applied for a run and then reverted. It is never committed in `src`.

**Order:** items 1 to 4 and 6 to 12, then item 5, which re-runs every witness at the resulting tree.

## 1. The consumer's transform animation holds the row still (`DRD-67` property 7)

At `tests/layout-animation.browser.test.ts:266`, _should leave a consumer animation on transform running_, the consumer's animation stays on `transform`, and its two keyframes are equal, for example `translateX(10px)` in both. A comment of one line says why: a row that moves during the drag without `invalidate()` is outside `drag:DRI-14`. The neighbouring `translate` test's comment is a model. The title and the assertions don't change, and no mismatch is consumed. The probe's [`consumer-transform-constant.diff`](probes/y-geometry-terms-ruling/consumer-transform-constant.diff) is one form, without the comment.

## 2. The bench says why it keeps the define (`DRD-67` property 2)

At `bench/size/measure.ts:199` and `bench/compare.ts:115`, the `__DEV__: 'false'` define stays. A comment at each site says why. These tools build source from earlier revisions (`--prototype` in `measure.ts`, `--before` in `compare.ts`), and that source reads `__DEV__`. The define reproduces those revisions' own `tsdown` define, and current source doesn't read it.

## 3. One comment line rewrapped (`DRD-65` property 6)

`src/sortable/y.ts:17` is 132 characters long. Rewrap the paragraph to the width of the module comment's other lines, without changing its words.

## 4. S2's displacement clause reaches `y()`'s settling (`proof-reviewer-2`)

_should agree on sub-pixel geometry with a displacement running_ (`tests/y-geometry.browser.test.ts:140`) must make `y()` measure a row while that row's displacement runs. Today the crossed rows are predicted by `shift` and never read mid-flight, so `y()`'s settling isn't on the sampled path. One way through the public API: call the operation's `invalidate()` during the sweep while the held animations run, so that the rebuild reads displaced rows. Keep the existing fixture's held 13 ms and its app-unit rounding.

**Witness:** under the saved `S2-3.diff`, the test fails on the instrument's own assertion, with `sweepGaps` reporting a disagreement, in the source and consumer projects. A failure from the oracle's after-test check alone doesn't count. If no fixture reached through the public API makes the instrument report under `S2-3`, stop and report what you tried.

## 5. Every cited witness, re-run at one tree (`proof-reviewer-3`, `-11`, `-12`)

At the commit that completes items 1 to 4 and 6 to 12:

- **Which mutations:** every saved mutation that the [guarantees report](drag2-guarantees-report.md) and the [`y()` geometry report](y-geometry-terms-report.md) cite as a witness, plus the new witnesses of this handoff.
- **Where each runs:** in the source project, on the test files of its row. S2's mutations also run in the consumer project, after a build of the mutated tree.
- **The tree:** restore it after each mutation.
- **The logs:** save each run to `probes/drag2-guarantees/witnesses/<id>.log`. A log states the tree's commit and the command. For each failing test, in run order, it gives:
  - the test's `file:line` and title;
  - the assertion message, or the oracle's message.

  It ends with the summary line. Don't sort lines across tests.

- **A saved diff that no longer applies:** rewrite it as the same mutation against the tree. Save it as `witnesses/<id>.diff`, and the report says what changed. New witnesses' diffs go in `witnesses/` too.
- **The old logs:** leave `mutations/` as it is. It is the per-row record.

**A cited mutation that no longer fails its row's test is a stop.** So is one whose only failure is in an unrelated test. Report it with its log, and don't change the test to make it fail.

## 6. The refusal oracle counts an event of any realm (`proof-reviewer-4`, `DRD-67` property 4)

The oracle counts a nested `enter` with a step and an event, whatever the event's realm. `instanceof Event` against the top window's `Event` isn't enough.

**Liveness:** a nested synthetic press in a same-origin iframe records one untrusted refusal, in the source and consumer projects.

**Witness:** with the top-window `instanceof Event` test restored, that liveness test fails.

## 7. F4: `null` is not the viewport clamp (`proof-reviewer-5`)

The `null` test (`tests/free-drag.browser.test.ts:351`) drags past the viewport's edge, as drag2's did with `10_000`, and expects the unconstrained position.

**Witness:** a mutation that treats a `null` result as the viewport fails it.

## 8. S8: `box` wins over `visual` (`proof-reviewer-6`)

A test sets both `box` and `visual`, with different geometry, and asserts that the candidates are measured through `box`.

**Witness:** reversing the precedence where candidates are measured fails it. For example, use `config.visual ?? config.box` where the code reads `config.box ?? config.visual`. If the reversal fails nothing, stop.

## 9. F8: each entry resolves to its own declaration (`proof-reviewer-7`)

The check at `tests/consumer-types.node.test.ts:113` fails when one entry's specifier resolves to a declaration other than its own. Membership in `--listFiles` doesn't show that. One source of evidence is tsc's module-resolution trace.

**Witness:** in the built `package.json`, remap one entry's `types` to another valid declaration that some declaration imports, such as `free-drag/bounds`. The check fails. If the current check already fails under that remap, the report shows it and the check stays.

## 10. S4: an arrow inside a marked region stays native (`proof-reviewer-8`)

A test puts `data-drag-ignore` on an ancestor between the item and an unmarked input. An arrow key from the input is not prevented, and the order doesn't change.

**Witness:** a mutation of the hop walk (`src/kernel/gesture.ts:80`) that checks only the subject itself fails it. The existing test, with the mark on the input, still passes under that mutation.

## 11. F5: the drag activates (`proof-reviewer-9`)

_should commit the visual where it was dropped through the local delta_ (`tests/coordinates.browser.test.ts:412`) also asserts that the drag activated. For example, assert that the visual moved from its origin before the drop, or that `onStart` ran.

**Witness:** the report shows that the test fails when the drag doesn't activate.

## 12. S1: the outcome still stands after the landing would have ended (`proof-reviewer-10`)

`tests/landing.browser.test.ts:618` reads the outcomes and faults after the time the landing would have taken, not right after `pointerUp`.

**The report names the code that makes the outcome stand.**

- **If that code can be removed:** a mutation that removes it fails the test.
- **If the clause holds by structure:** a mutation that changes the outcome after the fault, such as reverting the move, fails the test. The report records the clause as structural, as the record does for S6's no-op and S10's gap.

## Checks

- `npx just test` in `packages/drag`: only the five `size.node.test.ts` ceiling rows fail (`DRO-4`).
- `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox` exits 0. WebKit isn't owed locally (`DRO-18`).
- `npx just typecheck` and `npx just lint` in `packages/drag` exit 0 on the edited files.
- The Verify steps of [`handoff.md`](../../../.agents/docs/handoff.md) for every edited file.
- Against a build of the input, the emitted `.js` differs only in comments, or not at all.

**Stops.** Any test that newly fails is a stop, apart from the tests this handoff changes. So is any stop named in an item. Report each with its assertion, and don't adjust the test.

## Report

`packages/drag/.plan/drag2-guarantees-remediation-report.md`:

- each item's edits, as `file:line`;
- each item's witness, with its log under `witnesses/`;
- item 5's table: each mutation, its row, the projects, the failing tests and assertions, and whether it was rewritten;
- the checks and their results;
- the comparison of the emitted `.js`;
- any stop, with its assertion;
- the commits.

The unit stops at the pushed report. Next is an independent recheck against `proof-reviewer-1` to `proof-reviewer-12`.