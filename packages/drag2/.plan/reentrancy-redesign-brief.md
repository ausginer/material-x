# Owner brief — state ownership and reentrancy redesign

**Commissioned 2026-11-01.** This records the owner's direction for an architectural redesign. It is input to the architect, not a new contract or decision, and it does not mark any existing obligation discharged.

## Problem and owner direction

The owner considers the repeated need to revalidate mutable controller state after calls into foreign code a strong architecture smell. A previous cycle of protective checks, architectural decisions, implementation and review expanded the machinery until the owner reaffirmed that the library should trust its integrator. The concern is that the underlying architecture still makes the same expansion likely. The requested outcome is to change that architecture across the affected code, rather than resolve the two triggering examples in isolation.

The immediate examples are:

- [`Kernel.arm()`](../src/kernel/kernel.ts) checks the logical-close latch before each of two `createFramePart()` calls. Even creating the frame pair requires reasoning about a factory destroying the controller between calls.
- [`ExecutionBracket.runIngress()`](../src/kernel/execution.ts) must read the latch again after `admit()`, because that call can close the controller. Its direct field read also produces a TypeScript-based ESLint false positive.
- The frame-construction comment promises a shared hidden class while also declining to assume factory determinism. The [frame contract](contract/04-frame-slicing.md) already describes engine map identity as a performance hypothesis rather than a correctness invariant.

These are entry points into the investigation, not a proposed fix or a complete inventory of the problem.

## Scope and authority

Investigate all of drag2: construction, frame and operation ownership, the execution bracket, seams, lifetimes, consumer callbacks, asynchronous continuations, teardown, and both sortable and free-drag behavior integrations. Survey the other first-party workspace packages for the same coupling and follow relevant dependencies. Group affected code by the cause and owning contract; make any limits of the survey explicit. Package-local and repository-level decisions retain their respective record homes.

The owner authorizes an architectural redesign, including explicit reconsideration of existing callback, lifecycle and unreleased API contracts where they cause the complexity. Existing decisions are the baseline to examine, not a blanket veto on this assignment. In particular, `drag2:D-199` retained the liveness guards and callback ordering in its narrower kernel-shape task; that retention does not settle this newly commissioned redesign. Record any supersession through the architect's normal authority rather than silently ignoring a rule.

Apply [CONTRIBUTING.md](../../../CONTRIBUTING.md) §1.1's reachability gate and §1.2's preference for contracts and types. Establish which obligations belong to correct integration and which exist only to accommodate misuse. The integrator's responsibility can be a documented semantic precondition; it does not need a runtime enforcement mechanism or an unconstructible TypeScript type. Do not rescue a misuse-only check by appealing to the state corrupted after that misuse.

Distinguish those obligations from real browser behavior, asynchronous stale completions, end-user input and library-owned state. A promise currently made to a valid consumer must either be preserved or explicitly revised, with its observable consequence stated. Identify product tradeoffs needing an owner answer. This is a contract-design task, not a behavior-preserving size pass.

## Architectural outcome

Produce one coherent design that materially reduces the need to re-establish controller validity throughout ordinary synchronous code. Explain why its ownership and call boundaries prevent the same guard cascade from returning when another callback or feature is added.

Use representative executable cases to distinguish valid reentrancy, integration misuse and platform-driven interleaving. Classify families of surviving checks and their concrete responsibilities. Compare the current and proposed burden of state ownership, invalidation, cleanup and verification; moving the same burden into wrappers or a generic safety runtime is not by itself a simplification. No particular class decomposition, immutable-state encoding, scheduling strategy or zero-guard target is preselected.

State consumer-visible changes and performance or bundle tradeoffs. Use focused probes where a choice depends on runtime facts, and specify the measurements owed by implementation. Engine-specific optimization claims need evidence and must not become undocumented correctness requirements.

## Handoff and boundary

The architect records the chosen decisions and necessary contract changes in their owning registers and supplies a bounded implementation and acceptance plan. Explain which existing tests still prove supported behavior, which encode revised promises or misuse, and the discriminating cases for the new design. Do not perpetuate an accidental guarantee solely because a test currently pins it, or delete a valid-use regression without identifying the changed contract.

Account explicitly for `drag2:D-199`, D-200's pending independent acceptance, `drag2:F-432` and the live [obligations](obligations.md). Do not silently close, cancel or duplicate them. This redesign is the next architectural task; do not bundle D-199's routine remediation as an unexamined prerequisite.

Stop with a concrete design and implementation handoff, or a specific blocking owner choice. Production implementation and feature-test changes belong to the implementer. Probes are permitted. An expanding audit or another cycle of local guards without architectural progress calls for an owner checkpoint, following the [coordination workflow](../../../.agents/docs/agent-workflow.md).

The coordinator's preparation changed only this brief and its index pointer. Its verification covers Markdown formatting, local links and diff whitespace; it does not establish a design's correctness or accept D-200. Current uncommitted changes in `execution.ts` and `tests/kernel/seams.node.test.ts` remain the owner's work and must be inspected separately from the committed input revision.