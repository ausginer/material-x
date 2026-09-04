# D-170 Stage 0 remediation and the Q-22 adjudication — feature proof

**Read at** `813ccb7c` (tip), over `d9db62ac` (Stage 0 remediation) and `813ccb7c` (Q-22 / D-178). Baselines used for comparison: `261a3a16` (pre-rename), `12311981` (step 5), `d9db62ac^`.

**Scope.** The repaired lifecycle guarantees and their witnesses; the completeness and correctness of the F-324 declared-slot census; the mechanical repairs claimed for F-313, F-314, F-315, F-319, F-320, F-321 and F-322; and the record edits the two commits make. F-327 is treated as a known open finding and was checked only for accuracy against `kernel.ts:809-819`. Stage 1 and the C1–C5 arcs were not entered. The stale `.claude/worktrees/agent-a4d0ec4ad722d3a16` checkout and the other detached worktrees are pre-existing context; every probe in this pass ran in a throwaway worktree at `813ccb7c`, since removed, and the tracked tree is clean.

## What holds

**The three repaired barriers are load-bearing, and each is pinned by exactly one discriminating row.** Mutation probes at `813ccb7c`, one at a time, whole-file suite for the affected test file:

| Mutation | Rows that turn red |
| --- | --- |
| `spec.ts:1289` `if (stale && !this.#kernel.closed)` → `if (stale)` | 1 — `activation-barrier` _should not invalidate the axis once the committed move destroyed the controller_ (`afterClose` 1, expected 0) |
| `rect-index.ts:365-369` settle barrier removed | 1 — `y` _should invoke no settle once the last candidate closed the controller_ |
| `linear-shift.ts:355-358` settle barrier removed | 1 — `y` _should invoke no settle from a committed move once the probe read closed the controller_ |

Each negative row has a positive control beside it that survives the mutation, so none of the three passes by never letting the slot run. The suite is green unmutated: 66 files, 1265 passed, 60 skipped, no type errors.

**The structural claims behind the `finally` repair check out.** `InsertionContribution.retire` is required (`feature.ts:149`) and `sortable/assemble.ts:76-78` pushes it unconditionally whenever `axis.insertion` exists, so _the assembler pushes the axis's own `retire` into `retireHooks`_ is true rather than assumed. Both `RectIndex.refresh` exits that return `false` (`:326`, `:368`) run `this.retire()` first, which is what makes F-322's removal of `index.retire()` from `LinearShift`'s stop arm unreachable-by-contract rather than merely tidy; `LinearShift.retire()` is untouched, as the entry says. Both other `refresh` callers (`xy.ts:202`, `:334`) already handle a `false` return, so the second exit adds no unhandled path.

**The mechanical repairs match their entries.** F-313: `grep -rn '\bhost\b' src/` returns nothing; `host.fail`/`host.cancel`/`host.closed` occur nowhere in the package; `tests/COVERAGE.md` is clean; the shipped `kernel.d.ts:13` reads _called with the kernel_. F-314: the D-33 block names `n10`/`n11` and no longer states a deleted surface as shipped; neither `presentationCommitted` nor `ready(` occurs in `src/`. F-315: the four named sites and the two adjacent `05` sites read `BehaviorContext`; every surviving `KernelHost` is a dated decision entry, a probe fixture or a struck-through token. F-319: zero occurrences of `this.#` remain inside any comment anywhere in `src/`, not only in the two files (but see `s0-2`). F-320: one merged block on `#movedLeaf` carrying both the hoisting and the receiver argument. F-321: the garbled copy is gone, `#snapshot` intact. Prettier reports all five changed sources already formatted.

**Two census classifications I tried to break and could not.** The group-2 scroll/resize sites (`sortable/spec.ts:915`, `free-drag/spec.ts:438`) survive: physical teardown defers to the transaction boundary, which is reached inside the same synchronous drain, so no native listener task can interleave between logical closure and listener release. `landingTiming` at `sortable/spec.ts:1818` / `free-drag/spec.ts:1013` survives: `kernel.ts:1736` reads `#joinLive()` and only pure arithmetic separates it from the `landingTail` call at `:1752`.

## Findings

### s0-1 — `onEnd` is invoked after logical closure on the `ERROR_REPORTED` route, and the census classifies the site as guarded · **Tier A**

**Finding.** F-324 places both `onEnd` invocations in _sites where the reading is the kernel's, immediately before the call_, justified as _reached through `finalized`, guarded by `#joinLive()` on the statement before_. There are **two** kernel call sites of `spec.finalized`. That justification is true of `kernel.ts:1860`, which `#joinLive()` at `:1855` guards. It is false of `kernel.ts:2473`, inside `#handleErrorReported`, which the census does not list: that call is preceded by `this.#unwind(this.#operation.lifetimes.presentation.dispose)` at `:2467` — a consumer-reachable step the kernel's own comment at `:1732-1735` names as one that _may already_ have closed the controller — with no latch reading between them.

**Current behavior.** On the classified-failure route a consumer-reachable presentation disposer can close the controller, after which the kernel calls `spec.finalized`, whose entire body is `this.#slots.onEnd?.(domain)` in both behaviors (`sortable/spec.ts:1836-1842`, `free-drag/spec.ts:1025-1031`). Neither behavior reads a latch there, correctly: the census's own account is that the reading is the kernel's.

**Why it is a problem.** `onEnd` is an invocable member of a published config key, so it is a declared consumer slot under D-176; invoking it after logical closure is D-37 act (a), which D-176 re-tiered to **A** precisely because it runs the consumer's own function body after the consumer destroyed the controller. It is not covered by the D-178 exception: the library's own next step is conditioned on the call having happened — `ERROR_REPORTED` pays a terminal behind it, which is the argument D-178 uses to refuse a per-slot exemption for this very slot.

**Evidence / reproduction.** Composed witness through the public `sortable()` surface, in a throwaway worktree at `813ccb7c`: three items, a custom-element placeholder whose `disconnectedCallback` calls `controller.destroy()`, and an axis whose `resolve` throws once release begins (`FAILURE_RELEASE`). Observed order:

```
onError:probe/resolve-failed
disconnect:destroy
disconnect:destroyed        <- controller.destroy() has returned
onEnd:closed=true           <- the declared slot runs after logical closure
```

Localized by mutation rather than by reading: wrapping `kernel.ts:2470-2473` in `if (this.#joinLive())` makes the last line disappear and leaves the first three unchanged. An independent kernel-harness probe reproduces the same shape with a throwing `release.prepare` and a `scope.presentation.use` disposer that destroys — `dispose:closed=false`, `dispose-end:closed=true`, `finalized:closed=true`. _(The added guard was a probe to identify the site, not a proposed repair.)_

**Required property.** The census accounts for every kernel route to a declared slot, not only the one route per slot it examined; and `onEnd` is not invoked after logical closure on any of them. Which mechanism supplies that on the reporting route is a contract question — the phase-exclusion at `:2459` and the `#joinLive()` reading are not interchangeable — and is the architect's, not the implementer's.

### s0-2 — A published warning message still carries the step-5 rename corruption · **Tier A**

**Finding.** `free-drag/spec.ts:441` constructs `new DraggableWarning('drag: constraint/this.#invalidate-failed', …)`. At `261a3a16` the same literal read `'drag: constraint/invalidate-failed'` (`:379`). This is F-319's corruption — the mechanical substitution of `this.#invalidate` for the plain word — surviving in a string rather than in a comment.

**Why it is a problem.** F-319's repair census is stated as _diffing every comment line of both files against `261a3a16`_, so the class was swept in comments and nowhere else. The message is a published value: it reaches a correctly integrated consumer as `error.message` on `onError` whenever a third-party constraint's `invalidate()` throws from a scroll or resize listener. Nothing pins it — no test, no `COVERAGE.md` row, no contract row cites the message — which is why three passes over these files did not surface it.

**Evidence.** Extracting every string literal of length ≥ 3 from all seven files `12311981` touched and diffing the sets against `261a3a16` yields exactly one substantive difference, this one. `grep -rn "this\.#" src/` restricted to string literals returns this single line.

**Required property.** The step-5 rename's corruption is swept over the whole text of the files it touched, not only their comments; and a diagnostic message names the member it reports on.

### s0-3 — The census's stated totals cannot be reconciled with its own enumeration · **Tier B**

**Finding.** F-324 opens _Twenty-three invocation sites across both behaviors, and every one is accounted for below rather than sampled_, then enumerates three groups closing with _Twelve_, _Ten_ and _Six_. The first group lists **eleven** sites, not twelve: `visual` ×2, `box`, `onStart` ×2, `movedInsertion`, `onMove`, `home`, `settle` ×2, `invalidateInsertion`. The three groups therefore enumerate 11 + 10 + 6 = **27** sites, plus the two `retireHooks` walks named separately. No reading of the scope reconciles 23, 12 and 27 — restricting the header's _across both behaviors_ to the two `spec.ts` files gives 24, not 23.

**Why it is a problem.** This entry exists because the number I-36 quoted was measured under a superseded test, and its claim on the reader is that the new count is mechanical over a static candidate set. Three mutually inconsistent totals inside that claim make the next pass unable to tell a recount from a re-derivation, which is the failure mode the entry was raised to end.

**Required property.** The census's stated totals agree with the sites it lists, or it states a count only where it lists what the count ranges over.

### s0-4 — Six of the census's citations name lines the same commit moved · **Tier B**

**Finding.** Every `sortable/spec.ts` citation _after_ the eleven-line block the F-324 repair inserted at `:1278` is short by exactly eleven:

| Cited  | Actual at `813ccb7c` | Site                                   |
| ------ | -------------------- | -------------------------------------- |
| `1279` | `1290`               | `invalidateInsertion` in the `finally` |
| `1396` | `1407`               | `resolveInsertion`                     |
| `1445` | `1456`               | `onReorder`                            |
| `1807` | `1818`               | `landingTiming`                        |
| `1829` | `1840`               | `onEnd`                                |
| `1861` | `1872`               | the `retireHooks` walk                 |

**Why it is a problem.** Every citation _before_ the insertion point (`449`, `512`, `547`, `915`, `986`, `1057`, `1081`, `1270`) resolves exactly, as do all twelve `free-drag/spec.ts` citations and those in `rect-index.ts`, `linear-shift.ts` and `placement.ts` — so the convention is current-tree lines and these six are simply stale. `1279` lands on the middle of the comment the repair added; `1445` and `1807` land on blank and signature lines. The census was written against the file before its own repair and not re-taken against the committed tree.

**Required property.** Site citations resolve in the tree the entry is committed with.

### s0-5 — `report` is in the census's own candidate set and appears in none of its groups · **Tier B**

**Finding.** The census defines its candidate set as _every invocable member of `SortableSlots` and `FreeDragSlots`, the two `MotionConstraint` members, and each `retireHooks` entry_. `SortableSlots.report` is an invocable member, filled from the published `SortableDisplacementInstaller` — the same argument the census uses to admit `settle`. It is invoked at `sortable/xy.ts:362` and `sortable/linear-shift.ts:455`. Neither site appears among the sites where a reading is owed, the sites where nothing is owed, or the sites the kernel guards.

**Why it is a problem.** The answer exists — D-176's amendment to I-36 names a second admissible discharge, _the slot's declared type threads the latch and its contract obliges a reading at its own head_, and names `DisplacementReport` as taking it; `layout-animation.ts:128-134` reads `live()` at its head, and `slots.ts:35-39` states the obligation. But the census's three groups are all instances of the _first_ discharge or of nothing being owed, and it drops the second category silently. A reader checking the census against the candidate set it declares finds two invocations of a consumer-fillable slot unaccounted for and cannot tell whether they were considered and classified or missed — which is the question the entry was raised to answer, and is what makes _every one is accounted for below rather than sampled_ an overclaim. The same shape at lesser weight: `retireHooks` entries are invoked at four sites, not two — the two teardown walks the census names, and the construction-unwind walks at `sortable/assemble.ts:185` and `free-drag/assemble.ts:145`, which are outside act (a) because no closure has happened, and which go unmentioned. _(`MotionConstraint.retire` is a third member of that type but not a third site: `free-drag/assemble.ts:68` pushes it into `retireHooks`, and `free-drag/spec.ts:119-121` says so.)_

**Required property.** A census claiming completeness over a declared candidate set accounts for every member of it, including the members whose obligation is discharged by the callee.

### s0-6 — D-178's amendment is dated before the D-176 amendment it supersedes, and they disagree on the maintained list · **Tier B**

**Finding.** In `05-lifecycle-invariants.md`'s I-36 block, two amendment paragraphs sit in commit order. The first reads _Amended by D-176, **2026-09-08**_ and states _The current members are the two `retireHooks` walks_. The second, immediately below, reads _Amended by D-178, **2026-09-04**_ and states _The current members gain one_. Both were authored on 2026-09-04, twenty-five minutes apart: `d9db62ac` dates all eleven of its record edits 2026-09-08 (continuing the arc's convention from `2f381eaa`), while `813ccb7c` dates its eight 2026-09-04. F-324's own entry has the same inversion internally — _Re-taken 2026-09-08_ around an _Answered 2026-09-04 by D-178_ that withdraws half of it.

**Why it is a problem.** Dated entries are how this record carries provenance and supersession, and by their own dates the amendments apply in the wrong order: a reader resolving the disagreement by date concludes the two-walk list is authoritative and the diagnosis species was dropped. This is load-bearing rather than editorial, because F-327's required property is that _a count of the exception's members belongs where the members are enumerated and can be maintained_ — this entry is that place, and it currently states two counts with the later-dated one being the superseded one.

**Required property.** Amendment dates order the amendments as they actually apply, so a disagreement between two amendments to the same clause resolves in favour of the one that supersedes.

### s0-7 — A live test name still calls the kernel a host · **Tier C**

`tests/kernel/kernel.browser.test.ts:424` reads `it('should hand the behavior a host whose root is the ingress boundary', …)` over a body that asserts `harness.kernel.root`. F-313's fifth place is scoped to _a member called `host.fail`, `host.cancel` or `host.closed`_, and this names the entity rather than a member, so it is outside the census as written — but it is the same retired vocabulary, in a file that pass edited, which is the finding's own stated systemic cause. `tests/revision/phase-14.ts:192` uses _the host member_ in the same way, there describing a surface D-41 deleted, which reads as provenance. No source or shipped artifact is affected.

## Null results

- No regression was found in the three repaired barriers, in the six mechanical repairs, or in the D-178 record edits taken on their own terms. The D-178 predicate's four clauses, the refusal of the per-slot exemption, and the `corpus-equivalence.ts` registration of `Q-22`, `D-178` and `F-327` are all consistent with the tree.
- F-327 is accurately open: `kernel.ts:812-819` still reads _a named exception, and the only one there is_ and closes with _Nothing else may run after logical closure_. Neither commit touched it.
- No stale claim about the census survives in an authoritative position; the superseded _four are irreducible_ wording appears only struck through or as history.