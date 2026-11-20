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

**Triggers:**

- **`push` of a tag matching `@ydinjs/*@*`:** a release.
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
   - The tagged commit is reachable from `origin/main`.
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
- **The GitHub environment `npm`** allows deployments only from tags matching `@ydinjs/*@*`. So a branch, a pull request or a dispatched run can't obtain the job that holds `id-token: write`. It has no required reviewer, because the approval on npm is the gate ([question 1](#questions-for-the-owner)).
- **A tag ruleset**, `Release tags`, makes the tags permanent: it blocks the update and deletion of `refs/tags/@ydinjs/**`, with no bypass. It leaves creation alone, because the agents act through the owner's own GitHub account, so no rule can tell his tag push from theirs. `AGENTS.md` and the npm approval are what keep them out. The owner creates the ruleset and the environment. Agents change no repository rule (`AGENTS.md`).
- **The first publish's stage-only token** is an environment secret of `npm`. So only the `stage` job on a release tag can read it, and it is deleted after that publish.

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
3. **He pushes the tag at _M_:** `git tag @ydinjs/<name>@<version> <M> && git push origin @ydinjs/<name>@<version>`.
4. **He reviews the staged version** on npmjs.com, in _Staged Packages_. He checks that the file list and the sha256 match the run's summary, then approves with his security key.
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

## Implementation

**The order:** the owner's settings (O1 to O3 below) can happen at any time before the first release. Task 1 needs the decision merged. Tasks 2 and 3 follow task 1.

**The owner's settings, which agents don't make:**

- **O1:** the environment `npm`, with its deployment rule for tags matching `@ydinjs/*@*`, and no required reviewer ([question 1](#questions-for-the-owner), answered).
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
  - **Witnessed at the first release, and recorded:** that the stage job ran under the environment `npm`; that the summary's sha256 equals the approved tarball's `shasum`; and the provenance attestation on the registry.

**Task 3. `.agents/docs/releasing.md` (implementer, with the docs rules of [`documentation.md`](../../.agents/docs/documentation.md)).** The current-state procedure:

- the owner's steps;
- the first publish;
- the second release's trusted publisher;
- the check mode;
- what each job checks;
- what to do with a rejected version.

`AGENTS.md`'s _Where things are_ gains one line that points to it.

- **Proof:** the links resolve, and `oxfmt` and `git diff --check` are clean.

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

## Not adopted

- **A GitHub release, or release notes beside `CHANGELOG.md`:** the changelog is the release note, as Architect B's plan decides.
- **A release tool** such as Changesets or release-please: each release is one tag on one commit for one package. A tool would write versions and changelogs that the release pull request already writes.
- **A long-lived publish token:** npm removes direct publishing with granular tokens in January 2027. A token is also what the package setting is there to forbid.
- **Direct `npm publish` from CI:** it would make a version public with no second factor anywhere.
- **`aube publish --provenance`:** aube doesn't document trusted publishing or staging, so it would need a token on every release.
- **Releasing several packages in one run:** each package has its own tag and its own approval, and a run that fails partway leaves nothing half done.
- **A `prepack` script:** as in Architect B's plan, the build is explicit, and the published tarball is the one that was checked.