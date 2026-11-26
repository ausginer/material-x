#### DRD-21 — Internal questions from the discipline pass

**Status:** active, implemented at `b91db2818`

- **`LinearShift` and `RectIndex` lose the axis parameters no caller passes** (`cleanup` oq-1). `y()` is the only caller, and no horizontal linear axis is decided. `xy` covers a single row. The parameters come back with such an axis.
- **`sortable/anchor-outside-container` and `sortable/insertion-placeholder-lost` stay** (`cleanup` oq-2). Each guards a state that DRI-15 admits, from a custom-element reaction or a placeholder factory, and so passes CONTRIBUTING §1.1 gate (a). Each needs a test that names its fault.
- **`RectIndex` grows by doubling and no longer shrinks** (`cleanup` oq-3). No measurement ties the shrink policy to a decision. The cache is bounded by the largest list the consumer had and is released with the controller.
- The other `cleanup-*` findings need no decision and are scheduled.