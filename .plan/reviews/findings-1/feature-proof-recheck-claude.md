# Findings unit, first unit — targeted feature-proof recheck

**Commit files were read at:** `d756e4f4fb8e7587e4583cdddee347a81d0b1aa3` (`repo/findings-1`, read in a worktree of my own; the tree was clean). **Diff reviewed:** `fc3b89680` (exclusive) → `d756e4f4f` (inclusive), excluding `.plan/`: `964af56ab` (`RF-42`), `a941ed888` (item 8, steps 2 and 3) and `7c09927f0` (item 8, step 1). `a81841cb0..d756e4f4f` changes only `.plan/`. **Records read at:** `d756e4f4f`. The architect's `0cccc93c2`, pushed while I read, was checked only for overlap with the finding below.

**Governing records:** [`findings-1-handoff.md`](../../findings-1/findings-1-handoff.md): _Owner decision: Safari's 9 keyboard-focus rows_ and its option (a) section; _Disposition of the feature-proof review at `a22c109b7`_; _Item 8: the feature-proof findings_; _Item 8, step 1, amended again 2026-11-17: the per-class form_ and its step 4 mutation ruling; and _Before the owner merges #29_, item 3. Also `RF-33`, `RF-35`, `RF-42`, `RF-43` and `RF-44` in [`00-index.md`](../../00-index.md); [`findings-1-report.md`](../../findings-1/findings-1-report.md) §8 and §9 and their readings under [`checks/`](../../findings-1/checks/); and my [review at `fc3b89680`](feature-proof-claude.md), whose `reviewer-2` to `reviewer-4` item 8 answers.

**Lens:** feature proof. Nothing is repaired.

## Scope

**Covered.**

- `964af56ab`'s `TAB` constant and its use in `tabTo`, and every other Safari key condition in `packages/material-x/tests`. There is none.
- `core/utils/useCore.ts`: `forwardFocus`, `focusControl` and their comments. Every caller of `forwardFocus` and `focusControl`, and every class that builds through `useButtonCore`, `useIconButtonCore`, `SwitchCore` or `useInteractiveListItemCore`, checked against the seven `override focus()` declarations. FAB and the split button were also read.
- `tests/core/utils/useCore.browser.test.ts`; the disabled-host rows in `button.browser.test.ts` and `list-item.browser.test.ts`; the watching row (`button.browser.test.ts:82`) and its Firefox marking.
- The 10 mapping rows in `focus-layer.spec.browser.test.ts`, and the three `icon-button.color.*` contracts added to `tests/support/visual-contracts.node.ts`.
- What `mx-icon-button` adopts (`icon-button.ts:64`–`:69`). The token packages that write `--_focus-layer-*` for the icon button's colours were rendered with a scratch script against the tree, and the focused state-layer tokens of the icon-button and button sets were resolved through tproc's `DB`.
- The mutation, size and CI readings, `item8-*.txt` and `rf42-option-tab-safari.txt`.
- `verify` 44010115020 and _Publish Docs_ 44010115229: both at `d756e4f4f`, read through `gh`. Every `verify` job succeeds. In the log, `useCore.browser.test.ts` runs 9 rows and `focus-layer.spec.browser.test.ts` runs 28, in Firefox and Safari. Firefox's material-x job has `1 expected fail`. _Publish Docs_ builds and skips `deploy`.
- The `.agents/docs/architecture.md` paragraph added in the diff. It was read against `RF-43`'s audit list.

**Not covered.** No build, lint, typecheck or test was run. The mutation and size readings were read as recorded, not reproduced. The only code I ran was the token-rendering and token-resolving scripts. They write nothing.

## Prior findings

| Finding | Status | Evidence |
| --- | --- | --- |
| `reviewer-2`: `focus` is an own property of each instance | **Resolved** | `forwardFocus` now only records the control in a module `WeakMap` (`useCore.ts:17`, `:26`–`:28`). `focusControl` holds the one body (`:37`–`:39`). Each class that registers a control declares `override focus(options?: FocusOptions): void`, which only calls `focusControl`: `Button`, `IconButton`, `LinkButton`, `SwitchButton`, `SwitchIconButton`, `ListButtonItem` and `ListLinkItem`. These are exactly the classes reaching `forwardFocus` (`ButtonCore.ts:114`, `ListInteractiveItemCore.ts:56`); FAB and the split button reach neither. The target (`.control ?? .host`), `delegatesFocus: true` and the comment are unchanged. The rows cover each required property: for the seven tags, no own `focus` and a `focus` on the class prototype; for subclasses of `Button` and `ListButtonItem`, one call to the override, no own `focus`, and the control focused through `super.focus()`. They pass in Chromium, Firefox and Safari. The watching row is unchanged, and it is the one expected failure in Firefox |
| `reviewer-3`: no row reads most of the focus-layer mappings | **Resolved**, with `recheck-1` on the mutation evidence | The 10 rows are exactly step 3's list. Each asserts the reach before reading, and in Safari it presses item 7's key. Each expectation comes through the bridge from the state's own package: `button.color.*` `focused`, the new `icon-button.color.*` `focused`, and `checkbox.default` or `radio.default` `selected.focus`. `mx-icon-button`'s outlined and elevated colours adopt the button's outlined and elevated sheets (`icon-button.ts:65`–`:66`); its own package has `filled`, `tonal` and `standard` (`styles/icon/tokens.ts:37`). So step 3's "each colour whose token package declares a focus-layer variable" is met. The template's `.host > .ripple` structure is the button's |
| `reviewer-4`: the claim about a control that can't take focus has no reading | **Resolved** | Each of the two rows focuses an `<input>`, calls `focus()` on a disabled `mx-button` or `mx-list-button-item`, and asserts that `document.activeElement` is still the input. The rows pass in all three engines. The row can't pass vacuously: if the input failed to take focus, the active element would be `<body>` and the assertion would fail |

**`RF-42`'s key holds.** `TAB` is `{Alt>}{Tab}{/Alt}` when `server.browser === 'safari'`, and `{Tab}` otherwise (`focus-layer.spec.browser.test.ts:121`). Its comment cites `RF-42` and says that Safari's default Tab skips these controls. The reach assertion is unchanged and runs first. The condition matches in CI: before `964af56ab` the 9 rows failed at the reach in Safari, and at `d756e4f4f` all 28 rows pass there.

**Step 1's other properties hold.** The build reading reports no flattener warning. The size reading stands in for a `measurements` row that material-x doesn't have, which `0cccc93c2` registers as `RF-45`.

**Not a finding:** the new `architecture.md` paragraph states the `.host` invariant, which `mx-checkbox` and `mx-radio` don't meet: their focusable root is `.input`. `RF-43`'s audit list already names this, so it stays `RF-43`'s.

## Findings

### Finding recheck-1: the `mx-icon-button` tonal row doesn't fail when only its own mapping is dropped

**Tier C.** Doesn't block merge.

- **Current behaviour.** `mx-icon-button` adopts both the button's tonal sheet and its own icon sheet (`icon-button.ts:68`–`:69`). Rendered from the tree, each writes the same declaration under the same selector:

  ```css
  :host(:state(tonal)) {
    --_focus-layer-color: var(--md-sys-color-on-secondary-container, #516d2f);
  }
  ```

  The button's tonal sheet writes it from `styles/tonal/tokens.ts:29`, and the icon sheet from `styles/icon/tokens.ts:105`. Through tproc's `DB`, `md.comp.icon-button.tonal.focused.state-layer.color` and `md.comp.button.tonal.focused.state-layer.color` resolve to the same value, and so do their opacities (0.1). Drop only the icon's tonal mapping, and the button's tonal declaration still draws the expected colour, so the `mx-icon-button tonal` row passes.

- **What the record says.** Mutation B (`item8-focus-layer-mutation.txt:40`–`:42`) drops the icon's lines and the button's tonal lines together, so the tonal row's failure there comes from both. Report §9 (`findings-1-report.md:270`) says that `mx-icon-button` filled is "the only such row". `0cccc93c2`'s `RF-35` closure repeats that 9 rows fail with only their own mapping dropped.
- **Why it is a problem.** Step 4's ruling requires the report to name each row that doesn't fail when its own mapping is dropped. The tonal row is a second one: the button's tonal mapping covers it, rather than tproc's deduplication. The row's expectation is right, because it reads `icon-button.color.tonal`'s own tokens, and what is drawn matches the spec. Only the record's account of what the mutation discriminates is wrong.
- **Evidence status.** This is derived from the rendered sheets and the adoption order, not from a run. I didn't run the narrower mutation.
- **Required property.** The record names every mapping row that passes when only its own mapping is dropped, with the mapping that stands in. Otherwise, a reading shows the row failing under that mutation alone.

## Summary

| ID | Tier | Claim | Blocks merge |
| --- | --- | --- | --- |
| `reviewer-2` | — | Resolved by `7c09927f0` | — |
| `reviewer-3` | — | Resolved by `a941ed888`; its mutation evidence carries `recheck-1` | — |
| `reviewer-4` | — | Resolved by `a941ed888` | — |
| `recheck-1` | C | The `mx-icon-button` tonal row is covered by the button's tonal mapping, but the record names filled as the only such row | No |

Nothing in the scoped diff blocks the merge.