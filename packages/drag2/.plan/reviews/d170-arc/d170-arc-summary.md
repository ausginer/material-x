# D-170 arc — review round summary

**Range** `261a3a16..b73b6779` (17 commits) · **read at** `b73b6779` · **consolidated at** `b73b6779` plus this round's four artifact commits, which touch only `.plan/reviews/**`.

Four passes ran in parallel on one tree, none holding another's prompt, findings or artifact. Only the feature proof received the owner's six falsification targets.

| Pass          | Artifact                                                                   | Commit     |
| ------------- | -------------------------------------------------------------------------- | ---------- |
| feature proof | [`d170-arc-feature-proof-claude.md`](d170-arc-feature-proof-claude.md)     | `3f0b8252` |
| integrity     | [`d170-arc-integrity-claude.md`](d170-arc-integrity-claude.md)             | `55ef8488` |
| cleanup       | [`d170-arc-cleanup-claude.md`](d170-arc-cleanup-claude.md)                 | `e4379bf9` |
| DER           | [`../phase-24/d170-arc-der-claude.md`](../phase-24/d170-arc-der-claude.md) | `410b256f` |

The DER artifact landed under `phase-24/` rather than this round's directory. Left where its own commit put it and linked from here rather than moved.

## Local → canonical

Allocated from independently read high-water marks at `b73b6779`: `F-311`, `Q-18`, `I-37`. Nothing in this round mints an `I-`, and nothing mints a `D-`.

| Canonical | Tier  | Local                    | Claim                                                                                                                       |
| --------- | ----- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **F-312** | **A** | `rr-1`                   | The liveness reduction leaves a declared consumer slot (`settle`) invoked after logical closure                             |
| **F-313** | B     | `ir-1` + `dr-1` + `rr-6` | The `host` → `kernel` rename is incomplete against the entry's "wherever it is threaded", and reaches shipped `kernel.d.ts` |
| **F-314** | B     | `dr-2`                   | `tests/revision/phase-14.ts` states the D-41-deleted readiness API as shipped, under the new name                           |
| **F-315** | B     | `dr-3`                   | Live contract sections still state normative constraints over `KernelHost`                                                  |
| **F-316** | B     | `rr-2`                   | `RectIndexView` has no falsifier — its refusals hold but nothing keeps them true                                            |
| **F-317** | B     | `rr-3`                   | Three of the four narrowing assertions the entry cites do not discriminate                                                  |
| **F-318** | B     | `rr-4`                   | Nothing pins the memoized `destroy()` identity through the shipped controller wrappers                                      |
| **F-319** | C     | `rr-5`                   | Step 5's rename corrupted comment prose in two spec files                                                                   |
| **F-320** | C     | `cr-1`                   | Two adjacent JSDoc blocks on `#movedLeaf`                                                                                   |
| **F-321** | C     | `cr-2`                   | Duplicate JSDoc block on `#resolveItem`, one copy corrupted                                                                 |
| **F-322** | C     | `dr-4`                   | `LinearShift.refresh`'s stop arm re-retires a cache the callee already retired                                              |
| **F-323** | B     | —                        | `npx just lint` is red at the tip, in files the range does not touch                                                        |
| **Q-19**  | —     | `cr-3`                   | `#homeGap`, a single-call private method → Architect                                                                        |
| **Q-20**  | —     | `rr-1`                   | Is a feature-supplied `settle` a declared consumer slot under I-36? → Architect                                             |
| **Q-21**  | —     | `dr-4`                   | Should `LinearShift` own a stop on this path at all? → Architect                                                            |

## What was merged, and what was not

**`F-313` merges three lenses** — integrity, DER and the feature proof each found the same incomplete rename and each saw a different fragment of it. They are one remediation unit: finish the rename. Consolidating their censuses, and extending it, gives the true size:

| Where                                                                     | Sites                  | Found by                            |
| ------------------------------------------------------------------------- | ---------------------- | ----------------------------------- |
| `sortable/behavior.ts`, `free-drag/behavior.ts` — the binding itself      | 2 files, 15 code sites | integrity, DER, feature proof       |
| `src/kernel.ts`, `drag.ts`, `sortable.ts` — published authoring docblocks | 4                      | DER                                 |
| `kernel.d.ts:13` — **shipped**                                            | 1                      | DER, feature proof                  |
| `src/kernel/seams.ts` — live internal docblocks                           | 7                      | **no pass; found at consolidation** |

The systemic cause the convergence points at: the rename was applied to the files the arc edited, and every site in a file the arc did not touch survived. That is why three lenses each saw a fragment and none saw all of it, and it is the reason the `seams.ts` sites were missed by every pass.

**`F-319` and `F-321` are not merged**, though they overlap at `sortable/spec.ts:424` and share one cause (commit `12311981`'s mechanical rename). `F-319` is corrupted prose; `F-321` is a duplicated block whose stale copy happens to be corrupted. Repairing the prose at `:424` leaves two identical blocks standing; deleting the stale block leaves the other seven corrupted sentences standing. Different remediation units.

**`F-315` is not merged into `F-313`** despite the shared root cause. Source identifiers and contract prose are different defect kinds with different required properties, and repairing either leaves the other standing.

## Evidence verified at consolidation

Every mechanical claim reported below was reproduced here rather than accepted.

- **`F-312`.** At `261a3a16`, `linear-shift.ts` carried `if (!live())` at `:280` and `if (!runtime.live())` at `:367`. At `b73b6779` the file contains **no `live()` reading at all** outside the interface declaration at `:82`, and `runtime.settle(scratch, [probe], 1)` stands at `:342`. The guard between the box read and `settle` is gone.
- **`F-313`.** The clause at `00-index.md:1562` reads verbatim "the parameter renamed `host` → `kernel` wherever it is threaded". Both `behavior.ts` files have an empty diff across the whole range. `free-drag/behavior.ts:54` binds `(host) =>` and threads it into `createFreeDragSpec(host, …)` — the function whose own parameter the arc did rename. `kernel.d.ts:13` ships "The factory is called with the kernel host".
- **`F-314`.** `phase-14.ts:190-199` states `BehaviorContext.presentationCommitted()` and `SortableController.ready(request)` are "the shipped ones". Neither `presentationCommitted` nor `ready(` occurs anywhere in `src/`. The same file's `n10` carries `@ts-expect-error — deleted with the readiness protocol (D-41)`.
- **`F-315`.** `01-construction-ownership.md:93` states in the present tense that `BehaviorFactory`, `BehaviorInstall`, `BehaviorSpec` and `KernelHost` **are** the kernel-tier vocabulary. `03:598`, `03:705` and `05:981` likewise state normative rules over `KernelHost`'s members.
- **`F-316`.** Zero occurrences of `RectIndexView` anywhere under `tests/`.
- **`F-317`.** `addIngress`, `activate` and `move` are on **neither** `Kernel` nor `BehaviorContext`, so N-2/N-3/N-5 and N-4 cannot separate them. Only `arm` does: present on the class at `kernel.ts:2593`, absent from the interface.
- **`F-318`.** Confirmed as scoped, after nearly falsifying it. `kernel.browser.test.ts:4100` does assert `expect(harness.controller.destroy()).toBe(first)` — but `createHarness` builds its controller from `draggable<…>`, the kernel tier. The identity is pinned one tier **above** the sortable/free-drag wrappers this arc added, which is what makes the gap easy to miss.
- **`F-319`.** Origin confirmed: at `261a3a16` the same sentences read "declines the operation" and "A transaction opens" as plain words.
- **`F-322`.** `linear-shift.ts:261-266` runs `#forget(); index.retire();`, while `rect-index.ts:322-324` already runs `this.retire()` before its only `return false`. The pair is statement-for-statement `LinearShift.retire()` at `:370-373`.

## Corrections to the reports

**`F-321` — the cleanup pass's stated reason is falsified; the finding survives.** It explained the stale block as "referencing a nonexistent `this.#snapshot`". `#snapshot` is declared at `sortable/spec.ts:166` in the same class and read at eight sites. What the witness actually proves is a duplicated block whose stale copy is garbled — `whichever ancestor the this.#snapshot knows` against the corrected `the snapshot` — which is a botched mechanical rename, not a dangling reference. Reason corrected here and marked consolidator-derived; the defect is unchanged.

**The integrity pass's `KernelHost` null is literally false and substantively correct.** It reported no `KernelHost` reference anywhere in `src/`, `tests/` or `README.md`. Two survive: `README.md:100` and `tests/COVERAGE.md:38`. Both are explicitly historical — the README writes `BehaviorContext` (~~`KernelHost`~~ — D-170 §The behavior-facing interface), and COVERAGE narrates the deleted readiness protocol. No finding is minted from a strikethrough.

**`F-319`'s count is a lower bound, not a reproduction.** The feature proof reports 15 corrupted sentences. A narrower pattern reproduces 8 comment lines across the same two files, and the mechanism and origin are confirmed at both. The remaining 7 are consistent with the pass's broader patterns but were not independently re-derived. The claim carried here is the mechanism and the two files, not the number.

## Evidence-integrity qualification

**`F-323`'s enumeration could not be reproduced; its conclusion could.** The DER pass reported, outside its lens, six lint errors in `tests/kernel/lifetimes.node.test.ts`, `tests/packaging.node.test.ts` and `tests/probes/13b-settlement.ts`. Two consecutive runs here produce a stable and different set: **four errors** in `tests/sortable/g3-conformance.browser.test.ts`, `bench/size/noncomposed.js` (two) and `tests/packaging.node.test.ts` — one file in common.

The working tree is clean and no commit in this round touches `src/`, `tests/` or `bench/`, so the difference is not drift in the reviewed code. The likeliest explanation is that four passes shared one working tree and at least one ran `just lint-fix`, so a transient state was observable to a concurrent reader. That is a hazard of the round's own setup, and it is recorded rather than resolved.

What survives is what matters and is independently established: `just lint` is **red at the tip**, and every file named by either enumeration — all five — is untouched by `261a3a16..b73b6779`. The defect is real, out of range, and does not belong to this arc.

## Silence, from each pass's own lens

- The **feature proof** could not falsify the representational claim, the gate's arming on the mandated per-file path, the absence of an external write path into `RectIndex`, `Kernel`'s surface being exactly the seven members plus `arm`, or the five retargeted last-candidate cases. Its own scope note stands: argument-less `just lint`/`lint-fix` abort at `oxlint .` before ESLint, so the aggregate path does not exercise the gate.
- The **cleanup** pass swept the D-170 taxonomy's own entities and found nothing beyond two doc-block leftovers and one routed question. Its census was the arc's converted classes and their adapters.
- **DER**'s forward pass over D-170's retired fragments found no surviving runtime machinery: `#abort()`, the three extra liveness readings, `remeasureHole`'s `live`, the `hollow` abort arm, both retired caller readings, the four `RectIndex` accessors, the `host` record and `verifyEquivalence`'s repair writes are all gone.
- **Integrity** examined neighbouring flows, the published surface and downstream consumers of `packages/drag2` and found one naming drift.

Each null above is stated from the pass's own question. No pass's silence is justified by another's coverage.

## Routed, not decided

- **`Q-20`** is the contract question inside `F-312` and the reason that finding is routed rather than actioned: whether a feature-supplied `settle` — filled by a `DisplacementContribution` installer, published from `sortable/feature.js` and `sortable.js` — is a **declared consumer slot** under I-36. F-304 retired the guard on the ground that `runtime.settle` is "library-owned", which is a fact about `layout-animation.ts` rather than about the declared boundary. If it is a declared slot, the reduction violates D-37's finite domain at a published tier; if it is not, F-304 was right and the tier drops. **Tier A is recorded on the reading that it is**, because that is the reading the invariant's own text supports, and the disagreement is preserved rather than settled.
- **`Q-19`** — `#homeGap` under CONTRIBUTING §2.1.
- **`Q-21`** — whether `LinearShift` should own a stop on the `refresh` failure path at all, independent of `F-322`'s redundancy.

## Tier notes

`F-313` sits on Tier B's **first** limb, not the second: four published authoring docblocks and a shipped `kernel.d.ts` line instruct an integrator to call `host.fail` / `host.cancel`. `ir-1` alone would have rested on the weaker second-limb argument — the canonical record being unsound — and the merge is what makes the tier well-founded.

`F-314`, `F-316`, `F-317` and `F-318` are Tier B on the second limb: no program behaviour changes, but an instrument the repository relies on is unsound. Three of them describe a proof that passes for the wrong reason, which is the case the tier exists to name.

No tier here was derived by counting lenses.
