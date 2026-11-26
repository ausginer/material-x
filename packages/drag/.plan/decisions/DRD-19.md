#### DRD-19 — Free drag measures its offset against home at the drop

**Status:** active, implemented at `b91db2818`

**`freeDrag`'s request gives `localDelta*` as the offset from home to the drop position, in the visual's local units. Home is `config.home()`, read once at the drop, or the activation rect when no `home` is given. A home landing uses `home()` at `settle`, as now. `onMove`'s geometry stays pointer travel.**

Decides `drag/architecture:challenge-8`. A scroll during the drag moved the home, and the committed element landed away from the drop by the scroll distance, in all three engines. A rejected landing after such a scroll also starts that far from the drop.

**Rejected: measuring the home inside the library.** The lifted visual has no slot to measure. An ancestor's rect or scroll offset is wrong for a `position: fixed` panel, which a page scroll doesn't move, and for an element whose containing block is outside the scroller. Those are common free-drag subjects. The consumer knows its own scroller. **The limit is documented:** without `home`, the offset is exact only when nothing moved the home during the drag.