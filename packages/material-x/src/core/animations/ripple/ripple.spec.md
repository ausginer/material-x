# Material Design 3 Expressive Ripple Specification

This document defines the technical specifications for the "Expressive" Ripple implementation in Material Design 3. This spec moves away from fixed durations toward a physics-aligned "Effects" model.

## 1. Interaction States & Motion Tokens

The ripple is a **State Layer** interaction. In the Expressive system, it uses the **Fast Effects** motion tokens to ensure snappiness without overshoot.

| Parameter               | Token                                        | Value                                   |
| :---------------------- | :------------------------------------------- | :-------------------------------------- |
| **Fill Easing (Curve)** | `md.sys.motion.easing.emphasized.decelerate` | `cubic-bezier(0.31, 0.94, 0.34, 1.0)`   |
| **Fill Duration**       | `md.sys.motion.duration.short3`              | `150ms`                                 |
| **Exit Duration**       | `md.sys.motion.duration.short3`              | `150ms`                                 |
| **Damping Ratio**       | N/A                                          | `1.0` (Critical Damping - No overshoot) |

## 2. Visual Properties

The ripple consists of two layers: a **Background State Layer** (static) and the **Ripple Expansion** (dynamic).

| Property                 | Value                              | Notes                                                     |
| :----------------------- | :--------------------------------- | :-------------------------------------------------------- |
| **Pressed Opacity**      | `0.12` (12%)                       | Applied to the expanding ripple circle.                   |
| **Hover Opacity**        | `0.08` (8%)                        | Applied to the static state layer.                        |
| **Focus Opacity**        | `0.12` (12%)                       | Applied to the static state layer.                        |
| **Color**                | `inherit` / `var(--_ripple-color)` | Usually maps to the `on-<container>` color.               |
| **Initial Scale**        | `0.1` - `0.2`                      | The starting scale at the pointer coordinate.             |
| **Target Scale**         | Calculated                         | Distance from center to furthest corner + `10px` padding. |
| **Enter Circle Opacity** | Immediate                          | The expanding circle should appear at pressed opacity.    |

## 3. Behavioral Logic

### A. Origin and Translation

1.  **Start Point:** The animation origin MUST be the `(x, y)` coordinates of the `pointerdown` event, normalized to the component's bounding box.
2.  **End Point:** The ripple should transition from the touch point toward the **center** of the component during its expansion.

### A1. Token-Driven Motion Decomposition

For token-driven web component implementations, the enter motion MAY be
decomposed into two coordinated sub-motions:

1.  **Fill/Grow:** Uses the **Fast Effects** token family for the visible size increase.
2.  **Drift/Migration:** May use a **Spatial** token family for the translation toward center.

This is considered spec-compatible as long as the implementation preserves the
same visual intent:

- the circle appears immediately at pressed opacity;
- the fill remains the fast, legible part of the interaction;
- the migration does not introduce bounce or visual overshoot that changes the
  interaction into a spatial flourish.

### B. Timing Phases

1.  **Touch Delay:** For touch devices, wait **150ms** before showing the ripple to prevent firing during scrolls.
2.  **Minimum Press Duration:** To ensure visual clarity for quick taps, the ripple expansion and peak opacity must be visible for at least **225ms** before the exit phase begins.
3.  **Interruptibility:** If a `pointerup` occurs before the expansion is complete, the ripple must continue its expansion while simultaneously starting its **150ms fade-out**.
4.  **No Enter Fade-In:** Do not fade the expanding circle in from `0` opacity. The circle should begin at the pressed-state opacity and only fade during exit.

## 4. CSS implementation Reference

For web component implementations, the following variables are considered spec-compliant for MD3 Expressive:

- **Fill Easing:** `cubic-bezier(0.31, 0.94, 0.34, 1)`
- **Fill Duration:** `150ms`
- **Optional Drift Easing:** token-driven spatial motion for translation only
- **Exit Duration:** `150ms`
- **Pressed Opacity:** `0.12`
- **Visual Style:** Solid color circle (no radial-gradient edge)
- **Enter Opacity:** Immediate, no fade-in on the expanding circle

## 5. Summary for AI Assistants

- **CRITICAL:** Do not use a Spatial/Overshoot curve for the fill/grow phase.
- **ACTUAL SPEC:** Use `cubic-bezier(0.31, 0.94, 0.34, 1)` (Fast Effects) for visible growth.
- **DRIFT:** A separate token-driven spatial curve is acceptable for translation toward center.
- **TIMING:** Target fill duration is `150ms`; exit fade remains `150ms`.
- **OPACITY:** Fixed at `0.12` for the pressed ripple state, with no enter fade-in on the expanding circle.