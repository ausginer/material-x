# Trait flattener plugin

## Purpose

Ydin traits are constructor transformers. `impl(Base, [First, Second])` currently creates `Second(First(Base))`, after which a component normally adds one more subclass. The flattener removes those runtime subclass layers when it can prove the transformation safe and emits one class that directly extends `Base`.

The plugin is an optimization. The source trait model remains the type-level and development authoring API. A composition the plugin cannot prove safe is left unchanged and produces a build warning.

The transform affects JavaScript emission only. Declaration generation uses the original typed source and remains independent of flattening.

## Compatibility contract

Supported generic traits are pure class transformers. Descriptor traits are handled as an equivalent declarative specialization. For a transformed composition, the output preserves:

- trait declaration order and prototype-layer precedence;
- instance and static method/accessor descriptors;
- getter/setter shadowing semantics across inheritance layers;
- `super.member` resolution, including calls through multiple overrides;
- constructor argument flow, public-field initialization, and instance and static initialization order;
- the non-enumerable, non-writable, non-configurable prototype brand installed by `piirre.trait`, and therefore the existing `instanceof Trait` contract;
- descriptor traits' converter-backed accessors and `observedAttributes` merge/deduplication; and
- source maps and watch dependencies.

Trait-factory creation/application timing and effects performed outside the returned class declaration are not part of this contract. An effectful factory is unsupported and is retained at runtime.

Flattening removes runtime subclass layers. Applied trait implementations and factory modules should also remain tree-shakeable when the generated class only needs directly linkable bindings such as the trait brand or converter values.

## Eligibility

The plugin recognizes `impl` and `trait` by their resolved ydin imports rather than by spelling alone. An `impl` site is eligible only when it initializes a local composition constructor that is used solely as the superclass of one local class. Exported, instantiated, reassigned, escaping, or multiply consumed intermediaries are retained.

Trait lists may be inline readonly arrays or statically resolvable readonly tuples. Local/imported tuple references and tuple spreads are expanded in source order. Mutable or computed arrays, conditional elements, holes, and cycles are unsupported.

Supported trait definitions must be module-scoped declarations initialized directly by a recognized `trait(...)` call. Traits created inside functions, blocks, loops, conditionals, callbacks, or other nested lexical scopes are unsupported and remain runtime-based. The plugin does not perform closure conversion for nested trait factories.

Lowered members may reference imports and module-scoped bindings. Existing exports are reused. Private module-scoped bindings may receive collision-free, build-only synthetic exports so the flattened consumer can import the original live binding without copying its dependency graph. These synthetic exports are not emitted in declarations and are not part of the package's supported public API. References to nested lexical bindings bail out.

The supported generic subset accepts a direct pure transformer whose result is a class extending its parameter. It accepts public fields, constructors, methods, accessors, and statically named safe static members. It rejects private names, decorators, dynamic computed names, dynamic `super`, constructor object returns, `eval`, escaping class/base references, and factory statements outside the returned class. Descriptor traits created by `ydin/traits/traits` are a first-class specialization.

Supported constructors must have exactly one statically identifiable `super(...)` call executed on every constructor path. Conditional or repeated `super`, control flow crossing `super`, `try`/`finally` around `super`, object returns, and parameter/constructor behavior whose `this`, `arguments`, or `new.target` semantics cannot be retained bail out.

Generic static fields and blocks that observe constructor identity, `this`, the class name, `super`, prototype/static reflection, or class-evaluation timing are unsupported unless the analyzer can prove staged equivalence. Known descriptor specializations such as `observedAttributes` use dedicated lowering rules.

## Trait IR

Analysis is split into two logical passes:

1. trait normalization resolves descriptor-based and supported class-based traits into a common Trait IR; and
2. composition lowering consumes only Trait IR and does not depend on the original trait authoring form.

Trait IR is versioned, JSON-serializable, and linkable across modules. Semantic structure remains explicit: members, property keys, descriptor halves, constructor stages, static stages, brands, and `super` references are separate IR nodes rather than opaque source strings.

Leaf code fragments may be stored as source strings together with:

- their origin module and source span;
- an explicit table of free bindings;
- stable references for rewritable `super` operations; and
- the lexical mode required for `this`, `arguments`, and `new.target`.

A binding reference identifies the origin module and exported name. Imported or already exported values are linked directly. A private module-scoped binding is linked through a synthetic build-only export added to its origin module. The IR never recursively copies the binding's dependency chain.

The brand is linked as its original symbol binding rather than by retaining the trait object solely to read `Trait.brand`. Generated code therefore preserves brand identity while allowing unused runtime trait factories to be removed.

## Lowering

Analysis and emission are transactional per `impl` site. The plugin resolves the base, tuple, every trait, and every linked binding before changing source. A failed proof emits a single diagnostic at the composition and makes no edits for that site.

The final component class is rewritten to extend the original base. Public members are selected according to prototype-layer descriptor semantics, not by blindly concatenating class bodies. A getter and setter from different inheritance layers must not accidentally become one public accessor pair. Shadowed implementations remain available only when required by a later `super` reference.

Earlier overridden implementations are lowered to collision-free generated module-scoped helpers or equivalent helper values whose invocation preserves the original receiver. They are not emitted as instance private methods, because that would add an unrelated private-brand requirement to borrowed method calls. `super.foo()`, `super.foo`, and `super.foo = value` are redirected to the appropriate method/getter/setter helper. Dynamic `super[key]` bails out.

Constructors are normalized into ordered stages. Each constructor retains its parameter/default-initializer scope, pre-`super` evaluation, `super(...)` argument transform, public-field initialization, and post-`super` body. The base-facing `super(...)` call is emitted once, followed by trait stages in original nested-class order and finally the component fields/body. Expressions with side effects are evaluated once. Generated lexical scopes and identifiers prevent local-name collisions.

Static initialization is represented as ordered stages matching the original nested class-evaluation order. Generic static members are emitted only when that order and their observations can be preserved. Generated calls to `Object.defineProperty` live in class `static {}` blocks; there is no post-class setup.

Each trait brand is installed with:

```ts
Object.defineProperty(this.prototype, brand, { value: true });
```

where `brand` is the directly linked original symbol binding. Descriptor accessors use the same `configurable`, getter, and setter semantics as the runtime implementation, and `observedAttributes` is initialized at the corresponding trait stage.

## Plugin architecture

`.scripts/flattener` contains a small normalization, analysis, and lowering core plus a plugin adapter configured with `enforce: 'pre'`. The adapter uses the host resolver, registers every analyzed definition with `addWatchFile`, caches parsed modules by id and source, detects resolution cycles, applies synthetic exports and imports transactionally, and emits sourcemapped edits. The same adapter is installed before other transforms in tsdown and Vite/Vitest for both packages.

The internal constructor is `constructTraitFlattenerPlugin()`. It is workspace build tooling, not a ydin runtime export, and is not listed in `files.json`.

Diagnostics contain the source location, composition name, and stable reason code. Unsupported sites warn and retain runtime composition; malformed plugin configuration and internal invariant failures are build errors.

The serializable Trait IR may be emitted in an opt-in debug mode for snapshots, persistent-cache inspection, and troubleshooting, but JSON files are not part of normal package output.

## Verification

Node fixtures cover import aliases, tuple/spread expansion, resolution cycles, eligibility, warnings, unchanged bailout output, source maps, Trait IR serialization, and two-pass normalization/lowering boundaries.

Linking fixtures cover existing exports, imported values, private module-scoped synthetic exports, live `let` bindings, name collisions, and nested lexical captures that must bail out.

Runtime equivalence fixtures compare composed and flattened classes for member precedence, getter/setter shadowing, borrowed method receivers, method/accessor `super` chains, constructor argument/default flow, public-field and static initialization, descriptors, brands, and `instanceof`.

Descriptor fixtures cover converter accessors, linked converter bindings, direct brand linking, tree-shaking of unused trait factories, and ordered/deduplicated `observedAttributes`. Negative fixtures cover every documented bailout, including nested trait factories, constructor control flow, dynamic `super`, unsafe static reflection, and unsupported lexical captures.

Finally, ydin and Material X builds and browser suites run with the plugin, and representative emitted components are checked for a direct `ControlledElement` superclass, absence of `impl(...)`, no unnecessary runtime trait factory import, and unchanged declaration output.