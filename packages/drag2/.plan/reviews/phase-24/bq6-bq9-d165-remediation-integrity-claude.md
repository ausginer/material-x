# BQ-6/BQ-9/D-165 remediation — package-coherence pass

**Read at `052de91b`** (current `drag2/fin-review` HEAD), diffed against `5adc3ab3`. Confirmed the range is exactly one commit: `git log --oneline 5adc3ab3..052de91b` returns only `052de91b`. Working tree clean at the time of reading (`git status` on `052de91b`, no other agent's uncommitted output present).

This is an independent pass — no other pass's prompt, findings or artifact was read.

## Scope

**Covered:**

- Cross-surface consistency of `AdmissionSubject`, `ActivationScope.box`/`.visualSpace`/`.itemSpace`, and `BehaviorSpec.admit`'s return description across `src/kernel/spec.ts`, `src/kernel/kernel.ts`'s bare-element normalization, `src/sortable/spec.ts`, `src/free-drag/spec.ts`, and every `.plan/contract/*.md` page reproducing these types (not only `00-index.md`).
- The new `slotConstants()` coupling in `tests/packaging.node.test.ts` against `packages/box-quad/src/index.ts`'s actual shape and declaration style.
- Cross-consistency of the new `00-index.md` ledger rows (F-232..F-235), the new `plan.md` entry, and `COVERAGE.md`'s new rows, checked against the diff itself rather than against each other's prose alone.
- A line-by-line diff of `src/kernel/spec.ts` for anything outside `/** */` doc comments.
- Whether the round's own closure is recorded in the same shape as a prior closed finding (F-231) in the same table.

**Not covered:** behavioral/test correctness of the F-233/F-234 assertions against their required properties (feature-proof's subject, not package coherence); box-quad's own internal coherence beyond the one file drag2's test now reads; any package other than `drag2` and the one file of `box-quad` the remediation itself introduced a dependency on.

## Findings

| Local id | Tier | Claim |
| --- | --- | --- |
| integrity-1 | B | A second published contract surface still carries the pre-D-165, two-role `AdmissionSubject` and single-field `ActivationScope`, unstruck and undisclosed by this round |
| integrity-2 | C | The new box-quad slot-constant guard is resilient to a rename but not to a relocation across files, a distinct failure mode the record credits it with covering |
| integrity-3 | C | The new F-235 ledger row miscounts the sites its own fix touched |

### integrity-1 (tier B) — `.plan/contract/02-kernel-behavior-contract.md` still states the two-role model, in two places, and this round did not touch it

**Claim.** `AdmissionSubject`'s doc block and `BehaviorSpec.admit`'s return description agree with each other after this remediation (F-232) — but a second published contract page, `packages/drag2/.plan/contract/02-kernel-behavior-contract.md`, reproduces both types with a code block and prose that still describe the _pre_-D-165 shape, and this round left it untouched. The same page's `ActivationScope` code block is stale by a full decision further back: it still shows the single `inheritedSpace` field D-165 replaced with `visualSpace`/`itemSpace`.

**Evidence — `AdmissionSubject` and `admit`:**

- `packages/drag2/.plan/contract/02-kernel-behavior-contract.md:252-264`:
  ```
  /**
   * What an admission member returns when it admits. (D-59)
   *
   * A bare `HTMLElement` is the common form and means `box === visual`, which is
   * `box(item) = visual(item)`'s default (D-43) written as the absence of a
   * choice rather than as a repeated one. The pair form names a separate
   * geometry source. ...
   */
  type AdmissionSubject =
    HTMLElement | Readonly<{ visual: HTMLElement; box: HTMLElement }>;
  ```
  No `item` member — the pair form shown is the two-role shape.
- Same file, `:301-303`, `BehaviorSpec.admit`'s doc: "Returns the element the kernel should lift — optionally paired with the element the kernel should measure — or `null` to leave the controller idle." — this is the exact sentence F-232's remediation _replaced_ at `src/kernel/spec.ts:433-435`, still present here verbatim.
- Compare the shipped type, `src/kernel/spec.ts:98-131` (post-052de91b): `AdmissionSubject`'s object form requires `visual`, `box` **and `item`** (`item: HTMLElement` at line 126), and the doc block states "Three roles... All three are required inside the object form."

**Evidence — `ActivationScope`:**

- Same file, `:896-983`, reproduces `ActivationScope` with **one** field, `inheritedSpace: InheritedSpace` (line 975), and a subsection at `:985-995` titled "Why `inheritedSpace` is on the scope and not on the session (D-85, E-01)" that argues for that single-field placement.
- Compare the shipped type, `src/kernel/spec.ts:157-227`: `ActivationScope` has **two** fields, `visualSpace: InheritedSpace` (line 202) and `itemSpace: InheritedSpace` (line 216) — D-165's split, recorded in `00-index.md`'s own D-165 row as "`ActivationScope` publishes `visualSpace` and `itemSpace`".

**Why this is this round's business, not just pre-existing debt.** `.plan/contract/README.md` states the register these pages carry: "`01-construction-ownership.md` … `07-free-drag-contract.md` | The contract terms | Present, revised in place," and "**The term in force is the unstruck text.** Struck text is provenance... Nothing struck is normative, and nothing struck is deleted." Nothing in the quoted blocks above is struck — they read as the current, in-force term, and they are wrong on both types the round's own subject (D-165) and this remediation (F-232) changed. `git log --oneline -- packages/drag2/.plan/contract/02-kernel-behavior-contract.md` shows the file's last touch is `60eb9e50`, which predates both D-165's landing commit (`5adc3ab3`'s ancestry) and this remediation (`052de91b`) — confirming neither updated it. F-232's own required property — "correct two doc blocks to state what the bare form now asserts about all three members" — was satisfied only at the one site the finding named (`kernel/spec.ts`); this second site carries the identical defect (plus the older `ActivationScope` one) and is not mentioned anywhere in the round's ledger row, plan entry, or summary.

**Required property:** every `.plan/contract/*.md` page that reproduces a kernel type's declaration and doc prose agrees with the shipped declaration in `src/kernel/spec.ts`, or the disagreement is struck per the directory's own revised-in-place convention.

### integrity-2 (tier C) — the new slot-constant guard defends against rename, not relocation

**Claim.** `tests/packaging.node.test.ts`'s new `slotConstants()` (052de91b) reads `packages/box-quad/src/index.ts` and derives the forbidden-name set from every module-level `const NAME = <integer>;` there, guarded by a vacuity check (`expect(forbidden.length).toBeGreaterThan(0)`). This correctly closes F-233's exact failure mode — a rename of the constants, or their wholesale removal from that file — but does not close a distinct, equally plausible one: a **partial relocation**, where box-quad splits some of its slot-index groups into their own module (still re-exported from `index.ts`) while leaving others behind. The vacuity check passes on whatever remains, and the relocated names silently drop out of `declaresSlot`'s forbidden set — the same silent-pass shape F-233 exists to catch, under a trigger the record's own framing does not claim to cover.

**Evidence:**

- `tests/packaging.node.test.ts:43-66` (`slotConstants()`) resolves and reads exactly one path: `resolve(ROOT, '../box-quad/src/index.ts')`. Nothing walks box-quad's module graph or re-derives the set from its public exports.
- `packages/box-quad/src/index.ts` is one 470-line file with three separable, already-grouped constant blocks: `BOX_LENGTH`/`BOX_A`..`BOX_HEIGHT` at lines 19-27, `SPACE_LENGTH`/`SPACE_A`..`SPACE_ANCESTOR_ZOOM` at lines 50-56, `QUAD_LENGTH` at line 65 — a realistic shape for exactly this kind of file-level split (e.g. `box.ts`/`space.ts`/`quad.ts`, re-exported from `index.ts`) without ever emptying `index.ts` of every constant, so the vacuity guard would not fire.
- The round's own record credits the fix narrowly: `00-index.md:1064` ("a rename in the package that owns them carries the guard with it") and the matching `plan.md` paragraph both state resilience to _rename_, never to relocation. Neither surface discloses the relocation gap.

**Why tier C, not B.** Nothing in the current tree exercises this gap — box-quad's shape has not split, `forbidden` is non-empty and correct today, and no test or repository-relied-on check is unsound _now_. This is a latent limit on the guard's advertised resilience, not a present defect; it costs nothing to flag as a boundary the record didn't state, but nothing today depends on it being wider than it is.

**Required property:** the guard's advertised resilience ("a rename... carries the guard with it") is scoped correctly, or the guard reads box-quad's full public export surface rather than one file's declaration style, so both failure modes are covered by the same mechanism.

### integrity-3 (tier C) — the new F-235 ledger row miscounts what its own fix touched

**Claim.** `.plan/contract/00-index.md`'s new F-235 row states: "`tests/perf/m5.browser.test.ts`'s doc block and **four inline comments** described a single `inheritedSpace`..." The diff and the original finding's own evidence both show **three** inline comments outside the doc block, not four.

**Evidence:**

- `git show 5adc3ab3:packages/drag2/tests/perf/m5.browser.test.ts | grep -n inheritedSpace` (excluding the unrelated, still-live `inheritedSpaceOf` at line 477) returns exactly five sites: lines **11, 32, 639, 774, 857** — the same five the phase-24 summary cites verbatim ("all five prose occurrences `cleanup` cited (lines 11, 32, 639, 774, 857)").
- Lines 1 through at least 46 of `tests/perf/m5.browser.test.ts` are one continuous `/** ... */` block (confirmed by reading the file directly) — so lines 11 and 32 are both _inside_ "the doc block," leaving lines 639, 774 and 857 as the inline comments outside it: **three**, not four.
- `packages/drag2/.plan/contract/00-index.md`'s F-235 row: "the doc block and four inline comments."

**Why tier C.** A narrative miscount in a documentation-accuracy record about a documentation-accuracy fix — no consumer-observable effect, and nothing in the repository (tests, instruments, other ledger rows) depends on this exact number.

**Required property:** a ledger row's factual claims about what a fix touched (counts, locations) match the diff it describes.

## Clean results (stated explicitly, not left silent)

- **`kernel.ts`'s bare-element normalization agrees with the new three-role doc.** `src/kernel/kernel.ts:950-959` (`mintOperation`) discriminates `'visual' in subject`; on the bare branch it sets `visual = box = item = subject` — exactly "item === box === visual" as the new `AdmissionSubject` doc states. Confirmed directly, not assumed.
- **`sortable/spec.ts` constructs the type as documented.** `seedDraft` (`:392-450`) returns a bare element only when all three of `box`, `visual`, `item` coincide (`:449`: `return box === visual && visual === item ? item : { visual, box, item };`), and the object form always supplies `item`. No construction site in `sortable/spec.ts` omits `item` from the pair form — the type's "all three required" claim is exercised, not merely declared.
- **`free-drag/spec.ts` never constructs the pair form** (confirmed at `:315`, `return visual;` — always bare) — it supplies no counter-evidence either way, consistent with the prior round's `integrity-1`.
- **No other doc comment, story file, or README semantically restates the two-role model.** `sortable/slots.ts:105` and `free-drag/spec.ts:243`'s "`box === visual`" mentions describe the box/visual default only, orthogonal to the item question, and are unchanged and accurate. `README.md`'s one `AdmissionSubject` mention is a bare name-listing, not a shape description. No `.stories.tsx` file describes the type's shape. (`.plan/contract/02-kernel-behavior-contract.md` is the one surface that does restate the old model — see integrity-1.)
- **No unintended drift in `src/kernel/spec.ts`.** `git diff -U0 5adc3ab3..052de91b -- src/kernel/spec.ts` shows every changed line begins with `*` inside a `/** ... */` block; the type union, member shapes (`visual`/`box`/`item`, `visualSpace`/`itemSpace`, etc.) and `admit`'s signature are byte-identical before and after. Nothing outside `.plan/`, `tests/`, and doc comments in `src/` changed anywhere in the diff (`git diff --stat` lists exactly the seven files named in the task, all `.plan/`, `tests/`, or the one doc-comment-only `src/kernel/spec.ts` file).
- **`COVERAGE.md`'s new section agrees with the test it describes.** The new "two published spaces" rows in `COVERAGE.md` and the two new `it()` blocks in `tests/kernel/presentation.browser.test.ts` name the same assertions (`visualSpace`/`itemSpace` reference identity under `visual === item`, and divergence under an item-authored transform) with matching IDs (`D-165, F-234`).
- **This round's own closure is recorded in the same shape as precedent.** F-232 through F-235's rows in `00-index.md` follow the identical "**Closed, 2026-08-31.** ... **The general shape**: ..." format as F-231's row, immediately above them in the same table — same tense, same structure, same placement. No aggregate "N open findings" count elsewhere in `00-index.md` needed updating; the findings table has no such summary line.

## Routed, not decided here

Nothing. integrity-1's required property (bring the second contract page's two stale type blocks into agreement with `src/kernel/spec.ts`, or strike them per the directory's own convention) is a documentation-correction task, not a design or contract choice — D-165 and F-232 already settled what the correct shape is; this page simply never received it. integrity-2 and integrity-3 are similarly direct corrections, not decisions.