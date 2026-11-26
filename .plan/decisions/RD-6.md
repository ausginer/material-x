#### RD-6 — One workflow verifies every push to `main` and every ready pull request, in Chromium, Firefox and WebKit on a named runner, and one aggregate check gates merge

**Decided 2026-11-16 by the architect** on `ci/verification` at `a8726c57d`, on the owner's requirements relayed by the coordinator the same day ([design](../ci-verification-1/ci-verification-design.md) §1, O1 to O8). **Unimplemented:** [`ci-verification-handoff.md`](../ci-verification-1/ci-verification-handoff.md) implements it. It is `RD-2`'s deliverable 2, and it prepares deliverable 3, which the owner performs. Deliverable 1 is `RD-9`.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668. **The branch rule is on:** on 2026-11-16 the owner added `verify` from GitHub Actions as a required status check to the ruleset _Main protection_ (20963220), active on the default branch with no bypass actor, read back by the architect through the API. The ruleset also requires the branch to be up to date with `main`, which the [design](../ci-verification-1/ci-verification-design.md) §5 step 5 called unnecessary; that is the owner's choice.

**Amended 2026-11-16, before implementation,** on the owner's direction relayed by the coordinator at `81d4c91b1` (O9 and O10 in the design): CI runs on a plain runner and doesn't pull the development image, and Chromium is Playwright's build. The title, property 2, property 4's third sentence, and the reasons about the image changed. What it said before is at the end.

**Amended 2026-11-16 by `RD-12`,** on the owner's correction (O13): the third engine is Safari on a macOS runner, not Playwright's WebKit. The title, properties 2, 3, 4, 6, 7 and 8, and two reasons changed. `RD-12` holds the readings, the provider and the reasons. What they said before is at the end.

**Amended 2026-11-17 by `RD-14`,** on the owner's answer to the findings unit's question 2, relayed by the coordinator: the docs build is a gate job. Properties 3, 8 and 9 changed. `RD-14` holds the reasons, and the [docs-gate handoff](../docs-gate-1/docs-gate-handoff.md) implements it. What they said before is at the end. **Unimplemented** until that handoff's pull request merges.

**Amended 2026-11-17 by `RD-12`,** on the owner's decision relayed by the coordinator: the third engine of the gate is Playwright's WebKit, and Safari runs weekly outside it. The title and properties 2, 3, 4, 7 and 8 changed. **Amended the same day by `RD-15`** (the `[noci]` marker): properties 3, 8 and 9. **Unimplemented** until the [CI-speed handoff](../ci-speed-1/ci-speed-handoff.md)'s pull request merges. What they said before is at the end.

**Amended 2026-11-18 by `RF-51`,** recorded by the main slot's architect from slot `b`'s [declarations-check handoff](../declarations-check-1/declarations-check-handoff.md), proposal 3: `static` also runs the published-declarations check that `RF-51`'s answer decided. Property 3 changed. **Unimplemented** until that handoff's pull request merges. What it said before is at the end.

**Amended 2026-11-18 by `RD-21`,** on the owner's choice relayed by the coordinator: the engines' system packages are fetched once by `system-deps` and installed offline. Properties 2 and 8 and one reason changed. **Unimplemented** until the [CI-deps handoff](../ci-deps-1/ci-deps-handoff.md)'s pull request merges. What they said before is at the end.

**Amended 2026-11-19 by `RD-7`,** recorded by the architect from `reviewer-1` of `RF-65`'s [feature proof](../reviews/size-base-1/feature-proof-claude.md) at `11017eaac`: the measurement job also adds `actions: read`, to find `main`'s stored size reading. Property 9 changed. `RD-7`'s amendment of the same day owed this change and didn't name it. **Unimplemented** until #72 merges. What it said before is at the end. **Implemented** by #72, merged 2026-11-19 as `359c87f8a` (dated by the architect with `RF-65`'s closure).

**Properties.**

1. **Triggers (O1).** A push to `main`; a `pull_request` event of type `opened`, `reopened`, `synchronize` or `ready_for_review`; and `workflow_dispatch`. Every job skips a draft pull request. No other trigger, and no `pull_request_target`. A newer run for the same pull request cancels the older one. A run for a push to `main` is never cancelled.
2. **The environment (O9, O13).** Every job runs on a GitHub-hosted runner named `ubuntu-24.04`. Safari's `macos-26` runner belongs to the Safari workflow, outside the gate (`RD-12` properties 6 and 12). Each label is named, not `*-latest`, so an operating system changes only by an edit. Each job uses the Node major version that the workflow names. **CI doesn't pull the development image, and no job runs in a container.** Chromium, Firefox and WebKit are the builds that the exact `playwright` dependency pins (`RD-9`). A job installs its engine's system packages offline from the cache that `system-deps` fills, falling back to `aube exec -- playwright install --with-deps <engine>`, and its browser with `aube exec -- playwright install <engine>` (`RD-21`). Screenshots are reproducible because of `RD-9`'s pinned visual environment, not because of the runner's operating system.
3. **The gate jobs.** `static` runs the root `just fmt-check`, `just lint`, `just typecheck` and `just typecheck-declarations` (`RF-51`). `chromium` runs the root suite, with every project, including node, declaration and visual. `firefox` and `webkit` run every browser project except visual in their engine (`RD-12` property 11). `docs` runs the root `just docs-build`, loads the built site with `just docs-smoke`, and uploads the Pages artifact (`RD-14`). **The three test jobs exclude `measurement` rows (`RD-7`).** In a run that `RD-15`'s marker reduces, only `records` runs, and the jobs above are skipped. Every job runs the repository's own recipes on a fresh checkout after `aube ci` (`RD-16`). If a recipe needs a step that a developer's tree happens to satisfy, the recipe is repaired. The workflow adds no private step.
4. **One engine selection (O2).** `MX_TEST_ENGINES`, a comma-separated list of `chromium`, `firefox`, `webkit` and `safari`, read by the shared factory in `.scripts/vitest-config.ts`. It defaults to `chromium`. Each browser project except visual is declared once per listed engine. A Chromium project keeps its name, and another engine's project is named `<name>/<engine>`. A non-Chromium project takes no Chromium launch arguments, and runs with `fileParallelism: false` and one worker, because a background page gets no input in Firefox, and Safari allows one session. WebKit does too unless `RD-12` property 11's reading allows file parallelism. A Safari project uses the WebdriverIO provider (`RD-12` properties 2 and 3). **It replaces `createDragAllEnginesTestConfig` and `packages/drag/vitest.engines.config.ts`.** drag's `test-engines` recipe keeps its name and runs drag's browser and shipped projects in the engines that the variable lists. A local run is Chromium only (`RD-13` property 7).
5. **Visual runs in Chromium only.** Its baselines are per engine and platform, and only Chromium baselines exist. **The gate never writes, updates or approves a baseline.** The recording workflow proposes baselines in a pull request that the owner merges (`RD-13`). When `chromium` fails, the actual and diff images are uploaded as a workflow artifact.
6. **A row that needs an instrument that an engine's driver doesn't provide** runs only in the engines that provide it, by an engine condition, as drag's `isChromium` rows do. Chromium-only instruments are the DevTools Protocol, heap snapshots and `--expose-gc`. Safari's driver also lacks media emulation (`RD-12` properties 4 and 5). That limits the row's scope and doesn't disable it, so `RD-8` doesn't apply to it.
7. **Coverage (O4).** `chromium` runs with V8 coverage and uploads it to Codecov on every run. A failed upload fails the job. Codecov's project and patch statuses are `informational`, so a percentage never blocks a merge. Firefox and WebKit contribute no coverage, because the V8 provider cannot instrument them.
8. **The aggregate check.** `verify` needs `static`, `chromium`, `firefox`, `webkit` and `docs`, `RD-15`'s `scope` and `records`, and `RD-21`'s `system-deps`. It succeeds only if `scope` succeeded and every job of the mode that `scope` chose succeeded, while every other job was skipped (`RD-15` property 5). **It is the one check the branch rule requires,** so adding or splitting a job changes `verify`'s list and not the rule. A job not in `verify`'s list cannot block a merge.
9. **Permissions.** The workflow's token is `contents: read`. Only the measurement job adds `pull-requests: write` (`RD-7`). `actions: read` is added by `scope` (`RD-15`) and by the measurement job, which finds `main`'s stored size reading with it (`RD-7`). Only `deploy`, which runs for `main` alone, adds `pages: write` and `id-token: write` (`RD-14`). A third-party action is pinned to a full commit hash.

**Why.**

- **One aggregate check** keeps the branch rule stable while jobs change, and it makes a skipped or missing job a failure of `verify` instead of a check nobody required.
- **Plain runners, not a container,** on the owner's direction. The Linux jobs share one operating system, one Node version and one lockfile per run, so the only difference between `chromium` and `firefox` is the engine. `safari` also differs in operating system, because Safari exists only on macOS (`RD-12`). Playwright chooses each Linux engine's system libraries, and `RD-21` fetches them once per cache key, before the test jobs start, and installs them offline on each runner.
- **Playwright's build for Chromium and Firefox:** one exact dependency pins both, in the devcontainer and in CI (`RD-9`). Safari can't be pinned (`RD-12` property 7).
- **One engine selection, not a second mechanism.** drag's engines configuration is the same property for one package. Generalized, it serves every package, and drag's names survive (CONTRIBUTING §6).
- **Coverage from Chromium only** is a limit of V8 coverage, not a choice.

**Not adopted.**

- **Running the jobs in the development image,** which this decision first adopted. The owner's direction rules it out. `RD-9`'s reading also shows that the image cannot pin Chrome.
- **Playwright's own container image.** Its version would have to follow the lockfile in a second place.
- **Istanbul coverage in every engine.** It runs instrumented code instead of the code under test in every engine, and O4 needs only one coverage source, which Chromium already provides.
- **Firefox and Safari visual baselines.** That is a new curated set with its own maintenance cost, which the owner hasn't asked for.

**What this amends.**

- **`.agents/docs/test-architecture.md` §CI policy,** in place in the same commit. Before: _"Scheduled or manual jobs may add the full visual state matrix, dark/contrast theme expansion, Firefox/WebKit behavior checks, RTL/zoom/forced-colors/reduced-motion resilience, and targeted accessibility-tree or manual AT validation."_ Firefox and WebKit behavior and spec-contract checks move into the pull-request gate. The other scheduled or manual items stay where they were. §What screenshots prove keeps its rule: broader visual runs stay scheduled or manual.
- **`RD-2` deliverable 2's list** gains Firefox and WebKit behavior and spec-contract tests and the Codecov upload. Its order, its acceptance and its other deliverables stand.
- **`drag:DRO-18`'s open question** ("whether that job is owed under `repo:RD-2`") is answered: it is.

**What it said before the amendment.**

- The title said _"in the pinned image and three engines"_.
- Property 2 said: _"**The pinned environment (`RD-2` deliverable 1, O7).** Every job runs in `ghcr.io/ausginer/devimages/node@sha256:<digest>`, the image the devcontainer runs at this decision, which recorded the committed baselines. `.devcontainer/devcontainer.json` names the same digest, so local and CI runs use one image. A `repo` node test asserts that the two files name the same digest. The image changes only under `RD-9`."_
- Property 4 said: _"A non-Chromium project uses Playwright's own build of its engine, without the Chromium executable or Chromium launch arguments"_.
- The reasons said that every job in the pinned image shares one operating system, and that the existing image is pinned because it recorded the 23 baselines. Not adopted said that running Firefox and WebKit on a plain runner with `playwright install --with-deps` would give each job its own operating system and Node version.
- **Why it changed:** the owner's direction, and `RD-9`'s reading that the image's Chrome feature ignores its version option.

**What it said before `RD-12`.**

- The title said _"in three engines on a pinned runner"_.
- Property 2 said that every job runs on `ubuntu-24.04`, and that _"Every engine is the build that the exact `playwright` dependency pins, Chromium included (`RD-9`)."_
- Property 3 named the jobs `firefox` and `webkit`. Property 7 said _"Firefox and WebKit contribute no coverage"_. Property 8 named `webkit` in `verify`'s list.
- Property 4 listed `chromium`, `firefox` and `webkit`, and said: _"drag's `test-engines` recipe keeps its name and its project names (`browser`, `browser/firefox`, `shipped/webkit`…), so `drag:DRO-18`'s commands still select the same projects."_
- Property 6 said: _"**A row that needs a Chromium-only instrument** (the DevTools Protocol, heap snapshots, `--expose-gc`) runs only in Chromium, by an engine condition, as drag's `isChromium` rows do."_
- The reasons said: _"The jobs still share one operating system, one Node version and one lockfile per run, so the only difference between engine jobs is the engine. Playwright's installer adds each engine's system libraries on the runner, so `DRO-18`'s local decision is unchanged."_ and _"**Playwright's build for every engine:** one exact dependency pins all three browsers, in the devcontainer and in CI (`RD-9`)."_
- **Why it changed:** the owner's correction (O13), which `RD-12` decides.

**What it said before `RD-14`'s amendment of 2026-11-17.**

- Property 3 named no `docs` job.
- Property 8 said: _"`verify` needs `static`, `chromium`, `firefox` and `safari`"_.
- Property 9 said: _"Only the measurement job adds `pull-requests: write` (`RD-7`)."_
- **Why it changed:** the owner's answer to the findings unit's question 2, which `RD-14` decides.

**What it said before the amendments of 2026-11-17 by `RD-12` and `RD-15`.**

- The title said _"in Chromium, Firefox and Safari on named runners"_.
- Property 2 said: _"Every job except `safari` runs on a GitHub-hosted runner named `ubuntu-24.04`, and `safari` runs on `macos-26` (`RD-12` property 6)."_ and _"Chromium and Firefox are the builds that the exact `playwright` dependency pins (`RD-9`), and a job installs its engine with `npx playwright install --with-deps <engine>`. Safari is the runner image's own and isn't pinned (`RD-12` property 7)."_
- Property 3 said: _"`firefox` and `safari` run every browser project except visual in their engine."_ and _"Every job runs the repository's own recipes on a fresh checkout after `npm ci`."_
- Property 4 listed _"`chromium`, `firefox` and `safari`"_ and said that a non-Chromium project runs serially _"because a background page gets no input in those engines"_.
- Property 7 said: _"Firefox and Safari contribute no coverage"_.
- Property 8 said: _"`verify` needs `static`, `chromium`, `firefox`, `safari` and `docs`, and succeeds only if each succeeded."_
- Property 9 named no `actions: read`.
- **Why it changed:** the owner's decision of 2026-11-17, which `RD-12`, `RD-15` and `RD-16` decide.

**What it said before the amendment of 2026-11-18 by `RF-51`.** Property 3 said: _"`static` runs the root `just fmt-check`, `just lint` and `just typecheck`."_ **Why it changed:** `RF-51`'s standing check, decided on the owner's condition that it needs no custom rule, runs in the gate after the build.

**What it said before `RD-13`.** Property 4 said: _"drag's `test-engines` recipe keeps its name and runs `chromium,firefox`, so its project names are `browser`, `browser/firefox`, `shipped` and `shipped/firefox`, which are `drag:DRO-18`'s selection. A local `just test` without the variable runs Chromium only, as it does today."_ Property 5 said: _"CI never writes, updates or approves a baseline."_ **Why it changed:** the owner's decisions (O14, O15), which `RD-13` decides.

**What it said before `RD-21`.**

- Property 2 said: _"Chromium, Firefox and WebKit are the builds that the exact `playwright` dependency pins (`RD-9`), and a job installs its engine with `npx playwright install --with-deps <engine>`."_
- Property 8 said: _"`verify` needs `static`, `chromium`, `firefox`, `webkit` and `docs`, and `RD-15`'s `scope` and `records`."_
- The reason about plain runners said: _"Playwright's installer adds each Linux engine's system libraries on the runner."_
- **Why it changed:** `RF-58`, a slow mirror timing out jobs before any test runs, which `RD-21` decides.

**What it said before `RD-7`'s amendment of 2026-11-19.** Property 9 said: _"Only the measurement job adds `pull-requests: write` (`RD-7`), only `scope` adds `actions: read` (`RD-15`), and only `deploy`, …"_ **Why it changed:** the merge base's size reading is `main`'s own, kept as an artifact, and a pull request's run needs `actions: read` to find and download it.