# `rolldown` as a peer of the two Vite plugins — feature proof, `RF-55` tasks 1 and 2

**Files were read at:** `0d0cb4875` (`repo/rolldown-peer-1`, PR #83), in a scratch worktree of my own. **Diff reviewed:** `d69e3ddbc` to `0d0cb4875`, two commits: the architect's plan `f9a0c020e` and the implementation `0d0cb4875`.

**Governing records:** [`rolldown-peer-plan.md`](../../rolldown-peer-1/rolldown-peer-plan.md), tasks 1 and 2, and `repo:RF-55`'s _Decided_ block in [`00-index.md`](../../00-index.md). The owner's direction is _"О, ну тут peer напрашивается )"_, and his answer to question 1 is (a). Task 3 waits for `repo/trait-decorator-1` by design, and this pass doesn't count it as missing.

**Lens:** feature proof. Each claim below is my own reading or my own run. I reran the implementer's consumer script on tarballs that I built and packed myself, and I ran my own variants of it ([script](checks/consumer-variants.sh), [transcript](checks/consumer-variants.txt)). Nothing is repaired, and no record is amended.

**Verdict: tasks 1 and 2 meet the plan, and nothing blocks.** There are two Tier C findings for the architect, and neither blocks the merge.

## Scope

**Covered.**

- **Task 1, the manifests.** Both `package.json` files declare `"rolldown": "^1.1.4"` and `"vite": "^8.1.4 || ^8.4.0-beta.1"` as `peerDependencies`, with no `peerDependenciesMeta`. `rolldown` is no longer in `dependencies`, and nothing else in `dependencies` changed. Both plugins' sources import `RolldownMagicString` from `rolldown` at runtime, so the peer isn't optional.
- **The peer ranges, against the registry of 2026-11-20.** Every Vite release inside `^8.1.4 || ^8.4.0-beta.1` (8.1.4 to 8.3.8, and 8.4.0-beta.1) declares a `rolldown` range inside `^1.1.4`. The lowest is `~1.1.4`, at 8.1.4. Under the workspace's `semver`, `8.4.0-beta.1` satisfies `^8.4.0-beta.1` and not `^8.1.4`. That is the rule `CONTRIBUTING.md` now states.
- **Task 1, the lockfile.** The committed diff is 6 lines: the two workspace packages' `peerDependencies`. I wrote `d69e3ddbc`'s `package-lock.json` over the branch's file and ran `aube install --fix-lockfile` with the new manifests. The result is byte-identical to the committed lockfile, so aube writes exactly this change and resolves no version.
- **Task 1, the workspace.** After `aube install --frozen-lockfile --force` and `aube install --frozen-lockfile`, the tree has all 7 `@ydinjs` links and one `rolldown/package.json` outside `@rolldown/`, at 1.3.2. `aube why rolldown` shows 1.3.2 only. `aube exec just build`, `just typecheck` and `just typecheck-declarations` exit 0. `packages/vite-traits-plugin`'s `just test` passes 100 of 100. `packages/vite-custom-element-assets` has no tests.
  - In my worktree, `aube install --fix-lockfile` removed `node_modules/@ydinjs`, and the first build failed for that reason. The forced frozen reinstall restored the links, which is the implementer's sequence. This is aube's behavior and outside this unit.
- **publint.** I ran `aube exec -- publint <tarball>` on the plugin tarball that `aube pack --ignore-scripts` wrote: _"All good!"_. The tarball holds `index.d.ts`, `index.js`, `index.js.map` and `package.json`, and its manifest has literal ranges.
- **Task 2, the committed script.** I reran `plugin-consumer.sh` on my own tarballs. All 5 results are the same as `plugin-consumer.txt`, line for line:
  - at Vite 8.3.8 (hoisted and isolated), 8.1.4 and 8.4.0-beta.1, the plugin and Vite resolve one `rolldown` (1.2.19, 1.2.19, 1.1.8 and 1.3.3);
  - `tsc` with `skipLibCheck` off passes;
  - `vite build` writes `impl(this` and no `compose(Base)`.
  - The mutation gives two copies (1.3.2 and 1.2.19), and its build exits 0 with 2 `compose(Base)` and no `impl(this`. Its `tsc` still passes.
- **The implementer's corrections to the plan.** I reproduced each one:
  - **`@types/node`.** Without it, `tsc` with `skipLibCheck` off fails in `vite/dist/node/index.d.ts` (`TS2688`, `TS2591`) (V2).
  - **`rolldown` in the isolated layout.** A consumer that imports `RolldownOptions` from `rolldown` without declaring it fails `tsc` with `TS2307`. The build still keeps one copy and flattens (V3).
  - **The lockfile changed.** See above.
  - **`aube exec publint` packs with `npm pack`.** See [`reviewer-1`](#reviewer-1).
- **A consumer that declares no `rolldown`** (V1, with the real plugin): at Vite 8.3.8 and 8.1.4, hoisted and isolated, and at 8.4.0-beta.1 hoisted, the result is one copy, `tsc` passes on the `defineConfig` module, and the build is flattened. With the mutant tarball, this consumer gets two copies and an unflattened build that exits 0. See [`reviewer-2`](#reviewer-2).
- **Handoff.** The commit messages have no session link and no closing keyword. The PR is open, with head `0d0cb4875` and no auto-merge. Its body says `Refs #48`, as the plan requires while task 3 is open, and has no session link and no bare `@name`.

**Not covered.** Task 3. Any CI run. `@ydinjs/vite-custom-element-assets` in a consumer, which the plan leaves to task 1's workspace proofs because the package is private. A consumer whose own tree holds two copies (the probe's consumer D), which is task 3's case.

## Findings

### reviewer-1

**Tier C, for the architect. The plan's task 1 proof prescribes `aube exec publint`, which packs with `npm pack` in this repository. `packages/material-x`'s `publint` recipe does the same, and that was already true before this unit.**

- **Current behavior.** With no `--pack` option, publint 0.3.25 detects the package manager with `package-manager-detector` (`publint/src/index-node.js`, `detectPackageManager`). From `packages/vite-traits-plugin`, it detects `{"name":"aube","version":"2.10.0"}`. `aube` isn't in publint's supported list (`npm`, `yarn`, `pnpm`, `bun`), so publint falls back to `npm`. The implementer's run printed _"Packing files with `npm pack`"_.
- **Where it is prescribed or used.**
  - The plan's task 1 proof: _"`aube exec publint` passes in `packages/vite-traits-plugin`"_.
  - `packages/material-x/Justfile`'s `publint` recipe runs `publint` with no `--pack`, and `packages/material-x/package.json`'s `publint` script runs that recipe.
  - `tsdown`'s own publint step passes its tarball (`pack: { tarball }`) and doesn't pack.
- **The record.** [`workspace-proof.txt`](../../rolldown-peer-1/checks/workspace-proof.txt) says that the `npm pack` run happened once, passed, and wasn't repeated. `RF-55`'s implementation bullet says that the plan's command packs with `npm pack` and that publint was rerun on the `aube pack` tarball. No package has a `prepack`, `prepare` or `postpack` script, so `npm pack` ran no repository script.
- **Why it matters.** `RD-16` property 1: npm _"run[s] nothing of"_ the repository, except CI's bootstrap step and nx's script runner. Whether `npm pack` of a workspace package is inside that rule, and whether the material-x recipe should pass the `aube pack` tarball or `--pack false`, are `RD-16` calls.
- **Required property.** The plan's proof commands and the repository's recipes don't depend on npm, except where `RD-16` lists an exception.

### reviewer-2

**Tier C. Every committed consumer in task 2 declares `rolldown` itself, at the range its Vite declares. So the committed evidence doesn't show the consumer that the plan's table describes, which declares no `rolldown`.**

- **Current evidence.** `plugin-consumer.sh` gives each project `"rolldown"` at `~1.2.18`, `~1.1.4` or `~1.3.2`. The script's comment and `RF-55`'s bullet give the reason: the type module imports `RolldownOptions`, and in the isolated layout that import needs a declaration. Both statements are correct (V3). But a consumer that declares `rolldown` at its Vite's range forces the one copy itself, so these projects can't show that the **peer** gives one copy.
- **What I measured** (V1, [transcript](checks/consumer-variants.txt)). The consumer declares no `rolldown`, and `types.ts` checks only `defineConfig`. The packed plugin then gets Vite's copy in every case: 1.2.19 at 8.3.8, hoisted and isolated; 1.1.8 at 8.1.4, hoisted and isolated; 1.3.3 at 8.4.0-beta.1. Every build is flattened. The mutant tarball, in the same consumer, gives two copies and `compose(Base)` unflattened, with exit 0. So the property holds, and this check also discriminates. The architect's stand-in probe showed the same for consumer A.
- **Why it matters.** A Vite consumer that never imports `rolldown` is the usual case, and it is the case the peer exists for. The committed evidence covers it only through the stand-in probe. This record now carries the measurement with the real plugin.
- **Required property.** `RF-55`'s task 2 evidence shows one copy and a flattened build for a consumer that declares no `rolldown`, and not only for one that declares Vite's range. Whether this record's transcript is enough for that is the architect's call.

## Not findings

- **The lockfile deviation is inside the plan.** The plan's lockfile section says: _"If aube does write a lockfile change, it may touch only the two workspace packages' entries and resolve no version."_ The committed change is exactly that, and I reproduced it. The plan's reading (_"`--fix-lockfile` … write[s] nothing"_) and `RF-55`'s _Decided_ item 5 (_"aube writes no lockfile change"_) are contradicted. The implementation bullet records that, and the record is append-only. Nothing in `RD-16`'s release-age gate applies, because no version is resolved.
- **The plan's registry reading is slightly wrong.** It says _"8.2.x `~1.2.0` to `~1.2.18`"_. On the registry, 8.2.x declares `~1.2.0` to `~1.2.4`, and 8.3.x declares `~1.2.6` to `~1.2.18`. This doesn't change the floor or the range.
- **`CONTRIBUTING.md`'s two new _Peers_ statements** match what I measured: the range rule with the registry, and the prerelease rule with `semver`. They are the architect's text, and the history table has its row.