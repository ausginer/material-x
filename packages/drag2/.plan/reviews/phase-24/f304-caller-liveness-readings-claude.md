# Both caller readings retire, and one of them is pinned by a case F-303 does not list

**Read at `9ccbebb5`**, branch `drag2/fin-review`, on 2026-09-04. Nothing implemented; the settled `RectIndex.refresh` placement is not revisited; the lint gate is untouched; F-300 is not decided. Bounded to the two sites F-304 names.

Neither site is settled by analogy with `refresh`. Both are traced through their own call sequence, and the two answers coincide for different reasons — one because the obligation is discharged **upstream**, the other because it is discharged **downstream**.

---

## 1. `linear-shift.moved` — the reading after `box`

### The sequence it actually sits in

The seam is `action.effect`'s placeholder-move branch (`spec.ts:1152`–`1200`):

```
movePlaceholder(placeholder, insertion)      // consumer custom-element reactions run here
if (host.closed) return;                     // spec.ts:1164
slots.movedInsertion(current, view, report)  // → y.moved → shift.moved
stale = false
finally { if (stale) invalidateInSeam(); view.insertion = null }
```

and inside `shift.moved`:

```
const rect = (runtime.box ? runtime.box(probe) : probe).getBoundingClientRect()
if (!runtime.live()) { drop(); return }      // ← the site
runtime.settle(scratch, [probe], 1)          // library walk
delta = observed - values[…]; constant = |delta|
shiftSpan(lo, hi, delta, runtime, report)    // buffer writes + report per element
last = gap; hollow = true
```

**What can re-enter and close before it**: `runtime.box(probe)` — a declared consumer slot — and the `getBoundingClientRect()` chained onto it, which is overridable on a consumer-owned element. Note that the reading is placed **after** the slot call, so it could never have protected that call; its only possible subject is what follows.

### What follows, act by act

- **`runtime.settle`** — `layout-animation.ts`'s walk over its own `running` map and the `Animation` objects it created. Library-owned; no consumer-owned member is touched.
- **the arithmetic and the buffer writes** — internal, and undone at the boundary: `y.ts` publishes `retire: shift.retire`, `assemble.ts` pushes it into `retireHooks`, and `spec.ts`'s `retire()` walks them, running `forget()` and `index.retire()`.
- **`report(items[i], dx, dy, runtime.live, runtime.space)`**, per element. `report` is filled by a **feature**, not by the consumer, and what it invokes is `element.animate()` and `animation.cancel()` — overridable platform members on consumer-owned rows, which is the quantifier D-37 withdrew. Its `duration` and `easing` are plain values destructured once at construction, not thunks. It publishes no lifecycle or domain event and admits nothing.
- **`last`, `hollow`, `constant`** — internal, reset by the same `retire`.

**And `report` reads the latch itself, at the head of every call**, by explicit design: _"Read at the head so one reading covers this element and every predecessor — the axis walks the span and cannot guard the interior of a loop it only runs."_ So even on the most generous reading of `report`'s status, the obligation is discharged **at the act, by the party performing it, per element**. This site is a second reading of the same latch over the same span, taken once and earlier.

### The one obligation that is real, and where it already lives

`box` **is** invoked more than once inside this seam: per candidate in `action.prepare`'s `resolveInsertion`, and once here in `action.effect`. I-36's clause therefore applies across the prepare→effect boundary — and two readings already sit between them, both behavior-owned: `spec.ts:999` (`resolved === null || host.closed`, immediately after `resolveInsertion` returns) and **`spec.ts:1164`, immediately before `movedInsertion`** — which is exactly the placement the `refresh` disposition requires, already correct, already in the tree, and carrying a docblock that names the reentrancy it guards.

**Verdict: retires.** Not because geometry is permitted, but because the only declared-slot invocation in this path is guarded before it by `spec.ts:1164`, and every act after this reading is internal, undone at the boundary, or self-guarded at its own head.

---

## 2. `xy.resolve` — the reading before `compareDocumentPosition`

### The sequence

```
index.refresh(…)                  // box per candidate (slot); gBCR per candidate and placeholder
last = …; { values, count, hole } = index; candidate loop  // pure arithmetic
if (nearest === -1) return null
if (!runtime.live()) return null                                   // ← the site
const position = runtime.placeholder.compareDocumentPosition(items[nearest]!)
return insertionAt(items, gap, snapshot)
```

**What can re-enter and close before it**: a candidate's `box`, any candidate's `getBoundingClientRect`, or the placeholder's — and under the settled placement `refresh` returns `true` for a close raised by the **last** candidate or by the placeholder read, so the controller genuinely may be closed here.

### The next act, and who discharges it

`placeholder.compareDocumentPosition(items[nearest]!)` is a platform **query** on a consumer-owned node. It is overridable, and it is **not a declared consumer slot** — the consumer filled `placeholder()`, not this member. `insertionAt` is pure.

The act that _is_ forbidden is the one after that: **the returned `Insertion` is a publication.** It is discharged twice, and neither discharge is a hope about the kernel:

- `spec.ts:999` — `if (resolved === null || host.closed) return null;`, in the same synchronous statement sequence, immediately after `resolveInsertion` returns. Its own comment states the case: _"a candidate `visual()` resolver destroyed the controller during the rebuild… stopping one branch earlier means the behavior never writes `draft.insertion` for an operation that no longer exists."_
- `preparationValid()`, which I-36 names among the boundary revalidations that own (c).

So `draft.insertion` is never written for a closed operation whether or not this reading exists.

**Verdict: retires.** It is a duplicate of `spec.ts:999`, taken one call frame earlier inside the axis, discharging a publication the behavior already refuses to make.

**A confirming asymmetry.** `xy.browser.test.ts:705` records that this axis _"owns a barrier its sibling does not need"_, because `y()` derives the gap side from two centres it has already measured. Under I-36 the surviving domain is a set of **acts**, not a property of an axis — an obligation that exists in one axis and not the other, for two paths that publish the same thing, is a sign that what is being guarded is the DOM touch rather than the publication. Retiring it makes both axes take zero readings after `refresh`, which is what the contract says they owe.

---

## 3. This changes F-303's boundary — one case, and it is not on the list

`xy.browser.test.ts` **"should not compare document position once the anchor read closed the controller"** drives the placeholder's own `getBoundingClientRect` to close the controller and asserts `compares === 0`. Its rationale is the withdrawn ceiling verbatim: _"The anchor rect above is a consumer call on a consumer-owned element; `compareDocumentPosition` below is a second one on the same element."_

Under this disposition — together with the already-settled retirement of `refresh`'s post-placeholder reading — it **fails**: the rebuild completes, the gap-change frame is reached, and `compares` is 1. F-303 lists two failing cases in `y.browser.test.ts` and two misleading descriptions; this is a **third failing case, in the other file**, and it would have surfaced as an unexplained red during step 1a. F-303's boundary is amended to carry it, with the same disposition: retargeted, not deleted silently, and its prose corrected to name what survives.

**Checked in the other direction too.** `y` and `xy`'s _"should call no resolver at all when the controller is already closed"_ both pass under the new placement — the first candidate's pre-`getBox` reading aborts and the resolver list is empty — and **no test anywhere pins the `linear-shift.moved` reading**; the only `destroy()` in `g3-conformance.browser.test.ts` is a cleanup hook. So site 1 retires unpinned and site 2 costs exactly one case.

---

## 4. Reconciliation with step 1a and the `LinearShift` conversion

- **Neither retirement adds or removes a parameter of the step 1a API.** `advance(lo, hi, delta, start, end, centre)` and `remeasureHole(placeholder, start, end, centre)` stand exactly as published; `RectIndex.refresh` keeps `live`, and its placement is untouched.
- **Both deletions land in step 1a**, not later. Step 1a already edits `linear-shift.ts` and `xy.ts`; leaving either barrier for a follow-on would mean touching both files twice and measuring two changes as one, which is the reason step 1a precedes step 2 in the first place.
- **`drop()` survives, with one call site fewer.** It keeps the degenerate-case arm at the head of `moved` — dirty buffer, stale version, empty count, unknown or unchanged gap — which is not a liveness path.
- **The instruction for the `LinearShift` conversion, stated so it is not transcribed wrongly**: after this, `linear-shift` **reads the latch nowhere**. It forwards `live` into `RectIndex.refresh` and forwards `runtime.live` into `report` as an argument, and does nothing else with either. **The class must not acquire a `#live` field or a liveness member**; `live` stays a parameter that is passed through, because the party that must read it is the one performing the act, and in this module that party is never `LinearShift`.
- **The resulting budget.** Per resolution: `N` readings inside `refresh` with a `box` or `visual` composed, **zero** without, and **zero** in either axis outside it. Per committed move: **zero** in `linear-shift`, with the sink reading once per displaced element at its own head, unchanged.

---

## 5. Method

`spec.ts:975`–`1030` and `1140`–`1210` read in full for the two seam sequences; `layout-animation.ts:105`–`200` for what `report` invokes and where its timing values come from; `slots.ts:154`–`230` for the `SortableSlots` membership question; `domain.ts:63` to confirm `insertionAt` is pure; `assemble.ts:77` and `spec.ts:1773` for the teardown path. The test census is a grep for `destroy`/`alive`/`closed` across `tests/sortable/` and `tests/perf/`, with each hit read; outcomes under the disposition are derived by walking each fixture against the proposed sequence and are stated as predictions about a change that has not been made.

**LSP plugin — available; not used**: the subject is which act follows which across two seam branches, and every site was enumerated by the contract and read in full.