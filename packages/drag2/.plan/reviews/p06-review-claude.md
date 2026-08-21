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

| # | Finding | Class |
| --- | --- | --- |
| P06-01 | case 3's blast radius is understated, and the fixtures test only the small half | correctness-adjacent, **acknowledge before merge** |
| P06-02 | the DEV instrument makes `n` unguarded consumer calls and can resurrect a retired cache | DEV-only, unsound justification |
| P06-03 | the D-101 gate's "one binding per tier" is not a tier rule and can never fail alone | test polish |
| P06-04 | "comments are stripped" is block comments only | test polish, live foot-gun |
| P06-05 | the published size correction's own diagnosis is falsified | documentation |
| P06-06 | the re-base has no written reason where the file's own rule requires one | documentation |
| P06-07 | D-101's ledger row still locates the bare read in `rect-index.ts` | documentation |

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