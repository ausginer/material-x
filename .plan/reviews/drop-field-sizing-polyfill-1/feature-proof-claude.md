# Dropping the `field-sizing: content` polyfill — feature proof

**Files were read at:** `846fcd8ca`, the head of #108 (`material-x/drop-field-sizing-polyfill`), in a private detached worktree. The base is `73f081dc4`. The tree was clean apart from the probes and the one mutation this record names. Each was reverted or removed after its run.

**Subject:** the implementer's [report](../../drop-field-sizing-polyfill-1/report.md) and the code change `ffde8d593`. The owner asked to remove the polyfill because `field-sizing` is in every engine's current stable release, which is `RD-20`'s floor. The coordinator asked for five checks: no live reference remains, the multiline field still grows and shrinks, the polyfill covered nothing that the native property misses (`rows`, `hidden`, resize, wrap), the new row passes and discriminates in three engines, and the size figures are correct. `CONTRIBUTING.md`'s Baseline-2025 wording is out of scope (#107).

**Verdict: the change holds.** Every claim in the report holds as written, and the figures below are my own readings, saved in [`checks/`](checks/). I have one finding, `reviewer-1` (tier A). It is **pre-existing and not caused by this change**: the base behaves the same, and the polyfill wouldn't have covered it. It doesn't block #108.

## Scope

**Covered.**

- **The diff,** `73f081dc4..ffde8d593`. `useFieldSizingContentPolyfill` and its `use` import are gone from `src/core/utils/polyfills.ts`. Its call, the TODO and the `input` import are gone from `multiline-text-field.ts`. `.input-polyfill` is gone from `main.styles.css`, both from the `.input` selector list and as its own rule. `.input` keeps `field-sizing: content`, and `multiline-text-field.tpl.html` gives the textarea `class="input txt"`. `polyfills.ts` still exports `useHasSlottedPolyfill`, which `TextFieldCore.ts` and `ListItemCore.ts` import. `TextFieldCore.ts` still exports `input`, which `text-field.ts` uses.
- **Live references.** A case-insensitive search of the tree, outside `node_modules` and `.git`, for `field-sizing`, `fieldsizing` and `input-polyfill` finds one source line: `main.styles.css:206`, the declaration on `.input`. The other hits are this change's own record and the historical [`host-has-fallback-1` proof](../host-has-fallback-1/feature-proof-claude.md). No `.mdx`, story, README or `.agents` document names the polyfill.
- **The base was inert in every pinned engine.** `CSS.supports('field-sizing', 'content')` is `true` in Chromium 158, Firefox 159 and WebKit 27.2 ([`probes.txt`](checks/probes.txt)). So the polyfill returned before it created its mirror, and in the pinned engines the change removes code that never ran. A behaviour change can occur only in an engine without `field-sizing`, which is below `RD-20` property 1's floor.
- **The growth row,** rerun by me ([`growth-row.txt`](checks/growth-row.txt)). It passes in Chromium, Firefox and WebKit. When I deleted `field-sizing: content` from `.input`, it failed in all three, with 24 px against an expected 72 px. These are the implementer's numbers. The whole text-field file passes 81 of 81 in the three engines ([`text-field-file.txt`](checks/text-field-file.txt)).
- **What the polyfill did besides growth,** read from its source at `73f081dc4` and observed with the native property in three engines ([`sizing` probe](probes/sizing.browser.test.ts.txt), host 300 px wide, readings in line heights):

  | Polyfill behaviour | Native reading, each of the three engines |
  | --- | --- |
  | An empty value measured as `' '`, so one line | Empty: 1. `min-block-size: 1lh` holds it |
  | Growth on `input` | Three typed lines: 3 |
  | Shrink on `input` | Back to one line with four Backspaces: 1. Cleared through the host's `value`: 1 |
  | `mirror.wrap = textarea.wrap` | Soft wrap of 300 characters on one line: 9 lines. No public attribute sets `wrap`; the template doesn't |
  | Re-measure on the window's `resize` | Host narrowed to 150 px with no window resize: 20 lines. The native property also follows a container resize, which the polyfill missed |
  | Skip while `textarea.hidden` | Nothing to measure. The textarea is internal, and no public attribute sets `hidden` |
  | `rows` | The template fixes `rows="1"`, and no attribute exposes it. The polyfill ignored `rows` too: it took the mirror's `scrollHeight` |
  | `overflow-y: hidden` on the textarea | `scrollHeight` fits the block size in each engine, so no scroll bar appears |
  | A value set from script, through the host's `value` | The polyfill listened only for `input` and the window's `resize`, so it didn't re-measure. Native: 4 lines in Chromium and Firefox, and 1 in WebKit, as `reviewer-1` describes |

- **Sizes** ([`sizes.txt`](checks/sizes.txt)). I read all 33 rows at the head, and at the base, with `packages/material-x/src` checked out at `73f081dc4` in the same worktree. Both readings are byte-identical to the implementer's `size-head.json` and `size-base-73f081dc4.json`, and a second head reading after a rebuild is identical too. Three rows change: `multiline-text-field` −301, `text-field` +12 and `complete` −287 Brotli bytes. The implementer's probe reproduces `text-field`'s minified 34282 → 34123 and Brotli 8188 → 8200. `text-field` loses only CSS here. So the report's explanation holds: the removed text compressed well against the rest of the bundle.

**Not covered.**

- Real Safari. The `*/safari` projects need macOS, and this host is Linux. Every WebKit reading here comes from Playwright's WebKit 27.2.
- The full suite, typecheck and lint. CI is green at `846fcd8ca`, and I didn't repeat them.
- Engines without `field-sizing`. They are below `RD-20`'s floor, and the polyfill's removal changes behaviour only there, by design.

## Findings

### reviewer-1

**Tier A, pre-existing.** In WebKit, a multiline value set from script renders on one line, and the field stays one line tall.

- **Current behaviour.** After `field.value = 'x\ny\nz\nw'`, Chromium and Firefox read 4 lines for both the textarea's height and its `scrollHeight`. WebKit 27.2 reads 1 for both, so the line breaks are collapsed, and the problem is not only the height. Typing still works in WebKit: three typed lines read 3. After the value set from script, typing one more character still reads 1 ([`probes.txt`](checks/probes.txt), [`white-space` probe](probes/white-space.browser.test.ts.txt)).
- **Cause, as observed.** `.input` starts with `all: unset`, which resets the textarea's UA `white-space: pre-wrap` to the inherited `normal`. The computed value is `white-space-collapse: collapse` in all three engines. Chromium and Firefox keep a textarea's newlines anyway, and WebKit collapses them. With `white-space: pre-wrap` set on the textarea, WebKit reads 4. In a plain textarea that has `field-sizing: content`, WebKit reads 4 with or without a shadow root, and 1 as soon as `all: unset` is added ([`isolate` probe](probes/isolate.browser.test.ts.txt)).
- **Why it is not this change's defect.** The base reads the same in all three engines, with `src` at `73f081dc4` ([`probes.txt`](checks/probes.txt), last block). The polyfill was inert in WebKit 27.2. Where it did run, it re-measured only on `input` and on the window's `resize`. Its mirror also had `.input`'s rule, including `all: unset`, and would have measured the collapsed text.
- **Why it is a problem.** A consumer who sets a stored multiline value, such as a saved draft or a form reset, sees it on one line in WebKit. On form submission the value keeps its newlines, so the display and the value disagree. This was observed in Playwright's WebKit only. Real Safari is unverified here.
- **Required property.** A multiline text field shows a value's line breaks, and is as many lines tall as the value, however the value was set: by typing, through the host's `value`, or by a form reset. This holds in each engine at `RD-20`'s floor, and a row observes it in each engine.
- **Routing.** To the coordinator, for a work item outside #108. It doesn't need an architectural decision.

### No other finding

The removal is complete. The native property covers every behaviour the polyfill had within the floor, and covers a container resize and a value set from script (outside WebKit) that the polyfill missed. The row discriminates in each engine. The size figures are exact.

**An observation, not a finding:** the new row asserts growth only. Shrinking, soft wrap and re-wrap on a width change are observed above but no row asserts them. Each depends on the same declaration, and deleting that declaration fails the row, so the row already observes the declaration that the change depends on.