# Release workflow: implementation of tasks 1 to 3

**Implemented** by the implementer on `repo/release-workflow-1`, from `e76b9badc`, on the coordinator's task of 2026-11-20. It implements tasks 1 to 3 of the [release workflow plan](release-workflow-plan.md) under `repo:RD-27`. box-quad's own tasks (its manifest, `LICENSE`, README, changelog and ceiling) and the owner's settings O1 to O3 are outside this unit.

## What landed

- **Task 1:** [`.scripts/release-check.ts`](../../.scripts/release-check.ts), with its tests in [`.scripts/release-check.node.test.ts`](../../.scripts/release-check.node.test.ts) (the `repo` project), and the root recipe `just release-check <name>`. `ghApi` in `.scripts/ci-scope.ts` is now exported, so that both scripts read the Actions API through the same function.
- **Task 2:** [`.github/workflows/release.yml`](../../.github/workflows/release.yml).
- **Task 3:** [`.agents/docs/releasing.md`](../../.agents/docs/releasing.md), and its line in `AGENTS.md`'s _Where things are_.

## Proofs delivered before the merge

- **The tests:** 35 cases pass. Each check in task 1's list has a fixture that fails with that check's name and no other: `version`, `package`, `main`, `verify`, `registry-version`, `latest`, `pack-files`, `pack-excluded` (a path under `src/`, and a test file), `pack-required` (no `LICENSE`, and no `CHANGELOG.md`), `changelog`, `repository-url`, `private` and `dependency` (unpublished, and a range). Further fixtures cover `tag`, `repository-directory` and `access`. box-quad's intended pack passes, both as data and as a tarball that `tar` wrote and `readPack` read.
  - The registry and the Actions API are injected functions. The commit check runs `git` on a repository in a temporary directory.
  - The consumer check runs `aube install` and `tsc` for real, with `npm_config_registry` set to an address that refuses connections. A tarball install that reached for the registry would fail.
- **Mutations:** three of four were caught (the excluded-directory test, the `repository.url` comparison, and the reachability answer). The fourth changed `<= 0` to `< 0` in the `latest` comparison. It survives because it is equivalent: a version equal to the registry's `latest` is in the registry's version index, so `registry-version` refuses it first.
- **The local recipe on box-quad,** in [`checks/release-check-local.txt`](checks/release-check-local.txt):
  - on the branch as it is, the recipe builds, measures and packs, then fails on `access`, `pack-excluded`, `pack-files`, `pack-required`, `repository-directory` and `repository-url`;
  - with box-quad's release plan property 1 applied for the run and reverted afterwards, it passes. The pack is the seven files that plan names, and the consumer type-check of the built `index.d.ts` passes.
- **The workflow, by reading.** `actionlint` isn't in the repository, and fetching its release binary was refused in this session. So the reviewer reads every `permissions` block and every `uses:` pin. A scratch probe parsed the file with the workspace's `yaml` and listed:
  - top-level `permissions: {}`;
  - `prepare`: `contents: read`, `actions: read`;
  - `stage`: `id-token: write`, `actions: read`, `environment: npm`, only if `github.event_name == 'push'`;
  - every `uses:` is pinned to a full commit, resolved through GitHub's tags API: `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0 and `actions/upload-artifact` v7.0.2, as in `verify.yml`, and `actions/download-artifact` v8.0.2 at `9000827ccba6bdab643e8b6fd33ac0654aef8333`, which `verify.yml` doesn't use.
- **npm's flags,** read in npm 11.21.2's own documentation and source (`docs/content/commands/npm-stage.md`, `npm-trust.md`, `lib/commands/publish.js`, `lib/utils/oidc.js`):
  - `npm stage publish <package-spec>` takes `--tag`, `--access` and `--provenance`.
  - Without `--json`, it prints `+ <name>@<version> (staged with id <id>)`, which the `stage` job reads for its summary.
  - `npm trust github` takes `--file`, `--repo`, `--env` and `--allow-stage-publish`, the flags `releasing.md` gives.
  - npm tries the OIDC exchange first and keeps the configured token when the exchange fails. So one `stage` step serves the first publish's token and later the trusted publisher.

## What the implementation decided within the plan

Each of these is a reading of the plan where it is silent. The reviewer may refuse any of them.

- **A check run runs step 2's registry checks,** and skips only its commit checks. A release pull request's version is then checked against the registry before its tag exists.
- **Step 4 runs the package's `size` script,** which fails on a row over its limit. A package without that script has no rows. A row with no limit passes, because `RD-27` property 2 refuses only a row over its ceiling.
- **`npm` is pinned at 11.21.2,** of 2026-11-04, the newest 11.x older than 7 days on 2026-11-20. npm 12 exists, but the plan's reading is of npm 11's documentation.
- **The local recipe doesn't run `aube ci`.** It uses the installed tree, as every other recipe does (`repo:RD-16` property 12).
- **`aube pack` runs with `--ignore-scripts`,** so no lifecycle script changes the build between the build step and the pack. The plan's _Not adopted_ keeps the build explicit for the same reason.
- **A failed check names itself** in an error annotation and in the job summary. Every failure of a command is reported together, not only the first.

## Pending until after the merge

- **The dispatched check run for box-quad at `main`'s head,** and **the mutation dispatch** that adds `src/index.ts` to box-quad's `files`. Both need box-quad's own task 1 merged first. Until then box-quad's pack fails `prepare` on every pack check, as the local run shows, so a dispatch now would prove nothing about either.
- **Witnessed at the first release:** the `stage` job ran under the environment `npm`; the summary's sha256 equals the approved tarball's `shasum`; and the registry carries the provenance attestation.
- **The owner's settings O1 to O3,** in [`releasing.md`](../../.agents/docs/releasing.md#the-owners-settings).
- **The feature proof** of tasks 1 to 3 by a reviewer who didn't implement them, before the first tag. It repeats the mutation dispatch.

## Corrected after the feature proof

**Corrected 2026-11-20** by the implementer, on Mx Reviewer B's feature proof of `e73411cf4`. The sections above stay as written. `reviewer-2` and `reviewer-3` are the architect's, and this correction doesn't touch them.

- **`reviewer-1`: a failed producer in a pipeline left its step green.** Neither step set a `shell`, so each ran under `bash -e {0}`, without pipefail. `npm stage publish … | tee` then exited with `tee`'s status: a refused stage left the job green, with a summary that said _Staged_. `aube pack … | jq` failed only later, at `release-check.ts`'s usage error.
  - **Fix:** `defaults.run.shell: bash` at the top of `release.yml`, so every step runs under `bash --noprofile --norc -eo pipefail {0}`. One setting covers every pipeline in the file, so no step can miss it.
  - **Proof ([`checks/pipefail-probe.txt`](checks/pipefail-probe.txt)):** the pack and stage steps, read from the workflow file, ran with `false` in place of the producer. Before the fix, both exit 0: the pack step goes on to the check, and the stage step writes _Staged_ to the summary. After it, both exit 1 at the producer, and nothing is written to the summary.
- **`reviewer-4`: the fourth mutation is not equivalent.** The claim above, _"a version equal to the registry's `latest` is in the registry's version index"_, is false for build metadata. `1.0.0+build.1` has the same precedence as `1.0.0`, and the version index doesn't hold it. So the head refuses it under `latest`, and the mutant passes it.
  - **Fix:** a fixture for that input, which expects `latest`. With it there are 36 tests. All pass at the head, and the mutant fails exactly that one.
- **`reviewer-5`: `RD-27`'s status** now says what is implemented, at which commits, and what remains.