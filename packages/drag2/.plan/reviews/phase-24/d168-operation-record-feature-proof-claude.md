# D-168 feature proof: the operation record, at runtime

**Read at `d51d59c6`**, branch `drag2/fin-review`, range `7f6d1851..d51d59c6`. Working tree clean at the start and end of the pass apart from another pass's untracked report, which this pass did not open. **No production source was written**; every mutation and probe below was reverted with `git checkout` and the tree re-verified green.

**Baseline.** `vitest run -c vitest.config.ts` on the clean tree at `d51d59c6`: **65 files, 1 227 passed, 60 skipped, 0 failed, no type errors.**

---

## Scope

**Covered, at runtime.** All six required properties in the task, exercised against a temporarily instrumented `src/kernel/kernel.ts` (thirteen probe points around `mintOperation`, `acquireActivation`, `retireOperation` and `runPhysicalTeardown`, reporting `operation`/`activation`/`cancelRequest`/`current.operation`/`current.phase`/`pinned`) driven by a throwaway browser test:

- **P1** admission-only — press, cancel at `PENDING`, activation never reached;
- **P2** activation failure — `setPointerCapture` throws, `failOperation(FAILURE_ACTIVATION, error)` at the tail of `acquireActivation`;
- **P3a** `retireOperation` path — full press → threshold → release → finalize;
- **P3b** `runPhysicalTeardown` path — `destroy()` mid-drag;
- **P4** reentrancy — `host.cancel()` raised from `resetFramePart`, i.e. from **inside** `scrub`;
- **P5** reentrancy — `controller.destroy()` raised from `spec.retire`, nesting `runPhysicalTeardown` inside `retireOperation`.

**Covered, by mutation.** Three targeted mutations of the retirement ordering, each run against the whole suite and reverted.

**Covered, statically.** Record escape analysis over every `dispatchKernel` site and every `operation`/`activation` occurrence; verification that each citation the decision document makes is real and current at `d51d59c6`.

**Not covered.** Bundle-size methodology beyond confirming the declared rows pass; `ActivationScope`'s behavior-facing contract; allocation and hot-path figures from D-168 §6; anything in `sortable/` or `free-drag/` beyond the suite passing. F-274, F-231, the class/factory representation question and the two pre-existing `prefer-destructuring` errors were out of scope and are not touched — this change did not alter the evidence under any of them.

---

## The six properties: verdict

| # | Property | Verdict |
| --- | --- | --- |
| 1 | Complete operation construction before commit | **Holds**, verified at runtime |
| 2 | Activation constructed separately, after activation | **Holds structurally**; see `fp-2` for the "successful" half |
| 3 | Failed activation leaves the operation alive without _partial_ activation state | **Holds** — the record is complete-or-absent, never partial |
| 4 | Attempt replacement still possible during a live operation | **Holds**, mechanism untouched |
| 5 | Frame identity remains the authority for stale/current work | **Holds**, verified at runtime and statically |
| 6 | Records cleared only as the final retirement transition, after `scrub(current)` | **Holds in the shipped code**; the added witness does not test it — see `fp-1` |

**Property 1.** Probe `mint:before-commit` reports `operation = REC`, `activation = null`, `current.operation = null`. The record is complete before the identity reaches the frames, and `lifetimes` is constructed inside the literal (`kernel.ts:1011-1017`), so the non-nullability is real rather than asserted.

**Property 4.** `retireAttempts()` survives at three sites — `kernel.ts:546`, `:630`, and **`:2139` inside `handleFailed`, mid-operation**, immediately above the comment _"The settlement is **replaced**"_ and the fresh `settlementInput`. The attempts keep their own identity channel: `settlement === attempt` (`:1432`), `resolution !== attempt` (`:1742`, `:1984`). Nothing in the diff touches any of it. The decision document cited line 2092 for the `handleFailed` call; at `d51d59c6` it is 2139 — the shift is the diff's own, the mechanism is intact.

**Property 5.** Every queued dispatch carries identity or an unrelated payload, never a record: `dispatchKernel(CANCEL | ACTIVATE | START_COMMITTED | RETIRE | RELEASE, current.operation)`, `FAILED` with a `FailureCheckpoint` whose `operation` field is the identity local (`kernel.ts:839`), `RESOLUTION_SETTLED` with an attempt, `ERROR_REPORTED` with a checkpoint. The only whole-record locals in the file are `const live = operation!` at `:1245` and `:2004`, both synchronous and neither deferred. Runtime confirmation that the records are _not_ the authority: at `mint:before-commit` the record exists while `current.operation` is still `null`, and throughout P1's retirement the record is readable while the frame has already been scrubbed.

**The `operation!` non-null assertions introduced at `:773`, `:821`, `:2070` are sound.** They rest on `current.operation !== null ⟹ operation !== null`. `operation` is written before `commit()` and nulled only at the two retirement sites, both after `scrub(current)`; `retireOperation` early-returns on `!spec` without nulling; and the sole `spec = null` (`:2474`) is the arm-failure path, before any operation exists. No probe reached the state.

---

## Findings

### fp-1 — Tier B — The new reentrant-retirement witness does not test the ordering it claims to test

**Finding.** `tests/kernel/kernel.browser.test.ts:3665` (`'should still hold the operation while retirement runs'`) reenters the kernel only through `spec.retire`, which is **step 4** of `retireOperation` — three steps before `scrub(current)`. The clears are step 7. The test therefore cannot distinguish "cleared after the scrubs" from "cleared before the scrubs", which is the one ordering D-168 §3 calls normative.

**Current behavior / contract.** The test's own inline comment at `:3681` asserts the coverage it does not have:

```ts
// A record dropped before the scrubs would fail this re-entry outright,
// and `unwind` would turn that into a report rather than a throw.
expect(harness.reports).toEqual([]);
```

**Why it is a problem.** D-168 required property 1 — _"The transition is the **last** statement of retirement, after `scrub(current)`, so `current.operation !== null` continues to imply the state is readable"_ — is the load-bearing ordering claim of the decision, and the commit presents this test as its witness. The shipped ordering is correct, so nothing a consumer observes is wrong today. What is wrong is the instrument: a later pass that moves the clears ahead of the scrubs gets a green suite and a comment telling it the case is covered.

**Evidence / reproduction.** Three mutations, each applied to a clean `d51d59c6`, run against the whole suite, then reverted.

|  | Mutation | Result |
| --- | --- | --- |
| **A2** | `retireOperation`: the three clears moved to immediately before `scrub(current)`, comment block left in place | **Green.** 1 222 passed, 0 behavioral failures. Only the five `tests/bench/size.node.test.ts` control rows moved (a 2 B minifier shift from reordering), which is not a behavioral catch |
| **C** | `runPhysicalTeardown`: the same move, inside the `if (spec)` block, before `scrub(current)` | **Green.** Identical outcome — only the five size control rows |
| **B** | `retireOperation`: the clears moved _above_ `unwind(spec.retire)` (step 4) | **Red, for the right reason.** 1 failed / 170 passed on the kernel file: `DraggableWarning: drag: unwind/step-failed` caused by `TypeError: Cannot read properties of null (reading 'cancelRequest')`, failing at `:3683` |

So the boundary the test actually pins is **step 4**, not step 6.

**The mechanical reason no test catches A2 or C, which qualifies D-168 §3's rationale.** `scrub` runs `frame(target)` _before_ `active.resetFramePart(target)` (`kernel.ts:522-527`), so `current.operation` is nulled before any behavior code inside the scrub can run. Between a step-6-adjacent clear and `frame(current)` there is no reentrancy point at all — the window D-168 §3 describes as _"the one window in which a guard passes and the state it authorises is gone"_ is zero-width when the clear is moved only as far as immediately before `scrub(current)`. The genuinely observable boundary is step 4 (`unwind(spec.retire)`) and step 5 (`unwind(operation.lifetimes.dispose)`). Probe P4 confirms the scrub-internal side directly: a `host.cancel()` raised from `resetFramePart` sees `current.operation === null` and returns on the `!current.operation` guard before reaching `operation!`, producing zero reports.

**Required property.** Either the witness must fail when the clears are moved ahead of `scrub(current)` — the property D-168 states — or the property must be restated at the boundary that is actually observable (after `spec.retire` and after `lifetimes.dispose`) and the test's comment corrected to match what it pins. **Which of the two is right is a decision about D-168's own text and belongs to the architect, not to this pass.**

---

### fp-2 — Tier C — A failed activation leaves a complete `ActivationRecord` on the live operation

**Finding.** `activation` is assigned at `kernel.ts:1284`, but `acquireActivation` can still throw afterwards — `throw new Error('drag: activation/root-disconnected')` at `:1293` and `acquirePointerCapture` at `:1296`. Both land in the `catch` that calls `failOperation(FAILURE_ACTIVATION, error)` and returns `null`. The operation survives, as it must, **with `activation !== null`**.

**Current behavior / contract.** The `ActivationRecord` docblock (`kernel.ts:222`, carried over from D-168 §2) says the pair exists so that `activation === null` _"**names** the state an operation sits in before it activates"_. After a capture failure the operation is pre-activation in every behavior-visible sense — `activation.effect` never ran, the behavior was handed no `ActivationScope` — yet `activation` is set.

**Why it is a problem.** Only internally. The record is **complete, not partial**, so the property the task states as #3 holds: there is no half-built `Activation`, and the pair shape is strictly better here than the flat set it replaced. But the docblock's stronger reading — `activation === null` ⟺ _not yet activated_ — is not true of the shipped code, and a later reader who writes `if (activation)` to mean "the behavior knows about this activation" will be wrong on the failure path.

**Evidence / reproduction.** Probe P2, `setPointerCapture` throwing `no such pointer`:

```
{ label: "activation:record-assigned",     op: "REC", act: "ACT", frameOp: 1, phase: 1 }
{ label: "activation:catch-before-fail",   op: "REC", act: "ACT", frameOp: 1, phase: 1 }
{ label: "activation:catch-after-fail",    op: "REC", act: "ACT", frameOp: 1, phase: 6 }
{ label: "retire:after-scrub-draft",       op: "REC", act: "ACT", frameOp: null, phase: 0 }
{ label: "retire:exit",                    op: null,  act: null,  frameOp: null, phase: 0 }
```

**This is not a regression.** At `7f6d1851` the three flat fields `originRect`, `lift` and `visualSpace` were assigned at exactly the same point, before the same two throwing statements, and survived a failed activation identically. The assignment point is unchanged by the diff; only its spelling is. The existing test `'should classify a capture failure as an activation failure'` (`:1232`) covers the classification and continues to pass.

**Required property.** Either `activation` is assigned only once `acquireActivation` cannot fail, or the docblock states the actual invariant — that the record is complete-or-absent, and that a failed activation retains it so the lift session it holds stays reachable for the disposal already registered at `:1285`. **The trade-off is the architect's: moving the assignment past the capture block changes which object owns the lift between `presentation.use` and the throw.**

---

## Null results, stated

- **Property 6 holds in the shipped code, at both call sites.** `retire:after-scrub-current` and `retire:after-scrub-draft` both report `op: "REC", act: "ACT"` with `frameOp: null`; `retire:exit` reports both `null`. `teardown:before-clear` reports `op: "REC", act: "ACT"` with the frames already scrubbed, `teardown:exit` both `null`. `pinned` clears with them at both sites, as `clearOperationState` did.
- **No Tier A finding.** Nothing a correctly integrated consumer observes differs from `7f6d1851` on any path this pass exercised.
- **Reentrancy is clean.** P4 (cancel from `resetFramePart`) and P5 (destroy from `spec.retire`, nesting `runPhysicalTeardown` inside `retireOperation`) both produced **zero reports** and a coherent trace: the nested teardown found `op: null, act: null` already and cleared idempotently.
- **The §3 "one genuine atomicity gain" is real but currently unexercised.** Retirement nulls the _bindings_; it never mutates a dropped record, so a held reference stays internally coherent. No current call site holds a whole record across reentrant code — `joinSettlement` (`:1632-1633`) and `runMoved` (`:1839`) still snapshot _fields_, exactly as before — so the gain is a property of the shape available to future code, not one any present path depends on. Reported as an observation, not a finding.
- **The size gate was honoured.** No `budget` value moved in `bench/size/measure.ts`; five `control` values were re-declared, which is what a kernel-wide change requires. All fifteen rows pass on the clean tree.

---

## Method

Mutations and probes were applied to the working copy with a Node script, run under `npx vitest run -c vitest.config.ts`, and reverted with `git checkout src/kernel/kernel.ts`. The instrumented build exposed a `globalThis.__d168` sink; the probe test file `tests/kernel/zz-probe-d168.browser.test.ts` was deleted after the pass. `git status --porcelain` is clean at `d51d59c6` apart from this report and one untracked report belonging to another pass, which was not opened. Every line number cited above was re-read at `d51d59c6` rather than taken from the decision document, which was written against `74754d26`; where the two disagree the shift is noted.

**LSP plugin — unavailable.** Probed twice via `ToolSearch`; no LSP tool was surfaced. Symbol work fell back to `grep` over `src/kernel/kernel.ts`, which was adequate here: every field of both records is `createKernel`-local, so the reference set is one file and the census is exhaustive by construction.