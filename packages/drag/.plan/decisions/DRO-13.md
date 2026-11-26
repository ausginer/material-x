#### DRO-13 — The declaration kind of the other values the library creates

**Default: nothing changes kind beyond `Drag` and `Lift` (`DRD-38`).** By CONTRIBUTING's TypeScript section as clarified at `2bec0c431`, the architect reads these declarations as shapes of values the library creates, still declared as interfaces:

- **The controllers:** `DraggableController`, which `draggable` returns, `SortableController` and `FreeDragController`. `Gesture implements DraggableController`, and CONTRIBUTING says that the possibility of writing `implements` doesn't make a value shape a contract.
- **Internal values:** `FrameTask` and `LinearShift`.

**These stay interfaces,** because a capability slot takes them and other code may implement them: `Landing`, `MotionConstraint`, `DisplacementSink`, `InsertionGeometry` and `DropTargetTracker`. A third party may supply its own `DropTargets`, which returns a `DropTargetTracker`.

**Recommendation: convert the first two groups in a later unit,** so that the package follows one rule. It costs no bytes. The controllers are on the public surface, so the contract records that change as it records `DRD-38`. Nothing in the current unit depends on this.

**Deferred by the owner on 2026-11-10.** The default holds: nothing changes kind beyond `Drag` and `Lift`. **Amended the same day, on the owner's note:** `DropTargetTracker` is a contract for third-party `DropTargets` implementations, so it is not a value only the library creates. It used to be listed with the internal values. A later reading checks each remaining declaration for the same reason before it changes kind, and none changes kind only because the library also creates it.

**Its reach, stated on 2026-11-10** after the combined review ([`combined-review-assessment.md`](../combined-review-assessment.md) §5):

- This entry covers the declarations in `src/` that it names.
- The interfaces in `tests/` and `bench/` are outside it: `GroupMove`, `CanvasGroup`, `ReactFixture`, `CdpSession`, `Page`, `Lifted`, `Named`, `Held`, `PageContext` and `Scenario`. They are unpublished, some describe host-provided objects, and no unit is owed for them. A unit that edits one of those files for another reason applies CONTRIBUTING's rule there.
- The other packages' declarations belong to the repository register.

**Applied on 2026-11-14 by `DRD-63` property 1.** The owner's class refactor exported `MotionConstraint` and `DropTargetTracker` as classes. `DRD-63` keeps both as interfaces, as this entry lists them, and the assessment's Q3 asks the owner to confirm it. This entry is unchanged.