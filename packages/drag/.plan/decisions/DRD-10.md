#### DRD-10 — Landing elevation by animation

**Status:** active, a grab during a landing amended by `DRD-18`

**The flight animates `z-index` and, for a static item, `position`, in a separate replacing animation. Presentation is still released before the landing and terminal. Reduced motion moves into the lift, so it covers every behavior.**

Results, in three engines: with elevation the item stayed on top of `relative` and `z-index: 5` siblings, and left no inline style. **One additive animation is rejected:** in WebKit, adding to the item's own `z-index: 5` wrapped it to `-2147483648` and the item went under.

**Holding the top layer for the flight is rejected, and `drag:DRO-2` keeps it open as the alternative.** It would fix clipping as well. But a consumer's `insertBefore` already closes the popover in all three engines, so an accepted reorder would have to reopen it, firing `toggle` after `onEnd`. The placeholder and inline styles would also outlive the terminal, while a consumer is most likely to re-render.

**Found by reading, not run:** the prototype's `#startLanding` honors reduced motion only for a behavior that composes `landing()`. A custom behavior's landing ignores it, so the check moves into the lift.