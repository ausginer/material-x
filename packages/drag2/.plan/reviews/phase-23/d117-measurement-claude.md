# F-85 resolved, and D-117 measured

**Measurement and reachability record — no production code, contract or decision was changed.** Every figure comes from a temporary ablation; `src/` was restored and re-verified byte-identical after each one, and the suite is green on the restored tree (59 files, 1,152 passed, 116 skipped, no type errors).

Three things, in the order D-117 asks for them: the classification witness, the new baseline, and the measured policy.

---

## 1. F-85 — the seam re-entry latch is **P2**

**Only package-owned kernel execution can reach it, and today none does.** The audit's B-6 is right and [`seams.ts`](../../src/kernel/seams.ts)'s module doc is not wrong so much as answering a different question: it says where a nested call _would_ originate, which is true, and the record read that as saying behavior code can _make_ one, which is false.

Resolved from the call graph and then attacked, rather than resolved from prose. Four independent lines, two of them attempts to falsify the answer.

### 1.1 The static graph

Every phase the driver opens is opened from one of **nine** call sites in [`kernel.ts`](../../src/kernel/kernel.ts), and all nine sit inside a queue handler: `activateOperation`, `handleMove`, `handleBehaviorAction`, `closeOperation`, `openSettlement`, `handleFailed`, `handleErrorReported`, `armSettlement` and `joinSettlement`. `drain` returns immediately while `queue.running`, so a nested `dispatchKernel` — which is what `host.dispatch`, `host.cancel`, `scope.invalidate`, `LandingHandle.done()` and every pointer sample reduce to — appends and returns.

**The one transaction that is not queued is admission, and it does not use the driver at all.** `kernel.ts` says so in the present tense: _Admission is a queue boundary. It is the one transaction the kernel drives outside the seam driver … so the driver's re-entry refusal cannot see it._ `runAdmission` wraps `admit` in a plain `try`/`catch`, and re-entry there is refused by `openIngress`'s **separate** `admitting` latch, which has its own message and its own failure mode. Two latches, two provenances; only one of them is this site.

### 1.2 The graph claim, enforced mechanically

`SeamContext` was temporarily given a `zzCheck()` that throws unless `queue.running`, called at the top of `runPhase`. **The whole suite ran with it: 1,305 tests passed and it never fired.** (Six failures, none of them the assertion — two were deliberate probe outputs and four were `tests/docs.node.test.ts` objecting to the extra member on a published type, which is that instrument working.)

So the precondition holds on every path the suite exercises: **a phase is never opened outside a drain**, which is what makes `dispatchKernel` structurally unable to re-enter one.

### 1.3 The adversarial probe

A temporary behavior that attacks from inside each seam, across every entry a third-party author holds — `host.dispatch`, `host.cancel`, `host.destroy`, a synthetic `pointerdown` / `pointermove` / `pointerup`, `resize`, `scroll`, `keydown[Escape]`, a bound command event, `scope.invalidate`, `LandingHandle.done()` and `LandingHandle.fail()` — from `admit`, both `activation` phases, both `action` phases, both `release` phases, both `settlement` phases, `moved`, `anchorTarget` and `finalized`.

**12 seams × 13 vectors + a coverage case: 157/157 produced no latch.** The coverage case asserts the probe actually drove all eleven reachable seams, so a silent no-op cannot pass as a negative result.

### 1.4 The one apparent falsification, and what it was

Two matrix cases initially failed — `dispatch` from `action.prepare` and from `action.effect`, at 26.8 s and 28.4 s. Both were **vitest timeouts, not latches**, and the defect was the probe's: an uncapped `host.dispatch` from an action seam appends one entry per entry drained, so a run-to-completion drain never terminates. Isolated and bounded, **5,000 nested dispatches from `action.prepare` reported nothing at all** and produced the documented interleaving — `prepare, effect, prepare, effect` — confirming the queue's contract rather than breaking the latch.

Recorded because the first reading was the opposite of the finding, and a timeout that looks like a failure is exactly how a reachability claim gets decided wrongly.

### 1.5 Two corrections to the record

**The thirteen assertions are not in the browser suites.** F-85 says they are; all thirteen are in [`tests/kernel/seams.node.test.ts`](../../tests/kernel/seams.node.test.ts), a node suite. More to the point, **every one of them calls `driver.runCore` directly on the private `SeamDriver` handle** — they are the package-owned execution B-6 describes, not evidence against it. No test in the package reaches this latch through the behavior SPI, and after §1.3 that is not an oversight.

**P2 here means the message gates and the check does not.** D-117's P2 rule ships a check whose absence would turn the defect into silent state corruption, and this is the paradigm case: a nested `begin()`/`commit()` rebuilds the draft under the outer seam and publishes a half-built frame. So the latch ships in every build; the 103-character sentence becomes a token.

### 1.6 A consequence D-117 does not mention

Gating **any** P2 site inside the kernel widens the set of tiers that bind `__DEV__`, and [`tests/kernel/vocabulary.node.test.ts`](../../tests/kernel/vocabulary.node.test.ts) enforces that set — it failed under ablation B for exactly this reason. The declared set is currently one module. The remediation owes that declaration an update, and it is the kind of thing that is invisible until a build breaks.

---

## 2. The re-baseline

Built at `92cbae58` (documentation-only over the clean set `309f259d`). Pipeline unchanged: Rolldown, `platform: 'neutral'`, `minify: true`, Brotli via `node:zlib` at default quality.

| composition | minified | brotli | modules | budget | slack |
| --- | --: | --: | --: | --: | --: |
| minimal | 33,697 | 11,162 | 32 | 11,585 | 423 |
| minimal (xy) | 32,502 | 10,807 | 31 | 11,235 | 428 |
| minimal + layoutAnimation | 35,099 | 11,589 | 33 | 12,024 | 435 |
| minimal + landing | 34,444 | 11,449 | 34 | 11,878 | 429 |
| complete | 35,846 | 11,859 | 35 | 12,289 | 430 |
| free drag minimal | 25,558 | 8,768 | 27 | 9,160 | 392 |
| free drag + bounds | 26,029 | 8,922 | 28 | 9,310 | 388 |
| free drag + landing | 26,307 | 9,066 | 29 | 9,460 | 394 |
| free drag complete | 26,778 | 9,217 | 30 | 9,610 | 393 |
| both behaviors | 42,752 | 13,418 | 48 | 13,850 | 432 |
| vocabulary root - drag.js | 184 | 121 | 2 | 150 | 29 |
| kernel root - kernel.js | 18,538 | 6,598 | 13 | 6,950 | 352 |
| baseline A - non-composed | 34,934 | 11,583 | 30 | 12,000 | 417 |
| baseline B - shipped `@ydinjs/drag` | 22,573 | 6,889 | 26 | 7,040 | 151 |

**The audit's 851–949 B is retired as a figure.** It was measured against a tree two passes old and against a different unit; nothing below is comparable to it and it is not carried forward.

---

## 3. The census

46 message-shaped literals in `src/`. Five are **protocol and domain identifiers, not diagnostics** — `drag:escape`, `drag:pointercancel`, `drag:lostpointercapture`, `sortable:collection-invalidated`, `sortable:item-removed` — and are untouched by any rule here. That leaves **41 diagnostics, 2,852 characters**, of which one ([`verified-refresh.ts`](../../src/sortable/verified-refresh.ts), 130 characters) is already the package's single `__DEV__` gate.

**40 sites are classified**, by _what must be true for the branch to be taken_:

| class | sites | characters now | as identities | Δ |
| --- | --: | --: | --: | --: |
| **P1** — outside the library | 28 | 1,930 | 753 | −1,177 |
| **P2** — inside the library | 8 | 504 | 203 | −301 |
| **P3** — outside, fixed no-op | 4 | 288 | 118 | −170 |
| **already gated** | 1 | 130 | — | — |
| **total classified** | **40** | **2,722** | **1,074** | **−1,648** |

**A census discrepancy, recorded rather than reconciled away.** D-117 states forty sites and 2,816 characters; this count is forty classified sites and 2,722, with 41 diagnostics at 2,852 including the gated one. The 36-character gap is exactly one site — `sortable: ${label} contributed twice` — so the two censuses differ by which of the two `contributed twice` sites they counted, not by a missing class. Nothing in the ranks below turns on it.

**The eight P2 sites**, since this is the list D-117's rule actually produces: the seam re-entry latch and the unconsumed-staged-value report in [`seams.ts`](../../src/kernel/seams.ts); the two free-drag sites D-117 names in its contradiction 5; and **four sortable release faults** — `released an operation with no published presentation`, `a command reached release with no destination`, `released with no insertion`, `the resolved insertion does not describe a gap in the released snapshot`. Those four are P2 **by their own comments**, which say _a broken invariant, never a home fallback_ and _has lost state the kernel guaranteed to carry_, and they are structurally identical to the free-drag pair. D-117's contradiction 5 names only the free-drag two; applying its own rule reaches six. Flagged, not decided — each is a reachability claim and only the seam latch was proved here.

---

## 4. The ranks — four separate ablations, ranks only

Brotli deltas do not decompose, so these four are **not** a decomposition of §5 and must not be added to each other. Each is measured against §2's baseline, alone.

| rank | class | brotli Δ | minified Δ | `kernel root` brotli |
| --: | --- | --: | --: | --: |
| 1 | **A — P1 identities** (28 sites) | −203 … −357 | −649 … −1,183 | −203 |
| 2 | **D — machinery** (rank only, not a proposal) | −240 … −266 | −780 … −788 | **−266** |
| 3 | **B — P2 gating + tokens** (8 sites) | −61 … −117 | −179 … −352 | −61 |
| 4 | **C — P3 narration** (4 sites) | −12 … −45 | −116 … −170 | −37 |

**Machinery ranks second, and on the kernel root it ranks first.** Ablation D removes `assertFrameScrubbed`, `assertFrameShapesMatch`, `validateFrameDescriptors`, `captureFrameKeys`, their three call sites and the unconsumed-staged-value check — a **rank of what that machinery weighs**, not a proposal, and it is kept out of §5 for exactly the reason D-117 (d) gives. It is the flattest of the four across compositions (−780 to −788 minified everywhere) because it is all kernel, which is also why it dominates on `kernel root`.

**P3 is the smallest class by a wide margin** — four sites, and on `complete` it moves 12 B. D-117's census already said the smallest class is the authoring prose the package has spent three decisions defending; measured, it is smaller than that framing suggests.

---

## 5. The policy, measured once, jointly

P1 + P2 + P3 applied together, one build, one measurement. **This is the figure that enters the budgets.**

| composition | brotli now | joint | **Δ** | minified Δ | new slack |
| --- | --: | --: | --: | --: | --: |
| minimal | 11,162 | 10,660 | **−502** | −1,502 | 925 |
| minimal (xy) | 10,807 | 10,326 | **−481** | −1,502 | 909 |
| minimal + layoutAnimation | 11,589 | 11,110 | **−479** | −1,502 | 914 |
| minimal + landing | 11,449 | 10,954 | **−495** | −1,519 | 924 |
| complete | 11,859 | 11,367 | **−492** | −1,519 | 922 |
| free drag minimal | 8,768 | 8,415 | **−353** | −1,132 | 745 |
| free drag + bounds | 8,922 | 8,567 | **−355** | −1,132 | 743 |
| free drag + landing | 9,066 | 8,698 | **−368** | −1,149 | 762 |
| free drag complete | 9,217 | 8,867 | **−350** | −1,149 | 743 |
| both behaviors | 13,418 | 12,871 | **−547** | −1,705 | 979 |
| vocabulary root - drag.js | 121 | 123 | **+2** | −2 | **27** |
| kernel root - kernel.js | 6,598 | 6,291 | **−307** | −944 | 659 |
| baseline A - non-composed | 11,583 | 11,089 | **−494** | −1,520 | 911 |
| baseline B - shipped | 6,889 | 6,889 | 0 | 0 | 151 |

### 5.1 The sums do not reconcile, in the direction that matters

D-117 item 2 warns that Brotli deltas do not decompose, and the joint measurement demonstrates it — **the parts understate the whole**, everywhere:

| composition       | A + B + C | joint | discrepancy |
| ----------------- | --------: | ----: | ----------: |
| minimal           |      −479 |  −502 |        23 B |
| free drag minimal |      −323 |  −353 |        30 B |
| both behaviors    |      −503 |  −547 |        44 B |
| kernel root       |      −301 |  −307 |         6 B |

Between 2 % and 9 %, and always the same sign: forty tokens sharing a `drag: ` prefix and a vocabulary of slugs compress against each other in a way three separate ablations cannot see. A pass that ranked, summed, and booked the sum would have **under-**claimed — which is the friendlier of the two failure modes and still the wrong number.

### 5.2 `drag.js` moves the wrong way, and it is the row built to notice

The vocabulary root is **2 B smaller minified and 2 B larger after Brotli**, taking its slack from 29 B to 27 B. Its single message is `drag: ${code} failure` becoming `drag: fault/${code}`.

This is not noise to be waved through. That row's budget is deliberately 29 B rather than the ~150 B convention, precisely so a small move is visible on a 121 B artifact, and its own commentary records a 121 → 190 B regression it was built to catch. **The identity rule is a net loss there**, because on a two-module artifact a novel slug is a novel token while `failure` was already paying its way. The remediation should either leave that one site alone or re-base the row deliberately; absorbing it silently is what the row exists to prevent.

### 5.3 The budgets re-base, and SC-1 does not fire

Slack goes from **352–435 B** to **743–979 B** against a ~150 B convention — a five- to six-fold overshoot. D-117 item 6 predicted a re-base rather than headroom, and that is what the measurement shows. **No row goes negative**, so SC-1's trigger is not met, and the re-base is M-3′'s ordinary one — the fix lands, the budget follows.

---

## 6. Machinery on the runtime axis (D-117 item 4)

§0 is senior to §16 and a byte figure answers neither question, so both sites were timed.

**`assertFrameScrubbed`, on a sortable-shaped frame (7 kernel keys + 7 part keys):**

|  |  |
| --- | --- |
| per call | **0.548 µs** (200,000 calls in 109.6 ms) |
| per retirement (both frames) | **1.096 µs** |
| allocations per call | **16** — one `Object.keys` array, one `.every` closure in `sameKeys`, and **one descriptor object per key** |
| allocations per retirement | **32 transient objects** |

Against M-1's measured 2.64 µs per pointer sample, one retirement's scrub assertion is **≈0.4 of a single sample, once per operation**. **SC-3's coldness reading holds** — this is nowhere near per-frame — and D-117 (d)'s sharpening is the accurate one: neither hot nor free. The descriptor allocation is the part a byte count cannot see, and it scales with the behavior's part width, so a part twice the sortable's doubles it.

**The seam latch, per phase:** `runLeaf` costs **3.1 ns** with the latch and **2.1 ns** with `refuseReentry` and the panic block removed — **≈1.0 ns**, two predictable branches and one assignment. One `moved` per pointer sample means the latch is genuinely on the per-sample path, as the audit's B-6 says, at **0.04 % of a 2.64 µs sample**. The description is accurate and the cost is not one.

**So the two sites D-117 pairs are not alike.** The latch is on the hot path and costs nothing; the scrub assertion is cold and allocates. Neither is answered by the ranks in §4, which is the point of the axis being separate.

---

## 7. What the suites do (D-117 item 8)

The joint tree was run against the full suite: **28 assertions fail, across 12 files** — not the ~35 D-117 estimated, and the shortfall is informative.

**Thirteen re-entry assertions did not break.** They match `/re-entered/u`, and the token `drag: seam/re-entered` still contains it. D-117 item 8 says the suite _already treats the prose as a site identity_; that is now measured rather than asserted, and it means the largest single block of message-fragment assertions in the package needs no work at all.

Three of the 28 are instruments rather than behavior assertions, and they are the ones that need thought rather than a regex edit:

- [`tests/consumer.node.test.ts`](../../tests/consumer.node.test.ts) — _should ship the four author-facing checks it validates behaviors with_, read against the packed tarball. This is D-108's instrument, and item 7's inverse assertion belongs here.
- [`tests/decisions.node.test.ts`](../../tests/decisions.node.test.ts) — _should hold every witness it claims_.
- [`tests/kernel/vocabulary.node.test.ts`](../../tests/kernel/vocabulary.node.test.ts) — the `__DEV__` declared-tier set, per §1.6.

The remaining 25 are message-fragment matches in `frames.node.test.ts`, `seams.node.test.ts`, `placement.browser.test.ts`, `sortable.browser.test.ts`, `assemble.browser.test.ts`, `composition.browser.test.ts`, `features.browser.test.ts`, `free-drag.browser.test.ts` and `kernel.browser.test.ts` — mechanical and bounded, as D-117 says.

---

## 8. Limits

- **The tokens in §3–§5 are one implementer's derivation.** D-117 (c) claims a token is derivable from the site without editorial judgment; that claim was applied, not tested, and a second implementer producing different slugs would move the joint figure by a few bytes per site. The figures are a measurement of the policy at this token length, not of the policy in the abstract.
- **P2 assignment was proved for one site.** F-85's is settled. The other seven are classified from their own comments and from what their branch requires, which is the rule's _shape_ but not its _proof_; under D-117 (b) an unsettled site is P1, so seven of the eight remain provisional and ablation B is an upper bound on what gating is worth.
- **The joint ablation preserves every check and every classification.** It is a text measurement, as instructed. Ablation D is a rank of machinery and is not part of it, and no figure in this record proposes removing a lifecycle check.
- **No `sourcesContent` claim was verified.** D-117 (c) rests on the explanations surviving in each `.js.map`; the build does emit `sourcemap: true`, but whether every stripped comment lands in a shipped map was not checked here.
- **One bundler, one browser.** Rolldown for bytes, Chromium for the probe. The re-entry conclusion is about the call graph rather than the engine, so it does not depend on the second; the byte figures depend on the first.

---

LSP plugin - available; used: findReferences on FAILURE_ADMISSION and on the seam driver's phase-opening members to enumerate the nine call sites and confirm that all thirteen existing re-entry assertions hold the private SeamDriver handle rather than reaching it through the behavior SPI.