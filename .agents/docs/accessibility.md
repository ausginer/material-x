# Accessibility

Note: `[Docs]` tag is for those requirements that cannot be fixed and considered an appropriate limitation we have to mention in documentation when documentation is ready.

## Button

### Fulfilled requirements

- Native `<button>` is used for `mx-button`, `mx-icon-button`, `mx-switch-button`, and `mx-switch-icon-button`, so keyboard activation and semantics are built-in (`src/button/button.tpl.html`, `src/button/icon-button.tpl.html`).
- Disabled state is transferred to the internal button via `useAttributeTransfer`, so native `disabled` behavior is preserved on button-based variants (`src/button/useButtonCore.ts`).
- `aria-*` attributes on the host are mirrored to the internal control, enabling accessible names/descriptions via `aria-label`/`aria-labelledby`/`aria-describedby` (`src/core/controllers/useARIA.ts`, `src/button/useButtonCore.ts`).
- `mx-link-button` removes `href`, applies `aria-disabled`, and sets `tabindex="-1"` when disabled, preventing focus/activation (`src/button/link-button.ts`, `src/button/link-button.tpl.html`).
- A visible focus indicator is defined via `:focus-visible` and outline tokens (`src/button/styles/default/main.ctr.css`).
- Switch variants assign `role="switch"` and map `checked` to `aria-checked` via `useTargetedARIA`, so assistive tech can read the switch state when `checked` is set (`src/button/useSwitch.ts`, `src/core/utils/useCore.ts`).

### Missing requirements

- Switch variants do not toggle `checked` on activation; `aria-checked` only updates when the host attribute changes externally, so default interaction does not announce state changes unless the consumer updates `checked` (`src/button/useSwitch.ts`). [Docs]

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

- `mx-list` exposes `role="list"` through `ElementInternals`, and list items currently expose `role="listitem"` through `ElementInternals` on the custom-element host (`src/list/list.ts`, `src/list/ListItemCore.ts`).
- List item hosts use `display: contents` so their internal `div`, `button`, or `a` implementation can participate in layout without an extra host box (`src/list/styles/default/main.styles.css`). Future accessibility tests must verify that the host `listitem` role is still exposed in the accessibility tree for `mx-list-item`, `mx-list-button-item`, and `mx-list-link-item` in the supported Baseline browser matrix.
- Tests should also verify that interactive items retain their native control semantics: `mx-list-button-item` remains operable and exposed as a button, while `mx-list-link-item` remains exposed as a link when enabled and is removed from focus/navigation when disabled (`src/list/list-button-item.ts`, `src/list/list-link-item.ts`).

### Missing requirements

- No automated accessibility coverage exists yet for the `display: contents` host plus `ElementInternals.role` combination. If tests show that a supported browser/AT combination drops the host `listitem` role, move list item semantics to a non-`display: contents` wrapper or another tested structure.

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
