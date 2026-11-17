# Report: the gate requires a docs site that loads

**Handoff:** [`docs-gate-handoff.md`](docs-gate-handoff.md), with item 1 as amended at `8061619c7`. **Input:** `d7125f464` on `repo/docs-gate-1`. **Pull request:** [#30](https://github.com/ausginer/material-x/pull/30), not a draft. **Governing records:** `repo:RD-14` property 6, `repo:RD-6` properties 3, 8 and 9, and `repo:RF-46`, in [`../00-index.md`](../00-index.md).

**State: items 1, 2 and 3 done, and the feature proof's remediation R1 to R4. No stop was hit.** The witness run failed at the smoke check, and the pull request's run is green. The coordinator reads `deploy` after the merge.

## Commits

| Commit | Content |
| --- | --- |
| `5e1828d06` | Items 2 and 3: `.scripts/docs-smoke.ts`, `just docs-smoke`, the `docs` and `deploy` jobs in `verify.yml`, `docs.yml` removed, `test-architecture.md` §CI policy |
| `bbb7b13ee` | The architect's amended item 1 (`8061619c7`), merged |
| `3b38426cf` | Item 1: `vite` 8.4.0-beta.1, and the readings under `checks/` |
| `948390aa5` | `docs`'s `timeout-minutes`, and this report |
| `81c9fe47e`, `c97b671be` | The feature proof, and the architect's disposition with R1 to R4 |
| the remediation's commit | R1 to R3 in `.scripts/docs-smoke.ts`, R4 in this report, and the witnesses under `checks/` |

## 2. The smoke check: `just docs-smoke`

`.scripts/docs-smoke.ts` reads `.docs` and builds nothing. The root `Justfile` recipe `docs-smoke` runs it.

- **The base path** is read from the built `iframe.html`. The preview's entry script is `${base}assets/iframe-*.js`, because Vite emits every asset under `${base}assets/`. No second definition of `/material-x/` exists. A build without that script stops the check.
- **Serving:** `node:http` on `127.0.0.1` at a free port. Only paths under the base are served, and a directory serves its `index.html`.
- **What it loads:** `index.html`, then `iframe.html?id=<id>&viewMode=<type>` for every entry of `index.json`, then `api/index.html`. That is 102 pages: 83 stories, 17 docs entries and the two other pages. Four pages are checked at a time, each in its own page of one Chromium.
- **The completion signal.** An init script puts an accessor on `globalThis.__STORYBOOK_ADDONS_CHANNEL__`, which Storybook's preview assigns when it installs its channel (`setChannel` in `storybook/dist/preview/runtime.js`). The accessor subscribes to the channel before the preview renders. An entry passes on `storyRendered` or `docsRendered`. `storyErrored`, `storyThrewException`, `storyMissing`, `playFunctionThrewException` and `configError` fail it. The other two pages passed on `load`; after R2 the manager waits for its embedded preview's events, and only `api/index.html` passes on `load` ([remediation](#remediation-of-the-feature-proof)).
- **It fails on** `pageerror`, a console message of type `error`, `requestfailed` or a 4xx/5xx response under the server's origin, a Storybook error event, and a 30-second timeout per page. The output names the page and each message. There is no allow list, and no existing story logged an error.
- **It can't pass vacuously** ([`checks/vite-preload-tokens.txt`](checks/vite-preload-tokens.txt), mutations run on temporary copies):
  - with no completion event subscribed and a 3-second timeout, the 100 Storybook pages time out and the check exits 1;
  - an `index.json` with no entries stops it before any page loads.
- **Runtime:** locally 14 s on the broken build and 21 s on the repaired one. In CI the step took 10 s and 21 s.

## 3. The gate job and the move

- **`docs`** in `verify.yml`: checkout, setup-node with the npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npx just docs-build`, `npx just docs-smoke`, then `upload-pages-artifact` at `docs.yml`'s pin. It skips a draft and runs on `ubuntu-24.04` with `NODE_VERSION`. It has only the workflow's `contents: read`: `docs.yml`'s `build` declared the same permission again at job level, and the other gate jobs don't.
- **`verify`'s `needs`** is `[static, chromium, firefox, safari, docs]`. Its step is unchanged.
- **`deploy`** moved unchanged, apart from `needs: docs`. A diff of both moved jobs against `docs.yml` at `4e85ac046` shows only that line, the build job's new name, its removed job-level `contents: read`, and the two new steps. `deploy`'s `if` requires `refs/heads/main` and a push or a manual run, so a pull request's run skips it. It is the only job that holds `pages: write` or `id-token: write`, and it isn't in `verify`'s `needs`.
- **`docs.yml`** is deleted. `verify.yml`'s header and `test-architecture.md` §CI policy say what the handoff lists.
- **`timeout-minutes: 5`** for `docs`: twice its longest observed run, 2 min 7 s, rounded up. The first draft used `docs.yml`'s 20. The two observed runs are the witness (1 min 53 s) and the green run (2 min 7 s). The file's timeout comment now names this report.
  - **It stays at 5** (the architect's point (a)). When no preview reports at all, the smoke check outlasts the job: the timeout cancels it, the `FAIL` lines already printed name the entries reached, `verify` fails, and the job ends as timed out.
- **One difference from `docs.yml`, by design:** `verify.yml`'s concurrency group for a push is `verify-<sha>`, where `docs.yml`'s was per run. A manual run on `main` at the sha of a running push now waits for that push's run. Nothing is cancelled, because `cancel-in-progress` is only true for pull requests.
- **Not run:** actionlint, as in the findings unit. GitHub accepted the file in both runs.

## 1. `RF-46`: `vite` 8.4.0-beta.1

**The change:** `npm i -D vite@8.4.0-beta.1`. Root `package.json` names `"vite": "8.4.0-beta.1"`, and `overrides` is unchanged. In the lockfile only three entries move, as the architect's reading E listed:

- `vite` 8.3.8 to 8.4.0-beta.1;
- `postcss` 8.5.32 to 8.5.33;
- `napi-windows-process-start-time` 0.1.0 is added.

**Vite's changelog, 8.3.8 to 8.4.0-beta.1.** The beta is the only release in that range, and no entry is marked breaking. None of the following has a use in the repository, which `git grep` for `rollupOptions`, `devSourcemap`, `configLoader` and transform-hook `meta` confirms:

- `optimizeDeps.rollupOptions` is removed (#23760);
- `--configLoader=runner` is deprecated (#23714);
- `css.devSourcemap` moves to `dev.sourcemap.css` (#23765).

Other entries the repository could reach:

- the transform hook's `meta` keeps `magicString` and `ast` (#24067);
- CSS: no externalization by default for SSR (#24075), empty CSS files are not emitted (#24059), and failed CSS preloads are retried (#23710);
- `es-module-lexer` moves to v3 (#23603);
- two rolldown-related dependency updates (#24028, #24104).

No entry names the malformed preload call itself.

**Checks.**

| Check | Before (8.3.8) | After (8.4.0-beta.1) |
| --- | --- | --- |
| `npm ls vite rolldown` ([`checks/npm-ls.txt`](checks/npm-ls.txt)) | one `vite` 8.3.8, one `rolldown` 1.3.2, outside Vite's `~1.2.18` | one `vite` 8.4.0-beta.1, one `rolldown` 1.3.2, inside Vite's `~1.3.2`. No `invalid` or `overridden` mark |
| `npm ci` | — | passes locally twice from an emptied `node_modules`, and in every CI job of the pull request's run |
| Malformed preload calls: `grep -rEoc '[])][0-9a-f]{32}' .docs --include='*.js'` | 48, in 5 files | 0 |
| `just docs-smoke` ([before](checks/docs-smoke-before.txt), [after](checks/docs-smoke-after.txt)) | 2 of 102 pass. 100 throw `SyntaxError: missing ) after argument list` | 102 of 102 pass |
| `npx just typecheck` | — | passes |
| `npx just build-lib` (material-x is the only package with the recipe) | passes, no warning | passes, no warning. All 258 output files are byte-identical to the 8.3.8 build, so no published size changes |
| `npx just test`, Chromium, every project | 1881 of 1882. `drag:DRI-17`'s allocation row failed (30.4 against 16) | 1882 of 1882 |
| `npx just docs-build` output | no warning | no warning |
| `just docs-dev` | — | starts with no warning. `button-group-standard--playground` renders in its iframe and in the manager, with no console error and no `pageerror` |

**In CI, run 44018861028** ([`checks/green-run-44018861028.txt`](checks/green-run-44018861028.txt)): `static`, `chromium` (visual included), `firefox`, `safari`, `docs` and `verify` succeed, and `deploy` is skipped. `chromium` passing means that no visual comparison differed. No baseline file changed.

**Measurements.** On #30 the `measurements` job had no base reading: _"the merge base gave no machine-readable reading"_. For comparison, `main`'s run at `4e85ac046` is 44013920613.

- **Size rows:** each drag row equals its ceiling, and the others are below their limits. They measure tsdown builds, which the library comparison above shows to be byte-identical.
- **`drag:DRI-17`'s per-sample allocation row.** `drag:DRF-48` governs the row and holds these six readings:

  | Reading | Commit | Vite | Row | B per move |
  | --- | --- | --- | --- | --- |
  | CI 44013920613, `main` | `4e85ac046` | 8.3.8 | passed | — |
  | CI 44016421012 | `5e1828d06` | 8.3.8 | passed | — |
  | CI 44018861028 | `3b38426cf` | 8.4.0-beta.1 | failed | 44.79 |
  | CI 44020422663 | `948390aa5` | 8.4.0-beta.1 | failed | 20.77 |
  | local, before the Vite change | — | 8.3.8 | failed | 30.4 |
  | local, after the Vite change | — | 8.4.0-beta.1 | passed | — |

  Neither variance nor the beta is established as the cause. The row is outside the gate (`RD-7`).

**After the unit:** move to the stable `vite@8.4.0` when it ships, as an ordinary dependency update.

## The witness

**Run 44016421012**, a manual `verify` on the branch at `5e1828d06` with items 2 and 3 only ([`checks/witness-run-44016421012.txt`](checks/witness-run-44016421012.txt)):

- `docs` is `failure`, at `npx just docs-smoke`. 2 of 102 pages pass, and 100 fail with RF-46's `SyntaxError`;
- `static`, `chromium`, `firefox` and `safari` are `success`, and `measurements` is `success`;
- `verify` is `failure`;
- `deploy` is skipped.

**Run 44018861028**, the pull request at `3b38426cf` with item 1, is green, as above. **Run 44020422663**, at `948390aa5`, which set `docs`'s `timeout-minutes` and added this report, is green.

## Remediation of the feature proof

**Handoff:** [§Remediation of the feature proof](docs-gate-handoff.md#remediation-of-the-feature-proof), decided at `c97b671be` on the [feature proof](../reviews/docs-gate-1/feature-proof-claude.md) at `81c9fe47e`. **Governing:** `repo:RD-14` property 6 as amended. **No stop was hit.** Every reading below is local, on one build of the branch's head, with `.docs` restored from a copy after each mutation.

### R1. Requests outside the origin

- **The change:** each page routes every request whose URL's origin isn't the server's to `route.fulfill({ status: 200, body: '' })`, before any navigation. The route covers the page's frames, so the manager's embedded preview is answered the same way. The rules for `pageerror`, console errors, Storybook's error events, and failed or 4xx/5xx requests under the origin are unchanged. There is no allow list.
- **The header comment** states the property.
- **No page fails on the check's response.** On the unmodified build, 102 of 102 pass. The empty bodies for the Google Fonts stylesheets, the font files and MDN's video log no console error.
- **Witness** ([`checks/remediation-r1-witness.txt`](checks/remediation-r1-witness.txt)): `<link rel="stylesheet" href="https://docs-smoke.invalid/probe.css" />` added to the built `iframe.html`.
  - Before R1, with the script as the review read it: 100 preview entries fail on `console error: Failed to load resource: net::ERR_NAME_NOT_RESOLVED (https://docs-smoke.invalid/probe.css:0)`, and exit 1. `index.html` and `api/index.html` pass.
  - After R1: 102 of 102 pass, exit 0.
- **The review's M1 still fails** after R1: the 4 checkbox entries fail on `console error: probe-M1`, exit 1 ([`checks/remediation-probes.txt`](checks/remediation-probes.txt)).
- **Local time of `just docs-smoke`:** 17.3, 17.7 and 17.4 s on three runs. The same build took 50.9 s before R1, with the third-party requests fetched.

### R2. The manager

- **The change:** `index.html` is checked like an entry's page. The same init script and exposed function reach every frame, so the accessor on `__STORYBOOK_ADDONS_CHANNEL__` subscribes to the embedded preview's channel. The manager passes on `storyRendered` or `docsRendered`, and fails on the same error events. `api/index.html` keeps `load`. No second mechanism is added.
- **The entry the manager opens** when its URL names none is `drag-custom-behavior--resize-handle`: the manager redirects to `?path=/story/drag-custom-behavior--resize-handle`, and its iframe loads `iframe.html?id=drag-custom-behavior--resize-handle&viewMode=story`. Its stories chunk is `draggable.stories-CZVW8pwE.js`, which no other entry imports.
- **Witness** ([`checks/remediation-r2-witness.txt`](checks/remediation-r2-witness.txt)): `)` appended to that chunk, as the review's M2 did to `radio`'s.
  - Before R2: only `story drag-custom-behavior--resize-handle` fails. `index.html` passes. 101 of 102, exit 1.
  - After R2: `index.html` fails beside that entry, on the same `SyntaxError: Unexpected token ')'` and `storyMissing`. 100 of 102, exit 1.
  - The manager's failure lists `console error: SyntaxError…` and `storyMissing` twice each. The [recheck](../reviews/docs-gate-1/feature-proof-recheck-claude.md) read both `storyMissing` reports from the same `iframe.html` document, 1 ms apart, and neither from the manager's window. The console error is also logged twice. So the embedded preview reports the missing entry twice. Why wasn't read. A duplicate only adds a line to a page that is already failing, so it changes no verdict.
- **The review's M8 still fails:** `FAIL index.html`, `uncaught: Error: probe-M8`, exit 1.
- **M7, not a criterion:** a `throw` 1 s after `load` in `index.html` now fails, `uncaught: Error: probe-M7`, exit 1. The manager's preview rendered more than 1 s after `load` in this run. Under R3, a slower or faster render can change that result.

### R3. The observed period

No code change. The header comment states that a page is observed from navigation until its `load` event or its completion signal, whichever is later, and that an error raised after that is outside the check.

### Checks

- `.scripts/docs-smoke.ts`: `oxfmt`, `oxlint --fix`, `eslint --fix`, `oxfmt`, then `oxlint` and `eslint` report nothing. `npx tsc --noEmit -p tsconfig.json`, whose `include` names `.scripts`, passes. `npx just typecheck` checks the packages, which this remediation doesn't change, and wasn't run.
- Locally, `npx just docs-build && npx just docs-smoke` passes, 102 of 102.
- Markdown: `npx oxfmt`, and `git diff --check`. Lint doesn't apply to Markdown.
- **In CI,** the pull request's head: see [_The run of the remediation_](#the-run-of-the-remediation).

### The run of the remediation

**Run [44025945743](https://github.com/ausginer/material-x/actions/runs/44025945743)**, #30 at `9e3a39610` ([`checks/remediation-run-44025945743.txt`](checks/remediation-run-44025945743.txt)): `static`, `chromium`, `firefox`, `safari`, `docs`, `measurements` and `verify` succeed, and `deploy` is skipped.

| `docs` step | Time |
| --- | --- |
| `npm ci` | 1 min 26 s |
| `npx playwright install --with-deps chromium` | 22 s |
| `npx just docs-build` | 25 s |
| `npx just docs-smoke` | 31 s; the script reports 102 of 102 in 29.9 s |
| `upload-pages-artifact` | 2 s |
| the job | 3 min 0 s, inside `timeout-minutes: 5` |

The run of the commit that adds this reading changes only Markdown and a text file. The pull request's checks show it.

## Not verified

- **After the merge** (the coordinator's reading): `docs`, `verify` and `deploy` on the first push to `main`, and that the deployed site loads a story with no console error.
- **A separate fresh clone** wasn't made locally. `npm ci` from an emptied `node_modules`, and CI's fresh checkouts, stand in for it.
- **The measurements comparison** has no base reading on #30. It is read against `main`'s run instead.

**Next:** the [feature proof](../reviews/docs-gate-1/feature-proof-claude.md) is `81c9fe47e`, its disposition `c97b671be`, and its [recheck](../reviews/docs-gate-1/feature-proof-recheck-claude.md) of R1 and R2 `0cf610e94`. The owner merges #30, and the coordinator then reads `deploy` on the first push to `main`.