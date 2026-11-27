# PR #323, the remediation of `reviewer-1` and `reviewer-2`: recheck

**Files were read at:** `a265e732e`, the head of `repo/storybook-theme-1` and of PR #323, detached in slot d. **Diff reviewed:** `5a85ec385..618e86f3d`, the remediation, all of it. Also `618e86f3d..a265e732e`, the merge of `origin/main`, for what it touches: it changes only `packages/drag/src/sortable/operation.ts`, which no story-theme reading depends on.

**Governing record:**

- The [feature proof](feature-proof-claude.md) at `4a2a80452`.
- The architect's rulings of 2026-11-27 in `RF-154`'s entry in [`00-index.md`](../../00-index.md), at `5a85ec385`.
- The implementer's note after them, and the dated entry in box-quad's [`plan.md`](../../../packages/box-quad/.plan/plan.md).

**Lens:** recheck of what the remediation changed. Every claim comes from my own reading or from a run I made. The runs are in [`checks/recheck/`](checks/recheck/), and the scripts are in [`probes/recheck/`](probes/recheck/). The harness is the proof's `mutate.ts`, pointed at slot d, with three mutations added. Every edit was restored. `git status` was clean after each run, and `packages/box-quad/.plan/storybook-perf-trace.json` is neither present nor tracked.

**Verdict:** both rulings hold as written. Each witness fails without its fix. `verify` passes on `a265e732e` in the three engines. **No finding.** `reviewer-1` and `reviewer-2` are resolved.

## Scope

- **Read:** `.storybook/preview.ts` at the head; `stories-reading.ts`, its two outputs and the box-quad plan entry; `RF-154`'s corrected note; `globals-updated-only.txt`.
- **Ran:**
  - box-quad's `stories-reading.ts` on `.docs` built by `aube exec just docs-build` at the head: unmutated, and two mutations.
  - The proof's theme probe and drag loads against `storybook dev`: unmutated in Chromium, and the theme probe also in Firefox and WebKit. Three mutations in Chromium.
- **Not read:** the deployed site, real Safari, touch, and a story whose file fails to load, which the architect accepted as a cost.

## reviewer-1: box-quad's story reading

**Resolved.** The ruling's three points hold.

- **The story's URL:** `storyUrl` writes `&globals=theme:<theme>`. No `theme=` reader is left in `.storybook` or in any package's source.
- **The refusal:** `openStory` reads `document.documentElement.dataset.theme` after two animation frames. It throws _"`<id>`: the preview's theme is `<applied>`, not `<theme>`"_ when that isn't the theme it opened.
  - The check covers light as well. A preview that applied no theme gives `undefined`, and the story is refused.
- **The rerun** ([runs](checks/recheck/stories-reading-runs.txt), `none`):
  - The script exits 0. Its output in Firefox, Chromium and WebKit equals the committed `stories-reading.txt` after that file's header.
  - The rerun rewrote all eight screenshots, and `git status` stays clean, so each is byte-equal to the committed one.
  - The four committed `*-dark.png` files are dark: mean luma 21.0 to 31.7, and the corner pixel is the dark page's `rgb(11, 15, 7)`. The light ones read 236.4 to 247.6, with a white corner pixel.

| Mutation | Result |
| --- | --- |
| `old-link`: `globals=theme:${theme}` put back to `theme=${theme}` (the ruling's witness) | **Killed.** It exits 1 at the first dark story with _"live-demo: the preview's theme is light, not dark"_. Only `live-demo-light.png` was written before the error, and it is byte-equal to the committed file. Its output from the screenshot heading on equals the implementer's `stories-reading-old-link.txt` |
| `no-refusal`: `old-link`, with the refusal disabled | The run exits 0. It rewrites the four `*-dark.png` files as light, with mean luma 236.4 to 247.6 and a white corner pixel, and leaves the four light files unchanged. This is the proof's failure. The refusal alone is what catches it |

The ruling's last point asks that a differing screenshot be committed with its reason. None differs, so none is owed. The dated entry in box-quad's plan records the run and both outputs, and its links resolve.

## reviewer-2: one mechanism in the preview

**Resolved.** The preview has one mechanism, and each mechanism the record now gives a reason for has a path that needs it.

- **What is left:** at the head, `.storybook/preview.ts` keeps the `GLOBALS_UPDATED` listener and `initialGlobals`. The decorator, the `SET_GLOBALS` import and listener, and `globalTypes` are gone.
- **The comments:** the listener's says that Storybook reports the globals on that event for every story render, every docs render and every update, so it themes a docs page and a storyless page, which run no decorator. This is the ruling's reason.
- **The note:** `RF-154`'s note is corrected in place, with the old sentence quoted.

**Unmutated** ([runs](checks/recheck/preview-runs.txt)):

- The theme probe's 28 lines are identical to the proof's unmutated runs, in Chromium, Firefox and WebKit, with runs of spaces collapsed. `check.sh` finds no line whose preview or toolbar icon differs from the URL's global, in any of the three.
- The drag loads' 16 lines are identical in Chromium.
- So the head reads as the proof read at `be4f7eee2`. That matches the implementer's `globals-updated-only.txt`.

| Mutation, Chromium | Result |
| --- | --- |
| `listener-off`: the `GLOBALS_UPDATED` listener a no-op | **Killed:** all 28 lines differ, and each has `preview=null`. The URL's global and the toolbar still follow the toggles, so only the preview loses the theme |
| `listener-off-drag`: the same, on the drag loads | **Killed:** every story reads `data-theme=undefined` in both passes. No element changes colour, and each dark placeholder equals the light one |
| `head-initial-globals-off`: `initialGlobals` removed, now that `globalTypes` is gone | **Killed:** 17 of 28 lines differ. `globals=theme:dark` in the URL loads light (B1, E1), and no toggle takes effect (A2, C2, D2, D7 stay `globals=null`, light) |

- **`head-initial-globals-off` differs from the proof's `initial-globals-off`,** which still had `globalTypes` and survived.
  - At the head, `initialGlobals` is the only declaration of the global. Without it, Storybook neither accepts the global from the URL nor keeps an update to it.
  - So the comment's reason holds: _"Naming the global here lets Storybook accept it from the URL, and drop it from the URL for light"_.
  - The global is now also needed for the toggles.

## CI

`verify` run [46058282379](https://github.com/ausginer/material-x/actions/runs/46058282379), `pull_request`, on `a265e732e101709a944b40a8ec6577e75804c731`: **success**. `records` and `deploy` were skipped ([lines](checks/recheck/ci.txt)).

| Job | Files | Rows | drag's `tests/stories.browser.test.ts` |
| --- | --- | --- | --- |
| `chromium` (140706244816) | 193 passed | 5573, 2 expected fail, 12 skipped | 8 of 8 |
| `firefox` (140706244769) | 137 passed, 1 skipped | 4394, 3 expected fail, 203 skipped | 8 of 8 |
| `webkit` (140706244848) | 137 passed, 1 skipped | 4395, 2 expected fail, 203 skipped | 8 of 8 |

`static` passed. `docs` passed with `docs-smoke`'s 129 of 129 pages.

## Findings

**None.** Both earlier findings are resolved as the rulings require, and the recheck found nothing new.

## Observations

- **`stories-reading-old-link.txt` is an excerpt.** It starts at the screenshot heading. The run's earlier lines are its passing Firefox and Chromium readings, which come before that heading. The file's header doesn't say it is an excerpt. Nothing in it is wrong, and the part it keeps is the run's own output, line for line.

## Queue

**No open issue's description stops holding because of this record:** it changes no entry. #317 and #318 still close with #323.