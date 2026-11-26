# Plan: private instance members and constructors in traits (`RD-33`)

**In force by the owner's decision of 2026-11-21,** relayed by the coordinator, in translation: _"RD-33, both yes. And honestly I now lean toward implementing it now, just so we don't manage to write traits or components that contradict it."_ "Both" accepts two points of the architect's report: the `trait-list` refusal of a trait that the base's chain already composes ([Before `super()`](#before-super)), and a rule for the component's field initializers, symmetric with the trait's ([decision 8](#8-a-components-field-initializers)).

**Deferred earlier the same day, and resumed by the decision above.** The owner's words then, in translation: _"Let's defer RD-33. It's a good thing, but we'll implement it when a real user appears, or after we finish material-x, for its users. Put `constructor` in there too. I think it needs to be one unit."_ The constructor, [decision 7](#7-constructors), was added the same day, before any implementation, and is part of the same unit. Its first lowering was revised the same day on the owner's decisions, which also refuse `this` in a trait's field initializer (decision 1).

**Recipient:** the implementer. **Branch:** `repo/trait-private-fields-1`, from `main` at `640658b5c`. **Merge `origin/main` at `bd1dee7df` first.** Since `640658b5c` it changed only `packages/drag` (#94), so the merge touches no file this plan names, and the plan was re-checked against it ([below](#re-checked-against-main)). **Input:** the architect's commits on this file. **Decided** by the owner on 2026-11-21, relayed by the coordinator ([`RD-33`](../decisions/RD-33.md)). The plan and its implementation share this branch and one pull request (`RD-32`): continue here, and open the pull request after the implementation.

**Governing records:**

- `RD-33`, which this plan implements;
- `RD-26`, whose property 2 it amends: what the flattener copies;
- [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md), which describes what the plugin implements.

## What changes

Today a trait's instance field is `trait-field`, and a member that reads a private name is `trait-member`. Only a private field that has no initializer, such as `#brand!: true`, is skipped. After this unit:

- **A trait may declare private instance members:** fields, with or without an initializer, methods, getters and setters. Its members and its constructor read and write them.
- **The flattener copies them into the component and renames each private name per trait,** as it already gives a module-private binding a build-only name. So two traits, or a trait and the component, can each declare `#x`.
- **Any initializer that doesn't reference `this` is allowed,** `new Map()` included. It is linked and rewritten as a member's body is.
- **A trait may declare a constructor with no parameters.** The flattener inserts its body into the component's constructor, right after `super(…)`, so it runs once per instance after every field, supertrait before subtrait, before the component's own statements ([decision 7](#7-constructors)).
- **A component whose list has a trait with a constructor doesn't reference `this` or `super` in an instance field's initializer.** What it needs from a trait's constructor, it does in its own constructor, after `super(…)`. The plugin reports `component-field` ([decision 8](#8-a-components-field-initializers)).

Nothing adopts the feature in this unit, and no adopter is planned: `FocusForwarding` keeps its `WeakMap` ([below](#no-adopter-focusforwarding-keeps-its-weakmap)).

## The decisions

### 1. Initialization order

**The rule, the owner's:** _"It's a trait. It's not allowed to read the fields of whoever implements it, unless that is the bound, and the bound should already be initialized by then."_ **Narrowed 2026-11-21 by the owner,** with the constructor's revision: _"This is where to forbid it: a trait must not have `this` in a field initializer. If you want `this`, go to the constructor."_

**A trait's field initializer doesn't reference `this`.** Any `this` in it is `trait-member`, including one in an arrow function, which captures the instance, and one in a nested `function`, class or object method, so the rule needs no scope analysis. So an initializer reads only linked module bindings and globals, and reads no member, no private name and no other field. Its value can't depend on any field or constructor, so the order of fields and the order of constructors don't interact. `new Map()` stays allowed.

**Fields run in one order.** The flattened class holds the traits' fields at the start of its body, so they run after `super()` returns, in trait-list order and, within a trait, in declaration order, before the component's own fields. The order is observable only through an initializer's side effects on module state.

**A trait reads its own trait's members, its bound's members, linked module bindings and globals in its constructor and its members.** A component's member isn't in the trait's type, so neither a precondition nor a diagnostic is needed for it. When a trait's constructor body runs, every field is initialized and the base's constructor has returned. `Composed` checks each trait's bound against the base alone (`Applicable<B>`), so the bound's members come from two places, and both are ready:

- **The base,** whose fields and constructor run inside `super()`. core's `ControlledElement` has two fields, `#internals` and `#controllers`, and it calls no member that a trait could supply while it is constructed.
- **A supertrait:** a trait whose class extends a composition. Its list is expanded before the trait, so its constructor body runs earlier (decision 7).

Two cases behave as in a hand-written class, and the plugin doesn't check them:

- a base constructor that calls a member which a trait supplies, which then reads a trait's field before it is initialized;
- a trait's constructor that calls a member which a subclass of the component overrides, and which reads the subclass's field: that field is initialized only once the component's constructor has returned.

### 2. Free references in initializers

An initializer goes through the same walker, links and rewrites as a member's body: its globals, its linked module bindings and their build-only exports. The walker gets an entry point for an expression, with the same allowlist. `super`, `eval`, `import.meta` and `arguments` are refused in an initializer, as they are in a member, and so is `this` (decision 1).

### 3. Private names

- **Renamed per trait.** Each private name the trait declares becomes `#<name>_<hash>` in the component. The hash is derived from the specifier the component reaches the trait's module through and the trait's class name, never from an absolute path, so the output doesn't depend on the checkout.
- **Fails closed.** A renamed name that equals another private name declared in the component's class body is an error. That includes the component's own names and another trait's renamed ones.
- **Only `this.#name`.** The private name's object is the member's or the constructor's own `this`, directly or inside an arrow function. An initializer has no `this` (decision 1), so it names no private name. Each other form is `trait-member`:
  - `other.#name`;
  - `#name in other`;
  - a private name inside a nested `function`.

  The reason: after renaming, `#name_<hash>` belongs to one component class. So `other.#name` works only when `other` is an instance of that same class, while the trait's type accepts an instance of any class with the trait. `instanceof` with the trait is the check across classes.

- **Read, write, call, update and compound assignment** of `this.#name` are allowed, and so is `this.#name` as an assignment or destructuring target.
- **A private field with no initializer that no member or constructor of its trait references isn't copied.** Nothing observes it: no code names it, `#name in` is refused, and it runs nothing. So leaving it out keeps the runtime the same, and `#brand!: true` stays as it is today, with no special case for it.
- **A private field with an initializer is copied, whether or not anything references it.** The hand-written class runs its initializer once per instance, and an initializer's effects are observable: `#registered = registry.add(…)` calls an imported function. So the copy runs it too, in its place in decision 1's order, and checks it as every copied initializer is checked (decisions 1 and 2): `this` in it is `trait-member`. **Amended 2026-11-21** on the feature proof's `reviewer-1`; [`RD-33`](../decisions/RD-33.md) property 8 records what this said before.

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
- **The trait module's own transform** exports a private binding that an initializer or the constructor reads, as it does for a member. An application build also deletes the trait class's private instance members, along with its other instance members.
- **The conflict rules** don't see private members. A renamed name never conflicts, and `trait-member-conflict`, `trait-accessor-half` and `class-accessor-half` don't count it.

### 7. Constructors

**Added 2026-11-21 on the owner's word,** relayed by the coordinator: _"Put `constructor` in there too. I think it needs to be one unit."_ **Revised the same day on the owner's decisions,** relayed by the coordinator, after he asked why a trait's body isn't merged into the component's constructor: _"Just keep the sequence: supertrait → subtrait → component."_ With it came decision 1's refusal of `this` in an initializer. The first lowering, a hidden field per trait, is [not adopted](#not-adopted-a-hidden-field-per-trait). He also asked for a check of everything that comes before `super()`: [Before `super()`](#before-super).

#### The trait's constructor

**The accepted form is `constructor() { super(); … }`.** Each of these that doesn't hold is `trait-member`:

- **No parameters,** parameter properties included. A trait isn't constructed, so nothing passes it an argument: the component's arguments go to the base.
- **The first statement is `super();`, with no arguments, and no other `super` occurs.** The lowering drops that statement.
  - The call can't be refused. Every trait extends a bound or a composition, so it is a derived class, and TypeScript requires the call (`TS2377`, [probe](checks/constructor-lowering.txt)).
  - Arguments are refused because only the component's `super(…)` calls the base, so a trait's arguments would be dropped with their side effects.
  - A statement before the call is refused because it would run before the base's constructor, and the body is inserted after the component's `super(…)`. TypeScript accepts such a statement when it doesn't use `this`, so the plugin checks it.
- **No overload signature and no modifier.** A trait has at most one constructor, as any class has.

**What the body reads** is decision 1's: its own trait's private and public members, its bound's members, linked module bindings and globals, under decision 3's `this.#name` rule. A call to the trait's public member that a later trait or the component overrides runs the override, as it would in a hand-written class, and the plugin doesn't check it.

**What the body may not use,** each `trait-member`:

- `super`, other than the first statement;
- `arguments`, which in the component's constructor reads the component's arguments;
- `new.target`. In the component's constructor it is the constructed class, as in a hand-written chain, but no trait needs it, so the walker doesn't model it;
- `return`, with or without a value, outside a nested function. In the component's constructor it would end that constructor, so the later traits' bodies and the component's statements wouldn't run;
- `eval`, `import.meta`, and anything else the walker refuses in a member.

#### The lowering

**Each body, without its `super();`, becomes a block in the component's constructor,** right after the statement that is the component's `super(…)` call. The blocks follow the expanded list, which keeps each trait's first occurrence (decision 5). So a supertrait's block comes before its subtrait's, and each body runs once per instance. The component's statements after `super(…)` follow the blocks.

**The resulting order,** per instance ([probe](checks/constructor-insertion.txt)):

1. the component's statements before `super(…)`, and `super(…)`'s arguments;
2. the base: its fields and its constructor;
3. every trait's fields, in list order, then the component's own fields;
4. every trait's constructor body, in list order;
5. the component's statements after `super(…)`.

A subtrait's body sees its supertrait's body's effects. **A component's field initializer runs before every trait's body,** so a field that reads what a trait's constructor sets up reads it too early. That follows from the owner's sequence. The component's types include the trait's members, so TypeScript doesn't catch it, and the plugin refuses `this` and `super` in such a component's field initializers ([decision 8](#8-a-components-field-initializers)).

**When the component has no constructor,** the plugin generates `constructor(...args) { super(...args); … }` with the blocks. It forwards the arguments as the implicit constructor does, and it parses as both TypeScript and JavaScript. A list with no trait constructor changes no constructor and generates none, so no current output changes.

**Each body is a block** so that its `let` and `const` are its own: a body and a parameter of the component's constructor, or two bodies, can each declare `value`. In one scope, the second declaration is a syntax error ([probe](checks/constructor-insertion.txt)). The walker refuses `var` and function declarations, which would hoist out of the block.

**A name the body reads resolves as in the trait's module,** or the plugin reports `trait-binding-shadowed`. The existing rule covers the component's module and class, and it extends to the component's constructor: a parameter, a declaration at the constructor's top level, before or after `super(…)`, and a `var` anywhere in it. A linked binding's alias is generated, and a collision with one is reported in the same way.

**The rest is as for a member:**

- the body's private names are renamed with its trait's (decision 3), and they are declared in the same class body, so the component's constructor reaches them;
- the copy rule applies to the body's text (`trait-source-language`);
- the trait module's own transform exports a private binding that the body reads, and an application build deletes the trait class's constructor with its other instance members;
- the trait's declarations gain `constructor();`. `Composed` reads only a trait's instance type and statics, and `Applicable<B>` accepts a constructor with no parameters, so the composition's types don't change;
- the IR holds the body as it holds a member's: its text, its links, its globals and its private-name occurrences, with the span of the `super();` it drops.

#### Finding the component's `super(…)`

**TypeScript doesn't guarantee a root-level `super(…)` in this repository** ([probe](checks/constructor-insertion.txt)):

- `TS2401` requires one in a class with initialized fields, parameter properties or private names, but only where TypeScript lowers class fields: with `target` `es2020`, or with `useDefineForClassFields` off.
- `tsconfig.base.json` sets `target` `esnext` and `useDefineForClassFields`. There, TypeScript accepts a `super(…)` in each branch of an `if`, in a class with a field or a private name.
- `TS2337` refuses a `super()` in an arrow function, in TypeScript only. A JavaScript component isn't type-checked at all.

The coordinator's note named `TS2376`. The check that requires a root-level call is `TS2401`, and it doesn't apply here.

**So the plugin checks the component's constructor itself,** when the expanded list has a trait with a constructor:

- it has exactly one `super(…)` call, counting nested functions;
- that call is the whole expression of a statement at the constructor's top level.

Otherwise the plugin reports `component-constructor`, a new code, at the call, or at the constructor when there is no call. Each component constructor in material-x today starts with such a statement: `super()`, or `super(template)` in `TextField`.

#### Before `super()`

The owner asked for a check of everything that comes before `super()`, since it _"may cause some problems too"_. For each case: where the blocks go, whether the order above holds, and what is refused.

- **Statements in the component's constructor before `super(…)`,** which JavaScript allows when they don't use `this`.
  - The blocks go after `super(…)`, so these statements run first, before the base, as they do without traits. The order holds, with these statements as step 1.
  - Their declarations are in scope for the blocks, so a block that reads one of their names is `trait-binding-shadowed`.
  - A statement that throws, or returns an object, before `super(…)` ends the construction: no field and no body runs, as in a hand-written class.
- **`super(…)`'s arguments with side effects.** They're evaluated before the base's constructor, in step 1, and the blocks follow the whole statement.
  - The statement must be the `super(…)` call alone. `super(), (this.ready = true);` and `const self = super();` would run the component's code before the traits' bodies, so each is `component-constructor`.
  - An argument may be any expression except one that holds another `super(…)`.
- **The trait's own `super()`,** which the plugin drops. It must be `super();`, first and without arguments. Arguments and statements before it are `trait-member`, because neither has a place after the component's `super(…)`.
- **A nested `super(…)`,** in an `if`, a `try`, a conditional expression or an arrow function, where the language allows it. No single point follows every path, so it is `component-constructor`. Inserting the blocks after each call would work for an `if`'s branches, but not for an arrow called later. The author computes the arguments first and calls `super(…)` once.
- **A component whose base is itself a component,** flattened or hand-written. The base's whole construction happens inside the component's `super(…)`, including the traits' bodies of any flattened class in its chain. So each class in the chain keeps the order for its own traits, and the blocks go after the component's `super(…)` as before.
- **A subclass of a component,** hand-written or itself a composition. Its `super(…)` runs the component's whole construction, the traits' bodies included, before the subclass's fields. So the order holds per class. A trait's body that calls a member which the subclass overrides reaches the override before the subclass's fields are initialized: decision 1's second unchecked case.
- **A trait that the base's chain already composes** is refused when the trait has a constructor or private instance members that the flattener copies. The code is `trait-list`. **Accepted by the owner on 2026-11-21** ("both yes", above).
  - Such a component gets a second copy of the trait: a second set of private fields, and a constructor body that runs twice per instance, once in each class. For example, a listener is added twice, and the base's copy of the body calls the component's copy of a public member before its private fields exist.
  - The plugin finds the chain's traits by their brands: the composition's list in a base's source, or the brands passed to `impl(this, …)` in a built base's static block, compared by module and export.
  - A chain the walk can't read is an error too, when the list has such a trait.
  - A trait with neither stays as it is today. A private field that isn't copied doesn't count (decision 3): `FocusForwarding`'s and `ButtonGroupLike`'s `#brand!: true` leave both traits as they are.
  - No composition in the tree has a flattened base. The sixteen in `packages/*/src` at `bd1dee7df` all compose `ControlledElement`, and so does `RD-31`'s `SortableList`, the seventeenth on `repo/list-sortable-1` ([check](checks/component-field-this.txt)).

#### Not adopted: a hidden field per trait

The first lowering put each body in the initializer of a generated private field, `#constructor_<hash> = (() => { … })();`, after the trait's last field. **The owner chose the sequence supertrait → subtrait → component instead,** and refused `this` in an initializer, so that fields can't depend on constructors (decision 1). The hidden field existed to run each body between its trait's fields and the next trait's, for an initializer that read what a constructor set up. With no `this` in an initializer, no such initializer exists. The field also cost every instance a private slot per trait with a constructor, and every construction an arrow. What its reasoning said, rejecting this decision's lowering: _"Code in the component's constructor runs after every field, the component's included, because a derived class initializes its fields when `super()` returns. So the component's fields would run before the traits' constructors. The plugin would also write or edit the component's constructor and forward its arguments."_ The owner accepts the first consequence ([the resulting order](#the-lowering)). The second is this decision's lowering. The probe of the hidden field stays as [evidence](checks/constructor-lowering.txt), and so does its proof that `#constructor` is a reserved private name.

### 8. A component's field initializers

**Decided 2026-11-21 by the owner,** relayed by the coordinator, as the second point of "both yes": _a component that needs what a trait's constructor sets up does it in its constructor, not in a field initializer._ It is decision 1's rule seen from the component. A trait's field can't depend on a constructor, and with this rule neither can the component's.

**The plugin holds it with a diagnostic.** When the expanded list has a trait with a constructor, an instance field initializer of the composing class doesn't reference `this` or `super`.

- Any `this` or `super` in it is `component-field`, a new code, reported at the token.
- As in decision 1, that includes one in an arrow function and in a nested `function`, class or object method, so the rule needs no scope analysis.
- An `accessor` field's initializer is checked as a field's is.
- `super` counts because `super.method()` in an initializer calls the base's member on the instance.
- The message says to move the initialization into the constructor, after `super(…)`.

**Not checked,** because no trait's body runs after them:

- a component whose list has no trait with a constructor, so no current component is checked;
- a static field or a static block;
- a field of a class that extends the component, hand-written or itself a composition: it runs after its own `super(…)` returns, so after the component's whole construction, the traits' bodies included. A subclass that is a composition is checked for its own list's traits, as any composing class is.

**Why a diagnostic, not a precondition:**

- **The failure is silent.** The component's types include the trait's members, so a field that reads one typechecks. It then reads state that isn't set up yet: `undefined`, or a call that throws on it.
- **The owner wants the rule so that no component contradicts it,** and a documented precondition doesn't stop one.
- **It adds no pass.** The plugin already reads the composing class's body, for decision 3's collisions and decision 7's `super(…)`, and the check walks its field initializers there.
- **It costs no current component anything:** no composing class has an instance field initializer ([below](#todays-components)).

**Why every `this`, not only one evaluated while the initializer runs:**

- **An initializer names the instance only through `this` or `super`.** It can reach it otherwise only indirectly, such as through a DOM query while the element is upgraded, and the plugin doesn't model that, as in a hand-written class.
- **A `this` inside an arrow function isn't safe on its own.** It is safe only if nothing calls the arrow before the traits' bodies run, and `(() => this.x)()`, `[1].map(() => this.x)` and any callee that calls a callback at once each call it immediately. Telling them apart needs to know what each callee does. A rule that accepted arrows would let these through, and the failure would stay silent ([witness](checks/component-field-this.txt)).
- **The cost is an event handler written as an arrow field,** such as `#onClick = () => this.toggle()`. In a component whose list has a trait with a constructor, it moves into the constructor after `super(…)`. That is where the repository's components set up their listeners today, through `useEvents` and the other controllers.

#### Today's components

Read with a [probe](probes/component-field-this.ts) over every class that extends a composition in `packages/*/src`, on `origin/main` at `bd1dee7df` and on three open branches: `repo/list-sortable-1` at `59650e176`, `material-x/list-roles-1` at `1deacdc54` and `core/context-late-provider-1` at `ce1544fed`. The output and a witness fixture that the probe does flag are in [`checks/component-field-this.txt`](checks/component-field-this.txt).

- **No composing class has an instance field with an initializer.** The only instance field is `TextFieldCore`'s `readonly #input: InputElement;`, which its constructor assigns.
- **The `static override formAssociated = true` fields** of seven components are static, and aren't checked.
- **No trait has a constructor yet,** since this unit adds it, so nothing reports `component-field` until a trait declares one.

So the rule breaks no component, on `main` or on the open branches.

### No adopter: `FocusForwarding` keeps its `WeakMap`

**Answered 2026-11-21 by the owner,** relayed by the coordinator: **(c), keep the `WeakMap`.** His reason: a member keyed by a `Symbol` isn't readable under `isolatedDeclarations`, and it isn't true privacy either. So no unit follows this one to adopt the feature in `FocusForwarding`. The plan said: _"`FocusForwarding` replaces its module-level `WeakMap` with a private field in a unit of its own, after the owner answers the question below."_ Its reasons were:

- **Module code can't reach a private name.** `useFocusForwarding(host, control)` is a module function that writes the control, and an ES-private name exists only inside its class body. So the trait needs a member that module code calls, and what kind of member is a choice of its own. A plain public member is on every adopter's prototype, where `traits-baseline` and the public surface see it. A member keyed by a module-scope `Symbol` would need the plugin to link a computed key, which it refuses today.
- **Corrected on 2026-11-21:** this said that `RD-31`'s sortable list reads the control from the registry, and gave as a second reason that `RD-31` was implementing on it. Since `6214e3b57`, an item writes on its own control through context, so `RD-31` doesn't depend on the registry or on this unit.

## Required properties

1. **A trait's private instance fields, methods and accessors are copied into every component that lists the trait,** with their initializers. Each instance has its own state, so two instances don't share a `new Map()`.
2. **The flattened component behaves as the hand-written class** that declares the same private members under the renamed names. Its prototype keys, its own keys and its `observedAttributes` are those of a component without them, plus nothing.
3. **Private names are renamed per trait,** deterministically, and an equal name in the component's class body is an error.
4. **Order:**
   - the base's fields and constructor run before any trait's fields;
   - a supertrait's fields come before its subtrait's;
   - the traits' fields run in list order, and within a trait in declaration order;
   - all of them run before the component's own fields;
   - every field runs before any trait's constructor body (property 11).
5. **A trait's field initializer doesn't reference `this`,** in an arrow function or a nested function either. Any `this` in it is `trait-member`.
6. **Each initializer's free references are linked as a member's are:**
   - a global;
   - an imported binding, imported again;
   - an exported binding;
   - a private module binding, through its build-only export;
   - a binding of the component's own module.

   This holds from source and from another package's built JavaScript.

7. **Only `this.#name` is accepted,** as decision 3 states. Every other form is `trait-member`, with a message that names the member and suggests `instanceof`.
8. **What stays forbidden is still an error, with its code:**
   - a public instance field is `trait-field`;
   - a static private member and `accessor #x` are `trait-member`.

   The codes' table and messages say what each one refuses now.

9. **The expanded list keeps each trait's first occurrence.**
10. **A private field with no initializer that nothing in its trait references isn't copied.** One with an initializer is copied and checked like any other, referenced or not.
11. **A trait's constructor body runs once per instance, inserted into the component's constructor,** as decision 7 lowers it:
    - as a block right after the component's `super(…)` statement, in expanded-list order, supertrait before subtrait, before the component's statements after `super(…)`;
    - in a generated `constructor(...args) { super(...args); … }` when the component has none, and with no change to a component whose list has no trait constructor;
    - with decision 1's reads and decision 3's `this.#name` rule;
    - with no change to the component's own keys or prototype keys.

    These are errors, each at its position:
    - `trait-member`: a parameter; a trait's `super` that isn't the first statement, `super();` with no arguments; a statement before it; `arguments`, `new.target`, and a `return` outside a nested function;
    - `component-constructor`: a component's constructor that doesn't have exactly one `super(…)` call, counting nested functions, as the whole expression of a statement at its top level;
    - `trait-binding-shadowed`: a name the body reads that the component's constructor binds;
    - `trait-list`: a trait with a constructor or private instance members that the base's chain already composes, or a chain that can't be read when the list has such a trait.

12. **A component's field initializer doesn't reference `this` or `super`** when its expanded list has a trait with a constructor, as decision 8 states. Any `this` or `super` in an instance field's or an `accessor` field's initializer of the composing class, in an arrow function or a nested function too, is `component-field`, at the token. A component whose list has no trait with a constructor, a static field and a subclass's field aren't checked.
13. **Without an adopter, the build's output doesn't change:** core's and material-x's built JavaScript and declarations are byte-identical to those of the `main` last merged into the branch, and so are their size rows.
14. **The plugin document states what holds.** In [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md):
    - §Its members: the new members, the constructor's form, the `this.#name` rule and the unreferenced field;
    - §The copy: the renaming, initializers and the constructor's body;
    - §The emitted component: the order, the inserted blocks, the generated constructor, the component's `super(…)` rule and its field-initializer rule;
    - §A trait module's own transform: initializers' and the constructor's bindings, and the application build;
    - §Trait IR: version 4;
    - §Diagnostics: the changed rows, and the new `component-constructor` and `component-field`;
    - §Verification: the new tests.

    The document also gets a change-record row that states what it said before. It is the documentation this feature owes, so it goes in this unit's pull request (`RD-32`).

## Scope and boundaries

**In scope:**

- `packages/vite-traits-plugin`: the walker, the trait class's normalization with its constructor, the trait module's transform, the annotation's expansion with the base chain's traits, the IR, the lowering with the component's constructor, the rules, the diagnostics, and the tests and fixtures;
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

## Re-checked against `main`

**On 2026-11-21, against `origin/main` at `bd1dee7df`,** when the owner put `RD-33` in force. Nothing that this plan reads moved:

- **`main` since `640658b5c`** changed only `packages/drag`, its tests and its record (#94). No file in `packages/vite-traits-plugin`, core's `traits/`, the plugin document or `packages/material-x/src` changed, so every count and quotation above still holds.
- **`RD-33` is still the next free number.** `RD-32` is the highest on `main` and on every other branch on `origin`.

**The open branches,** read at the commits named in decision 8. None changes the plugin, `composition.ts`, `focus-forwarding.ts` or the plugin document:

- **`RF-69`,** `core/context-late-provider-1`, plans a change to core's `useContext` and so far changes only records. It doesn't meet this plan.
- **`RD-31`,** `repo/list-sortable-1`, deletes core's `Reorderable` trait, adds `SortableList`, a seventeenth composition on `ControlledElement`, and composes `FocusForwarding` into `mx-list-item`. `FocusForwarding` keeps its `WeakMap`, and its `#brand!: true` isn't copied, so no trait in it has a constructor or a copied private member, and `trait-list`'s new refusal doesn't apply. It changes `traits-baseline.json` and material-x's output, so if it merges first, proof 12 compares against the `main` that includes it.
- **`material-x/list-roles-1`** changes list tests and the accessibility document only.

## Proofs

Each is a node test of the plugin, unless it says otherwise.

1. **Runtime equivalence.** A component composed from a trait with private fields, a private method and a private accessor pair is checked against a hand-written expected class (the `consumer.expected.ts` pattern). The test reads behavior through the public members and compares the prototype keys, the instance's own keys, `observedAttributes` and `instanceof`. The trait comes from source, and from another package's built JavaScript.
2. **Collision.** Two traits each declare `#x`, and the component declares `#x` too. Each member reads and writes its own, and the three values stay apart.
3. **Initializer.**
   - `#cache = new Map()`: two instances get two maps.
   - An initializer reads an imported binding, an exported binding and a private module binding, from source and from another package's built JavaScript.
4. **Order of fields, run at runtime:** two traits whose initializers record their order in a module-scope array, then the component's own field: A, B, component. The supertrait's field comes earlier in the emitted text than its subtrait's.
5. **Duplicates.** Two traits share a supertrait, and the supertrait has a private field and a method that one of the traits overrides:
   - the supertrait is copied once, ahead of both;
   - its initializer runs once per instance;
   - the override holds.
6. **Diagnostics,** each with its position:
   - a public instance field;
   - a static private field and a static private method;
   - `other.#x`, `#x in o`, and `this.#x` in a nested `function`;
   - `super` and `arguments` in an initializer;
   - `this` in an initializer, directly, in an arrow function and in a nested `function`;
   - an initializer the walker doesn't model;
   - a renamed name that the component already declares.
7. **Declarations.** A tsdown build with declarations of a fixture trait with private members emits `#private;` and no private member, and one with a constructor emits `constructor();`. A typecheck of a component that composes two such traits, one of them with a constructor, and declares its own `#x` passes.
8. **The unreferenced field.**
   - `#brand!: true` isn't copied, against expected text.
   - An unreferenced `#unused = rec(…)` is copied, renamed, and its effect runs in the flattened component as in the hand-written class, in the same order. The feature proof's trait `E` and its classes `KE` and `KEHand` are that fixture.
   - `this` in an unreferenced field's initializer is `trait-member`, at its position.
9. **The application build** deletes the trait class's private instance members, with `instanceof` still correct.
10. **Constructors,** against a hand-written expected class as in proof 1:
    - order: a base with a field and a constructor, two traits, each with a field and a constructor, and the component's own field and constructor record their order. It is: the component's statement before `super(…)`, `super(…)`'s argument, the base's field and constructor, A's field, B's field, the component's field, A's body, B's body, the component's statements after `super(…)`;
    - a supertrait's body sets up state that its subtrait's body reads through the supertrait's public getter: the value is there;
    - a body reads its bound's field, its own trait's private field, calls its own private method, and reads an imported binding, an exported binding and a private module binding, from source and from another package's built JavaScript;
    - in proof 5's shape, a shared supertrait's body runs once per instance;
    - a component with no constructor gets the generated one, and `new X(1, 2)` passes both arguments to the base;
    - a component's constructor parameter and a body's `const` have one name, and both values stay apart;
    - a subclass of the component, hand-written, with a field and a constructor: the component's whole order runs, then the subclass's field and body;
    - a component whose base is a flattened component: each class's traits' bodies run after its own `super(…)`;
    - the emitted text: `super();` dropped, one block per body after the component's `super(…)` statement, and no generated field;
    - a list with no trait constructor leaves the component's constructor's text as it is;
    - diagnostics, each with its position: in a trait, a parameter, a parameter property, a missing first `super();`, `super(x)`, a statement before `super();`, a second `super`, `arguments`, `new.target`, a bare `return` and `return x`, with a nested function's `return x` accepted; in a component, no `super(…)` call, two calls, one in each branch of an `if`, one in an arrow function, `super(), (this.x = 1);` and `const self = super();`; a body reading a name the component's constructor binds; a trait with a constructor that the base's chain already composes, from source and from a built base, and one with only `#brand!: true` that it composes, accepted.
11. **The component's field initializers,** with a trait with a constructor in the list:
    - `component-field`, at the token: `this.x` directly, `() => this.toggle()`, `[1].map(() => this.x)`, `this` in a nested `function` and in an object method, `super.method()`, and `this` in an `accessor` field's initializer;
    - accepted: an initializer without `this` or `super`, such as `new Map()`; a static field that reads `this`; and the same initialization moved into the constructor after `super(…)`, which reads the trait body's state at runtime;
    - accepted with no trait constructor in the list: the same `this` initializers, and their output is unchanged;
    - accepted: a hand-written subclass of the component whose field reads the trait body's state, and reads it set up at runtime.
12. **Build identity, against `main`.**
    - Build `@ydinjs/core` and `@ydinjs/material-x` at the `main` last merged into the branch and at the branch.
    - Their JavaScript and declarations are byte-identical: compare the trees, and save the comparison under `checks/`.
    - The material-x build prints no `trait-member-conflict`.
    - The size rows are unchanged.
13. **Gates:**
    - `fmt`, `lint` and `typecheck` in the plugin;
    - the root `aube exec just test`;
    - the plugin's `boundary` test.

## Owner question

**Answered 2026-11-21: (c).** The section [above](#no-adopter-focusforwarding-keeps-its-weakmap) records the owner's reason. The question as it was asked:

**How does module code reach a trait's private state?** The answer only affects `FocusForwarding`'s unit, which follows. This unit doesn't wait for it.

- **(a) A public member on the trait,** such as a `focusControl` accessor. It adds no plugin rule. It is on the prototype of every adopter, eight elements today, so `traits-baseline` and the public surface change, and a consumer can call it.
- **(b) A member keyed by a module-scope `Symbol` constant** that the trait's module exports, such as `[$control]`. No public name is added, because only module code that imports the symbol reaches it. The plugin would have to accept that one computed-key form. It would link the constant as it links a brand, and its conflict check would compare the keys by binding.
- **(c) Keep the `WeakMap`.** No change, and the field stays unused.

**The architect recommends (b):** it keeps the state internal, adds nothing to any element's public surface, and the symbol stays in one module.