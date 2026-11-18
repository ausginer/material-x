# Trait flattener plugin

## Purpose

`@ydinjs/core` traits are constructor transformers. `impl(Base, [First, Second])` currently creates `Second(First(Base))`, after which a component normally adds one more subclass. The flattener removes those runtime subclass layers when it can prove the transformation safe and emits one class that directly extends `Base`.

The plugin is an optimization. The source trait model remains the type-level and development authoring API. A composition the plugin cannot prove safe is left unchanged and produces a build warning.

The transform affects JavaScript emission only. Declaration generation uses the original typed source and remains independent of flattening.

## Compatibility contract

The plugin flattens descriptor traits, the ones created by `trait(attrs, brand)` from `@ydinjs/core/traits/attributes.js`. **It doesn't flatten a class-based trait,** one created by the generic `trait(transformer, brand)` from `@ydinjs/core/traits/primitives.js`. A composition that contains one is retained at runtime with a warning (`repo:RF-44`).

For a flattened composition, the output preserves:

- trait declaration order and prototype-layer precedence;
- each descriptor accessor's semantics: a configurable, non-enumerable getter and setter that read and write the attribute through the trait's converter;
- the component class's own members, including an override of a trait's accessor;
- the non-enumerable, non-writable, non-configurable prototype brand that `trait` installs, and therefore the existing `instanceof Trait` contract;
- `observedAttributes`, merged with the base's and deduplicated in trait order; and
- watch dependencies.

Trait-factory creation timing is not part of this contract.

Flattening removes runtime subclass layers. The flattened class imports only the bindings it needs, the brands and the converters, so the trait objects and their factory module stay tree-shakeable.

## Eligibility

The plugin recognizes `impl` and the descriptor `trait` by the specifier they are imported from, without resolving it:

- `impl` is recognized when it is imported from `@ydinjs/core/traits/attributes.js` or `@ydinjs/core/traits/primitives.js`;
- the descriptor `trait` is recognized when it is imported from a module named `attributes`, through a package or a relative specifier. That covers a built `@ydinjs/core` trait module, which imports `./attributes.js`. It also covers a module of the same name in another package.

An `impl` site is eligible only when it initializes a top-level composition constructor that is used solely as the superclass of one local class. Exported, instantiated, reassigned, escaping, or multiply consumed intermediaries are retained.

Trait lists may be inline readonly arrays or statically resolvable readonly tuples. Local/imported tuple references and tuple spreads are expanded in source order. Mutable or computed arrays, non-identifier elements, holes, and cyclic references are unsupported.

A supported trait is a module-scoped declaration initialized directly by a recognized descriptor `trait(...)` call. Its brand is a named symbol binding, not an inline `Symbol()`. Its attributes are an object literal with static keys, inline or in a module-scoped const, and an inline literal's converters are identifiers.

Lowered members may reference imports and module-scoped bindings. Existing exports are reused. Private module-scoped bindings receive collision-free, build-only synthetic exports so the flattened consumer can import the original live binding without copying its dependency graph. These synthetic exports are not emitted in declarations and are not part of the package's supported public API.

**The component class must keep its meaning once the trait layers are gone.** A composition is retained when its class:

- declares one half of an accessor pair for a key that a trait supplies, because the flattened class would join it with the trait's other half;
- reads or writes `super.key` for a key that a trait supplies, `super.observedAttributes` included, because the flattened `super` is the base; or
- uses a computed `super[key]`, whose key the plugin can't check.

## Trait IR

Analysis is split into two logical passes:

1. trait normalization resolves descriptor traits into a common Trait IR; and
2. composition lowering consumes only Trait IR and does not depend on the original trait authoring form.

Trait IR is versioned, JSON-serializable, and linkable across modules. Semantic structure remains explicit: brands, observed attributes, accessors and their converters are separate IR nodes rather than opaque source strings.

A binding reference identifies the origin module and exported name. Imported or already exported values are linked directly. A private module-scoped binding is linked through a synthetic build-only export added to its origin module. The IR never recursively copies the binding's dependency chain.

The brand is linked as its original symbol binding rather than by retaining the trait object solely to read `Trait.brand`. Generated code therefore preserves brand identity while allowing unused runtime trait factories to be removed.

## Lowering

Analysis and emission are transactional per `impl` site. The plugin resolves the base, tuple, every trait, and every linked binding before changing source. A failed proof emits a single diagnostic at the composition and makes no edits for that site. Other eligible sites in the same module are still flattened.

The component class is rewritten to extend the original base, and the `impl(...)` declaration is removed. At the start of the class body, before the class's own members, the plugin inserts:

- a static `observedAttributes` field that merges the base's list with every trait's attributes, deduplicated in trait order;
- one class getter and setter per trait attribute, in trait order, which call the attribute operator of `@ydinjs/core/attribute.js` with the linked converter; and
- one `static {}` block that installs every trait brand through a single `Object.defineProperties(this.prototype, …)`, with `{ value: true }` for each linked brand symbol.

The class's own members follow and override what was inserted, as a subclass's members override its superclass's. The eligibility rules above retain each case where the two differ.

The plugin marks every descriptor `trait(...)` call `/*@__PURE__*/`, so a downstream bundler can remove a trait object and its trait-list arrays once nothing references them.

## Plugin architecture

`@ydinjs/vite-traits-plugin` is a public package. Its one export, `viteTraitsPlugin()`, returns a Vite and Rolldown plugin configured with `enforce: 'pre'`. Its source is a normalization, analysis and lowering core and that adapter. The repository's shared tsdown, Vite and Vitest configurations install it.

The adapter uses the host resolver, and Node's resolution for an external `@ydinjs/*` package. It registers every analyzed definition with `addWatchFile`, caches parsed modules by id and source, applies synthetic exports and imports, and emits sourcemapped edits.

Diagnostics contain the source location, composition name, and stable reason code. Unsupported sites warn and retain runtime composition. Internal invariant failures are build errors.

## Verification

Node fixtures cover import aliases, tuple/spread expansion, eligibility, warnings, unchanged bailout output, and a module with two `impl` sites of which one bails.

Linking fixtures cover existing exports, imported values, private module-scoped synthetic exports, and the synthetic export names.

Runtime equivalence fixtures compare composed and flattened classes for converter accessors, `observedAttributes` merging, the component's own fields and accessor overrides, brands and `instanceof`.

Negative fixtures cover every bailout above, among them a class-based trait, an inline brand, a cyclic trait list, an accessor half whose other half a trait supplies, `super.key` for a trait's key, and a computed `super[key]`.

A change to the plugin is also checked by building `@ydinjs/material-x` with it: the build prints no flattener warning.

## Change record

| Date | Sections | Change |
| --- | --- | --- |
| 2026-11-18 | All but Purpose | **Narrowed to what the plugin implements** (`repo:RF-44`). The document described a generic class-transformer subset — fields, constructors, methods, accessors and safe static members, lowered through helpers and constructor and static stages — that no code flattened. It also placed the plugin in `.scripts/flattener` as a private `constructTraitFlattenerPlugin()`, said that it resolved imports to recognize them, and named an IR debug mode. **Kept, and met by the code at `49e26415d`** under the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 1: per-site transactions, a parse cache keyed by source, a diagnostic for a cyclic list, and the accessor and `super` eligibility rules. The pre-rename module names are no longer recognized |