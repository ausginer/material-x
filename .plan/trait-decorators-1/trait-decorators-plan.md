# Trait decorators — feasibility study

**Status: study, no decision.** Written by the architect on 2026-11-19, on the coordinator's task, on `repo/trait-decorators-1` from `origin/main` at `d1ea40e22`. It studies whether material-x's traits can move to plain classes that a component marks with syntax only, and the flattener then removes the marker and flattens the traits. **No identifier is minted and no record is edited.** The main slot's architect owns the records and the index, and [Proposed record changes](#proposed-record-changes) lists what this study asks of them. `RF-63`'s repair stays on hold, as the owner asked.

## The verdict

**A decorator can't carry the types, and that holds in every TypeScript the repository runs.** A class decorator doesn't change the type of the class it decorates. That is true for standard decorators and for `experimentalDecorators`, in TypeScript 7.0.2 (`tsc`) and 6.0.3 (`tsc6`) alike ([P1](#evidence)). So a form in which only `@traits(A, B)` names the traits doesn't typecheck.

**The goal is feasible, with something other than the decorator carrying the types.** Two carriers work in both compilers, under the repository's `isolatedDeclarations`, `erasableSyntaxOnly`, `noImplicitOverride` and `verbatimModuleSyntax`. The language service sees their members before any transform runs.

- **A merged interface,** `interface Button extends Disableable, FocusForwarding {}`, beside the class. With it the decorator form works (form A), but the interface is exactly the boilerplate the owner hoped to avoid. Once the interface exists, the decorator only repeats its list.
- **Type arguments on the base,** `class Button extends Traits<[Disableable, FocusForwarding]>` (form D). `Traits` is a generic constructor value, as `Array` is in `class A extends Array<number>`. The list is written once, erases with the types, and needs no interface. This form also reports two override hazards that today's form misses.

**The architect recommends form D.** It is a syntax-only marker that the flattener removes, which is what the owner asked for, although the marker isn't a decorator. Its costs are shared by every class form: the flattener becomes a required compiler step rather than an optimization, and traits from another package need the language rule widened. [Open questions](#open-questions-for-the-owner) puts the choice to the owner.

**Nothing from today's form has to stay** for any of the forms A, B or D. If the owner rejects them all, form C keeps today's `impl` call and annotated constructor, with class traits in place of `trait(…)` objects. `isolatedDeclarations` is what forces that annotation ([P4](#evidence)).

## What decides it

- **`isolatedDeclarations`** (`tsconfig.base.json`). A heritage clause can't hold an expression (TS9021), and a value that the declarations need must carry a written type (TS9010). It also rejects a computed class key, even one that is a `unique symbol` (TS9038, [P9b](#evidence)). An identifier with type arguments, `extends Traits<[…]>`, is allowed.
- **Decorators don't type.** See [P1](#evidence). A decorator's signature can only check the class it receives ([P2b](#evidence), [P5](#evidence)).
- **oxc doesn't lower standard decorators.** oxc-transform 0.158, the transformer under Vite 8 and tsdown, passes `@traits(…)` and `@attr(…) accessor` through unchanged at target `esnext` and at `es2022`. Node 26.13 rejects them as a syntax error ([P7](#evidence) §2, §3, §6). Only `experimentalDecorators` lowers them, into calls to a runtime helper (§4). So a decorator that reaches the output breaks the module at parse. That makes a missing flattener loud, and it means the flattener has to remove every decorator.
- **The plugin's parser sees every marker.** oxc-parser 0.158 gives a class decorator with its span and its identifier arguments, an accessor decorator, an interface's heritage names, and a class's `superTypeArguments` with each tuple element: a type query, a type reference or a rest element ([P7](#evidence) §1, §7).

## A trait as a plain class

This part is common to forms A, B, C and D. Only the marker on the component differs.

```ts
const $disableable: unique symbol = Symbol('Disableable');

export class Disableable extends ControlledElement {
  static {
    trait(this, $disableable); // the brand: runtime `instanceof`, and what the flattener links
  }

  @attr(Bool) accessor disabled!: boolean;
}

export class FocusForwarding extends ControlledElement {
  #brand!: true; // a type-only brand, for a trait whose members the base already has

  override focus(options?: FocusOptions): void {
    controls.get(this)!.focus(options);
  }
}
```

- **A trait extends `ControlledElement`,** so `this` is typed in its members. It is never instantiated or defined as an element.
- **An attribute is an accessor, never a field.** A trait field declared with `declare` brings back `RF-54`'s TS2611 when a subclass overrides it with `get` and `set` ([P6](#evidence) (a)). An accessor, written as a `get`/`set` pair or as an `accessor`, takes the override with no directive (P2 (d), P6 (b)). Two ways to write one:
  - **`@attr(Bool) accessor disabled!: boolean`.** The decorator's signature checks the converter against the field type. `@attr(Str)` on a `boolean` field fails with TS1240 ([P5](#evidence)). It is one line per attribute, as short as today's descriptor. The flattener lowers it, and it also has to lower it in the trait's own module, because the trait class stays runtime code for `instanceof` (below).
  - **An explicit `get`/`set` pair** that calls `attr.get` and `attr.set`, with `static observedAttributes`. It is valid JavaScript with no transform, but it takes six lines per attribute and nothing checks the converter against the type.
- **The runtime brand stays.** `useRovingTabindex.ts:33`–`:35` and `button-group/utils.ts:14` test `instanceof Valuable`, `Checkable`, `Disableable` and `ButtonLike`. A flattened component's prototype chain doesn't hold the trait class, so the trait class needs a `Symbol.hasInstance` that reads a brand, and the flattened class installs that brand, as today. A static block that calls core's `trait(this, $brand)` does both: it is valid JavaScript with no transform, it survives a build, and it gives the flattener a named symbol binding to link. The trait object and its module then stay tree-shakeable, as the [flattener document](../../.agents/docs/trait-flattener-plugin.md) requires today.
- **The type brand is optional.** A trait whose members the base already has, such as `FocusForwarding` or the empty `ButtonGroupLike`, is structurally `ControlledElement`. Then any element passes for it ([P9](#evidence) (a)), and `useFocusForwarding`'s host parameter checks nothing. A required ES-private field, `#brand!: true`, makes it nominal, and a merged or composed adopter still passes ([P9b](#evidence) (iii)). An optional one isn't a brand (iv). A computed `declare readonly [$brand]` fails `isolatedDeclarations` (TS9038, (i) and (ii)). The flattener doesn't copy that field.
- **A trait's override of a base member must keep the base's exact signature** in the interface forms. In [P9](#evidence), a trait's `focus(): void` against `HTMLElement`'s `focus(options?)` failed with TS2320. Form D intersects the two instead.
- **What a trait may contain** is today's method-trait subset widened to a class declaration: methods, accessors, `@attr` accessors, the brand block and the brand field. A constructor, a field, any other static member, `super` or a private name other than the brand field is a build error ([below](#what-every-class-form-asks-of-the-flattener)).
- **Framework props** come from a trait class through one helper type: the trait's non-method members that the base doesn't have, made optional ([P9](#evidence) (c)). It replaces today's `Props<typeof X>`, and `Interface<typeof X>` becomes the class name.

## The candidate forms

### A. The decorator marks the traits, and a merged interface carries their types

```ts
export interface Button
  extends ButtonLike, Disableable, Nameable, FocusForwarding {}

@traits(ButtonLike, Disableable, Nameable, FocusForwarding)
export class Button extends ControlledElement {
  /* … */
}
```

- **The types,** read in [P2](#evidence):
  - the class's type has every trait member, and the language service shows each one with its definition ([LSP](#evidence));
  - `super.disabled` is an error (TS2339), which matches the flattened class, whose `super` is the base;
  - the component's own accessor over a trait's accessor typechecks without `override`, and with `override` it fails (TS4113), because the member isn't in the base class;
  - a subclass of the component overrides a trait member with `override`;
  - two traits with one member of different types fail (TS2320).
- **The two lists can disagree.** A typed decorator catches a marked trait that the interface omits (TS1238, [P2b](#evidence) (b)). It can't catch the converse (c). The flattener sees both lists and has to check that they are equal.
- **The declarations** are the class and the interface, as written. oxc's isolated declarations emit them unchanged ([P7](#evidence) §5).
- **Shared groups.** The decorator's list is a value. A shared list, `@traits(...BUTTON_CORE_TRAITS, FocusForwarding)`, brings back `RF-63`'s exported array built with a spread. Groups can be interfaces in the type list, but the decorator then needs a second, value-level group.
- **The flattener's work:** recognize the decorator by its import specifier, resolve its arguments to trait classes, resolve the interface's heritage and check that it names the same traits, remove the decorator and the marker import, then flatten as in [Every class form](#what-every-class-form-asks-of-the-flattener).
- **The output** is today's lowered shape (below). Without the flattener, the decorator is a syntax error at parse ([P7](#evidence) §6).

### B. The merged interface is the only marker

Form A without the decorator. The interface's heritage is the list, and a group is an interface that erases:

```ts
export interface ButtonCore extends ButtonLike, Disableable {}

export interface IconButton
  extends ButtonCore, IconButtonLike, FocusForwarding {}
export class IconButton extends ControlledElement {
  /* … */
}
```

- **The types** are form A's ([P3](#evidence) compiles clean and emits these declarations).
- **One list,** but it is still the interface line on every component.
- **The flattener** recognizes an interface merged with a module-scoped class and resolves each heritage name. A name that resolves to a trait class is a layer, and a group interface is expanded. A heritage name that is neither has to be an error, or the flattener would guess.
- **Without the flattener,** nothing in the JavaScript marks the class. The types claim members that the runtime doesn't have, and nothing fails until an attribute is read.

### C. `impl()` over class traits

Today's composition, with the traits as classes:

```ts
const ButtonConstructor: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof Disableable, typeof FocusForwarding]
> = impl(ControlledElement, [ButtonLike, Disableable, FocusForwarding]);

export class Button extends ButtonConstructor {}
```

- **The types:** `isolatedDeclarations` rejects `extends impl(…)` (TS9021) and an unannotated constant (TS9010). With the annotation it works ([P4](#evidence)), which is today's shape.
- **What it keeps:** `impl` can stay a runtime composition that copies each trait's prototype descriptors, so the flattener stays an optimization, bailouts stay warnings, and the runtime-equivalence tests keep their reference.
- **What it doesn't change:** the annotated constructor on every component and the value-level lists, so `RF-63` stands as it is.

### D. The trait list is the base's type arguments

```ts
// @ydinjs/core
export type Traited<T extends readonly ControlledElement[]> = ControlledElement & Intersect<T>;
export const Traits: typeof ControlledElement &
  (new <const T extends readonly ControlledElement[]>() => Traited<T>) = …;

// material-x
export type ButtonCoreTraits = readonly [ButtonLike, Disableable];
export type ButtonCore = Traited<ButtonCoreTraits>;

export class IconButton extends Traits<[...ButtonCoreTraits, IconButtonLike, FocusForwarding]> {
  /* … */
}
```

- **The types,** read in [P11](#evidence) and [P12](#evidence):
  - the class's type has every trait member, and the language service shows each one with its definition ([LSP](#evidence));
  - the component's own override of a trait member takes `override`, as with a real base class;
  - a subclass's accessor over a trait's field fails with TS2611, which is `RF-57`'s case;
  - **the component's own field over a trait's accessor fails with TS2610.** Today's form (P10) and the interface forms (P6 (d)) accept it, and at runtime the field shadows the accessor;
  - a group is a tuple type, and a rest element spreads it;
  - an argument that isn't a `ControlledElement` fails (TS2344);
  - the static side is `ControlledElement`'s.
- **What the types don't catch:**
  - `super.focus()` typechecks when a trait supplies `focus`, while the flattened `super` is the base. The flattener already rejects that case (`class-super-trait-member`). In this form it is an error rather than a retained site.
  - Two traits with one member of different types intersect to `never` with no error ([P12](#evidence) (c)). Form A reports TS2320. Today, the later trait wins at runtime.
- **The arguments may be instance types,** `Traits<[Disableable]>` ([P12](#evidence)), or `typeof` queries ([P11](#evidence)). The instance form reads better and needs only `import type` for each trait. The transform then drops those imports, and the flattener adds the links it needs, as today ([P7](#evidence) §8).
- **The declarations** keep the heritage as written, in TypeScript's emit and in oxc's ([P11](#evidence), [P7](#evidence) §9). A consumer's declarations need core's `Traits`, `Traited` and the trait classes, which core's declarations already export.
- **The flattener's work:** recognize `extends <Traits>` by the import specifier of `Traits`, read `superTypeArguments`, and resolve each tuple element: a type reference or a type query to a trait class, and a rest element to a tuple alias, followed across modules as trait lists are today. Then it rewrites the heritage to `extends ControlledElement` and flattens. The type arguments erase in the oxc transform, so the flattener has to keep running before it (`enforce: 'pre'`, as now).
- **Without the flattener,** `extends Traits` is `ControlledElement` with no trait members. **`Traits` should be a subclass whose constructor throws** _"the trait flattener didn't run"_, so that the first construction fails loudly rather than an attribute silently doing nothing.

### Not feasible: the decorator alone

The owner's form as first stated: traits as classes, and only `@traits(…)` on the component. [P1](#evidence) fails with TS2339 on the first trait member in both compilers, and also under `experimentalDecorators`. The upstream request for a decorator that changes a class's type, [microsoft/TypeScript#4881](https://github.com/microsoft/TypeScript/issues/4881) _"Class Decorator Mutation"_, has been open since 2015, as read on 2026-11-19. No study of the flattener can repair the types, because the language service reads the source before any transform runs.

## The forms side by side

|  | A: decorator + interface | B: interface | C: `impl()` | D: type arguments |
| --- | --- | --- | --- | --- |
| Lists per component | 2, which can disagree | 1 | 1, plus its annotation | 1 |
| Shared groups | values, so `RF-63` returns | interfaces, erased | values, so `RF-63` stays | tuple types, erased |
| `override` on a trait member | TS4113: must be omitted | TS4113: must be omitted | allowed | allowed |
| Subclass accessor over a trait field (`RF-57`) | TS2611 | TS2611 | TS2611 | TS2611 |
| Own field over a trait accessor | not reported | not reported | not read | TS2610 |
| Conflicting trait members | TS2320 | TS2320 | not read | `never`, no error |
| Without the flattener | syntax error at parse | silent | works, slower | throws at construction, if `Traits` throws |
| Flattener required | yes | yes | no | yes |

## What every class form asks of the flattener

**The emitted class is today's lowered shape:** a class that extends `ControlledElement`, with each trait's members in trait order before the class's own, a merged `static observedAttributes` when a trait declares attributes, and one static block that installs every brand on the prototype. So the runtime contract in [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md) §Compatibility contract carries over. What changes is the input, and whether flattening is optional.

**What carries over** ([P8](#evidence)):

- the free-reference walker. It reads a class-declaration trait's members as it reads a method trait's: the accessors' `attr` and `Bool`, the method's module binding `controls`. It retains a member that uses `super`;
- binding linking, synthetic exports, member insertion, the brand install and `observedAttributes` merging in `lower.ts`;
- the layer rules: accessor halves, `super.key` and computed `super[key]`;
- the edits, through `RolldownMagicString`. Removing every decorator span leaves valid TypeScript.

**What is new:**

1. **Recognition.** One of the markers above, and a trait as a class with core's `trait(this, $brand)` block. Today's `analyzeModule` returns no composition and no bailout for the decorator form ([P8](#evidence) §1). It would pass the form through in silence.
2. **Normalization of a class-declaration trait,** including the `@attr` accessor, which lowers to today's descriptor accessor and its converter link. In the interface forms and in form D, a trait in the consumer's own module is a class declaration and not an expression.
3. **The trait module's own lowering.** An `@attr` accessor in a trait module has to become `get`/`set` and `observedAttributes` in that module too, in every build, because the module stays runtime code for `instanceof`.
4. **Every bailout is a build error.** A, B and D have no runtime composition to fall back on. The twelve reason codes stay as diagnostics, and their severity changes. So does the document's _Purpose_: the plugin stops being an optimization, and the source form stops working without it.
5. **Traits across packages need the language rule widened.** Every core trait becomes a class whose members are copied. material-x reads core's built `.js`, and the rule copies only between equal extensions, so every core trait would fail with `trait-source-language`. Two repairs:
   - **a parse-equivalence check:** parse a `.js` member as the consumer's language too, and copy it when the two parses agree. `RF-44`'s ruling named this as the route back;
   - **flattening after the TypeScript transform,** on JavaScript only. Form A's decorator survives that transform. The interface forms and form D don't, so it fits form A alone.
6. **The runtime-equivalence tests lose their reference.** They compare a composed class with the flattened one, and A, B and D have no composed class. A test-only reference that copies each trait class's prototype descriptors in order gives them one. That takes a few lines, and it doesn't ship.
7. **Every build that loads material-x source has to install the plugin.** The shared Vite, Vitest and tsdown configurations do today. Form D's throwing `Traits` and form A's decorator make a configuration that misses it fail loudly. Form B gives no sign.

## How the forms meet the open records

- **`RF-57`: closed by any class form.** The finding's subject is the transformer `trait()`, whose `Omit` delta is a mapped type that hides a field from TS2610 and TS2611. In every class form, a subclass's accessor over a trait's field fails with TS2611 (P2 (e), P4 (d), P11 (c)), because the types keep each member's declaration kind. That is the type-level repair the entry calls unread. In forms A, B and D the transformer `trait()` goes. A trait field is a build error anyway, so the runtime hazard can't come from a trait. **In form C,** `impl`'s runtime copies descriptors, and a trait field would be a prototype value, so the subset rule still has to exclude fields.
- **`RF-63`: moot in forms B and D, not in A or C.** In B and D, the shared lists become interfaces or tuple types. They erase, so no bundle can keep one, and the required property's first branch holds with nothing to measure. In A, the decorator's lists are values, and a shared one built with a spread is the same defect. In C, the lists stay. **If the owner picks B or D and the migration is near,** the repair planned on `repo/dead-spread-1` at `02e0c2e20` isn't needed, and `RF-63` closes when the migration merges. If the migration is far off, the repair is five literals, one lint rule and one sentence, and it can land in the meantime. The owner decides that (question 5).
- **`RF-60`: its rule still applies in every form.** Its cause is Vite's module runner, which evaluates a file twice when the file is requested under two URL strings. A class trait's brand is still a module-level `Symbol`, and its trait class is a module-level identity, so a second evaluation still splits either one. The entry already says that `flattenToDir`'s one-URL rule stays after a Vite fix, because it keeps the tests independent of the runner. The rule moves with the harness when item 6 above reworks the equivalence tests.
- **`RF-54`: the mapped `Branded` type isn't needed** in forms A, B and D, because an attribute is an accessor and a subclass's accessor override typechecks. TextFieldCore's `override get value()`, the component's own override of `Valuable`'s accessor, keeps `override` in form D. In A and B it drops `override` (TS4113).
- **A hazard found on the way, which predates this study.** A component's own field over a trait's accessor typechecks today (P10) and in forms A and B (P6 (d)). At runtime the field is an own property of every instance and shadows the accessor, so the attribute stops reflecting. The flattener doesn't check it either. Form D reports it as TS2610 (P11 (g)). No component in the tree does this today. [Proposed record changes](#proposed-record-changes) proposes a finding.

## Migration surface

| Area | What changes | Rough size |
| --- | --- | --- |
| `@ydinjs/core` trait runtime | `primitives.ts` and `attributes.ts` (445 lines) give way to `Traits`, `Traited`, the `trait(this, $brand)` brand helper, `@attr`, and the props helper | small: about 150 lines |
| core's traits | 8 descriptor traits become classes (`Checkable`, `Disableable`, `Linkable`, `Nameable`, `Reorderable`, `Selectable`, `Typeable`, `Valuable`). Their `use…` functions take the class as the host type | about 120 lines, mechanical |
| core's tests | `primitives`, `traits` and `overrides` browser and declaration tests (about 460 lines) are rewritten. core's tests make 13 `impl(…)` calls in all, mostly set-up | medium |
| material-x | 24 source files: 7 descriptor traits and `FocusForwarding`, 9 trait lists, 16 composition sites, and the type helpers (`TraitedConstructor` ×20, `Interface` ×16, `Props` ×16, `Traited` ×9). No test file names the trait API | medium, mechanical. Built output should keep the same runtime shape |
| `vite-traits-plugin` | `analyze.ts` recognition and list resolution, `normalize.ts` trait normalization, the `@attr` and trait-module lowering, the language rule, and severities. The walker, `lower.ts` and `ir.ts` carry over | large: roughly a third to a half of `src`'s 2,971 lines |
| the plugin's tests | the 18 fixture entries rewritten in the new form; equivalence rows get the test-only reference (item 6); bailout rows assert errors | large: most of 1,981 lines touched |
| documentation | [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md) is rewritten from _Purpose_ down, because the plugin becomes required. [`architecture.md`](../../.agents/docs/architecture.md) lines 7, 19, 46–50, 70, 97 and 120, and core's `README.md` (two examples and the trait list) change | medium |

**Order:** core's trait runtime and the plugin land together, because in A, B and D nothing runs without the plugin. The plugin can accept both today's `impl` sites and the new marker during the migration. material-x then moves component by component, and the `impl` path is deleted last. **Form C** is only the first two rows, smaller, and the plugin stays optional.

## Open questions for the owner

1. **Which marker?** Form A (decorator and interface), B (interface only), C (`impl()` over class traits) or D (type arguments). **Recommended: D.** Its list is written once and erases, it needs no interface, `override` works on trait members, and it reports both override hazards. The decorator you proposed can't carry the types, and form A needs the interface beside it. If you want the decorator anyway, A works, and the flattener checks that its two lists agree.
2. **How does a trait declare an attribute?** With `@attr(Converter) accessor name!: T`, which the flattener lowers, or with an explicit `get`/`set` pair and `static observedAttributes`, valid with no transform. **Recommended: `@attr`.** It is one line per attribute, as today's descriptor is, and its signature checks the converter against the type ([P5](#evidence)). The flattener has to lower it in the trait's own module anyway, so that module stays valid JavaScript.
3. **How does a core trait reach material-x's flattener?** Through a parse-equivalence check on members copied from `.js` into `.ts`, or by flattening after the TypeScript transform. **Recommended: the parse-equivalence check.** It keeps the plugin before the TypeScript transform, which forms B and D need, and it is the route back that `RF-44`'s ruling named.
4. **Should a trait whose members the base already has get a type brand?** That is `FocusForwarding` and `ButtonGroupLike`. **Recommended: yes, a required `#brand!: true` field,** which the flattener doesn't copy. Without one, `useFocusForwarding` accepts any element.
5. **What happens to `RF-63`'s repair on hold?** **Recommended:** keep it on hold if you choose B or D and the migration starts soon. Close `RF-63` when the migration removes the lists. Land the repair, which is small, if the migration waits.
6. **Should the flattener lower `super.key` for a trait's key** inside the component, so that a component can wrap a trait's method? Today that site is retained. In forms A, B and D it would be a build error. **Recommended: no, not now.** No component does it. The error names the case, and lowering is added when a component needs it.

## Proposed record changes

For the main slot's architect. This study doesn't edit them.

- **`RF-57`:** add a dated note. Every class-trait form reports the subclass accessor override as TS2611, because its types keep each member's declaration kind, and forms A, B and D remove the transformer `trait()`. If the owner adopts one, the finding closes with the migration. Link this study.
- **`RF-63`:** add a dated note that the repair is on hold for this study. In forms B and D the lists become types, and the required property holds with no list left to keep. The closure then follows the migration.
- **`RF-60`:** no change. Its rule in `flattenToDir` applies to every form.
- **A new finding, Tier C, proposed wording:** _"A component's own field over a trait's accessor shadows the accessor at runtime, and neither TypeScript nor the flattener reports it."_ Today's form typechecks it (P10), and the flattener's layer rules check only accessor halves. No component does it today. Required property: the types or the flattener reject it. Form D's types do (TS2610). Under today's form, the repair is one more layer rule, a class field whose key a trait supplies.
- **A question, if the owner wants it registered:** the marker choice and questions 2 to 6 above, routed to the owner.

## Evidence

Every probe is under [`probes/`](probes/), and every transcript is under [`checks/`](checks/), read at `d1ea40e22` on 2026-11-19.

- **P1 to P12, the type probes** ([`probes/types/`](probes/types/), [transcript](checks/types.txt)). [`run.sh`](probes/types/run.sh) checks each probe alone with `tsc` (TypeScript 7.0.2) and `tsc6` (6.0.3), under a tsconfig that copies `tsconfig.base.json`'s checking options, `isolatedDeclarations` and `erasableSyntaxOnly` among them. It prints the declarations for the probes that compile. Each case states its expected result in a comment. **The two compilers agree on every line,** apart from the wording of one message.
  - P1: a decorator alone, also under `experimentalDecorators`.
  - P2: form A, and P2b: the typed decorator.
  - P3: form B with a group. P4: form C.
  - P5: `@attr` accessors. P6: member kinds and the static side.
  - P9 and P9b: brands and the props helper. P10: today's form, read through core's built declarations.
  - P11 and P12: form D.
- **P7, the toolchain** ([`probes/toolchain/probe.ts`](probes/toolchain/probe.ts), [transcript](checks/toolchain.txt)). oxc-parser's view of forms A and D, oxc-transform's output for each decorator mode and for form D, oxc's isolated declarations, and Node's reading of a decorator.
- **P8, the flattener's machinery** ([`probes/toolchain/machinery.ts`](probes/toolchain/machinery.ts), [transcript](checks/machinery.txt)). It runs the plugin's own `analyzeModule` on form A, its `collectFreeReferences` on class-declaration traits, and a decorator strip with `RolldownMagicString`.
- **The language service** ([transcript](checks/lsp.txt)): hover and go-to-definition on a trait member in forms A and D, through this harness's TypeScript language server. Its diagnostics match `tsc`'s.

**Not read:**

- a runnable prototype of the flattener in any form. The owner asked for feasibility, and the machinery probe stops at the parts that carry over;
- bundle sizes. Form D's output is today's lowered shape, so nothing is expected to change, but that isn't measured;
- conflicting members in form C, and the own-field case in form C;
- browsers. No decorator reaches the output in a working build.