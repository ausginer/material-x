# Handoff: the `.host` invariant — the switch buttons restructured, and every template audited

**Recipient:** the implementer. The owner answered the plan's three questions on 2026-11-18, and the architect recorded the answers ([_The owner's answers_](#the-owners-answers)).

**Branch:** `repo/host-invariant-1`, from `main` at `e9236603e`. **Input:** the architect's commit that adds this file.

**Authorized** by the owner, relayed by the coordinator on 2026-11-18: plan `repo:RF-43` as widened on 2026-11-17 — the switch buttons' restructure, and the audit of every material-x template and every rule and helper that keys on `.host`.

**Governing records:**

- [`repo:RF-43`](../00-index.md), with its widening of 2026-11-17 and the owner's answers of 2026-11-18;
- [`repo:RF-50`](../00-index.md): the components that aren't controlled yet;
- the invariant, its exceptions and the controlled principle in [`architecture.md`](../../.agents/docs/architecture.md) §Components;
- [`repo:RF-35`](../00-index.md)'s rulings: the focus layer has its own variables, it shows over hover, and it draws on the keyboard-focus trigger;
- [`repo:RF-33`](../00-index.md): the focus forward (`forwardFocus`, `focusControl`, and `override focus()` in each class);
- [`repo:RF-42`](../00-index.md): Safari's rows press Option-Tab;
- CONTRIBUTING §8: the package is unreleased (`0.1.0`), so no compatibility shape is kept.

Every source fact below was read at `e9236603e`. The readings marked _read, not run_ are the first witnesses the implementer records.

## The audit

### Each component against the invariant

The invariant: the shadow root's root element has the class `host`. In a component that takes focus, `.host` is the element that takes it.

| Element | Root of the shadow tree | Focus target | Judgment |
| --- | --- | --- | --- |
| `mx-button`, `mx-icon-button` | `<button class="host" part="impl">` | `.host` | Meets it. |
| `mx-link-button` | `<a class="host" part="impl">` | `.host` | Meets it. |
| `mx-list-button-item`, `mx-list-link-item` | `<button>` / `<a class="host" part="impl">` | `.host` | Meets it. |
| `mx-list-item` | `<div class="host" part="impl">` | none | **Meets it.** The focus clause applies only to a component that takes focus, and a plain list item takes none. A drag handle is slotted light DOM, not the item's shadow tree. |
| `mx-fab` | `<button class="host" part="impl">` | `.host`, by Tab only | **Diverges in the helper half.** The shadow root doesn't delegate focus (`fab.ts:115` passes no `init`), and the class has no forward. With `:host { display: contents }` (`fab/styles/default/main.styles.css:5`), `fab.focus()` focuses nothing in any engine (_read, not run_). `RF-33`'s widened property names only hosts that delegate, so it didn't reach the FAB. **Proposed: restructure** (item 3). |
| `mx-switch-button`, `mx-switch-icon-button` | `<span class="interaction">`, holding `<input class="control" part="control" role="switch">` and `<span class="host" part="impl">` | `.control` | **Diverges.** This is `RF-43`'s subject. **Restructure** (items 1 and 2). |
| `mx-split-button` | `<mx-connected-button-group class="host" part="group impl">` | the nested `mx-button` and `mx-icon-button` | **`.host` is the root, and it doesn't take focus.** The component has two focus stops, and each is a nested component that meets the invariant. **Proposed: exception E3.** |
| `mx-checkbox`, `mx-radio` | three top-level elements: `<input class="input" part="impl">`, the indicator or icons, and the ripple that `useRipple(host)` appends to the shadow root | `.input` | **No `.host`, and no single root.** **Proposed: exception E1.** |
| `mx-text-field`, `mx-multiline-text-field` | `<input>` / `<textarea class="input" part="field">`, then the shared `text-field-core.tpl.html`'s label, slots, support and counter | `.input` | **No `.host`, and no single root.** **Proposed: exception E1.** |
| `mx-button-group`, `mx-connected-button-group`, `mx-list`, `mx-icon` | `<slot>` | none of their own. The connected group's roving tabindex moves focus between slotted light-DOM children. | **No `.host`.** **Proposed: exception E2.** |

`notched-outline.tpl.html`, `list-item-shared.tpl.html` and `text-field-core.tpl.html` are fragments that a component inserts, not component templates. `list-item-shared` goes inside `.host`, and the other two go into components under E1.

`accessibility.md` §Button says that the switch variants use a native `<button>`. At `e9236603e` they use `<input type="checkbox">`. After item 1, the claim is true. Five of §Button's claims cite files or helpers that don't exist (`useButtonCore.ts`, `core/controllers/useARIA.ts`, `main.ctr.css`, `useSwitch.ts`, `useTargetedARIA`). Item 5 corrects §Button.

### What each rule and helper keyed on `.host` assumes

| Rule or helper | Adopted by | Assumes |
| --- | --- | --- |
| `.host:focus-visible` outline, `core/styles/focus/focus.styles.css:1` | the button family through `useButtonCore`, `mx-fab`, interactive list items | `.host` takes focus |
| `.host:focus-visible` outline, `button/styles/default/main.styles.css:100` (the same rule a second time) | the button family | `.host` takes focus |
| `:host .host:focus-visible > .ripple::before`, the focus layer, `button/styles/default/main.styles.css:111` | the button family | `.host` takes focus, and the ripple is its child |
| `.host` base, disabled, outlined and elevated rules, and `core/styles/elevation/elevation.styles.css:5` | the button family, `mx-fab`, list items | `.host` is the visible container, and its pseudo-elements are free for elevation and the outline |
| `useButtonCore`: `rippleHost = .host`, and `target = .control ?? .host` (`ButtonCore.ts:105`–`:108`) | the button family | `.host` is the ripple's container. The fallback to `.control` exists only for the switches. |
| `forwardFocus(host, target)` (`ButtonCore.ts:114`, `ListInteractiveItemCore.ts:56`), and each class's `override focus()` | 7 hosts | the recorded control is the focus target. For the switches it is `.control`. |
| `$(this, '.host')` in `link-button.ts:83`, `fab.ts:125`, `ListItemCore.ts:79` | those elements | `.host` is the control |
| `useRipple(host, .host, .host)` | the button family, `mx-fab`, interactive list items | the ripple goes inside `.host` |
| `.control:focus-visible + .host`, `button/styles/default/switch-control.styles.css:19` | the switches | the switches' own trigger, beside the shared one |
| `part="impl"` | every `.host`, and `exportparts="impl:leading-impl"` / `"impl:trailing-impl"` in `split-button.tpl.html` | `impl` names the control and its visible container |

Every assumption holds for each element that meets the invariant. The switches break the first, third, fifth and sixth rows. `mx-fab` breaks the sixth row: nothing forwards its focus.

## The architect's rulings

These are within the architect's authority, and the owner may overrule them.

### R1 — The switch's `.host` is a native `<button type="button">` with `role="switch"`

**Required:** `.host` is the shadow root's one top-level element. It is a `<button type="button" class="host" part="impl" role="switch">`, and it holds the slots and the ripple, as `mx-button`'s `.host` does. The `.interaction` wrapper and the `<input>` are removed.

**Why a `<button>`.** `.host` has to take focus and contain the label and the icon slots.

- An `<input>` can't have children, so it can't be `.host`.
- A `<label class="host">` around the input doesn't take focus. The input inside it does.
- A `<span role="switch" tabindex="0">` would have to rebuild what a native button gives: activation by keyboard, `disabled`, and removal from the tab order when disabled.

A native button gives all three, and it is what `mx-button`, `mx-icon-button` and `accessibility.md` §Button already assume.

**What the native checkbox gave, and what replaces it:**

- **`input` and `change`.** A button fires neither, so the switch dispatches both after the button's `click`, with today's interfaces and flags: a plain `Event`; `input` bubbles and is composed; `change` bubbles and isn't composed; neither is cancelable. `SwitchCore.browser.test.ts` asserts these flags today, and it keeps asserting them.
- **The checked state.** It moves to `.host`'s `aria-checked`, under R2.
- **The accessible name.** Today the `<input>` has no label. Its name comes only from `aria-*` that `useARIA` mirrors from the host, and the slotted label text, a sibling of the input, isn't its name (_read, not run_). A `<button role="switch">` takes its name from its content. So `<mx-switch-button>Enabled</mx-switch-button>` gains the name _"Enabled"_. That is a fix, and item 4 adds a row for it.
- **The keys.** A native button activates on Space and on Enter, and the native checkbox activates on Space only. **Enter now activates the switch.** The ARIA switch pattern requires Space and allows Enter. Accepted.

### R2 — The switch stays a controlled component, and its states derive from `checked` alone

**Required:** activation fires `click`, then `input`, then `change`, and changes no state. `.host`'s `aria-checked`, the custom state `checked` and the form value follow the host's `checked` property, and nothing else changes them. A group's `value` reaches `checked` through the existing context path. No sequence of activation, attribute or property change, and group selection leaves two of these states disagreeing.

**Why.**

- **It is the family's documented model.** `checkbox.mdx:112` and `radio.mdx:115` call those components controlled. `mx-connected-button-group`'s `value` is set by the consumer. The switch's own story wraps it in a controlled React component (`switch-button.stories.tsx:26`).
- **It keeps the host's observable contract.** Today, activation doesn't change the host's `checked` or `:state(checked)`, so a consumer that reads `event.target.checked` in `change` reads the old value. That stays the same.
- **It removes today's split.** Today, activation toggles the inner input, so the screen reader's state and the form value (`SwitchCore.ts:94`–`:95`) change, while `checked` and the visual state don't. A switch whose consumer doesn't answer `change` announces _"on"_ and submits `on` while it is drawn off. The split exists because of the native checkbox, not because anyone chose it.

**Confirmed by the owner on 2026-11-18,** who states it as a principle for every material-x component ([`architecture.md`](../../.agents/docs/architecture.md) §Components). The alternative put to the owner, a switch that toggles itself, is not adopted.

### R3 — The parts afterwards

- **`impl`** names `.host`, the `<button role="switch">`: the visible container and the focus target, as in `mx-button`.
- **`control`** is removed. No element remains for it to name.

### R4 — The switches draw focus only through the button family's shared rules

No switch-specific focus rule remains. The indicator is `.host:focus-visible`, and the layer is `RF-35`'s rule at `main.styles.css:111`. Whatever remains of `switch-control.styles.css` is only what the switch still needs once `.interaction` and `.control` are gone. If nothing remains, the sheet and its import go.

## The owner's answers

Given on 2026-11-18 and relayed by the coordinator. The architect recorded them in `RF-43`, `RF-50` and [`architecture.md`](../../.agents/docs/architecture.md) §Components.

1. **The exceptions E1, E2 and E3 are approved.** `architecture.md` §Components states them.
   - **E1** covers a component whose semantics need a native element that can't hold the component's other parts: `mx-checkbox`, `mx-radio`, `mx-text-field` and `mx-multiline-text-field`. Their `<input>` or `<textarea>` is the focus target, and they have no `.host`. They draw their indicator and layer from the element's `:focus-visible` through later siblings (`RF-35`). Replacing that element would give up native checked and indeterminate state, text editing, IME and validation. The owner proposed this wider reading of E1. The architect accepted it, with a limit: the exception doesn't apply to an element that the component chooses when a container could give the same semantics. The switches' `<input>` is such a choice, and R1 replaces it.
   - **E2** covers the components that render only one `<slot>` and take no focus: `mx-icon`, `mx-list`, `mx-button-group` and `mx-connected-button-group`. A `class="host"` on a `<slot>` would have nothing to style and nothing to find.
   - **E3** covers the composite `mx-split-button`. Its `.host` is the root and carries `impl` and `group`. It doesn't take focus: each of its two focus stops is a nested component that meets the invariant.
2. **`mx-fab`'s focus forward is in this unit:** item 3.
3. **R2 stands, as a principle for the repository:** every material-x component is controlled. `mx-checkbox` and `mx-radio` don't meet it today (`RF-50`), and item 7 fixes them. The text fields are the principle's one exception, which the owner decided the same day (`RF-50`). Their code doesn't change.

## 1. The switch restructure

For `mx-switch-button` and `mx-switch-icon-button`, under R1 to R4. **Required properties:**

1. **The template:** R1's one top-level `<button type="button" class="host" part="impl" role="switch">`, holding the slots. No `.interaction` and no `<input>`.
2. **Focus:**
   - Tab and Option-Tab in Safari reach `.host`;
   - `host.focus()` focuses `.host` in Chromium, Firefox and Safari;
   - `useButtonCore`'s target is `.host`. The `.control` query and its fallback are removed (CONTRIBUTING §8 and §16).
3. **Role and state:**
   - `.host` has the role `switch`;
   - `.host`'s `aria-checked` is `"true"` or `"false"` from the first render on, and it always equals `checked` (R2).
4. **Activation:**
   - a pointer click, `host.click()`, Space and Enter each produce `click`, then `input`, then `change` on the host, each once, with the interfaces and flags under R1;
   - a disabled switch produces none, and Tab skips it;
   - a `<label for>` that names the host activates it as today (`useClickActivation`).
5. **The form value** is `value ?? 'on'` when `checked`, and absent otherwise. It follows `checked` under R2.
6. **The group:** in an `mx-connected-button-group`, a `value` set on the group checks the switch whose `value` matches and unchecks the others. Each one's `aria-checked`, `:state(checked)` and form value agree. Roving tabindex reaches each switch's `.host`.
7. **The parts and their documentation** follow R3: the `@csspart` JSDoc of both classes, and the _Parts_ and _Semantics_ sections of `switch-button.mdx` and `switch-icon-button.mdx`. Each claim about activation in the `.mdx` files states the controlled model. `:78` says that a click toggles `checked`, which is false under R2.
8. **Rendering:** at rest, unchecked, checked, hovered and disabled, each switch renders as it does at `e9236603e`. The switch visual baselines don't change (`button-switch-variants.png`, and the button-group rows that hold switch buttons).

## 2. The switches' focus layer

**Required:** each switch draws the focus state layer that its tokens define, unchecked and checked, under `RF-35`'s rulings:

- the layer has its own variables, `--_focus-layer-color` and `--_focus-layer-opacity`;
- it shows over hover;
- it draws on `.host:focus-visible`, the trigger of the switch's focus indicator, and not on a mouse click.

**What item 1 alone draws.** The switches adopt the button's `default/main.css.ts` and the elevated, outlined and tonal `main.css.ts` through `useButtonCore` and their own lists. So once `.host` takes focus, the shared rule draws a layer from the plain button's mapping, `md.comp.button.focused.state-layer.*` (`default/tokens.ts:29`–`:30`), and not the switch's selected or unselected tokens. Item 2 makes it the switch's own.

**The tokens.** No switch token package declares a focus-layer variable today: `defaultSwitchTokens`, `defaultSwitchFilledTokens`, `elevatedSwitchTokens`, `outlinedSwitchTokens`, `tonalSwitchTokens` and `variantSwitchTokens`. Material's tables define `md.comp.button.filled.selected.focused.state-layer.color` and its `unselected` counterpart. Read each switch colour's selected and unselected focused state-layer tokens through tproc (the `use-tokens-db` skill). Map them as the button family's `tokens.ts` maps `focus-layer.color` and `focus-layer.opacity`, under the `selected.` and `unselected.` paths that the switch renderer already crosses with `:state(checked)`.

**Stop** if a switch colour's tables define no focused state-layer token for a selection state. Report the colour and the state, and don't map a neighbouring token in its place.

## 3. `mx-fab`'s focus forward

**Required:**

- `fab.focus()` focuses `.host` in Chromium, Firefox and Safari;
- `mx-fab` joins `RF-33`'s adopters in the existing form. Its shadow root delegates focus, the class records `.host` with `forwardFocus` and declares `override focus()` as a call to `focusControl`, and nothing is an own property of an instance.

**The witness:** `mx-fab`'s rows in `tests/core/utils/useCore.browser.test.ts` fail at `e9236603e` and pass after the change.

## 4. Tests

- **`tests/button/SwitchCore.browser.test.ts`** reads `.host`, not `.control`. It keeps every row's property and adds:
  - Enter activates the switch;
  - `aria-checked` is `"false"` on a new switch, and follows `checked` through the property, the attribute and a group's `value`;
  - with no consumer handler, activation leaves `checked`, `aria-checked`, `:state(checked)` and the form value as they were. With a `change` handler that sets `checked`, all four follow it;
  - the accessible name of `<mx-switch-button>Enabled</mx-switch-button>` is _"Enabled"_. **The witness:** the row fails at `e9236603e` (_read, not run_; if it passes there, report that and keep the row).

  The row _"should reflect the value attribute to the control"_ goes. No control remains, and the form-data rows cover `value`.

- **`tests/core/focus-layer.spec.browser.test.ts`** extends its cases to both switches, unchecked and checked, and its mapping cases to each switch colour in both selection states. Each colour reads its own focused tokens, and each row uses `RF-42`'s `TAB` constant. **The witness:** dropping the switches' focus-layer mappings fails every new mapping row whose tokens differ from the plain button's. Report how many rows pass with only their own mapping dropped, and why, as `RF-35`'s closure did. A row passes that way when another sheet the switch adopts writes the same value (item 2, _What item 1 alone draws_).
- **`tests/core/utils/useCore.browser.test.ts`:** both switches expect `.host` as the focus target, and `mx-fab` joins `FORWARDING_TAGS` (item 3).
- **The visual layer:** no new row. A focus layer at 0.1 opacity is below the comparator's threshold (`RF-41`).

## 5. Documentation

- `accessibility.md` §Button: the switch bullets state what is true after item 1, under the controlled model. The _missing requirement_ about activation becomes the stated contract, as for the checkbox, and every citation in §Button names a file that exists. The claims in §Button Group, §FAB and §Text Field that cite missing files (`useButtonGroupCore.ts`, `core/controllers/useARIA.ts`, `useSlot.ts`, `focus.ctr.css`) are outside this unit, and the report lists them.
- The switches' JSDoc and `.mdx` files: item 1, property 7.
- `checkbox.mdx` and `radio.mdx` already call the components controlled. Item 7 checks that no claim in them says that activation changes `checked` or `indeterminate`.
- **`architecture.md` is the architect's,** and it already states the exceptions and the principle.

## 6. Measurement

material-x has no size budget (`RF-45`). Measure by hand, as the findings unit did ([reading](../findings-1/checks/item8-step1-size.txt)): minified and brotli bytes for the `switch-button`, `switch-icon-button`, `fab`, `checkbox` and `radio` entries, at `e9236603e` and at the head. Save the reading under `checks/`. No change in size is a stop. Report it.

## 7. `mx-checkbox` and `mx-radio` become strictly controlled

Under `RF-50`. Both build on `CheckableCore.ts`. Today the native input's activation behaviour changes its own state: a checkbox inverts `checked` and clears `indeterminate`, and a radio sets `checked`. The host's state doesn't change.

**Required:**

- after an activation and the consumer's synchronous `input` and `change` handlers, the native input's `checked` and `indeterminate` equal the host's. Activation can come from a pointer click, `host.click()`, Space, or a `<label>` that names the host. If a handler sets the state, the input shows the new state. If no handler sets it, the input shows the old one;
- `click`, `input` and `change` still fire once each, in that order, with today's interfaces and flags (`CheckableCore.browser.test.ts`);
- a disabled component is unchanged: no events, and no state change;
- `:state(checked)`, `:state(indeterminate)` and the form value already follow the host only, and they stay that way.

**Rows,** in `tests/core/elements/CheckableCore.browser.test.ts` and `tests/checkbox/checkbox.browser.test.ts`:

- _"should reflect the checked control back on interaction"_ (`:227`) is reversed. After a click with no handler, the host and the input are unchecked. **The witness:** the reversed row fails at `e9236603e`;
- a click with a `change` handler that sets `checked` leaves the host and the input checked;
- an indeterminate checkbox clicked with no handler stays indeterminate in the host and the input;
- a radio clicked with no handler stays unchecked.

**Expected, not established:** a screen reader may announce the native toggle and then the restored state. That is the cost of a controlled native input, and the report states what was observed, if anything was.

## 8. The connected group's shapes (`RF-56`)

**Added 2026-11-18 by the architect,** on the stop at `7667a2a5a`. `RF-56` holds the tokens, what is drawn today, and the cause. The owner rejected the new `button-group-connected-selected` baseline, so this item replaces it with the spec's shape. The old baseline is wrong too.

**Required,** for each button in an `mx-connected-button-group`, at every size. _Full_ means half the button's own height, which is how this repository draws Material's circular shape and its 50% corner:

1. **Unselected, at rest:** unchanged. The outer corners are the group's container shape, which is full in a round group and the buttons' square shape in a square group. The inner corners are `inner-corner.corner-size`.
2. **Selected:** all four corners are full, a pill, in a round group and in a square group, whatever the button's position.
   - The inner corners take `selected.inner-corner.corner-size`.
   - The outer corners stay full. Inside a connected group, the button's own toggle shape (`md.comp.button.<size>.selected.container.shape.*`) doesn't apply. Outside a group it still does, unchanged.
3. **Pressed:** the inner corners take `pressed.inner-corner.corner-size`, and the outer corners are unchanged. A selected button that is pressed takes the pressed inner corners while it is pressed, and its pill returns on release. The tokens don't order the two, and material-x's state lists keep selection apart from the interaction states (`button/styles/utils.ts:21`–`:29`). So this is the architect's ruling: the press is the feedback the user is producing at that moment. The architect recalls that Jetpack Compose's toggle-button shapes use the same order, but that wasn't read here.
4. **The tokens** come from tproc, through the group's token package, as `inner-corner.corner-size` already does. The selected and pressed sizes aren't written by hand. The pressed sizes are the table's per-size values (`RF-56`).
5. **`--md-button-group-inner-corner-size`** stays the consumer's override of the resting inner corners only. It doesn't change the selected or pressed shape. Its JSDoc says so.
6. **Neighbours don't change:** selecting or pressing a button changes only that button's shape.
7. **`button-group/spec-consistency.md`**'s _Selection/press morph_ bullet states what is true after this item, with its tokens.

**Rows,** in `tests/button-group/button-group.spec.browser.test.ts`, beside _"should render the tokenized inner-corner radius on a middle button"_. They read the computed corner radii against tproc's values and against the button's measured height, for every size:

- a selected button, first, middle and last: each corner is full;
- a pressed middle button: its inner corners are `pressed.inner-corner.corner-size`. Use real pointer input, and read while the pointer is down;
- a selected middle button while pressed: its inner corners are the pressed size;
- an unselected neighbour of a selected button keeps its resting corners;
- with `--md-button-group-inner-corner-size` set, a selected button is still a pill.

**The witness:** at `7667a2a5a`, the selected and pressed rows fail. Save their output.

**The visual row.** `button-group-connected-selected` changes again. Save the local images at `e9236603e` and at the head, and the diff, beside the stop's images under `checks/`, for the owner to compare with Material's reference. The baseline is recorded only through `RD-13`'s workflow, after the owner accepts it. That is still a stop under _Order and stops_, item 1's property 8: the report states the change, and the owner decides.

**Stop** if:

- the button's toggle shape can't be kept out of a connected group without changing how `mx-switch-button` draws outside a group;
- the pressed state can't be read with real input in one of the three engines.

## Order and stops

**Order:** item 1, then item 2 (it needs item 1's `.host`), then items 3 and 7. Each item lands with its rows from item 4 or item 7. Items 5 and 6 come last. Item 8, added after the stop at `7667a2a5a`, follows the commits already made, and item 6's measurement is repeated for the `button-group` entries.

**Stop and report, without working around it:**

- a visual baseline differs (item 1, property 8). Baselines change only through `RD-13`'s recording workflow, and only once the owner accepts the change;
- a switch colour has no focused state-layer token for a selection state (item 2);
- `.host` takes focus in Chromium but not in Firefox or Safari, by Tab or by `focus()`;
- the group path can't keep `checked`, `aria-checked`, `:state(checked)` and the form value in step without changing `ButtonGroupCore`'s context contract;
- the activation sequence can't keep today's event interfaces and flags, for the switches or, under item 7, for the checkbox and the radio;
- an `RF-35` row of the checkbox or the radio changes its result under item 7.

## The report

At `.plan/host-invariant-1/host-invariant-report.md`. For each item:

- what holds, with its witness;
- the full gate's run: `verify` on the pull request, all three engines;
- the measurement under item 6;
- each stop that was hit.

Then the closure of `RF-43` is the architect's.

## Not adopted

- **The `.host` class moved onto the `<input>`.** An input can't hold the slots.
- **A `<label class="host">` around the input.** The label doesn't take focus.
- **A `<span role="switch" tabindex="0">`.** It rebuilds keyboard activation and `disabled`, which a native button gives.
- **Keeping the `<input>` beside a `<button>`,** with the button as `.host` and the input for its events. Two controls hold one state, which is today's split again. An interactive element inside a `<button>` is invalid HTML.
- **Checkbox and radio rebuilt without a native input,** to meet the invariant by the letter. See E1.
- **A `class="host"` on the `<slot>` roots.** See E2.
- **A switch that toggles itself.** The owner chose the controlled model. See R2.
- **Cancelling the native input's `click` to keep its state** (item 7). A cancelled checkbox or radio activation reverts the state and fires no `input` or `change`, so the events would have to be rebuilt.

## Outside this unit

- **No focus layer on `mx-fab` or the interactive list items.** Their tokens may define one. `RF-35` and `RF-43` name only the button family, the checkbox and the radio, so this unit doesn't add one. If the owner wants it, the architect registers a finding.
- **The duplicate `.host:focus-visible` outline rule,** in `focus.styles.css:1` and `button/styles/default/main.styles.css:100`. The button family adopts both. It is a cleanup item and doesn't touch the invariant.
- **The text fields.** The owner made them an exception to the controlled principle (`RF-50`), and their code already behaves that way.