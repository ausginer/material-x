# Application review 2 — re-review of review 1's findings

Re-review of [`api-application-review-1.md`](api-application-review-1.md) §A-1…§A-13 against `8c519ad9..c2f8d22a` (four commits: _finalize API changes_, `[2]`, `[3]`, `[4]`).

**Scope.** The thirteen findings of review 1, their fixes, and whether the fixes hold. New defects are reported only where the re-review's own instruments surfaced them; the D-68 work that A-4 triggered is checked for consistency, not re-designed.

**Verdict: all thirteen are addressed.** Two were fixed and independently falsified by mutation; the rest are fixed, corrected in the contract, or resolved by a written decision. **Five new findings** came out of the verification, one of which is release-blocking and **pre-dates review 1** — I missed it, and the instrument that found it (running the suite) is the one review 1 did not use.

---

## How this pass verified, and what that changed

Review 1 was a read. This one ran things, and the difference produced three of the five new findings.

| Instrument | Result |
| --- | --- |
| `npx just typecheck` | green |
| `npx just test --project browser` | **582 passed**, 18 skipped, 20 files |
| `npx just test --project declaration` | 16 passed, no type errors |
| `npx just test --project node` | 185 passed, **6 failed** — every failure in `tests/bench/size.node.test.ts` (**B-1**) |
| Mutation: `draft.domain ??=` → `=` in a scratch worktree | **exactly** the four new A-2 rows fail, nothing else |
| Mutation: `width: boxPre.width` → `boxPre.width - box.offsetWidth` | **exactly** the two A-3 rows fail, nothing else |
| Rebuild + re-measure at `8c519ad9` | the size breach pre-dates every fix (**B-1**) |
| Cross-check of all 241 test names cited in `tests/COVERAGE.md` against `tests/` | **20 cite tests that do not exist** (**B-2**) |

---

## Status of review 1's findings

| # | Was | Now |
| --- | --- | --- |
| A-1 | Blocking | **Fixed and falsified.** `draft.domain ??=` |
| A-2 | Blocking (coverage) | **Fixed and falsified.** Four rows, the whole post-commit stage set |
| A-3 | High — contract decision | **Decided (F-58/R3), implemented, falsified.** Resolution document written |
| A-4 | Medium (coverage) | **Fixed**, and it paid: it produced F-59/F-60/F-61 and D-68 |
| A-5 | Medium (coverage) | **Fixed.** Real `unhandledrejection` listener, newer operation owning the controller |
| A-6 | Medium (coverage) | **Fixed.** Asserts `closed` from _inside_ the report |
| A-7 | Low–Medium (coverage) | **Fixed.** `@ts-expect-error` on `landing({ run })`, packed declarations |
| A-8 | Low (coverage + contract text) | **Both fixed.** New `errors.node.test.ts`; D-64 now says thirteen — see **B-4** for an over-claim |
| A-9 | Low | **Fixed**, with the retraction kept in place |
| A-10 | Low | **Fixed**, one sentence of residue — **B-5** |
| A-11 | Low | **Fixed**, and it now argues _for_ the implementation |
| A-12 | Low | **Fixed**, with the count's history recorded |
| A-13 | Low | **Fixed** for the stale text; the closed-set half is carried forward — see §Carried forward |

---

### A-1 — fixed, and the fix is the one the contract names

[`src/sortable/spec.ts:1509-1519`](../../../src/sortable/spec.ts) is now `draft.domain ??= …`. That is exactly _existing result wins, otherwise `canceled`_ — a lookup on the frame, with `??` as the whole tie-break, which is what 02 §The join specifies. The `FAILURE_TERMINAL_CALLBACK` exclusion is kept and correctly re-justified in the comment: it is now about **recovery**, not about the result, and is no longer load-bearing for the tie-break.

Two properties I checked beyond the diff:

- **No stale carry across operations.** `resetSortableFramePart` nulls `domain` and both frames are scrubbed at retirement, so `??=` can never preserve a _previous_ operation's result.
- **`SETTLED_CANCELED` still writes unconditionally**, which is right: a cancel is a domain verdict of its own, not a fallback.

**Falsified.** Reverting `??=` to `=` in a scratch worktree fails exactly the four A-2 rows and no others.

### A-2 — fixed, and the new rows are precisely aimed

`describe('a failure after the authored commit (D-66)')` in [`tests/sortable/sortable.browser.test.ts:1545-1633`](../../../tests/sortable/sortable.browser.test.ts) adds four rows, and they are the right four:

- `LANDING_INTERRUPTED` (the stage that could **only** ever fire post-commit),
- `LANDING_CREATE`,
- `RENDERER_WRITE` at the join's pin, armed from _inside_ `start` so the poison lands after the commit rather than on the release render,
- and a **rejected** result, which pins that the tie-break is _existing result wins_ and not _accepted wins_.

The `expect(harness.cancels).toEqual([])` half is what makes each row falsifying rather than merely additive, and the `errors` assertion carries D-60's orthogonality in the same row. The pre-existing pre-commit row was also tightened from `String(reason).toContain` to `toBe(failure)` — identity, which is what handoff §3 asked for and what a re-wrapped copy would have passed.

### A-3 — decided, and the decision is better than the finding asked for

[`api-application-review-1-resolution-a3.md`](api-application-review-1-resolution-a3.md) is a proper resolution: it confirms the defect _inside its own covering test_, narrows my severity account in two places (the `width: 0` is unconditional, the landing-target displacement is not — it needs non-stretch cross alignment), rejects three alternatives with stated reasons, and takes R3.

The implementation matches ([`src/sortable/spec.ts:670-674`](../../../src/sortable/spec.ts)), window 2 narrows to `box.offsetHeight`, and F-58 is recorded in 00's findings table with D-43, D-52 and the scope limits amended. **The identity branch becoming the degenerate case rather than a second rule is a real improvement over what A-3 asked for**, and the scope narrowing (`box !== visual` supported with `y()` only) is the honest half — §5(a) states the `xy()` residue rather than absorbing it.

Both required rows landed: the existing fixture now asserts `rect.width` too, and the new centred-column row makes the error reach `anchorTarget` rather than only a style string. **Falsified**: restoring the two-axis subtraction fails exactly those two.

### A-4 — fixed, and it returned more than it cost

`tests/revision/revision-2.ts` now imports the surface from the entries that publish it, and the header records what the rewiring caught: `PreparedSettlement` restated as `Readonly<{ presentation: boolean }>` against the shipped `true` sentinel, `InsertionGeometry.resolve` restated with the wrong signature, and the string-vs-numeric `FailureStage` I named. An installer written against the first two would not have compiled.

It also produced **F-59** — `kernel.js` published no _value_ a behavior must produce, so the tier D-47 exists to publish could not be constructed from its own entry in any style — and **F-60**, that `docs.node.test.ts` had two blind spots (it closes over types, so value holes are invisible; it resolves across entries, so a tier inversion reads as clean). Both are closed: **D-68** publishes the closure, and a per-entry TypeDoc run over `kernel.js ∪ drag.js` is the new assertion.

Consistency checks I ran on that work, all passing:

- `tests/exports.node.test.ts` is still an **equality**, now over 33 kernel names.
- `AT_PROPOSAL`/`AT_CONSUMER` are dual-published and `vocabulary.node.test.ts` asserts **identity** (`sortable.AT_PROPOSAL === kernel.AT_PROPOSAL`), not mere presence — which is the right assertion for a two-entry, one-declaration arrangement.
- `Phase` exists as a closed union and `KernelFrame.phase` is narrowed to it.
- F-61's double declarations are gone: `ActionTransition` and `SeamRejection` are declared once each, in `kernel/seams.ts`, and a source-level test pins it. (00's findings row still calls F-61 open — **B-3**.)
- The new boundary test is the strongest addition: a `../kernel/*` import in `src/sortable/` must be published vocabulary or a _named_ internal group, and a failure is framed as a decision rather than a lint. One caveat at **B-6**.

### A-5, A-6 — fixed, and both assert the observable

The rejection row attaches a real `unhandledrejection` listener, abandons the resolver, lets a **newer** operation own the controller, and asserts both that nothing escaped and that the settlement list still holds only the cancel — _consumed, not dropped_.

The panic row reaches the kernel's own `panic()` through the threshold crossing's unguarded selection clear, and reads `host.closed` **from inside the report**. That is the assertion the ordering exists for, and it is falsifiable in both directions (reversing the two statements breaks the `closed:true` reading; removing the drain's transaction bracket breaks the ordering). Both COVERAGE entries state their falsification, which is the standard the rest of that file sets.

### A-7, A-8, A-9, A-11, A-12, A-13 — fixed

`landing({ run })` now carries an `@ts-expect-error` against the packed declarations. `errors.node.test.ts` enumerates the thirteen stages, pins the four fault classes as a closed set, and checks `cause` identity. D-64's row says thirteen and records that it said fourteen. `sortable()`'s example is `sortable(root, { items, onReorder }, y())` with the retraction kept beneath it. `joinSettlement`'s comment now explains why the terminal moves one action later instead of asserting the rule D-66 retracted. `SortableController` says three members and records that the fourth was `ready()`. COVERAGE's `landing({ run })` row is rewritten as a middle-tier installer.

**The retraction-in-place style used throughout these fixes is worth keeping.** Every corrected comment says what it used to say and why that was wrong, which is what stops the next reader re-deriving the deleted rule from the surrounding prose.

---

## New findings

### B-1 — the M-3 size budgets have been breached since Revision 2 landed, and `just test` fails

**Severity: blocking for a green suite. Pre-existing — this is a review 1 miss, not a regression.**

`npx just test --project node` fails six assertions, all in [`tests/bench/size.node.test.ts`](../../../tests/bench/size.node.test.ts):

| Composition | Brotli at HEAD | Budget | Over |
| --- | --- | --- | --- |
| minimal | 10 804 | 10 340 | **+464** |
| minimal (xy) | 10 843 | 10 380 | +463 |
| minimal + layoutAnimation | 11 253 | 10 790 | +463 |
| minimal + landing | 11 075 | 10 620 | +455 |
| complete | 11 501 | 11 200 | +301 |
| baseline A — feature-matched, non-composed | 11 163 | 10 900 | +263 |

**Attribution, measured rather than assumed.** I built and re-measured at `8c519ad9` — the revision review 1 read — in a detached worktree:

| Composition               | `8c519ad9` | HEAD   | Δ from the fixes |
| ------------------------- | ---------- | ------ | ---------------- |
| minimal                   | 10 849     | 10 804 | **−45**          |
| minimal (xy)              | 10 879     | 10 843 | −36              |
| minimal + layoutAnimation | 11 286     | 11 253 | −33              |
| minimal + landing         | 11 134     | 11 075 | −59              |
| complete                  | 11 538     | 11 501 | −37              |

So the breach arrived with the Revision 2 application itself and has been failing the suite since; **the four fix commits made every composition smaller.** D-68's "runtime cost is zero" claim is corroborated by these numbers and is not the cause.

**Why this matters beyond a red suite.** Handoff §5 attached a falsifiable prediction to D-56 and told implementation to check it, in as many words:

> if the deleted subpaths carried no runtime machinery — D-45's stated reason for deleting them — then M-3's **bytes should not move, only the entry count**. If bytes move, something lived in `callbacks.ts`/`handle.ts`/`placeholder.ts` that the argument said was not there. **Check this at implementation, not at Phase 21.**

Bytes moved, by ~500 B on the minimal composition. The prediction is **falsified and unexamined**. Two readings are open and the numbers do not choose between them: either something did live in the deleted modules, or the budget belongs to a pre-D-36 system and the bracket, the second measurement window, the input policy and the marker have simply cost what they cost. `bench/size/measure.ts`'s own header already states the governing rule — _"a size budget is never a reason to defer a fix for a floor breach; if the fix does not fit, the budget re-bases and the fix lands"_ — so the remedy is a **deliberate re-base with an attribution**, not a shrink. What is not acceptable is the current state, where the budget is neither met nor re-based and the suite is red.

Also worth noting: the breach is **not uniform** (+464 on minimal, +263 on the non-composed baseline), which is itself evidence — a flat cost would move both equally, so at least part of it is in the composed path.

**I own this one.** Review 1 asserted `npx just typecheck` was green and never ran the tests. A review that reads a test suite for what it asserts and never runs it cannot see a suite that does not pass.

### B-2 — `tests/COVERAGE.md` cites twenty tests that do not exist

**Severity: medium.**

I extracted every italicised test name cited in `tests/COVERAGE.md` (241 of them) and matched each against `tests/**/*.test.ts`, normalising quotes and backticks. **Twenty do not resolve:**

```text
should prevent the default for a press only when it is admitted
should refuse two real axis features, not only a feature and its copy
should retire the rejected real axis feature, in either order
should make a completion for a retired attempt inert
should destroy a live runner when the controller is destroyed
should let a custom runner replace the default entirely
should honour a done() called synchronously inside start
should destroy the handle and refuse to finalize after a synchronous fail()
should ignore a duplicate completion
should retain a synchronously completed handle for the join
should roll the hold back and classify when start throws
should destroy a handle returned by a start that destroyed the controller
should release presentation and skip the callback when the pin throws
should give two updates queued in one drain distinct versions
should classify an arm-time anchorTarget failure and never start
should let the first completion win
should never call start after anchorTarget destroyed the controller
should publish no terminal for a consequential failure
should add no class once the factory destroys the controller
should publish no request when the release render destroys the controller
```

They fall into three kinds, and only the third is harmless:

1. **Rows Revision 2 renamed, where the ledger kept the old name.** _should publish no terminal for a consequential failure_ became _should publish both channels…_ (D-66); _should release presentation and skip the callback when the pin throws_ became _…and still publish a terminal…_ (D-66); _should classify an arm-time anchorTarget failure and never start_ was superseded by the D-49 quality track.
2. **Rows whose subject a decision deleted.** _should add no class once the factory destroys the controller_ is `placeholderClassName`, deleted by D-65; _should refuse two real axis features_ / _should retire the rejected real axis feature_ are feature-brand-era (D-45); _should publish no request when the release render destroys the controller_ names `rt.pendingRequest`, deleted by D-41 — the same residue A-10 corrected in the source comment, still standing in the ledger.
3. **Names that drifted by wording alone**, where the row is still covered by an existing test under a different phrasing.

**The concentration is the finding, not the count.** Six of the ten rows in §Landing completion are dangling — the synchronous `done()` from inside `start`, the synchronous `fail()`, the duplicate completion, `done()` followed by a throw, `start` throwing, and `start` destroying while returning a live handle. That section covers `completeLanding`'s once-only latch (D-28, I-24) and `armSettlement`'s reserve-before-call (F-21). Reading the `describe` blocks in that region of `tests/kernel/kernel.browser.test.ts` confirms none of the six exists there under any name, so the kernel-tier once-only completion latch has **no direct row** — the nearest live coverage is `tests/sortable/features.browser.test.ts` — _should hold the gate even with a zero duration_, which reaches the reserve-before-call path indirectly at the wrong tier, and F-30's handle disposal, which is a conformance pin for a different property.

This matters because `COVERAGE.md` is what a reviewer reads to decide a property is covered — it is the reason review 1's A-2 could be stated as _"the row does not exist"_ with confidence. A ledger that is 8 % dangling weakens every conclusion drawn from it, including the ones in this document. **The mechanical fix is cheap**: the cross-check above is ~25 lines and could run as a `node` test beside `docs.node.test.ts`, which would make a renamed test a failing build rather than a silent ledger drift.

### B-3 — F-61 is recorded as open, and is fixed

**Severity: low.** [`00-index.md:376`](../../contract/00-index.md) reads:

> | F-61 | `ActionTransition` and `SeamRejection` are each **declared twice** … | **Open, and blocking D-68's export list.** … One declaration each, re-exported, before either is exported |

Both are now declared once, in `kernel/seams.ts`, `spec.ts` re-exports them, `kernel.ts` publishes them, and `tests/kernel/vocabulary.node.test.ts` — _should declare the doubly-declared seam types exactly once_ — asserts it. D-68's export list shipped, so the row's own gating condition was met and the row was not updated. Every other finding in that table records its resolution in place; this one should too.

### B-4 — `errors.node.test.ts` claims a totality property its enumeration does not have

**Severity: low.** The file's header says:

> What the enumeration adds over the type is that the stage list is **taken from the exported constants** rather than from the mapping's own keys, so a stage that ships without reaching this mapping is a failing test and not a missing entry nobody looks for.

`STAGES` is a hand-written array of thirteen tuples, and the guard is `expect(STAGES).toHaveLength(13)` — which pins the length of the local table, not the size of `FailureStage`. A fourteenth stage added to `failures.ts` and to `STAGE_TO_CODE` compiles and leaves this suite green. The same sentence is repeated in [`tests/COVERAGE.md:440`](../../../tests/COVERAGE.md).

The guarantee is not lost — `Readonly<Record<FailureStage, DraggableErrorCode>>` still makes the mapping total in the type, which is what A-8 said and what the header's own first paragraph says. What is wrong is the second paragraph's claim about what the belt adds. Either the claim narrows to _"the codes are the ones D-64 assigns, asserted per stage"_, or the enumeration derives its stage list from a value that a new stage necessarily reaches. It is worth correcting rather than ignoring because the file is otherwise a model of stating exactly what a test does and does not prove.

### B-5 — one sentence of A-10's residue survives

**Severity: low.** [`src/sortable/spec.ts:1342-1343`](../../../src/sortable/spec.ts), the `host.closed` barrier comment inside `release.effect`:

> The publication below is the other half: a request written after `retire()` cleared it outlives the operation and pins its DOM (I-20).

There is no publication below any more — the block that described it was correctly rewritten twelve lines down to say so. The barrier itself still earns its place (the `rt.lift!.write` immediately after it is the real subject), so this is one clause to drop, not a re-argument.

### B-6 — the new boundary test's allow-list is hand-maintained in one direction

**Severity: low, and it is an observation about a good test rather than a defect.**

`tests/kernel/vocabulary.node.test.ts` builds `PUBLISHED_NAMES` from `Object.keys(kernel)` and `Object.keys(drag)` — reflected, so values are exact — plus `PUBLISHED_TYPES`, a hand-written list of 36 names, because types erase in Node. The values half self-maintains; the types half does not. A type **removed** from `kernel.ts` but left in `PUBLISHED_TYPES` silently keeps permitting a `../kernel/*` import of it from `src/sortable/`, which is the boundary the test exists to hold.

The exposure is small — `exports.node.test.ts`'s equality and the per-entry TypeDoc run both constrain the same surface from other directions — and the file already explains why the list is written out. Worth one sentence in the file saying which direction the list is authoritative in, so the next reader does not assume it is checked both ways.

---

## Carried forward from review 1

**A-13's second half is unaddressed, deliberately or not.** Handoff §3 asks for D-51's exception list to be asserted **as a closed set** — _"no slot filled by code the library does not own, other than `LandingHandle.destroy()`, fires after close, asserted over the whole slot set."_ What exists is still one assertion per slot across the I-36 suites plus the F-30 conformance pin. Adding a new consumer-facing slot would fail no test. Review 1 rated this a narrower note and it remains one; recording it so it is not lost.

---

## Summary

Thirteen findings, thirteen addressed; two independently falsified by mutation; one turned into a written resolution that improved on the finding; one (A-4) returned three new contract findings and a decision the tier needed anyway. The fix quality is high and the retraction-in-place discipline in the comments is worth keeping.

The re-review's own yield is the argument for running a suite rather than reading it: **B-1** is a red build that has been red since Revision 2 landed and that a documented, explicitly-scheduled prediction check should have caught, and **B-2** is a coverage ledger that is 8 % fiction — including six consecutive rows for the landing gate's once-only latch. Neither is visible to a reader, a compiler, or a type fixture.

**Suggested order:** B-1 first, because it is the only red one and because its attribution question (`callbacks.ts`/`handle.ts`/`placeholder.ts`, or the bracket's real cost) should be answered while the measurement is fresh. B-2 second, with the mechanical cross-check landed alongside the corrections so the ledger cannot drift again. B-3 … B-6 are single-line corrections.

---

`LSP plugin - available; used: probed with documentSymbol, then relied on for cross-module symbol facts in review 1; this pass's questions were behavioural (mutation runs, a rebuild at an earlier commit, a suite-wide name cross-check) and resolved by executing the code rather than by symbol resolution.`