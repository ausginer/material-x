# `@trait` and `@attributes(TABLE)`: implementation report

**Input.** `repo/trait-decorator-1` at `6211e435f`, with the [`@trait` plan](trait-decorator-plan.md), and `origin/repo/attributes-decorator-1` at `dfd49e683`, merged at `392538c30`, with the [`@attributes` plan](../attributes-decorator-1/attributes-decorator-plan.md). `origin/repo/trait-jsdoc-probe-1` at `cc1ae588b`, merged at `47bc34324`, with the plan's section [_The doc in the declarations: a `load` stage_](trait-decorator-plan.md#the-doc-in-the-declarations-a-load-stage). Governing record: `repo:RD-26` and its three amendments of 2026-11-20. Written by the implementer on 2026-11-20.

**Owner's answers relayed during the work:**

- Fix 2 isn't done. ListItem keeps `compose(ControlledElement)` and `ListItemCoreTraits = readonly []`. Fix 1 still applies.
- `@attributes(TABLE)` ships in the same pull request.
- The JSDoc in front of the decorators is kept by a `load` stage, P47's way 1, as P48 refines it: _"Давай короч тогда `load`. Да, больше мороки, но код выглядит как надо"_ ("Let's go with `load` then. Yes, more hassle, but the code looks right").

**Status: implemented.** Every proof holds, proofs 11 and 12 included. The `load` stage needed one addition that the plan didn't name: a watch registration ([below](#the-doc-in-the-declarations)).

## What changed

- **core.**
  - `trait` is a decorator whose type accepts only a class with a bound's heritage, and whose body throws.
  - `attributes(TABLE)` returns a decorator, `AttributesDecorator<Table>`, that checks the table against the decorated class. Its body throws.
  - Every trait moved to `@trait` and `@attributes(TABLE)`, in core, material-x, the plugin's fixtures and the README.
- **The plugin.**
  - **Layer (b)** lowers `@attributes(TABLE)`, the decorator after `@trait`, removes it and its import, and raises `attributes-decorator`.
  - **The trait module's transform** compiles `@trait` into the same brand install, with the method after layer (b)'s `static observedAttributes` or else first. It raises `trait-decorator`.
  - **The analysis** recognizes `@trait` in `findTrait` and in the supertrait test.
  - **Fix 1:** `lower.ts` emits no `impl` block for an empty list, and imports `impl` only when some list has a trait.
  - **The pre-filters** match `\btrait\b` and `attributes`.
- **Two refactors, needed by the new checks.**
  - The fail-closed value-reference walker moved from `annotation.ts` into `syntax.ts` as `forEachValueReference`. `composition-shape` counts through it unchanged.
  - `removeSpecifiers` moved into `syntax.ts`. A removed last specifier now takes the comma before it, so `import { bound, trait }` becomes `import { bound }`, not `import { bound,  }`. Built output doesn't change, because it is reprinted.

## Deviations from the plans

- **The method's place, `@trait` plan.** The plan's step 3 put the method first in the class body, and otherwise replaced layer (b)'s emptied block. Layer (b) puts `observedAttributes` first, so the method had to replace that block in place to keep the output byte-identical. The `@attributes` plan states the final rule: after a leading `static observedAttributes`, or else first.
- **Proof 1's exceptions.** Besides `list/list-item.js` and the `.d.ts` files the plans list, two more files change, and both follow from the change itself:
  - `core/traits/composition.js`: `trait`'s body and the comments on `trait` and `impl`;
  - `core/traits/attribute-traits.js`: `attributes`'s body and comment. The `@attributes` plan names this file.
- **list-item.js** keeps a bare `import "@ydinjs/core/traits/composition.js";`. The flattened module's `compose` import has no use left, and rolldown keeps the specifier as a side-effect import. That is why `list/list-item` shrinks by 32 B, not the plan's estimate of about 44 B.
- **The `trait-decorator` position for a third decorator beside `@trait` and `@attributes`** is an offset in layer (b)'s output, which the trait module's transform reads. The test asserts the code only.

## The doc in the declarations

**The defect** (P47): oxc's declaration emitter, which tsdown runs, drops a JSDoc in front of a class's decorators. With the plans' source form, the 10 published trait `.d.ts` files lost their class docs: core's `checkable`, `disableable`, `linkable`, `nameable`, `reorderable`, `selectable`, `typeable` and `valuable`, and material-x's `core/traits/focus-forwarding` and `button/IconButtonCore`. [`probes/jsdoc-placement.ts`](probes/jsdoc-placement.ts) is the first reading.

**The stage, as the plan states it** (`src/declaration-doc.ts`, and the `load` hook of `trait-attributes` in `src/plugin.ts`). It moves `export` before the decorators of a documented exported class, in a build and not on the dev server. It records the classes it moved per module id, replacing the record at each load and dropping it in `watchChange`. The reporter translates a `pos` inside a moved class's `export` or decorators back into the text without the stage. It finds those spans in its own hook's input, so the translation holds after layer (b)'s edits too.

**One addition: the watch registration.** The plan's _Watch_ paragraph says a rebuild loads a changed file again. In the `tsdown --watch` reading it didn't: a module that a plugin's `load` hook serves isn't watched, so an edited trait triggered no rebuild at all. The hook now calls `this.addWatchFile(id)`, and a node test fails without it ([reading](checks/load-stage-watch.txt), [mutation](checks/load-stage-without-watch.txt)).

**Not kept: an implementation of P47's way 1 with an internal form.** Before the amendment arrived, I built the stage as P47 described way 1: decorators rewritten into `static { __mxflat_trait(this); __mxflat_attributes(this, TABLE); }`, which the later stages compiled. It met the coordinator's minimum proofs, but the amendment lists that internal form under _Not adopted_. It was replaced before any commit, by the amendment's stage on `eda3b1bfc`'s compile.

## Verification

| Proof | Result | Evidence |
| --- | --- | --- |
| 1. Built output | JS byte-identical except `list/list-item.js`, `composition.js` and `attribute-traits.js`. `.d.ts` identical except `composition` and `attribute-traits`, which have new signatures. Each layer (b) trait still reads `observedAttributes`, then the method, then its members. | [`checks/built-output-diff.txt`](checks/built-output-diff.txt) |
| 2–6. Plugin | 153/153 pass. Against the base plugin source, every new `@trait` test fails: 66 failed. Against the `@trait` commit's source, every new `@attributes` test fails: 44 failed. The third-decorator case passes there too, because the old source refuses it with the same code. | [`checks/plugin-tests.txt`](checks/plugin-tests.txt), [`checks/plugin-tests-base-src.txt`](checks/plugin-tests-base-src.txt), [`../attributes-decorator-1/checks/plugin-tests-trait-commit-src.txt`](../attributes-decorator-1/checks/plugin-tests-trait-commit-src.txt) |
| 5. Fix 1 | Both cases fail on the base source: `[true, true]` and `[1, 2]`. Both pass now. | `plugin-tests-base-src.txt`, `plugin-tests.txt` |
| 7. core | 307/307 pass, type tests included. With the old `trait`, 5 fail. With the old `attributes`, 4 fail. | [`../attributes-decorator-1/checks/core-tests.txt`](../attributes-decorator-1/checks/core-tests.txt), [`checks/core-tests-base-trait.txt`](checks/core-tests-base-trait.txt), [`../attributes-decorator-1/checks/core-tests-old-attributes.txt`](../attributes-decorator-1/checks/core-tests-old-attributes.txt) |
| 8. Runtime baseline | `traits-baseline.browser.test.ts` matches its snapshot in Chromium, Firefox and WebKit. | [`checks/traits-baseline.txt`](checks/traits-baseline.txt) |
| 9. No old form; gates | Outside `.plan/`, `trait(this` and `attributes(this` remain only as misuse cases: the diagnostics tests, a type-error test, and the plugin document's rows. Root `just typecheck` and `just typecheck-declarations` exit 0. The build prints no `trait-member-conflict`. | `git grep -n "trait(this\|attributes(this" -- ':!.plan'` |
| 9. Root `just test` | 2210/2211. The failure is `drag:DRF-48`'s hot-path allocation row. drag is unchanged and imports no trait. That row passed in one of this branch's root runs, and failed twice out of three when run alone. | [`checks/root-test.txt`](checks/root-test.txt), [`checks/drag-hot-path-rerun.txt`](checks/drag-hot-path-rerun.txt) |
| 10. Size | Only `list/list-item` (−32 B) and `complete` (−20 B) move. Both are decreases, the same as at `eda3b1bfc`. | [`checks/size-reading.md`](checks/size-reading.md) |
| 11. The tree | Against `eda3b1bfc`'s build, all 293 `.js`, `.d.ts` and map files are byte-identical except the 10 trait `.d.ts` files. Each of those differs only by added comment lines, and equals the `.d.ts` that `6211e435f` built. P48's `docs.ts`: 10/10. | [`checks/load-stage-against-eda3b1bfc.txt`](checks/load-stage-against-eda3b1bfc.txt), [`checks/load-stage-docs.txt`](checks/load-stage-docs.txt) |
| 11. Test without the stage | `declarations.node.test.ts` builds a fixture trait through tsdown with declarations: the doc stands directly before `export declare class`, with `@attributes` and without it. With the `load` hook removed, all 6 of its tests fail: the two tsdown builds lose the doc, and the four that call the hook directly find no hook. | [`checks/declarations-without-load.txt`](checks/declarations-without-load.txt) |
| 11. Dev server, watch, cost | After a `serve` configResolved, the hook returns `null`. Two loads of one id give each its own text. With `tsdown --watch` in `packages/core`, an edited doc reaches the rebuilt `checkable.d.ts` in 2 s. `just build` takes 6.7–8.4 s with the stage and 6.6–7.4 s without it, interleaved, four runs each. | [`checks/load-stage-watch.txt`](checks/load-stage-watch.txt), [`checks/load-stage-build-time.txt`](checks/load-stage-build-time.txt) |
| 12. Diagnostics through the stage | A rolldown build reports `trait-decorator` (275), `attributes-decorator` (209) and `attribute-table` (228) at the `pos` the same build has without the stage. With the translation removed, each is 7 later, the length of `export `. | `diagnostics.node.test.ts`, [`checks/positions-without-translation.txt`](checks/positions-without-translation.txt) |

Format and lint ran on every changed file. Lint reports nothing. The changed Markdown has no new links. `git diff --check` is clean.

## Next

The pull request is open for the owner's review. It references `RD-26` and closes nothing.