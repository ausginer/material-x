# Arc B recovery — cleanup pass

**Commit read at:** `8c1b20042ecf74ddeef7c9bc65ceb6ff46e2fa3e`. Working tree over `packages/drag2/{src,tests,bench}` verified byte-identical to this commit before reading (`git diff 8c1b20042 HEAD` empty over those paths, `git status --porcelain` empty, `packages/drag2/src` tree object `cc11493373519deb2fa7df6e17da2e8eb7b9265c` matches).

**Lens:** cleanup — is machinery justified by the code's current responsibility and `CONTRIBUTING.md`? This is an independent re-run of the arc-B remediation range from a clean snapshot; no prior consolidation or lens artifact for this range was read (the excluded files under this directory were not opened), and no conclusion here is derived from any prior record.

## Scope

**Production range examined:** the two commits comprising `5f7a901a4..8c1b20042` touching `packages/drag2`:

- `0b45c0088` — "deliver the construction window per member and delete the identity conjunct"
- `8c1b20042` — "date 02's note about 03's published list, which 03 no longer carries"

Files changed in the range: `src/kernel/kernel.ts`, `src/kernel/seams.ts`, `src/kernel/spec.ts`, `bench/size/measure.ts`, `tests/COVERAGE.md`, `tests/kernel/construction.node.test.ts` (new), `tests/kernel/kernel.browser.test.ts`, `tests/kernel/seams.node.test.ts`, `tests/kernel/vocabulary.node.test.ts`. I read each of these files in full at `8c1b20042` and diffed each against its pre-range parent (`0b45c0088~1`) to isolate exactly what this arc introduced, then read the surrounding, unchanged code each touched file's changed regions depend on (`src/kernel/transaction.ts`'s `FrameTransaction.begin()`/`commit()`, `src/kernel.ts`'s `draggable()`) to check the changed code against real collaborators rather than against the diff in isolation.

**Not examined:** the rest of `packages/drag2/src` and `tests` outside the files the range touched (e.g. `sortable/*`, `free-drag/*`, `kernel/execution.ts`, `kernel/protocol.ts`, `kernel/queue.ts`, and the bulk of `kernel/kernel.ts` and `kernel/seams.ts` outside the diffed regions). This pass's question is whether the _production range_ introduced machinery unjustified by its own responsibility; code the range did not touch was not re-litigated by this lens, because a cleanup finding requires actually reading the code and I have no reading of that code to report on — not because another pass owns it.

## Findings

**None.** Every construct the range added or changed was checked against `CONTRIBUTING.md` and `documentation.md` §5 and found justified. Recorded below as clean results per finding-area, since the task calls for stating what was examined and found sound, not only defects.

### Clean result 1 — `Kernel#arm`'s three latch tests (`src/kernel/kernel.ts:2483-2541`)

`arm()` now tests `!this.#bracket.closed` three times: once before composing `current`, once before composing `draft`, and once more (`current && draft && !this.#bracket.closed`) before publishing the pair. These are not redundant copies of one check. `destroy()` is a public, documented member of `BehaviorContext` and `spec.ts`'s "Construction is not a state this interface distinguishes" (`src/kernel/spec.ts:40-45`) states a reentrant call from inside a frame-part factory is a **supported** position — so the state this guards against is reachable through correct use of the public contract (`CONTRIBUTING.md` §1.1's gate is passed). Each of the three tests catches a distinct point at which that reentrant `destroy()` could have landed (before the first composition, before the second, or during the second whose `Object.assign` still completes after the latch flips) — verified by reading `#unwindArm` (`kernel.ts:2569-2586`), which resets "whichever frame exists" for exactly this reason. `tests/kernel/construction.node.test.ts` exercises the corresponding states directly. No nannying, no duplicate concept — a real protocol boundary.

### Clean result 2 — deletion of the `#begin` indirection and `#pinned` conjunct (`src/kernel/kernel.ts`, `src/kernel/seams.ts`)

The prior `Kernel#begin()` wrapper (which pinned `#pinned = this.#frames.current.operation` before delegating to `this.#frames.begin()`) and the `SeamDriver` constructor's fifth `begin` callback parameter are both gone; `ExecutionBracket`'s constructor callback and `SeamDriver.runCore` now call `this.#frames.begin()` directly (`kernel.ts:341`, `seams.ts:275`). Checked for residue: `grep -n "#begin\|#pinned"` over `kernel.ts` returns nothing, and `SeamDriver`'s constructor now takes exactly four collaborators (`seams.ts:225-235`), matching every call site (`kernel.ts:2495`). `#preparationValid()` (`kernel.ts:471-476`) now composes two conjuncts (`!closed && !cancelRequest`) where the comment says it does, and `FrameTransaction.begin()` (`src/kernel/transaction.ts:56-58`) is a real method that owns the draft/current copy on the entity the pair already belongs to — calling it directly removed a wrapper that owned nothing (the pin) once the pin itself was deleted, consistent with `CONTRIBUTING.md` §2.1 (single-use wrapper is an inline candidate) and §9 (the pin was an intermediate value with no remaining ownership reason). This matches `D-186` as recorded in `tests/COVERAGE.md`; I did not re-derive the falsifiability argument for the deleted conjunct (that is a `der`/architect question), only that the deletion left no dangling reference or duplicated state behind it.

### Clean result 3 — `BehaviorContext` JSDoc additions (`src/kernel/spec.ts:40-45, 59-63, 75-78, 102-103, 116-119`)

`BehaviorContext` is exported from `src/kernel.ts`, the package's declared public entrypoint (confirmed by grep of the export list and its own "What this entry publishes" header), so its JSDoc is shipped, published documentation under `documentation.md` §5.1. The five additions each state an actionable, load-bearing precondition for a third-party behavior author (dispatch before arming is dropped without report; `fail`/`cancel` from the construction window demote/no-op; `destroy` during construction still retires exactly once) — present tense, no `D-`/`F-`/phase/date/commit references, no strikethrough, and no comparison against a rejected alternative design. They explain mechanism (why the demotion is silent, why no operation exists yet) rather than defending a design choice against one that lost, so they read as consequences of stated invariants rather than the deliberation `§5.1` excludes. Judged compliant with `documentation.md` §5.1.

### Clean result 4 — `tests/COVERAGE.md` and `tests/kernel/vocabulary.node.test.ts` decision references

Both carry bare `D-`/`F-` pointers (`D-181`, `D-184`, `D-186`, `F-346`). Neither is published JSDoc — `COVERAGE.md` is a `.plan`-adjacent record document, not a source comment, and the `vocabulary.node.test.ts` lines are internal (`//`) comments, for which `documentation.md` §5.2 permits "one bare pointer... as an index entry". The one compound citation in that file, `(D-64, D-132)`, sits on an unchanged line the range did not touch (pre-existing shared vocabulary comment) and is therefore outside this pass's scope; noted rather than raised as a finding of this pass, since the range did not introduce or touch it.

### Clean result 5 — `bench/size/measure.ts`'s new `control` field comment (lines 142-150)

Explains, in present tense, why only two of fifteen budget rows currently declare an exact `control` figure (the other five are stated as suspended for the kernel arc series, with one bare pointer `` `obligations.md` O-13 `` to the record). This is a maintainer note (bench tooling, not shipped `.d.ts`), so `documentation.md` §5.2 governs; it states a current constraint and its consequence ("what still detects a kernel symbol reaching a composition that should not have one") rather than narrating history, and the one pointer is within the allowed budget.

### Clean result 6 — `Kernel#fail`'s `#spec` guard (`kernel.ts:2398-2402`)

`fail()` now reads `if (this.#spec) { this.#driver.requestFailure(...); }` instead of calling `this.#driver.requestFailure` unconditionally. This is not new nannying: `#spec` is the kernel's own documented liveness proxy for `#driver` ("assigned before spec is published" — comment at `kernel.ts:2387-2396`, verified true by reading `arm()`, which assigns `#driver` at line 2495 and `#spec` at line 2523, strictly before either return), and `fail()` is reachable from the construction window per `spec.ts`'s contract, where `#driver` is genuinely unassigned (`#driver!` would read the TDZ-safe but semantically wrong value). The guard is required by the class's own `#driver!` definite-assignment premise stated in the field comment at `kernel.ts:359`, not a defensive check against invalid external input — correct use (a documented-supported construction-window call) is exactly what reaches this branch.

## Verification notes

- `grep -n "#begin\|#pinned" src/kernel/kernel.ts` — empty (clean result 2).
- `SeamDriver` constructor arity confirmed at `seams.ts:225-235` (4 params) and its one call site at `kernel.ts:2495-2514`.
- `BehaviorContext` export confirmed via `grep -n "BehaviorContext" src/kernel.ts` (lines 74, 147, 227, 248) and the entrypoint header at `src/kernel.ts:1-30`.
- `FrameTransaction.begin()`/`commit()` read at `src/kernel/transaction.ts:56-71`.
- `draggable()` read at `src/kernel.ts:238-255` to confirm the construction window's shape (`arm()` called exactly once, after the factory returns) matches what `spec.ts` and `construction.node.test.ts` document.

## Result

Zero findings (tiers A/B/C). The range under review is small, dense, and internally consistent; every runtime check added or retained in it composes a state reachable through correct, documented use of the public `BehaviorContext` contract, and every comment or JSDoc it added or changed states a present-tense invariant or consequence rather than implementation history or design deliberation.