# Owner class refactor remediation: independent recheck

**By:** a `reviewer`, on 2026-11-14, on `drag/class-refactor`.

## What was read

- **Pinned to the report commit `6ec32ad06`.** It adds only files under `packages/drag/.plan/`, so its code equals `42f42a164`'s ([`input-and-scope.txt`](recheck-reviewer-probes/input-and-scope.txt): 0 files differ outside `.plan`). The main checkout was clean at `6ec32ad06` when this review started.
- **The reviewed range is `d1df32018..42f42a164`:** the six remediation commits on top of commit A. Ten files changed, all inside the handoff's boundaries. No file under `packages/box-quad/` changed.
- **Governing records:**
  - `DRD-63` properties 1 to 7, in [`00-index.md`](../../00-index.md), and what it amends;
  - the [assessment](../../owner-class-refactor-assessment.md), §5, which scopes this recheck;
  - the [handoff](../../owner-class-refactor-handoff.md);
  - the [remediation report](../../owner-class-refactor-report.md), with its evidence under [`measurements/2026-11-14-class-refactor-remediation/`](../../measurements/2026-11-14-class-refactor-remediation/);
  - CONTRIBUTING §TypeScript and §Class encapsulation.
- **The owner's answer to Q2 is taken as decided.** The inline reads and `RectIndex`'s getters are not re-argued here. Item 4 was checked only for what property 5 requires: no read moved, and no comment says otherwise.
- **Scope.** The six items, their witnesses and mutations, the declaration diff against `5b581fbdf`, development state in the publication, and the size and allocation evidence.
- **Not covered:**
  - timing;
  - Firefox and WebKit;
  - box-quad's checks;
  - a new allocation campaign. I recomputed the report's tables from its saved readings and didn't run the probes again.

## Result

**All six items meet their properties, and each witness tells the fixed code from the snapshot.** I reproduced every witness and mutation the report names, plus four of my own. The declarations, the published JavaScript, the size table and the allocation tables all match the report's evidence.

**One finding, tier C, routed to the architect.** At sites 1 to 3 the receiver is now declared as `Retirable` or `Invalidatable`. So passing one built-in's method with another built-in as its receiver now typechecks, where `5b581fbdf` refused it. Property 2 and its witness are met. The record doesn't say whether this narrowing is intended.

**Two qualifications to the report's evidence** change none of its results (§The report's claims).

## Method

- **Three scratch worktrees,** each detached, with `node_modules` linked to the main checkout's installed packages and `@ydinjs/*` linked to the worktree's own packages:
  - `5b581fbdf` (box-quad build `d0e87f22…`);
  - commit A, `d1df32018` (`51dc4e4f…`);
  - the end, `42f42a164` (`51dc4e4f…`). Each built its own box-quad and drag.
- **Mutations** were applied in the scratch trees, and each file was restored from its own copy. After every script, `git status --porcelain` in the tree was empty.
- **Chromium only,** through drag's `vitest.config.ts`. No timing, no dependency change and no budget change.

## The items

| Item | Property | What I checked | Result |
| --- | --- | --- | --- |
| 1 | `DRD-63` 1 | `.d.ts` diff against `5b581fbdf`; M1 by content; the classes stay private | **Met** |
| 2 | `DRD-63` 2 | The six receiver removals, typechecked; `callbacks.declaration.test.ts` unchanged; a swapped-receiver probe | **Met.** See `class-refactor-recheck-1` |
| 3 | `DRD-60` 2 | `tsconfig.json` against `5b581fbdf`; drag's lint | **Met** |
| 4 | `DRD-63` 5 | Read diff; `grep` of the comments | **Met** |
| 5 | `DRD-63` 4 | `grep` of `src`; M5; D1 and D2 against `DRD-52`'s witness; the published JavaScript at all three commits | **Met** |
| 6 | `DRD-63` 3 | M6; the new cases at `5b581fbdf`, at A and at the end | **Met** |

### 1. Published slot types

- **`bounds.d.ts` and `drop-targets.d.ts` are identical to `5b581fbdf`'s** (`cmp`). Of 29 emitted `.d.ts` files at the end, 25 are identical to `5b581fbdf`'s, 2 differ and 2 are new. Their content is the report's [declaration diff](../../measurements/2026-11-14-class-refactor-remediation/declarations-vs-5b581fbdf.diff.txt), and every hash equals the report's [`drag-dts-hashes.txt`](../../measurements/2026-11-14-class-refactor-remediation/checks-end/drag-dts-hashes.txt) ([diff](recheck-reviewer-probes/dts-diff.txt), [hashes](recheck-reviewer-probes/dts-end-hashes.txt)).
- **`BoundsConstraint` and `ElementTargetTracker` are module-private.** Neither is exported, and no emitted `.d.ts` names either one.
- **M1 discriminates** ([run](recheck-reviewer-probes/m1.txt)). In each mutation, the interface keeps its body under another name, and the class is exported under the published name.
  - With `MotionConstraint` as the class, the `declaration` project fails T3 only. The reason is that the object literal lacks the class's `#window`, `#box`, `#held`, `#stale` and `#resolve`.
  - With `DropTargetTracker` as the class, it fails T1 and T2.
  - Unmutated, it passes 5 of 5.
  - Neither mutation adds a typecheck error in `src`.
- **The witness types its cases through each entry's source module,** `../src/free-drag/bounds.ts` and `../src/free-drag/drop-targets.ts`. This file's existing cases do the same. The emitted declarations are checked by the `cmp` above, not by the test.

### 2. Receivers

- **Each removal fails typecheck with one TS2345 at its site,** at the six positions the report lists, and adds no other error ([run](recheck-reviewer-probes/receivers-end.txt)). I reused the proof's [mutator](../owner-class-refactor/proof-reviewer-probes/receiver-mutate.mjs.txt) and [runner](../owner-class-refactor/proof-reviewer-probes/receiver-typecheck.sh.txt) unchanged.
- **Unmutated,** typecheck reports only drag2's two `TS2724`.
- **`tests/callbacks.declaration.test.ts` is byte-identical to `5b581fbdf`'s, and passes** in the full suite.
- **No seventh site.** Every two-argument `requestStep` and `use` call in `src` is one of the six. `FrameTask` takes a closure, and `kernel.use(lifter.cancelLanding)` passes an arrow property, which keeps its form.
- **The swapped-receiver probe** is `class-refactor-recheck-1` below.

### 3. `tsconfig.json`

- `packages/drag/tsconfig.json` at `42f42a164` is identical to `5b581fbdf`'s.
- Drag's `npx just lint` exits 0 at the end ([log](recheck-reviewer-probes/lint-end.txt)).

### 4. Inline reads and comments

- **No read moved.** `y.ts` and `xy.ts` are identical at A and at the end. In `LinearShift.refresh`, the diff from A changes only the comment and the `__DEV__` blocks (item 5), and once `__DEV__` is false, nothing else.
- **The two false comments are gone or corrected.** The corrected `RectIndex` class comment states what the code reads. `y()` reads `first` and `end`, and `xy()` and the shift rule read `count`.
- **`grep -n -i 'read once\|once per'`** over `src` lists the same 15 lines as the report ([output](recheck-reviewer-probes/read-once-grep.txt)). I read the scan-path ones against the code:
  - `y.ts:49`, where `anchor` is read before the loop;
  - `rect-index.ts:282`, where `first` and `end` are local constants, each used twice;
  - `drop-targets.ts:114`.

  Each is true.

- **A wider `grep`** for "outside the" and "hoist" in `sortable/` and `free-drag/` finds no other claim about reads.

### 5. Development-only state

- **`src` has no `@ts-expect-error` and no `@ts-ignore`** at `42f42a164`.
- **The state is typed** as `DevelopmentCheck` in a module-scoped `WeakMap` that exists only when `__DEV__` is true. `LinearShift` has no field, property or member for it. CONTRIBUTING §Class encapsulation keeps mutable class state in `#private` fields, but property 4 rules a field out, and the handoff names this form.
- **M5 fails typecheck** with one TS2551 at `linear-shift.ts(256,37)` ([run](recheck-reviewer-probes/mutations.txt)).
- **`DRD-52`'s witness reads the moved state.** My mutations break the state at each end of its flow, and each fails `equivalence-check.browser.test.ts` ([run](recheck-reviewer-probes/dev-check.txt)):
  - **D1:** `moved` never sets `advanceUnchecked`;
  - **D2:** `refresh` never captures `heldLeft` and `heldRight`.

  In the whole `browser` project, each fails that one test and passes the other 358.

- **The publication.** In the built `.js` files ([greps](recheck-reviewer-probes/dev-names.txt)):
  - None of the 33 at `5b581fbdf` or at the end contains `advanceUnchecked`, `heldLeft`, `heldRight`, `developmentChecks`, `DevelopmentCheck`, `WeakMap`, `NaN`, `__DEV__` or `verifyEquivalence`.
  - At commit A, `sortable/linear-shift.js` carries `#heldLeft = NaN` and `#heldRight = NaN`, at 4,030 B. At the end it is 3,800 B ([output](recheck-reviewer-probes/linear-shift-js.txt)).

### 6. A fresh constraint

I appended the two new `drag:DRD-63` cases to each tree's test file and ran them in the `browser` project ([run](recheck-reviewer-probes/mutations.txt)):

| Tree | Result |
| --- | --- |
| `5b581fbdf` | 2 of 2 pass |
| Commit A | Both fail: (200, 200) and (100,000, 100,000) aren't clamped |
| The end | 2 of 2 pass in `browser`, and 2 of 2 in `consumer`, against the build |
| M6, the end with `#stale = false` | Both fail, with the same values |

So the cases state `5b581fbdf`'s behavior, including the no-source case's expected values against the real window, (1,260, 700).

## Published structural compatibility

- **The two slot entries' declarations are unchanged** from `5b581fbdf`.
- **`sortable/axis.d.ts`, `layout-animation.d.ts` and the two new files** differ exactly as the report lists, and the assessment §3 adopts those differences. `DRD-2` keeps the axis and displacement interfaces unpublished, though their declarations are emitted.
- **The receiver type in `axis.d.ts`** is `class-refactor-recheck-1`.

## Size

- **I ran `bench/size/measure.ts` again** on my own builds of `5b581fbdf` and the end ([`5b581fbdf`](recheck-reviewer-probes/size-base.txt), [end](recheck-reviewer-probes/size-end.txt)).
- **Every row's minified, gzip and Brotli figures equal:**
  - the report's commit A and end logs;
  - the verification report's `5b581fbdf` log.
- **The report's deltas follow from these figures.** The only movement from A is −1 B Brotli on "freeDrag + bounds + landing". The same five rows are red, by the same margins.
- **Item 5 and the size bench.** The size bench minifies with `rolldown` (`minify: true`), and its rows don't move from A to the end, though A's unminified published file carried the two fields. Like the report, I didn't examine why. The property is about the publication, and the published files are clean at the end.

## Allocation

- **I recomputed the report's tables** from its saved [`readings.txt`](../../measurements/2026-11-14-class-refactor-remediation/allocation/readings.txt), with no new campaign. Every per-unit figure, mean delta and `linear-shift.ts:moved` value equals the report's §6 tables, and the constructor keys are as stated.
- **The campaign log** shows six exits of 0, alternating `5b581fbdf` and the end, with load 1.7 to 4.5.
- **This supports what the report says, and nothing more:**
  - the cold committed move still allocates more at the end, about +22 B per move here;
  - the warm move overlaps;
  - lifetimes are lower, with disjoint ranges.
- **Allocation is not speed,** and these readings carry no timing claim. The lifetime probe still has no mutation witness.

## The full suite

At the end, in my worktree, all projects in Chromium ran 759 tests: 754 pass and 5 fail. The five failures are the `drag:DRI-18` size rows the report names ([log](recheck-reviewer-probes/logs/suite-end.log)).

## Findings

### Receivers at sites 1 to 3 are checked against the supertype (`class-refactor-recheck-1`)

- **Tier:** C. Routed to the architect.
- **Current behavior.** `Retirable.retire` declares `this: Retirable`, and `Invalidatable.invalidate` declares `this: Invalidatable`. `InsertionGeometry` and `DisplacementSink` inherit them. At `5b581fbdf`, the receivers were `this: InsertionGeometry` and `this: DisplacementSink`.
- **Evidence.** A typecheck-only [probe](recheck-reviewer-probes/wrong-receiver.ts.txt) passes the axis's `retire` with the sink as its receiver, and the sink's `retire` with the axis. At `5b581fbdf` both lines fail with TS2739. At `42f42a164` both typecheck ([run](recheck-reviewer-probes/wrong-receiver.txt)).
- **Why it matters.** At `5b581fbdf`, the closures' `retire` never read `this`, so a swapped receiver was refused by types and harmless at run time. Now `YAxisGeometry.retire` reads `this.#shift`, and `LayoutAnimationSink.retire` reads `this.#running`. So a swapped receiver is accepted by types and would throw at run time. That follows from how private fields work in JavaScript; I haven't run it. No built-in site is wrong today, and removing a receiver is still refused. The `@ts-expect-error` descriptions in `callbacks.declaration.test.ts` still say that `retire` "declares the axis" and "declares the sink" as its receiver. The declared receiver is now `Retirable`. Property 2 requires that test to stay unchanged.
- **What the record says.** Property 2 requires "the overload without a receiver refuses it". It also says that where a member is declared through `Retirable` or `Invalidatable`, "that declaration carries `this`". It doesn't say whether that receiver may be the supertype, or whether a site must still refuse a receiver of another built-in type, as `5b581fbdf`'s declarations did. `DRD-35` property 1's rule, "a receiver of another type is refused", holds for the kernel's signatures. At these three sites, though, any `Retirable` or `Invalidatable` now counts as the same type.
- **Required property:** for the architect to state. Either the narrowing is accepted, or each of sites 1 to 3 refuses a receiver of another built-in type.

## The report's claims

All of the report's results reproduced. Two qualifications:

- **The saved M1 diff for `bounds.ts` doesn't apply at the end.** [`M1a.diff.txt`](../../measurements/2026-11-14-class-refactor-remediation/mutations/M1a.diff.txt) is a normal diff, located by line numbers, taken at item 1's commit. Item 6 then added two lines to `bounds.ts`. Applied at `42f42a164` with `patch`, it inserts the type export inside `bounds()` and breaks the file. The case still fails, but on `TS7006` ([log](recheck-reviewer-probes/logs/M1a-line-number-diff.log)). [`at-end.txt`](../../measurements/2026-11-14-class-refactor-remediation/mutations/at-end.txt) records the failing case but not its error, so how the end run applied M1 can't be checked from the record. Applied by content, M1 reproduces the reported result at the end (§1).
- **The Godbolt probe isn't in the repository.** Property 5 cites "a temporary Godbolt (Compiler Explorer) probe" in support of the owner's Q2 approval. The report records that the three untracked files are gone from the root, and that what removed them isn't established. The record already calls the probe temporary and a diagnostic, so the approval doesn't depend on re-reading it. I don't dispute Q2.

## Evidence limits

- **Typecheck and Chromium only.** Firefox and WebKit weren't run.
- **The runtime fault** in `class-refactor-recheck-1` is by reading.
- **I didn't run the allocation probes again.** I checked the report's arithmetic and saved readings.
- **The raw `vitest` logs** keep their trailing whitespace and the scratch-tree prefix, which is replaced with `<scratch>/`.

## Scratch work

- **Removed:**
  - the three scratch worktrees, with their builds;
  - the probe files appended or copied into them. Each was restored before its worktree went.
- **No background process remains.**
- **The main checkout's tracked files are unchanged.** This review adds files only under `packages/drag/.plan/reviews/owner-class-refactor-remediation/`.

## Next

The architect reads this recheck and disposes of `class-refactor-recheck-1`, and the owner answers Q4. This review closes no finding, changes no source and opens no PR.