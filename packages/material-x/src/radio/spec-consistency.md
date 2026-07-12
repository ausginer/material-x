# Radio — Material 3 Expressive spec consistency

Review of `mx-radio` against the Material Design 3 radio-button spec.

- **Spec reference:** <https://m3.material.io/components/radio-button/specs> (read 2026-07-12)
- **Method:** compiled CSS via `npx just debug src/radio/styles/default/main.css.ts`, token-DB resolution (`use-tokens-db`), and inspection of `radio.ts` / `core/elements/CheckableCore.ts`.

## Summary

Sizing, selected/unselected icon treatment, disabled dimming, focus indicator, and form participation are all consistent with M3. **No repo defects found.** The one behavioural gap (single-selection grouping / arrow-key roving) is a documented design decision, not a bug.

## What matches the spec ✅

| Aspect | Spec (M3) | Implementation | Status |
| --- | --- | --- | --- |
| Icon size | 20dp | `--_icon-size: 20px` | ✅ |
| State-layer size | 40dp | `--_state-layer-size: 40px` | ✅ |
| Unselected icon colour | on-surface-variant | `--_icon-color: on-surface-variant` | ✅ |
| Selected icon colour | primary | `:host(:state(checked)) --_icon-color: primary` | ✅ |
| Focus indicator | 3dp ring, 2dp offset | shared `md.comp.checkbox.focus.indicator.*` (radio has no own token) | ✅ |
| Disabled | 38% icon opacity, on-surface | `--_icon-opacity: 0.38` on `:host(:disabled)` | ✅ |
| Form participation | submits `value` when checked | `CheckableCore` `setFormValue` | ✅ |
| Selection reveal | filled dot morph | `.on` `clip-path` circle 0%→50% on `:state(checked)` | ✅ |

### Custom-state wiring

- `checked` → `CheckableCore` `toggleState(innards, 'checked', …)` activates `:host(:state(checked))`.
- `disabled` → form-associated element with `disabled` attribute matches `:host(:disabled)` (same mechanism as `mx-button`).

## Deltas / gaps ⚠️

None requiring a code change.

1. **No focus-indicator token of its own (upstream).** `md.comp.radio-button.focus.indicator.*` and `md.comp.radio-button.container.size` are **MISSING** from the M3 token table (verified via `use-tokens-db`). The shared `CheckableCore` base styles fall back to `md.comp.checkbox.focus.indicator.*`, and radio sizes from `state-layer.size` + `icon.size`. Token-faithful.
2. **Single-selection grouping is delegated to the controller (by design).** `mx-radio` is a *controlled* component: only one checked per `name` group and arrow-key roving are the host application's responsibility (native radio grouping does not apply to form-associated custom elements). There is no `mx-radio-group` component in this repo. This matches the documented "controlled component" contract in `radio.ts`; if a grouped, self-navigating radio is wanted it would be a new component, tracked separately.
