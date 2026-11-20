# Releasing `@ydinjs` packages: one workflow, staged on npm with provenance, approved by the owner

**The decision** is `RD-27` in the [register](../00-index.md#rd-27--each-ydinjs-package-is-released-by-one-workflow-that-stages-it-on-npm-with-provenance-for-the-owner-to-approve-and-box-quads-first-release-is-100). This plan holds the design, the owner's steps, the implementer's tasks with their proofs, and the questions for the owner, which he answered on 2026-11-20. It was written by the architect on `repo/release-workflow-1`, from `origin/main` at `d69e3ddbc`, on the coordinator's task of 2026-11-20.

**Where it comes from:**

- **The owner's answers** to Architect B's [box-quad release plan](https://github.com/ausginer/material-x/blob/repo/box-quad-release-1/.plan/box-quad-release-1/box-quad-release-plan.md#questions-for-the-owner) (PR #79, `0ef585e09`). Q4 asked for a release workflow with provenance: _"я заколебался руками публиковать"_ ("I'm sick of publishing by hand").
- **The npm documentation,** read on 2026-11-20 ([`checks/npm-docs.txt`](checks/npm-docs.txt)). A sub-agent found the pages, and the architect read each quoted sentence on the page itself with `curl`.

Nothing under `@ydinjs` is on npm yet, so this is the repository's first publish, and the procedure it sets is drag's and material-x's too.

## What npm offers, and what decides the design

These are the facts the design rests on, each from [`checks/npm-docs.txt`](checks/npm-docs.txt).

- **Trusted publishing (OIDC)** requires:
  - npm CLI 11.5.1 or later and Node 22.14.0 or later;
  - a GitHub-hosted runner, because self-hosted runners aren't supported;
  - `id-token: write` for the job;
  - a `repository.url` in `package.json` that exactly matches the GitHub repository.
- **What a trusted publisher configuration names:** the owner, the repository, the workflow's file name, and optionally an environment.
- **Provenance** is generated automatically under trusted publishing, from a public repository for a public package. `ausginer/material-x` is public.
- **The npm CLI tries OIDC first,** in its own words: it _"uses them for authentication before falling back to traditional tokens"_.
- **A trusted publisher can't be configured for a package that doesn't exist yet.** `npm trust` says _"The package you're configuring must already exist on the npm registry"_, and the web form is reached from the package's settings. npm has no pending publisher, unlike PyPI.
- **A new configuration expires after 2 days** unless it completes a publish: _"A newly created trusted publisher configuration must complete its first successful publish within 2 days … it expires"_.
- **Staged publishing** (npm CLI 11.15.0 or later) puts a version in a staging area, where a maintainer approves it.
  - _"npm stage publish does not require 2FA"_.
  - Approval does: _"You will be prompted for 2FA verification whether you approve the package in the CLI or on npmjs.com"_.
  - Approving, listing and rejecting _"require interactive authentication and cannot use OIDC tokens"_. CI can stage, and only a person approves.
  - It works _"for both new and existing packages"_. Staging a new name publishes a public placeholder, `0.0.0-stage`, and keeps the staged version hidden until it is approved.
- **What a new trusted publisher allows:** a configuration created after 2026-09-03 allows `npm stage publish`, and direct `npm publish` only when it is chosen.
- **Tokens:**
  - A granular token can be _"stage only"_.
  - _"The ability to publish new package versions directly with a granular access token will be removed in January 2027"_. npm's replacement is a stage-only token with staging.
- **The package setting** _"Require two-factor authentication and disallow tokens"_ blocks every granular token, _"regardless of their bypass 2FA setting"_. It _"only affects traditional token authentication. Your trusted publishers will continue to work normally"_.
- **aube's `publish`** documents `--provenance`, `--access`, `--dry-run` and publishing a tarball. It documents neither the OIDC exchange of trusted publishing nor staging (aube.sh's `publish` page and publishing guide, read by the sub-agent).

So the design stages from CI with the npm CLI, under trusted publishing, and the owner approves each version on npm with his security key. The first publish of each package needs one more step, because its trusted publisher can't exist yet.

## The design

### Versions and tags

- **Each package versions independently,** with semver, in its own `package.json`, and keeps its own `CHANGELOG.md`.
  - A package's dependency on another `@ydinjs` package is an exact version, as the workspace already pins.
  - That version must be on the registry when the dependent package is released.
- **A release is one tag on one `main` commit:** `@ydinjs/<name>@<version>`, for example `@ydinjs/box-quad@1.0.0`. This is the form Architect B's plan names. A git ref may hold `@` and `/`, and the workflow's tag filter `@ydinjs/*@*` matches it.
- **The owner pushes the tag.** Agents push no tag. `AGENTS.md` already forbids moving any shared ref but the work branch.
- **The dist-tag:**
  - a version with a prerelease part, as in `1.1.0-rc.1`, is staged under `next`;
  - any other version is staged under `latest`, and must be greater than the registry's current `latest`.

### The workflow, `.github/workflows/release.yml`

**Triggers,** as amended on 2026-11-20 ([the amendment](#amendment-a-release-runs-on-main)):

- **`push` of a tag matching `@ydinjs/*@*`:** its one job dispatches the release run on `main`, with the tag as input. It checks out nothing and stages nothing.
- **`workflow_dispatch` on `main` with a `tag` input:** the release. `prepare` and `stage` run in `main`'s own workflow file.
- **`workflow_dispatch` with a `package` input:** a check. It runs only the `prepare` job at the dispatched commit and stages nothing. This is how a release pull request's state is read before the tag exists, and how the workflow itself is exercised.

**Shared settings:**

- `permissions: {}` at the top, and each job grants its own.
- `concurrency: release-${{ github.ref }}`, never cancelled.
- Every action pinned by commit, as in `verify.yml`.
- `ubuntu-24.04` runners: trusted publishing needs a GitHub-hosted runner.
- **No cache** of any kind. A release reads nothing that another workflow wrote.

**Job `prepare`** (`contents: read`, `actions: read`). It checks out the tag with full history, then:

1. **Reads the release.** The package name and version come from the tag. Its directory is the workspace package with that `name`. Its `package.json` `version` equals the tag's version.
2. **Checks the commit.**
   - The tagged commit is reachable from `origin/main`. **Amended on 2026-11-20:** the run is on `refs/heads/main`, and the tag points at the run's own commit, `main`'s head ([the amendment](#amendment-a-release-runs-on-main) item 2).
   - `verify`'s push run on `main` for that commit concluded `success`, read through the Actions API. A reduced run (`RD-15`) counts, because it reduces only when everything since the last full run is records or Markdown.
   - The version isn't on the registry. npm's version index also holds staged versions, which an anonymous read can't see; a staged duplicate fails at the stage itself.
   - A `latest` version is greater than the registry's `latest`.
3. **Installs and builds:** `aube ci`, then the package's build with its dependencies through nx, as `just build` does.
4. **Checks the size.** The package's size rows are within their ceilings (`RD-27` property 2). A row over its ceiling fails the release. `verify` goes on only notifying (`RD-7`).
5. **Packs:** `aube pack` in the package directory, and records the tarball's sha256.
6. **Checks the pack.** The listing holds:
   - `package.json`, `README.md`, `LICENSE` and `CHANGELOG.md`;
   - and every other file matches an entry of the manifest's `files`;
   - and no path is under `src/`, `tests/` or `.plan/`, and none is a test file.

   **Checks the packed `package.json`:**
   - `repository.url` is `git+https://github.com/ausginer/material-x.git`, which trusted publishing compares;
   - `repository.directory` names the package's directory;
   - `publishConfig.access` is `public`;
   - it has no `private`;
   - every `@ydinjs/*` dependency names an exact version that is published on the registry.

   **`CHANGELOG.md`** has a heading that names the version.

7. **Checks it as a consumer.** It installs the tarball into an empty project in `$RUNNER_TEMP` with aube, so that its `@ydinjs` dependencies come from the registry, as a consumer's do. It type-checks a module that imports every export, with `skipLibCheck` off and the DOM library.
8. **Uploads** the tarball and its sha256 as an artifact, and writes the file list, the sha256 and the dist-tag to the job summary.

**One script holds the checks of steps 1, 2, 6 and 7:** `.scripts/release-check.ts`, which the workflow calls. Its node tests carry the mutations. `just release-check <package>` runs steps 3 to 7 locally, without the registry checks that need a tag.

**Job `stage`** (needs `prepare`, only on a tag push).

- **Settings:**
  - `environment: npm`;
  - `permissions: id-token: write, actions: read`.
- **No checkout.** It runs in `$RUNNER_TEMP`, outside any checkout, so npm reads none of the repository's `.npmrc`, as `RD-16` property 9's bootstrap step does.
- **Steps:**
  1. `actions/setup-node`, and `npm install -g npm@$NPM_VERSION`, where `NPM_VERSION` is a pinned exact version of 11.15.0 or later, set in the workflow's `env` as `AUBE_VERSION` is in `verify.yml`.
  2. It downloads the artifact and checks the sha256 that `prepare` recorded.
  3. `npm stage publish <tarball> --access public --tag <dist-tag> --provenance`. Under trusted publishing, provenance is automatic, and the flag also requests it for the first publish's token (below).
  4. It writes the stage's id and the package's npm URL to the job summary.

**What runs where:**

- **aube** installs, builds and packs, as `RD-16` property 1 requires.
- **The npm CLI stages the inspected tarball,** because aube implements neither trusted publishing nor staging. That is a third exception to `RD-16` property 1, recorded in `RD-27` property 6.

### Protections

**The gate is the owner's approval on npm,** with his second factor, on every version. Nothing an agent or a workflow can do makes a version public: approving needs proof of presence, which no OIDC or granular token gives. A wrong tag, a wrong commit or a compromised workflow can at most stage a version that the owner rejects, apart from the public `0.0.0-stage` placeholder of a package's very first stage.

**Around it:**

- **The trusted publisher of each package** names `ausginer/material-x`, `release.yml` and the environment `npm`. It allows `npm stage publish` only, not `npm publish` and not `npm dist-tag`.
- **The GitHub environment `npm`** allows deployments only from the branch `main`, and administrators can't bypass it (amended on 2026-11-20: it allowed tags matching `@ydinjs/*@*`). So only a run of `main`'s own workflow file can obtain the job that holds `id-token: write`. A tag, a branch or a pull request can't. It has no required reviewer, because the approval on npm is the gate ([question 1](#questions-for-the-owner)).
- **No other workflow names the environment `npm`.** A run of a workflow on `main` that `pull_request_target` or `workflow_run` starts is also a run on `main`, so the reviewer of any workflow change checks this.
- **A tag ruleset**, `Release tags`, makes the tags permanent: it blocks the update and deletion of `refs/tags/@ydinjs/**`, with no bypass. It leaves creation alone, because the agents act through the owner's own GitHub account, so no rule can tell his tag push from theirs. `AGENTS.md` and the npm approval are what keep them out. The owner creates the ruleset and the environment. Agents change no repository rule (`AGENTS.md`).
- **The first publish's stage-only token** is an environment secret of `npm`. So only the `stage` job of a release run on `main` can read it, and it is deleted after that publish.

### The first publish of a package

A package's trusted publisher can't be configured until the package exists, and staging a new name creates it. So the first stage authenticates with a token:

1. **The owner creates a granular token:** _Read and write (stage only)_, limited to the `@ydinjs` scope, with the shortest expiry npm allows (one day).
2. **He stores it as the secret `NPM_STAGE_TOKEN`** of the environment `npm`. The `stage` job passes it as `NODE_AUTH_TOKEN`. With no trusted publisher yet, npm falls back from OIDC to the token. The run's `id-token: write` still lets `--provenance` attest the run.
3. **He pushes the tag.** The workflow stages, and he approves on npm.
4. **He deletes the secret and revokes the token,** and sets the package's publishing access to _"Require two-factor authentication and disallow tokens"_.
5. **The package's second release configures its trusted publisher:** within the 2 days before that release's tag, because an unvalidated configuration expires after 2 days. With `npm trust github <name> --repo ausginer/material-x --file release.yml --env npm --allow-stage-publish`, or on the package's settings page. The implementer confirms the flag names against `npm trust github --help` for the pinned npm version, because the reading quotes only `--allow-publish` and `--allow-stage-publish`.

**What the token route costs:**

- one token, alive for a day, that can only stage;
- the public `0.0.0-stage` placeholder.

**Why not the alternative:** the owner stages the `prepare` job's tarball from his own machine, with `npm stage publish`. That needs no token, but the first version then has no provenance, which Q4 asks for. It stays the fallback if npm refuses a stage-only token for a name that doesn't exist yet. npm's pages don't say whether a stage-only token may create a name, so the first run is the reading ([question 2](#questions-for-the-owner)).

### The owner's steps for one release

1. **Agents prepare the release pull request:**
   - the version;
   - the changelog section;
   - on a first release, the package's ceilings at their readings (`RD-27` property 2);
   - and whatever the package's own release plan owes.

   A dispatched `release` run in check mode passes on its head. The owner merges it, and `verify` passes on the merge commit _M_ on `main`.

2. **On a first release,** steps 1 and 2 of [the first publish](#the-first-publish-of-a-package). **On the second,** step 5.
3. **He pushes the tag at _M_,** which must still be `main`'s head: `git tag @ydinjs/<name>@<version> <M> && git push origin @ydinjs/<name>@<version>`. He merges nothing until the release run has started. The tag's run dispatches that release run on `main`.
4. **Before approving, he checks two things,** as amended on 2026-11-20 ([the amendment](#amendment-a-release-runs-on-main)):
   1. **On GitHub,** the `release` run that the tag dispatched: its branch is `main`, it succeeded, and its summary names his tag and _M_.
   2. **On npmjs.com,** in _Staged Packages_, or with `npm stage view <stage-id>`: the staged version's stage id and `shasum` equal the ones in that run's summary.

   He then approves with his security key. If either check fails, he rejects the version.
5. **On a first release,** step 4 of the first publish.
6. **An agent reads the result:**
   - the version on the registry;
   - its provenance attestation, which names the run;
   - an install into an empty project, and the import type-checked.

   The reading goes into the package's release record, and the package's release issue closes on it.

If he rejects the staged version, he deletes nothing. The next attempt is a new version and a new tag, because the tags can't move and npm's version index includes staged versions.

### Two-factor authentication

**The account,** as of 2026-11-20:

- **The owner has switched his account to authorization and writes.** That is npm's default mode, in which publishing, unpublishing, deprecating, changing access and changing a package's 2FA setting ask for a second factor. Before, his account asked only at login and for account changes.
- **This changes nothing in the workflow.** Neither the OIDC token nor a stage-only token uses his account's login, and `npm stage publish` needs no second factor.
- **It changes what his own hand can do:** a stolen session can't publish, deprecate or change access without his key. Approving a staged version asks for the second factor in either mode.
- **His three security keys and the authenticator app stay as they are.** npm's pages state nothing against either.

**Per package, once its first version is approved:** _"Require two-factor authentication and disallow tokens"_ (first publish, step 4).

- **What it blocks:** every granular token for that package, including a stolen or forgotten one.
- **What it leaves:** trusted publishing works unchanged.
- **The direct `npm publish` it still allows** is only from his own machine, with his key. The release procedure doesn't use that path.

## Amendment: a release runs on `main`

**Amended 2026-11-20 by the architect,** on `reviewer-2` and `reviewer-3` of Mx Reviewer B's feature proof of PR #81 at `e73411cf4` (`.plan/reviews/release-workflow-1/feature-proof-claude.md`), relayed by the coordinator. `RD-27` records it.

### What was read

- **A tag push runs the tagged commit's own workflow file,** and anyone who can push a tag can choose that commit. So a commit check in that file can be deleted by whoever tags (`reviewer-3`). The trusted publisher names only the repository, `release.yml` and the environment, and the environment admitted any tag matching `@ydinjs/*@*`. So such a run could stage, and could read `NPM_STAGE_TOKEN`.
- **`main` changes only through a reviewed pull request.** The ruleset `Main protection` requires a pull request, status checks and linear history, and has no bypass actors (read through the API on 2026-11-20).
- **GitHub's docs** ([deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [triggering a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow), read 2026-11-20):
  - _"The deployment branch or tag rule is matched against the `GITHUB_REF` of the workflow run."_
  - For `workflow_dispatch`, `GITHUB_REF` is the branch that received the dispatch, and `GITHUB_SHA` is its last commit.
  - Events that the `GITHUB_TOKEN` creates start no run, except that _"`workflow_dispatch` and `repository_dispatch` events always create workflow runs."_
  - _"By default, administrators can bypass the protection rules"_ of an environment.
  - Environment secrets are available only to jobs that reference the environment.
- **npm 11.21.2** (tag `v11.21.2`, read through the GitHub API):
  - **Provenance** names the run's `GITHUB_SHA` as the source commit, and its `GITHUB_REF` and run. It is signed and written to the public transparency log by `npm stage publish` itself, at stage time, which prints the log's link (`workspaces/libnpmpublish/lib/provenance.js`, `lib/publish.js`).
  - **Digests.** `npm stage view <stage-id>` and `npm stage list` print the staged version's `shasum` (`lib/utils/key-values.js`). npm's [staged publishing](https://docs.npmjs.com/staged-publishing) page tells the reviewer to check the _"SHASUMs"_ before approving. npm computes only SHA-1 (`shasum`) and SHA-512 (`integrity`) for a tarball, and no sha256 (`lib/utils/tar.js`, `reviewer-2`).
  - **Inspection.** `npm stage download <stage-id>` returns the staged tarball's bytes. `view`, `list` and `download` need no second factor.
- **npm's [trusted publishers](https://docs.npmjs.com/trusted-publishers) page** states no restriction on the triggering event. For `workflow_dispatch`, it validates the name of the dispatched workflow, which is `release.yml`.

### The decision

1. **A release runs on `main`.** The owner's tag push starts a run of the tagged commit's `release.yml`, whose one job dispatches `release.yml` on `main` with the tag as input. That job has `actions: write` and nothing else. The dispatched run does all of `prepare` and `stage` in `main`'s own workflow file.
   - A run of a tag off `main` can do only what a branch push can already do. If it doesn't dispatch, nothing happens. If it dispatches with its tag, `main`'s run refuses that tag.
2. **The release run's commit check**, run by `main`'s code before anything else:
   - the run's `GITHUB_REF` is `refs/heads/main`;
   - the tag exists and points at the run's own `GITHUB_SHA`, which is `main`'s head when the run starts;
   - `verify`'s push run for that commit concluded `success`.

   The run builds that commit. Equality replaces _reachable from `origin/main`_. The provenance names `GITHUB_SHA`, so a run that built any other `main` commit would attest a commit it didn't build.
3. **The environment `npm` admits only the branch `main`,** with no tag rule, and administrators can't bypass it (O1).
   - A run of any other ref gets neither the environment's OIDC claim, which the trusted publisher requires, nor `NPM_STAGE_TOKEN`.
   - The trusted publisher doesn't change: `ausginer/material-x`, `release.yml` and `npm`.
4. **Before approving, the owner checks the run and the staged version** (step 4 of [the owner's steps](#the-owners-steps-for-one-release)).
   - **On GitHub:** the run's branch is `main` and it succeeded. GitHub shows the branch, and no workflow writes it. Given 3, the branch is what establishes that `main`'s code ran the checks and wrote the summary.
   - **On npm:** the stage id and the `shasum` match the summary. The stage id ties the staged version to that run's stage. The `shasum` ties it to the bytes that run checked.
   - **The digest is npm's `shasum`** (SHA-1), because the review page and `npm stage view` show it, and nothing on npm shows a sha256.
   - **SHA-1 is enough here.** A collision needs an attacker who controls both tarballs, and this tarball is built from `main`'s reviewed commit, so a match would need a second preimage.
   - **Not before approval:** reading the transparency-log entry. The summary links it, and step 6 reads the provenance after approval, as before. Given 3 and 4, the entry adds no fact the owner needs before he approves.
5. **The run's summaries:**
   - `prepare` gives `shasum` (SHA-1, hex) and `integrity` (`sha512-` and base64), which `release-check.ts` computes from the tarball's bytes, beside the sha256. The sha256 stays as the check between the two jobs.
   - `stage` gives the stage id, the transparency log's link, the tag and the commit.
6. **The release commit is `main`'s head when the run starts.** The owner merges nothing between his tag push and the run's start. If `main` moves first, the run refuses, the tag stays, and the release takes a new version ([question 4](#questions-for-the-owner)).
7. **Concurrency** is keyed by the tag or the package, not by `github.ref`, because every release run is on `main`.

### Not adopted

- **The owner's review alone, on the tag-push design** (comparing the run's commit with `main` by hand, before approving). It rests on a summary that the tagged commit's own file writes, and on a check he would run under time pressure. The environment's rule puts the boundary where GitHub enforces it.
- **A custom deployment protection rule** (a GitHub App that checks the tag's commit). It is in public preview and needs an app to own and run. The branch rule does the same with a setting.
- **A required reviewer on `npm`:** the owner declined one ([question 1](#questions-for-the-owner)). This design doesn't need one.
- **A `workflow_run` chain to a second workflow on `main`:** it runs `main`'s file as a dispatch does, but has a second file, and a trigger that matches by workflow name from any branch.
- **Building a `main` commit other than the head:** the provenance would name the head.
- **The owner dispatching the release by hand:** it adds a command to every release. The tag's own run dispatches it with the `GITHUB_TOKEN`, which `workflow_dispatch` allows.

## Implementation

**The order:** the owner's settings (O1 to O3 below) can happen at any time before the first release. Task 1 needs the decision merged. Tasks 2 and 3 follow task 1.

**The owner's settings, which agents don't make:**

- **O1:** the environment `npm`, with deployment branches set to the branch `main` alone, no tag rule, _Allow administrators to bypass configured protection rules_ off, and no required reviewer ([question 1](#questions-for-the-owner), answered; the branch rule and the bypass amended on 2026-11-20).
- **O2:** the ruleset `Release tags` on `refs/tags/@ydinjs/**`: block updates and deletions, with no bypass.
- **O3:** for each package's first publish, the stage-only token and the secret; afterwards, the package setting and the trusted publisher.

**Task 1. `.scripts/release-check.ts` and its tests (implementer).** It does the checks of steps 1, 2, 6 and 7 of `prepare`, and reads the registry through `npm view`'s registry endpoint over HTTPS, not through the npm CLI. Its node tests run in the `repo` project.

- **Proof,** a fixture for each check, each failing with a message that names it:
  - a tag whose version differs from `package.json`;
  - a tag that names no workspace package;
  - a commit not on `main`;
  - a `verify` run that didn't succeed;
  - a version already on the registry;
  - a `latest` version below the registry's;
  - a pack with a file outside `files`, and one with a path under `src/`;
  - a pack without `LICENSE`, and one without `CHANGELOG.md`;
  - a changelog with no section for the version;
  - a `repository.url` that differs;
  - `private: true`;
  - an `@ydinjs` dependency that isn't published.

  The same script passes on a fixture of box-quad's intended pack. The registry and Actions calls are injected, so the tests make no network call.

**Task 2. `.github/workflows/release.yml` (implementer).** As [the workflow](#the-workflow-githubworkflowsreleaseyml) specifies.

- **Proof:**
  - **Checked by reading:** `actionlint` passes, if the repository has it; otherwise the reviewer reads every `permissions` block and every `uses:` pin.
  - **Dispatched after merge:** a dispatched check run for `box-quad` at `main`'s head passes `prepare`, and its summary lists the expected files. The `stage` job is skipped.
  - **The mutation:** a dispatched check run on a branch that adds `src/index.ts` to box-quad's `files` fails `prepare` at the pack check. Dispatching runs the branch's workflow file, so the mutation needs no merge.
  - **Witnessed at the first release, and recorded** (amended on 2026-11-20):
    - the tag's run dispatched the release run, and that run's branch is `main`;
    - the stage job ran under the environment `npm`;
    - the summary's `shasum` and `integrity` equal the approved version's `dist.shasum` and `dist.integrity` on the registry;
    - the provenance attestation names `refs/heads/main`, `release.yml`, the tagged commit and the run.

**Task 3. `.agents/docs/releasing.md` (implementer, with the docs rules of [`documentation.md`](../../.agents/docs/documentation.md)).** The current-state procedure:

- the owner's steps;
- the first publish;
- the second release's trusted publisher;
- the check mode;
- what each job checks;
- what to do with a rejected version.

`AGENTS.md`'s _Where things are_ gains one line that points to it.

- **Proof:** the links resolve, and `oxfmt` and `git diff --check` are clean.

**Task 4. A release runs on `main` (implementer, after the fixes of `reviewer-1`, `reviewer-4` and `reviewer-5`).** As [the amendment](#amendment-a-release-runs-on-main) specifies, in `release.yml`, `release-check.ts` and `releasing.md`'s _What the workflow checks_ and _Check runs_. The architect has already amended `releasing.md`'s release steps and the owner's settings.

- **`release.yml`:**
  - **The triggers:**
    - a tag push runs only a `dispatch` job, with `permissions: actions: write`, no checkout, and the tag passed through `env`;
    - `workflow_dispatch` takes a `tag` for a release, or a `package` for a check, and not both;
    - `stage` runs only for a `tag` on `refs/heads/main`.
  - **The concurrency** is keyed by the tag or the package.
  - **The summaries** are amendment item 5.
  - **The header comment** states the new flow.
- **`release-check.ts`:**
  - **The commit check** is amendment item 2.
  - **The digests:** it computes `shasum` and `integrity` from the tarball's bytes.
- **Proof:**
  - **Node fixtures for the commit check,** each refused with a message that names its check:
    - a release run whose ref isn't `refs/heads/main`;
    - a tag that points at a commit other than the run's;
    - a tag that doesn't exist;
    - a run with both `tag` and `package`, and one with neither.
  - **The digests** of a fixture tarball equal the constants that `sha1sum` and `openssl dgst -sha512 -binary | base64` print for it, recorded in the test.
  - **The reviewer reads O1** through the API before the first tag: `gh api repos/ausginer/material-x/environments/npm` shows `can_admins_bypass: false` and a branch policy of `main` alone, and `…/deployment-branch-policies` lists one policy, the branch `main`.
  - **Task 2's dispatch proofs** still hold, and its first-release witnesses are as amended.

**Review.** A feature proof of tasks 1 to 3 against this plan, by a reviewer who didn't implement them, before the first tag. It repeats the mutation dispatch.

**What box-quad's plan changes.** Architect B's [release procedure](https://github.com/ausginer/material-x/blob/repo/box-quad-release-1/.plan/box-quad-release-1/box-quad-release-plan.md#release-procedure) steps 2 to 5 become [the owner's steps](#the-owners-steps-for-one-release) above. Its step 6 stays as step 6. Its task 1 sets the version to `1.0.0`, and its task 4 sets the ceiling.

**What the coordinator should know, for box-quad's task 1:**

- drag's manifest depends on `@ydinjs/box-quad` `0.1.0` exactly. The version change must move that dependency to `1.0.0` in the same commit, or the workspace can no longer resolve box-quad from itself.
- drag's own release then checks that `1.0.0` is on the registry (task 1's dependency check).

## Questions for the owner

**All three are answered** by the owner on 2026-11-20, relayed by the coordinator, and recorded in `RD-27`. The design above already assumed each recommended answer, so the answers change nothing in it.

1. **A required reviewer on the environment `npm`?** **Recommended: no.** Every version already waits for your approval on npm, with your key. A GitHub reviewer would be a second click on the same decision, with a weaker factor.
   - **Answered: no required reviewer.** _"Согласен с архитектором"_ ("I agree with the architect").
2. **The first publish: a stage-only token for a day (recommended), or you stage the first tarball yourself?**
   - With the token, the first version carries provenance, as Q4 asks.
   - Staging it yourself needs no token, and that version has no provenance.
   - If npm refuses a stage-only token for a new name, the first run shows it, and the fallback is staging it yourself.
   - **Answered: the token.** _"Давай (а) попробуем"_ ("Let's try (a)"). The token is stored as the secret `NPM_STAGE_TOKEN` of the environment `npm` and revoked after the publish, as [the first publish](#the-first-publish-of-a-package) states. Staging it himself stays the fallback.
3. **The amendment to `RD-16` property 1:** the `stage` job runs `npm stage publish`, outside any checkout, because aube implements neither trusted publishing nor staging ([what runs where](#the-workflow-githubworkflowsreleaseyml)).
   - **Answered: approved.** _"Конечно да, пусть npm работает"_ ("Yes, of course, let npm do it").

**Open, from [the amendment](#amendment-a-release-runs-on-main) of 2026-11-20:**

4. **Do you accept that a release is tagged at `main`'s head, and that you merge nothing until its run has started?** **Recommended: yes.**
   - Why: the run is on `main`, so its provenance names `main`'s head, and the run must build exactly that commit.
   - The tag's own run dispatches the release within seconds, so in practice this means tagging after `verify` passes on the head, and merging after the run starts.
   - The cost: if `main` moves first, the run refuses, and that version needs a new tag. Tags can't move.
   - The alternative is the tag-push design, with you checking by hand before each approval that the run's commit is on `main`. The amendment explains why it isn't adopted.
5. **O1 changes:** the environment `npm` admits only the branch `main`, with no tag rule, and _Allow administrators to bypass configured protection rules_ off. This is your setting to make. Is there a reason to keep the administrator bypass? **Recommended: off.** Agents act through your account, so the bypass would let them past the branch rule.

## Not adopted

- **A GitHub release, or release notes beside `CHANGELOG.md`:** the changelog is the release note, as Architect B's plan decides.
- **A release tool** such as Changesets or release-please: each release is one tag on one commit for one package. A tool would write versions and changelogs that the release pull request already writes.
- **A long-lived publish token:** npm removes direct publishing with granular tokens in January 2027. A token is also what the package setting is there to forbid.
- **Direct `npm publish` from CI:** it would make a version public with no second factor anywhere.
- **`aube publish --provenance`:** aube doesn't document trusted publishing or staging, so it would need a token on every release.
- **Releasing several packages in one run:** each package has its own tag and its own approval, and a run that fails partway leaves nothing half done.
- **A `prepack` script:** as in Architect B's plan, the build is explicit, and the published tarball is the one that was checked.