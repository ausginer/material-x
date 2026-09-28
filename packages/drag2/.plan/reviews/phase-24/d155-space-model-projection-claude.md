# D-155 against the two-space model

**Architect disposition, 2026-08-31. Phase 24 — pre-handoff compatibility check on D-155.** Contract only; no implementation. Answers one question: does D-165's split of `inheritedSpace` into `visualSpace` and `itemSpace` change what D-155 requires of the code, or does D-155's existing requirement project onto one of the two current values?

**The answer is a projection, and the value is `visualSpace`.** Nothing in the landing-tail contract needs amendment. The T1/T2 ownership decision is not reopened, and §4 records why the new space model cannot reach it.

## 1. What D-155 asks for, in the vocabulary that no longer exists

Three clauses of D-155 name `inheritedSpace`:

1. **The retention obligation.** _"`inheritedSpace` is published to the activation scope and retained nowhere, so the join must keep it — four numbers or `null`."_
2. **The trap.** _"It must not reuse `session.compose` — that projection is `inheritedSpace` for `LIFT_IN_PLACE` and **`null` for both lifted modes**, correctly, because a `fixed` element's local space is viewport space, while the **released** element is in flow in every mode (F-189). The conversion is `InheritedSpace` applied directly."_
3. **The best-effort clause** (F-190). _"Visual continuity is best-effort and is forfeited by an ancestry change, because the value is local and derived through the `inheritedSpace` captured at activation."_

The name is gone from the tree: `inheritedSpace` occurs nowhere in `src/`, `tests/` or `.plan/contract/` outside D-155's own row and the phase-23 records that produced it.

## 2. Why the value is `visualSpace`

**D-165's own rule decides it, and decides it without a judgement call**: _which element a translate is written on decides which space it is spent in._ So the question is only which element the tail writes on, and the join answers it in one line.

**The tail is defined as the inverse of the delta the pin applied.** The pin is `session.write(targetX, attempt.targetY)` in `joinSettlement` — `VisualLiftSession.write`, whose element is the **visual**. The delta is origin-relative, and `originRect` is documented on `ActivationScope` as the _visual's_ grab rect, held there deliberately so that it "must not become a function of the box the consumer chose for layout reasons". Pin element, delta basis and tail element are one element, and it is the visual.

Three independent confirmations that this is the intended reading rather than a coincidence of today's code:

- **`compose`'s in-place branch already takes exactly this value.** `acquireLift` passes `visualSpace` to `makeSession` as the projection. D-155's trap clause describes `session.compose` as "`inheritedSpace` for `LIFT_IN_PLACE`" — that projection is `visualSpace` today, so clause 2's _description_ of what must not be reused names `visualSpace`, and its prescription — `InheritedSpace` applied directly — names the same value obtained from the scope rather than from the session.
- **Free drag, the arithmetic D-155 points at, takes `visualSpace`.** D-155 says the conversion "is the arithmetic `compose`'s in-place branch and free drag's `buildGeometry`/`buildRequest` already run and publish as `localDeltaX`/`localDeltaY`". `free-drag/spec.ts` assigns `space = scope.visualSpace`. D-165's own row states the resulting division of the two values: _"`compose` and free drag take the first, the displacement sink the second."_
- **The one consumer of `itemSpace` is the other feature.** `sortable/spec.ts` hands `scope.itemSpace` to the displacement sink, with the reason stated at the site: a displacement writes its `translate` on an item. The tail does not.

**So `itemSpace` is not owed to the join at all.** The retention obligation is of one value, not two — which is worth stating explicitly, because an implementer reading clause 1 against a scope that now publishes two same-shaped values has three ways to satisfy it and only one is right. Retaining both is wasteful; retaining `itemSpace` is a silent wrong answer of exactly F-227's shape, since the two differ by every linear contribution between item and visual and agree in the common case that most tests exercise.

## 3. Why the projection is exact, and not an approximation

Three properties D-155 relies on hold of `visualSpace` verbatim.

**The space is the in-flow one, which is the whole point of clause 2.** F-189's trap is that a lifted visual's _session_ projection is `null` because a `fixed` element's local space is viewport space, while the released element is in flow in every mode. `visualSpace` is read in `acquireLift` **before anything is mutated** — the ancestry the drag began in, which is the ancestry the released element returns to. That is precisely the value clause 2 asks for and precisely not the one it warns against.

**The arithmetic is unchanged, and inherited zoom is already inside it.** `InheritedSpace` is still `{a, b, c, d} | null`, still the inverse of the inherited linear part, still `null` for the identity. BQ-9 changed where the value comes from, not what it means: box-quad's `Space` documents `a…d` as everything strictly above the element with **its own** transform and zoom excluded — the ancestors' `zoom` is composed into the linear part, and `ancestorZoom` is reported _additionally_, for the top-layer case only. The tail runs on a released, in-flow element, so it needs the linear part and nothing else. `from - target` is unchanged, and `targetX === null` still installs no tail.

**The best-effort clause transfers with its reason intact.** Clause 3's ground is that the value is local and captured at activation; both remain true of `visualSpace`, and the failure stays bounded and self-correcting because the tail still ends at a zero contribution. D-165 does add one ancestry the clause did not previously have to name — the item, when the visual is a descendant of it — but the clause already covers it: the item moving after the terminal is an ancestry change above the visual, forfeiting visual continuity and nothing else.

## 4. The T1/T2 decision is untouched, and the new space model cannot reach it

Stated rather than assumed, because the instruction was not to reopen it unless falsified.

T2's ground is ownership: the tail holds **no lease, only a cancel handle** — no fill, so nothing in `style`; self-reverting, so no cleanup owner; one call cancels to a settled state; it dies with the element. Every one of those is a property of the _animation_, not of which element carries it or which space its operand was converted through. A three-role subject changes the element and the space; it cannot change whether an additive `translate` with no fill claims anything. **T1 is rejected for the same reason it was**: it fires the terminal while the library still holds consumer DOM in a foreign state, which the item/visual split makes no better.

The disjointness argument in the implementation-shape record survives with a corrected subject and needs no new check: the tail is on the **visual**, displacement animates the **destination view**, and the visual is either the dragged item — excluded from that view by construction — or a descendant of it, and a descendant of an excluded element is not a member either.

## 5. What is decided

- **Non-substantive.** D-155 stays `Unimplemented (Before Phase 24)` and is corrected in place. No `D-*` is minted, amended or superseded, and no requirement changes.
- **Clause 1 is corrected and narrowed to one value**: the join retains **`visualSpace`**, and `itemSpace` is not retained.
- **Clauses 2 and 3 are name corrections only.**
- **F-253 is recorded** against `d155-d156-implementation-shape-claude.md` §139, which names the tail's element as "the dragged item" — a phrase that was unambiguous when it was written and names the wrong element under D-165's vocabulary whenever the two separate. Corrected in place with the original wording preserved, since the implementer reads that section for module ownership.

**Not decided here**, and still outside this pass: free drag's `accept()` commit obligation, which D-155 explicitly left open and un-inherited; whether the pin remains load-bearing under a tail, which `ql2-tail-additive-translate-claude.md` §flagged and D-155 keeps — **settled 2026-09-01 by D-166**, on F-266's evidence from the landed tree: the decided position and the release ordering are load-bearing, the DOM write is not and is deleted; record [`f266-pin-disposition-claude.md`](f266-pin-disposition-claude.md); and F-203.

## 6. Method

Read D-155's two ledger rows, both phase-23 records behind it and the implementation-shape record; read `ActivationScope`, `acquireLift`, `armSettlement` and `joinSettlement` in the tree at `fbc35068`; confirmed the element the pin writes on, the basis `originRect` carries, the two spaces' single consumers each, and box-quad's `Space` doc block for the zoom question. Every claim above is from a file read in this pass.