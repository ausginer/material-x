# 9. Open questions, pressure points and compromises

The brief asks for places where a future behavior would challenge this design to
be documented but **not** solved speculatively. This is that record.

## Free-drag pressure points

Each is a concrete prediction about what would strain if a `free()` behavior
were added next. None is addressed in this contract.

| # | Pressure point | Why it strains |
| --- | --- | --- |
| P-1 | **No live policy seam.** `packages/drag`'s draggable applies `update({ bounds, axis })` in *every* phase, settlement included. `KernelSpec` has no `policyChanged` seam and the contract's only live update is `updateItems()`, a behavior controller method. | A free behavior would either add a kernel seam or replicate the pattern — the second is fine, and is evidence the seam belongs to behaviors rather than the kernel. |
| P-2 | **`moved()` conflates present and derive.** Sortable uses it to schedule spatial work after the kernel has written the transform. A free drag needs the *opposite* order: clamp the delta to bounds, then write. | The kernel currently writes the transform itself before calling `moved()`. A free behavior would need the write moved into the seam, which changes the hot path for both behaviors. This is the most likely first kernel revision. |
| P-3 | **`release()` assumes a discrete proposal.** Free drag resolves a drop *position*, not an insertion index, but the shape — close motion, measure synchronously, build one immutable request, resolve — is identical. | Expected to hold. Worth confirming rather than assuming. |
| P-4 | **`liftMode` is a `KernelSpec` scalar.** Free drag supports faithful, flat and in-place lifts, the last needing a consumer coordinate mapper. | The mapper is a kernel concept (`CoordinateMapper`) but has no place in the current spec. A free behavior would add one field; not a redesign. |
| P-5 | **The frame carries a single `pointerId`.** | Multi-pointer or non-pointer behaviors need a different admission identity. `NO_POINTER` exists as a sentinel but the frame shape assumes one pointer owns an operation. |
| P-6 | **Two settlement gates are hard-coded.** A behavior needing a third would have to fold it into one of the existing flags. | Two is what two behaviors needed; a third is speculative. Recorded, not solved. |

## Keyboard pressure points

Not required this iteration, and no abstraction is added for it. What a future
`keyboard()` feature would hit:

- a keyboard command is a **complete one-slot move**, not an interactive drag: it
  activates without a threshold and goes straight to the release path. The
  kernel's `PENDING → ACTIVATING` path is threshold-driven, so it would need an
  "admit already activated" entry;
- the command carries its own authoritative insertion, so the spatial rule must
  be skippable — currently the behavior would branch on a frame flag, exactly as
  `packages/drag` does;
- `preventDefault()` must run inside the native listener, which the `admit` seam
  already supports.

None of these is impossible; none is designed for.

## Accepted compromises

**The kernel spec is twelve operations plus three scalars.** A behavior author
must implement all of them, including seams a simple behavior would leave
near-empty
(`notifyStart`, `classify`). The alternative — optional seams with `null`
checks — trades a construction-time requirement for a per-call branch. The
contract chooses the requirement and expects a future `createBehaviorSpec()`
helper with defaults if a second behavior confirms the shape.

**`begin()`/`commit()` are typed at the kernel frame and re-declared by the
behavior.** There is no runtime cost, but there is a cast at the boundary. A
generic `Kernel<Frame>` threaded through every kernel function was rejected as
more type noise than the cast is worth for one behavior.

**The kernel writes the lift transform, the behavior does not.** This keeps the
hot path free of one indirect call but assigns a domain-shaped responsibility to
the kernel. See P-2.

**`items` is a positional argument, not a feature.** Uniformity was traded for
honesty: collection code is never absent, so a `collection()` feature would be a
required feature that tree-shakes nothing.

**Placeholder mechanics live in the behavior, not the `placeholder()` feature.**
This means a minimal build always pays for placeholder creation and sizing. That
is correct — the placeholder is the authoritative footprint, not a decoration —
but it does mean `placeholder()` is a *customisation* feature, which its name
under-communicates.

**Duplication with `packages/drag` is expected and accepted.** The two packages
will contain structurally similar queue, lifetime and attempt code. `drag2` must
not import from `drag`, and the shipped package's own finding stands:
deduplicating source text yields no compressed-size benefit, because Brotli
already collapses the repetition.

## Unresolved questions

**Q-1. Does `spec.admit` running inside native dispatch belong in the kernel at
all?** It is the one seam where the kernel calls the behavior *outside* the
queue. It has to be: `composedPath()`, the handle resolver and
`preventDefault()` are valid only during native dispatch. But it means a
behavior can throw into the browser's event loop rather than into the failure
model. `packages/drag` accepts this deliberately (a throwing admission factory
escapes the listener, leaving the controller idle and usable); this contract
inherits that behavior without re-litigating it. Worth a decision before
implementation.

**Q-2. Should `readinessTimeout` be per-operation rather than per-controller?** A
consumer with one slow list and one fast one currently gets one policy. 500 ms
is inherited as a proven default; nothing in the brief demands more.

**Q-3. Is `RECOVERY_HOME` right for a rejected reorder?** Returning the visual to
its grab origin is what `packages/drag` does, but with a placeholder-based
sortable the "home" slot may have moved under an accepted concurrent update. The
contract keeps the shipped behavior; the test matrix should include a rejection
after a collection change to see whether it still looks correct.

**Q-4. How is the layout-displacement feature's element set determined?** The
contract fixes the seams and the retargeting rule but not which neighbours are
measured — every item in the destination view, or only those between the old and
new gap. The second is cheaper and is the expected implementation, but the
correct set under a concurrent collection replacement is not obvious.

**Q-5. Should the geometry cache live on the runtime or inside `vertical()`?**
The contract puts `rects` on the runtime (artifact 4) so retirement can empty it
uniformly, which leaks an axis-specific concept into a shared container. Moving
it into the feature would require a feature-owned retirement hook — which the
installer already provides. This is the cleanest remaining simplification and
should be revisited during implementation.

**Q-6. Does the two-behavior-tag count survive?** The claim that vertical
sortable needs only two behavior action tags is a design assertion, not a
measurement. If the implementation grows a third or fourth, the kernel/behavior
boundary is in the wrong place and this contract should be amended rather than
worked around.

## What would falsify this contract

Written down now so the iteration can honestly fail:

- the pointer-move path allocates, and removing the allocation requires a
  structural change rather than a local fix;
- the behavior needs more than three or four action tags;
- a feature cannot express itself without a generic event interface;
- the minimal bundle contains axis geometry, landing or layout-animation code;
- readiness and landing cannot be made to overlap without serializing one;
- a custom (spring) landing runner requires a kernel change;
- `destroy()` during a long landing cannot be made synchronous and complete;
- the kernel turns out to be a directory of helpers rather than an FSM a
  behavior author can lean on.
