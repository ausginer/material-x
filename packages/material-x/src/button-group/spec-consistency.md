# Button groups — Material 3 Expressive spec consistency

Review of `mx-button-group` (standard) and `mx-connected-button-group` (connected)
against the Material Design 3 **Expressive** button-group spec.

- **Spec reference:** <https://m3.material.io/components/button-groups/specs>
  (read 2026-06-20)
- **Implementation under test:** Storybook at `http://localhost:6006`
  (`Button Group/Standard` and `Button Group/Connected` stories)
- **Method:** live DOM measurement of the rendered group + child buttons
  (computed `gap`, `border-radius`, custom-property values, custom-state matching)
  compared against the M3 spec tables, plus inspection of the **compiled** CSS via
  `npx just debug <file>.css.ts` and the component wiring under `button-group/`.

> Theme note: the running Storybook uses a custom **green** palette. Group
> components have no color of their own (see below), so this does not affect the
> comparison.

## Summary

Structure, variants, sizing model, connected corner morphing, and the standard
press interaction are all consistent with M3 Expressive. **One root-cause bug**
produces most of the deltas:

1. **The group host never receives its own size custom-state**, so the group's
   per-size tokens (`between-space`, `inner-corner.corner-size`) never apply.
   Every standard group renders with the *small* spacing, and connected L/XL
   render with the *small* inner-corner radius.
2. (Minor, **not a bug in this repo**) The connected **XS inner-corner** resolves
   to `8px`, where the spec's *measurement diagram* says `4dp`. This is an
   **upstream contradiction**: M3's own token table defines the value as 8dp, so
   the implementation is token-faithful.

## What matches the spec ✅

### Variants & configuration
| Aspect | Spec (M3 Expressive) | Implementation | Status |
|---|---|---|---|
| Standard button group | Available | `mx-button-group` | ✅ |
| Connected button group | Available | `mx-connected-button-group` | ✅ |
| Sizes | XS, S, M, L, XL | `size` = xsmall / small / medium / large / xlarge | ✅ |
| Shapes | Round, square | `shape` = round / square (forwarded to buttons) | ✅ |
| Selection | Single / multi-select | group `value` + `mx-switch-button` / `mx-switch-icon-button` | ✅ |
| Color | Group has no color; uses button color styles | Group is an invisible container; `color` is forwarded to child buttons via context | ✅ |

### Connected group — padding & corner morphing (measured)
- **Between-space (gap):** `2px` at every size ✅ (spec: 2dp at every size).
- **Outer corners full, inner corners square:** child buttons render asymmetric
  radii — e.g. first button `20px 8px 8px 20px`, last `8px 20px 20px 8px` (S) —
  matching the "outer fully round, inner square" model ✅.
- **Selection/press morph:** `::slotted(:active)` and `::slotted([checked])` reset
  the pressed/selected button's inner corners to the full container shape, and the
  morph does **not** affect adjacent buttons ✅ (matches "connected groups only
  affect the shape of the button being selected/activated").

### Standard group — press interaction (verified in source)
Spec: "pressing a button changes its width, shape, and padding, which adjusts the
width of buttons directly next to it." Implementation matches:
- On `pointerdown`, `button-group.ts` sets `--_interaction-direction-leading/`
  `trailing = -1` on the **neighbours** (shrinking their padding), while the
  pressed button's own `::slotted(:active)` rule sets `+1` (growing its padding),
  scaled by `--_interaction-width-multiplier` (`0.15` = the spec's 15%). ✅
- The pressed **shape** morph is handled by the button itself (`:active` corner
  morph, verified in the button review). ✅

### Standard between-space — token values (compiled CSS)
The compiled `:host(:state(<size>))` rules carry the correct spec values
(XS 18 · S 12 · M/L/XL 8). They are simply never activated at runtime — see delta 1.

## Deltas / gaps ⚠️

### 1. Group host never gets its own size custom-state (root cause)
- **Symptom (measured):**
  - **Standard `between-space`** is `12px` for **all five sizes**
    (XS, S, M, L, XL). Spec: XS **18** · S **12** · M **8** · L **8** · XL **8** dp.
    Only `small` happens to be correct because 12px is the default.
  - **Connected `inner-corner.corner-size`** is `8px` for **all five sizes**.
    Spec (round): XS 4 · S 8 · M 8 · L **16** · XL **20** dp — so **L and XL are
    wrong** (stuck at 8px), while S/M match the default by coincidence.
- **Confirmation:** `group.matches(':state(xlarge)')` returns **`false`** for a
  `size="xlarge"` group; `getPropertyValue('--_inner-corner-corner-size')` reads
  `8px` (the base `:host` default) instead of `20px`.
- **Cause:** `button-group-context.ts` → `useButtonGroupProvider` only forwards
  attribute changes to child buttons (`emitter.emit(...)`); it never calls
  `switchState` on the group host. `useButtonGroupCore`
  (`ButtonGroupCore.ts`) likewise does not wire `size`/`shape` to a custom state
  on the group (unlike `useButtonCore`, which does). As a result every
  `:host(:state(xsmall|medium|large|xlarge))` rule in
  `styles/standard/*` and `styles/connected/*` is dead.
- **Why sizes still look different:** the size is delivered to the **child
  buttons** through the context provider, so button heights/shapes change; only
  the **group-level** spacing/corners are stuck.

### 2. Connected XS inner-corner value — upstream contradiction (not a repo bug)
- The compiled `:host(:state(xsmall))` for the connected group sets
  `--_inner-corner-corner-size: 8px`, but the spec's "Measurements → Connected
  button group" *diagram* lists **XS: 4dp**.
- **Verified against the token DB** (`use-tokens-db`):
  `md.comp.button-group.connected.xsmall.inner-corner.corner-size` resolves to
  **8 DIPS**, aliased to `md.sys.shape.corner-value.small`. The implementation
  faithfully follows the upstream token table; the **4dp** figure only appears in
  the spec's measurement diagram.
- Full upstream chain (token table): XS 8 (`corner-value.small`) · S 8 · M 8 ·
  L 16 (`corner-value.large`) · XL 20 (`corner-value.large-increased`). S/M/L/XL
  agree with both the diagram and the token table; only XS disagrees, and the
  disagreement is between two M3 sources, not a coding error here.
- Independent of delta 1 (even with the size-state applied, XS renders `8px` by
  the token).

## Could not fully verify

- Exact per-size **container heights** of the group are driven entirely by the
  child buttons (the group is an invisible container), so they were not measured
  separately — they inherit the button heights already validated in the button
  review.
- The spec's interactive **token tables** (for the connected XS corner value)
  were not machine-readable in this pass; delta 2 is based on the spec's
  measurement diagram text.

## Suggested follow-ups

1. **Apply the group's own size (and shape) as a custom-state on the host** so the
   per-size `between-space` and `inner-corner.corner-size` rules activate. This is
   the single fix that resolves delta 1 for both standard and connected groups —
   e.g. add a `switchState` call for `size`/`shape` in `useButtonGroupCore` (or in
   `useButtonGroupProvider`) alongside the existing context forwarding.
2. No action needed for the connected **XS inner-corner** in this repo — the value
   tracks the upstream token (8dp). If pixel-matching the spec diagram's 4dp is
   desired, it would be an intentional override of the M3 token, and ideally
   reported upstream as a token-vs-diagram inconsistency.
