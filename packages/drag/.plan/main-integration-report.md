# Main integration after box-quad PR 16

**Input:** `drag/size` at `f0b66c2ec`, with accepted DRD-62, and `origin/main` at `7d8d7a805`, the squash merge of box-quad PR 16. The owner authorized bringing main into this branch on 2026-11-14. This report records integration, not a new architectural decision or acceptance of the [mangling rollback report](mangle-rollback-report.md).

## Integration

- The only Git conflict was in `src/sortable/layout-animation.ts`. Its resolution keeps box-quad's `const local: Delta = []` and the existing `carriedX` and `carriedY` state used by `displaced`. The import uses `localDelta`, `Delta` and `Space`.
- Typecheck then found one remaining factory call in DRD-62's new test helper. `tests/displacement-sink.browser.test.ts` now imports the `Space` type and creates `const itemSpace: Space = []`. Test assertions and fixtures are otherwise unchanged.
- `RectIndex`, `RetainingRectIndex`, `xy`, `y` and `linearShift` are unchanged from `f0b66c2ec`. The prototype delivery rules are preserved. No drag2 file or budget changed.

## Verification

The installed dependencies and browsers were not changed. Box-quad was rebuilt before testing drag against it. All browser checks used Chromium.

- Box-quad: [242 tests passed](measurements/2026-11-14-main-integration-box-quad-suite.log).
- Drag: [747 passed and 5 failed, out of 752](measurements/2026-11-14-main-integration-drag-suite.log). Every failure is in `tests/size.node.test.ts`: draggable alone, drop zone, freeDrag, freeDrag with bounds and landing, and complete. Resize handle now passes; it failed before this integration.
- Drag typecheck [fails with three known errors](measurements/2026-11-14-main-integration-typecheck.txt): `repo:RF-31` at `.scripts/tsdown-library.ts:53`, plus the two expected drag2 `TS2724` errors for imports of `box` and `space`, as BQ-12 records. The additional error in the new test helper is resolved.
- Both locally edited files went through format, lint-fix, format and lint. `layout-animation.ts` is clean. The test file retains the existing `func-name-matching` error at line 59; no other diagnostic was reported for these files. Whole-package lint was not rerun.
- This report was formatted and its seven links checked. `git diff --check` passes on the local source, test and report changes. The two raw suite logs retain command output's trailing spaces, and the box-quad log retains its final blank line; those are the only diagnostics in the saved integration evidence.
- No timing, allocation measurement, deferred campaign, Firefox or WebKit check ran.

The first integration suite sequence passed box-quad, then was interrupted after typecheck identified the remaining `space()` import in the drag test. Drag was restarted after that call was migrated. The interrupted run is not evidence of a completed drag suite.

The [initial runner status](measurements/2026-11-14-main-integration-initial-status.json) records the interruption, and the [final status](measurements/2026-11-14-main-integration-final-status.json) records drag's exit 1 on the five size failures. The records are unedited. The [size table](measurements/2026-11-14-main-integration-size.txt) reads 6,555 B Brotli for sortable + y, 6,544 B for sortable + xy, and 7,132 B for complete, which is 67 B over its unchanged ceiling. No size budget or control was re-based.

## Next

The mangling rollback report at `8904947f6` still needs its separate architectural disposition under DRD-60. This integration does not close its findings or re-base size budgets. Preparation of the drag pull request follows that disposition.