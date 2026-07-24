# `@ydinjs/drag` design documentation

The architecture that ships is documented in
[`packages/drag/DESIGN.md`](../../../packages/drag/DESIGN.md). Start there.

This directory holds the record of how it got there.

## Current

| Document | Status |
| --- | --- |
| [`drag-re-redesign.md`](drag-re-redesign.md) | **Implemented.** The runtime-reset proposal (revision 3) that Phases 1–6 delivered. Kept as the statement of intent; where it and the shipped code differ, the code and the phase-1 ledger win. |
| [`phase-1/`](phase-1/) | **Living.** The behavioural contract, decision ledger and measurement log. The 11 artifacts pin what the runtime must do, why each deviation was accepted, and every size measurement taken. |
| [`reviews/drag-3/`](reviews/drag-3/) | Historical. The two reviews of `drag-re-redesign.md`; revision 3 folded in their blockers. |

If you are changing the runtime, read
[`phase-1/00-index.md`](phase-1/00-index.md) first — it indexes the contract and
lists the resolved decisions (D-1…D-6, L-7…L-11) that the implementation
depends on.

## Archive

[`archive/`](archive/) contains superseded material, kept for provenance only.
**None of it describes the current architecture.** It documents designs that
were replaced, or alternatives that were explored and rejected:

| Document | What it was |
| --- | --- |
| `drag-entities.md`, `drag-entities-suggestion.md` | The entity catalogue for the reducer/effect/owner architecture, replaced by the action-driven runtime. |
| `drag-gesture-redesign.md`, `drag-gesture-redesign-2.md` | Two earlier redesign iterations, superseded by `drag-re-redesign.md`. |
| `drag-size-performance-plan.md` | A size/performance plan against the old architecture. |
| `functional-effect-runtime.md` | A rejected alternative: a generic functional effect runtime. The shipped design deliberately has no effect runtime at all. |
| `experiments/` | Representation experiments (tuples, classes, bitfields, a shared gesture base). Each changed the encoding of the old architecture and produced little or no compressed-size improvement — the finding that motivated removing protocol layers instead. |
| `reviews/drag-1/`, `reviews/drag-2/`, `reviews/reorderable/` | Reviews of the superseded designs. |

Do not treat anything in `archive/` as normative. In particular, the older
documents prohibit mutable runtime state and transactional frames, which is
precisely what the shipped architecture uses.
