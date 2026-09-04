# Control-panel surface — round summary

**Commit both passes read at:** `f375e6b1`, in an isolated worktree on a branch based there. **Commit this summary is reconciled against:** `drag2/fin-review` tip `31ac5204`.

**Why the two differ.** The round ran in isolation while the Architect amended the same branch concurrently. Its evidence was produced at `f375e6b1` and is not restated here at a later tree; reconciliation happens at this layer only, after that evidence existed. Neither pass was re-run, and neither was retrospectively exposed to the Architect's result.

**What moved between the two commits.** One commit, `31ac5204` — _let the kernel implement the behavior-facing interface and delete the façade object_. It touches `.plan/`, `.scripts/corpus-equivalence.ts` and `tests/decisions.node.test.ts`. **`git diff f375e6b1 31ac5204 -- packages/drag2/src` is empty**, so every source line either pass cited stands unchanged, and all three cited sites were re-read at `31ac5204` to confirm it.

**Round shape.** Two passes, `cleanup` and `der`, launched in parallel on the owner's control-panel hypothesis. `reviewer` and `integrity` were not launched: there was no implementation delta under review.

## Result on the hypothesis, and what supersedes it

**Both passes returned a supported null**: no separately allocated runtime object in `packages/drag2/src` exists only to present a narrower or readonly TypeScript surface over an existing entity. The mechanical basis was reproduced at consolidation — `RectIndex`'s four accessors return the class's own fields, `BehaviorLiftSession` is a `type` and allocates nothing, and the wider assigned-literal census turns up no further candidate.

**That null is superseded on its strongest candidate, by decision rather than by evidence.** Both passes cleared `KernelHost` and the `host` literal at `kernel.ts:2365` — `cleanup` as its candidate 1, `der` in its cleared table — each deferring to D-170 §The step-6 boundary, which had examined that object and declined to convert it. At `31ac5204` the ledger amends that section on the owner's correction: _the kernel class implements the behavior-facing interface directly, the separate `host` object is deleted, and delegation to the realm, seam driver or queue does not by itself justify a second runtime object_. **On the owner's own policy, `host` is the shape this round was sent to look for, and the answer is yes.**

The passes are not in error and are not reopened. Each was asked about current responsibility and surviving justification, and each correctly read the governing record as it stood in the tree it was frozen at; what changed is the policy that record encodes, one commit later. It is worth stating plainly because it is the `der` lens's own subject matter — a justification that expired — and here it expired between the freeze and the reconciliation. The remediation is the Architect's and is already scheduled; nothing in this round is routed at it.

## Local → canonical

Allocated from the high-water marks in the **current** tree at `31ac5204` — `F-309`, `Q-17`, `I-37` — read per prefix and independently.

| Local | Canonical | Tier | Routing |
| --- | --- | --- | --- |
| `cleanup` (whole pass) | — | — | null result, accepted; candidate 1 superseded as above |
| `der-1` | **F-310** | C | implementer, non-blocking |
| `der-2` | **F-311** | C | implementer, non-blocking |
| `der` (cleared table) | — | — | null result, accepted |
| `der`'s `ConstraintView` note | **Q-18** | — | Architect |

**The frozen branch's allocation is withdrawn.** It read `F-307` as the high-water mark and assigned `F-308` and `F-309`; the concurrent Architect line has since minted both for different findings — `F-308`, the contract stating a type-level narrowing as a runtime impossibility, and `F-309`, `RectIndex`'s ownership docblock justifying its accessors as protection against mutation. Neither is this round's. The two surviving findings are `F-310` and `F-311`, and no earlier document should be read as assigning them anything else.

**`Q-18` is retained.** The identifier is free at `31ac5204` — no `Q-18` occurs anywhere under `packages/drag2` — and the question survives unchanged, on which see below.

`F-310` and `F-311` are **not merged**, though they share one cause: D-41's retraction of D-33's protocol left prose behind in two files. The defects differ in kind and their required properties differ. `F-310` asserts a mechanism that does not exist and misleads a maintainer verifying a load-bearing invariant; `F-311`'s two comments assert nothing false, and fail instead by grounding live shapes in an alternative no reader of this tree can check. Repairing either leaves the other standing.

## Do the owner's corrections resolve either finding?

**No, and not incidentally either.** Checked rather than assumed:

- **Sites are disjoint.** The owner correction's own findings land on `01-construction-ownership.md` and the `Kernel` docblock (`F-308`), and on `RectIndex`'s ownership docblock (`F-309`). `F-310` is at `src/kernel/kernel.ts:1439`; `F-311` is at `src/sortable/spec.ts:1471` and `:1494`. No file is shared.
- **Subject matter is disjoint.** `grep -niE "readiness|acknowledge|acknowledgement|thenOf"` over `f305-owner-correction-behavior-kernel-claude.md` returns nothing. The retracted readiness gate and acknowledgement protocol are not what that record is about.
- **The evidence is intact at the new tip.** Re-read at `31ac5204`: both comments are verbatim; the decision table still carries `D-33 inactive`, `D-41 active`, `D-137 active`, `D-155 active`; and no declaration of the retired mechanism exists in `src` — every occurrence of `ready(`, `readiness` or `presentationCommitted` is prose.

One indirect effect is worth recording, because it strengthens rather than weakens both: the amendment states the owner's policy in general terms — _a narrower TypeScript interface is an accepted boundary, and deliberately escaping it is governed by "do not do that" rather than by runtime machinery_ — and corrects two claims of impossibility **in prose rather than with machinery** (`F-308`). `F-310` and `F-311` are the same class of repair, on prose the same retraction stranded, and the owner line has just settled how that class is handled.

## Qualifications, preserved

**Independence.** The `der` pass read `control-panel-surface-cleanup-claude.md` — the peer artifact in the same tree — and says so, "to avoid re-reporting its rejected candidates as findings". Its final cleared-table row accordingly justifies its own silence on `KernelHost`, the `BehaviorSpec` adapters, the two controllers and the factory helpers by _the other pass's_ coverage, reproducing none of its own reasoning. That is coupling, and it has one consequence: **on that shared candidate set this round has one independent lens, not two.** The concurrence recorded there is not corroboration and is not reported as such anywhere in this summary. The qualification carries extra weight in hindsight, since the shared candidate set is exactly where `31ac5204` overturns the round's disposition. The two findings are unaffected — neither appears in the cleanup pass's candidate set, and both were reached from the retired-decision projection, which is the `der` lens's own route.

**Evidence integrity.** The `der` report attributes its projection input to `node .scripts/decision-status.ts` reporting "175 active rows, 74 retired rows". That script cannot run in the isolated worktree — there is no `node_modules` there — and the ledger's own table holds **166 rows marked `active`** against 175 rows in total, at `f375e6b1` and again at `31ac5204`. The quoted figure therefore matches the table's total row count rather than its active count, and the projection numbers are **not reproducible as stated**. This costs `F-310` and `F-311` nothing: every decision status they rest on was re-read directly from the ledger, first at the frozen base and again at the current tip. It is recorded because the report's stated isolation and its stated tooling cannot both be true.

**A census gap, closed at consolidation.** The `cleanup` pass enumerated "every `return {` object-literal site"; `ConstraintView` is bound by assignment, so that shape lay outside its stated scope and only the `der` scan reached it. The missing scan was run at consolidation — assigned object literals across `src/`, seventeen sites — and the three not already dispositioned are `sortable/spec.ts:939` (the `PresentationView`, which owns `snapshot` and `insertion`), `kernel.ts:1243` (`activationPolicy`, whose members carry real retirement and commit logic) and `kernel.ts:869` (`SeamContext`, assembled from several owners with a classifying `fail`). None is a control panel.

## Tier

Both findings are **Tier C by consequence**. Neither changes what a correctly integrated consumer observes, and neither leaves an instrument unsound: the comments are internal to `src`, and D-135's published-surface prune is separately guarded by `tests/packaging.node.test.ts`. The tier is unchanged by the reconciliation, and it agrees with the tier the owner line assigned to its own two prose corrections.

The argument for B is stated so it can be argued with: `F-310` misleads a reader verifying a load-bearing invariant, which is the harm Tier B names. It does not reach B because the reader misled is a maintainer inside the package, not an integrator reading what the package says.

## Routing

- **`F-310`, `F-311` → implementer, non-blocking.** Both are comment-only, removal-class repairs. No runtime semantics, lifecycle, public API or ownership is touched, and neither the `thenOf` mechanism nor the two release-path shapes is in question — each is independently grounded at its site. Nothing here blocks the pending step-6 conversion, which now includes deleting the `host` object.
- **`Q-18` → Architect.** `ConstraintView` (`src/free-drag/spec.ts:412`, type at `src/free-drag/feature.ts:99`) allocates one object per operation whose three members — `realm`, `originRect`, `visual` — are each already held by the allocating entity or by the activation scope one line above. It is nonetheless published middle-tier authoring vocabulary handed to third-party constraint installers under D-12, so removing it would be a **published-type change, not a type-surface change**, and no existing entity carries those three members in one place. The question survives `31ac5204` unchanged in substance and sharper in framing: the amendment settles that _delegation does not by itself justify a second runtime object_ and that a hand-written interface a class implements is the available alternative, which is the reasoning that retired `host` — but `host` had a receiver to become, and whether `ConstraintView` does is an ownership-and-public-surface question this round is not authorised to settle.
- **Nothing routed back to the passes.** Both null results are supported from their own lenses and accepted as results, subject to the supersession recorded above.