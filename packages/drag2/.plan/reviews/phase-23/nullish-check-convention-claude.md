# The nullish-check convention and its source sweep, reviewed at `80fcdccf`

Review, 2026-08-26. Files read at `80fcdccf`. **No production code changed.**

Reviewing the landed sweep against the convention it applies — [`code-style.md`](../../../../../.agents/docs/code-style.md) §Nullish checks — for **semantic correctness only**: whether any rewritten condition changes observable behaviour, narrowing or expression value, and whether any site was misclassified. The convention itself is taken as settled.

**Verdict: every one of the 99 conversions is semantically identical, and all 13 retained checks are correctly retained.** The population is closed and the arithmetic is exact: 112 exact-null comparisons before, 99 removed, 0 re-added, 13 remaining. Two findings, both **tier C**, neither in the rewritten code.

---

## 0. What was checked, and how

The sweep's own method — take each operand's type from the program, strip `null` and `undefined`, reject if anything remaining can be falsy — was **re-run independently** against the tsconfig program rather than read from the record, then extended with three checks the record does not claim.

| Check | Instrument | Result |
| --- | --- | --- |
| Population closure — 112 before, 13 after, 99 removed, 0 re-added | AST over both commits, plus a diff census | **Exact** |
| Rule 4: can any converted operand's non-nullish domain be falsy? | Type-checker over every truthiness position in `src/` | **No — 0 of 99** |
| `undefined` reachable in any converted operand's domain (`=== null` and `!x` differ there) | Same | **No — 0 of 99** |
| Expression value semantics: does any `&&`/` |  | `whose value escapes a condition now carry`null`/`undefined`? | Type-checker over all such nodes in `src/` | **None in the package** |
| The 13 retained checks, each typed and classified | Type-checker, full enumeration in §2 | **All correctly retained** |
| Hand-rewritten ternary and control-flow shapes | Read individually, §3 | **Pure arm swaps and reflows** |
| Suite | `vitest run` | 61 files, **1152 passed**, 116 skipped, **no type errors** |
| Size, both commits | `DRAG2_SIZE_BUDGETS=1 just size` on `88e13cd0` and `80fcdccf` | All 14 rows within budget; §5 confirms the record's claim |

---

## 1. The 99 conversions

**Nothing rewritten can behave differently.** The two ways a truthiness conversion breaks are a falsy member surviving in the domain and an `undefined` member that the exact check deliberately let through. Both were tested over the whole population, and both are empty:

- **Every converted operand is `X | null` with `X` an object, an array, a DOM node, a function or a class instance.** The type-checker reports no `undefined` arm anywhere in the 99, so `!x` and `x === null` partition the domain identically — and TypeScript narrows the two forms identically over such a type, which is why `just typecheck` is not merely green but uninformative here.
- **The three sites in `src/` where a truthiness test does stand over a falsy-capable domain are all pre-existing and none is a nullish check**: `kernel/presentation.ts:136` and `:356` test `string` where `''` is the meaningful case, and `sortable.stories.tsx:29` tests a bare `T | null`. The sweep touched none of them, correctly — a `string` with no `null` arm is outside this convention.

**Two shapes deserved a closer look than the type alone gives, and both are safe.**

- [`sortable/spec.ts:761`](../../../src/sortable/spec.ts) converts `ledger === null` to `!ledger` over `PlaceholderUndo = Array<() => void> | null`. The sentinel's partner value is `[]` — an _empty_ array, written one screen earlier at line 730 — and an empty array is truthy, so the branch is unchanged. This is the one site in the sweep where the falsy-looking value is real and the language saves it.
- [`kernel/kernel.ts:931`](../../../src/kernel/kernel.ts) rewrites a ternary condition to `queue.closed || current.operation ? null : admitted`. `||` binds tighter than `?:`, so the grouping is what it was. `OperationIdentity` is `Readonly<{ id: number }>` — an object, not the counter it wraps — so the `id: 0` trap this shape invites does not exist. (`nextOperationId` starts at 1 in any case; the object is the reason it does not matter.)

## 2. The 13 retained checks, enumerated

Every remaining exact-null comparison in `src/`, with the operand type as the program reports it. The table is the whole population, not a sample.

| # | Site | Operand type | Non-nullish domain | Why it is kept |
| --- | --- | --- | --- | --- |
| 1 | `kernel/errors.ts:33` | `FailureStage \| null` | `1…11 \| 14` | numeric union |
| 2 | `kernel/seams.ts:421` | `unknown` | `unknown` | unknown |
| 3 | `kernel/seams.ts:440` | `Prepared \| null` | `Prepared` | type parameter |
| 4 | `kernel/seams.ts:606` | `unknown` | `unknown` | unknown |
| 5 | `kernel/kernel.ts:1420` | `Readonly<{ id: number }> \| null` | object | typing — mid-chain in a `(): boolean` arrow |
| 6 | `kernel/kernel.ts:1431` | `Readonly<{ id: number }> \| null` | object | typing — same |
| 7 | `free-drag/assemble.ts:67` | `T \| null` | `T` | type parameter |
| 8 | `sortable/assemble.ts:40` | `T \| null` | `T` | type parameter |
| 9 | `sortable/placement.ts:67` | `string \| null` | `string` | `''` reachable |
| 10 | `sortable/placement.ts:160` | `string \| null` | `string` | `''` reachable |
| 11 | `sortable/spec.ts:604` | `KeyboardDirection \| null` | `110 \| 111` | numeric union |
| 12 | `sortable/spec.ts:989` | `Insertion \| null` | object | judgment — §4 |
| 13 | `sortable/spec.ts:1241` | `unknown` | `unknown` | unknown |

**Three of these are load-bearing rather than merely admissible, and it is worth naming which.**

- **Rows 9 and 10 are the convention's fourth rule doing exactly the work it was written for.** Both operands come from `getAttribute`, and `placement.ts:55-64`'s own comment is about `style=""` — a _present, empty_ attribute that Chromium leaves behind. Truthiness there would read the empty attribute as an absent one and restore the wrong state, which is D-39's guarantee stated as an attribute-map comparison. This is not a hypothetical falsy member; it is the documented one.
- **Rows 2 and 4 protect a falsy staged command.** `staged` and the value `consumeStaged()` returns are `unknown`, and a behavior may stage `0` or `''` as a legitimate command; `seams.ts:606` then decides whether `execute` runs at all. Truthiness would silently drop a falsy command.
- **Rows 5 and 6 are typing, not meaning, and the record says so.** `settlementLive` and `joinLive` are `(): boolean` arrows and the comparison sits mid-chain, so `current.operation` alone would give the whole `&&` chain type `boolean | null` and fail the annotation. Row 13's neighbour at `kernel.ts:1419` is `!cancelRequest` in the same chain — `!x` is always `boolean`, which is why one converted and the other did not.

**Row 13 is conservative rather than necessary, correctly.** `staged.cancelReason` is declared `unknown`, but every producer in the file writes `null`, `CANCEL_ITEM_REMOVED` or `CANCEL_COLLECTION_INVALIDATED`, so the real domain has no falsy member and no `undefined` arm. The sweep classified it from the declared type and kept it; a classifier that reasoned about producers instead would be a classifier that can be wrong.

## 3. The hand-rewritten shapes

Six sites were not a token substitution. All six are semantically identical.

- **Four ternary arm swaps** — [`free-drag/geometry.ts:32`](../../../src/free-drag/geometry.ts), [`shared/landing-runner.ts:119`](../../../src/shared/landing-runner.ts), [`sortable/spec.ts:403`](../../../src/sortable/spec.ts), [`sortable/y.ts:211`](../../../src/sortable/y.ts) — each negates the condition and exchanges the arms. The condition is still evaluated once, exactly one arm still runs, and the arms are unchanged expressions. `landing-runner`'s is the one worth checking by hand because D4 turns on _when_ `timing` is called: it is still called in the taken arm, still before the reduced-motion collapse, and `Math.hypot` is still evaluated only on that arm.
- **Two assignments of the same form** at `free-drag/spec.ts:173-174` and `sortable/spec.ts:730`, both `c === null ? null : v` → `c ? v : null`.
- **One reflow**, `sortable/spec.ts:1575`: a two-conjunct `if` that no longer needs three lines. The conjuncts, their order and their nesting are unchanged.

**Nothing else is in the commit.** A census of every added and removed line that is not an exact-null comparison returns only these reflows, the swapped ternary arms and the moved comment inside `landing-runner`'s object literal. No behaviour was edited under cover of the sweep.

## 4. `sortable/spec.ts:989`, the retained exception

The brief asks whether the documented sentinel semantics justify it. **They do, but on the weaker of rule 3's two clauses, and the record should not be read as claiming more.**

Rule 3 admits an exact check in two situations: where `null` and `undefined` are different answers, or where `null` is a sentinel the surrounding code reasons about by name — _a documented "there is no such thing" against a value that merely has not arrived_. **The first does not apply**: `resolved` is `Insertion | null` with no `undefined` arm, so there is no "has not arrived" to contrast with. The second applies literally — [`spec.ts:983`](../../../src/sortable/spec.ts) opens with the backticked expression and glosses it: _`resolved === null`: the incumbent slot still wins_.

**Two things make it survive scrutiny rather than merely pass on a technicality.**

- **The sentinel is genuinely a value with a name, not an absence.** `slots.resolveInsertion` returning `null` here is a decision — _commit nothing_ — and it is one of two outcomes the comment enumerates, beside `host.closed`. That is a different thing from a missing object.
- **The sibling site is not the same decision spelled differently.** `spec.ts:1331` tests the _same slot's_ result with `!resolved` — but one line earlier, at 1313, `?? draft.insertion` has already consumed the sentinel, so `null` there means _no insertion at all_, a broken invariant that raises `release-no-insertion`. Two spellings, two meanings; the exception is not an inconsistency.

**The residue is that nothing but the comment marks it.** It is the only `X | null`-with-object-payload site in `src/` retaining an exact check, so a reader who has internalised the sweep will read every surviving `=== null` as type-driven and find that one is not. The comment is the marker, and it works only because it quotes the spelling — which is also the reason converting it would have left the prose describing code that is no longer there. Recorded as context, not as a finding.

## 5. Measurement

Both commits were measured with budgets unmuted. The record's claim — _every measured row moved down and the two control rows did not_ — holds exactly.

| Row                       | `88e13cd0`        | `80fcdccf`        |
| ------------------------- | ----------------- | ----------------- |
| minimal                   | 10.27 kB          | **10.24 kB**      |
| minimal (xy)              | 9.92              | **9.89**          |
| minimal + layoutAnimation | 10.72             | **10.68**         |
| minimal + landing         | 10.54             | **10.51**         |
| complete                  | 10.96             | **10.92**         |
| free drag minimal         | 8.07              | **8.05**          |
| free drag + bounds        | 8.23              | **8.21**          |
| free drag + landing       | 8.34              | **8.31**          |
| free drag complete        | 8.51              | **8.47**          |
| both behaviors            | 12.39             | **12.36**         |
| kernel root - kernel.js   | 6.13              | **6.11**          |
| baseline A                | 10.64             | **10.62**         |
| vocabulary root - drag.js | 0.16 (0.05 under) | 0.16 (0.05 under) |
| baseline B                | 6.89 (0.15 under) | 6.89 (0.15 under) |

**Both control rows are byte-identical for structural reasons, and both reasons are checkable.** The vocabulary root is `kernel/errors.js` alone, whose single nullish check is row 1 of §2 — kept. Baseline B measures the _other_, shipped package, which this commit does not touch. The row stays at 159 B against its 205 B ceiling, unchanged from D-134's calibration.

**No budget re-bases, correctly.** Every row gained headroom and a ceiling follows an artifact upward and never down.

---

## 6. Findings

Neither is in the rewritten code. Both are in the registers that record it.

### F-115 (proposed) — the sweep's own record mis-tallies two of its six retained classes, and the error is self-concealing (tier C)

[`plan.md` §The nullish-check convention, applied 2026-08-26](../../plan.md) classifies the thirteen retained checks:

> Three operands are `unknown` and **two are the bare type parameters `Prepared` and `T`** … Two are `string | null` where `''` is reachable, and **three are numeric unions — `FailureStage`, `KeyboardDirection`**.

**Measured against the tree, the last two counts are exchanged.** There are **three** type-parameter sites — `Prepared` at `seams.ts:440`, and `T` at _both_ `sortable/assemble.ts:40` and `free-drag/assemble.ts:67`, two copies of the same `claim<T>` helper in two behaviors — and **two** numeric-union sites, `FailureStage` at `errors.ts:33` and `KeyboardDirection` at `spec.ts:604`. §2's table is the full enumeration; there is no third numeric union anywhere in `src/`.

**The sentence names two type parameters and two numeric unions while counting two and three**, so it is internally inconsistent as written, and the two errors have opposite sign, so the paragraph's own arithmetic still reaches 10-of-13 and 13-of-13. **Nothing catches it**: the totals are right, the suite has no opinion, and the classification exists in exactly one place.

**Why it matters more than its size.** This paragraph is the audit trail for a 99-site mechanical sweep, and the reason a future reader will trust the sweep without re-running it. The general form is the one this package has hit twice before at F-106 and F-113 — _a property stated beside an instrument and not held by it_ — one register further out: here the instrument was run correctly and the prose describing its output was written by hand.

### F-116 (proposed) — F-114's stale sentence survives verbatim in two source files, one line above a line this commit edited (tier C, and it reopens F-114's class)

F-114 is recorded **Closed 2026-08-26**, naming _the consumer branches on a fault class, never on a stage_ as one of three sentences D-132 reversed and the pass left standing. The sentence is still in the tree, twice, in `src/`:

| Site | Text |
| --- | --- |
| [`sortable/spec.ts:1585`](../../../src/sortable/spec.ts) | `// D-64: the consumer branches on a fault class, never on a stage.` |
| [`free-drag/spec.ts:836`](../../../src/free-drag/spec.ts) | `// D-64: the consumer branches on a fault class, never on a stage.` |

Both are false at HEAD for the same reason F-114 gave: D-132 deleted the fault class, and `DraggableError` carries the stage the consumer branches on. Both sit in the `effect` member's failure arm, directly above the `notify(failure.report)` they annotate.

**The blast-radius detail is the finding's whole point.** This commit edited the line immediately _before_ each of them — `if (failure !== null)` became `if (failure)` at both sites — so a pass that was already inside both blocks, at both sites, on the same day F-114 closed, moved the line above the stale sentence and left it. F-114's closure searched the fixture register and the shipped register; the source comments carrying the identical sentence were not searched.

**Severity is bounded and the bound is worth stating.** These are internal source comments, not published `.d.ts` prose, so nothing incorrect reaches a consumer, and no instrument holds them — `references.node.test.ts` checks citation _targets_, and `D-64` is a real decision, merely a superseded one. What is defective is that a reader of `sortable/spec.ts` is told the current contract is the one D-132 reversed, in a comment whose citation makes it look checked.

---

## 7. Considered, and not findings

- **A JavaScript consumer passing `0` or `''` where a slot expects a function** now takes the _absent_ branch silently, where before it took the _present_ branch and threw on call. That is a difference in behaviour for input the published types exclude, which `CODE_OF_SIZE` §1.1 puts outside the library's contract; downstream corruption does not reopen the question. Raised here only because a sweep is exactly where such a change hides, and this one does not turn on it.
- **`kernel.ts:1420` and `:1431` spell `current.operation` differently from `:727`, `:931` and `:1048` for a reason invisible at the site.** The convention is about what a check _means_, and these two say the same thing in a different form because of return-type inference. It stays cosmetic because both arrows are annotated `(): boolean`, so a future mechanical conversion fails to compile rather than changing behaviour — the one class of exception that does not need a comment to survive.
- **`presentation.ts:136` and `:356` test a bare `string` for truthiness** where `''` is a real value. Neither is a nullish check and neither is in this commit; both are correct as written, since an empty base transform and an empty attribute value genuinely mean _none_ there. Noted so a later pass does not read §1's clean result as covering them.

## 8. What would falsify this

- **The falsy-domain result rests on declared types, not on runtime values.** Every conversion was cleared because the program says the operand's non-nullish domain contains no falsy member. A `readonly` field the type-checker believes is `HTMLElement | null` and a cast fills with something else would defeat it; nothing in `src/` does that today, and finding one would be a separate audit.
- **The `undefined`-reachability check is only as good as the declarations.** No converted operand's type includes `undefined`, and none is an optional property or an index access — but a `Readonly<Record<…>>` read that TypeScript types as total would not show up.
- **I did not re-derive the convention.** The brief settles it; §4 tests one site against its clauses and takes the clauses as given.
- **F-116's severity assumes these two comments are unpublished.** They are inside `createSortableSpec` and `createFreeDragSpec` bodies rather than on declarations, so the prune cannot reach them; if a later change hoists either onto a declaration the tier moves.