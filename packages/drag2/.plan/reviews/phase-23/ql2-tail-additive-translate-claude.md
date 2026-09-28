# The tail's presentation claim narrows to additive `translate`

**Architect amendment to D-155, 2026-08-29. Phase 23.** Implementation-shape check requested before handoff. **The T1/T2 ownership decision is untouched** — the semantic operation still ends after the complete pin and release, and the interpolation is still a non-owning tail. What changes is _which property the tail claims_, and it is a strict narrowing.

**Answer: yes, and the package already argued the case for the other feature.**

---

## 1. `layoutAnimation` did not choose `translate` by taste

Its own comment is a complete argument, and every clause transfers:

> `transform` would be wrong twice over: it _replaces_ an authored `rotate(4deg)` for the duration, and it overrides a consumer's own running transform animation. Additive `transform` is wrong too — additive transform lists concatenate, so the offset would land inside the element's own `scale()` and move it by a multiple of the delta, while the delta was measured in viewport space.
>
> `translate` applies _before_ `transform` in the used-value chain (`translate → rotate → scale → transform`), so the offset is **outside the element's own transform and needs no correction**; and `composite: 'add'` composes it with an authored `translate` or a consumer animation on the same property instead of clobbering it.

Both hazards it names are exactly D-155's: replacing an authored `transform`, and overriding a consumer's animation on it. A third applies to the tail and not to `layoutAnimation`: **a lifted visual may have had `transformOrigin: 0 0` written on it** under `LIFT_FAITHFUL`. A translate is origin-independent, so the tail is immune to whatever origin the element is restored to; an inverse `transform` would need an origin correction the library would have to derive.

**So the tail animates `translate` from the displacement to `0 0` with `composite: 'add'`.** D-155's presentation claim narrows from _the element's `transform`_ to _an additive contribution to its `translate`_.

---

## 2. The delta is already computed, and no geometry is reopened

At the join the kernel holds both endpoints, in one space:

| Value | What it is |
| --- | --- |
| `fromX`/`fromY` | the last drag translation — origin-relative **viewport** delta |
| `targetX`/`targetY` | the authoritative landing target, same space, measured once at arm |

`tail = from − target`, in viewport space. **Both are already computed today** — they are `LandingContext`'s four coordinates, and 07 §One coordinate space fixes the space: _the four coordinates are all origin-relative viewport deltas._ No DOM is read after release, and none before it that is not read already.

Where `targetX === null` — the documented skipped measurement, the jump cut — there is no target, so there is **no tail**. That case needs no special handling; it falls out.

### The conversion, and the trap in it

A `translate` on the released element is applied in the space its **ancestry** establishes, so the viewport delta must be mapped through the inverse of the inherited linear part. That is exactly `InheritedSpace`, and the arithmetic already exists in three places — `makeSession`'s `compose` in-place branch, and `buildGeometry`/`buildRequest` in `free-drag/geometry.ts`, which publish the result to consumers as `localDeltaX`/`localDeltaY`. **Viewport-delta-to-local is an established exported concept in this package, not a new invention.**

**The trap: the tail must not reuse `session.compose`.** `compose`'s projection is `inheritedSpace` for `LIFT_IN_PLACE` and **`null` for both lifted modes** — correctly, because a `position: fixed` element's local space _is_ viewport space. But the **released** element is in flow in all three modes, so all three need the same conversion, and it is `inheritedSpace` directly. Reusing `compose` would be right for one mode and silently wrong for two (F-189).

### What the implementation owes

`inheritedSpace` is destructured in `acquireActivation` and published to the activation scope; **it is not retained anywhere the join can read it.** The tail needs it kept — one reference per operation, four numbers or `null`. That is the one addition this narrowing requires, and it is smaller than the origin correction an inverse `transform` would have needed.

**Two things implementation must verify rather than assume**, both because they are properties of `InheritedSpace` and not of this decision:

- **Ancestor zoom.** Whatever `inheritedSpaceOf` folds is what this package already calls _local_, since free drag publishes exactly this mapping. If it is wrong under zoom it is already wrong in published geometry — so the tail inherits an existing definition rather than creating a risk, and a zoom fixture should pin it either way.
- **Whether the pin is still load-bearing under a tail.** Pin and release now happen in one task with no paint between, and the style restore undoes the pin's write, so the pin may be redundant _when a tail is installed_. It is certainly not redundant on the no-tail path. **Flagged, not decided** — D-155 keeps pin-and-release, and the owner's instruction is not to reopen it.

---

## 3. Sound in every lift mode

| Mode | During the drag | After release | Tail |
| --- | --- | --- | --- |
| `LIFT_FAITHFUL` | `fixed`, `transformOrigin: 0 0`, net zoom 1, base = full matrix; `compose` projection `null` | in flow, authored styles restored, authored origin restored | viewport delta → `inheritedSpace` → additive `translate`; **origin-independent, so the restored origin cannot affect it** |
| `LIFT_FLAT` | `fixed`, positioned from `originRect`, base `''`; projection `null` | in flow | same |
| `LIFT_IN_PLACE` | stays in the container, rides the authored transform, projection = `inheritedSpace` | in flow, `transition: none` lease released | same — and this is the mode whose drag-time arithmetic the tail reuses verbatim |

The three modes differ in how the _lifted_ element is positioned and converge completely once it is released, which is what makes one tail correct for all of them.

**One residual error, and it is unchanged rather than new.** The tail is correct to the extent that the released element's flow position equals `target`. `anchorTarget` measures a proxy — the placeholder — so any mismatch between the placeholder's box and the item's is a small error. **It exists today at identical magnitude**, where it appears as a small jump at release; under a tail it appears as the tail starting slightly off. Same error, different presentation.

---

## 4. The contract statement narrows

D-155 §4 owed the consumer this:

> ~~For a bounded interval afterwards the library may still be interpolating the dropped element's `transform`.~~

That was the price of claiming `transform`. With additive `translate` it becomes:

> **The terminal means the semantic transaction is complete and the DOM is the consumer's again. It does not mean every pixel has stopped moving.** For a bounded interval afterwards the library may still contribute an **additive `translate`** to the dropped element. It claims no inline style and does not touch the element's `transform`; it **composes with** an authored `translate` or a consumer animation on the same property rather than replacing either; it ends at a zero contribution; and it is abandoned the moment the element is removed or replaced, or another drag begins.

The library no longer overrides anything the consumer wrote. **That is a strictly smaller claim than the gate makes today**, where the library owns the whole element.

---

## 5. Reparenting: resource safety and visual continuity are different claims

D-155's case table said removal, reparenting and replacement _need no handling at all_. **That merged two claims and only one of them is unconditional** (F-190).

**Resource safety — unconditional, and it does not depend on ancestry.** No lease survives the terminal. A WAAPI effect on a reparented, detached or replaced element leaks nothing: a removed node stops being rendered and the effect is collected with it, and a replaced node takes its effect with it. This is guaranteed by the tail holding no claim, which is D-155's whole argument, and reparenting cannot weaken it.

**Visual continuity — best-effort, and forfeited by ancestry changes.** The `translate` value is a _local_ quantity derived through `inheritedSpace` captured at activation. Reparent the element under an ancestor with a different linear part during the tail and the same local value maps to a different viewport displacement: the tail travels the wrong distance or direction.

**The failure is bounded and self-correcting, which is why it is acceptable.** The tail's end state is a zero additive contribution, so **however wrong the path, the element ends exactly where flow puts it.** The damage is a wrong-looking transit of at most the tail's duration, on an element the consumer moved mid-animation. Detecting it would cost a `MutationObserver` or a re-measure to buy a better-looking transit in a case the consumer created; declined under `CODE_OF_SIZE.md` §Priorities, and `layoutAnimation` already accepts the same exposure without a mechanism.

**So the correct statement is: the tail is resource-safe unconditionally and visually best-effort.** Same distinction, stated once, and it is the honest form of what D-155's table claimed.

---

## 6. What this does not change

- The T1/T2 decision, and the reason for it: **a tail may not hold a lease.** Additive `translate` holds even less than `transform` did, so the argument only strengthens.
- Release-before-terminal.
- The pin, `anchorTarget`, and the untouchable set.
- Free drag: the mechanism is the same, and its `accept()` commit obligation stays open and un-inherited.
- The measurement in [`ql1-landing-hold.md`](../measurements/ql1-landing-hold.md) §11: arm **A″** now prices _retaining `inheritedSpace` plus an additive-`translate` runner_, which is smaller than what it was going to price.

---

## 7. Findings

**F-189 — the conversion the tail needs is not the one `compose` holds.** Tier C, open. `session.compose`'s projection is `inheritedSpace` for `LIFT_IN_PLACE` and **`null` for `LIFT_FAITHFUL` and `LIFT_FLAT`**, because a fixed element's local space is viewport space. The **released** element is in flow in every mode, so every mode needs `inheritedSpace` directly. Reusing `compose` would be correct in one mode and silently wrong in two — wrong by an ancestor scale, so it disappears entirely on an untransformed page and appears only under an ancestor transform. Recorded because it is the natural shortcut and it is invisible in the common fixture.

**F-190 — resource safety and visual continuity were merged in one row.** Tier C, open. D-155's case table called consumer reparenting after the terminal _harmless_. Resource safety is unconditional and does not depend on ancestry; visual continuity is best-effort and is forfeited by an ancestry change, bounded by the tail ending at a zero contribution. **The general form: a claim that a mechanism "needs no handling" should name which property it is safe in**, because a lifecycle argument and a rendering argument reach different answers about the same event.