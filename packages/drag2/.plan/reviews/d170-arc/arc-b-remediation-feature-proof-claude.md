# Arc B remediation — feature proof

**Read at `8c1b20042`** (branch `drag2/fin-review`), range `5f7a901a4..8c1b20042`. The branch has since advanced to `947571c2b`; `git diff --stat 8c1b20042..947571c2b` touches only three review artifacts under `.plan/reviews/d170-arc/`, so `src/`, `tests/`, `bench/` and every document cited below are byte-identical at both commits and the working tree was clean throughout.

**Lens.** Does the implementation deliver what the current D-184 and D-186 records and the shipped contracts say it delivers, and do the instruments that claim to pin it actually discriminate? Not whether the design is right — that is the architect's — and not whether the code carries machinery its responsibility does not need.

**Method.** Every claim below was executed, not read off. Both vitest projects were run at the tree (`355` node rows, `860` passing plus `60` skipped browser rows — `1275` in total, all green). Fourteen source mutants were built and run against the whole suite. Two probes drove `draggable()` directly on a stub root to observe the construction window from all three positions the window contains. Both size trees were rebuilt and re-measured, the baseline in a detached worktree so the checkout was never mutated. No production file was modified permanently: each mutant existed on disk only for the duration of its own two suite runs and was restored from a backup taken before it was applied. **`src/` was verified byte-identical to `8c1b20042` after the pass** — an empty `git diff 8c1b20042 -- packages/drag2/src/`, and `kernel.ts` matching `git show 8c1b20042:packages/drag2/src/kernel/kernel.ts` on md5. A mutant is observable in the working tree while its browser project is running, which is the only window in which one exists.

## Result

**Four of the six load-bearing claims survived falsification intact, and two instrument gaps were found.** The construction window's behaviour, the unwind's exactly-once retirement, configuration validation's independence from liveness and D-186's deletion of `#pinned` all hold under every attack this pass could construct. The recorded measurement reproduces byte for byte on both trees and its budget disposition follows §18 as written.

What does not hold is the mutation discrimination of two guards D-184 landed: **the third latch test in `arm()` is reddened by nothing in the package**, and **the `current` half of `#unwindArm`'s reset guard is reddened by nothing in the package**. Both are correct in the tree; neither would be caught if it were removed.

## Findings

### reviewer-1 — `arm()`'s third latch test has no falsifier, and no row in the package destroys from the second frame-part factory · tier B

**Current behaviour.** `kernel.ts:2493` gates the whole arming block on `if (current && draft && !this.#bracket.closed)`. D-184's implemented statement claims all three tests: _`arm()` tests the terminal latch before each frame-part composition **and again before it constructs the entity**_. `COVERAGE.md` §The construction window lists a mutation for the first latch test (_the latch test before the first composition dropped — 1_) and none for the third.

**Why it is a problem.** Deleting `&& !this.#bracket.closed` from `:2493` — leaving `if (current && draft)` — reproduces **F-374 verbatim** for a `destroy()` raised from inside the _second_ frame-part factory: both frames physically exist, so the mutant arms the controller on a closed bracket, publishes `#spec`, binds ingress on an already-aborted signal, and returns. `spec.retire()` is never called and neither frame part is ever reset. That is the tier-A/B defect this remediation exists to repair, and the suite does not notice it.

The mechanism is that **no row anywhere in the package acts from the second frame-part factory.** `construction.node.test.ts`'s `arm()` helper hooks every composition (`onCreateFramePart?.(createFramePart.mock.calls.length)`) but both destroying rows destroy on the first call, which the second latch test then stops from reaching the second composition — so the third test is never the one that decides. `kernel.browser.test.ts`'s _should reset only the composed frame when a factory destroys_ is the same position.

**Evidence.** Mutant `if (current && draft && !this.#bracket.closed)` → `if (current && draft)`, run against both projects: **0 rows red** (355 node, 860 browser, unchanged). A probe driving `draggable()` with a `destroy()` in each position shows the difference the suite cannot see:

```
                                tree at 8c1b20042                      third latch test dropped
destroy in first frame part   ["create#1","destroy()","retire","reset"]  ["create#1","destroy()","retire","reset"]
destroy in second frame part  ["create#1","create#2","destroy()",        ["create#1","create#2","destroy()"]
                               "retire","reset","reset"]                  ← no retire, no reset
factory body destroy          ["retire"]                                 ["retire"]
```

**Required property.** D-184 property (1) — _a spec that reached `arm()` is retired exactly once for any `destroy()` the controller has seen or goes on to see_ — must have a falsifier for the exit that decides it, which is the third latch test. Equivalently: the package must contain a row that acts on the context from the second frame-part factory, which today it does not.

### reviewer-2 — the `current` half of `#unwindArm`'s reset guard has no falsifier, and the recorded mutation conflates two independently deletable guards · tier B

**Current behaviour.** `#unwindArm` (`kernel.ts:2569`) resets each frame behind its own test, `if (current)` at `:2576` and `if (draft)` at `:2580`. `COVERAGE.md` records one mutation for the pair — _the unwind resetting both frames unconditionally — 1_ — and one row, _should reset only the frame parts a destroying factory composed_.

**Why it is a problem.** The two tests are not one guard, and only one of them is observed. Dropping `if (draft)` reddens three rows (one node, two browser). Dropping `if (current)` reddens **nothing**, and it is a real violation of D-184 property (2), _`resetFramePart` is never invoked with a value that is not a composed frame_: `frame(existing?)` is `Object.assign(existing ?? {}, DEFAULT_FRAME)`, so a `null` target passes through it silently and the behavior's own `resetFramePart` is then called with `null`. The throw that follows is swallowed by `#unwind`, which is exactly why no assertion sees it.

The three positions that reach `#unwindArm` with `current === null` are the configuration refusal, a `destroy()` from the factory body, and a throw from the first frame-part factory. The one row covering the second of those asserts `[createFramePart, retire] === [0, 1]` and says nothing about resets.

**Evidence.** Mutant `if (current) { this.#resetFrame(next, current); }` → `this.#resetFrame(next, current!);`: **0 rows red** across both projects. The probe shows the property being violated on the surviving mutant:

```
factory body destroy   tree: ["retire"]        mutant: ["retire","reset(null)"]
```

**Required property.** Property (2)'s second half needs a falsifier of its own on the `current` side: a row that observes what `resetFramePart` is handed — not only how many times it is called — on an exit where no frame was composed.

### reviewer-3 — property (3) is instrumented for one of the two static refusals · tier C

**Current behaviour.** `arm()` validates two facts about the spec ahead of every latch test: the `actionTags` range (`kernel.ts:2439`) and the `command.types`/`pointerdown` collision (`:2471`). `COVERAGE.md` books one row for the ordering — _a refused configuration throws its `TypeError` even when the factory destroyed the controller first_ — and it drives `actionTags` only. The collision refusal has a row (`kernel.browser.test.ts:771`) but it runs on a live controller, so nothing pins its independence from the latch.

**Why it is a problem.** The register's row reads as a claim about _a refused configuration_ where it holds for one of two. It is tier C because both refusals sit in the same block ahead of the same test and share the whole of the mechanism the property is about, so the second adds no distinct exposure — but the register overstates by one.

**Evidence.** Gating the `actionTags` refusal on the latch (`!this.#bracket.closed && (…)`) reddens exactly the one row, as recorded. Merely relocating that refusal below the first latch test without gating it reddens 0, which `COVERAGE.md` already discloses in the same cell — that disclosure is correct and is not part of this finding.

**Required property.** Either the register's row names the refusal it actually drives, or the collision refusal gets the same treatment.

## Falsification attempts that failed, and what each establishes

### 1. The construction window across the supported `BehaviorContext` surface — not falsified

Every member of the seven-member interface was called from all three positions the window contains — the factory body, the first frame-part factory and the second — on a stub root, and each behaved identically in all three and as its own entry states. No member threw and no member reported. `destroy()`'s promise settled in every position (checked on the next microtask), which is the immediate-teardown case D-184's ordering paragraph predicts at depth 0.

`dispatch` was driven with both an in-range and an out-of-range tag from all three positions: nothing was enqueued and nothing reached `reportError`, which is `spec.ts`'s written limitation delivered — the warning object is allocated and then dropped by `#notify`, because `#notify` reports through `this.#spec?.reportError` and `#spec` is null for the whole window.

**This establishes** that the members behave uniformly across the whole window, which is (7)'s positive form, and that (8)'s limitation is accurate as written. **It does not establish** that the window is safe under a `root` that dispatches real events during construction; nothing binds ingress before both frames exist, so there is no such path, but the probe used an inert root and did not attempt one.

### 2. Partial construction and unwind — not falsified

Retirement is exactly once on every construction-window exit I could reach: a `destroy()` from the factory body, from either frame-part factory, a `destroy()` followed by a throw, a `destroy()` from inside `retire` itself, and a throw from validation. Physical teardown skips step 4 in this window because `#spec` is still null, and `#unwindArm` is the sole caller of `retire` there; on the throwing exits the `catch` rethrows, so the post-`try` unwind is unreachable and cannot double it. `#ingress.abort()` running twice is a platform no-op.

Frame-part composition stops at the latch on both sides: a `destroy()` from the factory body composes zero parts, one from the first factory composes one. A `destroy()` raised _inside_ the second factory still leaves that part composed, because the latch closed after the call began — the claim is that the kernel starts no further composition, and it does not.

**This establishes** the three properties as behaviours of the tree. **It does not establish** that the suite would notice their loss — see reviewer-1 and reviewer-2, which is the same subject observed from the instrument side.

### 3. Configuration validation independent of controller liveness — not falsified

`actionTags: -1` throws its `TypeError` out of `draggable()` whether or not the factory destroyed the controller first, and the destroying case still retires the behavior exactly once. Gating the refusal on the latch reddens the row that exists for it.

### 4. D-186's removal of `#pinned` and the identity conjunct — not falsified

I attempted to construct a contract-compliant path that leaves a preparation stale with neither remaining conjunct false, and could not. What closes it, read structurally at the tree rather than sampled:

- **The only begin→behavior→commit window is `runCore`.** The other five `#frames.begin()` callers (`kernel.ts:341`, `:1596`, `:1817`, `:1863`, `:2057`) run no behavior code between the open and the commit — `#closeOperation` disposes motion _after_ commit 1, and the move and pointerless paths write scalars and commit immediately.
- **No path retires an operation synchronously from inside a seam.** All seven `#retireOperation` call sites are either queue handlers, admission-failure paths, or continuation policies applied after `runCore` has returned; a nested `#bracket.dispatch` inside a running drain appends and returns (`execution.ts` `#drain`'s `#running` re-entry test), and one inside admission is held by `#admitting`.
- **`#openIngress` refuses whenever `#frames.current.operation` is set**, which excludes every `runCore` caller but the idle behavior action, and reaching a nested pass from that one needs a synchronous dispatch on `root` — a DOM write, which `02` §The tri-phase transition forbids from `prepare` in prose, in its compiled fixture and in the shipped docblock.

**This establishes** that D-186's re-derived argument reproduces at the tree and that no in-contract falsifier exists on the routes I enumerated. **It does not establish** that none exists at all: the enumeration is over the kernel's own call graph, and a behavior that violates `prepare`'s no-DOM-writes rule still reaches the state D-185 described. That path is out of contract and is not a falsifier, which is the classification `4eea6f60d` already applied.

### 5. The new instruments and the changed F-374 row

Covered by the findings above. What the fourteen mutants establish about the six construction rows, positively: each of the five guards the register books a mutation for is reddened by that mutation and by no other row in the file, and the counts recorded in `COVERAGE.md` reproduce — the shared-unwind deletion reddens rows 1, 2 and 3 (recorded as **3**), the first latch test reddens row 3 alone, the `fail` guard row 4 alone, the `#cancelWith` conjunct row 5 alone, the latch-gated validation row 6 alone. The changed `kernel.browser.test.ts` row (_should reset only the composed frame when a factory destroys_, `resets` 0 → 1) is reddened by the shared-unwind deletion, by the second latch test's deletion and by the `draft` guard's deletion, so it is a live assertion on the repaired behaviour rather than a renamed one.

`seams.node.test.ts`'s re-sourced transaction counter is sound: `vi.spyOn(frames, 'begin')` observes the entity the driver actually calls, and the five rows that read `begins()` all passed at the four-argument shape.

### 6. The recorded budget and measurement disposition — not falsified

Both trees were rebuilt and re-measured with `bench/size/measure.ts`. **The landed column of `arc-b-remediation.md` reproduces exactly** on all fifteen rows, and so does the `5f7a901a4` column, measured in a detached worktree: `minimal` 10.43 → 10.44, `minimal (xy)` 10.33 → 10.30, `free drag minimal` 8.16 → 8.14, `kernel root` 6.21 → 6.21, and so on. Module counts are identical row for row between the two trees, which is _no module moved in any composition_ verified rather than asserted.

The derived figures are internally consistent: each of the five suspended controls' recorded last reading equals the difference between its former `control:` value and the landed Brotli figure (`8159 → 8136 = −23`, `8293 → 8298 = +5`, `8293 → 8295 = +2`, `8448 → 8447 = −1`, `6210 → 6210 = 0`), and slack computed from every budget against every landed figure runs 0.063 kB (`vocabulary root`) to 0.151 kB (`baseline B`) — the _0.06 to 0.15 kB_ the record states, across all fifteen rows rather than the thirteen kernel-carrying ones, which is the quantifier F-381 corrected elsewhere and which this record gets right.

**The disposition follows §18 as written.** §18 re-bases _after_ a shrink; the joint landing is +5 B minified on every kernel-carrying row and −30 to +11 B on Brotli, which is not a shrink, so declining the re-base D-186's sequence anticipated is the rule applied rather than waived. No row breached its ceiling and none went negative. The two retained controls held exactly and were declared beforehand, which satisfies §18's _design at least one control row into every pass and say beforehand what it should do_. `measure.ts:139-150`'s amended `control?:` docblock, `budget-rebases.md`'s new entry, `obligations.md` O-13 and `arc-b-remediation.md` §The controls agree with each other and with the tree.

**One soft point, reported and not raised as a finding.** §18 says to _prefer a condition an observer meets … over a schedule_, and O-13's trigger is _the close of the D-170 arc series — Arc D, the last of the four_, which is closer to a schedule than to a condition. It is stated in advance, it names the act that discharges it, and O-13 explicitly records that the row is the whole of the protection — so the rule's purpose is met even where its preferred form is not. Whether that is acceptable is the owner's call, not this lens's.

## Scope

### Covered

- `src/kernel/kernel.ts` — `arm()`, `#unwindArm`, `#resetFrame`, `#preparationValid`, `#cancelWith`, `fail`, `dispatch`, `destroy`, `#retireOperation`, `#runPhysicalTeardown`, `#notify`, and every `#frames.begin()` and `#retireOperation` call site.
- `src/kernel/seams.ts` — the four-argument constructor and `runCore`'s two revalidation sites.
- `src/kernel/execution.ts` — `close`, `dispatch`, `runIngress`, `#drain`, `#leave`, `#runTeardown`, read to establish when teardown is immediate and when a nested dispatch is queued.
- `src/kernel/spec.ts` — the four amended JSDoc entries against the behaviour probed.
- `tests/kernel/construction.node.test.ts` (all six rows), the two changed `kernel.browser.test.ts` rows, `seams.node.test.ts`'s harness, `vocabulary.node.test.ts`'s allow-list.
- `bench/size/measure.ts`, `arc-b-remediation.md`, `budget-rebases.md`, `obligations.md` O-13 — re-measured at both trees.
- D-184 and D-186 as they now stand in `00-index.md`, and `COVERAGE.md`'s two amended sections.

### Not reached, and why

- **The behaviours' own suites beyond a green run.** Free drag and the sortable were exercised only as part of the 1275-row baseline. This range changes no behavior-facing path, and this lens's question is about the kernel's construction window and the conjunct; a behavior-tier proof is a different subject.
- **The `5f7a901a4` timing and accessor figures** in `arc-b.md`, corrected in this range under F-378 and F-381. I verified the byte columns those corrections quantify over and did not re-run the move-path benchmark, which the record itself reports as null at the harness's resolution and which no claim in this range rests on.
- **Prose sweeps across the historical body of `00-index.md` and `plan.md`.** Records of superseded readings are not this lens's subject; whether a dated entry still reads as a live claim is the integrity pass's question, and that pass is recorded beside this one.
- **The out-of-contract nested-ingress path.** Reproduced structurally in the reading above but not executed as a DOM scenario, because a falsifier that requires breaking `prepare`'s stated prohibition is not a falsifier and executing it would establish nothing this record does not already state.