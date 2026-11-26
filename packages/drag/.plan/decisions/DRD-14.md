#### DRD-14 — The lift owns what it writes, until release

**Status:** active, implemented at `b91db2818`. Under `DRD-27` the release is the lift's own disposer, in the same place

**From activation to release the lift owns the visual's inline declarations of every property it writes, and release restores them exactly, including over a write anyone else made during the lift. A commit to one of those properties is made after release, in `end` (built-ins: `onEnd`). A commit the lift does not own may be made in the verdict: DOM order, attributes, classes, custom properties, another element or a model.**

Decides `drag/architecture:challenge-1`. The README's free-drag example commits `translate` in `onDrop`, and release then puts back the value from before the drag, so an accepted drag ends at home in all three engines. `sortable` is unaffected: its commit is DOM order, which the lift doesn't own. `end` runs after release in the decision's task (DRI-9), so a commit there shows no frame at home, which probe `P7c` confirms.

**Rejected: keep a write made during the lift.** A value comparison at release cannot tell a consumer's `top: 0px` from the lift's own `top: 0px`, so a drag to the top edge would lose its commit. Detecting writes as they happen allocates per sample (DRI-17). **Rejected for now: a stylesheet layer** that leaves inline declarations untouched. It would need a sheet in every document and shadow root the visual can live in, which is a redesign of the lift and outside a bounded remediation. It is the route if framework-owned inline styles on a lifted visual become a requirement.

**Cost:** `freeDrag` consumers commit in `onEnd`, and a framework must not write those properties to a lifted visual. The README names the properties.