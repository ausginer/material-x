# box-quad's first release, tasks 1 to 4 — feature proof

**Files were read at:** `faa2637cf` (`repo/box-quad-release-1`, PR #79), in a scratch worktree of my own. **Diff reviewed:** `d69e3ddbc` to `faa2637cf`. The implementation is `faa2637cf`. The three commits before it are the architect's plan and contract units, which are task A and outside this pass.

**Governing records:** the [release plan](../../box-quad-release-1/box-quad-release-plan.md), its _Implementation_ tasks 1 to 4, its properties 1 to 4 and 6, and the _Owner's answers_; `repo:RD-27` on `repo/release-workflow-1` (PR #81), its properties 1 to 3. The owner approved the plan and its tasks. Publishing is later, through the release workflow, and isn't part of this unit.

**Lens:** feature proof, by a reviewer who didn't implement the tasks. I repeated the pack listing and both docs mutations, as the plan requires. Each claim below is my own reading or my own run, and the transcript is [`checks/feature-proof.txt`](checks/feature-proof.txt). I didn't run publint, because it falls back to `npm pack` (`RF-55`'s ruling). Nothing is repaired, and no record is amended.

**Verdict: tasks 1 to 4 meet the plan, and nothing blocks the merge.** One Tier B finding concerns the README, which ships in the 1.0.0 tarball, so it should be settled before the release tag. One Tier C finding concerns the evidence.

## Scope

**Covered.**

- **The files changed.** `faa2637cf` changes only the files that the plan's tasks name:
  - task 1: box-quad's `package.json` and `LICENSE`, drag's `package.json` and the lockfile;
  - task 2: box-quad's `Justfile`, the root `Justfile`, `.scripts/docs-api.ts`, `.scripts/docs-smoke.ts` and `api.mdx`;
  - task 3: the README and the CHANGELOG;
  - task 4: the root `Justfile` and `.size-limit.json`;
  - and the plan and its `checks/`.

  drag's recipes and paths are unchanged. box-quad's `Justfile` used to write its TypeDoc into `api/drag`, and it now writes `api/box-quad`.

- **Task 1, property 1.**
  - The manifest has `version` `1.0.0`, the plan's `description`, and material-x's `author`, `bugs` and `repository` URL. `homepage` and `repository.directory` are the plan's, and `files` lists the four files.
  - It also has `sideEffects: false` and `publishConfig.access` `public`, and no `engines` or `private`. `exports`, `type` and `license` are unchanged.
  - `aube pack --dry-run` lists exactly `CHANGELOG.md`, `LICENSE`, `README.md`, `index.d.ts`, `index.js`, `index.js.map` and `package.json`, at `@ydinjs/box-quad@1.0.0`. My `aube pack` tarball has the implementer's sha256, `908f9066…`.
  - The build leaves `package.json` byte-identical. `LICENSE` is identical to the root's.
  - The lockfile diff is 2 lines: box-quad's version, and drag's dependency on it. `aube ci` passes, and from `packages/drag`, `@ydinjs/box-quad` resolves to the workspace package at 1.0.0. `just typecheck-declarations` passes.
  - **`sideEffects`.** I parsed the built `index.js` with oxc-parser. Its top level is 23 `const` declarations, each with a numeric literal, 9 function declarations, and `export { ancestry, coordinates, localDelta, projection }`. Nothing runs at load, so the field holds. The count is in [`reviewer-2`](#reviewer-2).
- **Task 2, property 4.**
  - After `rm -rf .docs` and `just docs-build`, `.docs/api` holds `box-quad/`, `core/` and `material-x/`, and no `drag/`. `just docs-smoke` reads `api/core/index.html`, `api/box-quad/index.html` and `api/material-x/index.html` from the index, and passes 105 of 105.
  - **Mutation 1**, with box-quad removed from `docs-build`'s `docs:api:build` list: the build has no `box-quad/`, and `docs-smoke` fails on `api/box-quad/index.html` with HTTP 404.
  - **Mutation 2**, with the index's box-quad link removed from `docs-api.ts` and the index rewritten: the index names box-quad 0 times, and `docs-smoke` passes 104 of 104. That is the case the plan gives for reading the index, and I confirm that the index doesn't name box-quad.
  - The material-x landing page links back to box-quad.
  - **`docs-dev`.** On my server, `/api/box-quad/index.html` answers 200 with the title `@ydinjs/box-quad`. In Chromium, the `Reference/API` page's box-quad link has `href` `/api/box-quad/index.html` and `target` `_top`, and following it answers 200 with that title.
  - **verify on PR #79**, run `44707181355` at `faa2637cf`: `docs` passed. The browser jobs were still pending when I read it.
- **Task 3, properties 2 and 3.**
  - Both README examples type-check with `skipLibCheck` off against the tarball, installed by aube into an empty project.
  - Neither file contains a record identifier, a `.plan` path or a 7-character hex string. `oxfmt --check` passes on both.
  - The README's docs link answers 404 until the deploy, as recorded. `api/core/` answers 200.
  - **The README against property 2.**
    - It states what the package does and that it isn't a `getBoxQuads()` polyfill. It has the `npm install` line, the two examples, the storage model with its slots, the two preconditions, the supported and the `false` cases, the API link and the license.
    - The browser support paragraph matches `RD-27` property 3: the current stable Chromium, Firefox and Safari, no minimum version, and a version that leaves stable isn't a breaking change.
    - I checked the README's slot table and function descriptions against the source's JSDoc, and its support lists against `04-support-matrix.md` §§2–3. One condition is dropped ([`reviewer-1`](#reviewer-1)).
  - **The CHANGELOG against property 3.** It has one section, `1.0.0`, that says it is the first release. Under _Added_, it lists the four functions and the four types.
- **Task 4, property 6 and the ceiling.**
  - After a build, the root `just clean-build` removes `packages/box-quad/index.js` and `index.d.ts`.
  - `just size` passes at `"limit": "1182 B"`, and fails at `1181 B` with _"exceeded by 1 B"_. That is the reading with no slack, as Q2 and `RD-27` property 2 require.
  - PR #79's measurements comment shows the row as `1182`, with the limit `1182`.
- **PR #81's release check.** I copied `release-check.ts` and `ci-scope.ts` from `repo/release-workflow-1`'s current head, `644bbf1ed`, into my worktree, and removed them afterwards. `package --directory packages/box-quad --tarball <my tarball>` exits 0, and it lists the same 7 files and the same sha256.
- **Handoff.**
  - The PR is open, with no auto-merge. Its body says `Refs #56` and has no session link and no bare `@name`.
  - No commit message has a session link. `69ae4c097` says _"F-1 closes"_, but no issue reference follows the word, so GitHub closes nothing.

**Not covered.** Task A, the contract rewrite. The publish and the release workflow's run. The verify run's browser jobs, which were still pending. Any engine other than Chromium for the docs.

## Findings

### reviewer-1

**Tier B. The README says that every fragmented box returns `false`. The contract says `false` only where fragmentation is detected.**

- **Current text.** The README's _What is supported_: _"The function returns `false` for: an inline element split across lines, or another fragmented box"_.
- **What the contract says.** `04-support-matrix.md` §3:
  - _"Multi-fragment/multiline inline source"_: `false`;
  - _"Other fragmented principal layout"_: **_"`false` where detected"_**.

  The source detects fragmentation by `getClientRects().length !== 1` (`coordinates`). So a fragmented box for which the engine reports one client rect isn't refused.

- **Why it matters.** Property 2 asks for the matrix's supported and `false` cases _"in plain words"_, and plain words keep the matrix's conditions. The README is the consumer's statement of what `false` means, and it ships in the 1.0.0 tarball, so a published version can't correct it. A consumer who relies on `false` for every fragmented box can be misled. The tests' multi-column cases are refused, so the gap is narrow, but the README promises more than the contract does.
- **Required property.** The README's `false` cases keep the matrix's condition for fragmented boxes other than inline ones.

### reviewer-2

**Tier C. The evidence counts 22 top-level `const` declarations in the built `index.js`, and there are 23.**

- **Current text.** [`implementation.txt`](../../box-quad-release-1/checks/implementation.txt): _"22 numeric const declarations (BOX\_\*, SPACE\_\*, QUAD\_\*, DELTA\_\*)"_. The plan's task 1 _Done_ note says the same.
- **Evidence.** oxc-parser finds 23 `const` statements, each with one numeric literal. They are `BOX_*` 8, `SPACE_*` 5, `QUAD_*` 8 and `DELTA_*` 2, which matches the 23 top-level `const` lines in `src/index.ts`.
- **Why it matters.** The plan makes this reading the proof of `sideEffects: false`, and says that the reviewer repeats it. The property holds, and only the count is wrong. A later release that repeats the reading and compares counts would find a difference that isn't there.
- **Required property.** The recorded reading matches the built file.

## Not findings

- **The first README example doesn't call `ancestry`.** Property 2 asks for an example _"with `ancestry`, `coordinates` and `projection`"_. The first example uses `coordinates` and `projection`, and the second uses `ancestry` with `localDelta`. `coordinates` reads the ancestry itself when `above` is omitted, so the first example is complete as written.
- **The storage's exactness.** The published JSDoc of each storage type says that the storage must hold each written number exactly, so a `Float32Array` doesn't work, and the compiler can't state that. The README names `[]`, a plain object and a `Float64Array`, as property 2 asks, and doesn't say that other stores work. Property 2 names two preconditions, and the README has them.