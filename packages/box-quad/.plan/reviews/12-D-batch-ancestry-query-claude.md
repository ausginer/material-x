# Iteration D — the batch ancestry query, priced without the boundary model

The challenge to record 11: **P2's +22 B may have been the cost of encoding one-walk multi-`Space` as the old singular boundary, not of one-walk multi-`Space` itself.** The stronger formulation drops every boundary semantic — N elements declared up front, one walk, a `Space` for each one it meets, a requested element it does not meet simply left empty, no distinguished element, no all-or-nothing failure, independent outputs.

**The formulation is right about everything except the price.** It is a coherent primitive, the zero-initialized segment really does serve as not-found, the machinery it removes really is removed, and it is **7.1× faster than N independent walks at N = 8**. It is also **+99 B** over BQ-9's settled form — more than four times the P2 premium it was meant to explain away. **BQ-9 stands, amended in place** to record the result and to name this encoding, rather than P2's, as what a future batch consumer should buy.

## 1. The encoding under test

`Space` becomes one caller-sized buffer of 5-slot segments in argument order. The walk starts at `elements[0]` and climbs. Per node: fold the node into every segment already started, then start a segment for any requested element equal to the current node — the same ordering that keeps an element's own contribution out of its own space.

**The zero-initialized segment carries the state, and this works.** A started segment is seeded to `[1, 0, 0, 1, 1]` and its zoom slot is a product of positive factors, so it can never be zero; an unmet request stays `[0, 0, 0, 0, 0]`. **No found-set, no bitmask, no N ≤ 31 cap, no all-or-nothing return** — the hypothesis is correct on every one of those. The only `false` left is the one BQ-9 already has: a node that is not representable in 2D.

## 2. Bytes — the hypothesis fails here, and not narrowly

Seven encodings, all on the cacheless baseline, measured through the repository's Rolldown-plus-brotli pipeline. `Δ` is against **K** (1147) for the package and against **c-zero** (1294) for the consumer arm carrying drag2's full shape.

| Arm     | Encoding                                               | package | Δ       | consumer | Δ       |
| ------- | ------------------------------------------------------ | ------- | ------- | -------- | ------- |
| **P1a** | `ancestry(el, out)`, measurement's argument required   | 1163    | +16     | 1328     | +34     |
| **P1b** | as P1a, argument optional — **BQ-9**                   | 1185    | **+38** | 1350     | **+56** |
| **P2**  | one walk, element space + one boundary space           | 1224    | +77     | 1372     | +78     |
| **Q4**  | batch, **no capacity check, no clear**                 | 1256    | +109    | 1433     | +139    |
| **Q5**  | batch, capacity check, no clear                        | 1267    | +120    | 1440     | +146    |
| **Q3**  | batch, capacity check **and** clear                    | 1277    | +130    | 1449     | +155    |
| **Q1**  | as Q3, plus a segment offset on the measurement        | 1288    | +141    | 1458     | +164    |
| **Q2**  | as Q1, rest parameter instead of an array              | 1294    | +147    | 1455     | +161    |
| **Q6**  | as Q3, node components hoisted, unconditional multiply | 1286    | +139    | 1458     | +164    |

**The answer to the question as put: no.** P2's +22 B was not mostly the boundary encoding — **P2 is the cheapest one-walk multi-`Space` form measured**, and the boundary-free generic query costs **+77 B more than P2** and **+99 B more than BQ-9** at its safest, +83 at its leanest.

**Output capacity and checking are cheap, and are not the problem.** The capacity check is **11 B** and clearing the buffer is **10 B** — 21 B for both, and a correct implementation should buy them: the check is one comparison because this encoding controls every write, so there is none of BQ-7's `RangeError`-after-partial-commit trouble. Stripping both still leaves +83 B over BQ-9.

**And the leaner dispatch is again worse.** Q6 hoists the node's four components out of the segment loop and multiplies unconditionally — obviously better-looking code — and costs **9 B more** than Q3. That is the third independent time in this iteration that the tidier per-node dispatch measured larger.

## 3. Runtime — the hypothesis is entirely right, and BQ-9 gains no defence from it

1200 iterations per cell after a 100-iteration warm-up, requests spread through the chain:

|                               | N=1       | N=2       | N=8        |
| ----------------------------- | --------- | --------- | ---------- |
| depth 15, batch               | 0.0653 ms | 0.0677    | **0.0629** |
| depth 15, N independent walks | 0.0783    | 0.1492    | 0.3426     |
|                               | **1.20×** | **2.20×** | **5.45×**  |
| depth 30, batch               | 0.1209 ms | 0.1256    | **0.1316** |
| depth 30, N independent walks | 0.1407    | 0.2856    | 0.9361     |
|                               | **1.16×** | **2.27×** | **7.11×**  |

**The batch is flat in N** — eight requests at depth 30 cost 9% more than one — because the per-segment work is four multiplies against ~10 µs of `getComputedStyle` per node. This is the same result BQ-7 recorded for multi-boundary and it is now confirmed for the general query.

**Two things are recorded against BQ-9 deliberately.** At the shape drag2 actually has — N = 2, depth 30 — the batch is **2.27× faster**, about 160 µs per lift. And **even at N = 1** the batch beats a single `ancestry` by 16–20%. **BQ-9's independent-walk form is not the runtime optimum at any N**, and must never be defended as though it were; its case is bytes and surface, exactly as record 11 stated.

## 4. Correctness — it is a real primitive

Depth-20 non-commuting chain with `zoom` interleaved, five requests including a duplicate and an element on a different subtree:

```
request 0:            [4.4437,3.5442,-2.3628,6.6656,1.5625]  matchesSingle=true
request 1:            [4.0398,3.2220,-2.1480,6.0596,1.5625]  matchesSingle=true
request 2:            [2.9351,1.0977,-0.7318,4.4027,1.2500]  matchesSingle=true
request 3 (off-chain): [0,0,0,0,0]                            (left empty)
request 4 (duplicate): [4.4437,3.5442,-2.3628,6.6656,1.5625]  matchesSingle=true
```

Every on-chain segment equals the independent walk's result **exactly**, `===` rather than a tolerance — the batch composes the same nodes in the same order into the same association, so unlike the `Space`/`Box` split there is no ULP question here. The off-chain request is left empty with no failure. **A duplicate request costs nothing and needs no guard**, which is a small genuine advantage: drag2's two-walk form needs an `item !== visual` test that the batch does not.

## 5. Why BQ-9 still stands

**5.1 It is +99 B for a consumer that needs two spaces.** drag2 needs above-visual and above-item, both known before the call. That is the whole demand, and BQ-9 serves it with two calls of a function that already has to exist. Everything above N = 2 is generality with no buyer — the same finding as BQ-5 §6.4, BQ-7 §3.4 and record 11 §4, now measured a fourth way.

**5.2 It reintroduces a chain constraint that independent walks do not have.** `ancestry(item, out)` answers whether or not the item is on the visual's chain. `ancestries([visual, item], out)` can only answer for elements above `elements[0]`, so an item that is not an ancestor of the visual comes back empty and the consumer must handle it. The hypothesis is right that this is softer than an all-or-nothing `false` — but softer is not absent, and it is **weaker than a `false`**: an unchecked empty segment is a singular matrix, which drag2's `inheritedSpaceOf` maps to `null`, which is the identity — a silently wrong number of exactly the kind BQ-2 refused to publish. The independent form cannot produce that state at all.

**5.3 The measurement's argument gets worse.** The batch's output is a buffer of segments, but `coordinates` consumes one `Space`. Either it grows a segment index — Q1, +11 B, and a second thing for a caller to get wrong beside the precondition record 11 §6.1 already priced — or the caller passes `out.subarray(0, 5)`, which allocates on a path whose whole idiom is caller-owned storage.

**5.4 The one demand for N > 2 is a different shape.** The batch serves several elements **on one chain**. The batch win record 11 §6.4 identified — 200 sibling rows sharing one ancestry — is several elements on **different** chains sharing one ancestor, which is BQ-9 property 4's sharing, not this query. They do not compose into one mechanism, and the sibling case is the one with a plausible consumer.

## 6. What is decided

- **BQ-9 stands**, unamended in what it requires of the code. Its record is corrected in place to carry this result: the batch form is priced at +99 B over it, is 2.27× faster at drag2's shape and 7.1× at N = 8, and is the encoding a future batch consumer should buy — **not** P2's boundary form, which record 11 declined and which is cheaper only because it is less general.
- **BQ-9's reopening condition is now concrete**: a consumer needing three or more ancestry spaces **on one chain**, or one for which ~160 µs per activation is not affordable. Neither exists.
- **What is not a ground for BQ-9**: runtime. It is the slower form at every N measured, including N = 1.

## 7. Method

Six batch encodings built on the cacheless baseline, typechecked `--strict`, measured with their consumer arms through the repository's own pipeline. Two browser probes: agreement against independent walks over five requests including a duplicate and an off-chain element, and the cost model at three cardinalities and two depths. Arms live outside the repository; probes were removed. No production file was modified.

## 8. Findings

| ID      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F-6** | Four generalization proposals in this iteration — multi-boundary (BQ-7), the one-walk boundary (P2), the generic batch query, and every leaner dispatch tried inside each — found the per-node **arithmetic free** and the **bytes 3× to 5× the singular form**, and in three separate cases the tidier-looking dispatch measured _larger_. **The rule**: in this package a generality argument is priced on dispatch — the per-node test, the loop over started accumulators, the argument shape — never on storage or on the mathematics, both of which are genuinely free. A proposal that argues from either is arguing from the wrong column |
