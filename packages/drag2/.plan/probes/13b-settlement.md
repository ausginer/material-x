# Probe 13b — the settlement / authored-presentation protocol

Two cases were routed here. **They do not get the same verdict.**

| Case | Verdict |
| --- | --- |
| **B-1** — the `presentationReady` obligation set | **Goes to Phase 14.** The SPI expresses the protocol; it distributes it badly, and its failure modes are a 500 ms silence and a nothing. |
| **B-2** — settle-time `landingTiming()` (ledger L-6) | **It fits. No contract revision.** The capability is reachable today through `landing({ run })`. What is missing is ergonomics, and that belongs to Phase 15 or 22. |

Typed probe: [`packages/drag2/docs/probes/13b-settlement.ts`](../../../../packages/drag2/docs/probes/13b-settlement.ts). Same rules as 13a: `@ts-expect-error` is the executable half, and `R-*` rows are runtime facts with citations.

---

## B-1 — the authored-presentation protocol

### The obligations

`presentationReady` requires the consumer to

1. create a promise **before** knowing a render will happen,
2. supersede a previous expectation without dropping it,
3. resolve it from a layout effect, and
4. never lose one.

All four are visible in `createCommitTracker` (`packages/drag2/src/sortable.stories.tsx:34-56`). The identical helper is in the shipped package's stories, so **the burden is inherited, not a drag2 regression** — the freeze was premature for this, but the rewrite did not introduce it.

### What fails

| # | Claim | Proved by |
| --- | --- | --- |
| **N-1** | Holding a gate yields nothing back. `holdForReadiness` returns `void`, so the kernel cannot issue a token. The promise must be manufactured on the far side and passed _in_ — obligation 1, and the root of the other three. | compile |
| **N-2** | There is no request channel. `SettlementScope` has exactly two members; nothing lets the kernel say _"tell me when the authored DOM exists"_, which is the direction the information naturally flows. | compile |
| **N-3** | `PreparedSettlement.ready` has two states where the protocol has three. `PromiseLike<void> \| null` says _wait_ or _do not wait_; it cannot say _expected, not yet promised_ — the state the consumer is actually in when `onReorder` returns, and the one it papers over with a promise it may never resolve. | compile |

### The failure modes, which are the actual case

- **R-1 — the only signal is a timeout.** A violated obligation is indistinguishable from a slow render until `config.readinessTimeout` elapses, then the operation fails with `FAILURE_PRESENTATION_READY`. Already pinned executably: `packages/drag2/tests/kernel/kernel.browser.test.ts:1793-1800` and `:2102-2114`.
- **R-2 — a hold that is never taken cannot be detected at all.** Sealing catches a hold taken _late_; it cannot catch one never taken. Contract 00 §F-6 was weakened from a structural claim to a **test obligation** for exactly this reason, discharged by `tests/support/gates.ts` — a fixture-level witness, not a runtime guarantee. A consumer that skips the gate finalizes early and every ordinary assertion still passes, because the final DOM is the same.

**R-1 and R-2 are the case.** Not "the API is awkward" — the protocol's two failure modes are a half-second of silence and no signal whatsoever, and both are consumer-owned.

### What must not be lost

Contract 05 is explicit: the two gates are **independent**, and a resolution that _returns_ a promise rather than awaiting one is what lets the authored re-render overlap the landing animation instead of serializing behind it. In the SPI that property is structural — `holdForReadiness` and `holdForLanding` are separate members and `settlement.effect` returns `void`. **A design that loses the overlap is not a simplification** (P-1 in the probe).

### Candidates — enumerated, not chosen

Judged on two properties: does the authored render still overlap the landing animation, and is a violated obligation visible before the timeout?

|  | Candidate | Overlap | Obligations removed | Failure visible early |
| --- | --- | --- | --- | --- |
| **C-1** | Keep `presentationReady` as-is | yes | none | no |
| **C-2** | Kernel-issued per-operation **readiness token**: `holdForReadiness(): ReadinessToken` with `commit()` / `abandon(reason)` | yes — nothing awaits, `effect` still returns `void` | 1, 2, 4 | yes — an unresolved token is a thing the kernel holds and can name |
| **C-3** | Declare intent in the resolution; resolve through a controller method | yes | 1, 4 | partly |
| **C-4** | Kernel observes the commit itself (a frame, or a `MutationObserver`) | yes | all four | n/a |
| **C-5** | Keep the promise, ship a first-party tracker helper | yes | none — relocated | no |

Notes that matter more than the table:

- **C-3 reintroduces obligation 2.** A controller-level resolve has no per-operation identity, so a late call can resolve a superseded operation's gate. That is the supersession problem moved, not removed.
- **C-4 is refused by an existing normative rule, not by taste.** Acceptance is never inferred from DOM mutation or elapsed time (contract 05; the shipped package's `onReorder` contract says the same). A kernel that watches for _a_ mutation cannot tell the authored render from any other one.
- **C-5 is honest about being a band-aid.** It relocates the four obligations into first-party code without changing who is liable when the helper is misused, and it costs bundle bytes in every consumer that imports it.
- **C-2 is written out in the probe** because it is the one that inverts _creation_, which is where obligations 1, 2 and 4 come from. Writing it out is not a nomination. Its open costs: a token is an allocation per settling operation (M-1's frame-copy budget has no room assumed for it), and obligation 3 survives — the call still belongs in a layout effect.

### What Phase 14 must answer

1. Which candidate, and whether the overlap property is preserved _structurally_ or only by discipline.
2. Whether a never-resolved gate gets its own `FailureStage`, distinct from the timeout, now that the kernel could tell the two apart.
3. Whether `abandon(reason)` is a settlement outcome or a failure — it is the only new terminal shape any candidate introduces.
4. Whether F-6's test obligation can be promoted back to a structural claim under the chosen shape. If it can, that is the strongest argument available for changing anything here.

---

## B-2 — settle-time landing timing: it fits

Ledger L-6 recorded settle-time `landingTiming()` as "the one shipped capability drag2 currently cannot express". **That is wrong, and the ledger has been corrected.**

`LandingStart` is a public exported type, and `landing({ run })` already accepts a full replacement runner (`packages/drag2/src/sortable/landing.ts:35`, `:44-46`). The kernel invokes the runner during **arming**, which happens after `settlement.effect` has returned and after `anchorTarget` runs (`src/kernel/kernel.ts:1208`; request → seal → arm). That is precisely the moment the shipped package read `landingTiming()`: after the placeholder returned home on the rejected path, and after the home target resolved for free drag.

The probe proves it by compiling a runner that reads its timing inside `start`, against the real, unmodified `LandingStart`. Nothing in the contract is involved.

**What remains is ergonomics, and it is real.** A consumer who only wants a distance-scaled duration currently has to reimplement the default runner, losing the reduced-motion collapse, the retarget replay and the generation guard (`src/sortable/landing.ts:62-146`). The fix is a public-option change — `duration: number | (() => number)`, or a `timing?: () => AnimationTiming` read inside the default runner — and it belongs to Phase 15 or the Phase 22 refinement pass.

**It must not consume a slot in the Phase 14 revision.** Carrying a feature-option question into a contract revision is how a revision grows.

---

## What this probe does not claim

- That C-2 is the answer. Phase 14 chooses.
- That B-1 is a _correctness_ defect. Every shipped and ported story works. It is a distribution-of-burden defect with two bad failure modes, which is a sufficient basis for a revision and is not the same claim.
- That B-2's ergonomic gap is unimportant — only that it is not a contract question, and that saying so is what keeps Phase 14 to one revision.