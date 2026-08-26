# Phase 13 — SPI pressure probes

The three failing executable cases contract 00 §Normative precedence requires before the frozen SPI may change. Produced by `plan.md` phase 13; consumed by phase 14, which revises the contract **once** against all three together.

Each probe pairs a write-up here with a typed probe under [`packages/drag2/tests/probes/`](../../../../packages/drag2/tests/probes/). The typed half is the executable half: `tsc` errors on an unused `@ts-expect-error`, so a green `npx just typecheck` in `packages/drag2` is a standing assertion that every negative claim still fails to compile. A prose finding cannot do that, which is the whole reason 00 asks for a case.

| Probe | Question | Result |
| --- | --- | --- |
| [13a](13a-discrete-input.md) | Can the frozen SPI express discrete (keyboard) input? | **No** — 4 negatives. The gap is confined to ingress and admission. |
| [13b](13b-settlement.md) | Is the authored-presentation protocol in its final form? Can landing timing be read at settle time? | **Split.** The protocol goes to Phase 14 (3 negatives). Settle-time timing **fits** — ledger L-6 corrected. |
| [13c](13c-free-drag.md) | Does a second behavior fit the seam set? | **Mostly.** A complete free-drag `BehaviorSpec` compiles; 2 structural gaps, 6 questions closed as "it fits". |

## What Phase 14 decided — 2026-08-04

All four are answered; the contract is revised and re-frozen. The reasoning, including where the changes turned out to depend on each other, is [`contract/02`](../contract/02-kernel-behavior-contract.md) §Where the four changes touch each other.

| Inherited | Decision |
| --- | --- |
| 13a — a lifecycle-intent vocabulary | **D-32: a second admission member**, `command: { types, admit(event, draft) }`. Not a vocabulary and not an intent protocol — the gap was that a behavior could not be _asked_ a question synchronously, not that it could not _ask_ for a transition. It adds **no** `KernelHost` member. |
| 13b — a replacement protocol, or a recorded decision to keep it | **D-33: candidate C-3.** The resolution declares (`accept({ presentation: true })`), the controller acknowledges (`controller.ready(request)`), and the request is the per-operation identity. C-2 — a kernel-minted token — was chosen first and rejected at Checkpoint C; see below. |
| 13c N-1 — a parameterized staged type | **D-34: `BehaviorSpec<Part, Activation extends {} = true>`.** |
| 13c N-2 — the visual's rendered delta | **D-35: no seam.** The lift session records what `write(x, y)` rendered. |

**Every negative assertion in all three typed probes still fails to compile**, and that is deliberate rather than incidental — the revision adds no ingress member to the host, no `dispatch` return value and no rendered-delta seam. (`KernelHost` does gain `presentationCommitted` from D-33; none of the probes asserts against it.) 13c N-2's _annotation_ is now misleading — it says no seam reports the delta, which is true, and implies that is the defect, which is no longer the case; correcting it is a Phase 15 hygiene item.

**13c's `constrain()` was corrected in place** (Checkpoint C, C-07): it returned a `Point` per pointer sample while its own comment claimed the path allocated nothing. The arithmetic is now two scalar functions feeding `lift.write`. The expressibility result is unchanged; the cost claim was wrong, and a type probe should not have been carrying one.

## Why 13b's C-2 was chosen, then rejected

Worth keeping, because the mistake is more instructive than the answer.

C-2 inverts _creation_: the kernel mints the acknowledgement capability instead of the consumer manufacturing a promise. That is the right instinct and it removes three of the four obligations 13b names. But the kernel cannot mint until the settlement arms, which is **after** `onReorder` returns — while the authored mutation begins **inside** `onReorder`. Under `flushSync`, a synchronous renderer, or any non-React consumer that commits immediately, the layout effect runs before the capability exists, acknowledges nothing, and the gate times out.

**A capability minted by the settlement is younger than the render it acknowledges.** The request is older by construction — it is the argument to the callback that asks for the render — which is why C-3, rejected in 13b for appearing to lack per-operation identity, is the design that works: the identity was already there, and already public.

The lesson generalizes past this protocol: when a design hands a consumer a capability, ask whether it can exist before the thing it is a capability _for_.

**The compiled evidence for the revision** is `packages/drag2/tests/revision/phase-14.ts`, added at Checkpoint C. It is a separate artefact from these probes and has the opposite job: the probes assert what the **pre-revision** SPI cannot express, the fixture asserts that the **post-revision** surface compiles as one system. Neither is lifecycle validation.

## What Phase 14 inherited

Four changes, from three probes:

1. **A lifecycle-intent vocabulary** for discrete input — a synchronous decision that reaches the native listener, so `preventDefault()` can be conditioned on feasibility (13a).
2. **A replacement authored-presentation protocol**, or a recorded decision to keep the current one. Five candidates are enumerated in 13b; none is chosen there.
3. **A parameterized staged type for activation**, so a behavior that stages nothing does not have to return an element it does not have (13c N-1).
4. **A way for the kernel to learn the visual's rendered delta**, because `LandingContext.from` currently assumes the visual tracks the pointer (13c N-2).

And two things that **do not** go to Phase 14, recorded so they cannot drift back in:

- **Settle-time landing timing** is reachable today through `landing({ run })`. What is missing is ergonomics, and that is a public-option change for Phase 15 or 22 (13b §B-2).
- **Public lift modes** and **where a coordinate space lives** are surface decisions for Phase 18. The seams already express both (13c P-2, P-4).

## What the probes establish about the model

The headline claim of Part I was that the kernel is behavior-agnostic. 13c is the first evidence either way, and it is good evidence: an entire second behavior — different geometry, different constraints, different controller, different terminal shape — types against the frozen surface. The two failures are not architectural. They are two places where the sortable's shape was written into the kernel rather than into the sortable:

- activation stages an `HTMLElement`, because the sortable stages a placeholder;
- the landing origin is the pointer delta, because the sortable's visual tracks the pointer.

Both are worth stating that way in the Phase 14 revision, because "the kernel is behavior-agnostic except in two named places, now fixed" is a claim Checkpoint E can actually evaluate.