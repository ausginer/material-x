#### DRD-27 — The kernel knows no lift, and a behavior composes the lift in its own context

**Status:** active, revised on 2026-11-07 from the text at `6d5ba89e7`, implemented at `89995c27e` ([`ownership-report.md`](../ownership-report.md) item 3). Amends `DRD-4`, `DRD-24` and the contract's DRI-9, DRI-10, DRI-13, DRI-17 and DRI-18. Its `type-fest` sentence was corrected on 2026-11-08. `DRD-29` amends its `lift.js` types and its "Only `translate` writes `translatedX` and `translatedY`". Under `DRD-30` the operation that `activate` returns keeps the `Lift`, instead of `drag.state`. `DRD-33` amends its row "The landing after release": the release disposer calls the recorded `Landing`'s `start`. On 2026-11-10 the contract's DRI-9 was corrected to its release bullet: two disposers, and the landing starts even when the release threw (`DRF-11`)

**`Session` and `Gesture` don't name a lift type, read a behavior's `lift`, build a lift view, hold a landing or branch on anything lift-specific. The kernel owns the operation's data, the `Drag`. The behavior owns its context, `drag.state`, and every presentation capability it composes there. A lifted behavior creates one `Lifter` per controller from `lift.js`, calls its `acquire` as the first statement of `activate`, keeps the returned `Lift` in its state, and names the landing from `settle` with `lift.land`. The lift reaches the kernel's ordering only through `drag.use` and the controller's `use`, which every behavior has.**

**Revised 2026-11-07, at the owner's requirement on `6d5ba89e7`.** The text at `6d5ba89e7` had the kernel build the `Drag` at activation with a `lift` member, call `behavior.lift`, and keep the lift's hold and the landing. That removed the cast and the second writer. But the kernel still called the lift, branched on it, named `Lift` in its types and ordered the lift's release and landing itself. The owner's requirement is that the kernel's operation model is the same whether or not a behavior uses the lift. None of the text at `6d5ba89e7` was implemented.

**Does `drag.state` already provide the boundary? Yes.** drag2 split each frame into the kernel's slice and a part that the behavior owns, and the kernel copied the part without reading it. `drag.state` is that part:

- **The behavior creates it,** in `admit` or `command`. The kernel carries it to the `Drag` by identity and never reads or writes it.
- **Its lifetime is the operation's.** A retained `Drag` keeps its own state, and a later operation has a new one.
- **It already holds what activation creates.** The built-ins keep their placeholder, frame task and cache context there.
- **A hook writes it directly.** drag2 needed a draft and a current frame because a step's writes had to be applied as a transaction. Here requests only fill slots and one reader applies them (`DRD-1`), so no copy is needed (DRI-8).

What it doesn't hold is a value that outlives the operation. The running landing is the only such value of the lift. It belongs on an object with the controller's lifetime, which the behavior's composition creates and disposes through the controller's `use`. `sortable`'s displacement sink already works this way (`DRD-25`).

drag2 is the reference for this split only. Its kernel itself held the lift: `BehaviorConfig.liftMode`, `ActivationScope.lift` and `kernel/presentation.ts`.

**Where the lift's coordination goes.** Each row is kernel code at `bb644d6d7`:

| Coordination | At `bb644d6d7`, in the kernel | Now, in the lift and the behavior |
| --- | --- | --- |
| Acquisition | The session calls `behavior.lift` after the decline for a disconnected item, before capture and `activate` | The behavior calls `lifter.acquire(drag, visual, box)` as the first statement of `activate`, before its second pull and before any `drag.use` |
| A grab during a landing (DRI-13, `DRD-18`) | The session takes the controller's landing before the lift measures, and cancels it in a `finally` | The lifter holds its running landing. `acquire` measures, then cancels that landing in a `finally` |
| Release after the disposers (DRI-9, `DRD-14`) | The session releases the hold after the `use` disposers | `acquire` registers the release with `drag.use` before its first write. Acquired first, the release is the operation's first disposer, so it runs last |
| The landing after release | `settle` returns a `Landing`. The session starts it after release, and the controller keeps its cancel | `settle` calls `lift.land(landing)`. The lift starts the landing right after its release, in the disposer walk, and stores the cancel on the lifter |
| Landing cancel at destruction (DRI-10) | A teardown step between the operation's release and the controller disposers | The composition passes `lifter.cancelLanding` to the controller's `use`. The built-ins register it last, so it runs first, where the teardown step ran |
| A failed acquisition (DRI-7) | The lift restores what it changed, reports a failure to restore through the kernel's `raise`, and rethrows | The acquisition throws, and that fault decides. The release, registered before the first write, restores at the operation's release. A throw there is reported as a later fault |
| `lift`'s window | The controller's | The window passed to `createLifter`, which the built-ins already hold |

**How a behavior gets each guarantee.** The kernel provides these mechanisms to every behavior. None of them knows what a disposer releases:

| Guarantee | The kernel's mechanism | The lift's part |
| --- | --- | --- |
| Everything that can fail is in `activate`, and a throw is a fault with no `start` or `end` | `activate` | Acquisition is in `activate` |
| Release after cleanup | `drag.signal` aborts, then `use` disposers run last in first out, every one whatever another throws, each throw reported once | The release is the first registration, so it runs last |
| The landing starts after release and before `end` | Disposers run in the conclusion step. `end` is the next step, in the same task | The release disposer starts the landing after restoring |
| Focus after `end` | The terminal step restores focus when `end` returns or throws | Nothing |
| Destruction releases everything and delivers no terminal | `terminate` releases with `null`. Controller disposers run last in first out | No landing was named, because `settle` doesn't run. `cancelLanding` is a controller disposer |
| A late `use` | Runs at once | Not used |

**Required properties of the kernel:**

- **No kernel module or `draggable.ts` names the lift or the landing.** `grep -rniE 'lift|landing' src/kernel src/draggable.ts` finds nothing, comments included.
- **`Gesture` has no landing slot.** `takeLanding`, `keepLanding` and `#cancelLanding` go. Teardown closes the controller, clears the slot and the steps, terminates the session, runs the controller disposers and aborts the root's listeners, in that order.
- **`Session` keeps no lift and no admission for one.** Activation is the decline for a disconnected item, capture, `activate`, then `start`. Conclusion closes motion, aborts the verdict on a cancel, runs `settle` if `start` was reached, releases, and then detaches or sets the terminal step, as `DRD-26` states.
- **The `Drag` is built when the session opens, as at `0dcb80fb1`.** Every member it has exists for every behavior, so its type is honest from construction. The kernel holds it under a kernel-internal type whose members are writable, declared in `src/kernel/drag.ts`, and assigns the object literal to it with no assertion. **`6d5ba89e7`'s construction at activation is withdrawn,** because it existed only to build the view first. **Corrected 2026-11-08:** this used to say "`type-fest` and `Writable` leave the package". That was a consequence of the code at the time, not a rule. CONTRIBUTING's TypeScript section prefers a `type-fest` utility over a handwritten type that does the same, and `DRD-29` applies it to this type.
- **`DRD-1`, `DRD-24` and `DRD-26` stand:** one gate, one reader with its precedence, requests that only fill slots, the slot's three detaches and teardown's order. Nothing is allocated per sample (DRI-17).

**Public types:**

- `draggable.js`: one `Behavior<State, Verdict>` with no `lift` member, whose hooks receive `Drag<State>` and whose `settle` returns `void`. `Admission<State>` has `item`, `handle?` and `state?`. `Drag<State>` has the kernel's members only, with no `lift` key. `draggable` has one signature and no assertion. `LiftedBehavior`, `LiftedDrag`, `LiftedAdmission` and `AnyBehavior` go.
- `lift.js`: `createLifter(window): Lifter`. `Lifter` has `acquire(drag, visual?, box?): Lift` and `cancelLanding()`. `Lift` has `visual`, `box`, `rect`, `boxWidth`, `boxHeight`, `visualSpace`, `itemSpace`, `translatedX`, `translatedY`, `translate(x, y)` and `land(landing)`. `Landing` is unchanged.

**Required properties of the lift:**

- **`acquire`** reads all geometry before any write, as now. It registers the release with `drag.use` before the first write. It creates the `Lift` with every member set. After measuring, it cancels the lifter's running landing, also when acquisition throws.
- **The release** restores the top layer and then the inline declarations, as now. It is total over a partial acquisition. **The landing starts after the release.** It is attempted even when the release threw, and each throw is reported separately. Two disposers registered in that order meet this, and so does one disposer that reports through a second registration. The choice is the implementer's.
- **`land`** records the landing, and the last call wins. Without a call, nothing lands. Only `translate` writes `translatedX` and `translatedY`.
- **`cancelLanding`** cancels the running landing, if any. It works when detached and when called twice.
- **Nothing in the lift reaches the kernel's interface.** The lift receives the `Drag` that every hook receives, and nothing else from the kernel.

**Changes a consumer sees, against `bb644d6d7`:**

- **A lifted behavior composes the lift in its own code.** It creates a `Lifter` with its controller and passes `cancelLanding` to the controller's `use`. It calls `acquire` first in `activate` and keeps the `Lift` in its state. It reads the ten members from that `Lift`, and calls `land` in `settle` where it used to return a `Landing`.
- **`Behavior.lift`, the lifted types and `Admission`'s `visual` and `box` are removed.** `settle` returns nothing. `lift` is replaced by `createLifter`. `Landing` moves to `lift.js` (`DRD-28`).
- **A `Drag`'s own keys lose the ten lifted members.**
- **Pointer capture is now set before the lift's acquisition.** It used to be set after it. When acquisition fails, capture is set and then released at conclusion. No other effect is intended.
- **A failed acquisition is restored at the operation's release,** in the same pass, instead of inside the acquisition. A failure to restore is now reported after the acquisition's fault, and the acquisition's fault decides the outcome. At `bb644d6d7` the restore failure was reported first and decided. The number of reports doesn't change. No test reaches this case, so the handoff adds witnesses.
- **For the built-ins,** a landing's cancel at destruction runs as the first controller disposer, where the teardown step ran. Their consumer callbacks `visual`, `box` and `placeholder` are called when they are called now.
- **No change to event order, hooks, outcomes or timing is intended beyond these.**

**DRI-18 changes.** The kernel's guarantees still hold with no code beyond the hooks. The lift's guarantees, which are DRI-9's release and landing, DRI-12's focus during promotion and DRI-13, hold for a behavior that composes the lift as `lift.js` documents. That means one `Lifter` per controller with its `cancelLanding` passed to `use`, and `acquire` first in `activate`. Nothing stops a behavior that composes it otherwise, and no check is added (CONTRIBUTING: write for a truthful developer).

**Rejected:**

- **The text at `6d5ba89e7`.** The kernel built `drag.lift`, held the hold and the landing, and branched on `behavior.lift`.
- **A generic presentation hook,** such as `present?(drag)` returning `{ release, land }`, which the kernel would order. It moves the same coupling behind a plugin seam (`DRD-2`), and the kernel would still order a landing it doesn't own.
- **A `lifted(behavior)` wrapper from `lift.js`** that adds acquisition to `activate`. It is a composition framework, and it hides the order of the behavior's own disposers from its author.
- **Keeping an opaque controller-lifetime cancel slot in `Gesture`.** Its only purpose is the landing, so it is a lift-specific slot under another name.
- **The `Lift` on the behavior instance.** A retained `Drag`'s step would then read a later operation's view.
- **A kernel-provided per-operation slot for the behavior's context.** `drag.state` already is that slot.
- **Computing `visual` and `box` at activation.** That would move the consumer's `visual` and `box` callbacks from admission to activation. They stay where they are, and the built-ins carry the elements in their state.

**Verified by a type check, not by production code.** The [type check](../probes/drag-ownership/README.md) now models these types. One `Behavior` type compiles with no overload and no assertion except `admission.state as State`. A kernel-internal writable type holds the `Drag`, and a `Drag<State>` passes to `acquire`. Both of the repository's option sets compile.

**Not decided here:**

- **An admission may omit `state` while the `Drag` types `state` as `State`.** The assertion at the kernel's generic boundary stays. It is the owner's question if wanted.
- **The built-ins' operation state has fields that `activate` or `settle` fills, read with `!`.** `state.lift` joins them: it is `null` from admission and set as `activate`'s first statement. Typing a behavior's state by its phase would change the built-ins, not the kernel.

**Cost: the owner's, `DRO-7`.**