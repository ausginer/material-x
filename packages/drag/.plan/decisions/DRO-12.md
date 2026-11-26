#### DRO-12 — The costs of the callback list

**Default: none is accepted until you read it.** [`callback-list-completion-handoff.md`](../callback-list-completion-handoff.md) implements `DRD-36`, `DRD-37` and `DRD-38`, and its report gives these figures, each with the commit it measured:

- **Size:** every row of `node bench/size/measure.ts`, minified and Brotli, at `25a67d4a9` and at the implementation commit, with each row's difference. A row that the change puts over its ceiling, or further over it, is named.
- **Allocation, measured in V8:** the retained bytes of a list made by `queue()` and of one made by `stack()`, as made, against a bare array. The method and the Node version are stated.
- **Allocation, counted by reading:** per controller, per admitted press or command, per `sortable` controller with and without `displacement`, per step requested during a pass, and per `use` call.
- **Per sample:** the per-sample test's result.

**Expected by reading, not measured:**

- **Per controller (kernel):** two lists and their two arrays, where the base has two arrays.
- **Per admitted press or command:** the session's list and its array, where the base has one array. A press that never activates pays it too, because the session opens at admission.
- **Per `sortable` controller:** two functions fewer, `#invalidateGeometry` and `#retireAxis`, and a third fewer with `displacement`, the wrapper around `retire`.
- **Per step requested during a pass, and per `use` call:** two array slots where the base uses one. No object.
- **Per sample, and per step requested while idle:** nothing.
- **Size:** every composition imports the kernel, so every row grows. `DRD-37` and `DRD-38` change no emitted code.

**Reported for the version that `DRD-36` replaced,** at `53c87f988` against `25a67d4a9` ([report](../callback-list-report.md#costs-dro-12)): +424 to +448 B minified and +129 to +152 B Brotli. `example: resize handle`, `example: canvas group`, `freeDrag` and `complete` went over their ceilings, and three rows already over went further. A list as made retained 128 B against 32 B for a bare array. These figures don't establish `DRD-36`'s costs.

**No timing is taken,** and the approval re-bases nothing. **What reading decides:** you accept the figures, or you name a part to remove before merge. Declining a figure is also what `DRD-35` names as reopening the representation.

**Amended 2026-11-09 by `DRD-36`.** It asked for each list's direction function to be measured and counted. `DRD-36` removes those functions, and the figures come from the completion handoff instead of [`callback-list-handoff.md`](../callback-list-handoff.md).

**Accepted by the owner on 2026-11-10,** at the figures that the [completion report](../callback-list-completion-report.md#costs-dro-12) measured at `50ed18a17` against `25a67d4a9`: +392 to +416 B minified and +130 to +146 B Brotli on every row; `draggable alone`, `example: resize handle`, `freeDrag` and `complete` newly over their ceilings, and `example: drop zone`, `freeDrag + bounds + landing` and `draggable alone`'s control further over; 72 B retained by a list as made, against 32 B for a bare array; and the counts by reading in that report. **The acceptance re-bases nothing.** The rows stay red until a re-base under `DRO-4`. No cost under `DRO-12` is declined, so `DRD-35`'s representation reopens only on a timing reading.