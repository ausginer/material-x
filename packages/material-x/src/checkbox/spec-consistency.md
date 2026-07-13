# Checkbox — Material 3 Expressive spec consistency

Review of `mx-checkbox` against the Material Design 3 checkbox spec.

- **Spec reference:** <https://m3.material.io/components/checkbox/specs> (read 2026-07-12)
- **Method:** compiled CSS via `npx just debug src/checkbox/styles/default/main.css.ts`, token-DB resolution (`use-tokens-db`), and inspection of `checkbox.ts` / `core/elements/CheckableCore.ts`.

## Summary

Structure, sizing, selection/indeterminate states, disabled treatment, focus indicator, and form participation are all consistent with M3. **No repo defects found** — every `:host(:state(...))` rule is actually activated at runtime (the custom states `checked`, `indeterminate`, and `:disabled` are all wired), so there is no button-group-style dead-rule bug.

## What matches the spec ✅

| Aspect | Spec (M3) | Implementation | Status |
| --- | --- | --- | --- |
| Container size | 18dp | `--_container-size: 18px` | ✅ |
| Container shape | 2dp rounded | `--_container-shape: 2px` | ✅ |
| State-layer size | 40dp | `--_state-layer-size: 40px` | ✅ |
| Outline width (unselected) | 2dp | `--_outline-width: 2px` | ✅ |
| Selected fill | primary | `--_container-color: primary` | ✅ |
| Check glyph colour | on-primary | `--_icon-color: on-primary` | ✅ |
| Focus indicator | 3dp ring, 2dp offset | `md.comp.checkbox.focus.indicator.*` (3px / 2px) | ✅ |
| Disabled | 38% opacity | `--_container-opacity: 0.38` on `:host(:disabled)` | ✅ |
| Indeterminate priority | overrides checked | `indeterminate` icon + `:state(indeterminate)` win regardless of `checked` | ✅ |
| Form participation | submits `value` (default `on`) when checked | `CheckableCore` `setFormValue` | ✅ |

### Custom-state wiring (the button-group failure mode — checked here)

- `checked` → `CheckableCore` calls `toggleState(innards, 'checked', …)`, activating `:host(:state(checked))`.
- `indeterminate` → `checkbox.ts` calls `toggleState(innards, 'indeterminate', …)`, activating `:host(:state(indeterminate))` and setting native `input.indeterminate`.
- `disabled` → a form-associated element with the `disabled` attribute matches `:host(:disabled)` per spec (no extra wiring needed, same as `mx-button`).

### Icon-size note (intentional override)

`icon.size` is pinned to **24px** in `styles/default/tokens.ts` (token value is 18dp). This is a deliberate Figma-intent override so the `check_small` / `check_indeterminate_small` Material Symbols visually fill the 18dp container — documented inline in `tokens.ts`. Not a defect.

## Deltas / gaps ⚠️

None requiring a code change.

- The shared `core/elements/styles/main.css.ts` sources the focus ring from `md.comp.checkbox.focus.indicator.*`. This is shared by all `CheckableCore` elements; `mx-radio` reuses it because `md.comp.radio-button.focus.indicator.*` **does not exist upstream** (verified MISSING in the token DB). Faithful, not a bug — see the radio review.