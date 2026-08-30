# The cellular residue, and the stage a displacement fault reports

Two narrow questions left open by the ownership remediation. Both are settled here against measurement rather than argument, and neither settles the way the question anticipated.

Architecture and contract only. Every figure was taken from an ablation applied to a clean tree, built, measured and reverted; the restored tree reproduces the baseline byte-exact.

## Part one — the `xy()` residue

### 1 — What the residue actually is

Ablation **X** deletes `xy()`'s displacement production outright — the `before` buffer, the copy loop, the in-frame rebuild and the diff — leaving `moved` as a bare `invalidate()`:

| Composition     | landed | ablated |        Δ |
| --------------- | -----: | ------: | -------: |
| minimal (xy)    |   9704 |    9540 | **−164** |
| every other row |      — |       — |    **0** |

So the residue is **164 B**, and the row's +124 B against the parent decomposes: **the ownership work made bare `xy()` 40 B cheaper than the old model**, and the displacement production put 164 B back. There is nothing else in that row to find.

### 2 — The instrument could not see the composition the decision is about

There is no `xy()`-plus-`layoutAnimation()` row among the fourteen. Every displacement decision so far has been taken against `y()`-plus-animation and bare `xy()`, and the composition that actually exercises the cellular displacement path was invisible to the harness — §15's _check that the instrument can see the change_, in its structural form.

Adding it measures **10045 B, 31 modules** on the landed tree. **It should be added permanently**, whatever is decided below; without it the next pass repeats this.

### 3 — The counterfactual, measured

Ablation **C2** is the proposal: `xy()` supplies no post-write member at all (`moved` becomes optional and absent), the behavior invalidates, and `layoutAnimation()` brackets the write itself — a before-measurement pre-write and an after-measurement post-write, diffed per element, with its own held contributions subtracted from both sides so the difference stays G5-clean.

| Composition               | landed |    C2 |        Δ | C2 vs parent |
| ------------------------- | -----: | ----: | -------: | -----------: |
| minimal                   |   9844 |  9876 |  **+32** |          −37 |
| minimal (xy)              |   9704 |  9564 | **−140** |          −16 |
| minimal + layoutAnimation |  10196 | 10486 | **+290** |     **+133** |
| xy + layoutAnimation      |  10045 | 10149 | **+104** |            — |
| complete                  |  10439 | 10701 | **+262** |     **+106** |
| both behaviors            |  11812 | 12114 |     +302 |         +187 |
| free drag ×4, `drag.js`   |      — |     — |        0 |            0 |

**It wins one row and loses five**, and the losses include the two the previous pass had brought 156 B under the old model — both go back over it. Some tens of bytes of that are prototype slack; the direction and the order of magnitude are not.

Three of those numbers are the finding rather than the arithmetic.

**+32 B on `minimal`.** Making `movedInsertion` nullable and adding two bracket members taxes the bare **linear** axis — a composition with no cellular rule and no sink — to relocate cellular machinery. The proposal's own premise is that the bare axis must not be taxed for the optional path, and moving the code moves the tax rather than removing it.

**+104 B on `xy + layoutAnimation`** — the composition the change is _for_. The sink's bracket is larger than the axis's diff because it must do more: two measurement passes instead of reusing the rebuild the axis performs anyway, an element-identity check per slot because it holds no destination view of its own, and a snapshot of its own.

**+290 B and +262 B on the two animating rows that use `y()`.** They ship a cellular bracket they can never reach, because the sink cannot know which axis is composed.

### 4 — Why it comes out that way, stated as a rule

**Generalising a specialised routine in order to relocate it costs more than the relocation saves, and charges the difference to a different non-consumer.**

`xy()`'s diff is small _because_ it is specialised: it owns the destination view, so slot `i` is known to be the same element on both sides; it owns the cache, so the "before" geometry is already in hand and the "after" is a rebuild it needs anyway. A sink-owned bracket can assume none of that, so it measures twice, checks identity, and keeps its own snapshot — and then every animating composition pays for the generality, including the ones using an axis that reports.

**The leak is symmetric and cannot be removed, only aimed.** Either bare `xy()` pays 164 B for a capability it does not use, or `y()`-plus-animation pays 262 B to 290 B for a cellular bracket it does not use. Both are §7. The first is smaller, falls on one row rather than two, and is bounded — it is one fixed routine, where the second grows with every axis shape the sink must cover blindly.

### 5 — The cheaper variant, and why it is still declined

A third shape is tempting enough that it will be proposed again, so it is recorded rather than left out.

The sink already receives the packed buffer at every rebuild through `settle`, and already imports the cache's stride constants — the coupling exists. So it could remember the buffer it was last shown, and diff the next one against it, obtaining the vectors with **no measurement at all** and no second loop. `xy()` would keep only the in-frame rebuild.

It is declined on two grounds that are not bytes. It needs an arming signal, so the sink's behaviour comes to depend on _how_ the axis maintained its cache — an axis that neither reports nor rebuilds in `moved` silently displaces nothing, which is an obligation on a **published** third-party contract that no type can state and no failure announces. And the sink would hold a parallel array of destination elements between committed moves, pinning DOM that the cache deliberately releases.

### 6 — Settled

**The current `xy()` machinery stays, and the 164 B is accepted deliberately rather than by default.** The counterfactual was built and measured; it is worse on five rows of six, worse on the row it was built for, and it taxes the linear minimal composition the proposal set out to protect.

What this does **not** rest on is preserving D-156's mechanism for its own sake. It rests on the measurement: the mechanism happens to be the cheapest place the capability can live, and that is why it stays.

**Two obligations follow.** The `xy + layoutAnimation` row is added permanently with its budget set from 10045 B. And the residue is recorded as an accepted cost against the row, so a later reader finds a decision rather than a drift.

## Part two — the stage a displacement fault reports

### 7 — The two paths differ in the label and in nothing else

`slots.movedInsertion(...)` runs inside `action.effect`, whose throws `handleBehaviorAction` classifies `FAILURE_ACTION_EFFECT`. The landed code wraps the call in its own `try` and reports `FAILURE_INVALIDATION` instead.

The seam driver is explicit that these are the same machinery: `runLeaf` exists _so those seams behave identically whether the behavior throws or calls `host.fail`_, and `runCore`'s catch calls `context.fail` with the effect stage. A throw propagating out of the bracket runs the same `finally`, invalidates the same cache, and latches the same way. **So this is a diagnostic question and only a diagnostic question**, which is what makes it settleable without touching lifecycle semantics (§13).

### 8 — Which stage is true

`failures.ts` defines the vocabulary in one sentence: _a stage says **where the library was standing** when a fault occurred_, and adds that no mapping from stage to recovery is published. A stage is a **location claim**, not a category.

The library was standing in the action seam's effect. `FAILURE_ACTION_EFFECT` is documented as exactly that, and D-74 renamed it from `FAILURE_PLACEHOLDER_MOVE` — it _is_ the placeholder-move stage, which is this bracket. Contract 06 already states the precedent for the mechanism this one replaced: a `beforeMove` hook throwing reports `FAILURE_ACTION_EFFECT` from the committed state.

`FAILURE_INVALIDATION` is produced in two places, both of them the invalidation path: the `TAG_INVALIDATION` prepare and `invalidateInSeam`. A consumer handed stage 6 will go and look at their `invalidate()` calls, their scroll and resize handling, or their collection source. The fault will have been in a `box` resolver, an overridden `getBoundingClientRect`, or an overridden `animate` on a row, reached from a committed move.

**That is not a coarser answer, it is a different one.** §1.3's concern is a classification that fails to discriminate; this is a classification that misdirects, which is worse. What the narrowing was reaching for — telling a hook's throw apart from the write's — is a discrimination the published vocabulary does not make. §1.3 says fix the vocabulary or accept the coarseness deliberately, and borrowing an unrelated code does neither.

**A new stage is declined.** `FAILURE_DISPLACEMENT` would be permanent from the day it ships (§4), the numbering already carries two deliberate holes, and the underlying error travels with the report. The coarseness is accepted, and named.

### 9 — The premise that preserving it was expensive is false

Preserving the stage does not require a `try` around each displaced-element report. It requires **one token**: the constant in the existing catch. Nothing per-element, nothing per-call.

Ablation **S** goes further and deletes the catch entirely, letting the throw reach the enclosing stage:

| Composition               | Δ Brotli | Δ minified |
| ------------------------- | -------: | ---------: |
| minimal                   |       +4 |        −32 |
| minimal (xy)              |       −8 |        −32 |
| minimal + layoutAnimation |       −5 |        −32 |
| complete                  |       −5 |        −32 |
| both behaviors            |       −7 |        −32 |
| free drag minimal         |        0 |          0 |

**Uniformly −32 B minified**; the Brotli column sits inside the ±25 B band the harness documents, with one row positive, and is not read as a win. So the true stage is free at worst.

### 10 — Settled

**Change the constant in the existing catch to `FAILURE_ACTION_EFFECT`.** One token, zero bytes, no behavioural change of any kind, and the stage becomes true on the vocabulary's own definition.

**Do not delete the catch in the same change**, although it is now redundant and measures −32 B minified. Deleting it moves one observable: when the hook throws **and** the `finally`'s invalidation then throws too, today the hook's error is latched first and wins, and without the catch the invalidation's error wins instead. That is a §13 observable — remote, but real — and it must not ride along inside a diagnostic correction. It is a legitimate separate candidate with its measurement already taken.

## 11 — Instrument notes

- Six control rows — the four free-drag compositions, `drag.js`, `kernel.js` — reported exactly 0 across every ablation here.
- The restored tree reproduces the landed baseline byte-exact across all fourteen rows.
- The first C2 measurement was **wrong and was caught by the number**: a patch step had failed silently, so the axis still carried its machinery and the row read +28 where the arithmetic said −132. Worth recording as method — a prototype ablation needs its deletion **verified in the tree**, not assumed from the script exiting.