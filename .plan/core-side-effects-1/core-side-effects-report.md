# `@ydinjs/core` declares `"sideEffects": false`: implementation report

**Implemented 2026-11-20 by the implementer** on `core/side-effects-1`, at the [plan](core-side-effects-plan.md) at `ddb70b49f`, with `origin/main` at `e4b0e475d` merged (no change: the branch was already on it). `RD-30` in [`00-index.md`](../00-index.md) records the decision. The owner approved the unit, relayed by the coordinator: _"Да, запускаем!"_ ("Yes, let's go!").

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
- **An export whose file is missing is now also a `side-effects` problem.** rolldown keeps an import it can't resolve, so the bare import isn't empty. `checkConsumer`'s row _"should refuse an export whose declarations are missing"_ now expects `['consumer', 'side-effects']`.
- **rolldown is imported when the check runs, not at the module's top.**
  - With a static import, the root `just test` failed `drag:DRI-17`'s hot-path row, _"should allocate per sample only the CSS string a lifted write needs"_. The kernel's per-move figure was 16.85 against the row's ceiling of 16. It failed in four of four full runs: two on the branch, one on the branch with the new rows skipped, and one on a clean `e4b0e475d` checkout with the diff applied.
  - The same row passed three times when run alone, and the full run passed on `e4b0e475d` with or without core's field.
  - With the import moved into `checkSideEffects`, the full run passes on that clean checkout and on the branch.
  - Why loading rolldown in the root run moves that row wasn't read. It is an observation for drag's record, not a finding of this unit.
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

## Not done

- No tag, dispatch or publish.
- Nothing in `.github/workflows/release.yml` changes.