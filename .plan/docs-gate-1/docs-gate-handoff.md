# Handoff: the gate requires a docs site that loads

**Recipient:** the implementer.

**Branch:** `repo/docs-gate-1`, from `main` at `4e85ac046`. **Input:** the architect's commit that adds this file.

**Authorized** by the owner, relayed by the coordinator on 2026-11-17:

- `verify` requires the docs build, so a pull request that breaks the Storybook or API docs can't merge.
- **Added the same day:** the deployed site doesn't load (`RF-46`). Repair it, and have the gate prove that the built site works, not only that the build exits 0.
- There is no per-pull-request preview, which the owner declined. Deploy stays main-only.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-14`, amended 2026-11-17 by this decision, with its new property 6;
- `repo:RD-6` properties 3, 8 and 9, amended with it;
- `repo:RF-46`, with its [reading](checks/rf46-rolldown-probe.txt).

This decision answers the [findings unit](../findings-1/findings-1-handoff.md)'s owner question 2.

## The decision

**The docs build becomes a gate job of `verify.yml`. It builds the site and loads it in a browser. `deploy` moves with it, and `docs.yml` is removed.** One workflow builds the docs once per event. The gate checks that build, and on `main` the same build is deployed.

**Readings.**

- _Publish Docs_ passed on `main` at `4e85ac046` (run 44013920978): `build` took 88 seconds and `deploy` 14.
- `verify`'s `static` alone took about 2 minutes on the same push, and `chromium` and `safari` take longer. A docs job that also installs Chromium and loads about 100 pages stays well under the gate's longest job.
- The site that run deployed doesn't load (`RF-46`).

**Why this form.**

- **The required check doesn't change.** `verify` is the ruleset's one required check (`RD-6` property 8). The docs job joins `verify`'s `needs`, and the ruleset stays as it is.
- **One build, one definition.** A `docs` job beside `docs.yml` would build the docs twice on every push to `main`. Two files would also define the same build, which is why `RD-14` property 3 had to keep their Node and pins equal.
- **What deploys is what the gate built and loaded.** On `main`, `deploy` takes the artifact of the job that `verify` needs.
- **A loaded site, not an exit status.** `RF-46`'s build exited 0 and deployed a site that doesn't run.

**Not adopted.**

- **`docs.yml` kept for `deploy` only,** beside a `docs` job in `verify.yml`. That keeps the Pages token out of the gate's workflow. The cost is two builds per push to `main` and two definitions to keep equal. The token is held the same way in either form: a job that runs only for `main`, under the `github-pages` environment, which allows only `main`. `docs.yml` already runs on pull requests too.
- **`docs.yml`'s `build` as a second required check.** It splits `RD-6` property 8's one aggregate check, and it needs a ruleset change. `needs` can't reach across workflows.
- **`docs.yml` called from `verify.yml` as a reusable workflow.** The calling job would have to grant `deploy` `pages: write` and `id-token: write`. That adds a layer of indirection and solves nothing that moving the job doesn't.
- **`deploy` needing `verify`, not only `docs`.** A Safari flake on `main` would then hold the docs back.
- **The smoke check as a Vitest project.** `just test` runs in `chromium` and `static`, where no built site exists. Vitest's browser mode runs inside a page it serves, and can't drive a top-level page of another server.
- **Storybook's test runner.** It is a new dependency with its own runner, for one property that Playwright, already pinned, gives directly.
- **One story only.** `RF-46` would show in one story. A story whose own chunk breaks wouldn't, and each story is its own chunk.

## 1. Repair `RF-46`: adopt `vite@8.4.0-beta.1`

**Amended 2026-11-17 on the owner's decision,** relayed by the coordinator: the repository adopts the Vite beta, which declares `rolldown` `~1.3.2`, so the whole tree stays on one `rolldown`. The nested override that this item first preferred is now only the fallback, under _Stops_.

**Required property:**

- Vite declares a `rolldown` range that contains the one version the tree installs, 1.3.2;
- the built docs carry no malformed `__vitePreload` call;
- nothing else in the gate regresses.

**What the architect read** ([reading](checks/rf46-rolldown-probe.txt) D and E):

- a separate install of `vite@8.4.0-beta.1` resolves `rolldown` 1.3.2 and writes correct preload calls;
- on this branch, changing only the root pin, `npm install --package-lock-only` resolves with no conflict. The lockfile changes `vite`, `postcss` (8.5.32 to 8.5.33), and adds `napi-windows-process-start-time`, which is optional and Windows-only;
- `vite@8.4.0-beta.1` was published on 2026-11-16, and its `engines` (`^20.19.0 || >=22.12.0`) admit Node 26.

**The change:**

- **Root `package.json`:** the `devDependencies` entry `"vite": "8.4.0-beta.1"`, exact, as `.npmrc`'s `save-exact` writes it.
- **The root `overrides`:** unchanged. `"vite": "$vite"` takes the new pin, and it is what carries the beta to the `^8.0.0` peer ranges of `vitest` 5.1.0 and Storybook 10.6.7, which a prerelease doesn't satisfy by itself. `"rolldown": "$rolldown"` stays at 1.3.2.
- **The lockfile:** regenerated with `npm install`, and nothing else changes in it. If any other package moves, report it.
- **Not changed:** the `peerDependencies` of `@ydinjs/vite-traits-plugin` and `@ydinjs/vite-custom-element-assets` (`"vite": "^8.1.4"`). A published range doesn't name a prerelease, and the override covers the workspace.

**Checks.** The beta changes Vite under everything that runs on it, not only the docs.

- **Before the change,** read Vite's changelog from 8.3.8 to 8.4.0-beta.1. Report each breaking change, deprecation, or change to the `Plugin` types or to the build's defaults that this repository could reach.
- **The tree:** `npm ci` passes on a fresh clone, and `npm ls vite rolldown` shows one `vite`, 8.4.0-beta.1, and one `rolldown`, 1.3.2. Report any `invalid` or `overridden` mark.
- **Types:** `npx just typecheck` passes. `RF-31`'s cause was a clash between Vite's `Plugin` types and Rolldown's, so a change in the beta's `Plugin` can reopen it.
- **Libraries:** `npx just build-lib` passes in each package that has the recipe, with no new warning. Report any size change in a published build. The libraries build with `tsdown`, so none is expected.
- **Tests:**
  - locally, `npx just test` (Chromium, every project), with the same result as at `4e85ac046`;
  - in CI, the green run covers Firefox, Safari and visual. Vitest's server, its dependency optimizer and the browser providers all run on Vite.
  - **No visual baseline may change.**
- **Storybook:**
  - `npx just docs-build` passes;
  - `.docs` holds no `__vitePreload` call with a 32-hex token after its dependency array. Report the `grep -rE` used, and its count before and after;
  - `just docs-smoke` (item 2) fails before the change and passes after it. This is the discriminating witness;
  - `just docs-dev` starts, and a story renders in its iframe with no console error;
  - report any new warning in the Storybook build's output.
- **Measurements:** report the `measurements` job's rows that move between `4e85ac046` and the head. It never fails the run (`RD-7`).

**Stops.** Report the output, and don't work around it:

- `npm install` or `npm ci` refuses the tree, or `npm ls` shows a second `vite` or `rolldown`;
- typecheck, a library build, or a test fails because of the beta, where it passes at `4e85ac046`. Don't repair a plugin's types or a test here;
- a visual baseline differs;
- the Storybook build fails, or the smoke check fails for a reason other than `RF-46`'s.

**The fallback** after a stop is the owner's choice. **The architect recommends keeping one ready:** stay on `vite@8.3.8`, and pin `vite`'s own `rolldown` to its range with a nested override, `"vite": { ".": "$vite", "rolldown": "~1.2.18" }`. That gives Vite a second, older `rolldown` (`RF-31`'s risk), but it doesn't depend on a prerelease.

**After the unit:** move to the stable `vite@8.4.0` when it ships, as an ordinary dependency update. The report states this. It isn't owed in this unit.

**No upstream report is owed.** The repository ran Vite outside its declared range. If item 1 finds a defect that the range doesn't explain, stop and report it with a minimal reproduction for the owner.

## 2. The smoke check: `just docs-smoke`

`RD-14` property 6 states it. The details:

- **A script and a recipe.** Write `.scripts/docs-smoke.ts`, run by a root `Justfile` recipe `docs-smoke`. It reads the built `.docs` and doesn't build. A developer can run `just docs-build && just docs-smoke`.
- **Serving.** It serves `.docs` from a local HTTP server built on `node:http`, with no new dependency, at the base path the build was made for. That base is `viteConfig.base` in `.storybook/main.ts:55`, today `/material-x/`. Don't add a second definition that can drift: read the base from the built `iframe.html`, or from one constant both use. Report which.
- **The browser** is Playwright's pinned Chromium, from the `playwright` dependency (`RD-9`).
- **What it loads:**
  - the manager's `index.html`;
  - `iframe.html?id=<id>&viewMode=<story|docs>` for every entry in `.docs/index.json`;
  - `api/index.html`.

  A page passes when Storybook reports that its entry rendered, or for the non-Storybook pages, when the page has loaded. Use the preview's own completion signal, such as its channel's rendered and error events, rather than a fixed delay.

- **It fails on:**
  - any uncaught exception (`pageerror`);
  - any console message of type `error`;
  - any failed request, or 4xx or 5xx response, for a resource under the site's origin;
  - a render error that Storybook reports;
  - a timeout per page.

  The report names the entry and the message. **Not filtered:** if an existing story logs a console error, don't add an allow list. Stop and report the story and the message, and the architect decides.

- **Runtime:** report the recipe's time locally and in CI.

## 3. The gate job and the move

1. **`.github/workflows/verify.yml` gains `docs`,** a gate job:
   - checkout;
   - setup-node with the npm cache;
   - `npm ci`;
   - `npx playwright install --with-deps chromium`;
   - `npx just docs-build`;
   - `npx just docs-smoke`;
   - `actions/upload-pages-artifact` of `.docs`, at the pin `docs.yml` uses.

   It skips a draft pull request, as every gate job does. It runs on `ubuntu-24.04` with the workflow's `NODE_VERSION`, and has no permission beyond `contents: read`. For `timeout-minutes`, apply the file's rule, about twice the longest run observed, to the first green runs of this job. Report the figure.

2. **`verify`'s `needs` becomes `[static, chromium, firefox, safari, docs]`.** The step that requires every result to be `success` is unchanged.
3. **`deploy` moves into `verify.yml`, otherwise unchanged:**
   - `needs: docs`, and the same `if`;
   - `pages: write` and `id-token: write`, at job level;
   - the `github-pages` environment, with its URL;
   - job concurrency `pages`, with `cancel-in-progress: false` and `queue: max`.

   It isn't in `verify`'s `needs`. Its comment says that it holds the Pages token and runs only for `main`.

4. **`.github/workflows/docs.yml` is deleted.**
5. **Comments.** `verify.yml`'s header names the docs build and its loading among what the workflow verifies, and the deployment from `main` (`repo:RD-14`).
6. **`.agents/docs/test-architecture.md` §CI policy.** Nothing else in that document changes:
   - the gate list in its first paragraph gains _"the docs site, built and loaded in Chromium"_;
   - its third paragraph cites `repo:RD-14` beside the others;
   - one sentence states that the same workflow deploys that build from `main` only.

**Unchanged:** the triggers, the workflow's concurrency, every other job, the ruleset, and `just docs-build`. Draft pull requests skip every job, `docs` included (`RD-6` property 1).

## Order and the witness that `verify` fails

The defect itself is the witness. No artificial break is needed.

1. **Commit items 2 and 3 first, without item 1.** Locally, `just docs-build && just docs-smoke` fails, and the failure names `RF-46`'s syntax error. Save the output.
2. **Push. Run `gh workflow run verify.yml --ref repo/docs-gate-1`.** `verify.yml` is on `main`, so a manual run uses the branch's file. Read the run:
   - `docs` is `failure`, at `docs-smoke`;
   - `static`, `chromium`, `firefox` and `safari` are `success`;
   - `verify` is `failure`;
   - `deploy` is skipped.

   **Stop** if `verify` succeeds while `docs` fails.

3. **Commit item 1.** Locally, the smoke check passes. On the pull request's head, every gate job and `verify` succeed, and `deploy` is skipped.
4. **Read after the merge,** by the coordinator, not owed before it. On the first push to `main`:
   - `docs`, `verify` and `deploy` succeed;
   - <https://ausginer.github.io/material-x/> loads a story with no console error.

Save each run's job list, and the local outputs, under `.plan/docs-gate-1/checks/`.

**Also owed:**

- `npx oxfmt` on the changed Markdown and YAML;
- the handoff's TypeScript checks on `.scripts/docs-smoke.ts`;
- `git diff --check`;
- a reading of the expressions of the two moved jobs against `docs.yml`'s.

## The report

Write `.plan/docs-gate-1/docs-gate-report.md`. It covers:

- per item, what changed and the readings above, with run links;
- `npm ls rolldown` before and after;
- the smoke check's runtime and the docs job's timeout figure;
- anything not verified.

## Owner decisions and authorizations

1. **No ruleset change.** The required check stays `verify`.
2. **Authorized 2026-11-17 by the owner:** the manual `verify` run on the branch (the witness) and a non-draft pull request from `repo/docs-gate-1` to `main`, for the green run. Never merge the pull request. The ruleset requires the branch to be up to date with `main`, so bring `main` in with a merge, not a rebase.
3. **Decided 2026-11-17 by the owner:** `deploy` moves into `verify.yml`, and `docs.yml` is deleted. The _Publish Docs_ workflow goes, and Pages deployments show in `verify`'s runs.
4. **Decided 2026-11-17 by the owner:** the repair adopts `vite@8.4.0-beta.1` (item 1). **Only if item 1 stops:** the owner chooses the fallback, and the architect recommends the nested override. Until a repair merges, the deployed site stays broken.

## Review before merge

A targeted feature-proof review reads the diff from `4e85ac046` to the head. It covers:

- `deploy`'s condition and permissions, and that no job a pull request runs holds `pages: write` or `id-token: write`;
- `verify`'s `needs`, and the witness run;
- the smoke check against `RD-14` property 6, including that it can't pass vacuously: an empty `index.json` or a page that never reports must fail;
- the dependency tree against item 1's property, and the changelog reading.

It records at `.plan/reviews/docs-gate-1/feature-proof-claude.md`, and the architect decides its findings.

**Stopping boundary:** the report is committed and pushed, with the pull request open and green if that was authorized. The review follows.

## Disposition of the feature proof at `81c9fe47e`

**Decided 2026-11-17 by the architect** on `repo/docs-gate-1` at `81c9fe47e`, on the [feature proof](../reviews/docs-gate-1/feature-proof-claude.md), relayed by the coordinator. It amends `repo:RD-14` property 6 in [`../00-index.md`](../00-index.md), and adds the unit's readings to `drag:DRF-48` in [drag's index](../../packages/drag/.plan/00-index.md). **Nothing here needs the owner.**

| Finding      | Decision                                                      |
| ------------ | ------------------------------------------------------------- |
| `reviewer-1` | Fix now: R1                                                   |
| `reviewer-2` | Fix now: R2                                                   |
| `reviewer-3` | Fix now, in the record only: R3                               |
| `reviewer-4` | Fix now, in the record only: R4. `drag:DRF-48` holds the data |

**`reviewer-1`: the check answers every request outside its origin itself.** Item 2's two rules disagree because item 2 didn't say what the check does with a request that isn't the site's. The check now answers each such request without the network. The console-error rule stays unconditional, and there is no allow list.

- **Why:** the gate's verdict must come from the tree and the pinned browser (`RD-6`'s environment). Otherwise an outage at Google Fonts refuses every pull request and holds `deploy`, and a slow host spends the per-page budget. The review measured both effects.
- **The cost:** the check doesn't prove that the deployed site's fonts and video load from their hosts. It never proved that reliably, and a host's outage isn't a defect in the tree.
- **Not adopted:**
  - **Abort the requests and ignore their console errors.** That is an allow list, which item 2 refuses, and a filter on message text can hide a site defect with the same text.
  - **Apply the console-error rule only to errors about the site's own resources.** It needs the same filter on message text, and it still waits on the hosts.
  - **Self-host the fonts and the video in the docs build.** It changes the deployed site, which this unit doesn't own, to fix a property of the instrument. Whether the site should depend on Google Fonts and MDN is a separate question, and no one has raised it.

**`reviewer-2`: the manager passes when the preview it embeds reports its entry rendered.** The owner saw `RF-46` at the manager's URL, and property 6 lists the manager. The manager loads its preview after `load`, so a manager that passes on `load` can't show a defect of `RF-46`'s class. The embedded preview's render event requires the manager to have started, registered `.storybook/manager.tsx`'s addon and loaded the preview. It is the signal and the error events that an entry's page already uses, so no second mechanism is added. `api/index.html` keeps `load`, because it runs no repository code.

**`reviewer-3`: a page is observed until its `load` event or its completion signal, whichever is later, and not after.** This is what the script does today. The record now states it.

- **Why not a longer period:** every observed period has an end. A defect near the end is caught in some runs and missed in others, and a longer period moves the end without removing it. A quiet period after the render event is the fixed delay that item 2 refuses, and it costs time on every page.
- **What the check is for:** a page that doesn't start. That means a chunk that doesn't parse or load, or an entry that doesn't render. Behavior after the first render belongs to the component tests.
- **Timing can't make the check fail on a correct site.** A result that depends on timing is always a real error, caught in some runs.

**`reviewer-4`: agreed.** The report's readings establish neither variance nor the beta as the cause. The row is `drag:DRF-48`'s, and the six readings are now dated there.

**The implementer's two points.**

- **(a) `timeout-minutes: 5` holds, and doesn't change.** It meets item 3.1's rule against the first green runs. R1 removes the smoke check's wait on third-party hosts, which is the largest variable part that the review measured. When no preview reports at all, the smoke check outlasts the job: the timeout cancels it, the `FAIL` lines already printed name the entries reached, `verify` fails, and the job ends as timed out. That is accepted. A timeout of about 13 minutes would only add a summary line in a case where every page fails in the same way.
- **(b) `drag:DRI-17`'s result** isn't a stop under item 1, as the reviewer reads it. `DRF-48` governs it.

**The concurrency observations** in the review are older than this unit. The review records them as observations, not findings, and they aren't decided here.

## Remediation of the feature proof

**Recipient:** the implementer. **Branch:** `repo/docs-gate-1`. **Input:** the architect's commit that adds this section, a child of the review's commit `81c9fe47e`. **Governing:** `repo:RD-14` property 6 as amended, and the section above.

### R1. Requests outside the origin

- **Required property:** on every page the check opens, every request whose URL isn't under the server's origin gets a response from the check before it reaches the network. That response must not make Chromium report an error. The review's probe answered an empty `200`, and 102 of 102 pages passed (the feature proof's _The probes_).
- **Unchanged:** the rules for `pageerror`, console errors, Storybook's error events, and failed or 4xx/5xx requests under the origin. There is no allow list.
- **The script's header comment** states the property.
- **Witness.** In the built `.docs/iframe.html`, add `<link rel="stylesheet" href="https://docs-smoke.invalid/probe.css" />`. A `.invalid` host never resolves, so the reading needs no network.
  - With the script at `81c9fe47e`, the preview entries fail on a console error.
  - After R1, 102 of 102 pass.
  - Restore `.docs` afterwards.
- **The review's M1** still fails after R1.
- **Report** the local time of `just docs-smoke` after R1.
- **Stop** if a page fails after R1 because of the check's response, for example on a console error about an empty body. Report the page and the message. Don't filter them, and don't add a response per resource type.

### R2. The manager

- **Required property:** `index.html` passes when the preview it embeds reports that its entry rendered. It uses the same rendered events as an entry's page, and fails on the same error events. `api/index.html` keeps `load`.
- **Witness.** Read which entry the manager opens when its URL names none. Make that entry's stories chunk fail to parse, as the review's M2 did.
  - With the script at `81c9fe47e`, `index.html` passes.
  - After R2, `index.html` fails, beside that entry's pages.
  - The review's M8 still fails.
  - Restore `.docs` afterwards.
- **Not a criterion:** the review's M7, a `throw` 1 s after `load`. Under R3, whether it is caught depends on how long the manager's preview takes to render. Report its result.
- **Stop** if the check can't see the embedded preview's events by the mechanism that entry pages use. Report what you read. The architect then decides between another mechanism and recording that the manager is checked only up to `load`.

### R3. The observed period

No code change. The script's header comment states that a page is observed until its `load` event or its completion signal, whichever is later, and that an error raised after that is outside the check (`RD-14` property 6).

### R4. The report

In [`docs-gate-report.md`](docs-gate-report.md):

- **_Measurements_:** replace `drag:DRI-17`'s table with the six readings that `drag:DRF-48` now holds. Remove _"inferred to be variance"_. State that neither variance nor the beta is established, and that `drag:DRF-48` governs the row.
- **The timeout:** state the failure path in point (a) above, and that `timeout-minutes` stays at 5.
- **A section for this remediation:** R1 to R3, with their witnesses and the local time. Add the run of the pull request's head, with the `docs` job's step times.

### Checks and stopping boundary

- **Owed:** the repository-level TypeScript sequence of [`handoff.md`](../../.agents/docs/handoff.md) on `.scripts/docs-smoke.ts`; `npx oxfmt` on the changed Markdown; `git diff --check`; locally, `just docs-build && just docs-smoke` passes.
- **In CI,** on the pull request's head: every gate job and `verify` succeed, and `deploy` is skipped.
- **Save** the witnesses' outputs under `checks/`.
- **Stopping boundary:** the remediation and the report are committed and pushed, and #30 is green. Don't merge it.
- **Then:** the reviewer reads R1 and R2 again with its own probes, the aborted-request probe and M7 included, and adds the reading to its record. This isn't a full review round. The owner merges after it.