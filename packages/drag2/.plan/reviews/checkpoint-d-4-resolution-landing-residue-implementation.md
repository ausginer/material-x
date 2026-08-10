# Checkpoint D review 4 — the landing residue: implementation record

Applies [`checkpoint-d-4-resolution-landing-residue.md`](checkpoint-d-4-resolution-landing-residue.md), which is normative for this pass. All seventeen §8 required items landed, plus the one test §6 specifies. **No production source changed.** `landing.ts` gains no guard, no landed liveness reading was removed, `README.md:57` is untouched, I-6's **Tier** cell is untouched, and nothing was added to any entrypoint or to the frozen SPI.

---

## What was applied

| § | File | Change |
| --- | --- | --- |
| 4.1 (sweep 1) | `contract/05` | I-36's invariant text replaced with the floor-plus-register form. Tier stays **C** |
| 4.2 (sweep 2) | `contract/05` | I-36's mechanism cell: `**The indirect-invocation clause is not new scope.**` block replaced; supersedes C3-03 §3.2 in place, per the decision — `checkpoint-d-3-resolution-c3-03.md` is historical and was not edited |
| 4.3 (sweep 3) | `contract/05` | I-6's mechanism cell gains one appended sentence bounding the tier-C participant half. **Tier cell untouched**; clause 3's headline retained verbatim |
| 4.4 (sweep 4) | `contract/05` | Tier legend gains the "a tier-C half needs a stated limit as well as a stated owner" sentence |
| 4.5 (sweep 5) | `contract/05` | F-47's enumeration row for the thunk → `animate()` gap: owner **feature**, verdict **conforming residue under I-36 (2)** |
| 4.6 (sweep 6) | `contract/05` | F-47's residue paragraph replaced. **The mandatory half** — the old text asserted a false fact about the available shapes |
| sweep 7 | `contract/05` | F-47's "Enumerating those one at a time does not terminate" gains the review-4 conclusion |
| 4.7 (sweep 8) | `contract/01` §Teardown | Converse-obligation clause replaced with the floor form plus the pointer to I-36 (2)/(3) |
| 4.8 (sweep 9) | `contract/03` §`y()`/`xy()` | The `03:410` paragraph is marked a register ceiling |
| sweep 10 | `ledger.md` L-12 | Residue sentence replaced with the classified form |
| sweep 11 | `plan.md` | Checkpoint D's residue bullet replaced. The sentence _"closing it means widening a frozen SPI type"_ is gone |
| sweep 12 | `plan.md` | New Checkpoint D bullet for **Checkpoint D review 4 (the landing residue)**, disambiguated at first use |
| sweep 13 | `plan.md` §Phase 18 | The I-36 deliverable is now per **module**, with the floor/ceiling classification step and the explicit "do not enumerate DOM method names" |
| sweep 14 | `plan.md` §Phase 21 | The re-base paragraph names `FeatureContext.live` at +6 B to +53 B as the first change queued behind it, `complete` 106 B → 53 B |
| sweep 15 | `tests/COVERAGE.md` | _Terminal barrier_ blockquote: floor rows and **ceiling** rows |
| sweep 16 | `tests/COVERAGE.md` | _The indirect half_ blockquote: the universal replaced with the bounded form; rows untouched |
| sweep 17 | `tests/COVERAGE.md` | The §6 case added, labelled **conformance pin, passes against current source** |
| 6 | `tests/sortable/features.browser.test.ts` | One case, in `describe('landing')` |

**`FeatureContext.live()` was not implemented.** It is deferred with its trigger, recorded in F-47 (§4.6), L-12, the Checkpoint D bullet and the Phase 21 re-base paragraph.

## §1's factual claims, spot-checked against the artifact

All four hold. The "conforming, not a defect" conclusion rests on them and each was read in source rather than taken from the decision.

1. **No paint between `animate()` and `cancel()`.** `armSettlement` calls `start` at `kernel.ts:1316` inside `driver.runLeaf`; the F-30 revalidation at `:1349` and `runner.destroy()` at `:1353` follow with no `await`, no rAF, no style flush. One synchronous stretch. `!settlementLive(attempt)` does follow from `rt.closed`, because `controller.destroy()`'s whole body is `rt.closed = true; host.destroy()` (`controller.ts:131-134`) and `host.destroy()` retires the attempt.
2. **`play`'s own `catch` prevents an orphan animation.** `landing.ts:150-156` bumps `generation` and calls `started.cancel()` before rethrowing, so the `handle === undefined` branch at `kernel.ts:1333` has nothing to leak.
3. **`done`/`fail` are inert on a retired attempt.** `completeLanding` returns at `kernel.ts:1165` on `settlement !== attempt || queue.closed` (I-4, D-28).
4. **`realm.window.matchMedia` is a third consumer-reachable call.** `landing.ts:103`, between the thunk (`:95-98`) and `animate()` (`:132`). Confirmed, and it is the decision's own demonstration that a single reading placed between the thunk and `animate()` would still leave one.

Every line citation in §1, §2 and §4.6 matched the artifact: `landing.ts:82-164`, `:95-98`, `:103`, `:132`, `:138`, `:150-156`; `kernel.ts:1245-1361`, `:1333`, `:1349`; `feature.ts:29-41`; `behavior.ts:70` (`assemble(features, { realm: host.realm, root: host.root, report })`); `landing()`'s factory is `brandFeature(() => ({ startLanding: start }))` and ignores the context it is handed. **All seventeen §8 anchors matched on quoted text.**

## Where the decision did not match the artifact

**One place, in §6, and it is an assertion in the test rather than anything normative.**

§6 specifies asserting that _"`onCancel` fired exactly once, from the `destroy()`"_. It does not, and that is a landed rule rather than a gap: **destroy is a teardown, not a settlement**, so the operation it retires announces no outcome. `composition.browser.test.ts` — _should tear down without a terminal callback when onReorder destroys_ pins exactly that, and `ARM_STALE` suppresses the replaced settlement independently. The case therefore asserts that **neither** terminal callback fires, which is strictly stronger than what §6 predicted and points the same way. The deviation is stated in the test's own comment beside the assertion. Nothing in the decision's argument depends on it: the five-act floor's act 4 concerns callbacks the _participant_ invokes after a closed reading, not the kernel's terminal announcement.

One item outside §8's list also had to move: **Review 4's introductory sentence in `plan.md`** — _"No architect decision was needed… the one thing that would have needed one is left open and stated rather than decided"_ — is falsified by this decision existing. It now says the four findings needed none and the residue was decided afterwards, with the link. Recorded in `plan.md`'s deviations bullet.

## The test, and what falsifies it

`tests/sortable/features.browser.test.ts` — `describe('landing')` › _should leave nothing behind when the duration thunk destroys the controller_.

A drag is composed with `landing({ duration: () => { controller.destroy(); return 200; } })` and driven to release through real pointer input, with `animate` instrumented **on the item** (no `visual()` is composed, so the item is its own visual).

It is a **conformance pin, not a regression pin**: it passes against current source, guards no barrier, and no source change accompanies it. Asserted on the instrumented element rather than on resulting state: `calls` is exactly `['animate']` — the residue's whole size. Then, that nothing of it outlives the operation: no animation on the item, no inline transform, no placeholder, nothing in `errors`, nothing in `reported`, and no terminal callback.

**What falsifies it** — each corresponds to the residue acquiring a consequence the operation outlives, which is precisely what would move it from conforming to defect under I-36 (2):

- a second consumer-reachable `animate()` after the thunk (the call list would read `['animate', 'animate']`);
- an animation, or a transform, surviving teardown — i.e. the residue reaching act 3;
- a publication or a report escaping (`errors`/`reported` non-empty) — act 1;
- a terminal callback firing for an operation `destroy()` retired.

**Verified sensitive rather than vacuous.** Removing the kernel's F-30 handle disposal — the `runner.destroy()` inside the `!settlementLive(attempt)` branch at `kernel.ts:1349` — makes it fail on `expect(item.getAnimations()).toEqual([])` (received one `Animation`). The mutation was reverted; `git status` shows `src/kernel/kernel.ts` unmodified.

## Verification

Recorded in the report accompanying this pass: `fmt`, `lint-fix`, `typecheck`, `test` and `size` all green, and **size unchanged** — the decision costs 0 B and no production source changed.

## What remains open

- **The residue is classified, not closed.** `landing()` still calls `matchMedia` and `animate()` after the thunk. `FeatureContext.live` is the decided remedy, measured at **+6 B to +53 B**, deferred to Phase 18/21 behind Phase 21's budget re-base, with the trigger stated in F-47.
- **The ordering constraint for whoever lands it**: `assemble()` runs before `rt` exists, so the closure is late-bound and a feature factory must not call it at construction. The "externally inert factory" rule already forbids that; it becomes load-bearing when the change lands and should be said in `feature.ts`'s doc comment then.
- **The register has two entries** (`contract/03`'s candidate-loop paragraph and `README.md:57`), named inline in I-36 (3). At four it should become a table in `05` beside the F-47 enumeration.
- **The five-act floor is a first version.** A sixth act — a consumer-observable side effect that is neither a publication nor a declared callback — is a one-row edit to a closed list, which is the whole difference from what it replaced.
- **A consumer-supplied `landing({ run })` runner stays unguardable**, and under (3) that is now a positive statement: the site carries no ceiling.
- **Untouched, confirmed**: C2-01's mechanism, C3-01's boolean return channel, C3-03's tier split (including I-6's Tier cell and clause 3's headline), D2, D5, **L-11**'s Phase 23 deferral, `README.md:57`, the frozen SPI and every public entrypoint.