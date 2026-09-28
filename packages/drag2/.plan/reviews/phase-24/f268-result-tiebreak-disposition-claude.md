# The post-commit result tie-break after D-166

**Architect disposition, 2026-09-01. Phase 24 — F-268, raised while landing D-166.** Contract only; no implementation, and no runtime change is opened. Answers two questions: does `draft.domain ??= …` still express a necessary rule, and should a classified fault arriving after a result exists drive `ERROR_REPORTED` into another terminal.

**The tie-break is retained, and F-268 asked the wrong question about it.** It is not a case handler waiting on a producer; it is the mechanism that makes I-31 **total**, which is how D-66 answered Q-14. **No second terminal is ever published** — verified by probe, not by reading — so there is no mismatch between the diagnostic and terminal channels. **No `D-*` is minted.** Two defects are recorded: F-269, both behaviors' comments name a producer that cannot reach the line and omit the ones that can; F-270, the kernel states the wrong mechanism for its own exactly-once guarantee.

## 1. Why the producer question is the wrong frame

D-66 answered Q-14 by **totality**, and [05](../contract/05-lifecycle-invariants.md) §Q-14 says so in the row itself:

> **The tie-break is what made the answer total**: _existing result wins, otherwise `canceled`_ collapses the two hard cases — failure before a domain result, failure after the authored commit — into one lookup on the frame, **so no stage carries its own terminal policy**.

A total mapping does not stop being total when one of its inputs gets rarer. It stops being total when the lookup is replaced by a branch — and an unconditional `draft.domain = …` is exactly that branch, reintroducing the per-stage terminal policy D-66 removed. So the question _"which producer still reaches this line"_ cannot settle it, and D-166 narrowing one producer set could not have falsified it. **Both of D-66's hard cases are still live**: failure before a result is the ordinary path a `moved` write takes, and failure after the authored commit is §2 below.

This is also why I-31 is tier **B** and not a behavior obligation. The behaviors implement its totality; they do not get to decide it per stage.

## 2. What actually reaches the line with a result already committed

Established by probe against the kernel harness at `441d585a`, not by reading. Three candidate shapes, and they do not agree with what the code says about them.

**(A) A behavior's `settlement.effect` failing after the commit — reachable, and the value decides the operation's only terminal.**

`runCore` commits between `prepare` and `effect` and labels the outcome itself: `return SEAM_EFFECT_FAILED; // classified, from the committed state`. Observed trace, with a settlement `prepare` that writes `{type:'accepted'}` and an `effect` that throws:

```
settlement.prepare:42 → settlement.effect ✗ → settlement.prepare:44 (stage=8, domain={"type":"accepted"}) → settlement.effect → finalized → end-domain={"type":"accepted"}
```

The join never runs, so **no terminal has been published yet**. The `??=` finds the committed result, keeps it, and `ERROR_REPORTED` publishes it as the operation's **one and only** terminal. Under an unconditional assignment the consumer is told `canceled` for a reorder its own data already took — D-66's named hazard, produced 100 % of the time this path fires.

**(B) `host.fail` from inside `finalized` — reachable; the line runs, its value is not observed.**

`finalized` runs inside `runLeaf(…, FAILURE_TERMINAL_CALLBACK)`, so a phase is open and `requestFailure` classifies with the **caller's** stage rather than the leaf's. Observed:

```
settlement.prepare:42 → settlement.effect → finalized → host.fail(8) → settlement.prepare:44 (stage=8, domain={"type":"accepted"}) → settlement.effect
```

The tie-break runs with a committed result, `onError` is delivered by the reporting seam, and **no second `finalized` follows**. See §3 for what stops it.

**(C) An action dispatched by the terminal callback — not reachable.** The shape both behaviors' comments name explicitly. Observed:

```
settlement.prepare:42 → settlement.effect → finalized#1 → action.prepare:0 ✗ → DraggableWarning: drag: failure/checkpoint-stale
```

The action runs and throws, but `dispatchKernel(RETIRE, …)` was enqueued the statement after `finalized` returned, so the FIFO drain retires the operation before the checkpoint is applied and `handleFailed`'s own guard demotes it. `settlement.prepare` is never called with `SETTLED_FAILED` at all.

**So the enumeration in the source is wrong in both directions**: it names the one shape that cannot arrive and omits the one where the value decides what the consumer is told. That is F-269.

**On tiers, stated rather than glossed:** (A) and (B) are both behavior-tier, and neither first-party behavior exercises either today — both settlement effects only `notify`, which swallows, and neither calls `host.fail` from `finalized`. That does not make them hypothetical. `./kernel.js` is a published entry that exports the `FailureStage` values for the stated reason that _"a behavior author calls `host.fail(stage, error)` and cannot do so without naming one"_, and `settlement.effect` is a published slot the kernel classifies from a state it names. **A rule about what the library tells a consumer is not scoped to which tier trips it**, and this one is wrong silently: the data is reordered and the terminal says `canceled`.

## 3. The second terminal is never published, and the reason is not the one the kernel gives

`handleErrorReported`'s docblock:

> **One stage is excluded, and it is the one that cannot be double-published.** `FAILURE_TERMINAL_CALLBACK` means `finalized` already ran and threw; calling it again would deliver a second `onEnd` for one operation.

On path (B) the terminal has already run and the checkpoint carries a **different** stage, so the exclusion does not apply — and there is still no second `onEnd`. What stops it is the guard two lines above, `current.phase !== REPORTING || current.operation !== operation`: a checkpoint raised inside `finalized` is enqueued **before** `dispatchKernel(RETIRE, …)`, its `ERROR_REPORTED` is appended **after** it, so `RETIRE` always intervenes and retires the operation first.

The property holds, deterministically, and needs no new mechanism — **but it rests on queue ordering that nothing states**, while the code states a stage exclusion that does not cover the case. The exclusion's own premise, _"the one stage that means `finalized` already ran"_, stopped being an exact proxy the moment a behavior could classify with another stage from inside the terminal callback — which is not something D-166 changed. `failOperation`'s comment already contemplates _"making `ERROR_REPORTED` asynchronous later"_, and that is precisely the change this unstated ordering would not survive. That is F-270.

**No runtime change is opened by either finding.** The guard that enforces exactly-once already exists and is already load-bearing for the stale case; adding a second mechanism for a property one mechanism decides is the duplication this package declines. What is owed is that the enforcing site say what it enforces.

## 4. What is decided

- **The tie-break is retained, unchanged.** It is I-31's totality mechanism under D-66, not machinery whose producer disappeared. No `D-*` is minted, amended or superseded, and no decision's requirements change.
- **F-268 is closed by analysis.** Its premise — _nothing between settlement commit and the terminal callback classifies now_ — is falsified by (A): the settlement seam's own effect phase classifies from the committed state, before the join, before any terminal. Its conclusion that the line lost first-party coverage stands and is not the deciding fact.
- **A classified fault after a result exists should drive `ERROR_REPORTED` into a terminal, and does not drive a second one.** On (A) it drives the first and only terminal, which is D-66's whole point; on (B) it is refused by the retirement guard. The channels stay orthogonal (D-60) and no deeper mismatch exists.
- **F-269 is recorded** against `src/sortable/spec.ts` and `src/free-drag/spec.ts`. **Required property**: the comments must enumerate producers that can reach the line — a `settlement.effect` failing after the commit, and a behavior's `host.fail` from inside the terminal callback — and must not name a dispatched action, which is demoted stale. They must **cite** I-31 and D-66's totality argument rather than restate it, which is that row's own rule (D-83, F-75).
- **F-270 is recorded** against `src/kernel/kernel.ts`. **Required property**: the site that publishes the failure-path terminal must state both things that keep it exactly-once — the stage exclusion, and the retirement that any checkpoint raised inside `finalized` is enqueued behind — so that the ordering the property depends on is visible to a pass that changes `ERROR_REPORTED`'s scheduling.

**Not decided here**, and unchanged: F-265, free drag's open `accept()` obligation, and F-203.

## 5. Method

Read F-268's ledger row and the D-166 review summary; read `joinSettlement`, `failOperation`, `handleFailed`, `handleErrorReported`, `dispatchKernel`, `settlementTransition` and `measureTarget` in `src/kernel/kernel.ts`, `runPhase`/`runCore`/`runLeaf`/`requestFailure` in `src/kernel/seams.ts`, `drain`/`enqueue` in `src/kernel/queue.ts`, both `??=` sites and both `finalized` and `settlement.effect` implementations, both public controller surfaces, and `package.json`'s `exports`; read I-31 and Q-14 in contract 05. **Three shapes were then driven as temporary probes against `tests/kernel/kernel.browser.test.ts`'s harness and the file was restored**; every trace quoted above is observed output, and no test or source file is modified by this pass.