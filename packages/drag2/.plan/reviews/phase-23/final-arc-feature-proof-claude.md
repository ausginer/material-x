# Final arc — feature proof

Implementation against the plan, the contract and the tests, for the arc `0beb9900..43b9f520` on `drag2/fin-review` — D-156, D-158 and D-159.

**Files read at `43b9f520`.** The working tree is `f670a0b4`; `43b9f520` is an ancestor and `git diff 43b9f520..HEAD` touches nothing under `src/`, `bench/`, `tests/` or `.plan/measurements/`, so every file quoted is byte-identical at both. Only the resulting production behaviour is reviewed; the abandoned intermediate designs the arc passed through are not.

**No production code was modified.** Findings marked _measured_ were established with throwaway browser fixtures under `packages/drag2/tests/probe/`, which were deleted after the readings were taken; `git status` carries no residue of them.

## Scope

**Covered.**

- `src/sortable/linear-shift.ts`, `src/sortable/rect-index.ts`, `src/sortable/y.ts`, `src/sortable/xy.ts`, `src/sortable/layout-animation.ts`, `src/sortable/slots.ts`, `src/sortable/feature.ts`, `src/sortable/assemble.ts`, `src/sortable/config.ts`, and the committed-move bracket, `invalidateInSeam`, `release.prepare`/`release.effect` and `retire` in `src/sortable/spec.ts`.
- The seam contract the axes publish: the G1…G5 clause block on `y()` and `xy()`, `InsertionGeometry.moved`, `DisplacementContribution`, `DisplacementReport`, `DisplacementSettle`.
- Failure provenance for `movedInsertion`: the retained `catch`, the stage it reports, and the double-failure latch ordering, against `runPhase` / `failOperation` in `src/kernel/seams.ts` and `src/kernel/kernel.ts`.
- The size instrumentation: all fifteen rows in `bench/size/measure.ts`, the assertions in `tests/bench/size.node.test.ts`, and the two tables appended to `.plan/measurements/budget-rebases.md`.
- Full suite run: `65 files, 1204 passed | 75 skipped`, green. Size measurement run: `npx just size`, all fifteen rows under budget.

**Not covered.** The keyboard/command path's interaction with displacement (a command performs one placeholder write in `release.effect` and never calls `movedInsertion`, so no contribution is ever started for it — noted, not reviewed); `free-drag/` and `shared/`; the landing tail and `D-155`'s deferred work; the kernel outside the failure-latch path; `tests/perf/` as instrumentation; accessibility; the unshipped `x()` axis.

---

## reviewer-1 — tier A

**The hole advance in `shiftSpan` treats cached _presented_ extents as _flow_ extents, so the cached placeholder position drifts on two layouts the arc's own published contract says are supported.**

`src/sortable/linear-shift.ts` advances the placeholder from the crossed slots' cached edges:

```ts
const width = hole[end]! - hole[start]!;
const spacing = (delta < 0 ? -delta : delta) - width;
...
travelled += b - a + spacing;
...
const holeStart = hole[start]! + (delta < 0 ? travelled : -travelled);
```

`b - a` is a _presented_ extent read out of the cache, and `spacing` is one scalar assumed to be the flow gap between every pair of crossed rows. The per-row displacement is correct — it is the measured same-element constant, and the instrument confirms the slot values — but the hole is not, whenever a crossed row's presented extent differs from its flow footprint, or whenever the inter-row flow spacing is not the single number `constant − placeholderExtent`.

**Reproduction (measured, Chromium, `DEV` build).** Five 100×40 rows in a `flex; flex-direction: column` container, `y()`, drag row 0 down the list and back:

| fixture | result |
| --- | --- |
| `gap: 0`, no margins | clean |
| `gap: 12px` | clean |
| per-item `margin-bottom: 10px`, flex container | `drag: the predicted insertion geometry disagreed with a full scan at **the placeholder**; G3-linear does not hold for this list` |
| per-item `margin-bottom: 10px`, block container | same error |
| row 1 carrying `rotate: 20deg` | same error |
| row 1 carrying `scale: 1 2` | same error |

The rotate case reproduces in **three frames** — one warm frame, one committed move, one rebuild — and the mismatch is always reported at the placeholder, never at a slot, which is the mechanism above and not a broken per-row prediction. A control with the authored row placed _outside_ the crossed span is clean.

**Two published statements this falsifies, both introduced by this arc** (`git show 0beb9900:packages/drag2/src/sortable/y.ts` carries no clause block at all):

- `src/sortable/y.ts` §G1-presented, which reaches the published `.d.ts`: _"whatever authored presentation a row wears — a `translate`, a `rotate`, a `scale`, an ancestor's transform — travels with the row… Authored presentation is fully supported"_. `translate` is; `rotate` and `scale` are not.
- `.plan/contract/00-index.md` D-156, which states the clauses _"permit unequal item sizes, `box !== item`, `display: contents` and **per-item margins**"_. Per-item margins are the commonest of the four in a real list.

**Why it matters beyond the instrument.** Under D-157 no periodic resync ships and the shipped build has no equivalence check, so the drift accumulates for the remainder of the operation. The value that drifts is `hole[CENTRE_Y]`, which is the hysteresis incumbent every candidate is compared against in `y()`'s `resolve` — so a `margin-bottom` list resolves later moves against a placeholder centre that is progressively wrong by roughly one margin per crossed row. In a `DEV` build the consumer instead receives a classified `DraggableError` and the operation ends.

**And it is a regression against the pre-arc tree, not only a contract gap.** `git show 0beb9900:packages/drag2/src/sortable/y.ts` line 144 reads `const anchor = centreOf(placeholder);` — the anchor was _measured live on every spatial frame_, so no drift could survive one frame. D-157 moved that read to once per rebuild (`RectIndex.hole`) and D-158 left the advance arithmetic as the only thing maintaining it between rebuilds.

**Required property.** The placeholder position the cache holds after a committed move must equal the position a full scan would read, for every list the axis's published clauses admit — or the clauses must state the narrower domain the advance can actually honour.

---

## reviewer-2 — tier A

**`layoutAnimation()` applies a viewport-space delta as a `translate` in the element's local coordinate space, so a composition under an ancestor transform animates by the wrong distance.**

The axis reports vectors derived from `getBoundingClientRect()` values — viewport units. `src/sortable/layout-animation.ts` spends them as `element.animate([{ translate: \`${sx}px ${sy}px\` }, …])`, and `translate` is resolved in the element's own containing block, which an ancestor transform scales.

**Reproduction (measured, Chromium).** A wrapper with `scale: 2; transform-origin: 0 0` around a `flex-direction: column` list of five 100×40 rows, `y()` + `layoutAnimation({ duration: 100000, easing: 'linear' })`; drag row 0 downward:

```
y=100  item1.top=80.0   translate=none        errors=0
y=130  item1.top=160.0  translate=0px 80px    errors=0     <- should be 80.0
y=200  item1.top=80.0   translate=none        errors=1
       drag: the predicted insertion geometry disagreed with a full scan at slot 0;
       G3-linear does not hold for this list
```

The row's flow travel is 40 local px = 80 viewport px; the sink issues `translate: 0px 80px`, which the ancestor scales to 160 viewport px, so the row starts its inverse-FLIP twice as far out as it travelled and visibly jumps the wrong way. On the next rebuild `settle` subtracts the issued vector rather than the rendered one, so the cache disagrees with the tree and the instrument fires.

**Control.** The identical fixture with `layoutAnimation()` removed is clean — `item1.top` goes `80 → 0`, no errors. So the axis prediction is correct under a uniform ancestor scale and only the sink is wrong; the two halves are separable.

`xy()` has the same exposure through the same sink, with no equivalence instrument to catch it, since `xy()` never predicts.

**What it falsifies.** The same newly published G1-presented clause on `y()` and `xy()`, which names _"an ancestor's transform"_ among the presentation that is fully supported, and `layout-animation.ts`'s own reasoning that `translate` _"is outside the element's own transform and needs no correction"_ — true of the element's own transform, not of an ancestor's.

**Required property.** Either a reported vector and the space the sink spends it in are the same space, or the published clause states that an ancestor transform between the container and its rows is outside the supported composition.

---

## reviewer-3 — tier B

**The middle-tier contract documents still state the deleted `plugins` slot and the deleted `beforeMove`/`afterMove` pipeline in un-struck present tense.**

D-157 deletes `plugins`, `SortablePlugin` and `SortablePluginContribution`, and D-158 replaces the two-slot pipeline with `moved(frame, runtime, report)`. The code agrees: `src/sortable/config.ts:4` says _"there is no appending slot left since `plugins` was deleted"_, and `LAST_WINS_KEYS` carries `displacement` and no `plugins`. Only `contract/00-index.md` was edited in this arc.

`.plan/contract/README.md` states the reading rule these documents are governed by: _"01–07 … Present, revised in place"_, _"The term in force is the unstruck text"_, and struck text is the mechanism for a retired term. Un-struck, in force today, and false of the code:

- `01-construction-ownership.md:204` — ``layoutAnimation()` returns `{ plugins: [ … ] }``
- `03-feature-composition.md:32-35` — the same, as a code block
- `03-feature-composition.md:125` — `plugins?: readonly PluginInstaller[];` in the `SortableConfig` listing
- `03-feature-composition.md:133` — _"`AxisInstaller`, **`SortableLandingInstaller` and `SortablePlugin`** are re-exported from `sortable.js`"_
- `03-feature-composition.md:165, 180, 208, 210` — the merge table's plugin-array row and the append-order rule
- `03-feature-composition.md:200, 246` — the plugin-position composition check
- `03-feature-composition.md:300, 316` — the `beforeMove` capture and _"`release.prepare` therefore runs the `beforeMove` pipeline before it measures"_
- `04-frame-slicing.md:172` and `challenge-response.md:42` — _"both feature pipelines (`beforeInsertionMove`, `afterInsertionMove`) run in `action.effect`"_
- `06-vertical-sortable-trace.md:43, 46, 58-61, 354, 365` — the whole trace, including `for slots.beforeMove` / `for slots.afterMove`
- `04-frame-slicing.md:268` — _"`sortable/verified-refresh.ts`'s per-frame equivalence instrument"_, a module this arc deleted

**The instruments cannot see it.** `tests/references.node.test.ts`, `tests/decisions.node.test.ts` and `tests/docs.node.test.ts` are green (60 passed): they resolve headings, declared ids and backticked repository paths, not whether prose describes a seam that exists. This is the class `00-index.md` §_Decisions not yet implemented_ names in its own opening — a contract stated in the present tense by documents while the code says otherwise.

**Required property.** A term the arc retired is struck where it stands, per this directory's own rule, so that a review citing 01–07 reads the contract in force rather than the one before D-157.

---

## reviewer-4 — tier B

**After this arc, no always-on test asserts a byte figure on any composition the arc changed.**

`tests/bench/size.node.test.ts:233` gates the fifteen budget assertions:

```ts
const ENFORCE_BUDGETS = process.env['DRAG2_SIZE_BUDGETS'] === '1';
describe.skipIf(!ENFORCE_BUDGETS)('the declared budgets', …)
```

Verified: a default run reports `28 passed | 15 skipped`; with `DRAG2_SIZE_BUDGETS=1`, `43 passed`. The `control` block added at `482507fd` is always on, and the seven rows carrying `control` are, verbatim from `bench/size/measure.ts`: `free drag minimal` (7750), `free drag + bounds` (7897), `free drag + landing` (8017), `free drag complete` (8151), `vocabulary root - drag.js` (142), `kernel root - kernel.js` (6063), `baseline B` (6889). **None of the seven has a `sortable/` module in its graph** — four declare `absentPrefixes: ['sortable/']`, one declares `only: ['kernel/errors.js']`, one declares `absentPrefixes: ['sortable/', 'free-drag/']`, and `baseline B` bundles the _shipped_ package.

So the mechanism introduced to close F-208 — _"119 B and 229 B move onto the two non-animating compositions across a whole pass without a red row anywhere"_ — covers exactly the rows that cannot move and leaves the eight that do (`minimal`, `minimal (xy)`, `minimal + layoutAnimation`, `xy + layoutAnimation`, `minimal + landing`, `complete`, `both behaviors`, `baseline A`) with no enforced number at all in a default run. The comment at `tests/bench/size.node.test.ts:231` states the mute is deliberate and says _"Unmute at finalization"_, so this is a live obligation rather than an oversight — but it is an obligation the arc's own closing commit did not discharge, and it is the reason the D-158 and D-159 tables in `.plan/measurements/budget-rebases.md` are unasserted evidence.

**What did reproduce.** `npx just size` at this tree returns the new row at **10.04 kB brotli / 31 modules**, matching D-159's recorded `10045 B at 31 modules` byte-exactly, and every one of the fifteen rows is under budget.

**Required property.** A recorded byte figure the record leans on is asserted by a test that runs by default, or the record says which of its numbers are not.

---

## reviewer-5 — tier C — determination on `remainingOf()`

**The owner's hypothesis is confirmed as stated and is a comment defect only. No runtime behaviour relies on the `[0, 1]` range.**

Measured in Chromium, a two-keyframe `translate` animation from `100px` to `0`, sampling `getComputedTiming().progress` beside the element's own `getBoundingClientRect().left`:

| easing | `progress` | `1 - progress` | rendered `left` |
| --- | --: | --: | --: |
| `linear`, 10 % | 0.100167 | 0.8998 | 89.9833 |
| `linear`, 50 % | 0.500333 | 0.4997 | 49.9667 |
| `cubic-bezier(0,1,0,1)`, 10 % | 0.846589 | 0.1534 | 15.3411 |
| `cubic-bezier(0,1,0,1)`, 50 % | 0.991242 | 0.0088 | 0.8758 |
| `cubic-bezier(.5,-.6,.5,1.6)`, 5 % | **−0.052621** | **1.0526** | 105.2621 |
| `cubic-bezier(.5,-.6,.5,1.6)`, 20 % | **−0.097990** | **1.0980** | 109.7990 |
| `cubic-bezier(.5,-.6,.5,1.6)`, 80 % | **1.098230** | **−0.0982** | −9.8230 |
| `cubic-bezier(.5,-.6,.5,1.6)`, 95 % | **1.052031** | **−0.0520** | −5.2031 |

Two facts follow, and together they settle it.

1. **`progress` is the transformed progress**, as the comment claims: at 10 % of a `cubic-bezier(0,1,0,1)` timeline it reads 0.8466, not 0.1. An overshooting easing — reachable, since `easing` is an unchecked `LayoutAnimationOptions` member — drives it below 0 and above 1, so `1 - progress` genuinely leaves `[0, 1]`. The JSDoc's _"in `[0, 1]`"_ is false.
2. **The rendered offset equals `issued × (1 - progress)` at every sample, including the out-of-range ones** — 105.2621 against 1.0526, −9.8230 against −0.0982. CSS extrapolates past the endpoints, which is what an overshoot _is_. Both consumers of `remainingOf` use the value only as a linear scale factor on the issued vector — the fold's `sx += previous.dx * remaining` and `settle`'s `values[LEFT] - dx` — so both stay exactly correct outside the range. There is no clamp, no comparison against 0 or 1, and no branch on it anywhere.

**Verdict: comment defect.** The sentence should say the remaining fraction, and that an overshooting easing carries it outside `[0, 1]` without breaking either use. No behaviour changes.

---

## reviewer-6 — tier C

**`InsertionRuntimeView.insertion` is written and cleared on the committed-move path and read by nothing, and its JSDoc names a member D-158 deleted.**

`src/sortable/spec.ts:1130` sets `view.insertion = insertion` before the write and `:1199` clears it in a `finally` covering every exit, with a comment explaining that _"a value left behind would be a stale destination gap"_. Both shipped axes read the **frame** instead — `src/sortable/y.ts:247` (`frame.insertion!.index`) and `src/sortable/xy.ts:190, 289` — and grep finds no other reader of the runtime field in `src/`.

Its declaration at `src/sortable/slots.ts` still says: _"a rule reads it in two places… `resolve` records which gap the buffer it just measured reflects, and **`project`** is told which gap the write about to happen will move it to."_ `project` was collapsed into `moved` by D-158. The field is a second representation of committed frame state (§5), kept alive by a `finally` for a consumer that does not exist in the package; it survives only as published middle-tier vocabulary a third-party axis could read.

---

## reviewer-7 — tier C

**Four source comments describe machinery this arc deleted.**

CONTRIBUTING §Comments requires comments to describe the code that exists now and forbids narrating what was.

- `src/globals.d.ts:12` — _"`sortable/verified-refresh.ts` holds this package's one binding"_. That module was deleted; the binding is now `src/sortable/rect-index.ts`, whose own doc says _"This is the package's one binding"_. The two files disagree about where it lives.
- `src/sortable/placement.ts:254` — _"pipeline brackets the write with `beforeMove`/`afterMove` hooks"_.
- `src/sortable/spec.ts:1113` — _"The pipelines bracket the write, so a `beforeMove` hook that measures the whole list would otherwise be paid in full…"_, arguing for the early return from a cost that no longer exists.
- `src/shared/composition.ts:124-125` — _"any number of features and plugins keep accumulating into `beforeInsertionMove`, `afterInsertionMove` and `retire`"_. Neither name exists in either tier.

---

## reviewer-8 — tier C

**`xy()`'s `before` scratch buffer grows and is never released, including by `retire()`.**

`src/sortable/xy.ts` holds `let before = new Float64Array(0)` per controller and grows it in `moved` (`if (before.length < held * 2)`). `retire()` sets `last = -1` and calls `index.retire()`; nothing releases or shrinks `before`, so a controller that once dragged in a large collection keeps `2 × n` doubles for its lifetime. The asymmetry is with `RectIndex`, whose sizing branch is deliberate and documented on both sides — _"Growth and shrink are the same question"_, with a stated `capacity > 4 * n` hysteresis. Numbers only, so this is retention hygiene rather than a DOM leak.

---

## reviewer-9 — tier C

**Cached placeholder geometry now has an unpublished stability precondition.**

D-157 moved the placeholder read from once per spatial frame to once per rebuild, and D-158 left the arithmetic advance as the only thing maintaining it in between. A consumer's own `placeholder` factory element that changes size mid-drag — a grow-in transition is the ordinary case — therefore leaves `RectIndex.hole` describing the size it had at the last rebuild, for as long as the cache stays warm, and leaves `linear-shift`'s `constant` describing the old flow footprint. Neither is refreshed by anything short of an `invalidate()`, which scroll, resize, a collection change or `controller.invalidate()` raise but a still drag does not.

Nothing published states the precondition: G1 and G4 are about _candidate boxes_, G2 about the destination order, G3-linear about the crossed slots and G5 about which differences may drive a prediction. The placeholder is named in the clause block only as the incumbent to beat.

**Evidence limit, stated deliberately.** I built the fixture — a `placeholder` factory whose element grows from 40 px to 80 px after activation, no invalidation — and the drag completed clean: the staleness in the row cache and the staleness in the hole cancelled for that particular geometry, and the measured constant absorbed the difference. So the mechanism is established by reading and by the zero-read test's own assertion that no warm frame measures the placeholder, and it is **not** established by an observed misbehaviour. It is filed as an unpublished precondition rather than as a defect for that reason.

---

## What was checked and found sound

Recorded so that a silent area is distinguishable from a clean one.

- **The no-sink path does avoid animation-specific work.** `xy()`'s `moved` takes `if (!report) { invalidate(); return; }` before any read; `linear-shift`'s `shiftSpan` skips every `report` call and its establishing branch guards the settle scratch with `if (runtime.settle)`, so nothing is allocated; `RectIndex.refresh` pays one `if (settle)` per rebuild; `assemble` leaves both slots `null`. What a non-animating composition pays on a committed move is two hoisted multiplications and one truthiness test per crossed element, all of them inside a walk it performs for its own cache.
- **Failure provenance around `movedInsertion` is correct and pinned.** The `catch` at `src/sortable/spec.ts:1187-1191` classifies `FAILURE_ACTION_EFFECT` and returns, so the `finally`'s `invalidateInSeam()` runs behind an already-latched failure. Traced through `runPhase`'s `failureRequested` arm in `src/kernel/seams.ts:407-431` and `failOperation` in `src/kernel/kernel.ts:733`: without the `catch`, the `finally`'s `host.fail(FAILURE_INVALIDATION, …)` would queue first and the hook's own throw would demote to `drag: seam/failed-then-threw`, so the consumer would be handed the invalidation stage. D-159's reason for keeping the `catch` holds exactly. `tests/sortable/sortable.browser.test.ts:3391` pins both halves (`calls === 2`, `stages === [FAILURE_ACTION_EFFECT]`), and the sink-throw and invalidate-on-failure rows sit beside it.
- **The fold is continuous and the arithmetic checks out.** Before a second move an element presents at `F1 + r1`; the write puts flow at `F2 = F1 − dx` and the replacement starts at `dx + r1`, leaving `F1 + r1`. One animation per element, `finished.then` keyed on record identity so a fold's rejection cannot evict its successor, and the acquisition is all-or-nothing across the three `live()` readings and the `finished` accessor. Pinned by the four rows under `continuity under interruption` and the four under `the terminal barrier in the displacement bracket`.
- **The permanent `xy + layoutAnimation` row is correctly declared** — it is the only row asserting `sortable/linear-shift.js` **absent** while `sortable/layout-animation.js` is present, which is the statement `minimal (xy)` cannot make — and it reproduces D-159's figure exactly.
- **The full suite is green** at this tree, and so is `npx just size`.

Two observations about the instrumentation that are not findings: no row asserts `sortable/y.js` or `sortable/xy.js` **present**, only ever absent as the unselected axis; and `sortable/rect-index.js` is asserted present on the two `xy` rows only, never on a `y()` row.

---

LSP plugin - unavailable. Probed twice via ToolSearch (`select:`-style and keyword); no LSP tool is registered in this session. Symbol work was done with grep and direct reads.