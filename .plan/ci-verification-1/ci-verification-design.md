# CI verification — design

**Author:** the architect, on `ci/verification` at `a8726c57d`, 2026-11-16. **Input:** the owner's requirements, relayed by the coordinator, and the owner's additions and directions sent later the same day (§1). **Revised** at `81d4c91b1` on the owner's direction about the pinned environment (O9 to O12). **Decisions:** `repo:RD-6` to `repo:RD-9` in [`../00-index.md`](../00-index.md). This document describes the workflow those decisions require, how they fit `repo:RD-2`, and what the owner must set up. Where this document and a decision disagree, the decision is authoritative.

**First unit:** [`ci-verification-handoff.md`](ci-verification-handoff.md).

## 1. What the owner asked for

As relayed. The numbers are this document's, so that the decisions can cite them.

| # | Requirement |
| --- | --- |
| O1 | Triggers: a push to `main`, a pull request that is open and not a draft, and a manual run. Nothing else. |
| O2 | All of the project's unit tests, across packages, run in Chromium, Firefox and WebKit. This amends `test-architecture.md` §CI policy, which made Firefox and WebKit scheduled or manual. |
| O3 | Tests that fail today are disabled for now or repaired. The owner prefers repair where it is reasonable. |
| O4 | Coverage goes to Codecov. This is required. |
| O5 | A pull request gets a comment that reports how sizes changed. |
| O6 | Size, allocation and speed checks notify and never fail the build. |
| O7 | _(added)_ The visual screenshot suite is part of the gate, and it needs `RD-2`'s pinned environment. |
| O8 | _(added)_ The gate blocks merge: a branch rule requires the workflow to pass. Tests that fail today must therefore be repaired or disabled before the rule is turned on. |
| O9 | _(revision)_ CI runs on a plain GitHub-hosted runner. It pulls no development image and runs no job container. Chrome's version is pinned in the devcontainer and in CI, and updated deliberately when needed. |
| O10 | _(revision)_ Chromium is Playwright's, pinned by the locked `playwright` package, in the devcontainer and in CI. |
| O11 | _(revision)_ Visual tests render text in Roboto only, loaded as a web font from an npm package with a locked version, with no system font fallback. |
| O12 | _(revision)_ Nothing more is guarded in advance, such as fontconfig rendering settings or differences between operating systems. If the visual suite fails or turns intermittent in CI, the owner decides then. |

## 2. How the requirements fit `RD-2`

`RD-2` owes four deliverables in this order: a pinned environment, the workflow, the branch rule, and a baseline maintenance policy. It names neither WebKit nor Codecov. **The order holds, and none of the four is weakened.** The owner's requirements add to deliverable 2 and decide how deliverables 1 and 4 are met:

| `RD-2` deliverable | Met by | What the owner's requirements change |
| --- | --- | --- |
| 1. Pinned environment | `RD-9`: Playwright's locked Chromium and Roboto from a locked package, the same in the devcontainer and in CI | Not a container image (O9). `RD-2` named a _container image fixing OS, Chromium, fonts and icons_. The Chromium build and the fonts are pinned, and the operating system is not (O12). The baselines are re-recorded once |
| 2. The workflow | `RD-6`, with `RD-7` for measurements and `RD-8` for the rows that fail today | Firefox and WebKit run behavior and spec-contract tests in the gate (O2). The Codecov upload is part of the gate (O4). Size, allocation and speed checks leave the gate and are reported instead (O5, O6) |
| 3. The branch rule | The owner, after the first unit lands (§5, step 5) | O8 confirms it. The rule names one aggregate check, `verify`, so that adding or splitting jobs does not change the rule |
| 4. Baseline maintenance | `RD-9` property 6 | A `playwright` or Roboto version change is its own pull request, which re-records the baselines |

The pinned environment arrives in the same unit as the workflow, and lands before the visual result in CI is read. `RD-2` puts the environment first so that the visual half of the gate never runs without it. A single unit that lands the environment first and the workflow after it meets that.

**`drag:DRO-18`'s open question is answered:** WebKit is owed under `RD-2`, through `RD-6`. Until the first unit lands, no run covers WebKit, as `DRO-18` says.

**`RF-8` stays open** until all four of `RD-2`'s deliverables hold, which includes the owner's branch rule.

## 3. The workflow

One workflow file, `.github/workflows/verify.yml`, beside `docs.yml`. `docs.yml` does not change.

```text
 static     chromium     firefox     webkit        measurements
    │           │           │           │          (outside the gate:
    └───────────┴─────┬─────┴───────────┘           never fails, posts
                      │                             the size comment)
                   verify   ← the one required check
```

The jobs run in parallel. `verify` waits for the other four gate jobs. `measurements` is independent of all of them.

| Job | Runs | Environment | In the gate |
| --- | --- | --- | --- |
| `static` | `just fmt-check`, `just lint`, `just typecheck`, at the root | runner | yes |
| `chromium` | the root `vitest run`: every project, including node, declaration and visual, without `measurement` rows, with coverage. Uploads coverage to Codecov. Uploads screenshot attachments when it fails | runner, plus Playwright's Chromium | yes |
| `firefox` | the root `vitest run` with `MX_TEST_ENGINES=firefox`, browser projects only, without `measurement` rows and without coverage | runner, plus Playwright's Firefox | yes |
| `webkit` | as `firefox`, with `MX_TEST_ENGINES=webkit` | runner, plus Playwright's WebKit | yes |
| `verify` | succeeds only if all four jobs above succeeded | none | **the required check** |
| `measurements` | `measurement` rows in Chromium; sizes at the head and at the merge base; job summary; the pull-request comment | runner, plus Playwright's Chromium | no |

**Every job runs the repository's own recipes,** the commands a developer runs. A job that needs a step the recipes do not contain, such as a build before `just test` on a fresh checkout, has found a defect in the recipe, and the recipe is repaired. The workflow does not grow a private step.

**The runner.** Every job runs on GitHub's `ubuntu-24.04` runner, named by that label rather than `ubuntu-latest`, so the operating system changes only by an edit. Node's major version is named in the workflow. Each job installs its engine with `npx playwright install --with-deps <engine>`, which also installs the engine's system libraries, so each engine is the build that Playwright 1.65.0 pins. One operating system, one Node version and one lockfile per run, so a difference between two engine jobs is an engine difference and nothing else.

**The pinned visual environment** (`RD-9`). Chromium is Playwright's full build in new headless mode, at 158.0.8127.18 for Playwright 1.65.0. Text in the visual fixtures is Roboto from an npm package pinned by the lockfile, loaded as a web font, with no system font in the stack. The icon font stays vendored. The devcontainer installs the same Chromium and Firefox builds when it is created and when it starts. Its image's own Chrome takes no part in a test. The operating system is not pinned: the devcontainer runs Debian 13 and CI runs Ubuntu 24.04, and CI reproducing the devcontainer's baselines is the evidence that the difference doesn't matter. If it does matter, the owner decides (O12).

**Why coverage comes from `chromium` only.** Vitest's V8 coverage provider reads coverage through the Chrome DevTools Protocol. Firefox and WebKit have no equivalent, and the provider refuses them. The `chromium` job runs every project, including node and declaration, so its coverage covers everything the suite reaches. Firefox and WebKit contribute pass or fail, not coverage.

**Why the visual suite runs only in Chromium.** Its baselines are named per engine and platform (`radio-states-chromium-linux.png`), and only Chromium baselines exist. `test-architecture.md` §CI policy names a _curated Chromium visual suite_. Firefox or WebKit baselines would be a new curated set with its own maintenance cost. That is a separate decision, and the owner has not asked for it.

## 4. Readings this design starts from

Taken by the architect on 2026-11-16 inside the current devcontainer, at `a8726c57d`, and at `81d4c91b1` for the revision.

- **The development image:** `ghcr.io/ausginer/devimages/node:latest` by tag, built in the public repository `ausginer/devimages` from `node:slim`. It contains Debian 13 (trixie), Node 26.13.0, and Google Chrome for Testing 157.0.8103.38 at `/usr/local/bin/chrome` (`/opt/chrome/chrome`), and sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. Its Chrome comes from `ghcr.io/kreemer/features/chrometesting:1`, whose install script ignores its `version` option and always installs the current Stable build (`RD-9`'s reading).
- **Playwright** 1.65.0, exact in `package.json`. It pins Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2. The Firefox (`firefox-1572`) and WebKit (`webkit-2388`) builds are in the local cache, and the Chromium build (`chromium-1254`) is not.
- **Fonts in the visual fixtures:** text resolves to Debian's Liberation Sans 2.1.5 through fontconfig. The icon font is vendored.
- **Visual baselines:** 23 files under `packages/material-x/tests/*/__screenshots__/`, all `*-chromium-linux.png`.
- **The ruleset "Main protection"** applies to the default branch. It requires a pull request, squash merge and linear history, and forbids deletion and force-push. It has no required status check. Branch protection is not configured; the ruleset is the only rule.
- **The repository is public.** GitHub-hosted standard Linux runners for public repositories have 4 vCPUs and 16 GB of memory at no charge. `RD-2`'s resource facts (6.6–7.4 GiB, peaks near 10.4 GiB) fit. No self-hosted runner is needed.
- **The suite at the base:** see `RD-8`'s reading.

## 5. What the owner must decide and set up

In this order. Steps 1 to 3 come before the first unit starts or while it runs. Step 5 comes after the unit lands.

1. **Review the re-recorded baselines** during the unit. `RD-9` property 5 re-records every baseline once, for Chromium 158.0.8127.18 and Roboto. The implementer reports each changed baseline. Review each one before the pull request merges.
2. **Codecov.** Install the Codecov GitHub App for `ausginer/material-x`, and add the repository's upload token as the Actions secret `CODECOV_TOKEN`. A pull request from a fork has no access to the secret. For public repositories Codecov accepts such uploads without a token.
3. **A pull request for the unit's CI readings.** A workflow that is not yet on `main` runs only through a pull request: a manual run needs the file on the default branch. WebKit cannot run locally (`DRO-18`), and the visual result on CI's operating system is read only in CI. So the unit needs a pull request from `ci/verification` to `main` that is **not a draft**, because drafts are skipped (O1). Either open it when the implementer asks, or authorize the implementer to open it. The owner merges it, as always.
4. **Confirm or correct the choices below.** Each is the architect's recommendation, and the owner can change it before the unit lands.
   - **A failed Codecov upload fails the `chromium` job,** so a Codecov outage blocks merge until a rerun succeeds. The alternative is to report the failure and continue, which means that coverage can be silently missing. O4 says _required_, so this design fails the job.
   - **Codecov's own statuses are informational.** A coverage percentage never blocks a merge. This follows `test-architecture.md`: coverage reports are diagnostic. Codecov's own pull-request comment keeps its default and can be turned off in `codecov.yml`.
   - **The size comment is posted on pull requests from this repository only.** On a fork's pull request the token cannot write. The report is in the job summary instead. Supporting forks needs a second workflow, triggered by `workflow_run`, that posts from the report artifact. It is not built now. `pull_request_target` is refused, because it runs with write access next to the fork's code.
   - **What counts as an allocation or speed check** (`RD-7` property 1). Retention checks (_should not retain …_) and deterministic work counts stated by a contract invariant, such as `drag:DRI-17`'s layout reads, stay in the gate. They assert behavior, not a quantity against a budget.
   - **No speed check runs in CI.** The suite has no speed row today. `bench/compare.ts` is a manual comparison, and a timing reading on a shared runner is noisy enough to tell little. A later speed check enters CI under `RD-7`.
   - **The devcontainer keeps its image at `:latest`.** The image no longer reaches a test's browser or fonts, so pinning it is optional. A release tag of `ausginer/devimages` would also pin Node and the tools, if you want that. The image's `chrometesting` feature can be removed in `ausginer/devimages` once no other project uses it.
5. **The branch rule, after the unit lands.** When the unit is on `main` and `verify` has passed on a push to `main`, add a _Require status checks to pass_ rule to the ruleset "Main protection". It requires the check `verify` from the GitHub Actions app. "Require branches to be up to date" is not needed: merges are squash-only, and `verify` reruns on `main` after each merge. **Turn the rule on only after `RD-8`'s repairs and disabled rows are on `main`,** as O8 says. Until then, `RD-2` and `RF-8` stay open.

## 6. What stays open after the first unit

- **Product repairs** that `RD-8` routes. Each is a finding with a disabled row, and each is its own unit, which the owner orders.
- **The branch rule,** until the owner adds it (§5, step 5).
- **A speed check in CI,** if the owner wants one.
- **Fork pull requests' size comment,** if forks start to matter.
- **What happens if CI doesn't reproduce the baselines,** or the visual suite turns intermittent there: the owner's decision (O12). The architect can then offer a minimal Debian container for the `chromium` job, a repository fontconfig configuration, or a different comparison threshold.
- **Firefox or WebKit visual baselines,** if the owner wants them. That is a decision about a new curated set, not an extension of this one.