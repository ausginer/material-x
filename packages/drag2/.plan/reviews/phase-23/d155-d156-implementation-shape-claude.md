# Implementation shape for D-155 and D-156

Phase 23, implementation-shape pass. Turns the two settled decisions into an implementable architecture: module ownership, state transitions and order, what disappears or changes role, and the tests and measurements the implementer must preserve or add. **No conclusion of D-155 or D-156 is reopened.** One refinement to D-156's supporting arithmetic is recorded in §3.2, and it removes a fallback rather than adding one.

Policy: [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md), Part I for style and Part II for size and ownership. §0 and §14 govern every trade below: runtime performance first, size second.

## 1. The shape in one paragraph

A committed placeholder move becomes **one DOM write with no DOM read**. The axis predicts the move before the write, advancing its own cache and the placeholder slot it now also holds, and hands back a **plan** — a visitor over the affected elements and their displacement vectors. The optional displacement feature consumes the plan and starts one additive `translate` per element. Nothing measures, nothing is released, nothing is replayed. Measured rebuilds survive at exactly three moments — activation, an invalidation, and release — and release is the one that keeps the committed result honest.

## 2. Module ownership

| Module | Owns | Change |
| --- | --- | --- |
| `sortable/rect-index.ts` | the packed destination-slot cache and the **full measured rebuild** | **Also measures the placeholder** into a slot of its own, once per rebuild. Stays dimension-neutral; gains no prediction and no hook |
| `sortable/linear-shift.ts` (today `verified-refresh.ts`) | **G3-linear**: the displacement constant, the span shift over `values` and the placeholder slot, the plan, and the `DEV` equivalence instrument | Re-timed to **before** the write; witnesses and resync interval deleted; parameterized by the axis's two stride offsets |
| `sortable/xy.ts` | **G3-cellular**: the rotation and its plan, inline | Gains the prediction; keeps its rule |
| `sortable/y.ts`, later `sortable/x.ts` | the axis **rule** — candidate search and gap side | Reads the cached placeholder slot instead of measuring it |
| `sortable/layout-animation.ts` | the additive-`translate` runner **and** its factory | Loses the FLIP bracket; ~two thirds smaller |

**The linear module stays a module and stays `y()`-only-reachable.** That is the existing rule — code only one feature may execute belongs in that feature's module graph — and `bench/size` already asserts an `xy()` composition cannot reach it. It takes the two stride offsets (`TOP`, `BOTTOM` for `y()`) as construction arguments, which is what makes a future `x()` a rule module and a subpath rather than a rewrite. Two closure reads per **committed move**, not per frame.

**The displacement runner does not get its own module.** `layoutAnimation()` is its only producer, so §2.1 folds them into one file of roughly eighty lines.

## 3. The prediction

### 3.1 What the axis holds

The cache as today, plus **the placeholder's own rect**, established by the full rebuild and advanced by every prediction. This is what retires the per-frame `getBoundingClientRect()` in both axis rules (F-195): the read moves from **once per spatial frame** to **once per rebuild**.

### 3.2 The displacement constant, refined

D-156 derives it as _(the gap straddling the hole) minus (an ordinary adjacent gap)_, which needs an adjacent pair the hole does not straddle and therefore a two-slot fallback. **With the placeholder's rect in hand there is a shorter derivation that needs neither**:

- **`d = cache[g].top - placeholder.top`** for a hole at gap `g < count`;
- **`d = placeholder.bottom - cache[count - 1].bottom`** for the end gap.

Both are the hole's height plus the one gap it introduces. Checked against the measured fixtures: no gap gives `110 - 70 = 40`, and `gap: 12` gives `134 - 82 = 52` — the two values D-156 records. It holds for **every gap position including both ends, and for any `count >= 1`**, so the two-slot fallback D-156 reserved is not needed and no measured-`d` path ships. The only degenerate case is `count === 0`, a single-item collection with nothing to reorder.

`d` is **re-derived by every full measured rebuild and never carried across one**, which is what keeps it correct under resize, zoom and container change. It is not stored between operations.

### 3.3 The plan

```
type DisplacementPlan = (
  visit: (element: HTMLElement, dx: number, dy: number) => void,
) => void;
```

Returned by `project()`, owned by the axis, allocated **once per controller**. The linear axis hoists one scalar and walks the span; the cellular axis reads two cache slots per element. `dx`/`dy` are the vector the element is **about to travel**, negated — what an inverse-FLIP contribution must start from.

**A visitor rather than a packed buffer**, and the reason is §5: for the linear rule every entry in the span is the same number, so a parallel `Float64Array` would store one derivable value `span` times. It also removes the shape conversion §9 warns about — each axis writes the loop natural to it, and the sink passes one hoisted closure, so a committed move allocates nothing.

**A composition with no displacement feature pays one returned reference.** The visitor never runs, because nothing calls it. No flag, no branch, no arrangement between the two features.

### 3.4 Two things the prediction does not have

**No terminal barrier.** `project()` reads its own arrays and the committed gap. It performs no DOM read and calls no consumer code, so there is no `live()` to thread and no abort outcome to report. The `REFUSED`/`APPLIED`/`ABORTED` triple, the `DEAD` sentinel and the four witness readings all go with it.

**No invalidation on the happy path.** The cache is current by construction after a prediction, so `invalidateInSeam()` leaves the committed-move bracket entirely. It stays on the failure paths, and **that is now load-bearing**: a `movePlaceholder` that refuses a cross-container anchor leaves a cache describing a move the DOM did not make, so **every exit between `project()` and the end of the bracket must invalidate**.

## 4. Order

### 4.1 The committed move

1. `placeholderAt(placeholder, insertion)` — early return, unchanged. Most spatial frames stop here.
2. `view.insertion = insertion`.
3. **`plan = projectInSeam(current, view)`** — the axis advances `values` and the placeholder slot and returns the plan. No DOM read, no consumer call; still classified, because a JS-authored axis can throw.
4. **`movePlaceholder(placeholder, insertion)`** — the one DOM write. The terminal barrier after it stays: a custom-element placeholder's callbacks run inside that call.
5. **`slots.displace?.(plan, view.live)`** — the sink animates. `animate()` on a consumer-owned row is a consumer call, so the sink keeps a reading between iterations.
6. `finally` — clear `view.insertion`; **on any exit from step 3 onward that did not complete step 4, invalidate**.

Two pipelines, three barriers and two list-wide measurements become one call, one write, one call.

### 4.2 Release

1. **`slots.settleDisplacement?.()`** — cancel every in-flight contribution.
2. `invalidateInSeam()`.
3. `resolveInsertion` — the **measured** rebuild that produces the `ReorderRequest`.

Step 1 is correctness, not tidiness: without it the rebuild measures rows carrying offsets and can commit a different gap. It replaces `settleDisplacement`'s present reuse of the `beforeMove` pipeline, and it is a plain cancel because **cancelling an additive contribution that decays to zero lands the element exactly where it belongs**. Release does not replay today either, so nothing regresses.

### 4.3 The continuity property, which replaces measurement

Contributions are additive and each decays to zero, so **they sum**, and interruption needs no measurement, no release and no replay. Before a second move the element is at `T1 + r1`; the move makes its true position `T2` and adds a contribution of `d2 = T1 - T2`, so it is now at `T2 + r1 + d2 = T1 + r1` — **exactly where it was, with no read**. This is the property that retires the release-and-replay discipline, and nothing else in the design states it, so §7 pins it with a test.

Concurrent contributions per element are bounded by animation duration over move interval — three or four during a fast drag — and each removes itself on finish. One `Set<Animation>` is the whole record; the `Map`, the membership `Set` and the two reused arrays go.

## 5. Composition and cardinality

**`layoutAnimation()` moves from `plugins` to a named `displacement` key** and returns `{ displacement: installer }`, the shape `landing()` already has. The installer closes over duration and easing and returns `{ apply, settle, retire }`.

The reason is cardinality rather than tidiness. The assembler's rule is that a unique slot is declared on the group of the one config key that can produce it, **so two writers are unrepresentable rather than detected** — and two competing displacement mechanisms writing additive `translate` on the same rows is exactly the hazard to make unrepresentable. It also turns two prebuilt arrays into two nullable slots and a loop into a null check.

**`plugins` then has no producer and is deleted**, with `SortablePluginContribution` and `SortablePlugin`. Its own declaration names `layoutAnimation()` as the shape it exists for; with the hooks gone a plugin could contribute only `retire`. §8 forbids keeping unreleased surface, so it goes. **The reversal is cheap and the trigger is a second producer of a displacement-class capability** — it returns as a named key, never as an array.

`AxisContribution.beforeInsertionMove` and `afterInsertionMove` go with it.

## 6. Correctness machinery against development instrumentation

**Ships, because the library owns the invariant or the platform can reach the state:** the prediction; the constant's derivation; the release settle; the measured rebuild at activation, at each invalidation and at release; `movePlaceholder`'s cross-container refusal; and the three surviving barriers — the sink's `animate()` loop, the placeholder-reaction window, and the candidate loop inside the full rebuild.

**Development only:** the equivalence instrument, repointed from a per-move hypothesis to **G3's instantiation for that axis**. §1.1's gate settles this. A G3 violation is not reachable through correct use — G3 is a contract term — so the check does not ship, and the consequence is bounded by F-193: the committed result is measured, so a violated premise costs an intermediate gap and a wrong transit, never a wrong reorder.

**That deletion carries an obligation.** §1.2 is explicit that a constraint the compiler cannot state is still a constraint and must be written where the integrator meets it, and §1.1 deletes runtime guards **on the strength of those sentences existing**. So **the axis factories' published JSDoc must state the geometry contract** — G1, G2, G3 with the axis's own instantiation, G4, and for `xy()` the occupant-independent track requirement. Without it the deletion is unargued.

**The instrument has one honest limit** (F-200): a full scan disagrees with reality while contributions are in flight, and there is no longer a window in which nothing is applied. It therefore runs only when no displacement is in flight — always in `minimal` and `minimal (xy)`, which are the compositions where G3 is most purely testable, and between animations elsewhere.

**No periodic resync ships.** `RESYNC_INTERVAL` exists to bound drift the witnesses cannot see; with no witnesses, no per-move measurement and a measured terminal, a periodic full scan would buy a self-correction the contract does not require and pay for it in exactly the forced layout the model removes.

## 7. Tests

**Preserve:** the `DEV` equivalence instrument, repointed. The terminal-barrier browser groups for the three surviving barriers — the groups covering barriers that no longer exist are deleted with them, not weakened. The `bench/size` composition rows, budgets and module-absence assertions, including the one asserting `xy()` cannot reach the linear module. The three documentation instruments.

**Add:**

- **Zero-read.** Instrument `getBoundingClientRect` on collection rows and the placeholder and assert **zero calls** across a committed move, in `minimal`, `minimal (xy)` and `+ layoutAnimation`. This is the change's whole claim and must be executable rather than asserted in prose.
- **G3 conformance, positive.** Unequal-size `y` lists with and without `gap`; a fixed-track `xy` grid with unequal item heights. Predicted geometry equals a full scan after every committed move.
- **G3 conformance, negative.** A `grid-auto-rows: auto` grid whose tall item crosses a row boundary, and a wrapping flex with variable widths: the `DEV` instrument must **throw**. A premise violation that is silently wrong is the failure mode this whole model trades on being detectable in development.
- **Continuity under interruption.** Successive committed moves crossing the same row inside one animation duration: the row's rendered position is unchanged **across the second write**, per §4.3.
- **Release is settled.** An in-flight displacement must not change the committed `ReorderRequest`. Drive a release mid-animation and assert the gap.
- **Cross-container refusal.** `movePlaceholder` throwing after a prediction leaves the cache invalidated, not advanced — the failure path §3.4 names.
- **`xy()` displacement is two-dimensional.** A wrapping move animates both components. This is F-191, which the model closes: deltas now come from the axis as vectors, so the vertical-only animation and its horizontal jump cannot be expressed.

## 8. Measurements

**Size** (§15), joint rather than ablated, before and after, Brotli and minified where they disagree: `minimal`, `minimal (xy)`, `minimal + layoutAnimation`, `minimal + landing`, `complete`, baseline A. **Control row: `free drag minimal`, which must not move** — it shares the kernel and none of this. Say so before the run.

Attribute each delta to a named cause: the bracket and its pipelines, the witness apparatus, `layoutAnimation`'s measurement half, the `plugins` seam, D-155's gate and SPI. **Do not predict the direction for the linear axes** — the linear module keeps its purpose and gains a plan, and D-156 has already withdrawn one size claim made that way.

**Runtime, and it is the result that justifies the work** (§0 — a byte figure cannot answer a runtime question). Re-run the Phase 23 profiling fixtures and report `Layout` and `UpdateLayoutTree` per animation frame for `complete` against `minimal`. The recorded baseline is 18/36 against 44/44, and the target is that a committed move and a warm spatial frame each force **none**.

## 9. `x()`

**Does not ship in this work, and the architecture leaves its slot obvious.** The linear module taking its two stride offsets as arguments is what reduces `x()` to a rule module and a subpath; that parameterization lands here because it decides a module boundary, and the axis itself does not, because an exported factory is permanent from the day it ships (§4) and _it became cheap_ is not a reason to publish one. Shipping it would also multiply the browser-fixture matrix across a change whose risk is concentrated in re-timing.

## 10. How the landing tail fits

D-155's tail and this displacement are **disjoint by construction, not by check**. The tail is a controller-scoped additive `translate` on the **dragged item**; displacement animates the **destination view**, which is the collection _minus_ the dragged item. So the dragged item cannot be in a plan, and the placeholder is not in the destination view either — which deletes today's two explicit exclusions in `collect` rather than reproducing them.

They are also disjoint in time: displacement is settled at release, in step 1 of §4.2, and the tail is installed at the join that follows. Both are additive `translate` with `composite: 'add'`, so even an overlap would compose rather than clobber — but there is none, and the ownership statement is the structural one.

## 11. Findings

- **F-198** — the additive stacking property is what replaces measurement-based retargeting, and nothing in the design states it.
- **F-199** — `plugins` is left with no producer.
- **F-200** — the equivalence instrument has no settled window once offsets are never released.