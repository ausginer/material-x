# Where the collection's uniqueness invariant belongs

Owner question, 2026-08-25. `ItemSource` returns `readonly HTMLElement[]`; every structural mint runs [`copyUniqueItems`](../../src/sortable/collection.ts), which shallow-copies and builds a `Set` solely to refuse duplicate element identity. Three candidates were put: keep the runtime check, express uniqueness in the public type as an ordered `ReadonlySet` snapshotted straight back into an array, or make uniqueness an unchecked precondition of the ordered-array API.

Files read at `0d57fced`. No production code changed.

---

## 0. Verdict

**Keep the runtime validation, at the boundary it already occupies, in the representation it already has.** Both alternatives are worse, and they are worse for the _same_ reason rather than two: each converts a refusal the library can still make into a corruption nobody can observe.

The `ReadonlySet` proposal is the one worth stating sharply, because it looks like the principled answer and is the most damaging of the three. **A `Set` does not reject duplicates. It absorbs them.** A consumer holding `[a, b, x, b, c]` and writing `new Set(items)` hands the library four elements and no indication that it meant five. The type would then assert the very precondition the conversion silently destroyed, and the `{ from, to }` pair the library publishes would be computed in an index space the consumer's own array does not have — which is exactly the fault `copyUniqueItems` exists to refuse, now unreachable by any check because the type says it cannot happen.

**What the question did surface is a real gap, and it is in the record rather than in the code** (F-95): D-77 swept this check under the Code of Size and kept it — _"`claim`'s single-writer collision stays; `copyUniqueItems` stays and is classified"_ — but the rule D-77 froze in the same row is _a construction-time throw is permitted only for an invariant over what installers contribute_, and this is not one. The verdict was right and the stated rationale does not reach it. §2 below supplies the derivation that does.

---

## 1. What actually happens without it, executed rather than argued

Code of Size §1.1 requires the counterfactual to be run. It was, against the shipped pure functions with plain objects standing in for elements.

**Case A — the dragged element is the duplicated one.** `items = [a, b, c, b, d]`, dragging `b`, dropped at the end.

|  |  |
| --- | --- |
| consumer array | 5 elements |
| `destinationOf` | **3** elements — `filter` drops _both_ copies, not one |
| `from` | `1`, from `indexOf` over the 5-space |
| `to` | `3`, the end gap of the 3-space |
| `buildReorderProposal` | **returns a proposal.** All four guards pass |
| consumer applies `{from,to}` | `a,c,b,b,d` — the item lands mid-list, not at the end |

The proposal is version-matching, range-valid and neighbour-consistent, because within each index space every value _is_ consistent. The two spaces are what disagree, and no guard in the package compares them. `noop` is decided by `index === from`, which compares the two spaces directly — so a real reorder can report as a no-op and a no-op as a reorder.

**Case B — a non-dragged element is duplicated.** `items = [a, b, x, b, c]`, dragging `x`. Here `destination.length === items.length - 1` holds, so the cheap O(1) length test that would catch Case A passes. The gap at index 3 (`before: b`, `after: c`) is then handed to `reconcileCollection` against a republication of the **identical, unchanged collection**:

```text
reconcile on an IDENTICAL republication: CANCEL
```

`destination.indexOf(before)` finds the first `b`; `destination[2]` is the second `b`, not `c`; the survival test fails and the operation ends. **I-14 is violated by a publication that changed nothing.** The same array also makes `insertionAt` produce `{ before: b, after: b }` — a gap whose two ends are one element — and makes the rect index measure one DOM node into two destination slots with identical geometry, since a node cannot occupy two positions.

**This is the finding that decides the question.** The fault is not caught downstream, is not caught by a cheaper test, and does not surface as an error: it surfaces as the consumer's element in the wrong place, or as an operation that cancels for no visible reason.

---

## 2. Whose invariant — the derivation D-77 did not state

Code of Size §1.1 says to ask _whose state is corrupted_, not _whose mistake it was_. Both answers here are the library's.

**Element identity is the collection's positional key, and the library owns two index spaces built on it.** `from` indexes the snapshot's own array; `to` indexes the destination view. The published contract is that a consumer can apply the pair to their array by removing at `from` and inserting at `to`. That is well-defined only while the two spaces differ in size by exactly one — which is exactly the statement _the dragged element occurs once_. **Uniqueness is not a convenience for the implementation; it is the precondition that makes `{ from, to }` mean anything at all.**

And the corruption is internal before it is external: `insertionAt` can return a gap whose `before` and `after` are the same element, `reconcileCollection` can cancel a live operation against an unchanged collection, and `rect-index.ts` maintains parallel arrays that claim one node sits in two slots. None of those is the consumer breaking their own code. They are the library's own model becoming incoherent about a value it published.

That clears §1.1's bar, and it is a different bar from the one D-77 wrote down.

**§1.2 does not apply, and this is the interesting half.** The section says prefer a type where a type can express the constraint. TypeScript cannot express uniqueness over `readonly HTMLElement[]`. `ReadonlySet` does not express it either — **it enforces it by deletion**, at a boundary where deletion is the fault. A constraint whose only type-level spelling silently repairs the input is precisely a constraint §1.2 is not about.

---

## 3. Costing it, per §0

§0 is explicit that a byte figure cannot answer a runtime question and that a candidate whose real cost is _when it runs_ must be measured on when it runs.

**When it runs.** Never per frame and never per pointer sample. Construction once (D-44's first pull), then only on the **structural** branch of `action.prepare(COLLECTION)` — which `controller.invalidate()` alone dispatches, and which D-44's array-identity test already gates: an unchanged array identity is a resize, a zoom or a scroll, and it stages nothing and pays no copy.

**What it costs when it does run** (Node 26, 20k iterations after warmup, the `Set` delta over the bare copy):

| n    | copy   | copy + `Set` | delta       |
| ---- | ------ | ------------ | ----------- |
| 10   | 72 ns  | 177 ns       | **105 ns**  |
| 50   | 39 ns  | 753 ns       | **715 ns**  |
| 200  | 91 ns  | 2.8 µs       | **2.7 µs**  |
| 1000 | 438 ns | 13.9 µs      | **13.4 µs** |

The delta is real and O(n). It is also charged against a trigger that has already committed to far more: a structural publication invalidates the rect index, so the same event forces n `getBoundingClientRect()` calls under live layout. At n = 1000 that is milliseconds. **The check is roughly one percent of the work its own trigger causes**, on a path the consumer chose to enter.

---

## 4. The three candidates, decided

**(a) Runtime duplicate validation — kept.** Correct ownership by §2, not replaceable by a cheaper test by §1 Case B, and priced by §3 on a cold path. The current split of _how_ it fails is also already right and should not move: at construction it throws into the consumer's own `sortable()` call, where the caller can see which call was wrong; inside the seam it is classified by the kernel rather than thrown at a site the consumer never wrote. That is §1.1's "prefer the normal error path" applied where it applies, and a direct throw where the consumer is standing there.

**(b) An ordered `ReadonlySet` public representation — rejected**, on four counts, the first alone sufficient.

1. **It absorbs the fault instead of refusing it** (§0). A consumer converting their array loses duplicates silently, and the library then computes `{ from, to }` against an ordering the consumer's array does not have.
2. **It buys no allocation back.** The library needs index access, so it would snapshot to an array immediately — the same O(n) copy — while additionally forcing the _consumer_ to build a `Set` on every pull.
3. **It destroys D-44's array-identity fast path.** A freshly constructed `Set` is never reference-equal to the last one, so every `invalidate()` — every scroll, resize and zoom — becomes structural. That fast path is worth considerably more than the check costs.
4. **§12.** It makes the common case awkward — consumers hold arrays — to simplify the implementation, which is the trade that section forbids.

**(c) An unchecked public precondition — rejected.** Its failure mode is §1: no throw, no `onError`, no cancellation, and the consumer's element in the wrong position. §1.1 permits declining a check whose violation costs the consumer only their own code; this one costs them their data through a value the library published, and costs the library its own positional model.

---

## 5. What is _not_ decided here

- **The one-pass question.** `copyUniqueItems` spreads and then builds a `Set` — two passes where one would do. Whether that is worth changing is a measurement, not a design decision, and §11 warns against hand-shaping source for it. Left to the implementer; not booked as work.
- **F-93** — the single-item-collection gap, where `insertionAt` and `reconcileCollection` disagree — is untouched by this and stays open on its own terms.
- **Nothing about `from`/`to`'s two index spaces is being changed.** §2 argues they are load-bearing as they stand; it does not argue they are the only possible design.

## 6. What would falsify this

The cost table is Node, not a browser, and it measures `Set` construction over plain objects rather than elements — element identity hashing could differ. It would have to differ by roughly two orders of magnitude to change the verdict in §3, and no candidate would improve if it did, since (b) and (c) are rejected on semantics rather than on cost.

The stronger falsifier is a supported consumer whose collection genuinely contains the same element twice and means something coherent by it. §1 says there is no coherent reading for `{ from, to }` in that case, so such a consumer would be evidence that the _published pair_ is the wrong contract — which is a much larger finding than this one, and is not what the source shows today.