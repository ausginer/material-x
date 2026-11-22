# Landing page — component gap analysis and plan

**Status: analysis, awaiting the owner's answers to [the questions](#questions-for-the-owner).** Written by the architect on 2026-11-22, on the coordinator's task for #54, on `repo/landing-1` from `origin/main` at `23b245efb`. **No identifier is minted and no record entry is edited.** The decisions that the answers settle are listed in [Record changes owed](#record-changes-owed). This plan builds nothing: the page and the components are later units.

**The owner's goal:** a landing page for `@ydinjs` built from material-x components, with no separate documentation program. Storybook isn't the page: it is slow to use (#169's trace puts the time in `sb-manager`), and it presents stories, not the project.

## The answer in short

- **Two components are missing for a first version: Card and Slider.** Card carries the package section and frames the demos. Slider drives box-quad's demo, whose controls are continuous ranges today.
- **Two foundations are missing, and neither is a component:** a colour scheme with a dark variant, and the type scale for page text. material-x ships neither. Storybook generates its own scheme, and a page can do the same without adding public surface.
- **Everything else on the list waits or isn't a material-x component.** A one-page site needs no navigation bar, rail, drawer, tabs, menu, dialog or snackbar. The code block isn't an M3 component, and the page draws it itself.
- **The existing components cover the rest:** the header, the hero's actions, the theme switch, the demo controls other than ranges, and the material-x showcase.

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

- **No theme stylesheet.** Components read `var(--md-sys-color-*, <light value>)`, so a page without a theme renders the light scheme. Storybook's dark scheme comes from `.scripts/storybook-theme.ts`, which writes `.storybook/theme.css` from `packages/tproc/src/theme.ts` and switches on `html[data-theme="dark"]`, with no `prefers-color-scheme` rule.
- **No type scale for page text.** Components set their own fonts from their tokens. A headline or a paragraph outside a component has no `md.sys.typescale` style to use. tproc's store has the `md.sys.typescale` sets.
- **No icon button with `href`.** `mx-link-button` has `href` and `target`, and `mx-icon-button` doesn't.
- **tproc's token store holds only the existing components' tables.** Its 102 sets are buttons, button groups, checkbox, FABs, icon buttons, lists, radio, text fields, split buttons and the system sets. A new component first adds its tables: a row in `packages/tproc/tokens/manifest.json` and an update through `scripts/update-tokens.ts`, in a pull request that carries the update's report (the `use-tokens-db` skill).

**What is published.** Only `@ydinjs/box-quad` (1.0.0) is on npm. `@ydinjs/core`, `@ydinjs/material-x` and `@ydinjs/vite-traits-plugin` are public in their manifests and unpublished. `@ydinjs/drag` and `@ydinjs/tproc` are private.

## The page

The parts a landing page for these packages contains, and what each needs. _Exists_ names material-x elements. _Missing_ names the M3 component that would serve, and _v1_ says what the first version does.

| Part | Content | Exists | Missing | v1 |
| --- | --- | --- | --- | --- |
| Header | Wordmark; links to Docs (Storybook), API, GitHub; theme switch | `mx-link-button` (text), `mx-switch-icon-button` | Top app bar; link icon button | A page-local `<header>` of link buttons and the theme switch. The GitHub link is a link button with a leading icon |
| Theme switch | Light, dark, follow the system | `mx-switch-icon-button` with `light_mode`/`dark_mode` | — | Page script: `prefers-color-scheme` by default, `data-theme` on `<html>`, the choice kept in `localStorage` inside `try`/`catch` |
| Hero | Name, one-line pitch, two actions, the install command | `mx-button`, `mx-link-button` | — (type scale is a foundation) | Page-local headline and body styles from `md.sys.typescale` |
| Install snippet | One command per published package; copy | `mx-icon-button` (copy) | Code block (not M3); tabs for package managers; snackbar for "Copied" | `<pre><code>` styled from `surface-container` and Roboto Mono. The copy button swaps its icon to `check` and announces through a live region. Package managers, if shown, are a `mx-connected-button-group` |
| Packages | One entry per package: name, what it does, status, links | `mx-list-link-item` could carry it | **Card**; chips for labels | **Cards**, one per package, each with link buttons. Status (`1.0.0`, _not yet published_) is text in a label style: M3 chips are interactive, and a badge is a count |
| material-x showcase | Buttons, FABs, checkbox, radio, text field, list | All of them | — | The existing elements on cards |
| box-quad demo | A transformed, zoomed, scrolled box and its quads; rotation, skew, scale | — | **Slider** (the story's controls are `range`) | `mx-slider`. Until it lands, the section can wait or use presets in a connected button group ([Q3](#q3--does-the-page-wait-for-the-slider)) |
| drag demo | A sortable list; free drag with an axis choice and two booleans | `mx-sortable-list`; `mx-connected-button-group` for the axis; `mx-switch-button` for the booleans | Switch | Existing elements. The booleans are toggle buttons, which carry their name in their content (`RF-94`, below) |
| Section separation | Between sections | — | Divider | Spacing and surface-container colours. A divider can come with Card's unit if the design wants one |
| Footer | Licence, repository, issues | `mx-link-button` (text) | — | Page-local `<footer>` |

**Not needed by a one-page site:** navigation bar, navigation rail, navigation drawer (M3 Expressive replaces the drawer with the expanded navigation rail), tabs, menu, dialog, tooltip, snackbar, progress indicators, search, sheets, date and time pickers.

**Open findings the page would show,** and how v1 avoids them:

- `RF-94`: `mx-checkbox` and `mx-radio` can't be named. The demos use toggle buttons and connected button groups. The showcase can show them unlabelled, or wait for the fix.
- `RF-77`: the elevated button and the list items draw their shadows in surface tint. An elevated card that shares the elevation styles would too. v1 cards are filled or outlined until it is fixed.
- `RF-76`: a pointer drag doesn't lift `mx-list-link-item` in `mx-sortable-list` in Chromium and Firefox. The drag demo uses `mx-list-item`.
- `RF-68`: `mx-list` isn't exposed as a list of list items. It affects the showcase's list only.

## Missing components, sized

Sizes use the [work queue's words](../../.agents/docs/work-queue.md#issues). Every component carries the component definition of done (`test-component`): behaviour and accessibility tests, a visual-contract test through tproc, curated screenshots, a story, and its token tables in tproc's store. _Like_ compares the work with an existing element.

| Component | v1 | Size | Like | What drives the size |
| --- | --- | --- | --- | --- |
| **Card** (elevated, filled, outlined; not interactive) | **Yes** | medium | less than `mx-fab` | Three token tables; container colour, shape, elevation and outline; slots. An interactive card (the whole card a link or a button) adds a state layer, focus and activation, and waits |
| **Slider** (continuous, one value) | **Yes** | large | more than `mx-checkbox` | Form association through core's `Validatable`; `value`, `min`, `max`, `step`; pointer and keyboard; value indicator; M3 Expressive sizes; RTL. The range slider, stops and the vertical slider wait. It needs a plan first |
| Divider | Optional | small | — | One token table and a host style. It can go with Card's unit |
| Link icon button | No | small | `mx-link-button` beside `mx-button` | The same split the button already has |
| Switch | No | medium | `mx-checkbox` | Form-associated, checked, icons, handle shape and motion |
| Top app bar | No | medium | — | Small, medium and large variants; elevation on scroll |
| Tooltip (plain) | No | medium | — | Popover, anchor positioning, hover and focus delays. The rich tooltip is large |
| Snackbar | No | medium | — | Timing, a queue, a live region |
| Dialog | No | large | — | Native `<dialog>` underneath; basic and full-screen; focus return |
| Tabs | No | large | — | Primary and secondary; roving focus; tab panels; the indicator's motion |
| Chips | No | large for the four types, medium for assist alone | `mx-button` for assist | Assist, filter (a toggle), input (removable), suggestion |
| Menu | No | large | — | Popover, anchor positioning, keyboard navigation, typeahead, submenus |
| Navigation bar, rail | No | large each | — | Layout across window sizes; the rail's expanded form; selection |
| Code block | Not a material-x component | — | — | M3 has none. The page draws it, and a component would be surface material-x owns without a specification |

## Where the page lives and how it is built

**Today** (`RD-14`, `.storybook/main.ts`, `.scripts/docs-api.ts`): `verify`'s `docs` job runs `just docs-build` and `just docs-smoke`, and `deploy` publishes `.docs` to GitHub Pages from `main` only, at `https://ausginer.github.io/material-x/`. Storybook's manager is the site's root (`base: '/material-x/'`), and the API pages are at `api/`.

**Recommended** ([Q1](#q1--where-on-the-site-does-the-page-live), [Q2](#q2--what-is-the-page-built-with)):

1. **The landing page is the site's root.** Storybook moves to `storybook/`, and `api/` stays. The page redirects a request whose query has Storybook's `path` parameter to `storybook/` with the same query, so links to `?path=/docs/…` keep working. Links to the old `iframe.html` break, and they aren't shared links.
2. **The source is a private workspace package, `packages/site`,** with its own `Justfile`, Vite config, `tsconfig` and lint configuration, as every other package has. It is plain HTML and TypeScript modules with no framework, since material-x's own pitch is that it needs none. It imports the packages through their builds, as Storybook does after `_package-builds`, so the page is a real consumer of the published artifacts.
3. **The demos are written for the page.** Storybook's demos are React stories and stay as they are. Framework-free demo modules shared by both wait until a second user needs them.
4. **The theme and the type scale are generated for the page,** as `.scripts/storybook-theme.ts` does for Storybook, from tproc's theme and `md.sys.typescale` sets, with a `prefers-color-scheme` rule as well as `data-theme`. A public theme or typography export from material-x is a separate decision ([Q5](#q5--theme-and-type-scale-page-local-or-public)).
5. **The gate covers the page.** `just docs-build` builds the page into `.docs` and Storybook into `.docs/storybook`. `just docs-smoke` loads the landing page under its existing rules (an amendment of `RD-14` property 6). `deploy` doesn't change.
6. **Development is Vite's dev server** (`just site-dev`), which is the fast loop the owner asked for.

**Not adopted:**

- **The landing page at a subpath** with Storybook kept at the root: a visitor to the site's address meets Storybook, which is the situation the page exists to change.
- **React for the page,** to reuse the stories: it contradicts material-x's pitch, and the stories' controls are Storybook's, not React's.
- **A root-level `site/` directory** that isn't a package: it would have none of the package recipes that `handoff.md`'s checks run.
- **A separate repository or a custom domain:** nothing asks for one, and it would need a second Pages setup.

## Order

1. **The owner answers Q1 to Q5.** The architect records the decision (hosting, build, first-version scope) and amends `RD-14` property 6 ([below](#record-changes-owed)).
2. **In parallel:**
   - **A — the site** (repo, large): `packages/site`; Storybook moved to `storybook/` with the redirect; `docs-build`, `docs-smoke` and the links in `docs-api.ts` updated; the generated theme and type scale; header, theme switch, hero, install snippet, drag demo, material-x showcase and footer from existing elements. It can merge and deploy before the cards: it is already more of a landing page than Storybook's manager.
   - **B — `mx-card`** (material-x, medium): its token tables, then the element. The divider can come with it.
3. **The package section** goes into the site when B merges (small).
4. **C — `mx-slider`** (material-x, large): a plan, then the element. Then the box-quad demo goes into the site (medium: a framework-free port of the story's demo, 516 lines of React today).
5. **After v1,** in the order the page would use them: the link icon button, the interactive card, the switch, the plain tooltip, the top app bar. The rest waits for a page that needs it.

Fixes that make the page better and that it doesn't wait for: `RF-94`, `RF-77`, `RF-76`, `RF-68`.

## Questions for the owner

### Q1 — Where on the site does the page live?

- **(a) At the root, with Storybook moved to `storybook/` and a redirect for old `?path=` links. Recommended:** the site's address shows the project, and existing deep links keep working.
- (b) At a subpath such as `home/`, with Storybook kept at the root.

### Q2 — What is the page built with?

- **(a) A private workspace package `packages/site`: plain HTML and TypeScript, built by Vite, importing the packages' builds. Recommended.**
- (b) The same, with React, reusing pieces of the stories.
- (c) A root-level directory that isn't a package.

### Q3 — Does the page wait for the slider?

- **(a) Card and Slider are the first version. The site ships first, the package section when Card lands, and the box-quad demo when Slider lands. Recommended:** box-quad is the only published package, so its demo is the page's strongest content, and a continuous control is what shows box-quad reading a transform as it changes.
- (b) Card only. The box-quad demo uses presets in a connected button group, and the slider comes later.
- (c) Neither. Packages as a list of link items, and the box-quad demo with presets. The page is possible today, and reads as a documentation index more than a landing page.

### Q4 — Which packages does the page present, and which get an install command?

- **(a) Cards for material-x, core, box-quad and drag. An install command for box-quad, and _not yet published_ for the others. tproc and the two Vite plugins under a short _Tooling_ note. Recommended:** the page shows what a visitor can use, and doesn't offer a command that fails.
- (b) Every package, with an install command for each, published or not.
- (c) Only the published packages.

### Q5 — Theme and type scale: page-local or public?

- **(a) Generated for the page, as Storybook's theme is. A public export from material-x is decided separately, when a consumer other than the project's own pages asks. Recommended:** it adds no public surface and doesn't hold the page up.
- (b) material-x exports a theme stylesheet and type-scale styles now, and the page and Storybook use them.

## Record changes owed

When the owner has answered, the architect:

- mints a `repo` decision for the hosting layout, the `packages/site` build and the first-version scope, with the answers' dates and the reasons above;
- amends `RD-14` property 6, so `docs-smoke` loads the landing page and Storybook at its new base path, and property 2 or 4 if the recipe's output layout changes.

Each component unit plans itself in material-x's record when it is taken.

## Issue descriptions

#54's description still holds ("The project has no landing page. The work builds one. Size: large."). The coordinator may open one issue per unit in [Order](#order) once the owner has answered: the site, `mx-card` and `mx-slider`, with the sizes above.