# Integration integrity of `@ydinjs/drag`, combined review

**Pass:** `integrity`, package coherence outside the immediate change. **Commit read:** `b01a0283deb6d108568a9482dbe3ec20caea7ea7` (HEAD of `drag/feature-composition`, clean tree when the pass started). **Range:** `d7e7b0d3a..b01a0283d`. The production code is `50ed18a17`'s, and the later commits change only `packages/drag/.plan/`.

**Result:** four findings. Two are tier B (an instrument that cannot run, and an accessibility claim that is wider than the contract). Two are tier C (a contract sentence about the import rule, and one about the disposer order). No behavior of a correctly integrated consumer differs from the contract in what I read or ran. All 13 entries, the export map, `files.json`, the typedoc entry list and the exports test agree. The three tier-B or tier-C findings of the previous integrity pass that concerned the toolchain (`rolldown` in the lock, lint of `.scripts/vitest-config.ts`, format of the range's files, typedoc) are repaired.

The owner's correction applies: `DRO-7` and `DRO-8` are accepted. I did not use the register's "not accepted" status.

## Scope

**Covered**

- **Package configuration:** `package.json` (`exports`, `files`, `devDependencies`), `files.json`, `tsconfig.json`, `tsconfig.docs.json`, `typedoc.json`, `tsdown.config.ts`, `eslint.config.ts`, `Justfile`, `vitest.config.ts`, `vitest.engines.config.ts`.
- **Built output:** a fresh `just build`, the `npm pack --dry-run` file list with the relative-import closure of every packed `.js` and `.d.ts`, every entry imported in Node and compared with the contract's public-surface table, the emitted declarations read for the public types (`draggable.d.ts`, `lift.d.ts`, `kernel/*.d.ts`, `sortable.d.ts`, `free-drag.d.ts`, the capability entries), `just clean-build` leaving no ignored output.
- **Documents that describe the package:** `README.md` (all ten `ts` snippets typechecked against the built declarations with `skipLibCheck: false` and `exactOptionalPropertyTypes`, in a scratch consumer outside the repository, since removed), `contract.md` against the source, `CONTRIBUTING.md`, `.agents/docs/accessibility.md`, `.agents/docs/coordinator.md`, `.agents/docs/architecture.md`.
- **Source, read for the contract's invariants:** all of `src/kernel/`, `src/draggable.ts`, `src/lift.ts`, `src/lift/`, `src/shared/`, `src/free-drag.ts`, `src/free-drag/`, `src/sortable.ts`, `src/sortable/behavior.ts`, `operation.ts`, `axis.ts`, `domain.ts`, `collection.ts`, `keyboard.ts`, `placement.ts` and `layout-animation.ts`, plus the first part of `linear-shift.ts` and `rect-index.ts`. I did not read `xy.ts`, `y.ts` or the rest of `linear-shift.ts` and `rect-index.ts` line by line.
- **Instruments:** `tests/size.node.test.ts` with `bench/size/measure.ts`; the declaration tests, by removing every `@ts-expect-error` in a scratch copy and reading the compiler's message for each of the 50 lines (all name the intended absence, none is vacuous); `bench/compare.ts`'s `INJECTIONS` against the current source (no browser, no timing); the three lab bundles through rolldown.
- **Outside the package, in the range:** `eslint.config.ts`, `.oxlintrc.json`, `.oxfmtrc.json`, `.scripts/vitest-config.ts`, `.scripts/css/debug.ts`, `package-lock.json`, `packages/box-quad/tests/local-delta.browser.test.ts`, `packages/drag2/` (`.scripts/entry.ts`, `tests/entry.node.test.ts`, `README.md`, the two contract edits), `packages/core` (`ConverterOf`, `Trait`, `CustomElementStatics`, the three `reorderable.ts` interfaces), `packages/tproc`, `packages/size-limit-preset-rolldown`, `packages/vite-traits-plugin`, and the two doc edits.
- **Citations:** every `drag:DR?-n` address cited in `src/`, `tests/`, `bench/`, `README.md`, `eslint.config.ts`, `CONTRIBUTING.md` and `.agents/` resolves through `packages/drag2/.scripts/entry.sh`. Paths named as `packages/drag/...` outside `.plan/` that do not exist are all inside `packages/drag2/.plan/` (dated history under drag2's tense rule) or are the `prototype` path that `bench/` passes to `git archive`.

**Not covered**

- Whether the implementation meets `DRI-1` to `DRI-21` line by line. That is the proof pass's. I ran the suites as integration checks.
- Timing, `bench/compare.ts` runs, size re-bases, and the allocation figures. Not run, by the constraint.
- Physical touch and pen (`DRO-3`).
- Whether migrated tests other than the declaration tests still have their subject (the `DRF-4` (b) question). I checked only the two declaration files.
- Storybook behavior in a browser. I checked that the build succeeds and indexes the stories, not that they run.
- The devcontainer and `.scripts/cl.sh` (out of scope).

## Checks

All commands are the repository's recipes, run in the main checkout. They wrote only ignored files: the package's build output, `.vite`, `.docs`, and core and box-quad builds made by `nx`.

| Check | Result |
| --- | --- |
| `drag`: `just typecheck` | Pass |
| `drag`: `just lint` | Pass, prints nothing from either tool (so no unused directive is reported) |
| `drag`: `just fmt-check` | Fails only on the two review reports being written in this round |
| `drag`: `just test` (Chromium) | 379 passed, 6 failed: the six `size.node` rows (below) |
| `drag`: `just test-engines`, with `webkit-env.sh` sourced | 72 files, 1041 passed, 18 skipped. Without the file, WebKit cannot launch (missing host libraries) and the run reports 697 passed and 3 errors |
| Root vitest, projects `declaration/drag`, `node/drag`, `shipped/drag`, `browser/drag` | Same 379 passed and the same six failures as the package run |
| `drag2`: node project | 439 passed (includes `entry.node.test.ts`, the references and size tests) |
| `core`: `vitest run` | 263 passed. `vite-traits-plugin`: 52 passed. `tproc`: 70 passed and the one `TokenPackageProcessor` failure that the interface report records at `153068f92`, before the conversion |
| Root `just typecheck` (15 tasks, with `core` rebuilt first) and `tsc -p tsconfig.json` at the root | Pass. `material-x` typechecks against the rebuilt interface-converted `core` declarations |
| Root `oxlint` and `eslint` with `packages/**` ignored | Clean. `oxfmt --check . '!packages/**'` clean |
| `oxfmt --check` in `box-quad`, `core`, `tproc`, `vite-traits-plugin`, `size-limit-preset-rolldown` | Clean. `drag2` fails on `.plan/reviews/api-reviews/api-review-3-summary.md`, which the range did not touch |
| `lint` in `core`, `tproc`, `drag2` | Fail with 1, 2 and 21 errors, none in a file the range changed |
| `git diff --check d7e7b0d3a..HEAD` outside `packages/drag/.plan` | Clean |
| `typedoc` for `drag` | Exit 0, 0 errors, 6 warnings (see integrity-3). `core` and `box-quad`: exit 0 |
| Storybook build, `nx run @ydinjs/material-x:docs:build` | Pass. The index holds `drag-custom-behavior--resize-handle`, `drag-free-drag--bounded`, `drag-sortable--list`, `drag-sortable--grid` and the `drag2-*` stories, with no title collision |
| `npm ci --dry-run`; `npm ls rolldown` | The lock is in sync. `drag` has no nested `rolldown`, and every package resolves root `rolldown@1.2.15` |
| `npm pack --dry-run` | 92 files, no unresolved relative import, no `type-fest` in any emitted `.d.ts`, `@ydinjs/box-quad` the only bare import and a declared dependency |
| `files.json` / `package.json` `exports` / `typedoc.json` / `tests/exports.node.test.ts` | The same 13 entries in all four |
| Contract public-surface table against the runtime exports of each entry | Agree (the table lists values only, and the emitted declarations also export the types the contract's text names) |
| `just clean-build`, then `just build` | The first leaves no ignored file outside `node_modules` and `.vite`. The second leaves `git status` clean for tracked files |
| Rolldown bundle of `bench/lab.ts`, `lab-no-lift.ts`, `lab-drag2.ts` (scratch script, no browser) | All resolve, no unresolved import |

## Known and deferred items, against the handover

**Known size failures: the state is the handover's.** The six rows fail at `b01a0283d` as at `50ed18a17`: `draggable alone` (over its 2139 B ceiling by 63 B, and its control off by 178 B), `example: resize handle` (+4 B), `example: drop zone` (+177 B), `freeDrag` (+73 B), `freeDrag + bounds + landing` (+265 B) and `complete` (+41 B). I did not measure `DRO-10`'s excess separately.

**Deferred obligations:**

| Obligation | State |
| --- | --- |
| Timing and optimization | Not run |
| `DRF-1` | Unchanged. `isKernelFunction` at `bench/compare.ts:529` still selects by name |
| `DRO-13` | Unchanged. The controllers, `FrameTask` and `LinearShift` are still interfaces, and `Drag` and `Lift` are types |
| Unused directive as a lint failure | Unchanged. No unused directive exists now (lint prints nothing), and the exit status would not show one |
| `DRO-3` | Not testable here |

**One item differs from the handover.** The handover (§6) says the instrument repair is done. Item 2 of that repair is not (integrity-1).

## Findings

### integrity-1 · Tier B · `compare.ts --prove` cannot run: all six injections are stale, and the dry check that `DRD-23` states does not exist

**Claim.** The instrument that proves `compare.ts` flags a known cost has no injection that applies to the current source, and the check that would find this without a browser was never written.

**Finding.** `INJECTIONS` in `bench/compare.ts` (line 803) holds six text patches. None of their `find` strings occurs in the file they name at `b01a0283d`.

**Current behavior and contract.**

- `00-index.md:207` (the `DRD-23` bullet "An instrument selects the kernel by location") says: "`compare.ts --prove` checks that every injection applies before it runs any scenario, and can stop there, so a stale injection is found without a timing run."
- `instrument-repair-handoff.md` §2 asks for exactly that: a `--prove` that applies every selected injection before it launches a browser, a dry option, and three updated injections.
- `instrument-repair-report.md` §Not run lists "Item 2, the `compare.ts` injections and the dry application check" as not done, and says it "can start as soon as the architect says so, and needs no browser".
- The handover (`callback-list-completion-assessment.md` §6) states that the instrument repair is done.
- `prove()` (line 901) applies one injection per loop turn, inside the browser run. `bundlePatched` (line 870) throws `injection does not apply in <file>: <find>` for the first one that does not apply. There is no dry option and no earlier pass. The header comment (lines 12 to 15) describes neither.

**Why it is a problem.** `--prove` is the instrument's proof that the comparison can see a cost. With timing deferred, the first use after the deferral will fail at its first injection, after it has launched a browser. The rule that the register states as a property of the code does not hold in the code. The stale state was known and recorded as owed; the handover's "done" is what differs.

**Evidence.** A scratch script (removed) read every `find` literal from `bench/compare.ts` and searched the named file:

| Injection | File | `find` occurs at `b01a0283d` |
| --- | --- | --- |
| about 1 ms of script per cycle, at the drop | `src/sortable.ts` | no |
| one object of about 1 KB retained per operation past destruction | `src/sortable.ts` | no |
| one forced layout per move | `src/sortable.ts` | no |
| one O(n) walk per move | `src/sortable.ts` | no |
| 1 KB allocated per move | `src/draggable.ts` | no |
| one entry on the step list per frame | `src/draggable.ts` | no |

`activation-result-report.md` (lines 166 to 175) records the same table at `da139407e`, with every row "no" after the activation-result unit. The sites have moved to `src/sortable/operation.ts` (`drop`, `start`, `move`), `src/kernel/session.ts` (`#move`) and `src/kernel/gesture.ts` (`requestStep`). I did not run `--prove`, since it launches a browser.

**Required property.** As `DRD-23`'s last bullet states and the repair handoff's §2 specifies: every injection in `INJECTIONS` applies to the current source exactly once, and `--prove` finds one that does not before it runs any scenario. Until then the register records item 2 as open, not as done.

### integrity-2 · Tier B · The package says every landing honors `prefers-reduced-motion`, and the contract limits that to the landings `landing()` starts

**Claim.** `README.md` and `.agents/docs/accessibility.md` promise zero-duration landings under reduced motion for every landing. A third-party `Landing` owns its animation, so the library cannot give that promise.

**Finding.** Two documents state the guarantee without the limit that `DRD-33` added.

**Current behavior and contract.**

- `contract.md:271` (DRI-13): "With `prefers-reduced-motion: reduce`, every landing that `landing()` starts has zero duration." `contract.md:266`: "A third-party `Landing` owns its own animation." The change record for 2026-11-09 says that the older text, which covered "a landing that a custom behavior named with no timing", was replaced.
- `src/shared/landing.ts:112` agrees with the contract: "every landing it starts has zero duration". The reduced-motion check is inside `startLandingAnimation`, which only `landing()` supplies. `Lift.land` takes any object with `timing` and `start`, and calls its `start` as it is.
- `README.md:251`: "With `prefers-reduced-motion: reduce`, every landing has zero duration."
- `.agents/docs/accessibility.md:73`, in the "Fulfilled requirements" list: "Every landing has zero duration with `prefers-reduced-motion: reduce`, including one a custom behavior returned with no timing." The section's header still reads "Updated 2026-11-07", before `DRD-33`. A behavior returning a landing from `settle` with no timing no longer exists (`settle` returns nothing, and `land` requires a `Landing`).

**Why it is a problem.** The accessibility record is the document that the repository uses to decide what a consumer must still do. An integrator who writes a `Landing` of their own (the contract publishes the type for that) is told by both documents that the library already handles the preference. `landing.browser.test.ts:245` covers only `landing()`. A reading of the code shows the library cannot apply the preference to a third-party `start`.

**Evidence.** `src/shared/landing.ts:75` to `:112` (the media query is read in `startLandingAnimation`, which is `landing()`'s `start`); `src/lift.ts` `land` and the disposer that calls `named.landing.start(...)`; the three documents above.

**Required property.** Each statement about reduced motion for landings says whose landings it covers: those that `landing()` starts. A custom `Landing` is stated to own the preference, in the README and in the accessibility record's fulfilled and missing lists.

### integrity-3 · Tier C · `sortable` and `freeDrag` import a kernel type that no entry exports, against DRI-18's statement

**Claim.** `contract.md` DRI-18 says the built-ins import only public kernel types. Two files import a private one, which a public signature also names.

**Finding.** `src/sortable/operation.ts:3` and `src/free-drag/operation.ts:2` both have `import type { VerdictAwaiter } from '../kernel/behavior.ts'`.

**Current behavior and contract.** `contract.md:324` (DRI-18): "`sortable` and `freeDrag` import only public `draggable` and `lift` values and types from the kernel." `src/draggable.ts` exports `Admission`, `Behavior`, `BehaviorOperation`, `Drag`, `DragDisposer`, `DraggableController` and the outcome types, and not `VerdictAwaiter`. The contract's sketch writes `drop` with the function type inline.

**Why it is a problem.** The statement is false in two places, and a built-in's operation is the model that the README tells an author to copy. The same name appears in the published declaration of `BehaviorOperation.drop` (`kernel/behavior.d.ts`), where a consumer cannot import it. `typedoc` reports it: "`VerdictAwaiter` ... is referenced by `draggable.BehaviorOperation.drop` but not included in the documentation". The same warning list names `FreeDragSubject` (in `FreeDragRequest`), `DragAxis` (in `FreeDragConfig.axis`) and `ResolveHome` (in `FreeDragConfig.home`), which no entry exports. It also names `AxisInstaller` and `DisplacementInstaller`, which `contract.md:40` says are deliberately unpublished. The module graph is unaffected, since the imports are type-only and erased.

**Evidence.** The two import lines; `grep -rn "kernel/" src` outside `src/kernel/` finds these and `draggable.ts`; `npx typedoc --options typedoc.json` output (6 warnings, exit 0).

**Required property.** The built-ins' imports from the kernel agree with DRI-18, or the contract's sentence names the exception. A type that a published signature names is either nameable from an entry or recorded as unpublished.

### integrity-4 · Tier C · The contract's release order says the lift's release and its landing are one disposer; `lift.ts` registers two

**Claim.** `contract.md` DRI-9 steps 5 and 6 describe a release order that differs from the code's in the case where the release throws.

**Finding.** `contract.md:224` says the lift "is released as the last disposer of step 4, because `acquire` registered it first", and `:225` says the landing starts "right after the release, in the same disposer".

**Current behavior and contract.** `Lifter.acquire` calls `drag.use` twice before its first write: first for the landing's start, then for the release. They run in the reverse order, so the release runs first and the landing's start second. The code comment says why: "Two disposers, so that the landing starts right after the release even when the release throws, and each throw is reported once." `README.md` ("the landing starts after the release and before `end`") and the `Lifter.acquire` JSDoc agree with the code, not with steps 5 and 6.

**Why it is a problem.** The two sites disagree about what happens when the release throws: the contract implies the landing does not start, and the code starts it and reports one fault per throw. The last disposer to run is the landing's start, not the release. No consumer-visible behavior contradicts the README, so this is a record defect.

**Evidence.** `contract.md:224-225`; `src/lift.ts`, the two `drag.use(...)` calls in `acquire` and the comment above them. I did not search the tests for the release-throws case.

**Required property.** DRI-9's steps 5 and 6 state the order that the code and the README have: the release first, then the landing's start as a separate disposer, and what a throw in the release does to the start.

## Null results

- **Public surface.** No export, entry, declaration or documented signature differs from the contract's surface table, except the type-name gap in integrity-3. Every README snippet typechecks against the built declarations with `skipLibCheck: false`.
- **Packaging.** The packed file list is closed under its relative imports. No declaration imports `type-fest`, so the `devDependencies` placement of `type-fest` is sound. `clean-build` and `build` leave the tracked tree unchanged.
- **Architecture.** No module under `src/kernel/` names the lift, the landing or a behavior resource (`grep` for `lift`, `landing`). `draggable alone` brings the seven modules that `size.node.test.ts` lists, and no `__DEV__`, `__dragRefused` or `type-fest` text reaches the built output.
- **Other packages.** The `core`, `tproc`, `vite-traits-plugin` and `size-limit-preset-rolldown` conversions to interfaces cause no typecheck, test or typedoc failure, and `material-x` typechecks against the new `core` declarations. The root `eslint.config.ts` change turns `method-signature-style` off for every package and creates no new diagnostic anywhere I ran lint.
- **Repository configuration.** The lock is in sync and has no nested or stale `rolldown`. The `.oxfmtrc.json` additions name files that exist. `.oxlintrc.json` changed by one comment. `.scripts/vitest-config.ts` names the per-engine projects `browser/firefox`, `shipped/webkit` and so on, and the engines run uses them.
- **Previous integrity round.** The findings that concerned the toolchain are repaired: `rolldown` (integrity-1), the lint of `.scripts/vitest-config.ts` (integrity-2), the format of the range's files (integrity-3), `typedoc` (integrity-4), the `drag2` README and `accessibility.md` wording of the legacy package (integrity-5), `coordinator.md` (integrity-6), the baseline-B sentences (integrity-7) and the `drag:` scope in `entry.sh` (integrity-8). The `CONTRIBUTING.md` text on resolvable scopes now points at the scope map.
- **Declaration tests.** None of the 50 `@ts-expect-error` lines in `authoring.declaration.test.ts` and `callback-list.declaration.test.ts` is vacuous: with the directive removed, each line fails with a message about the absence it asserts.
- **Architecture note.** `.agents/docs/architecture.md` (the drag section) and `.agents/docs/coordinator.md` agree with the register about which package is production and what a landing and the commit window do.

## Verification limits

- I ran everything in the main checkout. Build output, `.vite` and `.docs` were regenerated; all are ignored by git. The package is left built.
- `bench/compare.ts` and its `--prove` were not run (timing deferred). integrity-1 rests on a text search of `find` strings, which is the check that the repair handoff itself defines.
- The WebKit run needs `source ~/.cache/ms-playwright/webkit-env.sh` in this container. I did not look into where the repository documents that (devcontainer is out of scope).
- Tests were not mutated.