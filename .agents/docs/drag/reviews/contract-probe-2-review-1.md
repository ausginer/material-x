The second probe is directionally much closer to the architecture we were trying to explore. In particular, the private kernel executor, private behavior and feature runtimes, feature functions returning construction-time contributions, compiled direct slots/pipelines, and kernel-owned transition boundaries all look promising.

Before treating the probe as accepted, we would like to challenge several specific conclusions and mechanics. Please do not rewrite the contract documents yet and do not produce another full architecture set.

Instead, create one concise document:

    .agents/docs/drag/contract-probe-2/challenge-response.md

For each challenge below, please provide:

1. whether you agree, partly agree, or disagree;
2. the concrete reasoning;
3. a minimal type or execution sketch where useful;
4. whether the challenge changes a decision, a finding, the overall verdict, or only wording;
5. any new invariant or falsifier introduced by the proposed correction.

Please prefer a few precise sketches over a complete replacement contract.

## Challenge 1 — D-10 may be an unnecessary restriction

The probe concludes that only the behavior may declare frame fields, because a feature-owned transactional field would require an aggregate intersection type and would threaten the one-hidden-class guarantee.

We are not convinced either consequence follows.

A feature may contribute an opaque frame fragment whose type is known only to that feature. The behavior and kernel do not need to know the complete physical frame type. The assembler may invoke every frame-fragment factory in a fixed order for both `current` and `draft`, giving the two frames of one controller the same physical shape.

Controllers with different feature sets may have different frame shapes without necessarily harming the important invariant: the two frames within one controller must have the same stable shape.

Please examine whether this is viable without computing an aggregate public or internal intersection type.

A rough conceptual shape:

    type FrameContribution = {
      createPart(): object;
      resetPart(frame: object): void;
    };

The feature would retain typed access to its own fields through closures, private symbols, accessors, or another locally typed mechanism. Neither the behavior nor the kernel would name those fields.

Questions:

- Does a complete aggregate type actually need to exist anywhere?
- Is cross-controller hidden-class uniformity valuable enough to forbid feature-owned transactional state?
- Could feature-owned frame state remain an allowed extension point even if no first-iteration feature uses it?

## Challenge 2 — the behavior should not author the kernel frame slice

The document says no participant declares the whole frame shape, but `createSortableFrame()` physically and statically lists both the kernel and sortable fields.

That means the behavior does know and construct the kernel slice, and the kernel must trust every behavior to initialise its private fields correctly.

A possibly cleaner boundary is:

    kernel frame literal
      + behavior frame part
      + optional feature frame parts

The kernel may internally operate on the composed object, but the behavior factory would return only its own fields:

    createFramePart(): SortableFramePart

The full composition type does not need to cross the boundary.

Please compare this with the current `F extends KernelFrame` model. Construction-time hidden-class transitions are acceptable unless there is a demonstrated runtime cost or correctness problem.

## Challenge 3 — the “structural invariants” claim may be too strong

The prepare/effect split structurally protects the committed frame:

- `prepare` does not receive `current`;
- the kernel owns the swap;
- `effect` runs after commit;
- behavior code cannot write kernel fields through the declared frame type.

However, the activation trace shows `prepare` doing all of the following before commit:

- inserting the placeholder into the DOM;
- acquiring pointer capture;
- registering disposers into kernel-owned lifetimes;
- assigning `rt.placeholder`;
- invoking consumer or feature factories.

Therefore the split does not structurally guarantee that preparation has no externally visible mutation or that ownership transfers only at commit.

The kernel also revalidates only after the entire `prepare` callback returns, not after every callback boundary inside it.

Please distinguish precisely between:

- frame publication safety, which appears structural;
- external DOM, resource and private-runtime staging, which still requires discipline or a different callback shape.

The verdict should not claim more structural enforcement than the API actually provides.

## Challenge 4 — rollback likely needs an explicit prepared value

The current transition shape is approximately:

    prepare(draft): boolean
    effect(current): void
    rollback(): void

This forces locally acquired preparation state to be placed in a closure or private runtime so that `effect` or `rollback` can find it. That itself may publish staged state outside the transactional frame.

Please evaluate a result-bearing transition:

    type Transition<F, Prepared, Capability> = {
      prepare(
        draft: BehaviorDraft<F>,
        capability: Capability,
      ): Prepared | null;

      effect(
        current: Readonly<F>,
        prepared: Prepared,
      ): void;

      rollback(prepared: Prepared): void;
    };

`Prepared` need not always allocate a wrapper object; it may be an existing element, disposer, lease or small tuple when appropriate.

Would this make ownership transfer and rollback substantially more honest? What cost would it add on the cold activation and release paths?

## Challenge 5 — one-commit release appears transactionally inconsistent

The trace currently performs roughly:

    begin()
    draft.phase = RELEASING
    close motion lifetime
    release.prepare(draft)
    commit()

Motion is irreversibly closed while the committed frame still says `ACTIVE`.

If `release.prepare()` throws, returns false, or reentrantly causes cancellation or destruction, there is a window where physical capabilities and committed state disagree.

Probe 1 used two commits:

    commit RELEASING and the release point
    close motion
    synchronously prepare the proposal
    commit the proposal

One additional frame copy on `pointerup` is unlikely to matter.

Please determine whether the one-commit design is actually safe under failure and reentrancy. If not, remove “release drops from two commits to one” from the claimed improvements rather than preserving it as an optimisation target.

## Challenge 6 — held gates need a precise transactional model

The held-gate inversion is attractive:

- gates begin open;
- absent landing or readiness creates no work;
- settlement holds only what it needs.

But the current trace commits `landingHeld = false` and `readyHeld = false`, then calls methods that apparently mutate those committed fields after the commit.

Please state exactly where the authoritative gate state lives and how `holdForReadiness()` and `holdForLanding()` change it.

One possible model is a kernel-private settlement scope:

    settlement.effect(current, scope)

During the effect, the behavior registers holds into the scope. After the callback returns, the kernel seals the scope, starts the attempts, and decides whether settlement may advance.

In that model the gate state may belong to the settlement attempt rather than the transactional frame.

Please compare this against direct post-commit mutation or hidden nested `begin()` / `commit()` calls.

## Challenge 7 — the `Behavior` generic signature appears invalid

The document sketches:

    type Behavior<Controller> = <F extends KernelFrame>(
      host: KernelHost,
    ) => BehaviorInstall<Controller, F>;

That means the behavior must produce a valid install for any `F` selected by the caller. A sortable behavior instead chooses one particular frame or frame-part type.

Please correct the type sketch and check whether the corrected form changes the claimed absence of boundary casts.

A likely conventional form would be closer to:

    type Behavior<Controller, F extends KernelFrame> =
      (host: KernelHost) => BehaviorInstall<Controller, F>;

or, under separated frame parts:

    type Behavior<Controller, B extends object> =
      (host: KernelHost) => BehaviorInstall<Controller, B>;

The consumer need not write the generic; inference is sufficient.

## Challenge 8 — a frozen collection snapshot does not freeze landing geometry

The trace claims that collection freezing prevents the landing target from becoming obsolete.

It freezes the semantic reorder transaction, but it does not freeze DOM geometry.

A controlled React commit may occur while landing is running and may:

- move the placeholder;
- change item heights;
- shift the container;
- change surrounding layout.

The target measured before that commit may therefore become stale.

Please add this scenario to the analysis:

    landing starts
      → React commits the accepted order
      → placeholder viewport rect changes
      → landing completes
      → temporary presentation is removed

The final visual state must not jump.

Please evaluate the possible responsibility boundary without prematurely selecting the most elaborate solution:

- retarget the active landing;
- pin against freshly measured geometry at completion;
- maintain a stable placeholder target;
- another explicit mechanism.

A frozen operation snapshot alone is not a sufficient answer.

## Requested conclusion

Please finish the document with a compact updated verdict:

- which parts of probe 2 remain load-bearing;
- which decisions should change;
- which questions remain open before implementation;
- whether the central construction model still holds after the challenges.

The goal is adversarial clarification, not defence of the existing documents. It is completely acceptable for a metric or claimed improvement from probe 2 to be withdrawn.