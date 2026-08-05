# Checkpoint C review — Phase 14 contract revision

Hey, I’ve completed an independent pass over the revised contracts `00–06`, the three Phase 13 write-ups, and the three typed probes.

The overall direction of D-32, D-34 and D-35 looks strong. D-33 needs to be reopened before Checkpoint C can close, and there are several consistency and verification issues around the revision that should be fixed in the same pass.

Please treat this as an architectural review, not as an implementation task. Let’s first settle the contract and make the revised type surface executable. No production `src/` work is required yet.

## Review verdict

| Decision | Verdict |
| --- | --- |
| D-32 — discrete input as a second admission member | Direction accepted; one ownership issue remains |
| D-33 — authored-presentation token protocol | Reopen |
| D-34 — behavior-selected activation payload | Decision accepted; generic threading is incomplete |
| D-35 — lift session records rendered delta | Accepted |
| Checkpoint C | Not ready to close |

---

## C-01 — blocker: the D-33 reference integration can miss a synchronous commit

The normative React example currently has this shape:

```tsx
const token = useRef<PresentationToken | null>(null);

const onReorder = (request) => {
  setOrder(reorder(request));
  return ReorderResolution.accept((t) => {
    token.current = t;
  });
};

useLayoutEffect(() => {
  token.current?.ready();
  token.current = null;
});
```

The lifecycle orders those operations differently:

```text
onReorder()
  setOrder()
  return resolution

possibly synchronous render + useLayoutEffect
  token is still null

RESOLUTION_SETTLED
  settlement
  seal
  arm
  mint and deliver token
```

With `flushSync`, a synchronous renderer, or a non-React integration that commits immediately, the authored presentation can complete before the kernel delivers the token. The layout effect observes `null`, no later commit is required, and the readiness gate eventually times out.

This is not merely an implementation edge case. The public protocol currently establishes no happens-before relationship between:

1. the consumer receiving the acknowledgement capability, and
2. the consumer beginning the authored mutation that the capability is meant to acknowledge.

Moving `setOrder` into the deliverer would impose that ordering:

```tsx
const onReorder = (request) =>
  ReorderResolution.accept((token) => {
    tokenRef.current = token;
    setOrder(reorder(request));
  });
```

But that makes the deliverer responsible for initiating the update and makes the public API more ceremonial. Before repairing this locally, see the D-33 reconsideration below.

---

## C-02 — blocker: `abandon()` has contradictory terminal semantics

The revised contract says that:

- `abandon(reason?)` means no authored presentation is coming;
- it releases the readiness hold;
- it does not fail the operation;
- `authoredReady` remains false;
- an accepted settlement still reaches `onFinish`.

For an accepted reorder, these statements do not compose safely.

A possible execution is:

```text
consumer accepts the reorder
consumer abandons the authored presentation
kernel finishes against the temporary placeholder
placeholder is removed
semantic item remains in the old authored DOM position
consumer receives an accepted onFinish result
```

The terminal result says the reorder was accepted, but the final authored DOM may still show the old order.

Please choose and state one coherent meaning. Plausible options include:

1. `abandon()` converts an accepted destination settlement to rejection/cancellation with home recovery;
2. `abandon()` is a consequential failure;
3. `abandon()` means the presentation already exists synchronously, in which case it should mark `authoredReady = true`;
4. `abandon()` is not legal for an accepted destination outcome.

The current meaning — “nothing is coming, but accepted completion proceeds unchanged” — is not coherent.

---

## Reconsider D-33 before repairing it locally

The owner-preferred product API is controller-shaped:

```tsx
const onReorder = (request) => {
  setOrder(reorder(request));
  return ReorderResolution.accept();
};

useLayoutEffect(() => {
  controller.ready();
});
```

This was Phase 13 candidate C-3 and was rejected because a controller method appears to lack per-operation identity: a late acknowledgement from operation A might release operation B’s gate.

That is a real concern, but it may not justify exposing `PresentationToken` and `PresentationDeliverer` as public protocol objects. Please investigate whether the identity problem can be solved internally before concluding that the token API is necessary.

The desired ownership model is:

- the kernel creates and owns the readiness attempt;
- the resolution only declares whether an authored presentation is expected;
- the controller acknowledges that the authored commit occurred;
- the consumer never handles an internal settlement primitive.

Please compare the smallest correct controller-shaped design against D-33’s token design.

### Questions the controller-shaped design must answer

#### Early acknowledgement

A synchronous commit may call `controller.ready()` from a layout effect before `onReorder` has returned its resolution and before the kernel has formally armed the readiness hold.

Can the current resolution attempt latch that early acknowledgement safely and consume it once the fulfilled resolution declares that presentation was expected?

#### Stale acknowledgement

A late effect belonging to operation A must not release operation B.

Please determine whether this is already impossible because the controller cannot admit B while A is still in settlement, or whether timeout/retirement creates a window in which A’s effect may arrive after B begins.

If a stale acknowledgement is possible, compare the smallest ways to close it:

- an internal presentation generation;
- acknowledgement tied to request/proposal identity;
- an operation-scoped controller facade;
- another mechanism that preserves the simple consumer API.

Do not assume that a public token is the only possible source of identity.

#### Declaring whether a hold is required

A bare `accept()` currently has two possible meanings:

- accepted, and an authored presentation is expected;
- accepted, and the DOM is already final, so no readiness hold is needed.

The controller design still needs an explicit way to distinguish these states. Find the least ceremonial public shape. For example, the distinction may belong in the resolution, but the exact syntax is open.

### Decision criterion

Prefer the design that:

- preserves independent readiness and landing gates;
- preserves render/landing overlap structurally;
- handles synchronous commits;
- rejects stale acknowledgements;
- does not expose more settlement machinery than the consumer needs;
- has coherent timeout, destroy and terminal semantics.

Do not preserve D-33 merely because it is already written into the contracts.

---

## C-03 — major: I-32 is not tier A as written

I-32 claims that a declined command admission leaves the event untouched, including no `preventDefault()`, and rates this as A + B.

But `command.admit` receives the real `Event`, and the contract explicitly permits `preventDefault()` inside admission. This compiles:

```ts
admit(event) {
  event.preventDefault();
  return null;
}
```

Therefore “declined means not prevented” is currently behavior discipline, not a structural guarantee.

The cleaner ownership is likely:

```text
behavior answers feasibility by returning visual | null
kernel sees a non-null answer
kernel calls event.preventDefault()
kernel mints the operation
```

The behavior decides whether the command is feasible; the ingress owner performs the browser effect. Under that shape I-32 can genuinely be kernel-enforced.

Please either move `preventDefault()` to the kernel or downgrade the invariant honestly. The first option seems preferable.

---

## C-04 — major: D-34 is not threaded through the construction handshake

Document 01 currently sketches:

```ts
type BehaviorInstall<
  Controller,
  Part extends object,
  Activation extends {}
> = Readonly<{
  spec: BehaviorSpec<Part, Activation>;
  controller: Controller;
}>;

type Behavior<Controller, Part extends object> =
  (host: KernelHost) => BehaviorInstall<Controller, Part>;
```

`BehaviorInstall` requires three type arguments, while `Behavior` supplies two. `draggable()` also carries only `Controller` and `Part`.

As written, the normative construction signature does not compile and cannot infer `Activation = HTMLElement` for sortable while defaulting to `true` for free drag.

Please thread the activation type coherently through:

- `BehaviorInstall`;
- `Behavior`;
- `draggable`;
- `kernel.arm`, if its internal type requires it.

The precise implementation shape may differ, but both of these must compile without casts or lies:

```ts
BehaviorSpec<SortablePart, HTMLElement>
BehaviorSpec<FreeDragPart> // Activation defaults to true
```

---

## C-05 — major: I-35 overstates the token guarantee

I-35 currently says the consumer can neither create, supersede nor lose an authored-presentation gate.

Two parts are too strong:

- `PresentationToken` is a structural object type, so a consumer can create an object with that shape. The useful guarantee is that it cannot inject that object into the kernel or release a kernel attempt with it.
- The consumer can lose the delivered token reference and never call either method. The kernel still owns and observes the gate, but only detects non-completion through the deadline.

A more accurate guarantee would be:

> The consumer cannot create, omit or supersede the kernel-owned readiness hold, and cannot use one operation’s acknowledgement capability to release another operation. It remains responsible for acknowledging or explicitly abandoning the delivered capability.

If D-33 changes shape, rewrite I-35 around the actual guarantee rather than preserving token-specific language.

---

## C-06 — major: Phase 14 has no compiled revision fixture

The three Phase 13 typed probes import the currently implemented, pre-revision SPI from `src/`. Their negative assertions continuing to fail is correct: they are permanent evidence of the gaps Phase 13 found.

They do not prove that D-32…D-35 form a coherent revised type surface.

The broken `BehaviorInstall` generic is exactly the kind of issue a small compiled revision fixture would have caught.

Please add a type-only Phase 14 fixture, without modifying production `src/`. It should cover at least:

```text
CommandAdmission
the selected readiness protocol
SettlementScope
BehaviorSpec<Part, Activation>
BehaviorInstall / Behavior / draggable inference
VisualLiftSession rendered-delta ownership
one sortable spec with Activation = HTMLElement
one free-drag spec with Activation = true
```

It may use `declare`d values and inert drivers. Its purpose is not lifecycle validation; it is to prove that the revised contract compiles as one system.

Keep the Phase 13 probes as historical executable assertions. Do not rewrite them to pretend the production SPI has already changed.

---

## C-07 — probe hygiene: the free-drag probe allocates on its claimed allocation-free path

Probe 13c describes `constrain()` as pure arithmetic with no allocation, but it returns:

```ts
return { x, y };
```

That allocates a `Point` on every call.

This does not invalidate the expressibility result, but the performance claim is false. Either:

- remove the no-allocation statement;
- return through scalar/out parameters;
- inline the scalar calculation in the probe.

Keep type expressibility and hot-path cost claims separate.

---

## What passed review

### D-32’s architectural direction

A second admission member is a much smaller and more honest answer than a generic lifecycle-intent vocabulary. The downstream lifecycle is reused; `KernelHost`, the frame and the phase vocabulary do not grow.

The remaining issue is only ownership of `preventDefault()`.

### D-34’s architectural direction

The activation payload belongs to the behavior. Sortable stages a detached placeholder; free drag stages nothing and should return `true`.

The decision is sound. Only the construction generics are incomplete.

### D-35

This is the cleanest Phase 14 change.

The kernel owns the lift session and every legitimate presentation write already passes through `lift.write(x, y)`. Recording the last rendered delta there is better than adding a `renderedDelta()` seam to every behavior:

- it adds no behavior obligation;
- it covers pointer, command and controlled/action writes;
- `compose()` remains pure and records nothing;
- the kernel reads state from the object it already owns.

Retain D-35.

---

## Requested outcome

Let’s revise Phase 14 narrowly rather than redesigning the whole contract set.

Please:

1. reopen D-33 and compare the controller-shaped acknowledgement design against the token design;
2. resolve the ordering and terminal-semantics blockers whichever design wins;
3. correct I-32’s `preventDefault()` ownership;
4. thread D-34 through the construction generics;
5. restate the readiness invariant without overclaiming;
6. add a compiled Phase 14 revision fixture;
7. correct the free-drag probe’s allocation claim;
8. update all affected cross-references, trace steps, matrix rows, ledger entries and Checkpoint C exit criteria.

Raise any concern where these corrections interact. In particular, do not optimize for preserving the number or names of Phase 14 decisions if a smaller public protocol emerges.

Checkpoint C should close only when:

- the chosen readiness protocol has coherent synchronous, stale, timeout, abandon and destroy semantics;
- the revised contract compiles as a complete type surface;
- the normative examples obey the protocol’s ordering;
- the invariants claim only what the API and kernel actually enforce.
