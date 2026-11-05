# D-208 final review: package coherence (integrity pass)

**Author:** Claude (`integrity` role), one independent pass of the `d208-final` round.

## Commit read

- **Files read at:** `bd3613d5f` on `drag2/fin-review2`.
- **Reviewed `src/` tree:** `c6c5e6ea59697efa8f27beae2700a574e6f3df4c`. I ran `git rev-parse bd3613d5f:packages/drag2/src`, and it matches.
- **Runtime comparison input:** `6905af249`, an ancestor of the reviewed commit.
- **Shared inputs read:** `00-index.md` (D-208's entry), `request-application-claude.md` §29 and the sections it references, `d208-requests.md`, and the contracts where a finding touches them.

## Result in one paragraph

**No tier A finding.** I found no case where a correctly integrated consumer observes different runtime behaviour because of a disagreement between sites. I found **two tier B and two tier C disagreements**, all in text and instruments, none in code that runs. The frozen source has no behavioural drift across the kernel, the sortable, free drag, the installers, the published surface, the declarations or the shared test configuration that I could show from two places. The record's runnable claims reproduce on a clean tree. Nothing here needs an architectural, contract or public-surface decision. integrity-1 and integrity-2 are published-comment edits, which the freeze routes to the architect.

## Scope

### Covered

| Area | What I compared |
| --- | --- |
| Kernel against both behaviors | The diagnostic route. The four `channel()` mint sites, `deliverUnlessApplied`, `reportToSpec`, the panic bypass, and the sortable and free-drag `#deliver`/`#notify`/`reportError` against each other. |
| Lifecycle readers | R21's census of lifecycle reads, by location, against `src/`. |
| Controller surface | Both controllers' `requestCancel`/`requestDestroy` against `BehaviorContext` and against README line 74. |
| Installer middle tier | The removal of `live` from `DisplacementReport` and `InsertionRuntimeView`, and of `Transition.rollback`, against every site that named them. |
| Published declarations | The built `.d.ts` for stale vocabulary, for identifiers, for strikethrough and for supersession wording. |
| Package metadata | `files.json`, `package.json` exports and the tsdown entries. |
| Shared test configuration | `.scripts/vitest-config.ts`, `vitest.config.ts`, `bench/shipped/vitest.config.ts`, `bench/m2pp/run.ts`, the root workspace config and `Justfile`'s description of it. |
| Examples | Both stories files. |
| Size record | `bench/size/measure.ts` ceilings and controls against `d208-requests.md`. |

### Not covered

- **Feature correctness against the plan.** That belongs to another pass.
- **Terminology and the STE phase, F-442, F-443, F-445 and compression.** Out of scope by the brief.
- **The decision's statistical content.** I did not reopen retained heap A or allocation a3, I ran no statistical or timing round, and I did not check d208-requests.md's tables against the raw M-2″ file. The truthfulness of that record is the other pass's.
- **Lint and typecheck as gates.** In my environment both show errors that I did not attribute: `.scripts/vitest-config.ts:181` and `.scripts/vitest-one-shot.ts:34` for typecheck, and typed-lint errors in `kernel/seams.ts` and others. They are the errors the record already carries ("lines this diff does not touch"). I did not rerun them at `6905af249`.
- **`decisions.node`'s witness failure.** Expected until the architect's acceptance. I did not weaken it, and I do not report it.

## Verification ledger

Every claim below says whether I ran it, read it from the record, or both. Everything I ran was in a scratch worktree of mine, outside `packages/`, removed at the end.

| Claim | Status |
| --- | --- |
| `src` tree is `c6c5e6ea5` at `bd3613d5f` | **Ran** `git rev-parse`. |
| Node and declaration projects at the tip fail exactly the expected set | **Ran.** 5 failed, 433 passed: `decisions.node` (witness) and the four `docs.node` rows. Nothing else, including `size.node`'s six controls, `capture.node`, `exports`, `consumer`, `packaging`, `references`, `entry`. |
| Browser and shipped projects pass except the two unloadable files | **Ran, twice,** on a clean tree: 901 passed, 68 skipped, two files failing to load. |
| Cause of the two unloadable files | **Ran.** "Incompatible React versions". `packages/drag2/package.json` pins `react-dom` 19.2.7 and installs it under `packages/drag2/node_modules`, while the root installs `react` 19.3.1. No file in the D-208 range touches either manifest. |
| Cause of the four `docs.node` failures | **Ran.** TypeDoc aborts on the two compiler errors in `.scripts/vitest-config.ts:181` and `.scripts/vitest-one-shot.ts:34`. Neither file is in the D-208 diff for those lines, so the failure is the input's. |
| The published surface has no unresolved reference or warning | **Ran, and new to the record.** The record says TypeDoc is checked only through the compiler. With `--skipErrorChecking --treatWarningsAsErrors`, the full entry set and each of the three tier subsets emit with zero warnings. The four `docs.node` rows are therefore red on the environment, and they hide nothing about the surface. |
| Ceilings and controls are what the record states | **Ran** `bench/size/measure.ts` in the scratch tree: every row's size and module count matches `d208-requests.md`. **Read** `measure.ts`: the thirteen ceilings are each the figure at tree `4630579d2` plus 150, and the five controls and baseline B are the re-declared figures. Slack is 116 to 143 B on the package rows, 63 B on `drag.js` and 124 B on baseline B. |
| `shipped` project routing | **Ran.** `zero-read.browser` runs in `shipped` and in no other project, in package mode and in root workspace mode (`shipped/drag2`). With the file routed to the ordinary project instead (a scratch config, `__DEV__` true), at least 5 of its rows fail (I read the first five), so the routing is load-bearing and the instrument is sound. |
| `bench/shipped/vitest.config.ts` | **Ran.** It routes `d208-step6.browser` to `shipped` and excludes it from `browser`; it passes 3, skips 6. |
| The four mint sites and the declaration and definition lines | **Read** at `sortable/spec.ts:317`, `free-drag/spec.ts:243`, `sortable/behavior.ts:126`, `free-drag/behavior.ts:52`, `kernel/spec.ts:105`, `kernel/kernel.ts:2600`. All match. |
| R21's read census | **Ran** `grep` over `src/` for lifecycle readers: none outside `src/kernel/`, and the in-kernel locations match the record's table. |
| Property 12 (no top-level `let` or `var`, no mutable static) | **Ran** `grep` over `src/`: none. |
| The `src/` comment-only commit changes no code | **Read from the record** (§29.1, `d208-step6.md`). I did not repeat the transpile-equality check. |
| M1, M2 and M3 reddening 19, 11 and 2 rows | **Read from the record.** I did not run the mutations. |

## Findings

### integrity-1 (tier B): the published doc of `CANCEL_SUPPLIED` names a controller member that no longer exists

- **Finding.** The doc comment on `CANCEL_SUPPLIED` says `cancel(reason?)` was called. Neither controller has a `cancel` member.
- **Current behavior / contract.** Both controllers publish `requestCancel(reason?)`, and nothing else cancels. D-208 step 4 renamed `cancel` to `requestCancel` and `destroy` to `requestDestroy`. `0ba8afb64` restated the source comments for the request model, and this one was not restated.
- **Why it is a problem.** `CANCEL_SUPPLIED` is re-exported from `kernel.ts`, `sortable.ts` and `free-drag.ts` and ships in `kernel/failures.d.ts`. A consumer branching on `origin === CANCEL_SUPPLIED` reads that value as "my `cancel()` call". The member to search for does not exist, and a reader looking for the call that produced the origin finds nothing. No program behaviour changes.
- **Evidence / reproduction.** Ran.
  - `src/kernel/failures.ts:83` reads ``/** `cancel(reason?)` was called — by the consumer or by the behavior. */``.
  - `src/sortable/controller.ts:31` and `src/free-drag/controller.ts:62` declare `requestCancel(reason?: unknown): void`.
  - In a built scratch tree, `grep -n 'cancel(' kernel/failures.d.ts` returns line 39, the same sentence. It is the only published declaration that names `cancel(` or `destroy(` as a member.
  - The unpublished comment at `src/kernel/failures.ts:66` repeats `` `cancel(reason?: unknown)` ``.
- **Required property.** Every published comment that names a controller member uses a name the controller publishes.
- **Routing.** A comment-only edit to a frozen published file. It goes to the architect under §29.4. It needs no contract call.

### integrity-2 (tier B): `BehaviorContext.fail` documents a "platform report" that the kernel no longer sends, in the same block that says otherwise

- **Finding.** The published doc of `BehaviorContext.fail` says a call outside a seam "is downgraded to a platform report". The kernel delivers a `DraggableWarning` through the controller's route to `onError`, and nothing reaches the platform.
- **Current behavior / contract.** In `Kernel.fail` and `#failOperation`, a failure with no operation, or one raised while a report is in flight, calls `this.report(new DraggableWarning('drag: failure/not-classified', …))`. That route applies D-208's refusal and delivers to the spec's `reportError`. Before arming it is silent, because the route does not exist yet. The same `fail` entry's next paragraph says as much: "the report travels through the behavior's own `reportError`".
- **Why it is a problem.** A kernel-tier behavior author reads "platform report" as `globalThis.reportError` and expects the error in the console. The package delivers it to `onError`, where D-208's refusal can silence it, so a second reader finds the paragraph above contradicting the one below.
- **Provenance, stated plainly.** The phrase predates D-208 (`git log -S` finds it in the scaffold commit `c87ad854f`, and the platform channel went with D-130). D-208 did not write it. D-208's edit to the `BehaviorContext` header (`kernel/spec.ts:44-46`) now points readers at `fail`'s "demotion" as its source of truth, and the comments at `kernel/kernel.ts:801` and `:2648-2651` repeat the phrase. I report it as reached by the change and leave the weight to the consolidator.
- **Evidence / reproduction.** Read and built.
  - `src/kernel/spec.ts:76` ("downgraded to a platform report") and `:79-81` ("the report travels through the behavior's own `reportError`").
  - `src/kernel/kernel.ts:855-880` (the `this.report(new DraggableWarning(…))` demotion).
  - `src/kernel/kernel.ts:801`.
  - The built `kernel/spec.d.ts` carries the same two paragraphs.
- **Required property.** The published description of an out-of-seam `fail` names the destination the kernel uses, once.
- **Routing.** A comment-only edit to a frozen file, routed as for integrity-1. It does not decide any behaviour.

### integrity-3 (tier C): the root `Justfile` still says the workspace contributes 15 projects

- **Finding.** `Justfile:48` says the root configuration contributes "the same 15 projects the seven per-package configurations do". It contributes 16.
- **Current behavior / contract.** The shared test configuration now gives drag2 a fourth project, `shipped`. `createWorkspaceTestConfig` lists 16 projects, 15 at `6905af249`. The seven per-package configurations also contribute 16 (4, 2, 1, 3, 4, 1, 1).
- **Why it is a problem.** It is a counted claim about the test layout that is now wrong by one. The claim it supports, that coverage is unchanged, still holds, so nothing is misrouted. A maintainer checking project coverage by count finds a discrepancy.
- **Evidence / reproduction.** Read. `Justfile:48`; `.scripts/vitest-config.ts`, the `assignGroupOrder([...])` list in `createWorkspaceTestConfig` (16 entries, including `drag2Shipped`); `git show 6905af249:.scripts/vitest-config.ts` (15). `.agents/docs/test-architecture.md:120` makes the same claim without a number and is still true.
- **Required property.** A counted statement about the number of test projects matches `createWorkspaceTestConfig`.
- **Routing.** Not a drag2 file. A repository-level doc edit for whoever owns the `Justfile`. It needs no decision.

### integrity-4 (tier C): test titles and comments still use the retired names `destroy()`, `kernel.cancel` and `settlementLive`

- **Finding.** After the rename, test files in `packages/drag2/tests` still describe the API by its old names, and one cites an identifier that no longer exists in `src/`.
- **Current behavior / contract.** The controller members are `requestDestroy`/`requestCancel`, and `settlementLive` is gone from `src/`.
- **Why it is a problem.** Nothing a consumer sees. A maintainer searching the tests for the current member name misses these rows, and the `settlementLive` comment points at nothing.
- **Evidence / reproduction.** Ran `grep` over `tests/` and `src/`. Test titles: `tests/free-drag/free-drag.browser.test.ts:419` and `:429` (`…after destroy()`), `tests/free-drag/lifecycle.browser.test.ts:220`. Comments: `tests/sortable/features.browser.test.ts:1471` (`controller.destroy()`), `tests/kernel/kernel.browser.test.ts:3668` (`kernel.cancel`), `tests/free-drag/anchor.browser.test.ts:31` (`settlementLive`, which `grep -rn settlementLive src` does not find). `src/` itself holds none of the removed names, other than integrity-1's.
- **Required property.** Names in test titles and comments are names the code has. This is a priority-low residue, not a property anyone depends on.
- **Routing.** Test-only. Titles are citations in `tests/COVERAGE.md`, so a rename is checked mechanically by `coverage.node`. The implementer, after acceptance.

## Observations that are not findings

Recorded so a silent area is distinguishable from a clean one.

- **`createWorkspaceTestConfig` destructures `createDragTestProjects`' result by an unchecked cast** (`as [UserConfig, UserConfig, UserConfig, UserConfig]` for drag2, a 3-tuple for drag). The two sites agree today, because `DRAG2_SHIPPED_BROWSER_TESTS` is non-empty. Emptying that list would misassign `declaration` and `node` silently. This is a latent coupling, not a present disagreement, so it is not filed.
- **README sections, `bench/size/noncomposed.js` and the size table.** The README's size section still says six of seven compositions are over budget and shows 2026-08 figures; it was already stale at `6905af249`. Baseline A's `mount()` has never mirrored the composition's report closure, and it did not at `6905af249` either. Neither is a D-208 effect.
- **`DraggableError.stage === null`** is documented as "the controller was destroyed". The only producer is the panic report, which is delivered after the bracket closed. The wording predates D-208 and is arguably true; I do not file it.
- **`bounds()` now copies the resolved rect once per resolve.** A thunk that mutates and returns one object in place no longer reaches the clamp until `invalidate()`. This is D-208's decision (R34), and `FreeDragController.invalidate`'s doc ("the source is re-read") already states it. The `BoundsSource` doc does not say the result is copied. I judge that a documentation gap and not a disagreement, and I did not file it.
- **`reported, not fixed` sites in the record** (`kernel/unwind.ts:33`, `sortable/spec.ts:1685`). Read. They are tier C, stated by the record, and I add nothing.

## Null results, stated

- **No tier A.** No consumer-observable runtime difference found between sites.
- **No second source of truth for the diagnostic refusal.** It is written once, in `deliverUnlessApplied`. Both behaviors route through it by minted channel or by the controller's route, and no module under `sortable/`, `free-drag/` or `shared/` reads the lifecycle.
- **No unresolved reference on the published surface**, as above.
- **`files.json`, `package.json` exports and the tsdown entries agree.** `exports.node`, `consumer.node` and `packaging.node` pass on the tip.
- **No identifier, strikethrough or supersession wording in any published comment.** Checked in the built `.d.ts`.
- **No stale removed names in `src/`** apart from integrity-1 and integrity-2.

## Scratch work and one disclosure

- **My own scratch worktree** was created in the shared session scratchpad, outside `packages/`, and removed at the end along with my logs. I changed no tracked file and nothing in the main checkout.
- **Disclosure about another pass's worktree.** The first `git worktree add` I issued, at `scratchpad/wt`, reported that the path already existed. Another pass in this round had just created it, at the same commit. I did not notice and used it from about 09:05 to 09:22. In it I built the package, ran node, declaration and browser suites, temporarily added a `console.log` to `kernel/execution.ts` and a `globalThis` trace to `kernel/kernel.ts` and `kernel.browser.test.ts`, ran `git checkout 6905af249 -- packages/drag2/src packages/drag2/tests` and then `git checkout bd3613d5f -- …` to compare against the input, and moved the Vitest and Vite caches aside. All of that was reverted, but **any browser or mutation result that pass obtained in `scratchpad/wt` between roughly 09:05 and 09:22 UTC on 2026-11-04 may be contaminated**, and the contamination ran both ways. I saw failures in `kernel.browser.test.ts` whose sets changed between invocations, which is what a sibling mutation of the same file looks like (at one point `phase > RELEASING ||` was missing from `#cancelWith`, which I did not make). **I discarded every result from that tree.** The results in the ledger above all come from my own tree, where the whole-suite result is stable across repeated runs. A sibling that used that tree in that window should rerun what it ran there.

## Next

The consolidator decides which of integrity-1 and integrity-2 to carry to the architect as comment-only edits to the frozen published surface. The freeze (§29.4) means neither is applied by this round. Integrity-3 is for the `Justfile`'s owner and integrity-4 for the implementer after acceptance. Nothing blocks the architect's whole-decision acceptance on coherence grounds.