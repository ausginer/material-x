# Iteration D — does the boundary capability need to exist at all?

The last falsification before implementation. The hypothesis, put by the owner: the two spaces **D-164** needs are already producible by the shipped API, because `coordinates(visual, visualBox)` gives the space above the visual and `coordinates(item, itemBox)` gives the space above the item — two consecutive reads, one geometry snapshot, no new surface. If that holds at an acceptable activation cost, the boundary parameter should be deleted rather than implemented.

**It very nearly holds.** The two-measurement encoding is cheaper in bytes, produces a **bit-identical** number, and needs no validation gate. It is refused on one ground, established in a browser: **it can only answer for an item that is itself measurable**, and the space above an item is not a fact about the item's own box. **BQ-8 supersedes BQ-7**, keeping cardinality one and adding that as a binding property, because it is now the whole of why the capability exists.

## 1. It produces the same number, bit for bit

Built on a depth-20 non-commuting chain — `matrix(2,0,0,3,5,7)` at the root, `rotate(7deg)` and `scale(1.1)` alternating down it — with the item three levels above the visual. Compared **arm M2** (BQ-7's boundary) against two ordinary `coordinates` calls from the shipped source:

```
✓ i[BOX_ANCESTOR_A..D] === one[BOX_OUTER_A..D]     (toBe, not toBeCloseTo)
✓ two consecutive reads of the same element are identical in all 13 slots
```

Exact equality, not agreement to a tolerance: the second walk composes the same nodes in the same order, so it reproduces the boundary walk's floating-point result term for term. **There is no numerical argument for either side**, and the geometry-snapshot question answers itself — the two calls are consecutive statements in one task, so no layout can intervene, and the observed identity is what that predicts.

## 2. It is cheaper, end to end

Consumer arms carrying the full drag2 shape — allocate, measure, derive both `InheritedSpace` inverses with `inheritedSpaceOf`'s exact null and singularity tests — bundled through the repository's own Rolldown-plus-brotli pipeline, box-quad and consumer together:

| Consumer arm                                                 | brotli | Δ       |
| ------------------------------------------------------------ | ------ | ------- |
| **c-zero** — today, one measurement, one space               | 1287   | —       |
| **c-two** — two measurements, unguarded                      | 1296   | **+9**  |
| **c-two-guard** — second call skipped when `visual === item` | 1310   | +23     |
| **c-one** — BQ-7's boundary (arm M2)                         | 1347   | **+60** |

**The alternative is 51 B cheaper than the capability it replaces**, and it deletes a public parameter, a variable-capacity allocator, four slot constants and a failure mode rather than adding them. That is the real strength of the proposal and it is recorded before the refusal, not after it.

## 3. Its runtime cost is real but affordable, and BQ-7 must not be defended on it

2000 measurements per cell after a 200-iteration warm-up, item three levels above the visual:

| depth | single `coordinates(visual)` | two, back to back | BQ-7 one walk | **second call** | **BQ-7 overhead** |
| ----- | ---------------------------- | ----------------- | ------------- | --------------- | ----------------- |
| 5     | 38.9 µs                      | 54.8 µs           | 35.4 µs       | **+15.8 µs**    | −3.6 µs (noise)   |
| 15    | 78.4 µs                      | 147.7 µs          | 99.1 µs       | **+69.3 µs**    | +20.8 µs          |
| 30    | 162.1 µs                     | 306.8 µs          | 185.3 µs      | **+144.7 µs**   | +23.2 µs          |

The second call costs a second walk — 89% of the first at depth 30, scaling linearly with depth, which is the signature of style traversal and not of a layout flush. **No additional flush is taken**: the first read flushes, nothing writes between the two, and a probe that deliberately writes between them showed no measurable difference on this tree (0.95×) — that probe fails to discriminate rather than proving the point, so the claim rests on the mechanism and on the linear-in-depth scaling, which a flush would not produce.

**Once per lift, at activation, this is affordable** — 145 µs at depth 30 and 16 µs at the depths a real list actually has, in a path that already takes a computed style, captures inline styles and mutates the visual. And with the `visual === item` guard the default composition pays **nothing**, because it never makes the second call. Runtime does not decide this, and BQ-7 gains no defence from it.

## 4. The refusal: the space above an item is not a fact about the item's own box

`coordinates` returns `false` for an element with no single principal box — disconnected, `display: contents`, or fragmented across lines. **The space inherited by that element is perfectly well defined regardless**; it is a property of the flat-tree chain above it. The two-measurement encoding cannot separate the two conditions, because its only way to ask about the chain is to measure the element. Shown both ways in Chromium:

```
display:contents item, descendant visual   BQ-7 = true, outer = [2,0,0,3]   two-measure = false
inline item fragmented across 5 lines      BQ-7 = true, outer = [2,0,0,3]   two-measure = false
visual outside the item's subtree          BQ-7 = false                     two-measure = true
```

**The first row is the one that matters, and it is not an exotic shape — it is the archetypal reason to name a `visual` at all.** A wrapper item that renders nothing itself and presents an inner node is exactly the configuration D-164 exists to fix; D-162's own record names a `display: contents` wrapper among the shapes it reasoned about. Today it works end to end, because nothing measures the item: `acquireLift` measures the visual and the rect index measures `box`, which defaults to the visual. Under the two-measurement encoding that shape stops producing a space, leaving drag2 to choose between **throwing at activation** — refusing a configuration that works today — and **falling back to the visual's space**, which is silently reinstating F-227. Neither is acceptable for a change whose purpose is to fix that configuration.

**It cannot be recovered cleanly at the consumer.** The available repair is to measure the item's parent and take its full linear part, which is correct only when the item contributes nothing, needs a loop when the parent is also `display: contents`, and requires the consumer to walk `assignedSlot ?? parentElement ?? host` itself — the duplicated flat-tree traversal this package exists to prevent, and forbidden to a behavior module by drag2's D-85 besides.

## 5. The membership check is mostly machinery the encoding creates for itself

The owner asked this directly, and the honest answer is **not required for correctness**. The third row above is BQ-7 refusing a visual outside the item's subtree. That refusal exists because BQ-7 derives the item's space from the _visual's_ walk, so the item has to be on it; the two-measurement form asks the item about its own ancestry and needs no such condition. **An encoding's own precondition is not a correctness argument for the encoding.**

What survives is smaller and worth keeping only because it is free. The walk must already know when it passes the boundary — `above ||= current === boundary` — so reporting whether that ever fired costs nothing, and it converts an invariant drag2 owns but does not enforce into a recognized `false` at activation, in the class of a 3D transform. That is a modest gain, **not the ground the decision stands on**, and BQ-8 records it as such so the capability is never re-justified on it.

## 6. What is decided

- **BQ-8 supersedes BQ-7.** Everything BQ-7 required is carried forward unchanged — cardinality one, caller-owned capacity via `box(boundaries = 0)`, `BOX_LENGTH` constant for the ordinary measurement, off-chain boundary a recognized `false`, insufficient capacity recognized rather than discovered by a partial write, and a future N purely additive. **Added as binding**: the boundary space must be produced from the chain alone, so a boundary with no principal box of its own — `display: contents`, or fragmented — still yields its space and does not turn the measurement into a `false`.
- **The two-measurement alternative is declined**, and the grounds are narrow and recorded: not bytes, which it wins by 51 B; not runtime, which is affordable; not numerics, which are identical; not the snapshot, which is guaranteed. Only §4.
- **What would reopen it**: a decision that a sortable item must itself be measurable — which would make §4 moot and leave the capability paying 51 B for a validation gate §5 already discounts.

## 7. Method

Four consumer arms built and measured through `packages/drag2/bench/size/measure.ts`'s pipeline; three browser probes run against the shipped source and arm M2 side by side, covering equality, cost at three depths, and the three configurations in §4. Arms live outside the repository; probes were removed. No production file was modified.

## 8. Findings

| ID      | Finding                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F-4** | A derived fact about an element's ancestry and that element's own measurability are independent conditions, and an encoding that obtains the first by measuring the element silently couples them. The test is cheap and should be run against any "the caller can already compute this" argument: name a configuration in which the value is defined and the measurement is not |
