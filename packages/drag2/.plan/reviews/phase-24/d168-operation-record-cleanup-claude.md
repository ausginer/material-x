# D-168 cleanup review — the operation and activation records

**Commit read at:** `d51d59c6`, architectural baseline `7f6d1851`, branch `drag2/fin-review`. Verified via `git diff 7f6d1851..d51d59c6 -- src/kernel/kernel.ts` and `git show d51d59c6:packages/drag2/src/kernel/kernel.ts` (the working tree briefly carried an uncommitted 13-line mutation-probe diff from a sibling pass mid-review; confirmed clean and byte-identical to `d51d59c6` before this report was written).

**Scope covered:** `src/kernel/kernel.ts` in full — every write site of `operation`, `activation`, and their fields; every comment touching the changed region; the naming at guard/identity sites; `runMoved` and the hot-path claim; the bundle-size evidence in `.plan/measurements/budget-rebases.md` and `.plan/plan.md`. Typechecked (`tsc --noEmit`) to confirm the discriminant-narrowing rewrite in `mintOperation` is sound, not merely compiling by luck.

**Scope not covered, per task instructions:** F-274, F-231, the class/factory representation question, the two pre-existing `prefer-destructuring` lint errors, and the four D-168 exclusions (`pinned`, `resolution`, `settlement`, `settlementInput`, `retireAttempts`) — their continued separate existence is not reviewed as a defect. Other passes' reports were not read.

**LSP plugin — unavailable** (`ToolSearch` for "LSP" returned no matching deferred tools). Fell back to `grep`/`git diff`/`tsc` for all symbol-level checks (write-site census of `operation`/`activation` fields, assertion-site audit).

## Method

1. Diffed `kernel.ts` field-by-field against the required properties in D-168 §9.
2. Grepped every assignment to `operation.<field>`, `activation.<field>`, and to the `operation`/`activation` locals themselves, across the whole file, to confirm construction-only assignment (property 3) and the `cancelRequest` exception.
3. Grepped for `!.` / double-assertion patterns (`operation!.lift!`-shaped) to check the assertion-count claim in D-168 §2.
4. Grepped for `clearOperationState` and narrative language (`used to`, `was changed`, `previously`, `replaces`) to check for stale comments.
5. Read `budget-rebases.md` / `plan.md` deltas to check whether the shape was bent to fit the size gate.
6. Read `runMoved` and its call sites for allocation.

## Findings

No findings at tier A or B. One tier-C readability observation.

### cleanup-1 (tier C) — `parts` names a discriminant boolean as a plural noun, and the three-way ternary repeats the same test

**Current behavior.** In `mintOperation` (`src/kernel/kernel.ts` ~line 1001):

```ts
const parts = 'visual' in subject;

operation = {
  visual: parts ? subject.visual : subject,
  box: parts ? subject.box : subject,
  item: parts ? subject.item : subject,
  lifetimes: createOperationLifetimes(notify),
  cancelRequest: null,
};
```

replacing the prior two-branch `if ('visual' in subject) { ({visual, box, item} = subject); } else { visual = subject; box = subject; item = subject; }`.

**Why it is a candidate.** `parts` is a `boolean`, but the name reads as a noun (the parts) rather than a predicate. Every other boolean in this file is named as a predicate/adjective — `preparationValid`, `settlementLive`, `joinLive`, `queue.closed` — so `parts` is a departure from the file's own naming register, and a reader has to reconstruct that it means "subject is already split into visual/box/item" rather than, say, "the parts of the subject." The same condition is also evaluated visually three times (three ternaries) where the prior code tested it once. This is a byproduct of moving from field-by-field assignment to one construction literal (per D-168 §2's required property 3, every field must be assigned once, in the literal), not a change the decision required in this exact shape — a two-branch literal (`parts ? { visual: subject.visual, box: subject.box, item: subject.item } : { visual: subject, box: subject, item: subject }`, spread with the other two fields) would keep the single-literal property without the repeated ternary or the noun-as-boolean name.

**Required property.** A boolean local should read as a predicate at its use sites (`CONTRIBUTING.md` Part I, Shape/readability priority; `documentation.md` §5.3's tense/action test is not itself engaged here since this is naming, not a comment, but the general readability bar Part I sets — "code must be maintainable" — applies to a locally introduced discriminant the same as to a renamed field).

**Not flagged as needing a fix**, per the task's brief: this is reported for the record, not prescribed.

## Verified as sound (no defect) — one item per checklist point

1. **No dead `clearOperationState` residue.** `clearOperationState` is fully deleted; no reference, alias, or comment mentioning it survives (`grep -n "clearOperationState"` over `kernel.ts`: zero hits). No redundant double assertions: `grep -n '!\.'` across the file shows every field read as a single `!` (`operation!.cancelRequest`, `activation!.originRect`, `activation!.lift`, `operation!.visual`, etc.) — none of the `operation!.field!`-shaped double assertions the flat-record alternative in D-168 §2 would have required. `acquireActivation` further consolidates to one assertion (`const live = operation!;`) reused for four field reads.

2. **Every ordinary field is assigned only in its construction literal.** Grepped every write to `operation.{visual,box,item,lifetimes,cancelRequest}` and `activation.{originRect,lift,visualSpace}` after `mintOperation`/`acquireActivation`: the only post-construction writes are the two `cancelRequest` sites (`cancelWith` line 773, `handleCancel` line 2010 via the `live` alias). The two record locals themselves (`operation =`, `activation =`) are written at exactly four sites: the two constructions (`mintOperation` 1011, `acquireActivation` 1284) and the two retirements (`retireOperation` 566–567, `runPhysicalTeardown` 642–643), matching D-168 §9 properties 2 and 3 exactly.

3. **`cancelRequest` is the sole deliberate mutation exception**, and it is documented as a latch both on the type (`OperationRecord`'s JSDoc: "the first valid cancel per operation wins, and it may not outlive the operation it latched") and at its consuming site (`handleCancel`'s comment: "Consumed before anything else runs: the latch invalidates every preparation while it is held"). No second exception was introduced.

4. **Naming at guard/identity sites.** The `operation` parameter/local renamed to `identity` at every site where it denotes an `OperationIdentity` rather than the kernel-local record (`retireOperation`, `failOperation`, `mintOperation`, `handleRelease`, `handleActivate`, `handleCancel`, `handleStartCommitted`, `handleErrorReported`) is a real disambiguation: before this change `operation` denoted two different things in different scopes (a bare identity token vs., after this decision, a full record), and the rename removes that overload consistently everywhere it would otherwise recur. `live` in `acquireActivation` and `owned`/`session` in `runReleaseSeam`/`joinSettlement` read clearly in context. See cleanup-1 for the one place (`parts`) where a newly introduced name is weaker than the surrounding register.

5. **No tuple, abbreviated key, or adapter introduced to game the size budget.** Field names are unabbreviated and match the removed `let` bindings one-for-one (`visual`, `box`, `item`, `lifetimes`, `cancelRequest`, `originRect`, `lift`, `visualSpace`). `budget-rebases.md`'s post-implementation table shows the change landed at +13 to +57 B Brotli against the 150 B slack established after D-166's re-base, with every composition still under budget (tightest row 93 B under) and no budget re-based — i.e., the shape did not need to be bent to pass the gate, and reading the diff confirms no shortening was applied anyway.

6. **No allocation entered `runMoved` or another sample-rate path.** `runMoved` is unchanged in shape — `spec!.moved(current, activation!.lift)` — one property load added (`activation!.lift` replacing the bare `lift!`), zero allocation, and it remains the same hoisted, controller-stable closure (its own comment, updated to name `activation` instead of `lift` as the swappable slot, states this explicitly and correctly).

7. **Comments describe current ownership and lifetimes, not obsolete machinery.** Every comment touching the changed region (the `OperationRecord`/`ActivationRecord` JSDoc, the retirement-ordering comment in both `retireOperation` and `runPhysicalTeardown`, the `mintOperation` construction comment, the `acquireActivation` read-back comments) states a present-tense invariant, ownership boundary or ordering constraint, and none narrates the removed helper or the old flat-binding shape. No `D-*`/`F-*`/phase/review-name references leaked into source (`grep` for `D-168|F-273|D-16|phase-24|§` over `kernel.ts`: zero hits), consistent with `documentation.md` §5.2's "no strikethrough, no phase numbers" rule for maintainer notes.

## Null results, stated explicitly

- No dead aliases or partial-clear machinery survived.
- No field is written outside its constructor literal other than the one documented latch.
- No rename made a read harder except the one C-tier naming note above.
- No evidence the shape was shaped to fit the size gate; the gate passed with room to spare and the field names are unabbreviated.
- No allocation was added to `runMoved` or any other path this package documents as sample-rate/hot.
- No comment in the changed region narrates removed machinery or carries planning/review bookkeeping.