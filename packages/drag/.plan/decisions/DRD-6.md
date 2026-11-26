#### DRD-6 — `requestStep` replaces `run`, `requestApply` and `apply`

**Status:** active, scoping amended by `DRD-16`. Under `DRD-30` a step receives the behavior's operation instead of the `Drag`. Under `DRD-35` a step may come with a receiver and coalesces by the pair. Its stop condition holds

**One request runs behavior code in a pass: at once when idle of a pass, between steps otherwise. The step receives the `Drag` only while the operation is active and undecided, and `null` otherwise. Hooks also get `drag.requestStep` and `drag.requestCancel`.**

This resolves four difficulties in the report. `run` was refused silently inside a pass. `requestApply` needed a holding variable outside the drag. Both built-ins wrote the same `released` flag. Hooks named a controller declared after them, the source of the 8 `no-use-before-define` errors. It also fixes the `moveTo` defect, where a write behind a cancel moved the visual and the landing's start.

**This is a short list, and it does not bring back the queue.** It holds only steps, on one precedence level, and is empty on the hot path. Destruction and the decision remain slots, nothing is tagged or reordered, and no pointer sample enters it. **I withdraw the plan's "the kernel grows a queue" stop condition for this one list.** The condition's concern, a second reader or FIFO across kinds, still holds as a stop condition. Identity coalescing keeps change 5, where two `invalidate()` calls pull once. A cancel followed by `invalidate()` no longer pulls first, which removes the report's one visible FIFO difference.

The rule that an author must not write directly from foreign code stays a documented rule. Nothing can detect a violation.