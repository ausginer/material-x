# `@ydinjs/drag` design documentation

The architecture that ships is documented in
[`packages/drag/DESIGN.md`](../../../packages/drag/DESIGN.md). Start there.

This directory holds the record of how it got there, and the design work for
what comes next.

## Current

| Document | Status |
| --- | --- |
| [`plan.md`](plan.md) | **Active — the live scope.** Part I is the completed vertical-sortable slice (phases 0–11). Part II is the roadmap from that slice to a package that can replace `@ydinjs/drag`. |
| [`brief.md`](brief.md) | **Provenance.** The iteration brief that commissioned `@ydinjs/drag2` as a compositional vertical-sortable architectural probe. Delivered in full by phases 0–11; **superseded for scope** by `plan.md` Part II. |
| [`contract/`](contract/) | **The normative contract**, documents 00–06, read with the precedence in `00-index.md`. An internal kernel executor, a private per-controller behavior runtime, features as function factories returning contributions, frames composed from independently owned parts, and settlement gates requested, sealed, then armed on a kernel-private attempt. Carries the decision ledger (D-1…D-31) and findings (F-1…F-42). Its signatures are compiled in [`packages/drag/docs/contract-probe-2/contract.ts`](../../../packages/drag/docs/contract-probe-2/contract.ts), a **type fixture only**. |
| [`measurements/`](measurements/) | M-1…M-4 with their harnesses and workloads. Every figure was taken against a single behavior; `plan.md` phase 21 re-runs them over the complete package. |
| [`reviews/`](reviews/) | Reviews of the contracts and of each checkpoint. |

Read [`contract/00-index.md`](contract/00-index.md) first — it carries the
normative precedence and the freeze rule. The earlier probe-1 contract, whose
construction model (a public `Kernel`, one shared runtime, behavior-driven
`begin()`/`commit()`) is not carried forward, is in
[`archive/contract-attempt-1/`](archive/contract-attempt-1/).

## Archive

[`archive/`](archive/) contains superseded material, kept for provenance only.
**None of it describes the current architecture.** It documents designs that
were replaced, or alternatives that were explored and rejected:

| Document | What it was |
| --- | --- |
| `contract-attempt-1/` | `drag2` probe 1 — the first architecture contract derived from the brief. Reviewed, then superseded as a *construction* model by `contract/`. |
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
