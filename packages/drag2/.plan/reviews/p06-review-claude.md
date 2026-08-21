# P-06 — final review of the verified incremental refresh

- **Reviewer:** Claude
- **Date:** 2026-08-21
- **Subject:** P-06 as implemented, against D-100, D-101, D-102 and [`p06-verified-refresh.md`](../p06-verified-refresh.md)
- **Tree:** `2a1df6f4` on `drag2/phase22-p06`, working tree clean

**Scope.** The current tree against the three decisions and the design record. Not a redesign of the optimization, not a re-opening of `k`, the eager window or the eight-condition boundary, and no P-01/P-02 work. Every claim below was checked by mutating the tree, running the gates, and restoring it.

## Baseline

| Gate                 | Result                                |
| -------------------- | ------------------------------------- |
| `npx just typecheck` | clean                                 |
| `npx just test`      | 56 files, **1091 passed, 99 skipped** |
| `npx just size`      | green, all **12** rows within budget  |

Re-verified after the last mutation; `git status --short` empty.

## Verdict

**P-06 is sound.** The eight gates are all enforced, at one entry, with no path that reuses incremental state across an external invalidation, an abort, a retirement, a version change, a custom box or `xy()`. The wrapper's mirror of `RectIndex` is correct at every lifecycle transition I could construct. `k = 8` binds exactly. The equivalence instrument genuinely discriminates and heals correctly before it throws. D-102 is satisfied structurally and to the byte, and the size re-base reproduces exactly from fresh builds with headroom preserved.

**Nothing blocks merging on correctness.** Seven findings, one of which I would want acknowledged before merge because it corrects a risk statement rather than a sentence.

| # | Finding | Class | Disposition |
| --- | --- | --- | --- |
| P06-01 | case 3's blast radius is understated, and the fixtures test only the small half | correctness-adjacent, **acknowledge before merge** | **Decided as D-103 and fixed.** Second in-span witness at `hi − 1`, five replacement fixtures |
| P06-02 | the DEV instrument makes `n` unguarded consumer calls and can resurrect a retired cache | DEV-only, unsound justification | **Fixed.** `verify` threads `live()`; on abort it stops, retires and reports nothing |
| P06-03 | the D-101 gate's "one binding per tier" is not a tier rule and can never fail alone | test polish | **Fixed.** A tier is the top-level directory under `src/`; the third assertion pins tiers, not files, so the first can fail alone |
| P06-04 | "comments are stripped" is block comments only | test polish, live foot-gun | **Fixed.** Line comments stripped too, and the gate now states that it text-matches rather than parses |
| P06-05 | the published size correction's own diagnosis is falsified | documentation | **Fixed.** The stale-build explanation is withdrawn; the substantive correction stands |
| P06-06 | the re-base has no written reason where the file's own rule requires one | documentation | **Fixed.** A P-06/D-102 entry and the current landed figures are in the `budget` docblock |
| P06-07 | D-101's ledger row still locates the bare read in `rect-index.ts` | documentation | **Fixed.** Row marked implemented and relocated to `verified-refresh.ts` |

**All seven are dispositioned as of 2026-08-21.** The remediation record — what changed, what was falsified, and what the two environmental notes were left at — is §Remediation at the foot of this file. Nothing in it reopens P-06's architecture, `k = 8`, or its measured performance: the second witness is skipped for a one-row span, which is the span the M-4′ workload commits, so the before/after table is unchanged and was re-run to confirm.

## What was verified, and how

### The eight gates, at one entry

Conditions 3, 4, 5 and 7 are one conjunction in [verified-refresh.ts:445-453](../../src/sortable/verified-refresh.ts#L445-L453); 6 and 8 are inside `shift`; 1 and 2 are structural — `y.ts` is the only importer of the module, and `getBox === null` is tested directly. There is a ninth conjunct, `last !== gap`, which the code declares is not one of the eight and justifies correctly: an empty span has no in-span witness and therefore yields no `δ` to verify.

### The mirror, traced across every transition

The wrapper answers warm only when `pending === 0 && seen === snapshot.version`. `pending === 0` holds in exactly four states — initial, after a full scan, after an applied fast path, after `forget()` — and in the two that do not imply a current buffer (initial, forgotten) `seen` is `-1`, which no snapshot version equals. So **warm implies current**.

The converse matters more, and holds too: whenever the wrapper _delegates_, `RectIndex` is genuinely dirty or version-mismatched, so its own warm short-circuit can never stand in for a scan the wrapper wanted. `invalidate()` raises both bits; `retire()` and `abort()` clear the wrapper to `-1` while leaving the cache dirty; an applied fast path leaves the cache dirty and the wrapper clean, which is the one documented divergence and is safe in the direction it diverges.

`abort()` is the single exit for the entry barrier, a witness read and the delegated scan's own barriers, and `RectIndex.retire()` is idempotent, so the double call on the last of those costs a call and no second meaning.

**Placeholder moves outside the bracket cannot make `last` stale.** `movePlaceholder` has three call sites — the committed-move bracket, `release.effect`, and `homeGap` inside `anchorTarget` — and the latter two are terminal: no `measure()` follows either, and `measureInsertion` has exactly one call site, so the reason signal cannot be raised after them.

### `k = 8` binds exactly

Seventeen consecutive committed moves, reading which path serviced each: **`FFFFFFFFSFFFFFFFF`**. Eight fast paths, one forced full scan, eight more. A refusal also resets the counter, so the drift window is bounded in the conservative direction.

### The instrument discriminates, and the mutation table is honest

All four rows reproduce exactly against the whole `tests/sortable` suite:

| Mutation | Claimed | Measured |
| --- | --- | --- |
| `δ` applied to `[lo, hi]` instead of `[lo, hi)` | 8 in 3 files | **8 in 3 files** — incremental-refresh ×4, displacement ×2, input-policy ×2 |
| drop the suffix witness | 4 | **4** |
| accept any pending invalidation instead of exactly one | 2 | **2** |
| never re-synchronise | 1 | **1** |

The load-bearing row's failures include _should reorder from the grip with real input_, which is the claim that matters: the assertion guards the fast path where it actually runs, through composed drags driven by real browser input, not only through the direct-drive fixture.

The instrument is independent in the sense that matters — it re-reads the DOM and compares against the packed buffer by a wholly different route from `shift`. It is coupled to condition 2 implicitly (it reads `item.getBoundingClientRect()` rather than going through `getBox`), which is correct only because `getBox === null` is a gate; that coupling is undocumented but not currently wrong.

### Healing before throwing is correct

`last`, `moves` and `pending` are committed at [verified-refresh.ts:461-463](../../src/sortable/verified-refresh.ts#L461-L463) _before_ `verify` runs, and `verify` writes the authoritative full scan back as it compares. So a reported mismatch leaves the wrapper claiming clean and the buffer genuinely clean — consistent, not merely correct-in-the-message. The one asymmetry is that `moves` is not reset by the heal even though a full scan just happened, which shortens the next drift window rather than lengthening it.

### D-102, structurally and to the byte

`src/sortable/y.ts` is the only importer of `verified-refresh.ts`; [xy.ts](../../src/sortable/xy.ts) imports `domain`, `feature` and `rect-index` and nothing else. `git diff b3395c78 HEAD -- src/sortable/rect-index.ts` is **empty** — the residue is zero, which is stronger than the falsifier D-102 set. `bench/size` lists the module in `minimal (xy)`'s `absent` and in all five `y()` compositions' `present`. Wiring a reachable `createVerifiedRefresh` into `xy()` fails both rows:

```
✗ minimal (xy) over budget by 206 B (11146 > 10940)
✗ minimal (xy) pulls sortable/verified-refresh.js, which it does not install
```

Every published size figure reproduces to the byte from independently built, isolated worktrees of the three states, including the folded column: `minimal (xy)` is **10 787 B** at HEAD and at `b3395c78`. Headroom moved from 147–155 B to 150–162 B, so "preserved at ~150 B" holds and the re-base is very slightly generous rather than absorbed.

### `__DEV__` is not published and not kernel-coupled

The built `sortable/verified-refresh.js` exports `createVerifiedRefresh` alone; `setRefreshVerification`, `verifying`, `DEV` and `__DEV__` do not appear in any built `.js` or `.d.ts`. `package.json` has no wildcard export, and both `tests/exports.node.test.ts` and `tests/consumer.node.test.ts` pin the surface as an equality against the packed tarball. Replacing the bare read with `import { DEV } from '../kernel/dev.ts'` is caught — by the vocabulary test only; `npx just typecheck` passes on that mutation, which is exactly the hole D-101 exists to close, and it holds.

## P06-01 — case 3's blast radius is understated, and the fixtures test only the small half

**Correctness-adjacent. Not a defect in the code; a defect in the stated risk and in the negative fixture's coverage.**

D-100 case 3, the D-100 ledger row and [verified-refresh.ts:65-66](../../src/sortable/verified-refresh.ts#L65-L66) all characterise a `transform` on a single row the same way: it _"moves one row and nothing else"_, and `k` bounds how long that one row can be wrong.

**That is true only while the transformed row is not the in-span witness.** Row `lo` is the row that _yields_ `δ`. A pure `translateY` on it survives every guard in `shift` — the height is preserved so `anchor.bottom - values[BOTTOM] === delta`, and `left`/`right` are untouched — so `δ` is measured as the flow shift **plus the transform** and then applied to the entire span. Row `lo` lands correct by construction; every row in `(lo, hi)` is wrong by the transform amount, and the after-, suffix- and before-witnesses are all genuinely unchanged, so nothing refutes.

Measured on a 12-row field with span `[2, 6)`, sweeping `resolve` at 1 px against a control geometry that only ever full-scans, 529 probes:

| perturbation | fast path taken | pointer positions where the answer differs from a full scan |
| --- | --- | --- |
| `translateY(7px)` on row 3 — a non-witness in-span row, the shipped fixture's shape | yes, 4 reads | **6** |
| `translateY(7px)` on row 2 — the **in-span witness** | yes, 4 reads | **22** |

The shipped negative fixtures perturb `rows[3]` and `rows[4]` against a `[2, 6)` span, so both pick non-witness rows and the amplifying variant is untested. The instrument does catch it — my probe had to disable verification to observe the un-healed buffer — so this is not a hole in the assertion. What is wrong is the risk envelope: the accepted case-3 trade is not "one row wrong for up to eight moves" but "up to `hi − lo − 1` rows wrong for up to eight moves", and the analysis that made `k = 8` acceptable was reasoning about the smaller figure. The `k` bound on _duration_ is unaffected.

## P06-02 — the DEV instrument makes `n` unguarded consumer calls and can resurrect a retired cache

**DEV-only, so not a shipped defect. Recorded because the justification given for it is unsound and the failure it produces is misleading.**

[verify](../../src/sortable/verified-refresh.ts#L193-L247) calls `item.getBoundingClientRect()` once per candidate with **no `live()` reading between any of them**, and closes with `index.count = n; items.length = n`. That trailing pair is precisely the bookkeeping `RectIndex`'s own `abort()` comment says must not run after a retire, on the grounds that it would be _"resurrecting a retired cache, marking it clean, and pinning every row of the list in a destroyed controller against I-20."_

Driven directly — a row that calls `retire()` from inside its own overridden `getBoundingClientRect()`, firing during `verify`'s scan rather than during the four witness reads:

```
fired: true   readsAfterRetire: 17   threw: "drag: the incremental insertion refresh disagreed with a full scan…"
```

Seventeen further consumer calls after teardown, the retired cache repopulated with every row, and a throw that blames the span hypothesis for what was actually a destroy — classified `FAILURE_INVALIDATION` and surfaced on `onError`. The wrapper's own `forget()` stops the resurrected buffer from being _used_, which is why this is not a correctness blocker, but nothing clears the element references again if the destroy was terminal.

The module's stated reason is: _"It takes no liveness readings of its own. It runs only after the fast path has already completed, which took one within the same synchronous window."_ That reading was taken before `verify`'s `n` consumer calls and says nothing about them; it is the same one-call-too-early placement C4-01 corrected in the candidate loop.

## P06-03 — the D-101 gate's "one binding per tier" is not a tier rule and can never fail alone

**Test polish.** `tests/kernel/vocabulary.node.test.ts` computes a tier as `dirname(file)`. A second binding at `src/sortable/sub/a.ts` therefore sits in its own "tier" and **passes** assertion (1); only assertion (3), the explicit two-file list, catches it.

More structurally, (1) is subsumed by (3): a list pinned to exactly two distinct files cannot contain a directory with two members unless (3) fails too, so (1) can never fail on its own. The plan presents the three as _(1) the rule … (3) the positive half, and the reason the two negatives are not enough on their own_ — as enforced, that is inverted: (3) does the work and (1) is redundant. The gate is still effective for the tree it has; it is the stated rule, and its extensibility to a future `sortable/dev.ts`, that the implementation does not carry.

Two scope gaps go unstated: only `src/**/*.ts` is walked, so `.tsx` files and everything under `bench/` and `tests/` are outside the gate, and the `globals.d.ts` exemption matches on basename anywhere in the tree.

## P06-04 — "comments are stripped" is block comments only

**Test polish, and a live foot-gun.** The scanner strips `/* … */` and nothing else. Verified by probe, each against `src/sortable/xy.ts`:

| probe | result |
| --- | --- |
| `// a line comment mentioning __DEV__` | fails assertions (1) and (3) |
| `export const S = "mentions __DEV__ in a string";` | fails assertions (1) and (3) |
| a genuine second binding fenced by string literals holding `/*` and `*/` | **8 passed** — invisible to all three |

So the plan's _"Comments are stripped before matching, so the prose stating the rule cannot satisfy or violate it"_ is false for the comment style these modules use most heavily: [verified-refresh.ts](../../src/sortable/verified-refresh.ts) carries several `//` blocks, and one of them acquiring the token `__DEV__` would fail the suite with no code change. The third probe is contrived and I would not weight it on its own, but together they establish the gate is text-matching rather than parsing, which the prose does not say.

## P06-05 — the published size correction's own diagnosis is falsified

**Documentation.** §What D-101 and D-102 settled corrects the record's `+135 B` / `+135 to +164 B` figures, and attributes them to a stale build: _"`bench/size` bundles the package's **built** output, and `just test` — unlike `just size` — does not build first, so the comparison that produced them measured one state against a build of another."_

Both halves are wrong. `tests/bench/size.node.test.ts` spawns `tsdown` and awaits a build in `beforeAll`, with a comment saying so, and that file is identical at `b3395c78` and at HEAD — the size suite builds first too. And building the folded state `81ebf1eb` cleanly in an isolated worktree reproduces those overruns _exactly_: 135 on `minimal (xy)`, 164 on `+ layoutAnimation`, 149/156/141/152/155 on the rest. No stale build is required to produce them.

**The substantive correction stands** — they were budget overruns misread as size deltas, and the real carried `xy()` cost was 288 B — and it is the direction that matters, so the conclusion is unaffected. Only the attributed cause is unsupported, and it is stated as the reason the first figures were wrong. D-102's ledger row still quotes `+135 B` as the measured cost.

## P06-06 — the re-base has no written reason where the file's own rule requires one

**Documentation.** `bench/size/measure.ts`'s `budget` docblock still ends on the **pre-P-06** landed figures — minimal 10 738, minimal (xy) 10 787, `+ layoutAnimation` 11 162 — beside budgets re-based to the P-06 numbers, and its running re-base narrative stops at _"Re-based again 2026-08-19, Phase 21 (M-3′)"_. There is no P-06 or D-102 entry. The file states the rule against itself: anything larger than the headroom _"comes back here and is re-based on purpose, with its reason written down."_ The numbers moved; the reason lives only in the plan document.

## P06-07 — D-101's ledger row still locates the bare read in `rect-index.ts`

**Documentation.** The row reads _"`rect-index.ts`'s bare read is **ratified as the correct form**"_. D-102 then moved the binding into `verified-refresh.ts`, and `rect-index.ts` is byte-for-byte its pre-P-06 self — so the row ratifies a read in a file that contains none. Unlike D-100 and D-102, the row also carries no **Implemented** marker, although the plan records D-101 as ratified, landed and gated, and the deferred-decision table is empty with `tests/decisions.node.test.ts` green.

## Two environmental notes, neither introduced by P-06

**Budget enforcement is manual.** `describe.skipIf(!ENFORCE_BUDGETS)` mutes the budget rows in `just test` unless `DRAG2_SIZE_BUDGETS=1`, and the only workflow under `.github/` is a docs publish — no CI job runs tests, typecheck or size. The graph-absence assertions _do_ run in `just test`, so D-102's structural half is covered by the ordinary suite; the "budgets stay red until" half rests on someone running `npx just size`.

**One perf self-test is load-sensitive.** `tests/perf/m5.browser.test.ts` _should report a difference that tracks a cost injected into window 1_ failed once during a parallel run — `expected 1.200000001117587 to be greater than 1.200000001117587`, the two injected costs having saturated to an exact 3× ratio. It passed 3/3 in isolation and the final quiet full run was green. M-5 is not P-06's instrument and the file is untouched by this branch.

## Does anything block merging

**No.** The shipped code is correct at every gate I could drive, the instrument that makes it admissible discriminates through real composed drags, and D-102's boundary is met to the byte with `xy()` and free drag at zero.

P06-01 is the one finding I would want dispositioned rather than filed, because it is not a wording defect: the accepted case-3 trade costs more than the three places that state it say, and the negative fixtures do not exercise the variant that costs more. P06-02 is confined to builds no consumer can install, but its stated justification does not support it. P06-03 through P06-07 are polish on gates and records that are otherwise doing their job.

LSP plugin - available; used: `documentSymbol` on `src/free-drag/assemble.ts` in an earlier pass this session; not used for P-06, where the work was mutation-and-run falsification, runtime observation of buffer divergence, and comparing published figures against fresh builds.

---

## Remediation

**Landed 2026-08-21**, after the review. Seven findings, seven fixes, no architectural change.

### P06-01 → D-103 — the second in-span witness

The finding was accepted as a decision rather than a patch, because what it corrects is a **risk statement**, not a line: the accepted case-3 trade was written as "one row" and is "up to `hi − lo − 1` rows" whenever the drifting row is the one `δ` is measured from. `shift` now reads a second in-span witness at `hi − 1`, compares it on the same four quantities as the anchor, and requires the two to agree on `δ`. It is skipped when `hi − lo === 1`, where the two would be the same row.

**The performance record does not move, and that is checkable rather than asserted.** M-4′'s workload oscillates between adjacent slots, so every committed move it measures has a one-row span and takes the same four reads it took before D-103 — the structural rows in `m4-prime` that pin `rebuild === 4` still pass untouched. The five-read case is asserted separately, in `incremental-refresh`, alongside the four-read one-row-span case.

**The fixtures replace D-100's single "a row transformed mid-drag" with five**, and two of them are the point:

| fixture | against the tree without the second witness |
| --- | --- |
| `translateY` on row `lo` — the anchor | **took the fast path** with an inflated `δ` applied to the span |
| `translateY` on row `hi − 1` | **took the fast path**; nothing looked at that row |
| `translateY` on an after, suffix or before witness | refused, as before |
| `translateY` on a strictly interior row, instrument **on** | reports a mismatch |
| `translateY` on a strictly interior row, instrument **off** | **exactly one slot** of the packed buffer differs from a fresh scan |

**Two fixtures were added that the review did not ask for**, because the mutation pass found the four-quantity comparison itself uncovered: dropping the `bottom` test, or the `left`/`right` pair, from `translation` changed nothing the suite could see. Both are now driven over a **one-row span**, where the perturbed row is the only in-span witness — over a wider span D-103's second witness refuses first and the fixture would be testing that instead. A `scaleY` isolates `bottom` (the flow does not move, so no other witness has anything to report, and only the paired test can tell a grown row from a translated one); a combined `translate(5px, 7px)` isolates `left`/`right` (a horizontal move alone is refused by the `δ === 0` test, so it is paired with a vertical one that makes `δ` look honest).

The last row reads the buffer directly, through a `createVerifiedRefresh(createRectIndex())` driven over its own DOM, rather than inferring the radius from the gaps `resolve` happens to propose — a `resolve` sweep would pass on a buffer with two wrong rows if neither changed an answer. It carries a control on the same fixture without the perturbation, which must show none.

### P06-02 — liveness through the equivalence scan

`verify` now takes a liveness reading between every candidate read and everything after it, exactly where the candidate loop takes one. On abort it **stops, leaves the cache retired, and reports nothing** — the caller retires and returns `false`.

The "reports nothing" half is the sharper one and is asserted on its own: a partially completed scan legitimately differs from the fast-path buffer, so an instrument that compared one would turn a correct teardown into a spurious mismatch blaming the span hypothesis for a destroy. Four fixtures — the read count stopping on the row that closed the controller, the cache left empty, no throw, and a control that still throws when nothing tore down.

The module's old justification is replaced rather than reworded. **"It is `DEV`-only" was the wrong reason**: this repository builds `__DEV__` as `true`, so every in-repo fixture runs the instrumented path, and an instrument that skipped I-36 would make the dev build violate an invariant the shipped build holds.

### P06-03 / P06-04 — the `__DEV__` gate matches the rule it states

A tier is now the **top-level directory under `src/`**, so a second binding at `sortable/sub/a.ts` fails the rule it plainly breaks. The third assertion pins the set of **tiers** rather than of files, which is what lets the first fail on its own. Line comments are stripped as well as block comments.

The gate now **states its limits instead of implying a parse**: a string literal carrying the token counts as a read, a binding fenced by string literals holding comment delimiters is invisible, and only `src/**/*.ts` is walked. All three are accepted — the failure mode of a text match is a loud false positive, fixed by rewording, rather than a false negative that ships, and closing the gap properly needs a TypeScript parser this rule does not justify.

**Falsified in five directions**, each landing where the rule says it should: a sub-directory binding fails assertion (1) alone; a binding in a new tier fails (3) alone; **moving the binding between `sortable/` modules fails neither**, which is correct because the rule is about tiers; a line comment mentioning the token passes; a string literal containing it fails.

### P06-05 — the diagnosis is corrected, the correction stands

The stale-build explanation is withdrawn, in the record and in D-102's ledger row. The review is right on both halves: `tests/bench/size.node.test.ts` builds in `beforeAll`, and the overruns reproduce exactly on a clean build of the folded state. What happened is that an `over budget by N B` row was read as a delta. **The substantive correction is unchanged** — the real carried `xy()` cost was 288 B, larger than first reported, so nothing drawn from it moves.

### P06-06 — the re-base has its reason where the rule requires it

`bench/size/measure.ts`'s `budget` docblock gains a P-06/D-102 entry in its running narrative and its landed figures are brought forward to the current ones. The entry records what the headroom caught (a module appearing), why the re-base was withheld until D-102 landed, that `minimal (xy)` and every free-drag row **do not move**, and that the split costs ~66 B more on the `y()` side than the folded form — stated rather than netted off against the 288 B it removed.

### P06-07 — D-101's row

Marked **Implemented**, and the ratification relocated: it is of the _form_, and the binding moved to `verified-refresh.ts` with the rest of P-06 on the same day D-102 landed.

### The two environmental notes

Both left as the review found them, deliberately. **Budget enforcement staying manual** is a repository-workflow question that predates this branch and is not P-06's to settle — D-102's structural half runs in the ordinary suite either way. **M-5's load-sensitive self-test** is another measurement's instrument, in a file this branch does not touch; it is recorded here so the next reader of that file meets it already known rather than as a fresh flake.

### Gates after remediation

Twelve mutations of the fast path, each run against the whole sortable suite — the last two found the gap the two extra fixtures above close: shift-one-row-too-far (10 tests in 3 files), drop the suffix witness (7), accept any pending invalidation (2), never re-synchronise (1), mirror never clears on abort (1), remove the second in-span witness (5), read it without requiring `δ` agreement (2), put it at `lo + 1` (6), drop the liveness reading inside `verify` (2), report the mismatch on abort (2), drop the `bottom` test from `translation` (1), drop its `left`/`right` pair (1). Five `__DEV__`-gate mutations as above. Size gates green with the re-based budgets, `xy()` and free drag unchanged.