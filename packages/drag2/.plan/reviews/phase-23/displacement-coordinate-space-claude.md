# Where the coordinate conversion comes from, and who owns it

D-162 named a mechanism the seam cannot express and a call an active decision forbids. Both objections hold. This re-decides the ownership, and the answer is that the value already exists, is already inverted, and was already documented as being for this consumer.

Architecture and contract only. Two forms were built, measured and reverted; the tree is unchanged.

## 1 — D-85 does not conflict with the fix, it supplies it

`inheritedSpaceOf` in `src/kernel/presentation.ts` already returns **the inverse of the inherited linear part**, and its own doc block says what it is for:

> It is **also** the projection a behavior needs to report a local delta, and that caller wants it under every lift mode rather than only in place.

Three properties settle the shape:

- **It is already inverted.** `{ a: d/det, b: -b/det, c: -c/det, d: a/det }`. Nothing downstream inverts a matrix.
- **It is `null` for an untransformed ancestry**, which is the common case — so the conversion is one null test, not arithmetic, wherever no ancestor transforms.
- **It is derived from the measurement `acquireLift` already took**, before anything was mutated. No second traversal, no layout read.

So the corrected D-162 needs **no `coordinates()` call in a behavior module and no D-85 supersession**. It needs the value routed. What _would_ require superseding D-85 is §5's alternative, and that is where the supersession question actually lives.

## 2 — Is it the right quantity for a displaced row? Mostly, and the exception is nameable

The sink writes `translate` on an **item** — a plan visits items — so the space that matters is the one above that item, which is the sortable container's. `inheritedSpace` is the space above the **visual**.

| configuration | space above visual | correct for a displaced row |
| --- | --- | --- |
| `visual === item` (default) | the container's | **yes** |
| `box !== item`, `visual === item` | the container's | **yes** — a box moves rigidly with its item, so the viewport delta is the item's, and the `translate` is still written on the item |
| container itself transformed | includes it, on both sides | **yes** |
| `display: contents` wrapper | a `display: contents` element generates no box and takes no transform | **yes** |
| **`visual !== item` with a transform between them** | the container's **composed with the item's own** | **no** |

The last row is real rather than theoretical: `config.ts` describes exactly that shape — _"a row that lifts its inner card"_ — and G1-presented supports an authored transform on a row. With a container at `scale: 2` and the dragged row at `scale: 1.5`, the routed inverse is `1/3` where the displaced rows need `1/2`, so a row that must travel 80 viewport px is told 26.7 local px and renders 53.3.

**It needs three conditions at once** — an ancestor transform, `visual !== item`, and a transform between the item and its visual. Under the default the routed value is exact.

## 3 — Delivery: the report carries the space it is expressed in

`report(element, dx, dy, live)` has no committed-move boundary and no placeholder, which is the second objection and it is correct. The answer is not to add a boundary but to stop needing one:

```ts
report(element, dx, dy, live, space);
```

The space rides with the vector, so the report states its own units. The axis reads it off the per-operation view — one field, filled at activation from `scope.inheritedSpace`, exactly as `free-drag/spec.ts` already does.

- **No new seam member**, no cached state in the sink, nothing to invalidate, and no lifetime to reason about.
- **No temporal protocol at all.** The value arrives with every use; there is no interval over which it must remain valid, so nothing about cadence or ordering has to be assumed or stated.
- **Non-animating compositions do no conversion work.** The argument is pushed inside `if (report)`, and `report` is `null` when nothing displaces, so the loop body never runs.

**Interruption and folding are untouched.** The stored contribution stays a **viewport** vector, the fold still adds `previous.dx * remaining` in viewport space, and the settle walk still subtracts a viewport quantity from viewport cached rects. Only the one expression that writes a keyframe converts. A local keyframe decaying to zero is, in viewport terms, `sx * remaining` at every instant, which is exactly what settle assumes.

## 4 — Both forms measured

Against `60eb9e50`. **A** routes through `report`; **B** adds an explicit per-move seam — `beginMove(space)` on the contribution, a slot, assembler wiring, a call site in the committed-move bracket, and a cached field in the sink.

| Composition | base | **A — routed** | B — per-move seam |
| --- | --: | --: | --: |
| minimal | 9837 | **+13** | +40 |
| minimal (xy) | 9704 | **+14** | +27 |
| minimal + layoutAnimation | 10186 | **+47** | +75 |
| xy + layoutAnimation | 10045 | **+48** | +74 |
| complete | 10427 | **+39** | +68 |
| free drag ×4, `drag.js`, `kernel.js` | — | **0** | 0 |

**A wins on every row**, and it wins on the two that matter most by three to one. It also carries no state, which B has to hold, scope and clear.

For scale: the form D-162 originally settled — a `coordinates()` call inside the sink, its own `Box` buffer and a matrix inversion — measured **+124, +107 and +115** on the three animating rows when prototyped. Reusing the kernel's derived value is roughly a third of that, because the inversion, the buffer and the traversal all already happened.

**The +13 B on `minimal` is not zero and is not conversion work.** It is one property in the activation-time view literal plus an argument at a call site that composition never reaches. At runtime a non-animating composition performs no conversion, no read and no push.

**Runtime, stated exactly**: per displaced element, one null test when the ancestry is untransformed; four multiplies and two adds when it is not. No layout read anywhere, in any composition, at any point on this path.

The prototype passes the sortable suites unchanged — 23 files, 505 tests, no type errors.

## 5 — The alternative, and where the D-85 question really sits

Closing §2's exception exactly means obtaining the space above the **item** rather than above the visual. `coordinates` reports the ancestry of the element it is given; the walk from a nested visual passes _through_ the item but does not publish an intermediate. So the exact fix is a second traversal, on the item, at activation.

**That is what would require superseding D-85, and it fails D-85's own acceptance ground.** D-85 accepted its unconditional kernel work on the explicit basis that _"the marginal cost is arithmetic over a buffer already materialized rather than a layout read"_. A second traversal is a style read, for every operation of every behavior, to serve a three-condition combination. It also reopens F-65's tension on the side F-65 argues from.

**So it is declined, and the limit is published instead** — beside the three scope limits `config.ts` already states for this exact pair of slots, which is where an integrator using `visual` and `box` is already reading:

> Where `visual` resolves to a descendant, no transform may sit between the item and its visual. The displacement conversion is the ancestry measured at the visual, and a transform in between is counted twice.

**This is a narrowing of G1-presented, in one configuration, and it is stated as one rather than folded in quietly.** It is meetable — put the transform on the visual itself, which is excluded from the ancestry by construction, or above the container — and findable, because it sits with the limits already governing the slot that creates the condition. What makes it a contract term rather than a deletion wearing one is that the exact alternative was priced first, and the reason for declining it is a cost the repository already decided once.

## 6 — The temporal statement, made explicit rather than assumed

`inheritedSpace` is _"a fact about the ancestry at grab"_. It is captured at activation and never revisited — by free drag today, and by this form. An ancestor transform that changes mid-operation is not tracked, and `invalidate()` does not refresh it, because refreshing would mean the measurement D-85 exists to avoid.

That is an existing property of the package that nothing published states. **It is published now**, as a clause beside G6: _the linear map inherited by the collection is stable for the operation._ Naming it is what keeps this out of the category the request warned against — it is a contract, not a cadence assumption, and the delivery mechanism in §3 depends on none of it.

## 7 — What lands

- `report` gains a fifth parameter carrying the space the vector is expressed in; `DisplacementReport` and `DisplacementContribution` change shape by that one argument and nothing else.
- The per-operation view gains `space`, filled at activation from `scope.inheritedSpace`.
- `layout-animation.ts` converts at the single expression that writes a keyframe; the stored contribution, the fold and the settle walk stay in viewport space.
- No `@ydinjs/box-quad` import enters a behavior module. **D-85 stands unamended.**
- Two contract clauses are published: the `visual !== item` transform limit in `config.ts` beside the existing scope limits, and the operation-stable ancestry clause beside G6.

**Evidence to add**: an ancestor-`scale` displacement case asserting the rendered travel equals the flow travel — the fixture that found F-213 and which no suite in the package currently carries; and a control at `scale: 1` proving the null path is taken. Both belong with the existing authored-`translate` and authored-`rotate` composition cases, which must keep passing unchanged.