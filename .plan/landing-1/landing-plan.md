# Landing page — component gap analysis and plan

**Status: decided as `repo:RD-47`, `RD-48` and `RD-49`, with no question open.** Written by the architect on 2026-11-22, on the coordinator's task for #54, on `repo/landing-1` from `origin/main` at `23b245efb`. The owner answered Q1 to Q5, then Q5b and Q6, the same day, in chat, relayed by the coordinator, and asked for a theme picker. In the [index](../00-index.md), `RD-47` records the components, the hosting and the order, `RD-48` the theme and the switch, and `RD-49` the picker. The [answers below](#the-owners-answers) say what each one changed here. This plan builds nothing: the components and the page are later units.

**The owner's goal:** a landing page for `@ydinjs` built from material-x components, with no separate documentation program. Storybook isn't that page: it is slow to use (#169's trace puts the time in `sb-manager`), and it presents stories, not the project. **The owner starts on the page only once the components it needs exist.** Until then the project stays with Storybook, and this plan's component list is also the list of further work.

## The answer in short

- **The first set is three components: Card, Top app bar and Slider.** Card carries the package section and frames the demos. The top app bar is the sticky header, which the owner requires. Slider drives box-quad's demo, whose controls are continuous ranges today.
- **Two foundations are missing, and neither is a component:** a switchable colour theme and the type scale for page text. The owner takes the theme from Material Theme Builder. **The builder's exports contain colours only** ([below](#what-material-theme-builder-exports)), so the page still needs the type scale from tproc's tokens and its fonts.
- **Everything else on the list waits or isn't a material-x component.** A one-page site needs no navigation bar, rail, drawer, tabs, menu, dialog or snackbar. The code block isn't an M3 component, and the page draws it itself.
- **The existing components cover the rest:** the header's actions, the hero's actions, the theme switch, the demo controls other than ranges, and the material-x showcase.

## The owner's answers

Given on 2026-11-22, in chat, relayed by the coordinator and quoted in translation. `RD-47` records them.

| Question | Answer | What changed in this plan |
| --- | --- | --- |
| [Q1](#q1--where-on-the-site-does-the-page-live) | (a) | Nothing: the page is the site's root, and Storybook moves to `storybook/` |
| [Q2](#q2--what-is-the-page-built-with) | (a) | Nothing: `packages/site`, plain HTML and TypeScript, built by Vite |
| [Q3](#q3--does-the-page-wait-for-the-slider) | None of the options | The components come first, each with its stories, and the site unit starts after them. Until then Storybook stays. The site no longer ships in stages ([Order](#order)) |
| [Q4](#q4--which-packages-does-the-page-present-and-which-get-an-install-command) | (a) | Nothing |
| [Q5](#q5--theme-and-type-scale-page-local-or-public) | The theme comes from Material Theme Builder | The builder's exports were read, and the type scale is asked again as [Q5b](#q5b--where-does-the-page-take-its-type-scale-from), with what the builder's export form changes as [Q6](#q6--which-builder-export-and-where-does-it-go) |
| New | A sticky header is required | Top app bar moves from _after v1_ into the first set ([Top app bar](#top-app-bar-the-first-sets-third-component)) |
| [Q5b](#q5b--where-does-the-page-take-its-type-scale-from) | (a) | The type scale is generated for the page from tproc's `md.sys.typescale` tokens (`RD-48`) |
| [Q6](#q6--which-builder-export-and-where-does-it-go) | (a) | The JSON export is kept in `packages/site`, and the page's CSS is generated from it. tproc's default theme doesn't change, so the conditional theme-swap unit is gone (`RD-48`) |
| [Q2](#q2--what-is-the-page-built-with), again on 2026-11-24 | HTML, TypeScript and signals | The page may use `@preact/signals-core`, and the reason for (a) changed ([Record changes](#record-changes), `RD-47`) |
| New | _"The theme switch must stay, and (possibly as a separate improvement) a color picker for changing the theme, as in material-web"_ | The switch's properties are in `RD-48`, and the site unit carries them. The picker is a unit after the site ([Theme picker](#theme-picker-a-unit-after-the-site), `RD-49`) |

## What exists

Read in `packages/material-x/src` at `23b245efb`. 19 elements in 8 directories:

| Directory | Elements |
| --- | --- |
| `button` | `mx-button`, `mx-link-button`, `mx-icon-button`, `mx-switch-button`, `mx-switch-icon-button`, `mx-split-button` |
| `button-group` | `mx-button-group`, `mx-connected-button-group` |
| `checkbox`, `radio` | `mx-checkbox`, `mx-radio` |
| `fab` | `mx-fab` (also extended) |
| `icon` | `mx-icon` (Material Symbols font; the slot takes any content) |
| `list` | `mx-list`, `mx-list-item`, `mx-list-button-item`, `mx-list-link-item`, `mx-sortable-list` (on `@ydinjs/drag`) |
| `text-field` | `mx-text-field`, `mx-multiline-text-field` |

**What isn't there:**

- **No theme stylesheet.** Components read `var(--md-sys-color-*, <light value>)`, so a page without a theme renders the light scheme. The fallback values come from `packages/tproc/src/default-theme.json`, which is itself a Material Theme Builder JSON export (_"Material Theme Builder export 2025-07-14 06:24:23"_). Storybook's dark scheme comes from `.scripts/storybook-theme.ts`, which writes `.storybook/theme.css` from that file and switches on `html[data-theme="dark"]`, with no `prefers-color-scheme` rule.
- **No type scale for page text.** Components set their own fonts from their tokens. A headline or a paragraph outside a component has no `md.sys.typescale` style to use. tproc's store has the `md.sys.typescale` sets.
- **No icon button with `href`.** `mx-link-button` has `href` and `target`, and `mx-icon-button` doesn't.
- **tproc's token store holds only the existing components' tables.** Its 102 sets are buttons, button groups, checkbox, FABs, icon buttons, lists, radio, text fields, split buttons and the system sets. A new component first adds its tables: a row in `packages/tproc/tokens/manifest.json` and an update through `scripts/update-tokens.ts`, in a pull request that carries the update's report (the `use-tokens-db` skill).

**What is published.** Only `@ydinjs/box-quad` (1.0.0) is on npm. `@ydinjs/core`, `@ydinjs/material-x` and `@ydinjs/vite-traits-plugin` are public in their manifests and unpublished. `@ydinjs/drag` and `@ydinjs/tproc` are private.

## What Material Theme Builder exports

**Read, not inferred.** The architect read the builder's deployed bundle on 2026-11-22 ([excerpt](checks/mtb-export.txt)). No browser was available to run an export, so the reading is the code that writes the files.

- **Web (CSS)** is an archive of six files: `css/light.css`, `css/light-mc.css`, `css/light-hc.css`, `css/dark.css`, `css/dark-mc.css` and `css/dark-hc.css`. Each file is one rule whose selector is a class named after its scheme (`.light`, `.dark`, `.light-medium-contrast`, …). It sets the 49 `--md-sys-color-*` roles as `rgb(…)` values, and an `--md-extended-color-*` group for each custom colour. **There is no `:root` rule, no `prefers-color-scheme` rule, no type scale and no font.**
- **Material Theme (JSON)** writes `description`, `seed`, `coreColors`, `extendedColors`, `schemes` (the same six) and `palettes`. **No typography either.** This is the form of tproc's `default-theme.json`.
- **The word `typescale` doesn't occur in the bundle.** The builder writes its font choice into the Jetpack Compose export's `ui/theme/Type.kt`, and the bundle doesn't show whether the Flutter export carries it. Neither web export does.

**So the theme is complete for colour, and the page still needs three things for type:**

1. **The type scale.** M3 defines 15 text styles: display, headline, title, body and label, each in large, medium and small. Each style is a font, a weight, a size, a line height and a letter spacing, published as `md.sys.typescale` tokens. Components apply them inside their own styles. Page text outside a component, such as the hero's headline, a section title or a paragraph, needs them as CSS. tproc's store has them, in `md.sys.typescale` and its emphasized set, with `md.ref.typeface` naming Roboto.
2. **The fonts loaded.** Roboto for text, Roboto Mono for the install snippet, and Material Symbols for `mx-icon`. Storybook loads all three from Google Fonts in `.storybook/preview-head.html`, and the page does the same.
3. **Letter spacing that renders.** `RF-92` says that the tracking tokens aren't read in three packages. The page's generated styles carry letter spacing whatever the components do.

**The CSS export's form matters for the theme switch.** Its class selectors don't follow the system setting by themselves. A page that uses the files as exported adds the class to `<html>` from script, and repeats the dark rule inside `@media (prefers-color-scheme: dark)` to follow the system before any script runs. Generating the page's CSS from the JSON export, as Storybook's theme is generated now, gives all of that from one file ([Q6](#q6--which-builder-export-and-where-does-it-go)).

## The page

The parts a landing page for these packages contains, and what each needs. _Exists_ names material-x elements. _Missing_ names the M3 component that would serve, and _v1_ says what the first version does.

| Part | Content | Exists | Missing | v1 |
| --- | --- | --- | --- | --- |
| Header | Wordmark; links to Docs (Storybook), API, GitHub; theme switch. Sticky | `mx-link-button` (text), `mx-switch-icon-button` | **Top app bar**; link icon button | `mx-top-app-bar`, pinned, with the link buttons and the theme switch as its actions. The GitHub link is a link button with a leading icon |
| Theme switch | Light, dark, follow the system | `mx-switch-icon-button` with `light_mode`/`dark_mode` | — | **Required** (`RD-48`): `prefers-color-scheme` until the visitor chooses; the choice applied before the first paint and kept in `localStorage` inside `try`/`catch`; a choice equal to the system's setting is removed. A seed-colour picker comes after the site (`RD-49`) |
| Hero | Name, one-line pitch, two actions, the install command | `mx-button`, `mx-link-button` | — (type scale is a foundation) | Page-local headline and body styles from `md.sys.typescale` |
| Install snippet | One command per published package; copy | `mx-icon-button` (copy) | Code block (not M3); tabs for package managers; snackbar for "Copied" | `<pre><code>` styled from `surface-container` and Roboto Mono. The copy button swaps its icon to `check` and announces through a live region. Package managers, if shown, are a `mx-connected-button-group` |
| Packages | One entry per package: name, what it does, status, links | `mx-list-link-item` could carry it | **Card**; chips for labels | **Cards**, one per package, each with link buttons. Status (`1.0.0`, _not yet published_) is text in a label style: M3 chips are interactive, and a badge is a count |
| material-x showcase | Buttons, FABs, checkbox, radio, text field, list | All of them | — | The existing elements on cards |
| box-quad demo | A transformed, zoomed, scrolled box and its quads; rotation, skew, scale | — | **Slider** (the story's controls are `range`) | `mx-slider` |
| drag demo | A sortable list; free drag with an axis choice and two booleans | `mx-sortable-list`; `mx-connected-button-group` for the axis; `mx-switch-button` for the booleans | Switch | Existing elements. The booleans are toggle buttons, which carry their name in their content (`RF-94`, below) |
| Section separation | Between sections | — | Divider | Spacing and surface-container colours. A divider can come with Card's unit if the design wants one |
| Footer | Licence, repository, issues | `mx-link-button` (text) | — | Page-local `<footer>` |

**Not needed by a one-page site:** navigation bar, navigation rail, navigation drawer (M3 Expressive replaces the drawer with the expanded navigation rail), tabs, menu, dialog, tooltip, snackbar, progress indicators, search, sheets, date and time pickers.

**Open findings the page would show,** and how v1 avoids them:

- `RF-94`: `mx-checkbox` and `mx-radio` can't be named. The demos use toggle buttons and connected button groups. The showcase can show them unlabelled, or wait for the fix.
- `RF-77`: the elevated button and the list items draw their shadows in surface tint. An elevated card or an on-scroll top app bar that shares the elevation styles would too. v1 cards are filled or outlined until it is fixed.
- `RF-76`: a pointer drag doesn't lift `mx-list-link-item` in `mx-sortable-list` in Chromium and Firefox. The drag demo uses `mx-list-item`.
- `RF-68`: `mx-list` isn't exposed as a list of list items. It affects the showcase's list only.

## Missing components, sized

Sizes use the [work queue's words](../../.agents/docs/work-queue.md#issues). Every component carries the component definition of done (`test-component`): behaviour and accessibility tests, a visual-contract test through tproc, curated screenshots, a story, and its token tables in tproc's store. _Like_ compares the work with an existing element. **This table is also the list of further work** (`RD-47`).

| Component | First set | Size | Like | What drives the size |
| --- | --- | --- | --- | --- |
| **Card** (elevated, filled, outlined; not interactive) | **Yes** | medium | less than `mx-fab` | One token table, which holds the three variants' sets; container colour, shape, elevation and outline; slots. An interactive card (the whole card a link or a button) adds a state layer, focus and activation, and waits |
| **Top app bar** (small, pinned, on-scroll state) | **Yes** | medium | — | One token table; leading, headline and trailing slots; the on-scroll state ([below](#top-app-bar-the-first-sets-third-component)). The medium and large variants, and collapsing or hiding on scroll, wait |
| **Slider** (continuous, one value) | **Yes** | large | more than `mx-checkbox` | Form association through core's `Validatable`; `value`, `min`, `max`, `step`; pointer and keyboard; value indicator; M3 Expressive sizes; RTL. The range slider, stops and the vertical slider wait. It needs a plan first |
| Divider | Optional | small | — | One token table and a host style. It can go with Card's unit |
| Link icon button | No | small | `mx-link-button` beside `mx-button` | The same split the button already has |
| Switch | No | medium | `mx-checkbox` | Form-associated, checked, icons, handle shape and motion |
| Top app bar, medium and large; collapse and hide on scroll | No | medium | the small bar | No further token table, since the small bar's table holds their sets; the headline's move between sizes as the page scrolls |
| Tooltip (plain) | No | medium | — | Popover, anchor positioning, hover and focus delays. The rich tooltip is large |
| Snackbar | No | medium | — | Timing, a queue, a live region |
| Dialog | No | large | — | Native `<dialog>` underneath; basic and full-screen; focus return |
| Tabs | No | large | — | Primary and secondary; roving focus; tab panels; the indicator's motion |
| Chips | No | large for the four types, medium for assist alone | `mx-button` for assist | Assist, filter (a toggle), input (removable), suggestion |
| Menu | No | large | — | Popover, anchor positioning, keyboard navigation, typeahead, submenus |
| Navigation bar, rail | No | large each | — | Layout across window sizes; the rail's expanded form; selection |
| Code block | Not a material-x component | — | — | M3 has none. The page draws it, and a component would be surface material-x owns without a specification |

### Top app bar: the first set's third component

The owner requires a sticky header. M3's top app bar is that header. Pinned, it stays at the top while the page scrolls. While content is scrolled under it, its container takes the tokens' _on-scroll_ values, and at the top it returns to rest. **Size: medium,** the same as Card, and smaller than Slider: one token table, three slots and one state.

**Required properties.** The unit's plan decides the attributes and the mechanism.

1. **The small top app bar:** a leading slot (a navigation icon), the headline, and trailing actions. The trailing slot takes any element, so link buttons fit beside icon buttons.
2. **Pinned without page script.** A page gets a header that stays at the top of its scroll container with no code of its own. Whether the component's host style or the page's `position: sticky` places it is the plan's decision, and the story shows the result.
3. **The on-scroll state.** While its scroll container is scrolled away from the start, the bar draws the tokens' on-scroll container colour and elevation, and at the start it draws the resting ones. A consumer can style against the state.
4. **No work per scroll frame on the main thread.** The state changes when the scroll position crosses the start, and not on each scroll event. No layout is read during scrolling (`CONTRIBUTING.md` §0). A scroll-driven animation is a candidate only where every engine at `RD-20`'s floor supports it.
5. **The page's scroll container by default.** A bar inside another scroll container is a later option.
6. **Its landmark is the page's.** A page puts one `banner` landmark around its header. Whether the element exposes `banner` itself is the plan's decision, because a bar inside a region isn't a page's banner.

**Dated 2026-11-23 by the architect: `RD-54` decides the unit and amends property 3.** On scroll the container's color changes, and its elevation isn't drawn. Upstream calls a shadow on these bars a bug, and the spec shows none. `RD-54` answers properties 2 to 6 with the [plan](../top-app-bar-1/top-app-bar-plan.md).

**Waits:** the medium and large variants, collapsing as the page scrolls, hiding on scroll down and showing on scroll up, and the search app bar.

## Where the page lives and how it is built

Decided by `RD-47` on the owner's Q1 (a) and Q2 (a).

**Today** (`RD-14`, `.storybook/main.ts`, `.scripts/docs-api.ts`): `verify`'s `docs` job runs `just docs-build` and `just docs-smoke`, and `deploy` publishes `.docs` to GitHub Pages from `main` only, at `https://ausginer.github.io/material-x/`. Storybook's manager is the site's root (`base: '/material-x/'`), and the API pages are at `api/`. **This stays until the site unit lands.**

**When the site unit lands:**

1. **The landing page is the site's root.** Storybook moves to `storybook/`, and `api/` stays. The page redirects a request whose query has Storybook's `path` parameter to `storybook/` with the same query, so links to `?path=/docs/…` keep working. Links to the old `iframe.html` break, and they aren't shared links.
2. **The source is a private workspace package, `packages/site`,** with its own `Justfile`, Vite config, `tsconfig` and lint configuration, as every other package has. It is plain HTML and TypeScript modules, with no client framework and no site generator for the page. It may use `@preact/signals-core` where values depend on each other, with nothing built on top of it. `RD-47` states this and its reasons. It imports the packages through their builds, as Storybook does after `_package-builds`, so the page is a real consumer of the published artifacts.
3. **The demos are written for the page.** Storybook's demos are React stories and stay as they are. Framework-free demo modules shared by both wait until a second user needs them.
4. **The theme is the owner's Material Theme Builder JSON export, kept in `packages/site`,** and the page's colour CSS is generated from it at build time. The type scale is generated from tproc's `md.sys.typescale` tokens. The page follows `prefers-color-scheme` before any script runs, and the theme switch overrides it. `RD-48` states the properties.
5. **The gate covers the page.** `just docs-build` builds the page into `.docs` and Storybook into `.docs/storybook`. `just docs-smoke` loads the landing page under its existing rules. That is an amendment of `RD-14`, owed when the site unit lands (`RD-47`). `deploy` doesn't change.
6. **Development is Vite's dev server** (`just site-dev`), which is the fast loop the owner asked for.

**Not adopted:**

- **The landing page at a subpath** with Storybook kept at the root: a visitor to the site's address meets Storybook, which is the situation the page exists to change.
- **React for the page,** to reuse the stories, or another client framework: the page has little to render, and a framework would stand between it and the packages that it shows. `RD-47`'s amendment of 2026-11-24 has the owner's reason and the others.
- **A site generator for the page:** the owner agreed to plain HTML, TypeScript and signals (the same amendment). How `/spec/` generates its pages isn't decided by this (`RD-51`).
- **A root-level `site/` directory** that isn't a package: it would have none of the package recipes that `handoff.md`'s checks run.
- **A separate repository or a custom domain:** nothing asks for one, and it would need a second Pages setup.
- **A page built in stages before the components exist:** the owner prefers to stay with Storybook until they do (Q3).

## Theme picker: a unit after the site

The owner asked for a colour picker _"as in material-web"_, as a separate improvement after the switch. `RD-49` decides it, and this section holds the reading behind it.

**What material-web's picker does.** A subagent read the source of material-web's documentation site on GitHub's `main` branch, and its report was relayed to the architect. The architect didn't reread the source, so these are its citations, not a verification:

- `catalog/src/components/theme-changer.ts` shows a native `<input type="color">`, three custom `hct-slider`s for hue, chroma and tone, each wrapping `md-slider` over a drawn gradient, and a light, auto and dark segmented button set.
- `catalog/src/utils/material-color-helpers.ts` generates each mode with `new SchemeContent(Hct.fromInt(argbFromHex(color)), isDark, 0)` from `@material/material-color-utilities`, and maps about 46 roles through `MaterialDynamicColors`.
- `catalog/src/utils/apply-theme-string.ts` applies the result as `:root,:host{--md-sys-color-…}` in one adopted stylesheet, and sets `<meta name="theme-color">`.
- `catalog/src/utils/theme.ts` and `apply-theme-string.ts` store the generated CSS, the seed, the mode and the last automatic mode in `localStorage`. `catalog/src/inline/apply-saved-theme.ts` reapplies the stored CSS from an inlined script before the first paint.
- A copy button writes the stored CSS to the clipboard.

**What this unit takes, and what it does differently.** `RD-49` holds the properties.

- **The generator:** the same library, as `packages/site`'s dependency alone, loaded only when the picker opens. Every visitor would otherwise download it to use the default theme.
- **Light and dark:** material-web regenerates one scheme whenever the mode changes. This page generates both from the seed at once and applies them the way it applies the default, so `RD-48`'s system rule and switch don't change.
- **The variant** is the one that reproduces the default theme from its own seed. It isn't assumed to be `SchemeContent`. **Not established:** the architect's probe of the library against tproc's `default-theme.json` wasn't run, because running the downloaded package was refused in this session. The unit's witness establishes it.
- **The controls are material-x elements.** An `mx-icon-button` in the top app bar opens a native `popover` holding an `mx-card`. In it are an `mx-text-field` for the hex value and three `mx-slider`s for hue, chroma and tone (C). A reset `mx-button` restores the default. The page draws the gradient strips and a swatch. **No colour input is needed:** a hex field and three sliders reach every colour. The native colour input's dialog differs by platform, and the popover is placed with plain CSS under the bar, not with anchor positioning.
- **Persistence** is material-web's, with a format version on the stored CSS. Reset removes it.
- **Not taken:** the copy button (the clipboard needs a secure context), a third mode control (`RD-48`'s switch returns to the system setting by itself), and `<meta name="theme-color">`, which the unit may add if it costs nothing.

**Size: medium.** It is page code and one dependency, it adds no material-x component, and it uses B, H and C. It starts after A.

## Order

Decided by `RD-47`. Each unit is one branch and one pull request.

1. **T — the token tables** (tproc, small): rows for the card variants, the small top app bar, the slider and the divider in `manifest.json`, and one update at the manifest's current release, so no existing token changes. **It goes first, on its own,** so that the three component units don't each regenerate the store and conflict.
2. **S — the typescale selection** (tproc and material-x, medium): `RF-110` with `RF-92`, before any unit that reads a text style. It doesn't depend on T. Added on 2026-11-23. The owner chose one unit for all components and `font: static` the same day, so the page loads Roboto.
3. **After T and S, in parallel** (material-x, each with its stories and the full definition of done):
   - **B — `mx-card`** (medium). The divider can come with it.
   - **H — `mx-top-app-bar`** (medium): [the properties above](#top-app-bar-the-first-sets-third-component), in a short plan of its own.
   - **C — `mx-slider`** (large): a plan, then the element.
4. **A — the site** (repo, large), after B, H and C merge: `packages/site`; Storybook moved to `storybook/` with the redirect; `docs-build`, `docs-smoke` and the links in `docs-api.ts` updated; the theme, the type scale and the theme switch (`RD-48`); every section in [The page](#the-page), including the box-quad demo ported from its story (516 lines of React today); and the `RD-14` amendment. This is #54.
5. **P — the theme picker** (repo, medium), after A ([above](#theme-picker-a-unit-after-the-site), `RD-49`).
6. **Further work,** from [the table](#missing-components-sized), in the order the page would use it: the link icon button, the interactive card, the switch, the plain tooltip, the larger top app bars. The rest waits for a page that needs it.

Fixes that make the page better and that it doesn't wait for: `RF-94`, `RF-77`, `RF-76`, `RF-68`.

## Answered questions

The answers are in [The owner's answers](#the-owners-answers). The options are kept as asked.

### Q1 — Where on the site does the page live?

- **(a) At the root, with Storybook moved to `storybook/` and a redirect for old `?path=` links. Recommended:** the site's address shows the project, and existing deep links keep working. **Chosen.**
- (b) At a subpath such as `home/`, with Storybook kept at the root.

### Q2 — What is the page built with?

- **(a) A private workspace package `packages/site`: plain HTML and TypeScript, built by Vite, importing the packages' builds. Recommended. Chosen.**
- (b) The same, with React, reusing pieces of the stories.
- (c) A root-level directory that isn't a package.

### Q3 — Does the page wait for the slider?

- (a) Card and Slider are the first version. The site ships first, the package section when Card lands, and the box-quad demo when Slider lands. Recommended.
- (b) Card only. The box-quad demo uses presets in a connected button group, and the slider comes later.
- (c) Neither. Packages as a list of link items, and the box-quad demo with presets.
- **Answered: none of them.** The components come first, each with its stories, and the site unit starts after them. Until then the project stays with Storybook.

### Q4 — Which packages does the page present, and which get an install command?

- **(a) Cards for material-x, core, box-quad and drag. An install command for box-quad, and _not yet published_ for the others. tproc and the two Vite plugins under a short _Tooling_ note. Recommended. Chosen.**
- (b) Every package, with an install command for each, published or not.
- (c) Only the published packages.

### Q5 — Theme and type scale: page-local or public?

- (a) Generated for the page, as Storybook's theme is. A public export from material-x is decided separately. Recommended.
- (b) material-x exports a theme stylesheet and type-scale styles now.
- **Answered for the theme:** it comes from Material Theme Builder. The type scale is asked again as Q5b, and the export's form and place as Q6.

### Q5b — Where does the page take its type scale from?

Material Theme Builder doesn't export one ([above](#what-material-theme-builder-exports)).

- **(a) Generated for the page from tproc's `md.sys.typescale` tokens: one CSS class or set of custom properties per style the page uses. Recommended:** the values are the ones the components use, and it adds nothing public to material-x. **Chosen.**
- (b) material-x exports type-scale styles now, and the page and Storybook use them. It is public surface with a consumer of one.
- (c) The page writes its own sizes by hand. They drift from the tokens.

### Q6 — Which builder export, and where does it go?

- **(a) The JSON export, kept in `packages/site`, and the page's CSS generated from it as Storybook's theme is now: light and dark, with a `prefers-color-scheme` rule and the switch's override. Recommended:** one file, the form the repository already reads, and no change to the components' fallbacks or to any baseline. **Chosen.**
- (b) The JSON export replaces tproc's `default-theme.json`, so the components' fallback colours, Storybook and the page all take it. It is right if the new colours are to be the library's defaults, and it changes every visual baseline once.
- (c) The CSS export's files, copied in as exported. The page sets their class on `<html>` from script and repeats the dark rule for `prefers-color-scheme`, and the medium- and high-contrast files are unused.

## Record changes

- **Corrected on 2026-11-24,** with `RD-47`'s amendment. In [Where the page lives](#where-the-page-lives-and-how-it-is-built), item 2 said _"with no framework, since material-x's own pitch is that it needs none"_, and _Not adopted_ rejected React because _"it contradicts material-x's pitch, and the stories' controls are Storybook's, not React's"_. The pitch has no source: the READMEs say only _"framework-agnostic"_. The controls of box-quad's stories are React's own range inputs. Q2 (a) stands.
- **Made:** `RD-47`, its dated note of the answers to Q5b and Q6, `RD-48` and `RD-49`, in the [index](../00-index.md), on this branch.
- **Corrected on 2026-11-23,** from `reviewer-2` of #188's feature proof: in [the table](#missing-components-sized), Card said _"Three token tables"_ and the larger bars said _"Two more token tables"_. One Cards row and one App bars row in tproc's manifest each hold every variant. The same day, [Order](#order) gained unit S, so A, P and _Further work_ moved from 3, 4 and 5 to 4, 5 and 6. The parallel units moved from 2 to 3.
- **Dated 2026-11-23 by the architect: `RF-77` no longer limits the cards or the top app bar.** #152 fixed it on `main` (merged as `986ad3719`), so [the page's](#the-page) _"v1 cards are filled or outlined until it is fixed"_ has ended. `RD-53` is Card's plan. It leaves the divider out, so the divider stays in [the table](#missing-components-sized) for a page that asks for it.
- **Owed when the site unit lands:** an amendment of `RD-14` property 6, so `docs-smoke` loads the landing page and Storybook at its new base path, and of property 2 or 4 if the recipe's output layout changes. The architect makes it on the site unit's plan.
- **Owed with the picker unit:** if `docs-smoke` is the check that loads the picker's chunk (`RD-49` property 7), a second amendment of `RD-14` property 6.

Each component unit plans itself in material-x's record when it is taken.

## Issues to open

#54 stays the site unit, and its description still holds. The coordinator may open one issue per unit in [Order](#order): T (small), B (medium), H (medium), C (large) and P (medium).