# Probe api-2 (C1) — the consumer commit window for imperative renderers

**Question.** Synthesis v3 §9 promises that "the consumer commit is explicitly allowed to reorder authored DOM around library-owned presentation nodes… The library re-establishes the placeholder from the frozen semantic proposal." Does that hold when the renderer is imperative rather than React?

Repo evidence before this probe: **React only**. The re-anchor is covered by `tests/sortable/react.browser.test.ts:480-702` and `.plan/react-placeholder-probe.md`, both of which mutate the list the way React does — keyed reconciliation that moves individual rows and leaves every other child alone. A grep confirms `replaceChildren`, `innerHTML` and `createPortal` appear **nowhere** in `tests/` or `src/`.

**Shape.** A browser fixture against **unmodified `src/`**, using the current API: `onReorder` → mutate the container synchronously → `controller.updateItems` → `controller.ready(request)` → `ReorderResolution.accept({ presentation: true })`. The serial `await committed` model does not exist yet; this probes the _window_, not the protocol. Fixture: `tests/probe-c1-commit-window.browser.test.ts` (throwaway — delete or promote when the redesign lands).

**Method.** Chromium 1280×720, `deviceScaleFactor: 1`. A three-row list at viewport `(50, 100)`, rows 100×40, so the origin is **not** the viewport origin and a detached measurement is distinguishable from a correct one. Row `a` is dragged into slot 1; every case receives the same request (`from: 0, to: 1`) and commits the same authored order `b, a, c`. All rects are rounded `getBoundingClientRect()` readings.

## What the library actually does in this window

Observed rather than assumed, and the three measurement points matter for everything below:

| when | site | `authoredReady` | what it does |
| --- | --- | --- | --- |
| provisional | `kernel.ts:1277` (`armSettlement`) | **false** | measures, hands the runner `context.target` |
| corrected | `kernel.ts:1826-1834` (`handleReadinessSettled`) | true | re-anchors, then `handle.retarget?.(…)` |
| authoritative | `kernel.ts:1386` (`joinSettlement`) | true | re-anchors, then `session.write` pins |

The re-anchor itself is `src/sortable/spec.ts:1207-1265`, and it is `item.before(placeholder)` guarded by three conjuncts (`:1226-1237`): `item.isConnected`, `item.parentElement === placeholder.parentElement`, and `placeholder.nextElementSibling !== item`.

**That is a repair relative to the dragged item's current siblinghood, not a re-establishment from the frozen proposal.** §9's wording describes a different mechanism from the one that ships. Every result below follows from that difference.

## Results

### R-1 — three of the five commits break it, and all three break identically

| case | commit | placeholder after commit | re-anchor | corrected target | row's real slot |
| --- | --- | --- | --- | --- | --- |
| 1 | `root.replaceChildren(...items)` | **detached** (`parent: none`) | no | `{x: -50, y: -100}` | `(50, 140)` |
| 2 | `root.innerHTML = ''` + rebuild | **detached** | no | `{x: -50, y: -100}` | item detached |
| 3 | `for (const i of items) root.append(i)` | index 0, connected | **yes** | `{x: 0, y: 40}` | `(50, 140)` |
| 4 | morphdom-style patch | index 3 (tail), connected | **yes** | `{x: 0, y: 40}` | `(50, 140)` |
| 5 | container replaced | in the **removed** container | no | `{x: -50, y: -100}` | `(50, 140)` |

Targets are origin-relative deltas, the space `lift.write` consumes; the origin is `(50, 100)`. `{-50, -100}` is therefore the **viewport origin**: a detached placeholder measures `{x: 0, y: 0, w: 0, h: 0}`, and that zero rect becomes the landing target verbatim.

The failing conjunct is the same in all three: `item.parentElement === placeholder.parentElement`. In case 1 the placeholder has no parent; in case 5 it has one, but it is the container the commit discarded; in case 2 both the placeholder _and_ the item are detached, so `item.isConnected` fails first.

### R-2 — the two that hold, hold exactly

Case 3 is sketch A's own `for (const item of items) root.append(item)` loop. The placeholder is not in `items`, so every append pushes it one slot earlier and it ends at index 0 — still connected, still in the right container. The re-anchor moves it to index 1 and the arithmetic closes:

```text
origin.y (100) + corrected target.y (40) = 140 = the row's final rect
```

Case 4 detaches the two rows the patch decided had moved and reinserts them around the item, stranding the placeholder at the **tail** (index 3, y = 180 — two slots below where it belongs). The re-anchor moves it back to index 1 and the same identity closes. Both end at `order: 'bac'`, item at `(50, 140)`.

A case where the promise holds is as valuable as one where it breaks: **the mechanism is not React-specific**. It is _siblinghood_-specific.

### R-3 — every failure is silent

| case | `onError` | `onFinish` | `onCancel` | placeholders left in the document |
| --- | --- | --- | --- | --- |
| 1 | 0 | 1 | 0 | 0 |
| 2 | 0 | 1 | 0 | 0 |
| 3 | 0 | 1 | 0 | 0 |
| 4 | 0 | 1 | 0 | 0 |
| 5 | 0 | 1 | 0 | 0 |

Nothing is classified. The consumer is told the drop was **accepted** in all five. Teardown is clean in all five, including case 5, where `placeholder.remove()` still reaches into the discarded subtree — the placeholder's `parentElement` is `null` afterwards.

This is by design in the source: the guard exists precisely so a consumer that unmounted or re-keyed the item does not have the placeholder dragged into a detached tree (F-15, Q-12). It degrades rather than failing. What the probe adds is that the degradation is **not observable to the consumer at all**, and that it is 140px wide.

### R-4 — what the user sees

Case 1 re-run with the shipped runner (`landing({ duration: 200, easing: 'linear' })`), sampling the lifted row every frame between release and the join:

```text
(46,133) (42,121) (37,109) (33,97) (29,85) (25,72)
(21,60)  (17,48)  (13,36)  (8,24)  (4,12)  (0,0)   →   (50,140)
```

The row travels the full distance to the **top-left corner of the viewport** over the landing, then teleports into its slot when the join pins and presentation is released. It is not a small mismatch that a user might miss.

The fixture asserts bounds rather than these exact samples — which frame the landing ends on is scheduling, not behaviour — but the samples above are the observed run.

### R-5 — the provisional target is stale in **every** case, including the two that hold

| case | provisional (`context.target`) | corrected (`retarget`) | stale by |
| --- | --- | --- | --- |
| 1 | `{-50, -100}` | `{-50, -100}` | — (both wrong) |
| 2 | `{-50, -100}` | `{-50, -100}` | — (both wrong) |
| 3 | `{0, 0}` | `{0, 40}` | 40px |
| 4 | `{0, 80}` | `{0, 40}` | 40px, the other way |
| 5 | `{-50, -100}` | `{-50, -100}` | — (both wrong) |

`authoredReady` is false at `armSettlement` when the resolution declared a presentation, so the provisional reading is taken **before** the re-anchor by construction — even when the consumer already committed synchronously inside `onReorder` (`kernel.ts:1254-1262` dispatches the release rather than applying it inline, deliberately).

`landing()`'s own contract says `retarget` is "trajectory quality only — a runner that omits it is fully correct" (`src/sortable/landing.ts:175-179`). Composed with the table above: **a conforming custom runner that omits `retarget` animates toward a stale target for the whole landing in every one of these cases**, and the correction arrives as a single-frame snap at the join. The default runner implements it, so this is invisible to anyone who has not written a spring.

### R-6 — the frozen proposal's neighbours survive where the item-relative repair does not

`ReorderRequest` already carries identity neighbours (`before`, `after`, `src/sortable/domain.ts:44-52`). Measured at the same moment as R-1, after the commit:

| case | `request.before` | `request.after` | both connected? | same parent? |
| --- | --- | --- | --- | --- |
| 1 | `root[0]`, y = 100 | `root[2]`, y = 140 | yes | yes |
| 2 | detached | detached | **no** | — |
| 3 | `root[1]`, y = 140 | `root[3]`, y = 180 | yes | yes |
| 4 | `root[0]`, y = 100 | `root[2]`, y = 140 | yes | yes |
| 5 | `group2[0]`, y = 100 | `group2[2]`, y = 140 | yes | yes |

In case 5 the neighbours **followed the rows into the new container**, which is exactly where the placeholder needed to go.

So four of the five commits left a well-defined anchor pair that the current repair does not consult. Only case 2 — where item identity is destroyed — is beyond any anchor-based repair, because the anchors are destroyed with everything else.

**Consequence.** §9's stated mechanism ("re-establishes the placeholder from the frozen semantic proposal") is strictly stronger than the shipped one, and the difference is worth exactly the three broken cases. Two things follow, and they are separable:

1. Re-establish from `request.before`/`request.after` — insert before `after`, else after `before`, else fall back to the item — and cases 1 and 5 repair themselves. Case 4 is repaired by either rule.
2. That repair requires **deliberately relaxing** `movePlaceholder`'s cross-container refusal (`src/sortable/placement.ts:238-242`), which today is load-bearing for the mid-drag path and is pinned by `placement.browser.test.ts:250-296`. The post-commit re-establishment is the one moment where following the anchors into a new container is _correct_ rather than corruption. That is a contract change, not a bug fix, and the two paths would need different rules.

### R-7 — the api-1 footprint rule survives a live drag; the library's placeholder sizing does not

api-1's L-1 was established on a static fixture with no library code. Re-run here during a live drag with `layoutAnimation({ duration: 4000 })` installed and transforming the same list. `box()` does not exist in the current API, so it is modelled: `visual()` resolves to a `.card` descendant, and the item element is the wrapper this probe measures by hand. Rows are `card (100×60) + aside (80×30)`, so the wrapper is 60 tall and keeps 30 when the card is lifted.

| reading | value |
| --- | --- |
| `boxPre.height` (before the activating move) | **60** |
| `boxPost.height` (after the lift) | **30** |
| `boxPre − boxPost` | **30** |
| placeholder height the library actually applies (`visual.offsetHeight`) | **60** |
| list height before the drag | **180** |
| list height during the drag | **210** |

The difference rule reproduces api-1's number exactly under a live drag. It also makes the current defect measurable: the placeholder is sized from the visual's offset box, so the list is **30px too tall for the entire drag** — api-1's R-2 predicted this from a static fixture, and this is it happening inside a real operation.

**Does a running transform corrupt either measurement?** Measured on a row `layoutAnimation` was mid-flight on (1 running animation, 4s duration):

| reading                                                     | value          |
| ----------------------------------------------------------- | -------------- |
| wrapper `getBoundingClientRect().top`                       | 190            |
| wrapper's untransformed layout top (`LIST_TOP + offsetTop`) | 130            |
| corruption of `top`                                         | **60px**       |
| wrapper `getBoundingClientRect().height`                    | 60             |
| wrapper `offsetHeight`                                      | 60             |
| corruption of `height`                                      | **0**          |
| dragged item's own wrapper, same instant                    | 30 — unchanged |

So: **a running `layoutAnimation()` translate offsets the box's position by the full in-flight delta and leaves its height untouched.** The footprint rule is a height _difference_ and is therefore immune. The landing offset and the candidate rect, which are positions, are not.

And the hazard is unreachable for the dragged item in any case, for three independent reasons that were checked rather than reasoned about: `layoutAnimation` never animates the dragged item (`layout-animation.ts:117`); release settles every displacement before the proposal is built (`settleDisplacement`, `spec.ts:931`); and `retire()` cancels whatever is left. Re-grabbing the just-displaced row immediately after the previous drag settled:

| reading                                   | value                |
| ----------------------------------------- | -------------------- |
| animations on that row before the re-grab | **0**                |
| `boxPre.y`                                | 160 = its layout top |
| `boxPre − boxPost`                        | **30**               |

**Consequence for C-3.** The two-capture amendment stands unchanged. The measurements it prescribes are a height difference taken at activation, and neither the elements nor the moment can be carrying a library-applied transform. No additional ordering constraint is needed.

## What this probe does not claim

- **Chromium only.** Every number is a box-model or WAAPI consequence and no engine-specific behavior is suspected, but none of it was cross-checked.
- **It says nothing about the redesign's protocol.** The commit is synchronous and inside `onReorder`; a deferred commit and a serial `await committed` are different timings, and neither was exercised. What generalizes is the _guard_, which is timing-independent: it reads siblinghood at whatever moment it runs.
- **It says nothing about lifecycle under failure.** Nothing in these five cases throws, destroys the controller, or leaves an operation un-terminated; all five finish exactly once.
- **R-6 is a measurement of what the anchors were, not a demonstration that a repair built on them works.** No such repair exists to run. The claim is that four of five commits left one available, and that the current code does not look at it.
- **R-7 models `box()`; it does not test one.** It is layout arithmetic measured by the fixture, and it inherits api-1's scope limits unchanged — in particular L-3 (in grid, `box` must equal `visual`) and L-4 (rule-placed grids are unsupportable).
- **No latency is measured**, here or anywhere in the C1 scope.