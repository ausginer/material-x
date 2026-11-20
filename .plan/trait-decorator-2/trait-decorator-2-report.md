# `@trait` follow-ups: implementation report

**Implemented 2026-11-20** on `repo/trait-decorator-2`, against the [plan](trait-decorator-2-plan.md) and `RD-26`'s fourth amendment of 2026-11-20 in [`00-index.md`](../00-index.md). The branch merged `origin/main` at `e4b0e475d` first. The implementation commit is `801b94e23`. The baseline for every "before" reading is `645410c12`, the plan's, in a scratch worktree of its own with a frozen install and `just build`.

## What changed

- **The load stage** (`packages/vite-traits-plugin/src/declaration-doc.ts`), task 1:
  - it reads `export default class` as well as `export class`, with the decorators before `export`, named or anonymous, and moves `export default` with the whitespace after each keyword;
  - a statement counts as documented when a JSDoc block comment lies after the previous statement's end, or the program's start, and before the first decorator. Other comments may follow the JSDoc. One forward pass over the comments serves every statement;
  - the record that `plugin.ts` keeps per id now holds the names that the moved classes are exported as, `default` for an `export default` class. `positionWithoutStage` reads both statement kinds, so the longer `export default` span is moved back too.
- **Import removal**, task 2:
  - `src/syntax.ts`: `ImportRemovals`, `addImportRemovals` and `removeImports` replace `removeSpecifiers`. `removeImports` removes a declaration whole when no value specifier is left, an inline `type` and a declaration's `import type` included, and otherwise removes the specifiers as before;
  - `src/attributes/lower.ts` and `src/composition/trait-module.ts` add their specifiers to the removals. Layer (b) applies them at the end of its lowering;
  - `src/composition/lower.ts`: `lowerCompositions` takes the program and the removals, finds `compose`'s locals and the `impl` specifier itself, and adds `compose` when no value reference to it is left outside the removed compositions;
  - `src/plugin.ts`: `flattenModule` gives one `ImportRemovals` to the trait transform and to the lowering, and applies it once, after both. **This is the one point the plan didn't spell out.** A module that imports `trait` and `compose` from one declaration, with an `@trait` class and a lowered composition, gets both removed from that declaration. Applied in two passes, neither pass would see the declaration emptied. Applied once, it goes whole, as property 1 requires. A test witnesses it.
- **Documentation** (`.agents/docs/trait-flattener-plugin.md`), task 3: the stage's rewrites and the documented test, the record, a paragraph on emptied imports, `compose`'s removal in _The emitted component_, the new _Verification_ rows and a change-record row.

## Proofs

### 1. The doc forms

`tests/declarations.node.test.ts` builds with tsdown and declarations. It adds four rows: a line comment between the doc and `@trait`, a block comment there, `@trait export default class Defaulted` in a second entry, and `@trait export abstract class Abstracted`.

- **At `645410c12`** ([`before.sh`](checks/before.sh), [transcript](checks/before.txt)) the line, block and default rows fail, and the abstract row passes.
- **At `801b94e23`** all pass.
- **Mutations** ([`mutations.sh`](checks/mutations.sh), [transcript](checks/mutations.txt)):
  - restoring the blank-only test fails the line and block rows, and only those;
  - skipping `ExportDefaultDeclaration` fails the default row, and only that.

### 2. Positions

`tests/diagnostics.node.test.ts` adds a `trait-decorator` module: `@trait` beside `@sealed`, above `export default class Defaulted`, with a doc. It reports the `pos` that the same build reports without the stage.

- **Mutation:** with the default span left out of the record, that row fails, and the other three pass ([transcript](checks/mutations.txt)).
- At `645410c12` the row passes, because that stage doesn't move a default class.

### 3. Import removal

Against expected text:

| Row | File | At `645410c12` |
| --- | --- | --- |
| an empty composition with `import { compose, type Composed }` leaves no import of that specifier | `flatten.node.test.ts` | fails |
| a trait module with `import { trait, type Composed }` leaves none | `trait-module.node.test.ts` | fails |
| `import { attributes, type AttributeTable }` with nothing else from it leaves none | `attributes.node.test.ts` | fails |
| one declaration that the trait transform and the lowering empty together leaves none | `flatten.node.test.ts` | fails |
| `import { bound, trait }` with `bound` still read keeps `bound` | `trait-module.node.test.ts`, the existing row | passes |
| a supertrait's module, which still calls `compose`, keeps `import { compose, type Composed }` | `flatten.node.test.ts` | passes |
| an untouched `import { type Props } from './props.ts'` stays as written | `trait-module.node.test.ts` | passes |

- **The before run** is [`before.txt`](checks/before.txt): 7 failures in all, the four above and proof 1's three.
- **Mutations** ([transcript](checks/mutations.txt)):
  - counting an inline `type` as a value fails the four removal rows;
  - never removing `compose` fails the two rows that need it, and the supertrait row passes.

### 4. The tree

[`tree.sh`](checks/tree.sh) ([transcript](checks/tree.txt)) compares the git-ignored files under `packages/core` and `packages/material-x`, outside `node_modules` and `*.tsbuildinfo`, after `aube exec just build` in each tree.

- **The files:** 294 in each tree, with the same names.
- **The `.js` files,** without their `sourceMappingURL` comment, are byte-identical except `list/list-item.js`, `button/ButtonCore.js` and `button-group/ButtonGroupCore.js`. Each of those three loses only the line `import "@ydinjs/core/traits/composition.js";`. Their three `.js.map` files differ only in `mappings`, because each line after the removed one moves up by one.
- **Every `.d.ts` is byte-identical.**
- **Bare imports** of `@ydinjs` packages in material-x's `.js`: 8 at `645410c12`, 5 at `801b94e23`. The five are mechanism (ii), exactly the plan's list: `IconButtonCore.js`'s two, `TextFieldCore.js`'s, `ButtonGroupCore.js`'s `attribute-traits.js`, and `focus-forwarding.js`'s.
- **Slot b's first build** also had six files under `packages/core/traits/` from an older branch, `attributes.*` and `primitives.*`, which no source builds now. `just clean-build` removed them before the reading.

### 5. Size

`just size-reading` in each tree ([base](checks/size-base.json), [head](checks/size-head.json)), compared by [`size-compare.ts`](checks/size-compare.ts) ([transcript](checks/size-compare.txt)): **33 rows, none moved.**

- **The instrument can see the change:** the `list/list-item` row bundles `list-item.js` itself.
- **Why it reads 0:** the row's bundle includes core. rolldown finds no side effect in `composition.js` and drops it, with or without the bare import. So the line costs a bundling consumer nothing. What this change removes is the line in material-x's published files, and the import an unbundled consumer fetches.

### 6. Gates

At `801b94e23`, from the root, one after another:

| Gate | Result |
| --- | --- |
| `just typecheck` | passes |
| `just typecheck-declarations` | passes |
| `just lint` | passes |
| `just fmt-check` | failed on `checks/size-compare.ts`, this report's own script, which wasn't formatted yet. It passes after `oxfmt` |
| `just test` | 2314 of 2315 pass. The failure is `drag`'s `hot-path.browser.test.ts`, _"should allocate per sample only the CSS string a lifted write needs"_, in `shipped/drag (chromium)`: 24 allocations where it allows fewer than 16 |
| `just docs-build` | passes |

- **The `drag` failure is flaky, and not this change's.** Alone, with `just test-engines tests/hot-path.browser.test.ts` in `packages/drag`, it failed 1 of 3 runs at `801b94e23` and 1 of 4 at `645410c12`, the baseline. The size readings were running in the baseline tree during the root run. `drag` has no trait.

- `just build` prints no `trait-member-conflict`, in either tree.
- Formatting and lint ran on each changed file in the plugin's order (`fmt`, `lint-fix`, `fmt`, `lint`), and `just lint src tests` in the plugin passes.

## What is left

- **`RD-26`'s fourth amendment** still says _Unimplemented_. That is the architect's to date, as with the third.
- **Out of scope, as the plan says:** `reviewer-4`'s mechanism (ii), five bare imports; `reviewer-5`; core's `sideEffects`, which the owner answered yes and which is its own unit, `RD-30`; and bare imports in the published `.d.ts` files.
- **One commit message is wrong:** `768552f00`, which adds this report's checks and draft, says _"wip"_. History isn't rewritten without the owner's word, so it stays, and the squash message needs that line dropped.