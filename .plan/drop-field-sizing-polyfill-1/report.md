# Dropping the `field-sizing: content` polyfill

2026-11-21. Implementer's report for branch `material-x/drop-field-sizing-polyfill`.

## Input

- The owner's request, relayed by the coordinator: remove material-x's `field-sizing: content` polyfill, because every engine now supports `field-sizing`. Chrome has supported it since 123, Safari since 26.2 and Firefox since 152. `repo:RD-20` sets the floor at the current stable release of each engine, and the pinned engines (Playwright 1.65.0: Chromium 158, Firefox 159, WebKit 27.2) all support it.
- Base: `origin/main` at `73f081dc4`.

## Outcome

- `useFieldSizingContentPolyfill` is removed from `src/core/utils/polyfills.ts`, along with its call and its comment in `src/text-field/multiline-text-field.ts`.
- `src/text-field/styles/default/main.styles.css` no longer has `.input-polyfill` in the `.input` selector list, or the `.input-polyfill` rule.
- `.input`, which is the textarea's class in `multiline-text-field.tpl.html`, keeps `field-sizing: content`.
- `tests/text-field/text-field.browser.test.ts` adds a row for `mx-multiline-text-field`. It types three lines through `userEvent.keyboard` and expects the textarea's block size to be its one-line height plus two line heights.
- No live document named the polyfill. The one mention, in `.plan/reviews/host-has-fallback-1/feature-proof-claude.md`, is historical and is unchanged.

## Verification

- **Growth row.** It passes in Chromium, Firefox and WebKit. With `field-sizing: content` deleted from `.input`, it fails in all three: the height is 24 px and the row expects 72 px. Transcript: [`checks/growth-row.txt`](checks/growth-row.txt).
- **Text-field tests.** The text-field file passes in all three engines, 81/81.
- **Full suite.** material-x passes 516/516 in Chromium, non-visual.
- **Typecheck and lint.** Typecheck is clean. Format and lint are clean on the four changed files. ESLint ignores the `.css` file, which is expected.

## Sizes

Brotli bytes, against `73f081dc4`. `just size` passes. The full table is in [`checks/size-report.md`](checks/size-report.md). All other rows are 0.

| Row                               |  Head |  Base | Change |
| --------------------------------- | ----: | ----: | -----: |
| `text-field/multiline-text-field` |  4136 |  4437 |   −301 |
| `text-field/text-field`           |  8200 |  8188 |    +12 |
| `complete`                        | 21805 | 22092 |   −287 |

`text-field` only loses CSS here, the `.input-polyfill` selector and rule. Minified, it shrinks from 34282 to 34123 bytes (−159), and only its Brotli figure grows. Brotli is the figure that governs. The growth has no code behind it: the removed text was compressing well against the rest of the bundle. Readings: [`checks/text-field-min-vs-brotli.txt`](checks/text-field-min-vs-brotli.txt). Probe: [`probes/entry.ts`](probes/entry.ts), which reproduces size-limit's figures for that row.

## Open

`CONTRIBUTING.md` Part I says "Use Baseline-2025 features", and `field-sizing` is Baseline 2026. The owner made this call himself. This report states the tension and doesn't resolve it.