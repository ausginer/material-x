# Phase 13 — SPI pressure probes

The three failing executable cases contract 00 §Normative precedence requires
before the frozen SPI may change. Produced by `plan.md` phase 13; consumed by
phase 14, which revises the contract **once** against all three together.

Each probe pairs a write-up here with a typed probe under
[`packages/drag2/docs/probes/`](../../../../packages/drag2/docs/probes/). The
typed half is the executable half: `tsc` errors on an unused `@ts-expect-error`,
so a green `npx just typecheck` in `packages/drag2` is a standing assertion that
every negative claim still fails to compile. A prose finding cannot do that,
which is the whole reason 00 asks for a case.

| Probe | Question | Result |
| --- | --- | --- |
| [13a](13a-discrete-input.md) | Can the frozen SPI express discrete (keyboard) input? | **No** — 4 negatives. The gap is confined to ingress and admission. |
| [13b](13b-settlement.md) | Is the authored-presentation protocol in its final form? Can landing timing be read at settle time? | **Split.** The protocol goes to Phase 14 (3 negatives). Settle-time timing **fits** — ledger L-6 corrected. |
| [13c](13c-free-drag.md) | Does a second behavior fit the seam set? | **Mostly.** A complete free-drag `BehaviorSpec` compiles; 2 structural gaps, 6 questions closed as "it fits". |

## What Phase 14 decided — 2026-08-04

All four are answered; the contract is revised and re-frozen. The reasoning,
including where the changes turned out to depend on each other, is
[`contract/02`](../contract/02-kernel-behavior-contract.md) §Where the four
changes touch each other.

| Inherited | Decision |
| --- | --- |
| 13a — a lifecycle-intent vocabulary | **D-32: a second admission member**, `command: { types, admit(event, draft) }`. Not a vocabulary and not an intent protocol — the gap was that a behavior could not be *asked* a question synchronously, not that it could not *ask* for a transition. `KernelHost` still has six members. |
| 13b — a replacement protocol, or a recorded decision to keep it | **D-33: candidate C-2**, in request-shaped form. `holdForReadiness(deliver)`; the kernel mints a `PresentationToken` at arm time; `ready()` / `abandon(reason?)`. |
| 13c N-1 — a parameterized staged type | **D-34: `BehaviorSpec<Part, Activation extends {} = true>`.** |
| 13c N-2 — the visual's rendered delta | **D-35: no seam.** The lift session records what `write(x, y)` rendered. |

**Every negative assertion in all three typed probes still fails to compile**,
and that is deliberate rather than incidental — the revision adds no host member,
no `dispatch` return value and no rendered-delta seam. 13c N-2's *annotation* is
now misleading (it says no seam reports the delta, which is true, and implies
that is the defect, which is no longer the case); correcting it is a Phase 15
hygiene item.

## What Phase 14 inherited

Four changes, from three probes:

1. **A lifecycle-intent vocabulary** for discrete input — a synchronous decision
   that reaches the native listener, so `preventDefault()` can be conditioned on
   feasibility (13a).
2. **A replacement authored-presentation protocol**, or a recorded decision to
   keep the current one. Five candidates are enumerated in 13b; none is chosen
   there.
3. **A parameterized staged type for activation**, so a behavior that stages
   nothing does not have to return an element it does not have (13c N-1).
4. **A way for the kernel to learn the visual's rendered delta**, because
   `LandingContext.from` currently assumes the visual tracks the pointer (13c
   N-2).

And two things that **do not** go to Phase 14, recorded so they cannot drift back
in:

- **Settle-time landing timing** is reachable today through `landing({ run })`.
  What is missing is ergonomics, and that is a public-option change for Phase 15
  or 22 (13b §B-2).
- **Public lift modes** and **where a coordinate space lives** are surface
  decisions for Phase 18. The seams already express both (13c P-2, P-4).

## What the probes establish about the model

The headline claim of Part I was that the kernel is behavior-agnostic. 13c is
the first evidence either way, and it is good evidence: an entire second
behavior — different geometry, different constraints, different controller,
different terminal shape — types against the frozen surface. The two failures are
not architectural. They are two places where the sortable's shape was written
into the kernel rather than into the sortable:

- activation stages an `HTMLElement`, because the sortable stages a placeholder;
- the landing origin is the pointer delta, because the sortable's visual tracks
  the pointer.

Both are worth stating that way in the Phase 14 revision, because "the kernel is
behavior-agnostic except in two named places, now fixed" is a claim Checkpoint E
can actually evaluate.
