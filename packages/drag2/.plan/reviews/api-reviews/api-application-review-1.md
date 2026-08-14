# Application review 1 — Revision 2 implementation against `contract/` and `revision-2-handoff.md`

Independent review of the shipped `packages/drag2/src` tree against [`contract/00-index.md`](../../contract/00-index.md) … [`contract/06-vertical-sortable-trace.md`](../../contract/06-vertical-sortable-trace.md) and [`revision-2-handoff.md`](../../revision-2-handoff.md).

**Scope.** Concrete correctness / API / lifecycle defects, implementation↔contract divergence, and missing or vacuous executable coverage. Settled architecture is treated as fixed. Where a finding appears to require a **contract** change rather than an implementation change, it says so explicitly and does not propose a redesign.

**Method.** Read of every `src/` module against the decision rows D-36…D-67, the seam tables in 02, the trace in 06, and the acceptance list in handoff §3; then a targeted audit of `tests/` and `docs/revision/revision-2.ts` for whether each required row actually exists and can fail. `npx just typecheck` is green at the reviewed revision (`8c519ad9`).

**Overall.** The revision landed substantially and faithfully: the transaction bracket (D-36…D-38, D-53), the deleted readiness protocol (D-41), the eight-entry / three-tier topology (D-48, D-61, D-64), the pull collection (D-44), the input policy (D-46, D-50, D-54), the progress marker (D-66 §The progress marker) and the contextual landing duration (D-67) are all present and match their rows. **One release-blocking behavioral defect** was found, in the single clause of D-66 that the whole decision turns on, together with the reason it was not caught: the assertion that would have caught it is the one acceptance row handoff §3 named and the suite does not have.

---

## Severity summary

| # | Severity | Finding |
| --- | --- | --- |
| **A-1** | **Blocking** | D-66's tie-break _existing result wins_ is not implemented — the `canceled` fallback overwrites a committed domain result |
| **A-2** | **Blocking** (coverage) | The acceptance row that would have caught A-1 does not exist; its nearest neighbour asserts only that `finalized` was _called_ |
| **A-3** | High — **contract decision needed** | The two-window footprint is applied per axis, so `footprint.width === 0` for every `box ≠ visual` composition and the placeholder ships `width: 0px` |
| A-4 | Medium (coverage) | `docs/revision/revision-2.ts` still restates the surface instead of importing it; handoff §6.3's "closes at Phase R" is not discharged |
| A-5 | Medium (coverage) | Probe A's late-rejection row — a real `unhandledrejection` listener — has no test anywhere |
| A-6 | Medium (coverage) | Probe A's `panic` ordering row — _close → report → teardown_ — has no test |
| A-7 | Low–Medium (coverage) | D-63's negative half — `landing({ run })` is a compile error at the ordinary tier — is unasserted |
| A-8 | Low (coverage / contract text) | D-64's enumerated stage → code row is unasserted; and D-64's prose says "14 `FAILURE_*` constants" where there are 13 |
| A-9 | Low | `sortable()`'s published JSDoc example calls `callbacks({ … })`, deleted by D-56 |
| A-10 | Low | `release.effect`'s trailing comment describes a publication that no longer exists and is truncated mid-sentence |
| A-11 | Low | `joinSettlement`'s skip comment still states the rule D-66 retracted, and names `onFinish` |
| A-12 | Low | `SortableController` documents "Four members"; three are declared |
| A-13 | Low | `tests/COVERAGE.md` and one test comment still describe `landing({ run })` as the composed fixture |

---

## A-1 — `settlement.prepare` overwrites a committed domain result on the failure path

**Severity: blocking.** Wrong data reaches `onEnd` on the failure path this decision exists to define.

**Where.** [`src/sortable/spec.ts:1454-1494`](../../../src/sortable/spec.ts), the `SETTLED_FAILED` arm.

**What the contract requires.** D-66, and 02 §The join spell the mapping as a **lookup on the frame**, not a branch per stage:

> ```text
> frame holds a domain result   →  publish it   (accepted / noop / rejected / canceled)
> frame holds none              →  publish canceled   reason = the classifying error
> ```
>
> Nothing else is consulted. — [`contract/02-kernel-behavior-contract.md:1370-1380`](../../contract/02-kernel-behavior-contract.md)

D-66's row states the same tie-break twice (`00-index.md:244`, `:282`), and 05's Q-14 row calls it "what made the answer total". Handoff §3 turns it into an acceptance row:

> A consequential failure after the authored commit publishes `{ type: 'accepted' }` **and** one `onError`; before any domain result it publishes `{ type: 'canceled' }` whose `reason` **is** the classifying error, by identity.

**What is implemented.** The only exclusion is a **stage** test, not a "does the frame already hold a result" test:

```ts
case SETTLED_FAILED: {
  pendingFailure = { stage: input.stage, error: input.error };

  if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
    draft.outcome = OUTCOME_FAILED;
    draft.recovery = RECOVERY_IMMEDIATE;
    draft.domain =
      progress === MINTED
        ? null
        : { type: 'canceled', reason: input.error, stage: …, proposal: draft.proposal };
  }

  return true;
}
```

`beginFrame` is `Object.assign(draft, current)` ([`src/kernel/frames.ts:199-204`](../../../src/kernel/frames.ts)), so `draft.domain` arrives at this seam carrying whatever the _previous_ settlement committed. The assignment above discards it unconditionally. The first line of the branch's own comment asserts the opposite of what the code does — _"**Existing result wins, otherwise `canceled`**"_ — and then implements only the `FAILURE_TERMINAL_CALLBACK` half of that sentence.

**Observed failure, two reachable traces.** Both require only a drag that reaches an accepted resolution and then fails.

1. **Landing runner failure after the commit.** `onReorder` resolves `accept()` → `settlement.prepare` writes `domain = { type: 'accepted' }` and commits → `holdForLanding` arms the runner. The runner's `finished` rejects (a consumer cancelling the animation, a WAAPI cancel), so `completeLanding(attempt, true, error)` → `failOperation(FAILURE_LANDING_INTERRUPTED, …)` ([`src/kernel/kernel.ts:1341-1380`](../../../src/kernel/kernel.ts)) → `handleFailed` re-drives the settlement seam with `SETTLED_FAILED` → the branch above rewrites `domain` to `canceled` at `AT_CONSUMER` → `handleErrorReported` publishes it.
2. **The join's pin throwing.** `joinSettlement`'s `session.write(target.x, target.y)` fails → `FAILURE_RENDERER_WRITE`, `failed = true`, `finalized` skipped ([`src/kernel/kernel.ts:1591-1614`](../../../src/kernel/kernel.ts)) → same checkpoint route, same overwrite.

**Trace 1 is unconditional, which sharpens the finding.** `FAILURE_LANDING_INTERRUPTED` has exactly one producer in the package — `completeLanding`'s failure arm ([`src/kernel/kernel.ts:1363-1376`](../../../src/kernel/kernel.ts); confirmed by reference search: the constant is named only in `failures.ts`, `errors.ts`'s mapping, `kernel.ts`'s import and those two lines, and `kernel.js`'s re-export). That arm can only run **after** `armSettlement` has published a runner, i.e. after the settlement committed a domain result. So for that stage there is no input at all under which the implemented branch is right: it overwrites a committed result 100 % of the time it fires.

In both traces, the consumer's data **is** reordered and the DOM **is** committed, and the consumer is told `onEnd({ type: 'canceled' })`. That is precisely the lie D-66 §"The old reason inverts into the new rule" was written to prevent:

> when the authored commit has already run, the drop **is** accepted — the reorder is real and permanent — and the consumer must be told so.

The same wrong value also reaches `onError`'s context, which is built from `current.domain` in `settlement.effect` ([`src/sortable/spec.ts:1519-1524`](../../../src/sortable/spec.ts)), so a consumer reading either channel sees `canceled` for an accepted drop.

**Not a kernel defect.** The kernel side is correct and complete: the checkpoint routes every classified failure of a live operation through the settlement seam with `{ stage, error }`, `prepare` is the writing seam, `effect` gets a `Readonly` frame, and `handleErrorReported` publishes `current.domain` after presentation is released. The defect is confined to the behavior's `prepare`.

**Not a contract ambiguity.** The clause is stated four times across three documents and is the stated reason Q-14's answer is total rather than merely preferable. No contract change is implied.

---

## A-2 — the acceptance row that would have caught A-1 is missing; its neighbour is vacuous

**Severity: blocking (coverage).**

Handoff §3 names the row explicitly (quoted in A-1). `tests/COVERAGE.md` §"The terminal, whole" (lines 338-370) enumerates eleven D-66 rows and **does not contain it**. The two nearest rows both pass against the defective source:

- [`tests/kernel/kernel.browser.test.ts:1838-1869`](../../../tests/kernel/kernel.browser.test.ts) — _"should release presentation and still publish a terminal when the pin throws"_. It asserts `harness.calls` contains `'finalized'` and the ordering against `'presentation.released'`. It is driven by the **kernel** harness's stub behavior, so it never exercises `settlement.prepare`'s fallback and never inspects the published argument. It pins _that_ a terminal fires, never _which_.
- [`tests/sortable/sortable.browser.test.ts:1478-1516`](../../../tests/sortable/sortable.browser.test.ts) — _"should publish both channels for a consequential failure"_. It uses a `FAILURE_RENDERER_WRITE` on the **hot path**, i.e. before any round-trip, where the frame genuinely holds no result. It asserts `finishes` is empty and `cancels` has one entry — which is the correct expectation for _that_ case and the exact opposite of the missing row's.

So every D-66 row in the suite exercises the "frame holds none" line of the lookup, and none exercises the "frame holds a result" line. A reference search for `SETTLED_FAILED` confirms the shape of the gap: it is named in `kernel/spec.ts`, `kernel/kernel.ts:2062`, `sortable/spec.ts:1454`, and — in tests — **only** in `tests/kernel/kernel.browser.test.ts` (lines 238, 1595, 1903), where the behavior under test is the kernel harness's stub. No sortable-tier test drives the failure settlement at all. Handoff §3's totality instruction — _"asserted across the whole failure-stage set rather than a sampled stage"_ — is also not discharged: the failure stages exercised are `RENDERER_WRITE` (pre-commit), `REORDER_RESOLUTION` and `TERMINAL_CALLBACK`; the three post-commit stages (`LANDING_CREATE`, `LANDING_INTERRUPTED`, and `RENDERER_WRITE` at the pin) are never asserted at the sortable tier where the domain result exists.

---

## A-3 — the footprint subtraction is applied per axis, so a composed `box` yields `width: 0`

**Severity: high. This one appears to need a contract decision, not a silent implementation change.**

**Where.** [`src/sortable/spec.ts:650-656`](../../../src/sortable/spec.ts) computes it and [`src/sortable/placement.ts:181-199`](../../../src/sortable/placement.ts) writes it:

```ts
const footprint =
  box === visual
    ? boxPre
    : { width: boxPre.width - box.offsetWidth, height: boxPre.height - box.offsetHeight };
…
style.width  = `${width}px`;
style.height = `${height}px`;
```

**Observed behavior.** In every nested composition — the case D-43 exists for — the box is a block-level or flex element whose **width** is imposed by its container and is therefore _unchanged_ across `acquireLift`. Only the height collapses. So `boxPre.width − boxPost.width === 0` and the placeholder is written `width: 0px` with `box-sizing: border-box`.

The two branches are then qualitatively different on the width axis: the default `box === visual` path takes `boxPre` whole and gets the real width; the composed path gets zero. A consumer who adds a `box` slot to fix a 30 px height error silently loses the placeholder's width.

Consequences that follow: any container that is not start-aligned (a centred or end-aligned column) places a zero-width placeholder somewhere other than where the row sat, and `anchorTarget` reads `placeholder.getBoundingClientRect().left` as the landing target's `x` ([`src/sortable/spec.ts:1614-1616`](../../../src/sortable/spec.ts)) — so the landing lands at the wrong horizontal position rather than merely looking thin.

**Why this is a contract question.** The contract states the rule on both axes and nothing else:

> ```text
> before the lift       boxPre       = box(item).offsetHeight/Width
> after  the lift       boxPost      = box(item).offsetHeight/Width
> footprint             = boxPre − boxPost
> ```
>
> — [`contract/03-feature-composition.md:805-812`](../../contract/03-feature-composition.md)

but **every measurement behind it is a height**: api-1's table A/B (62/32/60 and 62/2/60), probe C1's `180 → 210`, F-55's identity correction, and 02 §`boxPre`'s whole discussion are height-only. The width axis was never measured and the `OffsetBox` pair was carried through symmetrically. The implementation is faithful to the written rule; the written rule is unmeasured on one of its two axes. Deciding which axis subtracts (or whether the rule is "subtract on the drag axis, take `boxPre` on the cross axis") is an owner/architect call, so it is reported rather than proposed.

**Coverage.** The one test for this rule, [`tests/sortable/features.browser.test.ts:539-570`](../../../tests/sortable/features.browser.test.ts) — _"should size the placeholder from the footprint, not the visual, when a box is composed"_ — asserts `getBoundingClientRect().height` only. The fixture it builds (`box` a `display: flex` div, `card` 50×60, `aside` 20×32) produces `footprint.width === 0`, so the defect is present _inside the very test that covers the rule_ and is not observed.

---

## A-4 — the Revision 2 type fixture still restates the surface it is supposed to check

**Severity: medium (coverage). Explicitly owed by the handoff.**

Handoff §6.3 closes the "compiled fixture" item with one residue:

> What remains owed is narrower: the fixture restates the surface rather than importing it, because `src/` is still pre-revision, so it proves the surface is _self-consistent_ and not that the implementation matches it. **That closes at Phase R.**

It has not closed. [`docs/revision/revision-2.ts`](../../../docs/revision/revision-2.ts) still opens with

> `src/` still implements the **pre-revision** surface; nothing here is wired to it, and the imports below are deliberately confined to types the revision does not touch.

and still declares its own `FailureStage`, `DraggableErrorCode`, `KernelHost`, `AdmissionSubject`, `BehaviorFactory`, `SettlementInput`, `OnEnd` and `SortableConfig`. The drift is already observable: the fixture's `FailureStage` is a union of **string literals** (`'admission' | 'activation' | …`, lines 128-141) while the shipped one is a union of **numeric constants** ([`src/kernel/failures.ts:37-50`](../../../src/kernel/failures.ts)). A fixture whose central type is a different kind of type from the shipped one cannot detect drift in anything that names it.

Consequences, each of which the handoff assigned to this fixture:

- **D-64's totality** is proven over the fixture's private `stageToCode` (lines 143-160), not over [`src/kernel/errors.ts:79-93`](../../../src/kernel/errors.ts). The shipped mapping happens to be typed `Readonly<Record<FailureStage, DraggableErrorCode>>` and is therefore total — but by its own construction, not by the fixture.
- **`n12` (F-51)** — the row the handoff calls the sharpest of the four — checks the fixture's local `SortableConfig['onEnd']` (line 678), not [`src/sortable/config.ts:48`](../../../src/sortable/config.ts). If `lint-fix` ever rewrote the shipped alias back to method shorthand, `n12` would still pass.
- **`n17`/`n18`** pin D-66's carrier and writing seam against the fixture's restated `SettlementInput` / `SettlementTransition`, not the shipped ones.

Note that A-1 is a _value_ defect, so this fixture could not have caught it in any case; the point is narrower — the mechanical drift guard the handoff paid for is not yet reading the implementation.

---

## A-5 — probe A's late-rejection row has no test

**Severity: medium (coverage).**

Handoff §3, probe A:

> An abandoned resolver's late rejection is consumed with a real `unhandledrejection` listener attached, settled once a **newer** operation owns the controller.

`grep -rn unhandledrejection tests/` returns nothing. The behavior the row guards is real and specified — D-40's implementation consequence (_"the abort guard cannot key off `completed` alone"_) and `ResolutionAttempt`'s two-field split ([`src/kernel/kernel.ts:141-154`](../../../src/kernel/kernel.ts)) exist for it — but the only assertions in the suite are on the _slot_ comparison (`resolution !== attempt`), which is the mechanism, not the observable. Nothing asserts that no unhandled rejection escapes to the page, which is the failure a consumer would actually see.

---

## A-6 — probe A's panic-ordering row has no test

**Severity: medium (coverage).**

Handoff §3: _"Teardown order under a reentrant destroy is close → report → teardown."_ D-36's row records the observation it came from: `['retire','report'] → ['report','retire']`.

`panic()` implements it — `void destroy(); report(error);` ([`src/kernel/kernel.ts:610-613`](../../../src/kernel/kernel.ts)) — and the ordering is correct **only because** `panic` is always reached from inside a drain, where `transactionDepth ≥ 1` defers the physical steps. That is a non-local invariant (it depends on every `drain` call site being wrapped in `transactionDepth += 1`), and it is exactly the kind of coupling a test should pin. `grep -rn panic tests/` finds only the seam driver's re-entry panics and `queue`'s routing test; the excellent `describe('the transaction bracket')` block ([`tests/kernel/kernel.browser.test.ts:2845-2991`](../../../tests/kernel/kernel.browser.test.ts)) covers `destroy()` in all its forms and never covers `panic()`.

---

## A-7 — D-63's negative half is unasserted

**Severity: low–medium (coverage).**

Handoff §3: _"`landing({ run })` is a compile error at the ordinary tier while a kernel-tier runner still works (D-63)."_

The packed-consumer fixture ([`tests/consumer.node.test.ts:203-217`](../../../tests/consumer.node.test.ts)) asserts the **positive** half — a `LandingStart` authored against `sortable/feature.js`. There is no `@ts-expect-error` for `landing({ run })`, even though the file carries twenty-nine such directives for names far less likely to be re-added, including four for the Checkpoint D omissions (`AnimationTiming`, `DragSubject`, `ResolutionContext`, `CancellationReason`) guarded on two entries apiece. `LandingOptions` is `Readonly<{ duration?, easing? }>`, so the excess-property check does reject an object literal today — which is what makes the missing directive cheap to add and its absence a real gap rather than a redundancy.

---

## A-8 — D-64's enumerated mapping row is unasserted; and D-64's own prose miscounts the stages

**Severity: low (coverage), plus one contract-text correction.**

**Coverage.** Handoff §3: _"**The stage → code mapping is total** — enumerate every `FAILURE_*` and assert a code for each; this is the test that stops the `default:` arm D-60's history warns about (D-64)."_ No such test exists: `grep -rn 'STAGE_TO_CODE\|toDraggableError' tests/` finds nothing, and the only runtime observations of a code are three single-stage assertions in `sortable.browser.test.ts` (`'interaction'`, `'consumer'`, `'presentation'`). The type-level `Record<FailureStage, …>` in `errors.ts` does deliver the guarantee, so this is a missing-belt finding rather than an unguarded one — but the enumerated row was named and is absent.

**Contract text.** D-64 says the **"14 `FAILURE_*` constants"** leave the ordinary tier (`00-index.md:242`). There are **13**: `FAILURE_PRESENTATION_READY = 13` was deleted with the readiness protocol under D-41 and its number deliberately not reused ([`src/kernel/failures.ts:27-34`](../../../src/kernel/failures.ts)). Both the implementation and `tests/exports.node.test.ts:46` get this right and say so; D-64's row is the stale one. **This is a contract correction, not an implementation change.**

---

## A-9 — `sortable()`'s published example uses a factory D-56 deleted

**Severity: low.** [`src/sortable.ts:77-79`](../../../src/sortable.ts):

````ts
/**
 * ```ts
 * const list = sortable(root, y(), callbacks({ onReorder }));
 * ```
 */
````

`callbacks()` was deleted by D-56; the schema key is `onReorder` written directly in the config object. This is the ordinary tier's only worked example and it does not compile. `tests/docs.node.test.ts` checks type reachability, not example compilation, so nothing catches it.

---

## A-10 — `release.effect`'s trailing comment describes deleted machinery and is truncated

**Severity: low.** [`src/sortable/spec.ts:1349-1363`](../../../src/sortable/spec.ts):

```
        // **Published last, and inside this effect** (D-33, C3-04). Last,
        // because a throwing write above classifies `FAILURE_RELEASE` …
        // … the request the consumer is about to receive is already the one
        // `ready()` will be checked against …
        //
        // **And the render is itself a consumer-reachable call** (I-36 (2) acts
      },
```

Three problems in one block: it documents a publication statement that no longer exists (`rt.pendingRequest` went with D-41), it cites `ready()` which D-41 removed, and the final sentence is cut off mid-word at the closing brace. The code is correct; the comment describes a different function. Worth noting because this is the seam D-66's `AT_PROPOSAL`/`AT_CONSUMER` split turns on, so a reader reconstructing that split from the comments is reading a pre-revision account.

---

## A-11 — `joinSettlement`'s skip comment still states the retracted rule

**Severity: low.** [`src/kernel/kernel.ts:1608-1614`](../../../src/kernel/kernel.ts):

```ts
if (failed) {
  // The terminal callback is skipped after a consequential failure: the
  // committed frame still carries the accepted outcome, so calling it would
  // fire `onFinish` for a drop the queued checkpoint is about to report
  // through `onError`. …
  return;
}
```

The behavior is right — the terminal moved one action later, to `ERROR_REPORTED` — but the comment states 02 §The join's rule _as though it still held_, and names `onFinish`, deleted by D-62. Since this `return` is precisely where a reader checks whether D-66 was applied, the comment argues against the implementation directly above the code that implements D-66.

---

## A-12 — `SortableController` documents four members and declares three

**Severity: low.** [`src/sortable/controller.ts:1-5`](../../../src/sortable/controller.ts) opens _"Four members, two of which are the kernel's own"_; the type declares `invalidate`, `cancel`, `destroy`. The fourth was `ready()`, deleted with the readiness protocol (D-41) — and the same paragraph's closing sentence still explains what `ready()` reports after `destroy()`.

---

## A-13 — `landing({ run })` survives in the coverage ledger and one test comment

**Severity: low.**

- [`tests/COVERAGE.md:412`](../../../tests/COVERAGE.md) describes the D-51 relinquishment row as _"a `landing({ run })` runner destroys the controller"_.
- [`tests/sortable/features.browser.test.ts:1106-1160`](../../../tests/sortable/features.browser.test.ts) carries the same phrasing in its header comment, though the fixture itself correctly uses a middle-tier `authoredLanding(…)` installer.

The test is **not** vacuous — the runner it installs is installer-supplied, which is what D-51's amended reading (_"a slot filled by code the library does not own"_) is about, so the handoff's warning that an ordinary-tier version would "pass vacuously" does not apply here. Two narrower notes remain:

1. the comments should say _middle-tier installer_, not `landing({ run })`; and
2. handoff §3 asks for the exception list to be asserted **as a closed set** — _"no slot filled by code the library does not own, other than `LandingHandle.destroy()`, fires after close, asserted over the whole slot set"_. What exists is one assertion per slot across the I-36 barrier suites and this one conformance pin. Nothing enumerates the slot set and asserts the complement, so adding a new consumer-facing slot would not fail any test.

---

## What was checked and found correct

Recorded so the next pass does not re-derive it.

- **D-36 / D-38 / D-53.** Logical/physical split, depth counter, deferred boundary, idempotent one-promise `destroy()`, `host.closed` as a live getter. Covered thoroughly by `describe('the transaction bracket')`, including the latch-versus-`signal.aborted` disagreement fixture handoff §3 demanded be one where _"the two actually disagree"_ — it is (`kernel.browser.test.ts:2955-2978`).
- **D-37 / I-36.** Every barrier in `sortable/spec.ts` reads `host.closed`; the three modules that cannot reach `host` take the `live` predicate by reference. No surviving `signal.aborted` liveness reading anywhere in `src/`.
- **D-41.** `ready()`, `ResolutionOptions`, `presentationCommitted()`, `pendingRequest`, `authoredReady`, `FAILURE_PRESENTATION_READY` and the advisory second `anchorTarget` are all gone; one gate, one measurement at arm.
- **D-42 / D-49.** The O(1) precondition sits after the re-anchor and before the measurement, throws rather than sentinels, and reaches the quality track (`QUALITY` / `runQualityValue` / `reportQuality`) rather than `failOperation`; `target === null` produces the honest jump cut and still terminates.
- **D-44.** Array identity is the whole structural test, the copy is on the structural branch only, the pull happens in `action.prepare`, `rt.source` is seeded from the construction-time pull so the first warm `invalidate()` takes the geometry-only branch.
- **D-45 / D-56 / D-57.** Schema-order installation, plugins appended, last-wins per slot, installers invoked after the merge, retirement reversed exactly once, cleanup recorded before any `claim` can throw.
- **D-46 / D-50 / D-54.** Two owner tables (pointer wider than command), `isComposing` checked first on every declared type, target-before-feasibility ordering, subject-relative path walk, `Alt` as the selection request, `preventDefault()` relocated to the threshold crossing with selection clearing, ingress-scoped one-shot click suppressor with all three disarm conditions.
- **D-48 / D-55 / D-61 / D-64.** Eight entries over three tiers, `files.json` `runtime`/`typeOnly` split, the frozen surface asserted as an _equality_ in `exports.node.test.ts`, `DraggableError` on the shared root, stages at the kernel tier, brand withdrawn.
- **D-59 / D-52 / D-43 (identity branch) / D-58.** `AdmissionSubject` discriminated by `'visual' in subject`, `box` held in kernel per-operation state beside `originRect` and never read off the frame, window 1 immediately before `acquireLift`, window 2 first in `activation.prepare`, `originRect` derived from neither, candidates measured through `getBox`. Only the width axis of the subtraction is in question — see A-3.
- **D-62 / D-65.** One `onEnd` slot taking the whole union, named aliases for every callback slot, `placeholder` as a single callback, config slot winning over a contributed one, `data-drag-placeholder` written through the rollback ledger with `restoreAttribute` (not `removeAttribute`) and the whole-`style` restore.
- **D-66 §The progress marker.** `MINTED → STARTED → RESOLVING`, advanced immediately **before** `onStart` and as the **first statement** of the `invoke` closure, cleared in `retire()`, never derived from `proposal !== null`. The regression row for the rejected derivation exists and is well-aimed (`sortable.browser.test.ts:1325-1347`). The `FAILURE_TERMINAL_CALLBACK` exclusion is made from both sides. **Only the tie-break is wrong — A-1.**
- **D-67.** `duration({ from, to, distance })`, resolved once per landing, **before** the reduced-motion collapse, validated per landing for the functional form and at construction for the numeric one; the zero-argument thunk still works, as F-52 predicted, and is asserted behaviorally.

---

## Suggested order of response

1. **A-1** — one branch in `settlement.prepare`; nothing else moves, and 04's frame model still gains nothing.
2. **A-2** — write the missing row first if the fix is to be evidenced: the assertion should be at the sortable tier, on the published `onEnd` argument, for at least one post-commit stage.
3. **A-3** — an owner/architect decision on which axis the subtraction applies to, then whatever the decision implies for `03 §The rule`, `02 §boxPre` and `06`'s trace line. The implementation currently matches the written rule.
4. **A-4 … A-8** — coverage and one contract-text correction; independent of each other.
5. **A-9 … A-13** — documentation, in the source and in the ledger.

---

`LSP plugin - available; used: documentSymbol on `src/sortable/config.ts`to probe availability, and findReferences on`FAILURE_LANDING_INTERRUPTED`and`SETTLED_FAILED` to establish A-1's producer set and A-2's test-side gap.`