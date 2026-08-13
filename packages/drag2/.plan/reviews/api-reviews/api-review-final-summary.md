# Owner decisions after API probes A / C1 / E

This records the owner decisions following Probe A, Probe C1, Probe E, and the subsequent discussion.

Please update the active API/kernel contracts and design documentation to match these decisions. Do not implement the production redesign as part of this task.

After the contracts are reconciled, the redesign is ready for implementation handoff. Remaining probe scenarios may become implementation acceptance tests unless updating the contracts exposes a new architectural contradiction.

## 1. Deferred physical teardown stays

Probe A validates the central transaction-bracket direction.

`destroy()` logically closes the controller immediately. If destruction is requested while synchronous library execution is active, physical teardown waits until the outermost transaction unwinds.

Outside a reentrant library transaction, physical teardown still completes synchronously.

`panic()` follows the same model. The probe showed that panic reaches destruction after the drain loop has already exited; logical closure happens immediately, reporting runs, and physical teardown occurs one stack frame later at the transaction boundary. No library work continues on the broken stack.

Keep:

```ts
destroy(): Promise<void>
```

Do not introduce a separate `destroyed` property, completion method, or token. Consumers that do not care about completion may simply ignore the returned Promise or write:

```ts
void controller.destroy();
```

Consumers that care may:

```ts
await controller.destroy();
```

The Promise is primarily useful in the rare deferred/reentrant case; this does not justify another public API concept.

Repeated destruction remains idempotent and the completion settles exactly once.

---

## 2. Narrow the post-close guarantee

Probe A falsified the previous strong post-close ceilings.

The library cannot guarantee that, after a reentrant logical close, no further arbitrary consumer-reachable read occurs anywhere in the remainder of the current call graph without restoring the whole-program reach/stretch machinery we are trying to delete.

That guarantee is withdrawn.

The replacement invariant is finite and API-shaped:

> After logical closure, the library must not invoke another declared consumer slot, admit another operation, or publish another lifecycle/domain event.

Internal work already inside the current synchronous transaction may finish as long as it creates no surviving consequence beyond the transaction boundary and teardown.

The important distinction is:

```text
internal library action
    → may finish safely inside the transaction

declared consumer callback/accessor invocation
    → cannot be undone once invoked
    → requires a logical-liveness check before invocation
```

The old consumer-reach/stretch analysis is therefore retired as the proof domain.

The remaining liveness domain is the finite set of:

- declared consumer slot invocations;
- lifecycle/domain publication boundaries;
- ingress/admission boundaries.

Do not claim that the existing kernel `queue.closed` boundary guards disappear; they are a different category from the statement-level I-36 guards.

### Logical vs physical liveness

Physical teardown state is not a logical liveness signal.

In particular, an aborted resource/presentation signal may lag logical closure once teardown is deferred.

General invariant:

> No physical-teardown observation may be used to answer whether the controller/operation is logically alive.

Use the logical latch / transaction validity for that question.

---

## 3. Placeholder rollback stays

Deferred teardown does not remove the placeholder acquisition problem.

The relevant sequence is:

```text
placeholder returned
    ↓
prepare mutates it
    ↓
prepare completes
    ↓
preparation is no longer valid
    ↓
effect/adoption never runs
```

Because adoption never occurred, the effect-owned disposer never became responsible for the mutations.

Therefore the sortable activation transition must use the existing seam `rollback` path to undo library-authored preparation when a prepared placeholder is discarded.

This is a local acquisition property:

> A prepared-but-unadopted consumer placeholder must not retain library-authored attributes/styles/state.

Do not recreate global statement-level liveness machinery for this. The seam rollback mechanism already exists for exactly this shape.

---

## 4. Keep `canceled`; do not add `aborted`

Do not introduce a separate `aborted` terminal result at this stage.

`canceled` means that the **drag operation** was abandoned/canceled. It does not guarantee rollback of arbitrary consumer side effects.

This distinction matters after release.

Example:

```ts
async onReorder(request) {
  setOrder(next);
  await committed;
  return accept();
}
```

If the user cancels while the library is waiting:

```text
library-side drag operation
    → stops waiting
    → restores/retires its presentation
    → terminates as canceled

consumer work already started
    → may still commit
    → library makes no rollback guarantee
```

A later settlement/rejection from the abandoned resolver must be safely consumed and must not produce an unhandled rejection or revive the operation.

Pre-release and post-release cancellation may therefore have different practical consequences without requiring different public terminal names.

If a started operation terminates because of a consequential failure, diagnostics remain orthogonal:

```text
onError(error)
+
normal terminal/cancellation semantics where applicable
```

Do not create a second terminal taxonomy merely to encode diagnostic provenance.

### `destroy()` remains different

Destroying the controller terminates the subscription relationship itself.

It publishes no later `onEnd`.

The lifecycle pairing is therefore:

> If `onStart` fires and the controller remains alive, the operation eventually produces one terminal `onEnd`.

---

## 5. Serial authored commit remains

The serial model remains:

```text
release
→ freeze proposal
→ onReorder
→ authored/framework commit
→ consumer resolution
→ restore library-owned presentation invariants
→ authoritative landing measurement
→ landing
→ terminal
```

The public readiness handshake should still disappear:

- no `controller.ready(request)`;
- no consumer-visible presentation acknowledgement state;
- no readiness identity protocol;
- no readiness-specific retarget lifecycle.

A framework-specific commit barrier remains consumer/integration code rather than a generic drag protocol.

---

## 6. Do not support destructive imperative rerenders during an active operation

Probe C1 demonstrated that `replaceChildren`, `innerHTML` rebuilds, and container replacement can destroy or detach library-owned placeholder state and/or the exact dragged item identity.

We are **not** adding recovery machinery for these renderers.

Supported authored commits may reorder existing sortable nodes while preserving the active drag's DOM identities and library-owned presentation subtree.

Examples that are in scope:

```ts
for (const item of items) {
  root.append(item);
}
```

and keyed/morphdom-style movement of existing item nodes that leaves the drag-owned DOM intact.

Out of scope during an active drag:

```ts
root.replaceChildren(...items);
root.innerHTML = '...';
```

as well as render strategies that destroy and recreate the dragged item/visual identity or replace the container underneath the operation.

Document this as an integration contract rather than attempting to detect or repair every destructive renderer.

Within the supported scope, post-commit placeholder re-anchoring remains necessary. The existing item-relative re-anchor is useful and should survive the serial redesign; C1 demonstrated it repairs append-loop and morphdom-style commits.

Do not weaken the active-drag cross-container refusal merely to support destructive post-commit cases that are now outside the contract.

---

## 7. `box()` / `visual()` geometry

Keep the distinction:

```ts
visual(item): HTMLElement
box(item): HTMLElement
```

where:

- `item` is logical sortable identity;
- `visual` is the exact node faithfully lifted;
- `box` is the sortable geometry source.

Default:

```ts
box(item) = visual(item);
```

### Two measurement windows are required

The correct removed-flow footprint cannot always be derived from pre-lift geometry alone.

Measure:

```text
before lift:
    boxPre
    visualPre
    visual offset relative to box

acquire faithful lift

after lift:
    boxPost
```

The placeholder footprint removed from the layout is derived from the difference between the box before and after the visual leaves flow.

For the probed vertical case:

```text
removed height = boxPre.height - boxPost.height
```

This rule survived a real drag with `layoutAnimation()` active.

### Layout scope

Keep the existing `item.after(placeholder)` anchoring. The layout probe found no benefit in changing it to `box.after()` under `display: contents`.

Preserve copying the logical item's `slot` attribute onto the placeholder; this is required for slotted layouts to render the placeholder at all.

State these scope limits:

- the sortable container's visual order must follow DOM order;
- rule-placed layouts where DOM insertion changes unrelated visual placement are unsupported;
- in CSS Grid, a nested lifted visual that leaves a separate `box` occupying the grid cell is unsupported; require `box === visual` for that layout shape.

Do not add machinery to infer or repair these unsupported layouts.

---

## 8. Collection delivery: source + invalidation

Keep the hybrid collection model:

```ts
sortable(root, {
  items: () => itemsRef.current,
});
```

with:

```ts
controller.invalidate();
```

Responsibilities:

```text
items()
    → current committed sortable collection

invalidate()
    → committed external presentation/data may have changed
```

No `updateItems(payload)`.

No `itemCount()` / `itemAt()` scanning protocol.

### Array identity contract

`items()` returns a readonly array whose identity is stable while membership/order is structurally unchanged.

Structural change produces a new array identity.

In-place structural mutation of the same array is outside the contract.

On invalidation:

```text
same array identity
    → geometry/presentation invalidation only

new array identity
    → structural collection update
    → snapshot/reconcile
    → geometry invalidation
```

On the structural branch, keep the library-owned shallow snapshot/copy needed by the operation. The copy occurs only when array identity actually changes, not on geometry-only invalidation.

This preserves frozen operation state without putting O(n) work on every warm interaction frame.

Existing semantic gap reconciliation remains; only its delivery mechanism changes.

After release, the proposal remains frozen and structural invalidation does not reinterpret it.

---

## 9. Config fragments are plain declarative partial config

Supersede the previous C-5 decision that introduced separate strategy/plugin fragment identities and private strategy slot tags.

A fragment is simply a declarative partial sortable config.

Example:

```ts
function y() {
  return {
    axis: installYAxis,
  };
}

function landing(options) {
  return {
    landing: installLanding(options),
  };
}

function layoutAnimation(options) {
  return {
    plugins: [installLayoutAnimation(options)],
  };
}
```

No fragment installs runtime machinery when constructed.

The assembler:

```text
collect fragments
→ schema-aware merge
→ obtain final config
→ only then invoke/materialize installers
```

Merge semantics belong to **config slots**, not to fragment provenance.

Typical rules:

```text
ordinary scalar/function slot
    → last wins

atomic capability installer
    → last wins as one whole slot

plugin array
    → append in fragment order
```

Defaults are derived after the final merge.

### Atomicity

If several runtime parts must be acquired/retired as one capability, represent them as one atomic slot:

```ts
{
  axis: installAxisCapability,
}
```

rather than several independently mergeable lifecycle fields.

Do not build a generic dependency resolver to preserve accidental coupling between fields from the same helper.

### Consumer composition is intentional

Fragments are ordinary composable configuration values.

A helper may return multiple slots:

```ts
function weirdThing() {
  return {
    axis: installMyAxis,
    landing: installMyLanding,
  };
}
```

A consumer may deliberately select only one:

```ts
sortable(root, {
  axis: weirdThing().axis,
});
```

Likewise presets may be spread, overridden, and plugin arrays may be filtered just like ordinary Vite-style configuration.

The library does not preserve or track the provenance identity of `weirdThing()` after the object exists.

Do not introduce fragment-level tags solely to remember where fields came from.

---

## 10. Input policy must change before release

Probe E establishes two release-blocking root causes in the current behavior.

### Pointer admission

The library currently calls `preventDefault()` at admission, before activation threshold crossing.

This suppresses native focus/caret/selection/form-control behavior even for presses that never become drags.

The contract must ensure that ordinary interactive/editable descendants are not consumed merely because an ancestor is sortable.

At minimum, native controls/editable content must retain their normal pointer behavior unless the consumer explicitly scopes dragging to that interaction.

The existing decline path is good: when admission returns `null`, the browser's native behavior survives intact.

### Keyboard admission

Sortable arrow commands must not capture arrow keys intended for interactive/editable descendants.

In particular:

- text inputs must keep caret/selection arrows;
- `contenteditable` must keep editing navigation;
- native selects/controls must keep their keyboard behavior;
- `event.isComposing === true` must never admit sortable keyboard commands.

The current `handle()` feature demonstrates that one shared scoping rule can protect pointer and keyboard ingress, but it must not be treated as the sole accessibility story: keyboard reordering must remain reachable through a deliberately focusable drag control.

### Plain text selection

Owner direction: do not build elaborate selection-intent detection unless evidence requires it.

Using a modifier such as Alt to request native text selection inside an otherwise draggable non-interactive region is an acceptable/common interaction model.

Please encode the simplest coherent input policy consistent with these requirements in the contract before implementation.

Modifier policy beyond this is not otherwise reopened by Probe E.

---

## 11. Low-level behavior authoring remains a product requirement

The supported progressive-disclosure model remains:

```text
ordinary:
    sortable(...)
    freeDrag(...)

behavior extension:
    sortable feature/config utilities

full custom behavior:
    @ydinjs/drag/kernel
```

The low-level installation boundary remains factory-shaped:

```ts
draggable(root, (host) => ({
  spec,
  controller,
}));
```

because the kernel/host must exist before a custom behavior can build host-backed runtime/controller state, while ingress must not arm until the complete spec/controller has been returned.

Do not replace this with a preconstructed host-free behavior object.

A supported custom-behavior/kernel authoring surface is not optional or deferred merely because its vocabulary needs to be minimized.

Any remaining runtime authoring probe should refine the minimum public vocabulary and validate this factory boundary, not decide whether custom behavior authoring exists at all.

---

## 12. Contract-update and handoff requirement

Please reconcile the active contracts, README/API design notes, and planning documents against the decisions above.

In particular:

- remove the superseded strong post-close ceilings and reach/stretch proof requirements;
- record the finite declared-slot/publication liveness rule;
- separate logical closure from physical resource lifetime;
- retain placeholder rollback;
- keep `destroy(): Promise<void>`;
- keep one `canceled` terminal rather than adding `aborted`;
- document supported vs destructive authored commit strategies;
- record the two-phase `box` measurement and layout scope limits;
- replace `updateItems`/pure-pull collection proposals with `items() + invalidate()`;
- replace fragment-kind/tag machinery with plain declarative partial config and post-merge materialization;
- record the new interactive/editable input-policy requirements;
- preserve the required public custom-behavior authoring layer.

Once the contracts are internally consistent, produce a concise implementation handoff identifying the changed contracts and the acceptance tests/probes that should survive into the production test suite.

Do not implement production code as part of this architecture/documentation task. If updating the contracts reveals a genuine unresolved contradiction, stop and surface that contradiction rather than silently choosing a new architecture.