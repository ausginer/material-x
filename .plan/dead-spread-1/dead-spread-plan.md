# Dead spread trait lists — plan

**Status: proposed.** Written by the architect on 2026-11-19, on the coordinator's task, on `repo/dead-spread-1` at `359c87f8a` (`origin/main`, with #72). It plans `repo:RF-63`. **No identifier is minted and no record is edited:** the main slot's architect owns `RF-63`'s entry and the index, and [Proposed record changes](#proposed-record-changes) lists what this plan asks of them.

Canonical entry: `RF-63` — a shared trait list built with a spread keeps a flattened method trait's dead class layer in an esbuild bundle, and other bundlers weren't measured. Its required property: in each bundler the record names, no adopter's bundle carries a trait list or a trait layer that flattening has made dead, or the record states which bundler keeps them, by how many bytes, and why that is accepted. The bundler set is rolldown and esbuild.

## What each bundler keeps

The architect built material-x through nx at `359c87f8a`. Each of the 18 runtime entries was bundled with rolldown 1.3.2, using `size-limit-preset-rolldown`'s options, and with esbuild 0.28.1, using W1's options. The same was then done for a scratch variant in which the five spread-built lists are written out in full ([reading](checks/rf63-reading.txt)). The difference between the two is the dead code.

**Both bundlers keep the dead lists.** The owner's hypothesis, that a tree-shaking bundler removes them, doesn't hold for rolldown either.

| entry | rolldown, minified | rolldown, Brotli | esbuild, minified | esbuild, Brotli |
| --- | --: | --: | --: | --: |
| `button/icon-button` | −988 | −284 | −949 | −276 |
| `button/switch-button` | −787 | −235 | −853 | −250 |
| `button/switch-icon-button` | −942 | −313 | −866 | −278 |
| `text-field/text-field` | −968 | −295 | −909 | −321 |
| `button/split-button` | −154 | −74 | −130 | −81 |
| `button-group/button-group` | −44 | −17 | −34 | −13 |
| `button-group/connected-button-group` | −42 | −12 | −28 | −6 |
| `list/list-button-item` | −20 | +12 | −18 | −8 |
| `list/list-link-item` | −20 | −58 | −18 | −18 |
| `complete` | −160 | −114 | −141 | −56 |

The other entries don't change, apart from minifier names in two esbuild bundles.

- **What the code is.** The dead lists are `SWITCH_CORE_TRAITS`, `ICON_BUTTON_CORE_TRAITS`, `SWITCH_ICON_BUTTON_CORE_TRAITS`, `BUTTON_GROUP_CORE_TRAITS` and `LIST_INTERACTIVE_ITEM_CORE_TRAITS`, and the base lists they spread. Each list keeps every trait it names. In `icon-button`, `switch-button`, `switch-icon-button` and `text-field`, that is the `trait(…)` calls of `ButtonLike`, `Disableable`, `Checkable`, `Valuable`, `IconButtonLike` and `FocusForwarding`, with `FocusForwarding`'s class layer. It is also core's descriptor trait function and generic trait runtime, which nothing else in those entries reaches. The flattened classes reach none of it.
  - `text-field` is affected because `text-field.ts` imports the icon button.
  - In `split-button` and the button groups, only the lists are dead. The trait runtime is live there: `split-button` exports `SplitButtonLike`, and `button-group/utils.ts:14` reads `instanceof ButtonLike`.
  - `checkbox` and `fab` keep the runtime for their exported traits, which is live.
- **W1 undercounted.** W1's 64 or 65 bytes were only what the item 3 unit added. The dead lists already held the trait runtime, so the whole dead code is 787 to 988 minified bytes, or 235 to 321 Brotli, in each of the four entries.
- **Why it survives** ([mechanism](checks/rf63-mechanism.txt)). A spread calls the array's iterator, and a bundler has to keep a call it can't prove harmless.
  - **esbuild** kept every array spread in the minimal graphs, even a spread of a local literal.
  - **rolldown** removed a dead spread of an array declared in the same module, and of an imported array whose module otherwise drops out of the bundle. It kept the spread, and the array with it, when the array is imported from a module that stays in the bundle. Each of material-x's lists spreads a base list from such a module: `ButtonCore.ts`, `SwitchCore.ts` or `ListItemCore.ts`, which the entry needs for their `use…` functions. So rolldown keeps them all.
  - **The published modules already carry it.** material-x's own library build is tsdown, which is rolldown, unbundled. It exports the lists between modules, so it keeps the spreads, and once nothing reads a list it emits the spread as a bare statement, for example `[...BUTTON_CORE_TRAITS];` in `button/IconButtonCore.js`. So every consumer's bundler starts from those statements, and so does a browser that loads the modules without bundling.
- **An array literal of identifiers is removed** by both bundlers when nothing reads it. In the variant, no trait list survives in either bundler, and the trait runtime is gone from the four entries.

## The repair

These properties hold after the repair. The implementer chooses the code.

1. **Each module-level trait list in material-x is an array literal of its traits, with no spread.** That is the five lists above, in `SwitchCore.ts`, `IconButtonCore.ts`, `ButtonGroupCore.ts` and `ListInteractiveItemCore.ts`. A list that extends another keeps its tuple annotation that names the base, `readonly [...typeof BUTTON_CORE_TRAITS, …]`. That annotation is what keeps the copies in step: in the variant, adding a trait to `BUTTON_CORE_TRAITS` alone failed the typecheck in all four lists that copy it.
2. **Lint rejects a spread in a trait list.** One `no-restricted-syntax` entry in the root `eslint.config.ts` rejects a spread element in the array that initializes a declaration named `*_TRAITS`. Its message gives the reason, and a comment beside it says why the rule exists, as the file's other entries do. In the reading, the rule reported `origin/main`'s `SwitchCore.ts` and not the literal lists.
3. **The flattener document states the limit.** [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md)'s sentence on trait lists says that the plugin expands spreads. It gains this: a module-level list built with a spread stays in a bundle after flattening has made it dead, in rolldown and in esbuild, so a list that should disappear is written in full. The plugin's behaviour doesn't change.
4. **Nothing else changes.** In the variant's library build, every entry module is byte-identical to `359c87f8a`'s. Only the internal modules lose dead code and the exports that nothing imports any more: `ButtonCore`, `SwitchCore`, `IconButtonCore`, `ButtonGroupCore`, `ListItemCore`, `ListInteractiveItemCore` and `focus-forwarding`. None of them is in `package.json`'s `exports`.

**Size: small.** Five list literals and their imports in four files, one lint entry, and one sentence in a document. The suites don't change, because the entry modules are byte-identical.

### Not adopted

- **Accepting the bytes,** the required property's other branch. It would keep up to 988 minified bytes in four entries, to save a five-line change.
- **A bundler option in the size preset.** The size reading would then measure something no consumer ships. The published modules carry the statements, so every other bundler would still keep them.
- **Making the flattener rewrite or drop the lists.** A list is exported between modules, so the plugin, transforming one module, can't know that a list is dead. Spreads are valid input for the plugin, and the defect is in what bundlers keep, not in the plugin.
- **Shared lists as types only, with each host writing its own list inline.** That has the same duplication in more places: `switch-button` and `switch-icon-button` would each spell out the switch's traits.
- **`BUTTON_CORE_ATTRS`.** `ButtonCore.ts:83` builds `{ ...BUTTON_ATTRS, ...DISABLEABLE_ATTRS }` for `useButtonCore`. The button groups import `ButtonCore.ts` without calling `useButtonCore`, and rolldown keeps the object spread there: 14 minified bytes in each of the two button-group bundles. It's the same mechanism, but it isn't a trait list, so `RF-63`'s required property doesn't cover it. The record notes it, and it isn't repaired here.

## How a reviewer proves it

1. **The bundles.** At the repair's commit, rerun the reading's probe in both bundlers, and save its table beside this plan's. Three things hold:
   - No bundle has a bare spread statement, other than the two `BUTTON_CORE_ATTRS` statements in rolldown.
   - The trait runtime's error string is gone from `icon-button`, `switch-button`, `switch-icon-button` and `text-field`.
   - Each entry's bytes against `359c87f8a` match the variant's column. Explain any difference.
2. **The library build.** Diff the built package against the build at the repair's parent. Every entry module is byte-identical, and only the internal modules of property 4 change, by the removed statements.
3. **The type ties the copies.** On a scratch copy, add a trait to `BUTTON_CORE_TRAITS` alone. `aube exec just typecheck` in `packages/material-x` fails in each list that copies it. Restore it afterwards.
4. **The lint rule fires.** On a scratch copy, restore one spread list. `aube exec just lint` in `packages/material-x` fails with the rule's message. Restore it afterwards.
5. **CI.** The pull request's `verify` passes. Its size report, compared with main's stored reading (`RF-65`), shows the drop in the rows above.

Save 1 to 4 in this record's `checks/`.

## What the closure needs

`RF-63` closes when:

- the repair is merged to `main`;
- witnesses 1 to 4 are saved and a feature proof has read them;
- the pull request's `verify` passed (witness 5);
- the record states the reading, why the lists survive, and the rule that replaces them.

## Proposed record changes

For the main slot's architect. This plan doesn't edit them.

- **`RF-63`'s title.** _"…and other bundlers aren't measured"_ no longer holds. A suggested title: _"A shared trait list built with a spread keeps dead trait code in rolldown and esbuild bundles of material-x"_.
- **`RF-63`, _What was measured_.** Add the reading at `359c87f8a`:
  - rolldown 1.3.2 and esbuild 0.28.1 both keep the dead lists;
  - the cost is 787 to 988 minified bytes in `icon-button`, `switch-button`, `switch-icon-button` and `text-field`, and less in five more entries;
  - W1's 64 or 65 bytes were only what the item 3 unit added; the dead code was already there, in `text-field` too.
- **`RF-63`, _The owner's hypothesis_.** Tested and refuted for both bundlers, with the [mechanism](checks/rf63-mechanism.txt). The library build already emits the dead lists as bare spread statements.
- **`RF-63`, the direction.** Link this plan: properties 1 to 4, the witnesses and the closure. Tier C stays, because only shipped bytes change.
- **A note, no new entry:** `BUTTON_CORE_ATTRS`'s object spread, 14 bytes in rolldown's two button-group bundles, is outside `RF-63`'s required property.
- **`RD-24`:** nothing to amend. The size rows have no limits yet, and their readings drop.