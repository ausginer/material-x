# Owner class refactor: remediation handoff

**For:** one `implementer` unit on `drag/class-refactor`. **Base:** the branch at the commit that carries this file. The main checkout's working tree holds the owner's uncommitted snapshot.

**The snapshot is the input, and it is preserved.** Its tracked diff against `HEAD`, outside `packages/drag/.plan/`, has SHA-256 `019cd4569ca6526d443bf354414e56c122a868f6cd242216bdc9f95a4149c508`. Its 16 files match [`input/hashes.txt`](measurements/2026-11-14-owner-refactor/input/hashes.txt). **Check both before anything else.** If either differs, return without changing anything.

**Governing records:**

- **`DRD-63`, properties 1 to 7,** in [`00-index.md`](decisions/), and what it amends: `DRD-35` property 7, `DRD-37` property 4, `DRD-34` property 8 and `DRD-61` property 6;
- **`DRO-13`;**
- **`DRD-60` property 2;**
- **`DRD-52`'s development check;**
- the [assessment](owner-class-refactor-assessment.md), with the owner's answer to Q2, and Q1 and Q3 with their defaults;
- the [feature proof](reviews/owner-class-refactor/proof-reviewer.md) and the [verification report](owner-refactor-verification-report.md);
- **CONTRIBUTING:** Part I §TypeScript and §Class encapsulation, and Part II §1.1, §14 and §15.

**The owner's questions.** Q2 was answered on 2026-11-14, and item 4 builds that answer. This handoff builds the defaults of Q1 and Q3. If the record holds a different answer to Q1 or Q3 when you start, follow it where it is unambiguous. Otherwise return before commit A.

**Chromium only,** with the container's Chrome as `.scripts/vitest-config.ts` configures it. **One set of tools:** don't run `npm install` or `npm ci`, and don't change `node_modules`, a lockfile or a browser. **No timing.**

## Commit A: the snapshot, verbatim

Under Q1's default, stage exactly the 16 files and commit them unchanged. Use a subject that names the change, for example `drag, box-quad: convert the built-in closures to classes`. Don't format, lint-fix or edit anything first.

After the commit, check two things, and record both in the report with commit A's id:

- `git diff 5b581fbdf A -- . ':(exclude)packages/drag/.plan'` has the input's hash;
- the two new files match their saved hashes.

Every later item is a separate commit, or a set of commits, on top of A.

## Items

Each item names its finding, its property and its witness. **You own the form,** within the property and the boundaries.

### 1. Published slot types are interfaces (`class-refactor-reviewer-1`, `DRD-63` property 1)

- `free-drag/bounds.ts` and `free-drag/drop-targets.ts` export `MotionConstraint` and `DropTargetTracker` as interfaces again, with their `5b581fbdf` members and JSDoc. `current` stays `readonly current: HTMLElement | null`.
- The class that implements each one is module-private, declares `implements`, and has a name of its own. Choose the names for clarity.
- **The emitted `free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts` are byte-identical to `5b581fbdf`'s.** If one can't be, return with the difference.
- **Witness:** add `drag:DRD-63` cases to `tests/published-types.declaration.test.ts`. Through the public entries, they type:
  - a third party's own `DropTargets` that returns its own `DropTargetTracker`;
  - one that returns a tracker wrapping the built-in one;
  - a `BoundsInstaller` that returns the third party's own `MotionConstraint`.

  The proof's [probe](reviews/owner-class-refactor/proof-reviewer-probes/third-party-slots.ts.txt) has these cases as T1 to T3. **Mutation M1:** export either type as the class again, and the `declaration` project fails.

### 2. Receivers are declared (`class-refactor-reviewer-2`, `DRD-63` property 2)

- **Each built-in method that `requestStep` or `use` receives with its receiver declares `this`,** so the overload without a receiver refuses it. There are six sites:
  1. `drag.use(this.axis.retire, this.axis)`;
  2. `drag.requestStep(this.axis.invalidate, this.axis)`;
  3. `kernel.use(displacement.retire, displacement)`;
  4. `kernel.requestStep(behavior.invalidate, behavior)` in `sortable.ts`;
  5. the tracker's `drag.use(this.#release, this)`;
  6. the tracker's `drag.requestStep(this.#resolve, this)`.
- **Keep `Retirable` and `Invalidatable`.** Where a member is declared through one of them, that declaration carries `this`.
- **Keep the comment.** The JSDoc that `5b581fbdf` gave `InsertionGeometry.invalidate` ("Staleness only, because scroll calls it many times a second.") stays on the declaration that `InsertionGeometry` exposes.
- **`tests/callbacks.declaration.test.ts` passes unchanged.**
- **Witness:** remove the receiver at each of the six sites, one at a time. Each mutation must fail typecheck, and the proof saw each one fail the `browser` project. The proof's [mutator](reviews/owner-class-refactor/proof-reviewer-probes/receiver-mutate.mjs.txt) and [typecheck runner](reviews/owner-class-refactor/proof-reviewer-probes/receiver-typecheck.sh.txt) may be reused in a scratch copy. Each must restore the file from its own copy, never with `git checkout`.

### 3. `tsconfig.json` includes the probe (`class-refactor-reviewer-3`, `DRD-60` property 2)

- Restore `./.plan/probes/callback-list/allocation.ts` to `include`. `packages/drag/tsconfig.json` then equals its text at `5b581fbdf`.
- **Check:** drag's `npx just lint` exits 0.

### 4. Inline reads and true comments (`class-refactor-reviewer-4`, `DRD-63` property 5, the owner's answer to Q2)

- **The reads stay inline, as the snapshot has them.** Don't hoist any read in `YAxisGeometry.resolve`, `XYAxisGeometry.resolve`, `XYAxisGeometry.moved` or `LinearShift.refresh`.
- **`RectIndex` keeps `first`, `end` and `count` as getters.** Don't convert them to methods. The owner withdrew that proposal.
- **Remove the false "read once" comments, or correct them** to state what the code reads:
  - in `linear-shift.ts`, "Read once, outside the loops.", which stands above no read;
  - in `RectIndex`'s class comment, the claim that each axis rule reads its slot range once per resolution.
- **Keep the true ones:**
  - `y.ts`'s "Read once, outside the candidate loop.", above the anchor;
  - `rect-index.ts`'s "Read once: each is used twice below.";
  - `drop-targets.ts`'s "Read once, outside the hit-test loop.".
- **Check:**
  - `grep -rn -i 'read once\|once per' packages/drag/src` lists only comments that the code below them bears out. List each one in the report;
  - the item changes comments only, so it needs no measurement of its own.

### 5. Dev-only state (`class-refactor-reviewer-5`, `DRD-63` property 4)

- **No `@ts-expect-error` and no `@ts-ignore` in `src`.**
- **The state that only `__DEV__` code reads or writes is typed,** and isn't on the class's public surface. In the snapshot that state is `advanceUnchecked`, `#heldLeft` and `#heldRight`.
- **The published `sortable/linear-shift.js` carries none of it,** as at `5b581fbdf`: no field, property or initializer that only development code uses. A class field ships whatever its initializer, so this state can't be a field of `LinearShift`. One form that meets the property is module-scoped storage that exists only under `__DEV__`, keyed by the instance.
- **Witnesses:**
  - **mutation M5:** misspell the flag at one write, and typecheck fails;
  - `DRD-52`'s development check still fails under its existing witness, the `equivalence-check` tests;
  - `grep` the published `sortable/linear-shift.js` for each dev-only name, and report the result.

### 6. A fresh constraint clamps (`class-refactor-reviewer-6`, `DRD-63` property 3)

- A new `MotionConstraint` measures at its first `apply`, before any `invalidate()`, as at `5b581fbdf`.
- **Witness:** a `drag:DRD-63` test in `tests/free-drag.browser.test.ts` applies a fresh `bounds(source)(window)`, with an element source and with none, and expects the clamp. The proof's [differential](reviews/owner-class-refactor/proof-reviewer-probes/differential.txt) has the expected values. **Mutation M6:** the snapshot's initial value fails the test.

## Boundaries

**Change only:**

- `packages/drag/src/free-drag/bounds.ts` and `drop-targets.ts`;
- `packages/drag/src/sortable.ts`;
- `packages/drag/src/sortable/axis.ts`, `behavior.ts`, `invalidatable.ts`, `retirable.ts`, `linear-shift.ts`, `rect-index.ts` (its class comment only), `y.ts` and `xy.ts`. In `y.ts` and `xy.ts`, change only what item 2 needs, and move no read;
- `packages/drag/tsconfig.json`: item 3 only;
- `packages/drag/tests/published-types.declaration.test.ts` and `tests/free-drag.browser.test.ts`: the new `drag:DRD-63` cases only;
- **records:** `owner-class-refactor-report.md`, and files under `measurements/2026-11-<day>-class-refactor-remediation/`.

**Don't change:**

- `packages/box-quad/`;
- `layout-animation.ts`, `shared/invalidation.ts` and `free-drag/behavior.ts` beyond commit A;
- any other test, `bench/`, a budget or the control figure, `tsdown.config.ts`, `package.json`, `files.json` or a Vitest configuration;
- `.plan/probes/` and `.plan/reviews/`;
- the existing errors: drag2's two `TS2724`, the `.plan/` format failures, and box-quad's nine ESLint errors. If `lint-fix` changes a line that this unit doesn't otherwise change, revert that change and record it.

**Return** if a property can't be met inside these boundaries, or if one needs a change to a decision.

## Checks at the end

1. **Formatting, lint and typecheck,** as [`handoff.md`](../../../.agents/docs/handoff.md) orders, on every edited file:
   - drag's `npx just lint` exits 0;
   - drag's `npx just typecheck` reports drag2's two `TS2724` only;
   - `just fmt-check` fails on the same `.plan/` list as at `5b581fbdf`.
2. **The drag suite,** all projects, in Chromium: `node`, `browser`, `consumer`, `shipped` and `declaration`. Only size rows may fail. Name each failing row.
3. **The mutations:** M1, the six receiver removals, M5 and M6, each with its result.
4. **Declarations:** diff the emitted `.d.ts` files against `5b581fbdf`'s build.
   - `free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts` are identical.
   - Every other difference is one the assessment adopts, or one that this unit's properties cause. Each difference gets one line in the report.
5. **Size:** `npx just size` at commit A and at the end. Report each row as min / gz / br, with its verdict, and the Brotli delta against commit A and against the verification report's `5b581fbdf` column. If the tools differ from that report's [`tools.txt`](measurements/2026-11-14-owner-refactor/tools.txt), measure `5b581fbdf` as well. No budget moves.
6. **Allocation:**
   - **Which probes:** the C6 `y` committed move, cold and warm, and the `y()` lifetime probe, idle and with one operation.
   - **How:** the verification report's [block](measurements/2026-11-14-owner-refactor/harness/allocation-probes.test.ts.txt), each probe launched alone as its [commands](measurements/2026-11-14-owner-refactor/allocation/commands.txt) show, in scratch copies.
   - **Rounds:** three, alternating `5b581fbdf` and the end.
   - **Report** the readings keyed to `sortable/linear-shift.ts:moved`, as the report did. These readings are for the owner's cost reading (Q4). No verdict is owed.

## Report

Write `owner-class-refactor-report.md`, which states:

- commit A and the input check;
- one row for each item: its property, the witness and the result;
- every check above, with the evidence saved under `measurements/`;
- each place where the form differs from what this handoff suggests, and why;
- what wasn't run.

Commit and push, then stop. **Next:** a fresh `reviewer` rechecks the unit, as the assessment's §5 scopes it. The owner starts that review.