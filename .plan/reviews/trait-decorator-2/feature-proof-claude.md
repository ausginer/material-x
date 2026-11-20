# `@trait` follow-ups: no silent doc loss, no emptied import — feature proof

**Files were read at:** `69b721a3e` (`repo/trait-decorator-2`, PR #88), in the detached worktree of slot b. **Baseline:** `origin/main` at `e4b0e475d`, in a scratch worktree of my own, with `aube ci` and `just build`. The plan's baseline is `645410c12`. `e4b0e475d` is `645410c12` plus RF-55, whose only change under `vite-traits-plugin` is its `package.json`. **Diff reviewed:** `f8db02de3` to `801b94e23`, the implementation, and the report's commits after it.

**Governing records:** `RD-26`'s fourth amendment of 2026-11-20 in [`00-index.md`](../../00-index.md) (`badd1295a`, `65b45c0aa`); the [plan](../../trait-decorator-2/trait-decorator-2-plan.md), tasks 1 to 4 and proofs 1 to 6; and the implementer's [report](../../trait-decorator-2/trait-decorator-2-report.md) with its `checks/`. Out of scope, as the plan says: `reviewer-4`'s mechanism (ii), `reviewer-5`, core's `sideEffects` (`RD-30`), and bare imports in the `.d.ts` files.

**Lens:** feature proof. Each claim below is my own reading or my own run. Nothing is repaired, and no record is amended.

**Verdict at `69b721a3e`: the plan's proofs hold, and one Tier A regression should be repaired before the merge.** Proofs 1, 3 and 4 reproduce against `main`, mutations included, and proof 2's position holds for every form I mapped. `reviewer-1`: the stage now throws on a documented class whose `export` and `default` a comment separates, and the build fails. At `main` the same module builds. The form is rare. But the stage reads every decorated class in every build that uses the plugin, not only traits.

## Scope

**Covered.**

- **The diff.** `declaration-doc.ts`, `syntax.ts`, `composition/lower.ts`, `composition/trait-module.ts`, `attributes/lower.ts`, `plugin.ts`, the six test files, `trait-flattener-plugin.md` and the report. These are the plan's tasks 1 to 4. The merge `f8db02de3` brings in `origin/main` (RF-55) and changes nothing else.
- **Proof 1, the doc forms, and proof 3, import removal.**
  - The plugin's suite at the head passes 172 of 172.
  - The implementer's [`before.sh`](../../trait-decorator-2/checks/before.sh), run against `e4b0e475d`, fails the same 7 rows that the report records against `645410c12`: the three doc rows and the four removal rows. 136 pass, the abstract row among them ([transcript](checks/feature-proof.txt)).
  - **Each baseline failure is on its assertion.** I ran three of the rows alone at `e4b0e475d`. The `.d.ts` lacks the doc, and the trait module's output begins `import { type Composed } from '…'`. So none fails because of a missing export or a helper.
  - [`mutations.sh`](../../trait-decorator-2/checks/mutations.sh) at the head gives the report's transcript line for line. Only the order of two lines that vitest prints for nested `describe`s differs. Each mutation fails only its own rows.
- **Proof 2, positions.** The `defaulted.ts` row passes, and the mutation that leaves the default span out of the record fails it. My probe [`stage-edges.ts`](checks/stage-edges.ts) maps every position of the stage's output back through `positionWithoutStage` and compares the character with the source. That holds for a named default, an anonymous default with two decorators, a doc that a line comment follows, a doc at the end of the previous statement's line, and two classes in one module, only the second documented.
  - **One mismap that no diagnostic reaches.** When a comment stands between the last decorator and `export`, as in `/** d */ @trait /* c */ export class X`, the keywords and the comment map to wrong positions. The decorators still map correctly. This holds at `main` for `export class` too. Every diagnostic of `trait-decorator`, `attributes-decorator` and `attribute-table` points at a decorator, a reference, a table or a table property (`trait-module.ts` lines 126 to 155, `attributes/lower.ts`), and none points at the keywords. So no diagnostic moves, and this isn't a finding.
- **Proof 4, the tree.** I ran [`tree.sh`](../../trait-decorator-2/checks/tree.sh) on `e4b0e475d` and the head after `just clean-build` and `just build` in each tree. Its output equals the report's transcript, apart from the two SHAs:
  - 294 built files in each tree, with the same names;
  - the only `.js` files that differ are `list/list-item.js`, `button/ButtonCore.js` and `button-group/ButtonGroupCore.js`, each by the one line `import "@ydinjs/core/traits/composition.js";`. Their maps differ only in `mappings`;
  - every `.d.ts` is byte-identical;
  - material-x has 8 bare `@ydinjs` imports at `main` and 5 at the head. The five are the plan's mechanism (ii) list.
  - `just build` prints no `trait-member-conflict` in either tree.
- **Property 3, untouched declarations.** In the tree, the only lines removed are the three above, and none of them is a bare import in source. My probe [`untouched-imports.ts`](checks/untouched-imports.ts) puts eight declarations the plugin has no reason to touch into a module that has a layer (b) trait, an `@trait` class and an empty composition. It runs layer (b) and `flattenModule`, as the tests' `transform` helper does. The eight declarations are `import 'a'`, `import "b"`, `import {} from`, `import { type X }`, `import type { Y }`, `import { type Z, value }`, a namespace import and a default import. All eight stay as written, and nothing from `composition.js` or `attribute-traits.js` is left.
  - **Reading:** `addImportRemovals` adds a declaration only when one of its specifiers' local names is a removed local (`trait`, `attributes` or `compose`). `removeImports` reads only the declarations in that map. A side-effect import has no specifiers, so it never enters the map.
  - `transformTraitModule` returns `null` before `removeUnusedImports` when the module has no trait class. So an unused `import { trait }` isn't removed in a module that composes and kept in one that doesn't.
- **The implementer's decision: one set of removals, applied once in `flattenModule`.** It is right, and it is within property 1. With two passes, the second would judge _"no value specifier remains"_ against the parsed specifier list, in which the first pass's removal still stands. So the second pass would keep `import { type Composed }` for the module that `flatten.node.test.ts`'s _"empty together"_ row builds, which is the bare import that property 1 rules out. One set judges the declaration as the module leaves it. Both transforms read the same `program`, so the map's keys agree. Layer (b) applies its own set in its own hook. No declaration can be shared with it, because `attributes` comes from `attribute-traits.js` and `trait` and `compose` from `composition.js`. And the flattener parses layer (b)'s output again.
- **Proof 5, size.** The two committed readings, `size-base.json` and `size-head.json`, are byte-identical. I didn't run `just size-reading` again.
- **The drag row** (`drag`'s `hot-path.browser.test.ts`, _"should allocate per sample only the CSS string a lifted write needs"_). I ran it alone, with `just test-engines tests/hot-path.browser.test.ts` in `packages/drag`, five times in each tree, alternating between them ([transcript](checks/drag-flake.txt)). It failed 4 of 5 runs at `e4b0e475d` and 1 of 5 at the head, each time on that row alone, out of 9. So the failure is `main`'s already, and this unit doesn't cause it. `drag` has no change in the diff and no trait.
- **Documents.** `trait-flattener-plugin.md` describes the stage's forms, what counts as documented, the record, the removal of an emptied import and of `compose`, and the new _Verification_ rows, as the code does. Its change-record row is there.

**Not covered.** I didn't rerun root `just test`, `just typecheck`, `just typecheck-declarations`, `just lint`, `just fmt-check` or `just docs-build`. The report's gate table stands as the implementer's.

## Findings

### reviewer-1 — Tier A: the stage throws on `export /* comment */ default`, and the build fails

- **Current behaviour.** For an `export default` statement, `moveExportBeforeDecorators` matches `/^export\s*default\s*/u` at the statement's start, and the code asserts that it matches. When a comment stands between `export` and `default`, the match is `null`. The destructuring then throws `TypeError: object null is not iterable`, and the `load` hook doesn't catch it.
- **Reproduction** ([`export-comment-default.ts`](checks/export-comment-default.ts), [`build-crash.ts`](checks/build-crash.ts), [transcript](checks/feature-proof.txt)):
  - `/** Doc. */ @trait export /* c */ default class X {}` and `/** Doc. */ @sealed export // c` then `default class Y {}`: at `e4b0e475d` the stage returns `null`. At the head it throws.
  - A rolldown build with `viteTraitsPlugin()` of a module that has no trait, `/** Doc. */ @sealed export /* c */ default class Y {}`, builds at `e4b0e475d`. At the head it fails: _"Build failed with 1 error: [plugin trait-attributes]"_.
  - `export /* c */ class Z` is moved correctly at both commits, because `\s*` may match nothing.
- **Why it is a problem.** The source is valid JavaScript and TypeScript. The stage reads every candidate module with a line that starts with `@`, in every build, applications included. So it reaches a consumer's own decorated classes, not only traits. The plan's property 1 says that the stage reads `export default class` declarations whose decorators come before `export`, with no condition on comments. The form didn't fail before this unit, because the stage skipped `export default`.
- **Tier A,** by consequence: a correctly integrated consumer's build fails where it built at `main`. It is low within the tier, because it needs three things at once: a JSDoc, decorators before `export`, and a comment between `export` and `default`. No module in the repository has that form.
- **Required property.** For every `export default class` that property 1 reads, the stage either moves the keywords, under properties 3 and 4, or leaves the statement as written. No form of the statement makes the build fail. The plan's proof 1 has no row for this form.

## Notes, not findings

- **Commit `768552f00` is titled _"wip"_.** It adds the report's checks and its first draft. History isn't rewritten. The report says so too, and it asks that the squash message drop that line.
- **`RD-26`'s fourth amendment still reads _Unimplemented_.** The report says that the architect dates it, as with the third amendment.