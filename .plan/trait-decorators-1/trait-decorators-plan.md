# Trait decorators — feasibility study

**Status: study, no decision.** Written by the architect on 2026-11-19, on the coordinator's task, on `repo/trait-decorators-1` from `origin/main` at `d1ea40e22`. It studies whether material-x's traits can move to plain classes that a component marks with syntax only, and the flattener then removes the marker and flattens the traits. **No identifier is minted and no record is edited.** The main slot's architect owns the records and the index, and [Proposed record changes](#proposed-record-changes) lists what this study asks of them. `RF-63`'s repair stays on hold, as the owner asked.

**Revised on 2026-11-19, at the owner's follow-up,** relayed by the coordinator:

- [Attributes](#attributes) is new. It shows that the attribute form doesn't depend on the marker, compares every attribute form under form D, and answers the `readonly accessor` question.
- Question 2's recommendation changes from `@attr` to a static table with `accessor`.
- Question 3 is reworded in plain words.
- Question 6 carries the owner's answer.

**Revised again on 2026-11-19,** at the owner's request, relayed by the coordinator. [The owner's sketch](#the-owners-sketch) is new. It reads the owner's own trait sketch with probes P17 to P22: what it takes to typecheck, groups of traits, whether `@trait` is needed, and Rust-like traits. A trait may now hold abstract members, item 8 is added to the flattener's work, and questions 7 and 8 are new.

**Revised a third time on 2026-11-19,** at the owner's request, relayed by the coordinator. [Layer (a): traits on any base](#layer-a-traits-on-any-base) is new. It studies a generic trait mechanism at the level of `primitives.ts` in which the component chooses its base, with probes P23 to P26. For that layer it recommends form E, an annotated composition, in place of form D. Question 9 is new. The ydin layer and the migration surface aren't revised, at the owner's request.

**Revised a fourth time on 2026-11-19,** at the owner's request, relayed by the coordinator. [The owner's refinement of form E](#the-owners-refinement-of-form-e) is new. It reads the owner's own revision, with probes P27 to P29, and recommends it, with six fixes, in place of the study's form E. Its trait is branded by `trait(this)` in a static block rather than `@trait`, and the flattener generates the component's `impl(this, …)` block.

**Revised a fifth time on 2026-11-19.** The owner accepted the six fixes, with one alternative: a bound that is `null`. [The owner's answers](#the-owners-answers) records them. [A bound as `null`](#a-bound-as-null) probes the alternative with P30 and adopts it: fix 3 becomes `null`, and fix 5's `compose` checks `base !== null`.

## The verdict

**A decorator can't carry the types, and that holds in every TypeScript the repository runs.** A class decorator doesn't change the type of the class it decorates. That is true for standard decorators and for `experimentalDecorators`, in TypeScript 7.0.2 (`tsc`) and 6.0.3 (`tsc6`) alike ([P1](#evidence)). So a form in which only `@traits(A, B)` names the traits doesn't typecheck.

**The goal is feasible, with something other than the decorator carrying the types.** Two carriers work in both compilers, under the repository's `isolatedDeclarations`, `erasableSyntaxOnly`, `noImplicitOverride` and `verbatimModuleSyntax`. The language service sees their members before any transform runs.

- **A merged interface,** `interface Button extends Disableable, FocusForwarding {}`, beside the class. With it the decorator form works (form A), but the interface is exactly the boilerplate the owner hoped to avoid. Once the interface exists, the decorator only repeats its list.
- **Type arguments on the base,** `class Button extends Traits<[Disableable, FocusForwarding]>` (form D). `Traits` is a generic constructor value, as `Array` is in `class A extends Array<number>`. The list is written once, erases with the types, and needs no interface. This form also reports two override hazards that today's form misses.

**The architect recommends form D,** and for the generic layer that the owner asked for later, form E ([Layer (a)](#layer-a-traits-on-any-base)) in the owner's refined shape with its six fixes ([The owner's refinement of form E](#the-owners-refinement-of-form-e)). It is a syntax-only marker that the flattener removes, which is what the owner asked for, although the marker isn't a decorator. Its costs are shared by every class form. The flattener becomes a required compiler step rather than an optimization. A trait whose code crosses packages would need the language rule widened. With attributes as tables (question 2), no trait's code crosses packages today. [Open questions](#open-questions-for-the-owner) puts the choice to the owner.

**Nothing from today's form has to stay** for any of the forms A, B or D. If the owner rejects them all, form C keeps today's `impl` call and annotated constructor, with class traits in place of `trait(…)` objects. `isolatedDeclarations` is what forces that annotation ([P4](#evidence)).

## What decides it

- **`isolatedDeclarations`** (`tsconfig.base.json`). A heritage clause can't hold an expression (TS9021), and a value that the declarations need must carry a written type (TS9010). It also rejects a computed class key, even one that is a `unique symbol` (TS9038, [P9b](#evidence)). An identifier with type arguments, `extends Traits<[…]>`, is allowed.
- **Decorators don't type.** See [P1](#evidence). A decorator's signature can only check the class it receives ([P2b](#evidence), [P5](#evidence)).
- **oxc doesn't lower standard decorators.** oxc-transform 0.158, the transformer under Vite 8 and tsdown, passes `@traits(…)` and `@attr(…) accessor` through unchanged at target `esnext` and at `es2022`. Node 26.13 rejects them as a syntax error ([P7](#evidence) §2, §3, §6). Only `experimentalDecorators` lowers them, into calls to a runtime helper (§4). So a decorator that reaches the output breaks the module at parse. That makes a missing flattener loud, and it means the flattener has to remove every decorator. **The `accessor` keyword is the same,** with or without a decorator: oxc keeps it, and Node rejects it ([P15](#evidence)).
- **The plugin's parser sees every marker.** oxc-parser 0.158 gives a class decorator with its span and its identifier arguments, an accessor decorator, an interface's heritage names, and a class's `superTypeArguments` with each tuple element: a type query, a type reference or a rest element ([P7](#evidence) §1, §7).

## A trait as a plain class

This part is common to forms A, B, C and D. Only the marker on the component differs. The attribute above is written in the form [Attributes](#attributes) recommends. That section lists the other forms.

```ts
const $disableable: unique symbol = Symbol('Disableable');

export class Disableable extends ControlledElement {
  static {
    trait(this, $disableable); // the brand: runtime `instanceof`, and what the flattener links
  }

  static readonly attributes: AttributeTable<Disableable> = { disabled: Bool };

  accessor disabled!: boolean;
}

export class FocusForwarding extends ControlledElement {
  #brand!: true; // a type-only brand, for a trait whose members the base already has

  override focus(options?: FocusOptions): void {
    controls.get(this)!.focus(options);
  }
}
```

- **A trait extends `ControlledElement`,** so `this` is typed in its members. It is never instantiated or defined as an element.
- **An attribute is typed as an accessor, never as a field.** [Attributes](#attributes) gives the forms and their probes.
- **The runtime brand stays.** `useRovingTabindex.ts:33`–`:35` and `button-group/utils.ts:14` test `instanceof Valuable`, `Checkable`, `Disableable` and `ButtonLike`. A flattened component's prototype chain doesn't hold the trait class, so the trait class needs a `Symbol.hasInstance` that reads a brand, and the flattened class installs that brand, as today. A static block that calls core's `trait(this, $brand)` does both: it is valid JavaScript with no transform, it survives a build, and it gives the flattener a named symbol binding to link. The trait object and its module then stay tree-shakeable, as the [flattener document](../../.agents/docs/trait-flattener-plugin.md) requires today.
- **The type brand is optional.** A trait whose members the base already has, such as `FocusForwarding` or the empty `ButtonGroupLike`, is structurally `ControlledElement`. Then any element passes for it ([P9](#evidence) (a)), and `useFocusForwarding`'s host parameter checks nothing. A required ES-private field, `#brand!: true`, makes it nominal, and a merged or composed adopter still passes ([P9b](#evidence) (iii)). An optional one isn't a brand (iv). A computed `declare readonly [$brand]` fails `isolatedDeclarations` (TS9038, (i) and (ii)). The flattener doesn't copy that field.
- **A trait's override of a base member must keep the base's exact signature** in the interface forms. In [P9](#evidence), a trait's `focus(): void` against `HTMLElement`'s `focus(options?)` failed with TS2320. Form D intersects the two instead.
- **What a trait may contain** is today's method-trait subset widened to a class declaration: methods, accessors, abstract members that a component must implement ([Rust-like traits](#rust-like-traits)), the attribute declarations of [Attributes](#attributes), the brand block and the brand field. A constructor, a field, any other static member, `super` or a private name other than the brand field is a build error ([below](#what-every-class-form-asks-of-the-flattener)).
- **Framework props** come from a trait class through one helper type: the trait's non-method members that the base doesn't have, made optional ([P9](#evidence) (c)). It replaces today's `Props<typeof X>`, and `Interface<typeof X>` becomes the class name.

## Attributes

**The attribute form doesn't depend on the marker.** The marker, A, B or D, only says which traits a component takes. How a trait declares an attribute is a property of the trait class, and every class form reads it the same way. Form C is the exception: its `impl` composes at runtime, so its attributes have to work with no transform. **Form D doesn't assume `@attr`.** The first version of this study recommended `@attr` as a separate question, and an example used it. The probes below run under form D with no decorator at all.

### Writable attributes

Each form was read under form D, with `tsc` and `tsc6` and `isolatedDeclarations` ([P13](#evidence), [P16](#evidence)). Its JavaScript was read after oxc's TypeScript transform, with no flattener, and Node 26.13 was asked to parse it ([P15](#evidence)). The columns:

- **Subclass override:** a subclass of the component overrides the attribute with `get` and `set`, as TextFieldCore's `value` needs.
- **Own field:** a component declares a field over the attribute. TS2610 is the report this study counts on. Without it the field shadows the accessor and the attribute stops reflecting.
- **Converter checked:** the converter's type is checked against the member's.

| Trait source | Subclass override | Own field | Converter checked | JavaScript with no flattener | What the flattener reads |
| --- | --- | --- | --- | --- | --- |
| **Static table + `accessor`:** `static readonly attributes: AttributeTable<T> = { disabled: Bool }` and `accessor disabled!: boolean` | ok | TS2610 | yes, TS2322; an unknown key is TS2353 | `accessor disabled;` is a syntax error. The flattener deletes the line in the trait's module, in every build | the table, an object literal, as it reads today's descriptor |
| **`@attr(Bool) accessor disabled!: boolean`** | ok | TS2610 | yes, TS1240 ([P5](#evidence)) | a syntax error. The flattener rewrites the line in the trait's module, in every build, into a table, so built JavaScript still declares it | the decorator's argument, and the table in built JavaScript |
| **Explicit `get`/`set`** calling `attr.get` and `attr.set`, and `static observedAttributes` | ok | TS2610 | yes, through `attr.get`'s and `attr.set`'s types (TS2322, TS2345). The attribute's name is three unchecked strings | valid, and it works as it is | the members' code, which it copies. From another package's built `.js`, that is question 3 |
| **Static table + accessor signatures in an interface merged with the trait class:** `interface Disableable { get disabled(): boolean; set disabled(v: boolean) }` | ok | **not reported** | yes, TS2322 | valid: neither emits a member | the table |
| **Static table + `declare disabled: boolean`** | **TS2611**, `RF-54`'s case | **not reported** | yes | valid | the table |
| **Static table + `abstract` members,** an abstract class with `abstract get`/`set` or `abstract accessor` | ok | not reported | yes | valid | the table |

The `abstract` row fails in another way: every component that takes the trait fails with TS2515, _"Non-abstract class … does not implement inherited abstract member"_. The intersection keeps the members abstract, so that form is out. In the probe, the own-field cases were expected to give TS2610 and gave nothing, because the field implements the abstract member.

**Three forms keep every check:** the table with `accessor`, `@attr`, and the explicit pair.

- **The explicit pair** is the only form that runs with no transform. It is six lines per attribute, and it puts code into the trait, which the flattener has to copy. For core's traits, that copy crosses packages, which is question 3.
- **The table with `accessor`** is two lines per attribute. The `accessor` line types the member, and the table holds the converter, which the table's type checks against the member. In built JavaScript only the table is left. That is the same declarative shape that the flattener reads from core's built `trait({ disabled: Bool }, $brand)` today, so no code crosses packages.
- **`@attr`** is one line per attribute, and the flattener has to turn it into a table in the trait's own module so that the built module stays declarative. It does the same job as the table form, through a decorator.

**Every one of these forms creates a setter,** and that is correct for every attribute in the repository. The inventory below shows that none is read-only.

### Read-only attributes

The owner asked whether `readonly accessor` gives a read-only attribute. [P14](#evidence) read it:

- **`readonly accessor` is rejected** with TS1243, _"'accessor' modifier cannot be used with 'readonly' modifier"_, in both compilers. That holds with an accessor decorator, with no decorator, and with `abstract`. No decorator changes that, because the error is about the modifiers.
- **A getter alone works.** `get busy(): boolean { return attr.get(this, 'busy', Bool); }` makes the member read-only. A component that assigns it fails with TS2540. A subclass may still add a `set`, and TypeScript accepts that, as it does for any getter.
- **A decorated getter typechecks,** `@attr(Bool) get busy(): boolean { return false; }`, with TS2540 on assignment. Its body is a placeholder that the flattener replaces. Like any decorator, it is a syntax error without the flattener ([P15](#evidence)). On an `abstract` getter, the decorator is rejected (TS1206).
- **A getter signature in a merged interface,** beside a table, is read-only (TS2540) with no runtime code ([P16](#evidence)). Like the writable interface form, it doesn't report an own field.
- **`declare readonly busy: boolean`** beside a table is read-only (TS2540). A subclass's accessor over it fails with TS2611.
- **A table with an `abstract get`** fails every adopter with TS2515, as above.

**Today's descriptor traits have no read-only attributes.** `trait(attrs, brand)` in `core/src/traits/attributes.ts` always defines a `get` and a `set`, so every attribute is writable from JavaScript.

**Every attribute in the repository must stay writable.** There are 24:

- **core:** `checked`, `disabled`, `href`, `target`, `name`, `selected`, `type`, `value` and `reorderable`. Each one matches a writable property of a native element, or, for `reorderable`, a writable configuration;
- **material-x:**
  - `ButtonLike`'s `color`, `size` and `shape`;
  - `IconButtonLike`'s `width`;
  - `SplitButtonLike`'s `open`;
  - `Indeterminable`'s `indeterminate`;
  - `FABLike`'s `size`, `color`, `extended` and `tonal`;
  - `TextFieldLike`'s `type`, `inputmode` and `outlined`.

  These are configuration that the consumer sets. Under the controlled principle that `RF-50` cites, the consumer owns this state, so it has to be able to write it.

The one override in the tree is TextFieldCore's `value`, which declares both halves. **So read-only needs no form now.** If a read-only attribute is ever needed, a getter signature in the trait's merged interface is the cheapest form: one line and no runtime code. It gives up the own-field report for that one member.

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

## The owner's sketch

The owner wrote a sketch of his own in his checkout, `packages/core/src/traits/_example.ts`, untracked. [`probes/types/sketch/_example.ts`](probes/types/sketch/_example.ts) is a byte-for-byte copy, and the probes read that copy unchanged. It has four parts:

- `Trait<T>`, an interface that is only `[Symbol.hasInstance](o): o is T`;
- `ValuableTrait`, a class that extends `HTMLElement`, marked `@trait`, with `static observedAttributes`, a static block that puts a brand on its prototype, and an explicit `get`/`set` `value`;
- `Valuable: Trait<ValuableTrait>`, an object whose `hasInstance` reads the brand. Components import it, and `instanceof` uses it;
- `impl(base, ...traits)`, typed `InstanceType<B> & TraitInstance<T>`, which returns `base`. The flattener removes the call.

### Does it typecheck as a component base?

**Not as written**, in either compiler ([P17](#evidence)). Three things fail:

- **`TraitInstance<T>` over the rest tuple is `never`.** `T` is an array, and an array has no `Symbol.hasInstance`, so `T extends Trait<infer I>` is false. TypeScript reports the constraint in the sketch itself (TS2344), and `impl`'s return type is `never` ((c)).
- **The return type is an instance type, and `extends` needs a constructor.** `class X extends impl(…)` fails with TS2507, _"Type 'never' is not a constructor function type"_. With `TraitInstance` fixed alone it would still fail, because `ControlledElement & ValuableTrait` isn't a constructor either ((e)). `return base` fails with TS2322 for the same reason.
- **`isolatedDeclarations` rejects the call in the heritage clause** (TS9021), as it does form C's ([P4](#evidence)). No type fix changes that, because the rule is about syntax. A component is an exported class, so it always applies.

These parts work as written: `node instanceof Valuable` narrows to `ValuableTrait` ((d)), `infer I` reads the class out of the type predicate, and `@trait` typed `ClassDecorator` is accepted under standard decorators.

**The fewest fixes,** in [`sketch-fixed.ts`](probes/types/sketch-fixed.ts), each marked `fix`:

1. map the rest tuple element by element and intersect: `TraitInstances<T>`, the recursion form D already uses;
2. return a constructor: `Impl<B, T> = B & (new (...args: any[]) => InstanceType<B> & TraitInstances<T>)`;
3. `return base as never`. The type is a claim that the flattener makes true;
4. move the call out of the heritage clause into a constant annotated with `Impl<…>`, which `isolatedDeclarations` requires:

```ts
const ButtonBase: Impl<
  typeof ControlledElement,
  [typeof Valuable, typeof Disableable]
> = impl(ControlledElement, Valuable, Disableable);
export class Button extends ButtonBase {}
```

**With the fixes, the study's checks hold** ([P18](#evidence)), in both compilers:

- two traits give their intersection, not `never` (d);
- `this.disabled` resolves, and the language service shows `DisableableTrait.disabled` and goes to its getter and setter ([LSP](#evidence));
- the component overrides a trait accessor with `override` (c);
- `RF-57`'s case fails with TS2611 (e), and an own field over a trait accessor fails with TS2610 (f);
- a class passed in place of its `Trait` object fails with TS2345 (j), because a class's `Symbol.hasInstance` isn't a type predicate;
- two traits with one member of different types give `never` with no error (g), as in form D.

**What the fixes can't repair: the call and its annotation are two lists.** An annotation that names a trait the call omits fails (TS2322, (h)). An annotation that omits a trait the call names passes in silence (i): the flattener adds members that the types don't know. Form A's two lists have the same one-sided check.

**Which form it is.** With the fixes, the sketch is **form C** with two changes: the list holds `Trait` objects rather than classes, and `impl` has no runtime composition. The first change is neutral, because the types read the class out of the object. The second loses form C's one advantage, a flattener that stays optional: without the flattener the component silently lacks every trait member, as in form B. **The annotation that `isolatedDeclarations` forces is already form D's list,** in another place. Move it into the heritage clause and the call has nothing left to do:

```ts
export class Button extends Traits<[typeof Valuable, typeof Disableable]> {}
```

Form D accepts the sketch's `Trait` objects as `typeof` queries: the members resolve, and an own field still fails with TS2610 ([P19](#evidence) (f)). It also accepts the classes' instance types, `Traits<[ValuableTrait]>`, as [P12](#evidence) reads them, once a trait extends `ControlledElement` rather than `HTMLElement`, because form D's `Traits` constrains its arguments to `ControlledElement`.

**A runtime gap, which the types don't show.** The sketch's static block brands `ValuableTrait.prototype`. A flattened component doesn't inherit from `ValuableTrait`, so `instanceof Valuable` is false for it ([P22](#evidence) §2), unless the flattener installs the brand on the component. To do that it has to recognize the block. A pattern such as `Object.defineProperty(this.prototype, $valuable, …)` is a guess. A call to one named core helper is a binding that the flattener resolves by its import, as the study's `trait(this, $brand)` is.

### Groups of traits

Four shapes were read ([P19](#evidence)):

| Shape | Types | At runtime |
| --- | --- | --- |
| (a) **A value array spread into the call,** `impl(Base, ...BUTTON_CORE_TRAITS, Counted)`, with `[...typeof BUTTON_CORE_TRAITS, typeof Counted]` in the annotation | ok | `RF-63` returns as it is: an exported array built with a spread, which nothing reads after flattening |
| (b) **A value array passed whole,** `[BUTTON_CORE_GROUP, Counted]`, with no spread. The types flatten nested tuples | ok | a literal array of identifiers. Whether a bundler drops it when unused isn't measured. That is `RF-63`'s open measurement |
| (c) **A tuple type in the annotation,** `[...ButtonCoreTraits, typeof Counted]` | ok | erased, but the call still lists every trait as a value, so the group saves nothing |
| (d) **A group as a trait of its own,** Rust's supertrait: `interface ButtonCoreTrait extends ValuableTrait, DisableableTrait {}` and one `Trait` object that checks both brands | ok, with TS2610 through the group (e) | the object stays, and `instanceof ButtonCore` works |

**The flattener can't erase a value group.** The group is an exported binding of another module. In a library build, a consumer may import it, so the flattener can't delete it, and `RF-63`'s entry already says that a library build keeps exported lists by definition. The flattener can only stop reading it. So in the sketch's shape a group is either a value that stays, (a) and (b), or a type that the call repeats, (c).

**In form D, a group is a tuple type and erases** ([P11](#evidence) (d), [P19](#evidence) (f)), with nothing repeated. A supertrait also works in form D, as an abstract trait class whose base is `Traits<[…]>` ([P20](#evidence) (f)). The flattener then expands it, as it expands a tuple alias. A supertrait earns its place only when a group needs its own `instanceof` or its own required members.

**Recommended: tuple types under form D.** A supertrait class only where a group needs a brand or members of its own. If the owner keeps the sketch's call, (b) is the better of the value forms, but `RF-63` stays open until a bundler is measured on it.

### Is `@trait` needed?

**No.** The flattener can find a trait class without it:

- **From the component.** Each list element resolves to a binding in some module. Whatever a list names is a trait, so the list is the marker. That is how today's flattener finds traits.
- **From the `Trait<…>` annotation.** oxc-parser gives `const Valuable: Trait<ValuableTrait>` with its type argument, so the object leads to its class ([P22](#evidence) §1).
- **From the brand block,** which oxc-parser also shows.

**`@trait` also costs something.** A decorator can't change a type ([P1](#evidence)), and an unlowered decorator is a syntax error in Node ([P7](#evidence) §6). So the flattener would have to strip `@trait` from the trait's module in every build, core's included. The one thing it could add is a check, in the trait's own module, that the class keeps to the trait subset before any component uses it. A call to core's brand helper marks the class just as well, and it is valid JavaScript.

**The class-and-object split isn't worth its cost.** The split asks for two names per trait. It also asks for an annotation, `Trait<ValuableTrait>`, that nothing ties to the class: `createHasInstance` takes only a symbol, so an object can claim any class with any brand. A class is already a typed `instanceof` target. `node instanceof Disableable` narrows to the class with no `Symbol.hasInstance` in its type ([P21](#evidence) (a)). A typed static `Symbol.hasInstance` is accepted under `isolatedDeclarations` with `override` ((b), (c)), but it isn't needed. At runtime, core's helper installs the class's `Symbol.hasInstance` and the prototype brand.

**What the split gives can come from the flattener instead.** It is what the trait module can turn into after flattening. The flattener can lower each trait class in its own module to a brand object, `trait({ disabled: Bool }, $disableable)`, which is today's built shape. The owner's _"where to cut the class out and turn it into an interface"_ is that step. The author writes one class, and the output holds the object.

**One rule follows for the flattener.** It installs only the prototype brand on the component, never the trait's static block as written. A copied block that also installs `Symbol.hasInstance` makes `instanceof Button` read the trait's brand. Then an unrelated element that carries the brand passes as a `Button` ([P22](#evidence) §2).

### Rust-like traits

A Rust trait has three parts:

- **required members,** which every implementer must write;
- **provided members,** which have a default body that an implementer may override;
- **supertraits,** which a trait requires of its implementers.

A trait holds no state. It is implemented in its own `impl Trait for Type` block, and a call that two traits could answer is an error until it is disambiguated.

**Here, an abstract member of a trait class is a required member.** A concrete member is a provided one, and a trait list in a trait class is a supertrait. In form D, TypeScript takes most of it ([P20](#evidence)):

- **Required members:** a component that omits one fails with TS2515 (a). That includes a member required through a supertrait (f), and the same holds in the sketch's shape (j). The implementation may carry `override` or not (b), (c).
- **Provided members:** a component overrides one with `override` (d). A provided member may call a required one, which the component's own member answers at runtime.
- **Generic traits** check the implementer's type (TS2416, (g)), and a generic bound, `T extends Labelled`, works (i).
- **No state:** a field is already a build error in a trait, which matches Rust.
- **No call to a default from its override:** Rust has none, and question 6's answer keeps `super.traitMember` a build error. The two agree.

This doesn't contradict [Attributes](#attributes), where `abstract` is out. An attribute is supplied by the trait, so marking it `abstract` asks every component to supply it again. A required member is one the component must supply, so `abstract` is right for it. The flattener copies no abstract member, because the TypeScript transform erases it.

**Where it stops:**

- **Conflicts aren't reported.** Two traits with one member of different types intersect to `never` with no error ([P12](#evidence) (c), [P18](#evidence) (g)). Rust rejects the ambiguity. Here only the flattener can, because it sees both traits supply one key. Today the later trait wins in silence.
- **A required member can be answered by another trait,** with no error (e). Rust wants it in the trait's own `impl`. This is harmless at runtime, because the later trait's member is copied.
- **Associated functions don't reach the component.** A trait's static member isn't on the component's type (TS2339, (h)), because the static side is `ControlledElement`'s.
- **No implementation outside the type.** Rust's `impl Trait for Type` can be written apart from `Type`. Here the list is in the component's heritage, and a type that someone else owns can't take a trait afterwards.
- **Associated types** exist only as generic parameters, fixed by the component's list.
- **Membership is structural** unless the trait has a brand field (question 4). Without one, any element with the same members passes for the trait in a bound.

So far the gaps are only in reporting, never in what the code can express. The flattener can close the first: two traits that supply one key fail the build unless the component overrides the key itself, which is Rust's disambiguation. The rest are limits of TypeScript, and the repository needs none of them today.

## Layer (a): traits on any base

The owner asked for two layers, relayed by the coordinator. **Layer (a)** is a generic trait mechanism at the level of core's `primitives.ts`, with no knowledge of `ControlledElement`, `HTMLElement` or attributes. A trait is a plain class that can be applied to any base class, and the component chooses its base. **Layer (b)** is the ydin and material-x application on top of it: attribute accessors, `observedAttributes`, Props, and `ControlledElement` as the usual base. Form D as recommended above hard-wires `ControlledElement` as the base and as every trait's superclass. **This section studies layer (a) only,** at the owner's request. Layer (b) and the migration surface aren't revised here.

`primitives.ts`'s `Trait<P, S, B, PB, SB>` carries five things. In a class trait they become:

| `primitives.ts` | A class trait |
| --- | --- |
| `P`, the instance members | the class's instance members |
| `S`, the static members | the class's static members |
| `B`, the brand, with `instanceof` | `trait(this)` in a static block, and a `#brand!: true` field where the type has to be nominal |
| `PB` and `SB`, what the trait requires of its base's instances and statics | the class's superclass: a **bound**, `Bound<I, S>` |

The names `compose`, `Composed`, `Bound`, `bound`, `trait` and `Traited` are the probes' ([`layer-a.ts`](probes/types/layer-a.ts)), not a decided API.

### How a component names its base and its traits

Three candidates were read with the same cases ([P23](#evidence)):

- **(i) The base as a type argument:** `class X extends Traits<typeof Base, [typeof A, typeof B]>`.
- **(ii) One annotated marker per base:** `const ElementTraits: TraitsFor<typeof ControlledElement> = traitsFor(ControlledElement)`, written once for each base, and then `class X extends ElementTraits<[typeof A, typeof B]>`.
- **(iii) One annotated composition per component:** `const XBase: Composed<typeof Base, [typeof A, typeof B]> = compose(Base)`, and then `class X extends XBase`. The list is in the annotation only. `compose` takes its result type from the annotation, and its argument is the runtime base.

|  | (i) type argument | (ii) marker per base | (iii) composition per component |
| --- | --- | --- | --- |
| List written once, erased | yes | yes | yes |
| No expression in `extends` (TS9021) | yes | yes | yes. Without the annotation, TS9010 |
| `override` on a trait member | yes | yes | yes |
| An own field over a trait accessor | TS2610 | TS2610 | TS2610 |
| A subclass accessor over a trait field (`RF-57`) | not read | TS2611 | TS2611 |
| The base's statics on the component | **no:** `static override observedAttributes` fails with TS4113 | yes | yes |
| A trait's statics on the component | **no,** TS2339 | **no,** TS2339 | **yes,** and the language service shows them ([LSP](#evidence)) |
| A base that doesn't meet a trait's bound | TS2344 | TS2344 | TS2344, on instances and on statics |
| Lines per component | the class | the class | a constant and the class, as today |
| Where the flattener finds the runtime base | the type argument `typeof Base`, a type query that it resolves to a value binding and keeps imported | the marker's initializer, `traitsFor(ControlledElement)`, followed across modules | the call's argument, in the same module |

**The statics decide it, and the reason is TypeScript's.** A class's static side is the type of the expression in its heritage clause. Type arguments only choose a construct signature, and a construct signature gives the instance type. So nothing the type arguments name can reach the component's static side. In (i) even the base's statics are lost, because the expression is the one generic `Traits`. In (ii) the base's statics come from the marker's own type, and the traits' statics still can't. In (iii) the heritage clause names a constant whose whole type, statics included, is written in its annotation.

**(iii) costs two things.**

- **A constant per component.** Today's form has one too, `const ButtonConstructor: TraitedConstructor<…> = impl(…)`, and that one names the list twice. In (iii) the list appears once.
- **The base is named twice:** `typeof ControlledElement` in the annotation and `ControlledElement` in the call. Naming an unrelated base in the call fails (TS2322, (iii.h)). Naming a superclass of the annotation's base passes ((iii.g)). The flattener compares the two names, as it compares any two lists, and fails the build when they differ.

**The recommendation for layer (a) is (iii), called form E here.** It carries everything `primitives.ts` carries. Form D's properties hold in it ([P25](#evidence) compiles clean in both compilers and emits declarations that keep the annotation and the heritage). **The alternative is (ii),** if the owner drops trait statics from layer (a). Then there's no constant per component. Today no trait contributes a static except `observedAttributes`, which `attributes.ts`, layer (b), merges. `formAssociated` is each component's own. Question 9 puts that to the owner.

**What the flattener reads in form E** ([P26](#evidence)): oxc-parser gives the annotation's two type arguments, `typeof ControlledElement` and the tuple with its rest element `...ButtonCoreTraits`, and the call `compose(ControlledElement)`. The flattener rewrites the initializer to the base, `= ControlledElement`, and inserts the traits' instance and static members and the brand install into the class. The annotation erases with the types.

### How a trait declares what it requires of its base

**A trait's superclass is a bound, never the component's base.** A bound is a constant written once and shared:

```ts
export const AnyElement: Bound<HTMLElement> = bound();
export const ObservedElement: Bound<
  HTMLElement,
  { readonly observedAttributes?: readonly string[] }
> = bound();
```

`Bound<I, S>` is an abstract constructor of `I` with statics `S`, plus a type-only static key, `[$bound]: (instance: I, statics: S) => void`, that records the requirement. At runtime a bound is `null` (revised from an empty class, see [A bound as `null`](#a-bound-as-null)), so a trait module needs no element class to load. A trait with no requirement extends nothing.

- **`this`** in a trait's member is the bound's instance type plus the trait's own members. `Disableable extends AnyElement` calls `this.hasAttribute` and `this.toggleAttribute`. A static member's `this` sees the bound's statics: `Observing.observed()` reads `this.observedAttributes` ([`traits-a.ts`](probes/types/traits-a.ts), which compiles clean). A trait with no bound that calls an element member fails with TS2339 ([P24](#evidence) (a)).
- **A trait may override a member of its bound,** with `override`, as `FocusForwarding.focus` does.
- **The check at application** reads the static key. A trait applies to base `B` when the key accepts `B`'s instances and `B` itself. The key is a property of function type, so its parameters are checked contravariantly. A base that fails the instance bound or the static bound fails with TS2344 at the annotation (P23 (iii.d), (iii.e)). A static bound whose members are all optional still rejects a base that doesn't declare them, by TypeScript's weak-type rule (_"has no properties in common"_). A bound on a class with an ES-private member is nominal: `Bound<ControlledElement>` rejects a plain `HTMLElement` base ([P24](#evidence) (b)).
- **A trait applies to any base that meets its bound.** `Counted`, with no bound, and `Labelled` apply to `Model`, a plain class that isn't an element (P23 (iii.f)).
- **A trait's statics reach the component** in form E. `Composed` adds each trait's statics without `prototype` and the bound key. `IconButton.zero()` resolves to `Counted.zero`, and the language service goes to its definition ([LSP](#evidence)).
- **The flattener copies only the trait's own members.** The bound's members are the base's, so the bound is dropped. oxc-parser gives each trait's superclass identifier and its `trait(this)` block (P26).

`$bound` is type-only, but consumers' declarations name it, so core exports it as a `unique symbol`.

**In Rust terms, a bound is a supertrait bound on the implementing type,** `trait Disableable: Element`. It differs from a supertrait in one way: a bound is a requirement, which the base must already meet, and a supertrait's members are supplied by the trait list.

### What changes for layer (a) in the other answers

- **Groups** stay tuple types, now of constructor types, `readonly [typeof Disableable, typeof FocusForwarding]`, because a trait's statics are on its constructor ([P24](#evidence) (f)). A host parameter is typed `Traited<typeof ControlledElement, Group>`. The group erases, so `RF-63` stays moot. **A supertrait** is an abstract trait class whose base is a composition over a bound, `Composed<typeof AnyElement, [typeof Disableable, typeof Labelled]>` (h). It is exported, so it takes form E's constant as well.
- **Brands.** `trait(this)` needs no symbol argument. The helper makes the class's brand and its `Symbol.hasInstance`, and the flattener installs the brand on a component by linking the trait class. `instanceof` on a trait class narrows to its instance type (d). The type brand, `#brand!: true`, still makes a trait whose members its bound already has nominal: a plain `div` fails (e). TypeScript 7 reports that as TS2741 and TypeScript 6 as TS2345. `RF-60` is unchanged, because a class is still a module-level identity.
- **Rust-like members.** A required member is still an abstract member: TS2515 when it's omitted (g), also through a supertrait (h). A provided member is overridden with `override`. **Associated functions now reach the component** in form E, which closes one of the gaps in [Rust-like traits](#rust-like-traits). **A new gap:** two traits with one static of different types give an overload and no error, and a call takes the first trait's signature (j). Instance members still intersect to `never` (i). Question 8's rule covers statics too.
- **Open questions:** question 1's recommendation becomes form E for layer (a), and question 9 is new. Questions 2, 3 and 5 belong to layer (b) or the migration and aren't revised here.

### The owner's refinement of form E

The owner refined form E in his own file, relayed by the coordinator, and asked whether it holds. [`example4/traits/_example4.ts`](probes/types/example4/traits/_example4.ts) is a byte-for-byte copy. Its `../element.ts` import resolves to [`example4/element.ts`](probes/types/example4/element.ts), which re-exports core's real `ControlledElement`, not the probes' stand-in. What it changes from form E:

- `@trait` is a class decorator under `experimentalDecorators`. It makes the class's brand symbol, records it in a module `WeakMap`, and defines `Symbol.hasInstance` on the trait class. The owner then noted that `@trait` is identical to `static { trait(this); }`, so the decorator is optional.
- `impl(this, ...traits)` in the component's static block installs each trait's brand on the component's prototype. The flattener is to generate that block.
- `Composed<B, T>` is `AbstractConstructor<InstanceType<B> & Instances<T>> & Statics<T>`. `compose<const B, const T>(base)` takes `B` from its argument and `T` from the annotation. `bound()` returns `{}`. There is no `Applicable`, and `Bound` isn't exported.

**The verdict: it replaces the study's form E as the recommended layer (a), with six fixes.** The owner accepted them, and fix 3 changed to `null` ([The owner's answers](#the-owners-answers)). Its shape is form E's: one annotated constant per component, and the list written once in a type. Its `compose` catches a case that form E's let through, and its `impl` makes the brand install a plain runtime call. The fixes are in [`example4/traits/fixed.ts`](probes/types/example4/traits/fixed.ts), each marked in the file. That file compiles clean in both compilers and emits declarations ([P28](#evidence)).

1. **`trait(this)` in a static block, not `@trait`.** Same behaviour, and none of the decorator's costs (below).
2. **`Applicable` comes back,** as the owner said, and with it `Bound`'s type-only key `[$bound]: (instance: I, statics: S) => void`. `Bound` is exported, and `Statics` omits the key.
3. **`bound()` returns `null`,** because a trait class extends its bound when its module is evaluated, and `{}` can't be extended. First proposed as `class {}`. The owner proposed `null`, which [A bound as `null`](#a-bound-as-null) adopts.
4. **`Composed` starts with `B &`,** which keeps the base's own statics.
5. **`compose` throws unless its argument is a bound,** that is, unless `base === null`. A supertrait composes a bound and runs unbuilt. A component's composition is replaced by the flattener, so one that runs means the flattener didn't.
6. **No hand-written `impl`.** The flattener derives the list from the annotation, with supertraits expanded.

#### 1. Does it typecheck, and what does it keep from form E?

**The file as written compiles clean in both compilers,** under `experimentalDecorators` and also without it, and emits declarations ([P27](#evidence)). Read case by case:

|  | As written ([P27](#evidence)) | Fixed ([P28](#evidence)) |
| --- | --- | --- |
| `override` on a trait member; omitted, TS4114 | yes | yes |
| An own field over a trait accessor | TS2610 | TS2610 |
| An accessor over a trait field (`RF-57`) | TS2611 | TS2611 |
| A trait's statics on the component | yes, `IconButton.zero()` | yes |
| The base's own statics | **no:** `static override formAssociated` fails with TS4113, and `define()` with TS2339 | yes (fix 4) |
| A base that doesn't meet a trait's bound | **no error.** A `Bound<ControlledElement>` trait on a plain `HTMLElement` gives the class `ControlledElement`'s member types. A `Bound<HTMLElement>` trait on a non-element gives it `hasAttribute` | TS2344 on instances, statics and through a supertrait (fix 2) |
| A bound declared outside the file | TS9010: `Bound` isn't exported, so it can't be annotated | yes (fix 2) |
| The call names a superclass of the annotation's base | TS2322 | TS2322 |
| The call names a subclass of the annotation's base | passes | passes |
| Required members through a supertrait | not read | TS2515 |
| Language service |  | hover and go-to-definition reach `Disableable.disabled`, `zero(): number` and the base's `define()` ([LSP](#evidence)) |

**`ControlledElement` declares no public static,** so on `IconButton` itself nothing is lost. The loss shows with any base that has one: the probes' stand-in, with its `observedAttributes`, or `StaticBase` in P27 (b).

**The owner's `compose` is better than form E's.** Form E's `compose<B, R extends B>(base: B): R` let a call naming a superclass of the annotation's base pass. Here the annotation's `B` has to accept the call's, so that case fails with TS2322. The remaining silent case, a call naming a subclass, gives the component more than its type says. The flattener still compares the two names. When the trait list fails `Applicable`, both compilers also report TS2322 on the same line, because `T` falls back to its constraint.

#### 2. `@trait` or the static block?

`@trait` has no type effect. A class decorator never changes the class's type, under either decorator mode ([P1](#evidence)), and declaration emit drops it. Its costs, read in P27 and [P29](#evidence):

- **TypeScript 7 supports `experimentalDecorators`.** It checks the decorator call and lowers it to `__decorate`, as TypeScript 6 does. Nothing in the repository's tracked sources uses a decorator, standard or legacy, or the `accessor` keyword. So turning the flag on breaks nothing today, but it is per tsconfig: every program that includes a trait module needs it.
- **The flag decides the runtime, not the types.** The file typechecks without it, because a one-parameter function accepts the standard decorator's two arguments.
- **Vite 8's oxc transform reads the flag from the tsconfig that includes the file.** With the flag, it lowers `@trait` into an import of `@oxc-project/runtime/helpers/decorate`. That package isn't installed in the repository, so the import doesn't resolve. Without the flag, the decorator passes through, and Node rejects it. tsdown wasn't read.
- **Node can't run the file unbuilt.** Type stripping rejects decorator syntax (`SyntaxError`). The repository runs TypeScript directly with `node`, so a probe or script that imports a trait module would need a build step.

**Recommended: the static block, `static { trait(this); }`.** It does the same thing at no cost: no tsconfig flag, no helper package, nothing for the flattener to strip, and Node runs the module unbuilt.

#### 3. At runtime without the flattener

- **`bound()` returning `{}` throws** when the trait's module is evaluated: `TypeError: Class extends value #<Object> is not a constructor or null` ([P29](#evidence) §3). Trait modules stay runtime code for `instanceof`, so a bound has to be something a class can extend: a constructor or `null` (fix 3). The flattener drops the bound, and a trait class is never constructed.
- **`compose` returning the base fails silently** (§4, with fix 3 alone applied). `IconButton` extends `ControlledElement` with no trait members. `disabled` and `count` read `undefined`, and `check()` returns `undefined`. Only a call to a trait method throws: `IconButton.zero is not a function`. `focus()` assigns an own `disabled` property. **And `instanceof Disableable` is true,** because the hand-written `impl` installed the brand on a class that doesn't have the trait's members.
- **With fix 5, it fails loudly:** importing the component throws `compose() of a component is replaced by the flattener` at module evaluation (§5). A supertrait's `compose(AnyElement)` still returns the bound (§6). The flattener rewrites the component's initializer to its base, so no flattened component calls `compose`.

#### 4. `instanceof`

In Node ([P29](#evidence) §6), with components as the flattener would emit them:

- **A component with `impl(this, Disableable, FocusForwarding, Counted)`** is `instanceof` each trait. A plain `ControlledElement`, `{}`, `null` and `1` aren't.
- **A subclass of a component** is too, because the brand is on the component's prototype.
- **A supertrait installs only its own brand.** `impl(this, LabelledButton)` makes the component `instanceof LabelledButton` but not `instanceof Disableable`. The supertrait's base is a composition, which is the bound at runtime, so nothing reaches `Disableable` through the prototype chain. With the list expanded, `impl(this, LabelledButton, Disableable)`, it is both. **So the flattener expands supertraits into the generated list** (fix 6).
- **TypeScript narrows** `node instanceof Disableable` to the trait's instance type (P27 (f), P28 (g)).
- **No `override` is needed.** `Symbol.hasInstance` is defined at runtime and never declared in the class body. TS4114 applies only to a declared static `[Symbol.hasInstance]` ([P21](#evidence) (c)).
- **`RF-60` still applies.** A second evaluation of a trait module makes a second class and a second brand, as before.

#### 5. The static block's list

**Hand-written, it is a second list that nothing checks.** `impl` accepts any constructors.

- A trait in the annotation but missing from `impl` has its members, but `instanceof` is false for it.
- A trait in `impl` but not in the annotation gets its brand with no members.
- `impl` skips a class that isn't a trait without an error (P29 §6).
- A supertrait's included traits aren't covered unless they are listed.
- A group can't be spread, because a group is a type, `ButtonCoreTraits`, and has no value. A value group would bring `RF-63` back.

**The flattener can derive the list from the annotation alone.** oxc-parser gives the annotation's tuple, each `typeof X` and each `...Group` ([P26](#evidence)). The flattener resolves a group alias as it resolves any type alias, and a supertrait through that supertrait's own annotation, so it expands both. It also adds a value import for each trait the generated block names, since a component may import a trait with `import type`. So the list stays written once, and `impl` stays a runtime helper that only generated code calls.

#### The owner's answers

The owner answered on 2026-11-19, relayed by the coordinator:

1. **`trait(this)` in a static block rather than `@trait`:** _"a pity, but valid."_ Accepted.
2. **`Applicable`, and a keyed, exported `Bound`:** _"yes, all correct."_ Accepted.
3. **`bound()`:** _"maybe bound returns `null`? It can be extended too."_ Probed below, and adopted.
4. **`Composed = B & …`:** _"right, I missed it."_ Accepted.
5. **A `compose` that throws for a component:** _"yes, I thought about that too."_ Accepted.
6. **An `impl` block that only the flattener writes:** _"that's what I planned; I just expressed it badly in code."_ Accepted.

#### A bound as `null`

**Recommended: `null`.** [`fixed.ts`](probes/types/example4/traits/fixed.ts) now returns `null` from `bound()`, and its `compose` throws when `base !== null`.

**The types don't change.** `bound()` keeps its signature, and a trait class extends the annotated constant `AnyElement`, not a `null` literal, so TypeScript sees `Bound<HTMLElement>` either way. With the fixed file switched to `null`, P27 and P28 print exactly what they printed with `class {}` in both compilers, the declarations included. P29 prints the same too. So `compose(AnyElement)` still returns the bound, and the unbuilt component still throws.

**At runtime, what differs only matters where a trait class is used as a class** ([P30](#evidence)), in Node, `class {}` against `null`:

|  | `class {}` | `null` |
| --- | --- | --- |
| The trait module evaluates | yes | yes |
| The trait's prototype inherits `Object.prototype` | yes | **no:** no `toString`, `hasOwnProperty` or the like |
| The trait's constructor inherits `Function.prototype` | through the bound | directly |
| `new Trait()` | an object | **throws:** _"Super constructor null of Disableable is not a constructor"_ |
| `super.x` in an instance member called in place | `undefined` | **throws:** _"Cannot read properties of null"_ |
| `this.observedAttributes` and `super.x` in a static member | `[]`, `undefined` | `[]`, `undefined` |
| `instanceof` the trait: a branded component, `{}`, an object made from the trait's prototype | true, false, false | true, false, false |
| `instanceof` without `trait()`, by the prototype chain | true | true |

**Nothing in the mechanism does the things that differ.**

- A trait class is never constructed, built or unbuilt. A component's base becomes the real base, and the unbuilt component throws in `compose` first.
- A trait's members never run in place. The flattener copies their source into the component, where `super` means the component's base.
- The test-only equivalence reference ([item 6](#what-every-class-form-asks-of-the-flattener)) reads a trait's own property descriptors, which don't depend on the prototype's prototype.

Where `null` differs, it throws rather than quietly returning `undefined`, so a misuse fails loudly.

**`compose` checks `base !== null`.** Every bound is the same value, so the `BOUNDS` `WeakSet` goes. A `WeakSet` can't hold `null` anyway. A supertrait's `compose(AnyElement)` gets `null`, returns it, and its class extends `null` unbuilt (P30). A component's `compose(ControlledElement)` throws. So does `compose(undefined)`, the value a base has while an import cycle leaves it uninitialized: such a base fails loudly instead of being taken for a bound.

**The flattener tells bounds apart by source only.**

- At runtime, every bound is `null`, and nothing needs to tell them apart. `Applicable`'s check is type-only, and the brands are keyed by trait classes, not bounds.
- In source, the flattener needs to know that a trait's superclass is a bound in order to drop it. It does that by resolving the superclass identifier to its declaration, a constant initialized by `bound()` and annotated `Bound<…>`, as oxc-parser gives it ([P26](#evidence)).
- It needs no bound's identity for anything else.

**What `null` saves:** a class per bound in each trait module's runtime code, the `WeakSet`, and its lookup.

## What every class form asks of the flattener

**The emitted class is today's lowered shape:** a class that extends `ControlledElement`, with each trait's members in trait order before the class's own, a merged `static observedAttributes` when a trait declares attributes, and one static block that installs every brand on the prototype. So the runtime contract in [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md) §Compatibility contract carries over. What changes is the input, and whether flattening is optional.

**What carries over** ([P8](#evidence)):

- the free-reference walker. It reads a class-declaration trait's members as it reads a method trait's: the accessors' `attr` and `Bool`, the method's module binding `controls`. It retains a member that uses `super`;
- binding linking, synthetic exports, member insertion, the brand install and `observedAttributes` merging in `lower.ts`;
- the layer rules: accessor halves, `super.key` and computed `super[key]`;
- the edits, through `RolldownMagicString`. Removing every decorator span leaves valid TypeScript.

**What is new:**

1. **Recognition.** One of the markers above, and a trait as a class with core's `trait(this, $brand)` block. Today's `analyzeModule` returns no composition and no bailout for the decorator form ([P8](#evidence) §1). It would pass the form through in silence.
2. **Normalization of a class-declaration trait.** Its attribute table becomes today's descriptor accessors and converter links, read as today's `trait({ … }, brand)` argument is read. Its methods and accessors become method-trait members. In the interface forms and in form D, a trait in the consumer's own module is a class declaration and not an expression.
3. **The trait module's own lowering.** The module stays runtime code for `instanceof`, so it has to parse. The flattener deletes each `accessor` line from a trait class, in every build of the trait's module, core's included. With `@attr`, it rewrites each decorated line into the table instead.
4. **Every bailout is a build error.** A, B and D have no runtime composition to fall back on. The twelve reason codes stay as diagnostics, and their severity changes. So does the document's _Purpose_: the plugin stops being an optimization, and the source form stops working without it.
5. **A trait whose code crosses packages needs the language rule widened.** Question 3 explains it. With attributes as tables, core's traits carry no code, and nothing crosses packages today. With explicit `get`/`set` attributes, every core trait would fail with `trait-source-language`.
6. **The runtime-equivalence tests lose their reference.** They compare a composed class with the flattened one, and A, B and D have no composed class. A test-only reference that copies each trait class's prototype descriptors in order gives them one. That takes a few lines, and it doesn't ship.
7. **Every build that loads material-x source has to install the plugin.** The shared Vite, Vitest and tsdown configurations do today. Form D's throwing `Traits` and form A's decorator make a configuration that misses it fail loudly. Form B gives no sign.
8. **Supertraits and conflicts.** A trait class whose base is `Traits<[…]>` is expanded as a tuple alias is. Two traits that supply one key fail the build unless the component declares the key itself (question 8). An abstract member isn't copied.

## How the forms meet the open records

- **`RF-57`: closed by any class form.** The finding's subject is the transformer `trait()`, whose `Omit` delta is a mapped type that hides a field from TS2610 and TS2611. In every class form, a subclass's accessor over a trait's field fails with TS2611 (P2 (e), P4 (d), P11 (c)), because the types keep each member's declaration kind. That is the type-level repair the entry calls unread. In forms A, B and D the transformer `trait()` goes. A trait field is a build error anyway, so the runtime hazard can't come from a trait. **In form C,** `impl`'s runtime copies descriptors, and a trait field would be a prototype value, so the subset rule still has to exclude fields.
- **`RF-63`: moot in forms B and D, not in A or C.** In B and D, the shared lists become interfaces or tuple types. They erase, so no bundle can keep one, and the required property's first branch holds with nothing to measure. In A, the decorator's lists are values, and a shared one built with a spread is the same defect. In C, the lists stay. **If the owner picks B or D and the migration is near,** the repair planned on `repo/dead-spread-1` at `02e0c2e20` isn't needed, and `RF-63` closes when the migration merges. If the migration is far off, the repair is five literals, one lint rule and one sentence, and it can land in the meantime. The owner decides that (question 5).
- **`RF-60`: its rule still applies in every form.** Its cause is Vite's module runner, which evaluates a file twice when the file is requested under two URL strings. A class trait's brand is still a module-level `Symbol`, and its trait class is a module-level identity, so a second evaluation still splits either one. The entry already says that `flattenToDir`'s one-URL rule stays after a Vite fix, because it keeps the tests independent of the runner. The rule moves with the harness when item 6 above reworks the equivalence tests.
- **`RF-54`: the mapped `Branded` type isn't needed** in forms A, B and D, because an attribute is an accessor and a subclass's accessor override typechecks. TextFieldCore's `override get value()`, the component's own override of `Valuable`'s accessor, keeps `override` in form D. In A and B it drops `override` (TS4113).
- **A hazard found on the way, which predates this study.** A component's own field over a trait's accessor typechecks today (P10) and in forms A and B (P6 (d)). At runtime the field is an own property of every instance and shadows the accessor, so the attribute stops reflecting. The flattener doesn't check it either. Form D reports it as TS2610 (P11 (g)). No component in the tree does this today. [Proposed record changes](#proposed-record-changes) proposes a finding.

## Migration surface

| Area | What changes | Rough size |
| --- | --- | --- |
| `@ydinjs/core` trait runtime | `primitives.ts` and `attributes.ts` (445 lines) give way to `Traits`, `Traited`, the `trait(this, $brand)` brand helper, the `AttributeTable` type, and the props helper | small: about 150 lines |
| core's traits | 8 descriptor traits become classes (`Checkable`, `Disableable`, `Linkable`, `Nameable`, `Reorderable`, `Selectable`, `Typeable`, `Valuable`). Their `use…` functions take the class as the host type | about 120 lines, mechanical |
| core's tests | `primitives`, `traits` and `overrides` browser and declaration tests (about 460 lines) are rewritten. core's tests make 13 `impl(…)` calls in all, mostly set-up | medium |
| material-x | 24 source files: 7 descriptor traits and `FocusForwarding`, 9 trait lists, 16 composition sites, and the type helpers (`TraitedConstructor` ×20, `Interface` ×16, `Props` ×16, `Traited` ×9). No test file names the trait API | medium, mechanical. Built output should keep the same runtime shape |
| `vite-traits-plugin` | `analyze.ts` recognition and list resolution, `normalize.ts` trait normalization, the trait module's lowering, and severities. The walker, `lower.ts` and `ir.ts` carry over | large: roughly a third to a half of `src`'s 2,971 lines |
| the plugin's tests | the 18 fixture entries rewritten in the new form; equivalence rows get the test-only reference (item 6); bailout rows assert errors | large: most of 1,981 lines touched |
| documentation | [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md) is rewritten from _Purpose_ down, because the plugin becomes required. [`architecture.md`](../../.agents/docs/architecture.md) lines 7, 19, 46–50, 70, 97 and 120, and core's `README.md` (two examples and the trait list) change | medium |

**Order:** core's trait runtime and the plugin land together, because in A, B and D nothing runs without the plugin. The plugin can accept both today's `impl` sites and the new marker during the migration. material-x then moves component by component, and the `impl` path is deleted last. **Form C** is only the first two rows, smaller, and the plugin stays optional.

## Open questions for the owner

1. **Which marker?** Form A (decorator and interface), B (interface only), C (`impl()` over class traits) or D (type arguments). **Revised: for layer (a), where the component chooses its base, form E,** an annotated composition ([Layer (a)](#layer-a-traits-on-any-base)), **in the owner's refined shape with six fixes** ([The owner's refinement of form E](#the-owners-refinement-of-form-e)): `trait(this)` in a static block rather than `@trait`, `Applicable` restored, `bound()` returning `null`, `B &` in `Composed`, a `compose` that throws for a component, and an `impl` block that only the flattener writes. Form D's type arguments can't carry the base's statics or a trait's. The rest of this answer is the first recommendation: **D.** Its list is written once and erases, it needs no interface, `override` works on trait members, and it reports both override hazards. The decorator you proposed can't carry the types, and form A needs the interface beside it. If you want the decorator anyway, A works, and the flattener checks that its two lists agree.
2. **How does a trait declare an attribute?** Every form is in [Attributes](#attributes). Three keep every check:
   - a static table and an `accessor` line, two lines per attribute;
   - `@attr(Converter) accessor`, one line;
   - an explicit `get`/`set` pair, six lines.

   **Recommended: the static table and `accessor`.** It is declarative, as today's descriptor is, and the table's type checks each converter against its member. The flattener reads it as it reads today's descriptor, and only the table is left in built JavaScript. It needs no decorator. `@attr` does the same job in one line, through a decorator that the flattener has to rewrite into the table. The explicit pair needs no transform, but it puts code in core that material-x would have to copy (question 3). **This was `@attr` in the first version of the study,** before the owner asked whether form D depends on it. It doesn't, and the table keeps everything `@attr` gave. `readonly accessor` is rejected by TypeScript (TS1243). No attribute in the repository is read-only, so read-only needs no form now.

3. **Can material-x's flattener copy code out of core's built JavaScript?** (Reworded on the owner's request.)
   - **What happens today.** material-x is built against core's compiled `.js` files, not core's TypeScript. Each core trait is an attribute list, `trait({ disabled: Bool }, $disableable)`. To flatten a component, the flattener reads only the names in that list, `disabled` and `Bool`, and writes the accessor code itself. It copies no code out of core. The one trait with real code, `FocusForwarding`, is in material-x. The flattener copies its `focus()` from one `.ts` file into another `.ts` file.
   - **The rule that matters.** The flattener copies a member's code only between files of the same type: `.ts` into `.ts`, `.js` into `.js`. A few rare constructs mean one thing in JavaScript and another in TypeScript, such as `a < b > (c)`. So pasting `.js` code into a `.ts` file could change what it does with no warning. Today, when the types differ, the composition stays at runtime with a warning.
   - **What breaks with class traits.** That depends on question 2. With table attributes, core's built `.js` still holds only names, and nothing changes. With explicit `get`/`set` attributes, or once core has a trait with methods, material-x's flattener has to copy `.js` code from core into its `.ts` components. The rule forbids that, and a class trait has no runtime fallback, so the build fails.
   - **What you are choosing:**
     - (a) **nothing now.** Attributes are tables, and a trait with methods is written in the package that uses it, as `FocusForwarding` is. A cross-package method trait is a build error that names the case;
     - (b) **allow the copy with a check.** The flattener parses the copied code as JavaScript and as TypeScript, and copies it only when both readings agree. `RF-44`'s ruling named this as the way back;
     - (c) **run the flattener after TypeScript is removed,** so that every file is JavaScript. That works only with form A, because form D's list and form B's interface disappear with the types.

   **Recommended: (a),** with question 2's table. Build (b) when a trait with methods first has to cross packages.

4. **Should a trait whose members the base already has get a type brand?** That is `FocusForwarding` and `ButtonGroupLike`. **Recommended: yes, a required `#brand!: true` field,** which the flattener doesn't copy. Without one, `useFocusForwarding` accepts any element.
5. **What happens to `RF-63`'s repair on hold?** **Recommended:** keep it on hold if you choose B or D and the migration starts soon. Close `RF-63` when the migration removes the lists. Land the repair, which is small, if the migration waits.
6. **Should the flattener lower `super.key` for a trait's key** inside the component, so that a component can wrap a trait's method? Today that site is retained. In forms A, B and D it would be a build error. **Recommended: no, not now.** No component does it. The error names the case, and lowering is added when a component needs it.

   **Answered by the owner on 2026-11-19: not now** (_"пока нет"_), relayed by the coordinator. Inside a component, `super.key` for a key that a trait supplies stays a build error, under the reason code `class-super-trait-member`.

7. **How are traits grouped?** [Groups of traits](#groups-of-traits) reads four shapes. **Recommended: tuple types under form D,** and a supertrait class only where a group needs its own brand or required members. In the sketch's call shape a group is either a value that stays, so `RF-63` returns, or a type that the call repeats.
8. **Should two traits that supply one key fail the build?** TypeScript intersects instance members to `never` with no error, and overloads statics with no error ([P24](#evidence) (j)). Today the later trait wins. **Recommended: yes, unless the component declares the key itself.** That is Rust's disambiguation, and no component in the tree combines two such traits today. The answer doesn't depend on the form.
9. **Do traits carry static members in layer (a)?** `primitives.ts` carries them today, and only form E gives them to the component. Today no trait contributes a static except `observedAttributes`, which the attribute layer merges. **Recommended: yes, and form E,** as `primitives.ts` does. If you drop them, the marker per base, (ii), saves the constant on every component.

## Proposed record changes

For the main slot's architect. This study doesn't edit them.

- **`RF-57`:** add a dated note. Every class-trait form reports the subclass accessor override as TS2611, because its types keep each member's declaration kind, and forms A, B and D remove the transformer `trait()`. If the owner adopts one, the finding closes with the migration. Link this study.
- **`RF-63`:** add a dated note that the repair is on hold for this study. In forms B and D the lists become types, and the required property holds with no list left to keep. The closure then follows the migration.
- **`RF-60`:** no change. Its rule in `flattenToDir` applies to every form.
- **A new finding, Tier C, proposed wording:** _"A component's own field over a trait's accessor shadows the accessor at runtime, and neither TypeScript nor the flattener reports it."_ Today's form typechecks it (P10), and the flattener's layer rules check only accessor halves. No component does it today. Required property: the types or the flattener reject it. Form D's types do (TS2610). Under today's form, the repair is one more layer rule, a class field whose key a trait supplies.
- **A question, if the owner wants it registered:** the marker choice and questions 2 to 5 above, routed to the owner. Question 6 is answered.

## Evidence

Every probe is under [`probes/`](probes/), and every transcript is under [`checks/`](checks/), read on 2026-11-19. P1 to P12 were read at `d1ea40e22`, P13 to P16 at `20817d665`, P17 to P22 at `dc5bc5853`, P23 to P26 at `28014c589`, P27 to P29 at `554cdf7dc`, and P30 at `85c644b85`. P27 to P29 were run again at `85c644b85` with the fixed file's `null` bound, and printed the same. Each of those commits changed only this study, and the type transcript was regenerated at each.

- **The type probes, P1 to P6, P9 to P14, P16, P17 to P21, P23 to P25, P27 and P28** ([`probes/types/`](probes/types/), [transcript](checks/types.txt)). [`run.sh`](probes/types/run.sh) checks each probe alone with `tsc` (TypeScript 7.0.2) and `tsc6` (6.0.3), under a tsconfig that copies `tsconfig.base.json`'s checking options, `isolatedDeclarations` and `erasableSyntaxOnly` among them. It prints the declarations for the probes that compile. Each case states its expected result in a comment. **The two compilers agree on every line,** apart from the wording of one message in P9. In P13 (10), the explicit setter with the wrong converter, both report TS2345: TypeScript 7 at the value argument, and TypeScript 6 at the converter.
  - P1: a decorator alone, also under `experimentalDecorators`.
  - P2: form A, and P2b: the typed decorator.
  - P3: form B with a group. P4: form C.
  - P5: `@attr` accessors. P6: member kinds and the static side.
  - P9 and P9b: brands and the props helper. P10: today's form, read through core's built declarations.
  - P11 and P12: form D.
  - P13: attribute forms under form D. P14: read-only attributes and `readonly accessor`. P16: a static table with accessor signatures in a merged interface.
  - P17: the owner's sketch as written, read through [`sketch/_example.ts`](probes/types/sketch/_example.ts), a byte-for-byte copy. Its `../attribute.ts` import resolves to [`attribute.ts`](probes/types/attribute.ts), which re-exports core's real `attribute.ts`. P18: the sketch with the fewest fixes, [`sketch-fixed.ts`](probes/types/sketch-fixed.ts). P19: groups in the sketch's shape and in form D. P20: required and provided members, in form D and in the sketch's shape. P21: a trait class as its own `instanceof` target.
  - P23: layer (a), how a component names its base and its traits, in three candidates. P24: layer (a), bounds, `this`, brands, groups and Rust-like members. P25: form E with no error case, whose declarations are printed. All three read [`layer-a.ts`](probes/types/layer-a.ts) and [`traits-a.ts`](probes/types/traits-a.ts).
  - P27: the owner's refinement of form E as written, read through [`example4/traits/_example4.ts`](probes/types/example4/traits/_example4.ts), a byte-for-byte copy, with core's real `ControlledElement`, under [`example4/tsconfig.json`](probes/types/example4/tsconfig.json), which turns on `experimentalDecorators`. P28: the fixed version, [`example4/traits/fixed.ts`](probes/types/example4/traits/fixed.ts), whose declarations are printed. Both files themselves compile clean in both compilers. In P27, TypeScript 6 reports TS9010 only when it emits declarations, so `run.sh` doesn't pass `--noEmit`.
- **P7, the toolchain** ([`probes/toolchain/probe.ts`](probes/toolchain/probe.ts), [transcript](checks/toolchain.txt)). oxc-parser's view of forms A and D, oxc-transform's output for each decorator mode and for form D, oxc's isolated declarations, and Node's reading of a decorator.
- **P15, each attribute form's JavaScript** ([`probes/toolchain/attribute-js.ts`](probes/toolchain/attribute-js.ts), [transcript](checks/attribute-js.txt)). oxc-transform's output for each form with no flattener, and whether Node 26.13 parses it (`node --check`).
- **P22, the sketch through the toolchain** ([`probes/toolchain/sketch.ts`](probes/toolchain/sketch.ts), [transcript](checks/sketch.txt)). §1: what oxc-parser gives the flattener in the sketch, with no `@trait`. §2: the brand at runtime in Node, with plain classes in place of `HTMLElement`.
- **P29, the owner's refinement at runtime** ([`probes/toolchain/example4.ts`](probes/toolchain/example4.ts), [transcript](checks/example4.txt)), in Node 26.13 with an `HTMLElement` stand-in. §1: Node on the file unbuilt. §1b: `tsc` and `tsc6` emit under `experimentalDecorators`. §2: Vite 8's oxc transform with and without the flag in the file's tsconfig, and whether its helper resolves. §3 and §4: the owner's file lowered and evaluated, as written and with `bound()` returning a class. §5 and §6: the fixed file unbuilt, and its brands with components as the flattener would emit them.
- **P30, a bound as `class {}` against `null`** ([`probes/toolchain/bound-null.ts`](probes/toolchain/bound-null.ts), [transcript](checks/bound-null.txt)), in Node 26.13: what a trait class that extends each one does, and the fixed `compose` with a `null` bound.
- **P26, layer (a) through oxc-parser** ([`probes/toolchain/layer-a.ts`](probes/toolchain/layer-a.ts), [transcript](checks/layer-a.txt)): form E's base and list, and each trait's bound and brand block.
- **P8, the flattener's machinery** ([`probes/toolchain/machinery.ts`](probes/toolchain/machinery.ts), [transcript](checks/machinery.txt)). It runs the plugin's own `analyzeModule` on form A, its `collectFreeReferences` on class-declaration traits, and a decorator strip with `RolldownMagicString`.
- **The language service** ([transcript](checks/lsp.txt)): hover and go-to-definition on a trait member in forms A and D, in the sketch with its fixes, in layer (a)'s form E and in the owner's refinement with its fixes, a trait's static member and the base's included, through this harness's TypeScript language server. Its diagnostics match `tsc`'s, apart from TS9021, which it didn't publish for the sketch's probe.

**Not read:**

- a runnable prototype of the flattener in any form. The owner asked for feasibility, and the machinery probe stops at the parts that carry over;
- bundle sizes. Form D's output is today's lowered shape, so nothing is expected to change, but that isn't measured;
- conflicting members in form C, and the own-field case in form C;
- whether a bundler drops an unused literal group with no spread ([Groups of traits](#groups-of-traits) (b)). That is `RF-63`'s measurement;
- browsers. No decorator reaches the output in a working build.