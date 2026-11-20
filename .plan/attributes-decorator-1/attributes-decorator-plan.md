# `@attributes(TABLE)`: layer (b) declares a trait's attributes with a decorator that the plugin compiles

**The decision,** as `RD-26`'s second amendment of 2026-11-20 records it ([register](../00-index.md#rd-26--traits-are-plain-classes-in-two-layers-a-component-names-its-traits-in-a-composed-annotation-and-the-flattener-is-a-required-build-step)). This plan holds the design, the proofs and the files that it adds to the [`@trait` plan](../trait-decorator-1/trait-decorator-plan.md). It answers that plan's [open question 2](../trait-decorator-1/trait-decorator-plan.md#open-questions). It was written by Architect B on `repo/attributes-decorator-1`, from `repo/trait-decorator-1` at `6211e435f`, for the implementer to merge into that branch.

**The owner's authorization,** relayed by the coordinator on 2026-11-20: _"`@attributes(TABLE)` давай сделаем вместе с `@trait`, чтобы задача была в целом 'move to decorators'"_ ("let's do `@attributes(TABLE)` together with `@trait`, so the task as a whole is 'move to decorators'"). It ships in the same pull request as `@trait`. His decisions for `@trait` carry over:

- trait sources always go through the plugin;
- the plugin compiles the decorator itself, not oxc-transform;
- the built JavaScript stays what it is, so a built trait is recognized as before, an application build still deletes members, and consumers of built packages see no change.

## The source form

```ts
import { trait } from '@ydinjs/core/traits/composition.js';
import {
  AnyElement,
  attributes,
} from '@ydinjs/core/traits/attribute-traits.js';

@trait
@attributes(DISABLEABLE_ATTRS)
export class Disableable extends AnyElement {
  accessor disabled!: boolean;
}
```

- **`@trait` comes first, and `@attributes(TABLE)` second,** each on its own line above `export class`, which is how `oxfmt` prints them ([P46](#evidence) (s)). The class reads as what it is, then what it declares. The plugin accepts this one order. The reverse order type-checks ([P46](#evidence) (r)), so the plugin reports it as an error.
- **`@attributes` decorates only a class that `@trait` decorates.** Layer (b) is sugar over a layer (a) trait (`RD-26` property 6). Today every class that calls `attributes` is a trait, except the classes in core's `attribute-traits.declaration.test.ts`. Those become traits.
- **TABLE is what it is today:** an object literal whose converters are identifiers or member expressions, or a module-scope `const` bound to one.
- **A trait has no static block left.** `@trait` replaced `trait(this)`, and `@attributes` replaces `attributes(this, TABLE)`.

## The decorator's type

core's `traits/attribute-traits` keeps `attributes`, with a new signature. `AttributeKeys`, `ConverterFor` and `AttributeTable` don't change.

```ts
/**
 * Whether `Table` fits instances `I`: every key names an attribute member, and
 * every converter reads exactly that member's type.
 */
type Fits<Table, I> = [Exclude<keyof Table, AttributeKeys<I>>] extends [never]
  ? [Table] extends [AttributeTable<I>]
    ? true
    : false
  : false;

declare const tableDoesNotFit: unique symbol;

/** The parameter type that a table that doesn't fit the class gives. */
type TableDoesNotFit<Table> = { readonly [tableDoesNotFit]: Table };

/** The class decorator that `attributes(TABLE)` returns. */
export type AttributesDecorator<Table> = <
  C extends AbstractConstructor<object>,
>(
  value: Fits<Table, InstanceType<C>> extends true ? C : TableDoesNotFit<Table>,
  context: ClassDecoratorContext<C>,
) => void;

export function attributes<const Table extends object>(
  _table: Table,
): AttributesDecorator<Table> {
  throw new Error('…');
}
```

- **The table is checked against the decorated class.** TypeScript checks `attributes(TABLE)` as an ordinary call, which fixes `Table`. Then it applies the returned generic decorator to the class. It infers `C` from the decorator context, and the class must be assignable to `value`'s type. When the table doesn't fit, that type is `TableDoesNotFit<Table>`. The error is TS1238 on the `@attributes` line, and its text names `tableDoesNotFit` and the table's type ([P46](#evidence) (f) to (n)).
- **Every case that core's declaration tests check today still fails** ([P46](#evidence) (f) to (m)): a converter of another type, `Str` on a member that can't be `null`, a converter narrower than the member, a key that names no member, a method or `HTMLElement`'s member, any key on a class with no attribute member, and a shared constant whose converter doesn't fit.
- **One case is stricter than today** ([P46](#evidence) (n)). A shared constant with a key that names no member was accepted by the type of `attributes(this, TABLE)`, because a constant isn't a fresh literal and gets no excess-property check. The plugin reported it, at build time. `Fits` checks the keys itself, so TypeScript now reports it too.
- **A key without an entry stays legal in the types,** as today. Every key of `AttributeTable` is optional, and the plugin reports an accessor without an entry.
- **It changes no type.** The class's type is its heritage's, and the declarations that both compilers emit carry no decorator ([P46](#evidence) (a) to (e)).
- **The body throws, with a message that names the plugin,** as `trait` and `compose` do. Today's empty body ran only if an unbuilt module was evaluated, and trait sources always go through the plugin. A decorator factory runs when the class is defined, so a toolchain that lowers decorators reaches the named error. No built module imports `attributes`.
- **`NoInfer` and the `_trait` parameter go.** The class isn't an argument any more.
- **`AttributesDecorator` is exported,** because `attributes`'s declared return type names it under `isolatedDeclarations`. `Fits`, `TableDoesNotFit` and `tableDoesNotFit` stay private, as `AttributeKeys` is.

[P46](#evidence) checks this with TypeScript 7.0.2 and 6.0.3, under the trait probes' options (`isolatedDeclarations`, `erasableSyntaxOnly`, standard decorators). The two compilers agree on every line. Its misuse cases:

- (o) `@attributes` not called: TS1270;
- (p) the old `attributes(this, TABLE)` in a static block: TS2554;
- (q) on a member: TS1240;
- (r) above `@trait`: no TypeScript error, so the plugin refuses it.

## What the plugin does

**Layer (b)'s transform** (`attributes/lower.ts`) recognizes the decorator where it recognized the call. For each module-scope class declaration whose decorators are `@trait` followed by `@attributes(TABLE)`, with `attributes` imported from `…/attribute-traits` and `trait` from `…/composition`, aliases included:

1. it reads TABLE as today;
2. it lowers each `accessor name!: T` line to a getter and a setter, as today;
3. it inserts `static observedAttributes = […];` first in the class body, as today;
4. it removes the `@attributes(…)` decorator's text and leaves `@trait` for the trait module's transform;
5. it removes `attributes` from its import when nothing else uses it, and the import when it is empty.

**The trait module's transform** (`composition/trait-module.ts`) compiles `@trait` as the `@trait` plan says, with one change:

- **The method goes after a leading `static observedAttributes`.** Today's built class body is `static observedAttributes`, then `static [Symbol.hasInstance]`, then the members, because the method replaced the static block that came after the inserted line. With no static block, the method would go first, before that line. So when the class body begins with the `static observedAttributes` that layer (b) inserted, the method goes right after it. Otherwise it goes first.
- **No empty static block is left to remove.** The `@trait` plan's rule that removes the empty static block that layer (b) leaves is deleted. Any static block in a `@trait` class is `trait-member`.

**The rest doesn't change:**

- `observedAttributes`'s hoisting into a build-only constant;
- reading a trait from source for a composition in the same package, which lowers layer (b) first (`plugin.ts`'s `lowered`);
- the built-trait recognition;
- the deletion of an application build's instance members.

**The pre-filters.** Layer (b)'s transform, and `lowered` in `plugin.ts`, run only on a module whose text contains `attributes(`. Both become `attributes`, so a bare `@attributes` reaches the diagnostic.

## Diagnostics

**One new error code, `attributes-decorator`,** raised in layer (b)'s transform. It checks every module that imports `attributes` from `…/attribute-traits`, whether or not a valid class is left in it:

| Misuse | Message names |
| --- | --- |
| `@attributes` not called, or called with no argument, several arguments or a spread | the decorator takes one table: `@attributes(TABLE)` |
| `@attributes(…)` on a class that `@trait` doesn't decorate | `@attributes` decorates a `@trait` class |
| `@attributes(…)` above `@trait`, or twice | `@trait` comes first, then one `@attributes(TABLE)` |
| `@attributes(…)` on a class expression, a nested class or a member | `@attributes` decorates a module-scope class declaration |
| Any other reference to the imported `attributes`: a call such as the old `attributes(this, TABLE)`, a re-export, passing it as a value | `attributes` is used only as `@attributes(TABLE)` above a class |

**Existing codes:**

- **`attribute-table`** keeps its table rules and messages: the table's form, a static key, a converter's form, an accessor without an entry, and an entry without an accessor. Its message _"attributes() takes this and a table"_ goes, because `attributes-decorator`'s first row replaces it.
- **`attribute-accessor`** doesn't change.
- **`trait-decorator`'s third row,** in the `@trait` plan, becomes: _"`@trait` is the class's first decorator, and the only other is `@attributes(TABLE)`"_. A third decorator, or another decorator beside `@trait`, is still that error.
- **`trait-member`'s static-block message,** in the `@trait` plan, becomes: _"a trait has no static block"_.
- **`trait-class.ts`'s message for an accessor field,** _"an accessor field; attributes(this, …) declares it"_, becomes _"an accessor field; @attributes(TABLE) declares it"_.

## The proofs the implementer adds

They follow the `@trait` plan's [proofs](../trait-decorator-1/trait-decorator-plan.md#the-proofs-the-implementer-delivers) and its rule: each names the change it witnesses, and a test fails without that change.

1. **Proof 1, the built output, gains two expected differences.**
   - Every `.js` file is still byte-identical without its `sourceMappingURL` comment, apart from `list/list-item.js` and core's `traits/attribute-traits.js`, whose `attributes` now throws.
   - Every `.d.ts` is still identical, apart from those the `@trait` plan lists and core's `traits/attribute-traits.d.ts`, whose `attributes` signature and the exported `AttributesDecorator` are new. The difference is listed.
   - In particular, each layer (b) trait's class body still reads `static observedAttributes`, then the method, then the members.
2. **Layer (b)'s transform** (`attributes.node.test.ts`), each against expected text:
   - an inline table and a module constant;
   - an aliased import of `attributes`, and an aliased import of `trait`;
   - `@trait` left in place, and `@attributes(…)` removed;
   - the `attributes` import removed when unused, and kept when another name from it is used;
   - each case also through the trait module's transform, with the method after `static observedAttributes`.
3. **`attributes-decorator`** (`diagnostics.node.test.ts`):
   - one module for each row of the table, with its code and position;
   - a bare `@attributes`, which reaches the diagnostic through the pre-filter;
   - a third decorator beside `@trait` and `@attributes(…)`, which is `trait-decorator`;
   - a static block in a `@trait` class, empty or not, which is `trait-member`.
4. **Flattening reads the decorator** (`flatten.node.test.ts`, `vite.node.test.ts`):
   - a component that composes a layer (b) trait read from source, in the Vite dev path and in a build;
   - the runtime-equivalence cases with the fixtures `checkable.ts` and `nameable.ts` moved to `@attributes`.
5. **core's types** (`attribute-traits.declaration.test.ts`):
   - every case moves to the decorator, with `// @ts-expect-error` above the `@attributes` line;
   - plus a shared constant with an extra key, a bare `@attributes` and the old `attributes(this, TABLE)`, each a type error;
   - a decorated class's member types are its declared ones.
6. **core's runtime** (`attribute-traits.browser.test.ts`): its traits move to `@trait` and `@attributes`, and calling `attributes(TABLE)` unbuilt throws the named error.
7. **No old form is left:** outside `.plan/`, no `attributes(this` remains in a source, a test, a fixture or a document (a `git grep` witness). The `@trait` plan's proof 9 gains this line.
8. **Size:** the `@trait` plan's proof 10 holds unchanged. No layer (b) trait's row moves, because the output is the same.

## The files it adds

The `@trait` plan's [file list](../trait-decorator-1/trait-decorator-plan.md#the-files-the-migration-touches) already has most of them. This pass adds a second change to each, or a new file:

- **core's layer (b) traits,** from `static { attributes(this, TABLE); }` to `@attributes(TABLE)`: `src/traits/checkable.ts`, `disableable.ts`, `linkable.ts`, `nameable.ts`, `reorderable.ts`, `selectable.ts`, `typeable.ts`, `valuable.ts`.
- **core's `src/traits/attribute-traits.ts`:** `attributes`'s signature, body and comment, `AttributesDecorator`, and the private `Fits` and `TableDoesNotFit`.
- **material-x's layer (b) traits:**
  - `src/button/ButtonCore.ts`;
  - `src/button/IconButtonCore.ts`;
  - `src/button/split-button.ts`;
  - `src/checkbox/checkbox.ts`;
  - `src/fab/fab.ts`;
  - `src/text-field/TextFieldCore.ts`.

  `ButtonGroupCore.ts` and `focus-forwarding.ts` have no attributes.

- **The plugin:**
  - source: `src/attributes/lower.ts`, `src/plugin.ts` (both pre-filters), `src/diagnostics.ts` (`attributes-decorator`, and the texts of `attribute-table`, `trait-decorator` and `trait-member`), `src/composition/trait-module.ts` (the method's place, and no empty-block removal), and `src/composition/trait-class.ts` (the accessor message);
  - tests: `attributes.node`, `diagnostics.node`, `flatten.node`, `trait-module.node`, `vite.node`, and the fixtures `checkable.ts` and `nameable.ts`.
- **core's tests:** `tests/traits/attribute-traits.browser.test.ts`, `attribute-traits.declaration.test.ts`.
- **Documents:**
  - `.agents/docs/trait-flattener-plugin.md`: _The two layers_, _What the plugin does to each module_ step 1, _A trait module's own transform_, _Diagnostics_ and _Verification_, with a change record row;
  - `.agents/docs/architecture.md` §Traits and attributes, the layer (b) bullet;
  - `packages/core/README.md`, both examples.

The implementer greps for `attributes(` to confirm the list before starting, and records any file it misses.

## Not adopted

- **`@attributes` on any class.** Today's transform lowers any module-scope class that calls `attributes(this, …)`. Only one declaration test used that, and `RD-26` property 6 makes layer (b) a trait's sugar. A component that wants an attribute composes a trait.
- **Either order of the two decorators.** The plugin can recognize both. One order is one thing for a reader to learn and for a diagnostic to state, and `oxfmt` doesn't sort decorators.
- **`@trait(TABLE)`, one decorator for both.** It would make layer (a)'s `trait` know layer (b)'s table, which `RD-26` property 6 forbids. The owner also named `@attributes(TABLE)`.
- **Requiring an entry for every attribute member in the types.** `AttributeKeys` includes a `declare` member, which needs no converter, and the plugin already reports an accessor without an entry. The table type's keys stay optional, as today.

## Open questions

None for the owner. The order, the restriction to `@trait` classes and the stricter key check follow from `RD-26` and the owner's authorization. If the owner wants either order accepted, the plugin's rule and one row of `attributes-decorator` change, and nothing else does.

## Evidence

- **P46, the `@attributes(TABLE)` decorator's type and placement** ([`probes/`](probes/), [transcript](checks/p46-attributes.txt)), by Architect B on 2026-11-20 at `6211e435f`.
  - [`run-p46.sh`](probes/run-p46.sh) checks [`valid.ts`](probes/valid.ts) and [`invalid.ts`](probes/invalid.ts) with TypeScript 7.0.2 and 6.0.3, which agree on every line, and prints the declarations each emits for `valid.ts`.
  - [`attributes.ts`](probes/attributes.ts) copies core's converter types, `AttributeKeys`, `ConverterFor` and `AttributeTable`, with the proposed `attributes`. `trait` and `AnyElement` come from P45's [`composition.ts`](../trait-decorator-1/probes/composition.ts).
  - (a) to (e) check clean: an inline table, an annotated module constant, a narrowed converter, a nominal trait, and a member read through a subclass. The declarations carry neither decorator and keep `#private`.
  - (f) to (n) are TS1238: the eight cases of core's declaration tests, and a shared constant with an extra key.
  - (o) is TS1270, (p) TS2554 and (q) TS1240. (r), the reversed order, has no TypeScript error.
  - (s) `oxfmt` prints `@trait` and `@attributes(…)` on their own lines above `export class`. In [`ast.ts`](probes/ast.ts), oxc-parser gives both decorators spans before the `export` statement's start, in source order: `@trait` an `Identifier` and `@attributes(TABLE)` a `CallExpression`.