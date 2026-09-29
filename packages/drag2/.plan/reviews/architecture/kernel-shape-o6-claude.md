# The kernel's shape, and whether `kernel/kernel.ts` is split (O-6)

**Canonical entries:** `drag2:O-6`, discharged by `drag2:D-199`; the construction-window finding is `drag2:F-432`. This record holds the evidence; the decision and the finding are stated in [`00-index.md`](../../contract/00-index.md) and are not restated here.

**Tree:** `9dcb62e1a`, on `drag2/fin-review2`. Every line number below is into `src/kernel/kernel.ts` at that tree and at no other.

**Scope, as set by the owner.** Close O-6 with the decision to keep `Kernel` as one state machine. Record the extraction rule and distinguish candidate mechanisms from approved extractions. Landing-tail ownership, resolution-attempt state, liveness guards and callback ordering stay in the kernel; only mechanics with a clear independent boundary and a justified bundle cost may move. Before recommending the teardown deduplication, confirm that the no-spec path keeps today's unconditional clearing of the operation and activation records. The comment pass is a focused pass that keeps local ordering proofs, with no target line count and no wholesale migration into the plan.

## What the size is made of

Non-blank lines at every commit touching the file. A line is a comment line if it is inside a `/* … */` block or begins with `//`, and a code line otherwise, so a trailing comment counts as code.

| Commit      | Date       | Code  | Comment |
| ----------- | ---------- | ----- | ------- |
| `c87ad854f` | 2026-08-01 | 1,085 | 441     |
| `02b66cf15` | 2026-08-01 | 1,129 | 521     |
| `39d0cc37d` | 2026-08-02 | 1,132 | 541     |
| `25fbeaa7b` | 2026-08-02 | 1,155 | 593     |
| `8c34da777` | 2026-08-07 | 1,280 | 756     |
| `452bdc574` | 2026-08-14 | 1,234 | 912     |
| `874b207e5` | 2026-08-15 | 1,235 | 929     |
| `9fe21685a` | 2026-08-16 | 1,246 | 947     |
| `bb07b7810` | 2026-08-22 | 1,246 | 947     |
| `9884b1fb1` | 2026-08-23 | 1,246 | 947     |
| `bfd2832db` | 2026-09-28 | 1,100 | 1,257   |

**The code is where it started, and the comments have nearly tripled.** Between `9884b1fb1` and `bfd2832db` the code shrank by 146 lines — the execution bracket, the frame transaction and the operation and activation records left or were consolidated in that interval — while the comments grew by 310. M-02's trigger (1,971 lines) and O-6's (2,468) were measured on the file's total length. Both measured growth that is almost entirely prose, so "split the file" was asked about a quantity a split would move around and not reduce.

## Why the state machine stays whole

The class does one thing at one level: it drives an operation through the committed phases, over a frame pair, through one error channel. The collaborators already taken out of it are the ones that have their own invariants: `ExecutionBracket` (the latch, the queue, deferred teardown), `SeamDriver` (prepare → commit → effect), `FrameTransaction`, the lifetimes, and `acquireLift`.

**Its size comes from its re-entrancy.** The kernel calls behavior or consumer code at about fifteen points, and after each call it has to ask again whether the controller is closed, whether the operation is the same one, and whether a cancel has been latched. At this tree that is 14 reads of `bracket.closed`, 11 `cancelRequest` sites, and the three named predicates `#preparationValid`, `#settlementLive` and `#joinLive`, alongside the inline guards. The precedence `DESTROY > CANCEL > FAILURE_CHECKPOINT` is decided from all of that state at once.

The 36 non-null assertions — `#spec!` ×20, `#operation!` ×11, `#activation!` ×4, `#attempts.settlementInput!` ×1 — are sound because of statement order inside the class, and the comments next to them say which order. Moving the handlers into separate modules would require one of two things. The first is exposing the state, which breaks the header's claim that every field is `#private`. The second is a context object passed between modules, which is the machinery [`CONTRIBUTING.md`](../../../../../CONTRIBUTING.md) §2.2 and §9 warn against. Either way, the ordering proofs would cross module boundaries.

**The one change that would really shrink the guard mesh is out of scope.** If every consumer callback were deferred to the drain boundary, most re-validations would go away. But `destroy()` would stop being a synchronous terminal barrier, and `onStart` could no longer cancel synchronously. That is a contract change, and it is recorded here only so nobody mistakes it for a refactor.

## Candidates, measured against the boundary

The kernel already follows the rule D-199 writes down: `armPointerInput`, `armCancelInput`, `acquirePointerCapture`, `acquireLift` and `thenOf` are mechanisms it calls. Each receives what it needs as arguments and decides nothing about when the kernel's state changes. Five further pieces were examined against that rule.

| Mechanism | Lines | What it touches in the kernel | Disposition |
| --- | --- | --- | --- |
| Static spec validation in `arm()` | 2426–2465 | Nothing: a pure function of `next` | **Candidate.** `arm()` keeps the position: before the first latch test |
| Click suppressor listener | 1103–1133 | The realm's document, the ingress signal, and the `#disarmClick` slot, which it also reads to clear itself | **Candidate.** The slot, the arm point (the threshold crossing) and both disarm points stay |
| The tail's keyframes: projection through `visualSpace` and the `animate` call | 1547–1566 | `#activation.visualSpace` and `#operation.visual`, read; `#tail`, written | **Candidate**, the narrowest of the three. `#tail`, `#cancelTail` and its two call sites, `#startTail`'s guards, the `landingTail` policy call and the `unwind` around `animate` stay |
| Thenable subscription inside `#openResolution` | 1736–1772 | Each exit calls `#settleResolution`, which reads and writes the attempt | **Retained.** Its body is the order of the consumer round-trip: `invoke` before `then`, and the first completion wins through the attempt's latch. `thenOf` is the part that meets the boundary, and it is already out |
| Activation acquisition, `#acquireActivation` | 1203–1282 | Writes `#activation`; orders the tail cancel, the pre-lift measurement and the lift | **Retained.** It is an ordering proof: the cancel before the measurement, and window 1 before the lift |

**The three candidates are candidates and nothing more.** None has a measured composition figure. The first and third each create a function with a single caller, which [`CONTRIBUTING.md`](../../../../../CONTRIBUTING.md) §2.1 accepts only when the boundary means something. For the spec validation it plausibly does: it is a fact about the spec rather than about the controller's liveness, which is the reason `arm()` already gives for running it before the latch test. For the tail keyframes the boundary is thinner — the projection is the only part that is not already a platform call — so it is the candidate most likely to fail on cost.

**The click suppressor changes retention if it moves, and that has to be stated.** Today the listener clears `#disarmClick` from inside itself, through `this.#disarmClick === disarm` at 1108. A mechanism that returns a disarm function cannot read the kernel's slot, so either that self-clearing stays in the kernel, or the slot may hold a disarm that has already fired until the next `pointerdown` or teardown replaces it. The second is sound, because calling a spent disarm aborts an already-aborted controller and does nothing. It does keep one closure and one `AbortController` alive for longer, so the choice belongs in the amendment that approves it.

## The teardown duplicate, and the no-spec path

`#runPhysicalTeardown` (638–665) runs steps 3–6 in the same order and with the same statements as `#retireOperation` (538–584). The latter's own docblock at 531 calls operation retirement "the seven-step teardown, minus steps 1, 2 and 7". The obvious deduplication is `try { this.#retireOperation(null); } finally { … }`.

**That form does not preserve the clearing, so it is not recommended.** In `#runPhysicalTeardown` the two record drops at 655–656 sit **outside** `if (this.#spec)`, so they run on every call. In `#retireOperation` they sit after an early `return` at 539–541 for `!this.#spec`. Routing teardown through `#retireOperation(null)` therefore skips the drops whenever no behavior is armed.

**The difference is observable on exactly one path.** Everywhere else, `#spec === null` implies both records are `null`, because:

- before `arm()` publishes the spec (2518), no ingress listener exists, so no operation can be minted;
- a `destroy()` in the construction window reaches teardown with both records still `null`;
- `#mintOperation`'s own failure path calls `#retireOperation(null)` with the spec armed.

**The exception is a failed `arm()` after the `pointerdown` listener is attached.** The spec is published at 2518 and the `pointerdown` listener is attached at 2520. The `command.types` loop that follows (2527–2533) runs foreign code in two places: `root.addEventListener` on a consumer-owned element, and the iteration of a behavior-supplied array. If that code synchronously dispatches an admitted press or command and then throws, an operation is minted with an armed spec. If it was a command, the queued `ACTIVATE` drains at the admission boundary, which also acquires the lift and inserts the placeholder. The catch at 2537 then calls `#unwindArm`, which retires the behavior, resets both frames, aborts ingress and sets `#spec = null` (2580). **It never disposes the operation's lifetimes.** Neither does a later `destroy()`: `#runPhysicalTeardown` skips disposal under `if (this.#spec)` and only drops the references. The operation's own listeners are on the realm's document (`pointer.ts`), under the motion and cancellation signals, and are not composed with the ingress signal. So they stay armed and keep the kernel alive, and after a command activation the visual stays lifted with the placeholder in place. That is recorded as F-432.

So today's unconditional drop is load-bearing on exactly the path where disposal was already skipped. The naive deduplication would additionally keep references to an operation nothing will dispose. **The deduplication is sound only in a form that keeps the drops unconditional**, and D-199 states that as a required property rather than as a shape. Whether F-432 is repaired is a separate question. It is reachable only through foreign code running inside `arm()`, which is the ground on which [`CONTRIBUTING.md`](../../../../../CONTRIBUTING.md) §1.1 declines to add defensive checks, and it is left open.

## The comments, examined and not counted

The comments do real work, and most of them should stay: the premises of the `!` assertions, the record-drop order in retirement, the reasons for the `finally` blocks, the two halves of the double validation, the ordering of the pre-lift measurement window, the queue-order argument for exactly one `onEnd`, and the publish order in `arm()`. Three kinds are defects, one instance of each at this tree:

- **Counts and relative positions that an unrelated edit falsifies.** Examples: "the fourteen `unwind` sites" (397, 439). This controller's guard is called at ten sites here and at one in `presentation.ts` through `acquireLift`. Fourteen is reached only by adding the three sites in the two behaviors, which build their own guard over their own channel. The number cannot be checked from where it is written, and the teardown deduplication would change it. Others: "Three sites reach this" (404), and "The entry check fourteen lines up" (2244), where the check spans 2227–2232.
- **History narration**, which the rule on comments forbids outright: "since the gate went it carries no capability either" (1351).
- **Arguments against code that is not there**, where the code can be read without them. Examples: "Four checks that look like they belong in this loop do not" (2442–2458), and the "Bare, and not a `#reportLive()`" passage (2251–2257).

**No target line count is set, and none should be.** The pass succeeds when every remaining comment states something the code beside it relies on. Deleting a proof to reach a number would reverse the one thing the comment mass is good for.