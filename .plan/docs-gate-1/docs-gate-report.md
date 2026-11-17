# Report: the gate requires a docs site that loads

**Handoff:** [`docs-gate-handoff.md`](docs-gate-handoff.md), with item 1 as amended at `8061619c7`. **Input:** `d7125f464` on `repo/docs-gate-1`. **Pull request:** [#30](https://github.com/ausginer/material-x/pull/30), not a draft. **Governing records:** `repo:RD-14` property 6, `repo:RD-6` properties 3, 8 and 9, and `repo:RF-46`, in [`../00-index.md`](../00-index.md).

**State: items 1, 2 and 3 done. No stop was hit.** The witness run failed at the smoke check, and the pull request's run is green. The coordinator reads `deploy` after the merge.

## Commits

| Commit | Content |
| --- | --- |
| `5e1828d06` | Items 2 and 3: `.scripts/docs-smoke.ts`, `just docs-smoke`, the `docs` and `deploy` jobs in `verify.yml`, `docs.yml` removed, `test-architecture.md` §CI policy |
| `bbb7b13ee` | The architect's amended item 1 (`8061619c7`), merged |
| `3b38426cf` | Item 1: `vite` 8.4.0-beta.1, and the readings under `checks/` |
| this report's commit | `docs`'s `timeout-minutes`, and this report |

## 2. The smoke check: `just docs-smoke`

`.scripts/docs-smoke.ts` reads `.docs` and builds nothing. The root `Justfile` recipe `docs-smoke` runs it.

- **The base path** is read from the built `iframe.html`. The preview's entry script is `${base}assets/iframe-*.js`, because Vite emits every asset under `${base}assets/`. No second definition of `/material-x/` exists. A build without that script stops the check.
- **Serving:** `node:http` on `127.0.0.1` at a free port. Only paths under the base are served, and a directory serves its `index.html`.
- **What it loads:** `index.html`, then `iframe.html?id=<id>&viewMode=<type>` for every entry of `index.json`, then `api/index.html`. That is 102 pages: 83 stories, 17 docs entries and the two other pages. Four pages are checked at a time, each in its own page of one Chromium.
- **The completion signal.** An init script puts an accessor on `globalThis.__STORYBOOK_ADDONS_CHANNEL__`, which Storybook's preview assigns when it installs its channel (`setChannel` in `storybook/dist/preview/runtime.js`). The accessor subscribes to the channel before the preview renders. An entry passes on `storyRendered` or `docsRendered`. `storyErrored`, `storyThrewException`, `storyMissing`, `playFunctionThrewException` and `configError` fail it. The other two pages pass on `load`.
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
- **`drag:DRI-17`'s per-sample allocation row** varies in both directions on unchanged code:

  | Run                      | Vite     | Result       |
  | ------------------------ | -------- | ------------ |
  | `main`'s CI, `4e85ac046` | 8.3.8    | passed       |
  | local                    | 8.3.8    | failed, 30.4 |
  | local                    | the beta | passed       |
  | #30's CI                 | the beta | failed, 44.8 |

  This is inferred to be variance in that row, not an effect of the beta. It is outside the gate (`RD-7`).

**After the unit:** move to the stable `vite@8.4.0` when it ships, as an ordinary dependency update.

## The witness

**Run 44016421012**, a manual `verify` on the branch at `5e1828d06` with items 2 and 3 only ([`checks/witness-run-44016421012.txt`](checks/witness-run-44016421012.txt)):

- `docs` is `failure`, at `npx just docs-smoke`. 2 of 102 pages pass, and 100 fail with RF-46's `SyntaxError`;
- `static`, `chromium`, `firefox` and `safari` are `success`, and `measurements` is `success`;
- `verify` is `failure`;
- `deploy` is skipped.

**Run 44018861028**, the pull request at `3b38426cf` with item 1, is green, as above.

## Not verified

- **After the merge** (the coordinator's reading): `docs`, `verify` and `deploy` on the first push to `main`, and that the deployed site loads a story with no console error.
- **The run of this report's commit**, which changes only `docs`'s `timeout-minutes` and Markdown. The pull request's checks show it.
- **A separate fresh clone** wasn't made locally. `npm ci` from an emptied `node_modules`, and CI's fresh checkouts, stand in for it.
- **The measurements comparison** has no base reading on #30. It is read against `main`'s run instead.

**Next:** the targeted feature-proof review that the handoff names, recorded at `.plan/reviews/docs-gate-1/feature-proof-claude.md`.