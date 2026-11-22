# Feature proof: box-quad's Storybook stories (#157, PR #159)

**Read at** `478e05fdd` on `box-quad/storybook-1`, where the stories are at `97b789f54` and the record entry follows them. The governing records are the settled [Storybook plan](../../storybook-plan.md) and `box-quad:BQ-13` to `BQ-18` in [`plan.md`](../../plan.md), with the owner's answers `SB-Q1` A, `SB-Q2` A and `SB-Q3` A, and the record entry _"2026-11-22 — Storybook stories land"_. The branch's base is `4fd8b9a67`. `main` is at `6a67badfd`, and `git merge-tree` merges the two with no conflict. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-22.

Everything ran in slot `b`, with Playwright's Chromium 158, Firefox 159 and WebKit 27.2 and Node 26.13.1. The upstream demo's source was fetched at `c3e766291` into scratch, which is removed.

**Scope:**

- **Covered:** every claim the coordinator listed, the lockfile, the tarball, the credit's wording and its rendering, how the stories behave in the built docs in three engines, phone width, and whether anything is copied from the demo.
- **Rerun, not taken from the record:**
  - `aube install`, box-quad's `typecheck` and `lint`, and the root `docs-build` and `docs-smoke` ([reading](checks/build-and-lock.txt));
  - the implementer's [`stories-reading.ts`](../../probes/storybook-demo/stories-reading.ts), with its screenshots written to scratch ([reading](checks/implementer-reading-rerun.txt));
  - a build, `aube pack`, and a comparison with the published 1.0.0 tarball ([reading](checks/tarball.txt)).
- **Probes of this pass**, all in [`probes/`](probes/):
  - [`stories-proof.ts`](probes/stories-proof.ts) compares each overlay's corner bounds with the target's `getBoundingClientRect()` in three engines. It covers _Live Demo_ at the defaults and the four extremes, and _Nested Spaces_ at three arg sets, each also after a 90 px scroll. It also reads _Failed Reads_, the docs page's credit, and the stories at 375 × 667 ([reading](checks/stories-proof.txt));
  - [`resize-observer-errors.ts`](probes/resize-observer-errors.ts) and [`webkit-errors-all-stories.ts`](probes/webkit-errors-all-stories.ts) count page errors per story, engine and width ([reading](checks/resize-observer-errors.txt));
  - [`common-lines.ts`](probes/common-lines.ts) lists the lines that the stories share with the demo's source ([reading](checks/demo-comparison.txt)).
- **Not run:** real Safari, which needs macOS. A touch drag at phone width. The visual project, which has no box-quad rows.

**Verdict:** the unit meets `BQ-13` to `BQ-18` in the three engines. Every reading of the implementer's reproduces exactly, and the eight screenshots are byte-equal to the committed ones. Beyond what the record reads, the overlays bound their targets at the sliders' extremes in all three engines. That includes _Nested Spaces_ through zoom, rotation and scrolling, which `BQ-16` requires and `BQ-18`'s reading doesn't cover.

There are two findings:

- **`reviewer-1`, Tier A, low priority:** in WebKit, each story that uses a `ResizeObserver` raises an uncaught `ResizeObserver loop` error on load. It is the only page error among the site's 89 stories, and the Chromium-only smoke check can't see it.
- **`reviewer-2`, Tier C:** the record's reason for the unplanned `autodocs` tag is worded wrongly.

## The claims

| Claim | Holds | Evidence |
| --- | --- | --- |
| Four stories: _Live Demo_, _Nested Spaces_, _Pointer Delta_, _Failed Reads_ | Yes | The Storybook index has `box-quad--live-demo`, `--nested-spaces`, `--pointer-delta`, `--failed-reads`, and `box-quad--docs` |
| Nothing is copied from the MIT demo | Yes, under `BQ-17`'s line between scenario and text | Against `index.html`, `site.js` and `site.css` at `c3e766291`, the shared lines are generic declarations and the scenario's numbers: `padding: 28px`, `padding: 20px 28px`, `transform-origin: center`, `display: flex` and the like. The other shared items are one class name, `.demo-stage`, and five short labels, _Ancestor_, _Target node_, _relativeTo: demo stage_, _First point_ and _Quad points_, which the plan's §1 and `BQ-14` name as the scenario's readout. No markup, script or rule block is shared |
| The credit is in _Live Demo_'s description and the module comment | Yes | _Live Demo_'s JSDoc is `BQ-17`'s sentence verbatim. The docs page renders it with the link to `https://jogibear9988.github.io/getBoxQuadsPolyfill#live-demo` in three engines. The module comment carries the same attribution and link, worded as _"Live Demo reproduces the live demo of getBoxQuadsPolyfill by Jochen Kühner (MIT): its scenario and readings, written for box-quad's API"_. The upstream `LICENSE` names _Jochen Kühner_, 2024 |
| React is in box-quad's `devDependencies` at drag's versions | Yes | `react` and `react-dom` 19.3.1, and `@types/react` and `@types/react-dom` 19.3.0, as in `packages/drag/package.json` |
| The lockfile change is only the new devDependencies and drops no workspace link | Yes | `package-lock.json` is +4 and −0, the four entries under `packages/box-quad`'s `devDependencies`. All seven `node_modules/@ydinjs/*` links remain. `aube install` reports _Already up to date_ and leaves the tree clean |
| No published file changes | Yes, for the files. The manifest gains devDependencies | `aube pack` lists `CHANGELOG.md`, `LICENSE`, `README.md`, `index.d.ts`, `index.js`, `index.js.map` and `package.json`, with nothing under `src/`. Each file is byte-equal to the published 1.0.0 except `package.json`, which gains the four `devDependencies` lines. A consumer doesn't install those, and no version or size row moves |
| `tags: ['autodocs']` is the one unplanned addition | Yes | It is the only `autodocs` tag in the repository, and it gives box-quad a generated docs page. See `reviewer-2` for its stated reason |
| Typecheck, lint, `docs-build`, and `docs-smoke` 112/112 | Yes | All exit 0. 112 of 112 pages, including `box-quad--docs` and the four stories |
| Firefox: the overlay is within 0.0152 px of the native `getBoxQuads()` | Yes | 1.52e-2 at the defaults, at most 7.87e-3 at the extremes, the same digits as the record |
| Chromium and WebKit: the overlay equals the bounding rect at rotation 0 | Yes | A difference of 0 in both. This pass's bounds check also passes at the defaults and the four extremes: at most 1.83e-4 px in Chromium and WebKit, and 4.36e-3 px in Firefox |
| _Pointer Delta_ ends 0.000 px from the pointer in three engines | Yes | At rotation −40° and zoom 1.75, as recorded |
| _Failed Reads_ draws no overlay for a `false` read | Yes, in three engines | The record read Chromium only. This pass reads Firefox and WebKit too: three `false` reads with no overlay, and the 2D contrast with one |
| Light and dark screenshots | Yes | The rerun's eight screenshots are byte-equal to the committed ones. Each theme reads with the preview's tokens |

**Also read:**

- **_Nested Spaces_ (`BQ-16`):** the overlay's bounds equal the target's bounds within 1.6e-5 px in three engines. That holds at the defaults, at rotation −45° with zoom 2 and target rotation 45°, at rotation 45° with zoom 0.5 and target rotation −45°, and after the scroll container scrolls by 90 px at each of those arg sets.
- **Phone width, 375 × 667 (not established by the implementer):** _Live Demo_'s scroller scrolls horizontally, and after a 200 px scroll its overlay still bounds the target. _Nested Spaces_' overlay bounds its target. _Pointer Delta_ and _Failed Reads_ don't make the page scroll horizontally. All of this holds in three engines. A touch drag isn't read, although `.pointer-box` sets `touch-action: none`.

## Findings

### reviewer-1 — In WebKit, the three stories that use a ResizeObserver raise an uncaught ResizeObserver loop error

**Tier A, low priority.** Route: the implementer. The cause isn't established.

- **Current behaviour:** opening _Live Demo_, _Nested Spaces_ or _Failed Reads_ in story mode in WebKit 27.2 raises one page error, _"ResizeObserver loop completed with undelivered notifications."_. That happens at 1000 px and at 375 px. These are the three stories that draw from a `ResizeObserver` callback. _Pointer Delta_, which has none, raises nothing, and so does the docs page, which renders all four stories. Chromium and Firefox raise nothing on any of them. The overlays are still correct. Storybook shows no error display.
- **Why it is a problem:** the error reaches the window's `error` event on a published page. Among the site's 89 stories in WebKit, these three are the only ones that raise any page error, so the unit introduces it. `docs-smoke` fails on any exception or console error, but it runs in Chromium only (`repo:RD-14`), so no instrument sees this. Real Safari isn't read, so whether a Safari reader sees it is open.
- **Evidence:** [reading](checks/resize-observer-errors.txt), with the control over every story.
- **Required property:** loading or using any box-quad story raises no page error in Chromium, Firefox or WebKit.

### reviewer-2 — The record's reason for the autodocs tag says that no story in this Storybook has a docs page

**Tier C.** Route: the implementer for the wording. The architect may want to note the addition against the plan's §7.

- **Current behaviour:** the record says _"Without the tag no story in this Storybook has a docs page."_ The built index has 18 docs pages. 17 of them are material-x's MDX pages, and the 18th is box-quad's new generated page. What holds is narrower: without the tag, box-quad's stories have no docs page, so `BQ-17`'s _"where the docs page shows it"_ has nowhere to appear. `box-quad.stories.tsx` is the only file in the repository with `autodocs`.
- **Why it is a problem:** the record gives a false reason for an addition the plan didn't make. The plan's §7 rejects _"An MDX page for box-quad"_. A generated page isn't that, but it is the first of its kind here. A reader who checks the reason against the site finds it untrue.
- **Evidence:** [reading](checks/build-and-lock.txt).
- **Required property:** the record states the reason that holds.

## Not findings

- **`BQ-18`'s reading doesn't cover _Nested Spaces_.** `BQ-18` doesn't ask for it, so the record complies. `BQ-16`'s property for it is established above.
- **The overlay draws outside the scroll container** when the target is partly scrolled out, as in the light screenshot. `BQ-16` says so, and the story's description says it.
- **The module comment's credit is worded differently from `BQ-17`'s sentence.** It names the same demo, author, licence and link, and _Live Demo_'s description, the one the docs page shows, is verbatim.