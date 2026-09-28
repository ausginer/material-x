# D-166's relinquished join write — feature proof

**Feature-proof pass, phase 24.** Files read at `57827a2a`; diff range `b91ce5c6..57827a2a`, confirmed one commit (_drag2: delete the join's pin write and migrate the vocabulary_). Working tree clean at that commit apart from a pre-existing untracked `packages/drag2/tst.md`, which this pass did not create, read for evidence or modify; every probe below was reverted and the tree re-verified green before this report was written.

This is a **reviewer-only** round: no integrity, cleanup or DER pass accompanies it, and this artifact is written to stand alone.

The question is not whether the tree spells D-166's vocabulary but whether the shipped control flow delivers what D-166 requires. Every claim cites the line that makes it true; where a property could be violated, the mutation that would violate it was applied and run.

## 0. Verification run

`npx just test` (`vitest run -c vitest.config.ts`) at `57827a2a`: **65 files, 1226 passed, 60 skipped, 1286 total, no type errors.** `npx just typecheck` (`tsc -p tsconfig.json --noEmit`): **clean, no diagnostics.** Both were run twice — once before any probe and once after the last probe was reverted — with identical counts.

Four falsification probes were run against mutated copies of the tree, each reverted immediately:

| Probe | Mutation | Result |
| --- | --- | --- |
| **P-A** | `src/sortable/spec.ts:1521` — the `input.stage !== FAILURE_TERMINAL_CALLBACK` exclusion made unconditional | **65 files, 1226 passed, 60 skipped — no failure** |
| **P-B** | `src/kernel/kernel.ts:2191` — `stage !== FAILURE_TERMINAL_CALLBACK &&` deleted from `handleErrorReported` | **1221 passed, 5 failed — all five in `tests/bench/size.node.test.ts` (byte controls). No behavioural row failed** |
| **P-C** | the join write reinstated verbatim (`runLeaf(() => session.write(attempt.targetX!, attempt.targetY), FAILURE_RENDERER_WRITE)` before the `finally`) | **299 passed, 1 failed** — `kernel.browser.test.ts:2630` _should raise no classified failure of its own_ |
| **P-D** | `handleErrorReported` instrumented to record `{ stage, current.phase, current.operation === operation }` on entry | reported below, per row |

## 1. Scope

**Covered.** The three properties in §§2-4 and the I-24 sanity check in §5, traced through `src/kernel/kernel.ts` (`joinSettlement`, `measureTarget`, `startTail`, `openSettlement`, `handleMove`, `failOperation`, `handleFailed`, `handleErrorReported`, `retireAttempts`/`clearOperationState`), `src/kernel/presentation.ts` (`makeSession`, `captureInlineStyles`), `src/kernel/lifetimes.ts`, `src/kernel/spec.ts`, `src/sortable/spec.ts` (the `SETTLED_FAILED` arm and `finalized`), `src/free-drag/spec.ts` (the `SETTLED_FAILED` arm); the complete `src/` delta of the commit; the rewritten rows in `tests/kernel/kernel.browser.test.ts` and `tests/sortable/sortable.browser.test.ts`; `tests/COVERAGE.md`'s four rewritten rows; contract 01's ownership row, contract 02 §§settlement order and D-16's surviving clauses, and 05's I-24/I-25 rows before and after.

**Not covered.** The size figures in `.plan/measurements/budget-rebases.md` and `bench/size/measure.ts` (a measurement pass owns those, and the five `bench` rows that moved under probe P-B were treated as byte controls, not behavioural witnesses); the `.plan/contract/` migration as prose — only the passages this pass had to cite were read, and one of them is a finding; real-browser visual verification beyond what the suite asserts; F-268, F-265 and the pre-existing cleanup backlog, all out of scope by instruction and deliberately not commented on even where the diff passes through them.

## 2. Property 1 — the removed write and its failure machinery have no surviving correctness role · **holds**

### 2.1 What was removed

The diff deletes, from `joinSettlement`, exactly four things and nothing else:

1. the `const { targetX, targetY } = attempt;` read and the `if (targetX !== null)` guard around the write;
2. `session.write(targetX, targetY)`;
3. its `driver.runLeaf(…, FAILURE_RENDERER_WRITE)` wrapper;
4. the `let failed = false` flag, its assignment, and the `if (failed) { return; }` branch that deferred the terminal to `ERROR_REPORTED`.

What survives in its place is a bare destructuring read, `({ x: fromX, y: fromY } = session.rendered);` (`kernel.ts:1615`). The join's shape at `57827a2a` is `begin`/`FINALIZING`/`commit` (1592-1594) → `joinLive()` (1606) → sample `rendered` (1615) → `owned.presentation.dispose()` in the unconditional `finally` (1622) → `startTail` (1631) → `joinLive()` (1636) → `runLeaf(finalized, FAILURE_TERMINAL_CALLBACK)` (1640-1642) → `dispatchKernel(RETIRE, …)` (1646). That is the order D-166's ledger row states as landed, and it matches.

### 2.2 It is genuinely dead

- **No remaining caller.** `grep` for `session.write` / `lift.write` across `src/` returns only behavior call sites: `free-drag/spec.ts:414,458,579,662` and `sortable/spec.ts:933,1400`. The kernel has none.
- **Nothing relies on the record it wrote.** `rendered`'s only reader in the whole tree is `kernel.ts:1615` — the join's own sample — and its only writer is `write` itself (`presentation.ts:391-392`). The type keeps `rendered` off `BehaviorLiftSession` (`spec.ts`, and `tests/kernel/spec.declaration.test.ts:98,120,133` compile that), so no behavior can read it either. With the join write gone the read is no longer order-sensitive, which is a strengthening rather than a loss; the comment at 1610-1614 says so.
- **No remaining contract obligation in the normative documents.** Contract 02's settlement sequence has the step removed (`02:1274`, `02:1288`, `02:1290`); contract 01's ownership row is re-titled _The decided final position_ (`01:314`); I-24 is restated unconditionally (`05:42`). One current-state document was **not** migrated and still states the obligation — see finding **d166-3**.
- **Nothing silently relies on it having run.** The tail's start point is `fromX`/`fromY`, sampled from `rendered` before the release, and its endpoint is `attempt.targetX`/`.targetY`, recorded by `measureTarget` (`kernel.ts:1467-1469`). Neither quantity ever came from the DOM, so removing the write removes no input. `startTail` skips on `targetX === null` (1517) and on a zero delta (1524), both unchanged.

### 2.3 The move path is untouched · **verified separately, as asked**

`FAILURE_RENDERER_WRITE` has exactly **one** producer in `src/` at `57827a2a`: `driver.runLeaf(runMoved, FAILURE_RENDERER_WRITE)` at `kernel.ts:1813`, inside `handleMove`'s `phase === ACTIVE` arm. That line is unchanged by the diff — it is not in the delta at all. `runMoved` (1792-1794) calls `spec.moved(current, lift)`, so a behavior's `lift.write` throw is classified there, exactly as before.

`presentation.ts`'s `write` body (`384-393`) is **byte-identical** across the diff; only its JSDoc changed, and the new text keeps the classification explicit: _"A throw here is classified `FAILURE_RENDERER_WRITE` by the caller, which is a semantic classification for a load-bearing write"_ (`presentation.ts:302-305`). The record-after-assignment ordering and its reason (`385-389`) are unchanged. The stage constant, its `FailureStage` membership and its public export are unchanged (`failures.ts:20,46`; `drag.ts:58`; `kernel.ts:181`).

Executable confirmation that the move path's classification still fires: `kernel.browser.test.ts:2733` _should publish the terminal from the error route, after the release_ drives a throwing `moved` and asserts `harness.failures[0].stage === FAILURE_RENDERER_WRITE`; `sortable.browser.test.ts:1802` and `free-drag/validation.browser.test.ts:190,346` assert the same stage from behavior writes.

### 2.4 The witness for the removal discriminates

Probe **P-C** reinstated the join write verbatim. `kernel.browser.test.ts:2630` _should raise no classified failure of its own_ failed (1 of 300 in the two browser suites), on `expect(harness.failures).toEqual([])`. So the new row is a real instrument for this property and not a tautology.

One qualification on that row's stated mechanism, which is narrower than the property it names: its comment attributes the absence of a fault to the restore being `removeProperty` rather than a write. That is true for the fixture, but the property holds more broadly — when the visual _does_ carry an authored inline `transform`, `captureInlineStyles`' disposer takes the `setProperty` branch (`presentation.ts:160`) and a poisoned setter would throw there, inside `LifetimeScope.dispose`, which catches every disposer and emits a `DraggableWarning` (`lifetimes.ts:96-108`). Still unclassified. Not a finding — the row is sound and its assertion is right; the reason it gives is one case of a wider one.

## 3. Property 2 — `ERROR_REPORTED` is not orphaned · **holds**

### 3.1 The route keeps genuine producers, and they are named

`ERROR_REPORTED` is dispatched from exactly one place, `handleFailed` (`kernel.ts:2146`), and only when the report transition published (`current.phase === REPORTING`, 2142). Its producers are every classified failure of a live, started operation that reaches `failOperation` (`kernel.ts:748-800`) without being demoted by the cancel latch, the `reporting` latch or `phase === REPORTING`. Concretely, in this tree:

- `FAILURE_RENDERER_WRITE` from `handleMove` → `runMoved` (`kernel.ts:1813`) — the surviving first-party producer the ledger row names, and the one the new test drives;
- `FAILURE_ACTIVATION` (`kernel.ts:1277`);
- `FAILURE_RESOLUTION` from the settlement seam (`kernel.ts:1672`);
- `FAILURE_ACTION_PREPARE` / `FAILURE_ACTION_EFFECT` from `handleBehaviorAction` (`kernel.ts:2216-2218`);
- `FAILURE_RELEASE` from the sortable's release render (`sortable/spec.ts:1384,1400`);
- any explicit `host.fail(stage, cause)` from a behavior or feature (`kernel.ts:808`), which several rows drive (`kernel.browser.test.ts:2789,3819,3835`).

**The reach was executed, not inferred.** Probe **P-D** instrumented `handleErrorReported`'s entry and ran `kernel.browser.test.ts:2733`. The recorded entry is `{ stage: 3, phase: 6, sameOp: true }` — `FAILURE_RENDERER_WRITE`, phase `REPORTING`, the operation still current. The guard at 2187 passes, the branch at 2191 is taken, presentation is released through `unwind(lifetimes.presentation.dispose)` (2192) and the terminal is published from `runLeaf(finalized, …)` (2198-2200). The row's own assertions then pin the ordering: `presentation.released` precedes `finalized`.

So the deleted `failed` branch was not the route's only producer, and the branch went while the route stayed — which is what D-166's P1 required.

### 3.2 The join's own gap is deliberate and classifies nothing

Between the settlement's commit and `finalized`, `joinSettlement` performs exactly four operations, and none of them can classify:

| Step | Line | Failure treatment |
| --- | --- | --- |
| `joinLive()` | 1606 | pure read over `queue.closed`, `current.operation !== null` and `current.phase === FINALIZING` (`kernel.ts:1402-1403`) — cannot throw |
| `({ x, y } = session.rendered)` | 1615 | plain own data properties on a literal object (`presentation.ts:377`) — no getter, cannot throw |
| `owned.presentation.dispose()` | 1622 | best-effort LIFO; every disposer is individually `try`/`catch`ed to a `DraggableWarning` (`lifetimes.ts:96-108`) — reports, never classifies |
| `startTail(…)` | 1631 | both foreign calls — the `landingTail` policy (1532-1534) and `element.animate` (1550-1567) — go through `unwind`, which absorbs to a warning (`unwind.ts:24-52`) |

`measureTarget` sits _before_ the join and is unclassified by construction: `driver.runUnclassifiedValue(() => spec.anchorTarget(current), 'drag: landing/target-unavailable')` (`kernel.ts:1433-1436`), with the reason stated at 1420-1431.

Therefore `FAILURE_TERMINAL_CALLBACK` at `kernel.ts:1642` is the only stage that can be classified after a result is committed, and no failure vanishes in the gap — each of the four steps has a live, non-silent channel (`notify` → the controller's reporter), it is simply the warning channel rather than the classified one. That is the treatment D-155 chose for the tail and D-49 chose for the measurement, and the join now agrees with both. **Property 2 holds in full.**

## 4. Property 3 — D-66 remains executable · **the behaviour holds; the coverage claim does not**

### 4.1 The behaviour: a terminal-callback fault cannot produce a second terminal · **holds**

Traced exactly, for a throw raised from inside `spec.finalized`:

1. `joinSettlement` calls `driver.runLeaf(() => spec.finalized(current), FAILURE_TERMINAL_CALLBACK)` (1640-1642). The throw is caught by the driver and reaches `failOperation`, which finds a live operation, no cancel latch, `reporting === false` and `phase === FINALIZING`, so it **enqueues** `FAILED` (`kernel.ts:795-799`). The enqueue re-enters an already-running drain and returns immediately (`kernel.ts:709-712`).
2. `joinSettlement` then enqueues `RETIRE` unconditionally (1646). **Queue order is now `[FAILED, RETIRE]`.**
3. The outer drain runs `handleFailed`: no cancel latch, operation matches, phase is `FINALIZING`, so it proceeds — `retireAttempts()`, builds the `SETTLED_FAILED` input carrying `stage` and the minted `DraggableError` (2091-2111), runs the report seam under `REPORTING` (2132-2135) where the behavior delivers `onError` (`sortable/spec.ts:1594`), then enqueues `ERROR_REPORTED` (2146). **Queue order is now `[RETIRE, ERROR_REPORTED]`.**
4. `RETIRE` runs first: the operation is retired and `clearOperationState()` nulls `current.operation` (`kernel.ts:462-472`).
5. `ERROR_REPORTED` runs last and is **stale**: `handleErrorReported`'s first guard `current.phase !== REPORTING || current.operation !== operation` (2187-2189) returns.

Probe **P-D** confirms step 5 empirically on `sortable.browser.test.ts:1849`: the recorded entry is `{ stage: 14, phase: 0, sameOp: false }` — `FAILURE_TERMINAL_CALLBACK`, phase `IDLE`, operation already retired. A further instrumented run of the same row printed `harness.calls` as `['invalidateInsertion', 'onStart', 'invalidateInsertion', 'resolveInsertion', 'onReorder', 'onFinish', 'onError']` — one terminal, one report, in that order.

So the consumer observes exactly one `onEnd` carrying the committed result and exactly one `onError`. **D-66's rule is satisfied at runtime, on both the accepted and the rejected arm.** Nothing D-166 removed was guarding this path: the deleted `failed` branch sat _before_ `finalized` and could never have been set by `finalized`'s own throw.

### 4.2 Both result rows exist, and both arms are present · **holds**

`sortable.browser.test.ts:1849` (accepted) and `:1864` (rejected) both survive, driven by a throwing terminal callback through the new `onFinish`/`onCancel` harness hooks (`:250-252` and the `Overrides` declaration at `:119-141`). The accepted row asserts `finishes` has length 1, `finishes[0]` is `accepted`, `cancels` is empty and `errors` has length 1; the rejected row asserts the consumer's own `'nope'` verdict survives. The tie-break's two arms are therefore still both witnessed as _outcomes_.

### 4.3 What does not hold: the rows do not discriminate, and three places say they do

This is finding **d166-1**, below. Neither of the two mechanisms that could rewrite or duplicate the result is falsified by these rows: probe **P-A** and probe **P-B** each removed one, and the behavioural suite stayed green.

## 5. Sanity check — I-24's strengthening · **holds**

**The old conditions have no surviving subject.** I-24 previously read _"When the authoritative measurement succeeds **and** the pin succeeds…"_ (`05:42` at `b91ce5c6`), with a third runner condition already struck by D-155. At `57827a2a`:

- _the pin succeeds_ — no subject. There is no write and no `failed` flag; `grep` for `failed` in `joinSettlement` returns nothing.
- _runner control relinquished_ — no subject since D-155; nothing in `src/` names a handle or a runner.
- _the measurement succeeds_ — **nothing branches on it for the agreement.** `measureTarget` returns `false` only when `settlementLive(attempt)` fails (`kernel.ts:1440-1442`), i.e. the controller was destroyed during `anchorTarget`; in that case there is no join and no presentation release _at the join_, and teardown owns the restore instead. When the measurement merely **throws**, `runUnclassifiedValue` yields `undefined`, `measureTarget` returns `true` (1455), the join runs, and the `finally` releases presentation unconditionally. `attempt.targetX === null` then branches `startTail` alone (`kernel.ts:1517`). So a failed measurement costs the interpolation and never the place — exactly what the new I-24 rationale asserts, and what `kernel.browser.test.ts` _should skip the tail and still terminate when the measurement throws_ pins.

The release itself is unconditional: `owned.presentation.dispose()` sits in a `finally` with no guard (`kernel.ts:1616-1623`), and disposal is latched (`lifetimes.ts:88-91`), so it runs exactly once on every path that entered the join.

**The I-25 dependency is unchanged and still the boundary.** I-25's row is byte-identical across the diff (`05:43`), and I-24 still closes with _"It also depends on I-25."_ I-24 does not now reach past it: the agreement it claims is produced by restoring the visual's inline styles and returning it to flow, and _where flow puts it_ is the committed position only while the semantic item is still a connected, consumer-owned keyed child — which is I-25's statement, owned by the sortable presentation strategy (`05:67`). A consumer who breaks I-25 falls to Q-12's degraded re-anchor (`05:504`), which is unchanged by this commit. The dependency is the same one, in the same direction, with the same owner.

## 6. Findings

### d166-1 · **Tier B** · D-66's replacement rows assert the outcome but falsify no mechanism, and three records claim otherwise

**Finding.** D-166's required property P2 — _"D-66's property keeps executable coverage… It must be re-anchored to a post-commit fault that still exists"_ — is recorded as resolved, with a named witness. The witness does not discriminate. Both surviving rows pass against a tree with either stage exclusion deleted.

**Current behavior / contract.** Three places make the claim:

- `00-index.md:520`, D-166's ledger row: _"D-66's existing committed result wins is re-anchored to it in both behaviors, **asserted by the second terminal that a removed stage-exclusion would publish**."_
- `tests/sortable/sortable.browser.test.ts:1834-1839`, the `describe` docblock: _"So the surviving mechanism is the stage exclusion, not the `??=` lookup… **Remove the exclusion and both rows fail** — the frame's result is rewritten to `canceled` and `ERROR_REPORTED` delivers it as a second end for one operation."_
- `tests/COVERAGE.md:446-447`, which lists the two rows as the surviving coverage for the post-commit set.

**Why it is a problem.** The claim is falsifiable and false, in both halves and for both candidate exclusions:

- _"the frame's result is rewritten to `canceled`"_ cannot happen from either exclusion. The behaviors' fallback is `draft.domain ??= …` (`sortable/spec.ts:1551`, `free-drag/spec.ts:764`), and the transaction opens with the committed `accepted`/`rejected` result already in `draft`, so `??=` preserves it whether or not the exclusion runs. Removing `sortable/spec.ts:1521` changes only `draft.recovery`.
- _"`ERROR_REPORTED` delivers it as a second end"_ cannot happen either, because on this path `ERROR_REPORTED` never reaches its stage test at all (§4.1, and finding **d166-2**).

A record that names a mechanism as the executable anchor of an invariant, when removing that mechanism costs nothing, is an unsound instrument: the next change to either exclusion will pass review on a green suite. This is Tier B rather than Tier A because no consumer observes anything different today — §4.1 establishes that the runtime rule holds — and Tier B rather than Tier C because the repository relies on `COVERAGE.md` and the ledger's _As landed_ clause as the statement of what is asserted.

Note this is **not** F-268 and does not restate it. F-268 records that the `??=` lookup line lost its first-party producer; that is accepted, out of scope here, and not commented on. This finding is about the _claim_ the implementation makes for the replacement rows it wrote — that removing an exclusion fails them — which is a separate, checkable statement.

**Evidence / reproduction.**

- Probe **P-A**: `src/sortable/spec.ts:1521`, `if (input.stage !== FAILURE_TERMINAL_CALLBACK) {` → `if (true as boolean) {`. Full suite: **65 files, 1226 passed, 60 skipped, no type errors** — identical to baseline. `sortable.browser.test.ts` alone: 130 passed.
- Probe **P-B**: `src/kernel/kernel.ts:2191`, `if (stage !== FAILURE_TERMINAL_CALLBACK && lifetimes) {` → `if (lifetimes) {`. Full suite: **1221 passed, 5 failed**, all five in `tests/bench/size.node.test.ts` › _the declared controls_ (byte deltas on the four free-drag rows and `kernel.js`). No behavioural row failed; running `sortable.browser.test.ts -t "a failure after the authored commit"` gave 2 passed, and `kernel.browser.test.ts -t "terminal"` gave 7 passed.
- The free-drag half of _"in both behaviors"_ is weaker still: the only free-drag row driving a throwing `onEnd` is `tests/free-drag/validation.browser.test.ts:228-246`, which asserts `stages(errors)` alone and makes no assertion about the published result or the terminal count.

**Required property.** D-66's _an existing committed result wins over a later fault, with its own reason_ must have at least one executable row that fails when the mechanism producing it is removed — and the records that name that row must name the mechanism it actually falsifies. Whether the right response is a new row, a corrected claim, or a routed elimination question about a guard with no witness is an architect's call, not this pass's.

### d166-2 · **Tier B** · the exactly-once terminal after a join-raised terminal-callback fault is produced by queue ordering, not by the stage exclusion the records name

**Finding.** For the one post-commit stage D-166 leaves standing, the guard that prevents a second terminal is the unconditional `dispatchKernel(RETIRE, …)` at `kernel.ts:1646` landing in the queue **ahead of** the `ERROR_REPORTED` that `handleFailed` later enqueues. `handleErrorReported`'s `stage !== FAILURE_TERMINAL_CALLBACK` exclusion (`kernel.ts:2191`) is never consulted on this path, because the function has already returned at its identity guard (2187).

**Current behavior / contract.** `handleErrorReported`'s docblock (`kernel.ts:2177-2182`) presents the exclusion as the operative guard: _"**One stage is excluded, and it is the one that cannot be double-published.** `FAILURE_TERMINAL_CALLBACK` means `finalized` already ran and threw; calling it again would deliver a second `onEnd`… and, since it would throw again, do so forever."_ D-166's ledger row repeats it as the assertion carrying D-66. And the comment at `kernel.ts:1643-1645` states the ordering resolution the other way round: _"The checkpoint it queued is ahead of this entry, so if it retires the operation first, this one is stale and ignored."_ The checkpoint is indeed ahead of the `RETIRE`, but it does not retire — it enqueues `ERROR_REPORTED`, which lands _behind_ the `RETIRE`. So the `RETIRE` runs first and it is the `ERROR_REPORTED` that is stale, which is the inverse of the sentence.

**Why it is a problem.** Two consequences, neither consumer-visible today. First, it is what makes **d166-1**'s claim false, so the two findings share a cause. Second, the surviving comment tells a later reader that the stage exclusion is load-bearing on this path; a change to the `RETIRE` dispatch — moving it, making it conditional, or making `ERROR_REPORTED` asynchronous, which `failOperation`'s comment at `kernel.ts:759-762` anticipates as a future — would silently move the actual guard while the documented one stayed in place. Tier B: the package's own account of a load-bearing sequence is wrong, and no test would notice.

**Evidence / reproduction.** Probe **P-D**, `handleErrorReported` instrumented to push `{ stage, phase: current.phase, sameOp: current.operation === operation }` on entry:

- `sortable.browser.test.ts:1849` _should keep the accepted result when the terminal callback throws_ → `[{ stage: 14, phase: 0, sameOp: false }]` — `FAILURE_TERMINAL_CALLBACK`, `IDLE`, operation already retired.
- `kernel.browser.test.ts:2733` _should publish the terminal from the error route, after the release_ → `[{ stage: 3, phase: 6, sameOp: true }]` — the exclusion's _other_ branch, live and taken.

Probe **P-B** independently: with the exclusion deleted outright, no behavioural row fails.

The queue mechanics behind it are `dispatchKernel`'s re-entrant enqueue (`kernel.ts:701-712`), `failOperation`'s dispatch of `FAILED` (795-799), `joinSettlement`'s unconditional `RETIRE` (1646), and `handleFailed`'s dispatch of `ERROR_REPORTED` (2146).

**Required property.** The mechanism that guarantees _exactly one terminal per started operation_ on the terminal-callback-fault path must be the one the code and the records name, and the comment at `kernel.ts:1643-1645` must describe the ordering that actually occurs. Whether the exclusion at 2191 retains a reachable subject at all is an elimination question and is routed, not answered here.

### d166-3 · **Tier B** · contract 06 still traces the deleted join write, its failure branch, and annotates it with I-24

**Finding.** `.plan/contract/06-vertical-sortable-trace.md` was not migrated by this commit and still describes the join as performing the write D-166 deleted — including the `[I-24]` annotation on the write itself, which is the invariant §5 above had to check.

**Current behavior / contract.** The settlement fence reads:

```text
[K]   from = lift.rendered
      ← sampled BEFORE the pin, which is what          (06:667-669)
        overwrites it.
[K]   lift.write(target.x, target.y)
      ← the authoritative pin, kernel-owned    [I-24]  (06:675)
      ↳ throws → FAILURE_RENDERER_WRITE, continue      (06:676)
[K] } finally { … }
[K] if a consequential failure was classified above:   (06:683-689)
      STOP *here*. The queued checkpoint drives
      REPORTING …
```

Two prose sentences on the same page carry the retired justification as well: `06:632` _"the join's pin decides correctness"_, and `06:636` _"teleports back into its slot when the join pins."_

**Why it is a problem.** Every one of those lines is now false about the shipped tree: there is no `lift.write` at the join, `FAILURE_RENDERER_WRITE` has no producer there (§2.3), and the `STOP here` branch is the deleted `failed` return. The `[I-24]` marker attaches the invariant to the statement that no longer produces it, which inverts the strengthening 05 records — a reader checking I-24 against the trace is told the agreement comes from a write. D-166's own §6 enumerated the vocabulary sites _"listed so none is found later"_ and 06 is not among them, so this is a site the disposition missed rather than one it deferred.

This is the second occurrence of the same failure on the same page within two days: **F-252** (`00-index.md:1085`, closed 2026-08-31) closed exactly this drift for D-85/D-165 and recorded the general shape — _"a page that opens by declaring itself illustrative and pointing at a normative document has no instrument holding it to that pointer, so it drifts exactly as far as the last reader's attention reached — and a fenced trace is the form a prose sweep reads past."_ The prediction held on the next commit.

Tier B rather than C: 06 declares itself illustrative and subordinate to 02 (`06:3`), so no consumer-facing behaviour turns on it, but it is a current-state contract document that an integrator or a later pass reads as the package's account of the lifecycle, and its `[I-24]` marker is load-bearing for exactly the invariant this commit changed.

**Evidence / reproduction.** `git diff --stat b91ce5c6..57827a2a -- .plan/contract/` lists `00`, `01`, `02`, `03`, `05` and not `06`. `grep -n "pin" .plan/contract/06-vertical-sortable-trace.md` at `57827a2a` returns lines 632, 636, 667-669, 675, 676. Compare the migrated equivalents at `02:1274`, `02:1288`, `02:1290` and `01:314`, all of which do state the post-D-166 shape.

**Required property.** The current-state documents must not describe the join as writing a position, and no passage may attach I-24 to a statement other than the presentation release. Whether 06 is swept, or given the instrument F-252's own closing sentence says it lacks, is an architect's call.

## 7. What this pass could not establish

- The size figures D-166 does not claim and `budget-rebases.md` records were not re-measured; probe P-B's five `bench/size` failures are noted only as evidence that those rows are byte controls, not behavioural witnesses.
- Whether `handleErrorReported`'s `FAILURE_TERMINAL_CALLBACK` exclusion has _any_ reachable subject anywhere in the tree was not exhaustively determined — §4.1 establishes only that the join path does not reach it, and probe P-B establishes only that no current test covers it. That is an elimination question and is routed with **d166-2**, not answered.
- Real-browser visual confirmation that the released element lands where flow puts it, beyond `kernel.browser.test.ts` _should travel the delta the release removed_ and the `landing origin` group, was not attempted.

## 8. Verdict

D-166's runtime delta is correct and complete. The write, its `runLeaf` wrapper, its `FAILURE_RENDERER_WRITE` producer and the `failed`-deferral branch are gone with no surviving caller, reader or obligation in the normative contract; the move path's write and its classification are untouched and independently witnessed; `ERROR_REPORTED` keeps live producers and was observed reaching the terminal; the join classifies nothing between the settlement's commit and `finalized`; a terminal-callback fault produces exactly one terminal; and I-24 holds unconditionally over I-25 as before.

The three findings are all about the **record of the change** rather than the change: two mechanisms the commit's own documents name as the executable anchors of D-66 turn out to falsify nothing (**d166-1**), the guard that actually produces the property is a queue ordering the code comment describes backwards (**d166-2**), and one current-state trace still walks the deleted write with I-24 attached to it (**d166-3**).

LSP plugin - unavailable.