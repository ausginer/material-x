#### DRO-11 — An accepted drop's landing into its target

**Default: no landing into the target.** With `dropTargets`, an accepted drop keeps `freeDrag`'s accepted semantics: the visual stays where it was dropped, and the consumer commits the new position or parent in `onEnd` (DRI-9, DRI-20). A rejected drop or a cancel lands home, as now. The handoff builds the default.

**The alternative** is to land the visual into the target, for example at its origin or center, before the consumer commits. The target would then have to be measured before the release, and `freeDrag` would name that landing in `settle`. The drop-zone fixture does this with a stand-in element.

**Recommendation: keep the default for v1.** It needs no new option, and a landing into the target can be added later as an option without breaking anything. This is a product choice, because it decides what the user sees at an accepted drop.