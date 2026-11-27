# PR #314, `RF-151`'s repair: feature proof

**Files were read at:** `c3209df1d`, the head of `material-x/drag-selection-1` and of PR #314, in slot c. **Diff reviewed:** `d6f6cf60b..c3209df1d`, all of it.

**Governing records**, in [`00-index.md`](../../00-index.md):

- `RF-151`, with the architect's two notes of 2026-11-26: the repair is (B), on the list and not in drag's kernel; the button item's rows stay without a witness, and row 3 stays on `mx-list-item`. Also the implementer's note.
- `RF-146`'s note of 2026-11-26, _"property 3 is amended by `RF-151`'s repair"_.
- The rule on engines in a review, `repo:RD-62` property 4 as amended, and [_Engines in development and in review_](../../../.agents/docs/test-architecture.md#engines-in-development-and-in-review).

**Lens:** feature proof. Every claim comes from my own reading or from a run I made, except the sizes, which come from the implementer's [reading](../../drag-selection-1/checks/sizes.txt). The runs are in [`checks/feature-proof-runs.txt`](checks/feature-proof-runs.txt). I changed no file outside this record. Each mutation was restored before the next, and `git status` was clean after them.

**Verdict:** the repair meets `RF-151`'s three required properties and its rows. The witnesses fail where the record says they fail, in each of the three engines, and CI's `verify` passes on the head. **No findings.**

## Scope

- **Read:** the rule in `src/list/styles/sortable/main.styles.css`, and its comment. Where `:state(drag)` is set and cleared (`sortable-list.ts`, `onStart`, `onEnd` and `disconnected`). The eight rows and their helpers. Which source adopts the sortable sheet. The three checks files and the probe. The amendment of `RF-146` property 3, compared with the text that it replaces. The built `list/styles/sortable/main.css.js` in the slot, which has both declarations.
- **Ran locally,** one engine at a time: the affected files, unmutated, in Chromium, and four mutations in Chromium, Firefox and WebKit.
- **Read from CI:** the unmutated pass in Firefox and WebKit.
- **Not read:** Safari, `RD-12`. A keyboard (`command`) drag, which also sets `:state(drag)`, so the rule applies there too. Property 1 names a pointer drag, property 2 names an item that isn't in a drag, and neither says anything about a command drag. An item with a handle, a pen and touch: the record doesn't read them either. I didn't run `just size`.

## Required properties

1. **An item in a pointer drag isn't selectable, nor is its content, for each item kind. One rule, in the sortable sheet, which `mx-list` doesn't adopt.**
   - **Holds.** The rule is `::slotted(:state(drag))`. `:state(drag)` is set on the dragged item in `onStart` and cleared in `onEnd` and on disconnect.
   - Only `sortable-list.ts:30` imports `styles/sortable/main.css.ts`, so `mx-list` doesn't adopt the sheet (`RF-129`).
   - The rule doesn't depend on the item's kind.
2. **An item outside a drag keeps its `user-select`.**
   - **Holds.** The rule matches only `:state(drag)`.
   - drag's gesture threshold is 8 px (`drag/src/kernel/gesture.ts:60`). Row 3 moves 6 px and reads `isDragged` as `false`, so it reads an item outside a drag.
3. **drag and `drag:DRI-11` don't change.**
   - **Holds.** The diff touches nothing under `packages/drag`.
   - The list's JSDoc and `list.mdx` don't change either, as the record says.

**`RF-146` property 3** quotes the text that it replaces exactly as property 3 had it. The new text is true of the code, `command` drags included: `user-select` is written only on an item in `:state(drag)`, and `touch-action` isn't written on an item.

## Rows

| Row | Kind | What it reads |
| --- | --- | --- |
| 1, 2 | `mx-list-item`, `mx-list-button-item`, `mx-list-link-item` | the document's selection after a mouse drag past the threshold; and after the release, once `:state(drag)` has cleared and no placeholder is left |
| 3 | `mx-list-item` | a 6 px press still selects text |
| 4 | `mx-list-item` | the held mouse leaves a 240 px list over a page paragraph; the selection during the drag and after the drop |

Each row uses real mouse input (`commands.pointerPress` and `commands.pointerMove`). Row 2 reads the selection after the rule stops applying, so it shows that nothing comes back when the item becomes selectable again. Row 4's paragraph doesn't outlive the row: `tests/support/browser-setup.ts` empties `document.body` after each test.

## Mutations, in the three engines

All four are mine. None is read from the implementer's Chromium record.

| Mutation | Chromium | Firefox | WebKit | Why it's owed |
| --- | --- | --- | --- | --- |
| Rule deleted | passes | passes | fails rows 1 and 2 for the plain and link items, and row 4 (5 rows) | removes property 1's mechanism |
| `::slotted(*)` for `::slotted(:state(drag))` | fails row 3 | fails row 3 | fails row 3 | removes property 2's mechanism |
| `-webkit-user-select` deleted | passes | passes | passes | a fallback |
| unprefixed `user-select` deleted | passes | passes | passes | a fallback |

- **The deleted rule is caught in WebKit alone, as the record says.** `RF-151` registers the defect as WebKit's: Chromium and Firefox show no highlight. The rows don't depend on an engine. A failure in WebKit matches the implementer's [witnesses](../../drag-selection-1/checks/witnesses.txt), and the off-list [reading](../../drag-selection-1/checks/off-list.txt) gives `e text`, the same as row 4.
- **The button item's rows 1 and 2 pass without the rule in WebKit too.** This confirms the architect's second note, and the comment above the rows that says that they have no witness.
- **Neither fallback mutation is caught by any engine.** That is expected and isn't a finding: each declaration on its own makes this WebKit pass (Playwright `webkit-2388`). The prefixed declaration serves older Safari, which only reads `-webkit-user-select`. Apple's [Safari 27.3 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27_3-release-notes.md) list unprefixed `user-select` as new. Safari is outside the matrix (`RD-12`), and the source comment says why the declaration is there. Removing `user-select` would leave Chromium and Firefox without a declaration, but they show no defect without the rule at all, so no row can tell.
- **Each mutation covered the whole file, not only the eight rows.** The `Justfile`'s `test *ARGS` splits the quoted `-t` pattern, so `-t mx-sortable-list` ran (see the checks file). Under every mutation, no other row of `sortable-list.browser.test.ts` changed result.

## Runs

- **Chromium, local, unmutated:** six files, 522 tests pass. They are `tests/list/sortable-list.browser`, `sortable-list.spec.browser`, `list-roles.browser`, `list-item.spec.browser`, `tests/core/elevation.spec.browser` and `tests/axe.browser`: the changed test file and the files that render `mx-sortable-list`.
- **Firefox and WebKit, from CI:** `verify` run [45882776261](https://github.com/ausginer/material-x/actions/runs/45882776261) on `c3209df1d65af3bc59a93972393b6fd9ff096bb0`, conclusion `success`.
  - Job `firefox` (140126200295): `sortable-list.browser.test.ts` passes, 210 tests with 12 skipped. `sortable-list.spec.browser.test.ts` passes, 26 tests.
  - Job `webkit` (140126200269): `sortable-list.browser.test.ts` passes, 210 tests with 12 skipped. `sortable-list.spec.browser.test.ts` passes, 36 tests.
  - In both jobs, 136 files pass and 1 is skipped: `axe.browser.test.ts`, whose 71 rows are all skipped there. So the other affected files pass too, though the reporter doesn't print them by name.

## Not a finding, for the record

The `Justfile`'s `test *ARGS` interpolates `{{ ARGS }}` unquoted, so `just test <file> -t "a b"` runs `-t a`, with `b` as a file filter. Here it widened the runs and hid nothing. A narrower pattern could make a run look filtered when it isn't. I'm only noting this, not routing it. The implementer's runs called `vitest` directly and aren't affected.