# `mx-sortable-list` on drag (RD-31) — feature proof

**Files were read at:** `586a99e60`, the head of #90 (`repo/list-sortable-1`), in a private detached worktree. **Base:** `origin/main` at `87fc2d2db`, which is an ancestor. The tree was clean apart from the scratch probes this record names, each of which was removed after its run.

**Governing records:**

- `repo:RD-31` in [`00-index.md`](../../decisions/RD-31.md), with its six amendments.
- The [plan](../../list-sortable-1/list-sortable-plan.md): section 4, [How a static item takes focus](../../list-sortable-1/list-sortable-plan.md#how-a-static-item-takes-focus), [Where the sortable writes live](../../list-sortable-1/list-sortable-plan.md#where-the-sortable-writes-live), tasks 1 to 7, the stop conditions and the test map.
- The [report](../../list-sortable-1/list-sortable-report.md), including _After `RF-69`_.

**Lens:** feature proof. I compared the implementation and its tests against RD-31 and the plan, in Chromium, Firefox and WebKit. Every number below is my own reading, saved in [`checks/`](checks/). Nothing is repaired, and no record is amended.

**Verdict: the unit implements RD-31, with one exception, and every claim the coordinator listed holds. One Tier A finding goes to the implementer:** when `list/sortable-list.js` is evaluated before the item modules, with the markup already parsed, an item becomes a tab stop but can't be moved ([`reviewer-1`](#reviewer-1)). The definition-order rows observe only the tab stop, so they pass.

## Scope

**Covered.**

- **The gates,** run by me ([`gates.txt`](checks/gates.txt)):
  - `tests/list` in three engines: 207 rows pass.
  - material-x's browser projects in three engines: 848 rows pass, and 1 fails as expected.
  - The root `aube exec just test`: 151 files and 2,467 rows pass, with no type errors.
- **Sizes against `main`,** byte-exact, from both trees ([`sizes.txt`](checks/sizes.txt)):

  | Row | `main` | PR | Change | Bound |
  | --- | --: | --: | --: | --- |
  | `list/list` | 3,673 | 685 | −2,988 | doesn't grow |
  | `list/list-item` | 2,567 | 2,828 | +261 | ≤ 3,100 |
  | `list/list-button-item` | 4,575 | 4,667 | +92 | ±150 |
  | `list/list-link-item` | 4,746 | 4,885 | +139 | ±150 |
  | `list/sortable-list` | — | 8,579 | new row | ≤ 9,600 |
  | `complete` | 17.08 kB (size-limit) | 22,144 | — | — |

  Every bound holds, and each number equals the report's.

- **The import graph:**
  - No plain list row contains a module of drag or box-quad, or `sortable-item.js`. The only shared module the plain items carry is `sortable-list-context.js`.
  - The description text is only in the built `sortable-list.js` and `sortable-item.js`.
  - No built `.d.ts` names an `@ydinjs/drag` specifier. The one match is a JSDoc sentence in `list/sortable-list.d.ts`.
  - The manifest lists `mx-sortable-list` with the `reorder` event and no attribute.
- **The standing check can fail** ([`standing-check.txt`](checks/standing-check.txt)). With `import '@ydinjs/drag/sortable.js'` added to `ListItemCore.ts`, or to `sortable-list-context.ts`, the three item rows fail. Reverted, all 19 rows pass.
- **Mutations,** each run in three engines ([`mutations.txt`](checks/mutations.txt)). Each mutation below fails the named rows in every engine, unless the row says otherwise:

  | Mutation | Rows that fail |
  | --- | --- |
  | Core's definition wait removed | The definition-order row with `list-item.js` first |
  | `SORTABLE_LIST_ELEMENTS` empty | The same row |
  | `requestDestroy()` removed from the disconnect | The commit-wait disconnect row in every engine, and the mid-drag teardown row in Firefox. Plus 18 unhandled `DragFault`s |
  | `requestDestroy()` replaced by `requestCancel()` | No row fails, but 9 unhandled `DragFault: drag: sortable/landing-placeholder-lost` errors fail the run. So _"reports no DragFault"_ is witnessed by Vitest's unhandled-error gate, not by a row assertion |
  | drag's `handle` set to the item itself | _"should not start a drag when the press misses the handle"_ and _"should not move an item with a handle from another focused element"_ |
  | The static item's `tabIndex = 0` removed | 12 rows in Chromium and WebKit and 11 in Firefox, including both definition-order rows, Tab, Shift+Tab and `focus()` |
  | The parent check removed | The nested-`mx-list` row |
  | The item's `release()` removed from the context cleanup | The _"leaves the list"_ row and the _"moved into `mx-list`"_ row |

- **Handle-only and handle-less focus.**
  - A handle gates both pointer presses and keyboard commands (the `handle` mutation above).
  - A handle-less static item's inner `.host` gets `tabindex="0"` and the description, and loses both when the item gains a handle or leaves the list.
  - Nothing is written on the item's host.
- **Destroy on disconnect:** the source calls `requestDestroy()` and clears the `drag` state itself (`sortable-list.ts`, `use(this, …)`). drag's README says a destruction during a drag removes that drag's `onEnd` and landing. The mutations above witness both.
- **No reference to core's deleted trait:** `git grep` for `reorderable`, `Reorderable`, `useReorderableItem`, `enhanceHandle`, `data-footprint`, `traits/reorderable` and `AnimationTiming` finds nothing outside `.plan/` and the lockfile. `traits-baseline` changes in exactly task 4's four ways.
- **The accessibility probe,** rerun as the plan's task 3a asks ([`a11y-both-orders.txt`](checks/a11y-both-orders.txt)). In both definition orders the output equals `checks/list-a11y-after.txt`, byte for byte.

**Not covered.**

- Safari, which the owner deferred.
- The inner `.host` as the visual and focus target, and RD-31 item 7 (a consumer's `tabindex`). #99 amends both.
- Pointer input in the definition-order case of `reviewer-1`. I read only the keyboard, and pointer presses read the same collection.
- Storybook and `just docs-build`. I read the stories and `list.mdx` as text only.

## Findings

<a id="reviewer-1"></a>

### Local finding reviewer-1 — an item that upgrades after its sortable list is never in the list's collection

**Tier A. Recipient: the implementer.** RD-31 already states the required property, so no decision changes.

- **Current behavior.**
  - `mx-sortable-list` builds its collection only in its slot's `slotchange` callback (`sortable-list.ts:201`–`:208`), and keeps only elements that are `instanceof ControlledElement` (`:130`–`:135`).
  - drag reads that array through `items: () => items` (`:144`).
  - Suppose the markup is parsed first and `list/sortable-list.js` is evaluated before `list/list-item.js`. The list's first `slotchange` sees items that aren't upgraded yet, so the collection is empty. An upgrade fires no `slotchange`, so the collection stays empty until some later slot change.
  - Meanwhile each item resolves the list's context, so it becomes a tab stop with the description _Use the arrow keys to move_.
- **Evidence** ([probe](checks/order-probe.browser.test.ts.txt), [output](checks/order-probe.txt)). The page holds three handle-less `mx-list-item`s, parsed in an iframe before the modules run, as in the plan's definition-order row. ArrowDown on the focused first item gives these results, in Chromium, Firefox and WebKit:
  - **`sortable-list.ts` first:** the item has focus, and no `reorder` event is dispatched.
  - **`list-item.ts` first:** one event, `0 → 1`.
  - **`sortable-list.ts` first, then one element appended to the list and removed:** one event, `0 → 1`. That isolates the cause: the stale collection.
- **Why it is a problem.**
  - A consumer who writes static HTML and imports the sortable list before the items is correctly integrated. That consumer gets a list whose items are announced as movable and don't move.
  - Section 4 of the plan says that every item of a sortable list can be dragged.
  - Section 2 chose an element over a side-effect import because sorting mustn't depend on evaluation order.
  - The plan's own accessibility probe evaluates `list/sortable-list.js` first.
  - Both definition-order rows (`sortable-list.browser.test.ts:1004`, `:1010`) assert only `tabindex`, so they pass while the move fails. Every other row defines the list and the items before they connect.
- **Required property.** With the markup parsed first, a handle-less static item of `mx-sortable-list` moves by keyboard and by pointer, whichever of `list/sortable-list.js` and `list/list-item.js` is evaluated first. A row observes the move, not only the tab stop, in each order.
- **Re-checked at `6ba689932`: closed by `6921f9aa9`.** See the [re-check](feature-proof-recheck-claude.md).

## Observations, not findings

- **The slot names in the plan's ruling item 3, `start` and `end`, differ from the template's `lead` and `trail`.** The code follows the template. The report's _Open_ already records the mismatch as pre-existing in `mx-list-item`'s JSDoc and in `list.mdx`'s usage snippet, so I don't report it again.
- **The 500 ms commit bound, the announcement text and the footprint rule** match section 4.