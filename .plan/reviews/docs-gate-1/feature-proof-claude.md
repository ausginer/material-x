# Docs gate, first unit — feature proof

**Commit files were read at:** `948390aa5e00291d8878d983e9a0ae612c7caa40` (`repo/docs-gate-1`, the main checkout, clean). **Diff reviewed:** `4e85ac046` (exclusive) → `948390aa5` (inclusive). **Records read at the same commit.**

**Governing records:** [`docs-gate-handoff.md`](../../docs-gate-1/docs-gate-handoff.md) items 1 to 3, with item 1 as amended at `8061619c7`, and its _Review before merge_; [`docs-gate-report.md`](../../docs-gate-1/docs-gate-report.md) and its readings under [`checks/`](../../docs-gate-1/checks/); `repo:RD-6` properties 3, 8 and 9 and `repo:RD-14` as amended, and `repo:RF-46`, in [`00-index.md`](../../00-index.md); `drag:DRF-48` in [drag's index](../../../packages/drag/.plan/00-index.md).

**Lens:** feature proof. Each item is read against the diff, the tree, the CI runs and my own readings. Nothing is repaired.

## Scope

**Covered.**

- `.github/workflows/verify.yml` line by line, and the deleted `docs.yml` at `4e85ac046`, compared job by job.
- `.scripts/docs-smoke.ts` line by line, the root `Justfile` recipe, and `.storybook/main.ts:55`.
- `package.json`, the lockfile delta, `npm ls vite rolldown --all` in the installed tree, and Vite's changelog at the `v8.4.0-beta.1` tag, read through the GitHub API.
- **Local runs in the devcontainer, at `948390aa5`:**
  - `npx just docs-build`, with the malformed-preload `grep` of the report;
  - `just docs-smoke` on a clean build;
  - eight mutations of the built `.docs` (table under _Readings_);
  - two probes of a scratch copy of `docs-smoke.ts`, one with every request outside the server's origin answered empty and one with them aborted.
- Every action pin, resolved through the GitHub API.
- Runs 44016421012, 44018861028 and 44020422663: their job results and the `docs` job's step times. The `measurements` logs of those three runs and of `main`'s 44013920613, for `drag:DRI-17`'s allocation row.
- `.agents/docs/test-architecture.md` §CI policy and the header comment of `verify.yml`, against handoff item 3.5 and 3.6.

**Not covered: these areas are unread, which isn't the same as clean.**

- I ran no typecheck, `build-lib`, `just test` or fresh-clone `npm ci`. For those, the report's readings and the green `static`, `chromium`, `firefox` and `safari` jobs stand.
- `deploy` hasn't run. After the merge, the coordinator reads it.
- I didn't inject a story whose render function throws, so `storyErrored` and `storyThrewException` weren't triggered on their own. A module that throws while it loads (M4) failed through a console error and `storyMissing`.
- I didn't run actionlint, as in the report.
- `just docs-dev` was not started.

**Shared state.** `.docs` is ignored build output that other sessions in this checkout also use. I rebuilt it at `948390aa5` and restored it after each mutation from a copy. After the last mutation, `diff -rq` against the copy was empty.

## Items that hold, with no finding

- **The gate.**
  - `verify`'s `needs` is `[static, chromium, firefox, safari, docs]` (`:161`), and its step is unchanged.
  - `docs` skips a draft (`:140`) and runs on `ubuntu-24.04` with `NODE_VERSION`. It declares no permissions, so it gets the workflow's `contents: read` (`:22`–`:23`). Its steps are the seven the handoff lists, in the same order (`:144`–`:155`).
  - `deploy` has `needs: docs` (`:175`). Its `if` (`:176`), job-level `pages: write` and `id-token: write`, `github-pages` environment with its URL, and `pages` concurrency with `cancel-in-progress: false` and `queue: max` match `docs.yml` at `4e85ac046` character for character. Only the comment and `needs` differ.
  - Only `deploy` holds `pages: write` or `id-token: write`. A `pull_request` run's ref is `refs/pull/<n>/merge`, so `deploy` skips. It skipped in all three runs, including the manual run on the branch. `deploy` isn't in `verify`'s `needs`.
- **One build per event.**
  - `docs.yml` is deleted.
  - `baselines.yml` doesn't build the docs.
  - In `verify.yml`, only `docs` runs `docs-build`.
- **The deployed artifact is the one that was loaded.** `upload-pages-artifact` is the step after `docs-smoke` in the same job, and the script only reads `.docs`. If any earlier step fails, the upload is skipped. In the witness run, `upload-pages-artifact` was `skipped`.
- **The witness, read through `gh run view`:**
  - **44016421012** ran `workflow_dispatch` on the branch at `5e1828d06`. `docs` failed at `npx just docs-smoke`, with `upload-pages-artifact` skipped. `static`, `chromium`, `firefox` and `safari` succeeded. `verify` failed, and `deploy` was skipped.
  - **44018861028**, the `pull_request` run at `3b38426cf`, and **44020422663**, the `pull_request` run at `948390aa5`, are green, with `deploy` skipped. 44020422663 is the run that the report lists as not verified.
- **`docs-smoke` against `RD-14` property 6 and handoff item 2.**
  - **Every entry:** `Object.values(index.entries)` gives 100 entries, 83 of type `story` and 17 of type `docs`. With `index.html` and `api/index.html` that makes 102 targets. Each entry loads `iframe.html?id=<id>&viewMode=<type>`.
  - **The base path:**
    - it is read from `iframe.html`'s module script (`:73`–`:79`), which is one of the handoff's two options, and the report says which;
    - it equals `viteConfig.base`, `/material-x/`, at `.storybook/main.ts:55`;
    - the server answers 404 to any path outside the base (`:104`–`:107`).
  - **No allow list.** Every console message of type `error`, and every `pageerror`, is recorded unconditionally.
  - **It can't pass vacuously:**
    - M6: an `index.json` with no entries exits 1 before any page loads;
    - the report's mutation A: a preview that never reports times out;
    - if Storybook renamed its channel global, every preview would time out in the same way.
  - **Each failure class fails.** M1 to M4 and M8 under _Readings_ fail, and each names the entry and the message.
  - **Locally:** `docs-build` then `docs-smoke` gave 102 of 102, in 16.3 s.
- **The repair.**
  - **One `vite` and one `rolldown`:** `npm ls vite rolldown --all` lists `vite@8.4.0-beta.1` and `rolldown@1.3.2` once each, and every other occurrence is `deduped`. No line is marked `invalid` or `overridden`. The installed Vite declares `rolldown` `~1.3.2`.
  - **The lockfile delta is the report's, exactly:**
    - the root entry's `vite` pin;
    - `vite` 8.3.8 → 8.4.0-beta.1, with its `rolldown` range `~1.2.18` → `~1.3.2`, `postcss` `^8.5.32` → `^8.5.33`, and the new optional dependency;
    - `postcss` 8.5.32 → 8.5.33;
    - `napi-windows-process-start-time` 0.1.0 added, optional, `os: win32`.
  - **The pin and the overrides:** `package.json`'s only change is `"vite": "8.4.0-beta.1"`, which is exact. `overrides` still holds `"vite": "$vite"` and `"rolldown": "$rolldown"`. Nothing under `packages/` changed, so the two plugins' `peerDependencies` are unchanged.
  - **No malformed preload call:** `grep -rEo '[])][0-9a-f]{32}' .docs --include='*.js'` finds 0 in my build. The minified output has no literal `__vitePreload(`, so this token `grep`, which found 48 before the repair, is the one that discriminates.
  - **The changelog reading holds.**
    - `8.4.0-beta.1` follows `8.3.8` directly, and its changelog has no _Breaking Changes_ section.
    - The three deprecations and removals the report names are the only ones. `git grep` finds none of `rollupOptions`, `devSourcemap`, `configLoader` or `fs.strict` outside Markdown.
    - Three other reachable entries aren't in the report: escaped import specifiers (#24074), worker chunks in the manifest (#23699), and pure CSS chunk imports matched by relative path (#24105). None conflicts with a reading the report gives.
- **Workflow hygiene.**
  - **Pins:** every `uses:` in `verify.yml` is a 40-hex hash, and each one resolves to the tag in its comment. That covers `checkout` v7.0.1, `setup-node` v7.1.0, `upload-artifact` v7.0.2, `codecov-action` v7.1.1, `upload-pages-artifact` v5.0.0, `configure-pages` v6.0.0 and `deploy-pages` v5.0.1. `upload-pages-artifact`'s hash is `docs.yml`'s.
  - **Concurrency:** the workflow's group (`:18`–`:20`) and `deploy`'s `pages` group are unchanged. Two observations, neither introduced by this unit, so neither is a finding:
    - **Pending runs can be replaced.** The report says that _"nothing is cancelled"_ in the `verify-<sha>` group on `main`. That holds for two runs. The workflow-level group has no `queue`, so under GitHub's rule a third run at the same sha cancels the second while the second is pending.
    - **Deploy order is not guaranteed.** Two pushes to `main` at different shas run in parallel, and their `deploy` jobs queue in `pages` in the order they arrive. An older push whose `docs` finishes later deploys last. `docs.yml`'s group per `run_id` behaved the same way.
- **Comments and documents.**
  - `verify.yml`'s header names the docs build and its loading, and the deployment from `main` (`repo:RD-14`).
  - §CI policy gains the gate item, cites `repo:RD-14`, and has one sentence on the deployment. Nothing else in the file changed.

## Findings

### reviewer-1 — `docs-smoke`'s result depends on third-party hosts

**Tier B.** An instrument the repository relies on is unsound: the required check can fail for a reason outside the tree.

- **Current behavior.**
  - `.storybook/preview-head.html` loads two Google Fonts stylesheets and preloads two font files from `fonts.gstatic.com` in every preview page. One story also loads a video from `interactive-examples.mdn.mozilla.net`.
  - The script restricts `requestfailed` and 4xx/5xx to the server's origin (`:196`–`:207`). It records every console `error` from any origin (`:190`–`:195`), and Chromium logs a console error for a failed cross-origin load.
  - Each preview page also waits for `load` (`:231`–`:234`), and `load` waits for those cross-origin fonts.
  - `browser.newPage()` opens a new context for every target, so the fonts are fetched again for each of the 100 preview pages.
- **Evidence.** Each probe used a scratch copy of the script, against the same build:

  | Requests outside the origin | Result | Wall time |
  | --- | --- | --- |
  | Fetched from the network, local container | 102 of 102 pass | 50.0 s and 51.6 s, with 16.4 s of user CPU |
  | Answered `200` with an empty body | 102 of 102 pass | 12.4 s |
  | Aborted (`internetdisconnected`) | **2 of 102 pass** | 12.1 s |
  - **With the requests aborted,** each of the 100 preview pages fails with four console errors such as `Failed to load resource: net::ERR_INTERNET_DISCONNECTED (https://fonts.gstatic.com/…)`, and one also fails on the MDN video.
  - **The same build ran in 16.3 s** earlier in this session. A single fetch from this container took 1.0 s for the Roboto stylesheet and 1.4 s for one 365 KB symbol font.

- **Why it is a problem.**
  - If Google Fonts or MDN's media host is down, `docs` fails, so `verify` fails on every pull request, and `deploy` is held on `main`. Nothing in the tree has to change for this to happen.
  - If those hosts are slow, every page waits on them. Each page has a 30-second budget, and the job has 5 minutes.
- **The contract.** Read literally, the implementation conforms. Handoff item 2 scopes failed requests to _"a resource under the site's origin"_, and it fails on _"any console message of type `error`"_ with no allow list. Those two rules disagree about third-party resources. Which one governs is the architect's decision, so this isn't a defect for the implementer.
- **Required property:** `docs-smoke`'s result is decided by the built site and the pinned browser, and a third-party host's availability or latency neither fails nor passes it. Otherwise, `RD-14` property 6 states that the gate depends on those hosts.
- **Routed** to the architect.

### reviewer-2 — The manager page passes on `load`, so it passed on `RF-46`'s broken build

**Tier B.** The instrument has a gap: one listed target can't fail on the class of defect it is meant to show. Its priority within the tier is low, because each entry's own page caught `RF-46`.

- **Current behavior.** `index.html`, the manager, is checked like `api/index.html`: it passes on `load` (`:235`–`:237`), and the page is then closed.
  - The manager renders after `load`, and so does its preview iframe.
  - The manager runs repository code: `.storybook/manager.tsx` registers the theme-toggle addon.
- **Evidence.**
  - In [`docs-smoke-before.txt`](../../docs-gate-1/checks/docs-smoke-before.txt), the two pages that passed on the broken build are `index.html` and `api/index.html`. `RF-46`'s owner report was the manager's URL.
  - **M7:** a `throw` 1 s after `load` in `index.html` gives 102 of 102, exit 0.
  - **M8:** the same `throw` at parse time fails `index.html`.
- **The contract.**
  - `RD-14` property 6 lists the manager among the pages loaded, and says the check fails on any uncaught exception.
  - Handoff item 2 says that _"the non-Storybook pages"_ pass on `load`. The manager is Storybook's own page, but it has no index entry, so whether that rule covers it is open.
- **Required property:** an error that the manager throws or logs while it starts fails the check. Otherwise, the record states that the manager is checked only up to `load`.
- **Routed** to the architect.

### reviewer-3 — An error after an entry's render event is caught for some entries and missed for others

**Tier B**, low priority within the tier. The instrument's verdict on one defect depends on timing.

- **Current behavior.** A preview page settles on its first terminal channel event (`:210`–`:216`), and is closed straight after (`:243`–`:245`). Nothing is observed after the render event.
- **Evidence. M5:** a `console.error` scheduled 500 ms after `list.stories` loads.
  - 3 of the list's entries failed: `docs list--docs`, `story list--draggable` and `story list--media`.
  - Its other entries passed, including `list--playground`, `list--content-density` and `list--interactive`.
  - The same defect was caught where the render was slower than 500 ms, and missed where it was faster. The defect is the same in every entry.
- **The contract.** Handoff item 2 says that _"A page passes when Storybook reports that its entry rendered"_, so the implementation conforms. A defect of this shape would make the gate flaky, not red.
- **Required property:** the record states how long a page is observed. Either an error after the entry's render event is outside the check, or the check observes a defined period after it.
- **Routed** to the architect.

### reviewer-4 — The report's evidence for `drag:DRI-17` omits two CI readings and doesn't cite `drag:DRF-48`

**Tier C.** It concerns the record only. The row is a measurement and never fails the run (`RD-7`).

- **Current behavior.** _Measurements_ in the report gives four readings, one pass and one fail for each Vite version, and calls the result variance. It doesn't name the open finding that governs this row.
- **Evidence.** The `measurements` logs:

  | Run                  | Commit      | Vite  | Row    | B per move |
  | -------------------- | ----------- | ----- | ------ | ---------- |
  | 44013920613, `main`  | `4e85ac046` | 8.3.8 | passed | —          |
  | 44016421012, witness | `5e1828d06` | 8.3.8 | passed | —          |
  | 44018861028, #30     | `3b38426cf` | beta  | failed | 44.79      |
  | 44020422663, #30     | `948390aa5` | beta  | failed | 20.77      |
  - In CI, the row split with the Vite version, 2 to 2. The witness run's pass and 44020422663's failure aren't in the report.
  - [`drag:DRF-48`](../../../packages/drag/.plan/00-index.md), which is open and routed to the architect, records the same row failing on Vite 8.3.8 in Chromium 158, at 36.5 and 28.2 B. The report's local 8.3.8 failure at 30.4 B agrees with it.

- **Why it is a problem.** The table supports neither "variance" nor "the beta". The governing record is `DRF-48`, and these readings aren't in it.
- **Required property:** the unit's record of the measurement rows that moved lists each CI reading of this row, and names `drag:DRF-48` as the open finding that governs it.
- **Routed** to the architect.

## The implementer's two points

**(a) The 5-minute timeout.** It holds as written. It's the narrowest margin of any job in the file, and the smoke check's failure path doesn't fit in it.

- **Set from the first green run.** 5 min against 2 min 7 s is 2.36 times, which is the rule handoff item 3.1 states.
- **Against all three runs,** the longest is 2 min 36 s, at `948390aa5`, so 5 min is 1.92 times. Across the same three runs, every other job is at 2.2 times or more:

  | Job        | Longest run | Timeout | Ratio |
  | ---------- | ----------- | ------- | ----- |
  | `chromium` | 6 min 40 s  | 15 min  | 2.25  |
  | `firefox`  | 9 min 4 s   | 20 min  | 2.21  |
  | `safari`   | 12 min 12 s | 30 min  | 2.46  |
  | `static`   | 2 min 30 s  | 10 min  | 4.0   |
  | `docs`     | 2 min 36 s  | 5 min   | 1.92  |

- **The variance is in the network-bound steps.** Across the three runs:
  - `npm ci` took 43 to 57 s, and `playwright install --with-deps` took 22 to 38 s;
  - `docs-build` took 16 to 19 s, and `docs-smoke` 10 to 21 s.

  `docs-smoke` adds its own network dependency (`reviewer-1`): locally, the same build took 12 s with the fonts stubbed and 50 s with them fetched.

- **The failure path.**
  - When no preview reports, each of 100 pages waits 30 s, four at a time, which is about 12.5 minutes.
  - The job's timeout cancels the step before that. The `FAIL` lines already printed stay in the log, and `verify` still fails, so the gate stays sound. The summary line and the remaining entries are lost, though, and the job ends as timed out rather than failed.
  - So handoff item 2's _"the report names the entry and the message"_ holds only for the entries reached before the timeout.
- **My view.** No defect against the handoff. The rule as written, applied to all three runs, gives about 5.2 minutes. Whether the timeout should leave room for the smoke check's own timeout path is the architect's call.

**(b) `drag:DRI-17`'s flip.**

- **The beta isn't established as the cause.** The row fails without it: `DRF-48` at 36.5 and 28.2 B, and the report's local run at 30.4 B. It also passes with it, in the report's local run.
- **Variance isn't established by the report's table either.** In the CI `measurements` job, the outcome follows the Vite version, 2 to 2. The highest reading so far, 44.8 B, is on the beta.
- **My view.**
  - Under item 1's _Stops_, this isn't a stop: the row is a measurement, it fails on 8.3.8 too, and the local `just test` passes on the beta.
  - The row belongs to `drag:DRF-48`, and these readings are evidence for it. Whether Vite's version moves the reading is a question for that finding, with more than two samples per version.
  - The report should cite `DRF-48` rather than call the result noise (`reviewer-4`).

## Readings

The mutations were made on the built `.docs` at `948390aa5`, which was restored after each one. Each ran `node .scripts/docs-smoke.ts`.

| Id | Mutation | Exit | Result |
| --- | --- | --- | --- |
| M0 | none | 0 | 102 of 102 (16.3 s on the first run; 50.0 s and 51.6 s later in the session, network-bound per `reviewer-1`) |
| M1 | `console.error("probe-M1")` at the top of `checkbox.stories-*.js` | 1 | 4 checkbox entries fail: `console error: probe-M1` |
| M2 | `)` appended to `radio.stories-*.js` | 1 | 5 radio entries fail: `console error: SyntaxError: Unexpected token ')'` and `storyMissing` |
| M3 | `icon.stories-*.js` moved away | 1 | 8 entries fail, icon's and list's: `HTTP 404`, `request failed`, and a console error for each |
| M4 | `throw new Error("probe-M4")` at the top of `fab.stories-*.js` | 1 | 6 FAB entries fail: `console error: Error: probe-M4` and `storyMissing` |
| M5 | `setTimeout(() => console.error("probe-M5-late"), 500)` at the top of `list.stories-*.js` | 1 | 3 list entries fail, and the others pass (`reviewer-3`) |
| M6 | `index.json` as `{"v":5,"entries":{}}` | 1 | `Error: .docs/index.json lists no entries` |
| M7 | `<script>setTimeout(() => { throw new Error("probe-M7") }, 1000)</script>` in `index.html` | 0 | 102 of 102 (`reviewer-2`) |
| M8 | `<script>throw new Error("probe-M8")</script>` in `index.html` | 1 | `FAIL index.html`, `uncaught: Error: probe-M8` |

**The probes.** Both are scratch copies of `docs-smoke.ts`. Each adds `page.route((url) => !url.href.startsWith(origin), …)` before the preview hooks. One answers with `route.fulfill({ status: 200, body: '' })` and the other with `route.abort('internetdisconnected')` (`reviewer-1`).