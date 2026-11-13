# Numeric storage: assessment

**Read:** the independent review [`reviews/13-numeric-storage/implementation-reviewer.md`](reviews/13-numeric-storage/implementation-reviewer.md) at `9205fc2d1` on `box-quad/numeric-storage`. It reviewed the implementation `057c39b94` and the report [`numeric-storage-report.md`](numeric-storage-report.md) at `b258bbd92`. **Governing records:** `BQ-11` in [`plan.md`](plan.md), [`numeric-storage-handoff.md`](numeric-storage-handoff.md), and the owner's scope update quoted in the report. Assessed by the architect on 2026-11-13.

**Outcome: the implementation is accepted, and BQ-12 records the drag2 exclusion.**

- **The exclusion:** the owner's update changes what `BQ-11` property 10 requires, so `BQ-12` supersedes `BQ-11` without drag2.
- **reviewer-1:** a proof gap in `coordinates`. It gets a bounded test unit, [`coordinates-finiteness-handoff.md`](coordinates-finiteness-handoff.md).
- **reviewer-2:** a wrong count in the report. It is corrected in place.

No source changes, and no check was rerun.

## 1. What the architect checked

The review's reproduced evidence is used as it stands. The architect checked these mechanical claims directly at `9205fc2d1`:

| Claim | Result |
| --- | --- |
| `coordinates` writes only after its last check | Yes. `src/index.ts` returns `false` at the rect count, the ancestry read, `composeNode` and `finite(a + b + c + d + width + height)`, and the eight writes follow the last of them |
| The finiteness check can be reached with a connected, 2D element | Consistent with the source. `ancestry` writes `matrix.a` to `matrix.d` with no finiteness check, so an overflowing ancestor product passes `ancestry` and reaches `coordinates`' own check. The review reached it in Chromium with nine nested ancestors at `scale(1e38)` |
| reviewer-2's count | Four calls. The handoff's `grep` at `9205fc2d1` finds `space()` at `presentation.ts` lines 519 and 523, `box()` at line 524, and `space()` at `tests/perf/m5.browser.test.ts` line 538. The rest are drag2's `createBox()` test helpers and one comment |
| drag's typecheck reaches drag2 | Yes. drag's `tsconfig.json` includes `./bench/**/*`. `bench/lab-drag2.ts` imports `../../drag2/src/…`, and `presentation.ts` imports `box` at line 13 and `space` at line 15 |
| The root `just typecheck` includes drag and drag2 | Yes. The root `Justfile` runs `typecheck` for both projects, among others. It wasn't run |

## 2. The findings

### reviewer-1: accepted, tier C, and handed off as a test unit

**The claim holds.** `BQ-11` property 5, carried into `BQ-12`, requires `coordinates` to write only after every check has passed, and to leave `out` as it was on `false`. Three of its four `false` returns have a test that asserts an untouched output. The finiteness check has none. The review's mutation shows it: `out[BOX_A] = a;` moved above the check, and all 239 tests passed. The same mutation in `projection` fails a test.

**Tier C stands.** The code meets the property by reading, and it is the arm's runtime code. No consumer observes the gap, and no accepted record cites a test for this path. The gap is older than this unit. That was inferred and not measured, and it doesn't matter to the disposition.

**What closes it** is a test that reaches the finiteness check through the DOM, asserts the output untouched, and fails under the review's mutation. The unit adds that test and nothing else. [`coordinates-finiteness-handoff.md`](coordinates-finiteness-handoff.md) states its properties. Source changes aren't part of it.

### reviewer-2: accepted, tier C, and corrected

The report said "three factory calls", and the tree has four. The report's sentence is corrected in place, with what it used to say. No decision rested on the count. `BQ-12` property 11 excludes drag2's migration, and if a later decision scopes it, it starts from the tree.

## 3. The routed items

### The owner's scope update

The report quotes it:

> Owner scope update: ignore drag2 for this unit; it is nearing removal.
>
> Do not migrate its consumers, run its checks, or update its size controls or records. This overrides the corresponding BQ-11 and handoff requirements.
>
> Keep box-quad and the listed drag consumer migrations in scope. If shared checks expose drag2 failures caused by the removed factories, report them as expected consequences outside scope, not as baseline failures. Do not suppress them.

**It is recorded as `BQ-12`, which supersedes `BQ-11`.** It removes drag2's storage migration and its five control re-declarations from property 10. That changes what the decision requires of the code, and [`documentation.md`](../../../.agents/docs/documentation.md) §6 doesn't allow such a change in place. `BQ-12` keeps `BQ-11`'s properties 1 to 9, restates property 10 for drag only, and adds:

- **property 11:** drag2 is excluded, with no compatibility export and no suppression;
- **property 12:** how drag's typecheck is read while drag2 is excluded.

**What no longer applies in the original handoff:** item 4's two drag2 rows, item 5, the drag2 verification rows, and verification step 2's clean typecheck for drag and drag2. The handoff carries a dated note.

### drag's typecheck

**Observed.** drag's `npx just typecheck` exits 1 with two errors, both `TS2724`, for `box` and `space` at `../drag2/src/kernel/presentation.ts` lines 13 and 15. No drag file has an error. The report and the review got the same output independently.

**The mechanism.** drag's program includes `bench/lab-drag2.ts`, which imports drag2's source, so drag2's imports of the removed factories are type-checked inside drag.

**How it is read.** While drag2 is excluded, that exact output is an expected set of known errors, not a clean pass: the typecheck still fails, and only these two errors are expected. Any other error, or any error in a file under `packages/drag/`, is a failure. Without that rule, drag's typecheck can't separate pass from fail, as the review notes. The rule is `BQ-12` property 12, so later drag units can cite it. _Reworded by the architect on 2026-11-13: this paragraph used to call the output "drag's clean result". The rule is unchanged ([`coordinates-finiteness-assessment.md`](coordinates-finiteness-assessment.md) §3)._

**Not done, on purpose:**

- no compatibility export, which would undo property 1 and which CONTRIBUTING §8 rules out before release;
- no change to drag's `tsconfig.json` that drops `bench/lab-drag2.ts`;
- no `@ts-expect-error` in drag2.

The owner's update says not to suppress, and a suppression would also hide later errors in the same files.

**Not observed.** drag2's own typecheck, lint, tests and size controls weren't run, before or after. The root `just typecheck` runs drag's and drag2's recipes, so it can be expected to exit non-zero. That is read from the `Justfile`, not run. No CI workflow runs a typecheck: the only workflow, `docs.yml`, has none.

**When it ends.** The exclusion and the reading rule end when drag2 is removed, or when a later decision migrates it. Either one makes drag's typecheck exit 0 again, and property 12 has nothing left to apply to.

## 4. The rest of the report

**Accepted as reported.** The review reproduced every reading the report gives after the change:

- the box-quad and drag checks;
- the drag size table, which equals the arm row for row, with the control at 2197 B Brotli and 6733 B minified;
- box-quad's 1197 B module;
- both witnesses.

It also confirmed that the runtime code of `src/index.ts` and the drag consumers is the arm's. The four choices the handoff left open are accepted as the report describes them, the declaration test's `keyof typeof boxQuad` check included. Witness 1 shows that check catches a restored `box`.

**What isn't measured** stays as the report says. Runtime speed and allocation weren't timed. Removing `new Float64Array(5)` from `coordinates`' fallback and drag's switch to `[]` change what is allocated, and no speed claim follows from that.

## 5. What stays separate

- **`F-1`** stays open. The contract's `readBoxQuad` naming is unchanged.
- **drag's five red size rows** are the base's. No ceiling or budget moves, and drag's register gets no entry, as the `BQ-11` record entry explains.
- **drag2** is untouched, under `BQ-12` property 11.
- **Timing and other engines** weren't run.

## 6. Next

The test unit in [`coordinates-finiteness-handoff.md`](coordinates-finiteness-handoff.md), for an `implementer` on this branch. After its report, the architect reads it and closes the pending proof in `BQ-12`'s status. The owner decides when the pull request opens.

**Done on 2026-11-13:** the test landed at `0e90ec136`, and [`coordinates-finiteness-assessment.md`](coordinates-finiteness-assessment.md) closes reviewer-1 and the pending proof.