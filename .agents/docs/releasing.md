# Releasing an `@ydinjs` package

> Retrieved when preparing, checking or reading the result of a package release.

Each package is released by [`.github/workflows/release.yml`](../../.github/workflows/release.yml), which stages it on npm with provenance. Nothing is public until the owner approves the staged version on npm with his second factor. The decision is `repo:RD-27`, and the design is the [release workflow plan](../../.plan/release-workflow-1/release-workflow-plan.md).

**What agents don't do:** push a release tag, approve or reject a staged version, create a token, configure a trusted publisher, or change the environment `npm` or a ruleset. These are the owner's acts.

## Versions, tags and dist-tags

- Each package has its own semver version in its `package.json`, and its own `CHANGELOG.md`, with one section per version, headed by the version.
- A dependency on another `@ydinjs` package is an exact version, and that version must be on the registry when the dependent package is released.
- A release is one tag, `@ydinjs/<name>@<version>`, on `main`'s head. Tags can't move or be deleted.
- The release runs on `main`. The tag's own run only dispatches `release.yml` on `main` with the tag. That run refuses unless the tag points at its own commit, so `main` must not move between the tag push and the run's start. Its provenance names `refs/heads/main`, that commit and the run.
- A version with a prerelease part, such as `1.1.0-rc.1`, is staged under `next`. Any other version is staged under `latest`, and must be greater than the registry's `latest`.

## One release

1. **Agents prepare the release pull request:** the version, the changelog section, on a first release the package's size ceilings at their readings (`repo:RD-27` property 2), and whatever the package's own release plan requires.
   - `just release-check <name>` passes locally, and a [check run](#check-runs) passes on the pull request's head.
   - The owner merges it, and `verify` passes on the merge commit _M_ on `main`.
2. **On a first release,** steps 1 and 2 of [the first publish](#the-first-publish-of-a-package). **On the second release,** [the trusted publisher](#the-trusted-publisher).
3. **The owner pushes the tag at _M_,** while _M_ is still `main`'s head, and merges nothing until the release run has started:

   ```sh
   git tag @ydinjs/<name>@<version> <M>
   git push origin @ydinjs/<name>@<version>
   ```

   The tag's run dispatches the release run on `main` within seconds.

4. **Before approving, he checks two things:**
   1. **On GitHub,** in the `release` workflow's runs: the run that his tag dispatched is on the branch `main` and succeeded, and its summary names his tag and _M_. GitHub shows the branch. Only a run on `main` can stage, so the branch shows that `main`'s own workflow checked and staged the version.
   2. **On npmjs.com,** under _Staged Packages_, or with `npm stage view <stage-id>`: the staged version's stage id and `shasum` equal the ones in that run's summary. The `shasum` is the tarball's SHA-1, which is the digest npm shows. npm shows no sha256.

   He then approves it with his security key. If either check fails, he rejects it.

5. **On a first release,** step 4 of [the first publish](#the-first-publish-of-a-package).
6. **An agent reads the result** and writes it into the package's release record:
   - the version on the registry;
   - its provenance attestation, which names the run;
   - an install into an empty project, with the import type-checked.

   The package's release issue closes on that reading.

### A rejected version

If the owner rejects a staged version, nothing is deleted. The next attempt is a new version and a new tag, through a new release pull request. A tag can't move, and npm's version index includes staged versions.

### A release run that isn't on `main`

The tag's run dispatches with the short name `main`. If a tag named `main` exists, GitHub may dispatch that tag instead of the branch. The release run's ref is then `refs/tags/main`, and it runs that tag's workflow file. It stages nothing, because the environment `npm` admits only the branch `main`.

The owner deletes the tag `main`. While his release tag is still `main`'s head, he dispatches the release himself, and the version needs no new tag:

```sh
gh workflow run release.yml --ref main -f tag=@ydinjs/<name>@<version>
```

## What the workflow checks

**`dispatch`** is the only job a tag push runs, with `actions: write` and no checkout. It dispatches `release.yml` on `main` with the tag as the `tag` input. So the release runs `main`'s workflow file, and the tagged commit's own file runs nothing.

**`prepare`** runs on a dispatched run, a release or a check, with `contents: read` and `actions: read`. A failed check names itself in an error annotation and in the job summary.

1. **The release.** The run names a `tag` or a `package`, not both and not neither. The tag names a workspace package and a semver version, and the package's `package.json` has that version. A check run takes the package from its input and the version from the manifest.
2. **The commit**, on a release run only:
   - the run is on `refs/heads/main`;
   - the tag exists and points at the run's own commit, which was `main`'s head when the run started;
   - `verify`'s push run on `main` for that commit concluded `success`.

   The run builds that commit, and its provenance names it.

   **The registry**, on both. The version isn't on the registry, and a `latest` version is greater than the registry's `latest`. A staged version doesn't appear to this read; staging it again fails at the stage.

3. **The build:** `aube ci`, then the package and its dependencies through nx.
4. **The size:** the package's `size` script, if it has one. A row over its ceiling fails the release.
5. **The pack:** `aube pack`, with no lifecycle scripts.
6. **The tarball:**
   - it holds `package.json`, `README.md`, `LICENSE` and `CHANGELOG.md`;
   - every other file matches an entry of the manifest's `files`;
   - no path is under `src/`, `tests/` or `.plan/`, and no file is a test file;
   - `repository.url` is `git+https://github.com/ausginer/material-x.git`, and `repository.directory` is the package's directory;
   - `publishConfig.access` is `public`, and the manifest has no `private`;
   - every `@ydinjs/*` dependency is an exact version that is on the registry;
   - `CHANGELOG.md` has a heading that names the version.
7. **A consumer's use:** the tarball is installed with aube into an empty project outside the checkout, so its `@ydinjs` dependencies come from the registry. A module that imports every export type-checks with `skipLibCheck` off and the DOM library.
   - **`"sideEffects": false`** (`repo:RD-30`): when the manifest declares it, a bare import of each export, bundled from that project by rolldown with `treeshake.moduleSideEffects` a function that returns `true`, emits no code and no asset. An imported stylesheet counts as an asset. A manifest whose field has another value, such as an array, fails, because the check reads only `false`. A module that gains an effect fails the check under `side-effects`: remove the effect, mark the call `/* @__PURE__ */`, or list the module in an array and extend the check to read it.
8. **The artifact:** the tarball and its sha256, uploaded as `release`. The summary lists the files, the dist-tag, and the tarball's `shasum` (SHA-1, hex) and `integrity` (`sha512-` and base64), which are the digests npm shows, with the sha256.

Steps 1, 2, 6 and 7 are [`.scripts/release-check.ts`](../../.scripts/release-check.ts).

**`stage`** runs only on a release run on `main`, after `prepare`, in the environment `npm`, with `id-token: write` and `actions: read`. It has no checkout.

1. It installs the npm version that the workflow pins.
2. It downloads the artifact and checks the sha256 that `prepare` recorded.
3. It runs `npm stage publish` on the tarball, with `--access public`, the dist-tag and `--provenance`.
4. Its summary gives the stage id, the `shasum`, the tag, the commit, the transparency log's link that npm prints, and the package's npm page.

## Check runs

A check runs everything `prepare` does except the commit checks, and stages nothing. It is how a release pull request is read before the tag exists.

- **On GitHub:** `gh workflow run release.yml --ref <branch> -f package=<name>`, where `<name>` is the package's name without `@ydinjs/`. The run uses the branch's workflow file. A run given both `tag` and `package`, or neither, fails at its first check. A `tag` given on any branch but `main` fails the commit check, and `stage` doesn't run.
- **Locally:** `aube exec just release-check <name>` builds the package, runs its `size` script, packs it, and runs steps 6 and 7 on the tarball. It doesn't check the tag, the commit or the registry's versions, and it uses the installed tree rather than `aube ci`.

## The first publish of a package

A trusted publisher can't be configured for a package that isn't on the registry, so the first stage authenticates with a token.

1. **The owner creates a granular token:** _Read and write (stage only)_, limited to the `@ydinjs` scope, with the shortest expiry npm allows.
2. **He stores it as the secret `NPM_STAGE_TOKEN`** of the environment `npm`. The `stage` job passes it to npm, which uses it when it finds no trusted publisher. The run's `id-token: write` still lets `--provenance` attest the run.
3. **He pushes the tag,** and approves the staged version on npm.
4. **He deletes the secret, revokes the token,** and sets the package's publishing access to _Require two-factor authentication and disallow tokens_.

Staging a new name also publishes the public placeholder version `0.0.0-stage`.

**If npm refuses the stage-only token for a new name,** the owner stages the tarball of the release run's `release` artifact from his own machine, after checking that its sha256 matches the run's summary: `npm stage publish <tarball> --access public --tag <dist-tag>`. That version has no provenance.

## The trusted publisher

**Configured for a package's second release, within the 2 days before its tag:** npm expires a configuration that hasn't completed a publish within 2 days. The owner runs, with npm 11.15.0 or later:

```sh
npm trust github @ydinjs/<name> --repo ausginer/material-x --file release.yml --env npm --allow-stage-publish
```

or configures the same on the package's settings page. It allows `npm stage publish` and nothing else. From then on, the `stage` job authenticates with the run's OIDC token, and no token exists for the package.

## The owner's settings

- **The environment `npm`:** deployments only from _Selected branches and tags_, with one rule, a branch rule named `main`, and no tag rule; _Allow administrators to bypass configured protection rules_ off; and no required reviewer. His approval on npm is the gate. The branch rule is what keeps a run of any other ref, a tag off `main` or a tag named `main` included, from staging or reading `NPM_STAGE_TOKEN`.
- **No other workflow names the environment `npm`.**
- **The ruleset `Release tags`** on `refs/tags/@ydinjs/**`: updates and deletions are blocked, with no bypass.
- **Per package,** after its first publish: _Require two-factor authentication and disallow tokens_, and the trusted publisher above.