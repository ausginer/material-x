# Handoff: drag tests for the guarantees only drag2's suite asserted

**Recipient:** the implementer. **Branch:** `drag2/removal`, or one the owner names. **Input:** the architect's record commit on `drag2/removal`.

**Governing records:** `drag:DRF-45` and `drag:DRD-64` property 7 in [`00-index.md`](00-index.md). The sweep behind the list is in [`drag2-retirement-assessment.md`](drag2-retirement-assessment.md) §3.

**This unit is independent of [`drag2-retirement-handoff.md`](drag2-retirement-handoff.md).** Each drag2 test cited below is read at `0870abd75` with `git show 0870abd75:packages/drag2/<path>`, so this unit can run before or after the deletion.

**Scope:** each row below becomes drag tests that assert the guarantee through drag's public API, in the drag test file that owns the subject. A row's drag2 tests are source material. Their fixtures and helpers may be adapted. Their drag2 terms, such as fragments, `invalidate()` after a commit and `onError`, don't carry over. **Don't change `src`.** If a test fails on drag, stop that row and report it to the architect with the failing assertion: that's a drag defect or a guarantee drag doesn't make, and either one is the architect's decision.

**Every new test must be able to fail.** For each row, remove or change the code that implements the guarantee, confirm that the test fails, restore the code, and record the mutation and the failure in the report. A row whose test survives every mutation you can find goes to the report as unproven.

## Free drag

| Row | Guarantee | drag2 at `0870abd75` | drag's term |
| --- | --- | --- | --- |
| F1 | After `moveTo`, later pointer motion continues from the new position | `tests/free-drag/free-drag.browser.test.ts:388-402` | `FreeDragController.moveTo`: "keeps following the pointer" |
| F2 | The drop request and the rendered visual use the `pointerup` coordinates when they differ from the last processed `pointermove` | `free-drag.browser.test.ts:141-153`; `tests/free-drag/lifecycle.browser.test.ts:370-419` | DRI-20, DRI-21 |
| F3 | A rejected terminal carries the `reject(reason)` value, in `freeDrag` and in `sortable` | `free-drag.browser.test.ts:165-179`; `tests/free-drag/domain.node.test.ts:19` | `FreeDragRejectedResult.reason`, `SortableRejectedResult.reason` |
| F4 | `bounds` with a function source: the returned rect clamps, `null` leaves the drag unconstrained, and a throw is one fault (DRI-7) | `free-drag.browser.test.ts:342-370`; `tests/free-drag/validation.browser.test.ts:319-389` | `BoundsSource` |
| F5 | Under an ancestor transform and under ancestor `zoom`, the request's `localDeltaX` and `localDeltaY` commit the visual where it was dropped, and `onMove`'s `currentRect` is `originRect` moved by the viewport delta | `tests/free-drag/activation-snapshot.browser.test.ts:138-157`; `tests/free-drag/geometry.browser.test.ts:176-221` | DRI-20; `DragGeometry` |
| F6 | `pointercancel` during a pending press ends it with no `onStart`, no `onEnd` and no fault, and the next press works | `lifecycle.browser.test.ts:168-192` | DRI-3, DRI-4 |
| F7 | The landing starts from the rendered position under an axis lock, under a `bounds` clamp and after `moveTo`, and not from the pointer's position | `lifecycle.browser.test.ts:315-368` | DRI-13 |
| F8 | After the build, a consumer typecheck of one module that imports every public entry by its package specifier resolves each entry's `types` with no error | `tests/consumer.node.test.ts` | `package.json` `exports` |

F8 is a node test against the built package, beside the `consumer` project of `DRD-54`. It runs `tsc` on a fixture, and it doesn't pack the package unless the specifier can't resolve without packing.

## Sortable

| Row | Guarantee | drag2 at `0870abd75` | drag's term |
| --- | --- | --- | --- |
| S1 | When a commit leaves the placeholder at another index of the list (an append loop, a morphdom-style patch), the landing targets the item's final rect. When the commit moves the item to another container, the landing is skipped and one fault is reported, and the outcome stands | `tests/sortable/commit-window.browser.test.ts:561-680`; `tests/sortable/react.browser.test.ts:680-710` | DRI-13; `SortableOperation`'s landing target |
| S2 | `y()` proposes the gap that a full measurement gives, for a flow `gap`, a gap that varies per row, item margins in flex and block columns, a rotated or scaled row, and sub-pixel geometry with a displacement running | `tests/sortable/g3-conformance.browser.test.ts:205-381`, and its self-checks at `:511-548` | DRI-14 Geometry |
| S3 | A handle that is itself marked `data-drag-ignore` still admits, the same press with no handle declines, and the mark is read through a shadow boundary | `tests/sortable/input-policy.browser.test.ts:1413-1500` | `Admission.handle` and `data-drag-ignore` (`src/kernel/admission.ts`) |
| S4 | `ArrowLeft` and `ArrowRight` act as `ArrowUp` and `ArrowDown`. An arrow at the edge, and a key that names no command, aren't prevented. `handle` gates the keyboard path. An arrow from an unmarked nested text input reorders, and one inside a marked region stays native. No command runs during an IME composition | `tests/sortable/keyboard.browser.test.ts:342-406`; `input-policy.browser.test.ts:788-1306` | DRI-14 commands; `.agents/docs/accessibility.md` §Drag |
| S5 | A command is refused while a press is pending and while a drag is active | `keyboard.browser.test.ts:662-694` | DRI-6, DRI-19 |
| S6 | `layoutAnimation` animates only the rows the move crossed, nothing for a no-op, and never the dragged item, the placeholder or a sibling that isn't an item. Each animation is the inverse of the displacement it measured | `tests/sortable/features.browser.test.ts:1280-1311`; `tests/sortable/displacement.browser.test.ts:453-524` | `layoutAnimation` |
| S7 | `layoutAnimation` composes additively: an authored `transform` or `translate`, and a consumer's own concurrent animation, survive. A fold mid-flight leaves the row where it was. Travel is correct under an ancestor `scale()`, and when `visual` isn't the item | `displacement.browser.test.ts:610-1016` | `layoutAnimation` |
| S8 | Every candidate is measured through `box`, or `visual` when there's no `box`, and not through the item. The placeholder takes the box's width, which is visible under `align-items: center` | `features.browser.test.ts:625-698`; `tests/sortable/y.browser.test.ts:205`; `tests/sortable/xy.browser.test.ts:196` | `SortableConfig.box`, `visual` |
| S9 | A throwing `placeholder` factory reports one fault, leaves nothing acquired, and the next drag works | `features.browser.test.ts:392-452` | DRI-7 |
| S10 | An authored CSS `transition` on the rows or on the item changes neither the lifted motion nor the proposed gap | `tests/sortable/composition.browser.test.ts:781` | DRI-9 |

S2 adapts drag2's conformance sweep as an instrument: one helper that compares `y()`'s proposal with a full measurement over a fixture, and its self-checks, which show that the helper can fail. It isn't a second `y()`.

**Note, 2026-11-15, after the unit:** `DRD-65` amends S2. `y()` proposes the gap a full measurement gives to the precision that `DRI-14` now states, so where the pointer is within 1/8 px of equidistant from two centers, either gap is admissible. [`y-geometry-terms-handoff.md`](y-geometry-terms-handoff.md) changes the instrument and returns the rotate case. The text above is unchanged.

**Not owed:** drag2's option defaults, construction-time option reads, and the nested-control and modifier press tables (`options.node`, `features.browser.test.ts:242`, `input-policy.browser.test.ts:573-941`). The assessment §3 says why.

## Checks

- Each new test passes in Chromium, and the browser tests in Firefox and WebKit too (`npx just test-engines`), apart from a row that its drag2 test limited to one engine for the same reason. Name that reason in the report.
- `npx just test`, `npx just typecheck` and `npx just lint` in `packages/drag` exit 0.
- The handoff's own Verify steps for every edited file.

**Note, 2026-11-15, before the unit:** two corrections to the checks above.

- **WebKit isn't owed locally** (`DRO-18`). Run the engine check in Chromium and Firefox: `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox`. The report states that WebKit didn't run. A row limited by its drag2 test to WebKit alone goes to the report as not run.
- **`npx just test` in `packages/drag` fails five tests at the input:** the `size.node.test.ts` ceiling rows (`DRO-4`). They don't count against this unit, which doesn't change `src`. Any other failure does.

The input is the architect's commit that adds this note, on `drag2/removal`, after drag2's deletion. The text above is unchanged.

## Report

`packages/drag/.plan/drag2-guarantees-report.md`:

- each row's tests, as `file:line`;
- each row's mutation and the failure it caused;
- each row stopped on a failing test, with the assertion;
- the commits.

The unit stops at the pushed report.