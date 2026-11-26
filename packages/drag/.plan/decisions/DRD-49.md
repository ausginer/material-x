#### DRD-49 — `y()` measures a window of rows that grows from the placeholder toward the pointer

**Status:** active, decided on 2026-11-12 by the architect on the trace report at `e92e21eed` ([assessment](../free-drag-drop-assessment.md) §2), under `DRD-46` property 8. Narrows `y()`'s terms. Amended the contract's `DRI-14` at `501f60ab7`. **Implemented at `501f60ab7` and confirmed** ([report](../performance-window-report.md) at `56c1c27c3`, [assessment](../performance-window-assessment.md)). The owner approved its scope and ordering term on 2026-11-12, before the unit. Property 8 amended by `DRD-50`. The owner accepted its final bytes on 2026-11-12, as `DRD-50`'s unit measured them (`DRO-4`)

**The second optimization unit is the trace report's candidate 1, in a bounded form. `y()`'s cache no longer measures every row at a resolution after it was marked stale. It measures a contiguous window of slots that starts next to the placeholder and grows toward the pointer until the window brackets the pointer, or reaches an end of the list. The nearest center in that window is the nearest center in the list, provided the rows' centers increase along y in the collection's order. `y()`'s terms say that, and that narrows them. `xy()` doesn't change. A focused paired measurement of the cycle rows confirms the change, and the move rows show that nothing is slower.**

Decided on 2026-11-12 by the architect, on [`performance-trace-report.md`](../performance-trace-report.md) at `e92e21eed` ([assessment](../free-drag-drop-assessment.md) §2), under `DRD-46` property 8. The owner asked for the next optimization candidate from the existing traces, with budgets unchanged and the deferred campaigns stopped.

**Why:**

- **It is the largest remaining library cost.** The activation's first resolution measures 1,999 rows at 2,000 items: 2,650 [1,932–5,192] \| 3,066 µs sampled at `rect-index.ts:refresh`. `DRD-47` removed the same scan from the drop and saved 2,449 µs per cycle, against an A/A bound of 409 µs on the same row.
- **The rows a resolution needs are next to the placeholder.** After every resolution the placeholder holds the gap nearest the pointer. At activation it holds the dragged item's slot, within the threshold of the pointer. After a scroll it is where it was, and the pointer has moved by the scroll. So a window that starts at the placeholder's gap and grows toward the pointer reads few rows, and no search or per-slot mask is needed.
- **The window gives the full scan's answer, given order.** When the centers increase along y in the slots' order, the nearest center to the pointer is one of the two slots whose centers bracket it. If the window holds both, or reaches the end of the list on the side that lacks one, then the nearest center and its first-in-order tie in the window are the same as in the whole list. The placeholder's incumbency doesn't change.
- **Every user of the cache stays inside the window** ([assessment](../free-drag-drop-assessment.md) §2): the scan, `moved`'s crossed slots and probe, `DRD-47`'s confirmation, and the development check. The slots' elements are still known for every slot, so `insertionAt` and the sink's `report` are unchanged.
- **It reads at most what the full scan reads.** Each slot is read at most once per measurement, that is, between two invalidations. During an autoscroll, which invalidates every frame, a frame reads the rows from the placeholder to the pointer instead of all of them. That is inferred, and no row measures it.
- **The order is a narrowing.** `y()`'s terms require a linear flow along one column. They allow an authored transform on a row, and so a center out of order, which a full scan handles. A transform large enough to carry a row's center past a neighbour's isn't a list layout that a column reorder serves, so the term is narrowed and not supported by a slower path. The direction isn't a narrowing: `linearShift` predicts each move after the first with a sign that assumes centers increase in the collection's order, so a `column-reverse` list is already outside `y()`'s terms.

**Required properties:**

1. **The window.** `y()`'s cache holds measured geometry for one contiguous range of slots, and the slots' elements for every slot. A measurement starts with no measured slot. Before the nearest-center scan, a resolution grows the window from the slots next to the placeholder's gap, one slot at a time toward the pointer, until it holds the two slots whose centers bracket the pointer's y, or the list's end on the side that lacks one. The scan runs over the window only. How the first gap is found when the query holds no insertion is the unit's choice.
2. **Reads.** A slot is read at most once between two invalidations. A resolution whose window already brackets the pointer reads no slot, and still reads the placeholder when a committed move marked it stale. The first resolution of an operation reads a number of rows that doesn't depend on the item count, when the pointer is within one row of the placeholder. Each read is settled through the displacement sink when one is composed, as a full scan settles it.
3. **Behavior.** At every resolution, the gap equals the gap the full scan gives against the same tree, under property 5's order.
4. **The cache's other users.** `linearShift.moved`'s crossed slots and its probe are in the window. `DRD-47`'s confirmation reads a slot in the window, and a stale cache or an empty window reads nothing. The development check compares every slot in the window, and the placeholder, with a fresh measurement. It may not compare fewer slots than the window holds. `invalidate`, `retire`, `rebase` and a changed collection version discard the window.
5. **Contract, terms and README,** in the same commit as the code:

   - `DRI-14`'s **Geometry** paragraph becomes:

     > **Geometry.** `sortable` measures an item when a resolution first needs it, and measures again after a scroll, a resize or `invalidate()`. With `xy()`, the operation's first resolution measures every item. With `y()`, a resolution measures the items between the placeholder and the pointer, and one beyond. Their centers increase along y in the collection's order. A reversed column, an item that isn't rendered, or an authored transform that carries an item's center past a neighbour's, is outside this contract. A pointer drop resolves at the release position. It first measures one measured item again, and measures again when that one moved, so the drop sees a scroll whose event hasn't reached the library yet. A change in the items' sizes or relative positions during a drag that no scroll or resize causes needs `invalidate()`. Without it, the change is outside this contract.

   - A change record row names this decision.
   - `y()`'s published documentation (`sortable/y.ts`) states the order term, and says that a resolution reads only rows it hasn't measured.
   - The README's sortable paragraph says that a `y()` list's rows must follow the list's order along y.

6. **Witnesses, each shown by a mutation it catches.**
   - **W5, the activation's reads:** in `tests/hot-path.browser.test.ts`'s census, the layout reads from activation through the first frame after it are equal at two item counts at least ten times apart. **M5**, the window replaced by every slot, fails W5, and so does `71f20df20`'s source.
   - **W6, the window's answer:** rows of at least two heights, and a drag with real input that crosses at least 20 rows down and back up, with a frame after each move. After each frame, the placeholder's gap is the gap that `y()`'s rule gives against a fresh measurement of every row, computed in the test. **M6**, the window grown one slot short of bracketing the pointer, fails W6.
   - **The existing tests still pass:** the scroll test, `DRD-47`'s W1 and W2, and the census tests, including "should read no layout in a sample, and none in a frame with nothing stale".
7. **Confirmation,** as `DRD-46` property 8, in two browser processes run one after the other, under `DRD-44` property 6's hold, each with its machine record:
   - `compare.ts --before 71f20df20 --only "activate-and-drop cycles"`: the four CDP cycle rows and the in-page 20-item cycle row;
   - `compare.ts --before 71f20df20 --only "moves, one frame each"`: the CDP and in-page move rows at 20 and 2,000 items, and "free drag, 300 moves, one frame each" as a control.
   - **Confirmed:** "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs`.
   - **Not confirmed:** "no difference shown" there goes to the architect.
   - **Returned:** "slower" on any measure of any row, or a layout count above base.
   - The unit runs the three-engine suite, the per-sample and census tests, and the size table. The size change is reported with these rows (`DRD-40` property 6).
8. **What it doesn't change.** `xy()` and its full measurement, `DRD-47`'s confirmation apart from its slot choice, `linearShift`'s prediction rule, the placeholder's measurement, the landing, the keyboard path, `judge`, every row, injection, floor entry and ceiling. A row that is green at `71f20df20` and turns red returns the unit. `DRD-45` property 9's repair is still owed before any `--prove` or `--floors`. `DRF-21` isn't part of it. **Amended on 2026-11-12 by `DRD-50`:** `xy()`'s full measurement may share `RectIndex`'s code with `y()`, provided its reads, their values and its settling are unchanged and `DRD-50`'s probe doesn't read "slower". It said that `xy()`'s full measurement doesn't change.

**Rejected:**

- **A binary search with a per-slot mask,** as the trace report sketched. It reads about 11 rows at activation, against two or three for the window, and needs a mask that every user of the cache must check.
- **Candidate 3 alone,** a binary search over a fully measured cache. About 10 µs per move, below its row's bound of 22 µs, and the activation's scan stays.
- **Keep `y()`'s terms, and fall back to a full scan when the window finds centers out of order.** It detects disorder only inside the window, so it isn't a guarantee, and it costs bytes on a row with 155 B left.
- **Change `xy()` too.** A wrapping list's centers aren't ordered along one axis.

**What this amends:**

- **The contract:** `DRI-14`'s **Geometry** paragraph, which `DRD-47` added and the owner approved, when the unit lands.
- **`y()`'s published terms**, by property 5.
- **`DRD-47`:** its properties hold. The unit's slot choice, the window end farther from the gap instead of the list end, changes with the window.
- **The plan:** [`performance-plan.md`](../performance-plan.md) §2 P3 names [`performance-window-handoff.md`](../performance-window-handoff.md).