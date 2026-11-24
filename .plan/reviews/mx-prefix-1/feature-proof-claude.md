# The `--mx-` prefix of published private names (RF-123, #218) — feature proof

**Files were read at:** `0b1fab838`, the head of #219 (`material-x/mx-prefix-1`), in slot `g`. The base is `origin/main` at `3aef04f7e`. The "before" build used this tree with `collect-props.ts` as at `3aef04f7e`; the file was restored and the package rebuilt. Browsers: Playwright's Chromium, Firefox and WebKit.

**Subject:** `repo:RF-123` in [`00-index.md`](../../00-index.md) with the implementer's dated paragraph, the [diagnosis](../../private-props-1/private-props.md#published-names), the implementer's [probes and readings](../../mx-prefix-1/), and the diff `3aef04f7e...0b1fab838`: one line of [`collect-props.ts`](../../../.scripts/css/collect-props.ts).

**Verdict: the required property holds. Every published private name has the prefix, nothing reads a name without it, and the built elements render as before in the three engines. No defect in the change. One sentence of the record is inaccurate (`reviewer-1`, tier C).**

## Scope

**Covered** ([`built.txt`](checks/built.txt)):

- **Every name has the prefix.** The two maps hold the same 228 keys in the same order, and each new value is `--mx-` and the old value's letters. Outside the source maps, no built file, with comments included, holds a `--_x` name or a `--` name of one or two letters. That covers the 100 JavaScript files, the 30 declaration files and `custom-elements.json`. The last two kinds are byte-identical to before. `CSS.registerProperty` takes `--mx-fn`. The map's one name that no built file holds is `--_notched-outline-padding` (`--mx-gs`).
- **Nothing reads a name without it.** Of the 100 JavaScript files, 60 are identical to before. The other 40 become identical when `--mx-` is replaced by `--`, so each declaration, `var()`, registration and JavaScript read moved together. `collect-props.ts` writes the map and `@ydinjs/vite-custom-element-assets` is its only reader in the toolchain. It throws on a CSS name that isn't in the map, and replaces quoted names in TypeScript. The tests, stories and `.storybook` name no published name.
- **The built elements, three engines** (probe [`render.mjs`](probes/render.mjs)). I bundled every runtime entry from each build and read the computed style of 4,746 boxes (19 tags, 14 attribute sets, shadow elements and pseudo-elements). The only differences are 98 boxes where `transition-property` is `--mx-fn` instead of `--fn`, which is the name itself. A second run of the old build against the first differs nowhere. No page errors.
- **The implementer's probe.** Both readings reproduce exactly, after and before. Its rows discriminate: with the page's old names each effect is there before and absent after, and with the new map's names each is there after, so a lost effect can't come from a broken probe. The implementer's remark on the `--an` row is right: `color` gives the same value in all the readings, and only the added `background-color` row shows the repair. `unprefixed.mjs` fails as it should on the old build: it lists the unprefixed names and reports 228 of the map's values without the prefix.
- **Sizes:** a run of `size-limit` on the built package gives the record's _after_ value for all 20 rows.
- **The claim that suites use source names holds** for the browser and spec projects. `constructCSSTokens({ isProd })` is true only for a build, and Vitest serves. In a Vitest page, `mx-button`'s stylesheets hold 233 occurrences of `--_` names and no `--mx-` name. The node project builds the package first, and none of its three test files names a custom property. `package-entries` reads the built files for their entries and imports. Running the suites locally would not read the change, so I didn't. CI on `0b1fab838` passes in its `chromium`, `firefox` and `webkit` jobs.

**Not covered:** Safari; pointer interaction on the built elements (ripple, a pressed group, a drag), which the JavaScript identity covers; the _before_ sizes, which I took from the record; the Storybook build's names (CI builds it); a third-party theme that uses old letters.

## Findings

### reviewer-1

**Tier C.** A sentence of the record about source maps is inaccurate.

- **The record says:** _"Source maps hold the sources' names, as before."_
- **Observed:** the `sourcesContent` of 35 of the 100 source maps, mostly the compiled stylesheets', holds the published names. Those names now have the prefix, as they had the letters before. Only 5 maps hold source names.
- **Consequence:** none for a consumer. No unprefixed private name comes from a map except the sources' own `--_x`, which the sentence covers.
- **Evidence:** [`built.txt`](checks/built.txt), `source-maps.mjs`.
- **Required property:** the dated paragraph states what the maps hold.

## Next

The owner merges #219 when he accepts it. `reviewer-1` can be settled with the record, and doesn't block.