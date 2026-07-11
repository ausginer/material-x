# Button — Material 3 Expressive spec consistency

Review of `mx-button` (regular button) against the Material Design 3 **Expressive** button spec.

- **Spec reference:** <https://m3.material.io/components/buttons/specs> (read 2026-06-20)
- **Implementation under test:** Storybook at `http://localhost:6006` (`Button/Regular` stories)
- **Method:** live DOM measurement of the rendered shadow-root `.host` element (computed `height`, `border-radius`, padding, color, box-shadow) compared against the M3 spec tables, plus inspection of the **compiled** CSS via `npx just debug <file>.css.ts` (the token-transformation output, which injects state rules such as `:host(:active)` that are not present in the `.css.ts` template source).

> Note on theme: the running Storybook uses a custom **green** palette, not the baseline purple. Color **roles** were checked for correctness, not exact hex values; the palette difference is expected and not treated as a deviation.

## Summary

The component is **highly consistent** with the M3 Expressive spec for structure, sizing, shape, color roles, and the pressed shape-morph. **One** behavioral delta was found:

1. **Disabled elevated button keeps its elevation-1 shadow** (spec requires elevation 0 when disabled).

## What matches the spec ✅

### Variants & configuration

| Aspect | Spec (M3 Expressive) | Implementation | Status |
| --- | --- | --- | --- |
| Color styles | elevated, filled (default), tonal, outlined, text | `color` = (default) filled / elevated / tonal / outlined / text | ✅ |
| Sizes | XS, Small (default), M, L, XL | `size` = xsmall / (default) small / medium / large / xlarge | ✅ |
| Shapes | Round (default), Square | `shape` = (default) round / square | ✅ |
| Small button padding | 16dp recommended (24dp "not recommended") | 16px | ✅ |
| Toggle/selection | Available (Expressive) | Provided via `mx-switch-button` (selected → square morph implemented through shape `checked` state tokens) | ✅ |

### Container height (measured)

| Size | Spec  | Measured | Status |
| ---- | ----- | -------- | ------ |
| XS   | 32dp  | 32px     | ✅     |
| S    | 40dp  | 40px     | ✅     |
| M    | 56dp  | 56px     | ✅     |
| L    | 96dp  | 96px     | ✅     |
| XL   | 136dp | 136px    | ✅     |

### Corner radius — round (full) and square (measured)

| Size | Round (spec → measured) | Square (spec → measured) | Status |
| ---- | ----------------------- | ------------------------ | ------ |
| XS   | Full → 16px (½·32)      | 12dp → 12px              | ✅     |
| S    | Full → 20px (½·40)      | 12dp → 12px              | ✅     |
| M    | Full → 28px (½·56)      | 16dp → 16px              | ✅     |
| L    | Full → 48px (½·96)      | 28dp → 28px              | ✅     |
| XL   | Full → 68px (½·136)     | 28dp → 28px              | ✅     |

Square radii are an **exact** match to the spec's "Corner sizes" table.

### Pressed corner radius / shape-morph (compiled CSS)

Spec "Shape morph → Pressed state": when pressed, buttons morph to a smaller radius. The compiled CSS injects `:host(:active)` rules that set `--_container-shape` per size:

| Size | Spec pressed | Compiled rule | Status |
| --- | --- | --- | --- |
| XS | 8dp | `:host(:active)` → 8px (default, not overridden) | ✅ |
| S | 8dp | `:host(:active)` → 8px | ✅ |
| M | 12dp | `:host(:state(medium):active)` → 12px | ✅ |
| L | 16dp | `:host(:state(large):active)` → 16px | ✅ |
| XL | 16dp | `:host(:state(xlarge):active)` → 16px | ✅ |

Exact match. The `border-radius` transition in `default/main.styles.css` animates the morph. (This is only visible under a real pointer/keyboard `:active`; synthetic `pointerdown` events do **not** trigger the `:active` pseudo-class, so DOM-event simulation is not a valid way to test it — read the compiled CSS instead.)

### Color roles (measured against spec "Color" table — Default column)

| Style | Spec container / label | Observed (role-consistent) | Status |
| --- | --- | --- | --- |
| Filled | Primary / On primary | dark fill, white label | ✅ |
| Elevated | Surface container low / Primary | light fill, primary label, shadow | ✅ |
| Tonal | Secondary container / On secondary container | tonal fill, dark label | ✅ |
| Outlined | Outline variant border / On surface variant | transparent, 1px outline, variant label | ✅ |
| Text | Primary label, invisible container | transparent, primary label, no border | ✅ |

### Disabled colors

Spec uses on-surface based disabled tokens; implementation renders container = on-surface @ **10%** and label = on-surface @ **38%** for both filled and elevated. ✅

## Deltas / gaps ⚠️

### Disabled elevated button retains elevation

- **Spec (Elevated button states):** "elevation of 1 by default and **0 when disabled**."
- **Measured `box-shadow`:**
  - Enabled: `0px 0.75px 0.75px` (elevation 1) ✅
  - Disabled: `0px 0.75px 0.75px` (**still elevation 1**) ⚠️
- **Cause (compiled CSS):** the base `:host(:state(elevated))` rule sets `--_container-elevation: 1`, and the `:host(:state(elevated):disabled)` rule overrides container/label color + opacity but **does not** reset `--_container-elevation` to `0`, so the level-1 shadow remains.
- **Effect:** a disabled elevated button casts the same shadow as its enabled state instead of flattening to elevation 0.

## Could not fully verify

- **Label typography weights:** measured weights are `700` for XS/S/M and `500` for L/XL. These are sourced directly from the `md.comp.button.<size>` token sets, so they should track the spec, but the M3 site's typography token tables are interactive and were not machine-readable in this pass — exact per-size font / weight / line-height tokens were not cross-checked value-by-value.
- **State-layer opacities** (hover/focus/pressed) were not numerically compared against spec tokens in this pass.

## Suggested follow-ups

1. Drop the elevated button to elevation 0 in the disabled state — add `--_container-elevation: 0` to the `:host(:state(elevated):disabled)` rule (i.e. in `styles/elevated/*`).