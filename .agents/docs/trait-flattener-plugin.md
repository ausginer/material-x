# Trait flattener plugin

## Purpose

`@ydinjs/core` traits are plain classes, and a component names its base and its traits in a type: `const XBase: Composed<typeof Base, [typeof A, typeof B]> = compose(Base)`, extended by one class. Nothing composes them at runtime. The flattener is the **required compiler step** that turns that annotation into one class extending `Base`, with the traits' members copied in. Without it, `compose()` throws when the component's module is evaluated.

The transform affects JavaScript emission only. Declarations are generated from the typed source, which keeps the `Composed` annotation and each trait's `accessor` lines.

## The two layers

- **Layer (a), `@ydinjs/core/traits/composition.js`,** knows nothing of elements or attributes. A trait extends a bound, `bound()`, which is `null` at runtime, and calls `trait(this)` in its static block. Its members are methods, getters and setters, instance or static, and its static fields.
- **Layer (b), `@ydinjs/core/traits/attribute-traits.js`,** is sugar for element traits: `accessor name!: T` lines and `attributes(this, TABLE)` in the static block. It is lowered in the trait's own build, so a consumer only ever reads plain layer (a) traits. Nothing in the plugin's `composition/` imports its `attributes/`, and a node test checks that.

## What the plugin does to each module

`viteTraitsPlugin()` returns two `enforce: 'pre'` plugins, applied in this order:

1. **`trait-attributes`, layer (b).** In each class whose static block calls `attributes(this, TABLE)`, each `accessor name!: T` line becomes a getter and a setter that call core's attribute operator with the table's converter, the call is removed, and a static `observedAttributes` lists the table's keys. TABLE is an object literal, whose converters are identifiers or member expressions, or a module-scope `const` bound to one, read as `TABLE.name`. The operator is imported beside the module `attributes` comes from: `…/traits/attribute-traits.js` gives `…/attribute.js`.
2. **`trait-flattener`.** The trait module's own transform, then the flattening of each composition in the module.

The flattener reads every other module through a loader that applies step 1, so a trait from the same package is read already lowered.

### A trait module's own transform

For each class whose static block calls `trait(this)`:

- **The brand** is hoisted into an exported module-level `Symbol`, `$` and the class name with a lower-case first letter, and `trait(this)` is replaced by a static method: `static [Symbol.hasInstance](o) { return o != null && o[$brand] === true; }`. The static block goes when nothing else is left in it, and `trait`'s import when nothing else uses it. A bundle that never uses `instanceof` drops the class, and one that uses it keeps the class with a correct `instanceof`. A pure-marked `trait()` call would be removed even from a class the bundle keeps, and a static field would throw where class fields are lowered to assignment.
- **Each static field's value** is hoisted into an exported module-level constant, which the field then reads. A component links the constant, so it doesn't retain the trait class.
- **Each private binding a member reads** is exported under a build-only name, `__mxflat_<name>_<hash>`, and under its own name, so a component in another module, or another package's build, can link the live binding.
- **In an application build,** Vite's `build` without `build.lib`, each trait class's instance members are deleted, because nothing copies from that output. A library build keeps them, because another package copies from its `.js`. tsdown is always a library build, and the dev server is left alone.

Each step leaves its result recognizable, so the transform of another package's built trait module changes only what is missing. In built JavaScript, the generated `static [Symbol.hasInstance]` method is what marks a trait class, and it names the brand.

### A composition

A composition is a module-scope `const X: Composed<B, [...]> = compose(B)`, not exported, that exactly one class in the module extends and nothing else references. `Composed` and `compose` are recognized by the specifier they are imported from, `…/composition`. A composition that a trait class extends is a supertrait's, and stays at runtime, where it returns the bound.

**The trait list** is read from the annotation's second type argument: a tuple of `typeof T` and of spreads, `...Alias`, of tuple aliases, local or imported, `readonly` or not. An imported alias is read from the other module's declarations. A supertrait's own list is expanded before the supertrait. A cycle is an error.

**A trait** is a class with `trait(this)` in its static block, or, in built JavaScript, with the generated method. It is resolved through the module's imports, so a trait imported with `import type` works.

**Its members:**

- methods, getters and setters, instance and static, are copied as their source text;
- static fields with a value are merged by kind (below);
- `declare`, `abstract`, overload signatures, index signatures and a private field with no initializer, such as `#brand!: true`, are skipped. A `declare` member is a key in the types only: nothing is copied for it, and the conflict warning doesn't count it;
- anything else is an error: a constructor, an instance field, a private name read by a member, a computed key, a static block that does more than call `trait(this)`, and a body the free-reference walker doesn't model.

### The copy

**A member's names are found by a conservative walker** (`src/free-references.ts`). It models an allowlist of node types and rejects any other. `var`, function and class declarations hoist past the blocks it scopes, and `super`, `import.meta` and any reference to `eval` mean something else in the consumer, so all of them are outside it.

**Every name a member reads is a global or a module binding of the trait's module,** linked into the component:

- a value the trait's module imports is imported again: through a package specifier as it is, and through a relative one as a path from the component when both are in one package, or else as `<package name>/<path>` through the nearest `package.json`;
- a binding the trait's module exports is imported from it;
- a private binding is imported under its build-only name;
- in the component's own module, every binding is used by its name.

A member that assigns an imported binding, or reads the trait class's own name, is an error.

**The component must resolve those names the same way:** a global the component's module binds, a name kept in place that the class's own name shadows, or any such name when the class isn't module-scoped, is an error.

**The copy rule.** Members of a module with the component's file extension copy as they are. Any other pair copies when the member's text, as a class member, parses without error in both languages and the two trees are equal apart from positions. That refuses TypeScript syntax copied into JavaScript, an angle-bracket assertion copied into `.mts`, and JavaScript's `a < b > (c)`, which TypeScript reads as a call with a type argument.

### Statics merged by kind

A static's kind is read syntactically from its declared type: the trait's TypeScript source, or the `.d.ts` that its package's `types` condition names for a `.js`. A field with no declared type, such as layer (b)'s generated `observedAttributes`, takes the kind of its literal value.

| Declared type | Kind | Emitted, contributors in order: base, traits, the component's own |
| --- | --- | --- |
| `readonly T[]`, `T[]`, `ReadonlyArray<T>`, `Array<T>` | array | `[...(Base.k ?? []), ...first, ..., ...own]` |
| an object literal type, `Readonly<…>` of one, `Record<…>` | object | `{ ...(Base.k ?? {}), ...first, ..., ...own }` |
| a primitive or a literal | simple | the last trait's value, or nothing when the component declares the key |

`T | null`, `T | undefined` and an optional field take `T`'s kind, and a local or imported alias is followed. A tuple, every `as const` array, a class instance, a function, a mixed union, `typeof`, and an alias only a type checker could resolve are errors. A trait's value is linked through its hoisted constant, never inlined. The component's own array or object field is folded in last, and its declaration removed.

### Layers keep their meaning

The flattened class holds every trait's members in list order, before the component's own, and its `super` is the base. A key that two traits supply takes the later trait's member, as object assignment does, and the build warns (`trait-member-conflict`) unless the component declares the key itself. The types agree: in `Composed`, each trait is trimmed alone, losing only the keys a later trait declares. These are errors:

- a later trait's lone getter or setter over an earlier trait's pair, which would join halves of two traits;
- the component's lone getter or setter over a trait's pair;
- `super.key` in the component for a key a trait supplies, because `super` is the base;
- a computed `super[key]`, whose key can't be checked.

### The emitted component

The composition's statement is removed and the class extends the base. At the start of its body go the merged statics, each trait's members, and one static block, `static { impl(this, $a, $b, …); }`, which defines each brand on the prototype as a non-enumerable, read-only `true`. `impl` is imported from the module `compose` was imported from, and each link once, under an alias unique to its specifier and export.

## Trait IR

Normalization reads a trait class into the Trait IR (`src/ir.ts`, `TRAIT_IR_VERSION` 3), and lowering reads only the IR. A trait's node holds its name, its brand, its members and its statics. A member holds its key, kind, whether it is static, its source text, the links it reads with their offsets, and the globals it reads. A static holds its key, its kind and the link to its value. A link names a specifier and an export, or a binding of the component's own module, and, for a build-only export, the private name it stands for. The IR is JSON-serializable and never copies a binding's dependencies.

## Diagnostics

Every error fails the build, through the host's `error`, with the module and position. The warning goes through `warn`.

| Code | Severity | When |
| --- | --- | --- |
| `composition-shape` | error | The composition isn't a module-scope `const X: Composed<B, [...]> = compose(B)` extended by exactly one class, or `compose()` is called anywhere else. |
| `trait-list` | error | A list element isn't `typeof T` or a spread of a tuple alias, or the expansion has a cycle. |
| `trait-unresolved` | error | A trait can't be resolved to a class whose static block calls `trait(this)`, or, in built JavaScript, with the generated `static [Symbol.hasInstance]` method; or a name it reads is imported through a specifier no package reaches. |
| `trait-member` | error | A member is outside the copy subset: a constructor, `super`, a computed or private key, a private name read by a member, `eval`, `import.meta`, a static block that does more than call `trait(this)`, an `accessor` field, or a body the walker doesn't model. |
| `trait-field` | error | An instance field that isn't `declare`, or a private field with an initializer. |
| `trait-binding-shadowed` | error | The component's module or class binds a name that a copied member reads, or the class isn't module-scoped. |
| `trait-source-language` | error | The copy rule refuses a member. The message names the member and the two languages. |
| `trait-accessor-half` | error | A later trait's lone getter or setter over an earlier trait's pair. |
| `static-kind` | error | A static's declared kind is one that doesn't merge. |
| `static-kind-mismatch` | error | Two traits give one static key different kinds. |
| `class-accessor-half` | error | The component declares one half of a trait's accessor pair. |
| `class-super-trait-member` | error | `super.k` in the component, for a key that a trait supplies. |
| `class-computed-super` | error | `super[k]` in the component. |
| `attribute-table` | error | Layer (b): the table isn't an object literal or a module-scope `const` bound to one, a key has no `accessor`, an `accessor` has no key, or a converter isn't an identifier or a member expression. |
| `attribute-accessor` | error | Layer (b): an `accessor` line has an initializer, or isn't `accessor name!: T`. |
| `trait-member-conflict` | warning | Two traits supply one key that is a method, an accessor or a simple static. The later trait wins. Silent when the component declares the key. |

## Plugin architecture

`@ydinjs/vite-traits-plugin` is a public package. Its one export, `viteTraitsPlugin()`, returns the two plugins above for Vite and Rolldown. The repository's shared tsdown, Vite and Vitest configurations install them.

| File | Responsibility |
| --- | --- |
| `plugin.ts` | The adapter: the build kind, the loader through the host's resolver and Node's for `@ydinjs/*`, watch files, diagnostics, and sourcemapped edits |
| `syntax.ts` | Parsing with a cache, imports, top-level bindings and classes, member keys, build-only export names |
| `diagnostics.ts`, `ir.ts`, `free-references.ts` | The codes, the IR and the walker |
| `attributes/lower.ts` | Layer (b) |
| `composition/trait-module.ts` | A trait module's own transform, and how a trait class is recognized |
| `composition/annotation.ts` | Compositions and their trait lists |
| `composition/trait-class.ts` | A trait class's normalization and its links |
| `composition/declarations.ts`, `composition/statics.ts` | Declarations, and each static's kind |
| `composition/copy.ts` | The copy rule |
| `composition/rules.ts` | The layer rules and the conflict warning |
| `composition/lower.ts` | The emitted component |

## Verification

The plugin's node tests cover:

- each error code with a module that raises it, and the conflict warning with the later trait's member and simple static emitted, an array static concatenated, and no warning when the component declares the key;
- layer (b)'s lowering and its operator specifier;
- the trait module's transform: the brand hoist and method, the import removal, the static hoist, the build-only exports, an already transformed module left unchanged, and the deletion in an application build, with `instanceof` read at runtime;
- the copy rule's cases;
- runtime equivalence of a flattened component, built from a layer (b) trait with a constant table, one with an inline table and a layer (a) trait with a private binding, against a hand-written expected class: prototype keys, attributes, `observedAttributes`, the private binding, `super` from a subclass and `instanceof`; and a trait in another package's built JavaScript;
- the brand install in bundles, with rolldown and esbuild: an unused trait class drops, a used one keeps a correct `instanceof`, the deletion leaves it without members, and a library build keeps the brand install;
- the import boundary between `composition/` and `attributes/`.

A change to the plugin is also checked by building `@ydinjs/core` and `@ydinjs/material-x` with it: the build prints no `trait-member-conflict`.

## Change record

| Date | Sections | Change |
| --- | --- | --- |
| 2026-11-18 | All but Purpose | **Narrowed to what the plugin implements** (`repo:RF-44`). The document described a generic class-transformer subset — fields, constructors, methods, accessors and safe static members, lowered through helpers and constructor and static stages — that no code flattened. It also placed the plugin in `.scripts/flattener` as a private `constructTraitFlattenerPlugin()`, said that it resolved imports to recognize them, and named an IR debug mode. **Kept, and met by the code at `49e26415d`** under the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 1: per-site transactions, a parse cache keyed by source, a diagnostic for a cyclic list, and the accessor and `super` eligibility rules. The pre-rename module names are no longer recognized |
| 2026-11-18 | All but Purpose | **Widened to method traits** (`repo:RF-44`), on the owner's answer C, as the code at `242feffcb` implements them (the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 2). **Added:** method traits in §Compatibility contract; their recognition, definition, member, scope and linking rules in §Eligibility; the layer rule for a trait's accessor half; the member node and `TRAIT_IR_VERSION` 2 in §Trait IR; member insertion in §Lowering; and the table of reason codes. **Changed:** `observedAttributes` is emitted only when the composition has a descriptor trait, and is otherwise inherited from the base. Before, the document said the field was always inserted, and that the plugin doesn't flatten a class-based trait |
| 2026-11-18 | Eligibility, Plugin architecture | **Corrected** on the feature proof at `8a5365adc` (`reviewer-1` to `reviewer-3`). **Narrowed:** the linkable binding forms are named, and a member that reads a function, class, enum or namespace declaration, a destructured variable or a namespace import is retained. Before, the document said that every module binding is linked. **Changed, and met by the code once the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 2b is in:** any reference to `eval` retains the trait, where the document said _direct `eval`_ and the code missed wrapped forms. The language rule copies only between the same languages and from JavaScript into TypeScript, where it said _"The source language must match"_ and checked TypeScript into JavaScript only. The JavaScript-into-TypeScript limit is stated |
| 2026-11-18 | Eligibility, Verification, Plugin architecture | **Narrowed** on the item 2b recheck at `b72ee0b8b` (`recheck-1`, `recheck-2`), and met by the code once the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 2c is in. A member is copied only between files of the same extension. The rule said that a member is copied between the same languages, with `.ts`, `.mts` and `.cts` as one, and from JavaScript into TypeScript, with `a < b > (c)` as a known limit. The `.mts` and `.cts` parsers reject what `.ts` accepts, and the limit changed a member's meaning with no warning. The fixture for another package's built JavaScript becomes a negative one |
| 2026-11-19 | All | **Rewritten from Purpose down for `RD-26`.** Traits are plain classes in two layers, and the plugin is a required compiler step: a composition it can't carry is a build error, where it used to be retained at runtime with a warning. Recognition reads the `Composed` annotation in place of `impl()` and the `trait()` factories; statics merge by declared kind; the copy rule is parse equivalence (`repo:RF-44`); a trait's own build lowers layer (b), hoists its brand into a static `[Symbol.hasInstance]` method and its statics into constants; and the IR is version 3 |