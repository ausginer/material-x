# The pin after D-155

**Architect disposition, 2026-09-01. Phase 24 — F-266, routed from the D-155 implementation review.** Contract only; no implementation. Answers one question, the last one D-155 left open about its own join: does the final pin still carry a correctness role, or was its justification the landing runner's?

**The answer splits the pin into three things and keeps two.** The _decided position_ is necessary and unchanged. The _ordering landmark_ is necessary and is carried by the release, not by the write. The **DOM write is removable**, and removing it is not a simplification — it closes the last instance of the hazard D-155 exists to remove. Minted as **D-166**, booked `Before Phase 24`. F-267 is recorded separately, against a sentence that is wrong in the shipped tree today.

## 1. F-266's claim, re-established rather than accepted

F-266 says the pin's `visual.style.transform` write never paints. It does not, and the reason is narrower than "same task":

- `session.write(targetX, targetY)` sets `visual.style.transform` (`presentation.ts:387`). `owned.presentation.dispose()` runs in the unconditional `finally` on the next statement (`kernel.ts:1631`).
- `transform` is in `LIFTED_PROPS` (`presentation.ts:94`), so `captureInlineStyles`' disposer restores or removes it (`presentation.ts:156-164`).
- `session.dispose` is registered on the presentation lifetime **first**, at activation (`kernel.ts:1243`), and disposal is **best-effort LIFO** (`lifetimes.ts:96-108`). So the restore runs **last** and runs even if a behavior-registered disposer throws.
- A behavior cannot pre-empt it. `ActivationScope.presentation` is a `LifetimeScope` — `use`/`useWhile` only, no `dispose` (`lifetimes.ts:33-34`, `spec.ts:231`) — and `BehaviorLiftSession` omits `dispose`. Nothing outside the kernel can release the lease early.

So the write is undone on every path, including panic and teardown. **That is stronger than F-266 needed**: the write is not merely usually invisible, it is invisible by construction.

**One thing F-266 does not say, and it is the only thing that could have saved the write.** Because disposal is LIFO and the session's restore is last, every _behavior-registered_ presentation disposer runs while the pinned transform is still on the element. The pinned state is therefore synchronously observable to foreign code — this is a real window, not an empty one. It is still not a role:

- Nothing in the tree looks. The only behavior-registered presentation disposer is sortable's `placeholder.remove()` (`sortable/spec.ts:787`), a mutation with no read. Nothing inside `presentation.dispose()` reads layout either — `captureInlineStyles` only writes, and `acquireTopLayer`'s restore touches the popover API alone.
- **The behavior is the author of the target.** It supplied the point through `anchorTarget`; it cannot need to read back from the DOM a value it just returned.
- What it would read is a `fixed`, top-layer element in a coordinate system that is one statement from ceasing to exist.
- The contract states the _ordering_ — "Closed at finalization, immediately after the kernel's final pin" (`spec.ts:231`, mirrored at `02:1027`) — and never states the visual's position at that instant as a guarantee. Naming when something happens is not promising what can be measured while it does.

## 2. The write's only surviving effect is a hazard, not a role

Strike the record update first, because it is quickly disposed of: `write` sets `rendered` after the assignment, and **`rendered`'s only reader in the whole tree is `kernel.ts:1615`** — the sample taken _before_ the pin. It is kernel-private by type (`spec.ts:312`), so no behavior can read it either. The session is disposed on the next statement. A record nobody reads is not an invariant.

What is left is the `runLeaf(…, FAILURE_RENDERER_WRITE)` wrapper and the `failed` flag it sets. **That is the whole of what the pin still does**, and what it does is convert a CSSOM fault on a write that cannot paint into a semantic `onError` for a drop whose data is already committed, deferring the terminal to the error checkpoint.

**The kernel already has two decided answers for a post-commit presentational fault at this join, and the pin agrees with neither.**

| Post-commit join step | Fault treatment | Visual consequence of the fault |
| --- | --- | --- |
| `anchorTarget` (`measureTarget`) | `runUnclassifiedValue` — `onError` delivered, **`return true`**, the join proceeds, the domain result stands and the terminal is published normally | Real: no landing at all, "a jump cut is honest" |
| The tail (`startTail`) | `unwind` — a warning that changed nothing, deliberately: "a presentational fault may not reach a consumer whose drop has already been decided and reported" | Real: no interpolation |
| **The pin** | `runLeaf(FAILURE_RENDERER_WRITE)` — the terminal moves one action later, published from `ERROR_REPORTED` | **None. The write could not have painted.** |

The harshest treatment is applied to the only one of the three whose failure a user could not possibly see. D-155's own row lists as the first of its "three gains that are not size": _a cosmetic fault can no longer reach a semantic result, since an interrupted interpolation is not a failure and `FAILURE_LANDING_INTERRUPTED`/`FAILURE_LANDING_CREATE` lose their producers._ **The pin is the last producer of exactly that.** D-155 removed the class from the landing runner and left one instance behind, inside the same function, because the pin was not the runner.

**This is not the move path, and the distinction is the argument.** A `moved` write that throws deserves `FAILURE_RENDERER_WRITE` and keeps it: the visual then stops tracking the pointer, the user sees it, and the drop lands where the visual is. That failure is semantic _because the write is load-bearing_. The pin's is not, and the reason is the whole of D-155.

## 3. Why the justification is the runner's, and went with it

D-16's rationale cell states it in one sentence: **"Correctness comes from the final pin, not from every runner being retargetable."**

That was true, and it was true _because a runner existed_. Under the gate model the landing animated the **lifted** visual and ended at the pin, and the lease was released only after the runner completed — so the pinned transform was the terminal painted state, and it was what corrected a stale provisional target. Contract 02 says so where it explains why two commit strategies appeared to work: _"they were working because the join's authoritative pin corrected it, which is the exact signature of this bug class: the landing opens with a jump and still ends correctly."_

D-155 inverted the order: release **completely**, then interpolate on the element in flow. The visual now reaches the authored position by **being released into it**, and the tail carries an additive contribution that decays to zero. The agreement between the library's visual and the consumer's committed DOM is produced by the release. **The write that used to produce it now has nothing downstream of it.** What survived D-41's narrowing survived as a clause; its ground was deleted by D-155 without the clause being re-read against the deletion.

That is the second of the two categories this pass was asked to separate, and it is that one.

## 4. What is necessary, stated positively

Two of the three things "the pin" names are load-bearing and are **not** touched by D-166.

**The decided position.** `anchorTarget` is called once, converted once, and recorded as `attempt.targetX`/`.targetY`; the tail travels the inverse of that delta; `targetX === null` installs no tail. This is D-41's _measure once, authoritatively_ and it is untouched. **The join still decides a position — it stops writing one.** D-155's sentence "the tail is the inverse of the delta the pin applied" survives with a corrected subject: the inverse of the delta between where the visual was and the position the join decided. The two quantities were always `session.rendered` and `attempt.target*`, and neither is the DOM.

**The ordering landmark.** "Presentation is released before the terminal" is the invariant that decides T1 against T2, and D-155 says so. It is a statement about the **release**, which stays exactly where it is, in the unconditional `finally`. The write was never part of it.

**The unchanged sample gets a better reason.** `fromX`/`fromY` are read from `session.rendered` under the comment _"Sampled before the pin, because the pin overwrites it."_ With the pin gone the sample stops being order-sensitive: it is simply the delta the drag last wrote, and it cannot be invalidated by a later statement in the join. Removing a write removes a sequencing constraint, which is a strengthening rather than a loss.

**No SPI member is removed, and no behavior-visible ordering changes.** `VisualLiftSession.write` keeps its callers — behaviors write through it on every `moved` — and `rendered` keeps its writer and its one reader. What changes is that the kernel becomes a _reader_ of `rendered` and no longer a writer of it, which is what it already was everywhere except this one line.

## 5. Two things the implementation must establish rather than assume

These are properties, not instructions, and D-166 does not authorize satisfying either by deletion.

**P1 — no post-commit failure route may be orphaned.** `joinSettlement`'s `failed` branch is what routes a terminal through `ERROR_REPORTED` instead of publishing it in the join, and its long comment records why the two routes must keep identical ordering. Removing the pin removes that branch's only producer _in this function_. Before deleting the branch, the implementer must determine whether the route retains a producer elsewhere — a post-commit fault raised before the join reaches `SEAM_COMMITTED` is the candidate. If it does, the branch goes and the route stays. **If it does not, the route becomes a separate elimination question and this decision does not settle it**: unreachable machinery must be reported, not quietly removed under cover of a different decision.

**P2 — D-66's property keeps executable coverage.** Two rows poison the visual's `transform` setter specifically to make the pin throw — `kernel.browser.test.ts` §"should release presentation and still publish a terminal when the pin throws" and `sortable.browser.test.ts` §"a failure after the authored commit (D-66)", whose docblock calls the pin and the terminal callback _"the whole post-commit failure set rather than a sample of it."_ Those rows lose their subject. The property they assert — **an existing committed result wins over a later fault, with its own reason** — is D-66's and is not affected by D-166. It must be re-anchored to a post-commit fault that still exists. Deleting the rows would silently narrow D-66 to whatever remains.

Note what P2 also says about the finding: the sortable docblock's enumeration of the post-commit failure set is **correct today and becomes stale on implementation**. It is part of the change, not a separate defect.

## 6. The vocabulary is renamed, not deleted

"The pin" is a time landmark in a dozen normative sentences and most of them stay true — the join still has a moment at which the position is decided and presentation is released. The sites the implementation carries, listed so none is found later: `01-construction-ownership.md` §ownership table (the _authoritative final pin_ row) and §"Destroy never pins"; `02-kernel-behavior-contract.md`'s settlement order, its statement of D-16's two surviving clauses, and the `presentation` doc at 1027; `spec.ts:231`; `presentation.ts`'s `write` doc — _"This is how the kernel performs the authoritative pin at the join … it is the last write this session makes"_, both halves of which stop being true; and D-155's own row where it says _at the pin_.

**The current-state documents are not amended by this pass.** They state what the code does, and until D-166 lands the code pins. Amending them now would make them wrong in the interval, which is the failure mode the deferred-decision instrument exists to catch.

## 7. What is decided

- **D-166 is minted, `Unimplemented (Before Phase 24)`.** It supersedes D-16's surviving pin clause — _the kernel performs the final pin at the join, through the lift session it owns, before releasing presentation_ — and narrows it to: **the join decides the position and releases presentation; it writes nothing.** D-16's other surviving clause, _whether to re-anchor follows the recovery_, is untouched, as is D-41's _measure once_.
- **Substantive, so a new id rather than a correction in place.** It changes what the code must do, deletes a producer of a public failure stage at one site, and retires the justification of a clause another decision still carries.
- **F-266 is disposed of**: evidence accepted, extended with the LIFO-observability window it did not name, and answered — the write is machinery of the landing-runner model.
- **F-267 is recorded**, against `tests/kernel/kernel.browser.test.ts` §"the landing tail": _"the visual is simply where the pin put it."_ Wrong in the shipped tree, not merely on implementation — presentation is released before that assertion's frame, so the visual is where **flow** puts it. It states the inverse of D-155's central move, inside the suite that documents the tail.
- **Not decided here**, and still open: free drag's `accept()` commit obligation, which D-155 left un-inherited and which D-166 does not touch — the pin never delivered it either, being undone by the same restore; and F-203.

## 8. Method

Read F-266 and its routing in `d155-tail-summary.md`; read `joinSettlement`, `startTail`, `measureTarget` and `acquireActivation` in `src/kernel/kernel.ts`, and `makeSession`, `captureInlineStyles`, `acquireTopLayer` and `acquireLift` in `src/kernel/presentation.ts`, at `441d585a`; confirmed `LIFTED_PROPS` membership, the LIFO disposal order and the first-registration of `session.dispose`, the complete reader set of `rendered` and of `FAILURE_RENDERER_WRITE` across `src/` and `tests/`, the absence of any layout read inside disposal, and the two test rows that poison the pin; read D-16's and D-155's ledger rows and contract 02's account of what D-41 and D-155 left of D-16. Every claim above is from a file read in this pass.