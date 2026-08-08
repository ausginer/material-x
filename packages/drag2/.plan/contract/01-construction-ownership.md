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
                 │   (both gate holds), cancel latch,      │
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

/** The install function itself — internal, and the only place all three meet. */
type BehaviorFactory<Controller, Part extends object, Activation extends {}> = (
  host: KernelHost,
) => BehaviorInstall<Controller, Part, Activation>;

/**
 * What a consumer holds and passes. `Part` and `Activation` are erased at the
 * brand (D-30, D-34); `Controller` survives so `draggable()` can infer a return
 * type.
 */
declare const BEHAVIOR_BRAND: unique symbol;
type Behavior<Controller> = Readonly<{ [BEHAVIOR_BRAND]: Controller }>;

function draggable<Controller>(
  root: HTMLElement,
  behavior: Behavior<Controller>,
): Controller {
  // The one place the erasure is undone, and it is private. `object` and `{}`
  // are the widest bounds the parameters permit, which is sound precisely
  // because nothing inside the executor is generic over either: the kernel
  // threads the staged value and drops it.
  const factory = unbrandBehavior(behavior); // → BehaviorFactory<Controller, object, {}>
  const kernel = createKernel<object>(root); // queue, frames unarmed, no listener
  const { spec, controller } = factory(kernel.host);
  kernel.arm(spec); // composes both frames, attaches ingress
  return controller;
}
```

**The public parameter is the opaque `Behavior<Controller>`, not the factory** (Checkpoint C, C4-03). An earlier version of this section declared `draggable()` against `BehaviorFactory<Controller, Part, Activation>` and had `sortable()` return one. Because this document is normative, that was not a stale example: it published the internal factory type _and_ both private generic parameters at the exact boundary D-30 closes, and it contradicted §03 §Closed for real, which makes the opacity a public-boundary decision. The compiled fixture had it right and the prose had not caught up.

Inference still costs the consumer nothing: `Controller` is inferred from the argument, and `Part` and `Activation` are not inferred at all at this boundary — they were fixed inside the factory before the brand was applied, and `unbrandBehavior` widens them to `object` and `{}` for the driver. That widening is the D-34 handshake's last step and is compiled in the Phase 14 fixture, which is where "these two aliases are compatible" stops being the claim and `unbrand → factory → arm` starts being it.

`Part` is the behavior's **frame part**, not the composed frame — the composed type exists only inside the kernel, where `Object.assign`'s `T & U` typing produces it without a cast (D-9, D-15). (An earlier sketch wrote `<F extends KernelFrame>` on the _return_ side, which is unsatisfiable: it would require a behavior to produce a valid install for any frame the caller chose.)

**`Activation` threads all the way through, and an earlier draft of the Phase 14 revision did not thread it.** It added the parameter to `BehaviorInstall` and left `BehaviorFactory` and `draggable` at two, which does not compile and cannot infer `HTMLElement` for the sortable while defaulting to `true` for a behavior that stages nothing (Checkpoint C, C-04). The default lives on `BehaviorSpec` alone; every type above it _carries_ the parameter and defaults nothing, because a default here would silently pin a behavior's staged type to `true` instead of inferring it. Both of these are now compiled, in `packages/drag2/docs/revision/phase-14.ts`:

```ts
BehaviorSpec<SortableFramePart, HTMLElement>; // stages a detached placeholder
BehaviorSpec<FreeDragPart>; // stages nothing; Activation = true
```

`kernel.arm(spec)` carries `Activation` as well, and the seam driver erases it to `{}` — the kernel threads the staged value and drops it, so nothing inside the executor is generic over what a behavior staged.

**The public `Behavior<Controller>` erases both `Part` and `Activation`** at the opaque brand (D-30). That was already true of `Part` and is right for the same reason: no consumer names either, and carrying them would make a behavior's private frame shape part of the value's public type.

`arm()` is not on `KernelHost`; only `draggable()` holds the kernel handle, and it calls `arm()` exactly once. A behavior cannot arm itself, re-arm, or observe the kernel object.

Consumer-facing shape is unchanged from probe 1:

```ts
const controller = draggable(
  list,
  sortable(
    items,
    y(),
    placeholder({ className: 'ghost' }),
    callbacks({ onReorder }),
  ),
);
```

## `KernelHost`

The whole construction-time surface. Seven members, none of which lets the behavior drive a transition. (D-2)

```ts
type KernelHost = Readonly<{
  /** The owning document/window. Every DOM access goes through it. */
  realm: DOMRealm;

  /** The ingress boundary passed to `draggable()`. */
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
   * one is downgraded to a platform report. Otherwise a late continuation from
   * operation A could classify a failure against operation B
   * (§[02](02-kernel-behavior-contract.md) §Failure classification).
   */
  fail(stage: FailureStage, error: unknown): void;

  /**
   * The authored presentation for the operation the kernel currently holds is
   * final (D-33). The behavior calls this only after checking the consumer's
   * acknowledgement against the request it published — the kernel threads the
   * resolution as `unknown` and cannot do that check itself.
   *
   * Latched while a resolution attempt is open, so an acknowledgement that
   * arrives before the settlement exists is not lost; releases the readiness
   * hold once armed; ignored and reported outside both windows.
   *
   * An acknowledgement for an operation that declared **no** presentation is
   * reported as contradictory and then dropped — late, on arrival; early, at
   * seal, where the latch is discarded once the gate plan shows no readiness
   * hold to release. Every one of those reports takes the platform channel in
   * `DEV`, and none classifies the operation.
   *
   * **Not a transition.** A gate release is not a frame transition
   * (§[02](02-kernel-behavior-contract.md) §Settlement gates), so this belongs
   * to `cancel`'s family — an operation-scoped signal the kernel latches and
   * interprets — and H-3 is untouched.
   */
  presentationCommitted(): void;

  /** Base controller methods, for the behavior to spread into its controller. */
  cancel(reason?: unknown): void;
  destroy(): void;
}>;
```

Compare probe 1's `Kernel`: `runtime`, `install`, `begin`, `commit`, `preparationValid`, `isCurrent`, `resolve` are all gone. `resolve` moved into a per-seam argument (§[02](02-kernel-behavior-contract.md) §Release); the rest have no counterpart because the behavior no longer transitions anything.

`host` is created once and is stable for the controller's life, so a behavior that captures it captures one object.

**Six of those seven are unchanged by the Phase 14 revision, and the attribution matters.** Probe 13a's negatives are that the host owns no extensible ingress (N-2), no way to mint an operation (N-5) and no return channel from `dispatch` (N-3); probe 13c's is that there is no motion entry (N-4). **D-32 answers all four without adding a member**, because a behavior that declares which events it wants to be asked about is not a behavior that drives the kernel — a second input mode cost this surface nothing. Each of those four assertions still fails to compile, which is the property the probes exist to keep.

The seventh member is **D-33's** `presentationCommitted`. It is the one addition this revision makes to the host, and it is the same kind of thing `cancel` is: an operation-scoped signal, latched by the kernel, that does not transition a frame. Reporting a single total would have hidden which decision paid for it.

## The behavior instance

```ts
function sortable(
  items: readonly HTMLElement[],
  ...features: readonly SortableFeature[]
): Behavior<SortableController> {
  // The factory is built here and immediately branded. `SortableFramePart` and
  // `HTMLElement` are named once, inside, and never reach the returned type.
  return brandBehavior<SortableController, SortableFramePart, HTMLElement>(
    (host) => {
      const slots = assemble(features, host); // §03; drops the contributions
      const rt = createSortableRuntime(host, items, slots);
      return {
        spec: createSortableSpec(rt), // closures over `rt`
        controller: createSortableController(host, rt),
      };
    },
  );
}
```

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
  /**
   * The exact `ReorderRequest` object this operation handed `onReorder`.
   * Published by `release.effect` before the kernel executes the round-trip,
   * compared by **identity** in `controller.ready(request)`, cleared by
   * `retire()`. It is the whole of D-33's per-operation identity.
   */
  pendingRequest: ReorderRequest | null;
  spatialSeq: number;
  pendingSpatial: number;
};
```

`frame` is **not** nullable and is **not** created per operation. An earlier draft initialised it to `null` and never assigned it anywhere, which made the first active pointer move a null dereference (review 4, §3). Creating it once per controller removes the null, removes an allocation from the activation path, and costs nothing in staleness handling — the task's identity is never operation-scoped, because staleness is carried by the monotonic spatial attempt number it schedules. It is cancelled by the motion lifetime at release, by `retire()`, and by teardown.

**This moves an allocation rather than removing one, and which policy is cheaper is not decided** (review 5, §19). Eager-per-controller gives every controller an object, method and closure graph even if it never activates; the shipped package creates the task during activation instead, paying nothing for cold controllers and paying again on every drag. The functional fix — the task must exist before the first move — is settled; the allocation policy is part of M-2.

**Eight mutable fields** — six, plus `pendingRequest` from D-33 and `closed` from C2-01 — beside three readonly ones (`host`, `slots`, `frame`). This said _seven_ until Checkpoint D review 2 moved the controller's terminal latch onto the runtime, so that D3's one reader and I-36's four read **one** latch rather than two that can disagree; and _eight_ before Checkpoint C, C4-08, which was the different error of counting the readonly three among them. Probe 1's shared runtime had those _plus_ fourteen kernel fields (`actions`, `args`, `running`, `closed`, `current`, `draft`, `ingress`, `spec`, `lifetimes`, `originRect`, three attempt slots, `cancelRequest`, `pendingContinuation`, `destroyRequested`). Those fourteen are now unreachable, unnameable and untestable-from-outside — which is correct: none of them is a behavior concern, and probe 1 exported them only because the container was shared.

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
| `preventDefault()` on an admitted ingress event | kernel (D-32, C-03) | nothing — the behavior answers feasibility with its return value |
| Lift session + inline-style snapshot + **the last rendered delta** | kernel (acquires, disposes, records) | behavior, as a **`BehaviorLiftSession`** — `visual`, `baseTransform`, `compose`, `write` and nothing else. `rendered` is kernel-read; `dispose` is kernel-sequenced. The behavior can neither sample the delta nor unwind the lift (D-35; Checkpoint C, C5-01) |
| `originRect` | kernel | behavior, as an activation-scope argument |
| Resolution attempt, including the **early-acknowledgement latch**; settlement attempt including **both gate holds** and the readiness deadline | kernel (D-7, D-33) | nothing. The consumer acknowledges through the controller and the behavior checks request identity; no settlement object crosses either boundary |
| The authoritative final pin | kernel, via the lift it owns (D-16) | — |
| `readinessTimeout` policy | kernel, configured by spec scalar | — |
| Collection snapshot, insertion, proposal, outcome, recovery, domain result | behavior (runtime + frame part) | features, through declared views |
| The landing target, and re-anchoring presentation to the semantic item | behavior, via `anchorTarget` (D-16) | — |
| Placeholder element | behavior | features, through declared views |
| Coalesced rAF task, `spatialSeq`, `pendingSpatial` | behavior | nothing |
| The published `ReorderRequest` — the acknowledgement identity | behavior (D-33) | the consumer already **holds** it: it is `onReorder`'s argument. It is never handed out a second time, and the behavior compares by identity rather than trusting it |
| Packed rect index and the axis rule | the axis feature — `y()` or `xy()` | nothing |
| Per-element displacement records | `layoutAnimation()` | nothing |
| Landing runner mechanics | `landing()` | nothing |
| Persistent ordered state | consumer | — |

The row that matters: **no participant can reach another's mutable state except through an argument that participant was deliberately given.** Probe 1 had one container everybody could reach and relied on `Pick<>` types to discourage it.

### The inline-style snapshot is per longhand, and is never the `style` attribute

The lift's style lease is the kernel's, and restoring it is the one guarantee the presentation module owns outright. Two properties of _how_ it restores are normative rather than incidental:

- **Capture and restore by longhand, with priority.** The lift writes shorthands — `inset`, `margin`, `padding`, `border-width`/`-style`/`-color`, `overflow`, `transition` — but the page authors whatever it likes, and the two do not correspond. A shorthand only serializes when every longhand is present and consistent, so `style="margin-left: 8px"` yields `''` for `getPropertyValue('margin')`: capturing by shorthand records nothing, and restoring by shorthand then calls `removeProperty('margin')` and drops the authored declaration for good. Longhands are also the only way `!important` survives, because priority is per declaration — an authored `padding-top: 4px !important` beside three ordinary paddings cannot be one shorthand entry at all. Removing every longhand of a shorthand is exactly removing the shorthand, so no separate clearing pass is needed.
- **Never restore the saved `style` attribute wholesale.** A drag is a window in which the consumer's own code runs — `onStart`, the resolver, a readiness promise — and it may legitimately write inline styles the lift never touches. Restoration reverts exactly the declarations the lift is responsible for and leaves everything else as the consumer left it.

### Lifetimes: five scopes, three objects, two arguments

These three numbers all appear in the documents and are not in conflict; the taxonomy is inherited verbatim from the shipped design (D-14).

| Layer | Count | What |
| --- | --- | --- |
| Conceptual resource scopes | **5** | controller ingress · 2a motion ingress · 2b cancellation and resolution · 3 temporary presentation · 4 async attempts |
| Physical operation `Lifetime` objects | **3** | motion, cancellation, presentation. Ingress is the controller's own `AbortController`; attempts are records, not lifetimes. |
| Narrowed scopes handed to the behavior | **2** | `motion` and `presentation`, as `LifetimeScope` (no `dispose`), on `ActivationScope` |

2a and 2b stay separate objects: motion closes at release while cancellation must stay open through the consumer round-trip.

## When construction itself fails

`draggable()` runs three fallible steps before it can return a controller — `assemble()`, the behavior's own construction, and `kernel.arm(spec)` — and an earlier draft defined cleanup for none of them (review 4, §13).

The rule adopted is the strict one:

**Feature factories and behavior construction are externally inert.** A feature may allocate whatever private state it likes, but it may not attach a listener, write the DOM, or acquire anything that needs releasing. Every acquisition happens inside a kernel-owned operation lifetime. This is checkable by reading each factory, and it is already true of all seven first-iteration features.

Inertness alone is not quite enough, so two unwinds are also normative:

- **`assemble()` unwinds.** A feature _may_ still contribute a `retire` hook for private state that wants explicit clearing. If a later factory or a validation rule throws, the hooks collected so far run in reverse, each wrapped, before the error propagates. The loop already holds the array; this is four lines.
- **`arm()` unwinds.** If either frame factory, the frame-part validation, the shape assertion, the static-configuration validation or any ingress attachment throws, `arm()` calls `spec.retire()` best-effort, scrubs whichever frame exists, aborts ingress, and rethrows. A controller is never returned half-armed.

  **Ingress is `pointerdown` plus each type a `command` member declares** (D-32). Every listener is bound on `root` against the one controller-lifetime ingress signal, so the unwind and the teardown abort in step 7 below release all of them together and a discrete listener can never outlive I-6's terminal barrier. `arm()` validates `command.types` here, with the same construction-time `TypeError` policy as every other static option: non-empty, strings, no empty string, no duplicates, and no type the kernel binds for its own pointer ingress.

## Teardown across two owners

`destroy()` is a synchronous terminal barrier, unchanged in semantics from the shipped package. What changes is that it now spans two private state spaces, in a fixed order:

```text
1. closed = true; destroyRequested = true        (kernel)   every guard now fails
2. clear the queue, drop every retained argument (kernel)
3. retire kernel attempts, **each step best-effort and individually wrapped**:
   abort an uncompleted resolution and clear its settlement; on the settlement
   attempt, dispose the readiness watch and `destroy()` the landing handle, then
   drop the attempt entirely                                          (kernel)
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

**Step 3 covers the readiness acknowledgement.** Dropping both attempts makes a late `controller.ready(request)` inert twice over (D-33): the behavior's published request is cleared by step 4's `retire()`, and the kernel finds no attempt even if a behavior bug let the signal through. That is the same staleness handling a late landing `done()` gets, and is why the acknowledgement needs no disposal step of its own — there is no object to dispose.

**Destroy never pins.** The authoritative pin (D-16) belongs to the normal settlement join; a destroyed controller has no authored DOM to agree with, and `LandingHandle.destroy()` is defined as never writing a final position.

Two invariants this ordering creates, both of which are new obligations that probe 1's single container did not have (F-12):

- **No behavior callback in the sequence can stop a later step.** The kernel wraps `spec.retire()`, each attempt's cleanup (including a throwing `LandingHandle.destroy()`), and each frame reset, reporting through the platform reporter and continuing. A behavior cannot strand the kernel's DOM cleanup, and ingress abort is in a `finally`.

  **The same totality applies to the `arm()` unwind**: a reset that throws while unwinding a failed `arm()` must not replace the original arm failure or skip ingress cleanup.

  **The converse obligation is the participant's, and it is not covered by any of the above** (I-36, added by C2-01). Totality says the sequence above finishes; it says nothing about code that is *already running* when `destroy()` is entered reentrantly. A `destroy()` raised from inside consumer code — a `handle()` or `visual()` resolver, a placeholder custom element's connected/disconnected reaction — runs all seven steps to completion and then **returns into the middle of whatever was calling it**. Every barrier the kernel owns is complete at the kernel's granularity of one callback, so a participant that invokes consumer code **more than once** inside one seam or one native admission owns the barrier between those invocations: it reads the terminal latch and stops on the first closed reading, publishing nothing, retaining nothing, invoking no declared consumer callback, and leaving any cache it was rebuilding in the retired state step 4 just put it in. **The obligation is provisioning in two forms — a participant's own reading, or a named kernel bracket that revalidates and undoes — over a floor of consequences, plus a register of stronger site-specific promises; it is not a quantifier over call sites** — §[05](05-lifecycle-invariants.md) I-36 (1), (2) and (3) state why the quantifier form is not dischargeable and why provisioning alone does not discharge it either. Restoring that state matters as much as stopping the calls — a sequence that resumes and marks its cache clean re-pins DOM `retire()` had released, against I-20. The mechanism is behavior-owned and not promotable, so this half of the terminal guarantee is **tier C** while everything above it is tier B — §[05](05-lifecycle-invariants.md) I-6 carries that split in its own row, and I-36 and F-47 state it.

- **`spec.retire()` runs before the presentation lifetime disposes, but after attempts are inert.** It must therefore tolerate DOM that is still attached, and must not assume it will be the thing that removes it — the placeholder is removed by the disposer the behavior registered on the _presentation lifetime_ at activation, not by `retire()`. `retire()` drops references; the lifetime releases DOM.

The same seven steps, minus 1, 2 and 7, are operation retirement. **Panic** is `destroy()` followed by reporting the initiating error, with teardown strictly before reporting.

## Why not thread the behavior state as an argument

The obvious alternative to D-4: let the kernel hold one opaque `S` and pass it as argument zero to every callback, making `BehaviorSpec` a module-level frozen constant shared by every controller. That is better for memory (one function object per seam per _package_, not per controller) and for call-site inline caches.

It is not chosen because the closure model is simpler to specify and to reason about, and because a sortable page has one controller per list rather than one per item — so ~16 closures and one spec object per controller is expected to be irrelevant.

**That expectation is not evidence, and the earlier justification was worse than no justification.** It said the alternative "requires the kernel to _store_ behavior state, which is precisely what H-2 forbids". Holding an untyped reference does not make the kernel know, expose or structurally widen that value; H-2's substance is that the kernel cannot _reach into_ behavior state, which a phantom `S` preserves exactly. Deciding a performance question on the wording of a claim is backwards in a repository whose first code-style priority is performance.

So the closure model ships as the first implementation, **and the measurement is owed**: heap and move-call behaviour at realistic controller counts, closure model versus opaque-`S`-plus-static-spec. If there is no material difference, keep the closure model and record the evidence in place of this paragraph. The swap is mechanical and touches no semantics either way (F-4).