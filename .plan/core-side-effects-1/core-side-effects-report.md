# `@ydinjs/core` declares `"sideEffects": false`: implementation report

**Implemented 2026-11-20 by the implementer** on `core/side-effects-1`, at the [plan](core-side-effects-plan.md) at `ddb70b49f`, with `origin/main` at `e4b0e475d` merged (no change: the branch was already on it). `RD-30` in [`00-index.md`](../decisions/RD-30.md) records the decision. The owner approved the unit, relayed by the coordinator: _"Да, запускаем!"_ ("Yes, let's go!").

## What changed

- **`packages/core/package.json`** declares `"sideEffects": false`, after `"type"`.
- **`.scripts/release-check.ts`:**
  - Step 7's `checkConsumer` now ends with `checkSideEffects`, and `side-effects` is a `CheckName`. The module's and `checkConsumer`'s doc comments name it.
  - For a packed manifest whose `sideEffects` is `false`, `checkSideEffects` uses rolldown to bundle a bare import of each specifier that `exportSpecifiers` names, from the consumer project, with `treeshake.moduleSideEffects: () => true`. It reports each bundle that emits code or an asset, with the specifier and the bytes kept.
  - A manifest without the field isn't checked. One whose field has another value gets one problem, because the check reads only `false`.
- **`.scripts/release-check.node.test.ts`:** three rows on a fixture package installed as step 7 installs it. One existing row's expectation changes (below).
- **`.agents/docs/releasing.md`:** step 7 of _What the workflow checks_ describes the check. `.github/workflows/release.yml` doesn't change: it already runs step 7.

## Where the implementation departs from the plan

- **rolldown 1.3.2 doesn't bundle CSS.** A CSS import fails the build with `UNSUPPORTED_FEATURE` (_"Bundling CSS is no longer supported"_). It doesn't emit an asset, as the plan's property 4 assumed.
  - So the check has a small plugin that loads an imported `.css` file the way a consumer's bundler does: it emits the stylesheet as an asset, and gives rolldown an empty module in its place.
  - Property 4 then holds as written: the bundle must emit no code and no asset, and an imported stylesheet is an asset.
- **Proof 1's first mutation fails two rows, not three.** With `moduleSideEffects: true`, the rows for `globalThis` and `customElements.define` fail. The CSS row stays caught, because the plugin emits the asset when rolldown loads the module, which it does under either setting. The second mutation, counting only chunks, fails the CSS row, as the plan says.
- **An export whose file is missing is now also a `side-effects` problem.** `checkConsumer`'s row _"should refuse an export whose declarations are missing"_ now expects `['consumer', 'side-effects']`. The `side-effects` problem names the export that doesn't resolve (_Remediation_ below).
- **rolldown is imported when step 7 runs, not at the module's top.**
  - **The reason:** `release.yml`'s `prepare` job runs `release-check.ts release` before `aube ci`, so evaluating the module must need only Node's built-in modules. With rolldown imported at the top, that step fails with `ERR_MODULE_NOT_FOUND` before its first check ([probe](../reviews/core-side-effects-1/checks/without-dependencies.txt), from the feature proof's `reviewer-1`). The comment at the import states this.
  - **An observation, not the reason:** with a static import, the root `just test` failed `drag:DRI-17`'s hot-path row, _"should allocate per sample only the CSS string a lifted write needs"_, in four of four full runs, at 16.85 per move against the row's ceiling of 16. The row passed three times when run alone. The lazy import changes when rolldown loads in the root run, not whether it loads. This belongs to #70, and this unit doesn't diagnose it.
  - **Corrected 2026-11-20:** this item gave the DRI-17 failure as the only reason for the lazy import.
- **Proof 2 ran on steps 6 and 7 directly.** With the scratch effect in `src/utils/runtime.ts`, `just release-check core` stops at core's `size` script before packing: the `emitter` row grows to 212 B, over its 210 B limit. So the run with the effect built core, packed it with `aube pack --ignore-scripts`, and ran `release-check.ts package` on the tarball, which is what `local` runs after the size script. The run without the effect gives the same problems through either path.

## Proofs

1. **The check discriminates** (`release-check.node.test.ts`, _side effects_, on a fixture package installed by `checkConsumer`):
   - with `"sideEffects": false`, three `side-effects` problems name `effects/global.js`, `effects/define.js` and `effects/style.js`, and none names `effects/pure.js`;
   - without the field: no `side-effects` problem;
   - with `["./global.js"]`: one problem, _"sideEffects is ["./global.js"], and the check reads only false"_.

   **Mutations,** each run once and reverted:

   - `moduleSideEffects: true`: the first row fails, receiving only `effects/style.js`;
   - counting only chunks: the first row fails, receiving `effects/global.js` and `effects/define.js` without `effects/style.js`.

   All 49 rows of the file pass.

2. **core passes, and fails when it should.**
   - `just release-check core` lists no `side-effects` and no `consumer` problem. Its 152 other problems are the expected ones: 93 `pack-files`, 56 `pack-excluded`, and one each of `pack-required` (no `CHANGELOG.md`), `repository-url` and `repository-directory`. core's manifest has no `files`, `repository` or changelog yet.
   - With `globalThis.ydinProbe = 1` added to `src/utils/runtime.ts` (not committed), the run lists 22 `side-effects` problems. They name `@ydinjs/core/utils/runtime.js`, which keeps 23 bytes, and the 21 exports that import it ([transcript](checks/implementation-probe-effect.txt)). The other 152 problems are identical.
3. **box-quad passes:** `just release-check box-quad` exits 0, with no problem.
4. **The tree:** a root `just build` before and after the field leaves the same 294 paths in core and material-x, every one byte-identical. That is 119 `.js`, 119 `.map`, 55 `.d.ts` and one `.json`. core's `package.json` keeps the field after the build, with no other change.
5. **Size:** the root `just size-reading` before and after gives the same 33 rows, with no field of any row changed.
6. **The consumer reading:** `consumer-drop.ts` and `consumer-entries.ts`, rerun on the branch with core's field present and absent, match the plan's transcripts ([rerun](checks/implementation-consumer-rerun.txt)). Every module row of `consumer-drop.ts` is the same, and the 19 rows of `consumer-entries.ts` give the same rolldown and esbuild bytes in both states.
7. **Gates:** root `just typecheck`, `just lint` and `just fmt-check` exit 0. Root `just test`: 146 files, 2,307 tests passed, three more than on `e4b0e475d`.

## Remediation of the feature proof

The [feature proof](../reviews/core-side-effects-1/feature-proof-claude.md) at `f2556af8a` found two Tier C problems.

- **`reviewer-1`:** the import's comment, the departure above and `RD-30`'s _Implemented_ line now give the release workflow's first step as the reason for the lazy import. DRI-17 stays only as an observation.
- **`reviewer-2`:** an import that rolldown doesn't resolve is now reported as that import, with a repair that applies, instead of _"remove the effect, or list the module in sideEffects"_.
  - rolldown keeps a bare specifier that doesn't resolve as an external import, with an `UNRESOLVED_IMPORT` warning. It fails `generate` on a relative one, which made the whole check throw. `checkSideEffects` collects the warning through `onLog` and the error from `generate`. An error of any other kind is still thrown.
  - An export whose file is missing gives _"@ydinjs/box-quad/extra.js doesn't resolve: publish the file that its export names"_.
  - A module's import that doesn't resolve gives _"a bare import of effects/undeclared.js reaches effects/undeclared.js, whose import of undeclared-package doesn't resolve: publish the module, or declare its package in dependencies"_. The module is named by its path after the last `node_modules/`, because aube installs the package under `node_modules/.aube/`.
  - A bundle with an import that doesn't resolve isn't also reported for its bytes, because those bytes include the kept import.
- **Rows:** `checkConsumer`'s _"should report the bare import of a missing export as an import that does not resolve"_, and _side effects_' _"should name an import that does not resolve instead of an effect"_, for an undeclared package and a missing relative module.
- **Runs** ([tests](checks/remediation-tests.txt)):
  - All 51 rows pass.
  - With the `onLog` collection and the error handling mutated back to the behaviour before the fix, both new rows fail: the missing export gets _"keeps 34 bytes: remove the effect…"_, and the relative import fails the build.
  - The feature proof's `without-dependencies.sh` gives the usage as committed, and `ERR_MODULE_NOT_FOUND` with the import at the top. The type-only import of `RolldownLog` is erased.
  - `just release-check core` gives the same 152 problems with no `side-effects` and no `consumer` problem ([core](checks/remediation-release-check-core.txt)). `just release-check box-quad` exits 0 ([box-quad](checks/remediation-release-check-box-quad.txt)).
  - Root `just typecheck`, `just lint` and `just fmt-check` exit 0 ([gates](checks/remediation-gates.txt)).
  - Root `just test`, two runs with the fix: the first failed only `drag:DRI-17`'s hot-path row, at 23.89 per move against the ceiling of 16, and the second passed, 146 files and 2,309 tests. The row passes alone. A control run with the two scripts at `f2556af8a` passed, 2,307 tests. One failure in two runs doesn't show whether the new rows move the row. It is more data for #70, not a diagnosis.

## Re-review of the remediation

The [re-review](../reviews/core-side-effects-1/re-review-claude.md) at `5a16e410b` found `reviewer-1` and `reviewer-2` resolved, and the lazy import holds.

- **`reviewer-3`, Tier C, open, doesn't block:** an import of a `node:` built-in is reported with the repair _"publish the module, or declare its package in dependencies"_, and neither repair applies. No package that declares the field imports a built-in, so no release is affected today. Whether the check accepts a built-in import from a package that declares `"sideEffects": false` is a scope question, routed to the architect. It isn't fixed in this unit.

## Not done

- No tag, dispatch or publish.
- Nothing in `.github/workflows/release.yml` changes.