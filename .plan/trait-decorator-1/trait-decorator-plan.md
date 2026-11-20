# `@trait`: a trait declares itself with a decorator that the plugin compiles

**The decision,** as `RD-26`'s amendment of 2026-11-20 records it ([register](../00-index.md#rd-26--traits-are-plain-classes-in-two-layers-a-component-names-its-traits-in-a-composed-annotation-and-the-flattener-is-a-required-build-step)). This plan holds the design, the proofs the implementer delivers, the files the migration touches and the open questions. It was written by the architect on `repo/trait-decorator-1`, from `origin/main` at `d69e3ddbc`.

**The owner's authorization,** relayed by the coordinator on 2026-11-20: _"Тогда давай сделаем `@trait` и все починки сразу"_ ("Then let's do `@trait` and all the fixes at once"). He had already decided:

- trait sources always go through our plugin, tests included, as material-x's CSS does. A trait imported without the plugin is a case we avoid, not one we support;
- the plugin compiles `@trait` itself, and doesn't pass it through oxc-transform's decorator lowering;
- the output stays what PR #76 settled ([P42](../trait-decorators-1/trait-decorators-plan.md#evidence)), and a built trait stays recognizable exactly as [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md#a-trait-modules-own-transform) describes.

The pass folds in two fixes:

1. **An empty composition emits no `impl`.** The flattener writes `static { impl(this); }` and its import for a composition with no traits.
2. **`list-item.ts`'s empty composition.** Whether ListItem keeps `compose(ControlledElement)` with `ListItemCoreTraits = readonly []` was left to a recommendation.

## The source form

```ts
import { trait } from '@ydinjs/core/traits/composition.js';
import {
  AnyElement,
  attributes,
} from '@ydinjs/core/traits/attribute-traits.js';

@trait
export class Disableable extends AnyElement {
  static {
    attributes(this, DISABLEABLE_ATTRS);
  }

  accessor disabled!: boolean;
}
```

- **The decorator stands alone above the class,** before `export`. `export @trait class` is also valid and the plugin accepts it, but `oxfmt` prints it across three lines (`export`, `@trait`, `class …`). The migration writes the form above.
- **A layer (a) trait** such as FocusForwarding has no static block left, only `@trait` and its members.
- **Layer (b) becomes `@attributes(TABLE)`** below `@trait`, in the same pull request ([open question 2](#open-questions), answered). Until that answer this bullet said that `attributes(this, TABLE)` stays in a static block.

## The decorator's type, and what TypeScript sees

core's `traits/composition` keeps `trait`, with a new signature:

```ts
/** What `@trait` decorates: a class whose heritage is a bound. */
type TraitClass = AbstractConstructor<object> & {
  readonly [$bound]: (instance: never, statics: never) => void;
};

export function trait<C extends TraitClass>(
  _value: C,
  _context: ClassDecoratorContext<C>,
): void {
  throw new Error('…');
}
```

- **It changes no type.** A decorator can't change a class's type ([P1](../trait-decorators-1/trait-decorators-plan.md#the-verdict)), and `@trait` doesn't need to. The class's type is still the one its heritage gives, `extends AnyElement`, which is the bound `bound()` returns. The bound is `null` at runtime, and that never matters, because a decorated trait is never evaluated unbuilt.
- **It constrains what it decorates.** `TraitClass` requires the static `[$bound]` key that every bound and every `Composed` carries. So TypeScript rejects `@trait` on a class that doesn't extend a bound, which `trait(this)` never checked. `TraitClass` stays private beside `$bound`, as `Applicable` is public and `$bound` isn't.
- **Declarations drop it.** The `.d.ts` that TypeScript emits for a decorated trait has no decorator and is the same as for the undecorated class.
- **The body throws,** with a message that names the plugin, as `compose` does. The plugin removes every `@trait` and the import, so the throw is reached only when an unbuilt trait module is evaluated by a toolchain that lowers decorators. A toolchain that doesn't lower them fails earlier, on the syntax.
  - **Why a function and not `declare function`:** a decorator is a value reference, so the name must be exported. A function that throws gives the named failure that `compose` gives.
  - **What it costs:** nothing in a built bundle, because no built module imports it.
- **The brand parameter goes.** The source form has no way to pass a brand, and the brand is always `$` and the class name with a lower-case first letter, as today. core's tests that pass `$named` move to the derived name.

**[P45](#evidence)** checks this with TypeScript 7.0.2 and 6.0.3, under the trait probes' options (`isolatedDeclarations`, `erasableSyntaxOnly`, standard decorators). The two compilers agree on every line.

- (a) `@trait` above `export class` and (b) after `export` check clean. The declarations each compiler emits carry no decorator and keep `#private` for a nominal trait.
- (c) A class with no bound: TS1238.
- (d) `@trait()`: TS2554 and TS1238.
- (e) The old `trait(this)` in a static block: TS2554.
- (f) On a method: TS1241.
- (g) On a class expression: no decorator error. The plugin refuses it.

## What the plugin does

**In the trait's own build** (`composition/trait-module.ts`), for each module-scope class declaration that has the one decorator `@trait`, where `trait` is a name the module imports from `…/composition`, aliases included:

1. it removes the decorator's text;
2. it inserts `export const $brand = Symbol("<Name>");` before the statement. In `@trait export class`, the decorator lies before the `export` statement's start, so the insertion goes before the decorator;
3. it puts `static [Symbol.hasInstance](o) { return o != null && o[$brand] === true; }` first in the class body. If layer (b) left an empty static block there, the method replaces it, as today;
4. it removes the `trait` import when nothing else uses it.

**The rest is unchanged:** the hoisted statics, the build-only exports, the deletion of an application build's instance members, and the recognition of a built trait by the exact generated method.

**What a reader sees in the output.** It is the same JavaScript as PR #76's. Only how a trait is recognized in source changes: by `@trait`, where it was `trait(this)` in a static block. That applies everywhere the plugin reads source:

- the trait module's own transform;
- the analysis of a composition that reads a trait from source (`composition/trait-class.ts`, `findTrait`);
- the test for whether a composition's consumer is a trait, a supertrait (`composition/annotation.ts`).

**The `TraitInstall` kinds** become `decorator` (source) and `method` (built). The `call` kind and the explicit-brand form go.

**A trait's static blocks.** Layer (b) removes `attributes(this, …)` and leaves the block empty, and the transform removes an empty static block in a `@trait` class. A static block that isn't empty is `trait-member`, as a block that did more than call `trait(this)` was.

**Fix 1, in `composition/lower.ts`:**

- A composition with no traits gets no `static { impl(this); }`.
- The `impl` import is added only when some composition in the module has a brand.
- The constant is still removed, and the class extends the base.

This narrows the owner's earlier answer _"`impl` is always generated"_ to _"whenever the list has a trait"_. A block that brands nothing installs nothing.

## Diagnostics

**One new error code, `trait-decorator`**, raised in the trait module's own transform. It checks every module that imports `trait` from `…/composition`, whether or not a valid trait class is left in it:

| Misuse | Message names |
| --- | --- |
| `@trait(…)`, called with or without arguments | the decorator is used bare: `@trait` |
| `@trait` on a class expression, a nested class or a member | `@trait` decorates a module-scope class declaration |
| `@trait` beside another decorator on the same class, or twice | `@trait` is the class's only decorator |
| Any other reference to the imported `trait`: a call such as the old `trait(this)`, a re-export, passing it as a value | `trait` is used only as `@trait` above a class |

**Existing codes:**

- **`trait-member`** keeps its meaning. Its static-block message becomes _"a trait's static block holds only `attributes(this, …)`"_.
- **`trait-unresolved`** now reads: _a class decorated `@trait`, or, in built JavaScript, with the generated method_.

A namespace import of `composition`, as in `@c.trait`, isn't recognized, just as `compose` isn't. It falls under the general rule that the plugin recognizes layer (a) by named imports, and the document says so.

## Fix 2: ListItem extends `ControlledElement`

**Recommended:**

- `list-item.ts` extends `ControlledElement` directly.
- `ListItemCoreTraits` is deleted.
- `ListInteractiveItemCoreTraits` lists its three traits itself.
- `ListItemCore` becomes `ControlledElement`, or `useListItemCore` takes `ControlledElement` and the alias goes.

**Why:**

- **The built JavaScript is the same either way once fix 1 is in,** so the choice is about source alone.
- **An empty composition is machinery with no responsibility:** an import of `compose`, an annotation, a constant and an empty tuple alias, all to say "extends `ControlledElement`". `CONTRIBUTING.md` Part II §2 and §16 say to delete such machinery, and §8 says to keep no structure "just in case" before release.
- **The precedent exists:** `Icon` has no traits and extends `ControlledElement` directly.
- **The cost is small.** If a trait common to every list item is added later, `ListItem` gains a composition again, which is the same one line it would have needed anyway.

Fix 1 stays even so: an empty list can still come from an alias, and the flattener shouldn't make it cost bytes. This is a recommendation, and it is [open question 1](#open-questions).

## RF-66 doesn't block this

`@trait` is recognized syntactically in the trait's own module. Resolving a trait from a component goes through the same imports as today, so the re-export limit is neither widened nor narrowed.

## The doc in the declarations: a `load` stage

**Added 2026-11-20 by the architect, on the owner's choice of [P47](../trait-jsdoc-probe-1/trait-jsdoc-probe.md)'s way 1.** `RD-26`'s amendment of that date records it. The written form doesn't change: `/** doc */`, then `@trait` and `@attributes(TABLE)` on their own lines, then `export class`.

**The defect it repairs** (P47): rolldown's declaration emitter, oxc's, drops a JSDoc that stands in front of a class's decorators. tsdown's declaration plugin records each module's code in a `transform` hook that runs before any of ours. So the 10 published trait `.d.ts` files lose their class docs, and proof 1 fails on them.

### What the stage does

- **Where it runs.** The `trait-attributes` plugin gets a `load` hook. rolldown runs `load` before every `transform`, so the declaration plugin records the stage's output, whatever the plugins' order.
- **When it runs:** in every build, and not on the dev server (`kind === 'serve'`). The dev server emits no declarations. So Vite's dev path and Vitest run exactly as before, diagnostics included.
- **Which modules it reads:** a candidate module (`isCandidate`), with an absolute file id and no query. It reads the file, and parses it only when a line starts with `@`. When it has nothing to rewrite, it returns `null`, and the host reads the file as before.
- **What it rewrites,** for each exported class declaration (`export class`, not `export default`) whose decorators come before `export`, with a JSDoc directly in front of the first decorator:
  - `export`, with the whitespace after it, moves to the first decorator's start;
  - `/** doc */ @trait @attributes(T) export class X` becomes `/** doc */ export @trait @attributes(T) class X`, each decorator still on its own line;
  - JavaScript and TypeScript read the two forms the same way, so the rewrite doesn't depend on which decorators they are;
  - the declaration emitter keeps the doc of this form, and so do TypeScript 6 and tsc 7 (P47's placement table).
- **What it returns:** `{ code, map }`. The map is the magic string's, with `hires: true`, `source` the id and `includeContent: true`, so the composed map's `sourcesContent` is still the file on disk.

### What it hands to the existing compile

- **The internal form is a written form:** `export @trait class`, which the compile already accepts (proof 2's case _after `export`_, P45 case (h)). So:
  - the trait module's transform, layer (b)'s lowering and both decorator checks don't change;
  - the analysis loader (`hostLoader`, `lowerForAnalysis`) doesn't change either. It reads the written file, and the analysis accepts both positions;
  - nothing needs a form that source can't write, nor state to tell the two forms apart.
- **P48 compiles the whole tree this way** at `eda3b1bfc`. Every `.js` and every map is byte-identical to that commit's build. The 10 trait `.d.ts` files differ only by their class docs, added back.

### Diagnostics

- **The checks see the written text.** `trait-decorator`, `attributes-decorator`, `attribute-table` and `attribute-accessor` read the same decorators, in the same order, with the same arguments. Only `export` now stands before them, which every check already accepts.
- **Positions.**
  - The plugin passes `pos` inside the log object, so rolldown shows the plugin, the file and the message, and no position. That is the same with and without the stage (P48).
  - The field itself, though, is an offset into the hook's input. Inside a moved span, the stage puts it `export `'s length later.
  - **Required:** every diagnostic that the plugin reports carries the `pos` it would carry without the stage. The stage records, for each module id, the spans it moved, replacing the record at each load of that id and dropping it in `watchChange`. The reporter (`report` and the warning loop) moves a `pos` that falls inside a moved span back by the moved length.
  - The implementer may use another mechanism, such as tracing through `this.getCombinedSourcemap()`, if it meets proof 12.

### Watch

- **The stage reads the file at every load,** and a rebuild loads a changed file again, so a changed doc or decorator reaches the declarations.
- **Its parse is its own,** not `parseModule`'s cache, because the transform parses a different text for the same id.

### What retires it

When rolldown's declaration emitter keeps a JSDoc in front of decorators, proof 11's mutation stops failing. The stage is then deleted, with its record.

### Not adopted

- **The probed internal form,** `static { trait(this); attributes(this, T); }` (P47's stand-in).
  - It needs a second compile stage, and the analysis loader would have to apply it too.
  - It is the source form that `trait-decorator` rejects, so the transform would need state to accept it.
  - It moves an inline table's text into the class body, so `attribute-table`'s positions would move to another line.
- **`export` on the JSDoc's last line, with spaces in its place,** which keeps every line and column. The emitter and the bundler keep the comment and `export` on one line, so 30 files differed: each trait's `.d.ts`, `.js` and map (P48).
- **Running the stage on the dev server:** nothing there emits declarations.
- **Moving the checks into the stage:** the transform already sees the same text.

## The proofs the implementer delivers

Each proof names the change it witnesses. A test fails without that change, and the implementer records each failing run beside its passing one, in the order the work happens.

1. **The built output is byte-identical apart from ListItem.**
   - Build `@ydinjs/core` and `@ydinjs/material-x` before and after.
   - Every `.js` file, without its `sourceMappingURL` comment, is byte-identical, except `list/list-item.js`.
   - Every `.d.ts` is identical, except those of `list-item`, `ListItemCore` and `ListInteractiveItemCore`, whose differences are listed.
   - This witnesses that the decorator compiles into exactly PR #76's install: the brand's name and place, the method's place, and the import's removal.
2. **The trait module's transform** (`trait-module.node.test.ts`), each against expected text:
   - `@trait` above `export class`, after `export`, and on a class that isn't exported;
   - a layer (b) trait, whose emptied static block is replaced;
   - an aliased import of `trait`;
   - the import kept when another name from it is used;
   - an already transformed module left unchanged;
   - an application build's member deletion.
3. **`trait-decorator`** (`diagnostics.node.test.ts): one module for each row of the table, with its code and position. Also a non-empty static block in a `@trait`class, which is`trait-member`.
4. **Flattening reads the decorator** (`flatten.node.test.ts`, `vite.node.test.ts`):
   - a component that composes a `@trait` trait read from source in its own package, the Vite dev path, and one from another package's built JavaScript;
   - a `@trait` class that extends a composition is a supertrait, and its constant stays at runtime;
   - the runtime-equivalence cases, with their fixtures (`checkable.ts`, `forwarding.ts`, `nameable.ts`) moved to `@trait`.
5. **Fix 1** (`flatten.node.test.ts`):
   - a composition with an empty list emits no static block and no `impl` import;
   - a module with one empty and one non-empty composition imports `impl` once;
   - both fail on `d69e3ddbc`.
6. **The brand install in bundles** (`bundles.node.test.ts`), with the source moved to `@trait`, still holds with rolldown and esbuild:
   - an unused trait drops;
   - `instanceof` is correct;
   - a library build keeps the install.
7. **core:**
   - `composition.browser.test.ts`: calling `trait` unbuilt throws the named error. The `$named` brand cases move to the derived name.
   - `composition.declaration.test.ts`: `@trait` on a class with no bound, `@trait()` and `@trait` on a method are type errors (`// @ts-expect-error`), and a decorated trait's type is its class's.
8. **The runtime baseline:** `packages/material-x/tests/traits-baseline.browser.test.ts` matches its snapshot unchanged, in Chromium, Firefox and WebKit.
9. **No source form is left behind:**
   - outside `.plan/`, no `trait(this` remains in a source, a test, a fixture or a document (a `git grep` witness);
   - root `just typecheck`, the declarations check and `just test` pass;
   - building `@ydinjs/core` and `@ydinjs/material-x` prints no `trait-member-conflict`.
10. **Size:**
    - every row of the root size reading is unchanged, except `list/list-item` and `complete`;
    - `list/list-item` is expected about 44 B Brotli smaller: PR #78 measured the same output without the `impl` block at 2,550 B against 2,594 B;
    - `complete` is expected a few bytes smaller, since `impl` stays for the other components;
    - any other row that moves is a defect in proof 1.
11. **The doc in the declarations** (the [`load` stage](#the-doc-in-the-declarations-a-load-stage)):
    - **The tree.** Rerun [P48's `run.sh`](../trait-jsdoc-probe-1/probes/p48/run.sh) comparison, against `eda3b1bfc`'s build, with the real stage in place of the probe's:
      - every `.js` and every map is byte-identical;
      - only the 10 trait `.d.ts` files differ, each only by added comment lines;
      - [`docs.ts`](../trait-jsdoc-probe-1/probes/p48/docs.ts) reads 10/10.
    - **Proof 1** then holds as written, against `d69e3ddbc`.
    - **A test that fails without the stage,** in the plugin's node tests. A tsdown build, with declarations, of a fixture trait module written `/** doc */`, `@trait`, `@attributes(TABLE)`, `export class`. Its `.d.ts` has the doc directly before `export declare class`, and a fixture without `@attributes` does too. The mutation, the stage's `load` removed, fails both, and the failing run is recorded.
    - **The dev server:** after `configResolved` with `command: 'serve'`, the `load` hook returns `null` for that fixture.
    - **Watch:** two loads of one id with different texts each give their own output. One reading of `tsdown --watch` in `packages/core` is recorded, in which an edited trait doc reaches the rebuilt `.d.ts`.
    - **The cost:** `just build`'s time with and without the stage, recorded once.
12. **Diagnostics through the stage** (`diagnostics.node.test.ts`, through a rolldown build of the fixture):
    - for `trait-decorator` (`@trait` beside another decorator), `attributes-decorator` (`@attributes` above `@trait`) and `attribute-table` (an inline table with a key that names no accessor), the `pos` is the one the same build reports without the stage;
    - the mutation, the reporter's translation removed, fails each, by the moved length.

## The files the migration touches

- **core's traits**, each from `trait(this)` to `@trait`: `src/traits/checkable.ts`, `disableable.ts`, `linkable.ts`, `nameable.ts`, `reorderable.ts`, `selectable.ts`, `typeable.ts`, `valuable.ts`.
- **core's layer (a) and (b):** `src/traits/composition.ts` (`trait`'s signature and body, and the comments on `trait`, `impl` and `compose`) and `src/traits/attribute-traits.ts` (the comment on `attributes`).
- **material-x's traits:**
  - `src/button/ButtonCore.ts` (ButtonLike);
  - `src/button/IconButtonCore.ts` (IconButtonLike);
  - `src/button/split-button.ts` (SplitButtonLike);
  - `src/button-group/ButtonGroupCore.ts` (ButtonGroupLike);
  - `src/checkbox/checkbox.ts` (Indeterminable);
  - `src/core/traits/focus-forwarding.ts` (FocusForwarding);
  - `src/fab/fab.ts` (FABLike);
  - `src/text-field/TextFieldCore.ts` (TextFieldLike).
- **material-x's ListItem (fix 2):** `src/list/list-item.ts`, `src/list/ListItemCore.ts`, `src/list/ListInteractiveItemCore.ts`.
- **The plugin:**
  - source: `src/composition/trait-module.ts`, `trait-class.ts`, `annotation.ts`, `lower.ts` (fix 1), and `src/diagnostics.ts` (`trait-decorator`, and the texts of `trait-unresolved` and `trait-member`);
  - tests: `attributes.node`, `bundles.node`, `diagnostics.node`, `flatten.node`, `trait-module.node`, `vite.node`, and the fixtures `checkable.ts`, `forwarding.ts`, `nameable.ts`.
- **core's tests:** `tests/traits/attribute-traits.browser.test.ts`, `attribute-traits.declaration.test.ts`, `composition.browser.test.ts`, `composition.declaration.test.ts`.
- **Documents:**
  - `.agents/docs/trait-flattener-plugin.md`: its Purpose, its two layers, the trait module's own transform, its composition section on what a trait is, its diagnostics table and its verification list, with a change record row;
  - `.agents/docs/architecture.md` §Traits and attributes;
  - `packages/core/README.md`, both examples.

The implementer greps for `trait(` and `trait(this` to confirm the list before starting, and records any file it misses.

## Open questions

These need the owner:

1. **ListItem (fix 2):** extend `ControlledElement` directly and delete `ListItemCoreTraits`, as recommended above? The implementer can start everything else first. If the owner keeps the composition instead, fix 1 alone gives the same output.
2. **Layer (b)'s static block.** After this pass, a layer (b) trait reads `@trait` above the class and `static { attributes(this, TABLE); }` inside it, two styles in one class. A decorator form such as `@attributes(TABLE)` could follow, compiled by the plugin as `@trait` is. This pass doesn't decide that. It is a follow-up only if the owner wants it. **Answered 2026-11-20 by the owner:** `@attributes(TABLE)` ships with `@trait`. The [`@attributes` plan](../attributes-decorator-1/attributes-decorator-plan.md) holds its design, and the proofs and files it adds to this plan's.

## Evidence

- **P45, the `@trait` decorator's type and placement** ([`probes/`](probes/), [transcript](checks/p45-decorator.txt)), by the architect on 2026-11-20 at `d69e3ddbc`.
  - [`run-p45.sh`](probes/run-p45.sh) checks [`valid.ts`](probes/valid.ts) and [`invalid.ts`](probes/invalid.ts) with TypeScript 7.0.2 and 6.0.3, which agree on every line, and prints the declarations each emits for `valid.ts`.
  - [`composition.ts`](probes/composition.ts) copies core's `Bound`, `bound()` and `$bound` with the proposed `trait`.
  - Cases (a) to (g) are listed under [the decorator's type](#the-decorators-type-and-what-typescript-sees).
  - Case (h), [`ast.ts`](probes/ast.ts): oxc-parser puts `@trait`'s span before the `export` statement's start in `@trait export class`, and inside it in `export @trait class`. `oxfmt` prints `export @trait class` across three lines.
- **P47, a decorated trait's JSDoc in the published declarations** ([record](../trait-jsdoc-probe-1/trait-jsdoc-probe.md)), by the architect on 2026-11-20 at `dfd49e683`.
- **P48, the `load` stage on the implementer's compile** ([`p48/`](../trait-jsdoc-probe-1/probes/p48/), [transcript](../trait-jsdoc-probe-1/checks/p48-run.txt)), by the architect on 2026-11-20 at `eda3b1bfc`, with tsdown 0.23.7, rolldown 1.3.2 and aube 2.10.0.
  - [`load.ts`](../trait-jsdoc-probe-1/probes/p48/load.ts) and [`plugin-load.diff`](../trait-jsdoc-probe-1/checks/p48-plugin-load.diff) add the stage behind `P48_LOAD=1`.
  - [`run.sh`](../trait-jsdoc-probe-1/probes/p48/run.sh) builds `@ydinjs/core` and `@ydinjs/material-x` with and without it, and compares all 293 built `.js`, `.d.ts` and map files. Only the 10 trait `.d.ts` differ, each only by added comment lines.
  - [`docs.ts`](../trait-jsdoc-probe-1/probes/p48/docs.ts) finds every source doc directly before its `export declare class`: 10/10.
  - [`positions.ts`](../trait-jsdoc-probe-1/probes/p48/positions.ts) reads a diagnostic's `pos` through rolldown. It is 7 later with the stage, and neither run has a `loc` or a frame.
  - The transcript also records the layout not adopted, and the 30 files it changed.