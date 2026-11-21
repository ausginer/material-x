# Accessibility

Note: `[Docs]` tag is for those requirements that cannot be fixed and considered an appropriate limitation we have to mention in documentation when documentation is ready.

## Button

### Fulfilled requirements

- `mx-button`, `mx-icon-button`, `mx-switch-button` and `mx-switch-icon-button` render a native `<button>` as `.host`, so keyboard activation, `disabled` and removal from the tab order are built in (`src/button/button.tpl.html`, `src/button/icon-button.tpl.html`, `src/button/switch-button.tpl.html`, `src/button/switch-icon-button.tpl.html`).
- `disabled` is transferred to the internal button by `useDisableable`, so native `disabled` behavior is preserved on the button-based variants (`packages/core/src/traits/disableable.ts`, called from `src/button/ButtonCore.ts`).
- `aria-*` attributes on the host are mirrored to the internal control by `useARIA`, enabling accessible names and descriptions through `aria-label`, `aria-labelledby` and `aria-describedby` (`packages/core/src/controllers/useARIA.ts`, called from `src/button/ButtonCore.ts`).
- `mx-link-button` removes `href`, applies `aria-disabled` and sets `tabindex="-1"` when disabled, which prevents focus and activation (`useDisableableLinkable` in `packages/core/src/traits/linkable.ts`, called from `src/button/link-button.ts`).
- A visible focus indicator is drawn on `.host:focus-visible` with the focus-indicator tokens (`src/core/styles/focus/focus.styles.css`, `src/button/styles/default/main.styles.css`).
- The switch variants' `.host` is a `<button type="button" role="switch">`. Its accessible name comes from its content, so `<mx-switch-button>Enabled</mx-switch-button>` is named _"Enabled"_. `aria-checked` is `"false"` from the first render and follows the host's `checked` (`src/button/switch-button.tpl.html`, `src/button/switch-icon-button.tpl.html`, `src/button/SwitchCore.ts`).
- The switch variants are controlled, as `mx-checkbox` and `mx-radio` are. `Space`, `Enter`, a pointer click and a `<label>` that names the host fire `click`, then `input`, then `change`, and change no state. `aria-checked`, the `checked` custom state and the form value change only when the consumer sets `checked`, so assistive technology never announces a state that the switch doesn't draw (`src/button/SwitchCore.ts`). An application that wants the switch to toggle sets `checked` in a `change` handler.

### Missing requirements

None known.

## Button Group

### Fulfilled requirements

- `mx-button-group` and `mx-connected-button-group` set `role="group"` on the host, providing an accessible grouping for contained controls (`src/button-group/button-group.ts`, `src/button-group/connected-button-group.ts`).
- Button group properties (`color`, `size`, `shape`, `disabled`) are shared to child buttons via context, so group styling stays consistent with the host (`src/button-group/useButtonGroupCore.ts`, `src/button/useButtonCore.ts`).
- `mx-connected-button-group` implements roving tabindex with Arrow/Home/End navigation across enabled buttons to support segmented control keyboard interaction (`src/button-group/connected-button-group.ts`).

### Missing requirements

- There is no labeling mechanism on the host (`aria-label` or `aria-labelledby`) or in templates, so groups can be exposed without an accessible name unless the consumer provides one (`src/button-group/button-group.ts`, `src/button-group/button-group.tpl.html`). [Docs]

## FAB

### Fulfilled requirements

- The component renders a native `<button>` inside the shadow DOM, so Enter/Space activation and button semantics are handled by the browser (`src/fab/fab.tpl.html`).
- Slotted label text is rendered inside the internal button, so extended FABs with visible text expose a native button name (`src/fab/fab.tpl.html`).
- `disabled` is forwarded to the internal `<button>`, so disabled FABs are unfocus-host and non-interactive (`src/fab/fab.ts`, `src/fab/fab.tpl.html`).
- Host `aria-*` attributes are mirrored to the internal `<button>`, so icon-only FABs can be named via `aria-label` on the host (`src/fab/fab.ts`, `src/core/controllers/useARIA.ts`).
- Focus indicator styles are provided via the shared focus tokens and `:focus-visible` rules applied to `.host` (`src/core/styles/focus/focus.ctr.css`, `src/fab/fab.ts`).
- The internal button explicitly sets `type="button"`, preventing accidental form submission (`src/fab/fab.tpl.html`).

### Missing requirements

- None noted.

## List

### Accessibility test notes

- `mx-list` exposes `role="list"` through `ElementInternals` (`src/list/list.ts`).
- Each item's `listitem` role is a `role` attribute on its row: the outermost element of the item's shadow tree, which has a box and holds everything the item renders. For `mx-list-item`, the row is its `.host`. For `mx-list-button-item` and `mx-list-link-item`, the row is a `div` around the `<button>` or `<a>` `.host`, which keeps its own role (`src/list/list-item.tpl.html`, `src/list/list-button-item.tpl.html`, `src/list/list-link-item.tpl.html`). The host sets no role, and its `role` attribute stays the consumer's.
- The role isn't on the host, because the host is `display: contents`: WebKit then parents an interactive item's button or link to the list, outside its `listitem`. On the row, each control is inside its item in Chromium, Firefox and WebKit.
- The row draws nothing. While an interactive item's control is lifted into the top layer for a drag, the row is `display: contents`, so the list keeps no gap for it (`src/list/styles/item/main.styles.css`).
- `tests/list/list-roles.browser.test.ts` checks the structure in every engine of the gate, and Chromium's own accessibility tree through CDP: one `listitem` per item, below the list, with each button and link inside its item and keeping its role and name. Firefox's and WebKit's trees were read with the probe in `.plan/list-roles-1/probes/list-roles.ts`.
- Interactive items keep their native control semantics: `mx-list-button-item` is operable and exposed as a button, and `mx-list-link-item` is exposed as a link, and is removed from the tab order when disabled (`src/list/list-button-item.ts`, `src/list/list-link-item.ts`).

### Missing requirements

- **WebKit parents an item's slotted light-DOM content, such as its label text and a `data-handle` grip, to the list rather than to the item's `listitem`,** because the host is `display: contents`. The item's name is still computed from its content. This was read in Playwright's WebKit build, not in Safari with VoiceOver. Only a host with a box would remove it, and the list's layout depends on the host having none. [Docs]
- A static item's host with its own `tabindex` gets an accessible node of its own: `generic` in Chromium and `group` in WebKit.

## Drag (`@ydinjs/drag` sortable)

Reviewed 2026-11-06, with the production package. Tests: `packages/drag/tests/focus.browser.test.ts`, `order.browser.test.ts`, `input.browser.test.ts`, `sortable.browser.test.ts` and `landing.browser.test.ts`, run in Chromium, Firefox and WebKit. Updated 2026-11-07 for `drag:DRD-15` and `drag:DRD-17`, 2026-11-10 for `drag:DRD-33`, and 2026-11-15 for `drag:DRD-64`, which carried the handle and multi-press conclusions into this section.

### Fulfilled requirements

- **Reordering is operable from the keyboard.** `ArrowUp`/`ArrowLeft` move the focused row one slot toward the start and `ArrowDown`/`ArrowRight` one slot toward the end. An arrow key at the edge of the collection leaves the event untouched, so it keeps its native meaning.
- **Focus survives a reorder.** Moving a focused element sends focus to `body` in all three engines. The kernel records the focused element inside the item at the drop, through open shadow roots, and focuses it again after `end` if nothing has taken focus since. So a reorder in the verdict or in a custom behavior's `end` keeps focus, and two arrow presses in a row reorder twice, with no consumer code.
- **A keyboard restore scrolls, and a pointer restore does not.** A row moved off-screen by keyboard stays visible.
- **The lift does not move focus.** Promotion runs the popover focusing steps, which focus an `autofocus` descendant, and the lift puts focus back.
- **The library never takes focus** from an element the user or the consumer has focused since the drop, and it does not restore on destruction.
- **`Escape` cancels an in-flight drag** on both input paths. Once the operation has started, the key's default is prevented, so a modal dialog or an `auto` popover holding the list stays open. The key still propagates.
- **A `handle()` narrows both input modes identically.**
- **The placeholder is `aria-hidden`** and mirrors the dragged row's slot.
- **Every landing that `landing()` starts has zero duration with `prefers-reduced-motion: reduce`.**

### Missing requirements

- **The library provides no roles and no live-region announcement.** It is headless and never owns the consumer's markup. A consumer must supply `tabindex`, the list and listitem semantics and an announcement of the new order. **A row that cannot take focus cannot be reordered from the keyboard.** `[Docs]`
- **`layoutAnimation`'s row animations ignore `prefers-reduced-motion`.** A consumer who needs that omits `displacement` under the preference. `[Docs]`
- **A custom `Landing` handles `prefers-reduced-motion` itself.** The library applies the preference only to the landings that `landing()` starts. `[Docs]`
- **A `handle()` removes keyboard reordering unless the consumer makes the handle focusable.** A command starts only from focus inside the handle, so a focused row whose handle cannot take focus does not reorder. `[Docs]`
- **A multi-press keyboard mode is not supported:** picking up a row, moving it with several arrow presses and dropping it. Each press is one committed move, on two grounds:
  - **Parity.** The packages drag replaced also move one slot per key press, so nothing regresses.
  - **One press per move is a complete pattern.** It is a conventional accessible reordering pattern: each press commits one move the consumer can announce, and there is no carrying mode a user can get stuck in or forget to leave. Moving several slots without intermediate commits would need such a mode, with its own discoverability and escape problems.
- **Physical touch and pen are unverified.** Touch runs through Chromium's emulated input only.

## Radio

### Fulfilled requirements

- Native `<input type="radio">` is used inside the shadow root, so `Space` activation, `:disabled` semantics, and the `checked` state are built-in (`src/radio/radio.tpl.html`, `src/core/elements/CheckableCore.ts`).
- Focus is delegated to the internal control via `delegatesFocus`, and a visible focus indicator is drawn on `:focus-visible` (`src/radio/radio.ts`, `src/radio/styles/default/main.css.ts`).
- The element is form-associated and submits `value` under `name` when checked (`src/core/elements/CheckableCore.ts`).

### Missing requirements

- **No `role="radiogroup"` and no accessible group name.** Nothing in the repo exposes radiogroup semantics, so a set of `mx-radio` elements is announced as unrelated radios rather than "N of M" within a named group (verified 2026-07-15 in Chromium: no `[role="radiogroup"]` is produced for same-named radios). [Docs]
- **No arrow-key roving.** Each `mx-radio` is its own tab stop; `ArrowDown`/`ArrowUp`/`ArrowLeft`/`ArrowRight` do not move or change selection within a group (verified 2026-07-15 in Chromium). This departs from the expected radio-group keyboard pattern, where the group is one tab stop and arrows select. [Docs]
- **Single selection is not enforced.** Each control lives in its own shadow root, so native radio grouping does not apply and same-named radios can all be checked simultaneously; the host application must enforce mutual exclusion. Pinned by `test/radio/radio.browser.test.ts`. [Docs]

These three gaps share one root cause and one intended fix: a grouping component (`mx-radio-group`) owning the wrapper role, accessible name, roving tabindex, and single-selection logic. `src/radio/spec-consistency.md` records this as a deliberate deferral, not a defect in `mx-radio` itself. Until it exists, the obligation sits with the host application and is documented in `src/radio/radio.mdx`.

## Text Field

### Fulfilled requirements

- Native `<input>` and `<textarea>` are used for single- and multi-line entry, so core text input semantics and IME behavior are provided by the browser (`src/text-field/text-field.tpl.html`, `src/text-field/multiline-text-field.tpl.html`).
- Focus delegation is enabled at shadow root creation, so pointer/focus interaction targets the internal editable field (`src/text-field/TextFieldCore.ts`).
- `disabled`, `inputmode`, and `type` are forwarded to the internal field, preserving core native field behavior for those attributes (`src/text-field/TextFieldCore.ts`, `src/text-field/text-field.ts`).
- Host `aria-*` attributes are mirrored to the internal field via `useARIATransfer`, allowing consumer-provided ARIA naming/description/state (`src/text-field/TextFieldCore.ts`, `src/core/controllers/useARIA.ts`).
- Slot observers conditionally add/remove `label`, `support`, and `counter` IDs in `aria-labelledby` / `aria-describedby` only when slot content is present and when the corresponding host ARIA attribute is not explicitly set; fallback IDs are also restored immediately when host `aria-labelledby` / `aria-describedby` is removed at runtime (`src/text-field/TextFieldCore.ts`, `src/core/controllers/useARIA.ts`, `src/core/controllers/useSlot.ts`).
- The visible shadow-DOM label is now natively associated with the internal control via `for="field"` and matching internal `id="field"`, so label activation behavior such as clicking the label to focus the field is preserved for both single-line and multiline variants (`src/text-field/text-field-core.tpl.html`, `src/text-field/text-field.tpl.html`, `src/text-field/multiline-text-field.tpl.html`).
- Focus indicator is shown via underline/outline changes on `:focus-within`, which matches expected text-field focus behavior (`src/text-field/styles/default/main.styles.css`, `src/text-field/styles/outlined/main.styles.css`).

### Missing requirements

- Native text-field attributes important for accessibility and form UX (for example `required`, `readonly`, `autocomplete`, and other native constraint/input hints) are not forwarded to the internal `<input>`/`<textarea>`, because only `disabled`, `inputmode`, and `type` are transferred (`src/text-field/TextFieldCore.ts`, `src/text-field/text-field.ts`). [Docs]