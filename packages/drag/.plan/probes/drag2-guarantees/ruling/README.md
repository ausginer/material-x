# Probe: S2's rotate stop and the collapsing-margin fixture

Run by the architect on 2026-11-15 at `1a6551563`, Chromium, for `drag:DRF-46`, `drag:DRF-47` and `drag:DRD-65`. `src` and `tests` were unchanged; the probe was a scratch test file and a scratch config, both removed afterwards.

**How it ran.** Copy [`rotate-tie-and-margins.probe.ts.txt`](rotate-tie-and-margins.probe.ts.txt) to `packages/drag/tests/zz-rotate-probe.browser.test.ts` and [`vitest.probe.config.ts.txt`](vitest.probe.config.ts.txt) to `packages/drag/vitest.probe.config.ts`. Then, from `packages/drag`:

- `__DEV__` false: `npx vitest run -c vitest.probe.config.ts --project shipped tests/zz-rotate-probe.browser.test.ts`
- `__DEV__` true: `PROBE_DEV=1 npx vitest run -c vitest.probe.config.ts --project browser tests/zz-rotate-probe.browser.test.ts`

Each case throws its result as its error message, so every case "fails" by design.

## Results

| Case | `__DEV__` false | `__DEV__` true |
| --- | --- | --- |
| A row under `rotate: 8deg` that a 70 px sibling crosses: its top before and after | 63.3089714050293 → −6.6910271644592285, a travel of −69.99999856948853 | the same |
| An unrotated row in the same move | travel 0, not crossed | the same |
| S2's rotate fixture, the integer pointer path | `at 95: proposed 1, measured 2` | `[]` |
| The same, pointer path + 0.5 px | `[]` | `[]` |
| The same, pointer path + 0.01 px | `[]` | `[]` |
| Block column, every row `margin-top: 6px; margin-bottom: 10px` | `at 203: proposed 2, measured 3` | `at 141: no placeholder` (the development check's fault ends the drag) |
| The same, with `[data-drag-placeholder] { margin: 6px 0 10px }` | `[]` | `[]` |
| The same margins in a flex column | `[]` | `[]` |
| Block column, `margin-top: 6px` only | `[]` | `[]` |
| Block column with both margins, a 70 px margin-less placeholder moved from first to second, tops of `[placeholder, r1, r2, r3]` | before `0, 76, 141, 181`, after `71, 6, 147, 187`: r2 and r3, which the move didn't cross, moved 6 px | the same |

## What it shows

- **The rotate disagreement is a tie.** At pointer 95 on the way back, the placeholder's center is 120 and the 30 px row's is 70: both 25 px away, and the rule keeps the incumbent on a tie. `y()`'s constant came from the rotated row's travel, −69.99999856948853 instead of −70 (Chromium reports a transformed rect at single precision), so its predicted center for the 30 px row is 70.0000014, which is nearer by 1.4 × 10⁻⁶ px. The development check re-measures the window after every committed move and so discards that error, which is why the source project passes. Off the tie, by as little as 0.01 px, both builds agree.
- **The collapsing margins break the linear shift.** Collapsed, the space between two neighbours is the larger of their two margins, so a margin-less placeholder changes the spacing of rows it didn't cross. The development check refuses the list; the published build proposes the wrong gap. With the placeholder given the rows' margins, or in a flex column, both builds agree.