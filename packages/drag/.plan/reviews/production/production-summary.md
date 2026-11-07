# Production `@ydinjs/drag`: review round summary

**Reviewed tree:** `d7e7b0d3a` on `drag/production`, range `a1d31e0d2..d7e7b0d3a`. All three passes read that commit. **Shared inputs:** [`contract.md`](../../contract.md), [`00-index.md`](../../00-index.md), [`implementation-handoff.md`](../../implementation-handoff.md), [`implementation-report.md`](../../implementation-report.md).

**The passes ran independently and in parallel, and each wrote its own report:**

| Pass | Lens | Report |
| --- | --- | --- |
| reviewer | Feature proof: contract coverage, the seven choices, the test audit, the performance and size evidence | [`proof-reviewer.md`](proof-reviewer.md) |
| integrity | Package integration, regressions against the baseline `a1d31e0d2` | [`integration-integrity.md`](integration-integrity.md) |
| cleanup | Simplicity, naming and comments against `CONTRIBUTING.md` and technical English | [`discipline-cleanup.md`](discipline-cleanup.md) |

No `der` pass ran, because none was requested.

**Outcome:** the package integrates cleanly. A consumer installing the packed tarball sees no regression, and the branch repairs three failures that exist at the baseline. **Three tier-A findings and one open tier-A question go to the architect.** Each tier-A finding is a contract reading that the implementation settled, or a contract rule that conflicts with the handoff. Four tier-B findings concern the evidence instruments and a stale README. The tier-C findings are internal.

**Nothing here repairs source, amends the contract or accepts an owner tradeoff.** `drag:DRO-1`, `drag:DRO-2` and `drag:DRO-3` remain open for the owner.

## Identifiers

**The ids below are local to their pass, and no canonical ids are proposed.** The `drag` register ([`00-index.md`](../../00-index.md)) owns `DRD-`, `DRI-` and `DRO-` only. It has no family for findings or questions, and [`review-findings.md`](../../../../../.agents/docs/review-findings.md) closes drag2's bare `F-`/`Q-`/`I-` series to every other scope. Whether `drag` gains a findings family is the architect's decision. Until then, these findings are addressed as `drag/production:<local id>`, for example `drag/production:reviewer-1`.

## How the findings were validated

I checked the following claims against the reviewed tree:

- **`reviewer-1`:** `requestStep: this.requestStep` at `src/draggable.ts:634`. `#runStep` reads the current `#session` (`:503-509`). `requestCancel` compares sessions (`:635-639`). The text of `DRI-8` is "the operation's `Drag`".
- **`reviewer-2`:** `src/sortable.ts:356` skips the second pull when `pointerId === -1`. The text of `DRI-14` is "no `onStart`, no `onEnd`, no report".
- **`reviewer-3`:** the test asserts `scheduled <= 8` after an 8-step move (`tests/hot-path.browser.test.ts:123-127`), and the coalescing guard is `handle === 0` in `src/shared/invalidation.ts:30`. **What this establishes:** the assertion holds without coalescing. **What it does not establish:** I did not re-run the reviewer's mutation, or the frame counts of probe P3.
- **`reviewer-7`:** in `#conclude`, `focus()` precedes `lift.land` (`src/draggable.ts:924-944`).
- **`integrity-1`:**
  - **What I confirmed:** root `overrides` maps `rolldown` to the root version. The lockfile carries `node_modules/rolldown` at `1.2.15` and `packages/drag/node_modules/rolldown` at `1.1.5`. `packages/drag/package.json` pins `1.1.5`.
  - **What this establishes:** the toolchain the controls were measured with is in conflict with the override.
  - **What it does not establish:** what a clean `npm ci` installs, or the `-11 B` failure. Both rest on the integrity pass's worktree run.
- **`integrity-2`:** `npx oxlint .scripts/vitest-config.ts` reports the 3 errors (lines 592 and 596).
- **`integrity-5`:** `packages/drag2/README.md` lines 8 and 48 contradict each other as quoted.
- **`cleanup-1` and `cleanup-3`:**
  - `git grep` finds `version` written at `sortable/collection.ts:62` and `sortable/domain.ts:31`. Every read of `.version` is `snapshot.version`.
  - `pointerId !== -1` appears at `sortable.ts:356` and `:423`.

The remaining findings rest on their pass's evidence, which I read but did not reproduce. **No finding was rejected.** No finding is incomplete. Every report states the current behavior, the evidence and the property that must hold.

**I merged no findings across passes.** Two pairs share a location but not a defect, so they stay separate:

- **`reviewer-6` and `reviewer-7`:** the first bullet of `reviewer-6` says no test observes the order of `DRI-9` steps 6 and 7. `reviewer-7` asks which order should hold. The missing witness is a defect whichever order the architect chooses.
- **`reviewer-2` and `cleanup-3`:** both cite `sortable.ts:356`. `reviewer-2` concerns what the check decides (behavior), and `cleanup-3` concerns how it is spelled (naming). Settling `reviewer-2` may remove the line `cleanup-3` cites. That is a sequencing note, not a merge.

**I corrected one fact.** `cleanup` oq-2 says no test names `sortable/insertion-placeholder-lost` or `sortable/anchor-outside-container`. That is literally true. However, `tests/sortable.browser.test.ts:436` exercises the factory path that reports the first one and asserts one fault, and `reviewer-2`'s probe P2 reaches the second through a keyboard command. **The question itself still stands for the architect.** These facts bear on whether each throw passes the §1.1 gate.

## Routed to the architect

| Local id | Tier | Claim | Why it is the architect's |
| --- | --- | --- | --- |
| `reviewer-1` | A | A step requested through a retained `drag.requestStep` receives a later operation's `Drag`. Probe P1 shows this in three engines. `drag.requestCancel` is scoped to its own operation | Report choice 4 settles a reading of `DRI-8` ("the operation's `Drag`") that the text does not state |
| `reviewer-2` | A | A keyboard command whose item leaves the collection during activation runs `onStart` and `onEnd:canceled` and reports `sortable/anchor-outside-container`. A pointer operation declines quietly. Probe P2 shows this in three engines | Report choice 2 narrows `DRI-14`, and the narrowing is observable |
| `reviewer-7` | A | **Open question, the landing-layout miss.** A landed drop costs 400 layouts per 50 cycles against 350 for both before arms, in every round, and the reviewer reproduced the count. The forced layout comes from the kernel's `focus()` (`DRI-9` step 6) running before `lift.land` (step 7). It occurs only when the behavior composes a landing, focus was inside the item at the drop, and focus has fallen to `body` | `DRI-9`, `DRI-12` and `DRD-9` fix the order, and handoff §5 forbids the extra layout. Both come from the architect. **Preserved unresolved, as requested** |
| `reviewer-4` | B | The timing rule uses the control arm's range across rounds as the floor. Paired within each round, cycle rows that are recorded as "no difference" show production higher in 7 of 7 rounds: task +1,804 µs against drag2 and +1,364 µs against the prototype, at about 14,000 µs per cycle. The instrument proof does not cover these rows | The rule in handoff §5 is applied as written, and the finding is about the rule. It goes to the owner as well, under CONTRIBUTING §0. The reviewer's own limit: 52 comparisons were scanned, and the control arm shares rounds with the before arms |
| `reviewer-5` | B | The retained-heap rule compares absolute heap with a 0 B floor, so differences in code size flag. The reading overrides the `FLAG slower` at 200 operations using one-round copies of the instrument whose scripts are not in the tree | The handoff's retained-heap rule needs an instrument that separates library objects from code, or a record that the rule was decided by manual attribution. Choosing between them is a contract choice |
| reviewer choice 1 | — | The kernel declines quietly for an item disconnected at activation, for every behavior. `DRI-14` scopes the decline to `sortable` | Open question. The reviewer did not file it as a finding |
| `cleanup` oq-1 | — | `LinearShift` and `RectIndex` are parameterised for any axis, but `y()` is the only caller | Whether an axis seam is intended |
| `cleanup` oq-2 | — | Whether `sortable/anchor-outside-container` and `sortable/insertion-placeholder-lost` pass the §1.1 gate. See the factual correction above | Failure semantics (CONTRIBUTING §13) |
| `cleanup` oq-3 | — | The grow and shrink policy of `RectIndex` has no measurement tied to it | Whether performance requires it |
| integrity open questions | — | **Path reuse:** `packages/drag/src/sortable/keyboard.ts` is struck in drag2 records as removed, and now resolves to the production file. Other dated `packages/drag/src/...` citations also resolve to a different implementation. **History dependency:** the `--prototype` and `compare` instruments need commit `599684791` to stay reachable. **Typecheck dependency:** `bench/lab-drag2.ts` ties `drag`'s typecheck to drag2 source, by design under `DRD-13` | Record and instrument policy |

## For the owner

- **Choice 7:**
  - **What happened:** the implementation removed ignored output from the main checkout beyond the items the handoff named.
  - **The rule:** handoff §1 requires a clean worktree, or telling the owner before removal.
  - **What is unknown:** the report does not say whether the owner was told, and the files cannot be recovered from git.
  - **Status:** this is a verification limit, not a finding.
- **`reviewer-4`** bears on how the owner reads the "no difference" rows under §0 and `drag:DRO-1`.
- **`drag:DRO-1` to `drag:DRO-3`** are unchanged by this round.

## Remediation candidates

These need no design decision. The architect schedules them once the questions above are settled.

| Local id | Tier | Claim |
| --- | --- | --- |
| `integrity-1` | B | A clean `npm ci` does not reproduce the `rolldown` the size controls were measured with. Root `overrides` against the nested `1.1.5` makes `drag:DRI-18 ... draggable alone` fail by `-11 B` from a clean checkout |
| `integrity-5` | B | Line 8 of `drag2/README.md` says the shipped `@ydinjs/drag` is untouched, and line 48 says that package is gone. Lines 34, 67 and 112, and line 106 of `.agents/docs/accessibility.md`, repeat the stale reading |
| `reviewer-3` | B | The `DRI-17` test "should run the spatial search at most once per frame" cannot fail. Removing coalescing passes the whole suite |
| `reviewer-6` | C | Obligations with no witness: the order of `DRI-9` steps 6 and 7 (a swap passes all 754 tests), a keyboard command with a landing, a second pointer's moves, and `pointercancel` giving `interrupted` outside Chromium. The last is a stated limit of the handoff |
| `integrity-2` | C | 3 oxlint errors in the new `createDragAllEnginesTestConfig` (`.scripts/vitest-config.ts`), with 0 at the baseline. Root `just lint` stops before reaching them |
| `integrity-3` | C | `fmt-check` newly fails on 5 files the range touched |
| `integrity-4` | C | The package's `docs-api-prepare` and `docs-api-build` exit 3 with 6 errors in `tests/authoring.declaration.test.ts`. No root recipe calls them |
| `integrity-6` | C | `.agents/docs/coordinator.md` line 15 still calls drag2 "the replacement" |
| `integrity-7` | C | The retirement of baseline B leaves live sentences in drag2's `05-lifecycle-invariants.md` and `COVERAGE.md` ("Fifteen rows" where there are now fourteen) |
| `integrity-8` | C | `entry.sh drag:DRD-1` answers `unknown scope: drag`, and CONTRIBUTING line 17 still names drag2 as the only scope it resolves |
| `cleanup-1` | C | `Insertion.version` is written and never read |
| `cleanup-2` | C | `SessionView` and `WritableLiftedDrag` are one mapped type under two names |
| `cleanup-3` | C | `sortable.ts` spells the command sentinel `-1` where the kernel names it `COMMAND_POINTER_ID` |
| `cleanup-4` | C | `view` names both the Window and the `Drag`, and `realm` and `#window` also name the Window. `panel` names the controller, and `describe` collides with the test-framework name |
| `cleanup-5` | C | The `from === -1` guard in `keyboardInsertion` cannot be reached from correct use |
| `cleanup-6` | C | A second reference to one object only to narrow its type (`LinearShift.#view`, `y()`), and `DEV` aliases `__DEV__` |
| `cleanup-7` | C | `ReadonlyFloat64Array` is an `interface` where the repository requires `type` |
| `cleanup-8` | C | `buildGeometry` takes 9 positional arguments and `buildRequest` takes 8, and an object is built only to be unpacked |
| `cleanup-9` | C | Duplicated values: the landing defaults, the fallback for a singular ancestor, and the `ACCEPTED`/`RESOLUTION`/`Reject` mechanism in both `domain.ts` files |
| `cleanup-10` | C | `bounds()` stores `bounded`, which can be derived |
| `cleanup-11` | C | `freeDrag` applies the `handle` default that the kernel already applies |

## What the passes confirmed

- **Tests:** `just test-engines` gives 745 passed and 14 skipped (Chromium-only skips). The reviewer's run, with 9 added probes, gave 754.
- **Size and layout counts:** the size table reproduces byte for byte, and so do the landed-cycle layout counts.
- **Public surface:** `exports`, `files.json`, `typedoc.json`, the tsdown output and `tests/exports.node.test.ts` list the same 11 entries. They match the contract's public-surface table. A tarball consumer imports and typechecks them, and `./shared/*` is refused.
- **Failures at the baseline, not caused by the branch:**
  - lint in `core`, `tproc`, `vite-custom-element-assets`, `drag2` and `material-x`, with identical output;
  - `TokenPackageProcessor` in `tproc`.

  This settles the report's limit "root failures weren't run at the base revision".

- **Repaired by the branch:**
  - root `just size`, where drag2's baseline B control moved by -6,865 B;
  - two `drag2` node tests;
  - the `box-quad` typedoc run.
- **Report choices 3, 5 and 6** stay within the contract.
- **The report's statement that the test audit is partial is accurate.** `reviewer-6` lists what the unaudited rows hide.
- **Cleanup's null results:** no planning ids or history narration in `src` comments, and no leftover `lab` hooks. The kernel, the lift, `RectIndex`, `layoutAnimation` and the frame helpers each own a rule or an algorithm.

## Verification limits

- **Timing:** no timing was re-measured on a quiet machine. The reviewer's short run was unusable, because the three passes ran concurrently on one machine. The layout counts in that run were valid.
- **Not re-run:** the 32 recorded mutations and the instrument proof (`--prove`).
- **The landing cause:** the trace behind `reviewer-7` was read, not re-traced.
- **Root test counts:** the integrity pass's root `vitest run` was killed twice by memory pressure. The baseline then ran with `--maxWorkers=3`, so the two sides compare as failing sets, not as counts.
- **`radio.visual` (`material-x`):** it failed in both of the integrity pass's worktrees. That pass treats it as environmental, and the report calls it unstable.
- **Not reviewed:** cleanup read `src` only, not the tests, stories, CSS or bench. Storybook was checked for build and index, not story behavior. Physical touch and pen remain unverified (`drag:DRO-3`).
- **The branch moved during the round:** `756805fd7` (a separate design-challenge artifact) and `853a9bdea` (devcontainer) landed during the round. Neither touches `packages/drag/src`, its tests or its bench, so the reviewed tree is unaffected. This round did not read that artifact.

## Next

The authoring architect decides `reviewer-1`, `reviewer-2`, `reviewer-7`, `reviewer-4` and `reviewer-5` and the open questions, and states whether `drag` gains a findings family. Remediation follows those decisions.