# An `mx-icon`'s text in no accessible name (RF-137, #292, #259) — feature proof

**Files were read at:** `6083534cfa0e8fe5fa9022d930bd1352cfb92095`, the head of `material-x/icon-name-1`, in slot `e`, equal to `origin`. **Diff reviewed:** `ee0afea12..6083534cf`. Mutations changed the icon's sources and the split button's template for a run and restored them, and `packages/` is unchanged. Playwright's Chromium 158, Firefox 159 and WebKit 27.2, one engine at a time (`RD-62`).

**Contract:** `repo:RF-137` and `repo:RD-59` in [`00-index.md`](../../00-index.md), with the architect's note of 2026-11-25 (`IN-1` to `IN-5`) and its list. Evidence: [`.plan/icon-name-1/`](../../icon-name-1/).

**Verdict: accepted.** No findings. The required property holds in each engine's own tree, WebKit's included, in nine orders of definition and change. The rows hold each part of the mechanism in each engine. The sizes are the implementer's.

## Readings

**Rows.** `tests/icon` and `tests/button/split-button.browser`: Chromium 80 passed, Firefox and WebKit 59 passed and 21 skipped. The skipped rows are the 17 tree rows of the icon and the 4 of the split button, which read Chromium's tree. The four rows of the mechanism run in each engine. CI is green at this head in the three engines, and its Chromium job runs the visual project: no baseline changes, and the diff has none.

**The implementer's witnesses** ([Chromium](checks/slot-witnesses-chromium.txt), [Firefox](checks/slot-witnesses-firefox.txt), [WebKit](checks/slot-witnesses-webkit.txt), his [program](../../icon-name-1/probes/mutate-slot.mjs)). Chromium gives his numbers. Firefox and WebKit fail the same rows as each other, and the same as Chromium's rows that aren't tree rows:

| Mutation                                   | Chromium | Firefox | WebKit |
| ------------------------------------------ | -------: | ------: | -----: |
| `main`'s sources                           |       20 |       3 |      3 |
| In the template only                       |        1 |       1 |      1 |
| In the template, and set to the same value |        1 |       1 |      1 |
| Nothing hidden                             |       21 |       2 |      2 |
| In a microtask                             |        2 |       2 |      2 |
| No `display`                               |        1 |       1 |      1 |
| On the host                                |        4 |       3 |      3 |
| On the host too, in a microtask            |        2 |       1 |      1 |
| None                                       |        0 |       0 |      0 |

**The review's witnesses** ([Chromium](checks/row-mutations-chromium.txt), [Firefox](checks/row-mutations-firefox.txt), [WebKit](checks/row-mutations-webkit.txt), [program](probes/mutate-rows.mjs)), same rows:

| Mutation | Chromium | Firefox | WebKit | Reading |
| --- | --: | --: | --: | --- |
| The value is `false` | 20 | 1 | 1 | Held |
| Set at the connect | 1 | 1 | 1 | Held: the attribute isn't there when the constructor returns |
| `display`: `block`, `inline-block`, `contents`, `none` | 1 each | 1 each | 1 each | Held by the box row |
| The slot in a span of `display: contents`, hidden by the constructor | 1 | 1 | 1 | Held. WebKit exposes the text then (`IN-2`) |
| Set by the reflected `ariaHidden` | 0 | 0 | 0 | The same attribute |
| The split button's icon has `aria-hidden` again | 0 | 0 | 0 | Changes no name in any engine. The template's change is a removal that nothing observes |

**Each engine's own tree** ([probe](probes/trees.ts), on the built elements). One page per case. Its markup is parsed before any definition. The probe turns the engine's accessibility on and reads the tree once, so the nodes of the undefined elements exist, and only then lets the page define and change. The cases: definitions in the head, so the parser constructs each icon before its text; the markup, then everything defined; the button, list and FAB defined 400 ms before the icon, and the reverse (`IN-1`'s order, which failed names in Firefox with the template's attribute); defined, then inserted; then the icons' text replaced; then page text moved into an icon; then every icon moved; then an icon created and given text. The targets are the controls, and headings, a native link and a native button, whose names come from their contents too. Icons whose `display` the page made `flex`, `grid` or `contents`, an SVG with a `<title>` and a label, and a closed extended FAB are among them.

- **Head** ([Chromium](checks/trees-chromium.txt), [Firefox](checks/trees-firefox.txt), [WebKit](checks/trees-webkit.txt)): in all 27 readings, no name and no node has the icon's text. Every name is the label alone: `Title`, `Save`, `Native`, `Link`, `Flex`, `Grid`, `Contents`, `Svg`, `Create`, `Open`, and `""` for the icon button without a label. The named icon gives `Draft Save` (in the case where the icons move out, `Save`). The static list item is `Item` in Firefox and WebKit, and `""` in Chromium, which names no list item from its content.
- **The probe discriminates**, on three mutated builds ([program](probes/mutate-trees.mjs); `trees-<mutation>-<engine>.txt` in [`checks/`](checks/)):

  | Build | Chromium | Firefox | WebKit |
  | --- | --- | --- | --- |
  | `main`'s icon | 9 of 9 cases leak | 9 of 9 | 9 of 9 |
  | No `display` on the slot | clean | clean | **8 of 9 leak**: every name has `edit` |
  | `aria-hidden` in the template only | clean | **6 of 9 leak**: text leaves, and names in the late orders | clean |

  So the slot's box is what WebKit needs, and the constructor is what Firefox needs, each in that engine alone, as `IN-1` and `IN-2` say. With `aria-hidden` in the template, Firefox is clean when the icon is defined before its markup, when it is defined and then inserted, and when the icons move, as the implementer's stop found.

- **WebKit, read by names.** WebKit's Linux port folds text into its parent, so a text node is `ignored` whether its text is exposed or not. WebKit's `hidden` is no evidence either: with no box on the slot, every icon's text node is `hidden` and every name still has `edit`. The WebKit evidence is the names of the controls, the headings, the native link and button, and the list item.

**`names.ts` on the built change** ([Chromium](checks/names-chromium.txt), [Firefox](checks/names-firefox.txt), [WebKit](checks/names-webkit.txt)). The implementer read Chromium and Firefox. Both are his files line for line. **WebKit** was the reviewer's: every name of the contract, in each of the four modes. No name has `edit` or `keyboard_arrow_down`. The split button's trailing button is `""` without `secondarylabel` and `More` with it. `role="img"` with a label is `Draft Save`.

**Sizes** ([reading](checks/sizes.txt)), Brotli, `just size-reading`, one reading each, `main`'s four sources on this branch against the head: `icon/icon` 667 to 707, `checkbox/checkbox` 4290 to 4313, `radio/radio` 3841 to 3866, `button/split-button` 7766 to 7764, `text-field/text-field` 8618 to 8615, `complete` 25924 to 25952. The other 30 rows are the same. None of the six has a limit. These are the implementer's numbers.

**Item 4.** Every `mx-icon-button`, `mx-switch-icon-button` and `mx-fab` in the repository's stories, pages and snippets has an `aria-label`, or is an extended FAB with a label. Read by `git grep` at the head, outside tests and records. The closed extended FAB keeps its label in the button at `opacity: 0`, and is named `Create` in each engine. The three Playground stories' labels match their default icons.

**Documentation.** `icon.ts`' JSDoc and `icon.mdx`' _Accessibility_ say what `RD-59` says. `icon-button.mdx`, `switch-icon-button.mdx` and `fab.mdx` ask for `aria-label` always. No page of the package still asks a page to hide an icon. The two comments are the ones that the list asks for.

## Scope

**Covered:** the above, on the icon's and the split button's rows and the built elements. **Not covered:** the full suites (CI ran them in the three engines at this head), Safari, screen readers, WebKit's AT-SPI text interface (only names were read), Firefox below 159, `IN-4`'s layout cases (the architect's reading), speed, and the declarations' typecheck.

- **Main has moved.** `origin/main` is at `fe6a2abd5`, three commits past the merge base. The merge conflicts in `.plan/00-index.md` alone. Those commits add no icon-only control outside tests: a sortable-list test handle has one, and `sortItem` names it.
- **The gate holds WebKit through the mechanism.** Every WebKit leak that the review made fails a row of the mechanism, and no WebKit row reads WebKit's tree. `IN-5` states why Firefox's tree can't be read from a row. Playwright's WebKit session does expose `DOM.getAccessibilityPropertiesForNode`, which `names.ts` and this probe use. This is not a finding: the contract asks for mechanism rows in each engine.
- **The probe's first WebKit reading** cut each text node's description to 10 characters, so `edit` never matched, and it didn't check names for the tokens. It was fixed, and the probe was run again on the head and on every mutated build. The committed files are the second readings.

**The root `fmt-check` passes.**

## Findings

**Null result:** no finding. Nothing was found against `RD-59`'s three properties, the architect's list, the rows, the witnesses or the sizes. The engines differ only where each engine computes a name differently: Chromium names no list item from its content.