# `mx-sortable-list` on drag (RD-31) — re-check of `reviewer-1`

**Files were read at:** `6ba689932`, the head of #90 (`repo/list-sortable-1`), in a private detached worktree. The fix is `6921f9aa9`, and `6ba689932` adds the implementer's report on it. The tree was clean apart from the scratch mutations and the probe this record names. Each was reverted or removed after its run.

**Subject:** [`reviewer-1`](feature-proof-claude.md#reviewer-1) of the [feature proof](feature-proof-claude.md) at `586a99e60`, and the implementer's section _`reviewer-1` of the feature proof_ in the [report](../../list-sortable-1/list-sortable-report.md). This is a re-check, not a new proof. The coordinator asked for five things: whether the fix closes the finding, whether the witness holds, whether the pointer row's gap is acceptable, whether the fix adds a re-read per item or re-entrancy during a drag, and why `complete` shrinks.

**Verdict: the fix closes `reviewer-1`, and the implementer's witness holds as written. I have no new finding.** Every number below is my own reading, saved in [`checks/`](checks/).

## Scope

**Covered.**

- **The fix,** read in `sortable-list.ts` at `6ba689932`. The provider's writer is `(host, control) => …`. When `host` isn't in `items`, the writer calls `refresh()` before `sortItem()`. The slot callback calls the same `refresh()` and then `commit?.()`. `refresh()` calls `controller?.invalidate()` only when the collection changed. Nothing else in the file changed, and drag didn't change.
- **The required property.** `reviewer-1` asked that a handle-less static item moves by keyboard and by pointer in either evaluation order, and that a row observe the move in each order. The four new rows (`sortable-list.browser.test.ts:1081`, `:1087`, `:1093`, `:1099`) parse two items, run the modules in the named order, and assert the dispatched moves are `[[0, 1]]`.
- **The witness,** rerun by me in Chromium, Firefox and WebKit ([`recheck-witness.txt`](checks/recheck-witness.txt)). Each failure set is identical to the implementer's [`order-move-mutations.txt`](../../list-sortable-1/checks/order-move-mutations.txt):

  | Mutation | Rows of the definition-order block that fail |
  | --- | --- |
  | `sortable-list.ts` at `db591498f` (the fix reverted) | The keyboard and the pointer move with `sortable-list.js` first, in each engine |
  | Core's definition wait removed (`if (false)`) | The tab stop and the keyboard move with `list-item.js` first, in each engine |
  | None | No row. 18 pass. The whole file passes 198 rows |

- **One mutation of my own:** the slot callback's `refresh()` removed, and the writer's kept. All six definition-order rows still pass, because the writer alone fills the collection. All of `tests/list` then fails 6 of 219 rows: the second keyboard move, with a handle and without one, in each engine. A move inside the list reconnects an item that is already in `items`, so the writer doesn't read again, and only the slot callback sees the new order. So the suite still witnesses the slot callback's read.
- **Reads of the slot, counted** ([probe](checks/recheck-reread-probe.browser.test.ts.txt), [output](checks/recheck-reread-probe.txt)). I counted `read()` calls and the writer's extra reads, with 1,000 items, in three engines, with the fix and with it reverted. The counts are the same in every engine:

  | Scenario | Reads, fix reverted | Reads, fix | Writer's extra reads |
  | --- | --: | --: | --: |
  | Append 1,000 in one synchronous loop | 1 | 1 | 0 |
  | Append 1,000, two microtasks apart | 1,000 | 1,000 | 0 |
  | `innerHTML` of 1,000 | 1 | 1 | 0 |
  | Parsed, then `sortable-list.js` first | 1 | 2 | 1 |
  | Parsed, then `list-item.js` first | 1 | 2 | 1 |
  | Drag: one item appended mid-drag, and one more appended by the `reorder` handler | 6 | 6 | 0 |

- **The `complete` row** ([`recheck-sizes.txt`](checks/recheck-sizes.txt)). I reproduced the implementer's numbers. The minified bundle differs only in `mx-sortable-list`'s constructor.

**Not covered.** The full material-x browser suite and the root `just test`. The coordinator didn't ask for them, and the implementer's [`reviewer-1-gates.txt`](../../list-sortable-1/checks/reviewer-1-gates.txt) records them. Safari, as before. The accessibility probe wasn't rerun.

## Findings

None. `reviewer-1` is closed by `6921f9aa9`. The answers below are observations, not findings.

## The coordinator's questions

- **The pointer row with `list-item.js` first has no mutation that fails it. The gap is acceptable.**
  - In that order the items are upgraded before the list, so the first slot read already returns them. A pointer drag doesn't need the item's context, because `handle` falls back to the item and `visual` reads `.host`. So no mechanism that depends on the order exists for the row to witness.
  - The row still observes what `reviewer-1` asked for: the move holds in that order. It would fail if a later change broke the collection in that order.
  - A mutation that fails it would have to stop both the slot callback and the writer from filling the collection, and that mutation fails every move row in the file.
- **A re-read per item on a long list: no.**
  - Core runs the item's lookup in a microtask after its connect when the parent is `mx-sortable-list` (`useContext`'s `whenDefined(…).then`). An insertion queues the slot's `slotchange` before the item's `connectedCallback` queues that lookup, so the slot callback reads first. The writer then finds the item in `items`.
  - The writer reads again only when a whole batch upgraded after the list's last `slotchange`, and then once per batch: the first item's read brings in the rest. With `list-item.js` first, `customElements.define` resolves `whenDefined` before it upgrades the list. So the first writer runs before the list's first `slotchange` and reads once, and the slot callback then finds no change. I read this order from the specification, and the counts agree with it.
  - What every item pays is one `items.includes(host)`, which is O(n), so O(n²) identity comparisons for a batch of n. That cost wasn't visible in the wall times, which are noisy and aren't a benchmark.
- **Re-entrancy during a drag: none new.**
  - The writer never runs inside the `reorder` dispatch, because the lookup is asynchronous. A writer that reads again mid-drag calls the same `invalidate()` the slot callback calls on the same change, one microtask later at most.
  - In the probe's drag, an item appended mid-drag and an item appended by the `reorder` handler caused no extra read. The move was `0 → 1`, the order was `B, A, C, mid-drag, late`, no item kept the `drag` state, and there was no unhandled error or `DragFault`, in each engine.
- **`complete` is 52 B smaller in Brotli because of how quality 11 compresses the bundle, not because code was removed.**

  | Bundle of `complete.js` | Before the fix | After | Change |
  | --- | --: | --: | --: |
  | Minified bytes | 105,321 | 105,354 | +33 |
  | Brotli, quality 5 | 23,956 | 23,972 | +16 |
  | Brotli, quality 9 | 23,492 | 23,509 | +17 |
  | Brotli, quality 11 (size-limit's reading) | 22,144 | 22,092 | −52 |
  | gzip -9 | 26,053 | 26,066 | +13 |

  The minified code grows by 33 bytes, every other compressor reads it larger, and the only source difference is the constructor. The −52 is quality 11's modeling of the reordered constructor. It's an artifact of the instrument, and it says nothing about the code's weight. The standalone `list/sortable-list` row, +26 B, is the reading to use.