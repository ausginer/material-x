# P-02 retention — the high-water shrink

**Status: designed 2026-08-21 (D-104). Measured and _declined_ 2026-08-21 — see [§What the run answered](#what-the-run-answered) and [`measurements/p02-shrink.md`](measurements/p02-shrink.md). Not implemented, and deliberately so: `src/` is untouched.** The second Phase 22 candidate from D-99, taken as its **shrink** sub-candidate only. The stride-narrowing sub-candidate is not designed here and is not reasoned about below except where the two must be told apart.

**A local shrink policy survives, and it is one branch at a site that already exists.** No representation change, no new lifecycle hook, no captured state, no timer. `STRIDE` stays 6, `xy()` is untouched, P-06's wrapper is untouched.

**But its payoff is not the 6.29 MB headline, and the decision is written so that cannot be misread.** See §What this does not recover.

---

## The lifecycle point

**`refresh`, in the branch that already sizes the buffer** — not `retire()`, and the difference matters.

```ts
if (list.length > capacity) {
  // today: grow
  capacity = capacityFor(list.length);
  index.values = new Float64Array(capacity * STRIDE);
}
```

That branch runs after the warm-path early return and after the I-36 entry barrier, and the scan below it repopulates every slot. **Growth and shrink are the same decision about the same resource, driven by the same number**, so they belong in one place.

**Why not `retire()`.** It is where the buffer is deliberately _kept_ — `items` is emptied because it pins DOM, `values` is kept because it is a cache — and shrinking there would have to **predict** the next operation's need from the last one's. `refresh` does not predict: it holds the real `list.length` for the operation about to run. A policy that needs no prediction needs no state to hold the prediction in, and nothing that can go stale.

**Why not a timer or an idle hook.** Releasing a _correctly sized_ buffer because a controller has been idle would make a deterministic cache timing-dependent, and it needs a policy input — how long is idle — that this library has no basis to own. **Out of scope by construction, not by preference.**

**Destruction needs nothing.** A destroyed controller drops the axis feature's closure, and the buffer is collected with it. What M-2′ measured is a **live** controller between drags, which is the only case this policy is about.

## What must survive the shrink

- **Contents need not.** The shrink sits on the dirty path, and the scan under it rewrites every slot. Nothing in the buffer is live at that instant: `retire()` and `invalidate()` both set `dirty`, and the warm path returned above.
- **`values.length >= count * STRIDE` whenever the cache is clean** — preserved, because the shrink is followed immediately by the scan that sets `count`.
- **Capacity stays a power of two** from `capacityFor`, so the growth arithmetic is unchanged and the M-2′ instrument's `capacityFor(n) × STRIDE × 8` identity still holds after a shrink as well as after a growth.
- **`items` is truncated by the existing scan**, not by this policy.
- **I-36 is not engaged.** Allocating calls no consumer code; the entry barrier above already covers the scan that follows.
- **P-06 is not reachable from here.** The fast path runs only when its wrapper is clean, which is exactly when `refresh` returns on the warm path — so a resize can never happen under a verified refresh.

## Eager, thresholded, or lifecycle-tied

**Thresholded, at a lifecycle point that already exists** — and the threshold is what makes it sound rather than what makes it cautious.

`capacityFor(n)` is the smallest power of two `≥ n`, so a fitted buffer always satisfies `n ≤ capacity < 2n`. Therefore:

- **`capacity > 2 × n` is unreachable for a fitted buffer.** That is the tightest gate that can never fire without a real collection shrink — the anti-churn property is a consequence of the doubling scheme, not a tuning choice.
- **The gate is `capacity > 4 × n`**, one doubling looser. That single doubling is the cheapest hysteresis available: it costs at most 4× the fitted size in retained bytes and it keeps a collection that merely wobbles around a power-of-two boundary from resizing.
- **It fires between a 2× and a 4× collection shrink**, depending where the old size sat relative to its power of two.
- **The shrink allocates `capacityFor(n) × STRIDE × 8`, which is strictly smaller than the buffer it releases.** A shrink can therefore never allocate more than it frees — the property that separates this from a memory/allocation trade.
- **An emptied collection shrinks to 48 B**, since `capacityFor(0)` is 1.

**Eager shrinking — to the exact count rather than to the next power of two — is refused.** It would recover the slack a fitted buffer legitimately holds (1.49 MB at 100 000 items) and pay for it with a reallocation on every single-item growth. That is the trade this candidate exists to avoid.

## What this does not recover, stated before the payoff is quoted

**At a stable collection the policy frees nothing, and that is not a defect.** At 100 000 items the buffer is 131 072 slots — `4 × 100 000` is 400 000, the gate does not fire, and 6.29 MB is retained. It is retained because it is **needed**: the next drag scans 100 000 rows.

So this candidate recovers **historical excess only** — capacity a collection used to need and no longer does. **The 6.29 MB figure D-99 quotes is not this sub-candidate's payoff.** Of that buffer, 5.12 MB is scalars no axis rule reads, and recovering _those_ is the **stride** sub-candidate, which is not designed here. The two must not be added together or quoted for each other.

**Which leaves this candidate's real payoff unmeasured**, because M-2′ measured a high water and never measured a collection that shrank. D-99 already named that gap as "deployment shape". The workload below is both the falsifier and the missing measurement.

## The workload that distinguishes a policy from churn

**Churn has an exact definition here: a reallocation on a workload whose collection size never changes.** The gate makes that provably impossible, so the first arm is a proof obligation rather than an experiment.

| arm | workload | decision-driving observable |
| --- | --- | --- |
| **Stable-large** | 100 000 items, unchanged, 1000 drags | `values.byteLength` **identical** across the whole run, and **zero** reallocations. Any change at all is churn and the candidate is declined — this is the arm that can kill it |
| **Shrunk** | 100 000 items, one drag, collection republished at 100, then drags | retained bytes fall to `capacityFor(100) × 48` = 6 kB, with **exactly one** reallocation. This is the payoff, and it is the number D-99's "deployment shape" gap is waiting for |
| **Oscillating** | 1000 ⇄ 100 alternating between drags | **telemetry**: bytes allocated per transition. Not a decline trigger — a collection that changes size makes the library resize, and the cost is proportional to the new size exactly as growth already is. Recorded so that a later phase proposing headroom has the number it would be arguing from |
| **Emptied** | collection republished at 0 | 48 B retained, asserted structurally |

**All four are `byteLength` assertions, not heap samples.** M-2′ established that a `Float64Array`'s backing store is precisely what `usedJSHeapSize` cannot see, and that its own P-02 rows are structural for that reason. This candidate inherits that instrument rather than building one.

## The smallest implementable slice

1. One `else if` beside the existing growth branch in `refresh`, gated on `capacity > 4 * list.length`, reallocating to `capacityFor(list.length)`.
2. The four assertions above, extending M-2′'s existing `capacityFor(n) × STRIDE × 8` rows rather than replacing them. **The stable-large arm asserts zero reallocations and is the one that must be able to fail.**
3. Nothing else. `STRIDE` stays 6, `retire()` keeps its current behaviour, `xy()` and `y()` call sites are byte-identical, `verified-refresh.ts` is untouched.

**Not in this slice:** the stride narrowing, any headroom beyond the `4×` gate, any idle-based release, and any change to what `retire()` keeps.

## What would stop this

- **The stable-large arm reallocates.** Then the gate is wrong in a way this derivation missed, and the candidate ends rather than growing a second condition.
- **The shrunk arm shows collections do not shrink in the deployments we support.** Then the policy is correct and worthless, and it should be declined on D-99's own stop condition rather than landed because it is cheap.
- **The gate needs a knob.** If `4×` has to become configurable, or to differ per composition, the policy has stopped being local and the trade should be re-argued.
- **Recovering anything material requires the exact-fit shrink**, which cannot be made sound against single-item growth without a different representation. That is the stop condition D-99 anticipated, and reaching it means the answer was the stride candidate all along.

---

## What the run answered

**Measured 2026-08-21**, both questions separately, with no production code landed to take the measurement. Record: [`measurements/p02-shrink.md`](measurements/p02-shrink.md).

**The mechanics are exactly as derived above, on every arm.** At a stable 100 000 items over **1000 drags** the gate never fires — one allocation for the initial growth, `byteLength` byte-for-byte constant, zero reallocations. A real shrink produces **exactly one** further reallocation and never a second. A shrink frees 6 144 kB and allocates 6 kB. `capacityFor(n) > 4 × n` is false for every `n` from 1 to 4096, so the anti-churn property holds by construction as claimed. **The arm that could have killed the candidate did not fire.**

**One edge this design does not name**: with `n = 0` the gate reads `capacity > 0`, true of the one-slot buffer a previous empty refresh just produced, so an empty collection reallocates 48 B on every scan instead of settling. Recorded so a landing pass fixes the gate rather than discovering it.

**And the candidate is declined anyway, on the second stop condition below.** Three reasons, each sufficient:

1. **The policy cannot fire when the collection shrinks.** `refresh` runs only inside an operation, so a live controller whose collection shrinks between drags reads no geometry — asserted at zero on the shipped API. The state this candidate is pictured recovering (dragged large, filtered small, sitting idle) is exactly the state it does not touch; reclaim needs a **subsequent drag at the smaller size**.
2. **The high water is bounded by the library's own per-move cost.** One rebuild scan on attached rows takes 15.8 ms at 20 000 rows — 0.95 of a frame, for the scan alone, on settled layout. On M-4′'s deployed curve, where the first read after the placeholder write is a forced flush, one committed move fills a frame at ≈3 800 rows. A virtualized list never reaches a high water at all.
3. **At every reachable size, D-99's threshold is met from below.** At 800 rows the whole buffer is 48 kB and a shrink to 100 reclaims 42 kB; at 2 000, 96 kB and 90 kB. D-99 declines P-02 under ~100 kB per controller, and at the largest drivable collection the **entire** buffer is under it.

**So §What this does not recover was right, and is stronger than it knew.** It said this candidate's payoff is not the 6.29 MB headline. The run says the payoff is 42–90 kB at the sizes a consumer can reach, available only after a second drag, against a threshold of 100 kB.

**§The workload that distinguishes a policy from churn stands as written**, and its second stop condition is the one that fired: _if supported deployments do not shrink their collections, the policy is correct and worthless._ It is correct. Nothing above it is retracted — the derivation, the lifecycle-point argument, the refusal of timers and of exact fit are all confirmed by the run, and all of them would be the right design if the bytes were there.