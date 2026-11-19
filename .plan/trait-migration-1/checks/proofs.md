# RD-26 migration: the proofs before the pull request

The proofs of [the migration plan](../../trait-decorators-1/trait-migration-plan.md#the-proofs-before-the-pull-request), read on `repo/traits-migration-1` in slot f. They first ran on `0ab734f61` plus the two formatting repairs that `2bf0418ab` carries. Proofs 3 and 7 and the core and material-x tests were run again at `15d50a10e`, after the trimmed-trait type fix. The baseline is commit 1, `42e94d48c`, measured on the old path.

## 1. The runtime baseline is identical: holds, in Chromium, Firefox and WebKit

`packages/material-x/tests/traits-baseline.browser.test.ts` records each element's runtime shape, and the migrated tree matches the snapshot that the old path writes.

**The snapshot doesn't depend on the engine.** The first version recorded each own-property listing in the engine's order, and PR #76's first CI run, 44558959512, failed on it in Firefox and WebKit, the only failure in either job:

- Firefox lists a class constructor's `prototype` before `length` and `name`;
- WebKit places a key that one class body defines twice at its last definition, and Chromium at its first: TextField's `value`, which `Valuable` supplies and `TextFieldCore` overrides.

The test now sorts a constructor's statics and each prototype level's keys by name. The traits' order stays in `observedAttributes`, which isn't sorted. No other value in the snapshot depends on the engine: it records no error message.

**How the snapshot was made, and read:**

1. On the commit 1 tree, `42e94d48c`, the old path, with only the test file replaced by the sorted one: the snapshot was written in Chromium, then matched in Firefox and WebKit, 2 of 2.
2. On the migrated tree, the same test wrote a snapshot in Chromium that is byte-identical to step 1's.
3. With step 1's snapshot in place, the migrated tree matched it in Chromium, Firefox and WebKit, 3 of 3.

The snapshot's sha256 is `a043937b25367f3048daa5f7371cc7906e22fc0d4ecc61b0701a8d2a25e008ec`.

The first reading, before the sort, held in Chromium against commit 1's snapshot.

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

## 3. The declaration surface: holds, with the two expected differences

`baseline/surface.ts` read the built `.d.ts` at commit 7 into [`surface.json`](surface.json), and [`baseline/surface-compare.ts`](../baseline/surface-compare.ts) compared it with commit 1's after the normalisation: brand members and `#private` removed, each trait's `type X = Interface<typeof X>` paired with its class `X`, and the renamed modules listed. The full output is [`surface-compare.txt`](surface-compare.txt).

**The named renames, 15:** the 11 trait aliases that became classes, with every instance member equal, and `traits/primitives` and `traits/attributes` replaced by `traits/composition` and `traits/attribute-traits`.

**Remaining differences, 19, in two kinds:**

1. **`static [$bound]` on each of the 11 trait classes.** The type-only key of `Bound<I, S>` reaches each trait class's static side, because a trait extends its bound. It has no runtime value.
2. **`focus` on the eight FocusForwarding adopters' default classes** (`button`, `icon-button`, `link-button`, `switch-button`, `switch-icon-button`, `fab`, `list-button-item`, `list-link-item`): `((options?: FocusOptions) => void) & ((options?: FocusOptions) => void)`. The old trait type contributed no member, so `focus` was only `HTMLElement`'s, which the reading leaves out. The trait class now declares its `override focus`, with the same signature.

IconButton's and SwitchIconButton's `color` is unchanged, `"outlined" | "elevated" | "tonal" | null`, through `IconButtonLike`'s `declare color`.

**The plan lists both kinds as expected differences** since `f8eef5262`, from P44. At `15d50a10e`, after a trimmed trait also loses the base's keys, the reading is byte-identical to the one above, with the same 19 differences. That change touches no member the reading records: a trimmed trait's base keys come from the base.

## 4. Size: 11 rows outside the bound, all smaller

[`size.md`](size.md) compares every row with commit 1's [`baseline/size.json`](../baseline/size.json). Eleven rows are outside 1% or 10 B, and each is a decrease, from 106 B to 271 B. The table gives the cause: at commit 1 those entries kept core's runtime trait factory, through an exported trait object or `repo:RF-63`'s dead spread of a shared list. That goes to the owner, as the plan says for any larger change.

**Property 8's size, which no row sees.** size-limit's preset bundles the built output without the plugin, so its rows never delete a trait's members. Property 8's reading is an application build through the plugin, read at `ea5fefe46` with [`property8-size.ts`](property8-size.ts), as the repair verification's V-W2 reads it:

| `connected-button-group`, application build, minified |  Bytes | Brotli |
| ----------------------------------------------------- | -----: | -----: |
| without the plugin                                    | 13,252 |  3,866 |
| with the plugin                                       | 12,936 |  3,819 |

The output is [`property8-size.txt`](property8-size.txt), and it equals V-W2's.

## 5. The flattened JavaScript: [`flattened.diff`](flattened.diff)

`git diff --no-index` of commit 1's built tree against commit 7's, for each of material-x's 18 runtime entries and each of core's trait modules. The differences are the expected ones:

- the brand install `Object.defineProperties(this.prototype, …)` becomes `impl(this, …)`;
- each trait module's `trait()` becomes a static `[Symbol.hasInstance]` method, and its brand and statics are hoisted exports;
- `observedAttributes` loses its `new Set` and spreads each trait's hoisted list;
- a getter's key is an identifier instead of a string, `get color()` for `get "color"()`, because the members are copied from the trait's own lowered text.

The copy of commit 1's built tree under `baseline/build/` is removed in this commit, as the plan says.

## 6. No flattener warning: holds

`just build` at the root built core, tproc and material-x and their prerequisites. Its log has no `trait-member-conflict`, and no other warning from the flattener.

## 7. The repository's checks: holds

Rerun at `15d50a10e`:

| Check | Result |
| --- | --- |
| `just build` | passed; no `trait-member-conflict` |
| `just typecheck` | passed |
| `just typecheck-declarations` | passed: it builds every package that writes declarations, then type-checks them as a consumer |
| `just lint` | passed |
| `just fmt-check` | passed. The P14 probe, which oxfmt can't parse, is kept out of oxfmt since `f8eef5262`. Two findings of this work were repaired at the first run: core's `files.json` is formatted, and the material-x baseline snapshot's directory joins `.oxfmtrc.json`'s ignored instrument outputs, because the test writes it and compares it as text. |
| core's tests | 26 files, 297 tests, all passed, with the two P44 cases (§3 and §4) in `composition.declaration.test.ts` |
| material-x's tests | 20 files, 427 tests, all passed |

**The P44 cases fail without the fix.** With `composition.ts` at `2bf0418ab`, both new cases fail and the other 45 declaration tests pass. With the fix, all 47 pass.

## RF-63: the eight adopters' entries, with rolldown and esbuild

[`rf63-adopters.ts`](rf63-adopters.ts) bundles each adopter's built entry, minified, with rolldown 1.3.2 and esbuild 0.28.1. The output is [`rf63-adopters.txt`](rf63-adopters.txt).

- **No bundle keeps a trait class,** with either bundler: each entry's bundle has no `[Symbol.hasInstance]` method. esbuild drops them as rolldown does.
- **FocusForwarding's class isn't in material-x's built output at all.** No component references it, and its module isn't an entry, so the library build drops it. Its brand and its private map are still exported.
- **With `instanceof Disableable` added,** each bundle keeps that one trait class, and Chromium reads `[adopter, div, null]` as `[true, false, false]` in all 16 bundles.

## Decisions this record makes

- The baseline test applies every converter sample to every observed attribute that has an accessor: a superset of the per-converter samples in the plan.
- The built-JavaScript copy under `baseline/build/` holds every `.js` file except the `.css.js` and `.tpl.html.js` modules, which the migration doesn't touch.

## The repairs from PR #76's feature proof

Architect B ruled the five findings of Mx Reviewer's feature proof in the plan's [Rulings on PR #76's feature proof](../../trait-decorators-1/trait-migration-plan.md#rulings-on-pr-76s-feature-proof). Commit `973caed7b` repairs them:

- **reviewer-1:** the adapter also admits a module whose text contains `Symbol.hasInstance`, so an application build deletes a built trait module's instance members. A built trait class is recognized only by the exact generated method.
- **reviewer-2:** the base's declared kind of a static is its first contributor, read from the nearest `static key` in its class chain.
- **reviewer-3:** `composition-shape` counts only value references.
- **reviewer-4:** a new test file, `vite.node.test.ts`, drives Vite's own `build()` and `createServer()`.
- **reviewer-5:** the header of `trait-module.ts`.

**One reading the ruling didn't state.** A Vite library build emits the hoisted brand's `const` as `var`: `var $linked = Symbol("Linked")`. The ruling's fixture is such a build. So a brand is an exported module-scope variable initialized with `Symbol(<string literal>)`: a `const`, or a `var` or `let` that nothing in the module assigns again. tsdown's builds, core's among them, keep `const`.

### Each new test fails without its repair

Each mutation was applied to the repaired source, its tests run, and the source restored.

| Mutation | Finding | Fails |
| --- | --- | --- |
| M1: the pre-filter without `Symbol.hasInstance` | reviewer-1 | (a) _"should delete a built trait's members in an application build"_; 1 of 5 |
| M2: the filter open, recognition back to any computed read of the parameter | reviewer-1, reviewer-4 (d) | (d) _"should leave a look-alike class's members in an application build"_; 1 of 5 |
| M3: deletion in every build but the dev server, the review's M5 | reviewer-4 (b) | (b) the library build, and (c), because the fixture's own library build then deletes too; 2 of 5 |
| M4: deletion in every build but a library build | reviewer-4 (c) | (c) the dev server; 1 of 5 |
| M5: the base's kinds not read | reviewer-2 | the four error rows of _"the base's declared static kind"_; 4 of 38 |

With the source restored, all 87 plugin tests pass. The `composition-shape` rows for a property key and a type position failed before the repair, at `0c5705d87`, as W3 shows in the review's witnesses.

### The reruns at `973caed7b`

| Check | Result |
| --- | --- |
| `just build` | passed; no `trait-member-conflict` |
| `just typecheck`, `typecheck-declarations`, `lint`, `fmt-check` | passed |
| the plugin's tests | 8 files, 87 tests, all passed |
| core's tests | 26 files, 297 tests, all passed |
| material-x's tests, proof 1 among them in Chromium | 20 files, 427 tests, all passed |
| proof 5, `flattened.diff` | regenerated against commit 1's built tree from `42e94d48c`: byte-identical. Every built tree in it is a library build, which keeps every member |
| the size rows | every row of core and material-x byte-identical to [`size.json`](size.json). size-limit's preset bundles the built output without the plugin, so no row is an application build through it |

## The repairs from the repair verification

Architect B ruled Mx Reviewer's repair verification in the plan's [Rulings on the repair verification](../../trait-decorators-1/trait-migration-plan.md#rulings-on-the-repair-verification).

- **verifier-1:** `countValueReferences` fails closed. Every node is walked, TypeScript or not. An identifier doesn't count only when it is reached through a type position (a `TYPE_FIELDS` field, a type node, any `TS…Type` or `TS…Keyword`), a type-only or `declare` declaration, or a non-computed property key or member name.
- **verifier-2:** a brand is written again by any target: an assignment or update target, every name in a destructuring pattern with its defaults and rest, a `for…in` or `for…of` left side that isn't a declaration, or a second module-scope declaration.
- **verifier-3:** deferred by the ruling. The plugin document states the limit: import a trait or a base from the module that declares it.
- **Proof 4's gap:** the reading is recorded under proof 4.

**Each new test fails without its repair.** Each source file was put back to its `ea5fefe46` state, which is `973caed7b`'s, alone. The new tests were run, and the file restored.

| Reverted | Fails |
| --- | --- |
| N1: `annotation.ts`, the count that skips every TypeScript node | the value reference in a namespace body, in an enum initializer and in a parameter property's default (V5, V6, V7); 3 of 42 |
| N2: `trait-module.ts`, the write check that reads only an identifier on the left of `=` and an update's argument | a brand that a destructuring (R4), a `for…of` (R5), or a second declaration assigns again; 3 of 13 |

W3's rows and V1 to V4 keep their results. A `declare namespace` that names the composition only as a type flattens. With both files restored, all 95 plugin tests pass. **Proof 7, rerun at `7b04eb862`:** `just build` (no `trait-member-conflict`), `typecheck`, `typecheck-declarations`, `lint` and `fmt-check` pass.