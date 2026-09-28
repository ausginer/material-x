# D-152's transport deletion, reviewed at `dc2a1d4c`

Review, 2026-08-28. Everything below was read, compiled, driven or measured at `dc2a1d4c`, the tree's HEAD. The amended D-152 records (`635963d5`, citation repair `895d3d72`) are taken as settled architecture. **No production code changed**: three temporary edits were made as falsifiers and reverted in the same command, and the working tree is clean apart from the pre-existing untracked `analysis.json` and `graph.txt`.

**Verdict on the question asked: yes — deleting `SeamRejection` reduced the transport without changing failure semantics.** All eight sites reach the same stage, the same cause, the same `SEAM_PREPARE_FAILED` and the same single `DraggableError` as before; the type is gone from runtime, from every published declaration and from every export; classification and minting stay with the kernel; and the demotion paths are untouched because they sit above the mint site. The eight-versus-six discrepancy is an enumeration miss and nothing more — I looked for the residual class by shape rather than by name and found none.

**What does not hold is the measurement.** `bench/size/noncomposed.js` — baseline A, the denominator of every composition-premium figure — has been stale since D-149 and only builds because an untracked pre-D-149 artifact survives in this working tree. On a clean checkout the size instrument does not run at all, and with the baseline repaired the premium is **208 B, not 113 B**, and D-152 does not move it. That is **F-157**, tier A. Six further findings, one tier B and five tier C.

---

## 0. What was checked, and how

| Area | Result |
| --- | --- |
| `SeamRejection` gone from runtime, types, exports, tests, fixtures | **Clean** — §1 |
| `SeamRejection` gone from **current docs** | **F-158, tier B** — §1.3 |
| All eight sites: same stage, checkpoint, precedence, lifecycle | **Clean, site by site** — §2 |
| The two `SETTLED_REJECTED` arms re-raise verbatim | **Clean**; free drag unpinned — **F-162** — §2.4 |
| No behavior constructs `DraggableError` | **Clean**; record overstates locality — **F-160** — §3 |
| Demotion to `DraggableWarning` still correct | **Clean, by construction** — §3.2 |
| Narrowed `BehaviorSpec` returns pinned at the packed consumer | **Clean, falsified** — §4 |
| F-151's free-drag retirement-order test discriminates | **Clean, falsified** — §5 |
| D-148 `invalidate()` documentation | **Clean — F-146 closed** — §6 |
| D-149/D-151 terminology, D-146/F-150 ledger | **Mostly clean** — **F-159, F-163** — §6 |
| `kernel.js` shrinks, and for the stated reason | **Clean, reproduces to the byte** — §7.1 |
| Composition premium from real commits | **F-157, tier A** — §7.2 |
| Module topology and budgets reproduce | **Clean** — §7.3 |
| Suite | 65 files, **1191 passed**, 116 skipped, **no type errors**; `typecheck` exit 0 |
| Lint | 3 errors in `tests/kernel/lifetimes.node.test.ts`, **pre-existing** — reproduced at `25084a9c` |

---

## 1. The type is deleted, not hidden

### 1.1 Runtime and published surface

`SeamRejection` appears in **no** `.ts` under [src/](../../../src/) and in **none** of the 32 emitted `.d.ts`. The three things that had to go with it did:

- the discriminant — `isRejection`, and with it the `'stage' in result` structural probe, which now occurs nowhere in `src/` at all;
- both `driver.requestFailure` adapters, replaced by bare forwarding at [kernel.ts:1295-1297](../../../src/kernel/kernel.ts#L1295-L1297) and [kernel.ts:1323-1329](../../../src/kernel/kernel.ts#L1323-L1329);
- the union arm on both published members — [spec.ts:355](../../../src/kernel/spec.ts#L355) and [spec.ts:346](../../../src/kernel/spec.ts#L346) — and the export from [kernel.ts:84](../../../src/kernel.ts#L84).

The single-declaration comment in [kernel/spec.ts](../../../src/kernel/spec.ts#L19-L23) was narrowed to `ActionTransition` alone rather than left naming a type that no longer exists, and the F-61 source-level assertion in [vocabulary.node.test.ts:225](../../../tests/kernel/vocabulary.node.test.ts#L225) was narrowed with it rather than deleted — correctly, since the hazard is a property of re-exporting across the two modules and `ActionTransition` still does it.

### 1.2 Tests and fixtures

Every remaining occurrence in `tests/` is accounted for:

| Site | Status |
| --- | --- |
| [consumer.node.test.ts:483](../../../tests/consumer.node.test.ts#L483) | The **negative pin**, retargeted from `drag.js` to `kernel.js` — the entry that actually published it |
| [vocabulary.node.test.ts:226](../../../tests/kernel/vocabulary.node.test.ts#L226) | Struck in place |
| [sortable.browser.test.ts:3030](../../../tests/sortable/sortable.browser.test.ts#L3030) | Struck in place |
| [COVERAGE.md:472](../../../tests/COVERAGE.md#L472) | Struck in place |
| [revision/phase-14.ts:246](../../../tests/revision/phase-14.ts#L246) | **Restated locally** as `RevisedSeamRejection`, with the reason written out: a fixture of a past surface keeps the surface |
| [probes/13c-free-drag.ts](../../../tests/probes/13c-free-drag.ts#L312) | **Migrated**, correctly — it types against live `src/` rather than restating |

The `phase-14.ts` / `13c` split is the right one and is argued in the file: `13c` imports `BehaviorSpec` from `src/`, so it must track; `phase-14.ts` restates a revision that compiled as one system, so it must not. Its comment also notes that only the _release_ half needed restating, which is true — neither settlement site there returns a rejection.

**The negative pin is discriminating.** I retargeted `A10` to `ResolutionCommand`, a name the entry does export, and the packed-consumer compile failed with `consumer.ts(397,1): error TS2578: Unused '@ts-expect-error' directive.` The module itself resolves — the same file imports 30-odd live names from `@ydinjs/drag2/kernel.js` at [line 613](../../../tests/consumer.node.test.ts#L613) — so the directive is satisfied by _no such exported member_ and not by an unresolved specifier.

### 1.3 Current documentation — **F-158, tier B**

This is the one half of the deletion that did not land. The commit made a substantial documentation pass — contract 02's seam table, its two SPI listings and its two ASCII traces, contract 05 §F-20, contract 06's two traces, the README export table, COVERAGE's three rows — and then left **eleven present-tense, unstruck references** behind, several of them in the normative tables a behavior author reads.

| Site | Text | Why it matters |
| --- | --- | --- |
| [02:440](../../../.plan/contract/02-kernel-behavior-contract.md#L440) | "A non-resolution or a rejected thenable returns a `SeamRejection`." | The seam-responsibility table — the row for `settlement.prepare`, the seam two of the eight sites are in |
| [02:1083](../../../.plan/contract/02-kernel-behavior-contract.md#L1083) | "Those paths return a `SeamRejection` at `FAILURE_RELEASE`." | The normative `invoke: null` rule. **Its source twin — `ResolutionCommand.invoke`'s JSDoc — was corrected in this very commit** |
| [02:1136-1137](../../../.plan/contract/02-kernel-behavior-contract.md#L1136-L1137) | `SeamRejection(FAILURE_RESOLUTION)` ×2 | The five-case settlement mapping table — literally the table the two `SETTLED_REJECTED` throws implement |
| [02:763](../../../.plan/contract/02-kernel-behavior-contract.md#L763) | "A behavior returns `Prepared \| null` or a `SeamRejection`" | The driver-vocabulary rationale |
| [05:588](../../../.plan/contract/05-lifecycle-invariants.md#L588) | "`settlement.prepare` returning a `SeamRejection` classifies at the **named stage**" | **Substantively wrong now**, not merely stale: nothing names a stage. Its COVERAGE twin _was_ rewritten in this commit |
| [05:602](../../../.plan/contract/05-lifecycle-invariants.md#L602) | "a pointerless `release.prepare` reaching a `null` insertion returns a `SeamRejection`" | Its COVERAGE twin _was_ rewritten in this commit |
| [05:662](../../../.plan/contract/05-lifecycle-invariants.md#L662) | "`ActionTransition` and `SeamRejection` resolve to **one declaration each** (F-61)" | Its COVERAGE twin _was_ struck in this commit |
| [06:461](../../../.plan/contract/06-vertical-sortable-trace.md#L461) | "If `release.prepare` throws, returns a `SeamRejection`, or reentrantly destroys" | Two lines from an ASCII block this commit did rewrite |
| [06:709](../../../.plan/contract/06-vertical-sortable-trace.md#L709), [06:750](../../../.plan/contract/06-vertical-sortable-trace.md#L750) | `SETTLED_REJECTED → SeamRejection(FAILURE_RESOLUTION)` ×2 | The consumer-facing outcome tables for the exact path `throw input.error` now takes |

**What makes this tier B rather than tier C is the pairing.** Five of the eleven have a sibling — a COVERAGE row, a JSDoc block, an adjacent ASCII trace — that this commit corrected. The pass was done by following the type's _name through the code_ and the _rows through COVERAGE_, and the contract prose that says the same thing in words was not swept. The result is a contract set that contradicts itself: contract 02 §189 says the type is deleted and both seams throw, and contract 02 §440 and §1136 say a rejection is returned.

One further site is ambiguous and I am not counting it: [02:742](../../../.plan/contract/02-kernel-behavior-contract.md#L742) lists `SeamRejection` among "thirteen shipped types", but that sentence is explicitly a Phase 22 census (_"this count was 33 until 2026-08-22"_) and reads as a taking rather than a claim about today.

---

## 2. The eight sites, one at a time

The claim under test is that a `throw` at each branch is the identical event to the deleted return. It decomposes into four questions, and all four hold.

### 2.1 The route is the same, and it is the same by construction

Old: the adapter called `driver.requestFailure(result.stage, result.error)` and returned `null`. `requestFailure` ([seams.ts:492-524](../../../src/kernel/seams.ts#L492-L524)) sets `failureRequested = true` and calls `context.fail(stage, error)`; `runPhase`'s tail is `return failureRequested ? FAILED : value`, so the adapter's `null` never became `SEAM_DISCARDED` — `runCore` saw `FAILED` and returned **`SEAM_PREPARE_FAILED`**.

New: `runPhase`'s `catch` sets `value = FAILED`, and since `stage !== UNCLASSIFIED` and `failureRequested` is false it calls `context.fail(stage, raised)` and returns `FAILED` — **`SEAM_PREPARE_FAILED`**.

Same function, same two arguments, same outcome constant. The one ordering difference — the old path called `context.fail` while `openStage` was still set, the new one calls it one statement after `openStage = NO_STAGE` — is inert: `failOperation` reads `queue.closed`, `operation`, `cancelRequest`, `reporting` and `current.phase` and none of them is a function of `openStage`, and nothing runs between the two points.

### 2.2 Every site's stage is its seam's stage

| # | Site | Deleted stage | Seam is run at |
| --- | --- | --- | --- |
| 1 | [sortable/spec.ts:1347](../../../src/sortable/spec.ts#L1347) `release-no-presentation` | `FAILURE_RELEASE` | `runReleaseSeam(driver, releaseTransition, FAILURE_RELEASE, …)` — [kernel.ts:2001](../../../src/kernel/kernel.ts#L2001) |
| 2 | [sortable/spec.ts:1373](../../../src/sortable/spec.ts#L1373) `release-no-destination` | `FAILURE_RELEASE` | ditto |
| 3 | [sortable/spec.ts:1415](../../../src/sortable/spec.ts#L1415) `release-no-insertion` | `FAILURE_RELEASE` | ditto |
| 4 | [sortable/spec.ts:1428](../../../src/sortable/spec.ts#L1428) `release-no-proposal` | `FAILURE_RELEASE` | ditto |
| 5 | [free-drag/spec.ts:616](../../../src/free-drag/spec.ts#L616) `release-no-visual` | `FAILURE_RELEASE` | ditto |
| 6 | [free-drag/spec.ts:707](../../../src/free-drag/spec.ts#L707) `settled-skipped` | `FAILURE_RESOLUTION` | `openSettlement` — [kernel.ts:1791-1794](../../../src/kernel/kernel.ts#L1791-L1794) |
| 7 | [sortable/spec.ts:1575](../../../src/sortable/spec.ts#L1575) `SETTLED_REJECTED` | `FAILURE_RESOLUTION` | ditto |
| 8 | [free-drag/spec.ts:753](../../../src/free-drag/spec.ts#L753) `SETTLED_REJECTED` | `FAILURE_RESOLUTION` | ditto |

**Sites 6–8 needed a reachability check and pass it.** The settlement seam is run at three call sites, and one of them — the `REPORTING` re-entry at [kernel.ts:2280-2284](../../../src/kernel/kernel.ts#L2280-L2284) — passes `checkpoint.stage` rather than `FAILURE_RESOLUTION`. Had any of the three arms been reachable from it, a throw would classify at a _different_ stage than the return did. It is not: that path builds `settlementInput` with `type: SETTLED_FAILED` at [kernel.ts:2235](../../../src/kernel/kernel.ts#L2235), and `SETTLED_SKIPPED` and `SETTLED_REJECTED` are constructed only by `settleResolution` ([kernel.ts:1855](../../../src/kernel/kernel.ts#L1855), [1875](../../../src/kernel/kernel.ts#L1875), [1896](../../../src/kernel/kernel.ts#L1896), [1902](../../../src/kernel/kernel.ts#L1902)), which reaches `openSettlement` alone.

### 2.3 Nothing swallows the throw, and nothing runs that did not run before

None of the eight throws is inside a `try`. In [sortable/spec.ts](../../../src/sortable/spec.ts) the enclosing `try` blocks are at 156/538/564/614/938/1024/1226, all closing before `release:` opens at 1340 and `settlement:` at 1508; in [free-drag/spec.ts](../../../src/free-drag/spec.ts) they are at 120 and 381, both closing before `release:` at 605. A `return` and a `throw` therefore have identical successor sets at every one of the eight branches.

### 2.4 The two `SETTLED_REJECTED` arms re-raise verbatim

Both are a bare `throw input.error` with no construction and no wrapper, and the comment above each says so. `input.error` reaches `context.fail` as `raised` unchanged, is carried into the checkpoint unchanged, and becomes the `cause` of the one `DraggableError` the kernel mints. A non-`Error` rejection value — a string, `undefined` — travels exactly as it did through the record form.

The sortable's half is **pinned by identity**: [sortable.browser.test.ts:1643](../../../tests/sortable/sortable.browser.test.ts#L1643) asserts `(errors[0].error as DraggableError).cause).toBe(error)` for a rejected `onReorder` at `FAILURE_RESOLUTION`. Free drag's is not — see **F-162**, §8.

---

## 3. Classification and minting stay with the kernel

### 3.1 No behavior mints — **and the record overstates where the kernel does**

`new DraggableError` occurs at exactly three sites, all in [kernel/kernel.ts](../../../src/kernel/kernel.ts), none in a behavior; `src/sortable/` and `src/free-drag/` import the class **type-only**, for `SortableOnDragError` / `FreeDragOnDragError`. The narrow claim — a behavior raises a cause and never mints — holds.

The in-source comment at [kernel.ts:2238-2255](../../../src/kernel/kernel.ts#L2238-L2255) is precise: _"here is the only place one is built **for an operation**"_. The record generalized it and lost the qualifier — **F-160**, §8.

### 3.2 Demotion still works, and the throw path cannot reach it differently

Both demotions sit **above** the mint, so a fault that loses its classification never reaches a `DraggableError` at all:

- the pre-queue refusal at [kernel.ts:772-785](../../../src/kernel/kernel.ts#L772-L785) — closed queue, no operation, held cancel, in-flight report — notifies `drag: failure/not-classified` and returns before dispatching the checkpoint;
- the cancel-precedence and staleness refusals at [kernel.ts:2195](../../../src/kernel/kernel.ts#L2195) and [kernel.ts:2222](../../../src/kernel/kernel.ts#L2222) notify `failure/superseded-by-cancel` and `failure/checkpoint-stale` and return before line 2254.

All three carry the raised cause as the warning's `cause`, so a demoted fault still transports the behavior's value verbatim. Since §2.1 establishes that the throw path enters `failOperation` with the same `(stage, error)` at the same moment the return path did, precedence is untouched by construction rather than by inspection of each branch.

**One improvement, not a regression, is worth recording.** A `prepare` that calls `host.fail(…)` and _then_ fails now takes `runPhase`'s `failed-then-threw` arm — one classification and one warning. The deleted shape allowed `host.fail(…)` followed by `return rejection`, which called `context.fail` twice for one phase.

### 3.3 The surviving transport is load-bearing

The record's _"`host.fail` remains for the case that needs a different stage"_ is not decorative. All four `host.fail` call sites in the behaviors — [sortable/spec.ts:542](../../../src/sortable/spec.ts#L542), [575](../../../src/sortable/spec.ts#L575), [1027](../../../src/sortable/spec.ts#L1027), [1041](../../../src/sortable/spec.ts#L1041) — name `FAILURE_INVALIDATION` or `FAILURE_SCHEDULED_FRAME` from inside an action seam running at a _different_ stage. Not one is a rejection in disguise.

### 3.4 The eight-versus-six discrepancy is an enumeration miss and nothing else

The record's own account is right about the cause: the helper-based grep missed two sites that built the shape as a bare literal. I looked for the residual class **by shape rather than by name** and found none:

- no object literal with a `stage` member is returned anywhere in `src/` outside the kernel's own `FailureCheckpoint` / `SettlementInput` construction and the two behaviors' `pendingFailure`;
- `'stage' in` / `"stage" in` occurs in `src/` **zero** times, and in `tests/` once, in [errors.node.test.ts:119](../../../tests/kernel/errors.node.test.ts#L119) asserting a `DraggableWarning` has none;
- both `rejection(...)` helpers are gone with their two `FAILURE_*` imports.

The class is closed.

---

## 4. The narrowed returns are pinned where a consumer would feel them

[consumer.node.test.ts](../../../tests/consumer.node.test.ts) is the only suite that builds, packs, extracts and compiles against the real tarball from outside the workspace. Its out-of-line kernel-tier behavior now writes both seams in the throw form — `prepare: (draft): ResolutionCommand => { … throw new Error('no subject'); }` at [line 718](../../../tests/consumer.node.test.ts#L718) and `throw input.error` at [line 726](../../../tests/consumer.node.test.ts#L726) — against `ReleaseTransition` / `SettlementTransition` imported from the **extracted** `kernel.js`. Out-of-line is load-bearing here for the reason D-68 already gives, and it means the narrowed declarations are what the fixture compiles against rather than a contextually-typed literal that would pass either way. Suite runs and passes standalone: 1 file, 11 tests, no type errors.

The commit also added two rows pinning the previously-unnamed `SortableComposition` / `FreeDragComposition` at [line 185](../../../tests/consumer.node.test.ts#L185) and [line 1039](../../../tests/consumer.node.test.ts#L1039), which closes the publication half of my own F-147.

---

## 5. F-151's replacement genuinely discriminates

[lifecycle.browser.test.ts:247](../../../tests/free-drag/lifecycle.browser.test.ts#L247) drives a real composition through `activate` + `controller.cancel('reason')` and expects `['plugin-2', 'plugin-1', 'bounds-installer', 'bounds-constraint']`.

**It is not a palindrome and it is not one position.** The ledger is built in installation order as `[bounds-constraint, bounds-installer, plugin-1, plugin-2]` — `constrain.retire` before `bounds.retire` at [assemble.ts:71](../../../src/free-drag/assemble.ts#L71) and [:75](../../../src/free-drag/assemble.ts#L75), named keys before `plugins` by schema order, plugins in array order across two fragments — so forward and reverse are distinct four-element sequences and the expectation spans three of the four ledger positions.

**Falsified.** I inverted the loop at [free-drag/spec.ts:989](../../../src/free-drag/spec.ts#L989) to `for (let i = 0; i < …; i += 1)`; the suite went to `1 failed | 17 passed` and **that row was the only failure**, which also confirms it is the sole witness rather than a duplicate of one that already existed. Reverted.

---

## 6. The documentation fallout from the previous review

| Closure | Result |
| --- | --- |
| **F-146** — `invalidate()` implies live axis re-reading | **Closed, correctly.** [free-drag/controller.d.ts:4-18](../../../free-drag/controller.d.ts#L4-L18) now says _"The **bounds source** may have changed"_, adds an explicit _"`axis` is not re-read, because it is not a source"_ paragraph with the reason, and covers the no-`bounds` composition as a queued no-op. The module header was narrowed with it. `AxisSource` appears nowhere in `src/`, and no other published site implies a live axis |
| **F-149** — the D-146 ledger row's disproved figures | **Closed in place.** [00-index.md:482](../../../.plan/contract/00-index.md#L482) now carries ~~−0.05 to −0.07 kB~~ and ~~from 283 B~~ struck, with F-136 cited and the reason given |
| **F-150** — the premium did not reproduce | **Corrected, and the bookkeeping is now honest about its own history**: [bundle-structure.md:179-187](../../../.plan/bundle-structure.md#L179-L187) restates 147 B at `cdc83990` and 131 B at `25084a9c` with both prior figures struck, and adds _"The series below quotes takings at commits that exist."_ The 113 B row is measured the same way. **The arithmetic reproduces exactly; the baseline it is taken against does not — F-157, §7.2** |
| **F-148** — stale `SortableContribution` / `SortableRuntime` | **Mostly closed.** [plan.md:1585](../../../.plan/plan.md#L1585), contract 03 §2, §1224, §1350 and §1396, and the [m2 perf header](../../../tests/perf/m2.browser.test.ts#L11) are all fixed or struck. Two of the same class remain — **F-163**, §8 |
| **F-147** — the composition aliases were unpinned | **Closed** — §4 |

**A gap the closure left**: the six findings this pass claims to close are not in the ledger. See **F-159**, §8.

---

## 7. Size

### 7.1 `kernel.js` moves, and the attribution is right

This is the qualitative claim the pass rests on, and it holds to the byte. Measured through the instrument's own `measureAll`, at `dc2a1d4c` against `25084a9c` built in a clean worktree:

| Row | `25084a9c` min/br | `dc2a1d4c` min/br | Δ min |
| --- | --- | --- | --- |
| `kernel root - kernel.js` | 17,017 / 6,116 | **16,865 / 6,071** | **−152** (br −45) |
| `vocabulary root - drag.js` | 344 / 159 | 344 / 159 | 0 |
| `baseline B` | 22,573 / 6,889 | 22,573 / 6,889 | 0 |
| `both behaviors` | 37,299 / 11,996 | 37,034 / 11,930 | −265 |

`kernel.js` −152 B minified / −45 B brotli reproduces exactly, and this **is** the first row in the series where it moves — it was 17,017 at both `cdc83990` and `25084a9c`. The attribution is correct on inspection as well as on arithmetic: `isRejection` and the two adapters were bodies in `kernel/kernel.ts`, and the type was erased, so a kernel-only shrink is precisely what deleting them predicts. The two controls that should not move do not.

Per-row brotli deltas (−57 to −82) reproduce as stated. Per-row minified deltas are −207 or −208 for eight of the nine composition rows and **−209 for `free drag complete`** — **F-161**, §8.

### 7.2 The composition premium — **F-157, tier A**

The recorded 113 B reproduces: `complete` 10,603 − `baseline A` 10,490 = 113 B, 1.07 %. So does 131 B at `25084a9c` and 147 B at `cdc83990`.

**They reproduce against a baseline that is broken.** [bench/size/noncomposed.js:26](../../../bench/size/noncomposed.js#L26) still imports `createSortableRuntime` from `../../sortable/runtime.js` and [line 109](../../../bench/size/noncomposed.js#L109) still calls it, passing its result to a one-argument `createSortableSpec(rt)` at [line 112](../../../bench/size/noncomposed.js#L112). **D-149 deleted that function and that signature** — `createSortableSpec` has taken `(host, initialSource, items, slots)` since `cdc83990`.

**Witness.** A fresh `git worktree` at `25084a9c` fails the build outright:

```
[UNRESOLVED_IMPORT] Could not resolve '../../sortable/runtime.js' in bench/size/noncomposed.js
    at measure (bench/size/measure.ts:1471)
```

It succeeds in this working tree only because an **untracked, unregenerated** `sortable/runtime.js` dated `Aug 28 02:24` — before `cdc83990`, and still exporting `createSortableRuntime` — survives from an older build that nothing cleans. `npx just size` therefore does not run on a clean checkout of any commit from `cdc83990` onward, which is a live problem for a package whose Phase 24 deliverable is _"a size budget that fails CI"_.

**Consequence for the figures.** Baseline A bundles a module the library no longer has, so it is inflated and every premium since `cdc83990` is understated. Repairing the fixture — dropping the dead import and calling `createSortableSpec(host, items, [...items], slots)`, which is what the composed side does — and re-measuring at three commits:

| Commit | Recorded premium | Baseline A modules | **Corrected premium** |
| --- | --- | --- | --- |
| `4568e563` (D-146) | 221 B | 30, all live | 221 B — sound; the fixture was still correct here |
| `cdc83990` (D-149) | 147 B | **30, one dead** | **222 B** (10,686 − 10,464) |
| `25084a9c` (`install` inline) | 131 B | **30, one dead** | **206 B** (10,670 − 10,464) |
| `dc2a1d4c` (D-152) | **113 B, 1.07 %** | **30, one dead** | **208 B, 1.96 %** (10,603 − 10,395) |

Three things follow, and each is a claim the record currently makes:

1. **"131 B → 113 B"** is not what happened. The corrected premium **rises 2 B**. Composed `complete` fell 67 B brotli and a correct baseline A falls 69 B — D-152 helps the hand-composed build very slightly _more_ than the composed one, which is the honest shape of a change entirely inside the kernel.
2. **"Baseline A falls −209 B with the rows, since it hand-composes the same spec modules"** inverts the actual mechanism. The corrected baseline falls further than the recorded one; the recorded one lagged because it retained a module the composed rows had already lost.
3. **The whole descending series** — _"221 B (D-146) → 147 B (D-147…D-151) → 131 B (the `install` inline) → 113 B (D-152)"_, quoted again in [bundle-structure.md:201](../../../.plan/bundle-structure.md#L201) as the answer to contract 03's standing question — is largely a baseline artifact. Corrected, the premium is **flat at 206–222 B** since D-146: 221 → 222 → 206 → 208. The one real movement is the `install()` inline's −16 B.

This finding is not `dc2a1d4c`'s to have caused — the fixture went stale at `cdc83990` — but this commit re-measures against it, states a new headline from it, and **my own previous review reproduced 147 B without catching it**, which is exactly why it is worth stating plainly rather than as a footnote.

The guard the fixture's own header names does not cover this: [size.node.test.ts:220](../../../tests/bench/size.node.test.ts#L220) imports `buildSlots` and compares slot key sets. `mount()` — the half that drifted — is never called by any test, so a fixture that would throw a `TypeError` on its first line still bundles and still reports a number.

### 7.3 Topology and budgets

Both reproduce. `both behaviors graph: 44 modules against a complete + free drag complete union of 44` — exactly as recorded — and all fourteen rows are under budget (0.05–0.63 kB of headroom). Composed `complete` is 34 modules and holds no `*/runtime.js`; the free-drag rows hold neither `free-drag/runtime.js` nor `free-drag/slots.js`, as D-149 predicted. The only graph containing a dead module is baseline A's.

---

## 8. Findings

- **F-157** (tier A) — _The composition-premium denominator has been a stale fixture since D-149, and the pass's headline figure does not survive repair._ [bench/size/noncomposed.js:26,109-112](../../../bench/size/noncomposed.js#L26) calls `createSortableRuntime` and the one-argument `createSortableSpec`, both deleted by D-149; the instrument builds only because an untracked pre-`cdc83990` `sortable/runtime.js` survives in this tree, and fails with `UNRESOLVED_IMPORT` in a clean worktree at any commit from `cdc83990` on. Repaired, the premium is **208 B / 1.96 %**, not 113 B / 1.07 %, and D-152 moves it **+2 B** rather than −18 B; the recorded descending series 221 → 147 → 131 → 113 is flat at 221 → 222 → 206 → 208. The fixture's stated guard checks `buildSlots` only and never calls the half that drifted. §7.2.
- **F-158** (tier B) — _`SeamRejection` is deleted from the code and alive in the contract set._ Eleven present-tense, unstruck references remain across contracts 02, 05 and 06 — including the settlement seam-responsibility row, the five-case settlement mapping table, the normative `invoke: null` rule and two consumer-facing outcome tables — while five of them have a sibling this same commit corrected. [05:588](../../../.plan/contract/05-lifecycle-invariants.md#L588) is substantively false, not merely stale: it says the classification is _"at the named stage"_ and nothing names one. §1.3.
- **F-159** (tier C) — _Six findings are declared closed against a table that never opened them._ [plan.md:2010](../../../.plan/plan.md#L2010) heads the section _"D-152; F-146…F-156 closed"_, and 00-index's findings table runs [F-145](../../../.plan/contract/00-index.md#L708) straight to [F-152](../../../.plan/contract/00-index.md#L710) with no rows for F-146…F-151. Their remediation — which this commit largely performed, §6 — is unrecorded where the ledger keeps such things, and [plan.md:1997](../../../.plan/plan.md#L1997) cites "(F-146)" for the inlined-alias deviation, which is not what F-146 was.
- **F-160** (tier C) — _A locality claim the record states more strongly than the source does._ [00-index.md:494](../../../.plan/contract/00-index.md#L494) and [plan.md](../../../.plan/plan.md#L2008) say _"the kernel mints the `DraggableError`, at `handleFailed` and nowhere else."_ Two other sites mint: [kernel.ts:701](../../../src/kernel/kernel.ts#L701) (panic, `stage: null`) and [kernel.ts:916](../../../src/kernel/kernel.ts#L916) (`FAILURE_ADMISSION`, from a throwing behavior `admit`). The second is a counterexample to the sentence _as written about behaviors_. The in-source comment gets it right — _"the only place one is built **for an operation**"_ — so the fix is to the record, and the ownership rule itself is untouched. §3.1.
- **F-161** (tier C) — _A stated range excludes one of its own rows._ [bundle-structure.md:183](../../../.plan/bundle-structure.md#L183) and [plan.md:2019](../../../.plan/plan.md#L2019) say _"Every composition row falls −207 to −208 B minified"_; `free drag complete` falls **−209** (23,518 → 23,309). The other eight rows are in range. §7.1.
- **F-162** (tier C) — _Free drag's verbatim re-raise has no witness._ The sortable's `SETTLED_REJECTED` arm is pinned by identity at [sortable.browser.test.ts:1643](../../../tests/sortable/sortable.browser.test.ts#L1643); free drag's only `FAILURE_RESOLUTION` row, [validation.browser.test.ts:261](../../../tests/free-drag/validation.browser.test.ts#L261), asserts the stage alone and never touches `cause`. Replacing `throw input.error` with `throw new Error('x')` at [free-drag/spec.ts:753](../../../src/free-drag/spec.ts#L753) leaves the suite green. This is F-151's asymmetry again, in the pass that closed F-151. §2.4.
- **F-163** (tier C) — _Two `SortableContribution` sites of the class this commit swept, and one `SortableRuntime`._ [03:9](../../../.plan/contract/03-feature-composition.md#L9) — _"adding one still requires coordinated edits to the schema, `SortableContribution`, `SortableSlots`, `assemble`…"_ — is the same sentence pattern as [03:2](../../../.plan/contract/03-feature-composition.md#L2), which **was** rewritten here; [03:135](../../../.plan/contract/03-feature-composition.md#L135) describes today's contextual typing in the present tense using the deleted name; [COVERAGE.md:589](../../../tests/COVERAGE.md#L589) still says _"The latch moved … to `SortableRuntime.closed`."_ §6.

**Not findings, recorded so the reasoning is visible.** The `phase-14.ts` local restatement is correct and argued. The three `oxlint` errors in `tests/kernel/lifetimes.node.test.ts` reproduce at `25084a9c` and are not this commit's. Five of the eight identity slugs (`release-no-presentation`, `release-no-insertion`, `release-no-proposal`, `release-no-visual`, `settled-skipped`) are asserted by no test; only `release-no-destination` is, at [sortable.browser.test.ts:3036](../../../tests/sortable/sortable.browser.test.ts#L3036). D-152's amendment defends the slugs on field-diagnostic grounds rather than test grounds, so this is an observation about how much a rename would cost, not a defect.

---

## 9. What would falsify this

- **§2's equivalence** — show a settlement `prepare` throw reachable from the `REPORTING` re-entry at [kernel.ts:2280](../../../src/kernel/kernel.ts#L2280), or a `SETTLED_SKIPPED` / `SETTLED_REJECTED` input constructed anywhere but `settleResolution`. Either makes one of the eight sites classify at a stage the deleted return did not name.
- **§3.2's demotion claim** — find a path where `context.fail` is reached with `openStage` still open _and_ a demotion predicate that depends on it. I claim there is none; the predicate list at [kernel.ts:772-779](../../../src/kernel/kernel.ts#L772-L779) is the whole of it.
- **F-157** — `git worktree add` at `dc2a1d4c`, `npx just build`, then `node bench/size/measure.ts`. If it completes without an `UNRESOLVED_IMPORT`, I am wrong about the fixture. If it completes only after `sortable/runtime.js` is copied in from a stale tree, I am right. The corrected numbers are reproducible with a two-line edit to [noncomposed.js](../../../bench/size/noncomposed.js#L109) and nothing else.
- **F-162** — replace `throw input.error` with a fresh `Error` at [free-drag/spec.ts:753](../../../src/free-drag/spec.ts#L753). A green suite confirms the gap.
- **F-158** — the eleven sites are line-cited; each is either present-tense and unstruck or it is not.