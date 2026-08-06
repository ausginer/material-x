# `@ydinjs/drag2` — first-iteration contract

## Status

**Draft — awaiting review.** Derived from [`../brief.md`](../brief.md) and from the shipped architecture of `@ydinjs/drag` ([`packages/drag/DESIGN.md`](../../../../packages/drag/DESIGN.md)).

This is an **architecture contract**, not an implementation plan. It fixes the interfaces, the ownership boundaries and the semantics that the first `packages/drag2` implementation must satisfy. It deliberately contains no phase breakdown, no test enumeration and no package scaffolding; those follow once the contract is accepted.

The contract is written from one behavior — **vertical sortable** — exactly as the brief requires. Where a boundary was chosen because one behavior needed it, that is recorded rather than generalised.

## Scope

| In scope | Out of scope |
| --- | --- |
| A reusable drag kernel: FSM, queue, lifetimes, attempts, transactions | Free dragging, horizontal, grid, 2-D, multi-container |
| One behavior: vertical sortable | Keyboard sorting |
| Fine-grained features assembled at construction | Dynamic plugin discovery, runtime registries |
| One authoritative runtime object per controller | `box-quad` transform-aware geometry |
| Consumer-owned persistent state + explicit readiness | Publishing, CI, migration, compatibility aliases |

`packages/drag` is a correctness oracle and a source of edge cases. It is not modified, and `drag2` does not depend on it at runtime.

## Artifacts

| # | Artifact | What it fixes |
| --- | --- | --- |
| 1 | [`01-kernel-contract.md`](01-kernel-contract.md) | `draggable()`, the `Kernel` interface, the `KernelSpec` seams, the action table |
| 2 | [`02-behavior-contract.md`](02-behavior-contract.md) | What `sortable()` supplies, the collection and insertion model, the controller |
| 3 | [`03-feature-model.md`](03-feature-model.md) | The installer, the seam catalogue, assembly validation, tree-shaking rules |
| 4 | [`04-runtime-ownership.md`](04-runtime-ownership.md) | The runtime object, field ownership, frame rules, type projections |
| 5 | [`05-lifecycle-trace.md`](05-lifecycle-trace.md) | Phase × action legality, transition anatomy, one complete trace, hot path |
| 6 | [`06-readiness-landing.md`](06-readiness-landing.md) | The two settlement gates, attempt identity, landing and layout-displacement seams |
| 7 | [`07-failure-cancel.md`](07-failure-cancel.md) | Failure classification, precedence, panic, resource exit paths |
| 8 | [`08-public-surface.md`](08-public-surface.md) | Public vs internal types, the complete exported signature set |
| 9 | [`09-open-questions.md`](09-open-questions.md) | Free-drag pressure points, accepted compromises, unresolved questions |

Read 1 → 4 → 5 for the execution model; 2 → 3 for the composition model.

## Decision ledger

Every entry is a decision this contract makes that a reviewer can reject independently. Implementation may not silently deviate from one.

| ID | Decision | Why |
| --- | --- | --- |
| C-1 | `draggable(root, behavior)` takes the ingress root element. The kernel owns the native `pointerdown` listener and the admission guards. | The brief assigns "native input admission into a controlled boundary" to the kernel; a boundary is an element. The behavior still decides _which_ press is valid. |
| C-2 | The kernel owns the action table and the drain. Behavior tags start at `BEHAVIOR_ACTION` and are handled by one `spec.handleAction` fallthrough. | Kernel actions dispatch through the kernel's own switch with no indirection; vertical sortable needs exactly two behavior tags, which is the evidence that the split is correctly placed. |
| C-3 | There is one physical runtime object. The behavior extends the kernel runtime in place at construction. Feature seams receive that same object under narrower `Pick<>` types. | No view materialization, no capability wrappers, no per-move allocation. Type-level restriction only; this is not a security boundary. |
| C-4 | The kernel owns `phase`, `operation`, the drag subject, pointer scalars and the two settlement gate flags on the state frame. The behavior adds domain fields. Both frames come from one factory. | The gates and the subject are what the kernel's own lifecycle reads; everything sortable-specific stays behavior-owned. |
| C-5 | Features install into named behavior seams through a construction-time installer. After assembly the hot path holds plain fields, not descriptor lists. | The brief forbids runtime plugin iteration and hot-path filtering. An installer permits a feature to occupy several seams without one generic callback type. |
| C-6 | `vertical()` and `callbacks()` are required features; assembly throws `TypeError` when a required seam is unfilled. `placeholder()`, `handle()`, `visual()`, `layoutAnimation()` and `landing()` are optional. Default placeholder _mechanics_ live in the behavior, not in a feature. | A basic vertical sortable must work without installing an animation feature, and the placeholder is mandatory mechanics — but its appearance is not. |
| C-7 | The vertical insertion rule is **nearest centre with the placeholder as an incumbent candidate**. | Ported from the shipped implementation, where it is already validated against oscillation. Hysteresis is a consequence of the geometry rather than a tunable dead band. |
| C-8 | Spatial attempt identity is a monotonic `number` on the runtime, not an object. | Removes the only per-move allocation in the shipped implementation. Coalesced, controller-local work does not need cross-controller-safe identity. |
| C-9 | Landing is **absent** by default. Without a `landing()` feature no runner is created and the landing gate opens complete. `landing()` supplies timing or a whole custom runner. | "Absence of animation must not create fake asynchronous work." A spring runner stays expressible without the default paying for WAAPI. |
| C-10 | Layout displacement of neighbouring items is **not** a lifecycle gate. It never holds settlement and never blocks presentation release. | Displacement is cosmetic and interruptible by design; landing is not. Making it a gate would let a CSS transition strand a drop. |
| C-11 | Readiness is bound to the **settlement attempt**, not merely the operation. Default timeout 500 ms. A readiness failure replaces the settlement, keeps presentation owned, and reports through `onError` only. | Ported semantics: a promise that never settles must not strand the controller, and one outcome must not produce both `onError` and a terminal callback. |
| C-12 | Nothing in the contract exists solely to enable free drag, horizontal, grid, keyboard, multi-container or dynamic plugins. Pressure points are recorded in artifact 9 instead. | The brief's explicit instruction not to over-design. |
| C-13 | The activation threshold is **kernel** admission configuration (`KernelSpec.threshold`). The handle policy is an **optional sortable feature**. | The kernel owns the `PENDING → ACTIVATING` decision, so it owns the distance test. Handle resolution is item semantics and should tree-shake away when unused. |
| C-14 | Collection reconciliation is identity-based and ported unchanged: an insertion survives only when its exact neighbours remain adjacent. Replacements are ignored from `RELEASING` onward. | Intent is never recomputed from a later pointer position; a decided transaction is not rewritten. |
| C-15 | The eight-phase vocabulary is kept verbatim: `IDLE PENDING ACTIVATING ACTIVE RELEASING SETTLING REPORTING FINALIZING`. | The brief permits change only when semantics stay equally explicit. Nothing in vertical sortable justified a change. |

## Naming

The package is `@ydinjs/drag2` at `packages/drag2`. The name is provisional and carries no migration commitment; it exists so both packages can be built and measured side by side.