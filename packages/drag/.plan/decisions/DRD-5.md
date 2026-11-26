#### DRD-5 — `box-quad` is the one coordinate model

**Status:** active

**Behaviors with and without the lift use `Space`, `Box` and a new `localDelta` from `@ydinjs/box-quad`. `InheritedSpace` and the canvas example's size ratio are removed. A no-lift behavior imports `box-quad` itself and pays only for what it uses. Recorded in that package as `box-quad:BQ-10`.**

Owner requirement. Both linear parts sit in the same four slots, so one pure function serves both. A throwaway function with this signature gave zero error across rotate, scale, skew, zoom, own rotate and resize, in three engines ([results](../probes/final-design/results.json.txt)). The one miss was the element's own `zoom`, which a `Space` excludes by definition, and DRI-16 states it. The kernel does not read a basis for a no-lift behavior: which element and which basis are the behavior's knowledge, and a resize handle in an untransformed page should not pay for an ancestor walk.