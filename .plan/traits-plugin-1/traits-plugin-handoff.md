# Handoff: the trait flattener does what its document says (`RF-44`)

**Recipient:** the implementer.

**Branch:** `repo/traits-plugin-1`, from `origin/main` at `83a985b99`, in slot `d`. **Input:** the architect's commit that adds this file.

**Authorized** by the owner's queue, relayed by the coordinator on 2026-11-18: plan `RF-44`. The owner hasn't yet chosen how `RF-44`'s required property is met. [The owner's question](#the-owners-question) below asks him. Item 1 is needed under either answer, so it can start now. Items 2 and 3 wait for the answer.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RF-44`, amended 2026-11-18 by this plan;
- `repo:RF-33`, its entries of 2026-11-17: the per-class forward ships, and the trait parked at `92e13f9d6` waits for `RF-44`;
- [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md), narrowed 2026-11-18 by this plan to what the plugin implements once item 1 is in;
- the architect's [probes](checks/rf44-probes.txt), P1 to P3.

## What the architect read

**Observed,** at `83a985b99`:

- **No path normalizes a class-based trait.** `analyzeModule` hands every trait to `normalizeDescriptorTrait`, and the generic `trait` of `@ydinjs/core/traits/primitives.js` doesn't match its factory pattern. A composition that contains one throws `unsupported-trait` (P1, case C).
- **A bailout retains every site in the module,** not only its own. In P1 case B, the module's first site has only descriptor traits, and it is lost with the second. The document said that analysis is transactional per site. No material-x module has two `impl` sites, so nothing ships differently today.
- **The parse cache is keyed by module id only.** P1 first ran its three cases under one id, and the second and third cases got the first case's program. The document said that the cache is keyed by id and source.
- **A cyclic trait-list reference overflows the stack** (P2). It is a `RangeError`, which is a build error. The document listed cycles among the bailouts.
- **The lowered shape changes two behaviors** (P3). The plugin inserts a trait's accessors into the component's own class body. So a getter that the class declares alone joins the trait's setter: assignment then succeeds, where at runtime it throws. And `super.key` in the class reaches the base, not the trait's accessor. No material-x class does either today: `TextFieldCore` overrides both halves of `value`, and no class reads a trait's key through `super`.
- **The document described a package that doesn't exist.** It placed the plugin in `.scripts/flattener` as a private `constructTraitFlattenerPlugin()`, said that it recognized imports by resolving them, and named an IR debug mode. The package is the public `@ydinjs/vite-traits-plugin`, whose export is `viteTraitsPlugin()`. It matches import specifiers against patterns, which still list the pre-rename modules `traits` and `piirre`, and it has no debug mode.
- **The only class-based trait in the repository's history** is the parked `FocusForwarding` (`92e13f9d6`). It is a module-scoped `trait((base) => class extends base { override focus(options) { controls.get(this)!.focus(options); } }, $focusForwarding)`. Its one member is a method. It has no `super`, constructor, field or static member, and it references only `this`, its parameter and one private module binding, the `controls` `WeakMap`.
- **`oxc-parser` has no scope analysis** (its options say that the parser constructs no symbols or scopes). Free identifiers in a copied member would need a walker in the plugin, or a dependency.

**Derived, not measured:** flattening copies a trait's member into each adopting class. So the flattened trait form of the forward would ship about what the per-class form ships: seven `focus()` bodies either way, plus one brand per adopter in the trait form. Its gain is in source and types, not bytes. Item 3 measures it.

## The owner's question

`RF-44`'s required property is met in one of two ways: the plugin flattens the generic subset that the document described, or the document states only what the plugin implements. **The question:** _does the plugin also flatten a narrow class-based subset, method traits, so that the focus forward moves to the trait the owner chose on 2026-11-17? Or does it stay descriptor-only, so that the forward stays per-class until Firefox's own delegation removes it?_

| Answer | Items | What ships |
| --- | --- | --- |
| **B.** Descriptor-only; the document is narrowed. | 1 | The plugin as today, with item 1's repairs. The forward stays per-class, and `RF-33`'s move to a trait is dropped. |
| **C.** B, then method traits. | 1, 2 and 3 | B, with method traits flattened, and the forward as the trait parked at `92e13f9d6`. |

**The architect recommends C.**

- The owner chose the trait form on 2026-11-17 and declined only its cost, the retained compositions. C removes that cost and nothing else. B makes the chosen form unreachable for as long as the forward ships.
- C's subset is the smallest one that the only class-based trait needs, and it is closed: every other class-based trait is retained with a warning, as today. A later trait of the same shape is flattened with no further work.
- B is C's first item. Item 1 is needed under either answer, so no work is lost by starting it before the answer.

**Not adopted:**

- **The generic subset as the document described it:** constructors with staged `super`, field and static initialization order, `super` lowered through helpers, and accessors merged across layers. That is a compiler for class semantics, with no consumer. CONTRIBUTING §2.2 asks for the smallest structure that matches the actual extension contract. The document's own fixture list for it was never built.
- **Retaining only the unsupported trait,** not its whole composition: `class X extends Trait(class extends Base { … })`. It bounds what any unsupported trait costs. But it changes the plugin's unit of retention, which is a contract decision of its own. It still ships the generic `trait` runtime and an extra prototype layer per adopter, and nothing needs it now.

## Item 1. The plugin does what the narrowed document says

**Needed under both answers.** [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md) now states the target. Its change record lists what the code owes.

**Required properties:**

1. **Per-site transactions.** A bailout at one `impl` site retains only that site. Every other eligible site in the module is flattened, and the bailout's warning is still emitted.
2. **The parse cache is keyed by id and source.** A module whose source differs from the cached one is parsed again.
3. **A cyclic trait-list reference warns** with `unsupported-trait-list` and retains its site. It isn't a build error.
4. **The component class keeps its meaning.** A site is retained, with a stable reason code, when its class:
   - declares only a getter, or only a setter, for a key that a trait supplies as an accessor;
   - reads or writes `super.key` for a key that a trait supplies, `super.observedAttributes` included; or
   - uses a computed `super[key]`.
5. **Only the current module names are recognized.** The `impl` pattern names `attributes` and `primitives` of `@ydinjs/core/traits/`, and the descriptor factory pattern names `attributes`. The pre-rename names `traits` and `piirre` go, under CONTRIBUTING §8. No workspace module imports through them: the architect's search over `packages/*/src` and `packages/*/tests` found none, outside the plugin's own patterns.
6. **The fixtures that the document's §Verification names exist and pass.** The new ones are the two-site module, the cyclic list, the parse cache's source key, an accessor half, `super.key` for a trait's key, a computed `super[key]`, and a full accessor-pair override that still flattens.

**The discriminating check.** No material-x or core class hits property 4, and no source module of either package has two sites. core's test modules with two sites import `impl` through a relative specifier, which the plugin doesn't recognize. So item 1 changes no emitted JavaScript. `@ydinjs/core`'s and `@ydinjs/material-x`'s built JavaScript is byte-identical before and after item 1, and the material-x build prints no flattener warning. Save both readings under `checks/`.

**Stops:**

- the built JavaScript of either package changes, or a flattener warning appears. Then a live class hits a rule that the architect read as unused, and the architect decides;
- a property needs a change to `@ydinjs/core`.

## Item 2. Method traits are flattened

**Only on answer C.** When the implementer reports item 2, the architect widens the document from this section.

**An eligible class-based trait:**

- is a module-scoped declaration initialized directly by the generic `trait(transformer, brand)`, recognized from `@ydinjs/core/traits/primitives.js` or a module named `primitives`, the same way the descriptor factory is recognized from `attributes`;
- has a named symbol binding as its brand;
- has a transformer that is an arrow function or a function expression with one identifier parameter, which may be typed. Its body is a class expression that extends that parameter, or a block whose only statement returns one;
- has a class with no name, or with a name that its body never references;
- has only non-static methods, getters and setters with static identifier or string-literal keys. Members that emit no JavaScript, such as an index signature, are allowed. A constructor, a field, a static member or block, a private name, a decorator, a computed key or an `accessor` member retains the composition.

**A member's body:**

- contains no `super` and no direct `eval`, and doesn't reference the transformer's parameter;
- resolves every free identifier in the consumer to the binding that it resolves to in the origin. An identifier that names an origin module binding or import is linked the way a descriptor converter is: an import, an existing export, or a synthetic export of a private binding. A global keeps its name, and a site is retained when the consumer module binds that name at top level or the consumer class has that name;
- is analyzed conservatively: a construct that the free-identifier analysis doesn't model retains the trait. The analysis is a walker in the plugin. **A new dependency for scope analysis is a stop:** report the candidates and their cost.
- is copied as the origin's source text. When the origin is TypeScript and the consumer isn't, the site is retained.

**With the composition's other layers:**

- generic members are inserted in trait order, together with the descriptor accessors, before the class's own members;
- a site is retained when a later layer, a trait or the class, declares only a getter or only a setter for a key that an earlier layer declares as an accessor. Any other repeated key takes the later layer's definition, as at runtime;
- a site is retained when a later layer reads or writes `super.key` for a key that a flattened layer supplies, which extends item 1's property 4 to generic members;
- a linked binding is the origin's live binding. In the forward's case, the `WeakMap` that `useFocusForwarding` writes is the one that the flattened `focus()` reads;
- the brand is installed as a descriptor brand is, and the generic `trait(...)` calls are marked pure.

**In the IR:** a generic member is an IR node with its key, its kind, its source text and its free-binding table. Lowering consumes only the IR, and `TRAIT_IR_VERSION` is bumped.

**Fixtures.** Runtime equivalence of the composed and flattened classes:

- a trait method, alone and overridden by the class;
- the brand and `instanceof`;
- a private binding's identity across a `use*` function and the flattened member;
- a subclass whose own `focus()` calls `super.focus()` and reaches the flattened member;
- a trait in the consumer module, in another module, and in another package's built JavaScript.

A negative fixture for each retained case above.

**Stops:**

- the forward's trait, as parked, needs anything outside this subset;
- the free-identifier analysis can't be made conservative without a dependency.

## Item 3. The focus forward moves to the trait

**Only on answer C, and only while `RF-33`'s forward ships.** If `mx-button`'s _"should delegate focus to the native button through the shadow root alone"_ passes in Firefox, stop: the forward goes, and no trait is needed.

**Required properties:**

- `FocusForwarding`, as parked at `92e13f9d6`, replaces the seven per-class `focus()` declarations and `focusControl`. Its adopters are the seven hosts that register a control, through their own trait lists, and not `BUTTON_CORE_TRAITS`. That was `RF-33`'s ruling for the trait, and it stands;
- `RF-33`'s required properties hold: `Object.hasOwn(host, 'focus')` is false for each of the seven, the subclass rows pass in every engine, and the Firefox rows pass;
- material-x's build prints no flattener warning. Each adopter's emitted class extends `ControlledElement` directly, has its own `focus()`, and doesn't import the generic `trait` at runtime.

**Measured by hand,** under `RF-45`: minified and brotli bytes of each of the seven adopters' entries, in the trait form and in the per-class form. Report each delta with its cause. **Item 3 doesn't merge on the implementer's reading:** the owner accepts or declines any growth over the per-class form.

## Verification owed

- `packages/vite-traits-plugin`: the handoff loop on every changed file, and `aube exec just test` there;
- the builds of `@ydinjs/core` and `@ydinjs/material-x`, with item 1's byte comparison;
- for item 3, material-x's suites for the seven elements in `chromium`, `firefox` and `webkit`, under the component skill.

## Stopping boundary

The implementer may start item 1 now. When item 1 is in, the implementer stops and reports. Items 2 and 3 start when the coordinator relays the owner's answer. On answer B, the unit ends at item 1, and the architect closes `RF-44` and drops `RF-33`'s move to a trait.