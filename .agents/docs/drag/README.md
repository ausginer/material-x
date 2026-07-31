# `@ydinjs/drag` design documentation

The architecture that ships is documented in
[`packages/drag/DESIGN.md`](../../../packages/drag/DESIGN.md). Start there.

This directory holds the record of how it got there, and the design work for
what comes next.

## Current

| Document | Status |
| --- | --- |
| [`brief.md`](brief.md) | **Active.** The iteration brief for `@ydinjs/drag2`: a compositional vertical-sortable architectural probe in a new, independent package. |
| [`contract/`](contract/) | **Probe 1 — reviewed, superseded as a construction model.** The first architecture contract derived from the brief. Still the reference for lifecycle invariants, edge cases and validated product requirements; its construction model (public `Kernel`, one shared runtime, behavior-driven `begin()`/`commit()`) is not carried forward. |
| [`contract-probe-2/`](contract-probe-2/) | **Consolidated, corrected for implementation.** The construction model for `drag2`, revised after six reviews and the React placeholder probe: an internal kernel executor, a private per-controller behavior runtime, features as function factories returning contributions, frames composed from independently owned parts, and settlement gates requested, sealed, then armed on a kernel-private attempt. Carries the decision ledger (D-1…D-31) and findings (F-1…F-42). Its signatures are compiled in [`packages/drag/docs/contract-probe-2/contract.ts`](../../../packages/drag/docs/contract-probe-2/contract.ts). |
| [`reviews/`](reviews/) | Reviews of the contracts. |

Read [`contract/00-index.md`](contract/00-index.md) for the invariants and the
product requirements they came from, then
[`contract-probe-2/00-index.md`](contract-probe-2/00-index.md) for the
construction model itself. Probe 2 supersedes probe 1's *construction* model
only; probe 1 remains the reference for lifecycle invariants and edge cases.

## Archive

[`archive/`](archive/) contains superseded material, kept for provenance only.
**None of it describes the current architecture.** It documents designs that
were replaced, or alternatives that were explored and rejected:

| Document | What it was |
| --- | --- |
| `drag-re-redesign.md` | The runtime-reset proposal (revision 3) that Phases 1–6 delivered. Superseded by the shipped `DESIGN.md`. |
| `phase-1/` | The behavioural contract, decision ledger and measurement log for the shipped runtime. Still the best record of *why* the current invariants exist. |
| `drag-entities.md`, `drag-entities-suggestion.md` | The entity catalogue for the reducer/effect/owner architecture, replaced by the action-driven runtime. |
| `drag-gesture-redesign.md`, `drag-gesture-redesign-2.md` | Two earlier redesign iterations, superseded by `drag-re-redesign.md`. |
| `drag-size-performance-plan.md` | A size/performance plan against the old architecture. |
| `functional-effect-runtime.md` | A rejected alternative: a generic functional effect runtime. The shipped design deliberately has no effect runtime at all. |
| `experiments/` | Representation experiments (tuples, classes, bitfields, a shared gesture base). Each changed the encoding of the old architecture and produced little or no compressed-size improvement — the finding that motivated removing protocol layers instead. |
| `reviews/` | Reviews of the superseded designs (`drag-1`, `drag-2`, `drag-3`, `reorderable`). |

Do not treat anything in `archive/` as normative. In particular, the older
documents prohibit mutable runtime state and transactional frames, which is
precisely what the shipped architecture uses.
