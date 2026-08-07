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

## Drag (`@ydinjs/drag2` sortable)

Reviewed 2026-08-07, at the Phase 16 keyboard-sorting gate.

### Fulfilled requirements

- **Reordering is operable from the keyboard**, not only by pointer. `ArrowUp`/`ArrowLeft` move the focused row one slot toward the start and `ArrowDown`/`ArrowRight` one slot toward the end, through the same proposal protocol the pointer path uses — asserted directly, not inferred (`packages/drag2/tests/sortable/keyboard.browser.test.ts`).
- **A command is refused, not swallowed, when it cannot be performed.** An arrow key on a row already at the edge of the collection leaves the event untouched, so it keeps its native meaning (scrolling, or the page's own handler). Feasibility is decided synchronously inside the listener precisely so that `preventDefault()` is conditional (contract D-32, I-32).
- **`Escape` cancels an in-flight drag** on both input paths, and the item returns to its grab slot.
- **A `handle()` narrows both input modes identically**, so a row whose drag affordance is a grip does not become keyboard-reorderable through its whole box.
- **The temporary placeholder is `aria-hidden`** and mirrors the dragged row's slot, so assistive technology does not see a duplicate row while a drag is in flight.

### Missing requirements

- **The library provides no roles, no focus management and no live-region announcement, and cannot.** It is headless and never owns the consumer's markup: `sortable()` binds `keydown` on the container, so the event must originate inside a row, which means **a row that cannot take focus cannot be reordered from the keyboard at all**. A consumer must supply `tabindex`, the list/listitem semantics, and any announcement of the resulting order. `packages/drag2/src/sortable.stories.tsx` now does all three and says why. `[Docs]` — this is the correct boundary for a headless library, but it must be stated in the documentation rather than left to be discovered.
- **No `aria-live` announcement of a completed reorder ships with the library**, for the same reason. A consumer that omits one leaves a keyboard reorder silent to a screen-reader user. `[Docs]`
- **A multi-press drag — pick up, move with several arrows, drop — is not supported**, deliberately. See Q-13 below.

### Q-13 — is a multi-press keyboard mode required? **No.**

Contract 02 records that a command is **one slot**, and that a multi-press mode would need an operation that stays `ACTIVE` across further discrete events — a producer of a release the kernel does not own. That would be a failing executable case and would reopen the re-frozen contract, so the question had to be answered here rather than worked around by having the behavior fake a release.

It is not required, on either of the two grounds that would have forced it:

- **Parity.** The shipped `@ydinjs/drag` is one-slot per key press, and the ledger classifies keyboard reordering as _retain_. Nothing regresses.
- **User need.** One-press-per-move is a complete and conventional accessible reordering pattern: each key press performs one committed move that the consumer can announce, and there is no modal "carrying" state a user can get stuck in or forget to exit. The grab-and-drop model's advantage is moving several slots without intermediate commits, which costs a mode with its own discoverability and escape problems. For a list, repeated single moves are the better trade.

Recorded as answered rather than closed: if a real user need for multi-press appears, contract 00's admissible-change rule applies exactly as written, and the case reopens the SPI legitimately.

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