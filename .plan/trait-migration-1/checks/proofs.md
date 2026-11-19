# RD-26 migration: the proofs before the pull request

The proofs of [the migration plan](../../trait-decorators-1/trait-migration-plan.md#the-proofs-before-the-pull-request), read on `repo/traits-migration-1` in slot f. They ran on the tree that is the parent of the commit adding this file, `0ab734f61` plus the two formatting repairs that commit carries. The baseline is commit 1, `42e94d48c`, measured on the old path.

## 1. The runtime baseline is identical: holds

`packages/material-x/tests/traits-baseline.browser.test.ts` passes against commit 1's `tests/__snapshots__/traits-baseline.json`, which is unchanged. It runs in `just test` (below) and was also run alone: 1 passed, no snapshot written. The test file itself is unchanged since commit 1: the trait names are the same and their import lines still resolve.

## 2. Behaviour is unchanged: holds, with one measurement failure that passed when run alone

| Run | Commit 1 | Commit 7 |
| --- | --- | --- |
| Root `just test` | 143 files, 2,165 tests, all passed | 142 files, 2,117 tests: 2,116 passed, 1 failed |
| material-x `just test-spec` | 7 files, 204 tests, all passed | 7 files, 204 tests, all passed |

**The failure** is `drag:DRI-17 hot path > should allocate per sample only the CSS string a lifted write needs`, in `packages/drag/tests/hot-path.browser.test.ts`: _"expected 23.69 to be less than 16"_, a per-move allocation figure. Drag doesn't use traits, and no file in its build changed. Run alone at the same tree, the file passed, 9 of 9. The full run shared the machine with nothing else from this session, so the cause isn't established here; it is recorded, not explained.

**The counts differ because the plan replaces these test files** (commits 2 to 4):

- removed: core's `primitives.browser`, `primitives.declaration`, `traits.browser` and `traits.declaration`, and the plugin's seven old node test files;
- added: core's `composition.browser`, `composition.declaration`, `attribute-traits.browser` and `attribute-traits.declaration`, and the plugin's six new node test files besides the rewritten `flatten.node`.

**Test files changed beyond imports:**

- `core/tests/traits/selectable.browser.test.ts`, `reorderable.browser.test.ts` and `tests/controllers/useRovingTabindex.browser.test.ts`: each `impl(…)` value became a `Composed` constant and one class that extends it, because a composition is now extended by exactly one class. The tests' cases are unchanged.
- `core/tests/traits/overrides.declaration.test.ts`: rewritten, as the plan says. Its case _"should keep the trait brand nominal"_ is gone, because an attribute trait carries no brand in the types any more; a field over an attribute member, TS2610, replaces it.
- `material-x/tests/core/traits/focus-forwarding.browser.test.ts`: one assertion read `FocusForwarding.brand`, which no longer exists. It now finds the brand among the prototype's own symbols by its description.

## 3. The declaration surface: differences go to the architect

`baseline/surface.ts` read the built `.d.ts` at commit 7 into [`surface.json`](surface.json), and [`baseline/surface-compare.ts`](../baseline/surface-compare.ts) compared it with commit 1's after the normalisation: brand members and `#private` removed, each trait's `type X = Interface<typeof X>` paired with its class `X`, and the renamed modules listed. The full output is [`surface-compare.txt`](surface-compare.txt).

**The named renames, 15:** the 11 trait aliases that became classes, with every instance member equal, and `traits/primitives` and `traits/attributes` replaced by `traits/composition` and `traits/attribute-traits`.

**Remaining differences, 19, in two kinds:**

1. **`static [$bound]` on each of the 11 trait classes.** The type-only key of `Bound<I, S>` reaches each trait class's static side, because a trait extends its bound. It has no runtime value.
2. **`focus` on the eight FocusForwarding adopters' default classes** (`button`, `icon-button`, `link-button`, `switch-button`, `switch-icon-button`, `fab`, `list-button-item`, `list-link-item`): `((options?: FocusOptions) => void) & ((options?: FocusOptions) => void)`. The old trait type contributed no member, so `focus` was only `HTMLElement`'s, which the reading leaves out. The trait class now declares its `override focus`, with the same signature.

IconButton's and SwitchIconButton's `color` is unchanged, `"outlined" | "elevated" | "tonal" | null`, through `IconButtonLike`'s `declare color`.

## 4. Size: 11 rows outside the bound, all smaller

[`size.md`](size.md) compares every row with commit 1's [`baseline/size.json`](../baseline/size.json). Eleven rows are outside 1% or 10 B, and each is a decrease, from 106 B to 271 B. The table gives the cause: at commit 1 those entries kept core's runtime trait factory, through an exported trait object or `repo:RF-63`'s dead spread of a shared list. That goes to the owner, as the plan says for any larger change.

## 5. The flattened JavaScript: [`flattened.diff`](flattened.diff)

`git diff --no-index` of commit 1's built tree against commit 7's, for each of material-x's 18 runtime entries and each of core's trait modules. The differences are the expected ones:

- the brand install `Object.defineProperties(this.prototype, …)` becomes `impl(this, …)`;
- each trait module's `trait()` becomes a static `[Symbol.hasInstance]` method, and its brand and statics are hoisted exports;
- `observedAttributes` loses its `new Set` and spreads each trait's hoisted list;
- a getter's key is an identifier instead of a string, `get color()` for `get "color"()`, because the members are copied from the trait's own lowered text.

The copy of commit 1's built tree under `baseline/build/` is removed in this commit, as the plan says.

## 6. No flattener warning: holds

`just build` at the root built core, tproc and material-x and their prerequisites. Its log has no `trait-member-conflict`, and no other warning from the flattener.

## 7. The repository's checks

| Check | Result |
| --- | --- |
| `just build` | passed |
| `just typecheck` | passed |
| `just typecheck-declarations` | passed: it builds every package that writes declarations, then type-checks them as a consumer |
| `just lint` | passed |
| `just fmt-check` | fails on one file outside this work: `.plan/trait-decorators-1/probes/types/p14-read-only.ts`, which oxfmt can't parse (TS1243, `readonly accessor`), present since `dc5bc5853`. The two findings that this work made, core's `files.json` and the material-x baseline snapshot, are repaired here: `files.json` is formatted, and the snapshot directory joins `.oxfmtrc.json`'s ignored instrument outputs, because the test writes it and compares it as text. |

## RF-63: the eight adopters' entries, with rolldown and esbuild

[`rf63-adopters.ts`](rf63-adopters.ts) bundles each adopter's built entry, minified, with rolldown 1.3.2 and esbuild 0.28.1. The output is [`rf63-adopters.txt`](rf63-adopters.txt).

- **No bundle keeps a trait class,** with either bundler: each entry's bundle has no `[Symbol.hasInstance]` method. esbuild drops them as rolldown does.
- **FocusForwarding's class isn't in material-x's built output at all.** No component references it, and its module isn't an entry, so the library build drops it. Its brand and its private map are still exported.
- **With `instanceof Disableable` added,** each bundle keeps that one trait class, and Chromium reads `[adopter, div, null]` as `[true, false, false]` in all 16 bundles.

## Decisions this record makes

- The baseline test applies every converter sample to every observed attribute that has an accessor: a superset of the per-converter samples in the plan.
- The built-JavaScript copy under `baseline/build/` holds every `.js` file except the `.css.js` and `.tpl.html.js` modules, which the migration doesn't touch.