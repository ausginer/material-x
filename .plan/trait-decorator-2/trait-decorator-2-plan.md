# `@trait` follow-ups: no silent doc loss, no emptied import

**Planned 2026-11-20 by the architect** on `repo/trait-decorator-2`, from `origin/main` at `645410c12`. PR #85 merged at `3457e3463`. `RD-26`'s fourth amendment of 2026-11-20 in [`00-index.md`](../decisions/RD-26.md) records the decisions. **Approved by the owner on 2026-11-20,** with question 1 answered yes.

**Inputs:**

- `reviewer-3` and `reviewer-4` of the [feature proof](../reviews/trait-decorator-1/feature-proof-claude.md);
- the coordinator's probe of `abstract`;
- the owner's question whether `@ydinjs/core` should declare `sideEffects`.

`reviewer-5`, the load stage's scope, is deferred by the owner and isn't planned here.

**Probes,** all at `645410c12`, with tsdown 0.23.7 and rolldown 1.3.2:

- [`doc-forms.ts`](probes/doc-forms.ts) ([transcript](checks/doc-forms.txt)): 11 trait forms built with declarations, with the plugin and without it;
- [`import-shapes.ts`](probes/import-shapes.ts) ([transcript](checks/import-shapes.txt)): which import shapes a library build turns into a bare import;
- [`material-x-build.config.ts`](probes/material-x-build.config.ts) and [`core-effects.ts`](probes/core-effects.ts) ([transcript](checks/bare-imports.txt)): material-x built into a scratch directory as configured and with `moduleSideEffects: 'no-external'`, and every built core module read for import-time effects.

## reviewer-3: the doc in the declarations

### Diagnosis

| Form | Plugin | No plugin | Cause |
| --- | --- | --- | --- |
| `/** doc */ @trait export class` (written) | kept | lost | the stage works |
| `/** doc */ // note` then `@trait export class` | lost | lost | the stage requires only whitespace between the doc and `@` |
| `/** doc */ // note` then `export @trait class` | kept | kept | the emitter keeps a doc that other comments separate from `export` |
| `/** doc */ @trait export default class X` | lost | lost | the stage skips `export default` |
| `/** doc */ export default @trait class X` | kept | kept | the emitter keeps it |
| `/** doc */ @trait export default class` (no name) | error | lost | `trait-decorator`: _"@trait decorates a module-scope class declaration"_ |
| `/** doc */ @trait export abstract class` | kept | lost | the stage works |
| `@trait /** doc */ export class` | kept | kept | the stage doesn't move it, and the emitter keeps the doc |

- **`abstract` isn't a defect.** The stage writes `export @trait abstract class`, and the `.d.ts` reads `/** Doc. */` then `export declare abstract class`. The feature proof's [`edge-cases.ts`](../reviews/trait-decorator-1/checks/edge-cases.ts) tests the output with `(export )?declare class`, which can't match `declare abstract class`. The transcript's last line applies that test to the kept output and reads `LOST`. This agrees with the coordinator's `isolatedDeclarationSync` probe.
- **The line comment is the stage's.** Its "documented" test (`declaration-doc.ts`) accepts a JSDoc only when the text between the JSDoc and the first decorator is blank. Once `export` comes first, the emitter keeps a JSDoc with a line or block comment after it.
- **`export default` is the stage's.** The stage reads only `ExportNamedDeclaration`. The trait transform accepts `@trait export default class X` and `export default @trait class X`, and both give the same JavaScript: the brand, `var X = class …`, and `export { $x, X as default }`. The annotation resolver follows a default import of a trait (`annotation.ts`), so this is a supported form.
- **An anonymous default class is refused already,** by `trait-decorator`, because `collectTopClasses` indexes only a named class.

### Decision: keep the doc in each form

Every form the plugin accepts keeps its doc. None of them needs a diagnostic.

- **Why keep it rather than refuse the form.** In each case, the stage moves `export` and hands the compile a form it already accepts, and the emitter keeps that form's doc. Refusing a line comment would make the compiler a lint rule about comment placement. Refusing `export default` would remove a form that the resolver supports.
- **The stage's required properties, amended:**
  1. **Which statements it reads:** an `export class` or an `export default class` declaration whose decorators come before `export`. A default class may be anonymous: the stage doesn't need a name, and `trait-decorator` reports an anonymous trait.
  2. **When a statement counts as documented:** a JSDoc block comment lies after the previous statement's end, or after the program's start, and before the first decorator. Other comments may stand between the JSDoc and the decorator.
  3. **What it moves:** `export`, or `export default`, with the whitespace after each keyword, to the first decorator's start. `/** doc */ // note @trait export default class X` becomes `/** doc */ // note export default @trait class X`.
  4. **Positions,** unchanged: every diagnostic carries the `pos` it would carry without the stage. The record the reporter reads covers every statement the stage moved, named or anonymous, and the longer `export default` span.
- **A JSDoc after the first decorator** (`@trait /** doc */ export class`) isn't documented by property 2. The stage leaves it, and the emitter keeps it as written.

### Not adopted

- **Moving `export` for every decorated class, with no doc test.** That removes the comment question, but the stage would then rewrite every decorated class in every build, applications included. `reviewer-5` already questions that scope, and the owner deferred it.
- **A diagnostic for any of the forms:** each one can keep its doc.

## reviewer-4: the bare import

### Diagnosis

material-x's built JavaScript has eight bare imports of `@ydinjs/core` modules ([transcript](checks/bare-imports.txt)). Two mechanisms cause them.

**(i) The plugin leaves an import declaration that keeps no value.** `tsconfig.base.json` sets `verbatimModuleSyntax`. So `import { type X } from 'm'` is emitted as `import {} from 'm'`, and an unused `import { x } from 'm'` is kept as written. rolldown keeps an external module's evaluation, so both become `import 'm'`. Only `import type { X }`, or no declaration at all, emits nothing ([`import-shapes.ts`](checks/import-shapes.txt)):

| Built file | Source declaration | What removed the value |
| --- | --- | --- |
| `list/list-item.js` | `import { compose, type Composed } from '…/composition.js'` | the lowerer: it removes the composition and keeps the import |
| `button/ButtonCore.js` | `import { trait, type Composed } from '…/composition.js'` | the trait transform: it removes `trait` and keeps `type Composed` |
| `button-group/ButtonGroupCore.js` | `import { trait, type Composed } from '…/composition.js'` | the same |

The trait transform's `removeUnusedImports` removes the whole declaration only when every specifier is unused. An inline `type` specifier counts as used. Layer (b)'s removal of `attributes` uses the same helper, `removeSpecifiers`, and has the same gap, though no declaration in the tree shows it.

**(ii) rolldown drops a class and keeps its external imports.** A material-x trait class that the package's runtime doesn't read is tree-shaken away, because the flattener copies its members into each component. Its external imports lose their last use there, after every transform, and rolldown keeps them as bare imports:

- `button/IconButtonCore.js`: `attribute.js` (`Str`, in the table) and `attribute-traits.js` (`AnyElement`, the bound);
- `text-field/TextFieldCore.js`: `attribute-traits.js`;
- `button-group/ButtonGroupCore.js`: `attribute-traits.js` (`Controlled`);
- `core/traits/focus-forwarding.js`: `attribute-traits.js` (`Controlled`).

No hook of the plugin sees those uses go, so the plugin can't remove these imports.

### Decision: the plugin removes a declaration it empties

This fixes (i) and doesn't touch core's published contract.

- **Required properties:**
  1. **When the plugin removes an import specifier and no value specifier remains in that declaration, it removes the declaration.** An inline `type` specifier isn't a value specifier. One helper decides this for every caller: the trait transform (`trait`), layer (b) (`attributes`) and the lowerer (`compose`).
  2. **The lowerer removes the `compose` specifier when no reference to it remains in the module after lowering.** A module that still calls `compose` keeps it, such as a supertrait's module: its composition stays at runtime, where `compose` returns the bound.
  3. **The plugin removes only what it emptied.** A declaration that the plugin didn't touch stays as written, `import { type X } from 'm'` included: under `verbatimModuleSyntax`, that is the author's side-effect import.
- **What it gives:** `list-item.js`, `ButtonCore.js` and `ButtonGroupCore.js` lose `import "@ydinjs/core/traits/composition.js";`. RD-26 property 2's _"neither the block nor the import"_ then holds for the module as a whole: an empty composition leaves no import of `composition.js`.
- **Why the plugin, and not core's `sideEffects`.** The plugin's output should import only what the code that is left needs. That holds for every consumer, whether it bundles or loads the modules unbundled, and it removes the bytes from the published files. `sideEffects` only lets a consumer's bundler drop the import, and it would leave the line in material-x's published JavaScript, because material-x's build treats core as external and reads no external's `package.json`.

### (ii), and core's `sideEffects`: for the owner

(ii) isn't the plugin's defect, and this unit leaves it. These are the ways to remove it:

- **`"sideEffects": false` in `@ydinjs/core`'s `package.json`.**
  - **It is true today.** The 27 built modules have no expression statement, no bare import and no CSS at the top level. Their initializers are `Symbol(…)` brands, `bound()`, which returns `null`, and `createEventNotifier(…)`, which returns a closure ([`core-effects.ts`](checks/bare-imports.txt)). `element.js`'s `define` is a function that a component module calls. core defines no element itself.
  - **For consumers:** a bundler that reads the field (webpack, rollup, rolldown and Vite, esbuild) may drop an import of a core module whose bindings are unused. That covers (ii)'s four modules and an `import { type X }` in a consumer's own code.
  - **For material-x:** its published JavaScript doesn't change, for the reason above. Its size reading might, and that needs its own reading.
  - **The cost:** it is a promise in core's published contract. From then on, a core module with an import-time effect must be listed in the field, or the field must change. box-quad already declares `"sideEffects": false`.
- **`treeshake.moduleSideEffects: 'no-external'` in material-x's build.** It removes all eight bare imports. But it declares every external module free of side effects, so a deliberate bare import of a package would be dropped with no warning. In the probe it also changed the declarations: `fab.d.ts` gained `import "../core/styles/elevation/elevation.runtime.js"`, and an `elevation.runtime.d.ts` appeared. Not adopted.
- **The same option as a function for `@ydinjs/core/` only.** It would state, in material-x's build, a fact that core's `package.json` is the place for. Not adopted, unless the owner wants the bytes out of material-x's published files.

**Recommended:** core declares `"sideEffects": false` before its first release, as a separate unit with its own size reading. It isn't needed for `reviewer-4`. This is [question 1](#questions-for-the-owner).

## Tasks

1. **The load stage** (`packages/vite-traits-plugin/src/declaration-doc.ts`): the stage's properties 1 to 4 above, with `positionWithoutStage` and the record that `plugin.ts` keeps per id.
2. **Import removal:**
   - `src/syntax.ts`: the helper of property 1, beside `removeSpecifiers`;
   - `src/composition/trait-module.ts` and `src/attributes/lower.ts`: use it;
   - `src/composition/lower.ts`, with what `plugin.ts` passes to it: remove `compose` by property 2.
3. **Documentation:** `.agents/docs/trait-flattener-plugin.md`:
   - _The doc in the declarations_: what the stage rewrites;
   - the paragraph on the lowered composition: no import of the module `compose` came from, when nothing is left that needs it;
   - _Verification_: the new rows;
   - a row in its change record.
4. **The report:** `.plan/trait-decorator-2/trait-decorator-2-report.md`, with the proofs' runs.

## Proofs

Each proof names what it witnesses. A test fails without its change, and the implementer records the failing run beside the passing one.

1. **The doc forms** (`tests/declarations.node.test.ts`, a tsdown build with declarations): the `.d.ts` has the doc before the declaration for each of these:
   - a line comment between the doc and `@trait`;
   - a block comment there;
   - `@trait export default class X`;
   - `@trait export abstract class X`, which already passes and guards against a regression.

   **Mutations:**

   - restoring the blank-only test fails both comment rows;
   - skipping `ExportDefaultDeclaration` fails the default row.

2. **Positions** (`tests/diagnostics.node.test.ts`): `@trait` beside another decorator, above `export default class X`, reports the `pos` the same build reports without the stage. The mutation, the default span left out of the record, fails it.
3. **Import removal** (`trait-module.node.test.ts`, `attributes.node.test.ts`, `flatten.node.test.ts`), against expected text:
   - an empty composition with `import { compose, type Composed }` leaves no import from that specifier;
   - a trait module with `import { trait, type Composed }` leaves none either;
   - `import { attributes, type Props }` with nothing else from it leaves none;
   - a declaration that keeps a value, such as `import { trait, bound }` with `bound` still read, keeps that value;
   - a module that still references `compose` keeps its import;
   - an `import { type X } from 'm'` that the plugin didn't touch stays as written.

   The first three fail on `645410c12`.

4. **The tree.** Build `@ydinjs/core` and `@ydinjs/material-x` at `645410c12` and after:
   - every `.js` file, without its `sourceMappingURL` comment, is byte-identical, except `list/list-item.js`, `button/ButtonCore.js` and `button-group/ButtonGroupCore.js`. Each of those differs only by the line `import "@ydinjs/core/traits/composition.js";`;
   - every `.d.ts` is byte-identical: no module in the tree uses the new doc forms, and the declarations are recorded before any transform;
   - the eight bare imports of the diagnosis read five, all of mechanism (ii).
5. **Size:** the root size reading moves only rows that include one of those three modules, and none of them grows.
6. **Gates:** `just build` with no `trait-member-conflict`, root `just typecheck`, `just typecheck-declarations`, `just lint`, `just fmt-check`, root `just test` and `just docs-build`.

## Not in scope

- **`reviewer-5`,** deferred by the owner.
- **Bare imports in the published `.d.ts` files,** such as `import "@ydinjs/core/element.js";` in `button/IconButtonCore.d.ts`. rolldown-plugin-dts writes them, and this plan doesn't read why. A bare import in a declaration file has no runtime effect.

## Questions for the owner

1. **Should `@ydinjs/core` declare `"sideEffects": false`?** It is core's published contract. Recommended: yes, before core's first release, as a separate unit with its own size reading. It reaches mechanism (ii) in consumers' bundles, and nothing else in this plan needs it.

   **Answered 2026-11-20 by the owner,** relayed by the coordinator: _"Да, давай по обоим пунктам"_ ("Yes, go on both"): yes, as recommended, and tasks 1 to 4 go ahead. The unit is `RD-30`, planned on `core/side-effects-1`.