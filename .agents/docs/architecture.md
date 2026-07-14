# Architecture

## Overview

This repository is the `@ydinjs` Web Components system. Its packages are designed together: `@ydinjs/core` supplies the runtime primitives, `@ydinjs/tproc` resolves and emits Material Design tokens, and `@ydinjs/material-x` composes both into Material Design 3 Expressive components.

The workspace also contains build-time packages: the public `@ydinjs/vite-traits-plugin` flattens safe trait compositions, and the private `@ydinjs/vite-custom-element-assets` package transforms component CSS and HTML assets.

## Project layout

```
/
├── packages/
│   ├── core/                         # @ydinjs/core runtime primitives
│   │   └── src/
│   │       ├── element.ts            # ControlledElement, define(), use()
│   │       ├── attribute.ts          # Bool, Num, Str converters
│   │       ├── controllers/          # lifecycle and platform behavior
│   │       ├── traits/               # trait(), impl(), shared traits
│   │       └── utils/
│   ├── tproc/                        # @ydinjs/tproc token processor
│   │   ├── src/                      # token pipeline and DB source
│   │   └── .data/tokens/             # cached upstream M3 tables
│   ├── material-x/                   # @ydinjs/material-x components
│   │   ├── src/                      # component source and styles
│   │   └── test/                     # browser, spec, visual, and Node tests
│   ├── vite-traits-plugin/           # @ydinjs/vite-traits-plugin
│   └── vite-custom-element-assets/   # private Vite asset transforms
├── .scripts/                         # shared build and development tooling
├── nx.json                           # workspace task orchestration
└── package.json                      # npm workspaces
```

## Core runtime: `@ydinjs/core`

### Base element

`ControlledElement` from `@ydinjs/core/element.js` extends `HTMLElement` and provides the small component lifecycle:

- `use(host, controller)` registers lifecycle controllers.
- `internals(host)` exposes `ElementInternals` for ARIA and custom states.
- `define(name, class)` centralizes `customElements.define`.

### Traits and attributes

`@ydinjs/core/traits/attributes.js` provides trait composition instead of deep runtime inheritance:

- `trait(descriptor)` creates a trait with attribute converters and accessors.
- `impl(BaseClass, [Trait1, Trait2])` composes traits and derives `observedAttributes` and typed properties.
- Shared traits include `Disableable`, `Valuable`, `Checkable`, `Linkable`, `Nameable`, `Reorderable`, `Selectable`, and `Typeable`.

`@ydinjs/core/attribute.js` supplies converters that bind HTML attributes to properties: `Bool`, `Num`, and `Str`.

### Controllers

Controllers from `@ydinjs/core/controllers/*.js` attach behavior without subclassing. Key controllers cover shadow DOM, attributes, ARIA, context, events, connection lifecycle, keyboard input, mutation and resize observers, roving tabindex, slots, and CSS property propagation.

## Tokens: `@ydinjs/tproc`

`@ydinjs/tproc` owns the Material token pipeline and its upstream M3 database. Components consume it through package imports such as `@ydinjs/tproc/index.js` and `@ydinjs/tproc/selector.js`.

The pipeline loads and caches upstream token tables, resolves aliases for the active theme and tags, constructs token packages, applies explicit state inheritance and adjustments, and emits CSS custom-property declarations. `TokenPackageProcessor` is the main DSL for grouping, extending, filtering, and packing component token sets.

The source DB is `packages/tproc/src/DB/`; its cache is `packages/tproc/.data/tokens/`. Use the `use-tokens-db` skill for cache or raw-token work.

## Components: `@ydinjs/material-x`

Each component combines the core runtime and token processor:

1. Define a `*Core` with `@ydinjs/core` traits.
2. Define the public custom-element class that extends the core.
3. Wire its template, shadow DOM, ARIA, and component behavior with `useCore()` or a component-specific helper.
4. Import `@ydinjs/tproc` token packages from the component's styles.
5. Register the element with `define('mx-*', Class)`.

The component package contains buttons, button groups, checkboxes, FABs, icons, lists, radios, and text fields. Its public runtime entrypoints are declared in `packages/material-x/files.json`; add or remove entries with components.

`packages/material-x/test` mirrors the production tree. It owns browser behavior tests, tproc-backed visual-contract tests, visual-regression tests, and Material-X-specific Node tests. The core and tproc packages own their own test trees.

## Build and tooling

- **npm workspaces and NX** coordinate all `@ydinjs` packages.
- **tsdown** builds package entrypoints from each package's `files.json` into the package root, including declarations.
- **Vite** runs development and browser-test transforms.
- **`@ydinjs/vite-traits-plugin`** lowers safe `@ydinjs/core` trait compositions before the remaining transforms.
- **`@ydinjs/vite-custom-element-assets`** compiles component CSS and HTML assets.

When a `@ydinjs/core` change affects Material X, rebuild core before typechecking Material X because the latter resolves built core declarations. Run package recipes from the affected package directory; `packages/core`, `packages/tproc`, and `packages/material-x` each provide `build`, `fmt`, `lint-fix`, and `typecheck` recipes.

## Extension points

- **Core capability:** add an `@ydinjs/core` controller or trait and export it through that package's `files.json`.
- **Token capability:** add or adjust an `@ydinjs/tproc` token-processing primitive or upstream table source.
- **Material component:** create a `packages/material-x/src/<component>/` implementation, consume core and tproc through their `@ydinjs/*` imports, add public entrypoints to `packages/material-x/files.json`, and add mirrored tests under `packages/material-x/test/<component>/`.
- **Build optimization:** add trait-lowering support in `@ydinjs/vite-traits-plugin`, keeping unsupported compositions safe at runtime.
