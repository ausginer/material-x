# Arc B recovery — decision elimination review

**Commit read at:** `8c1b20042`. Verified before reading any source: `git diff 8c1b20042 HEAD` over `packages/drag2/{src,tests,bench}` is empty, `git status --porcelain` over those three paths is empty, and `packages/drag2/src` resolves to tree `cc11493373519deb2fa7df6e17da2e8eb7b9265c`. Re-verified byte-identical after every probe below.

**Production range:** `5f7a901a4..8c1b20042` — two commits, `0b45c0088` (D-184 and D-186 landed jointly) and `8c1b20042` (a dating correction in `02`).

**Lens:** does this machinery or constraint still have a surviving justification? Not whether the code's present responsibility requires it, but whether the historical reason for it is still alive.

**Independence.** Derived from the clean tree and from the decision projection, not from any prior record of this range. The five interdicted files were not opened. One disclosure: a `grep -rn "ArmOutcome" src tests .plan` printed three matching lines from `arc-b-remediation-integrity-claude.md` into my transcript before I narrowed the path. Nothing in this report rests on them — the `ArmOutcome` question below is settled from `00-index.md` §Normative precedence and freeze and from `05-lifecycle-invariants.md` directly, and I reached the opposite kind of conclusion (not a finding) by my own reading of the precedence rule.

## Scope

**Covered.**

- The decision projection in both directions: `npx just decisions` (186 rows) and `npx just decisions --retired` (12 fully inactive decisions; 36 active decisions carrying retired fragments). Both halves of the forward pass were run.
- Backward pass over every piece of machinery this range introduced or left standing in `src/kernel/kernel.ts`, `src/kernel/seams.ts`, `src/kernel/transaction.ts`, `src/kernel/spec.ts` and `src/kernel.ts`, with four causal mutations (below).
- Forward pass over the machinery named by the inactive decisions D-7, D-33, D-73, D-88, D-150, D-162, D-164, D-167, D-169, D-182, D-183, D-185, and over the retired fragments of D-181 and D-186 — the two whose fragments name source machinery in this range.
- The constraint surface the range moved: `bench/size/measure.ts`'s `control?:` declarations against `obligations.md` O-13 and `measurements/arc-b-remediation.md`; `tests/kernel/transaction.declaration.test.ts`'s member-set pin; `tests/kernel/vocabulary.node.test.ts`'s `INTERNAL` allow-list.

**Not covered, and why my own lens does not reach it.**

- **`src/sortable/**` and `src/free-drag/**`.** No decision retired in or before this range touches either behaviour's machinery; the range changes no file under them, and the two shipped behaviours enter D-186's argument only as evidence that the deleted conjunct's path is closed twice over — a claim about the kernel, checked at the kernel.
- **Whether the guards this range added are correct, complete, or well-typed.** My question is whether a justification is still alive, not whether the mechanism resting on it is right. I established load-bearingness only where it was the evidence for a justification.
- **Byte budgets and the measurement's arithmetic.** I verified that the two surviving `control:` declarations match the figures `arc-b-remediation.md` records (142 and 6,889) and that the five removed ones match the values it books as their last reading. I did not re-run `bench/size` — a budget that was not re-based is a measurement question, and the constraint I owe an answer about (does a suspended control still have a live reason to be suspended) is answerable from O-13 and was.
- **The historical body of `00-index.md`, `plan.md` and `05-lifecycle-invariants.md`.** The `.plan/` record is where my causal evidence lives; it is not my subject. I descended into it only to trace chains behind specific machinery.

## Findings

### der-1 — tier B — `arm()`'s third latch test is load-bearing for a silent tier-A defect and no row in the repository reddens on its removal

**The machinery.** `src/kernel/kernel.ts:2493`, `if (current && draft && !this.#bracket.closed)`. The `!this.#bracket.closed` conjunct is the third of `arm()`'s three latch tests, and it is the only one that catches a `destroy()` raised from inside the **second** frame-part factory that then returns normally.

**Its justification is alive**, which is why this is not an expired-justification report. It rests on D-184 properties (1) and (3), both in force, and it is what stands between that path and the F-374 shape the decision exists to close.

**What is not alive is the instrument.** D-184 books its rows to F-346's standard — _each reddened by one mutation and no other_ — and the file it names, `tests/kernel/construction.node.test.ts`, has no row on this path. Its harness (`createBehavior`'s `onCreateFramePart?: (call: number) => void`) can express one in three lines; both existing destroy rows destroy on call 1, so the first latch test absorbs them and the third is never reached.

**Evidence, by execution at `8c1b20042` and reverted.**

- Deleting the conjunct (`if (current && draft)`) and running the whole `node` project: **24 files, 355 tests, all green.** No row detects it. The browser row `should reset only the composed frame when a factory destroys` cannot: its factory destroys on the first call, so `draft` stays `null` and the mutated predicate short-circuits identically.
- A transient probe file built on `construction.node.test.ts`'s own harness, destroying on call 2 only, asserting `[createFramePart, resetFramePart, retire]`:
  - clean tree — `[2, 2, 1]`, green;
  - mutated tree — `AssertionError: expected [ 2, +0, +0 ] to deeply equal [ 2, 2, 1 ]`.

So on the unguarded tree the behaviour is **never retired** and **neither composed frame is reset**, while `#spec` is published on a closed controller and `draggable()` returns normally. That is a consumer-observable outcome (tier A by consequence for the defect); what I am reporting is the instrument, because the guard is present and the defect is not in the tree.

**Required property.** The mutation that deletes `arm()`'s third latch test must redden at least one row, in the file D-184 names for exactly this window.

**Contrast, and it is what makes the gap specific rather than systematic.** The other three guards this range added are each detected. Running the same mutation procedure against `tests/kernel/construction.node.test.ts` and `tests/kernel/seams.node.test.ts`:

| Mutation | Result |
| --- | --- |
| `fail()`'s `if (this.#spec)` guard removed (`kernel.ts:2399`) | 1 failed / 91 passed |
| `#cancelWith`'s `!this.#spec |  | ` conjunct removed (`kernel.ts:732`) | 1 failed / 91 passed |
| `arm()`'s **first** latch test removed (`kernel.ts:2483`) | 1 failed / 91 passed |
| `arm()`'s **second** latch test removed (`kernel.ts:2487`) | 2 failed / 90 passed |
| `arm()`'s **third** latch conjunct removed (`kernel.ts:2493`) | **0 failed** (whole `node` project) |

## Clean results

Each of these is an area I examined and closed, with the evidence that closed it. They are results, not omissions.

**der-c1 — the forward pass over `#pinned` found no surviving machinery, in either half.** D-186 retires the identity conjunct and everything D-181 had built around it. `grep -rn "#pinned\|#begin\b" src tests` returns no match in either tree (the only `pinned` hits are unrelated English in `free-drag/spec.ts` and eleven test comments). `FrameTransaction` (`src/kernel/transaction.ts`) carries `#current`, `#draft`, `begin`, `commit`, `current`, `draft`, `retire` and nothing else — no `operationUnchanged`, which D-181's retired fragment specified — and `tests/kernel/transaction.declaration.test.ts` pins `keyof` to exactly `'current' | 'draft' | 'begin' | 'commit' | 'retire'`. `SeamDriver`'s constructor takes `(frames, preparationValid, fail, notify)`, and its `#begin` field and the docblock counting _three different owners_ are gone with their subject. `seams.node.test.ts`'s transaction counter is re-sourced at `vi.spyOn(frames, 'begin')` rather than deleted, and the row it serves is green.

**der-c2 — the retired premise itself does not survive anywhere it would read as live.** The sentence D-186 struck — _the only other writer of `current.operation` is an admission the execution bracket refuses reentrantly_ — carried three holders. `COVERAGE.md:1146` now carries it struck through with the retirement stated beside it. `00-index.md` carries it only inside dated superseded entries and inside D-186's own strike. No occurrence survives in `src/` or in an in-force normative position. I checked the one source docblock that could have inherited it: `#openIngress`'s (`kernel.ts:1052-1076`) claims the re-entry refusal for the bracket **for an ingress pass raised from inside an admission member** — a resolver dispatching a second ingress event — and says nothing about a seam phase. Its whole narrative is the admission window, which `#admitting` does span. Its closing sentence _`begin` is handed to the bracket and runs only on a pass the bracket did not refuse_ also survives true: `kernel.ts:337-340` still hands `() => { this.#frames.begin(); }` to `ExecutionBracket`. Nothing here is left false by the retirement.

**der-c3 — `#spec`-published-last survives on a rebuilt ground, not on its retired one.** D-181's stated reason for the ordering is retired (_a `destroy()` from inside `createFramePart()` reaches a scrub of an unassigned field_). The surviving `arm()` docblock states the ground D-184 re-derived — teardown's steps 3–6 are guarded by `#spec` alone, and `#spec !== null` is the sound answer to _do the frames exist_ — and I verified the code matches: `#runPhysicalTeardown` (`kernel.ts:643-655`) gates `#retireAttempts`, `spec.retire`, `lifetimes.dispose` and `#frames.retire(#scrub)` under one `if (this.#spec)`. The new `#spec` guards in `fail()` and `#cancelWith` are sound for the same order and add no field, exactly as D-184 (4) requires.

**der-c4 — `#resetFrame`'s spec parameter has more justification after this range, not less.** Its docblock ground is _`arm()`'s unwind is resetting frames composed by a behavior this kernel has not published_. That unwind is now reached by two exits rather than one (`#unwindArm`, `kernel.ts:2568-2586`), and both call sites pass `next` while `#scrub` closes over `#spec!`. The parameter cannot be replaced by a field read.

**der-c5 — the staging machinery's justification is intact, and D-186's argument about it is correctly bounded.** D-186 reasons that `consumeStaged()` has one call site **in the kernel**. That is exactly true (`#dropStaged`, `kernel.ts:823`) and does not generalise: `seams.ts:606` and `seams.ts:636` are two further consumers, and the second is the release seam reading a `ResolutionCommand` it then executes only when non-`null`. So `runCore`'s conditional stage (`seams.ts:317`, `this.#staged = this.#preparationValid() ? prepared : null`) still has the reader its docblock names, and it still discriminates the case that docblock names — a reentrant `destroy()` from `effect` — because `preparationValid()`'s two surviving conjuncts are precisely the terminal latch and the cancel request. The deletion of the third conjunct does not strand it.

**der-c6 — D-153's re-entry guard keeps the ground D-186 re-verified.** The distinction D-186 leans on is that D-153's guard **panics** while the deleted conjunct discarded silently. Verified at the tree: `#refuseReentry` (`seams.ts:486-497`) latches `#reentry` and throws, and `#runPhase` rethrows past every classification to the queue's panic path. The guard whose ground is ground (b) is still the guard that keeps its own unreachability true. No change owed, and none made.

**der-c7 — the suspended controls are a live constraint, not an abandoned one.** `bench/size/measure.ts` declares `control:` on exactly two rows — `vocabulary root - drag.js` (142) and `baseline B` (6,889) — matching `arc-b-remediation.md` §The controls and O-13's named pair. `tests/bench/size.node.test.ts:257-264` still iterates `control !== undefined` and asserts `controlViolations`, so the instrument is intact for the rows that keep one. The reason the other five are omitted is stated in force in two places — O-13 in `obligations.md`, and `measure.ts`'s own field docblock, which the range extended to say so — and O-13 names itself as _the whole of the protection_, which is the correct reading: with the five omitted, nothing else in the tree would notice they never came back. The justification for the omission (every kernel-tier pass is expected to move all five) is alive for as long as the D-170 series is open, and the restoration trigger is booked rather than implied.

**der-c8 — the forward pass over the inactive decisions outside this range found no surviving machinery.** Each retired mechanism is absent from `src/`: D-7 and D-33's readiness protocol (`holdForReadiness`, `presentationCommitted`, `pendingRequest`, `Readiness` — 0 matches; the one `readiness` hit is an unrelated prose noun in `presentation.ts:132`), D-73's lift-mode string domain (`'faithful'`, `'in-place'` — 0), D-88 and D-150's negative-clause exclusions (`?: never` — 0 in a type position; the one hit is `shared/composition.ts:96`, a comment stating the surviving **prohibition** under D-151, which is active), D-102's `RESYNC_INTERVAL` and `createVerifiedRefresh` (0), D-155's `SettlementScope` and `SeamRejection` (0), D-170's `KernelHost` (0). D-164's `inheritedSpaceOf` does survive (`presentation.ts:418, 529, 531`) but under D-165, which supersedes D-164 and is active — the helper is called twice per lift for the two ancestry readings D-165 specifies, which is the live mechanism and not the retired one.

**der-c9 — `ArmOutcome`'s residue in `05-lifecycle-invariants.md` is rationale, not a live constraint, and I checked the rule rather than assuming it.** The name was removed from `vocabulary.node.test.ts`'s `INTERNAL` allow-list in this range and appears nowhere in `src/` or `tests/`. It survives at `05-lifecycle-invariants.md:590` inside F-35's resolution paragraph, whose machinery D-155 and D-41 retired. `00-index.md` §Normative precedence and freeze, clause 2, is explicit: in `05`, _the invariant table, open questions, measurements owed and test matrix are normative; the chronological finding narratives are rationale_, and F-35's entry is a chronological finding narrative. Its neighbours F-30 and F-33 carry later-supersession annotations and F-35 does not, which is a consistency question for a documentation lens; by mine it is not a constraint in force and is not a finding.

## Probes applied and reverted

Five source mutations to `src/kernel/kernel.ts` (one at a time, each restored from a copy taken before the first) and one transient test file, `tests/kernel/zz-der-probe.node.test.ts`, since deleted.

**Verification that nothing was left behind**, run after the last revert:

- `git diff 8c1b20042 -- packages/drag2/src packages/drag2/tests packages/drag2/bench` → 0 bytes;
- `git status --porcelain -- packages/drag2/src packages/drag2/tests packages/drag2/bench` → 0 lines;
- `git rev-parse HEAD:packages/drag2/src` → `cc11493373519deb2fa7df6e17da2e8eb7b9265c`, the tree object this pass was asked to read at.

The only untracked path in the repository at the end of this pass is another reviewer's report artifact under the same round directory, which this pass did not create and did not open.