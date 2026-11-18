# Handoff: the `.host` invariant — the switch buttons restructured, and every template audited

**Recipient:** the implementer, **after the owner answers the three questions under [_For the owner_](#for-the-owner)** and the architect records the answers. Until then, this is the plan for the owner.

**Branch:** `repo/host-invariant-1`, from `main` at `e9236603e`. **Input:** the architect's commit that adds this file.

**Authorized** by the owner, relayed by the coordinator on 2026-11-18: plan `repo:RF-43` as widened on 2026-11-17 — the switch buttons' restructure, and the audit of every material-x template and every rule and helper that keys on `.host`.

**Governing records:**

- [`repo:RF-43`](../00-index.md), with its widening of 2026-11-17;
- the invariant in [`architecture.md`](../../.agents/docs/architecture.md) §Components;
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

**The alternative, for the owner (question 3):** the switch toggles itself. Activation sets `checked`, then fires `input` and `change`, and cancelling the `click` prevents the toggle, as with a native checkbox. That matches `switch-button.mdx:78`'s _"click or press `Space` to toggle `checked`"_ and `accessibility.md` §Button's _missing requirement_. But it departs from the family's controlled model, and in a connected group, a switch would be checked beside the group's `value` until the consumer answers. If the owner chooses it, `mx-checkbox` and `mx-radio` would differ from the switches, so the architect would register a finding for them.

### R3 — The parts afterwards

- **`impl`** names `.host`, the `<button role="switch">`: the visible container and the focus target, as in `mx-button`.
- **`control`** is removed. No element remains for it to name.

### R4 — The switches draw focus only through the button family's shared rules

No switch-specific focus rule remains. The indicator is `.host:focus-visible`, and the layer is `RF-35`'s rule at `main.styles.css:111`. Whatever remains of `switch-control.styles.css` is only what the switch still needs once `.interaction` and `.control` are gone. If nothing remains, the sheet and its import go.

## For the owner

**1. The exceptions to the invariant.** Each one amends the owner's rule, so the owner decides. The architect recommends all three.

- **E1 — A component whose focus target is a native `<input>` or `<textarea>`:** `mx-checkbox`, `mx-radio`, `mx-text-field`, `mx-multiline-text-field`. The input can't contain the component's other parts, so no element can be both the root and the focus target. Replacing the input gives up native checked and indeterminate state, text editing, IME and validation, and it would reopen `RF-35`'s ruling on the trigger. These components adopt none of the rules keyed on `.host`. They draw their indicator and layer from the input's `:focus-visible` through later siblings (`RF-35`).
- **E2 — A component that renders only its light-DOM children through one `<slot>`, and takes no focus of its own:** `mx-icon`, `mx-list`, `mx-button-group`, `mx-connected-button-group`. A `class="host"` on a `<slot>` would have nothing to style and nothing to find, and a shared `.host` rule that matched a slot would be a defect.
- **E3 — A composite of other material-x components:** `mx-split-button`. Its `.host` is the root and carries `impl` (and `group`). It doesn't take focus: each of its two focus stops is a nested component that meets the invariant.

**The amended paragraph** that the architect writes into `architecture.md` §Components once the owner decides. It replaces the current paragraph:

> **`.host` is the root, and it takes focus.** In a material-x component that renders a container of its own, the shadow root's one top-level element has the class `host` and the part `impl`. In a component that takes focus, `.host` is the element that takes it. Shared styles and helpers depend on this. The button family's focus indicator and focus layer draw on `.host:focus-visible`. `useButtonCore`, FAB, the link button and the list items find their control as `.host`. Delegated and forwarded focus lands on it. If a template wraps `.host`, or puts the focusable element beside it, these break without an error. The owner stated the invariant on 2026-11-17, and decided its exceptions on _date_ ([`repo:RF-43`](../../.plan/00-index.md)):
>
> - **A native input is the focus target.** `mx-checkbox`, `mx-radio`, `mx-text-field` and `mx-multiline-text-field` have no `.host`. The input can't contain the component's other parts. They draw their focus indicator and focus layer from the input's `:focus-visible` through later siblings.
> - **Only a slot.** `mx-icon`, `mx-list`, `mx-button-group` and `mx-connected-button-group` render their children through one `<slot>`, take no focus, and have no `.host`.
> - **A composite.** `mx-split-button`'s `.host` is the root and doesn't take focus. Its focus stops are nested components that meet the invariant.
>
> A new component meets the invariant, or the record states which exception it falls under.

**2. Is `mx-fab`'s focus forward in this unit?** The architect recommends yes. It is the same mechanism as `RF-33`, and it adds one class to the forward's adopters and one row. Declined, it stays under `RF-43` as an open divergence.

**3. Is the switch controlled (R2) or self-toggling?** The architect recommends controlled, as R2 states. Under either model, item 1 is otherwise unchanged.

## 1. The switch restructure

For `mx-switch-button` and `mx-switch-icon-button`, under R1 to R4. **Required properties:**

1. **The template:** R1's one top-level `<button type="button" class="host" part="impl" role="switch">`, holding the slots. No `.interaction` and no `<input>`.
2. **Focus:**
   - Tab and Option-Tab in Safari reach `.host`;
   - `host.focus()` focuses `.host` in Chromium, Firefox and Safari;
   - `useButtonCore`'s target is `.host`. The `.control` query and its fallback are removed (CONTRIBUTING §8 and §16).
3. **Role and state:**
   - `.host` has the role `switch`;
   - `.host`'s `aria-checked` is `"true"` or `"false"` from the first render on, and it always equals `checked`, under R2 or under the owner's answer to question 3.
4. **Activation:**
   - a pointer click, `host.click()`, Space and Enter each produce `click`, then `input`, then `change` on the host, each once, with the interfaces and flags under R1;
   - a disabled switch produces none, and Tab skips it;
   - a `<label for>` that names the host activates it as today (`useClickActivation`).
5. **The form value** is `value ?? 'on'` when `checked`, and absent otherwise. It follows `checked` under R2.
6. **The group:** in an `mx-connected-button-group`, a `value` set on the group checks the switch whose `value` matches and unchecks the others. Each one's `aria-checked`, `:state(checked)` and form value agree. Roving tabindex reaches each switch's `.host`.
7. **The parts and their documentation** follow R3: the `@csspart` JSDoc of both classes, and the _Parts_ and _Semantics_ sections of `switch-button.mdx` and `switch-icon-button.mdx`. Each claim about activation in the `.mdx` files states the model the owner decides. `:78` says that a click toggles `checked`. Under R2 that is false.
8. **Rendering:** at rest, unchecked, checked, hovered and disabled, each switch renders as it does at `e9236603e`. The switch visual baselines don't change (`button-switch-variants.png`, and the button-group rows that hold switch buttons).

## 2. The switches' focus layer

**Required:** each switch draws the focus state layer that its tokens define, unchecked and checked, under `RF-35`'s rulings:

- the layer has its own variables, `--_focus-layer-color` and `--_focus-layer-opacity`;
- it shows over hover;
- it draws on `.host:focus-visible`, the trigger of the switch's focus indicator, and not on a mouse click.

**What item 1 alone draws.** The switches adopt the button's `default/main.css.ts` and the elevated, outlined and tonal `main.css.ts` through `useButtonCore` and their own lists. So once `.host` takes focus, the shared rule draws a layer from the plain button's mapping, `md.comp.button.focused.state-layer.*` (`default/tokens.ts:29`–`:30`), and not the switch's selected or unselected tokens. Item 2 makes it the switch's own.

**The tokens.** No switch token package declares a focus-layer variable today: `defaultSwitchTokens`, `defaultSwitchFilledTokens`, `elevatedSwitchTokens`, `outlinedSwitchTokens`, `tonalSwitchTokens` and `variantSwitchTokens`. Material's tables define `md.comp.button.filled.selected.focused.state-layer.color` and its `unselected` counterpart. Read each switch colour's selected and unselected focused state-layer tokens through tproc (the `use-tokens-db` skill). Map them as the button family's `tokens.ts` maps `focus-layer.color` and `focus-layer.opacity`, under the `selected.` and `unselected.` paths that the switch renderer already crosses with `:state(checked)`.

**Stop** if a switch colour's tables define no focused state-layer token for a selection state. Report the colour and the state, and don't map a neighbouring token in its place.

## 3. `mx-fab`'s focus forward (if the owner answers yes to question 2)

**Required:**

- `fab.focus()` focuses `.host` in Chromium, Firefox and Safari;
- `mx-fab` joins `RF-33`'s adopters in the existing form. Its shadow root delegates focus, the class records `.host` with `forwardFocus` and declares `override focus()` as a call to `focusControl`, and nothing is an own property of an instance.

**The witness:** `mx-fab`'s rows in `tests/core/utils/useCore.browser.test.ts` fail at `e9236603e` and pass after the change.

## 4. Tests

- **`tests/button/SwitchCore.browser.test.ts`** reads `.host`, not `.control`. It keeps every row's property and adds:
  - Enter activates the switch;
  - `aria-checked` is `"false"` on a new switch, and follows `checked` through the property, the attribute and a group's `value`;
  - activation leaves `checked`, `aria-checked`, `:state(checked)` and the form value as R2 or the owner's answer requires;
  - the accessible name of `<mx-switch-button>Enabled</mx-switch-button>` is _"Enabled"_. **The witness:** the row fails at `e9236603e` (_read, not run_; if it passes there, report that and keep the row).

  The row _"should reflect the value attribute to the control"_ goes. No control remains, and the form-data rows cover `value`.

- **`tests/core/focus-layer.spec.browser.test.ts`** extends its cases to both switches, unchecked and checked, and its mapping cases to each switch colour in both selection states. Each colour reads its own focused tokens, and each row uses `RF-42`'s `TAB` constant. **The witness:** dropping the switches' focus-layer mappings fails every new mapping row whose tokens differ from the plain button's. Report how many rows pass with only their own mapping dropped, and why, as `RF-35`'s closure did. A row passes that way when another sheet the switch adopts writes the same value (item 2, _What item 1 alone draws_).
- **`tests/core/utils/useCore.browser.test.ts`:** both switches expect `.host` as the focus target, and `mx-fab` joins `FORWARDING_TAGS` (item 3).
- **The visual layer:** no new row. A focus layer at 0.1 opacity is below the comparator's threshold (`RF-41`).

## 5. Documentation

- `accessibility.md` §Button: the switch bullets state what is true after item 1, under the owner's state model, and every citation in §Button names a file that exists. The claims in §Button Group, §FAB and §Text Field that cite missing files (`useButtonGroupCore.ts`, `core/controllers/useARIA.ts`, `useSlot.ts`, `focus.ctr.css`) are outside this unit, and the report lists them.
- The switches' JSDoc and `.mdx` files: item 1, property 7.
- **`architecture.md` is the architect's,** and it is written before the implementer starts (_For the owner_).

## 6. Measurement

material-x has no size budget (`RF-45`). Measure by hand, as the findings unit did ([reading](../findings-1/checks/item8-step1-size.txt)): minified and brotli bytes for the `switch-button`, `switch-icon-button` and `fab` entries, at `e9236603e` and at the head. Save the reading under `checks/`. No change in size is a stop. Report it.

## Order and stops

**Order:** item 1, then item 2 (it needs item 1's `.host`), then item 4's rows for each item, then items 3, 5 and 6.

**Stop and report, without working around it:**

- a visual baseline differs (item 1, property 8). Baselines change only through `RD-13`'s recording workflow, and only once the owner accepts the change;
- a switch colour has no focused state-layer token for a selection state (item 2);
- `.host` takes focus in Chromium but not in Firefox or Safari, by Tab or by `focus()`;
- the group path can't keep `checked`, `aria-checked`, `:state(checked)` and the form value in step without changing `ButtonGroupCore`'s context contract;
- the activation sequence can't keep today's event interfaces and flags.

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
- **Self-toggling as the ruling.** It is the owner's alternative under question 3, not the default. See R2.

## Outside this unit

- **No focus layer on `mx-fab` or the interactive list items.** Their tokens may define one. `RF-35` and `RF-43` name only the button family, the checkbox and the radio, so this unit doesn't add one. If the owner wants it, the architect registers a finding.
- **The duplicate `.host:focus-visible` outline rule,** in `focus.styles.css:1` and `button/styles/default/main.styles.css:100`. The button family adopts both. It is a cleanup item and doesn't touch the invariant.
- **`mx-checkbox`'s inner input still toggles on activation** while its host's `checked` doesn't. That is R2's split, in a component that E1 leaves as it is. Under R2 the architect recommends registering it as a finding for a later unit.