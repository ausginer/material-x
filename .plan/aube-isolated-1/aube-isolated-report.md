# The isolated aube layout — reading and proposal

**Status: proposal, not recorded.** The recommendation is to keep the hoisted layout and not adopt the isolated one. Nothing in `00-index.md` changes on this branch.

**Branch** `repo/aube-isolated-1`, from `origin/main` at `e9236603e`. **Governing records:** `repo:RD-16` (property 7 and _Not adopted_), `repo:RD-17` (properties 4 and 9) and `repo:RF-48`, in [`../00-index.md`](../00-index.md). **Evidence:** [the reading](checks/isolated-reading.txt), taken in slot `b` with aube 2.10.0.

**Why this is a proposal.** `RD-17` property 4 says that only the main slot's architect mints, amends, supersedes or renumbers a record identifier, and that an architect in another slot proposes and doesn't record. This unit ran in slot `b`. The [proposed record text](#proposed-record-text) is written so that the main slot's architect can enter it as it stands, or change it.

## The question

`RD-16` keeps `node-linker=hoisted`, and its _Not adopted_ list defers the isolated layout as _"a separate change to how modules resolve"_. The question is what that change would do to this repository, and whether to make it.

## What the isolated layout changes here

aube has two isolated modes, and they resolve differently:

- **With the global virtual store** (aube's default outside CI): `node_modules` holds symlinks into `/workspaces/worktrees/.aube/cache/virtual-store/v1/`, which every slot and the main checkout share. A package's real path is outside the project.
- **Project-local** (aube's default under CI): the virtual store is `node_modules/.aube/` inside the project.

A local run and a CI run would therefore use different layouts unless the repository forces one mode everywhere.

| Area | Hoisted (today) | Isolated, global virtual store (local) | Isolated, project-local (CI) |
| --- | --- | --- | --- |
| `package-lock.json` | npm's form | unchanged by install; `aube add` writes npm's form | same |
| `just typecheck` | passes | passes | **fails in all 8 packages** (`eslint.config.ts`, TS2345) |
| `just lint` | passes | **fails:** `@storybook/icons` unresolved | **fails**, the same error |
| `just fmt-check` | passes | passes | not run |
| `just test`, Chromium | passes in CI | passes: 138 files, 1908 tests | not run |
| `docs-build`, smoke | passes in CI | passes, 102 of 102 pages | not run |
| `just size` | passes | **fails:** size-limit can't load `size-limit-preset-rolldown` | passes |
| Build outputs | — | identical except `material-x/react.d.ts`, which embeds a different absolute path (a defect on both layouts, see _Proposed findings_) | not compared |
| Editor `tsserver.js` | written by `postinstall` | **not written:** `link-tsserver.ts` can't resolve `@typescript/old` from the root and returns silently | same |
| `RF-48` | `aube add` drops the root's workspace links | **the same:** `node_modules/@ydinjs` and the preset are gone after one `aube add` | not read |
| Disk per slot | files are hardlinks of the shared store (link count 5–7) | 7.6 MB of symlinks | hardlinks, as hoisted |
| Main checkout | a copy, 736 MB, on its own mount | symlinks onto the worktrees volume, so it needs that volume | — |

**Why the two isolated modes disagree.** Both modes keep a hidden hoist, a directory of dependencies that every package in the virtual store finds by walking up. With the global virtual store it is `<cacheDir>/virtual-store/v1/node_modules`, beside the shared store, and it holds `eslint` 10. In project-local mode it is `node_modules/.aube/node_modules`, and it holds `@types/eslint` 9.6.1 and no `eslint`. `eslint-plugin-oxlint` 1.93.0 imports `eslint` in its declarations without declaring it, so its `Linter` type is eslint 10's in one mode and `@types/eslint` 9's in the other. The same commit typechecks locally and fails in CI. Hoisted resolves it to the root's eslint 10.

**The shared hidden hoist couples the slots.** The store-wide directory is an ancestor of every package in the global virtual store, and its modification time changed at the hoisted reinstall of step 8. What a dependency's undeclared import resolves to may therefore depend on another slot's last install. That dependence is inferred from the directory's location and timestamp. Which install writes which entry was not read.

**What the isolated layout would and would not catch.** Every workspace package's import of a root devDependency still resolves, because the root `node_modules` is an ancestor of `packages/*` on both layouts. The isolated layout therefore checks only imports of packages that no manifest in the repository declares. It found one, `@storybook/icons`. It does not catch the defect that matters for a published package, an import that the package's own manifest doesn't declare: `material-x/react.d.ts` is wrong on both layouts.

**The rest of the scope.** CI would need nothing beyond what the table shows: the lockfile, the cache key and `aube ci` are unchanged. The trait plugin's tests passed, and its only path test (`/node_modules/.vite/`) doesn't depend on the layout. Slots gain no data sharing, because hoisted files are already hardlinks of the store (`RD-17` property 9). The one disk gain is the main checkout's 736 MB copy. In exchange, the main checkout would depend on the worktrees volume.

## Recommendation

**Keep `node-linker=hoisted`. Don't adopt the isolated layout.**

- **It costs parity.** Under aube 2.10.0 the isolated layout has two modes that resolve a dependency's undeclared import differently, and CI uses the other mode. A local pass would no longer predict CI. Removing that needs one mode forced everywhere, plus a `packageExtensions`-style repair for each dependency that imports undeclared packages, found one failure at a time.
- **It saves nothing that matters here.** Slots already share the store's files. Install times are about 1 s warm on both layouts. `RF-48` reproduces on both.
- **The strictness it buys is weak in this repository,** because the root declares every tool and workspace packages resolve through it. The defect class that matters, a published package importing what its manifest doesn't name, needs a per-package check, not a layout.
- **It breaks two working things** that would need repair first: size-limit's plugin loading under the global virtual store, and the editor's `tsserver.js`. Repairing `link-tsserver.ts` under the global virtual store would also mean writing into a directory that every slot shares.

**What would reopen it** is listed in the proposed entry's _Revisit_ property.

## Proposed record text

### Proposed decision

Next free `RD-` number, minted by the main slot's architect. Links in the quoted text are relative to `00-index.md`, where it would go.

> #### RD-— — The layout stays hoisted: the isolated layout is not adopted, because its two modes resolve differently and it buys no check this repository lacks
>
> **Decided** on the owner's request relayed by the coordinator on 2026-11-18, from the [isolated-layout report](aube-isolated-1/aube-isolated-report.md) at `<commit>`, read in slot `b` with aube 2.10.0 ([reading](aube-isolated-1/checks/isolated-reading.txt)).
>
> **Properties.**
>
> 1. **`node-linker=hoisted` stays,** as `RD-16` property 7 says.
> 2. **Revisit** when one of these holds, and not otherwise:
>    - aube deprecates or changes the hoisted linker, or a defect that only hoisted has becomes a capital problem in `RD-16` property 11's sense;
>    - an aube release makes the isolated layout's undeclared-import resolution the same with and without the global virtual store. The reading's `eslint-plugin-oxlint` typecheck is the witness.
> 3. **An adoption, if one is decided later, owes at least:**
>    - one mode locally and in CI, set in the repository;
>    - every gate job green in that mode, Firefox, WebKit and visual included, plus `just size`;
>    - `@storybook/icons` declared, or the import removed;
>    - size-limit loading `size-limit-preset-rolldown`;
>    - `link-tsserver.ts` failing loudly when deps are installed, and never writing into a shared virtual store;
>    - the `RF-48` reading repeated on that layout.
>
> **Why.** See the report's _Recommendation_: parity between local runs and CI, no disk or speed gain for slots, weak strictness here, and two repairs owed first.
>
> **Not adopted.**
>
> - **Isolated with the global virtual store everywhere** (`--enable-global-virtual-store` in CI). CI would then resolve through a store-wide hidden hoist whose content depends on what that runner installed. Locally, that directory is shared by every slot.
> - **Isolated, project-local everywhere.** Typecheck fails in all eight packages until each undeclared import of a dependency is repaired, and slots then gain nothing over hoisted.

`RD-16`'s _Not adopted_ bullet _"The isolated layout. That is a separate change to how modules resolve."_ then gains: _"`RD-—` reads it and keeps hoisted."_

### Proposed findings

Each is independent of the layout and true on `main` today.

1. **`material-x/react.d.ts` imports React's types by an absolute path on the build machine.**
   - **Read:** the hoisted build writes `from "/workspaces/worktrees/b/node_modules/react/index.js"`. The source, `src/react.ts`, imports `react` types, and `packages/material-x/package.json` names neither `react` nor `@types/react`. `package.json` exports the file as `./react.js`'s `types`.
   - **Inferred cause:** tsdown's `neverBundle: [/node_modules/u]` keeps the import external by its resolved path, because no manifest entry names it.
   - **Effect:** a consumer's TypeScript can't resolve that import.
   - **Proposed tier B**, for the published surface. A repair is a material-x decision (a `react` or `@types/react` peer, likely optional), so route it to the material-x record.
2. **`.storybook/manager.tsx` imports `@storybook/icons`, which no manifest declares.** It resolves only because hoisting places storybook's dependency, 2.0.2, at the root. **Proposed tier C.** Repair: an exact root devDependency, or remove the import.
3. **`just clean-build` at the root exits 1:** `size-limit-preset-rolldown`'s `clean:build` reads `files.json`, which the package doesn't have. The other six packages clean. **Proposed tier C.**

A related question for the owner, not proposed here: `eslint.config.ts` sets `import-x/no-extraneous-dependencies` to `off` with no stated reason. That rule, run per package against its own manifest, is the instrument for finding 1's class. Turning it on is a lint-policy decision (`RD-10` and `RD-11` territory) and a unit of its own.

## Verification and limits

- Every claim in the table is in [the reading](checks/isolated-reading.txt), except the _passes in CI_ cells, which are `main`'s gate at `e9236603e`.
- **Not run:** Firefox, WebKit and visual on either isolated mode, and the test suite and docs in project-local mode. Typecheck already fails in that mode, so its gate would fail regardless.
- The coupling of slots through the store-wide hidden hoist is inferred, not read.
- `aube install --force` without `--frozen-lockfile` re-resolved and was stopped by the release-age gate. `RF-48`'s repair command includes `--frozen-lockfile`, so it is unaffected.
- **Slot `b` was left as it was found:** hoisted, 7 `@ydinjs` links and `tsserver.js` present. The store-wide hidden hoist under `/workspaces/worktrees/.aube/cache/virtual-store/v1/node_modules` was written by these installs and is aube's own. Nothing was removed from it.

## Next

The main slot's architect enters or changes the proposed decision and findings, after the owner accepts the recommendation. No implementation follows from a _keep hoisted_ decision. Each of the three findings, once minted, is a small unit of its own.