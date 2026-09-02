# Iteration D — the decomposition itself, and the ground BQ-8 stood on

BQ-8 kept the ancestry boundary on one fact: an element can have a well-defined inherited space and no measurable principal box, so the item's space cannot be had by measuring the item. **That fact is true. It is also an artifact of `Space` being welded to `Box`, and this record dissolves it.** Separating the two makes the item's ancestry obtainable without measuring the item — for **fewer bytes than BQ-8**, with `Box` reduced to a pure measurement and the boundary parameter, the membership check and the variable-capacity allocator all deleted rather than implemented.

**BQ-9 supersedes BQ-8.** The one-walk multi-Space form was built and measured too, and **does not earn itself**.

## 1. The arms

`Space` is caller-owned storage in the package's existing idiom — `Float64Array(5)`, `[a, b, c, d, ancestorZoom]`, the linear part of everything strictly above an element plus the zoom of the same nodes. `Box` drops `ancestorZoom` and `ancestorA…D` and becomes **8 slots**, exactly what `projection` reads.

| Arm | Shape | brotli, whole | brotli, **as consumed** | Δ vs K |
| --- | --- | --- | --- | --- |
| **K** | cacheless baseline (BQ-6) | 1150 | 1147 | — |
| **M2** | BQ-8's boundary | 1206 | 1202 | +55 |
| **P1a** | `ancestry(el, out)`; `coordinates(el, out, above)` **required**; `Box` 8 | 1172 | **1163** | **+16** |
| **P1b** | as P1a, `above?` optional with an internal fallback | 1192 | **1185** | **+38** |
| **P2** | one walk publishing the element's space **and** a boundary's | 1232 | 1224 | +77 |

End to end, with drag2's actual shape bundled in — allocate, measure, derive both `InheritedSpace` inverses and read the inherited zoom:

| Consumer arm                              | brotli   | Δ vs today |
| ----------------------------------------- | -------- | ---------- |
| **c-zero** — today, one space             | 1294     | —          |
| **c-p1a** — first-class `Space`, required | **1328** | **+34**    |
| **c-p1b** — first-class `Space`, optional | **1350** | **+56**    |
| **c-one** — BQ-8's boundary               | 1355     | +61        |
| **c-p2** — one walk, two spaces           | 1372     | +78        |

**The decomposition is cheaper than the capability it replaces**, and it is cheaper for a reason rather than by luck: it deletes five `Box` slots, the second `DOMMatrix` accumulator in the walk, and the `current !== element` test that maintained it, and it pays for one extra exported function and a five-slot allocator.

## 2. It repeats nothing, and this is the load-bearing mechanical claim

`getComputedStyle` calls on a depth-12 chain, counted by instrumenting `window.getComputedStyle`:

```
monolith = 14      ancestry = 13      coordinates = 1      split total = 14
```

**Identical.** `ancestry` walks from the flat parent upward and never reads the element's own style; `coordinates` reads it once, which it already had to for the border-size fallback. The split moves the boundary of the work rather than duplicating any of it — and at depth 15 the split is measurably _faster_ than the monolith (0.100 ms against 0.134), because the monolith maintains two `DOMMatrix` accumulators where the split closes the ancestor product once and finishes with a scalar 2×2 multiply.

## 3. BQ-8's ground dissolves

The same two configurations record 10 used to refuse the two-measurement alternative, run against `ancestry`:

```
display:contents   coordinates = false   ancestry = true   space = [2,0,0,3]
fragmented (4 rects) coordinates = false   ancestry = true   space = [2,0,0,3]
```

**`ancestry` reads no layout and never touches the element's own box**, so it answers for an element that has none — which is what F-4 said the value deserved. BQ-8's sole surviving ground was that this could not be done; it can, and the thing that prevented it was the coupling, not the problem. **BQ-8 cannot stand as written regardless of what replaces it.**

Two consequences follow immediately. There is **no boundary**, so there is no chain-membership condition, no off-chain `false`, and no `visual`-must-be-inside-the-item's-subtree precondition — record 10 §5 already discounted that check as machinery the encoding created for itself, and here it simply does not arise. And there is no output-capacity question, so BQ-7's `box(q)`, its `RangeError`-after-partial-write analysis and its cardinality argument are all deleted rather than implemented.

## 4. Why the one-walk multi-Space form loses

**P2 is the better runtime and the worse purchase.** Depth 30, 1500 iterations:

|  | monolith | P1 (two ancestries + coordinates) | P2 (one ancestry, two outputs + coordinates) |
| --- | --- | --- | --- |
| depth 15 | 0.134 ms | 0.153 ms | **0.100 ms** |
| depth 30 | 0.199 ms | 0.378 ms | **0.208 ms** |

P1's second walk nearly doubles the activation cost at depth 30 — **+180 µs, once per lift**, which record 10 §3 already established as affordable at 145 µs and which is +19 µs at depth 15. P2 removes it for **+22 B** over P1b, and the two forms' item spaces agree **bit for bit**.

It still loses, and on the same structure as BQ-7's cardinality result. **P2 is the boundary parameter again**, moved to a different function: a designated element, a second output, a per-node started flag, an all-or-nothing membership `false`. Every question BQ-7 spent an experiment closing — which element, is it on the chain, what if it is not, how many — comes back with it, and the generic N form generalizes it further for a consumer that needs two spaces and knows both. **The whole gain of §3 is that the model has no boundary in it.** Buying it back for 22 B to save 180 µs at activation is the wrong trade, and the generality above N=2 has no consumer, exactly as BQ-5 §6.4 and BQ-7 §3.4 found.

## 5. Re-evaluating BQ-5 rather than inheriting it

The proposed form is not the declined `Ancestry`, and its objections must be re-run rather than cited:

- **6.1 strong DOM retention — gone.** A `Space` is five numbers. It holds no element, so there is no chain to pin and no identity to look a boundary up by. This was BQ-5's decisive non-price objection and it does not survive the reformulation.
- **6.2 the staleness window — gone in kind.** A `Space` is produced and consumed in the same task by the same call sequence, exactly as a `Box` is. A caller can hold one across a mutation and get a stale answer — which is equally true of the `Box` it already holds, so this is the package's existing contract rather than a new hazard.
- **6.3 mutual exclusion with the cache — moot.** BQ-6 removed the cache.
- **6.4 the generality has no consumer — still true, and it is what kills P2**, not P1.

So BQ-5's decline of the **retained, deferred-query** form stands untouched; the non-retained form wins on grounds BQ-5 never reached. Record 07 §5 valued shrinking `Box` to a pure measurement at roughly **+100 B** and thought it unaffordable. **Here it arrives at −39 B against BQ-8**, because it is bought by deleting a concept rather than by adding one.

## 6. What it costs, stated at full strength

**6.1 A new unenforceable precondition, and it fails silently.** `coordinates(element, out, above)` cannot check that `above` is this element's ancestry. Demonstrated rather than argued — a row measured against a sibling subtree's space:

```
returned = true    correct a = 1, got 2    correct width = 20, got 10
```

No exception, no `false`. That is the class BQ-3 was condemned for. Three things bound it. It is **explicit in the signature**, where BQ-3's trap was internal to a warm path a correct call could take. It is **the same class as `projection`'s** documented same-viewport precondition, which this package already accepts in writing: _"these are caller-owned numeric arrays, so that is a documented requirement rather than something hidden metadata could enforce."_ And under **P1b it is opt-in** — omit `above` and the library computes the right one — which is the 22 B P1b spends over P1a and the reason it is the form settled.

**6.2 The measurement is no longer bit-identical to today's, and this is intrinsic.** Slots agree to 1–2 ULP, not exactly:

```
K = 3.697189502956104   split = 3.697189502956103
```

The monolith accumulates the element's own node **first** and pre-multiplies ancestors onto it; the split closes the ancestor product and multiplies the own node in at the end. Different association, same value, different rounding — **no encoding of the split can avoid it**, and the ancestor slots themselves agree exactly. It is 1e-16 against a suite tolerance of 1e-6 and against computed-style precision, but an implementer meeting an exact-equality assertion should know why.

**6.3 `Box` narrowing is a breaking change for the one consumer.** `BOX_ANCESTOR_ZOOM` and `BOX_ANCESTOR_A…D` cease to exist; drag2's `inheritedSpaceOf` takes a `Space` instead of a `Box`, and `acquireLift` allocates and fills one. That is real work, and it is the work the decomposition is for.

**6.4 The batch win is real for the primitive and unclaimable today, so it is not a ground.** Because siblings share an ancestry, one walk plus N cheap measurements replaces N walks: 200 rows at depth 12 go from **18.6 ms to 1.9 ms, 9.9×**, with row 137 matching bit for bit. **`@ydinjs/drag2` cannot use it**: `rect-index` measures candidates with `getBoundingClientRect()`, not `coordinates()`. This is recorded as what the decomposition makes possible, never as what it buys — the same discipline BQ-3 and BQ-5 were held to.

## 7. What is decided

**BQ-9 supersedes BQ-8.** `Space` becomes a first-class caller-owned value; `Box` becomes a pure measurement; the ancestry boundary is deleted rather than implemented. Required properties, encoding left open:

1. **`Space` is caller-owned numeric storage** in the package's existing idiom, carrying the linear part of everything strictly above an element together with the cumulative zoom of the same nodes. It holds no element reference.
2. **Producing a `Space` reads no layout and never touches the element's own box**, so it succeeds for an element with no principal box — `display: contents`, fragmented, or disconnected. This is the property the whole decomposition exists for and it is binding.
3. **`Box` carries only what `projection` reads.** The ancestry metadata leaves it.
4. **The split repeats no work**: producing a `Space` and then a `Box` from it must read no more computed styles than today's single call, and must not walk the flat tree twice for one element.
5. **The ancestry argument to the measurement is optional**, and omitting it yields today's semantics. The fallback must not use shared mutable module storage that a re-entrant call — a consumer-overridden `getClientRects` or `getBoundingClientRect` — could clobber.
6. **The precondition is documented, not enforced**, in the same terms `projection` already uses for its own.
7. **No boundary, no designated ancestor, no cardinality.** A second space is a second `ancestry` call.

**Not decided, and deliberately left open**: whether a future batch consumer justifies re-examining the one-walk form. The condition is a real consumer measuring N elements through `coordinates` — which would reach for property 4's sharing first, and only then for P2.

## 8. Method

Three new arms built on the cacheless baseline, typechecked `--strict`, and measured with five consumer arms through the repository's Rolldown-plus-brotli pipeline. Four browser probes: exact reproduction against the shipped source, the two unmeasurable configurations, the instrumented style-read count, the mismatched-`Space` failure, the sibling batch, and the walk-cost comparison at two depths. Arms live outside the repository; probes were removed. No production file was modified.

## 9. Findings

| ID | Finding |
| --- | --- |
| **F-5** | BQ-8's sole surviving ground was a limitation of the decomposition, not of the problem: the item's ancestry was unobtainable only because ancestry computation was welded to box measurement. **The rule**: when a decision's last remaining ground is a coupling in the current design, test the decoupling before freezing — a capability justified by an internal coupling is a capability justified by a choice, and F-4's own test (name a configuration where the value is defined and the measurement is not) is the signal that the coupling is the thing to attack |