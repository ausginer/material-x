# Checkpoint C follow-up review — remaining work after the D-33 redesign

Hey, the second Phase 14 pass resolves the original seven review points in substance. The move from the settlement-minted token to request-identified `controller.ready(request)` is the right correction, and D-32, D-34 and D-35 remain accepted.

This follow-up is intentionally narrow. Please do not reopen the full architecture again. Four items remain before Checkpoint C can close: one protocol/default question, one missing normative data path, one stale trace, and one verification artifact that was not present in the review patch.

## Current verdict

| Area | Verdict |
| --- | --- |
| D-32 — second admission | Accepted |
| D-33 — controller acknowledgement by request identity | Direction accepted |
| D-34 — activation staged type | Accepted, pending independent fixture inspection |
| D-35 — lift-owned rendered delta | Accepted |
| Checkpoint C | Not closed yet |

---

## C2-01 — major: a forgotten presentation declaration is still silent

The new public shape is:

```ts
ReorderResolution.accept({ presentation: true });
controller.ready(request);
```

with:

```ts
type ResolutionOptions = Readonly<{
  presentation?: boolean;
}>;
```

and absent or `false` meaning that the authored DOM is already final.

This still permits the original undetectable failure:

```ts
const onReorder = (request) => {
  setOrder(applyReorder(request));
  return ReorderResolution.accept(); // presentation flag forgotten
};
```

The consumer has started an authored render, but the resolution says no render is expected. Therefore:

- no readiness hold is taken;
- no deadline is started;
- settlement may finalize before the authored commit;
- `controller.ready(request)` is irrelevant or reported as outside the valid window;
- the library has no signal that the declaration was omitted.

That is the old probe-13b R-2 shape: a hold that should have existed was never requested and cannot be detected.

The revised contract currently says both:

> the consumer cannot omit the kernel-owned readiness hold

and:

> obligation 4 remains, now bounded and diagnosable.

Those claims do not follow from an optional boolean whose safe path is opt-in. The kernel owns a hold once the resolution declares one, but the consumer can still omit the declaration entirely.

### Please choose one honest contract

There are two acceptable directions.

#### A. Make the common controlled-render path fail-safe

For example:

```ts
ReorderResolution.accept(); // authored presentation expected
ReorderResolution.accept({ presentation: false }); // DOM already final
```

or use an explicit discriminated option:

```ts
ReorderResolution.accept({ presentation: 'expected' });
ReorderResolution.accept({ presentation: 'already-final' });
```

The exact syntax is open. The property that matters is that forgetting an option should not silently select the path with no hold when a controlled reorder normally renders authored DOM.

#### B. Keep the current default, but state the remaining discipline honestly

If absent means already final, then:

- R-2 is not structurally resolved;
- I-35 must not say the consumer cannot omit the hold;
- F-46 must not say the previously silent obligation became bounded and diagnosable in every case;
- the React integration must explicitly document `{ presentation: true }` as a required consumer obligation.

This direction is weaker but coherent. Please do not claim the stronger guarantee while retaining the opt-in hold.

---

## C2-02 — major: the normative contract does not show the exact request-identity data path

D-33 now depends on object identity:

```text
request created for operation A
→ the same request is published as A's pending acknowledgement identity
→ the same request is passed to onReorder
→ controller.ready(request) compares against that exact object
→ retire clears it
```

The revised prose says that `release.effect` publishes the request before the kernel invokes the round-trip. That ordering is correct and load-bearing.

However, the normative construction/runtime documents still do not clearly show where this value lives or how the exact object crosses both paths.

The existing `ResolutionCommand` shape exposes only `invoke`; the request cannot be recovered from it unless the revised shape carries it or both closures share explicit behavior state. Likewise, the `SortableRuntime` listing and its mutable-field count do not visibly include a `pendingRequest`, and the retirement description does not clearly clear one.

### Please make the bridge executable in the normative documents

Choose and show one concrete mechanism. For example:

```ts
type SortableRuntime = {
  // existing fields...
  pendingRequest: ReorderRequest | null;
};
```

with the sequence:

```text
release.prepare
  builds one immutable request object
  stages a command that will invoke onReorder with that exact object

release.effect
  publishes that exact request to rt.pendingRequest
  performs the final presentation writes

kernel
  invokes the staged command

controller.ready(request)
  request === rt.pendingRequest
    → host.presentationCommitted()
  otherwise
    → report and do not release anything

retire
  rt.pendingRequest = null
```

Another closure-owned mechanism is fine, but it must be equally explicit.

Please update every dependent statement:

- the runtime field listing and mutable-field count;
- the ownership table;
- `release.prepare` / `release.effect`;
- `ResolutionCommand`, if its shape changes;
- controller construction;
- `retire()`;
- the lifecycle trace;
- the Phase 14 compiled fixture.

The important claim is **same object identity**, not merely structurally equal request data.

---

## C2-03 — consistency: document 06 still contains the removed token protocol

The illustrative lifecycle trace must agree with normative document 02. It currently retains pieces of the previous C-2 design, including token-era settlement fields and flow.

Examples that need a complete cleanup include:

```text
attempt = { ..., presentation: null, ... }
prepared.presentation !== null
scope.holdForReadiness(prepared.presentation)
authoredReady = presentation === null
```

The new contract instead has:

```text
PreparedSettlement.presentation: boolean
scope.holdForReadiness()
authoredReady = !readinessHeld
controller.ready(request)
```

The `onReorder` example also appears to contain both the old authored update and the new request-storage/update sequence, effectively applying or describing the update twice.

### Please rewrite the affected trace as one coherent path

The trace should show, in order:

1. `release.prepare` creates the exact request;
2. `release.effect` publishes it as the current acknowledgement identity;
3. the kernel invokes `onReorder(request)`;
4. the consumer stores the request before beginning the authored mutation;
5. the consumer returns a resolution that explicitly declares whether readiness is required;
6. an early `controller.ready(request)` latches on the resolution attempt;
7. settlement copies that latch and requests a hold only when declared;
8. arming dispatches `READINESS_SETTLED` for an early acknowledgement or starts the deadline otherwise;
9. retirement clears the behavior's published request;
10. a stale request cannot release a later operation.

Remove all token, deliverer and `abandon()` vocabulary from the live trace.

---

## C2-04 — verification: the compiled revision fixture was not included in the supplied patch

The documents repeatedly reference:

```text
packages/drag2/docs/revision/phase-14.ts
```

and report that it contains:

- the revised D-32…D-35 type surface;
- two complete specs with `Activation = HTMLElement` and `Activation = true`;
- the construction handshake;
- the controller-shaped readiness integration;
- twelve `@ts-expect-error` assertions.

That file was not present in the supplied `review-address.patch`, so the independent review could not inspect it.

This may simply mean the file is untracked and therefore absent from ordinary `git diff`. Please include it in the next review artifact and verify:

```bash
git status --short
git diff --cached -- packages/drag2/docs/revision/phase-14.ts
```

or provide an explicit new-file diff.

The fixture should also demonstrate the exact identity path from C2-02, not only isolated type aliases.

Checkpoint C should not claim a compiled revision until the fixture itself is part of the reviewed and committed change set.

---

## What no longer needs reopening

The following decisions survived the review and should not be reconsidered without new executable evidence:

### D-32

A second admission member remains the smallest fit. Moving kernel-owned `preventDefault()` after a non-null admission result is correct. The tier-C residue — behavior code still physically receives the native event — is now stated honestly.

### D-34

The activation staged type belongs to the behavior. Keeping the default only on `BehaviorSpec`, while threading `Activation` through the construction handshake for inference, is the correct shape.

### D-35

The lift session remains the right owner of the rendered delta. No behavior seam should be added.

### D-33’s basic identity choice

Using the public request as acknowledgement identity is better than a public settlement token:

- it exists before the render;
- it is already per-operation;
- it adds no allocation;
- it avoids exposing gate machinery;
- it can safely support early acknowledgement through the resolution attempt latch;
- identity comparison closes the stale-operation window.

The remaining issue is the default/obligation contract, not the choice of identity.

---

## Requested micro-pass

Let’s do one narrow consistency pass:

1. Decide whether authored presentation is expected by default or remains an explicit consumer obligation.
2. Align I-35, F-46 and probe-13b closure claims with that decision.
3. Specify and compile the exact request-identity publication/retirement path.
4. Rewrite document 06 to remove all token-era state and duplicate consumer updates.
5. Include `packages/drag2/docs/revision/phase-14.ts` in the review diff.
6. Run typecheck and the existing suite again after the documentation/fixture corrections.

Please raise a concern if the exact request publication forces `ResolutionCommand` to change. That would be a legitimate contract correction, not implementation scope creep.

## Checkpoint C exit

Checkpoint C can close when all four are true:

- a forgotten presentation declaration has either a fail-safe meaning or is explicitly retained as tier-C discipline without stronger claims;
- `controller.ready(request)` is specified against one exact published request object and retirement clears it;
- the illustrative trace contains only the selected C-3 protocol;
- the compiled Phase 14 fixture is present in the reviewed change set and proves the complete revised type surface.
