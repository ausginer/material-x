# React placeholder probe

Executable answer to the contract-probe-2 question: what does React reconciliation
do to an imperatively inserted, unmanaged placeholder inside a controlled keyed
list?

- Fixture: `packages/drag/tests/support/react-probe.ts`
- Tests: `packages/drag/tests/react-placeholder-probe.browser.test.ts` (18 tests, Chromium, real layout)
- Corroboration: a live drag of the `Drag/Sortable → List` story, driven through CDP

Everything below is observed, not inferred. Numbers are viewport tops in px.

## What the engine actually does

Two facts from the source shape the whole experiment:

- The dragged item **is not removed from the React child list**. `kernel/presentation.ts`
  promotes it with a manual popover plus `position: fixed`, so it remains a
  React-owned child that no longer occupies flow. The placeholder is therefore
  the *only* unmanaged node among React's children.
- `startLanding` measures `placeholder.getBoundingClientRect()` inside
  `enterSettlement` (`sortable/runtime/actions.ts:1146-1152`), which runs
  **before** the readiness promise resolves. The landing plan is always built
  from pre-commit geometry.

The story recording confirms the sequence end to end:

| # | Event | DOM children (`(lifted)` = out of flow) |
|---|---|---|
| 1 | grab | `Inbox(lifted)@1072 \| [ph]@919 \| Drafts \| Sent \| Archive \| Spam` |
| 2 | placeInsertion | `Inbox(lifted) \| Drafts \| Sent \| Archive \| [ph]@1072 \| Spam` |
| 3 | React commit | `Drafts \| Sent \| Archive \| [ph]@1072 \| Inbox(lifted) \| Spam` |
| 4 | teardown | `Drafts \| Sent \| Archive \| Inbox@1072 \| Spam` |

React moved exactly one node — the lifted `Inbox` — and inserted it on the far
side of the placeholder. The placeholder stayed put, at the same `1072`.

## The mechanism

React positions its own host nodes with `parent.insertBefore(node, getHostSibling(node))`,
where `getHostSibling` walks forward through the new fiber order and **skips any
fiber that is itself being inserted**. React never reads, references, or reorders
a node it does not own.

Two consequences follow, and both are confirmed by the tests:

1. The placeholder is **never detached, replaced, or moved by React**. It was
   connected at the readiness point in every scenario tested.
2. Its resulting position is *incidentally* correct, not guaranteed. It survives
   because the only React node that normally has to land immediately before the
   placeholder's `after` anchor is the dragged item — which is out of flow, so
   its arrival is invisible.

That second point is exactly where it breaks.

## Scenario matrix

Base list `A B C D E`, drag `B`, destination gap between `D` and `E`. Flow shown
at the `useLayoutEffect` readiness point.

| Scenario | Accepted order | Flow after commit | Gap correct? | Geometry stable? |
|---|---|---|---|---|
| move down across placeholder | `A C D B E` | `A C D [ph] E` | ✅ | ✅ `120 → 120` |
| move up across placeholder | `A D B C E` | `A [ph] B C E` | ✅ | ✅ |
| placeholder at list start | `E A B C D` | `[ph] A B C D` | ✅ | ✅ |
| placeholder at list end | `A C D E B` | `A C D E [ph]` | ✅ | ✅ |
| neighbour removed | `C D B E` | `C D [ph] E` | ✅ | ❌ top decreases |
| anchor item removed | `A C D B` | `A C D [ph]` | ✅ | ✅ |
| item inserted above the gap | `A C X D B E` | `A C X D [ph] E` | ✅ | ❌ `120 → 160` |
| **item inserted into the gap** | `A C D X B E` | `A C D [ph] X E` | ❌ | ❌ |
| item resized | `A C(140) D B E` | `A C D [ph] E` | ✅ | ❌ top shifts |
| reused React elements | `A C D B E` | `A C D [ph] E` | ✅ | ✅ |
| Strict Mode | `A C D B E` | `A C D [ph] E` | ✅ | ✅ |

Strict Mode and element-identity reuse changed nothing. Post-paint observations
were byte-identical to the layout-effect observations in every case, so
`useLayoutEffect` is a sound readiness point — nothing settles later.

## The one failing scenario

The consumer accepts the reorder **and** mounts a new item into the very gap the
placeholder is holding:

```
accepted order:  A  C  D  X  B  E        (B lands after the new X)
pre-commit DOM:  A  B* C  D  [ph] E      (* lifted)
post-commit DOM: A  C  D  [ph] X  B  E
flow:            A  C  D  [ph] X  E
```

React flags both `X` (mount) and `B` (move) for placement and commits them in
fiber order. `getHostSibling(X)` skips `B` because `B` is also being placed, so
it resolves to `E` — and `insertBefore(X, E)` drops `X` between the placeholder
and `E`. `B` then lands after `X`.

The placeholder now marks the gap **before** `X`, while the dragged item was
accepted **after** it. It is off by one slot, and it is off *semantically*, not
just geometrically — remeasuring it yields a confidently wrong rect.

This is the only tested mutation that breaks the gap, and it requires the
consumer to insert a *newly keyed* item into the destination gap during the same
commit that accepts the reorder.

## Variant B — real item as the footprint

The control experiment: no unmanaged sibling at all: the real item stays in the
React-owned sequence as the layout footprint, and the visual clone lives outside
the list root.

| Scenario | Flow after commit | Gap correct? |
|---|---|---|
| move down | `A C D B E` | ✅ |
| item inserted into the gap | `A C D X B E` | ✅ |

The footprint is a React-owned keyed node, so React places it by key. It cannot
be displaced by a sibling insertion, because there is no unmanaged node whose
position has to be inferred. The commit that breaks Variant A is correct here by
construction.

## Verdict

**Is an imperatively injected placeholder reliable inside a React-reconciled keyed list?**
Yes for connectivity — React never detaches, replaces, or repositions it. Mostly
yes for position, but by coincidence of React's placement algorithm rather than
by any guarantee. There is no contract; a future change to `getHostSibling`
ordering could shift the result.

**Under which tested mutations does it move or become semantically incorrect?**
Exactly one: a new keyed item mounted into the destination gap during the
accepting commit. Reorders in either direction, boundary positions, removals
(including of its own anchor), insertions elsewhere, and resizes all keep the gap
correct.

**Is completion-time remeasurement of that placeholder trustworthy?**
Trustworthy for *geometry*, not for *semantics*. Remeasuring at the readiness
point fixes every stale-rect row in the matrix — and those rows are real: any
commit that adds, removes, or resizes content above the gap moves the placeholder
(e.g. `120 → 160`). It cannot fix the misplacement row, where the rect is
accurate for a position that is one slot wrong.

Worth noting that the current code measures *before* readiness and has not
visibly broken, because in a pure reorder the only element React moves is the
lifted one — flow geometry is provably identical across the commit (`120 → 120`
in the fixture, `1072 → 1072` in the real story). The bug is latent and only
surfaces when the consumer's commit changes list content.

**Does an optional mid-flight retarget solve the problem, or only hide stale geometry?**
Only hides it. A retarget re-reads the same node; if that node sits in the wrong
gap, a fresher rect is a fresher wrong answer. It closes the geometry window,
not the semantic one.

**Does keeping the real item as the footprint avoid the issue?**
Yes, and structurally rather than probabilistically — the footprint is keyed, so
React places it. The failing commit is handled correctly with no extra machinery.

**Smallest next design decision supported by the evidence**

Move the landing-plan measurement in `startLanding` from `enterSettlement` to
*after* the readiness promise resolves. It is a local reordering in
`sortable/runtime/actions.ts`, it closes every geometry-staleness row in the
matrix, and it needs no change to the placeholder strategy.

Treat the semantic misplacement separately. It is one narrow, reproducible case,
so it does not on its own justify moving to Variant B; if it needs closing, the
cheaper option is to re-derive the landing target from the committed `after`
anchor rather than from the placeholder node.

## Follow-up: the lifted item as semantic anchor

Experiment: at the readiness point, still inside the layout effect, apply

```js
draggedItem.before(placeholder);
```

Rationale from the source: the lifted item never leaves the React child list, so
after the commit React has already placed it at its **authored final slot**. If
that item is the anchor, the placeholder inherits authored semantics for free.

Fixture support: `commit(items, { repair })` performs the correction inside the
same layout effect and adds a `repaired` observation; `drop(id)` then removes the
placeholder and un-lifts the item, which lets each test compare the landing
target against where the item *actually* ends up. 35 tests, all passing.

### Result on the failing case

```
accepted order:  A  C  D  X  B  E
post-commit:     A  C  D  [ph] X  B  E     flow: A C D [ph] X E   ✗ gap before X
after repair:    A  C  D  X  [ph] B  E     flow: A C D X [ph] E   ✓ gap after X
after drop:      A  C  D  X  B  E                                 ✓
```

The correction resolves the single failure in the original matrix.

### Full matrix under the correction

Every row asserts four things: `connected`, the placeholder's `nextSibling`, its
rect, and the flow order after release. The rect assertion is the decisive one —
`repaired.placeholder` is compared against the dragged item's rect *after* the
placeholder is removed and the item un-lifted, i.e. against the position the item
genuinely occupies.

| Scenario | `nextSibling` | rect == item's landed rect | correction moved anything? |
|---|---|---|---|
| downward reorder | `B` | ✅ | no |
| upward reorder | `D` | ✅ | no |
| destination at start | `E` | ✅ | no |
| destination at end | `B` | ✅ | no |
| neighbour removed | `B` | ✅ | no |
| anchor removed | `B` | ✅ | no |
| neighbour inserted | `B` | ✅ | no |
| **item inserted into gap** | `B` | ✅ | **yes** |
| item resized | `B` | ✅ | no |

The last column is asserted, not inferred: in the seven already-correct rows
`repaired` is deep-equal to `layout`, so the correction is provably **inert**
wherever reconciliation already worked, and acts only on the case that broke. It
is a repair, not a new placement strategy.

Stability and teardown are also asserted: the post-paint observation is
deep-equal to `repaired` (order and rect), and after `drop` the placeholder is
disconnected with the flow order matching the accepted order exactly. The
correction does not interfere with subsequent removal.

### Timing: the readiness/landing join

The diagnostic handle is the smallest thing that distinguishes the three targets,
mirroring `advanceSettlement` — the presentation is released only once readiness
**and** landing have both arrived, in whichever order:

- `provisional` — measured when the landing plan is built (today: pre-commit);
- `reanchored` — measured at readiness, after the correction;
- `pinned` — measured at release, when both have joined.

Both orderings were run against the hard case (`A C D X B E`):

| Order | provisional | reanchored | pinned |
|---|---|---|---|
| readiness → landing | `top 120` | `top 160` | `= reanchored` |
| landing → readiness | `top 120` | `top 160` | `= reanchored` |

A third test asserts the two `pinned` values are equal to each other.

The provisional target is wrong by 40px in both orderings — and wrong
*semantically*, since at that moment the placeholder is on the wrong side of `X`.
The pinned target is correct in both.

**This preserves readiness/landing concurrency.** The pinned target is identical
regardless of arrival order, so the landing does not need to be created or
delayed until readiness — it can be built provisionally and run concurrently with
React's commit, exactly as it does today. In the second ordering the landing
animation completed while React's commit was still pending, and the outcome was
still correct, because the correction happens at readiness and the authoritative
measurement happens at the join. Delaying landing creation until readiness would
serialise the two and lose that overlap for no gain.

### Answer

**Can the React-owned dragged item serve as the authoritative semantic anchor for
repairing and measuring the placeholder after readiness?**

Yes, on the evidence gathered. The anchor is authoritative because it is keyed
and React-owned: React places it by key at its authored slot, which is precisely
the position the placeholder is supposed to represent. Anchoring to it converts
the placeholder's position from *incidentally* correct into *derived from* the
authored order.

Two caveats worth carrying into the design discussion rather than treating as
settled:

- The correction is only valid *after* readiness. Before the commit the item is
  still at its pre-drag slot, so `before()` would move the placeholder backwards.
  It is a repair at a specific point, not an invariant that can be maintained
  continuously.
- It depends on the lifted item remaining a React-owned child. That is true of
  the current lift (`kernel/presentation.ts`), but it becomes a load-bearing
  constraint on any future presentation strategy — a lift that detached or cloned
  the item would remove the anchor.

## Fixture limitations

- Only Chromium is configured in the drag browser project (`instances: [chromium]`),
  so no cross-browser comparison was run. Reconciliation happens at the DOM-API
  level and is browser-independent; only geometry could plausibly differ, and
  nothing measured here depends on UA layout behaviour.
- The lift is modelled with `position: fixed` rather than the popover top layer.
  The top layer changes paint order only — not flow, not the child list, and so
  not reconciliation.
- The fixture drives `setState` directly, as the story adapter does. `flushSync`
  was not exercised.
