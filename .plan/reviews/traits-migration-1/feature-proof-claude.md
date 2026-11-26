# PR #76, the RD-26 trait migration: feature proof

**Files were read at:** `0c5705d87`, the head of `repo/traits-migration-1` and of PR #76, in a detached scratch worktree outside the slots. **Diff reviewed:** `24c6672ce..0c5705d87`: everything outside `.plan/`, and under `.plan/`, only the proofs record and RD-26.

**Governing records:**

- `repo:RD-26` in [`00-index.md`](../../decisions/RD-26.md), with both amendments of property 4, the amendment of property 7, and the implementation note.
- The closure notes on `RF-44`, `RF-54`, `RF-57` and `RF-63`.
- The [migration plan](../../trait-decorators-1/trait-migration-plan.md): layers (a) and (b), the plugin's structure, the diagnostics, the seven proofs, and _Decided here_.
- The [proofs record](../../trait-migration-1/checks/proofs.md).

**Lens:** feature proof. Every claim below comes from my own reading or from a run I made. The runs are saved in [`checks/feature-proof-witnesses.txt`](checks/feature-proof-witnesses.txt). I ran them one at a time, in one tree, and reverted each mutation before the next. Nothing is repaired, no record is amended, and nothing was written to GitHub. Decisions the owner made are taken as given: one PR, the `Composed` annotation, `null` bounds, last-wins with a warning, the brand as a static method, and `@trait` left for later.

**Verdict:** most of the focus properties hold, and the tests prove them rather than only passing. Two decided properties don't hold:

- **reviewer-1:** RD-26 property 8 doesn't run on a built trait module, which is the case for every trait in the published `.js` of `@ydinjs/core` and `@ydinjs/material-x`.
- **reviewer-2:** RD-26 property 3's rule that the base's declaration counts as a contributor isn't implemented.

In my reading, both block the merge. Each needs either a repair or an architect's amendment of the property. Three more findings don't block.

## Findings

| Id | Tier | Blocks | Claim |
| --- | --- | --- | --- |
| reviewer-1 | B | yes, in my reading | An application build doesn't delete the members of a built trait module. |
| reviewer-2 | A, latent | yes, in my reading | The base's declared static kind is never compared with the traits' kinds. |
| reviewer-3 | B | no | `composition-shape` rejects valid modules. |
| reviewer-4 | C | no | No test reads the adapter's build kind. |
| reviewer-5 | C | no | `trait-module.ts`'s header describes the pure-call design that was replaced. |

### reviewer-1 — an application build keeps a built trait module's members

- **Current behavior.** The flattener's transform returns early unless the module text contains `trait(` or `compose(` (`packages/vite-traits-plugin/src/plugin.ts:274`).
  - A trait module's own build replaces `trait(this)` with the static `[Symbol.hasInstance]` method, so no built trait module contains either string. Core's built `traits/*.js` contain `trait(` 0 times each (W1).
  - So `transformTraitModule` never sees a built trait module, and the deletion at `src/composition/trait-module.ts:446` never runs on one.
- **Requirement.** RD-26 property 8: _"An application build deletes each trait class's copied instance members from the trait module."_
  - The plugin document says the same at `.agents/docs/trait-flattener-plugin.md:30`.
  - At `:32` it says: _"the transform of another package's built trait module changes only what is missing."_
  - The plan carves out only a bundler that doesn't run the plugin.
- **Evidence (W1).** I ran Vite 8's `build` without `build.lib`, with `viteTraitsPlugin()`, not minified.
  - **Core's built trait.** An entry that does `document.body instanceof Disableable`, importing `@ydinjs/core/traits/disableable.js`, keeps `get disabled()` and `set disabled(value)` in the bundle.
  - **Control, a source trait.** The same entry over a source `.ts` trait loses its getter, and only the `[Symbol.hasInstance]` method is left.
  - **A real entry.** The application build of `@ydinjs/material-x/button-group/connected-button-group.js` keeps core's `Valuable`, `Checkable` and `Disableable` with their accessors. `useRovingTabindex` (`core/src/controllers/useRovingTabindex.ts:33-35`) applies `instanceof` to all three.
- **Why the tests pass.** Each deletion test calls `transformTraitModule` directly, through `helpers.ts`'s `transformTrait` (`tests/bundles.node.test.ts:89`, `tests/trait-module.node.test.ts:84`). None goes through the adapter, so the filter is never exercised.
  - The library-build row (`bundles.node.test.ts:136`) also hands the built output back to `transformTrait`, which the adapter would skip.
  - The proofs' RF-63 bundles use plain rolldown and esbuild, without the plugin, so they don't read property 8 either.
- **Failure scenario.** An application that bundles a `@ydinjs/material-x` component which uses roving tabindex, built with Vite and this plugin, ships every accessor of `Valuable`, `Checkable` and `Disableable` a second time, in the trait classes.
  - The owner gave the size _"where `instanceof` is needed"_ as the reason for property 7.
  - Behavior doesn't change, so the tier is B: the plugin's document and RD-26's implementation note tell an integrator that the members are deleted.
- **Routing.** Either the adapter reaches built trait modules, or the architect narrows property 8 to source trait modules. The second changes RD-26 and the plugin document.

### reviewer-2 — the base's declared static kind is never checked

- **Current behavior.** The kind check, `staticKinds` (`src/composition/rules.ts:185-208`), compares only the traits' statics with each other. It raises the only `static-kind-mismatch` in `src/` (W2).
  - Nothing reads the base's declaration of a key.
  - `lower.ts:132` then emits `[...(Base.k ?? []), …]` or `{ ...(Base.k ?? {}), … }` from the traits' kind, whatever the base holds.
- **Requirement.** RD-26 property 3: _"Two contributors that give one key different kinds are a build error, and the base's declaration counts as a contributor."_
  - The plan's `static-kind-mismatch` row says _"the base's declaration included"_.
  - The plan's `statics.ts` row assigns that file _"the base's declared kind"_.
  - The plugin document's row (`trait-flattener-plugin.md:110`) narrows the rule to _"Two traits"_ without a record.
- **Evidence (W2).** A trait declares `static readonly styles: readonly string[]`. Neither base below gets a build error, and neither gets a warning:
  - With a base that declares `static styles: CSSStyleSheet`, the plugin emits `static styles = [...(KBase.styles ?? []), ...]`. Evaluating that throws `TypeError: (KBase.styles ?? []) is not iterable` while the class is defined, so the module fails to load.
  - With a base that declares `static styles: string = 'ab'`, the plugin emits the same form, and the merged value is `["a","b","trait-sheet"]`.
- **TypeScript doesn't catch either case.** `tsc` with core's configuration accepts both compositions and their components. It reports only a component's own `static override styles: string` (TS2417), so I don't claim the component's own kind as a finding.
- **Coverage.** `diagnostics.node.test.ts` has one `static-kind-mismatch` row, trait against trait.
- **Failure scenario.** A plugin user's element base declares `static styles: CSSStyleSheet`, and a trait contributes `static styles: readonly CSSStyleSheet[]`. The build passes, and the module throws on load. RD-26 promises a build error, so the tier is A.
  - As far as I read, no composition in this tree reaches the case. The bases are `ControlledElement` and the test fixtures, and the only static they share with a trait is `observedAttributes`, an array on both sides.

### reviewer-3 — `composition-shape` rejects valid modules

- **Current behavior.** `annotation.ts:150` requires `references.get(site.name) === 2`. That count includes every `Identifier` node with the constant's name anywhere in the module, in type positions and in non-computed property keys too.
- **Requirement.** RD-26 property 1 and the plan's `composition-shape` row: _"Exactly one class in the module extends `X`"_. Neither forbids naming the constant elsewhere.
  - The plugin document (`trait-flattener-plugin.md:36`) is stricter: _"that exactly one class in the module extends and nothing else references"_.
  - A property key isn't a reference under either text.
- **Evidence (W3).** These modules fail with _"FooBase is used as the superclass of one class, and nowhere else"_:
  - the valid module plus `export const names = { FooBase: 1 };`. Here the key is not a use of the constant, so the message is false under the record and under the document;
  - the valid module plus `export type FooShape = InstanceType<typeof FooBase>;`. This one is a type-only reference. The document refuses it, and the record doesn't.
  - The control, without either line, flattens.
- **Failure scenario.** A module that has an object with a key of the constant's name, such as `{ ButtonBase: … }`, fails to build, and the message says the constant is used elsewhere.
  - The plugin refuses rather than miscompiles, and nothing in the tree hits it.
  - Whether a type-only `typeof XBase` is allowed is the architect's call: the document and the record differ.

### reviewer-4 — no test reads the adapter's build kind

- **Current behavior.** The decision that only an application build deletes is `kind === 'application'` at `plugin.ts:177`, with `kind` set in `configResolved` (`:243-249`).
- **Evidence (W4, M5).** Changing it to `kind !== 'serve'`, which deletes in library builds as well, leaves all 71 plugin tests passing.
  - No test calls `configResolved` or reads `build.lib`.
  - Every deletion test passes `applicationBuild` straight to `transformTraitModule`.
- **Requirement.** Plan, commit 3: the test layer reads _"the trait module's brand hoist and member deletion"_, and RD-26 property 8 says a library build keeps the members.
  - The material-x suites may catch a library-side deletion further down the line. I didn't run them under the mutation.
- **Tier C.** No consumer observes this today. It is the gap through which reviewer-1 also passed.

### reviewer-5 — the transform's header describes the replaced design

`src/composition/trait-module.ts:7-10` says that the transform _"hoists the brand … and passes it to `trait`. The call isn't marked pure"_. The code at `:402-411` replaces the call with the static `[Symbol.hasInstance]` method, and `trait` is never called with a brand. The plugin document is correct. Tier C.

## What holds, and how the tests prove it

- **The brand install.**
  - Core's built trait modules carry `static [Symbol.hasInstance](o) { return o != null && o[$x] === true; }`, with `$x = Symbol("X")` exported. In W1, the method is the only member left on a source trait after deletion.
  - No brand install anywhere in the built output is pure-marked. The only `/* @__PURE__ */` marks are on `new Map`, `new Set` and `new WeakMap` (W8).
  - Mutation M9 makes the method ignore the brand, and 6 tests fail, including both bundlers' `instanceof` rows.
- **Statics merged by declared kind, between traits.**
  - An array concatenates after the base's value, an object spreads, and a simple static takes the last trait's value.
  - Each is killed by a mutation: M3, M6 and M8. The base side is reviewer-2.
- **Last-wins.**
  - Members are emitted in list order, before the component's own (M7 is killed).
  - `trait-member-conflict` names both traits and the key.
  - It is silent when the component declares the key, for a member (M1) and for a simple static (M2).
  - A trait's `declare` member isn't a member in the IR, so it is neither copied nor counted.
  - The warning reaches the tsdown console. With radio's list doubled, `just build-lib` printed 4 `trait-member-conflict` lines (W5). So proof 6's reading of _"no warning"_ is a sound instrument.
- **Each trait is trimmed alone, and a trimmed trait also loses the base's keys** (`Without` and `Instances` in `composition.ts`).
  - M10 drops the base's keys, and `tsc` reports TS2425 on the P44 override case.
  - M11 sends every trait through `Omit`, and `tsc` reports 6 errors across the TS2610 and brand cases.
- **The parse-equivalence copy rule.**
  - The same extension copies. `.js` into `.ts` copies when both trees agree, and `a < b > (c)` is refused.
  - `.ts` into `.mts` and `.cts` copies, and an angle-bracket assertion into `.mts`, `.cts` or `.tsx` is refused. That is correct: TypeScript reserves the syntax there (W6).
  - M4 is killed by 4 tests.
- **Layer (b) stays outside `composition/`.**
  - No `composition/*.ts` file imports `attributes/`, directly or through `syntax.ts`, `diagnostics.ts`, `ir.ts` or `free-references.ts`.
  - The adapter is the only module that imports both.
  - The boundary test reads direct imports. Today that is enough.
- **Declaration surface against runtime.** Every public `.js` entry of core and material-x exports each value its `.d.ts` declares (W7).
  - The trait classes that the library build drops, such as `FocusForwarding`, `IconButtonLike`, `TextFieldLike` and `ButtonGroupLike`, are in modules that aren't package entries.

## The implementer's decisions

None of them is a finding.

- **`src/syntax.ts`.** The shared parsing and indexing for both layers is sound.
  - Its parse cache is keyed by id and checked against the code, so a changed text is parsed again.
  - `watchChange` drops a cached entry.
- **The two-plugin return.** It is sound.
  - Vite and rolldown both accept a nested array in `plugins`, and `.scripts/tsdown-library.ts` spreads it.
  - `kind` is shared by closure and set in the first plugin's `configResolved`.
  - tsdown never calls `configResolved`, so its build stays `'library'`, as the plan requires.
  - `viteTraitsPlugin()` now returns an array. That changes the published package's signature. The plugin document says so (`trait-flattener-plugin.md:16`, `:120`). The PR description doesn't.
- **Hoisted static constants.** Sound, and documented at `trait-flattener-plugin.md:28`.
  - A component imports `__mxflat_<Class>_<key>_<hash>` rather than `TraitClass.k`, as the plan's merge text has it. So it doesn't retain the trait class.
  - The trait module stays the one source of each value.
  - The plan's sentence is out of date. That is for the architect.
- **Brand naming, `$fABLike`.** It is mechanical and documented: `$`, then the class name with a lower-case first letter.
  - The name is a runtime-only export: no `.d.ts` declares it, and the baseline exported no brand for `FABLike`.
  - It is cosmetic.
- **`trait-field`'s strictness.** The code and the plugin document refuse every instance field that isn't `declare`, including `foo!: T`. The plan's row says _"with an initializer"_.
  - Refusing it is sound: under define semantics, a field without an initializer still defines an own `undefined` property on each instance. Copying it, or skipping it, would each change what the trait means.
  - Any private field without an initializer is allowed, not only `#brand`. That is harmless, because a member that reads a private name is refused.
  - The plan's row is for the architect to align.
- **The esbuild dev dependency.** `esbuild` is pinned exactly, at `0.28.1`, in the root `package.json`. That is P42's version. Only `bundles.node.test.ts` uses it.

## Scope

**Covered:**

- The source of `packages/core/src/traits/{composition,attribute-traits}.ts`.
- In `packages/vite-traits-plugin/src`: `plugin.ts`, and `composition/{trait-module,trait-class,rules,lower,statics,copy}.ts` in full. `composition/annotation.ts` up to the list expansion, and the cache and the exported names of `syntax.ts`.
- The plugin's tests.
- The plugin document's transform, statics and diagnostics sections.
- Core's and material-x's built output at this tree, after `aube install` and `aube exec just build` (6 tasks succeeded).
- The plugin suite: 71 of 71 pass.
- Core's `tsc`.
- The mutations M1 to M14.
- Probes W1 to W8.

**Not covered:**

- The root `just test`, and material-x's `test-spec`.
- Proofs 1 to 4 and 7, which I didn't re-run. I rely on the proofs record for them.
- The surface compare and the size table, beyond reading them.
- CI run 44558959512, which was in progress and which I didn't read.
- The dev server's watch behavior.
- The Storybook docs build.
- Firefox and WebKit.
- The 19 rewritten material-x source files, beyond the trait classes and the composition sites I read for the focus points.
- In the plugin: `attributes/lower.ts`, `composition/declarations.ts`, the list expansion in `annotation.ts`, `ir.ts` and `free-references.ts`. I didn't read them beyond their use in the files above and their test rows.
- The drag DRI-17 failure, which is out of scope.

## Next

The architect rules reviewer-1 and reviewer-2: each is either repaired before the merge, or the property is amended. reviewer-3, reviewer-4 and reviewer-5 go to the implementer whenever convenient.