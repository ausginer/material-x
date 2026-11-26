#### DRD-9 — The kernel keeps focus through an operation

**Status:** active, the restore's place amended by `DRD-15`

**DRI-12. Implemented in the kernel and the lift, so every behavior gets it with no code. Not on destruction. It never takes focus from an element focused since the drop.**

The probe showed focus goes to `body` after keyboard and pointer reorders in all three engines, and `insertBefore`, which the API encourages, causes it. A second arrow press then does nothing, so keyboard reordering fails unless a consumer repairs it. The lift also moved focus to an `autofocus` descendant in all three engines. **This narrows the "no focus management" boundary in `accessibility.md`** for the new package: the consumer still owns `tabindex`, roles and announcements. Restoring in the consumer would leave a defect in the documented example.