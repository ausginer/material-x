# Lift representation handoff

**One bounded unit for one implementer.** It implements `DRD-29` in [`00-index.md`](00-index.md): the lift's displacement becomes private, `land(x, y, timing?)` composes the landing, and `lift.js`'s value is the owner's class `Lifter`. First it repairs `DRF-2`, so that the per-sample property can be shown before `translate` changes. The analysis is in [`lift-representation-proposal.md`](lift-representation-proposal.md).

**Base:** `drag/production` at the commit that carries this file, which is `402aee6f6`'s source. On top of it are the owner's uncommitted edits to `src/lift.ts`, `src/sortable.ts` and `src/free-drag.ts`, which turn `Lifter` into a class.

**Before you start, check that the owner's edits are the ones this handoff was written against.**

- `git diff -- src | sha256sum` gives `f489261c816fe49aa14513e237b412baa84a63f0fe495359b0e37c48c421f980`.
- `git diff --shortstat -- src` gives `3 files changed, 144 insertions(+), 141 deletions(-)`.

If either is different, stop and return. Don't stash, reset or rewrite those edits.

**Do not change:**

- **The kernel's per-sample test and its reading.** `hot-path` › "should allocate per sample only the CSS string a lifted write needs" fails intermittently on unmodified source. The owner committed it with that known, and whether that is a `DRO-7` cost or the threshold's resolution is still open ([`instrument-repair-report.md`](instrument-repair-report.md)).
  - Don't change its threshold, interval, scenario, selection or assertions.
  - Don't run it on its own, and don't analyze it.
  - When a suite run includes it, record its result and figure under the report's own heading for it. That result is neither a gate nor a return condition of this unit.
- **`tests/support/commands.node.ts`.**
- **`bench/compare.ts`.** `DRF-1` and the instrument repair's item 2 are separate work.
- **Anything under `src/kernel/`, except `KernelDrag` in item 3.**
- **The contract, and the `.plan/` records other than your report and its raw output.**

**Not authorized:**

- no timing, no `compare.ts` run of any kind;
- no measurement beyond the runs this handoff names;
- no accepted cost, and no re-based ceiling or threshold.

`DRO-7` stays the owner's decision.

## Work, in order

Each item is its own commit.

### 1. The owner's `Lifter` class, with its callers

**Commit the owner's edits to the three source files exactly as they are,** with only the caller changes they require:

- `createLifter(window)` becomes `new Lifter(window)` in the 14 files that call it:
  - `bench/size/measure.ts`, whose `imports` entry names `Lifter`;
  - `tests/activation`, `authoring`, `authoring.declaration`, `classes`, `commit`, `coordinates`, `destruction`, `faults`, `focus`, `landing`, `release` and `requests`;
  - `tests/fixtures/drop-zone.ts`.
- A file that only names the `Lifter` type keeps a type-only import.
- **`type-fest` is declared in `package.json`** at `5.10.0`, the root's version, in `devDependencies`, because `lift.ts` imports it. Item 3 moves it to `dependencies` if an emitted declaration imports it. Update the lockfile with `npm install` from the repository root, and no other way.

Nothing in `src/` changes beyond the owner's edits. The DRD-29 changes to `Lifter`, such as a read-only `cancelLanding`, belong to item 3.

**Check:**

- format, lint and typecheck pass, as [handoff.md](../../../.agents/docs/handoff.md) requires;
- `just test` and `just test-engines` show only the known failures. These are the size rows already failing at `89995c27e` ([`ownership-report.md`](ownership-report.md)) and the kernel per-sample test. Any other failure is a return condition;
- the lockfile diff is the `type-fest` entry for this package only.

### 2. `DRF-2`: the per-sample test bounds the lift's bytes

**Defect:** `DRF-2` in [`00-index.md`](00-index.md) §Findings. The lift assertion checks that the only `lift.ts` key with sampled bytes is `lift.ts:translate`. It doesn't bound that key's bytes, so `translate` could allocate an object on every sample and still pass.

**Add a new test to `tests/hot-path.browser.test.ts`, Chromium only, and leave the existing tests unchanged.** It must not depend on the kernel test's result. That is why it is a separate `it`, with its own sampling.

**Required properties:**

- **Scenario:**
  - a behavior written in the test composes the lift as `lift.js` documents: one `Lifter`, `acquire` first in `activate`, and `cancelLanding` passed to `use`;
  - its `move` translates by the drag's delta plus a fixed offset that isn't an integer, such as `0.25` and `0.5`. So every displacement `translate` receives is a non-integer, whatever the pointer reports;
  - 300 samples after the threshold, as the existing test does.
- **Sampling:** 16 B interval, selected with `stopHeapSampling('/src/')` as the existing test does. Only `lift.ts:` keys are read.
- **Assertions:**
  - the only `lift.ts` key is `lift.ts:translate`;
  - its bytes per move are below the bound `B`.
- **The bound is set by this rule, which you apply, not choose:**
  1. Run the test 5 times unmutated, with the bound check disabled, and record `lift.ts:translate`'s bytes per move.
  2. `B` is the largest of the five, rounded up to a whole byte, plus 8.
  3. If the five figures differ by more than 8 B per move, stop and return, because the interval doesn't resolve a small object.
- **The comment above the assertion states the rule,** and states that `B` was measured at this item's commit. The value goes in as a literal.

**Proof, in Chromium.** Inject each mutation into a working copy, run the new test, then restore the source:

| Run | Source | Runs | Required result |
| --- | --- | --: | --- |
| Calibration | Item 1's source, bound check disabled | 5 | Record only, then set `B` |
| Unmutated | Item 1's source, with `B` | 5 | Passes in every run |
| L1: in `translate`, an object `{ x, y }` of the two arguments assigned to a module-level variable on every call | With `B` | 5 | Fails the bound in every run |
| L1 | The existing test only, with its lift assertion as it is | 1 | Passes. This shows `DRF-2` |

**Check:** the file's format and lint pass, and typecheck passes.

### 3. `DRD-29`

Implement `DRD-29`'s required properties, which this handoff doesn't restate. In short:

- **`Lift`'s members:** it keeps its seven snapshot members and loses `translatedX` and `translatedY`. No own property of the `Lift` holds the displacement.
- **`land`:** `land(x, y, timing?)` calls `timing` once, at the call. It passes the displacement, then `x - rect.x` and `y - rect.y`. It records nothing if `timing` throws. Without `timing` the defaults apply, and the last call wins.
- **The landing disposer** reads the displacement at release, as now.
- **`lift.js`:**
  - it exports `Lifter`, `Lift` and the type `LandingTiming`;
  - `Landing` is no longer exported;
  - `cancelLanding` is read-only.
- **`Writable`:** `lift.ts` uses it wherever it needs a writable view of a read-only type, and the import goes only if unused.
- **`KernelDrag`** becomes `Writable<Drag<State>>`, if that type checks with no new assertion. Otherwise it stays, and the report says why. `type-fest` moves to `dependencies` when the build's emitted declarations import it.
- **The built-ins:**
  - `sortable`'s `settle` and `free-drag`'s `settle` call `lift.land(x, y, timing)` with the timing they hold;
  - `landingTarget` returns the point;
  - the code that read the displacement goes.

**Where the displacement is held is your choice,** within `DRD-29`. Item 2's test decides whether it adds a cost on every sample. Report the form you chose, and what it allocates per operation by reading.

**Tests change only where the surface requires it:**

| File | Edit |
| --- | --- |
| `tests/authoring.browser.test.ts` | The `Lift`'s key list loses `translatedX` and `translatedY`, and the test's title says nine keys instead of eleven |
| `tests/authoring.declaration.test.ts` | `land`'s new arguments. A `@ts-expect-error` that `translatedX` is absent, if the file asserts absent members |
| `tests/landing.browser.test.ts` | `land`'s new arguments. The test at line 86 lands at `rect` plus a displacement that is always 0, because its behavior never translates, so it becomes `land(lift.rect.x, lift.rect.y)`. A fixed duration is passed as a timing, for example `landing({ duration: 50 })` from `src/sortable/landing.ts` |
| `tests/release.browser.test.ts` | `land`'s new arguments, with the same timing |
| `tests/fixtures/drop-zone.ts` | `land`'s new arguments |

A test whose expectation about behavior has to change is a return condition.

**Documentation:**

- `README.md`'s `lift.js` section (the `acquire` and `land` paragraph) states the new `Lift`, `land(x, y, timing?)` and `new Lifter(window)`;
- `lift.ts`'s module comment and JSDoc match.

**Check:**

- format, lint and typecheck pass;
- `just test` and `just test-engines` show only item 1's known failures;
- `just build` passes, and `just docs-api-prepare` reports 0 errors;
- a search of the build's `.d.ts` files for `type-fest` decides between `dependencies` and `devDependencies`, and the report records the result;
- `grep -rniE 'lift|landing' src/kernel src/draggable.ts` finds nothing;
- **the new `DRF-2` test passes in 5 runs in Chromium.** Record `lift.ts:translate`'s bytes per move in each run, beside item 2's unmutated runs.

### 4. Report, for `DRO-7`

1. **Run the [handoff](../../../.agents/docs/handoff.md) checks** on every changed file.
2. **Write `lift-representation-report.md` beside this file.** It holds:
   - your commits;
   - item 1's suite counts;
   - item 2's calibration, `B` and the proof table;
   - item 3's suite counts, build, typedoc and grep;
   - the form of the displacement, and the `KernelDrag` result.
3. **`DRO-7`'s figures for this unit, in the report's own section:**
   - **Size:** every row of `just size`, Brotli and minified, at item 1's commit and at item 3's. Each is compared with the [ownership report](ownership-report.md)'s reading at `89995c27e`.
   - **Allocation, counted by reading, with the method stated:**
     - per lifted controller, for the `Lifter`;
     - per lifted activation, inside the lift;
     - per landing.

     Each is compared with `89995c27e`.

   - **Per sample:** the `DRF-2` test's `lift.ts:translate` bytes per move before `DRD-29`, from item 2's unmutated runs, and after it, from item 3's runs.
4. **The kernel per-sample test, in its own section,** apart from `DRO-7`'s figures for this unit:
   - each result and figure from the suite runs above;
   - no interpretation, and no further runs.
5. **Put the raw output in `measurements/<date>-lift-representation.txt`,** including the diff of the owner's edits as item 1 committed them.
6. **Push and stop.**

## Return to the architect

Stop and return if:

- The owner's edits don't match the fingerprint, or item 1 needs a change to them.
- Calibration figures differ by more than 8 B per move, the unmutated test with `B` fails in any run, or L1 doesn't fail in every run.
- The `DRF-2` test fails in any run after item 3. That is a cost on every sample, and `DRD-29` doesn't accept one.
- Any test other than the kernel per-sample test and the known size rows fails, or a test's expectation about behavior has to change.
- Any change needs an edit outside this handoff's list, or under `src/kernel/` beyond `KernelDrag`.
- The work needs timing, `compare.ts`, or a measurement this handoff doesn't name.

## After this unit

- **The owner reads `DRO-7`,** with this unit's figures added to the ownership report's.
- **The kernel per-sample reading stays open,** apart from this unit. It is the instrument repair's return, for the owner and the architect.
- **The combined review** waits for the owner's `DRO-7` reading and the instrument repair's outcome. `compare.ts --prove` and the timing comparison stay deferred.