#### DRD-47 — The pointer drop confirms the axis cache against one row instead of measuring every row

**Status:** active, decided on 2026-11-11 by the architect on the trace report at `e92e21eed` ([assessment](../performance-trace-assessment.md) §2 and §3), under `DRD-46` property 8. Amended the contract's `DRI-14` at `bf9d1caed`, and [`performance-plan.md`](../performance-plan.md) §2 P3. **Implemented at `bf9d1caed` and confirmed** ([report](../performance-drop-report.md) at `8eda874f0`, [assessment](../performance-drop-assessment.md)): the 2,000-item cycle row is faster by 2,449 µs of script per cycle. The owner approved the geometry rule and accepted +125 to +140 B Brotli on 2026-11-12 (`DRO-4`)

**The first optimization unit is candidate 2 of the trace report, in a changed form. The pointer drop's unconditional `axis.invalidate()` protects one supported case: a scroll that moved the rows after the browser's last rendering update, whose `scroll` event hasn't reached the library when the release arrives. So the call isn't deleted. The drop reads one cached row again and measures every row only when that row moved or the cache is already stale. The contract states the sortable drop's geometry rule, and puts a change in the rows' relative geometry with no signal outside it. A focused paired measurement of the 2,000-item cycle rows confirms the change.**

Decided on 2026-11-11 by the architect, on [`performance-trace-report.md`](../performance-trace-report.md) at `e92e21eed` ([assessment](../performance-trace-assessment.md) §2 and §3), under `DRD-46` property 8. The owner asked for one bounded candidate, with candidate 2's unconditional call treated as a hypothesis to verify.

**Why:**

- **The unconditional call protects exactly one supported path.** A pending frame, a pending step, a dispatched `scroll` or `resize`, and the controller's `invalidate()` each leave the cache either true or marked stale, so the drop would measure without the call ([assessment](../performance-trace-assessment.md) §2). A browser dispatches `scroll` in its next rendering update. A scroll made after that update, by a timer, a handler or another frame callback such as a consumer's autoscroll, or by scroll anchoring in that update's layout, reaches the cache one update later. A frame that misses it is corrected at the next frame. The drop has no next frame. `DRI-16` requires scrolling containers, and the library has no autoscroll, so this case is supported.
- **One row detects it.** A scroll of any ancestor, scroll anchoring and a layout shift above the list move every row by one vector. One cached row, measured again and settled as the cache holds it, shows that.
- **The other case the call covered isn't a guarantee.** A row that changes size during a drag with no signal is never seen by a frame, because a resolution with nothing stale reads no layout. The user already sees a misplaced placeholder. `invalidate()` already rebases and invalidates the cache.
- **The saving survives the confirmation.** At 2,000 items the drop's `refresh` is 2,467 [2,097–3,805] \| 3,120 µs sampled, on 16/14/24 \| 20 samples, inside a counted span of 2,742 [2,212–4,158] \| 4,240 µs. The first rect read at the drop forces the pending style and layout in either form, so what leaves is 1,998 reads and the packing loop.
- **The row can see it.** In B3 the no-landing 2,000-item cycle row read 6,401 µs of script per cycle with an A/A bound of 1,920 µs, and the landed row 6,389 µs with 1,337 µs. The estimated saving, 2.1 to 2.5 ms per cycle, is above both, by a narrow margin.
- **The sibling rule.** `DRD-33` choice 7 resolves a drop target at the drop "after any invalidation", with no unconditional measure. The drop-target tracker has the same unsignalled-scroll window, which `DRF-22` records. This decision doesn't change it.

**Required properties:**

1. **Site.** In `SortableOperation.drop`'s pointer branch (`sortable/operation.ts:108–115` at `566ebfc65`), the confirmation replaces `this.#behavior.axis.invalidate()`. The command drop, the frame path, `moved`, `rebase`, activation and the landing don't change.
2. **The confirmation** is one member of the private `InsertionGeometry` interface (`sortable/axis.ts`), which `y()` and `xy()` implement from one shared definition. When the cache is stale it reads nothing. Otherwise it measures one cached slot's element again, through `box` when one is configured, settles that rect through the displacement sink when one is composed, and compares its left and top with the slot's cached values within `EQUIVALENCE_SLACK`. A difference calls the axis's own `invalidate()`, so `linearShift` also discards its row distance. The interface stays private (`DRD-33` choice 8).
3. **Reads.** With a warm cache, a pointer drop reads one slot rect beyond what its resolution reads, whatever the item count. With a stale cache it reads what it reads at `566ebfc65`. No frame, sample or command reads more.
4. **Behavior.** The drop's gap equals the gap a full measurement at the release gives, whenever the cache was stale or the rows moved by one common vector since they were last measured, signalled or not.
5. **Contract and README.** In the same commit as the code, the unit adds this paragraph to `DRI-14` after **Consistency**, with a change record row that names this decision:

   > **Geometry.** `sortable` measures the items at the operation's first resolution, and again after a scroll, a resize or `invalidate()`. A pointer drop resolves at the release position. It first measures one item again, and measures every item when that one moved, so the drop sees a scroll whose event hasn't reached the library yet. A change in the items' sizes or relative positions during a drag that no scroll or resize causes needs `invalidate()`. Without it, the change is outside this contract.

   The README's sortable paragraph says that `invalidate()` is also for rows that change size or position during a drag for a reason other than a scroll or a resize.

6. **Witnesses, each shown by a mutation it catches.**
   - **W1, the unsignalled scroll:** a sortable in a scrolling container, a drag with real input that commits at least one move and waits a frame, and a capture-phase `pointerup` listener on the window, added before the press, that scrolls the container by more than half a row. The reorder is the one under the release position after that scroll. **M1**, the call deleted with no confirmation, fails W1.
   - **W2, the drop's reads:** in `tests/hot-path.browser.test.ts`'s census, the `getBoundingClientRect` calls during a pointer drop with a warm cache, with no landing, are the same at two item counts at least ten times apart. **M2**, the unconditional call restored, fails W2.
   - The existing scroll test in `tests/sortable.browser.test.ts` still passes.
7. **Confirmation,** as `DRD-46` property 8: `compare.ts --before 566ebfc65 --only "activate-and-drop cycles"` in one browser process, under `DRD-44` property 6's hold, with its machine record. That runs the four CDP cycle rows and "in the page: 50 activate-and-drop cycles, 20 items, no landing". No move, press or keyboard row reaches the change.
   - **Confirmed:** "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs`. The landed 2,000-item row is reported beside it.
   - **Not confirmed:** "no difference shown" on the target row goes to the architect, under `DRD-46` property 8.
   - **Returned:** "slower" on any measure of any row, or a layout count above base.
   - The unit runs the three-engine suite, the per-sample and census tests, and the size table. The size change is reported with these rows (`DRD-40` property 6).
8. **What it doesn't change.** `judge`, its rounds, every row, injection and floor entry. Candidates 1, 3, 4 and 5 aren't selected. `DRD-45` property 9's repair is still owed before any `--prove` or `--floors` on `566ebfc65`'s source or a descendant, and a `--before` run applies no injection.

**Rejected:**

- **Delete the call, the report's form.** It loses the unsignalled scroll, which W1 witnesses.
- **Keep it.** About 2.1 to 2.5 ms per drop at 2,000 items, for a case one row detects.
- **Record scroll offsets at measurement and compare them at the drop.** It needs the set of scrolling ancestors, which the library doesn't track, and misses a layout shift above the list.
- **Measure the placeholder instead of a row.** After a committed move the cached placeholder is stale and has no prediction. That is the usual state at a release, because the last frame moved it.
- **Add an in-page cycle row at 2,000 items.** An instrument change, a decision first, and not needed unless the CDP row shows no difference.

**What this amends:**

- **The contract:** `DRI-14` gets property 5's paragraph when the unit lands. Until then the contract states nothing about the sortable drop's geometry, and the code re-measures every row.
- **The plan:** [`performance-plan.md`](../performance-plan.md) §2 P3 names this unit, [`performance-drop-handoff.md`](../performance-drop-handoff.md).
- **`DRD-23`'s last bullet** doesn't apply, because no instrument changes.