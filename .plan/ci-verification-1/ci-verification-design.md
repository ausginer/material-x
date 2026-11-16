# CI verification — design

**Author:** the architect, on `ci/verification` at `a8726c57d`, 2026-11-16. **Input:** the owner's requirements, relayed by the coordinator, and the owner's additions and directions sent later the same day (§1). **Revised** at `81d4c91b1` on the owner's direction about the pinned environment (O9 to O12), at `9c96be2d8` on the owner's correction that the third engine is Safari (O13), and at `26453da9c` on the owner's decisions about recording baselines and local runs (O14, O15). **Decisions:** `repo:RD-6` to `repo:RD-9`, `repo:RD-12` for Safari, and `repo:RD-13` for recording baselines and local runs, in [`../00-index.md`](../00-index.md). This document describes the workflow those decisions require, how they fit `repo:RD-2`, and what the owner must set up. Where this document and a decision disagree, the decision is authoritative.

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
| O13 | _(correction)_ In O2, _WebKit_ means real Safari, run on a macOS runner, not Playwright's WebKit build. |
| O14 | _(decision, after the visual stop)_ Baselines are recorded on GitHub's runner, not in the devcontainer. A workflow apart from the gate records them and, when images changed, opens a pull request with them. The owner reviews and merges it. The gate never writes a baseline. Hosted screenshot services are declined. |
| O15 | _(decision)_ Local runs are Chromium only, without visual tests. Firefox, Safari and visual results come from CI. |

## 2. How the requirements fit `RD-2`

`RD-2` owes four deliverables in this order: a pinned environment, the workflow, the branch rule, and a baseline maintenance policy. It names neither WebKit nor Codecov. **The order holds, and none of the four is weakened.** The owner's requirements add to deliverable 2 and decide how deliverables 1 and 4 are met:

| `RD-2` deliverable | Met by | What the owner's requirements change |
| --- | --- | --- |
| 1. Pinned environment | `RD-9`: Playwright's locked Chromium and Roboto from a locked package, on GitHub's `ubuntu-24.04` runner, which records and compares (`RD-13`) | Not a container image (O9). `RD-2` named a _container image fixing OS, Chromium, fonts and icons_. The Chromium build and the fonts are pinned; the runner image is named and not pinned (O12). No visual run is local, so `RD-2`'s _same image locally_ no longer applies (O14, O15) |
| 2. The workflow | `RD-6`, with `RD-7` for measurements, `RD-8` for the rows that fail today and `RD-12` for Safari | Firefox and Safari run behavior and spec-contract tests in the gate (O2, O13). The Codecov upload is part of the gate (O4). Size, allocation and speed checks leave the gate and are reported instead (O5, O6) |
| 3. The branch rule | The owner, after the first unit lands (§5, step 5) | O8 confirms it. The rule names one aggregate check, `verify`, so that adding or splitting jobs does not change the rule |
| 4. Baseline maintenance | `RD-9` property 6, `RD-13` | The recording workflow records baselines on the runner and proposes them in a pull request that the owner merges. A `playwright` or Roboto version change is its own pull request, whose baselines are recorded that way |

The pinned environment arrives in the same unit as the workflow, and lands before the visual result in CI is read. `RD-2` puts the environment first so that the visual half of the gate never runs without it. A single unit that lands the environment first and the workflow after it meets that.

**`drag:DRO-18`'s open question is answered:** the WebKit family is owed under `RD-2`, through `RD-6`, and `RD-12` makes it Safari on macOS. Until the first unit lands, no run covers it. Locally, runs are Chromium only (O15).

**`RF-8` stays open** until all four of `RD-2`'s deliverables hold, which includes the owner's branch rule.

## 3. The workflow

One workflow file, `.github/workflows/verify.yml`, beside `docs.yml`. `docs.yml` does not change.

```text
 static     chromium     firefox     safari        measurements
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
| `safari` | as `firefox`, with `MX_TEST_ENGINES=safari`, through the WebdriverIO provider, one Vitest process per project (`RD-12`) | `macos-26` runner, its own Safari and `safaridriver` | yes |
| `verify` | succeeds only if all four jobs above succeeded | none | **the required check** |
| `measurements` | `measurement` rows in Chromium; sizes at the head and at the merge base; job summary; the pull-request comment | runner, plus Playwright's Chromium | no |

**Every job runs the repository's own recipes,** the commands a developer runs. A job that needs a step the recipes do not contain, such as a build before `just test` on a fresh checkout, has found a defect in the recipe, and the recipe is repaired. The workflow does not grow a private step.

**The runners.** Every job except `safari` runs on GitHub's `ubuntu-24.04` runner, and `safari` runs on `macos-26`. Each is named by its label rather than `*-latest`, so an operating system changes only by an edit. Node's major version is named in the workflow. The `chromium` and `firefox` jobs install their engine with `npx playwright install --with-deps <engine>`, which also installs the engine's system libraries, so each is the build that Playwright 1.65.0 pins. The Linux jobs share one operating system, one Node version and one lockfile per run, so a difference between `chromium` and `firefox` is an engine difference and nothing else.

**Safari** (`RD-12`). Safari exists only on macOS, and only WebDriver drives it, so the `safari` job runs Vitest's community WebdriverIO provider against the `safaridriver` that ships with macOS. The job enables remote automation with `sudo safaridriver --enable`, and logs the macOS and Safari versions before the tests. Safari runs one session at a time, not headless, with Vitest's trace view off. **Each Safari project runs in its own Vitest process,** through the root recipe `test-safari`, because in one process Vitest opens the next project's browser before the previous project's session is released (`RD-12` property 6, amended at `347d4e499`). Safari isn't pinned: its version is the runner image's, and an image update can change a result. Repository commands that drive input have a WebdriverIO implementation beside the Playwright one. A row that needs an instrument Safari's driver lacks, such as reduced-motion emulation, runs only in the engines that have it. The runner's Safari reports reduced motion, so the job turns the runner's Reduce Motion off before the tests, and Safari pages then report the same default preference as Chromium and Firefox pages (`RD-12` property 10).

**The pinned visual environment** (`RD-9`). Chromium is Playwright's full build in new headless mode, at 158.0.8127.18 for Playwright 1.65.0. Text in the visual fixtures is Roboto from an npm package pinned by the lockfile, loaded as a web font, with no system font in the stack. The icon font stays vendored. **Baselines are recorded and compared on GitHub's `ubuntu-24.04` runner only** (`RD-13`). The devcontainer's recording didn't reproduce there: 16 of 19 differed on anti-aliased edges. The devcontainer installs only Chromium, and it runs no visual test. Its image's own Chrome takes no part in a test.

**The recording workflow** (`RD-13`), `.github/workflows/baselines.yml`, outside the gate:

```text
 workflow_dispatch on a branch          record (contents: read)
 or label `record-baselines`   ──►     visual project with --update on ubuntu-24.04
 on a pull request from this repo        │ artifact: added and changed PNGs
                                         ▼
                                       propose (contents, pull-requests: write)
                                         runs no repository code
                                         baselines/<target> ──► PR into <target>
                                         into main only: dispatch verify
```

The owner reviews the proposal's images and merges it. A merge into a branch other than `main` runs that branch's own pull request's `verify`, which is the reproduction check. A proposal into `main` gets its `verify` from the dispatched run, because a pull request that `GITHUB_TOKEN` creates triggers no workflow.

**Local runs** are Chromium only, without the visual project (`RD-13` property 7). `MX_TEST_VISUAL=1` declares the visual project, and only the gate's `chromium` job and the `record` job set it. A unit reads Firefox, Safari and visual results on its pull request.

**Why coverage comes from `chromium` only.** Vitest's V8 coverage provider reads coverage through the Chrome DevTools Protocol. Firefox and Safari have no equivalent, and the provider refuses them. The `chromium` job runs every project, including node and declaration, so its coverage covers everything the suite reaches. Firefox and Safari contribute pass or fail, not coverage.

**Why the visual suite runs only in Chromium.** Its baselines are named per engine and platform (`radio-states-chromium-linux.png`), and only Chromium baselines exist. `test-architecture.md` §CI policy names a _curated Chromium visual suite_. Firefox or Safari baselines would be a new curated set with its own maintenance cost. That is a separate decision, and the owner has not asked for it.

## 4. Readings this design starts from

Taken by the architect on 2026-11-16 inside the current devcontainer, at `a8726c57d`, and at `81d4c91b1` for the revision.

- **The development image:** `ghcr.io/ausginer/devimages/node:latest` by tag, built in the public repository `ausginer/devimages` from `node:slim`. It contains Debian 13 (trixie), Node 26.13.0, and Google Chrome for Testing 157.0.8103.38 at `/usr/local/bin/chrome` (`/opt/chrome/chrome`), and sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. Its Chrome comes from `ghcr.io/kreemer/features/chrometesting:1`, whose install script ignores its `version` option and always installs the current Stable build (`RD-9`'s reading).
- **Playwright** 1.65.0, exact in `package.json`. It pins Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2. The Firefox (`firefox-1572`) and WebKit (`webkit-2388`) builds are in the local cache, and the Chromium build (`chromium-1254`) is not.
- **Fonts in the visual fixtures:** text resolves to Debian's Liberation Sans 2.1.5 through fontconfig. The icon font is vendored.
- **Visual baselines:** 23 files under `packages/material-x/tests/*/__screenshots__/`, all `*-chromium-linux.png`.
- **The ruleset "Main protection"** applies to the default branch. It requires a pull request, squash merge and linear history, and forbids deletion and force-push. It has no required status check. Branch protection is not configured; the ruleset is the only rule.
- **The repository is public.** GitHub-hosted standard Linux runners for public repositories have 4 vCPUs and 16 GB of memory at no charge. `RD-2`'s resource facts (6.6–7.4 GiB, peaks near 10.4 GiB) fit. No self-hosted runner is needed.
- **The suite at the base:** see `RD-8`'s reading.
- **Safari** (`RD-12`'s readings, at `9c96be2d8`): Vitest's WebdriverIO provider is community-maintained, at 5.0.0, and resolves against Vitest 5.1.0. Safari allows one WebDriver session per machine and has no headless mode. Vitest 5.1.0's default trace view breaks the provider's negative element assertions. The `macos-26` standard runner is arm64 with 3 vCPU and 7 GB, and is free for public repositories. The `safari` job runs one worker and browser projects only, so `RD-2`'s whole-run memory figure doesn't apply to it.

## 5. What the owner must decide and set up

In this order. Steps 1 to 3 come before the first unit starts or while it runs. Step 5 comes after the unit lands.

1. **The recording workflow's setup and its first proposal.** Create the label `record-baselines`, and turn on the repository setting _Allow GitHub Actions to create and approve pull requests_ (Settings › Actions › General). Then add the label to pull request #27, or authorize the implementer to add it. The workflow opens a proposal from `baselines/ci/verification` into `ci/verification`. **Review each changed baseline and merge the proposal yourself** before pull request #27 merges. The report's item 1 images show the change from Liberation Sans to Roboto, and the proposal shows the rest.
2. **Codecov.** Install the Codecov GitHub App for `ausginer/material-x`, and add the repository's upload token as the Actions secret `CODECOV_TOKEN`. A pull request from a fork has no access to the secret. For public repositories Codecov accepts such uploads without a token.
3. **A pull request for the unit's CI readings.** A workflow that is not yet on `main` runs only through a pull request: a manual run needs the file on the default branch. Safari cannot run locally (`DRO-18`, `RD-12`), and the visual result on CI's operating system is read only in CI. Pull request #27 is this pull request. So the unit needs a pull request from `ci/verification` to `main` that is **not a draft**, because drafts are skipped (O1). Either open it when the implementer asks, or authorize the implementer to open it. The owner merges it, as always.
4. **Confirm or correct the choices below.** Each is the architect's recommendation, and the owner can change it before the unit lands.
   - **A failed Codecov upload fails the `chromium` job,** so a Codecov outage blocks merge until a rerun succeeds. The alternative is to report the failure and continue, which means that coverage can be silently missing. O4 says _required_, so this design fails the job.
   - **Codecov's own statuses are informational.** A coverage percentage never blocks a merge. This follows `test-architecture.md`: coverage reports are diagnostic. Codecov's own pull-request comment keeps its default and can be turned off in `codecov.yml`.
   - **The size comment is posted on pull requests from this repository only.** On a fork's pull request the token cannot write. The report is in the job summary instead. Supporting forks needs a second workflow, triggered by `workflow_run`, that posts from the report artifact. It is not built now. `pull_request_target` is refused, because it runs with write access next to the fork's code.
   - **What counts as an allocation or speed check** (`RD-7` property 1). Retention checks (_should not retain …_) and deterministic work counts stated by a contract invariant, such as `drag:DRI-17`'s layout reads, stay in the gate. They assert behavior, not a quantity against a budget.
   - **No speed check runs in CI.** The suite has no speed row today. `bench/compare.ts` is a manual comparison, and a timing reading on a shared runner is noisy enough to tell little. A later speed check enters CI under `RD-7`.
   - **Safari isn't pinned** (`RD-12` property 7). The `safari` job uses the Safari that the `macos-26` image ships, and a GitHub image update can turn it red with no repository change. The job log's Safari version shows when that happened. The alternative is no Safari in the gate, which O13 rules out.
   - **The recording workflow force-pushes `baselines/<target>`,** which only it writes, so each target has one open proposal with the latest recording. The alternative is one branch per run, with older proposals to close.
   - **A proposal into `main` gets `verify` by `workflow_dispatch`,** not through a GitHub App token or a personal access token, so no secret is needed. If the dispatch fails, close and reopen the proposal.
   - **The devcontainer keeps its image at `:latest`.** The image no longer reaches a test's browser or fonts, so pinning it is optional. A release tag of `ausginer/devimages` would also pin Node and the tools, if you want that. The image's `chrometesting` feature can be removed in `ausginer/devimages` once no other project uses it.
5. **The branch rule, after the unit lands.** When the unit is on `main` and `verify` has passed on a push to `main`, add a _Require status checks to pass_ rule to the ruleset "Main protection". It requires the check `verify` from the GitHub Actions app. "Require branches to be up to date" is not needed: merges are squash-only, and `verify` reruns on `main` after each merge. **Turn the rule on only after `RD-8`'s repairs and disabled rows are on `main`,** as O8 says. Until then, `RD-2` and `RF-8` stay open.

## 6. What stays open after the first unit

- **Product repairs** that `RD-8` routes. Each is a finding with a disabled row, and each is its own unit, which the owner orders.
- **The branch rule,** until the owner adds it (§5, step 5).
- **A speed check in CI,** if the owner wants one.
- **Fork pull requests' size comment,** if forks start to matter.
- **What happens if the runner doesn't reproduce its own recordings,** or the visual suite turns intermittent there, for example between runners with different processors: the owner's decision (O12). The `chromium` job's log names the runner image and the processor of each run (`RD-13` property 9).
- **Obsolete baselines** aren't removed by the recording workflow (`RD-13` property 4).
- **The WebdriverIO provider's maintenance.** It is released apart from Vitest, so each Vitest upgrade re-reads the `safari` job (`RD-12` property 9).
- **`packages/drag/bench/compare.ts` still launches `CHROME_EXECUTABLE` or `/usr/local/bin/chrome`.** It is a manual comparison and not part of a test run, so `RD-9` doesn't cover it. It breaks once the development image no longer contains that Chrome. A drag unit can move it to Playwright's Chromium.
- **Firefox or Safari visual baselines,** if the owner wants them. That is a decision about a new curated set, not an extension of this one.