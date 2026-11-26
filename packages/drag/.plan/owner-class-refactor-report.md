# Owner class refactor: remediation report

**Unit:** [`owner-class-refactor-handoff.md`](owner-class-refactor-handoff.md) on `drag/class-refactor`, from `976d8b2bc`, by an `implementer`. **Governing records:** `DRD-63` properties 1 to 7 in [`00-index.md`](decisions/), and what it amends; `DRO-13`; `DRD-60` property 2; `DRD-52`'s development check; the [assessment](owner-class-refactor-assessment.md), with the owner's answer to Q2. Q1 and Q3 had no recorded answer when the unit started, so it builds their defaults. Evidence is under [`measurements/2026-11-14-class-refactor-remediation/`](measurements/2026-11-14-class-refactor-remediation/).

**The commits:**

| Commit | What it is |
| --- | --- |
| `d1df32018` | **Commit A:** the owner's snapshot, verbatim |
| `abfceb7f8` | Item 1: `MotionConstraint` and `DropTargetTracker` are published interfaces again |
| `a496ecdea` | Item 2: every built-in method passed with its receiver declares `this` |
| `4624c5ffb` | Item 3: `tsconfig.json` includes the allocation probe again |
| `c2028e5cb` | Item 4: the false "read once" comments go |
| `32c217166` | Item 5: the development check's state is typed and doesn't ship |
| `42f42a164` | Item 6: a fresh `bounds` constraint measures at its first `apply` |

The end of the unit is `42f42a164`. This report is committed after it.

## Commit A and the input check

**Before anything else,** the working tree's tracked diff against `976d8b2bc`, outside `packages/drag/.plan/`, had SHA-256 `019cd4569ca6526d443bf354414e56c122a868f6cd242216bdc9f95a4149c508`. All 16 files matched [`input/hashes.txt`](measurements/2026-11-14-owner-refactor/input/hashes.txt).

**Commit A is `d1df32018`.** Exactly the 16 files were staged and committed, with no formatting, lint fix or edit. After the commit ([record](measurements/2026-11-14-class-refactor-remediation/commit-a.txt)):

- **`git diff 5b581fbdf A -- . ':(exclude)packages/drag/.plan'`** over the 14 tracked files has the input's hash, `019cd456…c508`. The input hash was taken from `git diff`, which leaves out untracked files. So the same command over all 16 files gives a different hash, `4bac08e8…8185`, and the two new files are checked by their own hashes instead.
- **The two new files match their saved hashes:** `invalidatable.ts` `4b9b041c…`, `retirable.ts` `0de52383…`. All 16 files at A match `input/hashes.txt`.

**The three temporary Godbolt files are gone from the repository root.** They were there, untracked, at commit A: `getter-method-probe-godbolt.js`, `getter-method-probe.js` and `godbolt-result`. They were missing when this report was written, and none was committed. This unit's commands never named them, and no copy of them exists, so they can't be restored from here. The root directory's mtime is 22:46:52 UTC. The only command of this unit running then was a drag build, and its clean step is `git clean -fx` limited to the package's own entry paths, run from `packages/drag`, so it can't reach the root. What removed them isn't established.

## The items

| Item | Finding and property | Witness | Result |
| --- | --- | --- | --- |
| 1 | `class-refactor-reviewer-1`, `DRD-63` property 1 | Three `drag:DRD-63` cases in `tests/published-types.declaration.test.ts`. M1 exports each type as its class again | **Met.** Both `.d.ts` files are byte-identical to `5b581fbdf`'s. The cases pass, and M1 fails them: 1 case for `MotionConstraint`, 2 for `DropTargetTracker` |
| 2 | `class-refactor-reviewer-2`, `DRD-63` property 2 | Removing the receiver at each of the six sites | **Met.** Each removal fails typecheck with one TS2345 at that site. `tests/callbacks.declaration.test.ts` is unchanged since `5b581fbdf`, and passes |
| 3 | `class-refactor-reviewer-3`, `DRD-60` property 2 | drag's `npx just lint` | **Met.** `tsconfig.json` equals its text at `5b581fbdf`, and lint exits 0 |
| 4 | `class-refactor-reviewer-4`, `DRD-63` property 5 | The `grep` below | **Met.** No read was moved. The getters stay. One false comment was removed, and one was corrected |
| 5 | `class-refactor-reviewer-5`, `DRD-63` property 4 | M5; `DRD-52`'s `equivalence-check` test; a `grep` of the published file | **Met.** `src` has no `@ts-expect-error` or `@ts-ignore`. M5 fails typecheck. The `DRD-52` test passes. The published `sortable/linear-shift.js` names none of the state |
| 6 | `class-refactor-reviewer-6`, `DRD-63` property 3 | Two `drag:DRD-63` cases in `tests/free-drag.browser.test.ts`. M6 is the snapshot's initial value | **Met.** Both cases pass, and M6 fails both |

### 1. Published slot types

- `free-drag/bounds.ts` exports `interface MotionConstraint`, with `5b581fbdf`'s members and JSDoc. The module-private `class BoundsConstraint implements MotionConstraint` implements it.
- `free-drag/drop-targets.ts` exports `interface DropTargetTracker`, with `5b581fbdf`'s members, JSDoc and position, and `readonly current`. The module-private `class ElementTargetTracker implements DropTargetTracker` implements it. The name says what it tracks: a list of elements.
- **The emitted `free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts` are byte-identical** to the `5b581fbdf` build's (`cmp`).
- **The witness,** through each entry's source module, as the file's existing cases import:
  - T1: a third party's `DropTargets` that returns its own `DropTargetTracker`;
  - T2: one that returns a tracker that wraps the built-in one;
  - T3: a `BoundsInstaller` that returns its own `MotionConstraint`.
- **M1** keeps each interface under another name and exports `type X = TheClass`. With `MotionConstraint` as the class, T3 fails. With `DropTargetTracker` as the class, T1 and T2 fail. Both runs fail the `declaration` project ([at the end](measurements/2026-11-14-class-refactor-remediation/mutations/at-end.txt), [diffs](measurements/2026-11-14-class-refactor-remediation/mutations/)).

### 2. Receivers

- `Retirable.retire` declares `this: Retirable`, and `Invalidatable.invalidate` declares `this: Invalidatable`. They reach sites 1 to 3 through `InsertionGeometry` and `DisplacementSink`.
- `SortableBehavior.invalidate` declares `this: SortableBehavior` (site 4). The tracker's `#release` and `#resolve` declare `this: ElementTargetTracker` (sites 5 and 6).
- **The comment** "Staleness only, because scroll calls it many times a second." is on `Invalidatable.invalidate`. That is the declaration `InsertionGeometry` exposes, because `InsertionGeometry` inherits `invalidate` and doesn't redeclare it.
- **The mutations** used the proof's [mutator](reviews/owner-class-refactor/proof-reviewer-probes/receiver-mutate.mjs.txt) unchanged, from a scratch copy. Each file was restored from its own scratch copy, and the tree was checked equal to `HEAD` afterwards. Each removal gives one error, TS2345, at its own site, and none elsewhere ([at item 2](measurements/2026-11-14-class-refactor-remediation/mutations/receivers.txt), [at the end](measurements/2026-11-14-class-refactor-remediation/mutations/at-end.txt)):

  | Site | Error at the end |
  | --- | --- |
  | 1. `drag.use(this.axis.retire, this.axis)` | `behavior.ts(207,14)` |
  | 2. `drag.requestStep(this.axis.invalidate, this.axis)` | `behavior.ts(209,24)` |
  | 3. `kernel.use(displacement.retire, displacement)` | `sortable.ts(59,16)` |
  | 4. `kernel.requestStep(behavior.invalidate, behavior)` | `sortable.ts(67,26)` |
  | 5. the tracker's `drag.use(this.#release, this)` | `drop-targets.ts(73,14)` |
  | 6. the tracker's `drag.requestStep(this.#resolve, this)` | `drop-targets.ts(68,24)` |

  The proof also saw each removal fail the `browser` project. This unit didn't repeat that, because typecheck is the witness the property names.

### 3. `tsconfig.json`

The line `./.plan/probes/callback-list/allocation.ts` is back in `include`. The file equals its text at `5b581fbdf`, and drag's `npx just lint` exits 0 ([log](measurements/2026-11-14-class-refactor-remediation/checks-end/drag-lint.log)).

### 4. Inline reads and comments

- **No read moved.** `y.ts` and `xy.ts` are unchanged since commit A, and `LinearShift.refresh` lost a comment line only. `RectIndex`'s `first`, `end` and `count` are still getters.
- **Removed:** `linear-shift.ts`'s "Read once, outside the loops.", which stood above no read.
- **Corrected:** `RectIndex`'s class comment now reads "an axis rule reads the slot range it scans through the `first`, `end` and `count` getters, and one number per candidate through `at`."
- **`grep -rn -i 'read once\|once per' packages/drag/src`** at the end lists 15 lines ([output](measurements/2026-11-14-class-refactor-remediation/read-once-grep.txt)). Each was read against the code below it:

  | Line | What the code does |
  | --- | --- |
  | `sortable/y.ts:49` "Read once, outside the candidate loop." | `anchor` is read before the `for` loop |
  | `sortable/rect-index.ts:282` "Read once: each is used twice below." | `first` and `end` are local consts, each used twice |
  | `free-drag/drop-targets.ts:114` "Read once, outside the hit-test loop." | `x` and `y` are destructured before the loop |
  | `kernel/session.ts:466` "`then` is read once" | `then` is read into a const at line 501 and called with `.call` |
  | `kernel/session.ts:506` "Read once and called on its own value" | the same const, `then.call(value, …)` |
  | `kernel/callbacks.ts:17` "the shared builtin read once when this module is evaluated" | `const { push, unshift } = [];` at module scope |
  | `free-drag/domain.ts:45` "`home()`, read once at the drop" | JSDoc of a result field. Not a scan read, and unchanged since `5b581fbdf` |
  | `lift.ts:133` "once per property" | the loop saves each lifted property once |
  | `sortable/behavior.ts:70` "Step, once per frame" | not a read. A frame requests the step |
  | `sortable/behavior.ts:79–80` "created once per instance, or once per operation" | not a read. It is about function creation |
  | `kernel/gesture.ts:326` "runs once per call" | not a read. It is about registration |
  | `free-drag/drop-targets.ts:11`, `:40` "pulled once per operation", "calls it once per operation" | the tracker calls `options.targets()` once, in its constructor |
  | `shared/landing.ts:13` "called once per landing" | not a read |

  The six lines outside the scan path are unchanged since `5b581fbdf` and outside this unit's files.

- **No measurement:** the item changes comments only.

### 5. Development-only state

- **The form:** a module-scoped `WeakMap<LinearShift, DevelopmentCheck>` that exists only when `__DEV__` is true. `const developmentChecks = __DEV__ ? new WeakMap() : null`. The constructor sets an entry under `__DEV__`, and each development branch reads it. `DevelopmentCheck` types `advanceUnchecked`, `heldLeft` and `heldRight`. `LinearShift` has none of them as a field, so they aren't on its surface. This is the form the handoff names.
- **`src` has no `@ts-expect-error` and no `@ts-ignore`** (`grep`, 0 lines).
- **M5** misspells the flag at `moved`'s write, as `advanceUnchecekd`. Typecheck fails with TS2551 at `linear-shift.ts(256,37)` ([record](measurements/2026-11-14-class-refactor-remediation/mutations/M5.txt)).
- **`DRD-52`'s witness,** `tests/equivalence-check.browser.test.ts`, passes: the development check still reports the placeholder displaced along x ([log](measurements/2026-11-14-class-refactor-remediation/drd52-equivalence-check.log)). It passes in the end suite too.
- **The published `sortable/linear-shift.js`** at the end: `grep` for `advanceUnchecked`, `heldLeft`, `heldRight`, `developmentChecks`, `WeakMap`, `NaN`, `__DEV__` and `verifyEquivalence` finds nothing. At commit A the same file carried `#heldLeft = NaN` and `#heldRight = NaN`. The `.js.map` files carry the source text in `sourcesContent`, as they do at `5b581fbdf`.
- **No size row moved** from it: `sortable + y` is 20,852 / 7,243 / 6,547 at commit A and at the end. The minified bundles the size bench measures were therefore no larger at A for the two fields. Why the minifier dropped them wasn't examined.

### 6. A fresh constraint

- `BoundsConstraint`'s `#stale` starts `true`, as `5b581fbdf`'s `stale` did.
- **The witness:** `drag:DRD-63 a fresh bounds constraint` in `tests/free-drag.browser.test.ts`. Its origin rect is a 10 px square at (10, 10).
  - **Element source:** a fixed 50 px square at (0, 0), and a motion of (200, 200). The result is (30, 30), as the proof's differential found at `5b581fbdf` for the same box given as a function.
  - **No source:** a motion of (100,000, 100,000). The result is the viewport's width and height less 20, which is (1,260, 700) in the test browser. The differential's (80, 60) came from a stub window, so this case states the same rule against the real one.
- **M6,** `#stale = false`, fails both cases: (200, 200) and (100,000, 100,000) are left unclamped ([at item 6](measurements/2026-11-14-class-refactor-remediation/mutations/M6-snapshot-initial-value.log), [at the end](measurements/2026-11-14-class-refactor-remediation/mutations/at-end.txt)).

## Checks at the end

All at `42f42a164`, in the main checkout, one after another ([status and logs](measurements/2026-11-14-class-refactor-remediation/checks-end/)). The tools equal the verification report's [`tools.txt`](measurements/2026-11-14-owner-refactor/tools.txt) line for line ([this unit's](measurements/2026-11-14-class-refactor-remediation/tools.txt)): Node v26.13.0, Chrome for Testing 157.0.8103.38.

### 1. Formatting, lint and typecheck

- Every edited `.ts` file went through `fmt`, `lint-fix`, `fmt` and `lint`, as [`handoff.md`](../../../.agents/docs/handoff.md) orders. `lint-fix` changed nothing, and every file linted clean.
- **drag's `npx just lint`** exits 0.
- **drag's `npx just typecheck`** reports drag2's two `TS2724` only, at `presentation.ts` lines 13 and 15.
- **drag's `npx just fmt-check`** fails on 54 files, all under `.plan/`. The list equals the `5b581fbdf` run's, once timings are removed.
- **This report** was formatted with `npx just fmt`, and its links were checked by a scratch script. Lint doesn't apply to Markdown.

### 2. The drag suite, Chromium, all projects

759 tests: **754 pass and 5 fail.** The five failures are size rows of `drag:DRI-18` in `tests/size.node.test.ts`, the same five as at `5b581fbdf`:

- draggable alone;
- example: drop zone;
- freeDrag;
- freeDrag + bounds + landing;
- complete.

The `declaration` project passes, including `tests/callbacks.declaration.test.ts`. `5b581fbdf` had 752 tests. The 7 new ones are this unit's 3 declaration cases and its 2 browser cases. The `browser` project runs the browser cases against the source, and `consumer` runs them against the build.

### 3. The mutations

The table is in [`at-end.txt`](measurements/2026-11-14-class-refactor-remediation/mutations/at-end.txt). Each mutation was run once at its item's commit and again at the end, with the same result.

| Mutation | Result |
| --- | --- |
| Unmutated | typecheck: 0 errors outside drag2. `published-types`: 5 of 5 pass |
| M1, `MotionConstraint` as the class | `declaration` fails T3 |
| M1, `DropTargetTracker` as the class | `declaration` fails T1 and T2 |
| Receiver removed, sites 1 to 6 | each fails typecheck, with 1 TS2345 at its site |
| M5, the flag misspelled at one write | typecheck fails, TS2551 |
| M6, the snapshot's initial value | both `drag:DRD-63` browser cases fail |

### 4. Declarations against `5b581fbdf`'s build

The `5b581fbdf` build in a scratch worktree reproduced the verification report's saved hashes. The end build emits 29 `.d.ts` files, where `5b581fbdf` emits 27. [The full diff](measurements/2026-11-14-class-refactor-remediation/declarations-vs-5b581fbdf.diff.txt):

- **`free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts`:** identical.
- **`sortable/axis.d.ts`:** `DisplacementSink extends Retirable`, and `InsertionGeometry extends Invalidatable, Retirable`. The assessment adopts these supertypes, §3.
- **`sortable/axis.d.ts`:** the receivers are now `retire(this: Retirable)` and `invalidate(this: Invalidatable)`, inherited. At `5b581fbdf` they were `this: DisplacementSink` and `this: InsertionGeometry`. `DRD-63` property 2 requires them to be declared through `Retirable` and `Invalidatable`.
- **`sortable/axis.d.ts`:** `invalidate`'s JSDoc moves to `Invalidatable` (property 2).
- **`sortable/invalidatable.d.ts` and `sortable/retirable.d.ts`:** new files. The assessment adopts them, §3.
- **`sortable/layout-animation.d.ts`:** `declare const layoutAnimation` becomes `declare function layoutAnimation`. The assessment adopts it, §3.

### 5. Size

`npx just size` at commit A, in a scratch worktree with its own box-quad build, and at the end. Commit A's box-quad build is `51dc4e4f…`, the same as the verification report's edited tree. The tools are the same as the verification report's, so its `5b581fbdf` column stands and wasn't measured again ([A](measurements/2026-11-14-class-refactor-remediation/checks-A/drag-size.log), [end](measurements/2026-11-14-class-refactor-remediation/checks-end/drag-size.log), [`5b581fbdf`](measurements/2026-11-14-owner-refactor/checks/base/drag-size.log)).

Each figure is min / gz / br in bytes. The Brotli deltas are against A and against `5b581fbdf`.

| Row | `5b581fbdf` | Commit A | End | br Δ vs A | br Δ vs `5b581fbdf` | Verdict at the end |
| --- | --- | --- | --- | --: | --: | --- |
| draggable alone (control) | 6,728 / 2,422 / 2,189 | 6,728 / 2,422 / 2,189 | 6,728 / 2,422 / 2,189 | 0 | 0 | red, as at both: over by 50 B, control moved by 165 B |
| draggable + lift | 11,459 / 4,369 / 3,927 | 11,677 / 4,362 / 3,932 | 11,677 / 4,362 / 3,932 | 0 | +5 | — |
| example: resize handle | 9,264 / 3,632 / 3,283 | 9,496 / 3,607 / 3,265 | 9,496 / 3,607 / 3,265 | 0 | −18 | — |
| example: drop zone | 13,055 / 5,061 / 4,562 | 13,287 / 5,058 / 4,570 | 13,287 / 5,058 / 4,570 | 0 | +8 | red: over by 139 B, as at A |
| example: canvas group | 9,434 / 3,604 / 3,286 | 9,487 / 3,573 / 3,261 | 9,487 / 3,573 / 3,261 | 0 | −25 | — |
| freeDrag | 15,035 / 5,531 / 4,987 | 15,272 / 5,527 / 4,985 | 15,272 / 5,527 / 4,985 | 0 | −2 | red: over by 18 B, as at A |
| freeDrag + bounds + landing | 16,199 / 6,021 / 5,416 | 16,630 / 6,041 / 5,456 | 16,630 / 6,041 / 5,455 | −1 | +39 | red: over by 245 B, 246 at A |
| sortable + y | 20,137 / 7,261 / 6,555 | 20,852 / 7,243 / 6,547 | 20,852 / 7,243 / 6,547 | 0 | −8 | — |
| sortable + xy | 20,049 / 7,254 / 6,544 | 20,559 / 7,223 / 6,512 | 20,559 / 7,223 / 6,512 | 0 | −32 | — |
| complete | 21,673 / 7,915 / 7,132 | 22,568 / 7,910 / 7,150 | 22,568 / 7,910 / 7,150 | 0 | +18 | red: over by 85 B, as at A |

- **Commit A equals the verification report's edited column** on every figure.
- **The remediation moves one figure:** freeDrag + bounds + landing is −1 B Brotli, with the same minified and gzip figures. That row is the only one that reaches `bounds.ts` and item 6's initial value.
- **The control row reads 0 against A and against `5b581fbdf`,** which was predicted: it reaches no module this unit changes.
- **Rows that reach changed modules read 0:** sortable + y and complete reach `linear-shift.ts` (item 5), and drop zone and complete reach `drop-targets.ts` (items 1 and 2). Items 1, 2 and 4 are types and comments. Item 5 moves no minified figure, as the item's section says.
- No budget moved.

### 6. Allocation

Allocation is reported apart from size, and no verdict is owed: these readings are for the owner's cost reading (Q4).

- **How:** the verification report's [probe block](measurements/2026-11-14-owner-refactor/harness/allocation-probes.test.ts.txt), unchanged, was appended to `tests/hot-path.browser.test.ts` in two scratch worktrees: `5b581fbdf` and the end, `42f42a164`. Each tree builds and resolves its own box-quad: `d0e87f22…` and `51dc4e4f…`. The probes run in the `shipped` project, with `__DEV__` false, so the end arm creates no development-check map. Each probe ran in a launch of its own, as the verification report's [commands](measurements/2026-11-14-owner-refactor/allocation/commands.txt) show, through `bench/campaign.ts` ([script](measurements/2026-11-14-class-refactor-remediation/allocation/alloc.sh.txt)).
- **When:** three rounds, alternating `5b581fbdf` and the end, from 22:55:07 to 23:09:20 UTC, after the end suite had finished. Load average was 1.7 to 4.5. All six campaigns exited 0 ([readings](measurements/2026-11-14-class-refactor-remediation/allocation/readings.txt), [table](measurements/2026-11-14-class-refactor-remediation/allocation/table.txt), [load](measurements/2026-11-14-class-refactor-remediation/allocation/load.txt), [campaign status](measurements/2026-11-14-class-refactor-remediation/allocation/campaigns/)).

Sampling at 16 B, the probe's own figure per unit, three rounds each:

| Probe | Unit | `5b581fbdf` | End | Δ mean |
| --- | --- | --- | --- | --: |
| C6 `y` committed move, cold (200 crossings) | move | 116.4 / 117.1 / 117.2 | 135.4 / 139.7 / 141.3 | +21.9 |
| C6 `y` committed move, warm (after 2,000) | move | 14.8 / 15.7 / 16.0 | 15.6 / 16.7 / 16.9 | +0.9 |
| `y()` lifetime, idle (40 lifetimes) | lifetime | 3,196.2 / 3,196.7 / 3,200.1 | 2,762.0 / 2,780.1 / 2,790.1 | −420.3 |
| `y()` lifetime, one operation (40 lifetimes) | lifetime | 18,875.0 / 18,918.6 / 19,012.5 | 18,430.0 / 18,487.3 / 18,560.8 | −442.7 |

**Keyed to `sortable/linear-shift.ts:moved`,** in sampled bytes per launch:

| Probe | `5b581fbdf` | End |
| --- | --- | --- |
| C6 `y` committed move, cold (200 moves) | 1,140 / 1,524 / 1,428 | 5,964 / 6,372 / 6,276 |
| C6 `y` committed move, warm (200 moves) | 0 / 0 / 0 | 0 / 0 / 0 |
| `y()` lifetime, idle | 0 / 0 / 0 | 0 / 0 / 0 |
| `y()` lifetime, one operation (40 operations) | 740 / 488 / 652 | 2,700 / 2,692 / 2,568 |

- **The cold committed move** reads as it did at the snapshot. The verification report had +23.9 B per move, and `moved` at 1,140–1,200 B and 5,868–6,120 B per 200 moves. Here `moved` alone is about 5.7–7.6 B per move at `5b581fbdf` and 29.8–31.9 B at the end. The ranges are disjoint. This unit changes only `moved`'s `__DEV__` branch, in item 5, and the `shipped` project folds that branch away.
- **The warm committed move** samples nothing under `moved` in either arm. Its +0.9 B overlaps at 15.6 to 16.0 B.
- **The lifetimes** are lower at the end, with disjoint ranges. By key, the constructor's figure is `linearShift` 8,912–9,152 B at `5b581fbdf`, against `LinearShift` 460–552 B at the end, in the idle probe. The operated probe's `moved` share is 488–740 B at `5b581fbdf` and 2,568–2,700 B at the end, over 40 operations. The lifetime probe still has no mutation witness, as the assessment notes.

## Where the form differs from the handoff's suggestions

- **The class names** are `BoundsConstraint` and `ElementTargetTracker`. The handoff leaves them to the unit.
- **`invalidate`'s comment is on `Invalidatable.invalidate`.** `InsertionGeometry` inherits that declaration instead of redeclaring it, so the comment is on the declaration it exposes. `RectIndex` also implements `Invalidatable`, and the comment is true of it: its `invalidate` sets one flag, and it runs whenever the axis's does, on every scroll.
- **The receivers of `retire` and `invalidate` are `Retirable` and `Invalidatable`,** not `DisplacementSink` and `InsertionGeometry` as at `5b581fbdf`. Property 2 says the declaration through those interfaces carries `this`. The overload without a receiver still refuses each one, and that is the property's witness.
- **The `bounds` witness's no-source case uses the real window.** The differential used a stub window, so the expected value is the test browser's viewport less 20, not the differential's (80, 60).
- **Item 6 has its own commit.** Item 1's commit kept the snapshot's `#stale = false`, so each item is a separate commit, as the handoff asks.

## What wasn't run

- **No timing,** as the handoff says.
- **No `npm install` or `npm ci`,** and no change to `node_modules`, a lockfile or a browser. The scratch worktrees link to the main checkout's installed packages, as the verification report's did.
- **Firefox and WebKit,** and `test-engines`.
- **box-quad's checks.** No commit after A changes `packages/box-quad/`, and box-quad's nine ESLint errors were not touched.
- **The receiver removals in the `browser` project.** The proof has already run them.
- **The other allocation probes** in the verification report: the per-sample `y` and `xy` probes, XYH, and the xy and freeDrag lifetimes. The handoff names only the four above.

## Open

- **Not accepted.** `DRD-63`'s refactor still needs the recheck, the architect's reading and the owner's answer to Q4. No finding is closed here.
- **Q4,** for the owner: the size table above, and the allocation readings in §6.
- **Next:** a fresh `reviewer` rechecks the unit, as the assessment's §5 scopes it. The owner starts that review.