# 1. Construction and ownership

## The privacy boundary

Probe 1 handed the behavior a `Kernel` object with twelve members and a shared `runtime` it was expected to extend in place. Six of those members (`runtime`, `begin`, `commit`, `preparationValid`, `isCurrent`, `install`) existed only because the behavior drove its own transitions.

Probe 2 removes that. The kernel is an **internal executor**. Its state is closure-private inside `createKernel()`; there is no `KernelRuntime` type, no exported container, and nothing a behavior can read that the kernel did not deliberately pass as an argument.

```text
                 ┌─────────────────────────────────────────┐
                 │ createKernel<Part>(root)                │
   pointerdown ─▶│   private: queue, current/draft, phase, │
                 │   lifetimes, pointer capture, lift,     │
                 │   resolution + settlement attempts      │
                 │   (the landing gate hold), cancel latch,│
                 │   closed, destroyRequested              │
                 └───────────────┬─────────────────────────┘
                                 │ direct calls, per-seam arguments
                                 ▼
                 ┌─────────────────────────────────────────┐
                 │ BehaviorSpec<SortableFramePart,         │
                 │              HTMLElement>               │
                 │   closures over a private SortableRuntime│
                 └───────────────┬─────────────────────────┘
                                 │ direct calls, consumer-declared views
                                 ▼
                 ┌─────────────────────────────────────────┐
                 │ assembled slots + fixed pipelines        │
                 │   each closing over its own private state│
                 └─────────────────────────────────────────┘
```

Three private state spaces, one physical frame pair threaded through all of them, and no shared container anywhere. Nothing is reachable in the other direction.

## `draggable()` and the two-phase handshake

There is a real ordering hazard here: the behavior needs `cancel`/`destroy` to build its controller, and the kernel needs the spec before it can arm ingress. Probe 1 solved it with a mutating `kernel.install(spec)` call plus the rule _"no input can be admitted before `install()` returns."_

Probe 2 makes the rule unexpressible by returning both halves at once. (D-1)

```ts
type BehaviorInstall<
  Controller,
  Part extends object,
  Activation extends {},
> = Readonly<{
  spec: BehaviorSpec<Part, Activation>;
  controller: Controller;
}>;

/**
 * The install function itself — and, since D-48, the **kernel tier's public
 * authoring type**. It is what a custom behavior author writes, so it is
 * exported from `@ydinjs/drag/kernel` together with `BehaviorInstall`,
 * `BehaviorSpec` and `KernelHost`.
 */
type BehaviorFactory<Controller, Part extends object, Activation extends {}> = (
  host: KernelHost,
) => BehaviorInstall<Controller, Part, Activation>;

/**
 * The library's own construction vocabulary. `Part` and `Activation` are
 * erased at the brand (D-34); `Controller` survives so a holder can infer a
 * controller type.
 *
 * **The behavior brand survives Revision 2, and stops being a boundary
 * crossing.** D-45 retracts D-30's *feature* half — a fragment is now a plain
 * partial config object with no brand at all — and D-48 moves the behavior
 * half inward: nothing at the ordinary tier names a behavior, because
 * `sortable()` and `freeDrag()` return controllers. Read every D-30 citation
 * in this document as the behavior half unless it names a feature.
 */
declare const BEHAVIOR_BRAND: unique symbol;
type Behavior<Controller> = Readonly<{ [BEHAVIOR_BRAND]: Controller }>;

/**
 * Kernel tier (D-47, D-48). All three parameters are **inferred from the
 * factory** and named by nobody.
 */
function draggable<Controller, Part extends object, Activation extends {}>(
  root: HTMLElement,
  factory: BehaviorFactory<Controller, Part, Activation>,
): Controller {
  const kernel = createKernel<Part>(root); // queue, frames unarmed, no listener
  const { spec, controller } = factory(kernel.host);
  kernel.arm(spec); // composes both frames, attaches ingress
  return controller;
}
```

**C4-03's argument is intact; D-48 moves the boundary it applies to.** The reasoning is worth keeping in front of the reader, because it is what makes D-48 safe rather than what D-48 overrules. It ran: _the public parameter is the opaque `Behavior<Controller>`, not the factory_ — an earlier version of this section declared `draggable()` against `BehaviorFactory<Controller, Part, Activation>` and had `sortable()` return one, and because this document is normative that was not a stale example. It published the internal factory type _and_ both private generic parameters **at the ordinary public boundary**, and it contradicted 03 §The public/internal boundary.

Every word of that still holds of the ordinary boundary — and the ordinary boundary no longer runs through here. **`sortable()` and `freeDrag()` return controllers and publish neither type** (D-48), so the surface C4-03 was protecting is now protected by construction rather than by a brand: there is nothing at that tier for a factory to leak into. What remains at `@ydinjs/drag/kernel` is the authoring surface for custom behaviors, where `BehaviorFactory`, `BehaviorInstall`, `BehaviorSpec` and `KernelHost` **are** the vocabulary. Publishing them there is D-47's entire purpose, not a leak; the same names that would be a leak one tier up are the deliverable one tier down.

Inference still costs the author nothing, and now does the work the brand used to: `Controller`, `Part` and `Activation` are all inferred from the factory, and a kernel-tier author names none of them. ~~`Part` and `Activation` are not inferred at all at this boundary — they were fixed inside the factory before the brand was applied, and `unbrandBehavior` widens them to `object` and `{}` for the driver.~~ The erase-then-widen step had exactly one job — to get a `Behavior<Controller>` back to a callable factory across an opaque boundary — and with no opaque boundary at this call there is nothing to undo. **The Phase 14 fixture is therefore owed a recompile**: it compiles `unbrand → factory → arm`, and what D-48 asks it to compile is `factory → arm`. The widening inside the executor is untouched — the seam driver still erases `Activation` to `{}` — so only the first arrow changes.

`Part` is the behavior's **frame part**, not the composed frame — the composed type exists only inside the kernel, where `Object.assign`'s `T & U` typing produces it without a cast (D-9, D-15). (An earlier sketch wrote `<F extends KernelFrame>` on the _return_ side, which is unsatisfiable: it would require a behavior to produce a valid install for any frame the caller chose.)

**`Activation` threads all the way through, and an earlier draft of the Phase 14 revision did not thread it.** It added the parameter to `BehaviorInstall` and left `BehaviorFactory` and `draggable` at two, which does not compile and cannot infer `HTMLElement` for the sortable while defaulting to `true` for a behavior that stages nothing (Checkpoint C, C-04). The default lives on `BehaviorSpec` alone; every type above it _carries_ the parameter and defaults nothing, because a default here would silently pin a behavior's staged type to `true` instead of inferring it. Both of these are now compiled, in `packages/drag2/tests/revision/phase-14.ts`:

```ts
BehaviorSpec<SortableFramePart, HTMLElement>; // stages a detached placeholder
BehaviorSpec<FreeDragPart>; // stages nothing; Activation = true
```

`kernel.arm(spec)` carries `Activation` as well, and the seam driver erases it to `{}` — the kernel threads the staged value and drops it, so nothing inside the executor is generic over what a behavior staged.

**`Behavior<Controller>` erases both `Part` and `Activation`** at the opaque brand (D-30's behavior half, kept by D-45). That was already true of `Part` and is right for the same reason: nobody outside the factory names either, and carrying them would make a behavior's private frame shape part of the value's type. **Opacity survives D-48 by splitting rather than weakening.** At the ordinary tier it is total and free — nothing there names a behavior at all, because the entry point returns a controller. At the kernel tier the authoring surface is deliberately **structural**: an author writes a factory literal and reads `KernelHost`, which is what authoring means. The brand and `brandBehavior` survive as the library's own construction vocabulary and as a kernel-tier type a helper can name when it wants to _package_ a behavior without installing it. **No `defineBehavior`-style brander is exported**, because with `draggable()` accepting the factory there is nothing an author must brand — and, correspondingly, no call site in this document produces a `Behavior<Controller>` any more: `sortable()` installs directly.

What D-45 withdraws is one level down again and is a different value: the `SortableFeature` brand on a _fragment_, which is now a plain object literal (§The behavior instance).

`arm()` is not on `KernelHost`; only `draggable()` holds the kernel handle, and it calls `arm()` exactly once. A behavior cannot arm itself, re-arm, or observe the kernel object.

**D-1's two-phase handshake is untouched by D-48, and that is why the move is safe.** Whichever tier the call sits at, the ordering is the one probe 1 needed a rule for: the host exists before the factory runs, so a behavior can build host-backed runtime and controller state; the factory returns `{ spec, controller }` complete; and only then does `arm()` compose the frames and attach ingress. "No input can be admitted before `install()` returns" stays unexpressible rather than enforced. §11's progressive-disclosure requirement is a requirement about _that_ ordering, and relocating the function preserves it exactly.

~~Consumer-facing shape is unchanged from probe 1:~~ **Revision 2 changes it** (D-44, D-45, D-48). The previous form was `draggable(list, sortable(items, y(), placeholder({ className: 'ghost' }), callbacks({ onReorder })))` — an eager array, a variadic list of branded feature values, and a two-call composition. D-48 makes `sortable()` the ordinary entry point: it takes `root` first, returns a `SortableController`, and calls `draggable()` itself. D-45's argument list is variadic _config fragments_, and D-44 makes the collection a pull source inside the config:

```ts
const controller = sortable(
  list,
  { items: () => items },
  y(),
  placeholder({ className: 'ghost' }),
  callbacks({ onReorder }),
);
```

**`root` is named exactly once, and the tier boundary is what makes that possible** (D-48). D-45 writes the call as `sortable(root, config, y(), landing())`; this document used to compose `draggable(list, sortable(items, …))`, which named the element twice the moment the first argument moved. The decision resolves it by moving the public boundary rather than by choosing between the two spellings: `sortable(root, …)` and `freeDrag(root, …)` own the ingress boundary at the ordinary tier and forward it to a `draggable()` the consumer never sees, while `draggable(root, factory)` owns it at the kernel tier for an author who is writing a behavior instead of using one.

**This is closer to the shipped package than the pre-revision contract was**, which is worth stating because Revision 2 is otherwise a list of departures. The shipped call is `sortable(container, options)` — one call, element first. The pre-revision contract replaced it with a two-call composition and moved the element onto the outer call; D-48 restores the one-call shape and only generalises `options` into `config, …fragments`. A consumer migrating from the shipped package changes what they pass, not how many calls they make.

## `KernelHost`

The whole construction-time surface. **Six** members, none of which lets the behavior drive a transition. (D-2) It said _seven_ between Phase 14 and Revision 2; D-41 deletes the one Phase 14 added.

```ts
type KernelHost = Readonly<{
  /** The owning document/window. Every DOM access goes through it. */
  realm: DOMRealm;

  /**
   * The ingress boundary passed to `draggable()` — by the author at the kernel
   * tier, by `sortable()`/`freeDrag()` forwarding their own first argument at
   * the ordinary one (D-48).
   */
  root: HTMLElement;

  /**
   * Enqueue one behavior action. `tag` is behavior-local and must be in
   * `0 .. config.actionTags - 1`; the kernel offsets it internally and
   * bounds-checks it here. Two array pushes: **no per-entry wrapper, and
   * capacity growth is amortized.**
   */
  dispatch(tag: number, argument: unknown): void;

  /**
   * Queue a classified failure against the operation the kernel currently
   * holds. Never thrown at the producer. The behavior does not pass an
   * operation identity — the kernel knows its own.
   *
   * Valid **only inside a kernel-driven seam of the current operation**: the
   * kernel latches `inSeam` around every `prepare`/`effect`, and a call outside
   * one is reported as a `DraggableWarning` instead. Otherwise a late
   * continuation from
   * operation A could classify a failure against operation B
   * (§[02](02-kernel-behavior-contract.md) §Failure classification).
   */
  fail(stage: FailureStage, error: unknown): void; // `FailureStage` is kernel-tier vocabulary (D-64)

  /** Base controller methods, for the behavior to spread into its controller. */
  cancel(reason?: unknown): void;

  /**
   * Closes the controller **logically**, immediately, on this statement. The
   * returned promise settles **once**, after physical teardown — which is this
   * call when no library transaction is active, and the boundary of the
   * outermost one when there is (D-36). §Teardown across two owners.
   *
   * Idempotent: repeated destruction closes nothing further and every returned
   * promise still settles exactly once.
   */
  destroy(): Promise<void>;
}>;
```

**`destroy()` returning a promise costs the consumer real ergonomics, and the cost is not hypothetical.** Probe A converted the surface and found **46 first-party call sites** turning into `no-floating-promises` violations — every one of them a plain `controller.destroy();` that never wanted a completion signal, including a React `useEffect` cleanup in this package's own demo, where returning the promise would change the cleanup's contract. The remedy is `void controller.destroy();` at each site that does not care, and `await controller.destroy();` at the few that do. D-36 accepts that in preference to a second public concept — no `destroyed` property, no completion method, no token — because the completion is only observable in the deferred reentrant case, and a rarely-useful promise is cheaper than a permanently-visible API surface.

Compare probe 1's `Kernel`: `runtime`, `install`, `begin`, `commit`, `preparationValid`, `isCurrent`, `resolve` are all gone. `resolve` moved into a per-seam argument (§[02](02-kernel-behavior-contract.md) §Release); the rest have no counterpart because the behavior no longer transitions anything.

`host` is created once and is stable for the controller's life, so a behavior that captures it captures one object.

**All six are unchanged by the Phase 14 revision, and the attribution matters.** Probe 13a's negatives are that the host owns no extensible ingress (N-2), no way to mint an operation (N-5) and no return channel from `dispatch` (N-3); probe 13c's is that there is no motion entry (N-4). **D-32 answers all four without adding a member**, because a behavior that declares which events it wants to be asked about is not a behavior that drives the kernel — a second input mode cost this surface nothing. Each of those four assertions still fails to compile, which is the property the probes exist to keep.

**The seventh member is withdrawn (D-41), and the host is back to six.** Original text follows. ~~The seventh member is **D-33's** `presentationCommitted`. It is the one addition this revision makes to the host, and it is the same kind of thing `cancel` is: an operation-scoped signal, latched by the kernel, that does not transition a frame. Reporting a single total would have hidden which decision paid for it.~~

D-41 deletes the authored-presentation acknowledgement whole — `controller.ready(request)`, `ResolutionOptions`, `rt.pendingRequest`, the acknowledgement deadline and this host member with them — because the serial commit order leaves the readiness hold **no producer**: a consumer that must render before the landing measurement awaits its own commit inside `onReorder`. The attribution the original paragraph insisted on survives its own deletion, and reads better now than it did then: **D-32 answered four probe negatives without adding a member, and the one member Phase 14 did add is the one Revision 2 removes.**

## The behavior instance

```ts
/**
 * A fragment is a **plain partial config object** — not a branded value, not a
 * factory result the library tracks (D-45). `y()` returns `{ axis: … }`;
 * `layoutAnimation()` returns `{ plugins: [ … ] }`; a consumer may write one
 * inline, spread a preset, or lift `weirdThing().axis` out of a helper.
 */
type SortableConfigFragment = Partial<SortableConfig>;

// The ordinary tier (D-48): `root` first, named once, and a `SortableController`
// out. `draggable()` is called here and is never named by the consumer.
function sortable(
  root: HTMLElement,
  ...fragments: readonly SortableConfigFragment[]
): SortableController {
  // `SortableFramePart` and `HTMLElement` are fixed inside the factory and
  // inferred out of it; they reach neither this parameter list nor this return
  // type, and nothing here spells them.
  return draggable(root, (host) => {
    // Merge first, materialize second (D-45): the merge is over config slots,
    // and only the winning installer of each slot is ever invoked.
    const config = mergeSortableConfig(fragments); // §03
    const slots = assemble(config, host); // §03; drops the installers' results
    const rt = createSortableRuntime(host, config.items, slots);
    return {
      spec: createSortableSpec(rt), // closures over `rt`
      controller: createSortableController(host, rt),
    };
  });
}
```

**The variadic call survives; what it is variadic _over_ changes.** The library keeps the merge rather than asking the consumer to pre-merge one object, because merge semantics belong to the **slot**, not to fragment provenance: a scalar or capability slot is last-wins as one whole slot, and `plugins` **appends in fragment order**. A consumer-merged single object would silently last-wins the one slot that must concatenate. Defaults are derived after the merge, and the library keeps no record of which helper a field came from — `weirdThing()`'s provenance is gone the moment the object exists (D-45).

**One `rt`, created inside the factory, shared by both halves.** That coupling is the whole of H-2 and it is why the factory exists at all: the spec closes over the same runtime object the controller was handed, and neither can be constructed without a `host`.

`rt` is an ordinary object, declared and created in one place, never handed to the kernel and never widened. Its type is not exported. (H-2, D-4)

```ts
type SortableRuntime = {
  readonly host: KernelHost;
  readonly slots: SortableSlots;
  /** Created once per controller; cancelled at retire and destroy. */
  readonly frame: FrameTask<number>;
  snapshot: CollectionSnapshot;
  /** The per-operation object both feature views bind to. Null when idle. */
  view: PresentationView | null;
  placeholder: HTMLElement | null;
  /**
   * The **projected** capability (`visual`, `baseTransform`, `compose`,
   * `write`), handed in at activation and cleared at retire. Never the whole
   * session: `rendered` and `dispose` are kernel-only (D-35, C5-01).
   */
  lift: BehaviorLiftSession | null;
  spatialSeq: number;
  pendingSpatial: number;
};
```

`frame` is **not** nullable and is **not** created per operation. An earlier draft initialised it to `null` and never assigned it anywhere, which made the first active pointer move a null dereference (review 4, §3). Creating it once per controller removes the null, removes an allocation from the activation path, and costs nothing in staleness handling — the task's identity is never operation-scoped, because staleness is carried by the monotonic spatial attempt number it schedules. It is cancelled by the motion lifetime at release, by `retire()`, and by teardown.

**This moves an allocation rather than removing one, and which policy is cheaper is not decided** (review 5, §19). Eager-per-controller gives every controller an object, method and closure graph even if it never activates; the shipped package creates the task during activation instead, paying nothing for cold controllers and paying again on every drag. The functional fix — the task must exist before the first move — is settled; the allocation policy is part of M-2.

**Seven mutable fields** — six, plus `closed` from C2-01 — beside three readonly ones (`host`, `slots`, `frame`). ~~**Eight** — six, plus `pendingRequest` from D-33 and `closed` from C2-01.~~ D-41 deletes `pendingRequest` with the acknowledgement protocol that was its only reader, and the count returns to the number it held before Phase 14. The `closed` half of that history is untouched and is the half that carries an argument: the count was _six_ until Checkpoint D review 2 moved the controller's terminal latch onto the runtime, so that D3's one reader and I-36's readers read **one** latch rather than two that can disagree — which D-37 leaves standing at the floor, since a floor reading is still a latch reading. The document said _eight_ before Checkpoint C, C4-08, which was the different error of counting the readonly three among them. Probe 1's shared runtime had those _plus_ fourteen kernel fields (`actions`, `args`, `running`, `closed`, `current`, `draft`, `ingress`, `spec`, `lifetimes`, `originRect`, three attempt slots, `cancelRequest`, `pendingContinuation`, `destroyRequested`). Those fourteen are now unreachable, unnameable and untestable-from-outside — which is correct: none of them is a behavior concern, and probe 1 exported them only because the container was shared.

### `snapshot` is fed by a pull source, not by a construction-time capture

The runtime used to be handed `items` once, at construction, and every later change arrived through `updateItems(payload)` — two collection channels, neither of which re-read the other. D-44 collapses them into one source and one signal:

```ts
sortable(list, { items: () => itemsRef.current });
controller.invalidate();
```

`items()` supplies the **current committed collection**; `controller.invalidate()` says the committed presentation or data **may** have changed and carries no payload. `updateItems(payload)` is removed, and no `itemCount()`/`itemAt()` scanning protocol replaces it.

**Array identity is the structural-change signal**, and it is what decides how much work an invalidation costs:

| `items()` returns | What the behavior does |
| --- | --- |
| the **same** array identity | geometry and presentation invalidation only — no copy, no reconcile |
| a **new** array identity | snapshot, reconcile the semantic gap, then invalidate geometry |

The library's shallow copy therefore happens **only** on the structural branch. That is the whole point of testing identity: a resize or a zoom produces a warm geometry-only invalidation, and putting an O(n) copy on that path would charge structural cost for a purely spatial event. In-place structural mutation of the same array is **outside the contract** — the consumer that mutates and keeps the identity gets geometry invalidation and a stale snapshot, and the library does not detect it. React, Vue and Svelte all produce a new array when order changes, so the test is free at the source.

After release the proposal stays frozen: a structural invalidation arriving during the settlement does not reinterpret it.

**`controller.invalidate()` and the feature-owned geometry `invalidate()` (§[03](03-feature-composition.md)) share a name deliberately, and they are not the same slot.** The controller member is the **cause** — a consumer statement saying the committed world moved. The geometry slot is the **effect** — what the axis feature runs when it is told. Every mention below and in §03 keeps the receiver attached for exactly that reason.

Note what is _not_ here: `rects`. The geometry cache lives inside the axis feature — `y()` or `xy()` (§[03](03-feature-composition.md)) — which is probe 1's open question Q-5 answered by construction rather than by argument.

## Ownership table

| Concern | Owner | Reachable from |
| --- | --- | --- |
| Action queue (two parallel arrays), `running`, `closed` | kernel | nothing |
| `current` / `draft` references, commit swap, frame composition | kernel | nothing — the _frames_ are passed as arguments, the references are not |
| `phase`, `operation`, pointer scalars | kernel (frame slice, 7 fields) | behavior, read-only |
| Operation identity, minting and validation | kernel | nothing |
| Cancellation latch, precedence, `destroyRequested` | kernel | nothing |
| Five resource lifetimes | kernel | behavior, as **two** narrowed `LifetimeScope` arguments at activation |
| **Pointer capture** (on `root`, acquired at activation) | kernel (D-17) | nothing |
| Ingress listeners — `pointerdown`, plus each `command.types` entry | kernel (D-32) | behavior, as the _declaration_ of which types to bind; never as a registration |
| `preventDefault()` on an admitted ingress event | kernel (D-32, C-03) — **ownership unchanged by D-46; the _policy_ is new** | nothing — the behavior answers feasibility with its return value |
| Lift session + inline-style snapshot + **the last rendered delta** | kernel (acquires, disposes, records) | behavior, as a **`BehaviorLiftSession`** — `visual`, `baseTransform`, `compose`, `write` and nothing else. `rendered` is kernel-read; `dispose` is kernel-sequenced. The behavior can neither sample the delta nor unwind the lift (D-35; Checkpoint C, C5-01) |
| `originRect` | kernel | behavior, as an activation-scope argument |
| Resolution attempt; settlement attempt including **the landing gate hold** | kernel (D-7, narrowed to one gate by D-41) | nothing. No settlement object crosses either boundary. ~~Including the **early-acknowledgement latch**, **both gate holds** and the readiness deadline (D-33) — deleted with the acknowledgement protocol~~ |
| The authoritative final pin | kernel, via the lift it owns (D-16, narrowed by D-41 to _measure once, pin at the join_) | — |
| ~~`readinessTimeout` policy~~ | ~~kernel, configured by spec scalar~~ — the acknowledgement deadline goes with D-33 (D-41) | — |
| Collection snapshot, insertion, proposal, outcome, recovery, domain result | behavior (runtime + frame part) | features, through declared views |
| The landing target, and re-anchoring presentation to the semantic item | behavior, via `anchorTarget` (D-16) | — |
| Placeholder element | behavior | features, through declared views |
| Coalesced rAF task, `spatialSeq`, `pendingSpatial` | behavior | nothing |
| The published `ReorderRequest` | behavior | the consumer **holds** it: it is `onReorder`'s argument. ~~— the acknowledgement identity (D-33) … the behavior compares by identity rather than trusting it~~ D-41 deletes the acknowledgement, so the request is a domain payload and nothing more; the behavior retains no copy of it to compare against |
| Collection pull source and the array-identity test | behavior, from `config.items` (D-44) | the consumer owns the source; the behavior owns the snapshot it derives |
| Packed rect index and the axis rule | the axis feature — `y()` or `xy()` | nothing |
| Per-element displacement records | `layoutAnimation()` | nothing |
| Landing runner mechanics | `landing()` | nothing. **D-63: the consumer supplies timing, never a runner** — the library owns the animation, and a runner is authored at the middle or kernel tier |
| Persistent ordered state | consumer | — |

**The `preventDefault()` row changes meaning without changing owner.** The kernel still makes the call, and the behavior still answers only feasibility with its return value — no participant gains or loses reach. What D-46 withdraws is the call being **unconditional at admission**: a press that never crosses the activation threshold must leave native focus, caret, selection and form-control behavior intact, and command ingress must ask what the event landed on. The policy itself — the `[data-drag-ignore]` decline rule (~~the interactive/editable rule and the separate keyboard-command rule~~, both withdrawn by D-129), `event.isComposing`, and the modifier for plain-text selection — belongs to §[02](02-kernel-behavior-contract.md), which states it. This table records only that the act stayed kernel-owned while its trigger condition moved.

The row that matters: **no participant can reach another's mutable state except through an argument that participant was deliberately given.** Probe 1 had one container everybody could reach and relied on `Pick<>` types to discourage it.

### The inline-style snapshot is per longhand, and is never the `style` attribute

The lift's style lease is the kernel's, and restoring it is the one guarantee the presentation module owns outright. Two properties of _how_ it restores are normative rather than incidental:

- **Capture and restore by longhand, with priority.** The lift writes shorthands — `inset`, `margin`, `padding`, `border-width`/`-style`/`-color`, `overflow`, `transition` — but the page authors whatever it likes, and the two do not correspond. A shorthand only serializes when every longhand is present and consistent, so `style="margin-left: 8px"` yields `''` for `getPropertyValue('margin')`: capturing by shorthand records nothing, and restoring by shorthand then calls `removeProperty('margin')` and drops the authored declaration for good. Longhands are also the only way `!important` survives, because priority is per declaration — an authored `padding-top: 4px !important` beside three ordinary paddings cannot be one shorthand entry at all. Removing every longhand of a shorthand is exactly removing the shorthand, so no separate clearing pass is needed.
- **Never restore the saved `style` attribute wholesale.** A drag is a window in which the consumer's own code runs — `onStart`, the resolver, the authored commit the resolver awaits — and it may legitimately write inline styles the lift never touches. Restoration reverts exactly the declarations the lift is responsible for and leaves everything else as the consumer left it.

### Lifetimes: five scopes, three objects, two arguments

These three numbers all appear in the documents and are not in conflict; the taxonomy is inherited verbatim from the shipped design (D-14).

| Layer | Count | What |
| --- | --- | --- |
| Conceptual resource scopes | **5** | controller ingress · 2a motion ingress · 2b cancellation and resolution · 3 temporary presentation · 4 async attempts |
| Physical operation `Lifetime` objects | **3** | motion, cancellation, presentation. Ingress is the controller's own `AbortController`; attempts are records, not lifetimes. |
| Narrowed scopes handed to the behavior | **2** | `motion` and `presentation`, as `LifetimeScope` (no `dispose`), on `ActivationScope` |

2a and 2b stay separate objects: motion closes at release while cancellation must stay open through the consumer round-trip.

## When construction itself fails

`draggable()` runs three fallible steps before it can return a controller — `assemble()` (under D-45, the slot merge and then the installers it names), the behavior's own construction, and `kernel.arm(spec)` — and an earlier draft defined cleanup for none of them (review 4, §13). Under D-48 all three still run inside `draggable()`; what changes is where the throw surfaces, which at the ordinary tier is `sortable()` rather than a `draggable()` the consumer wrote. Nothing about the unwinds below depends on which frame catches it.

The rule adopted is the strict one:

**Feature factories and behavior construction are externally inert.** A feature may allocate whatever private state it likes, but it may not attach a listener, write the DOM, or acquire anything that needs releasing. Every acquisition happens inside a kernel-owned operation lifetime. This is checkable by reading each factory, and it is already true of all seven first-iteration features.

**D-45 makes this stronger rather than weaker, and cheaper to check.** A fragment is now a plain partial config object: `y()` evaluates to `{ axis: installYAxis }` and installs nothing at all, so inertness at _fragment_ construction is structural rather than a discipline a reviewer has to confirm by reading the body. The obligation does not disappear — it moves onto the **installer**, which is the value the fragment names and the thing `assemble()` actually invokes — but it now applies to a smaller, first-party set of functions than "every factory a consumer may call".

Inertness alone is not quite enough, so two unwinds are also normative:

- **`assemble()` unwinds.** An installer _may_ still contribute a `retire` hook for private state that wants explicit clearing. If a later installer or a validation rule throws, the hooks collected so far run in reverse, each wrapped, before the error propagates. The loop already holds the array; this is four lines.

  **D-45 adds an ordering rule that shrinks what can need unwinding: installers are invoked _after_ the merge completes.** The assembler collects fragments, merges by slot, derives defaults, and only then materializes. So a capability that loses a last-wins slot — a second `y()` overriding the first, a preset's `axis` overridden by the call site's — is **never constructed**, and there is nothing to unwind for it. Unwinding covers the installers that actually ran, which after the merge is at most one per capability slot plus the whole `plugins` array. Merge-first is also what makes the losing installer's absence observable as a non-event rather than as an acquire/release pair.

- **`arm()` unwinds.** If either frame factory, the frame-part validation, the shape assertion, the static-configuration validation or any ingress attachment throws, `arm()` calls `spec.retire()` best-effort, scrubs whichever frame exists, aborts ingress, and rethrows. A controller is never returned half-armed.

  **Ingress is `pointerdown` plus each type a `command` member declares** (D-32). Every listener is bound on `root` against the one controller-lifetime ingress signal, so the unwind and the teardown abort in step 7 below release all of them together and a discrete listener can never outlive I-6's terminal barrier. Under D-36 a deferred step 7 leaves those listeners physically **attached** until the transaction boundary; the barrier is unaffected, because admission is refused from the logical latch onward (D-37) and an attached listener that admits nothing is a non-event. This is the reading D-38 makes normative: `ingress.signal.aborted` answers "has teardown run", never "is this controller alive". `arm()` validates `command.types` here, with the same construction-time `TypeError` policy as every other static option, and since D-118 it validates one thing: no type the kernel binds for its own pointer ingress. An empty array binds no discrete listener and is a supported spelling of that, and the other four shapes this sentence once listed are accepted.

## Teardown across two owners

~~`destroy()` is a synchronous terminal barrier, unchanged in semantics from the shipped package.~~ **`destroy()` is an _immediate_ terminal barrier, and D-36 changes its semantics from the shipped package's.** The change is not a clarification and should not be read as one:

- **Logical closure is immediate.** The latch is set on the closing statement itself, not at the end of a seven-step sequence. From that statement onward every guard fails, no operation is admitted, no declared consumer slot is invoked and no lifecycle or domain event is published (D-37).
- **Physical teardown is deferrable.** If synchronous library execution is in progress when `destroy()` is called, teardown runs at the boundary of the **outermost** library transaction rather than on the closing stack. Outside a reentrant transaction the two events still coincide, which is why the shipped behavior is the common case rather than the definition.
- **`destroy()` returns `Promise<void>`**, settling once, after physical teardown. Repeated destruction is idempotent and every returned promise still settles exactly once.

What was `destroy()`'s guarantee — _physical release completes before it returns_ — is therefore withdrawn. What replaces it is stronger where it matters and weaker only where it did not: the **latch** is now set earlier than it ever was, and only the resource release is late.

It still spans two private state spaces, in a fixed order. Step 1 is the logical close and runs on the calling statement, always:

```text
1. closed = true; destroyRequested = true        (kernel)   every guard now fails
```

Steps 2–7 are the physical teardown. They run at the transaction boundary when one is active, and immediately after step 1 when none is:

```text
2. clear the queue, drop every retained argument (kernel)
3. retire kernel attempts, **each step best-effort and individually wrapped**:
   abort an uncompleted resolution and clear its settlement; on the settlement
   attempt, `destroy()` the landing handle, then drop the attempt entirely
                                                                      (kernel)
   ── a throwing landing handle here must not prevent steps 4–7. It is the same
      policy as the join, and for the same reason: the runner is code the kernel
      did not write. ──
4. spec.retire()                                 (behavior) wrapped in try/catch
5. dispose presentation → motion → cancellation lifetimes, LIFO, best-effort
                                                 (kernel)   releases capture
6. scrub both frames: resetKernelFields, then spec.resetFramePart      (both)
   ── **each frame's reset is individually wrapped.** `resetFramePart` is
      behavior code the API permits to throw, and an unwrapped throw on the
      first frame would skip the second scrub *and* step 7 — leaving `destroy()`
      non-terminal, which I-6 forbids. The reset error is reported and never
      substitutes for the initiating destroy/panic error. ──
7. abort controller ingress                      (kernel)
   ── unconditional: step 7 runs from a `finally`, so no earlier step can
      prevent ingress from being released. **One abort releases every ingress
      listener**, `pointerdown` and each declared command type alike (D-32),
      because they share the controller-lifetime signal. ──
```

**The sequence and its order survive D-36 intact; only its start time moves.** D-29's totality is rescoped, not retracted: totality is a property of the teardown _sequence, wherever it runs_, not of the stack that called `destroy()`. When teardown defers, the same six physical steps run at the boundary with the same wrapping — each attempt cleanup individually wrapped in step 3, each frame reset individually wrapped in step 6, ingress abort from a `finally` in step 7. What no longer holds is that they have run by the time `destroy()` returns; that is what the returned promise is for.

**No physical-teardown observation may answer a liveness question** (D-38, I-37). Deferral makes an aborted signal, a disposed session or a detached node **lag** the logical close, so `presentation.signal.aborted` and its relatives stop being valid readings of "is this controller still alive" — they were chosen precisely because they are strictly stronger than the latch, catching a kernel-internal panic as well, and deferral turns that same property into strictly weaker. Liveness is read from the logical latch or from transaction validity, and from nothing else.

**Step 3 drops both attempts outright**, which is what makes every late continuation inert: the kernel finds no attempt to resolve against, so a landing `done()` arriving after teardown is the same non-event a stale one is during normal operation. ~~Dropping both attempts makes a late `controller.ready(request)` inert twice over (D-33): the behavior's published request is cleared by step 4's `retire()`, and the kernel finds no attempt even if a behavior bug let the signal through.~~ D-41 deletes `controller.ready()` and `rt.pendingRequest`, so the second half of that argument has no subject; the attempt-dropping is unchanged and is now justified by the staleness rule alone.

**Destroy never pins.** The authoritative pin (D-16) belongs to the normal settlement join; a destroyed controller has no authored DOM to agree with, and `LandingHandle.destroy()` is defined as never writing a final position.

Two invariants this ordering creates, both of which are new obligations that probe 1's single container did not have (F-12):

- **No behavior callback in the sequence can stop a later step** — wherever the sequence runs. The kernel wraps `spec.retire()`, each attempt's cleanup (including a throwing `LandingHandle.destroy()`), and each frame reset, reporting and continuing. ~~through the platform reporter~~ — since D-130 the report is a `DraggableWarning` on the consumer's `onError`, **and after logical closure it is refused rather than delivered** (D-37): what the sequence guarantees is that the next step runs, never that the consumer hears about the one that did not. A behavior cannot strand the kernel's DOM cleanup, and ingress abort is in a `finally`. Deferral does not touch this: the wrapping travels with the steps, and a throw at the transaction boundary is caught by the same handlers it would have been caught by on the closing stack.

  **The same totality applies to the `arm()` unwind**: a reset that throws while unwinding a failed `arm()` must not replace the original arm failure or skip ingress cleanup.

  **The converse obligation is the participant's, and it is not covered by any of the above** (I-36, added by C2-01; **rescoped by D-37**). Totality says the sequence above finishes; it says nothing about code that is _already running_ when `destroy()` is entered reentrantly. A `destroy()` raised from inside consumer code — a `handle()` or `visual()` resolver, a placeholder custom element's connected/disconnected reaction — sets the latch and **returns into the middle of whatever was calling it**, with the physical steps still to come at the transaction boundary.

  **The floor stands, and it is all that stands.** A participant that invokes consumer code **more than once** inside one seam or one native admission owns the barrier between those invocations: it reads the terminal latch and stops on the first closed reading, publishing nothing, retaining nothing, and invoking no declared consumer callback. That is F-47's defect and F-47's fix, and D-37 keeps it verbatim, because a declared-slot invocation is the one act a transaction boundary cannot undo — for a call, the consequence _is_ the call.

  **Every ceiling above that floor is withdrawn** (D-37). The promises that the library reads no further geometry, and that no further consumer-reachable read occurs anywhere in the remainder of the current call graph, are retracted; the **ceiling register** of stronger site-specific promises is retracted with them; and the **consumer reach/stretch analysis is retired as a proof domain**. The replacement is finite and API-shaped: after logical closure the library must not invoke a declared consumer slot, admit another operation, or publish another lifecycle or domain event. Internal work already inside the current transaction may finish, provided it survives the boundary in no observable form. Probe A is the measurement, not the argument: 27 of its 33 statement-level liveness readings retire under the bracket, because a guard exists to stop work that would outlive the close, and work the boundary undoes has no consequence to stop.

  Two things the retraction does **not** reach. The kernel's own `queue.closed` boundary guards are a different category from the statement-level I-36 guards and are untouched. And restoring state still matters as much as stopping calls where a participant does resume — a sequence that resumes and marks its cache clean re-pins DOM `retire()` had released, against I-20 — with the difference that under deferral `retire()` may not have run yet, so the correct reading is the latch and never the cache's own disposal state (D-38).

  The mechanism is behavior-owned and not promotable, so this half of the terminal guarantee is **tier C** while everything above it is tier B — §[05](05-lifecycle-invariants.md) I-6 carries that split in its own row, and I-36 and F-47 state it. Original text follows. ~~Every barrier the kernel owns is complete at the kernel's granularity of one callback … **The obligation is provisioning in two forms — a participant's own reading, or a named kernel bracket that revalidates and undoes — over a floor of consequences, plus a register of stronger site-specific promises; it is not a quantifier over call sites** — §05 I-36 (1), (2) and (3) state why the quantifier form is not dischargeable and why provisioning alone does not discharge it either.~~ The retracted sentence was already reaching for D-37's answer and stopped one step short: having found that the quantifier form is not dischargeable, it kept a register of promises quantified the same way.

- **`spec.retire()` runs before the presentation lifetime disposes, but after attempts are inert.** It must therefore tolerate DOM that is still attached, and must not assume it will be the thing that removes it — the placeholder is removed by the disposer the behavior registered on the _presentation lifetime_ at activation, not by `retire()`. `retire()` drops references; the lifetime releases DOM.

The same seven steps, minus 1, 2 and 7, are operation retirement.

**Panic** is `destroy()` followed by reporting the initiating error — a `DraggableError` with code `platform` and **no stage**, since `FailureStage` classifies faults _within_ an operation and a panic destroys the controller (D-131). ~~with teardown strictly before reporting~~ — **D-36 reverses that ordering to close → report → teardown**, and probe A observed exactly the reversal, `['retire','report']` becoming `['report','retire']`.

The reversal is **safe, not merely permitted**, and the reason is the shape of the window rather than a judgement about what reporting is allowed to see:

- **`panic()` is reached from `drain`'s `catch`, after the loop has already exited.** The deferral window is therefore **one stack frame wide**, and the only statement inside it is `report`.
- ~~**`report` touches no library state.** It reads the error it was handed and hands it to the platform reporter. It mints nothing, admits nothing, and mutates neither kernel nor behavior state, so there is no state whose teardown it could observe out of order.~~ **False since D-130, and D-131 replaces the clause rather than the ordering.** The statement inside the window is now the consumer's `onError`, which does touch library state and can call back in. The ordering survives on the _next_ bullet alone, and the delivery becomes a **named exception to D-37 (a)** — the second member of D-51's closed list, admitted for the property D-51 used to admit `LandingHandle.destroy()`: a terminal diagnostic tells the consumer something and asks nothing of them, publishing no lifecycle or domain event, ignoring its return value, performing no operation work, and wrapped.
- **The latch is already set before it runs.** Whatever the handler's own code does — including calling back into the controller — meets a closed controller, because step 1 preceded the report. The old ordering bought its safety by finishing teardown first; the new ordering buys the same safety earlier and more cheaply, from the latch. **This is now the whole argument**, and the alternative it beats is stated in D-130 §8: reporting first would run consumer code on a controller whose invariants are already known to be broken, with the added hazard that the consumer may start work the next statement tears down.

The one way to distinguish the two orderings from outside is to observe physical teardown — an aborted signal, a disposed session, a detached node — during the report. D-38 forbids reading any of those as a liveness answer, so the distinction is unobservable by any participant obeying the contract. **No library work continues on the broken stack**: the frame that panicked unwinds, and teardown runs at the boundary below it.

## Why not thread the behavior state as an argument

The obvious alternative to D-4: let the kernel hold one opaque `S` and pass it as argument zero to every callback, making `BehaviorSpec` a module-level frozen constant shared by every controller. That is better for memory (one function object per seam per _package_, not per controller) and for call-site inline caches.

It is not chosen because the closure model is simpler to specify and to reason about, and because a sortable page has one controller per list rather than one per item — so ~16 closures and one spec object per controller is expected to be irrelevant.

**That expectation is not evidence, and the earlier justification was worse than no justification.** It said the alternative "requires the kernel to _store_ behavior state, which is precisely what H-2 forbids". Holding an untyped reference does not make the kernel know, expose or structurally widen that value; H-2's substance is that the kernel cannot _reach into_ behavior state, which a phantom `S` preserves exactly. Deciding a performance question on the wording of a claim is backwards in a repository whose first code-style priority is performance.

So the closure model ships as the first implementation, **and the measurement is owed**: heap and move-call behaviour at realistic controller counts, closure model versus opaque-`S`-plus-static-spec. If there is no material difference, keep the closure model and record the evidence in place of this paragraph. The swap is mechanical and touches no semantics either way (F-4).