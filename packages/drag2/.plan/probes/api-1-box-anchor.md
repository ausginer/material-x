# Probe api-1 — `box`/`visual` footprint and placeholder anchoring

**Question.** Synthesis v3 §5 introduces `box(item)` alongside `visual(item)` and leaves three things open: what the placeholder's footprint should be when only a nested visual leaves flow, whether `item.after(placeholder)` remains a correct anchor under `display: contents`, and whether grid and slotted layouts work at all.

Repo evidence before this probe: **none**. The only `display: contents` test in the package is `tests/kernel/presentation.browser.test.ts:257-273`, and it is about transform space for the lift delta, not about placeholder anchoring. No grid layout and no `<slot>` appears anywhere in `tests/`.

**Shape.** Unlike `13a`/`13b`/`13c` this is not a typed compile probe — the claims are layout facts, and `tsc` cannot see a layout fact. It is a static fixture measured in Chromium. It uses **no library code**, so it is valid independently of the redesign and cannot go stale against `src/`.

**Method.** `getBoundingClientRect()` before and after adding `position: fixed` to the nested visual, and before and after inserting a placeholder. Chromium 1280×720, `deviceScaleFactor: 1`.

## Fixture

```html
<style>
  .list-flex {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 400px;
  }
  .list-grid-auto {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    width: 400px;
  }
  .list-grid-explicit {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    width: 400px;
  }
  .list-grid-explicit > * {
    grid-column: 1;
  }
  .list-grid-explicit > *:nth-child(even) {
    grid-column: 2;
  }

  x-row {
    display: contents;
  }
  .row-box {
    display: flex;
    gap: 8px;
    background: #eef;
    border: 1px solid #99f;
  }
  .card {
    flex: 1;
    height: 60px;
    background: #cfc;
  }
  aside {
    width: 80px;
    height: 30px;
    background: #fcc;
  }

  .lifted {
    position: fixed;
    top: 0;
    left: 0;
  }
</style>

<!-- A: box has a sibling that stays in flow -->
<div class="list-flex">
  <x-row
    ><div class="row-box">
      <article class="card">A2</article>
      <aside>x</aside>
    </div></x-row
  >
</div>

<!-- B: the visual is the box's only content -->
<div class="list-flex">
  <x-row
    ><div class="row-box"><article class="card">B2</article></div></x-row
  >
</div>
```

with `item = x-row`, `box = .row-box`, `visual = .card`, exactly as §5 specifies.

## Measurements

### R-1 — an ancestor `box` collapses when the nested `visual` is lifted

| case | `box.height` pre-lift | post-lift | `visual.height` |
| --- | --- | --- | --- |
| A (sibling `<aside>` remains) | 62 | 32 | 60 |
| B (visual is the box's only child) | 62 | 2 | 60 |

Confirms review 3's ordering catch empirically: any `box` measurement taken after `acquireLift` is wrong, and wrong by a different amount in each case.

### R-2 — the correct placeholder footprint is neither `box` nor `visual`

For case A the list must lose exactly **30px** of height when the visual leaves flow — the remaining `<aside>` still holds 32px of the original 62.

| candidate rule | case A | case B | correct? |
| --- | --- | --- | --- |
| `box` height (pre-lift) | 62 | 62 | no — over-sizes both (double-counts the residue in A, the border in B) |
| `visual` height | 60 | 60 | no in A (over by 30); yes in B |
| **`boxPre.height − boxPost.height`** | **30** | **60** | **yes in both** |

Measured list height confirms it: the list collapsed by exactly 30 (A) and 60 (B) when the visual was lifted, with the placeholder not yet inserted.

**Consequence for §5.** The footprint rule needs **two** measurements — one before the lift and one after — not the single pre-lift capture §5 prescribes. The pre-lift capture is still required (for the landing offset and the candidate rect); it is not sufficient. See C-3 in the probe plan.

The timing is available today at no structural cost: `acquireLift` runs at `src/kernel/kernel.ts:900` and the activation seam only at `:942-950`, so the pre-lift read belongs beside the existing `getBoundingClientRect()` at `:899` and the post-lift read inside `activation.prepare`, where `src/sortable/placement.ts:64-65` already measures. The cost is one additional forced layout per activation.

### R-3 — under `display: contents` in flex, `item.after()` and `box.after()` are identical

| anchor           | placeholder rect            | parent    |
| ---------------- | --------------------------- | --------- |
| `item.after(ph)` | `{x:0, y:140, w:400, h:30}` | the list  |
| `box.after(ph)`  | `{x:0, y:140, w:400, h:30}` | `<x-row>` |

Byte-identical geometry. `display: contents` hoists the placeholder out of `<x-row>` into the list's flex formatting context at the same position.

**Consequence.** §5's open question "is `box.after()` universally correct" resolves to: for flow and flex layouts it does not matter, and the current `item.after(placeholder)` needs no change. Keep it — it is also the anchor that survives the consumer detaching `box`.

### R-4 — the `box`/`visual` split does not compose with grid

In a 2-column auto-flow grid, lifting a nested `visual` leaves the `.row-box` still a grid item — it collapses in height but **still occupies a cell**. Inserting a placeholder therefore yields _two_ cells where the layout has one item, and every following item is displaced by one cell. Footprint arithmetic cannot repair this: cell occupancy is not a size.

Measured: inserting a 20px placeholder after G2 moved G3 from `(0,404)` to `(204,404)` and G4 from `(204,404)` to `(0,474)` — a full cell shift, and the placeholder's own height was ignored (the row is sized by its tallest item).

**Consequence.** In a grid, either `box === visual` (so the whole grid item leaves flow) or the layout is unsupported. This is a documentable scope limit, not a bug to fix.

### R-5 — grids that place items by rule rather than by order are unsupportable

With `grid-column` assigned via `:nth-child(even)`, inserting a placeholder re-parities the selector and **relocates items unrelated to the drag**: E3 moved `(0,514) → (204,514)`, E4 `(204,514) → (0,562)`.

DOM order does not determine visual position in such a grid, so a DOM-insertion reorder model has no meaning there. The library cannot detect the condition cheaply — `getComputedStyle().gridColumn` per item would be an O(n) style read that is still only a heuristic.

**Consequence.** State the requirement positively in the contract: _the sortable collection must be a container whose visual order follows DOM order_. Do not attempt detection.

### R-6 — copying the `slot` attribute to the placeholder is load-bearing

Placeholder inserted into the light tree next to a slotted item:

| placeholder | rect | `assignedSlot` |
| --- | --- | --- |
| with `slot="row"` copied from the item | `{x:0, y:660, w:400, h:40}` — exactly the item's gap | `row` |
| without the `slot` attribute | `{x:0, y:0, w:0, h:0}` | `null` |

An unassigned placeholder is not rendered at all: zero rect at the origin, which would then be measured as the landing target.

**Consequence.** `src/sortable/placement.ts:63,87-91` (copy `item`'s `slot` onto the placeholder) is correct and must survive the redesign. Note it copies from **`item`**, not from `box` — correct, because the placeholder stands in for the item's position in the light tree. A `box` in a different slot from its `item` is an untested edge; the contract should say the placeholder follows `item`.

A lifted slotted item collapses its slot position normally (host 146 → 98).

## What this probe does not claim

- Chromium only. R-1/R-2 are CSS box-model consequences and should be cross-checked once in WebKit and Gecko, but no engine-specific behavior is suspected.
- Static fixture. It says nothing about the footprint rule holding **during** a live drag while `layoutAnimation()` is running transforms on the same elements. That residue is the only part of §5 still needing a runtime probe.
- It does not exercise any library code and therefore proves nothing about lifecycle, ordering under failure, or teardown.