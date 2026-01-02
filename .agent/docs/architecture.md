# Architecture

## Overview

Material X is a custom Material Design 3 (Expressive) implementation built as
framework-agnostic Web Components. The codebase focuses on a token-driven styling
pipeline and a small reactive core that wires lifecycle, attributes, ARIA, and
inter-component coordination.

## Project Layout

- `src/core/`: framework-agnostic runtime (base element, controllers, tokens,
  utilities, animations).
- `src/button/`, `src/button-group/`, `src/fab/`, `src/icon/`, `src/text-field/`:
  component implementations and their tokenized styles.
- `.scripts/`: build utilities and CSS compilation pipeline.
- `src/react.ts`: React type bindings for consuming custom elements.

## Runtime Architecture

- **Base element**: `ReactiveElement` (`src/core/elements/reactive-element.ts`)
  extends `HTMLElement` and wires a small controller lifecycle.
  - `use(host, controller)`: registers controllers that receive lifecycle hooks.
  - `getInternals(host)`: exposes `ElementInternals` for ARIA and state.
- **Controller pattern**: `useX` helpers (`src/core/controllers/`) attach
  behavior without subclassing:
  - `useShadowDOM` creates shadow root and adopts style sheets.
  - `useEvents`, `useConnected`, `useAttribute`, `useMutationObserver` glue
    lifecycle and DOM APIs.
  - `useContext`/`useProvider` implement a lightweight context system for
    cross-component coordination.
- **Attribute bindings**: `attribute.ts` plus `createAccessors` provide typed
  attribute/property converters (string, number, boolean) and auto-register
  `observedAttributes`.
- **ARIA and states**: `useARIA` maps host attributes to `ElementInternals` for
  `aria-*` values; components also set `internals.states` for styling hooks like
  `:host(:state(populated))`.

## Component Architecture

Each component is a thin class that composes core utilities:

- `useCore` (`src/core/utils/useCore.ts`) sets up shadow DOM, ARIA, and base
  styles.
- `useButtonCore` (`src/button/useButtonCore.ts`) layers in shared button
  behavior, ripple, and context handling for button groups.
- `useSwitch` (`src/button/useSwitch.ts`) adds switch-like input/change events.

Common patterns:

- Components declare `Properties`, `Events`, and `CSSProperties` types for
  consumers and React typings.
- `define('mx-*', Class)` registers custom elements.
- `formAssociated = true` is used for form-like elements (buttons, switches,
  text fields).
- Global tag name maps are declared in each component file for TS ergonomics.

Notable implementations:

- **Buttons**: multiple variants share templates and styles while switching
  token sets and optional behaviors (icon, link, switch, split).
- **Button groups**: a context-based provider (`BUTTON_GROUP_CTX`) propagates
  shared attributes and state to children, with pointer-driven sibling styling.
- **Text field**: uses a `contenteditable` div, integrates `ElementInternals`
  validity APIs, and manages focus/label state via `internals.states`.

## Styling and Tokens

### Token Sources

- `src/core/tokens/DB.ts` loads Material 3 token tables from
  `https://m3.material.io/_dsm/…` and caches them under `.data/tokens/`.
- `src/core/tokens/default-theme.json` provides the base theme and color schemes.

### Token Processing Pipeline

1. **Load** token sets from the DB (`processTokenSet`).
2. **Transform** raw token values into usable units (`processToken`).
3. **Resolve** token references to real values (`resolve`, `resolveSet`).
4. **Shape** tokens into component state trees (`shape.ts`, component `utils.ts`).
5. **Map** to CSS variables (`variable.ts`), separating public and private vars.
6. **Pack** into CSS strings (`packSet`) with inheritance to reduce duplication.

### Public vs Private CSS Variables

- Internal variables use `--_` prefixes.
- Public overrides map to component-specific `--md-*` variables, exposed via
  `CSSProperties` types (e.g. `--md-button-container-color`).

### CSS Authoring

- Styles are written in `.css.ts` modules using the `css` template function and
  formatted via `prettify` (oxfmt).
- State selectors are generated with helpers like `state.hovered()` and
  `state.focused()` to keep :host selectors consistent.
- `useRipple` adds the M3 ripple animation with configurable CSS variables.

## Build and Tooling

- Vite plugin `constructCSS` (`.scripts/vite-plugins.ts`) transforms `.css.ts`
  into `CSSStyleSheet` modules via a worker and `lightningcss`.
- The CSS pipeline can mangle private custom property names in production using
  `.scripts/css/collect-props.ts` and `css-private-props.json`.
- Ladle is used for demos/stories (`*.stories.tsx`).
- `types.d.ts` provides module typings for `*.css.ts` and `CSSStyleSheet` imports.

## Code Style and Conventions

- TypeScript ESM with top-level await where needed (token loading).
- Consistent naming: `Properties`, `Events`, `CSSProperties`, and `useX` helpers.
- `define()` wrapper centralizes `customElements.define` usage.
- Prettier/oxfmt formatting with single quotes and 80-char print width.
- Minimal comments, mostly for TODOs or non-obvious behavior.

## Extension Points

- **New component**: create a new folder under `src/`, define a template,
  token-backed styles, and compose with `useCore` or a custom `useX` helper.
- **New token set**: add a `styles/*/tokens.ts` file to process and resolve
  tokens, then consume it in a `main.css.ts` module.
- **Design customization**: override public `--md-*` CSS variables to theme
  components without altering internal token logic.
