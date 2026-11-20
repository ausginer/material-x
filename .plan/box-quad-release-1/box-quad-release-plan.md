# box-quad's first release — plan

**Status: the owner answered all five questions on 2026-11-20, as relayed by the coordinator ([Owner's answers](#owners-answers)). Task A is done.** The main slot's architect registers the answers as a repository decision, and that entry governs where it and this plan differ. Written by Architect B on 2026-11-20 at `d69e3ddbc` (`origin/main`), on `repo/box-quad-release-1` in slot `f`, on the coordinator's task for issue #56. The owner asked for the work to start, and for box-quad to appear in the shared TypeDoc output. **Publishing is the owner's checkpoint:** this unit and the implementation units it plans stop before any `publish`. No identifier is minted here. The owner's answers are registered as one repository decision by the main slot's architect, as `repo:RD-24` was. **Revised the same day** for the answers: the version is `1.0.0`, and a release workflow publishes instead of the owner by hand. Until then the plan recommended `0.1.0` and described a hand publish, which the [Release procedure](#release-procedure)'s last paragraph keeps.

The plan is repository-level because the first release of any `@ydinjs` package sets the release procedure, the changelog form and the docs index that the next releases reuse. drag is next in the owner's release order.

## Readings

Read by the architect at `d69e3ddbc` in slot `f`. The transcript is [`checks/readings.txt`](checks/readings.txt), and the section numbers below are its blocks.

- **Nothing is published.** The registry has no `@ydinjs` package, box-quad included (§6). This is the first publication from the repository, so no release procedure, workflow or changelog exists to follow. `verify.yml`, `baselines.yml` and `safari.yml` publish nothing to a registry.
- **A pack today would ship the repository's working files.** `packages/box-quad/package.json` has no `files`, so `aube pack --dry-run` lists `.plan/` (the record, its probes and reviews), `tests/`, `src/`, the Justfile and every configuration file, beside the three built files (§1). The package isn't `private`, so nothing stops an accidental publish of that tarball.
- **The built files are complete without `src`.** `index.js.map` embeds its source in `sourcesContent` (§2), so the tarball needs `index.js`, `index.js.map` and `index.d.ts` and nothing else that is built.
- **The manifest lacks the metadata that material-x carries:** `description`, `author`, `homepage`, `bugs`, `repository` and `publishConfig` (§7). A scoped package is restricted on the registry unless it is published with public access. `license` is `Apache-2.0`, and the package has no `LICENSE` file, while `core`, `drag` and `material-x` each carry a copy of the root's.
- **No README and no changelog.** The record's own header names "the package `README.md`" as a current-state document, and the file doesn't exist.
- **The docs recipes are drag's, copied.** `packages/box-quad/Justfile`'s `docs-api-prepare` and `docs-api-build` write to `node_modules/.cache/docs/api/drag` and `.docs/api/drag`, drag's own paths (§3). **Confirmed as a copy defect.** It is latent: box-quad's manifest has no `docs:api:*` script, so nx can't run the recipes, and only a hand run in the package directory reaches them. That run replaces drag's section, or drag's replaces box-quad's.
- **The shared API output doesn't discover packages.** Each package is wired by hand in four places (§3):
  - the root `docs-dev` runs `@ydinjs/core:docs:api:prepare`, and `docs-build` runs `@ydinjs/core:docs:api:build`, so only core's TypeDoc is built;
  - `.scripts/docs-api.ts` writes the API index, `api/index.html`, with a fixed link to `./core/index.html`, and material-x's landing page with a link back to core;
  - Storybook's `Reference/API` page, `packages/material-x/src/reference/api.mdx`, links core and the material-x landing page;
  - `docs-smoke` loads `api/index.html` and no TypeDoc section.

  Storybook serves the dev cache at `/api` through `MATERIAL_X_API_STATIC_DIR`. The production build writes `.docs/api` after Storybook's build, and `deploy` publishes `.docs` to Pages. Storybook's stories, unlike the API, are discovered from every `packages/*/src`.

- **box-quad's TypeDoc builds clean.** `typedoc.json` exists, with `./src/index.ts` as its entry, and a build with `--treatWarningsAsErrors` exits 0 (§4).
- **Size: 1,182 B Brotli** for the one `index` row, which the `measurements` job already reads (§5). `.size-limit.json` has no `limit`. The brief's directional target is _"roughly ≤ 1.0–1.5 kB Brotli"_ for the read path.
- **The published declarations are already checked.** `just typecheck-declarations` builds box-quad and checks `index.d.ts` as a consumer reads it (`repo:RF-51`). `index.d.ts` imports nothing.
- **The contract describes an API the source doesn't have.** `contract/00-index.md` binding decision 1 and `contract/01-public-api.md` define one function, `readBoxQuad`. The source exports `ancestry`, `coordinates`, `projection` and `localDelta`, and the storage types `Box`, `Space`, `Quad` and `Delta` (§8). This is box-quad's open finding `F-1`. Its own text says why it matters: _"the package is not `private` and carries a version, so it must be treated as published"_. `contract/04-support-matrix.md` describes behavior, not names, and still holds.
- **drag consumes box-quad.** drag's built declarations import box-quad's types, and its manifest depends on `@ydinjs/box-quad` `0.1.0` exactly. So drag can't be published before box-quad, which matches the owner's order.
- **The root `clean-build` omits box-quad,** although `build`, `typecheck`, `fmt` and `lint` include it (`Justfile:17`).

## What the release lacks

| Item | Today | Required before the publish | Decided in |
| --- | --- | --- | --- |
| Published files | Everything in the package directory | The three built files, `README.md`, `CHANGELOG.md`, `LICENSE` and `package.json` | [Property 1](#1-the-manifest-and-the-published-files) |
| Manifest metadata | `name`, `version`, `license`, `type`, `exports` | Also `description`, `author`, `homepage`, `bugs`, `repository`, `sideEffects` and `publishConfig` | [Property 1](#1-the-manifest-and-the-published-files) |
| `version` | `0.1.0` | `1.0.0`, and drag's dependency on it follows | [Q1](#owners-answers), [property 1](#1-the-manifest-and-the-published-files) |
| `engines` | None | None | [Property 1](#1-the-manifest-and-the-published-files) |
| `LICENSE` | Missing | A copy of the root's | [Property 1](#1-the-manifest-and-the-published-files) |
| README | Missing | Consumer documentation | [Property 2](#2-the-readme) |
| Changelog | Missing | `CHANGELOG.md`, one entry for this version | [Property 3](#3-the-changelog) |
| Size limit | Measured, no ceiling | The reading after the release's last change, no slack | [Q2](#owners-answers), [task 4](#implementation) |
| Browser support | Not stated anywhere | The current stable release of Chromium, Firefox and Safari | [Q3](#owners-answers), [property 2](#2-the-readme) |
| TypeDoc | Recipes write into drag's directory, and nothing runs them | Its own section in the dev cache and in `.docs/api`, linked from the API index and from Storybook | [Property 4](#4-the-api-docs) |
| Contract | Described a function the source doesn't export | Describes the exported API. **Done** | [Property 5](#5-the-contract-describes-the-published-api) |
| Release workflow | None | A workflow that publishes with provenance, a repository-wide unit of its own | [Q4](#owners-answers), [Release procedure](#release-procedure) |
| Registry scope | Not readable from here | Confirmed by the owner | [Q5](#owners-answers) |
| Root `clean-build` | Omits box-quad | Includes it | [Property 6](#6-the-root-clean-build-includes-box-quad) |

## Decided here

These are the architect's, within the owner's authorization to prepare the package. None changes box-quad's API or behavior.

### 1. The manifest and the published files

- **`files`** lists `index.js`, `index.js.map`, `index.d.ts` and `CHANGELOG.md`. The pack then holds those four, `README.md`, `LICENSE` and `package.json`, and nothing else. `CHANGELOG.md` is listed because whether a packer adds a changelog by itself varies between packers. The pack listing is the check, not the field.
- **`LICENSE`** is a copy of the root's, as in `core`, `drag` and `material-x`.
- **`description`** says what the package does in one plain sentence, for example _"Border-box quads of transformed, zoomed and scrolled HTML elements, read into storage the caller owns."_
- **`author`, `homepage`, `bugs` and `repository`** follow material-x's manifest. `author` is the same string. `homepage` is `https://github.com/ausginer/material-x/tree/main/packages/box-quad#readme`. `repository` adds `"directory": "packages/box-quad"`, which tells the registry where the package lives in the repository.
- **`sideEffects: false`.** The built module's top level holds only `const` and function declarations and one `export` (§8's `index.d.ts` and the built `index.js`). The field lets a bundler that trusts it drop an import whose bindings are unused. If the module ever gains a top-level effect, the field becomes false, so the implementer's reading of the top level is the proof, and the reviewer repeats it.
- **`publishConfig: { "access": "public" }`,** as `core`, `material-x` and `vite-traits-plugin` declare. Without it a scoped package is published as restricted.
- **No `engines`.** box-quad runs in a browser and uses no Node API, so `engines.node` would state a requirement that the package doesn't have. Browser support is stated in the README ([Q3](#owners-answers)).
- **`version` is `1.0.0`** ([Q1](#owners-answers)). drag's manifest names `@ydinjs/box-quad` `0.1.0` exactly, so it changes to `1.0.0` in the same commit, and the lockfile with it. A workspace dependency whose version no workspace package has would otherwise be looked up on the registry.
- **`exports`, `type` and `license` don't change.** `exports` already has `.` and `./package.json`, and tsdown writes the same map at each build.
- **No `private`.** The pack listing and the release workflow's own check are what keep the wrong tarball off the registry.

### 2. The README

`packages/box-quad/README.md` is consumer documentation. The rules for published JSDoc in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#comments-and-jsdoc) apply to it: no record identifiers, commit hashes, review names or `.plan` paths, and a precondition that the compiler can't state is written down. It says:

- what the package does and doesn't do, in a few sentences: border-box quads of one `HTMLElement` with one unfragmented principal box, through 2D transforms, CSS `zoom` and scrolling, in viewport coordinates or relative to another element. It isn't a `getBoxQuads()` polyfill and never calls the native one;
- how to install it, with `npm install @ydinjs/box-quad`, because the consumer's command is npm's (`repo:RD-16`);
- a short example that measures two elements and projects one into the other's local space, with `ancestry`, `coordinates` and `projection`, and one with `localDelta` turning a pointer delta into the translation to write;
- the storage model: each function writes into storage the caller owns and returns `true`, or returns `false` and leaves the storage untouched. `[]`, a plain object and a `Float64Array` of the stated length all work, and the slots are listed;
- the two preconditions that the types can't state: a `Space` passed to `coordinates` must be that element's own, and the two boxes passed to `projection` must come from the same viewport;
- what is supported and what returns `false`, from `contract/04-support-matrix.md` §§2–3 in plain words;
- browser support: the current stable release of Chromium, Firefox and Safari ([Q3](#owners-answers)), in the words of the decision that registers it;
- a link to the API reference on the docs site, `https://ausginer.github.io/material-x/api/box-quad/`, which exists once property 4 is on `main` and deployed;
- the license.

### 3. The changelog

`packages/box-quad/CHANGELOG.md`, written by hand. One section per published version, newest first, headed by the version. A section says what a consumer sees change: added, changed, removed and fixed. The first section says that this is the first release and lists the exported functions and types. **No changelog tool** while one package is released. Each release unit adds its section, and the release decision that registers the owner's answers states the form for later packages.

### 4. The API docs

The required properties:

- **box-quad's TypeDoc has its own section,** `api/box-quad/`, in the dev cache (`node_modules/.cache/docs/api/box-quad`) and in the built site (`.docs/api/box-quad`). drag's recipes and paths don't change.
- **nx can run it:** box-quad's manifest has `docs:api:prepare` and `docs:api:build` scripts, as core's has, which call the package's recipes.
- **The root recipes build it:** `docs-dev` and `docs-build` build the API sections of `core` and `box-quad`, by name, for example with `nx run-many -t docs:api:build --projects=core,box-quad`. drag isn't added. Its own release unit adds it. A `run-many` over every project that has the target would include drag today.
- **It is linked:** the API index that `.scripts/docs-api.ts` writes links `./box-quad/index.html` beside core, and the material-x landing page links it back, as it links core. Storybook's `Reference/API` page (`packages/material-x/src/reference/api.mdx`) links it through `withDocsBase('api/box-quad/index.html')`.
- **The smoke check sees it:** `docs-smoke` loads every TypeDoc section that `api/index.html` links, today core and box-quad, with the same page-error rule as the API index. A link whose page is missing fails the check. Reading the links from the built index, instead of a second hand-kept list, is what makes a later package's missing section fail without anyone remembering to add a target.

### 5. The contract describes the published API

**`F-1`'s API half closes before the publish.** That means `contract/00-index.md` binding decision 1, `contract/01-public-api.md`, and the mentions of the old single-call function in `02-behavior-scenarios.md` and `03-failure-table.md`. They are rewritten to describe what the source exports. The behavioral expectations and the scenario IDs don't change, with one exception found during the rewrite: below.

**Done 2026-11-20 on this branch,** and `F-1` is closed ([box-quad's record](../../packages/box-quad/.plan/plan.md), 2026-11-20). **One expectation did change on paper:** `REL-10` expected a `false` result for a source and a target from different documents, and `FAIL-CROSS-DOCUMENT` recognized it. A `Box` carries no document, so `projection` can't compare documents. The source stopped detecting it when measurement and projection were split, and the `REL-10` test asserts that it isn't detected. The contract now states it as a precondition of `projection`, as the source's JSDoc does, and withdraws the failure ID. No code changes.

- **Why it blocks:** after the first publish, [`CONTRIBUTING.md` §8](../../CONTRIBUTING.md#8-do-not-preserve-compatibility-for-an-unreleased-api) no longer applies, and at `1.0.0` removing or renaming an export takes a major version. The contract is what a later change to the API is reviewed against. A contract that names a function nobody can import can't serve that purpose. The README's support statements also come from the contract.
- **Who does it:** box-quad's architect, as a record unit before the README is written. It mints no `BQ-*` unless the rewrite finds an export that the source and the decisions disagree on. In that case the question goes to the owner before the publish, because after it the answer costs a breaking version.
- **What it isn't:** a redesign. The surface is the one that `BQ-9`, `BQ-12` and the 2026-11-13 entries decided. drag uses `ancestry`, `coordinates`, `localDelta` and the types `Box`, `Space` and `Delta`. `projection` and `Quad` are the package's quad output, the reason it exists.

### 6. The root `clean-build` includes box-quad

The root `clean-build` gains `box-quad` in its project list, like the other root recipes. This is a small fix that this release unit carries, because the release procedure starts from a clean build.

## Questions for the owner

**Answered on 2026-11-20** ([Owner's answers](#owners-answers)). The questions are kept as they were asked.

**Q1. The first version.**

- **(a) `0.1.0`, the version the manifest already has. Recommended.** A `0.x` version tells consumers that a minor release may break them. Twelve decisions in the record, `BQ-1` to `BQ-12`, reshaped the API, and drag is its only consumer so far. drag's manifest already names `0.1.0`.
- **(b) `1.0.0`.** It promises that the API stays compatible until `2.0.0`.

**Q2. A size ceiling.**

- **(a) A ceiling, set to the `index` row's reading after the release's last change, with no slack. Recommended.** This is what `repo:RD-24` property 6 decides for material-x before its first publication. Today's reading is 1,182 B. The brief treats size as a product requirement, and the source hasn't changed since 2026-11-13. Under `repo:RD-7`, a ceiling notifies and never fails the build.
- **(b) No ceiling.** The row goes on reporting the size and its change on every pull request.

**Q3. Browser support. box-quad does need something like `repo:RD-20`'s floor:** its results depend on each engine's layout geometry, through CSS `zoom`, the individual transform properties and client rects, and no document states which engines it supports. `RD-20` covers material-x only.

- **(a) The current stable release of Chromium, Firefox and Safari, as `RD-20` states for material-x, written in the README and in `CONTRIBUTING.md` _Language and platform_. Recommended.** The suite runs each engine's current stable release, and nothing tests an older one. A list of minimum versions would promise what nothing checks. For geometry, unlike syntax, only a test establishes whether an engine version gives the right result.
- **(b) A browserslist with a minimum version for each engine, now.** This is the form you chose for material-x's release. It needs a unit that derives the versions from the features box-quad depends on, using compatibility data, and records that the suite doesn't test those versions.

**Q4. How the package is published.**

- **(a) You publish `0.1.0` by hand, from the tarball that the release procedure below inspects. Recommended for this release.** It needs nothing new in the repository. It can't carry an npm provenance attestation, which needs a CI identity.
- **(b) A release workflow comes first:** a GitHub Actions workflow that publishes with provenance, started by hand or by a tag. This is a repository-wide unit of its own, with a decision on its trigger, token and permissions, and drag and material-x would reuse it. It wasn't established here whether npm accepts a trusted publisher for a package that doesn't exist on the registry yet. The unit that plans the workflow reads npm's documentation first.

**Q5. A precondition, not a choice:** confirm that you hold the `@ydinjs` scope on npm, as an organization or a user named `ydinjs`, and that the account that publishes uses two-factor authentication. Nothing in the repository records it, and an anonymous read of the organization's page was refused.

## Owner's answers

Given on 2026-11-20 and relayed by the coordinator. The registered repository decision governs. This section says only what the plan does with each answer.

- **Q1: (b), `1.0.0`.** [Property 1](#1-the-manifest-and-the-published-files) sets it, and drag's dependency follows.
- **Q2: (a), the reading after the release's last change, with no slack.** The owner added a rule for later changes: lowering the ceiling needs no question, and raising it needs his approval. [Task 4](#implementation) sets the ceiling.
- **Q3: (a), the current stable release of each engine, for now.** The owner said minimum versions are to be derived later for every package. [Property 2](#2-the-readme) states it in the README, and the registering decision says where else it is stated.
- **Q4: (b), a release workflow with provenance first.** It is a repository-wide unit of its own, which the main slot's architect designs. This plan doesn't design it. The [Release procedure](#release-procedure) lists only what this release requires of it.
- **Q5: confirmed.** The owner holds the `@ydinjs` scope on npm and uses two-factor authentication with an authenticator app and security keys.

## Release procedure

**The release workflow publishes, and the owner starts it.** Its design, trigger, credentials and permissions belong to its own unit ([Q4](#owners-answers)). For box-quad's first release, it must meet these properties:

- it publishes from a `main` commit on which `verify` passed;
- it builds the package from that commit and publishes the tarball it built, after checking that the tarball lists exactly `CHANGELOG.md`, `LICENSE`, `README.md`, `index.d.ts`, `index.js`, `index.js.map` and `package.json`, with `version` `1.0.0`;
- it publishes with public access and a provenance attestation;
- after the publish, an agent reads the registry, installs the package into an empty scratch project, imports it, and type-checks the import with `skipLibCheck` off. The reading goes in the release record, and #56 closes on it.

Whether the tarball check is a step of the workflow or a standing test is the workflow unit's decision ([Not adopted](#not-adopted)).

**Superseded by Q4 (b), kept for the record:** the plan first proposed that the owner publish by hand, as follows.

1. `verify` passes on `main` at the merge commit _M_.
2. In a clean checkout of _M_: `aube ci`, then `aube exec just build` in `packages/box-quad`.
3. `aube pack` in `packages/box-quad`. The listing is exactly `CHANGELOG.md`, `LICENSE`, `README.md`, `index.d.ts`, `index.js`, `index.js.map` and `package.json`, and `package.json` shows the chosen version.
4. `aube publish <that tarball> --access public --dry-run`, then the same without `--dry-run`. Publishing the inspected tarball, rather than the directory, makes what step 3 checked the thing that is published.
5. You tag _M_ as `@ydinjs/box-quad@<version>` and push the tag. Agents don't push tags.
6. After the publish, an agent reads the registry and installs the package into an empty scratch project, imports it, and type-checks the import with `skipLibCheck` off. The reading goes in the release record, and #56 closes on it.

## Implementation

**The order:** the owner answered, and the main slot's architect registers the answers. Task A is done. Then tasks 1 to 4, the review, the release-workflow unit, and the publish. Tasks 1, 2 and 4 don't depend on each other. Task 3 needed A and Q3, and both are settled. Each task's proof is recorded in this unit's handoff or in the implementer's report, under `checks/`.

**A. The contract (box-quad's architect, record only).** [Property 5](#5-the-contract-describes-the-published-api).

- _Proof:_ `grep -c readBoxQuad packages/box-quad/.plan/contract/*.md` prints 0 for every file. Each export in the built `index.d.ts` is named and described in `01-public-api.md`. `F-1`'s status records that its API half is closed, at the commit.
- **Done 2026-11-20.** The grep prints 0 for all five files. `01-public-api.md` §§3–4 describe the four functions and four types of the built `index.d.ts`. `F-1` is closed in box-quad's record, which quotes what the contract said before.

**1. The manifest and files (implementer).** [Property 1](#1-the-manifest-and-the-published-files), with `version` `1.0.0` and drag's dependency on it.

- _Proof:_
  - `aube pack --dry-run` in `packages/box-quad` lists exactly the seven files that the [Release procedure](#release-procedure) names. The reading before the change is [§1](checks/readings.txt).
  - `aube exec just build` leaves `package.json` unchanged (`git diff --exit-code`).
  - `aube exec just typecheck-declarations` passes.
  - The implementer reads the top level of the built `index.js` and records that it holds only declarations and the export.
  - `cmp LICENSE packages/box-quad/LICENSE` succeeds.
  - `aube ci` passes after `aube install` updates the lockfile, and `packages/drag` still resolves `@ydinjs/box-quad` to the workspace package.

- **Done 2026-11-20** by the implementer ([transcript](checks/implementation.txt)). The pack lists exactly the seven files. The build leaves the manifest unchanged, and the declarations check passes. The built `index.js` holds 22 numeric `const` declarations, 9 function declarations and the export. The two `LICENSE` files are identical. `aube ci` passes, and drag resolves `@ydinjs/box-quad` 1.0.0 to the workspace package. **Corrected 2026-11-20:** the count is 23 numeric `const` declarations, not 22 — `BOX_*` 8, `SPACE_*` 5, `QUAD_*` 8 and `DELTA_*` 2, matching the 23 in `src/index.ts`. Only the count was wrong, and the reading still holds only declarations and the export ([`reviewer-2`](../reviews/box-quad-release-1/feature-proof-claude.md#reviewer-2), [transcript](checks/implementation.txt)).

**2. The API docs (implementer).** [Property 4](#4-the-api-docs). This touches `packages/box-quad/Justfile` and `package.json`, the root `Justfile`, `.scripts/docs-api.ts`, `.scripts/docs-smoke.ts` and `packages/material-x/src/reference/api.mdx`.

- _Proof:_
  - After `aube exec just docs-build`, `.docs/api` contains `core/`, `box-quad/` and `material-x/`, and no `drag/`.
  - `aube exec just docs-smoke` passes, and its log names `api/core/index.html` and `api/box-quad/index.html`.
  - **Mutation:** with box-quad removed from `docs-build`'s project list, `docs-smoke` fails on `api/box-quad/index.html`. With the link removed from `docs-api.ts` instead, the smoke check passes, and the reviewer confirms that the index no longer names box-quad. That second case is the reason the smoke check reads the index.
  - During `aube exec just docs-dev`, `/api/box-quad/index.html` answers 200, and the `Reference/API` page's box-quad link opens it.
  - `verify`'s `docs` job passes on the pull request.

- **Done 2026-11-20** by the implementer ([transcript](checks/implementation.txt)). `.docs/api` holds `box-quad/`, `core/` and `material-x/`. `docs-smoke` passes on 105 pages and names both sections. The first mutation fails on `api/box-quad/index.html` with HTTP 404. The second passes on 104 pages with an index that doesn't name box-quad. In `docs-dev`, `/api/box-quad/index.html` answers 200, and the `Reference/API` link opens it. `verify`'s `docs` job is read on the pull request.

**3. README and changelog (implementer).** [Properties 2](#2-the-readme) and [3](#3-the-changelog).

- _Proof:_
  - The README's examples, copied into a scratch module that imports `@ydinjs/box-quad`, type-check against the built package with `skipLibCheck` off, and the transcript is recorded.
  - Every link in both files resolves. The docs-site link resolves after the deploy, and until then the implementer records that it doesn't resolve yet.
  - `aube exec oxfmt` leaves both files unchanged, and `git diff --check` is clean.
  - A search of both files for `BQ-`, `F-`, `RF-`, `RD-`, `.plan` and seven-or-more-character hex strings finds nothing.

- **Done 2026-11-20** by the implementer ([transcript](checks/implementation.txt)). Both README examples type-check against the packed package. Nothing turns up in the search for identifiers. The docs-site link answers 404 until this branch is on `main` and deployed. **Amended 2026-11-20:** the README's `false` cases said that every fragmented box returns `false`, where `04-support-matrix.md` §3 says `false` only where fragmentation is detected. The README now names the detected case, a box with more than one client rect, and says that other fragmented boxes are unsupported, kept out by the caller, and not guaranteed a `false` ([`reviewer-1`](../reviews/box-quad-release-1/feature-proof-claude.md#reviewer-1)). The examples still type-check against the packed tarball, the pack lists the same seven files, and the tarball's sha256 is now `4235cc62…` ([transcript](checks/implementation.txt)).

**4. Root `clean-build`, and the size ceiling (implementer).** [Property 6](#6-the-root-clean-build-includes-box-quad).

- _Proof:_ after `aube exec just build` and `aube exec just clean-build`, `packages/box-quad/index.js` doesn't exist.
- _The ceiling:_ `.size-limit.json`'s `index` row gets `"limit"`, set to the reading after the last change that the release carries, with no slack. The ceiling is the last change of the release, after tasks 1 to 3, which change no runtime byte, so today's reading stands unless `src/` changes. `aube exec just size` passes at that limit, and the measurements comment on the pull request shows the row with its limit. A later change may lower the ceiling without asking, and raising it needs the owner's approval ([Q2](#owners-answers)).

- **Done 2026-11-20** by the implementer ([transcript](checks/implementation.txt)). After a build, the root `clean-build` removes `packages/box-quad/index.js`. **The `index` row reads 1182 B (Brotli), and its ceiling is `"limit": "1182 B"`**: `just size` passes at 1182 and fails at 1181. PR #81's `release-check.ts package` passes on the packed tarball. It ran from that branch, which isn't merged here.

**Review.** A feature proof of tasks 1 to 4 against this plan, by a reviewer who didn't implement them, before the publish. It repeats the pack listing and the docs mutation.

**One pull request or several.** Tasks 1 to 4 can be one implementation pull request, with `Closes #56` left to the record change after the publish (the [Release procedure](#release-procedure)'s last property). This plan's own pull request says `Refs #56`.

## Not adopted

- **A standing test that packs every package and compares the listing.** It would guard every later release against `.plan/` leaking into a tarball, and the release workflow's tarball check is that check at the moment it matters. The release-workflow unit decides whether a standing one is also worth having.
- **A `prepack` script that builds the package.** The workflow builds explicitly and publishes the tarball it checked. A script hidden in `pack` would make the build depend on whether the publisher's tools run lifecycle scripts.
- **Discovering API sections from the packages that have a `typedoc.json`.** drag has one and isn't released. The docs list what is released, and that is a decision each release unit makes. The smoke check reads the index, so a link without a section can't pass.
- **A `CHANGELOG.md` generated by a tool such as Changesets.** It's a dependency and a workflow for one package with one entry.
- **Top-level `types` or `module` fields.** `exports` resolves under every resolver that the declarations check models, and material-x publishes the same way.
- **A git tag pushed by an agent, or a GitHub release, decided here.** Whether the workflow tags a release or starts from a tag is the workflow unit's decision, and the changelog is the release note.