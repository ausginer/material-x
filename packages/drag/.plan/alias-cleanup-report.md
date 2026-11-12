# Alias cleanup report

**Base:** `39c8b432c` on `drag/performance`. **Request:** the owner's request to inline redundant field aliases and unnecessary destructuring in `packages/drag/src`, alongside the instrument assessment. Behavior, ownership and lifecycle order are unchanged. No ceiling, control, test expectation or injection was changed (`DRO-4`).

## Outcome

Inlined:

| Site | Change |
| --- | --- |
| `sortable/operation.ts` `move()` | `const drag = this.#drag` removed. The expression is now the same as the one in `drop()` |
| `sortable/operation.ts` `settle()` | `const composed = this.#behavior.landing` removed, as `free-drag/operation.ts` already reads it |
| `kernel/session.ts` `#move`, `#up` | `const operation = this.#operation` removed. Nothing between the read and the use writes `#operation` |
| `sortable/linear-shift.ts` | `const { values, items } = index` removed: one read each, outside any loop |
| `sortable/y.ts`, `sortable/xy.ts` `resolve` | `snapshot`, `item` and `insertion` read from `query` at their single use. In `y.ts`, `placeholderRect` and `items` also read from `index` at their single use |
| `sortable/xy.ts` `moved` | `const from = last` removed. It is read only before `last` is written |
| `sortable/rect-index.ts` `refresh` | `const list = snapshot.items` removed |

Kept, with a comment at each site that gives the reason:

- Reads hoisted out of a per-slot, per-candidate or hit-test loop: `rect-index.ts` `refresh`, `advance` and `verifyEquivalence`; `{ pointerX, pointerY }`, `{ values, count, … }` and `stale` in `y.ts` and `xy.ts`; `{ items }` in `linear-shift.ts`; `{ displacement }` in `xy.ts`; `{ x, y }` in `drop-targets.ts`.
- Captures taken before a refresh rewrites the value: `held` in `xy.ts` and `verifyEquivalence`.
- Results of calls that must run once: `#landingTarget` moves the placeholder and reads layout. `getComputedTiming` returns a new dictionary per call.
- `#conclude`'s `operation`: four uses, one of them in the deferred `end` step.
- `remeasurePlaceholder`'s `placeholderRect`. Inlining it was measured at +8 B minified and +2 to +5 B Brotli on the sortable rows, so it was reverted. Private names are mangled to one letter (`#e`), and `this.#e` repeated three times is still longer than one local.
- The captures that already had a comment: `Session.advance`'s `next`, `Gesture.#teardown`'s `session`, and `Lifter.cancelLanding`'s `cancel`.

## Size

Raw output: [`2026-11-11-alias-cleanup-size.txt`](measurements/2026-11-11-alias-cleanup-size.txt). This is a joint measurement of what landed. The ablations below were used only to choose the edits.

| Composition                 | Minified            | Brotli            |
| --------------------------- | ------------------- | ----------------- |
| draggable alone             | 6737 → 6733 (−4)    | 2202 → 2197 (−5)  |
| draggable + lift            | 11548 → 11544 (−4)  | 3975 → 3974 (−1)  |
| example: resize handle      | 9394 → 9390 (−4)    | 3317 → 3310 (−7)  |
| example: drop zone          | 13187 → 13183 (−4)  | 4608 → 4610 (+2)  |
| example: canvas group       | 9530 → 9526 (−4)    | 3311 → 3306 (−5)  |
| freeDrag                    | 15186 → 15182 (−4)  | 5040 → 5031 (−9)  |
| freeDrag + bounds + landing | 16351 → 16347 (−4)  | 5475 → 5471 (−4)  |
| sortable + y                | 19866 → 19897 (+31) | 6475 → 6453 (−22) |
| sortable + xy               | 19685 → 19705 (+20) | 6447 → 6426 (−21) |
| complete                    | 21543 → 21574 (+31) | 7106 → 7079 (−27) |

- **The figures disagree in direction on the sortable rows.** Minified bytes grow because `this.#drag` and `query.` are repeated. Brotli bytes shrink: in the `move()` ablation, −13 to −14 B Brotli for +10 B minified, because the expression now repeats `drop()`'s.
- **The non-sortable rows** change only through the kernel `session.ts` edit: −4 B minified each. Their Brotli moves are mixed: −9 to +2 B. Measured alone, the `#move` edit gave `sortable + xy` +8 B and `complete` +10 B, and with `#up` added it gave −3 B on `complete`. Those Brotli moves are context effects of ±15 B, not structural changes.
- **Ceilings:** `example: resize handle` is now under its 3313 B ceiling, at 3310 B. Five rows are still red: `draggable alone` is 58 B over and its control is 173 B off, `drop zone` is 179 B over, `freeDrag` 64 B, `freeDrag + bounds + landing` 261 B and `complete` 14 B. No ceiling moved.
- **Runtime:** two private-field loads per pointer move in `SortableOperation.move()` and one in `Session.#move` while active. There is no new allocation and no layout read. No timing was run.

## Stale injections

`MOVE_SITE` in [`bench/compare.ts`](../bench/compare.ts) is `'this.#lift.translate(drag.x - drag.originX, drag.y - drag.originY);'`. That text no longer occurs in `src/sortable/operation.ts`, so `applyInjection` throws on it, and `--prove --dry` fails at the first of these. Ten of the 23 entries are stale:

- **Gate (`INJECTIONS`):** `one forced layout per move`, `one O(n) walk per move` and `30 µs of script per move, in the page`.
- **Floors (`FLOORS`):** `100`, `30` and `10 µs of script per move`, and `30`, `10`, `5` and `2 µs of script per move, in the page`.

The other 13 entries apply exactly once: the `DROP_SITE`, `start()`, `kernel/session.ts` `#move` and `kernel/gesture.ts` sites. The session entry's comment, which says that `#up` writes the same two lines, is still true.

**For the repair (not done):** `move()` now formats as `this.#lift.translate(\n      this.#drag.x - this.#drag.originX,\n      this.#drag.y - this.#drag.originY,\n    );`. `drop()` has the same lines, two spaces deeper, inside `if (isPointerOperation)`. A find text without its indentation therefore matches twice. The instrument was not changed.

## Verification

| Check | Result |
| --- | --- |
| `npx just fmt`, `lint-fix`, `fmt`, `lint` on the 8 changed sources | Exit 0 |
| `npx just typecheck` | Exit 0 |
| `npx just test` (Chromium) | 405 passed and 5 failed. All 5 failures are `size.node.test.ts` rows listed under Ceilings. The 6th row at the base, `resize handle`, now passes |
| Injection find texts, checked with a scratch script | 13 apply once and 10 are stale, as listed |

The architect confirmed that no timing run overlapped these checks. Engines (`test-engines`) were not run.

## Next

The owner decides the `MOVE_SITE` repair and whether it lands before the next `--prove` or floors run. That repair belongs to the instrument assessment.