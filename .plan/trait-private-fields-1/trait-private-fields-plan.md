# Plan: private instance members in traits (`RD-33`)

**Recipient:** the implementer. **Branch:** `repo/trait-private-fields-1`, from `main` at `640658b5c`. **Input:** the architect's commit that adds this file. **Decided** by the owner on 2026-11-21, relayed by the coordinator ([`RD-33`](../00-index.md)). The plan and its implementation share this branch and one pull request (`RD-32`): continue here, and open the pull request after the implementation.

**Governing records:**

- `RD-33`, which this plan implements;
- `RD-26`, whose property 2 it amends: what the flattener copies;
- [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md), which describes what the plugin implements.

## What changes

Today a trait's instance field is `trait-field`, and a member that reads a private name is `trait-member`. Only a private field that has no initializer, such as `#brand!: true`, is skipped. After this unit:

- **A trait may declare private instance members:** fields, with or without an initializer, methods, getters and setters. Its members and its fields' initializers read and write them.
- **The flattener copies them into the component and renames each private name per trait,** as it already gives a module-private binding a build-only name. So two traits, or a trait and the component, can each declare `#x`.
- **Any initializer is allowed,** `new Map()` included. It is linked and rewritten as a member's body is.

Nothing adopts the feature in this unit. `FocusForwarding` is its first adopter, in a unit that follows ([below](#the-first-adopter-follows)).

## The decisions

### 1. Initialization order

**The rule, the owner's:** _"It's a trait. It's not allowed to read the fields of whoever implements it, unless that is the bound, and the bound should already be initialized by then."_ So an initializer reads only:

- its own trait's private members;
- what the trait's bound declares;
- linked module bindings and globals.

A component's field isn't in the trait's type, so neither a precondition nor a diagnostic is needed for it.

**The bound is initialized when a trait's fields run.** The flattened class holds the trait's fields at the start of its body. So they run after `super()` returns, in trait-list order and, within a trait, in declaration order, before the component's own fields. `Composed` checks each trait's bound against the base alone (`Applicable<B>`), so the bound's members come from two places, and both are ready:

- **The base,** whose fields are initialized inside `super()`, before the derived class's fields. core's `ControlledElement` has two fields, `#internals` and `#controllers`, and it calls no member that a trait could supply while it is constructed.
- **A supertrait:** a trait whose class extends a composition. Its list is expanded before the trait, so its fields come earlier in the body.

Private methods and accessors are installed on the instance before any field of the class is initialized, so an initializer may call its own trait's private methods.

Two cases behave as in a hand-written class, and the plugin doesn't check them:

- an initializer that calls a member which reads a field initialized later;
- a base constructor that calls a member which a trait supplies.

### 2. Free references in initializers

An initializer goes through the same walker, links and rewrites as a member's body: its globals, its linked module bindings and their build-only exports. The walker gets an entry point for an expression, with the same allowlist. `super`, `eval`, `import.meta` and `arguments` are refused in an initializer, as they are in a member.

### 3. Private names

- **Renamed per trait.** Each private name the trait declares becomes `#<name>_<hash>` in the component. The hash is derived from the specifier the component reaches the trait's module through and the trait's class name, never from an absolute path, so the output doesn't depend on the checkout.
- **Fails closed.** A renamed name that equals another private name declared in the component's class body is an error. That includes the component's own names and another trait's renamed ones.
- **Only `this.#name`.** The private name's object is the member's or the initializer's own `this`, directly or inside an arrow function. Each other form is `trait-member`:
  - `other.#name`;
  - `#name in other`;
  - a private name inside a nested `function`.

  The reason: after renaming, `#name_<hash>` belongs to one component class. So `other.#name` works only when `other` is an instance of that same class, while the trait's type accepts an instance of any class with the trait. `instanceof` with the trait is the check across classes.

- **Read, write, call, update and compound assignment** of `this.#name` are allowed, and so is `this.#name` as an assignment or destructuring target.
- **A private field that no member or initializer of its trait references isn't copied.** It can't be observed, so leaving it out keeps the runtime the same. `#brand!: true` stays as it is today, with no special case for it.

### 4. What stays forbidden

- **A public instance field,** `trait-field`, as today.
  - A field is an own property of the instance. It would cover an accessor of the base or of an earlier trait, layer (b)'s attribute accessors included, which the copy rules and `Composed`'s kinds treat as prototype members.
  - The later-trait-wins rule would no longer hold: both initializers would run, and the later one would overwrite the earlier.
  - It would also be a public, enumerable key on every component.
- **A static private member,** `trait-member`. A static is linked, never copied, so the trait's module keeps one copy of each (`RD-26` property 3). Copying `static #registry = new Map()` would give each component its own. State shared across components is a module-scope binding, which is linked.
- **`accessor #x`,** a computed or private key on a public member, and everything else `trait-member` refuses today.

### 5. Duplicate traits in a list

A trait can occur twice in an expanded list, for example when two traits share a supertrait. Today it is copied twice, and the later copy can undo an override by a trait between them. A private field copied twice would be a duplicate private name, which doesn't parse.

**Decided: the expanded list keeps each trait's first occurrence.** That is the only order that keeps every supertrait ahead of each trait that extends it. No composition in the tree lists a trait twice today: the material-x build prints no `trait-member-conflict`, which a repeat would cause. So this changes no current output.

### 6. Layer (b) and the declarations

- **Layer (b) doesn't change.** `accessor name!: T` lines and `@attributes(TABLE)` lower as before. An attribute trait may also declare private members, which layer (b) leaves as they are.
- **The declarations don't change in form.** The emitter writes `#private;` for a class with any ES-private member and drops the members, so a trait with private members gets one marker. `FocusForwarding` and `ButtonGroupLike` already carry it. The plan's proof 7 checks that `Composed` still typechecks with two such traits.
- **The IR** gains private members, and every private-name occurrence with its offsets, as links have. `TRAIT_IR_VERSION` becomes 4.
- **The trait module's own transform** exports a private binding that an initializer reads, as it does for a member. An application build also deletes the trait class's private instance members, along with its other instance members.
- **The conflict rules** don't see private members. A renamed name never conflicts, and `trait-member-conflict`, `trait-accessor-half` and `class-accessor-half` don't count it.

### The first adopter follows

`FocusForwarding` replaces its module-level `WeakMap` with a private field in a unit of its own, after the owner answers the [question](#owner-question) below. Two reasons:

- **Module code can't reach a private name.** `useFocusForwarding(host, control)` writes the control, and `RD-31`'s sortable list reads it. Both are module functions, and an ES-private name exists only inside its class body. So the trait needs a member that module code calls, and what kind of member is a choice of its own. A plain public member is on every adopter's prototype, where `traits-baseline` and the public surface see it. A member keyed by a module-scope `Symbol` would need the plugin to link a computed key, which it refuses today.
- **`RD-31` is implementing on that registry now** (#90): the sortable list reads an item's control from it. Changing the registry in the same days would collide.

## Required properties

1. **A trait's private instance fields, methods and accessors are copied into every component that lists the trait,** with their initializers. Each instance has its own state, so two instances don't share a `new Map()`.
2. **The flattened component behaves as the hand-written class** that declares the same private members under the renamed names. Its prototype keys, its own keys and its `observedAttributes` are those of a component without them, plus nothing.
3. **Private names are renamed per trait,** deterministically, and an equal name in the component's class body is an error.
4. **Order:**
   - the base's fields are initialized before any trait's fields;
   - a supertrait's fields come before its subtrait's;
   - the traits' fields run in list order, and within a trait in declaration order;
   - all of them run before the component's own fields.
5. **Each initializer's free references are linked as a member's are:**
   - a global;
   - an imported binding, imported again;
   - an exported binding;
   - a private module binding, through its build-only export;
   - a binding of the component's own module.

   This holds from source and from another package's built JavaScript.

6. **Only `this.#name` is accepted,** as decision 3 states. Every other form is `trait-member`, with a message that names the member and suggests `instanceof`.
7. **What stays forbidden is still an error, with its code:**
   - a public instance field is `trait-field`;
   - a static private member and `accessor #x` are `trait-member`.

   The codes' table and messages say what each one refuses now.

8. **The expanded list keeps each trait's first occurrence.**
9. **An unreferenced private field isn't copied.**
10. **Without an adopter, the build's output doesn't change:** core's and material-x's built JavaScript and declarations are byte-identical to `main`'s, and so are their size rows.
11. **The plugin document states what holds.** In [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md):
    - §Its members: the new members, the `this.#name` rule and the unreferenced field;
    - §The copy: the renaming and initializers;
    - §The emitted component: the order;
    - §A trait module's own transform: initializers' bindings and the application build;
    - §Trait IR: version 4;
    - §Diagnostics: the changed rows;
    - §Verification: the new tests.

    The document also gets a change-record row that states what it said before. It is the documentation this feature owes, so it goes in this unit's pull request (`RD-32`).

## Scope and boundaries

**In scope:**

- `packages/vite-traits-plugin`: the walker, the trait class's normalization, the trait module's transform, the annotation's expansion, the IR, the lowering, the rules, the diagnostics, and the tests and fixtures;
- the plugin document;
- the report.

**Out of scope:**

- `FocusForwarding` and every other trait's source;
- core's `composition.ts` types;
- layer (b);
- public instance fields;
- static private members;
- computed keys.

**Stop and report if:**

- a required property needs a change to `Composed`'s types or to a published package's public surface;
- core's or material-x's build output differs from `main`'s;
- the declarations typecheck fails for proof 7.

## Proofs

Each is a node test of the plugin, unless it says otherwise.

1. **Runtime equivalence.** A component composed from a trait with private fields, a private method and a private accessor pair is checked against a hand-written expected class (the `consumer.expected.ts` pattern). The test reads behavior through the public members and compares the prototype keys, the instance's own keys, `observedAttributes` and `instanceof`. The trait comes from source, and from another package's built JavaScript.
2. **Collision.** Two traits each declare `#x`, and the component declares `#x` too. Each member reads and writes its own, and the three values stay apart.
3. **Initializer.**
   - `#cache = new Map()`: two instances get two maps.
   - An initializer reads an imported binding, an exported binding and a private module binding, from source and from another package's built JavaScript.
4. **Order, run at runtime:**
   - two traits whose initializers record their order, then the component's own field: A, B, component;
   - a base with a field that a trait's initializer reads through its bound: the value is there;
   - a supertrait whose field a subtrait's initializer reads through the supertrait's public getter: the value is there, and the supertrait's field comes earlier in the emitted text.
5. **Duplicates.** Two traits share a supertrait, and the supertrait has a private field and a method that one of the traits overrides:
   - the supertrait is copied once, ahead of both;
   - its initializer runs once per instance;
   - the override holds.
6. **Diagnostics,** each with its position:
   - a public instance field;
   - a static private field and a static private method;
   - `other.#x`, `#x in o`, and `this.#x` in a nested `function`;
   - `super` and `arguments` in an initializer;
   - an initializer the walker doesn't model;
   - a renamed name that the component already declares.
7. **Declarations.** A tsdown build with declarations of a fixture trait with private members emits `#private;` and no private member. A typecheck of a component that composes two such traits and declares its own `#x` passes.
8. **The unreferenced field.** `#brand!: true` isn't copied, against expected text.
9. **The application build** deletes the trait class's private instance members, with `instanceof` still correct.
10. **Build identity, against `main`.**
    - Build `@ydinjs/core` and `@ydinjs/material-x` at `main` and at the branch.
    - Their JavaScript and declarations are byte-identical: compare the trees, and save the comparison under `checks/`.
    - The material-x build prints no `trait-member-conflict`.
    - The size rows are unchanged.
11. **Gates:**
    - `fmt`, `lint` and `typecheck` in the plugin;
    - the root `aube exec just test`;
    - the plugin's `boundary` test.

## Owner question

**How does module code reach a trait's private state?** The answer only affects `FocusForwarding`'s unit, which follows. This unit doesn't wait for it.

- **(a) A public member on the trait,** such as a `focusControl` accessor. It adds no plugin rule. It is on the prototype of every adopter, eight elements today, so `traits-baseline` and the public surface change, and a consumer can call it.
- **(b) A member keyed by a module-scope `Symbol` constant** that the trait's module exports, such as `[$control]`. No public name is added, because only module code that imports the symbol reaches it. The plugin would have to accept that one computed-key form. It would link the constant as it links a brand, and its conflict check would compare the keys by binding.
- **(c) Keep the `WeakMap`.** No change, and the field stays unused.

**The architect recommends (b):** it keeps the state internal, adds nothing to any element's public surface, and the symbol stays in one module.