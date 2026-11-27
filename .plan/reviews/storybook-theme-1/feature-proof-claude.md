# Storybook keeps the theme in a global, and drag's stories follow it (RF-154, RF-155): feature proof

**Lens:** `reviewer`, feature proof of [`RF-154` and `RF-155`](../../00-index.md) and the implementer's two dated notes, for pull request #323. Requested by the coordinator.

**Commit read:** `be4f7eee2` on `repo/storybook-theme-1`, three commits on `main` at `085be1e2b`. They change `packages/drag/src/stories.module.css`, `.storybook/preview.ts`, `.storybook/manager.tsx` and `.storybook/docs/ThemeToggleLink.tsx`, and add the notes and the unit's readings under `.plan/storybook-theme-1/`. The slot was recreated before this pass, so the tree was installed and built fresh (`aube install`, `just _package-builds`, material-x's `just docs-prepare`), and `git status` was clean throughout.

**Outcome: both required properties hold in Chromium, Firefox and WebKit. Two findings, both for the architect: `reviewer-1` is tier B and `reviewer-2` tier C.**

- **RF-154:** the theme that the reader last chose is the theme of every story and docs page that a sidebar navigation or a reload opens, in each engine. This holds whichever toggle the reader used: the toolbar or a docs page's `ThemeToggleLink`. The toolbar's icon agrees with the preview at every step.
- **RF-155:** every colour of every drag story changes with the theme, in each engine, except the shadows. Those are `--md-sys-color-shadow`, which is `#000000` in both themes.
- **The witnesses:** the unit's two witnesses reproduce line for line in Chromium.
- **Mutations:** each mutation that removes a mechanism of either property is caught in the three engines, by the same lines in each.
- **CI:** `verify` passed on the head.
- **`reviewer-1`:** box-quad's recorded story reading, `stories-reading.ts`, still opens its dark screenshots with `theme=dark`, which now opens light.
- **`reviewer-2`:** of the preview's three ways of applying the global, the `GLOBALS_UPDATED` listener alone carries every path read. Removing the decorator, the `SET_GLOBALS` listener or both changes no reading.

## Scope and method

- **The theme path,** in each engine, one at a time, against `storybook dev` ([probe](probes/theme-engines.ts.txt), [reading](checks/theme-engines.txt)):
  - The unit's steps A to C, unchanged.
  - D: the toolbar's toggle on a story, then on docs pages, then on the storyless _Reference/API_ page, with a reload.
  - E: a new visit to the storyless page with `globals=theme:dark`.
  - Each line reads the URL's `globals`, the preview's `data-theme`, the toolbar's icon, and whether the preview has rendered. The runner warms the server before each run ([warm-up](probes/warm.ts.txt)), so that no step reads a preview that Vite hasn't transformed yet. Every line reads `r=1`.
- **drag's colours,** in each engine ([probe](probes/drag-engines.ts.txt), [reading](checks/drag-engines.txt)):
  - All eight drag stories, not only the five that the unit read, in light and dark.
  - Each element's `color`, `background-color`, drawn `border-top-color` and `box-shadow`, compared between the two themes.
  - The placeholder, read during a real drag in each sortable story.
- **The unit's witnesses,** its two probes unchanged apart from the import path and the port, in Chromium ([reading](checks/unit-witnesses.txt)).
- **Old links,** the old `theme=dark` and the new `globals=theme:dark`, in the manager and in a standalone `iframe.html`, in each engine ([probe](probes/oldlink.ts.txt), [reading](checks/old-link.txt)). Every reference to the parameter, to `THEME_EVENT` and to `replaceState` outside the records, and every `theme=` URL in the records.
- **Mutations,** 13, each on its own server, in the three engines one at a time ([runner](probes/mutate.ts.txt), [comparison](probes/compare.sh.txt), [check](probes/check.sh.txt), [summary](checks/mutations.txt), [raw output](checks/mutations-raw.txt)).
- **The affected test file,** `packages/drag/tests/stories.browser.test.ts`, unmutated in Chromium ([reading](checks/drag-stories-chromium.txt)). Firefox and WebKit are read from CI (`RD-62` property 4). No other test file reads `.storybook/` or drag's stories.
- **Storybook's own code,** for why `GLOBALS_UPDATED` covers every path: `node_modules/storybook/dist/preview/runtime.js` at 10.6.7.
- **Not read:** Safari; a static build, which CI's `docs` job built but no probe read; the deployed site, because the repository deploys none (`deploy` is skipped); contrast ratios, which the entry also leaves unread; back and forward navigation; a hot update of `preview.ts`; a story that fails to load.

## Properties

| Property | Reading |
| --- | --- |
| **RF-154:** the theme last chosen in the toolbar or with a docs page's toggle is the theme of every story and docs page that a sidebar navigation or a reload opens, whatever the URL said at load, in each engine | **Holds** in Chromium, Firefox and WebKit, on 28 lines each. A to C equal the unit's reading in each engine. D and E add the toolbar's toggle on docs pages and on the storyless page, and a new visit to that page. At each line, the preview's `data-theme` and the toolbar's icon are the theme that the URL's global names, and the preview has rendered. |
| The preview and the manager have one source | **Holds.** The theme is the `theme` global. The manager's toolbar reads it with `useGlobals`. The preview applies only what the story's context or the channel reports. `ThemeToggleLink` reads the preview's `data-theme` to choose the next value, and sets it only through `UPDATE_GLOBALS`. Outside the records in the root's and the packages' `.plan/` directories, nothing refers to `THEME_EVENT`, `THEME_CHANGED`, `replaceState`, `top.location` or a `theme=` parameter. |
| **Witness (RF-154):** dark at A3 and A4, light at B5 | **Holds,** and reproduces line for line in Chromium. The same lines read the same in Firefox and WebKit. |
| The entry's condition: the global first, and `applyQueryParams` only if the architect rules for it | **Met.** The head uses no `applyQueryParams`. The global holds on docs pages, through `DocsContainer`, across navigation and across reload, in each engine. So the condition for stopping didn't arise. |
| **RF-155:** every colour in drag's stories is a `--md-sys-color-*` property or derived from one, so that each story follows the theme | **Holds.** The ten properties that the sheet uses are each defined twice in `.storybook/theme.css`: for `:root` and for `html[data-theme="dark"]`. The sheet and the three story files contain no other colour. In each engine, every element of the eight stories changes its colour, background and drawn border between light and dark, and so does the placeholder in each sortable story. Only the shadows stay the same, because `--md-sys-color-shadow` is `#000000` in both themes. |
| **Witness (RF-155):** each drag surface's dark background differs from its light one and from the fixed values | **Holds,** and reproduces line for line in Chromium. |
| drag's stories test keeps passing | **Holds:** 8 of 8 in Chromium locally, and in CI's `firefox` and `webkit` jobs. |

**Mutations.** `RD-62` property 5. Each mutation ran in Chromium, Firefox and WebKit. _Caught_ means that some line differs from the unmutated run in a way that breaks the property.

| Mutation | What it removes | Chromium | Firefox | WebKit | Group |
| --- | --- | --- | --- | --- | --- |
| `toolbar-local-state` | the toolbar reading the global: it keeps its own state | caught: B4 stays dark, the icon is wrong from A4 on | same | same | the mechanism |
| `docs-link-sets-attribute` | the docs toggle going through the global: it sets `data-theme` itself | caught: C2's dark is lost at C3 and the URL never changes | same | same | the mechanism |
| `only-decorator` | both channel listeners | caught: the storyless page is never themed (D8 to D10, E1) | same | same | the mechanism |
| `globals-updated-off` | the `GLOBALS_UPDATED` listener | caught: the toolbar can't switch the storyless page to light (D9) | same | same | the mechanism |
| `list-fixed` | a surface: the list's background back to `#f7f2fa` | caught in the 3 stories that use `.list` | same | same | the mechanism |
| `hint-fixed` | text: the hint back to `#49454f` | caught in all 8 stories | same | same | the mechanism |
| `placeholder-fixed` | the placeholder: its border back to `#6750a4` | caught in the 4 sortable stories | same | same | the mechanism |
| `decorator-off` | the decorator | survives | survives | survives | doubted |
| `set-globals-off` | the `SET_GLOBALS` listener | survives | survives | survives | doubted |
| `only-globals-updated` | the decorator and `SET_GLOBALS`, on the theme path | survives | survives | survives | doubted |
| `only-globals-updated-drag` | the same, on standalone `iframe.html` loads of the drag stories | survives | survives | survives | doubted |
| `global-types-off` | the `globalTypes` declaration | survives | survives | survives | doubted |
| `initial-globals-off` | `initialGlobals` | survives: the preview is right at every line, and the URL says `theme:light` where it would drop the global | same | same | doubted |

- **No mutation is caught in one engine and not in another.** Each caught mutation fails the same lines in the three engines.
- **The second group of property 5 doesn't apply.** The path is the Storybook channel between two frames and CSS custom properties. Nothing in it is a mechanism that the property lists as engine-dependent, so every mutation is also in the first or the third group.
- **The implementer's record has no mutations of its own.** Its witnesses are before-and-after readings against the entries' readings at `d6f6cf60b`.
- **RF-155's witness reads backgrounds only.** The unit's probe reads `backgroundColor` of five selectors and starts no drag, so by reading it can't catch `hint-fixed` or `placeholder-fixed`. The entry's witness clause asks only for backgrounds, so this isn't a finding. This pass's drag probe catches both in each engine.

## Old links

**Nothing that the entries or the docs require depends on the old format.**

- `RF-154` leaves undecided what a new visit opens with, and its required property is about the theme that the reader last chose, not about a link.
- The docs pages say only _"Works with the global Storybook light/dark theme toggle"_, which still holds.
- `docs-smoke` reads no theme, and the repository deploys no site that a reader could have linked to.

At the head, in each engine, `theme=dark` opens light in the manager and in a standalone `iframe.html`, and `globals=theme:dark` opens dark in both ([reading](checks/old-link.txt)).

**One recorded instrument does depend on the old format:** box-quad's reading, below as `reviewer-1`. The other `theme=` URLs in the records are the entries' original probes, which the unit adapted and whose original run it kept, and readings already taken, which stand. The paragraph of [box-quad's Storybook plan](../../../packages/box-quad/.plan/storybook-plan.md) that describes the retired decorator's `replaceState` is a dated reason for an earlier amendment, and it stands as well.

## Findings

### reviewer-1: box-quad's story reading takes its dark screenshots with the parameter that the head ignores

**Tier B,** because it is an instrument that box-quad's record has rerun for each change to the stories. It would be tier C if the architect reads the script as a closed unit's record and not as a standing instrument. Owner: the architect, for box-quad's record.

- **What happens:** [`stories-reading.ts`](../../../packages/box-quad/.plan/probes/storybook-demo/stories-reading.ts), `BQ-21`'s reading of the box-quad stories, opens each story for its screenshots as `iframe.html?id=box-quad--<id>&viewMode=story&theme=<theme>`. It writes `screenshots/<id>-dark.png` from the `dark` pass.
  - Before #323, the preview read `theme` from `window.top.location`. For a standalone `iframe.html`, that is the frame's own URL, so the pass was dark.
  - At the head, nothing reads that parameter. In each engine, the URL opens with `data-theme=light` and the body `rgb(255, 255, 255)` ([reading](checks/old-link.txt)).
  - The script waits only for `#storybook-root > *`, so it reports no error.
- **Why it is a problem:** three dated notes in box-quad's plan record a run of the script, the last for `BQ-21`'s acceptance, rerun. Each run retook the screenshots and compared them with the committed ones. The next rerun would overwrite the four committed `*-dark.png` files with light renderings, under their dark names and with no error. The script's other readings, the overlay corners and the _Pointer Delta_ drag, don't depend on the theme.
- **Evidence:** the script's `storyUrl` (line 75) and its screenshot loop (from line 300); `packages/box-quad/.plan/plan.md`, `BQ-21` and the notes that rerun it; the four committed `*-dark.png` files; [old-link.txt](checks/old-link.txt).
- **Required property:** a recorded reading that box-quad reruns reads the dark theme in the form that the head applies. If it isn't rerun, the record says it reads only before #323.

### reviewer-2: one of the preview's three ways of applying the global carries every path read

**Tier C.** Internal to the docs site, and nothing that a reader sees differs. Owner: the architect, who decides whether the two other mechanisms stay, as cover for a path not read, or go. That decision may be a cleanup pass's.

- **What happens:** the preview applies the theme in three places: the decorator, from the story's context; a `SET_GLOBALS` listener; and a `GLOBALS_UPDATED` listener.
  - Removing the decorator, the `SET_GLOBALS` listener, or both changes no reading, in any engine. That covers the 28 lines of the theme path and the standalone `iframe.html` loads of all eight drag stories.
  - With only the decorator, the storyless page is never themed. Without `GLOBALS_UPDATED`, the toolbar can't switch it to light.
- **The cause, by reading:** Storybook 10.6.7's preview emits `GLOBALS_UPDATED` on every story and docs render, after `SET_GLOBALS`. It does so in `renderSelection`, for a story and for a docs entry alike (`storybook/dist/preview/runtime.js`, near line 37126). It emits it again on each `UPDATE_GLOBALS` (`onUpdateGlobals`, near line 35985). So every load, navigation and toggle reaches that listener.
- **Why it is a finding of this lens:** the implementer's note gives the reason for the listeners as _"because a docs page runs no decorator of its own"_. That is the reason for `GLOBALS_UPDATED`, and the storyless page shows it. No path read needs `SET_GLOBALS`, or the decorator alongside the listener. Two mechanisms that the record names are therefore unwitnessed: removing either one survives in the three engines.
  - A path not read where `SET_GLOBALS` might still matter: a story whose file fails to load, where the preview emits `SET_GLOBALS` at initialization but may not reach the `GLOBALS_UPDATED` that follows `STORY_PREPARED`. A hot update of `preview.ts` emits `SET_GLOBALS` and then re-renders the selection (near line 37018), so it reaches the listener too.
  - `globalTypes` also survives its removal. With `initialGlobals` alone, the URL's global is still accepted.
- **Evidence:** [mutations.txt](checks/mutations.txt): `decorator-off`, `set-globals-off`, `only-globals-updated`, `only-globals-updated-drag`, `only-decorator`, `globals-updated-off`, `global-types-off`.
- **Required property:** each mechanism that the record gives a reason for has a path that needs it, or the record says that it is redundant cover and for what.

## Observations

- **In dark, a row or tile is the page's colour.** Their background, `surface-container-lowest`, is `rgb(11, 15, 7)`, the same as the dark page's body. They sit on the list's and the grid's `rgb(25, 29, 19)`, so they stay distinct from their container. Contrast wasn't read.
- **`initialGlobals` is what drops the global from the URL for light.** Without it, the preview is still right, and the URL says `globals=theme:light` after a toggle back.

## CI

`verify`, run [45978438003](https://github.com/ausginer/material-x/actions/runs/45978438003), `pull_request`, on `be4f7eee2`: **success**. `records` and `deploy` were skipped ([lines](checks/ci.txt)).

- `static`, `docs` and `measurements` passed.
- `chromium` ran 193 files, `firefox` and `webkit` 137 each.
- The affected file, drag's `tests/stories.browser.test.ts`, passes 8 of 8 in each of the three jobs.

## Queue

**No open issue's description stops holding because of this record:** it changes no entry. #317 and #318 close with #323.