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

## 1. Repair `RF-46`

**Required property:** Vite builds with a `rolldown` inside its declared range (`~1.2.18` for 8.3.8), and every other consumer keeps the version it declares. `tsdown`, `rolldown-plugin-dts`, `@ydinjs/vite-traits-plugin` and `@ydinjs/vite-custom-element-assets` declare 1.3.

- **The preferred form:** a nested npm override that pins `vite`'s `rolldown` to Vite's range. The root `overrides` and `rolldown: "$rolldown"` stay. Its form, as npm documents nested overrides, is `"vite": { ".": "$vite", "rolldown": "~1.2.18" }`. A short comment can't go in `package.json`, so the report states why the override exists and when it goes: when the `vite` in use declares the `rolldown` the rest of the repository uses (`vite@8.4.0-beta.1` declares `~1.3.2`).
- **Alternative:** removing `rolldown` from `overrides`, if npm then nests a copy inside Vite's range under `vite` and dedupes the rest. Choose the form that gives the tree above with the smaller lockfile change, and report `npm ls rolldown` for it.
- **Not adopted:** moving the whole repository back to `rolldown` 1.2, because `tsdown` 0.23.7 needs 1.3, and the drag measurements were read at 1.3.2. Not `vite@8.4.0-beta.1` either, because the repository doesn't adopt a prerelease without the owner.
- **Checks:**
  - `npm ls rolldown` shows Vite's copy inside Vite's range, and every other consumer on 1.3.2;
  - `npx just typecheck` passes. `RF-31`'s cause was a type mismatch between Vite's `Plugin` and Rolldown's types, so two copies may reopen it;
  - `npx just build-lib` in each package that has the recipe passes. Report any size change in a published build;
  - after `npx just docs-build`, `.docs` holds no `__vitePreload` call with a 32-hex token after its dependency array. Report the `grep -rE` used, and its count before and after;
  - `just docs-smoke` (item 2) fails before the repair and passes after. This is the discriminating witness.
- **Stops:**
  - if typecheck, a library build, or a test fails because of the two copies, stop and report it. Don't repair a plugin's types here;
  - if npm can't give the tree above, stop.

  The fallback then is the owner's choice: wait for Vite 8.4, or adopt its prerelease.

- **No upstream report is owed.** The repository ran Vite outside its declared range. If item 1 finds a defect that the range doesn't explain, stop and report it with a minimal reproduction for the owner.

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
2. **The witness run and the pull request need the owner's authorization.** The witness is the manual `verify` run on the branch. The pull request is a non-draft one from `repo/docs-gate-1` to `main`, for the green run. **The architect recommends authorizing both.** Open them only if the owner's prompt authorizes it, and never merge the pull request. The ruleset requires the branch to be up to date with `main`, so bring `main` in with a merge, not a rebase.
3. **Visible change:** the _Publish Docs_ workflow is removed, and Pages deployments show in `verify`'s runs. If the owner wants a separate docs workflow, the fallback is the first _Not adopted_ alternative, at a second build per push to `main`.
4. **Only if item 1 stops:** wait for Vite 8.4, or adopt `vite@8.4.0-beta.1`. Until a repair merges, the deployed site stays broken.

## Review before merge

A targeted feature-proof review reads the diff from `4e85ac046` to the head. It covers:

- `deploy`'s condition and permissions, and that no job a pull request runs holds `pages: write` or `id-token: write`;
- `verify`'s `needs`, and the witness run;
- the smoke check against `RD-14` property 6, including that it can't pass vacuously: an empty `index.json` or a page that never reports must fail;
- the dependency tree against item 1's property.

It records at `.plan/reviews/docs-gate-1/feature-proof-claude.md`, and the architect decides its findings.

**Stopping boundary:** the report is committed and pushed, with the pull request open and green if that was authorized. The review follows.