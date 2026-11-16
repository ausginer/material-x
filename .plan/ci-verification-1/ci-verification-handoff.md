# Handoff: CI verification, first unit

**Recipient:** the implementer. **Branch:** `ci/verification`. **Input:** the architect's record commit that adds this handoff, from `a8726c57d`.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-6`: the workflow, the pinned image, the engine selection, coverage and the aggregate check;
- `repo:RD-7`: measurement rows and the size comment;
- `repo:RD-8`: the checks that fail today, the reading at `a8726c57d`, and the stops;
- `repo:RD-2`: the order and acceptance this unit works toward, and its reporter rule (dated 2026-11-05);
- `repo:RF-29` and `repo:RF-32`, which `RD-8` takes into this unit;
- `drag:DRO-18`: WebKit doesn't run locally.

The [design](ci-verification-design.md) describes the workflow and the owner's setup. Where a decision and the design disagree, the decision is authoritative.

**Scope:** `.github/workflows/`, `codecov.yml`, `.devcontainer/devcontainer.json`, `.scripts/`, the root and package `Justfile`s, lint and format configuration, `packages/*/tests/`, `packages/drag/bench/size/measure.ts`, `packages/drag/vitest.engines.config.ts` (deleted), the `.plan/` files that `RD-8` property 3 formats, and new findings in the `repo` and `drag` registers. **No product source under `packages/*/src/` changes,** apart from lint repairs that change no emitted behavior. `docs.yml` doesn't change.

## Owner preconditions

From the design §5. Ask through the coordinator for any that is missing when you reach the item that needs it. Don't guess.

- **The image digest** (step 1), needed by item 6. Until you have it, do items 1 to 5.
- **`CODECOV_TOKEN`** (step 2), needed in item 7 for the upload to succeed.
- **A pull request that is not a draft,** from `ci/verification` to `main` (step 3), needed by item 7. Open it yourself only if the owner's prompt authorizes it. Never merge it.

## 1. One engine selection (`RD-6` property 4)

- `MX_TEST_ENGINES` in `.scripts/vitest-config.ts`, with the behavior and names `RD-6` property 4 states. Visual projects, node projects and declaration projects are declared once, whatever the variable says.
- In a run whose list doesn't include `chromium`, no Chromium browser project is declared, so the Firefox and WebKit jobs run only their engine's projects together with the node and declaration projects. A CI job selects only the browser projects with `--project`.
- Delete `createDragAllEnginesTestConfig` and `packages/drag/vitest.engines.config.ts`. drag's `test-engines` sets `MX_TEST_ENGINES=chromium,firefox,webkit` against `vitest.config.ts`. It runs the same browser and shipped projects under the same names as at `a8726c57d`. Whether it also runs drag's node projects is your choice. Say which in the report.
- `assignGroupOrder` still gives each browser project its own group, so `RD-3` and the one-shot release hold with three engines in one process.
- Each browser project's non-Chromium variants take over the existing `isChromium`-style conditions. Add such a condition to a row in another package only where the row needs a Chromium-only instrument (`RD-6` property 6). A row that fails for any other reason falls under `RD-8`.

## 2. Measurement rows (`RD-7` properties 1 to 3)

- Declare the Vitest tag `measurement` in the shared factory, with a one-line description. Before relying on it, confirm against Vitest 5.1.0 that `--tags-filter` selects and excludes tagged rows, including inside `it.each`.
- Split each composition in `size.node.test.ts` into a graph row (`present`, `absent`) and a ceiling row (ceiling and control). Only the ceiling row carries the tag. `violations` can split into two functions or take a selector. The messages stay word for word, and `npx just size` still prints and exits as before.
- Tag the two allocation rows in `hot-path.browser.test.ts`. Search every package for any other row that matches `RD-7` property 1, and list what you found and what you didn't tag, with reasons.

## 3. Machine-readable sizes and the size report (`RD-7` property 5)

- Each instrument that the root `just size` runs gives a machine-readable reading on request: `bench/size/measure.ts` for drag, and size-limit's `--json` for `box-quad` and `core`. A reading names the package, the row, the Brotli bytes, the gzip bytes where the instrument reports them, and the row's limit.
- A repository script under `.scripts/` combines a head reading and an optional base reading into the comment's Markdown, with the hidden marker. It is pure: it takes files and writes text, and it calls no network. It has `repo` node tests for a row that grew, shrank or stayed the same, a row added or removed, a row over its limit, and a missing base reading.
- The workflow posts or updates the comment. That is the only step that writes to the pull request.

## 4. Static checks (`RD-8` properties 2 and 3)

- Lint stops reading `.plan/` directories. Use the lint configuration, not a disable comment in a file.
- Format the tracked `.plan/` files that `fmt-check` reports. Check that the diff is whitespace only. If any file's data changes, stop.
- Repair every lint error under `RF-32`'s required property. Rerun each package's lint after its oxlint errors are gone, because ESLint was never reached in some packages.
- On a fresh checkout after `npm ci`, the root `just fmt-check`, `just lint` and `just typecheck` exit 0. Generated files, such as material-x's `main.styles.css`, are not checked there. If they are checked after a build, make the check skip generated output.

## 5. The local inventory and its dispositions (`RD-8`)

- Run the root suite in Chromium, with coverage and without `measurement` rows, as CI will. Then run every browser project except visual in Firefox. List every failing row with its file, its engine, its first error line, and whether it failed in all five runs.
- Handle each row under `RD-8` properties 2 and 4. `RF-29`'s `tproc` row is the first one. Register each disabled row as a finding: `drag:DRF-` for drag, and `repo:RF-` from `RF-33` for everything else. Each finding states the required property, and the marking cites the finding's address.
- Stop under `RD-8` property 5. Report the inventory as it is at the stop.

## 6. The workflow (`RD-6`, `RD-7` property 4)

- `.github/workflows/verify.yml`, with the triggers, jobs, image, permissions and aggregate check that `RD-6` states, and the measurement job that `RD-7` states. The jobs and their commands are in the design §3.
- `codecov.yml`: project and patch statuses are informational. Coverage covers source under `packages/*/src/`, not tests, fixtures, `.scripts/` or build output.
- `.devcontainer/devcontainer.json` names the same digest. A `repo` node test asserts that the workflow and the devcontainer name the same image reference, and that the reference is a digest and not a tag.
- The reporter rule from `RD-2` (2026-11-05): each test job reads the exit status and keeps a base-family reporter.
- Each job's `timeout-minutes` is about twice its slowest observed duration in item 7.

## 7. CI readings and the WebKit and visual dispositions

- Push `ci/verification`. On the pull request, read the four gate jobs and the measurement job. **Pushing intermediate states of this branch for CI readings is part of this unit.**
- Handle WebKit failures under `RD-8`, as in item 5. The local five-run test for intermittent failures becomes three CI runs of the job.
- **The visual suite in CI:** confirm that the `chromium` job's Chrome is 157.0.8103.38 and that every committed baseline matches. If one doesn't, stop (`RD-8` property 5). Don't re-record it.
- Iterate until `verify` passes, the Codecov upload succeeds, and the measurement job posts the comment with "no base reading", since `main` has no machine-readable reading yet.

## Checks

- Every check in items 1 to 7, with its output saved under `.plan/ci-verification-1/` and cited.
- **Engine selection:** the project list (`vitest list --json` or an equivalent that only lists) for the default, for `MX_TEST_ENGINES=firefox`, and for all three engines, at the root and for drag. drag's `test-engines` names equal those at `a8726c57d`.
- **Measurement tag, with mutations:** lowering one drag ceiling by 1 B fails only that ceiling row, under both `npx just test` and `--tags-filter measurement`. The run with `!measurement` passes. Adding to a composition's fixture an import of a module that its `absent` list forbids fails that composition's graph row under `!measurement`. Revert both.
- **Measurement job:** on the pull request, with one ceiling lowered by 1 B in a pushed commit, the comment and the summary report the excess, the job and `verify` succeed, and the run's conclusion is success. Revert the commit and push again.
- **The gate:** on the pull request, with one intentionally failing gate row in a pushed commit, `verify` fails. Revert and push again.
- **Draft:** marking the pull request as a draft and pushing skips every job. Ask the owner to do this if you can't.
- The Verify steps of [`handoff.md`](../../.agents/docs/handoff.md) for every changed file.

## Stops

`RD-8` property 5, a formatted `.plan/` file whose data changes (item 4), and any requirement in `RD-6` or `RD-7` that the tools can't meet as written. Report each stop with its output. Don't change a decision's requirement to get past it.

## Report

`.plan/ci-verification-1/ci-verification-report.md`: each item's changes as `file:line`, the inventory with each row's handling and finding, each check and its result, the CI run links, the job durations, any stop, and the commits.

The unit stops at the pushed report, with `verify` green on the pull request. Next, the architect reads the report. The owner turns on the branch rule after the pull request is merged (design §5, step 5).