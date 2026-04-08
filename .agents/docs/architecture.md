# Architecture

## Overview

Material X is a custom Material Design 3 (Expressive) implementation built as framework-agnostic Web Components. The project is an **npm monorepo** with two packages:

- `packages/ydin` — framework-agnostic Web Components foundation (public, `ydin`)
- `packages/material-x` — MD3 component implementations (public, `@ausginer/material-x`)

The codebase focuses on a token-driven styling pipeline, a trait composition system, and a small reactive core that wires lifecycle, attributes, ARIA, and inter-component coordination.

## Project Layout

```
/
├── packages/
│   ├── ydin/                  # Core framework
│   │   └── src/
│   │       ├── element.ts     # ControlledElement + define() + use()
│   │       ├── attribute.ts   # Bool, Num, Str converters
│   │       ├── emitter.ts
│   │       ├── controllers/   # useARIA, useAttributes, useConnected,
│   │       │                  # useContext, useEvents, useKeyboard,
│   │       │                  # useMutationObserver, useResizeObserver,
│   │       │                  # useRovingTabindex, useShadowDOM, useSlot
│   │       ├── traits/        # trait(), impl(), Checkable, Disableable, Valuable
│   │       └── utils/         # DOM ($, notify), readCSSVariables, runtime
│   └── material-x/
│       └── src/
│           ├── button/        # Button variants
│           ├── button-group/
│           ├── fab/
│           ├── icon/
│           ├── text-field/
│           ├── core/          # Shared styles, animations, useCore util
│           └── .tproc/        # Token processing pipeline
├── .scripts/                  # Build plugins (vite, tsdown)
├── tsconfig.base.json         # Path aliases: ydin/*.js → packages/ydin/src/*.ts
└── nx.json                    # NX task orchestration
```

## Runtime Architecture (ydin)

### Base Element

`ControlledElement` (`ydin/element.js`) extends `HTMLElement` and wires a small controller lifecycle:

- `use(host, controller)` — registers controllers that receive lifecycle hooks
- `getInternals(host)` — exposes `ElementInternals` for ARIA and state
- `define(name, class)` — centralised `customElements.define` wrapper

### Trait System

`ydin/traits/traits.js` provides a composition system that replaces direct subclassing:

- `trait(descriptor)` — creates a trait with attribute converters and accessor generation
- `impl(BaseClass, [Trait1, Trait2, ...])` — composes traits into a class, auto-generates `observedAttributes` and typed property accessors
- Pre-built traits: `Disableable`, `Valuable`, `Checkable`

Example:

```ts
const ButtonCore = impl(ControlledElement, [ButtonLike, Disableable]);
```

### Attribute System

`ydin/attribute.js` provides converters for binding HTML attributes to JS properties:

- `Bool` — attribute presence → boolean
- `Num` — string → number (nullable)
- `Str` — string identity (nullable)

### Controllers

`ydin/controllers/*.js` — attach behavior without subclassing. Registered via `use(host, controller)`:

- `useShadowDOM` — creates shadow root, adopts stylesheets
- `useAttributes` / `transfer` — mirrors host attributes to internal elements
- `useARIA` — syncs `aria-*` host attributes to `ElementInternals`
- `useContext` / `useProvider` — lightweight cross-component context
- `useEvents` — event listener registration
- `useConnected` — connected/disconnected lifecycle
- `useMutationObserver` — DOM mutation tracking
- `useResizeObserver` — element resize tracking
- `useKeyboard` — keyboard event handling
- `useRovingTabindex` — focus management for keyboard navigation within groups
- `useSlot` — slot content change reactions

## Component Architecture (material-x)

Each component follows this pattern:

1. Define a `*Core` base class via `impl(ControlledElement, [Trait1, ...])`
2. Define a component class extending that core
3. Call `useCore()` or a component-specific `use*Core()` in the constructor
4. Register with `define('mx-*', Class)`

`useCore` (`src/core/utils/useCore.ts`) sets up shadow DOM and ARIA internals.

Common patterns:

- Components declare `Properties`, `Events`, and `CSSProperties` types for consumers and React typings
- `formAssociated = true` for form-like elements (buttons, switches, text fields)
- Global tag name maps declared per component file for TS ergonomics

### Buttons

- `ButtonCore = impl(ControlledElement, [ButtonLike, Disableable])` — shared base
- `useButtonCore()` wires template, styles, `useAttributes`, `useARIA`, `useRipple`, and `useContext`
- Variants share the core while switching token sets and optional behaviors: `button`, `icon-button`, `link-button`, `switch-button`, `switch-icon-button`, `split-button`

### Button Groups

Context-based provider (`BUTTON_GROUP_CTX`) propagates `color`, `size`, `shape`, and `disabled` to child buttons. `mx-connected-button-group` adds roving tabindex for segmented control keyboard navigation.

### Text Field

Uses `ElementInternals` validity API; manages focus/label state via `internals.states`. Single-line (`<input>`) and multiline (`<textarea>`) variants share a `TextFieldCore`.

## Styling and Tokens

### Token Pipeline

Located in `src/.tproc/`. Stages:

1. **Load** token sets from MD3 source, cache under `.data/tokens/`
2. **Group** tokens by state path via an explicit `group()` function (no implicit heuristics)
3. **Append** extra tokens before resolution
4. **Resolve** token references (`resolveSet`)
5. **Extend + dedup** — explicit inheritance via `TokenPackageProcessor` DSL; duplicates removed by value comparison
6. **Filter** with `allowTokens`
7. **Map + pack** — emit CSS custom properties (`createVariables` + `pack`)

### TokenPackageProcessor API

```ts
const pkg = t
  .set('md.comp.button')
  .scope('color', 'elevated')   // attribute scope for selectors
  .group(fn)                    // maps token name → { path, tokenName }
  .extend((x) => {
    x.state('default').extends();
    x.state('hovered').extends(x.state('default'));
  })
  .append({ default: { 'state-layer.opacity': '...' } })
  .allowTokens(['container.shape', ...])
  .build();                     // → TokenPackage
```

`TokenPackage.state(path)` returns the deduped token map for a state and can be passed into `extends()` to share tokens across packages.

### CSS Variable Conventions

- `--_*` — internal variables (mangled in production)
- `--md-*` — public overrides, exposed via `CSSProperties` types (e.g. `--md-button-container-color`)

### CSS Authoring

- `.css.ts` — TypeScript modules that export a `CSSStyleSheet` after Vite processing; state selectors generated with `state.hovered()`, `state.focused()` helpers
- `*.styles.css` — raw CSS consumed by `.css.ts`
- `*.ctr.css` — control CSS compiled directly

To preview compiled CSS output: `npm run debug -- <relative .css.ts path>`

## Build and Tooling

- **tsdown** — builds each package from entry points declared in `files.json`; output goes to package root (not `/dist`)
- **NX** — orchestrates cross-package builds; `build` target depends on `^build` (ydin must build before material-x)
- **Vite** — dev server and story tooling; plugins: `constructCSSStyles`, `constructHTMLTemplate`, `constructCSSTokens`, `constructCustomElementsHMR`
- **`tsconfig.base.json` path aliases** — resolve `ydin/*.js` imports to source TypeScript during development
- **Production CSS mangling** — private custom property names mangled via `css-private-props.json`
- **Ladle** — component stories (`*.stories.tsx`)

**Workflow commands:**

| Command                       | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| `npm run build`               | Build all packages (NX)                   |
| `npm run typecheck`           | Type-check all packages                   |
| `npm run fmt -- <files>`      | Format changed source files               |
| `npm run lint:fix -- <files>` | Lint and autofix changed files            |
| `npm run test`                | Run tests for all packages                |
| `npm run debug -- <path>`     | Preview compiled CSS for a `.css.ts` file |

## Code Style and Conventions

- TypeScript ESM, strict mode, isolated declarations
- `Properties`, `Events`, `CSSProperties`, and `useX` naming conventions
- `define()` centralises `customElements.define`
- Minimal comments — only for TODOs or non-obvious behavior

## Extension Points

- **New component** in `material-x`: new folder under `src/`, define trait-composed core, template, token-backed styles, wire with `useCore`
- **New controller** in `ydin`: implement `ElementController`, export from `ydin/controllers/`
- **New trait** in ydin: use `trait()` factory, compose with `impl()`
- **New token set**: `styles/*/tokens.ts` using `TokenPackageProcessor`, consume in `main.css.ts`
- **Design customization**: override public `--md-*` CSS variables or `:part(*)` pseudo-classes.
