# Trait flattener plugin

## Purpose

`@ydinjs/core` traits are plain classes decorated `@trait`, and a component names its base and its traits in a type: `const XBase: Composed<typeof Base, [typeof A, typeof B]> = compose(Base)`, extended by one class. Nothing composes them at runtime. The flattener is the **required compiler step** that turns that annotation into one class extending `Base`, with the traits' members copied in, and compiles the decorators. Without it, `compose()` throws when the component's module is evaluated, and `@trait` and `@attributes()` throw where a toolchain lowers decorators. Trait sources always go through the plugin, tests included.

The transform affects JavaScript emission only. Declarations are generated from the typed source, which keeps the `Composed` annotation and each trait's `accessor` lines. TypeScript's and oxc's declaration emitters both leave out the decorators.

## The two layers

- **Layer (a), `@ydinjs/core/traits/composition.js`,** knows nothing of elements or attributes. A trait is a module-scope class declaration that extends a bound, `bound()`, which is `null` at runtime, and is decorated `@trait`. Its members are methods, getters and setters, instance or static; its static fields; its private instance fields, methods and accessors; and a constructor with no parameters. It has no static block.
- **Layer (b), `@ydinjs/core/traits/attribute-traits.js`,** is sugar for element traits: `accessor name!: T` lines and `@attributes(TABLE)`, the decorator after `@trait`. It is lowered in the trait's own build, so a consumer only ever reads plain layer (a) traits. Nothing in the plugin's `composition/` imports its `attributes/`, and a node test checks that.

## What the plugin does to each module

`viteTraitsPlugin()` returns two `enforce: 'pre'` plugins. Their transforms apply in this order:

1. **`trait-attributes`, layer (b).** In each module-scope class declaration decorated `@trait` and then `@attributes(TABLE)`, each `accessor name!: T` line becomes a getter that reads the attribute through the table's converter and a setter that writes it through the converter and core's `setAttribute`, `@attributes(TABLE)` and its import are removed, `@trait` stays, and a static `observedAttributes`, first in the class body, lists the table's keys. TABLE is an object literal, whose converters are identifiers or member expressions, or a module-scope `const` bound to one, read as `TABLE.name`. `setAttribute` is imported beside the module `attributes` comes from: `…/traits/attribute-traits.js` gives `…/attribute.js`.
2. **`trait-flattener`.** The trait module's own transform, then the flattening of each composition in the module.

**An import that the plugin empties goes whole.** When the plugin removes an import specifier, `trait`, `attributes` or `compose`, and the declaration keeps no value specifier, it removes the declaration. An inline `type` specifier isn't a value specifier: under `verbatimModuleSyntax`, `import { type X } from 'm'` is emitted as an import with no bindings, which a bundler keeps as a bare import of an external module. The trait module's transform and the flattening remove from one declaration together, so a declaration that they empty between them goes too. A declaration that the plugin doesn't touch stays as written, `import { type X }` included.

### The doc in the declarations: a `load` stage

oxc's declaration emitter, which tsdown runs, drops a JSDoc in front of a class's decorators, and tsdown's declaration plugin records each module in a `transform` that runs before any of the flattener's. So `trait-attributes` also has a `load` hook, which rolldown runs before every `transform` (`src/declaration-doc.ts`):

- **What it rewrites.** In each `export class` and `export default class` declaration whose decorators come before `export`, and which is documented, `export`, or `export default`, moves to the first decorator's start, with every space and comment between the keywords and after them. The stage reads that span from the declaration, from the statement's start to the class's, not from the text, so `export /* note */ default` moves whole. `/** doc */ @trait @attributes(T) export class X` becomes `/** doc */ export @trait @attributes(T) class X`, and `/** doc */ // note @trait export default class X` becomes `/** doc */ // note export default @trait class X`. JavaScript and TypeScript read each pair the same way, and the emitter keeps the doc of the second. The rest of the plugin accepts both forms, so nothing after the stage changes.
- **What counts as documented:** a JSDoc block comment after the previous statement's end, or the program's start, and before the first decorator. Other comments may stand between the JSDoc and the decorator. A JSDoc after the first decorator, as in `@trait /** doc */ export class X`, doesn't count, and the stage leaves the class as written, whose doc the emitter keeps.
- **What it reads:** a candidate module with an absolute file id and no query, in a build. It doesn't run on the dev server, which emits no declarations. It parses only a file with a line that starts with `@`, and returns `null` when it moves nothing or the file doesn't parse, so the host reads the file as before and reports its own errors. The stage reads every decorated class, a consumer's own included, and never fails the build itself. It returns the code with a hires map that includes the file's content.
- **Watch.** It asks the host to watch each file it loads, because a module that a plugin loads isn't watched otherwise.
- **Positions.** It records, per module, the names that the classes it moved are exported as, `default` for an `export default` class, named or not. A diagnostic's position inside a moved class's keywords or decorators is moved back, so every diagnostic carries the position it has without the stage.
- **What retires it:** oxc's emitter keeping a JSDoc in front of decorators. The declarations test then passes without the stage, and the stage is deleted.

The flattener reads every other module through a loader that applies step 1, so a trait from the same package is read already lowered.

### A trait module's own transform

It first checks that the module uses `trait` only as the first decorator of a module-scope class declaration (`trait-decorator`). Then, for each class decorated `@trait`, where `trait` is a name the module imports from `…/composition`, aliases included:

- **The brand** is hoisted into an exported module-level `Symbol`, `$` and the class name with a lower-case first letter, `@trait` is removed, and the class gets a static method: `static [Symbol.hasInstance](o) { return o != null && o[$brand] === true; }`. The method goes after the `static observedAttributes` that layer (b) puts first, or else first in the body, and `trait`'s import goes when nothing else uses it. In `@trait export class`, the decorator lies before the `export` statement, so the brand goes before the decorator. A bundle that never uses `instanceof` drops the class, and one that uses it keeps the class with a correct `instanceof`. A pure-marked `trait()` call would be removed even from a class the bundle keeps, and a static field would throw where class fields are lowered to assignment.
- **Each static field's value** is hoisted into an exported module-level constant, which the field then reads. A component links the constant, so it doesn't retain the trait class.
- **Each private binding that copied source reads** is exported under a build-only name, `__mxflat_<name>_<hash>`, and under its own name, so a component in another module, or another package's build, can link the live binding. Copied source is a member, a private field's initializer, or the constructor's body after its `super();`.
- **In an application build,** Vite's `build` without `build.lib`, each trait class's instance members are deleted, because nothing copies from that output. They include its private fields, methods and accessors and its constructor. A library build keeps them, because another package copies from its `.js`. tsdown is always a library build, and the dev server is left alone.

Each step leaves its result recognizable, so the transform of another package's built trait module changes only what is missing, and an application build deletes that module's instance members too. In built JavaScript, a trait class is recognized only by the exact generated method: one identifier parameter `p`, a body that is one `return p != null && p[B] === true`, and `B` an exported module-scope variable initialized with `Symbol(<string literal>)` and never written again: not the target of an assignment, including each name in a destructuring pattern with its defaults and rest elements, nor of an update, nor the left side of a `for…in` or `for…of` that isn't a declaration, and not declared twice in the module, counting each `var` in a block or a loop head, which hoists to the module's scope. Any other `Symbol.hasInstance` method leaves its class untouched.

### A composition

A composition is a module-scope `const X: Composed<B, [...]> = compose(B)`, not exported, that exactly one class in the module extends, with no other value reference. The count fails closed: every identifier counts unless it is reached only through a type position, a type-only or `declare` declaration, or a non-computed property key or member name. Any identifier-like node counts, a JSX element's name included, so `<X />` and `<X.Inner />` are references; a JSX attribute's name isn't. A shorthand property and an export specifier count, and so does any shape the count doesn't know, such as a namespace body, an enum initializer or a parameter property's default. A direct `eval('X')` reads the name from a string, which no syntactic count can see. `Composed` and `compose` are recognized by the specifier they are imported from, `…/composition`. A composition that a trait class extends is a supertrait's, and stays at runtime, where it returns the bound.

**The trait list** is read from the annotation's second type argument: a tuple of `typeof T` and of spreads, `...Alias`, of tuple aliases, local or imported, `readonly` or not. An imported alias is read from the other module's declarations. A supertrait's own list is expanded before the supertrait. A cycle is an error. **The expanded list keeps each trait's first occurrence,** so a supertrait that two traits share is copied once, ahead of both. That is the only order that keeps every supertrait ahead of each trait that extends it.

**A trait that the base's chain already composes** is a `trait-list` error when the trait has a constructor or private instance members that the copy carries. A second copy would run the constructor's body twice per instance and hold a second set of private fields. The plugin asks only for such a trait, and reads the chain from `compose`'s argument through each `extends`: a composition's list in source, and the brands that a built flattened class passes to `impl(this, …)` in its static block, compared by module and export. A chain the walk can't read is an error too. A trait with neither, such as one whose only private member is an uncopied `#brand!: true`, is composed again as before.

**A trait** is a class decorated `@trait`, or, in built JavaScript, with the generated method. It is resolved through the module's imports, so a trait imported with `import type` works. `@trait` and `@attributes` are recognized by named imports, as `compose` is: a namespace import, `@c.trait`, isn't.

**Import a trait or a base from the module that declares it.** The flattener doesn't follow `export … from`: a trait imported through a re-export is `trait-unresolved`, and a base whose static kind it must read is `static-kind`. A base's chain is read for nearly every composition, because every attribute trait contributes `observedAttributes`.

**Its members:**

- methods, getters and setters, instance and static, are copied as their source text;
- private instance members are copied too: fields, with or without an initializer, methods, getters and setters. **A private field with no initializer that no member or the constructor of its trait references isn't copied:** no code names it, `#name in` is refused, and it runs nothing. So `#brand!: true` stays a type-only brand. **A private field with an initializer is copied, whether or not anything references it,** because its initializer's effects are observable, as `#registered = registry.add(…)`'s are. It is renamed, linked, run in its place in the order and checked like every other copied initializer;
- **a field's initializer doesn't reference `this` or `super`,** directly, in an arrow function or in a nested function, class or object method. It reads only linked module bindings and globals, so its value can't depend on a field or a constructor. `new Map()` is allowed;
- **a private name is used only as `this.#name`,** where `this` is the member's or the constructor's own, directly or inside an arrow function. Read, write, call, update, compound assignment and an assignment or destructuring target are allowed. `other.#name`, `#name in other` and a private name inside a nested `function` are errors, and so is one in a static member. After renaming, the name belongs to one component class, while the trait's type accepts an instance of any class with the trait: `instanceof` with the trait is the check across classes;
- **a constructor is `constructor() { super(); … }`:** no parameters, parameter properties included; a first statement that is `super();` with no arguments, and no other `super`; no overload signature and no modifier. Its body doesn't read `arguments` or `new.target`, and doesn't `return` outside a nested function, because in the component's constructor each would mean the component's;
- static fields with a value are merged by kind (below);
- `declare`, `abstract`, overload signatures and index signatures are skipped. A `declare` member is a key in the types only: nothing is copied for it, and the conflict warning doesn't count it;
- anything else is an error: a public instance field, a static private member, `accessor` fields, `accessor #x` included, a computed key, a static block, and source the free-reference walker doesn't model.

### The copy

**The names of copied source are found by a conservative walker** (`src/free-references.ts`): a member, a private field's initializer, and the constructor's body after `super();`. It models an allowlist of node types and rejects any other. `var`, function and class declarations hoist past the blocks it scopes, and `super`, `new.target`, `import.meta` and any reference to `eval` mean something else in the consumer, so all of them are outside it. It also records every private name, with its offsets.

**Every name copied source reads is a global or a module binding of the trait's module,** linked into the component:

- a value the trait's module imports is imported again: through a package specifier as it is, and through a relative one as a path from the component when both are in one package, or else as `<package name>/<path>` through the nearest `package.json`;
- a binding the trait's module exports is imported from it;
- a private binding is imported under its build-only name;
- in the component's own module, every binding is used by its name.

Copied source that assigns an imported binding, or reads the trait class's own name, is an error.

**Private names are renamed per trait.** Each private name the trait declares becomes `#<name>_<hash>` in the component, in its declaration and in every `this.#name`. The hash is derived from the specifier the component reaches the trait's module through and the trait's class name, never from a path, so the output doesn't depend on the checkout, and two traits, or a trait and the component, can each declare `#x`. A renamed name that equals another private name of the component's class body, its own or another trait's renamed one, is `trait-binding-shadowed`.

**The component must resolve those names the same way:** a global the component's module binds, a name kept in place that the class's own name shadows, or any such name when the class isn't module-scoped, is an error. A constructor's body is inserted into the component's constructor, so a name it reads, with its link's generated alias, also may not be one that constructor binds: a parameter, a declaration at its top level, before or after `super(…)`, or a `var` anywhere in it.

**The copy rule.** Members of a module with the component's file extension copy as they are. Any other pair copies when the member's text, as a class member, parses without error in both languages and the two trees are equal apart from positions. A private field is read as a class member, and the constructor's body as `constructor() { … }` without its `super();`. That refuses TypeScript syntax copied into JavaScript, an angle-bracket assertion copied into `.mts`, and JavaScript's `a < b > (c)`, which TypeScript reads as a call with a type argument.

### Statics merged by kind

A static's kind is read syntactically from its declared type: the trait's TypeScript source, or the `.d.ts` that its package's `types` condition names for a `.js`. A field with no declared type, such as layer (b)'s generated `observedAttributes`, takes the kind of its literal value.

The base's kind of a key that a trait contributes is read the same way, from the nearest `static key` declaration in its class chain: from `compose`'s argument through each `extends`. A global, such as `HTMLElement`, ends the chain with no declaration, and an absent value is empty. A heritage the walk can't read, such as a call, is `static-kind`.

| Declared type | Kind | Emitted, contributors in order: base, traits, the component's own |
| --- | --- | --- |
| `readonly T[]`, `T[]`, `ReadonlyArray<T>`, `Array<T>` | array | `[...(Base.k ?? []), ...first, ..., ...own]` |
| an object literal type, `Readonly<…>` of one, `Record<…>` | object | `{ ...(Base.k ?? {}), ...first, ..., ...own }` |
| a primitive or a literal | simple | the last trait's value, or nothing when the component declares the key |

`T | null`, `T | undefined` and an optional field take `T`'s kind, and a local or imported alias is followed. A tuple, every `as const` array, a class instance, a function, a mixed union, `typeof`, and an alias only a type checker could resolve are errors. A trait's value is linked through its hoisted constant, never inlined. The component's own array or object field is folded in last, and its declaration removed.

### Layers keep their meaning

The flattened class holds every trait's members in list order, before the component's own, and its `super` is the base. A key that two traits supply takes the later trait's member, as object assignment does, and the build warns (`trait-member-conflict`) unless the component declares the key itself. A renamed private name never conflicts, so this section's rules don't see private members. The types agree: in `Composed`, each trait is trimmed alone, losing only the keys a later trait declares. These are errors:

- a later trait's lone getter or setter over an earlier trait's pair, which would join halves of two traits;
- the component's lone getter or setter over a trait's pair;
- `super.key` in the component for a key a trait supplies, because `super` is the base;
- a computed `super[key]`, whose key can't be checked.

### The emitted component

The composition's statement is removed and the class extends the base. At the start of its body go the merged statics, each trait's private fields and members, the trait's fields first, and, when the list has a trait, one static block, `static { impl(this, $a, $b, …); }`, which defines each brand on the prototype as a non-enumerable, read-only `true`. An empty list brands nothing and gets neither the block nor the import. `impl` is imported from the module `compose` was imported from, once, when some composition in the module has a trait, and each link once, under an alias unique to its specifier and export. `compose` is removed from its import when nothing in the module references it after lowering, so a module whose compositions are all lowered imports nothing from that module unless it needs `impl`. A supertrait's composition stays, and so does its `compose`.

**A trait's constructor body** goes into the component's constructor as a block, without its `super();`, right after the statement that is the component's `super(…)` call. The blocks follow the expanded list, so a supertrait's block comes before its subtrait's and each runs once per instance. Each is a block so that its `let` and `const` are its own. The order per instance is:

1. the component's statements before `super(…)`, and `super(…)`'s arguments;
2. the base: its fields and its constructor;
3. every trait's fields, in list order, then the component's own fields;
4. every trait's constructor body, in list order;
5. the component's statements after `super(…)`.

When the component has no constructor, the plugin generates `constructor(...args) { super(...args); … }` with the blocks. A list with no trait constructor changes no constructor and generates none.

**The component's `super(…)` rule.** When the list has a trait with a constructor, the component's constructor has exactly one `super(…)` call, counting nested functions, and it is the whole expression of a statement at the constructor's top level. Otherwise no single point follows every path, and it is `component-constructor`: two calls, one in each branch of an `if`, one in an arrow function, `super(), (this.x = 1);` and `const self = super();`. TypeScript doesn't require this under `target` `esnext` with `useDefineForClassFields`, and doesn't check JavaScript.

**The component's field-initializer rule.** When the list has a trait with a constructor, an instance field initializer of the composing class, an `accessor` field's included, doesn't reference `this` or `super`, in an arrow function or a nested function either. The initializer runs before every trait's constructor body, so what it reads isn't set up yet, and an arrow can be called at once. It is `component-field`, at the token. Such an initialization goes in the constructor, after `super(…)`. A static field, a subclass's field and a component whose list has no trait with a constructor aren't checked.

## Trait IR

Normalization reads a trait class into the Trait IR (`src/ir.ts`, `TRAIT_IR_VERSION` 4), and lowering reads only the IR. A trait's node holds its name, its brand, its members, its statics, its copied private fields, its constructor's body and the suffix its private names are renamed with. A member holds its key, kind, whether it is static and whether its key is private, and, as a field and the constructor's body do, its source text, the links it reads with their offsets, the globals it reads and every private name with its offsets. The constructor's body also holds the span of the `super();` it drops. A static holds its key, its kind and the link to its value. A link names a specifier and an export, or a binding of the component's own module, and, for a build-only export, the private name it stands for. The IR is JSON-serializable and never copies a binding's dependencies.

## Diagnostics

Every error fails the build, through the host's `error`, with the module and position. The warning goes through `warn`.

| Code | Severity | When |
| --- | --- | --- |
| `composition-shape` | error | The composition isn't a module-scope `const X: Composed<B, [...]> = compose(B)` extended by exactly one class, or `compose()` is called anywhere else. |
| `trait-list` | error | A list element isn't `typeof T` or a spread of a tuple alias, or the expansion has a cycle; or the base's chain already composes a trait with a constructor or copied private members, or can't be read when the list has such a trait. |
| `trait-unresolved` | error | A trait can't be resolved to a class decorated `@trait`, or, in built JavaScript, with the generated `static [Symbol.hasInstance]` method; or a name it reads is imported through a specifier no package reaches. |
| `trait-decorator` | error | The trait module's transform: `trait` is used other than as the first decorator of a module-scope class declaration whose only other decorator is `@attributes(TABLE)`. That is `@trait(…)`, `@trait` on a class expression, a nested class or a member, beside another decorator or twice, and any other reference: a call such as `trait(this)`, a re-export, or passing it as a value. |
| `trait-member` | error | Copied source is outside the subset: `super`, a computed key, a static private member, a private name used other than as `this.#name`, `this` or `super` in a field initializer, `eval`, `new.target`, `import.meta`, a static block, an `accessor` field, or source the walker doesn't model; or a constructor that isn't `constructor() { super(); … }`, or whose body reads `arguments` or returns outside a nested function. The message names the member, and for a private name suggests `instanceof`. |
| `trait-field` | error | A public instance field that isn't `declare`. |
| `trait-binding-shadowed` | error | The component's module or class binds a name that copied source reads, its constructor binds a name a constructor body reads, a renamed private name equals another in the class body, or the class isn't module-scoped. |
| `trait-source-language` | error | The copy rule refuses a member. The message names the member and the two languages. |
| `trait-accessor-half` | error | A later trait's lone getter or setter over an earlier trait's pair. |
| `static-kind` | error | A static's declared kind is one that doesn't merge, a trait's or the base's, or the base's class chain can't be read to find the key. |
| `static-kind-mismatch` | error | Two contributors give one static key different kinds. The base's declaration, the nearest `static key` in its class chain, is the first contributor, and the message names the base. |
| `class-accessor-half` | error | The component declares one half of a trait's accessor pair. |
| `class-super-trait-member` | error | `super.k` in the component, for a key that a trait supplies. |
| `class-computed-super` | error | `super[k]` in the component. |
| `component-constructor` | error | The list has a trait with a constructor, and the component's constructor doesn't have exactly one `super(…)` call, counting nested functions, as the whole expression of a statement at its top level. Reported at the call, or at the constructor when it has none. |
| `component-field` | error | The list has a trait with a constructor, and an instance field initializer of the component references `this` or `super`, in a nested function too. Reported at the token. |
| `attribute-table` | error | Layer (b): the table isn't an object literal or a module-scope `const` bound to one, a key has no `accessor`, an `accessor` has no key, or a converter isn't an identifier or a member expression. |
| `attribute-accessor` | error | Layer (b): an `accessor` line has an initializer, or isn't `accessor name!: T`. |
| `attributes-decorator` | error | Layer (b): `attributes` is used other than as `@attributes(TABLE)`, the second decorator of a module-scope class declaration whose first is `@trait`. That is `@attributes` not called or not with one table, on a class that `@trait` doesn't decorate, above `@trait` or twice, on a class expression, a nested class or a member, and any other reference: a call such as `attributes(this, TABLE)`, a re-export, or passing it as a value. |
| `trait-member-conflict` | warning | Two traits supply one key that is a method, an accessor or a simple static. The later trait wins. Silent when the component declares the key. |

## Plugin architecture

`@ydinjs/vite-traits-plugin` is a public package. Its one export, `viteTraitsPlugin()`, returns the two plugins above for Vite and Rolldown. The repository's shared tsdown, Vite and Vitest configurations install them.

| File | Responsibility |
| --- | --- |
| `plugin.ts` | The adapter: the build kind, the loader through the host's resolver and Node's for `@ydinjs/*`, watch files, diagnostics, and sourcemapped edits |
| `declaration-doc.ts` | The `load` stage that keeps a decorated class's doc in the declarations, and the positions it moves |
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

- each error code with a module that raises it, each misuse of `@trait` and `@attributes` with its position, and the conflict warning with the later trait's member and simple static emitted, an array static concatenated, and no warning when the component declares the key;
- layer (b)'s lowering of an inline table and a module constant, under aliased imports, against expected text, and its operator specifier;
- the trait module's transform of each form of `@trait`, against expected text: above `export class`, after `export`, a class that isn't exported, a layer (b) trait, an aliased import, and the import kept for another name; the brand hoist and method, the import removal, the static hoist, the build-only exports, an already transformed module left unchanged, and the deletion in an application build, with `instanceof` read at runtime;
- the removal of an emptied import, against expected text: `trait`, `attributes` or `compose` with only an inline `type` left beside it, and one declaration that the trait transform and the flattening empty together, each removed whole; `compose` kept where a supertrait's composition still calls it; and an `import { type X }` that the plugin didn't touch, kept;
- the copy rule's cases;
- runtime equivalence of a flattened component, built from a layer (b) trait with a constant table, one with an inline table and a layer (a) trait with a private binding, against a hand-written expected class: prototype keys, attributes, `observedAttributes`, the private binding, `super` from a subclass and `instanceof`; and a trait in another package's built JavaScript;
- private members and constructors (`tests/state.node.test.ts`), against a hand-written expected class: prototype and own keys, `observedAttributes`, `instanceof`, a private accessor pair and method, initializers and a constructor body that read imported, exported and private bindings, from source and from another package's built JavaScript, and two instances with two maps; the order of the base, every field, every body and the component's statements, from a subclass and over a flattened base; two traits and the component that each declare `#x`; a supertrait that two traits share, copied once with its field and body run once and the override kept; and the generated constructor passing every argument; and a private field with an initializer that nothing references, copied and run in the same order as in the hand-written class;
- each new diagnostic at its position: the private-name forms, `this`, `super` and `arguments` in an initializer, referenced or not, the constructor's forms, the component's `super(…)` forms and field initializers, a renamed name the component declares, and `trait-list` over a source and a built base; and, accepted, a nested function's `return`, a component field without `this`, an uncopied `#brand!: true` composed again, and a component's constructor and `this` initializers left as they are when no trait has a constructor;
- the declarations of a trait with private members and a constructor: one `#private;` per class, `constructor();`, and a typecheck of a component that composes two such traits and declares its own `#x`;
- a supertrait, whose composition stays; an empty list, which emits no `impl`; and a layer (b) trait from source composed in a Vite build and on the dev server;
- the brand install in bundles, with rolldown and esbuild: an unused trait class drops, a used one keeps a correct `instanceof`, the deletion leaves it without members, and a library build keeps the brand install;
- the `load` stage: a tsdown build with declarations keeps the doc in front of `@trait` and `@attributes(TABLE)`, a doc that a line or a block comment follows, and the doc of `@trait export default class X` and of `@trait export abstract class X`; the stage asks the host to watch the file, returns nothing on the dev server, and reads a file again at each load; and a rolldown build reports `trait-decorator`, `attributes-decorator` and `attribute-table` at the position it has without the stage, `trait-decorator` above `export default class` included;
- the import boundary between `composition/` and `attributes/`.

A change to the plugin is also checked by building `@ydinjs/core` and `@ydinjs/material-x` with it: the build prints no `trait-member-conflict`, and, for a change no trait adopts, the output is byte-identical to `main`'s.

## Change record

| Date | Sections | Change |
| --- | --- | --- |
| 2026-11-18 | All but Purpose | **Narrowed to what the plugin implements** (`repo:RF-44`). The document described a generic class-transformer subset — fields, constructors, methods, accessors and safe static members, lowered through helpers and constructor and static stages — that no code flattened. It also placed the plugin in `.scripts/flattener` as a private `constructTraitFlattenerPlugin()`, said that it resolved imports to recognize them, and named an IR debug mode. **Kept, and met by the code at `49e26415d`** under the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 1: per-site transactions, a parse cache keyed by source, a diagnostic for a cyclic list, and the accessor and `super` eligibility rules. The pre-rename module names are no longer recognized |
| 2026-11-18 | All but Purpose | **Widened to method traits** (`repo:RF-44`), on the owner's answer C, as the code at `242feffcb` implements them (the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 2). **Added:** method traits in §Compatibility contract; their recognition, definition, member, scope and linking rules in §Eligibility; the layer rule for a trait's accessor half; the member node and `TRAIT_IR_VERSION` 2 in §Trait IR; member insertion in §Lowering; and the table of reason codes. **Changed:** `observedAttributes` is emitted only when the composition has a descriptor trait, and is otherwise inherited from the base. Before, the document said the field was always inserted, and that the plugin doesn't flatten a class-based trait |
| 2026-11-18 | Eligibility, Plugin architecture | **Corrected** on the feature proof at `8a5365adc` (`reviewer-1` to `reviewer-3`). **Narrowed:** the linkable binding forms are named, and a member that reads a function, class, enum or namespace declaration, a destructured variable or a namespace import is retained. Before, the document said that every module binding is linked. **Changed, and met by the code once the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 2b is in:** any reference to `eval` retains the trait, where the document said _direct `eval`_ and the code missed wrapped forms. The language rule copies only between the same languages and from JavaScript into TypeScript, where it said _"The source language must match"_ and checked TypeScript into JavaScript only. The JavaScript-into-TypeScript limit is stated |
| 2026-11-18 | Eligibility, Verification, Plugin architecture | **Narrowed** on the item 2b recheck at `b72ee0b8b` (`recheck-1`, `recheck-2`), and met by the code once the [plan](../../.plan/traits-plugin-1/traits-plugin-handoff.md)'s item 2c is in. A member is copied only between files of the same extension. The rule said that a member is copied between the same languages, with `.ts`, `.mts` and `.cts` as one, and from JavaScript into TypeScript, with `a < b > (c)` as a known limit. The `.mts` and `.cts` parsers reject what `.ts` accepts, and the limit changed a member's meaning with no warning. The fixture for another package's built JavaScript becomes a negative one |
| 2026-11-19 | All | **Rewritten from Purpose down for `RD-26`.** Traits are plain classes in two layers, and the plugin is a required compiler step: a composition it can't carry is a build error, where it used to be retained at runtime with a warning. Recognition reads the `Composed` annotation in place of `impl()` and the `trait()` factories; statics merge by declared kind; the copy rule is parse equivalence (`repo:RF-44`); a trait's own build lowers layer (b), hoists its brand into a static `[Symbol.hasInstance]` method and its statics into constants; and the IR is version 3 |
| 2026-11-19 | Transform, Composition, Statics, Diagnostics | **Corrected** on PR #76's feature proof (`reviewer-1` to `reviewer-3`). An application build deletes the instance members of a built trait module too, recognized only by the exact generated method; the base's declared kind is the first contributor to a static, where the table said _"Two traits"_; and `composition-shape` counts only value references, where it said _"nothing else references"_ |
| 2026-11-19 | Composition, Transform | **Corrected** on PR #76's repair verification (`verifier-1` to `verifier-3`). The `composition-shape` count fails closed and walks every node that isn't type-only; a brand is never written again by any target; and the limit on re-exports is stated |
| 2026-11-19 | Composition, Transform | **Corrected** on PR #76's final verification (`final-1`, `final-2`). A JSX element's name counts as a value reference, a direct `eval` is stated as out of reach, and a nested `var` counts as a second declaration of a brand |
| 2026-11-20 | Purpose, Layers, Transform, Composition, Emitted component, Diagnostics, Verification | **Changed for `RD-26`'s amendments of 2026-11-20.** A trait declares itself with `@trait` and its attributes with `@attributes(TABLE)`, which the plugin compiles into the same JavaScript; they were `trait(this)` and `attributes(this, TABLE)` in a static block, and a trait has no static block now. The codes `trait-decorator` and `attributes-decorator` are added. An empty trait list emits no `impl` block or import, where `impl` was always generated |
| 2026-11-20 | What the plugin does, Plugin architecture, Verification | **Added** the `load` stage for `RD-26`'s third amendment of 2026-11-20: it moves `export` before a documented class's decorators, so the published declarations keep the class's doc |
| 2026-11-20 | What the plugin does, Emitted component, Verification | **Changed for `RD-26`'s fourth amendment of 2026-11-20.** The `load` stage moves `export default` too, and a JSDoc counts when other comments follow it; before, it read only `export class`, with nothing but whitespace between the JSDoc and the first decorator. The stage records the names the classes are exported as, where it recorded class names. An import that the plugin empties goes whole when only inline `type` specifiers are left, and `compose`'s import goes when nothing references it after lowering; before, both stayed, and a build emitted them as bare imports |
| 2026-11-21 | Layers, Transform, Composition, The copy, Layers keep their meaning, Emitted component, Trait IR, Diagnostics, Verification | **Widened for `RD-33`.** A trait may declare private instance fields, methods and accessors, which the copy renames per trait, and a constructor with no parameters, whose body the component's constructor runs after its `super(…)`. The expanded list keeps each trait's first occurrence, and `component-constructor` and `component-field` are added. Before, the document said that a constructor, an instance field with an initializer and a private name read by a member were errors, and that only a private field with no initializer was skipped. The IR is version 4, where it was 3. **Amended the same day on the feature proof's `reviewer-1`:** a private field with an initializer is copied and checked whether or not anything references it, and only one with no initializer that nothing names is skipped. The row said that a private field nothing references isn't copied, because it can't be observed, which an initializer's effects contradict |