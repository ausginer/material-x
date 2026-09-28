# F-227 — the displacement space is the item's, and one traversal already knows it

**Subject:** F-227, routed to the architect by [`d162-closure-summary.md`](d162-closure-summary.md) §6, together with the premise re-check the routing brief attached to it. Read at `ae1900c6`.

**Outcome: D-164.** The F-225 limit is **withdrawn, not widened**. The cost argument that produced it rests on a premise that does not hold, and the alternative it declined is available under D-85's own acceptance ground.

---

## 1 — The two findings are one defect, and F-225 named an instance of it

F-225's own recorded general shape is already the right diagnosis:

> a derived quantity published for one consumer is not automatically the same quantity for the next, even when both are called _the inherited space_

The remedy then did not act on it. It kept one value serving both consumers and drew a boundary around the _one configuration_ in which the divergence had been demonstrated. F-227 is what that costs: the boundary is an enumeration, and the enumeration was incomplete.

Stated exactly, the conflation is in `inheritedSpaceOf`'s two-callers doc block (`src/kernel/presentation.ts:393-405`). One value is published to two consumers that need **two different spaces**:

| Consumer | Where its `translate` is written | Space it is spent in |
| --- | --- | --- |
| `compose`, in-place lift | on the **visual** (prepended to the visual's authored `transform`) | strictly above the **visual** |
| `DisplacementReport` → `layout-animation.ts` | on an **item** (a displaced sibling row) | strictly above the **item** |

`coordinates(visual, measured)` (`presentation.ts:481`) fills `BOX_ANCESTOR_*` from `ancestorMatrix`, which `composeLinearMatrix` accumulates for every node **strictly above the measured element**, excluded only for the measured element itself (`packages/box-quad/src/index.ts:237-243`). Measured at the visual, that is the first row. The second row gets it anyway.

So the divergence is not "a transform sits between the item and its visual". It is **any linear contribution on the item→visual chain, the item's own included**. F-225 is the wrapper case; F-227 is the item case; they are the same subtraction failing.

**Why the item case is the worse one.** A transform authored directly on the item is supported elsewhere in the same package — `displacement.browser.test.ts` → _should leave an authored transform untouched_ — so the published contract would have to say both that the configuration is supported and that it is excluded. And with no ancestor transform above the item, the pre-`e4e835ba` code wrote the raw viewport vector, which was correct; the projection now divides out the item's own linear part, which was never in the quantity. That is the regression the closure review measured at 26.67 against a required 40, and it is tier A.

**Neither remedy the published limit offers reaches it.** "Put the transform on the visual" changes what is transformed; "put it above the collection" transforms every row. A consumer who wants _this row_ transformed has no in-contract way to ask.

---

## 2 — The premise check: the second traversal does not exist

The pricing that declined the exact fix is [`displacement-coordinate-space-claude.md`](displacement-coordinate-space-claude.md):78,80 —

> `coordinates` reports the ancestry of the element it is given; the walk from a nested visual passes _through_ the item but does not publish an intermediate. So the exact fix is a second traversal, on the item, at activation.

> A second traversal is a style read, for every operation of every behavior [...] D-85 accepted its unconditional kernel work on the explicit basis that _"the marginal cost is arithmetic over a buffer already materialized rather than a layout read"_.

**The first sentence is correct and the "So" does not follow.** "Does not publish an intermediate" is a fact about box-quad's _output surface_. "Requires a second traversal" is a claim about its _walk_. The walk already has the value.

`composeLinearMatrix` accumulates `ancestorMatrix.preMultiplySelf(node)` for each `current !== element`, climbing the flat tree. For a chain `visual → item → P → G`, that is:

| after visiting | `ancestorMatrix`          |
| -------------- | ------------------------- |
| `visual`       | identity (excluded)       |
| `item`         | `I`                       |
| `P`            | `P·I`                     |
| `G`            | `G·P·I` ← published today |

The quantity the displacement consumer needs is `G·P`. It is obtainable two ways from state this **single** walk already holds — by not folding in the boundary's own node (`current !== element && current !== boundary`), or by right-dividing the published result by the boundary's own contribution. Both were confirmed numerically against the accumulation order in a throwaway probe: `G·P·I = 70`, and both routes yield `35`.

**The cost of the declined alternative is therefore one extra accumulator and one `preMultiplySelf` per level above the boundary.** No second flat-tree walk, no second `getComputedStyle`, no layout-facing read. That is _arithmetic over state already materialized_ — D-85's acceptance ground **satisfied**, not violated. F-65 is not reopened, because nothing is added on the read side.

The pricing's conclusion is withdrawn. It priced a remedy nobody had to build.

---

## 3 — Is box-quad already the right abstraction? No, and its own principle says so

The brief asked whether this can be had without unreasonably widening `@ydinjs/box-quad`. It can, and the widening is small — but the more useful answer is _why_ it belongs there.

box-quad states its division of labor at `coordinates` (`index.ts:335-338`):

> There is deliberately no `relativeTo` here. Relative coordinates are not a measurement concern — they are a basis conversion between two boxes that have already been measured, which is {@link projection}.

That principle decides this case, and it decides it **for** the change:

- **The quantity is not recoverable by `projection`.** From a box measured at the visual, the published values are `matrix` (`G·P·I·V`) and `ancestorMatrix` (`G·P·I`). Recovering `G·P` requires `I`, the item's own node contribution, which is not published and cannot be derived from the pair. It is not a basis conversion between two measured boxes.
- **It is decided by the walk.** Which nodes fold in is exactly what `composeLinearMatrix` — and only `composeLinearMatrix` — knows, along with every `assignedSlot`, shadow-host and `display: contents` rule that makes the chain what it is. Reproducing the boundary logic in drag2 would move those rules out of the package that owns them, which is the value `inheritedSpaceOf`'s doc block already cites for not using `item.offsetParent`.
- **It adds no concept.** `ancestorMatrix` today is "ancestry above a boundary" with the boundary hardwired to the measured element. The change makes the boundary an argument. This parameterizes an existing constant rather than introducing a new kind of answer.

So the missing reusable capability is real, and it is box-quad's: **report the linear space inherited by a designated ancestor on the measured element's flat-tree chain.**

**Had it been declined**, the only honest alternative would have been to make `visual === item` a precondition of installing a displacement sink — a far larger narrowing than the text F-225 published, and one that removes the nested-visual case D-162 was extended to serve. That is worse than fixing it, which is part of why the fix is chosen.

---

## 4 — D-164, stated as required properties

The implementer chooses the encoding. These are the properties the result must have.

1. **One walk.** No additional flat-tree traversal, no additional `getComputedStyle`, no additional layout-facing read beyond what `coordinates` performs today. A remedy that costs a second traversal is not this decision.
2. **Two spaces, two names.** The kernel publishes the space above the **visual** and the space above the **item** as distinct values. `compose` keeps the first — it is already correct and must not change. `DisplacementReport`'s fifth argument carries the second. Neither may be called _the inherited space_ without qualification; the name that hid the conflation does not survive the fix.
3. **A boundary off the chain is observable, never silent.** If the designated boundary is not encountered on the measured element's flat-tree chain, box-quad reports that condition. The kernel treats it as an unmeasurable activation in the same class as a 3D transform — refused, per `acquireLift`'s existing `visual-no-box-space` throw — rather than proceeding on ancestry above the root. This is a real gap today: nothing constrains `visual` to resolve inside the item's subtree, and `config.ts`'s slot documentation should say that it must.
4. **Null-preserving.** The item space keeps the `null`-for-identity property, so an untransformed ancestry stays one null test on the hot path and D-162's measured routed-form profile is preserved.
5. **Identical under the default.** With `visual === item` the two spaces are the same value. No composition pays for a divergence it does not have.
6. **D-85 stands unamended.** No `@ydinjs/box-quad` import enters a behavior module. The boundary is supplied by the kernel, which means `acquireLift` must learn the item alongside the visual it already receives.
7. **The `Box` cost is measured, not assumed.** If the encoding widens `Box`, every measured box in the system pays it, `rect-index`'s per-item boxes included. Measure it and record it against D-163's now-always-on budgets rather than declaring it free — the symmetry with §2 is deliberate: this decision withdrew an unmeasured cost claim and does not get to make one.

### What this changes in the published contract

- **F-225's boundary sentence is deleted from `config.ts:112-121`, not reworded.** The limit it states ceases to exist. Three scope limits remain for the pair of slots, not four.
- **G1-presented is no longer narrowed** in this configuration. D-162's narrowing clause is withdrawn with the limit it justified.
- **F-228 is consumed.** It reported that the boundary sentence sits on `box`'s doc block rather than `visual`'s. The sentence goes; the placement question goes with it. What replaces it is property 3's constraint, which belongs on `visual` because `visual` is the slot it governs.
- **The temporal clause stands.** That the collection's inherited linear map is captured at grab and stable for the operation is unaffected — this decision changes _which_ map, not when it is read.
- **Coverage owes both configurations.** A transform authored on the item with a descendant `visual`, and a transform on an intermediate wrapper, each asserted against rendered travel — the two the current suite cannot distinguish. F-229's `xy()` gap is separate and stays open.

---

## 5 — Disposition

| Finding | Disposition |
| --- | --- |
| F-227 | **Settled by D-164.** Tier A confirmed, regression confirmed by mechanism. Fix is required before the arc finalizes; not a limit. |
| F-225 | **Reclassified.** No longer a published limit; an open defect settled by the same decision, being the same defect as F-227. |
| F-228 | **Consumed by D-164** — the sentence it is about is deleted. |
| F-229, F-230 | Untouched by this decision. |

**Not decided here.** The encoding of the boundary capability in box-quad's public surface — an extra parameter and additional `Box` slots, or another shape meeting §4 — is the implementer's, with property 7's measurement as the check. No production code was written for this decision.