# Report: the `.host` invariant — items 1 to 8

**Handoff:** [`host-invariant-handoff.md`](host-invariant-handoff.md), items 1 to 8. **Input:** `ac213194d` on `repo/host-invariant-1` for items 1 to 7, whose `packages/` tree is the same as at `e9236603e`. Item 8 is from `2cef95836`, which the architect added after the stop at `7667a2a5a`. **Governing records:** `repo:RF-43`, `repo:RF-50`, `repo:RF-56`, `repo:RF-35`, `repo:RF-33`, `repo:RF-42`, and [`architecture.md`](../../.agents/docs/architecture.md) §Components.

**Status: waiting for the owner's acceptance of one visual change.** `button-group-connected-selected` changes (item 1, property 8, and item 8). Every other property holds. The baseline isn't recorded, and the pull request isn't opened, so the gate (`verify`) hasn't run. See [The stop](#the-stop).

All readings below are local runs in the devcontainer: Chromium 158, Firefox 159 and WebKit 27.2, through Playwright. "Three engines" means these three.

## Item 1 — the switch restructure

**What holds:**

1. **Template.** Each switch renders one top-level `<button type="button" class="host" part="impl" role="switch" aria-checked="false">`, holding the slots and the ripple. There is no `.interaction` and no `<input>` (`switch-button.tpl.html`, `switch-icon-button.tpl.html`).
2. **Focus.** `useButtonCore`'s target is `.host`. The `.control` query and its fallback are removed (`ButtonCore.ts`). Tab (Option-Tab in Safari, `RF-42`) and `host.focus()` reach `.host` in all three engines.
3. **Role and state.** `.host` has the role `switch`. Its `aria-checked` is `"false"` from the first render, and the `checked` attribute callback sets it with the custom state and the form value (`SwitchCore.ts`).
4. **Activation.** A pointer click, `host.click()`, Space, Enter and a `<label for>` each fire `click`, then `input`, then `change` on the host, once each, with the interfaces and flags at `e9236603e`. A cancelled `click` fires no `input` or `change`, as on a native checkbox. A disabled switch fires nothing, and Tab skips it.
   - **How:** a button fires no `input` or `change`. The switch gives `.host` a custom command (`commandForElement` is `.host` itself, `command` is `--activate`) and dispatches `input` and `change` from the `command` event. A button's command runs as its activation behaviour: after `click` has finished dispatching, and only if no listener cancelled it. So `input` and `change` follow every `click` listener, including one on `document`, as they do on a native checkbox. The tests run the command path in all three engines. Dispatching from a `click` listener would put `input` and `change` before the consumer's own `click` listeners on the host.
5. **Form value.** `value ?? 'on'` when `checked`, and absent otherwise. A `value` change while checked writes `value ?? 'on'`. At `e9236603e` it wrote the raw new value, which was `null` when `value` was removed.
6. **Group.** The switch's context effect sets the host's `checked` property, so `aria-checked`, `:state(checked)` and the form value follow it through the same attribute callback. `ButtonGroupCore`'s context contract is unchanged. Roving tabindex reaches `.host`.
7. **Parts and documentation.** `@csspart control` is removed from both classes. `impl` names the native switch button. The `@event` JSDoc and the _States_, _Accessibility_, _Anatomy_ and _Deltas_ sections of both `.mdx` files state the controlled model.
8. **Rendering.** Not met for one row. See [The stop](#the-stop).

`switch-control.css.ts` and `switch-control.styles.css` are deleted. After the restructure, nothing in them applies. The switches draw focus only through the button family's shared `.host:focus-visible` rules (R4).

**Witness:** `tests/button/SwitchCore.browser.test.ts`: 43 rows pass in each of the three engines. Against `e9236603e`'s source, 26 of them fail in Chromium ([`checks/witness-e9236603e.txt`](checks/witness-e9236603e.txt)). The rows for Enter, `aria-checked`, the controlled model, the accessible name, the group and focus all fail there. The accessible-name row fails at `e9236603e` in all three engines.

- **Accessible name.** The row asserts _"Enabled"_ on `.host` through `toHaveAccessibleName`. At `e9236603e`, `.host` is a `<span>`, so the witness shows only that the visible container had no name. That the `<input>` had none either is _read, not run_: it has no label, and its only name source is mirrored `aria-*`.

## Item 2 — the switches' focus layer

**What holds:** each switch colour maps `focus-layer.color` to its own `selected` or `unselected` focused state-layer colour token, under the `selected.default` and `unselected.default` paths:

| Package | Unchecked | Checked |
| --- | --- | --- |
| `defaultSwitchTokens` | `md.comp.button.unselected.focused.state-layer.color`, and `focus-layer.opacity` from `md.comp.button.focused.state-layer.opacity` | `md.comp.button.selected.focused.state-layer.color` |
| `defaultSwitchFilledTokens` | the same under `md.comp.button.filled` | the same under `md.comp.button.filled` |
| `elevatedSwitchTokens`, `outlinedSwitchTokens` | `md.comp.button.<colour>.unselected.focused.state-layer.color` | `md.comp.button.<colour>.selected.focused.state-layer.color` |
| `tonalSwitchTokens` | the same, and `focus-layer.opacity` from `md.comp.button.tonal.focused.state-layer.opacity` | the same |
| `variantSwitchTokens` (icon) | `md.comp.icon-button.<variant>.unselected.focused.state-layer.color` | `md.comp.icon-button.<variant>.selected.focused.state-layer.color` |

The opacity mapping follows the button family's `main` packages: the default and tonal packages declare one, and the others inherit it.

**Not a stop:** every switch colour's tables define a focused state-layer **colour** for both selection states. The tables define no selection-specific focused state-layer **opacity** for any button or icon-button colour, only `<set>.focused.state-layer.opacity` (0.1 in every set). The mapping reads that token, which is the colour's own focused opacity and not a neighbouring state's.

**Tests:** `tests/core/focus-layer.spec.browser.test.ts` adds the two switches, unchecked and checked, to its cases (focus layer, focus with hover, hover alone, mouse click, and the indicator), and adds 14 mapping rows: `mx-switch-button` filled, elevated, outlined and tonal, and `mx-switch-icon-button` filled, tonal and standard, each unchecked and checked. Each row reads its own contract, registered in `tests/support/visual-contracts.node.ts` from the production token signals, and uses `RF-42`'s `TAB`. 66 rows pass in each of the three engines.

- **The oracle for a selection state.** A row reads the colour from the selection's state (`unselected.focused`) and the opacity from the plain interaction state (`focused`). The selection states hold no opacity of their own, so they inherit the pressed opacity from `default`. A first run that read the opacity from `unselected.hovered` failed the four hover-alone rows: expected 0.1 (pressed), observed 0.08 (Material's hover opacity, which the component draws correctly).
- **Row names** read _checked_ and _unchecked_. Vitest truncates a `$name` over 40 characters, and `mx-switch-icon-button standard unselected` has 41.

**Witness** ([`checks/item2-focus-layer-mutation.txt`](checks/item2-focus-layer-mutation.txt)): with every switch mapping dropped, 11 rows fail. With only its own mapping dropped, **7 of the 14 mapping rows fail and 7 pass.** Each row that passes does so because another sheet the switch adopts writes the same value:

- `mx-switch-button` outlined unchecked: the outlined `main` sheet;
- `mx-switch-icon-button` filled, both states, and standard unchecked: the default switch sheet's `md.comp.button.{unselected,selected}.focused` tokens;
- `mx-switch-icon-button` tonal, both states: the button's tonal switch sheet.

## Item 3 — `mx-fab`'s focus forward

**What holds:** the FAB's shadow root delegates focus. The class records `.host` with `forwardFocus` and declares `override focus()` as a call to `focusControl`. `fab.focus()` focuses `.host` in all three engines, and `focus` isn't an own property of an instance.

**Witness:** `tests/core/utils/useCore.browser.test.ts` adds `mx-fab` to `FORWARDING_TAGS` and a row per tag, _should focus the .host of %s on focus()_. Both `mx-fab` rows fail against `e9236603e` in all three engines, and so do the two switch rows (the target was `.control` there). The link hosts get an `href` in that row, because a link without one doesn't take focus.

## Item 4 — tests

Item 4's rows are listed under items 1, 2 and 3. Added beyond the handoff's list: a cancelled `click` fires no `input` or `change`; `input` and `change` follow a `click` listener on `document`; a checked switch without `value` submits `on`; a group value change unchecks the previous switch. The row _"should reflect the value attribute to the control"_ is removed.

**No visual row is added** (`RF-41`).

## Item 5 — documentation

- `accessibility.md` §Button is rewritten. Each claim states what is true after item 1, under the controlled model. The _missing requirement_ about activation is now the stated contract, and every citation names an existing file. That every cited path exists was checked by a shell `test -f` on each.
- The switches' JSDoc and `.mdx` files: item 1, property 7.
- **Corrected in item 7's scope:** `checkbox.mdx` (_click or press Space to toggle_, _toggles with Space_), `radio.mdx` (_click to change the selected radio_, _Space selects_), and the `@event` JSDoc of `checkbox.ts` and `radio.ts` (_fired when the checked state changes_) said that activation changes `checked`. They now say that activation fires the events and leaves `checked` unchanged.
- **Outside this unit, listed:** §Button Group cites `useButtonGroupCore.ts`, §FAB cites `core/controllers/useARIA.ts` and `focus.ctr.css`, and §Text Field cites `useSlot.ts` at missing paths. None of them is changed.

## Item 6 — measurement

[`checks/item6-size.txt`](checks/item6-size.txt): each entry bundled with its dependencies by esbuild, at `e9236603e` and at the head.

| Entry                | Minified | Brotli | Gzip |
| -------------------- | -------- | ------ | ---- |
| `switch-button`      | −251     | −144   | −169 |
| `switch-icon-button` | +34      | −161   | −163 |
| `fab`                | +135     | +41    | +60  |
| `checkbox`           | +80      | +19    | +22  |
| `radio`              | +20      | +5     | +6   |

The switches lose `switch-control.css`, the `<input>` and `useCheckable`/`useValuable`. They gain the command wiring and the focus-layer declarations. In `switch-icon-button` the icon variants' focus-layer rules outweigh what was removed, measured minified. The FAB gains `delegatesFocus`, the `WeakMap` that `forwardFocus` uses, and the `focus()` method. The checkbox and the radio gain the state restore after `change`. These deltas are attributed by reading the diff, and no ablation was run for them. No change in size is a stop.

## Item 7 — `mx-checkbox` and `mx-radio` strictly controlled

**What holds:** `useCheckableCore`'s `change` listener sets the native input's `checked` from the host after it has dispatched the host's `change`. `mx-checkbox` adds a second listener that does the same for `indeterminate`. After an activation and the consumer's synchronous `input` and `change` handlers, the input shows the host's state: the new state if a handler set it, and the old one otherwise. `click`, `input` and `change` fire once each, in order, with the same interfaces and flags. A disabled component is unchanged. `:state(checked)`, `:state(indeterminate)` and the form value follow the host, as before.

**Rows:**

- _"should reflect the checked control back on interaction"_ is reversed: after a click with no handler, the host and the input are unchecked, for both `mx-checkbox` and `mx-radio`. **The witness:** it fails at `e9236603e` for both.
- after a Space press with no handler, the host and the input are unchecked (fails at `e9236603e` for both);
- a click with a `change` handler that sets `checked` leaves the host and the input checked;
- an indeterminate checkbox clicked with no handler stays indeterminate in the host and the input (fails at `e9236603e`).

The radio row the handoff names, _a radio clicked with no handler stays unchecked_, is the shared reversed row's `mx-radio` case.

**`RF-35`'s checkbox and radio rows** pass unchanged in all three engines. No stop.

**Expected, not established:** a screen reader may announce the native toggle and then the restored state. No assistive technology was run, and nothing is observed.

## Item 8 — the connected group's shapes (`RF-56`)

**What holds,** for each button in an `mx-connected-button-group`, at every size:

1. **Unselected, at rest:** unchanged. Outer corners are the button's container shape, and inner corners are `inner-corner.corner-size` or `--md-button-group-inner-corner-size`.
2. **Selected:** a pill. The inner corners take `selected.inner-corner.corner-size`, and the outer corners take the group's `container.shape` instead of the button's own toggle shape. Outside a group, the switch's toggle shape is unchanged: nothing in `button/` changed, and the button and switch rows pass unchanged.
3. **Pressed:** the inner corners take `pressed.inner-corner.corner-size`, and the outer corners are unchanged. A selected button that is pressed takes the pressed inner corners and keeps its full outer corners. Its pill returns on release.
4. **Tokens from tproc.** `connected/tokens.ts` now selects every state of `md.comp.button-group.connected.<size>` and renders `selected` and `pressed` on the slotted button (`:host ::slotted(:state(checked))`, `:host ::slotted(:active)`). A token declared on the button resolves `--_shape-full` against the button's own height; declared on the group, it would resolve against the group. `main.css.ts` renders `default`, then `selected`, then `pressed`, so a press wins over a selection at equal specificity. The selected outer corner is appended as `outer-corner.corner-size`, a reference to `container.shape`. A 50% corner is drawn as `var(--_shape-full)` (`fixHalfCorner`), as the handoff defines _full_.
5. **`--md-button-group-inner-corner-size`** sets the resting inner corners only, and the connected group's JSDoc says so.
6. **Neighbours don't change.**
7. **`button-group/spec-consistency.md`:** the _Selection/press morph_ bullet is replaced by a _Selection morph_ and a _Press morph_ bullet, with their tokens.

**A tproc defect, fixed in scope.** tproc serialized every length as `px`, so the table's `50%` arrived as `50px`. `processToken.ts` now writes a `PERCENT` length as a percentage, and `tests/processToken.node.test.ts` adds a row for it. In Material's tables the `PERCENT` lengths are the connected group's `selected.inner-corner.corner-size`, the standard group's `pressed.item.width.multiplier` and five split-button corner tokens. Before the fix, material-x emitted none of them. Every material-x `.css.ts` was compiled before and after the fix, and only the connected group's sheet changed. tproc's node suite passes (72 rows).

- **Removed:** `buttonGroupDefaultSelector` and the renderer's `onlyDefault` option. They have no caller left (CONTRIBUTING §8, §16).

**Real input.** `tests/support/input-commands.node.ts` adds `pointerPress(x, y)` and `pointerRelease()`, after drag's commands: Playwright's mouse, or WebDriver actions for the local Safari engine. `userEvent` has no press that lasts across a read. The pressed rows read the corners while the pointer is down in all three engines. That stop isn't hit.

**Rows** in `tests/button-group/button-group.spec.browser.test.ts`, for every size: a selected first, middle and last button is a pill; a pressed middle button's corners are the pressed size; a selected middle button while pressed has the pressed size; an unselected neighbour keeps its resting inner corners; with `--md-button-group-inner-corner-size` set, a selected button is a pill. The handoff's rows are all there. Added beyond them: a selected first button is a pill in a square group. Each row reads tproc's value through the contract and compares it with the computed radii. A _full_ value is compared with half the button's measured height. All 50 rows in the file pass in each of the three engines.

**Witness** ([`checks/item8-witness-7667a2a5a.txt`](checks/item8-witness-7667a2a5a.txt)): against `7667a2a5a`'s source, 30 rows fail, 6 per size. These are the selected, pressed and override rows.

- The override rows fail on the observation: 2px is drawn where the pill needs 16 to 68px.
- The selected and pressed rows fail at the oracle first, because the group's package had no `selected` or `pressed` state.
- A scratch probe recorded what `7667a2a5a` drew: a selected first button in a round small group had 12px corners, against 20px at the head.
- The square-group row passes at `7667a2a5a` too, because a square switch's own selected shape is already round. It is coverage, not a witness.

## Full local run

`browser`, `spec` and `node` projects, packages/material-x, at the final state:

- Chromium: 18 files, 401 tests pass;
- Firefox and WebKit: 35 files, 796 tests pass, and 1 is the expected failure `button.browser.test.ts` declares for Firefox (`it.fails`, `repo:RF-33`), which this unit doesn't change.

`aube exec just typecheck` passes. `aube exec just lint` passes on every changed `.ts` file. No linter is configured for `.tpl.html`, `.mdx` or `.md`, so lint didn't apply to them. `oxfmt` formatted every changed file.

## The stop

**`button-group-connected-selected` changes** (item 1, property 8: _a visual baseline differs_).

Local rendering doesn't match the CI baselines, so each comparison was made in one environment:

1. The `visual` project was recorded locally at `e9236603e`'s source.
2. That recording was checked against `e9236603e` itself as a control: 19 of 19 pass.
3. The head was compared with that recording.
4. The committed baselines were restored afterwards.

- **At `7667a2a5a`** (items 1 to 7): 6 pixels differ. The selected button _Two_ took the button's own toggle shape, 12dp on every corner. The owner rejected it. Images: [`checks/item1-connected-selected-local-e9236603e.png`](checks/item1-connected-selected-local-e9236603e.png), [`…-local-head.png`](checks/item1-connected-selected-local-head.png), [`…-local-diff.png`](checks/item1-connected-selected-local-diff.png).
- **At the head** (item 8): 110 pixels differ. _Two_ is a full pill, and _One_ and _Three_ keep their small inner corners. Images, for the owner to compare with Material's reference:
  - before, at `e9236603e`: [`checks/item8-connected-selected-local-e9236603e.png`](checks/item8-connected-selected-local-e9236603e.png);
  - after, at the head: [`checks/item8-connected-selected-local-head.png`](checks/item8-connected-selected-local-head.png);
  - the diff: [`checks/item8-connected-selected-local-diff.png`](checks/item8-connected-selected-local-diff.png).

  Both before images are recordings of `e9236603e` from separate runs, and their files differ byte for byte. Each passed its own run's control.

- Every other visual row matches.

**For the owner:** accept the item 8 image, after which the baseline is recorded through `RD-13`'s workflow, or rule otherwise. The pull request waits for that acceptance, and the report's _full gate_ line stays open until `verify` runs.

## Scratch work

Firefox 159 for Playwright was installed into the container's `~/.cache/ms-playwright` to run Firefox locally. It is retained as a shared cache.