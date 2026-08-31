# Iteration D — `cache()` attacked on utility rather than provenance

BQ-4 established that `cache()` is a deliberate later design. **This record tests whether it is a useful one**, which is a different question, and concludes it is not. It supersedes BQ-4's disposition — not its history, which stands.

The hypothesis put to falsification:

> `cache()` has no legitimate production use case that cannot be expressed more cheaply and explicitly by retaining or copying the measured `Box`.

It was attacked from four directions — real consumers, the API's own history, the runtime cost model, and the state model — and it survives all four. The last of those produced the decisive fact, and it was found by asking what `cache()` was introduced _beside_ rather than what it does.

## 1. The refactor that introduced `cache()` removed the thing a cache was for

Before `162f300fa`, the public surface was:

```ts
export function readBoxQuad(
  element: HTMLElement,
  out: Quad,
  relativeTo?: HTMLElement, // ← an element, measured internally
  cache?: BoxQuadCache,
): boolean;
```

`relativeTo` was an **element the library had to measure for you**. That is the whole of the cache's documented purpose: artifact 5 §7 "Shared reads" shows three calls sharing one `canvas` target, and the reuse it promises is of `canvas`'s completed space across those three calls. Artifact 5 §4 exists for the same reason — _"When an element is used as `relativeTo`, its local-to-viewport space must be invertible… A successful inverse may be retained."_

`162f300fa` — _"separate coordinate space and projection"_ — split that into:

```ts
export function coordinates(
  element: HTMLElement,
  out: Box,
  recache?: BoxCache,
): boolean;
export function projection(source: Box, out: Quad, relativeTo?: Box): boolean;
```

**`relativeTo` became a caller-held `Box`.** The shared target is now measured once by the caller, into a value the caller owns and passes directly. Artifact 5 §7's batch pattern is no longer a cache pattern — it is precisely the `Box` retention the hypothesis names, and the API now _requires_ it rather than merely permitting it.

So the same commit that gave `cache()` its current form also **deleted its only documented use case**, and carried the mechanism across the refactor unexamined. BQ-4 is right that this was a deliberate reshaping of the public surface; the deliberation was about the cache's _form_ — callable versus map — and never reached the question of whether it still had a job. Provenance is not utility, and BQ-4 answered only the first.

This is worth stating as a rule and not just a finding: **a mechanism that survives a refactor of the thing it served must be re-justified against the new shape, not inherited by it.** Logged as F-3.

## 2. There are no production consumers, and the hit rate is structurally zero

`cache(` appears in exactly two non-test places in the repository — its own definition and the generated `index.d.ts`. The package has one dependent, `@ydinjs/drag2`, which has one `coordinates` call site (`presentation.ts:487`) and **passes no cache**. Every remaining reference is in box-quad's own tests: 14 of them, across four files.

The absence is not an oversight, and this is the part that generalizes past the current consumer. **A cache pays only when one element is measured more than once between two writes.** Walk the plausible batch shapes:

| Shape | Same element twice before a write? |
| --- | --- |
| An axis rule measuring N candidate rows in one rebuild | No — each row once. A duplicate is forbidden by `ItemSource`'s uniqueness rule |
| The next rebuild, after a reorder or a scroll | No — layout changed, so the epoch must be discarded, and a discarded epoch has no hits |
| N children measured against a shared container | **No, not any more** — post-split the container is one `Box` the caller holds; there is no second measurement to elide |
| An anchor and its popover, per frame | No — two distinct elements |
| A child measured relative to its parent, then the parent relative to _its_ parent | **This was the real hit, and the split destroyed it** — `projection` now takes `Box`es, so the parent is measured once by the caller either way |

The third and fifth rows are the ones the contract was written for, and both were converted into `Box` retention by `162f300fa`. What remains is a mechanism whose hit rate is zero for every batch shape the package is plausibly used in.

The one arrangement left is two independent subsystems measuring the same element in one frame without sharing a data structure. That is real, but it is not an argument for _this_ mechanism: those subsystems must share **something**, and a shared `WeakMap<HTMLElement, Box>` in the consumer is three lines, hands each subsystem a value it can actually project rather than an opaque entry, and leaves invalidation with the party that knows about it — which the contract already concedes is the only party that can know.

## 3. The runtime cost model — measured, and it does not say what was assumed

Depth-12 ancestry, 200 rows, 4000 calls per case, Chromium, two runs agreeing to the nanosecond:

| Case | per call | vs cold |
| --- | --- | --- |
| Clean read phase, 200 **distinct** elements | 117.7 µs | 1× |
| Clean read phase, **same** element repeatedly, no cache | 118.4 µs | 1× |
| Clean read phase, same element, **cache hit** | **0.175 µs** | **676× faster** |
| **Retained `Box`, `out.set(kept)`** | **0.025 µs** | **4700× faster** |
| Measured after a style write (cache forbidden) | 160.0 µs | 0.74× |

Three things fall out, one of which contradicts the intuition this experiment was built to test.

**The cache is not a no-op — it is worth 676×.** Repeated measurement of the same element costs the same as measuring a fresh one (118.4 against 117.7 µs): the browser gives **no repeat discount**, so every re-measurement genuinely re-pays for ~13 `getComputedStyle` resolutions. Any argument that the cache saves nothing is simply wrong, and is not the argument made here.

**Retaining the `Box` is 7× cheaper than the cache hit**, and 4700× cheaper than the cold read. A hit costs a `WeakMap.get`, an `ownerDocument` comparison, two property loads and thirteen field reads; `out.set(kept)` costs a typed-array copy. **The alternative dominates the mechanism on the mechanism's own best case.**

**And the intuition that the cache only accelerates an already-cheap regime is false**, so it is not used here: a read after a write costs 160 µs against a clean read's 118, only 36% more. Both regimes are expensive. The cache's problem is not that it accelerates cheap reads — it is that the acceleration is available more cheaply, without a state model, to any caller that keeps the twelve numbers it was already handed.

Memory points the same way and is worth one line: a retained `Box` is 104 bytes of `Float64Array`; a cached `Space` is an object holding **two `DOMMatrix` instances**. Retention is the smaller residency as well as the faster read.

## 4. Bytes, and what removal actually costs

| Arm | What | brotli, whole | brotli, **as consumed** | Δ consumed |
| --- | --- | --- | --- | --- |
| **A** | baseline | 1221 | 1193 | — |
| **C** | caller-owned `WeakMap` (BQ-1's shape) | 1187 | 1184 | −9 |
| **K** | **cache removed entirely** | **1150** | **1147** | **−46** |

BQ-1 measured −9 B and treated it as negligible, which it is. **Arm K is −46 B**, five times larger, because it deletes what BQ-1 kept: the third parameter, the `WeakMap.get`/`set` pair, the `ownerDocument` discriminator, **and** the `ownerDocument` field on `Space` itself, which exists for no other reason. The whole-module figure is −71 B.

**−46 B as consumed is larger than BQ-2's entire +40 B cost.** Removing the cache pays for D-164's ancestry boundary outright, with 6 B left over.

## 5. The state model is the real bill

Bytes and nanoseconds are the small half. `cache()` is the sole reason the contract must define, and every future reader must carry:

- **epochs** — identity, lifetime, and what starts a new one;
- **within-epoch staleness** as an accepted, undetectable condition (§2, §6);
- **entry opacity** as a _contractual_ requirement that the type system is admitted to be unable to enforce (§1);
- **adoption invalidation** as a mandatory exception threaded through §2, §5 and §9;
- **weak-ownership guarantees** against reference cycles (§8);
- **failure and partial-work retention rules** (§5);
- **cross-document reuse rules** (§9);
- **a whole class of deferred performance questions** (§10) that exists only because there is a cache to defer them about.

That is **artifact 5 in its entirety — 143 of the contract's 823 lines, 17% of it** — plus 34 further cache mentions spread across the other five artifacts, plus 14 test references across four files. **BQ-4 obliges someone to rewrite all of it** so that it describes the resettable callable instead of the `WeakMap` it currently describes. That is the bill BQ-4 signed on behalf of a mechanism with no consumer, no hit rate, and a strictly better alternative.

Deleting the mechanism deletes the bill. Artifact 5 goes away rather than being rewritten; artifact 1 §3.1 loses a paragraph and a type; the remaining artifacts lose a clause each. The package's public surface becomes `Box`, `Quad`, `box`, `quad`, `coordinates`, `projection` — measurement and mathematics, with caller-owned storage, which is what the package's own doc blocks say it is.

## 6. What would bring a cache back

Stated concretely so this is a reopening condition and not a door left ajar:

- a consumer measuring the **same element** more than once between two writes, that genuinely cannot retain the `Box` — which, given that `projection` already consumes `Box`es, means a consumer whose two measurement sites cannot share any storage at all;
- or a future capability that reintroduces an **element-valued** parameter the library must measure internally, restoring the shape `162f300fa` removed.

Neither exists. If one appears, the cheapest correct answer is likely still a `WeakMap<HTMLElement, Box>` **in the consumer**, and the burden is on the proposal to show why it must live here.

## 7. What is decided

- **BQ-6 supersedes BQ-4.** `cache()`, the `recache` parameter, `BoxCache`, `InternalCache` and `Space.ownerDocument` are removed. Artifact 5 is deleted rather than amended; artifacts 0–4 lose their cache clauses.
- **BQ-4's history stands and is not retracted**: `cache()` was a later, deliberate design, and BQ-1 was wrong to call it drift. It was deliberate about form, not about utility — the distinction this record turns on.
- **BQ-1 remains inactive.** BQ-6 reaches a superset of its conclusion by a different and sounder route: not _the contract says so_, but _nothing buys anything with it_.
- **F-1 shrinks substantially.** Its largest component was a 143-line artifact describing a cache the source does not have; that artifact is deleted rather than reconciled.

## 8. Method

Arm K built, typechecked `--strict`, and measured through the repository's Rolldown-plus-brotli pipeline alongside the existing arms, which reproduce their recorded figures. The cost model was measured in Chromium over two runs at 4000 calls per case. Consumer search was exhaustive across the workspace. Arms were built outside the repository and probes removed; no production file was modified.

## 9. Findings

| ID | Finding |
| --- | --- |
| **F-3** | `162f300fa` converted `relativeTo` from an `HTMLElement` into a measured `Box`, which eliminated the cache's only documented use case, and carried the cache across the refactor unexamined. **The rule**: when a refactor changes the shape of the thing a mechanism serves, the mechanism is re-justified against the new shape rather than inherited by it — and a contract artifact that still describes the old shape is the signal to look |