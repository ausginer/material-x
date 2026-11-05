# Owner brief — state ownership and reentrancy redesign

**Commissioned 2026-11-01.** This records the owner's direction for an architectural redesign. It is input to the architect, not a new contract or decision, and it does not mark any existing obligation discharged.

## Governing owner follow-up — separate requests from effect application

**2026-11-01, after the D-201 return.** The owner approves a further architectural direction: separate a user's request for an effect from the library's application of that effect. The example is changing `controller.destroy()` to `controller.requestDestroy()`, with an associated command applied under a library-defined execution policy. Apply this principle consistently to the state-changing contracts that can affect an internal sequence. Exact API signatures, command representation, scheduling and decomposition remain the architect's work.

The snapshot property below remains the goal. A request may register an intention, but it must not immediately change the lifecycle, operation or other execution context used by the running unit. The library owns when that transition takes effect. In particular, replacing the name while synchronously setting `closed` would preserve the cause of the guard cascade and would not meet this direction. A pending-request flag read throughout the running sequence would have the same problem.

Revisit [D-201's design](reviews/architecture/snapshot-units-claude.md) around this distinction. D-201 still lets `destroy()` change the logical latch immediately and then preserves some event and publication barriers. The new direction requires the architect to separate **requested destruction** from **applied destruction**, and state the guarantees for each. A running sequence can continue after a request while destruction has not yet been applied; this must not be described as callbacks running after destruction. Specify which callbacks, publications and effects may occur in that interval and which are prohibited after application.

This is not a selection between D-201's previous participation-slot revision and its queued-slot fallback. Those alternatives were framed around immediate logical closure and must be reconsidered against request/effect separation. The current task is a return to the architect, ahead of the prior implementation handoff. The coordinator does not amend, supersede or mark D-201 implemented; the architect records the successor decision and its relationship to the existing contracts.

Define the policy at the request/application boundary: ordering and any priorities, the target of operation-specific requests, repeated or stale requests, behavior when idle and during a running unit, and how a consumer learns whether a request has been accepted or applied. If the API returns a completion promise, state what its completion means. These are contract semantics to settle, not a requirement for a generic command framework, a heap object per request or a microtask hop for every operation.

Cover the actual mutation sources, including consumer controller calls, behavior calls, native/reentrant ingress, asynchronous completions and teardown. Keep control requests distinct from synchronous sources of values such as `items()` or geometry resolvers. Their inputs and results still need the snapshot/ownership treatment; classifying something as a query does not establish isolation for a mutable object reachable through it. Preserve the existing integrator-trust policy rather than adding enforcement for every documented precondition.

Update the architecture, the necessary public/SPI and lifecycle contracts, and the bounded implementation/acceptance plan. Demonstrate that a request from inside a callback leaves the active unit's captured context intact, that application occurs at the specified boundary, and that subsequent units observe the applied state. Include ordering and operation-targeting cases and the consequences for F-432, F-433 and F-434. Reuse D-201's verified evidence where it still answers the question; identify the cases and tradeoffs the new direction changes. Removing or splitting classes and composition remain acceptable.

Keep cited probe sources, commands and results recoverable with the repository record; a `/tmp` location is not the only durable source. For browser probes use the browser configured in [the workspace test runner](../../../.scripts/vitest-config.ts). The coordinator verified that the existing `/usr/local/bin/chrome` launches with the installed Playwright; a new browser installation is not a prerequisite for this return.

Stop with the revised architectural decisions and a concrete implementation handoff, or an identified owner choice. Production implementation remains the implementer's task. The current owner edits in `execution.ts` and `tests/kernel/seams.node.test.ts`, D-200's pending acceptance and unrelated obligations retain their existing status.

## Governing owner clarification — snapshot semantics for internal calls

**2026-11-01, after the initial commissioning.** The owner narrows the immediate assignment to a concrete architectural property: mutability of a class, object or variable must not be able to affect an already-started internal call sequence; the calls must proceed as though against a snapshot. This section supersedes the earlier broad survey scope and architectural outcome below. The original commissioning remains as provenance and context.

The snapshot requirement is the requested behavior, not a prescribed implementation. The architect defines the unit of execution and its capture boundary, the state and call targets it fixes, and how results become current. Subsequent mutation of the originating state, including mutation through a reentrant callback, must not change the inputs, receivers or targets used by later internal calls in that unit. Keeping a `const` reference to an object whose mutable fields are still read does not by itself establish this property; explain the treatment of reachable mutable state.

**Removing classes, splitting classes and using composition are all expressly acceptable**, including changes to `Kernel` and its surrounding entities. Neither the current class layout nor `drag2:D-199`'s one-class conclusion is a constraint on the new design. No particular copying, freezing, persistent-data or scheduling mechanism is chosen by this brief.

Start with drag2's internal call chains in construction and execution, including the frame-factory and admission examples below. Follow the affected seams and behavior integrations as needed to make the chosen boundary coherent. Examine asynchronous continuations and lifecycle entry points where they interact with that boundary. A general workspace-wide audit or unrelated immutability migration is not a prerequisite for this unit; expand to a dependency only where the proposed snapshot semantics require it.

Specify how `destroy`, cancel, reentrant operations and stale asynchronous results interact with a running snapshot and subsequent publication or cleanup. State which existing promises survive and which require explicit revision. Their exact semantics remain architectural work, subject to the snapshot requirement: retaining the present dependence on mutable state through repeated guards does not satisfy it. If a lifecycle promise cannot coexist with the required isolation, expose the conflict and the proposed contract change rather than assuming an exception to the owner's requirement.

The handoff must contain a concrete design and bounded implementation plan for this snapshot property, with executable discriminating examples: mutate originating state or a call target during the sequence, and show that later internal calls still observe the intended captured context. Explain how the capture remains effective for mutable references, how independent or reentrant units are separated, and how results and resources reach the appropriate lifecycle boundary. Identify necessary contract and test revisions and the runtime, allocation and bundle measurements implementation owes. Fewer scattered guards may follow, but a reduced guard count alone is not acceptance of the snapshot property.

The existing integrator-trust policy, architect/implementer authority boundaries, pending obligations and finalization rules remain applicable. This clarification changes the immediate architectural task, not the status of D-200 or the completion of any implementation.

## Original commissioning — superseded scope and outcome

The following sections retain the original mandate. Use the clarification above for the current scope and required outcome wherever it narrows or replaces them.

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