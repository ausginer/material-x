#### DRD-35 — `requestStep` and `use` take a receiver, and one `CallbackList` holds each list

**Status:** active, decided on 2026-11-09 on the owner's direction, from the model at `9f885b9a9` and the owner's uncommitted edit on it ([`owner-edit.diff.txt`](../probes/callback-list/owner-edit.diff.txt)), with its costs in `DRO-12`. Amends `DRD-16`, `DRD-34` and the contract's public surface, DRI-8, DRI-9 and DRI-10. Implemented at `53c87f988` from [`callback-list-handoff.md`](../callback-list-handoff.md), reported at `f06a99c4f` ([report](../callback-list-report.md)). The architect read the report at `2bec0c431` (§Disposition of the callback list report). `DRD-36` replaces its property 5's direction function, and `DRD-37` supersedes its property 8. Its costs are accepted under `DRO-12`. `DRD-53` renames property 5's file and class. **Amended on 2026-11-14 by `DRD-63`:** property 7. `sortable`'s `invalidate` step is passed with its receiver, and every built-in method passed with its receiver declares `this` **Property 7's requirement that every built-in method passed with its receiver declares `this`, added by `DRD-63`, is superseded on 2026-11-15 by `DRD-69`.** Its call sites stay.

**`requestStep` and `use`, on the controller and on a `Drag`, accept an optional receiver, which is an object, and call the callback on it. Steps coalesce by step and receiver. Each `use` call is its own registration. One internal class, `CallbackList`, holds each list as callback and receiver in adjacent slots. `CallbackList.queue()` makes a list whose `run()` calls its first entry, and `CallbackList.stack()` one whose `run()` calls its last, and `empty` says that no entry waits. `Gesture` keeps pass control and precedence.**

Decided on 2026-11-09 on the owner's direction, from the model at `9f885b9a9` on `drag/step-queue-model` and the owner's uncommitted edit on it. The architect read that edit and saved it as [`owner-edit.diff.txt`](../probes/callback-list/owner-edit.diff.txt) (SHA-256 `a5b8feec…46358`). Its typecheck and lint output are [`typecheck.txt`](../probes/callback-list/typecheck.txt) and [`lint.txt`](../probes/callback-list/lint.txt). [`callback-list-handoff.md`](../callback-list-handoff.md) ports the model and the edit to production.

**The owner's direction:**

- **Proceed with `CallbackList`,** in the shape `CallbackList.queue()` and `CallbackList.stack()`, `empty` and `run()`.
- **This architecture is chosen.** Alternative representations are deferred until a concrete cost warrants reconsideration. No further comparative prototype is made.
- **The per-list direction function is intentional.** Each list that `queue()` or `stack()` creates holds its own direction function. It is not replaced by a shared function, and it is counted in the allocation figures.
- **Record** receiver-aware `requestStep` and `use`, coalescing of steps by pair, and distinct disposer registrations.
- **Lint policy stays unchanged** for this unit.
- **The keyed model is not adopted.**
- **Timing stays deferred, and budgets stay unchanged.**

**Required properties:**

1. **Signatures.** `Drag.requestStep`, `Drag.use`, `DraggableController.requestStep` and `DraggableController.use` each have two overloads:
   - the callback alone, which declares `this: undefined`;
   - the callback and a receiver of a type `Receiver extends object`, where the callback declares `this: Receiver`.

   A callback that declares a receiver is refused without one, and a receiver of another type is refused. The argument types stay separate: a step receives `Operation | null`, an operation disposer `Outcome | null`, and a controller disposer nothing. **The receiver is an object or absent at every internal signature too:** `Gesture`'s members and `enter`, the session's `Drag`, `CallbackList` and `runDragDisposer`. No signature takes an `unknown` receiver. `DragDisposer` stays exported.

   _Why `object`:_ the owner's edit types the internal receiver as `object | undefined`, and `undefined` is the list's marker for no receiver. A public `Receiver` with no constraint would admit a primitive that no internal type describes, and nothing needs one.

2. **Calling.** A callback passed with a receiver is called on that receiver on every path: a step requested while idle, which is the first step of its own pass; a step from the list; a disposer in a release walk or in teardown; and a late `use`, which runs at once. A callback passed alone is called with no receiver. The kernel supplies no receiver of its own.
3. **Steps coalesce by pair.** A step requested during a pass is dropped when the same step is waiting with the same receiver, or with none when none is passed. The same step with a different receiver, or with a receiver against none, is a separate entry. An entry is removed before its step is called, so a step that requests its own pair again is added again. Request order is kept. A step requested while idle runs at once and enters no list (DRI-17).
4. **Disposers are distinct registrations.** Every `use` call adds an entry, whether or not the same pair is waiting, so the same pair registered twice runs twice. A walk runs last in first out, runs every disposer whatever another one throws, and reports each throw once through `raise` called on the controller. **A late `use` runs its disposer at once,** and is not added and then walked, because a nested walk would run the remaining disposers before the rest of the disposer that added it.
5. **`CallbackList`.** One internal class in `src/kernel/callback-list.ts`. No entry exports it.
   - It keeps each entry as a callback and a receiver in two adjacent slots of one private array, so an entry allocates no object.
   - It is created only by `CallbackList.queue()` and `CallbackList.stack()`. Its constructor is private.
   - **Each factory call creates that list's own direction function,** which `run(argument)` calls. `queue()`'s removes the first entry and calls it, and `stack()`'s the last. There is no shared function, no direction flag and no branch on direction in `run`.
   - `empty` is true when no entry waits. `run` is called only when an entry waits. `has(callback, receiver)` checks for a pair apart from insertion, `add` always appends, and `clear` drops every entry.
   - The list decides nothing about when or whether its entries run, and handles no throw.
   - **Three instances:** `Gesture`'s steps, made by `queue()`; `Gesture`'s controller disposers, made by `stack()`; and each `Session`'s operation disposers, made by `stack()`.
6. **`Gesture` keeps pass control.** The reader's precedence is unchanged: destruction, deferred steps, the decision, the next step. The reader runs one step per turn with `run`. Teardown clears the steps and walks the controller disposers. **`DRD-6`'s stop condition holds:** one reader, one kind of entry in each list, nothing tagged and nothing reordered. The receiver is the receiver of the call, not a tag.
7. **The built-in call sites.** `sortable` passes its capabilities with their receivers, as the model does: `drag.requestStep(this.axis.invalidate, this.axis)`, `drag.use(this.axis.retire, this.axis)` and `kernel.use(displacement.retire, displacement)`. `#invalidateGeometry`, `#retireAxis` and the wrapper around `displacement.retire` are removed.
   - **`InsertionGeometry.invalidate`, `InsertionGeometry.retire` and `DisplacementSink.retire` declare their `this`,** so the overload without a receiver refuses them, and removing the receiver at one of these sites fails typecheck. _Why:_ the model's mutations C11 to C13 removed that receiver and kept the line's lint disable. Only a spy test failed, because the built-in axes and sink never read `this`. The declaration is type-only.
   - **Every other step and disposer keeps its form,** including `sortable`'s and `freeDrag`'s `invalidate` and `moveTo` steps (`DRD-34` property 8), `cancelLanding`, `placeholder.remove` and `frame.cancel`.
8. **Lint.** The lint configuration and policy are unchanged. `@typescript-eslint/unbound-method` reports a method passed with its receiver, because it doesn't read the second argument. Each such site carries one line-scoped disable with its reason, and no file has a file-wide disable. `CallbackList`'s own types pass lint without a disable, so the `Function` type is not used.
9. **Every other guarantee holds:** DRI-1 to DRI-10, DRI-17 and DRI-18, `DRD-16`'s scope, `DRD-34` as amended below, and `requestDestroy`'s one promise. Nothing is allocated per sample or per step requested while idle, and no object per entry. The per-sample test passes.

**What this amends:**

- **`DRD-34` property 6** now reads: a step or a disposer passed alone is called with no receiver, and one passed with a receiver is called on that receiver. The kernel supplies no receiver of its own, so no step, `Drag` member, hook argument or disposer receives the controller or the session as `this` unless a caller passes it.
- **`DRD-34` property 8's** "A step passed by identity stays one stable function that works with no receiver" applies to a step passed alone. A step may also be a stable method passed with a stable receiver, and then it coalesces by the pair.
- **`DRD-34` property 9** also allows one line-scoped `unbound-method` disable, with its reason, at each site that passes a method with its receiver (property 8 above).
- **`DRD-34`'s "Not in this decision"** bullet, on receiver support for `requestStep` and `use`, is superseded by this decision. Automatic binding helpers stay out.
- **`DRD-16`'s** "the list still holds untagged functions" now reads: the list holds steps with their receivers, untagged by operation. Its reasoning is unchanged.
- **The contract's** public surface, DRI-8, DRI-9 and DRI-10 (see its change record).

**Not adopted:**

- **The models' recommendations.** `packages/drag/.plan/step-queue-model.md` and `callback-list-model.md` at `9f885b9a9` recommended against a queue object and against a shared list. The owner's choice supersedes them. The owner puts one stated ownership of callback lists ahead of the bytes those reports measured, and `DRO-12` reports the bytes of the version chosen.
- **Deferred, not rejected:** step and receiver pairs inline in the controller's array (`454d7412d`), and the `StepQueue` (`72ae8d715`), both on `drag/step-queue-model`. **What reopens the representation:** a cost under `DRO-12` that the owner declines, or a timing reading, once timing is taken, that attributes a regression to the list. Until then no comparative prototype is made.
- **Rejected on the owner's direction:** the keyed model at `732c7a8df` on `drag/step-key-model`, `requestStep(step, key = step)`. Its branch stays as a record.

**Cost.** `DRO-12`. The model's figures at `d50e4b67a` were +338 to +362 B minified and +102 to +119 B Brotli over `25a67d4a9`, and +32 B retained per operation. They measured a different version, with `runFirst` and `runLast` and no per-list direction function, so they don't establish this version's costs.

**Amended 2026-11-09 by `DRD-36` and `DRD-37`.** `DRD-36` replaces property 5's direction function and supersedes the owner's direction that kept it. `DRD-37` supersedes property 8. The text above is unchanged.

**Amended 2026-11-12 by `DRD-53`.** Property 5's file is `src/kernel/callbacks.ts`, its class is `List`, which is exported only as a type, and the factories are the module's `queue()` and `stack()`. The text above is unchanged.

**Amended 2026-11-14 by `DRD-63`.** In property 7, `sortable`'s `invalidate` step leaves the steps that keep their form, and every built-in method passed with its receiver declares `this`. That covers the three members named here, `sortable`'s step, and the drop-target tracker's release and resolve. The text above is unchanged.