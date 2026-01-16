# Accessibility

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
