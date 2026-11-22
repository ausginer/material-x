# Architecture

## Overview

This repository is the `@ydinjs` Web Components system. Its packages are designed together: `@ydinjs/core` supplies the runtime primitives, `@ydinjs/tproc` resolves and emits Material Design tokens, and `@ydinjs/material-x` composes both into Material Design 3 Expressive components.

The workspace also contains build-time packages: the public `@ydinjs/vite-traits-plugin` is the required compiler step that flattens trait compositions, and the private `@ydinjs/vite-custom-element-assets` package transforms component CSS and HTML assets.

## Project layout

```
/
├── packages/
│   ├── core/                         # @ydinjs/core runtime primitives
│   │   └── src/
│   │       ├── element.ts            # ControlledElement, use()
│   │       ├── attribute.ts          # Bool, Num, Str converters
│   │       ├── controllers/          # lifecycle and platform behavior
│   │       ├── traits/               # composition, attribute traits, shared traits
│   │       └── utils/
│   ├── tproc/                        # @ydinjs/tproc token processor
│   │   ├── src/                      # token pipeline and store reader
│   │   ├── scripts/                  # token store update script
│   │   └── tokens/                   # committed token store
│   ├── material-x/                   # @ydinjs/material-x components
│   │   ├── src/                      # component source and styles
│   │   └── tests/                    # browser, spec, visual, and Node tests
│   ├── vite-traits-plugin/           # @ydinjs/vite-traits-plugin
│   └── vite-custom-element-assets/   # private Vite asset transforms
├── .scripts/                         # shared build and development tooling
├── nx.json                           # workspace task orchestration
└── package.json                      # workspaces, installed with aube
```

## Core runtime: `@ydinjs/core`

### Base element

`ControlledElement` from `@ydinjs/core/element.js` extends `HTMLElement` and provides the small component lifecycle:

- `use(host, controller)` registers lifecycle controllers.
- `internals(host)` exposes `ElementInternals` for ARIA and custom states.

### Traits and attributes

Traits are plain classes in two layers, instead of deep runtime inheritance. [`trait-flattener-plugin.md`](trait-flattener-plugin.md) describes how the build joins them.

- **Layer (a), `@ydinjs/core/traits/composition.js`,** knows nothing of elements. A trait extends a bound, `bound()`, and is decorated `@trait`, which the build compiles. A component names its base and its traits in the annotation of a constant, `const XBase: Composed<typeof Base, [typeof A, typeof B]> = compose(Base)`, which one class extends. The build replaces the constant with the base, copies each trait's members in list order, merges statics by their declared kind and brands the class. A key two traits supply takes the later trait's member.
- **Layer (b), `@ydinjs/core/traits/attribute-traits.js`,** is optional sugar for elements: `accessor name!: T` with `@attributes({ name: Converter })` below `@trait`, lowered in the trait's own build to a getter and a setter and a static `observedAttributes`. It also exports the bounds `AnyElement` and `Controlled`, and `Props`.
- Shared traits include `Disableable`, `Valuable`, `Checkable`, `Linkable`, `Nameable`, `Selectable`, and `Typeable`.

`@ydinjs/core/attribute.js` supplies converters that bind HTML attributes to properties: `Bool`, `Num`, and `Str`.

### Controllers

Controllers from `@ydinjs/core/controllers/*.js` attach behavior without subclassing. Key controllers cover shadow DOM, attributes, ARIA, context, events, connection lifecycle, keyboard input, mutation and resize observers, roving tabindex, slots, and CSS property propagation.

## Tokens: `@ydinjs/tproc`

`@ydinjs/tproc` owns the Material token pipeline and its upstream M3 database. Components consume it through package imports such as `@ydinjs/tproc/index.js` and `@ydinjs/tproc/selector.js`.

The pipeline reads tproc's committed token store, resolves aliases for the active theme and tags, constructs token packages, applies explicit state inheritance and adjustments, and emits CSS custom-property declarations. `TokenPackageProcessor` is the main DSL for grouping, extending, filtering, and packing component token sets.

The store is `packages/tproc/tokens/`, converted from Material's design-system database by `packages/tproc/scripts/update-tokens.ts`, which is its only writer. The reader is `packages/tproc/src/store/`. Use the `use-tokens-db` skill for any store or token-source work.

## Components: `@ydinjs/material-x`

Each component combines the core runtime and token processor:

1. Define a `*Core` with `@ydinjs/core` traits.
2. Define the public custom-element class that extends the core.
3. Wire its template, shadow DOM, ARIA, and component behavior with `useCore()` or a component-specific helper.
4. Import `@ydinjs/tproc` token packages from the component's styles.
5. Register the element with `customElements.define('mx-*', Class)`.

**`.host` is the root, and it takes focus.** In every material-x component, the shadow root's root element has the class `host`. In a component that takes focus, `.host` is the element that takes it. Shared styles and helpers depend on this. The button family's focus indicator and focus layer draw on `.host:focus-visible`. `useButtonCore`, FAB, the link button and the interactive list items find their control as `.host`. Delegated and forwarded focus lands on it. If a template wraps `.host`, or puts the focusable element beside it, these break without an error. `.host` carries the part `impl`. The owner stated the invariant on 2026-11-17 and decided its exceptions on 2026-11-18 ([`repo:RF-43`](../../.plan/00-index.md)), and directed the case of a host that is its own box on 2026-11-21 ([`repo:RF-68`](../../.plan/00-index.md)). A component in an exception has no `.host` that takes focus, so the shared rules keyed on `.host` don't apply to it:

- **The focus target can't be a container.** A component whose semantics need a native element that can't hold the component's other parts — an `<input>` or a `<textarea>` — makes that element its focus target and has no `.host`. Today these are `mx-checkbox`, `mx-radio`, `mx-text-field` and `mx-multiline-text-field`. They draw their focus indicator and focus layer from the element's `:focus-visible` through later siblings. A container that can give the same semantics, such as a `<button>` with a role, takes precedence: the exception doesn't apply when a component chooses such an element.
- **Only a slot.** `mx-icon`, `mx-list`, `mx-button-group` and `mx-connected-button-group` render their children through one `<slot>`, take no focus of their own, and have no `.host`.
- **A composite.** `mx-split-button`'s `.host` is the root and doesn't take focus. Its focus stops are nested material-x components that meet the invariant.
- **The host is the box.** A component whose box would be a plain container, with no native element whose behavior it needs, has no `.host` and no part `impl`. Its host is its box, carries its layout and its styles on `:host`, and is the element that takes focus when the component does. Today this is `mx-list-item`.

A new component meets the invariant, or the record states which exception it falls under.

**Every component is controlled.** A component's state is what the consumer sets: its attributes and properties, such as `checked`, `indeterminate`, `selected`, `open` and a group's `value`. Everything derived from that state follows it, and nothing else changes it: custom states, ARIA states, the form value, and the state of any native control inside the shadow tree. User interaction fires events, such as `click`, `input` and `change`, and changes no state. The consumer answers an event by setting the state. The owner stated this principle on 2026-11-18.

**The text fields are the exception.** In `mx-text-field` and `mx-multiline-text-field`, the text is the user's input. Typing changes it, `value` reads it, and the consumer may set it. `:state(populated)` and the form value follow the text. A controlled text field would have to rewrite the field on every keystroke, and the owner decided that speed matters more than the principle here. The owner decided the exception on 2026-11-18. The components that don't meet the principle yet are [`repo:RF-50`](../../.plan/00-index.md)'s.

The component package contains buttons, button groups, checkboxes, FABs, icons, lists, radios, and text fields. Its public runtime entrypoints are declared in `packages/material-x/files.json`; add or remove entries with components.

`packages/material-x/tests` mirrors the production tree. It owns browser behavior tests, tproc-backed visual-contract tests, visual-regression tests, and Material-X-specific Node tests. The core and tproc packages own their own test trees.

## Build and tooling

- **aube and NX** coordinate all `@ydinjs` packages: aube installs the `workspaces` and runs their binaries, and NX orchestrates their tasks.
- **tsdown** builds each package's entrypoints into the package root, including declarations. Most packages list them in `files.json`. `vite-traits-plugin` and `size-limit-preset-rolldown` name their one entry in `tsdown.config.ts`, and their `files.json` feeds only the clean.
- **Vite** runs development and browser-test transforms.
- **`@ydinjs/vite-traits-plugin`** lowers layer (b) traits and flattens every `@ydinjs/core` trait composition before the remaining transforms. A build without it fails at `compose()`.
- **`@ydinjs/vite-custom-element-assets`** compiles component CSS and HTML assets.

When a `@ydinjs/core` change affects Material X, rebuild core before typechecking Material X because the latter resolves built core declarations. Run package recipes from the affected package directory; `packages/core`, `packages/tproc`, and `packages/material-x` each provide `build`, `fmt`, `lint-fix`, and `typecheck` recipes.

## Drag: the consumer commits before it answers

`@ydinjs/drag` distinguishes the **temporary presentation** it owns during an operation (the lifted visual, the placeholder) from the persistent DOM the consumer renders. There is no barrier and no readiness declaration: the verdict is the acknowledgement. A consumer commits its order inside `onReorder` or `onDrop`, and returns or resolves its verdict afterwards:

```ts
async onReorder(request) {
  await commit(request); // A framework's commit, on its own schedule.
  return ReorderResolution.accept();
}
```

The placeholder and the lift hold until the verdict settles. A landing starts after presentation is released and outlives the operation, and no terminal waits for it. `packages/drag/.plan/contract.md` DRI-9 owns the order, and `drag:DRD-1` the single-pass control behind it.

## Extension points

- **Core capability:** add an `@ydinjs/core` controller or trait and export it through that package's `files.json`.
- **Token capability:** add or adjust an `@ydinjs/tproc` token-processing primitive or upstream table source.
- **Material component:** create a `packages/material-x/src/<component>/` implementation, consume core and tproc through their `@ydinjs/*` imports, add public entrypoints to `packages/material-x/files.json`, and add mirrored tests under `packages/material-x/tests/<component>/`.
- **Trait lowering:** extend `@ydinjs/vite-traits-plugin`; a composition it can't carry is a build error.