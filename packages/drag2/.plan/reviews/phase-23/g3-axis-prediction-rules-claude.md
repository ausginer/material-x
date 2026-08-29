# G3 is two rules, not one — the axis prediction contract corrected

Phase 23, amendment to D-156. The owner challenged G3's claim that one fixed-cell rotation covers differently-sized `x()`/`y()` lists, with a two-row counterexample. **The challenge is correct, the counterexample reproduces exactly, and G3 as written is false for the primary case.** D-156's predictive conclusion is unaffected; what changes is where the prediction mathematics lives, and one finding (F-194) was substantively wrong and is corrected here.

## 1. Method

A throwaway browser probe (Chromium, `file://` fixture, no library code) builds a container, inserts `n` sized items plus a placeholder at gap `g`, and reads every rect. For **every ordered pair of gaps `A != B`** it measures the true post-move layout and scores two hypotheses against it:

- **H-rot (rotation)** — D-156 as written: a crossed slot takes the position its neighbour currently holds; the first crossed slot takes the **placeholder's** current position.
- **H-scalar (span displacement)** — the rule `verified-refresh.ts` already implements: every crossed slot translates by one constant along the axis; nothing else moves.

One correction to the probe itself, recorded because it nearly produced a wrong widening: the first `grid-auto-rows: auto` fixture put its tall item at index 1, where it **never crosses a row boundary** for any hole position, so the hazard was never exercised and H-rot scored a clean pass. Moving the tall item to index 2 exercises it. A fixture that cannot fail is not evidence, and this one looked like evidence.

## 2. The result: the two hypotheses are exactly complementary

| Fixture | moves x slots | H-rot wrong | H-scalar wrong |
| --- | --- | --- | --- |
| **owner's case** — `y`, no gap, heights `[70, 55]`, placeholder 40 | 6 x 2 | **5** | **0** |
| `y`, no gap, heights `[70, 55, 30, 90]` | 20 x 4 | **30** | **0** |
| `y`, `gap: 12`, heights `[70, 55, 30, 90]` | 20 x 4 | **30** | **0** |
| `x`, no gap, widths `[70, 55, 30, 90]` | 20 x 4 | **30** | **0** |
| `xy` grid, `grid-template-columns: repeat(3, 60px)`, `grid-auto-rows: 60px`, 7 items | 56 x 7 | **0** | **54** |
| same grid, item heights varying `[60, 90, 60, 40, 60, 60, 60]` | 56 x 7 | **0** | **54** |
| `xy` grid, `grid-auto-rows: auto`, tall item crossing a row boundary | 56 x 7 | **81** | — |
| `xy` wrapping flex, `width: 200px`, widths `[60, 90, 50, 70, 60]` | 30 x 5 | **53** | — |

**The owner's counterexample, verbatim from the probe**: hole `0 -> 2`, slot 1, actual top **70**, H-rot predicts **40**. Exactly the arithmetic in the challenge.

**Why H-rot fails on a linear list.** In a linear flow the position of slot `i` is a running sum, `P(i, g) = base(i) + [i >= g] * delta`, where `base(i)` is the sum of the heights of the slots before `i`. `base` depends on the **occupants** of the preceding slots, so there is no occupant-independent `cell(k)` sequence to rotate through. D-156's `cell(k)` abstraction silently presumed one. It exists only when every cell is the same size — which is exactly the 2-D grid case, and is why the analogy looked sound.

**Why H-scalar fails on a grid.** The probe recorded **four distinct span vectors** for the uniform grid — `(-68, 0)`, `(68, 0)`, `(136, -68)`, `(-136, 68)` — because a crossed item either moves within its line or wraps to the next. A wrapping displacement is not one vector, which is what `verified-refresh.ts` already states as its reason for being `y()`-only.

## 3. The corrected contract

**G3 splits.** The common clause becomes a **derivability requirement**, and the prediction rule becomes axis-owned — which is the shape the owner proposed.

- **G3-prime — one-hole derivability (common to `x()`, `y()`, `xy()`).** A committed move relocates exactly one hole from gap `A` to gap `B`. The axis rule must derive the post-move position of **every destination slot and of the placeholder** from the cache it already holds plus per-operation constants it has already established, **with no DOM read**. The requirement is common; the derivation is not.
- **G3-linear — the linear instantiation (`y()`, and a future `x()`).** Slots in `[min(A,B), max(A,B))` translate by one constant `+/- delta` along the axis; every other slot and both cross-axis coordinates are unchanged. `delta` is the hole's outer flow contribution.
- **G3-cellular — the cellular instantiation (`xy()`).** Crossed slots take the position their neighbour holds, the first taking the placeholder's. **Requires occupant-independent track geometry.**

G1, G2 and G4 are unchanged. G2 — one hole, fixed destination order — is what both instantiations rest on, and it is the clause that made the derivation possible in the first place.

### 3.1 The displacement constant is per-operation and needs no measurement

Stronger than D-156 assumed, and stronger than `verified-refresh` currently achieves. The probe derived `delta` from the cache alone as **(the gap straddling the hole) minus (an ordinary adjacent gap)**, at every hole position:

| Fixture | straddling | ordinary | derived | measured | agrees |
| --- | --- | --- | --- | --- | --- |
| `y`, no gap, holes 1/2/3 | 40 | 0 | 40 | 40 | yes, all three |
| `y`, `gap: 12`, holes 1/2/3 | 64 | 12 | 52 | 52 | yes, all three |

Two consequences. `delta` is **invariant across hole positions and across end gaps** — the probe's span-delta set is exactly `{+delta, -delta}` over all 20 moves in every linear fixture — which is a consequence of G1 plus the premise's exclusion of collapsing margins, and is the linear rule's own precondition rather than a free lunch. And it is **derivable with zero DOM reads**, so the linear axis never measures `delta` at all, where `verified-refresh` measures it on every committed move. The derivation needs one ordinary adjacent pair, so a two-slot list falls back; that is a degenerate case the full path already covers.

### 3.2 The two-dimensional precondition, now measured rather than asserted

D-156 narrowed `xy()` to occupant-independent cell geometry. The probe confirms the boundary and sharpens it in a useful direction:

- **fixed tracks pass even with unequal item sizes** — `grid-auto-rows: 60px` with heights `[60, 90, 60, 40, ...]` scores 0 wrong. So _different item sizes are fine_ **does** hold for `xy()`, provided the _track_ sizing is fixed. That is a wider permission than _uniform cells_ and is the honest statement;
- **content-sized tracks fail** — `grid-auto-rows: auto` with a tall item that crosses a row boundary scores 81 wrong, and the probe shows the row origins genuinely moving between hole positions (`0/68/176` against `0/108/176`);
- **wrapping flex with variable main-axis sizes fails** — 53 wrong.

So the precondition is **occupant-independent track geometry**, not equal items.

## 4. What this changes in D-156, and what it does not

**Unchanged, and the reason the conclusion survives.** Every target and every delta is still known **before** the DOM write, from state already held, with no read. The bracket still goes, the release-all-offsets discipline still goes, the per-frame placeholder read is still derivable, the lagging placeholder is still rejected, and F-191, F-192, F-193 and F-195 are untouched. **The load-bearing claim was never the rotation** — it was that a one-hole relocation is fully determined by state the library already has. That claim is now measured on 300+ move-slot pairs across seven fixtures rather than argued from an abstraction.

**Changed.** G3 splits as above. And **F-194 was substantively wrong**: it said `verified-refresh`'s apparatus _does not generalise and cannot survive_. In fact its hypothesis **is** the correct linear rule, and its module comment — _measured, never modelled, which is what keeps margins, `gap` and box-sizing out of this module entirely_ — was a correct constraint that D-156 discarded by analogy. What actually changes for the linear axes is narrower than D-156 claimed, and in three separable parts:

1. **The displacement constant moves from a per-move measurement to a per-operation constant**, derived from the cache (§3.1);
2. **the prediction moves from after the write to before it.** `measure()` runs post-`movePlaceholder`; the deltas the bracket needs must exist pre-write. **This re-timing, not the formula, is what removes the FLIP bracket** — and it is available to the scalar rule exactly as it was to the rotation;
3. **the four witnesses become a resync** rather than a per-move gate.

`verified-refresh.ts` is therefore **not obsolete**. It holds the correct linear prediction rule and needs re-timing and a cheaper constant, not replacement.

**One size claim is withdrawn.** D-156 read the 330 B by which `minimal (xy)` undercuts `minimal (y)` as a module _whose whole purpose the model makes free_. That was downstream of the rotation error. `verified-refresh`'s purpose is preserved; its verification _cadence_ changes, and the byte direction is now unclear and must be measured rather than predicted. The `layoutAnimation()` figure (~440 B) and the bracket residue (~387 B) are unaffected, because they follow from the re-timing rather than from the formula.

## 5. Findings

- **F-196** — a rule correct for one axis family was generalised by analogy, and the counterexample needs two unequal rows.
- **F-197** — the displacement constant is per-operation and derivable from the cache with no DOM read.