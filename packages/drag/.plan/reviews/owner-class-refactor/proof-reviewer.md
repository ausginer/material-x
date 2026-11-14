# Owner class refactor: feature proof

**Lens:** `reviewer`, feature proof. The owner asked for an independent review of the owner's box-quad and drag refactor on `drag/class-refactor`, against the baseline `5b581fbdf`. The inputs are the owner's uncommitted edits and [`owner-refactor-verification-report.md`](../../owner-refactor-verification-report.md) with its evidence under [`measurements/2026-11-14-owner-refactor/`](../../measurements/2026-11-14-owner-refactor/). The governing records are [`contract.md`](../../contract.md), [`00-index.md`](../../00-index.md) and `CONTRIBUTING.md`.

## What was read

**The reviewed code isn't committed.** It is a working-tree snapshot on `drag/class-refactor`, whose `HEAD` is the report commit `00fc1aa28`. It is identified by the saved input, and I read it only in that form:

- the tracked diff against `HEAD` has SHA-256 `019cd4569ca6526d443bf354414e56c122a868f6cd242216bdc9f95a4149c508`, and it is byte-identical to [`input/tracked.diff.txt`](../../measurements/2026-11-14-owner-refactor/input/tracked.diff.txt);
- all 16 files, the 14 tracked ones and the untracked `src/sortable/invalidatable.ts` and `src/sortable/retirable.ts`, match [`input/hashes.txt`](../../measurements/2026-11-14-owner-refactor/input/hashes.txt);
- `git status --porcelain` equalled [`input/status-before.txt`](../../measurements/2026-11-14-owner-refactor/input/status-before.txt) before I wrote anything ([check](proof-reviewer-probes/input-check.txt)).

**The report commit and the snapshot are different things.** `00fc1aa28` adds only files under `packages/drag/.plan/`, so its code is `5b581fbdf`'s, and the diff against `5b581fbdf` outside `.plan/` has the same hash. The report and its evidence are committed at `00fc1aa28`. The reviewed code exists only in the main checkout's working tree and in my scratch copy of it.

**Trees.** Two scratch worktrees in my session's scratch directory, both detached at `00fc1aa28`:

- **base:** unedited, so its code is `5b581fbdf`'s;
- **edited:** the saved diff applied and the two untracked files copied in. All 16 hashes match the input.

Each tree's `node_modules` links to the main checkout's packages, entry by entry, and its `@ydinjs/*` links point at its own packages, except the two Vite plugins, which are unchanged build tooling. I built box-quad and drag in both trees. Each tree's box-quad `index.js` and `index.d.ts`, and drag's `.d.ts` files, hash to the report's figures for that tree ([builds](proof-reviewer-probes/build-check.txt)).

**The owner's input is preserved.** I never staged, formatted or edited a file in the main checkout outside this review's directory. At the end, the 16 hashes, the diff hash and the status still match the input, apart from this review's own directory ([check](proof-reviewer-probes/input-check.txt)).

**Scope:**

- every hunk of the diff, read against the baseline;
- the five areas of the request;
- the governing decisions `DRD-33` (capability slots), `DRD-34` and `DRD-35` (step and disposer receivers), `DRD-37` (`unbound-method`), `DRD-52`, `DRD-61` and `DRD-62` (the geometry cache), and `DRD-56` and `DRD-60` (the tsconfig line);
- the report's method, its harness diffs and its allocation readings.

**Not run:** timing of any kind, Firefox, WebKit, the full suite in every project, campaigns, and any change to dependencies or budgets. I ran Chromium only.

## Result

- **The conversions keep the runtime behavior on every supported path I tested.**
  - `FrameTask` gives the baseline's trace exactly.
  - `dropTargets` gives the baseline's DOM trace, and only the receiver form differs.
  - The browser project passes all 357 tests in the edited tree.
  - Every new class is released: a per-operation object after its operation ends, and a per-controller object after destruction, each with a witness that the instrument sees it while it is alive.
- **box-quad is behaviorally equivalent.** 60,002 differential cases of `projection` and `localDelta` are identical, and every other edit names the same built-in function as before.
- **Six findings.**
  - **Three tier B**, each contradicting a recorded decision:
    - the published `DropTargetTracker` and `MotionConstraint` refuse third-party objects;
    - the receiver declarations that `DRD-35` and `DRD-37` require are gone, so the `DRD-35` declaration test fails;
    - drag's lint fails because of the `tsconfig.json` edit.
  - **Three tier C:**
    - reads that were deliberately kept outside per-candidate loops moved back into them;
    - dev-only state is undeclared, or ships in production;
    - `MotionConstraint`'s first `apply` doesn't clamp before an `invalidate()`.
- **Performance evidence.**
  - The per-arm resolution is sound.
  - Timing shows no difference, which is inconclusive.
  - The reported cold-move increase is reproduced. It is neither a fixed cost nor constant per move: it falls as the code warms up (§Cold committed moves).
  - The lifetime allocation probe still has no witness.

## Method

- **Differential probes under node,** importing the baseline and edited TypeScript side by side with stub windows, elements and drags ([script](proof-reviewer-probes/differential.ts.txt), [output](proof-reviewer-probes/differential.txt); box-quad: [script](proof-reviewer-probes/box-quad-pure.ts.txt), [output](proof-reviewer-probes/box-quad-pure.txt)).
- **Receiver mutations.** [`receiver-mutate.mjs`](proof-reviewer-probes/receiver-mutate.mjs.txt) removes one receiver argument at one call site. [`receiver-typecheck.sh`](proof-reviewer-probes/receiver-typecheck.sh.txt) typechecks each mutation in both trees, and [`receiver-run.sh`](proof-reviewer-probes/receiver-run.sh.txt) runs Chromium's `browser` project under each one in the edited tree. Each script restores the file from its own copy, because a `git checkout` would revert the edited tree to the baseline.
- **A heap probe** counts each new class by constructor name with the instrument that the destruction tests use ([test](proof-reviewer-probes/lifetime.browser.test.ts.txt), [log](proof-reviewer-probes/browser/lifetime.log)).
- **A declaration probe** fills `freeDrag`'s slots with third-party objects through the published entries and the built `.d.ts` files of each tree ([probe](proof-reviewer-probes/third-party-slots.ts.txt), [output](proof-reviewer-probes/third-party-slots.txt)).
- **One allocation probe:** the report's cold committed-move block at three sample counts ([block](proof-reviewer-probes/cold-scaling.test.ts.txt), [runner](proof-reviewer-probes/cold-scaling.sh.txt)).
- **Paths and whitespace.** The outputs are unedited, except that my scratch directory's path is replaced by the tree's name (`base`, `edited`) and colour codes are stripped from the browser logs. In the two typecheck outputs I trimmed the trailing space that my own `tr` join added. The browser logs keep Vite's `(client) warning:` line with its trailing space and vitest's final blank line, which `git diff --check` reports in each of them.

## The factory-to-class conversions

| Unit | Baseline | Edited | Behavior | Evidence |
| --- | --- | --- | --- | --- |
| `FrameTask` | `createFrameTask` closure | class with `#handle` and one `#fire` per instance | **equal** | coalescing, cancellation and rescheduling from `run` give the same trace |
| `dropTargets` tracker | closure object | `DropTargetTracker` class | **equal DOM trace**, receiver form differs | marks, unmarks, rect reads and release are the same, including a `targets()` that throws after the release is registered |
| `bounds` | installer closure, `stale = true` | `MotionConstraint` class, `#stale = false` | **differs before the first `invalidate()`**, equal after it | `class-refactor-reviewer-6` |
| `layoutAnimation` sink | closure object, `satisfies DisplacementSink` | `LayoutAnimationSink` class | equal by reading | the `displacement-sink` and destruction tests pass, and the sink is released after destruction |
| `linearShift` | closure object | `LinearShift` class | equal logic by reading | the read hoists go (`-4`), and so does dev-only state (`-5`) |
| `y()`, `xy()` | closure objects | `YAxisGeometry`, `XYAxisGeometry` | equal logic by reading | the read hoists go (`-4`) |
| `SortableBehavior.invalidate` | own arrow property, requested alone | prototype method, requested with `behavior` | coalesces by the pair, as before by identity | `-2` (the step's recorded form) |
| field order in both behaviors | — | `#window` and `#lifter` assigned after the public fields | no observable effect: no assignment reads another | reading |

The ids in the table are short for `class-refactor-reviewer-<n>`.

### Callback receivers

The built-in methods now read their own `#private` state, so every site that passes one needs its receiver at runtime. At baseline, three of those sites were guarded by a type: the method's declared `this`.

| Site | Baseline typecheck, receiver removed | Edited typecheck, receiver removed | Edited `browser` project, receiver removed |
| --- | --- | --- | --- |
| `drag.use(this.axis.retire, this.axis)` | TS2345 | **no new error** | 25 failed: `Cannot read properties of undefined (reading '#shift')` |
| `drag.requestStep(this.axis.invalidate, this.axis)` | TS2345 | **no new error** | 2 failed |
| `kernel.use(displacement.retire, displacement)` | TS2345 | **no new error** | 4 failed: `… (reading '#running')` |
| `kernel.requestStep(behavior.invalidate, behavior)` | (new site) | **no new error** | 10 failed |
| `drag.use(this.#release, this)` in the tracker | (new site) | **no new error** | 5 failed: `… (reading '#frame')` |
| `drag.requestStep(this.#resolve, this)` in the tracker | (new site) | **no new error** | 8 failed |

Typecheck: [base](proof-reviewer-probes/receiver-typecheck-base.txt), [edited](proof-reviewer-probes/receiver-typecheck-edited.txt). The edited tree's only errors are the two `TS2578` and the two drag2 `TS2724`, with or without the mutation. Runs: [summary](proof-reviewer-probes/receiver-run-summary.txt), with one log per mutation under [`browser/`](proof-reviewer-probes/browser/). Unmutated, the edited tree passes 357 of 357.

**So the guard moved from the types to the suite.** Every removal is caught at runtime, by 2 to 25 tests, and none by typecheck. That contradicts `DRD-35` property 7 and `DRD-37` property 4, and it is the cause of the `DRD-35` declaration test failure (`class-refactor-reviewer-2`).

### Frame coalescing and cancellation

`FrameTask` keeps one handle, requests one frame however many times `schedule` runs, clears the handle before `run`, so `run` can schedule again, and cancels only a pending frame. The [trace](proof-reviewer-probes/differential.txt) is identical in both trees:

```text
raf#1 | fire#1 | run | raf#2 | fire#2 | run | raf#3 | caf#3 | raf#4 | fire#4 | run
```

- **The tracker's step** is `#resolve` with the tracker as its receiver, where it used to be the closure alone. Steps coalesce by the pair (`DRD-35` property 3), and both the pair and the closure are one per operation, so coalescing is unchanged.
- **`sortable`'s frame task** is still cancelled by a closure disposer, as `DRD-35` property 7 requires of `frame.cancel`.

### Invalidation

- **The axes' `invalidate` and the `sortable` controller's step** do what they did. The DRI-14 and DRI-8 tests that the `behavior-invalidate` mutation fails all pass unmutated, among them "should pull once for two invalidate calls in one callback" and "should rebase a surviving gap on invalidate during a drag".
- **`MotionConstraint.invalidate`** is unchanged. The exception is its initial state (`class-refactor-reviewer-6`).
- **The tracker's `invalidate`** marks the rects stale, as before. The trace shows the re-read after it.

### Resource lifetime

The lifetime probe composes each case with its controller held only in an inner function's frame. It runs one operation held at its peak, then two more operations, then `requestDestroy()`. It then counts each class by constructor name ([log](proof-reviewer-probes/browser/lifetime.log)):

| Composition | During the first operation | After 3 operations, controller alive | After destruction |
| --- | --- | --- | --- |
| `y()` + `layoutAnimation()` | `FrameTask` +1, `LinearShift` +1, `YAxisGeometry` +1, `RectIndex` +1, `LayoutAnimationSink` +1, `SortableBehavior` +1 | the same without `FrameTask` | none |
| `xy()` + `layoutAnimation()` | `FrameTask` +1, `XYAxisGeometry` +1, `RetainingRectIndex` +1, `LayoutAnimationSink` +1, `SortableBehavior` +1 | the same without `FrameTask` | none |
| `freeDrag` + `bounds()` + `dropTargets()` | `FrameTask` +1, `MotionConstraint` +1, `DropTargetTracker` +1, `FreeDragBehavior` +1 | `MotionConstraint` +1, `FreeDragBehavior` +1 | none |

- **The first column is the witness:** the instrument sees each per-operation object while it lives, so the zeros in the next column are readings, not blind spots.
- **Per-controller state** is one instance per controller, which is `DRD-33` C2's installer and `DRF-5`'s cache.
- **Per-operation state** is gone once its operation ends.

### Displacement animations

`LayoutAnimationSink` holds what the closure held, now in fields:

- the running map;
- the local delta;
- the carried `dx` and `dy`, behind getters.

`report`, `displaced` and `retire` are line-for-line equal. The `finished` handler now captures the sink instead of the map. The sink is released after destruction (the table above), so the handler adds no retention. The tests that observe the sink pass unmutated, and the `sink-retire` mutation fails four of them:

- "should call the axis and the sink on themselves";
- "should keep a row animation past the terminal, until destruction";
- "should cancel a running landing and the row animations";
- "should retain no item, behavior, view or behavior instance after 3 operations and destruction".

## box-quad

Every runtime edit is one of these:

- a hoisted alias replaced by the global it was taken from: `parse` by `Number.parseFloat`, `finite` by `Number.isFinite`, `abs` and `min` by `Math.abs` and `Math.min`;
- `view` inlined at its two uses in `coordinates`;
- numeric literals at the output slots named by module constants, `QUAD_X1` to `QUAD_Y4` and `DELTA_X` and `DELTA_Y`.

Each alias is the same function object as its replacement, so the calls are unchanged. Two consequences follow from reading:

- `coordinates` now reads `ownerDocument.defaultView` only after its early return on an element with no rects, and twice instead of once. Neither read has a side effect.
- A page that replaces `Number.parseFloat` or `Math.min` after box-quad loads now reaches box-quad. No contract covers that.

The [differential probe](proof-reviewer-probes/box-quad-pure.txt) compares `projection`, with and without `relativeTo`, and `localDelta` over 20,000 random inputs each, plus the singular bases. Some inputs are special values: `±0`, `±Infinity`, `NaN`, `1e±300`. Return values and every output slot compare with `Object.is`, including outputs left untouched: **60,002 cases, 0 different.** The DOM paths rest on reading and on the suite, which passes 242 of 242 in both trees, as the report records. The report's "the same `index.d.ts`" holds in my builds.

## Published structural compatibility

### Third-party slot values

The contract says "A third party may fill a slot whose type is published". `DRD-33` choice 4 says "A third party that needs another presentation fills the slot with its own tracker". Choice 8 publishes `DropTargetTracker` and keeps `bounds.js` exporting its types.

The [probe](proof-reviewer-probes/third-party-slots.txt) typechecks, against each tree's built declarations:

- T1, a tracker of the third party's own;
- T2, a tracker that wraps the built-in one and logs each drop;
- T3, a bounds capability of the third party's own;
- T4 and T5, the types named and the slots filled.

| Case | Baseline | Edited |
| --- | --- | --- |
| T1: own `DropTargetTracker` | passes | **TS2322: `Property '#private' is missing`** |
| T2: a tracker that wraps the built-in one | passes | **TS2322: `Property '#private' is missing`** |
| T3: own `MotionConstraint` | passes | **TS2741: `Property '#private' is missing`** |
| T4, T5 | pass | pass |

Even delegation fails: a wrapper that forwards every member to the library's own tracker isn't a `DropTargetTracker`. `class-refactor-reviewer-1`.

### Receiver declarations and the declaration test

- `axis.d.ts` loses `retire(this: DisplacementSink)`, `invalidate(this: InsertionGeometry)` and `retire(this: InsertionGeometry)`. They become `retire(): void` and `invalidate(): void`, through `Retirable` and `Invalidatable`.
- `tests/callbacks.declaration.test.ts` lines 172 and 174 fail with `TS2578`, in the `declaration` project and in typecheck, as the report says. I reproduced both, unmutated, in the edited tree ([output](proof-reviewer-probes/receiver-typecheck-edited.txt)). `class-refactor-reviewer-2`.

### Other declaration changes, read and not findings

- `layoutAnimation` becomes a function declaration. Its call signature is the same.
- `DropTargetTracker.current` becomes a getter, still read-only.
- The two new `.d.ts` files ship under `sortable/` with no `.js` beside them ([builds](proof-reviewer-probes/build-check.txt)).
- `Retirable` and `Invalidatable` appear only in `implements` and `extends` clauses. No parameter or variable is typed by either.
- `InsertionGeometry.invalidate`'s JSDoc ("Staleness only, because scroll calls it many times a second.") is gone from `axis.d.ts`. `axis`'s types aren't published (`DRD-39`).
- `DRD-61` property 6 says the sink "holds `dx` and `dy` in closure variables behind getters". They are now private fields behind getters. The record's wording is the architect's to read against it, and I don't count it as a defect.

## The tsconfig-related lint regression

- The edit removes `./.plan/probes/callback-list/allocation.ts` from `tsconfig.json`'s `include`.
- At baseline, drag's `just lint` exits 0. In the edited tree, oxlint reports 11 type-aware errors in that probe, and ESLint reports it as "not found by the project service" ([report log](../../measurements/2026-11-14-owner-refactor/checks/edited/drag-eslint-only.log)).
- Nothing in the class refactor needs the edit. The probe imports only `src/kernel/callbacks.ts`, which the diff doesn't touch, and it typechecks at baseline.
- `class-refactor-reviewer-3`.

## Performance evidence

### Per-arm dependency resolution and controls

- **`compare.ts`.** I read [`compare-and-lab.diff.txt`](../../measurements/2026-11-14-owner-refactor/harness/compare-and-lab.diff.txt).
  - The stock script aliases `@ydinjs/box-quad` to the working tree's file for every arm. The copy gives the `before` arm the archived `packages/box-quad/src` at `--before` instead, so each arm bundles its own drag and its own box-quad.
  - The check that this held is the bundle dump, which the report describes: `out[0] = x` against `out[DELTA_X] = x` in `localDelta`, and no `MotionConstraint` class in `before`.
  - `control: production` is the stock script's own A/A arm (`bench/compare.ts:2137` at `HEAD`), unchanged by the copy.
- **The xy() harness** resolves box-quad by the importer's tree, and the report's saved bundle holds two `localDelta` functions.
- **box-quad `coordinates`** compares whole files, with `base2` as the A/A arm.
- **The size control row** reads 0/0/0, and it reaches no edited module, which is predicted.
- **I find no defect in the arms.**

### Timing

Every row of all three instruments reads "no difference shown", which is inconclusive. Case C, `y()`'s scan of a grown window, is higher in 7 of 7 rounds by +0.123 µs, against an A/A bound of 0.163 µs. The rule doesn't flag it, and I don't read it as a slowdown.

It is, though, the case that times `YAxisGeometry.resolve`'s candidate loop, and that is where the edit moved `first`, `end` and `pointerY` back inside the loop (`class-refactor-reviewer-4`). Speed is unmeasured in either direction.

### Cold committed moves

The report reads +23.9 B per committed move in `y()`, over 200 crossings after 100 unsampled ones, all of it keyed to `sortable/linear-shift.ts:moved`. The figure is an average over one window, so I asked whether it is a fixed cost spread over the moves or a cost per move. I ran the same block at 50, 200 and 800 sampled crossings, each count launched alone, alternating the trees, in two rounds ([readings](proof-reviewer-probes/cold-scaling.txt), with one log per launch under [`browser/`](proof-reviewer-probes/browser/)). Bytes keyed to `moved`:

| Sampled moves | Baseline | Edited | Edited minus baseline | Per sampled move |
| --: | --- | --- | --- | --- |
| 50 | 384, 384 | 1,368, 1,620 | 984 to 1,236 | 20 to 25 B |
| 200 | 1,296, 1,140 | 6,000, 6,024 | 4,704 to 4,884 | 24 B |
| 800 | 2,616, 2,520 | 12,720, 13,308 | 10,104 to 10,788 | 13 B |

- **The report's figure is reproduced:** +24 B per move over 200 moves, in both rounds.
- **It isn't a fixed cost.** The excess grows with the number of moves.
- **It isn't a constant cost per move either.** It is about 9 B per move between 200 and 800 moves, against about 24 B before that. Together with the report's warm probe, which samples nothing in `moved` after 2,000 crossings, the excess falls as the code warms up.
- **I don't establish the mechanism,** and I don't read it as a speed effect.
- **The report's wording is accurate for its own window,** and its tiering caveat is consistent with these readings. No finding.
- `rect-index.ts:shift` reads about 13 KB at 200 and at 800 moves in both trees, so it is a fixed cost there. It doesn't differ between the trees.

### The other allocation readings

- **Less allocation per controller lifetime, −118 to −732 B.** This is consistent with reading:
  - each baseline factory call made a closure per member;
  - each class instance shares its methods through its prototype.

  The lifetime probe has no mutation witness, as the report says. My heap probe shows that the instances are released. It doesn't witness the byte figures.

- **Retained after 200 operations and destroy, −728 B,** from `compare.ts`'s own rule.
- **Warm per-sample and warm committed-move readings** overlap. The report calls them inconclusive, and I agree.
- **The report doesn't infer speed from allocation.**

## Findings

#### The published `DropTargetTracker` and `MotionConstraint` refuse every third-party object, including a wrapper of the library's own (`class-refactor-reviewer-1`, tier B)

- **Finding:** the edit turns the published interfaces `DropTargetTracker` and `MotionConstraint` into type-only exports of classes that carry `#private`.
- **Current behavior:** through the published entries and declarations, a `DropTargets` that returns the third party's own tracker fails with TS2322, a tracker that wraps the built-in one fails the same way, and a `BoundsInstaller` that returns the third party's own constraint fails with TS2741. All three pass at baseline ([probe](proof-reviewer-probes/third-party-slots.txt)). At runtime nothing checks identity, so such an object would still work, behind a cast.
- **The requirement it contradicts:**
  - the contract's §Capabilities: "A third party may fill a slot whose type is published";
  - `DRD-33` choice 4: "A third party that needs another presentation fills the slot with its own tracker";
  - choice 8, which publishes `DropTargetTracker` and keeps `bounds.js`'s types;
  - the `DropTargets` JSDoc: "A third party may supply its own".
- **Why it is a problem:** the package's documentation tells an integrator to do something that its published types now refuse. This is a public-surface change, made without a decision.
- **Required property:** the published slot types and the contract's statement about third-party slot values agree.
- **Route:** the architect. This is a public-surface call (`DRD-33`, `DRD-39`, the contract). Tier B: no runtime behavior changes, and a correct integrator is misled by what the package says.

#### The receiver declarations that `DRD-35` and `DRD-37` require are gone, so the `DRD-35` declaration test fails and typecheck no longer guards any built-in receiver site (`class-refactor-reviewer-2`, tier B)

- **Finding:** `InsertionGeometry.invalidate`, `InsertionGeometry.retire` and `DisplacementSink.retire` no longer declare `this`.
- **Current behavior:**
  - `tests/callbacks.declaration.test.ts:172` and `:174` fail with `TS2578`.
  - Removing the receiver at any of the three sites that `DRD-35` property 7 names adds no typecheck error. At baseline each removal gives TS2345 ([base](proof-reviewer-probes/receiver-typecheck-base.txt), [edited](proof-reviewer-probes/receiver-typecheck-edited.txt)).
  - Because the built-ins now read `#private` state, each removal throws at runtime, for example `Cannot read properties of undefined (reading '#shift')`. The `browser` project catches every removal, with 2 to 25 failures.
  - The edit adds three receiver-dependent sites, and no type guards them either: `sortable`'s `invalidate` step and the tracker's `#release` and `#resolve`.
  - `sortable`'s `invalidate` step changes form, from an arrow function requested alone to a method requested with `behavior`. `DRD-35` property 7 lists this step among those that keep their form. `DRD-34` property 8, as `DRD-35` amends it, allows a method with a stable receiver in general. Its coalescing, by the pair, is unchanged.
- **The requirement it contradicts:**
  - `DRD-35` property 7: the three members "declare their `this`, so … removing the receiver at one of these sites fails typecheck";
  - `DRD-37` property 4, the same;
  - the comment in `packages/drag/eslint.config.ts`, which disables `unbound-method` because "A method that declares `this` is still checked by typecheck at those calls".
- **Why it is a problem:**
  - A test the repository runs fails.
  - The reason `DRD-37` gave for turning the lint rule off no longer holds for any built-in site.
  - The edit raises what a missing receiver costs, from nothing to a fault, and removes the type check that would find one.
- **Required property:** either the records and the code agree on whether these members declare their receiver, or the declaration test and the property it witnesses are decided again. This is a decision, not a defect to repair in place.
- **Route:** the architect, with `DRD-35` property 7, `DRD-37` property 4 and `DRD-34` property 8. Tier B: the repository's instrument for this property, the declaration test with typecheck, fails. Runtime behavior is unchanged while every receiver is passed.

#### The `tsconfig.json` edit drops the allocation probe from the project, so drag's lint fails (`class-refactor-reviewer-3`, tier B)

- **Finding:** `packages/drag/tsconfig.json` no longer includes `./.plan/probes/callback-list/allocation.ts`.
- **Current behavior:**
  - `just lint` exits 1. Oxlint reports 11 type-aware errors in the probe, and ESLint reports a parsing error ([log](../../measurements/2026-11-14-owner-refactor/checks/edited/drag-eslint-only.log)).
  - The probe's own header still says "The package's tsconfig includes this file, so typecheck and lint cover it".
- **The requirement it contradicts:**
  - the callback-list completion's accepted deviation 1: "A later `.ts` file under `.plan/` needs its own entry, or the package's lint fails";
  - `DRD-60` property 1, which names the probe as the file "which `tsconfig.json` typechecks", and property 2, which requires `tsconfig.json` to equal its text at `f7b7b300b`, where the line is present.
- **Why it is a problem:**
  - The package's lint gate is red for every later unit.
  - The probe loses typecheck coverage, and nothing says so.
  - Nothing in the refactor needs the edit.
- **Required property:** drag's lint exits 0, and every `.ts` file under `.plan/` that lint reaches is in the project.
- **Route:** the owner and the architect. No decision is needed unless the probe's coverage is meant to end. Tier B: a repository instrument fails.

#### Reads that the record kept outside per-candidate loops are back inside them, and two comments still say otherwise (`class-refactor-reviewer-4`, tier C)

- **Finding:** the conversions drop the local reads that sat outside the scan loops.
- **Current behavior:**
  - `YAxisGeometry.resolve` reads `this.#index.end` and `query.pointerY` per candidate, where `{ first, end }` and `{ pointerY }` were read once.
  - `XYAxisGeometry.resolve` reads `this.#index.count`, `query.pointerX` and `query.pointerY` per candidate.
  - `XYAxisGeometry.moved` reads `context.displacement` per reported row, where `{ displacement }` was read once.
  - `LinearShift.refresh` reads `this.#index.count` through its getter on each iteration of the forward growth loop, where `{ count }` was read once.
  - [`linear-shift.ts:151`](../../../src/sortable/linear-shift.ts) still says "Read once, outside the loops." above code that no longer reads anything once.
  - `RectIndex`'s class comment still says "each axis rule reads the slot range it scans once per resolution".
- **The requirement it contradicts:**
  - The [alias cleanup](../../alias-cleanup-report.md) removed single-use aliases at the owner's request. It kept exactly these reads, "hoisted out of a per-slot, per-candidate or hit-test loop", with a comment at each site.
  - The feature-composition handoff required "each axis reads the getters once per resolution, outside the candidate loop".
  - `CONTRIBUTING.md` Part II §14 bars adding hot-path work without measurement and owner approval.
- **Why it is a problem:** this is hot-path work that the record had settled, changed as a side effect, and two comments now state what the code doesn't do. The only timing case on this path is inconclusive: it is higher in 7 of 7 rounds, inside the A/A bound. I make no speed claim.
- **Required property:** the code's comments state what the loops read. Whether the hoists go is the owner's call under §14, and the code and the comments state the same answer.
- **Route:** the owner, with the architect. Tier C: there is no observed consumer effect.

#### Dev-only state is undeclared in the class, or ships in production (`class-refactor-reviewer-5`, tier C)

- **Finding:** `LinearShift`'s development check keeps three values.
- **Current behavior:**
  - `advanceUnchecked` is an undeclared public property, written and read through five `// @ts-expect-error: dev-only expression` lines. At baseline, `src` has no `@ts-expect-error`.
  - A misspelling at the `moved` write (`advanceUncheked`) adds no typecheck error. Only the `DRD-52` witness test catches it ([output](proof-reviewer-probes/dev-typo.txt)).
  - `#heldLeft` and `#heldRight` are class fields. They ship in the published `sortable/linear-shift.js` as `#heldLeft = NaN; #heldRight = NaN;` on every instance, although production never writes or reads them. The baseline's published file has no trace of either ([builds](proof-reviewer-probes/build-check.txt)).
- **The requirement it contradicts:**
  - `CONTRIBUTING.md` §Class encapsulation: "Keep mutable class state in `#private` fields. Public instance … fields must be `readonly`".
  - `tsdown.config.ts`'s `__DEV__` define, which "Folds the guarded development instruments to dead code".
  - The field comment's own "Written only inside `__DEV__` branches", which reads as a promise that the state folds away.
- **Why it is a problem:**
  - The directives silence every error on their lines, not just the one they were written for.
  - Production pays for two fields that only development uses.
  - Nothing outside development observes either.
- **Required property:** dev-only state is declared and encapsulated as the class rule requires, and the production build carries none of it.
- **Route:** the owner. Tier C.

#### `MotionConstraint`'s first `apply` doesn't clamp until `invalidate()` has run (`class-refactor-reviewer-6`, tier C)

- **Finding:** `#stale` starts `false` and `#held` starts `null`. The baseline's closure started with `stale = true`.
- **Current behavior:**
  - `bounds(source)(window).apply(motion, rect)` with no earlier `invalidate()` leaves the motion unclamped: 200, 200 where the baseline gives 30, 30. With no source, it gives 500, 500 where the baseline gives 80, 60 ([output](proof-reviewer-probes/differential.txt)).
  - After the first `invalidate()` both trees agree.
  - `freeDrag` calls `invalidate()` in every `activate` before the first `translate`, so no `freeDrag` operation sees the difference. The `DRF-5` tests pass.
- **The requirement it contradicts:** none for a host. The contract makes the hosts `freeDrag`, `sortable` and the lift, and `freeDrag` meets "measured again in each operation before that operation first uses it". The object's own correctness now depends on its caller's order, where the baseline's didn't.
- **Why it is a problem:** a third party or a future host that calls the published installer's result without invalidating first gets no containment, silently.
- **Required property:** a fresh constraint either clamps on its first `apply`, or the published type says that `invalidate()` must come first.
- **Route:** the owner. Tier C: no supported path observes it.

## The report's claims

| Claim | My check |
| --- | --- |
| The input and its preservation | Reproduced: hashes, diff and status (§What was read) |
| box-quad 242/242, drag 747/752 in both trees | Not rerun in full. The edited `browser` project passes 357/357 |
| The new `TS2578` at lines 172 and 174 | Reproduced |
| The lint regression and its cause | Agreed (`-3`) |
| Format: no owner-edited file fails | Not rerun |
| The size table | Not rerun. My box-quad and `.d.ts` builds hash to the report's figures |
| The declaration facts, including the third-party note | Agreed, and extended to `MotionConstraint` and to wrappers (`-1`) |
| Timing: no difference shown | Agreed: inconclusive. Case C's direction falls on the path of `-4` |
| Allocation: cold committed move +23.9 B | Reproduced at 200 moves. The excess grows with the moves and its rate falls as the code warms up (§Cold committed moves) |
| The lifetime probe has no mutation witness | Agreed |

## Evidence limits

- Chromium's `browser` project only, apart from the scaling probe, which ran in the `shipped` project as the report's block does. I didn't run the consumer, shipped or declaration projects under mutation.
- I didn't rerun the full suite, size, format or timing.
- `LayoutAnimationSink`, `LinearShift`, `YAxisGeometry` and `XYAxisGeometry` are equal to the baseline by reading and by the suite. I wrote no DOM differential for them.
- The heap probe witnesses release, not the allocation figures.

## Scratch work

- **Removed:**
  - the two scratch worktrees, with their builds;
  - the temporary probe files in them: the copied test, the `rv-probe` directory, and the appended block in each tree's `tests/hot-path.browser.test.ts`, which each runner restored before the worktree went.
- **Still in my session's scratch directory:** copies of the probe scripts and logs. Everything cited is saved here.
- No background process remains. The main checkout's input is unchanged, as §What was read records.

## Next

The architect and the owner dispose of `class-refactor-reviewer-1` to `-6`. Findings 1 and 2 need decisions on the published slot types and on `DRD-35`'s receiver property. This review changes no source, closes no finding and opens no PR.