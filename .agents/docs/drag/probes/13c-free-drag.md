# Probe 13c — free drag against the frozen SPI

**Result: two structural gaps, six questions closed as "it fits".** Typed probe: [`packages/drag2/docs/probes/13c-free-drag.ts`](../../../../packages/drag2/docs/probes/13c-free-drag.ts) — every `BehaviorSpec` member written out against the real SPI, with inert stubs wherever a lifecycle would be needed.

This is the strongest available test of the claim that the kernel is behavior-agnostic, and the honest summary is: **it mostly is.** A complete free-drag `BehaviorSpec` compiles against the frozen surface. The two things that do not compile are the two places the sortable's shape leaked into the kernel.

The probe is deliberately not an implementation. 00 warns that typecheck cannot catch a lifecycle error, and a file of this size can look executable.

## What does not fit

### N-1 — activation is typed for a placeholder

`BehaviorSpec.activation` is `Transition<Part, HTMLElement, ActivationScope>`. `prepare` must return an `HTMLElement`, and the other inhabitant — `null` — is already spoken for: it means **discard the activation**.

A free drag stages nothing at activation. It has no placeholder, no detached node, no acquired resource. Its honest `prepare` returns _proceed_, and the SPI has no way to say that.

The probe demonstrates both halves: the compiling `freeDragSpec` returns `scope.visual` — an element the kernel already holds, chosen because it is the least misleading lie available, and `effect` must then ignore what it is handed — while `n1` shows that the honest `true | null` shape does not compile.

**The fix is small and already half-present.** `Transition<Part, Prepared extends {} = true, Capability>` defaults `Prepared` to `true`; it is `BehaviorSpec` that pins it to `HTMLElement`. Making the activation's staged type a parameter of `BehaviorSpec` is a one-line generic change with a wide re-verification surface, which is exactly the sort of thing Phase 14 exists to do once.

### N-2 — the kernel derives the visual's position from the pointer

`LandingContext.from` is computed as `pointerX - originX` (`src/kernel/kernel.ts:1194-1197`) and documented as _"where the visual is now … equal to the last drag translation"_.

That identity holds for the sortable, whose `moved` writes the raw pointer delta (`src/sortable/spec.ts:437-440`). It does **not** hold for a free drag. Axis constraint, bounds clamping and a controlled position each mean the behavior wrote something other than the pointer delta — and nothing in `BehaviorSpec` can tell the kernel what it wrote.

The consequence is concrete, not theoretical: the landing animation starts from a position the visual is not at, so a constrained drop **opens with a jump** and still ends correctly, because the _target_ is behavior-supplied through `anchorTarget` and the kernel re-pins at the join. A wrong start and a right end is the signature of exactly this class of bug, and Phase 11 already found one of them the hard way with lift geometry.

Two supporting facts explain why there is no workaround:

- **N-3.** `Draft` presents the kernel slice readonly, so a behavior cannot inject a synthetic sample by writing `pointerX`/`pointerY`. That is correct ownership, and it is why N-2 cannot be solved inside the frame.
- **N-4.** `KernelHost` has six members and none of them is a motion entry. A controlled position therefore has two options today: write the lift directly from an action effect, _outside_ the kernel's `FAILURE_RENDERER_WRITE` wrapper — which is what the probe does, and what makes N-2 visible — or nothing.

**Note that N-2 is not a free-drag problem.** It is a kernel assumption that happens to be true for one behavior. Any future behavior that constrains, snaps, or offsets its visual hits the same wall.

## What fits

Recorded at equal weight, because an unchanged seam validated by a second behavior is a stronger claim than an unexamined one — and these six are the questions Phase 13c was written to ask.

| # | Question from plan.md | Result |
| --- | --- | --- |
| **P-1** | Clamp to `bounds` before writing — does 00's "P-2 resolved at no hot-path cost" survive? | **Fits as a shape.** The constraint is arithmetic over fields the frame already holds; the bounds rect caches in the frame part with a version, so a thunk source resolves on invalidation, not per sample. Whether it is _affordable_ is Phase 21's number, not an SPI answer. Corrected at Checkpoint C, C-07 — see below. |
| **P-2** | Where does a consumer coordinate space live? | **Behavior-private.** `CoordinateMapper` is pure and lives in the behavior runtime. The kernel commits viewport coordinates and is never told. No seam changes. |
| **P-4** | Three lift modes as a public option | **A surface decision, not a seam change.** `BehaviorConfig.liftMode` is static spec data chosen by the behavior at install (`src/sortable/spec.ts:254`), so a feature can supply it. Whether a kernel-internal enum should become public is Phase 18's, not Phase 14's. |
| **P-5** | Does `anchorTarget` cover `resolveHomeTarget`? | **Yes.** It returns a viewport point and receives `authoredReady`, which is the shipped synchronous home-target contract. Accepted drops answer with the drop position; rejected and canceled ones with the home target. |
| **P-6** | `controller.update()` live policy | **Fits.** An ordinary behavior action: `update` dispatches, `action.prepare` writes the new axis/bounds/mapper into the draft. 00's P-1 holds — for the _policy_ half. |
| **P-3** | `onMove(geometry)` per sample | **Fits.** One call at the end of `moved`. Affordability is an M-1 question. |

The `controlled position` half of `update()` is the exception and is N-2.

**P-1 was corrected at Checkpoint C (C-07).** The first version of the probe wrote `constrain()` as one function returning `{ x, y }` while its own comment claimed the path allocated nothing — a `Point` per pointer sample. The arithmetic is now two scalar functions feeding `lift.write` directly, and the comment says what is true. **The expressibility result is unchanged**; what was wrong was a cost claim smuggled into a type probe. Typecheck cannot check a number, so a probe that makes performance claims has to be read as prose, and this one was not read carefully enough. (This paragraph sat _inside_ the table above until pass 4, splitting it into two — an editorial break, not a claim change.)

## What Phase 14 must answer

1. **Parameterize the activation's staged type**, or accept that every behavior stages an element. (N-1)
2. **How the kernel learns the visual's rendered delta.** A `renderedDelta(current): Point` seam is the obvious candidate; `LandingContext.from` would read it instead of the pointer fields. Whether the sortable then implements it as the identity, or the kernel keeps the pointer delta as a default, is a real choice with a hot-path cost attached. (N-2)
3. Whether a controlled position gets a first-class route, or stays a documented direct-write. The second answer is defensible only if N-2 is fixed, because otherwise the landing is wrong for exactly the drags a controlled position is used for. (N-4)

## What this probe does not claim

- That the free-drag behavior sketched here is correct. Every stub is `declare`d; the executable lifecycle cases belong to Phases 19–20 and the 05 test matrix.
- That the two gaps are expensive. Both are contained: one generic parameter and one seam. What is expensive is the re-verification, which is why they belong in a single revision.
- That P-1's shape being fine means its cost is fine. Phase 21 measures.