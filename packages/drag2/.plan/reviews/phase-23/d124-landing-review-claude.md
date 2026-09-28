# D-124's landing, reviewed — and what its test pattern promises

Review, 2026-08-25. Files read at `ecf291c1`, reviewing [`dd940e23`](#) against the gate audit ([`reachability-gate-audit-claude.md`](reachability-gate-audit-claude.md)) and the contract decisions landed in `f295c964` ([`gate-contract-questions-claude.md`](gate-contract-questions-claude.md)). One unrelated uncommitted edit in [`layout-animation.ts`](../../../src/sortable/layout-animation.ts) ignored. **No production code changed.**

**Verdict: the slice is correct and the scoping is exact. One methodological finding, recorded narrow, on the test pattern rather than on the deletions.**

---

## 0. Verification summary

Everything the commissioning brief listed was checked by execution, not by reading the commit message.

| Item | Result |
| --- | --- |
| Coupling fixture | **Verified.** Executes the path the audit only traced; three rows, and the load-bearing one is genuine |
| `home` ownership copy retained | **Verified.** Copy kept, throw removed, reasoning correct and explicitly separated |
| TSDoc boundary changes | **Verified** on all four slots; §3 has a minor note |
| Measurement / budget re-base | **Verified by running it.** Measured bytes match the claimed table row for row |
| D-121 … D-123 not implemented early | **Verified.** All three still unimplemented, and one is guarded by a source comment |
| Suite health | 1162 passed, 116 skipped, **no type errors** |

**The budget re-base was re-measured rather than trusted.** The 14 budget rows are `describe.skipIf`-muted by a documented pre-existing gate (`DRAG2_SIZE_BUDGETS=1`, unmuted at finalization), so a plain `just test` does **not** enforce them — worth stating, because "the suite is green" does not mean the budgets were checked. Re-run with the flag: **33 passed, 0 skipped.** `just size` then prints the landed column, and it matches the table in [`measure.ts`](../../../bench/size/measure.ts) exactly — 10.55 / 10.21 / 10.98 / 10.82 / 11.24 / 8.31 / 8.46 / 8.56 / 8.72 / 12.67 / 0.12 / 6.23 / 10.97 / 6.89 kB. Twelve rows sit at exactly `0.15 kB under budget`, `drag.js` at `0.03 kB` and baseline B at its unchanged `151 B`. The arithmetic, the claimed deltas and the two zero-movement control rows all hold.

**D-121 … D-123 are clean.** `copyUniqueItems` still throws ([`collection.ts:47`](../../../src/sortable/collection.ts)); the frame-part symbol arm still ships and carries an explicit source note that D-122 will close it and **has not yet**; `insertionAt` is still absent from every published `.d.ts`; the neighbour and range tests still ship; `files.json` still lists `sortable/feature` as `typeOnly`. D-80 (b)'s ordering comment is untouched, which is what F-98 requires while the `items` term is unpublished. Nothing was implemented ahead of its decision.

**F-100 is real and is already recorded** (`ecf291c1`). [`frames.ts:125`](../../../src/kernel/frames.ts) does claim the string-key term is "published on `FramePartOf`" when neither the source TSDoc nor the emitted `kernel/frames.d.ts` carries it. Confirmed independently; the existing row states it correctly and I have nothing to add.

---

## 1. The methodological question

The slice states its pattern as: **"Every deleted rejection becomes an asserted outcome"** — the form the package adopted on 2026-08-22 for four frame checks, whose stated purpose is anti-rot: _"A returning guard has to argue with a test rather than with a silence."_

That purpose is legitimate and I am not arguing with it. The question is whether the _assertions chosen to serve it_ stay inside what §1.1 and §13 say the library owes.

### 1.1 The distinction that decides each row

Three kinds of assertion are mixed together under one banner, and they have different standing:

- **(A) Acceptance** — _the library no longer refuses this input_. `not.toThrow()`, `errors == []`. This **is** the anti-rot tripwire. A returning guard must argue with it. Fully legitimate.
- **(B) Coupling** — _a value crossing one library-owned boundary reaches another_. Proves a structural fact about the library's own plumbing. Legitimate, and in this slice genuinely valuable.
- **(C) Exact corruption** — _and the resulting wreckage has precisely this shape_. This is the category at issue: it converts behaviour under out-of-contract input into a permanent regression guarantee.

§1.1 and §13 put invalid input outside the library's behavioural contract. A test suite is the executable statement of that contract. Asserting (C) re-creates, in the suite, exactly the coupling to invalid input that the deletion removed from the runtime — the library is once again not free to change what it does with a value its contract never admitted.

**The counterfactual itself is not the problem, and is not what this finding is about.** §1.1 requires it be run, and running it was right. But it is _already preserved_ — D-124's own [`00-index.md`](../../contract/00-index.md) row enumerates all five consequences in prose, and [`COVERAGE.md`](../../../tests/COVERAGE.md) carries them with strikethroughs. **Removing a (C) assertion loses no evidence**, which is what makes the remediation narrow rather than a trade.

### 1.2 What (C) buys, tested rather than assumed

The slice's own defence for the strongest (C) row is explicit ([`features.browser.test.ts:824`](../../../tests/sortable/features.browser.test.ts)): _"a row that checked only the absence of an error would pass against either behaviour."_

**That claim is half right, and the half that fails matters.** Tracing what a returning guard actually produces:

- **A returning _refusing_ guard** — the deleted shape: throws from `start`, classified `FAILURE_LANDING_CREATE`, and per D-66 publishes a `canceled` terminal. **Both** `errors == []` **and** `terminals === 0` fail. For this shape (C) adds nothing over (A).
- **A returning _clamping_ guard** — `Infinity` silently coerced to the default. No error, operation completes, one terminal. `errors == []` **passes**; `terminals === 0` **fails**.

So (C) does carry marginal anti-rot power that (A) lacks, against a normalizing guard rather than a refusing one. **I record that honestly because it is the strongest argument for the current form**, and it is why this finding is narrow and partly an owner call rather than a flat defect.

What (C) costs on the other side is concrete. A future slice that publishes a terminal for a stalled landing **without** classifying an error — a safety net that would also help _valid_ cases, such as a platform-cancelled animation — passes `errors == []` and **fails** `terminals === 0`. That is a test blocking an improvement to valid behaviour on the strength of an invalid input's shape.

### 1.3 The rows, classified

**Unambiguous — these assert something that is not drag2's behaviour at all:**

- [`frames.node.test.ts`](../../../tests/kernel/frames.node.test.ts) — `expect(Object.assign(createKernelFrame(), { phase: 7 }).phase).toBe(7)` and `expect(Object.getPrototypeOf(Object.assign(createKernelFrame(), part))).toBeNull()`. **These assert ECMAScript `Object.assign` semantics.** They hold for any plain object and would pass with the library absent. They carry no regression value for drag2 and cannot detect a returning guard — the sibling `expect(() => validateFramePart(...)).not.toThrow()` on the same rows is what does that, and it is a clean (A).
- [`validation.browser.test.ts`](../../../tests/free-drag/validation.browser.test.ts) — _should stay classified for a NaN distance, which the platform refuses_. Pins **Chrome's** `animate()` domain as a drag2 expectation. That domain is already recorded, measured, in [`animate-duration-domain.md`](../../measurements/animate-duration-domain.md), which is its right home; here it makes a library row fail if a browser changes while nothing in the library does.

**Real but arguable — assert the negation of a published tier-B invariant:**

- _should publish no terminal at all for an unbounded duration_ ([`features.browser.test.ts:820`](../../../tests/sortable/features.browser.test.ts)) — `finishes + cancels === 0`. This row was previously _should still publish exactly one terminal for a refused duration_, i.e. an **I-31 protection**, and is now its inversion. Its own comment is candid: _"D-66's exactly-once promise is unreachable for this input. Asserted rather than left implicit."_
- _should hold the settlement gate open for an unbounded duration_ and _should compound into a held settlement gate for an unbounded distance_ — both assert `ends == []`, the same negation reached through the other surface.

I-31 is a **tier-B** invariant in [`05-lifecycle-invariants.md`](../../contract/05-lifecycle-invariants.md). Under the gate, out-of-contract input genuinely voids it — that reasoning is sound and I am not disputing the deletion. What is new is that the suite now _guarantees the violated form_ rather than declining to speak about it.

**Milder (C) — exact corruption, lower stakes:** the placeholder rows asserting `data-drag-placeholder` presence and `root.contains(item) === false` (the library deleting a page-owned node), and _should write the non-finite offset into the committed frame_ asserting `Number.isFinite(...) === false` on published geometry.

**The model row, and it is already in this slice.** _should let a non-finite result compose into the target unattributed_ asserts `errors == []` **and** `ends).toHaveLength(1)`. Both halves are legitimate: the first is (A), and the second proves a library-owned invariant **survives** the misuse. That is the same pattern with the polarity reversed — _the invariant still holds_ rather than _the invariant is broken_ — and it is the shape the other rows could take.

---

## 2. What is correct, and should not be disturbed

**The coupling fixture is the best thing in the slice.** _should mint a non-finite distance for a conforming duration thunk_ is a (B): it proves `moveTo` → committed offsets → `LandingContext.from` → library-minted `distance`, which is a structural fact about the library's own plumbing and the entire justification for the two deletions being one decision. It discharges the audit's own §7 falsifier — _"that fixture is worth writing"_ — and the conforming thunk (`({ distance }) => distance / 2`) is exactly the use D-67 added the context for. **Keep as is.**

**The `home` copy split is exactly right.** [`spec.ts`](../../../src/free-drag/spec.ts) keeps the two-line read and deletes only the finiteness throw, with the §1.1 carve-out spelled out. The audit warned a mechanical `Number.isFinite` sweep would take the copy with the throw; it did not.

**The TSDoc conversions are the `box` pattern applied correctly.** `moveTo`, `LandingOptions.duration`, `SortableConfig.placeholder` and `ResolveHome` each now state the precondition, then that nothing detects a violation. This is §5 of the audit's cross-cutting finding acted on rather than noted, and F-97's partial discharge — revising the `FramePartOf` sentence **in the same change** — is the right model for the two guards still carrying the old form.

**On the brief's TSDoc question specifically: I do not think these cross the line.** They describe consequences, which is more than `box` does, but consequence-describing documentation has real value — a consumer whose item vanished finds the answer — and documentation constrains far more weakly than a test. **One minor note, not a finding:** the trailing historical clauses (_"the library used to discard such a call and no longer does"_, _"the library used to refuse this value and no longer does"_) are changelog in a published API doc. They belong to the decision record, and they are the sentences most likely to be read as _this behaviour is settled_.

---

## 3. Recommended remediation, narrow

**None of this blocks the slice.** Nothing ships wrong, no deletion is misjudged, and the scoping against D-121 … D-123 is exact. Recorded as a finding for a follow-up, in priority order:

1. **Drop the two `Object.assign` assertions** in `frames.node.test.ts`. They test the language, not the library. The `not.toThrow()` on the same rows is the anti-rot tripwire and stays. No evidence is lost — both consequences are in D-124's row.
2. **Drop, or re-home, _should stay classified for a NaN distance_.** The platform domain it pins belongs to `animate-duration-domain.md`, where it already is.
3. **Owner decision on the three terminal-negation rows.** The tension in §1.2 is real in both directions: they catch a clamping guard that (A) alone would miss, and they pin the negation of a tier-B invariant. If they stay, the reason should be recorded **as a deliberate exception** — that the anti-rot value is worth the constraint — rather than left implicit, since a later reader will otherwise take them for ordinary behavioural rows. If they go, the (A) assertions already beside them keep the refusing-guard tripwire.
4. **Consider re-polarizing the milder (C) rows** toward the model already in the slice: assert what the library still gets right under misuse rather than the precise shape of what it gets wrong.
5. **Optional:** move the two historical clauses out of the published TSDoc.

---

## 4. What would falsify this

- **§1.2's clamping-guard argument is the load-bearing one and I reasoned it rather than built it.** I traced the refusing guard's path through D-66 to a `canceled` terminal and confirmed both assertions catch it; I did not implement a clamping guard and run the suite against it. If a clamping guard would in fact also trip `errors == []` by some route I missed, recommendation 3 collapses into a plain deletion.
- **§1.3's ECMAScript claim** rests on `createKernelFrame()` returning a plain extensible object with no relevant accessors. If it ever returns something with a `phase` setter or a sealed shape, those assertions acquire library content and stop being language tests.
- **The budget verification is a point measurement** on this machine and toolchain. It confirms the table is internally consistent and currently true; it does not confirm the _before_ column, which I took from the commit.
- **I did not re-derive the five gate closures themselves.** This review takes the audit's and the owner's contract determinations as settled and checks only the implementation against them.