# Trait flattener plugin

## Purpose

`@ydinjs/core` traits are constructor transformers. `impl(Base, [First, Second])` currently creates `Second(First(Base))`, after which a component normally adds one more subclass. The flattener removes those runtime subclass layers when it can prove the transformation safe and emits one class that directly extends `Base`.

The plugin is an optimization. The source trait model remains the type-level and development authoring API. A composition the plugin cannot prove safe is left unchanged and produces a build warning.

The transform affects JavaScript emission only. Declaration generation uses the original typed source and remains independent of flattening.

## Compatibility contract

The plugin flattens two kinds of trait:

- **descriptor traits,** created by `trait(attrs, brand)` from `@ydinjs/core/traits/attributes.js`;
- **method traits,** a closed subset of the class-based traits that the generic `trait(transformer, brand)` from `@ydinjs/core/traits/primitives.js` creates. A method trait's class has only methods and accessors and uses no `super` (§Eligibility).

**Any other class-based trait isn't flattened.** A composition that contains one is retained at runtime with a warning (`repo:RF-44`). The plugin doesn't lower constructors, fields, static members or `super`. A trait that needs them stays a runtime layer.

For a flattened composition, the output preserves:

- trait declaration order and prototype-layer precedence;
- each descriptor accessor's semantics: a configurable, non-enumerable getter and setter that read and write the attribute through the trait's converter;
- each method trait member's behavior. The member is the origin's own source, and every name it reads resolves to the same binding as in the origin. A module binding is the origin's live binding, not a copy;
- the component class's own members, including an override of a trait's accessor or method;
- the non-enumerable, non-writable, non-configurable prototype brand that `trait` installs, and therefore the existing `instanceof Trait` contract;
- `observedAttributes`: when the composition has a descriptor trait, merged with the base's list and deduplicated in trait order; otherwise inherited from the base, as at runtime; and
- watch dependencies.

Trait-factory creation timing is not part of this contract.

Flattening removes runtime subclass layers. The flattened class imports only the bindings it needs: the brands, the converters, and the bindings that method trait members read. So the trait objects and their factory modules stay tree-shakeable.

## Eligibility

The plugin recognizes `impl` and both `trait` factories by the specifier they are imported from, without resolving it:

- `impl` is recognized when it is imported from `@ydinjs/core/traits/attributes.js` or `@ydinjs/core/traits/primitives.js`;
- the descriptor `trait` is recognized when it is imported from a module named `attributes`, through a package or a relative specifier. That covers a built `@ydinjs/core` trait module, which imports `./attributes.js`. It also covers a module of the same name in another package;
- the generic `trait` is recognized the same way, from a module named `primitives`.

An `impl` site is eligible only when it initializes a top-level composition constructor that is used solely as the superclass of one local class. Exported, instantiated, reassigned, escaping, or multiply consumed intermediaries are retained.

Trait lists may be inline readonly arrays or statically resolvable readonly tuples. Local/imported tuple references and tuple spreads are expanded in source order. Mutable or computed arrays, non-identifier elements, holes, and cyclic references are unsupported.

A supported trait is a module-scoped declaration initialized directly by a recognized `trait(...)` call. Its brand is a named symbol binding, not an inline `Symbol()`.

**A descriptor trait's** attributes are an object literal with static keys, inline or in a module-scoped const, and an inline literal's converters are identifiers.

**A method trait's transformer** is a synchronous arrow function or function expression with one identifier parameter, which may be typed. Its body is a class expression that extends that parameter, or a block whose only statement returns one. The class has no decorator.

**A method trait's members** are non-static methods, getters and setters with static identifier or string-literal keys. Members that emit no JavaScript, such as an index signature or an overload signature, are skipped. The trait is unsupported when its class declares a constructor, a field, a static member or block, a private name, a decorator, a computed key or an `accessor` member.

**A member's body** must keep its meaning when it is copied into another module:

- **Its names are found by a conservative walker** (`src/free-references.ts`). The walker models an allowlist of node types and rejects any other, so a construct it doesn't account for retains the trait instead of being copied with a guessed meaning. `var`, function and class declarations are outside the allowlist, because they hoist past the blocks the walker scopes. `super`, direct `eval` and `import.meta` are outside it too, because they mean something else in the consumer.
- **It doesn't read a name that the transformer binds:** its parameter, its own name, or the class's name.
- **Every other name it reads is either a module binding of the origin or a global.**
  - A module binding is linked the way a descriptor converter is (below).
  - A member that assigns a module binding is unsupported unless the trait is in the consumer module, because an imported binding can't be assigned.
  - A global keeps its name.
- **The consumer must resolve those names the same way.** The site is retained when a member reads a global or a consumer-local binding, and the consumer class isn't module-scoped, the consumer module binds that global's name at top level, or the class's own name is one the member reads.
- **The source language must match.** A member is copied as the origin's source text, so a TypeScript trait (`.ts`, `.tsx`, `.mts`, `.cts`) isn't copied into a JavaScript consumer, and the site is retained.

**Lowered members may reference imports and module-scoped bindings:**

- a value that the origin imports through a package specifier is re-imported from the same specifier;
- a value that it imports through a relative specifier is re-imported through the package name and subpath that the nearest `package.json` gives. When no package is found, the trait is unsupported;
- existing exports are reused;
- private module-scoped bindings receive collision-free, build-only synthetic exports, so the flattened consumer can import the original live binding without copying its dependency graph. These synthetic exports are not emitted in declarations and are not part of the package's supported public API.

**Each layer must keep its meaning once the layers are joined.** The flattened class holds every trait's members, in trait order, before the class's own, and its `super` is the base. A repeated key takes the later layer's definition, as the prototype chain does. A composition is retained when:

- a later trait declares only a getter or only a setter for a key that an earlier trait supplies as an accessor, because the flattened class would join it with the earlier trait's other half;
- the class does the same for a key that a trait supplies;
- the class reads or writes `super.key` for a key that a trait supplies, `super.observedAttributes` included, because the flattened `super` is the base; or
- the class uses a computed `super[key]`, whose key the plugin can't check.

## Trait IR

Analysis is split into two logical passes:

1. trait normalization resolves descriptor traits and method traits into a common Trait IR; and
2. composition lowering consumes only Trait IR and does not depend on the original trait authoring form.

Trait IR is versioned (`TRAIT_IR_VERSION`, 2), JSON-serializable, and linkable across modules. Semantic structure remains explicit: brands, observed attributes, accessors and their converters, and method trait members are separate IR nodes.

A method trait member's node holds:

- its key and kind (`method`, `get` or `set`);
- its origin source text;
- the origin bindings it reads, each with its link and the offsets where the source reads it;
- the globals it reads.

The source text is opaque only inside a member's body. Every name in it that crosses a module boundary is a node of its own.

A binding reference identifies the origin module and exported name. Imported or already exported values are linked directly. A private module-scoped binding is linked through a synthetic build-only export added to its origin module. The IR never recursively copies the binding's dependency chain.

The brand is linked as its original symbol binding rather than by retaining the trait object solely to read `Trait.brand`. Generated code therefore preserves brand identity while allowing unused runtime trait factories to be removed.

## Lowering

Analysis and emission are transactional per `impl` site. The plugin resolves the base, tuple, every trait, and every linked binding before changing source. A failed proof emits a single diagnostic at the composition and makes no edits for that site. Other eligible sites in the same module are still flattened.

The component class is rewritten to extend the original base, and the `impl(...)` declaration is removed. At the start of the class body, before the class's own members, the plugin inserts:

- when the composition has a descriptor trait, a static `observedAttributes` field that merges the base's list with every descriptor trait's attributes, deduplicated in trait order;
- each trait's members, in trait order:
  - for a descriptor trait, one class getter and setter per attribute, which call the attribute operator of `@ydinjs/core/attribute.js` with the linked converter;
  - for a method trait, each member's source, in which every linked name is replaced by the name the consumer imports it as. A shorthand property, `{ name }`, becomes `name: <link>`;
- one `static {}` block that installs every trait brand through a single `Object.defineProperties(this.prototype, …)`, with `{ value: true }` for each linked brand symbol.

The class's own members follow and override what was inserted, as a subclass's members override its superclass's. The eligibility rules above retain each case where the two differ.

The plugin marks every top-level `trait(...)` call of either factory `/*@__PURE__*/`, so a downstream bundler can remove a trait object and its trait-list arrays once nothing references them.

## Plugin architecture

`@ydinjs/vite-traits-plugin` is a public package. Its one export, `viteTraitsPlugin()`, returns a Vite and Rolldown plugin configured with `enforce: 'pre'`. Its source is a normalization, analysis and lowering core, the free-identifier walker, and that adapter. The repository's shared tsdown, Vite and Vitest configurations install it.

The adapter uses the host resolver, and Node's resolution for an external `@ydinjs/*` package. It registers every analyzed definition with `addWatchFile`, caches parsed modules by id and source, applies synthetic exports and imports, and emits sourcemapped edits.

Diagnostics contain the source location, composition name, and stable reason code. Unsupported sites warn and retain runtime composition. Internal invariant failures are build errors.

| Reason code | The site is retained because |
| --- | --- |
| `impl-escapes` | the `impl` intermediary is exported, instantiated, or otherwise escapes |
| `impl-multiple-consumers` | more than one class consumes the intermediary |
| `unsupported-trait-list` | the trait list isn't a statically resolvable readonly array or tuple, or it refers to itself |
| `unsupported-trait` | a trait isn't a supported descriptor or method trait |
| `unsupported-trait-definition` | a trait isn't module-scoped or a direct `trait(...)` call; or its brand, transformer or class is outside the subset; or a binding it needs can't be reached from the consumer |
| `unsupported-trait-member` | a method trait's member is outside the subset; or its body uses a construct the walker doesn't model, `super`, direct `eval`, a name the transformer binds, or an assignment to an imported binding |
| `trait-accessor-half` | a later trait declares one half of an accessor that an earlier trait supplies |
| `trait-binding-shadowed` | the consumer would resolve a name that a member reads to another binding |
| `trait-source-language` | a TypeScript method trait would be copied into a JavaScript consumer |
| `class-accessor-half` | the class declares one half of an accessor that a trait supplies |
| `class-super-trait-member` | the class reads or writes `super.key` for a key that a trait supplies |
| `class-computed-super` | the class uses a computed `super[key]` |

## Verification

Node fixtures cover import aliases, tuple/spread expansion, eligibility, warnings, unchanged bailout output, and a module with two `impl` sites of which one bails.

Linking fixtures cover existing exports, imported values, private module-scoped synthetic exports, and the synthetic export names.

Runtime equivalence fixtures compare composed and flattened classes for:

- converter accessors and `observedAttributes` merging;
- the component's own fields, accessor overrides and method overrides;
- brands and `instanceof`;
- a method trait's member, alone and overridden by the class;
- a private binding's identity across a function of the origin module and the flattened member;
- a subclass whose own method calls `super` and reaches the flattened member;
- a method trait in the consumer module, in another module, and in another package's built JavaScript.

Negative fixtures cover every bailout above, among them a class-based trait outside the subset, an inline brand, a cyclic trait list, an accessor half whose other half a trait supplies, `super.key` for a trait's key, and a computed `super[key]`. They also cover each case the walker or the scope check retains.

A change to the plugin is also checked by building `@ydinjs/material-x` with it: the build prints no flattener warning.

## Change record

| Date | Sections | Change |
| --- | --- | --- |
| 2026-11-18 | All but Purpose | **Narrowed to what the plugin implements** (`repo:RF-44`). The document described a generic class-transformer subset — fields, constructors, methods, accessors and safe static members, lowered through helpers and constructor and static stages — that no code flattened. It also placed the plugin in `.scripts/flattener` as a private `constructTraitFlattenerPlugin()`, said that it resolved imports to recognize them, and named an IR debug mode. **Kept, and met by the code at `49e26415d`** under the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 1: per-site transactions, a parse cache keyed by source, a diagnostic for a cyclic list, and the accessor and `super` eligibility rules. The pre-rename module names are no longer recognized |
| 2026-11-18 | All but Purpose | **Widened to method traits** (`repo:RF-44`), on the owner's answer C, as the code at `242feffcb` implements them (the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 2). **Added:** method traits in §Compatibility contract; their recognition, definition, member, scope and linking rules in §Eligibility; the layer rule for a trait's accessor half; the member node and `TRAIT_IR_VERSION` 2 in §Trait IR; member insertion in §Lowering; and the table of reason codes. **Changed:** `observedAttributes` is emitted only when the composition has a descriptor trait, and is otherwise inherited from the base. Before, the document said the field was always inserted, and that the plugin doesn't flatten a class-based trait |