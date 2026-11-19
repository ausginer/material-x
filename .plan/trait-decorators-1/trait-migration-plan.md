# Trait migration — implementation plan

**Status: planned, not started.** Written by the architect on 2026-11-19, on the coordinator's task, on `repo/trait-decorators-1` at `5fbb8cec8`, with probes P40 and P41 added. It turns the [feasibility study](trait-decorators-plan.md) into the plan an implementer follows. It records the owner's decisions of 2026-11-19. **No identifier is minted and no record is edited.** [Proposed record changes](#proposed-record-changes) is for the main slot's architect.

**Registered 2026-11-19 as [`RD-26`](../00-index.md) by the main slot's architect,** on `repo/traits-migration-1`, where this plan is implemented. The owner accepted the symbol brand on the same day. [Proposed record changes](#proposed-record-changes) are made, with one addition: `RF-63`'s closure reads the eight adopters' entries with esbuild as well as rolldown, because P41 measured rolldown only.

**Amended 2026-11-19 by Architect B, on the coordinator's task: the trait module's build installs the brand with a static `[Symbol.hasInstance]` method, not with a pure-marked `trait()` call.** The implementer found in commit 3 that rolldown removes a pure-marked call from a static block it keeps, so `instanceof` is false for every trait. Core's tsdown build already emitted an empty `static {}`. P41 read only whether the class survived and its bytes, never `instanceof`. [P42](trait-decorators-plan.md#evidence) runs each bundle with rolldown and esbuild. The first bullet of [Decided here](#decided-here) gives the form and its reasons, and [the proposed `RD-26` amendment](#proposed-rd-26-amendment) is for the main slot's architect.

**Open questions: none.** Each choice the owner didn't make is decided below, with its reason.

## The owner's decisions, 2026-11-19

Relayed by the coordinator, translated:

1. **Layer (a)** as accepted at `cc98563a3`, with his static-merge rule from `5fbb8cec8`:
   - statics merge by the kind their annotation declares: an array concatenates, and an object spreads shallowly;
   - the kind is read syntactically from declarations, and the shapes the study lists are build errors;
   - `MergeStatics` is added to the types.
2. **Question 8: the last trait wins, with a build-time warning.** This covers a conflicting simple static, method or accessor.
   - The warning comes from the flattener in the Vite or tsdown console, not from `console.warn` at runtime.
   - There is no warning when the component declares the key itself.
   - The types agree with "last wins": not `never` and not an overload.
   - _"Trait order was always meant to matter; object assignment inherits it anyway."_
3. **Layer (b) stays, as optional sugar lowered in the trait's own build.** `accessor` and `attributes(this, …)` become plain layer (a) `get`/`set` and `static observedAttributes`. _"So nobody has to write get/set by hand; plus a slightly smaller size where `instanceof` is needed."_ The generic rule that deletes a bundled trait module's copied instance members is included.
4. **Cross-package copies use the parse-equivalence check.** Pairing `.d.ts` with `.js` supplies static kinds and member kinds.
5. **One branch and one pull request.** Commits don't need to build in between, and there is no temporary old plugin path. The migration is done and verified locally in full before the pull request opens.
6. **Earlier answers stay:**
   - a `null` bound;
   - `trait(this)` in a static block;
   - a `compose` that throws unless `base === null`;
   - a generated `impl`;
   - `super.traitMember` is a build error;
   - `#brand!: true` where a trait's members already exist on its bound.

## Decided here

- **The generated block brands by symbol, not by class.** It reads `impl(this, $a, $b)`. With `impl(this, Linked)`, the trait class and its members stay in every bundle: [P41](trait-decorators-plan.md#evidence) measured 1,988 B, 650 B brotli, against 1,486 B, 551 B with a symbol and a class that drops.

- **The trait module's build installs the brand as a static method.** It hoists `$brand`, a module-level `Symbol` that the module exports, and replaces the `trait(this)` statement with:

  ```js
  static [Symbol.hasInstance](o) { return o != null && o[$brand] === true; }
  ```

  It removes the static block when nothing else is left in it, and `trait`'s import when nothing else uses it. The author still writes `trait(this)`, and `trait`'s second parameter is optional, so an unbuilt module still runs.

  **The required properties,** each read in [P42](trait-decorators-plan.md#evidence) with rolldown 1.3.2 and esbuild 0.28.1, minified, on the trait module as its own build leaves it and on a rolldown library build of it:
  1. a bundle that never uses `instanceof Linked` drops the class;
  2. a bundle that uses it keeps the class, and `new Link() instanceof Linked` is `true` while another element's instance and `null` give `false`;
  3. the deletion rule then leaves the class without its members;
  4. a library build keeps the brand install, so a consumer's bundle of core's built `.js` has it.

  That is the owner's _"smaller size where `instanceof` is needed"_. Where an application's bundler doesn't run this plugin, property 3 doesn't apply, and a bundle that uses `instanceof` keeps the members.

  **Why not the other forms** (P42):
  - `/* @__PURE__ */ trait(this, $brand)`, the plan's first form, fails property 2 in both bundlers, and property 4: a bundler removes a pure call whose result is unused, even inside a class it keeps, and the static block is left empty. The library build is rolldown, as tsdown runs it.
  - `trait(this, $brand)` without the mark fails property 1: the call is a side effect, so every trait class stays, with its members.
  - A static field, `static [Symbol.hasInstance] = …`, whether `/* @__PURE__ */ branded($brand)` from core or the arrow written inline, holds all four in both bundlers. It is rejected for a hazard the method doesn't have: a toolchain that lowers class fields to assignment, such as `useDefineForClassFields: false` or Babel's `setPublicClassFields`, turns it into `Linked[Symbol.hasInstance] = …`. `Function.prototype[Symbol.hasInstance]` is read-only, so that assignment throws a `TypeError` in module code, when the module is evaluated. A method definition is never lowered that way. The method also needs no pure mark that some other tool could drop, and no helper on core's public surface. The method's bundles are within 7 B of the inline field's in each row, and within 6 B brotli.

- **`MergeInstances` doesn't count the base's keys.** Every trait carries its bound's members, so two attribute traits share every `HTMLElement` key. The first version of the type treated that as a conflict, sent every pair through `Omit`, and lost the checks. Excluding the base's keys keeps TS2610 and TS2611 for every pair that shares no key of its own ([P40](trait-decorators-plan.md#evidence) (b)).

  Only a pair that does share a key goes through `Omit`. `Omit` is a mapped type, so the earlier trait's other accessors lose TS2610 there (P40 (c)). The flattener's warning names that pair.

- **The deletion rule runs only where nothing copies from the output.** That is an application build, Vite's `build` without `build.lib`. A library build keeps every member, because another package copies from its `.js`. tsdown is always a library build, and the dev server is excluded.
- **File names.** Layer (a) is `packages/core/src/traits/composition.ts`, and layer (b) is `packages/core/src/traits/attribute-traits.ts`. Both replace `primitives.ts` and `attributes.ts`, which are deleted.
  - Layer (a) stays in `@ydinjs/core` behind its own subpath. It imports nothing from core, so a later package of its own changes no API.
  - `core/docs/api.ts` keeps the namespace names it has today, `piirre` for layer (a) and `traits` for layer (b).
- **`observedAttributes` isn't deduplicated.** The generic rule concatenates. Duplicates cost nothing: [P39](trait-decorators-plan.md#evidence) §3 showed one callback per change in Chromium, Firefox and WebKit. The baseline compares the list with duplicates removed in first-occurrence order.
- **Size noise:** a row passes when it is within 1% or 10 B of commit 1's reading, whichever is larger, in brotli bytes. A larger change goes to the owner, with its cause.
- **Out of scope:** a hand-written `impl` block in a plain JavaScript component. No such component exists, so the flattener recognises only the `Composed` annotation.

## Core: layer (a), `traits/composition.ts`

Published as `@ydinjs/core/traits/composition.js`. Elements and attributes are unknown to it. Its runtime is the accepted one. Its types are [P40's `composition.ts`](probes/types/last-wins/composition.ts), which both compilers accept.

```ts
// runtime
export function trait(ctr: AbstractConstructor<unknown>, brand?: symbol): void;
export function impl(
  target: AbstractConstructor<unknown>,
  ...brands: readonly symbol[]
): void;
export function bound<I extends object, S extends object = {}>(): Bound<I, S>; // returns null
export function compose<
  const B extends AbstractConstructor<unknown>,
  const T extends ReadonlyArray<Applicable<B>>,
>(base: B): Composed<B, T>; // throws unless base === null

// types
export type Bound<I extends object, S extends object = {}>; // keyed by a type-only unique symbol
export type Applicable<B extends AbstractConstructor<unknown>>;
export type MergeStatics<A, B>;    // arrays: readonly (EA | EB)[]; objects: Omit<A, keyof B> & B; other kinds: B
export type MergeInstances<A, B, X>; // A & B, or Omit<A, shared> & B when A and B share a key outside X
export type Composed<B, T>;        // B & AbstractConstructor<InstanceType<B> & Instances<T, keyof InstanceType<B>>> & Statics<T>
```

**What each runtime function does:**

- **`trait(ctr, brand = Symbol(ctr.name))`** records the brand, and defines `Symbol.hasInstance` on `ctr`: an object is an instance when its `[brand]` is `true`. It runs only in an unbuilt module: a trait module's own build replaces the call with a static method that does the same ([Decided here](#decided-here)).
- **`impl(target, ...brands)`** defines each brand on `target.prototype` as `{ value: true }`. Only the flattener writes it.
- **`bound()`** returns `null`. `compose(base)` returns `base` when it is `null`, which is a supertrait's base, and throws otherwise.

**How the types resolve a shared key:**

- **Statics:** `Statics<T>` folds `MergeStatics` over the list, left to right.
- **Instances:** `Instances<T, X>` folds `MergeInstances` the same way.
- **The last trait wins a shared key** in both. A component that declares the key itself wins over all traits, through ordinary class typing.

## Core: layer (b), `traits/attribute-traits.ts`

Published as `@ydinjs/core/traits/attribute-traits.js`. These are the probes' [`ydin.ts`](probes/types/layer-b/ydin.ts) declarations:

```ts
export const AnyElement: Bound<HTMLElement>;
export const Controlled: Bound<ControlledElement>;
export function attributes<T extends object>(
  trait: AbstractConstructor<T>,
  table: NoInfer<AttributeTable<T>>,
): void; // nothing at runtime
export type AttributeTable<T>; // one optional ConverterFor per attribute member; no entry for a class with none
export type ConverterFor<M>;   // a converter that reads exactly M
export type Props<T>;          // a trait class or a tuple of them: each attribute member, optional
```

**A trait as written,** and what its own build lowers it to:

```ts
// as written
export class Disableable extends AnyElement {
  static {
    trait(this);
    attributes(this, DISABLEABLE_ATTRS);
  }
  accessor disabled!: boolean;
}

// as its own build emits it
export const $disableable = Symbol('Disableable');
export class Disableable extends AnyElement {
  static [Symbol.hasInstance](o) {
    return o != null && o[$disableable] === true;
  }
  static readonly observedAttributes: readonly string[] = ['disabled'];
  get disabled(): boolean {
    return __attr.get(this, 'disabled', DISABLEABLE_ATTRS.disabled);
  }
  set disabled(value: boolean) {
    __attr.set(this, 'disabled', value, DISABLEABLE_ATTRS.disabled);
  }
}
```

**Components** annotate their base with `ControlledElementConstructor`, so they keep `static override formAssociated`:

```ts
const ButtonBase: Composed<
  ControlledElementConstructor,
  [...ButtonCoreTraits, typeof FocusForwarding]
> = compose(ControlledElement);
export class Button extends ButtonBase { … }
export type ButtonProperties = Props<[...ButtonCoreTraits, typeof Nameable]>;
```

**Renames on the public surface:**

| Today | After |
| --- | --- |
| `TraitedConstructor<…>` | `Composed<…>` |
| `Trait<…>` | the trait class |
| `Interface<typeof X>` | `X` |
| `XProps = Props<typeof X>` | `Props<typeof X>`, or the alias kept with that definition |
| the `$x` brand exports | the brand stays an export, generated by the build and not written in source |
| each `*_TRAITS` value list | a tuple type |

`FocusForwarding` and `ButtonGroupLike` take `#brand!: true`.

## The plugin's new structure

`packages/vite-traits-plugin/src`. **`attributes/` is layer (b), and nothing under `composition/` imports it.** A node test reads every `composition/*.ts` import and fails on one that reaches `attributes/`.

| File | Responsibility |
| --- | --- |
| `index.ts` | exports `viteTraitsPlugin` |
| `plugin.ts` | The adapter, `enforce: 'pre'`. It knows whether the build is a library, an application or the dev server. For each module, in this order: (1) layer (b) lowering, when the module imports `attributes`; (2) the trait-module transform; (3) consumer flattening. The analyzer's loader returns each loaded module **after** step 1, so a trait from the same package is read already lowered. Errors go through `this.error` and warnings through `this.warn`. |
| `diagnostics.ts` | the codes below, each with its severity |
| `ir.ts` | the trait IR, version 3 |
| `free-references.ts` | carried unchanged |
| `composition/annotation.ts` | Finds `const X: Composed<B, [...]> = compose(B)` and the one class that extends `X`. Resolves the list: `typeof T`, a tuple alias (local or imported), a spread of one, and a supertrait's own list, expanded. Detects cycles. |
| `composition/trait-class.ts` | Normalizes a trait class: its brand, its methods and `get`/`set` pairs as copyable members, its statics. It skips `declare`, `abstract` and `#brand!` fields. It reads the brand from `trait(this)` in a source module, or from the generated `static [Symbol.hasInstance]` method in built JavaScript, which names the brand symbol. That method is the brand install: it is never copied, and never merged as a static. |
| `composition/declarations.ts` | A module's declarations: oxc's isolated declarations of a `.ts` source, or the `.d.ts` that the package's `types` condition names for a `.js`. Members pair by binding name, so `var X = class …` pairs too. A static with no declaration falls back to its literal initializer in the `.js`, which is what layer (b)'s generated static gives. |
| `composition/statics.ts` | The kind classifier ([P39](trait-decorators-plan.md#evidence) §1), alias resolution through the loader, the base's declared kind, and each key's merge plan |
| `composition/copy.ts` | The copy rule: the same extension copies; any other pair copies when the member's text parses without error in both languages, with trees equal apart from positions ([P36](trait-decorators-plan.md#evidence) §3). It replaces `canCopySource`. |
| `composition/rules.ts` | the component-side rules and the conflict warning |
| `composition/lower.ts` | Emits the component: removes the `compose` constant, rewrites the base, inserts the members in trait order before the class's own, the merged statics and `static { impl(this, …brands) }`, and adds the imports that links need |
| `composition/trait-module.ts` | The trait module's own transform: hoists the brand, replaces `trait(this)` with the static `[Symbol.hasInstance]` method of [Decided here](#decided-here), adds synthetic exports for links, and, in an application build, deletes the instance members of each trait class |
| `attributes/lower.ts` | Layer (b): `accessor` lines and `attributes(this, TABLE)` become `get`/`set` pairs through core's operator and `static observedAttributes: readonly string[]`. It follows a `const` table to its object literal, as today's descriptor normalization does. |

**Merge emission for a static key**, with the contributors in order (base, traits, the component's own):

| Kind   | Emitted                                              |
| ------ | ---------------------------------------------------- |
| array  | `[...(Base.k ?? []), ...first, ..., ...own]`         |
| object | `{ ...(Base.k ?? {}), ...first, ..., ...own }`       |
| simple | the last contributor's value, or the component's own |

A trait's value is emitted as a link to the trait's static, `TraitClass.k`, through a synthetic export. It is not inlined, so the trait module stays the one source of the value.

### Diagnostics

Every **error** fails the build. Layer (a) has no runtime composition to fall back on. Six codes keep today's names. The others are new.

| Code | Severity | When |
| --- | --- | --- |
| `composition-shape` | error | The composition isn't a module-scope `const X: Composed<B, [...]> = compose(B)` extended by exactly one class in the module. |
| `trait-list` | error | A list element isn't `typeof T`, a tuple alias of those or a spread of one, or the expansion has a cycle. |
| `trait-unresolved` | error | A trait can't be resolved to a class whose static block calls `trait(this)`, or, in built JavaScript, to a class with the generated `static [Symbol.hasInstance]` method. |
| `trait-member` | error | A member is outside the copy subset: `super`, a computed key, a private name read by a member, `eval`, `import.meta`, a constructor, or a body the walker doesn't model. |
| `trait-field` | error | An instance field with an initializer. `declare` fields and `#brand!` are allowed and not copied. |
| `trait-binding-shadowed` | error | The component's module or class binds a name that a copied member reads. Kept from today. |
| `trait-source-language` | error | The copy rule refuses a member. It names the member and the two languages. Kept from today, with the new rule. |
| `trait-accessor-half` | error | A later trait's lone getter or setter over an earlier trait's pair. Copying would join halves from two traits. Kept from today. |
| `static-kind` | error | A static's declared kind is a tuple, `as const` array, class instance, function, mixed union, `typeof`, or an alias that isn't resolvable syntactically. |
| `static-kind-mismatch` | error | Two contributors give one static key different kinds, the base's declaration included. |
| `class-accessor-half` | error | The component declares one half of a trait's accessor pair. Kept from today. |
| `class-super-trait-member` | error | `super.k` in the component, for a key that a trait supplies. Kept from today. |
| `class-computed-super` | error | `super[k]` in the component. Kept from today. |
| `attribute-table` | error | Layer (b): the table isn't an object literal or a module-scope `const` bound to one; a key has no `accessor`; an `accessor` has no key; a converter isn't an identifier or a member expression. |
| `attribute-accessor` | error | Layer (b): an `accessor` line has an initializer, or isn't `accessor name!: T`. |
| `trait-member-conflict` | **warning** | Two traits supply one key that is a method, a whole accessor pair or a simple static. The last trait wins. The warning names both traits and the key. It is silent when the component declares the key. |

**Today's codes that go** (`diagnostics.ts` on `main`):

- `impl-escapes` and `impl-multiple-consumers` become `composition-shape`;
- `unsupported-trait-list` becomes `trait-list`;
- `unsupported-trait` and `unsupported-trait-definition` become `trait-unresolved`;
- `unsupported-trait-member` becomes `trait-member` and `trait-field`.

## Commits

On a new branch, `repo/traits-migration-1`, from `origin/main` at its head when the work starts. Commits don't need to build in between. **The pull request opens only after the last step's proofs hold locally.**

1. **The baseline, on the old path.** The baseline instruments of the next section, and their output recorded at this commit. Nothing else changes.
2. **Core's layers.** `composition.ts` and `attribute-traits.ts`, with their tests:
   - `tests/traits/composition.browser.test.ts`: brands, `instanceof`, `compose` throwing, `impl`;
   - `composition.declaration.test.ts`: P40's cases, plus P31's and P35's that still apply;
   - `attribute-traits.declaration.test.ts`: the table checks and `Props`.
3. **The plugin.** The structure above, with the old recognition removed. Fixtures are rewritten as class traits and `Composed` constants. The tests:
   - every error code's row asserts a build error;
   - the conflict row asserts the warning and the last trait's member;
   - the parse-equivalence rows are P36 §3's;
   - layer (b)'s lowering, and the trait module's brand hoist and member deletion;
   - the brand install at runtime: a trait module as its own build emits it and a component as the flattener emits it are evaluated, and `instanceof` is read both ways, not only the emitted text;
   - the brand install in bundles: P42's four properties, with rolldown and esbuild, on the plugin's own output;
   - the import-boundary test.

   The runtime-equivalence rows compare against hand-written expected classes. They no longer compare against a runtime composition.

4. **Core's traits.**
   - The 8 traits become classes, with their `use…` helpers kept.
   - `primitives.ts` and `attributes.ts` are deleted.
   - `files.json` and `package.json` exports are updated: `traits/composition` and `traits/attribute-traits` in, `traits/primitives` and `traits/attributes` out.
   - `core/docs/api.ts` is updated.
   - Core's trait tests are migrated: `primitives.*` and `traits.*` become the new layers' tests from commit 2, and `overrides.declaration` is rewritten. `reorderable`, `selectable`, `linkable` and `useRovingTabindex` change their imports only.
5. **material-x.** Each trait becomes a class. Each `impl` site becomes a `Composed` constant, each `*_TRAITS` list a tuple type, and each `Props`/`Interface` alias is rewritten. The files are in [Files that change](#files-that-change).
6. **The documents,** in [Files that change](#files-that-change).
7. **The proofs.** The baseline instruments run again, and their output is recorded beside commit 1's, with the comparisons below.

### The baseline instruments, written first on the old path

Each writes JSON with stable key order.

**`packages/material-x/tests/traits-baseline.browser.test.ts`** runs in material-x's Vitest browser project, through the shared configuration, so the plugin flattens what it loads. It stays after the migration as a regression test. It writes `tests/__snapshots__/traits-baseline.json` with `toMatchFileSnapshot`, or with a browser command beside `tests/support/commands.node.ts` if file snapshots don't reach the browser project. For every custom element that `files.json`'s runtime entries define, it records:

- the tag and the class name;
- **`observedAttributes`,** with duplicates removed in first-occurrence order;
- **each observed attribute's reflection, both ways,** for each converter sample:
  - `Bool`: `true` and `false`;
  - `Str`: `'x'` and `null`;
  - `Num`: `1` and `null`;
  - for each sample, the attribute after setting the property, and the property after setting the attribute;
- **`instanceof`** against every trait. The list of trait names is fixed in the file, and only its import lines change in commit 5:
  - core's 8;
  - material-x's `ButtonLike`, `IconButtonLike`, `FABLike`, `SplitButtonLike`, `ButtonGroupLike`, `Indeterminable`, `TextFieldLike` and `FocusForwarding`;
  - every other trait commit 5 finds;
- **its statics:** each own static's name, and its value when the value is a primitive or an array of primitives;
- **its prototype chain up to `ControlledElement`:** each level's own keys, with each descriptor's kind (`value` function, `get`, `set`, `get`+`set`) and enumerability. A symbol key is recorded by its description, prefixed `symbol:`.

**`.plan/trait-migration-1/baseline/surface.ts`** is a Node script on TypeScript 6's API, the `typescript` package. It reads material-x's and core's built `.d.ts`, after `just build` in each package, and writes `surface.json` beside itself. For each exported class, it records its instance members and static members, each with the checker's `typeToString` of its type. For each exported type alias, it records its expanded type.

**Also recorded at commit 1:**

- `just size` in material-x and core, as `.plan/trait-migration-1/baseline/size.json`;
- material-x's and core's built `.js` trees, copied to `.plan/trait-migration-1/baseline/build/` for the flattened-output diff. Remove the copy after commit 7, and keep only the diff.

### The proofs before the pull request

At commit 7, each must hold. Each result is committed under `.plan/trait-migration-1/checks/`.

1. **The runtime baseline is identical.** `traits-baseline.browser.test.ts` passes against commit 1's snapshot, which is unchanged. Only the test's import lines change.
2. **Behaviour is unchanged.** Run `just test` at the root, which runs `vitest run` over every project, in every browser instance the projects configure. Also run material-x's `just test-spec` (visual contracts). No test file changes, apart from the imports of the few that name a trait. Record the counts against commit 1's.
3. **The declaration surface is identical apart from named renames.** `surface.json` is compared with commit 1's after one normalisation, applied to both sides:
   - the renames in [layer (b)](#core-layer-b-traitsattribute-traitsts) are mapped;
   - brand members such as `Readonly<Record<typeof $x, true>>` are removed;
   - `#private` is removed.

   Every remaining difference is listed in the check, and each one goes to the architect before the pull request opens.

4. **Size is within noise.** `just size` in material-x and core: every row within 1% or 10 B of commit 1's reading, in brotli bytes, whichever is larger.
5. **The flattened JavaScript, diffed per component.** `git diff --no-index` of commit 1's built tree against commit 7's, one file per component entry, is committed as `flattened.diff` and summarised in the pull request description. The expected differences:
   - the brand install becomes `impl(this, …)`;
   - each trait module's `trait()` call becomes a static `[Symbol.hasInstance]` method;
   - `observedAttributes` loses its `new Set`;
   - a trait's static is linked rather than inlined.
6. **No flattener warning.** Building core and material-x prints no `trait-member-conflict`. No composition in the tree shares a key between two traits today. A warning is a finding, not noise.
7. **The repository's own checks:** `just typecheck`, `just typecheck-declarations`, `just lint`, `just fmt-check`, and `just build` for every package.

## Files that change

The paths are `origin/main`'s at `24c6672ce`. Commit 5 greps for `traits/primitives`, `traits/attributes`, `impl(`, `TraitedConstructor`, `Interface<` and `Props<` to catch any file added later.

- **core `src`:**
  - deleted: `traits/primitives.ts`, `traits/attributes.ts`;
  - new: `traits/composition.ts`, `traits/attribute-traits.ts`;
  - rewritten: `traits/checkable.ts`, `disableable.ts`, `linkable.ts`, `nameable.ts`, `selectable.ts`, `typeable.ts`, `valuable.ts`, and `reorderable.ts`'s trait declaration;
  - also: `element.ts`, only if `ControlledElementConstructor` moves, which isn't planned; `docs/api.ts`; `files.json`; `package.json`.
- **core tests:** `tests/traits/primitives.browser.test.ts`, `primitives.declaration.test.ts`, `traits.browser.test.ts`, `traits.declaration.test.ts`, `overrides.declaration.test.ts`; the imports of `reorderable.browser.test.ts`, `selectable.browser.test.ts`, `linkable.browser.test.ts` and `tests/controllers/useRovingTabindex.browser.test.ts`.
- **material-x `src`:**
  - `button/`: `ButtonCore.ts`, `IconButtonCore.ts`, `SwitchCore.ts`, `button.ts`, `icon-button.ts`, `link-button.ts`, `split-button.ts`, `switch-button.ts`, `switch-icon-button.ts`;
  - `button-group/`: `ButtonGroupCore.ts`, `button-group.ts`, `connected-button-group.ts`;
  - `checkbox/checkbox.ts`, `core/elements/CheckableCore.ts`, `core/traits/focus-forwarding.ts`, `fab/fab.ts`;
  - `list/`: `ListItemCore.ts`, `ListInteractiveItemCore.ts`, `list.ts`, `list-item.ts`, `list-button-item.ts`, `list-link-item.ts`;
  - `radio/radio.ts`, `text-field/TextFieldCore.ts`.
- **vite-traits-plugin:** `src/` as in [the plugin's new structure](#the-plugins-new-structure). `tests/` and `tests/fixtures/` are rewritten; `helpers.ts` keeps `flattenToDir`'s one-URL rule (`RF-60`).
- **Shared configuration:**
  - `.scripts/tsdown-library.ts`, `.scripts/vite-config.ts` and `.scripts/vitest-config.ts` still install the plugin, and need no option, because the plugin reads the build's mode itself. Change them only if the implementation needs that.
  - `vitest.config.ts`.
- **Documents:**
  - [`.agents/docs/trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md): rewritten from _Purpose_ down. The plugin becomes a required compiler step, and the document gains the two layers, the copy rule, the merge rule, the diagnostics table and the bundle rule.
  - [`.agents/docs/architecture.md`](../../.agents/docs/architecture.md): §Traits and attributes.
  - `packages/core/README.md`: its trait sections and examples.
  - Root `README.md`: the plugin's one-line description.
  - `AGENTS.md` and `work-queue.md` name the plugin only by name, and don't change.

## Proposed RD-26 amendment

For the main slot's architect, Mx Architect, from the amendment of 2026-11-19. This plan doesn't edit records or the index.

- **`RD-26` property 7, second bullet,** proposed wording:

  > In the trait's own build, `trait(this)` becomes a static method, `static [Symbol.hasInstance](o) { return o != null && o[$brand] === true; }`, where `$brand` is a module-level `Symbol` that the build exports. A bundle that never uses `instanceof` drops the trait class, and one that uses it keeps the class, without its members where property 8 applies.

- **A dated note under property 7's acceptance,** proposed wording:

  > _Amended 2026-11-19 by the architect._ The accepted `/* @__PURE__ */ trait(this, $brand)` is replaced, because it breaks `instanceof`: rolldown and esbuild remove a pure call whose result is unused, even inside a class they keep, so the brand is never installed. P41 read only whether the class survived and its bytes. [P42](trait-decorators-plan.md#evidence) ([transcript](checks/brand-install.txt)) runs each bundle with rolldown 1.3.2 and esbuild 0.28.1: the static method drops an unused class, keeps a used one with `instanceof` correct, and survives a library build. A static field of the same value does too, and is rejected because a toolchain that lowers class fields to assignment makes it throw. The owner's goals for property 7 hold, so this is an architect's amendment and not a new decision. P41's figures for the pure-marked form with `instanceof` describe a broken bundle.

- **`RF-63`'s dated note of 2026-11-19, second bullet:** _"because the trait's own build marks `trait()` pure"_ becomes _"because the trait's own build installs the brand as a static `[Symbol.hasInstance]` method, which has no side effect"_, with [P42](trait-decorators-plan.md#evidence) cited beside P41. The closure's reading at the last commit then also checks `instanceof` in each bundle that keeps a trait class.

## Proposed record changes

For the main slot's architect, Mx Architect. This plan doesn't edit records or the index.

- **A new decision, proposed wording:**

  > _"Traits are plain classes in two layers.
  >
  > Layer (a), `@ydinjs/core/traits/composition.js`, knows nothing of elements. A trait extends a bound, `bound()`, which is `null` at runtime, and brands itself with `trait(this)` in its static block. A component names its base and its traits once, in the annotation of a constant: `Composed<Base, [Traits…]>`, initialized by `compose(Base)`, which throws when it runs. The flattener replaces the constant with the base. It copies each trait's members in list order, merges statics by the kind their declaration states, and generates `static { impl(this, …brands) }`. An array concatenates, an object spreads shallowly, and the last trait wins any other shared key, with a build warning unless the component declares the key. A tuple, class instance, function, mixed union or unresolvable static is a build error, as is every case the copy can't carry. A member crosses languages only when its text parses to the same tree in both.
  >
  > Layer (b), `@ydinjs/core/traits/attribute-traits.js`, is optional sugar. `accessor name!: T` with `attributes(this, { name: Converter })` is lowered in the trait's own build to a `get`/`set` pair and `static observedAttributes`.
  >
  > The flattener is a required build step."_

  It supersedes the `trait()`/`impl()` design. Link the [study](trait-decorators-plan.md) and this plan. It should be a new RD rather than an amendment, because it replaces the API and the plugin's _Purpose_.

- **`RF-54`:** a dated note. Layer (b)'s attributes are `accessor` declarations and generated `get`/`set` pairs, never `declare` properties, so a subclass's accessor override typechecks and the mapped `Branded` type goes ([P31](trait-decorators-plan.md#evidence) (d)). It closes when the migration merges.
- **`RF-57`:** a dated note. In layer (a), a subclass's accessor over a trait field fails with TS2611, and an own field over a trait accessor fails with TS2610 (P40 (b)).
  - The exception is a pair of traits that share a key: there the earlier trait goes through `Omit`, and its other accessors lose TS2610 (P40 (c)). The flattener warns about every such pair.
  - A trait field with an initializer is a build error (`trait-field`).
  - It closes when the migration merges, with that exception recorded.
- **`RF-63`:** a dated note. The lists become tuple types and generated literals, so no shared spread list is left, and it closes when the migration merges. The repair on hold isn't needed.
- **`RF-44`'s language rule:** a dated note. The ruling's route back is taken. `canCopySource` becomes the parse-equivalence check: the same extension copies, and any other pair copies when both parses agree. Over real built JavaScript it refused none of 1,294 members, and it refuses `a < b > (c)` from `.js` into `.ts` (P36 §3).
  - The note should also record the hazard. Vite's TypeScript transform re-reads inserted code by the module's id, and it ignores `moduleType` (P39 §5). So stripping types in the plugin isn't a route in Vite.
- **`RF-60`:** no change. Its rule in `flattenToDir` carries over to the rewritten harness.