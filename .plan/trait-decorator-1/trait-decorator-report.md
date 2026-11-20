# `@trait` and `@attributes(TABLE)`: implementation report

**Input.** `repo/trait-decorator-1` at `6211e435f`, with the [`@trait` plan](trait-decorator-plan.md), and `origin/repo/attributes-decorator-1` at `dfd49e683`, merged at `392538c30`, with the [`@attributes` plan](../attributes-decorator-1/attributes-decorator-plan.md). Governing record: `repo:RD-26` and its amendments of 2026-11-20. Written by the implementer on 2026-11-20.

**Owner's answers relayed during the work:**

- Fix 2 isn't done. ListItem keeps `compose(ControlledElement)` and `ListItemCoreTraits = readonly []`. Fix 1 still applies.
- `@attributes(TABLE)` ships in the same pull request.

**Status: implemented, and one question is open.** With the plans' source form, each trait's JSDoc is missing from the published `.d.ts` ([below](#open-the-jsdoc-above-a-decorator)). Every other proof holds. No pull request is open. One opens once the owner answers.

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

## Open: the JSDoc above a decorator

The plans' form puts the JSDoc above the decorators: `/** … */`, then `@trait`, then `export class`. With that form, each trait's JSDoc is missing from the built `.d.ts`. That is 10 published files:

- core's `checkable`, `disableable`, `linkable`, `nameable`, `reorderable`, `selectable`, `typeable` and `valuable`;
- material-x's `core/traits/focus-forwarding` and `button/IconButtonCore` (its `IconButtonLike` doc).

**The cause is oxc's isolated-declarations emitter,** which tsdown uses here. It drops a JSDoc that comes before a decorator. tsc 7.0.2 keeps it. Probe: [`probes/jsdoc-placement.ts`](probes/jsdoc-placement.ts). oxc keeps the comment in two placements:

- `@trait` above the comment;
- `export`, then `@trait`, then `class X`. This is how oxfmt prints `export @trait class`.

**The owner is considering a plugin-side fix,** relayed by the coordinator: the plugin strips the decorators before rolldown-plugin-dts captures the source. That isn't decided. The source keeps the plans' form until it is. Every other `.d.ts` difference is the expected new signature of `trait` or `attributes` ([diff](checks/built-output-diff.txt)).

## Verification

| Proof | Result | Evidence |
| --- | --- | --- |
| 1. Built output | JS byte-identical except `list/list-item.js`, `composition.js` and `attribute-traits.js`. `.d.ts` identical except `composition` and `attribute-traits` (new signatures) and the 10 JSDoc losses above. Each layer (b) trait still reads `observedAttributes`, then the method, then its members. | [`checks/built-output-diff.txt`](checks/built-output-diff.txt) |
| 2–6. Plugin | 144/144 pass. Against the base plugin source, every new `@trait` test fails: 66 failed. Against the `@trait` commit's source, every new `@attributes` test fails: 44 failed. The third-decorator case passes there too, because the old source refuses it with the same code. | [`checks/plugin-tests.txt`](checks/plugin-tests.txt), [`checks/plugin-tests-base-src.txt`](checks/plugin-tests-base-src.txt), [`../attributes-decorator-1/checks/plugin-tests-trait-commit-src.txt`](../attributes-decorator-1/checks/plugin-tests-trait-commit-src.txt) |
| 5. Fix 1 | Both cases fail on the base source: `[true, true]` and `[1, 2]`. Both pass now. | `plugin-tests-base-src.txt`, `plugin-tests.txt` |
| 7. core | 307/307 pass, type tests included. With the old `trait`, 5 fail. With the old `attributes`, 4 fail. | [`../attributes-decorator-1/checks/core-tests.txt`](../attributes-decorator-1/checks/core-tests.txt), [`checks/core-tests-base-trait.txt`](checks/core-tests-base-trait.txt), [`../attributes-decorator-1/checks/core-tests-old-attributes.txt`](../attributes-decorator-1/checks/core-tests-old-attributes.txt) |
| 8. Runtime baseline | `traits-baseline.browser.test.ts` matches its snapshot in Chromium, Firefox and WebKit. | [`checks/traits-baseline.txt`](checks/traits-baseline.txt) |
| 9. No old form; gates | Outside `.plan/`, `trait(this` and `attributes(this` remain only as misuse cases: the diagnostics tests, a type-error test, and the plugin document's rows. Root `just typecheck` and `just typecheck-declarations` exit 0. The build prints no `trait-member-conflict`. | `git grep -n "trait(this\|attributes(this" -- ':!.plan'` |
| 9. Root `just test` | 2201/2202. The failure is `drag:DRF-48`'s hot-path allocation row. drag is unchanged and imports no trait. Run alone, that row failed twice out of three. | [`checks/root-test.txt`](checks/root-test.txt), [`checks/drag-hot-path-rerun.txt`](checks/drag-hot-path-rerun.txt) |
| 10. Size | Only `list/list-item` (−32 B) and `complete` (−20 B) move. Both are decreases. | [`checks/size-reading.md`](checks/size-reading.md) |

Format and lint ran on every changed file. Lint reports nothing. The changed Markdown has no new links. `git diff --check` is clean.

## Next

The owner answers the JSDoc question. Then the implementer applies the answer in this slot, repeats proof 1, and opens the pull request, which references `RD-26` and closes nothing.
