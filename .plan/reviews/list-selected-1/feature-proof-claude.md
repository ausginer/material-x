# A selected list button item says `aria-current` (RF-132): feature proof

**Lens:** `reviewer`, feature proof of [`RF-132`](../../00-index.md) with the ruling of 2026-11-25 (`LS-1` to `LS-4`) and the implementer's note, for #238 and pull request #288. Requested by the coordinator.

**Commit read:** `0d88cace2` on `material-x/list-selected-1`, with `main` at `ee0afea12` merged (`b625ed955`). The branch is behind `origin/main`, and it was read at its head, without a merge. "`main`" below is the four sources of the unit at `ee0afea12`.

**Outcome: accepted. No finding.** In Chromium, Firefox and WebKit, a selected `mx-list-button-item` gives its button `aria-current="true"` and nothing that the button role doesn't support. Each engine's tree exposes it as current, and axe-core reports no violation. A host's `aria-current` comes first. The link item is as before. Removing `useSelectable` leaves no user and changes no other export. The rows and witnesses read the same in the three engines. Three observations are at the end.

## Scope and method

- **Each engine's tree:** the architect's [probe](../../list-selected-1/probes/selected.mjs) on the head's built packages, with axe-core 4.14.1. It covers ten items: never selected, was selected, selected, selected and disabled, a host's `aria-current="false"` and `"page"`, a host's `aria-pressed` alone and with `aria-current="false"`, and a selected link item. It reads Chromium's protocol tree and internal tree, Firefox's accessibility service and WebKit's inspector ([readings](checks/trees.txt)).
- **The affected files,** one engine at a time: material-x's `tests/list`, `aria-own-value` and `traits-baseline`, in the `browser` and `spec` projects, and core's whole suite ([readings](checks/rows.txt), [script](probes/eng.sh.txt)).
- **Mutations:** the implementer's eight with his [program](../../list-selected-1/probes/mutate.mjs), and four of my own ([program](probes/own.mjs.txt)), in each engine ([readings](checks/mutations.txt)).
- **The sizes:** `just size-reading` at the head and with `main`'s four sources ([readings](checks/sizes.txt)).
- **The surface:** a search of the tree for `useSelectable` and `aria-selected` outside the record, core's `package.json` exports and `files.json`, and the pull request's description.
- **Not read:** a screen reader, Safari, the visual project, the docs build (CI's `docs` passes), and core's typecheck (CI's `static` passes).
- **Corrected during the work:** my first trees in Firefox and WebKit read a host's `aria-current` lost to the button's `"true"`. A run of `traits-baseline` rebuilds material-x's shipped output, and the last of my mutations, the value written on the host, had been built by it. The source was clean. After a rebuild of both packages from it, the three engines read as below. The rows and mutations run on source, so they aren't affected.

## Properties

| Property | Reading |
| --- | --- |
| `RF-132` | **Holds.** axe-core reports no violation in the three engines. The only remarks are _needs review_ `aria-allowed-attr` on a host's own `aria-pressed`, which is `LS-4`'s accepted limit. On `main` it was `aria-allowed-attr`, critical, on each selected item. A selected item says that it is selected in each tree: Chromium's internal `ariaCurrentState=true`, Firefox's attribute `current=true` and state `current`, and WebKit's `current: "true"`. |
| `LS-1` | **Holds.** The button has `aria-current="true"` while selected, and no `aria-*` of selection never selected or after deselection, in the three engines. A host's `aria-current="false"` and `"page"` come first, in the DOM and in each tree. The rows of `aria-own-value` say so in every order. A disabled, selected item says _current_ in the three. |
| `LS-2` | **Holds.** `useInteractiveListItemCore` writes the value that each item passes. The link item says `aria-current="page"` in the three engines, as before. |
| `LS-3` | **Holds.** `useSelectable` is gone. No source, story, page, document or test outside the record names it, on the branch or on `origin/main`. `Selectable`, `SelectableProps` and `SELECTABLE_ATTRS` stay, with the `./traits/selectable.js` export and its `files.json` entry. Core's two rows of the hook are gone, and its other two pass in the three engines. |
| `LS-4` | **Holds as a limit.** A page's `aria-pressed` and `aria-current="false"` both reach the button. `aria-pressed` stays on the host, and axe-core asks for a review of it. The pull request's description states the limits. |

**The JSDoc** of `selected` has the ruling's exact words in both items.

**Rows,** without a mutation:

| Engine   |           material-x, 9 files | core, 28 files |
| -------- | ----------------------------: | -------------: |
| Chromium |                      428 pass |       362 pass |
| Firefox  |           416 pass, 2 skipped |       362 pass |
| WebKit   | 425 pass, 2 skipped, 1 failed |       362 pass |

The WebKit row that failed is in the sortable list's drop zone, which is outside this unit (observation 3).

**Witnesses,** of 57 rows, the same rows in the three engines:

| Mutation                                    |      Fail |
| ------------------------------------------- | --------: |
| None                                        |         0 |
| `main`'s sources                            |         7 |
| `"false"` when not selected                 |         4 |
| Nothing written                             |        12 |
| `"page"` on the button item                 |         6 |
| `"true"` on the link item                   |         6 |
| Written past `setOwnARIA`                   |         8 |
| `aria-pressed` in its place                 |        12 |
| `aria-selected` beside it                   |         6 |
| own: written once, at the first change      | 8, of 428 |
| own: written on the host                    | 6, of 428 |
| own: the selection written before `useARIA` |         0 |
| own: a disabled item says nothing           |         0 |

The counts are the implementer's in Chromium. For the two of mine that fail nothing, see observations 1 and 2.

**Sizes,** Brotli, against `main`'s four sources: `list/list-button-item` 4968 to 4928 (−40), `list/list-link-item` 5146 to 5172 (+26), `complete` 25924 to 25908 (−16). No other row of 36 moves, and no row of core does. These are the implementer's readings, and no row has a limit.

**CI** at `0d88cace2` passes: Chromium, Firefox, WebKit, static, docs and measurements among its checks. `deploy` and `records` are skipped.

## Observations

Not findings.

1. **The order of the write and `useARIA` doesn't matter here.** The ruling's list says that the value is set after `useARIA`. With the selection's `useAttributes` before `useARIA`, no row fails in the three engines. `useAttributes` calls the handler from `attributeChangedCallback`, after the constructor, so the writer is always registered by then. The mutation is equivalent, and the order kept is the one that `setOwnARIA`'s remark asks for.
2. **No row reads a selected item that is disabled.** The trees read _current_ for it in the three engines, which is `LS-1`. With `aria-current` dropped from a disabled item, no row fails.
3. **A sortable-list row failed in WebKit in 2 of 5 runs of `tests/list`:** _"should paint the drop zone in each frame while the commit of a pointer drop is pending"_, once without a mutation and once under a mutation that doesn't reach it. Alone, it passed three times. The load was 14 to 17 on 12 cores. Its items are static, and the unit's code isn't on its path. The cause wasn't read, and no entry names it.

## Verification of this report

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and the root format check. The relative links were checked against the files with a script. Lint doesn't apply to Markdown.