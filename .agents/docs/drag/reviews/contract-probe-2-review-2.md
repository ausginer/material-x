The focused React experiments are complete, and we now seem to have enough evidence to consolidate probe 2.

This pass is intended as an editorial and consistency pass rather than another architecture probe. The central construction model appears to have survived the review:

- a private kernel executor;
- a private per-controller behavior runtime;
- feature functions returning construction-time contributions;
- private feature runtimes;
- kernel-owned transactional boundaries;
- frames composed from independently owned parts;
- settlement gates stored on a sealed kernel-private attempt.

Let's revise the existing documents in:

    .agents/docs/drag/contract-probe-2/

rather than creating another parallel set of documents.

The challenge response and React placeholder probe should be treated as accepted inputs, subject to the clarifications below. Please replace obsolete claims rather than leaving contradictory old and new descriptions side by side.

A concise report of the edits at the end would be useful, but the main output should be a coherent updated contract.

## Accepted corrections from the challenge response

Please incorporate the accepted corrections from `challenge-response.md`, including:

- the behavior authors only its own frame part; the kernel authors its own slice and composes the physical frame kernel-first;
- no complete aggregate frame type is needed;
- feature-owned frame parts are a possible extension mechanism, but no first-iteration feature needs one and the prepare-phase mechanism should not be implemented speculatively;
- transitions may carry an explicit `Prepared` value from `prepare` into either `effect` or `rollback`;
- release uses two commits, with the motion lifetime closed only after `RELEASING` is committed;
- held settlement gates live on a sealed kernel-private settlement attempt, not on the transactional frame;
- the corrected `Behavior<Controller, Part>` generic shape is used;
- claims about structural enforcement distinguish:
  - frame publication safety;
  - kernel-enforced sequencing;
  - external staging that still depends on discipline;
- the old “eight invariants become structural” count should not remain as a headline metric.

Please also remove the argument that cross-controller frame-shape variance is cheap because only one controller can be mid-gesture at a time. Multiple pointer identities may allow multiple controllers to be active. The relevant invariant is only that the two frames of each controller have the same deterministic, stable shape. Cross-controller polymorphism can be discussed without relying on a single-active-controller assumption.

## Pointer capture ownership

The review raised Q-10 around `setPointerCapture()` remaining as the last externally visible mutation inside `activation.prepare`.

We would now like to examine the simpler ownership interpretation:

    pointer capture appears to be a kernel responsibility

The kernel already owns pointer identity, pointer ingress, motion lifetime, release ordering, cancellation and teardown. Please see whether capture can be acquired and released entirely by the kernel without introducing an unnatural behavior seam.

The admission result may need to identify the capture target in addition to the lifted visual, for example conceptually:

    type Admission = {
      visual: HTMLElement;
      captureTarget: HTMLElement;
    };

This is only a sketch. Please derive the smallest coherent shape from the actual requirements rather than preserving it verbatim.

The desired result is that behavior activation preparation can remain local: it may create and size a detached placeholder and return it as `Prepared`, while the kernel owns capture acquisition and its motion-lifetime release.

Please call out any concrete semantic reason capture cannot be kernel-owned.

## React placeholder findings

The executable probe is now the source of truth for placeholder behavior inside a controlled keyed React list.

The experiments established:

1. React does not detach or directly reposition the unmanaged placeholder.
2. Its geometry may become stale when the authored commit inserts, removes or resizes content above it.
3. A new keyed item inserted into the destination gap can leave the placeholder in the wrong semantic gap.
4. After readiness, the lifted semantic item is a reliable anchor because it remains a connected React-owned keyed child and React has placed it at its authored final slot.
5. Running:

       item.before(placeholder)

   at the readiness point repairs the semantic gap.

6. The repair is inert in the already-correct tested cases and acts only in the reproduced failure.
7. The repaired placeholder rect equals the dragged item’s actual landed rect after teardown.
8. Readiness and landing may remain concurrent. Both tested completion orders produced the same authoritative pinned target.

Please replace the earlier F-13/F-14 uncertainty with the evidenced mechanism.

A likely lifecycle description is:

    settlement entry
      → measure a provisional placeholder target
      → start landing immediately

    readiness
      → re-anchor the placeholder immediately before the semantic item
      → measure the authoritative target
      → optionally retarget an active landing runner

    readiness/landing join
      → repeat the re-anchor defensively
      → measure a fresh authoritative target
      → pin the visual to that target
      → release presentation

The second repair and measurement at the join are intended to cover additional layout movement between readiness and a long-running landing. Please check that this fits the lifecycle and resource ownership model cleanly.

`retarget()` should remain an optional trajectory-quality capability. Correctness must come from the final authoritative `pin(target)`, not from every runner being able to retarget.

The contract should state the load-bearing constraint precisely:

    The semantic item remains a connected React-owned keyed child until
    presentation release.

This constraint belongs to the sortable presentation strategy, not necessarily to every future drag behavior. The visual may be distinct from the semantic item; the authoritative anchor is the item.

Please also distinguish:

- correctness: final pin agrees with the authored DOM before presentation is released;
- animation quality: a late readiness correction may be visually abrupt when the provisional landing has already completed.

The latter may be improved by a retargetable runner, but should not complicate the kernel lifecycle guarantee.

## Scope of this revision

Please update the decision ledger, findings, lifecycle invariants, callback contracts and vertical-sortable trace so they all describe the same model.

It would be useful to retire or resolve open questions whose answer is now supported by the executable fixtures, especially the placeholder safety and landing-target questions.

Please avoid:

- adding another architecture variant;
- expanding the public package API or file layout;
- implementing unused feature-frame machinery;
- introducing new headline metrics merely to replace the withdrawn ones;
- defending an earlier statement when the evidence supports deleting it.

At the end, please report briefly:

- which documents changed;
- which decisions and findings were added, removed or resolved;
- which questions still genuinely need an answer before implementation;
- whether any inconsistency remains between the construction contract and the vertical-sortable lifecycle trace.