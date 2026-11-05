# D-209: feature proof of the discarded-fault report

**Tree read.** Review commit `3ff2d2acf` on `drag2/fin-review2`, baseline `7398d6969`. The implemented `src/` tree is `db3c402a488231e4d17fa2b6a3209543dab561e5`, at each of `ec15441ce`, `448ce5015` and `3ff2d2acf`. The input's `src/` is the accepted tree `626180a058af7374a68c5544fefc4111eec6003c`, the same as `e2aabaf3b`.

**Subject.** `drag2:D-209` in [`00-index.md`](../../contract/00-index.md), [`request-application-claude.md`](../architecture/request-application-claude.md) §32 and [`d209-discarded-failures.md`](../../measurements/d209-discarded-failures.md).

**Where it ran.** Builds, the suite, the mutations and the probes ran in two private worktrees with their own installs, at `3ff2d2acf` and at `7398d6969`. The main checkout was not touched. Every mutation was restored and the tree re-read after it. As in earlier rounds, one CSS cache file absent from a fresh install was copied from the main checkout. Readings and probe sources are in [`probes/d209-review/`](../../probes/d209-review/).

**Scope.** Discarded checkpoints and rejected settlements, ordering, reentrancy, panic, diagnostic delivery, property 6, R21, the declarations, composition and controls, the required mutations, the README's departure from §32.5, the published comments the record reports, and the lint attribution.

It did **not** cover:

- A, a3, any statistical or allocation round, or any other part of D-208;
- `docs.node`'s four rows and the two React files beyond confirming they are the standing set, or RF-24, RF-25 and F-447's cause;
- browsers other than Chromium;
- the contract's dated notes, which §32.10 reconciles at acceptance.

**The workflow correction.** §32.10 says no independent review is booked by the owner's direction. The owner has corrected that: this pass comes before architect acceptance, and no architecture round was waived into an implementation-review waiver. The record says the same (§What to correct, item 1). §32.10's text is the architect's to amend.

## Result

**The landed code meets D-209's six properties as the decision words them, and no reading contradicts the implementation record.** Every required check reproduced, including all 83 mutation rows by name.

**Two tier A silences go to the architect, and neither violates D-209's text.** §32.2's premise that only two carriers hold an unreported fault is false (reviewer-1). A round-trip slot that requests a cancel and then throws still loses its fault, and D-209 makes that loss depend on a later destruction request (reviewer-2). Both bear on closing F-446, and that call is not this pass's.

Two tier B text findings and three tier C findings follow. Nothing here accepts D-209, closes F-446 or changes source.

## Findings

| Id | Tier | Claim |
| --- | --- | --- |
| reviewer-1 | A | A behavior action can carry a consumer's fault past destruction with no report, so §32.2's _every other tag: no fault_ is false |
| reviewer-2 | A | A round-trip slot that requests a cancel and then throws loses the fault, and it is reported only if destruction is requested later. Not a regression |
| reviewer-3 | B | Published texts say a warning's terminal still arrives, in more places than the record lists |
| reviewer-4 | B | The README's _from any other callback_ overclaims: an `async` round-trip slot, a placeholder's `connectedCallback` and `onError` do not reach `onError` that way |
| reviewer-5 | C | No row sees the settlement carrier bypass the route or misreport its code |
| reviewer-6 | C | `ec15441ce` adds one `unbound-method` lint error, beside one standing error |
| reviewer-7 | C | One comment and one row title in the changed files are out of date, and one coverage edit is not in the record |

**reviewer-1. A third carrier.**

- **Current behavior and contract.** §32.2 says every queue entry was enumerated by its `dispatch` site and that every tag other than `FAILED` and `RESOLUTION_SETTLED` carries no fault. Two behavior tags do:
  - `moveTo` catches a failed read and queues `TAG_POSITION` with `fault` (`free-drag/controller.ts:103-108`). Only `prepareAction` throws it (`free-drag/spec.ts:591`).
  - Sortable's scroll and resize listener catches a throw and queues `TAG_INVALIDATION` with the error (`sortable/spec.ts:764-772`). Only `prepareAction` classifies it (`:861-866`).

  `#step`'s walk passes both without a report.

- **Evidence, by public entries, the same on both trees:**

  | Drive | Delivered |
  | --- | --- |
  | `moveTo` with a throwing accessor, in `onStart` or `onMove`, no request | `DraggableError` stage 4 with the cause, then `onEnd canceled` |
  | The same, then `requestDestroy`, or the request first | nothing |
  | `moveTo(null)` in `onMove`, then `requestDestroy` | nothing |
  | Listener fault in `onStart`, no request | `DraggableError` stage 6 with the cause, then `onEnd canceled` |
  | The same, then `requestDestroy` | nothing |

  The listener rows needed a wrapped axis whose `invalidate` throws and a synthetic `scroll` dispatched inside `onStart`. By reading, a real scroll or resize event does not fire inside a unit, so this tag's reach is narrower. `moveTo`'s is not: one slot, one malformed point and one request.

- **Why it matters.** F-446's grounds read the same: the library caught the fault, nothing else records it, and no route names the silence. `should classify a malformed point rather than discarding it` pins the fault as reported when no destruction is involved. `moveTo`'s published doc promises the `DraggableError` _when the move is applied_ (`free-drag/controller.ts:49-53`) and says nothing of a discarded move. `execution.ts:17` now says the bracket knows _which two tags owe a report_.
- **Not a violation of property 1,** which names failure checkpoints and rejected settlements. Under `CONTRIBUTING.md` §13, the text does not say whether this silence is promised, so it is a contract gap and a design finding.
- **Required property.** Each queued entry holding an undelivered fault has a stated outcome under destruction: reported, or a silence named by route. Choosing which, and whether F-446 closes before it, is the architect's.

**reviewer-2. A cancel-superseded rejection.**

- **Current behavior.** `onReorder` or `onDrop` calls `requestCancel` and then throws, which queues `[CANCEL, RESOLUTION_SETTLED]`. `CANCEL` retires the attempt, and `#handleResolutionSettled` returns at its slot check (`kernel.ts:2090`). The walk has no such check.
- **Evidence, both behaviors:**

  | Drive | Accepted tree | Candidate |
  | --- | --- | --- |
  | `onStart`: cancel, then throw (control) | `onEnd canceled`, then warning `superseded-by-cancel` | the same |
  | Round-trip slot: cancel, then throw | `onEnd canceled`, **no `onError`** | the same |
  | The same, and `onEnd` requests destruction | `onEnd canceled`, no `onError` | `onEnd canceled`, then warning **`superseded-by-destruction`** |
  | Round-trip slot: cancel, request, throw | nothing | one warning `superseded-by-destruction` |

  Kernel probes K2 and K3 show the same two outcomes.

- **Why it matters.** The same call reports from `onStart`, and `kernel.ts:2231`'s _the error is not lost_ holds only for a checkpoint. §32.3's grounds apply. With D-209, whether this fault reaches the consumer depends on a destruction requested later, for an operation the cancel had already decided, and the report's message names destruction.
- **Not a regression and not a violation.** The silence with no destruction is the accepted tree's. The walk's report meets property 1's words: a settlement carrying a rejection that destruction discards. §32.3 considered rejections arriving after application and did not consider this ordering.
- **Required property.** A rejection a cancel supersedes has a stated outcome, and whether it reports does not turn on an unrelated later request. It routes to the architect, separately from D-209 or under it.

**reviewer-3. Published texts: the record's list is short.** This is the assessment of §What to correct, items 2 and 3.

| Text | Where | Reading |
| --- | --- | --- |
| `reportError`: _the terminal for that operation still publishes afterwards_ | `kernel/spec.ts:524`, in `kernel/spec.d.ts`. In the record | **Confirmed untrue of this warning.** (i), (j) and (v) have no terminal, and in (z) it came first. Already untrue of `afterwards`: `superseded-by-cancel` arrives after `onEnd` on both trees |
| `requestDestroy`: _that unit completes first … and nothing after it runs_ | `kernel/spec.ts:125-128`, in `kernel/spec.d.ts`. In the record | **Confirmed.** `onError` now runs after the unit, though no unit does |
| `DraggableWarning`: _The operation terminated exactly as it would have_ | `kernel/errors.ts:66`, in `kernel/errors.d.ts`. In the record | **Not untrue on its own terms.** The same request with no throw also publishes no terminal (R33 (b)), so the operation did end as it would have. The record reads it more strictly than the sentence does. The architect decides whether it stays |
| `SortableOnDragError`, `FreeDragOnDragError`: _A `DraggableWarning` means the operation was not affected … and its terminal still arrives_ | `sortable/config.ts:30-32`, `free-drag/config.ts:39-41`, in both `config.d.ts`. **Not in the record** | **Untrue of this warning,** and it is the ordinary tier's text on the `onError` slot itself |
| _a `DraggableWarning`, which means the operation was **not** affected and its terminal is still coming_ | `README.md:60`. **Not in the record** | **Untrue of this warning** |
| _the settlement is not failed and the domain result stands_ | `README.md:80`. **Not in the record** | **Reads wrongly here:** destruction leaves no domain result to stand |

A correct integrator can write `onError` to wait for the terminal a warning promises, and none arrives. §32.5 puts `spec.ts`, `src/sortable/` and `src/free-drag/` out of scope, so leaving the source comments was correct. **Required property:** what the package says a warning implies holds for every warning it delivers. These are declaration comments, and the wording is the architect's.

**reviewer-4. The README's departure from §32.5.**

**The departure is justified, and the record reports it.** §32.5's sentence and step 1's landing of it say the throw arrives as a `DraggableWarning`. The probes show that is untrue of `handle`, `visual` and `box`, which report `DraggableError` stage 1 with no `onEnd`, and of `home`, which reports `drag: landing/target-unavailable` and then `onEnd rejected`. All four read the same on both trees, so _that report is unchanged_ holds. The correction changes one README line and no source.

**The replacement still overclaims.** _From any other callback it arrives as a `DraggableWarning`_ is untrue of three:

| Callback requests destruction, then throws | Delivered on the candidate |
| --- | --- |
| `async` `onReorder` or `onDrop` | nothing, and no unhandled rejection. It is a rejected promise arriving after application, which row (y) pins as silent under I-36 (a) |
| A placeholder's `connectedCallback` | nothing. The platform reports it on `window`, and the library never sees it. The same README bullet names this callback |
| `onError` | nothing further. The route absorbs it |

The `async` row matters most, because `README.md:73` documents an awaiting resolver as the way to commit before landing. The bold lead sentence, _still reaches `onError`_, has the same reach. **Required property:** the sentence does not promise a delivery for a route the contract leaves silent. §32.5's wording has the same gap, so this goes to the architect with it.

**reviewer-5. Rows and the settlement carrier.**

- **Evidence.** X5s, in which only the settlement carrier calls `spec.reportError` directly, reddens **no row**. It is not equivalent: under it, K5 delivers the warning and then a panic report with stage `null`, while the landed code delivers the warning once. X6s, in which only this carrier reports the cancel's code, is seen only by `capture.node`'s census.
- **Why it matters.** Properties 2 and 4 hold for this carrier by reading and by K5, and no standing row would see them regress. K1's mixed order, a checkpoint and then a rejection that the delivered report causes, passes and has only B1's stubs behind it. §32.6 and §32.7 did not ask for these, so this is no miss against the handoff.
- **Required property.** The route and the absorption are pinned on both carriers. Whether acceptance needs it is the architect's.

**reviewer-6. The lint attribution.** The record is accurate.

| Line in `kernel.browser.test.ts` | Rule | Introduced by | At the input |
| --- | --- | --- | --- |
| 5009, the panic row | `@typescript-eslint/unbound-method` | `452bdc574`, standing, and reported at D-208 | yes |
| 5900, row (u) | the same | **`ec15441ce`, D-209's step 1** | no |

Over the six changed TypeScript files, the input has one error and the candidate two. `oxlint` and `oxfmt --check` are clean on both. No other error is new. The new line copies the standing line's stub, as the record says. `handoff.md` forbids resolving a surviving lint error by hand, so listing it was correct. Seven other test files already suppress this rule, so how the two lines are treated is a small choice for whoever owns the follow-up.

**reviewer-7. Small text and record items.**

- `kernel.ts:441` still says _the bracket's four callbacks reach the rest_. The same commit corrected this claim at `Kernel`'s bracket field, and §32.5 asked for any comment made false in these two files.
- `execution.node`'s _should stop the drain at the next entry_ now asserts only what is handled, and the drain no longer stops there. §32.6 keeps the row, and its assertion is true.
- `3ff2d2acf` changes one `tests/COVERAGE.md` cell, restoring F-446 to (k)'s row, which `ec15441ce` had dropped. The result matches the input and §32.5's _(k)'s row stays_. The record's description of that commit lists the record, the readings and the README correction, and not this.

## Checks that held

### Identity and scope

The eleven changed paths are those of §32.5 and §32.8, plus the mutation readings. `00-index.md`, `05`, §32, `queue.ts`, `actions.ts`, `seams.ts`, `spec.ts`, `src/sortable/` and `src/free-drag/` are untouched. Steps 2 and 3 do not change `src/`. No test file changes after step 1, and `tests/COVERAGE.md` changes by one cell (reviewer-7). No source comment in the diff carries a record identifier.

### The six properties

| Property | Reading | Evidence |
| --- | --- | --- |
| 1, one report, in order | **Holds** for both carriers | (i), (j), (l), (m), (n), (t), (v), (w), (z), B1. K1 walks an appended rejection after the checkpoint. K4: a rejection applied live whose `prepare` requests destruction and rethrows reports once |
| 2, before application, through the route | **Holds** | (o) gives the exact order, read `applied` false, and refuses a press. The refusal has no diff. X4, X4both and X5 redden |
| 3, at the boundary | **Holds** | The read is the runner's existing one. `capture.node` passes with no diff to its file, so R21 did not move and the re-pin went unused |
| 4, no consequence | **Holds** | (p): `requestDestroy`, `requestCancel`, `dispatch` and `fail` from the report. (q): a throwing report, both delivered, one `retire`. K5 on the settlement carrier. By reading, nothing in a report can append a fault entry without bound |
| 5, panic | **Holds** | (u), B3 and X9. `#drain`'s catch has no diff. The panic comment names the route. By reading, a panic with a request held takes the same catch. No row drives that |
| 6, off the sample path | **Holds on the diff** | Below |

**Precedence and the first-completion latch hold:** (r) reports destruction's code with a cancel held in either order, (x) reports nothing for a rejection after a fulfilment, and (y) reports nothing after application.

**(s) holds:** a checkpoint that applied owes nothing further, in both behaviors and the kernel. `ERROR_REPORTED` is told apart by tag, and X3 reddens.

### Property 6

Rerun against `7398d6969`, whose `src/` is `e2aabaf3b`'s, by `transpileModule` with `removeComments` on all 60 `src/` files.

- **Two files differ, with exactly the sites §32.8 allows:** `execution.ts`'s import and `#step`'s non-`LIVE` branch, `#failOperation`'s literal and `#settleResolution`'s `SETTLED_REJECTED` branch. The `LIVE` branch has no hunk.
- **Member lists are identical by AST:** `ExecutionBracket` 21, `ArmedController` 75, `Kernel` 15, `ActionQueue` 4.
- **Declarations:** 33 files on each side, 0 differ.

This pass makes no statement about A or a3 on this tree, and §32.9's limits stand. The record's text stays inside them.

### The rows

Every row of §32.6 exists, and each asserts its required outcome. I read each one against the table. `tests/COVERAGE.md` cites them by title, and `coverage.node` passes.

**The accepted-tree column, which the record could not state directly, is now read.** The candidate's four test files against `626180a05`'s `src/`: 20 rows red, exactly §32.6's _fails_ rows plus B1 and B2. (k), (s), (u), (x), (y), (v)'s control and B3 stay green.

### The mutations

| Mutation | Failed, mine and recorded | Required rows reddened          |
| -------- | ------------------------: | ------------------------------- |
| N1       |                        30 | yes, and (k) stays green        |
| X1       |                        20 | yes, every _fails_ row          |
| X2       |                         4 | yes: (n), (q), (r) cancel first |
| X3       |                         5 | yes: (s), (t)                   |
| X4       |                        14 | yes, on the record's spelling   |
| X5       |                         1 | yes: (q)                        |
| X6       |                         2 | yes: (r) twice                  |
| X7       |                         4 | yes: (v), (w)                   |
| X8       |                         1 | yes: (x)                        |
| X9       |                         2 | yes: (u)                        |

**Compared by name with `mutations.txt`, 83 of 83 rows are identical,** with X2 on the handoff's wording. My X5 spelled both carriers and still reddened only (q). **X4both,** deferring both carriers, reddens 18, adding (v) and (w) to the record's spelling. That confirms what the record's note says it did not cover.

### Composition and controls

`measureAll()` in the private worktree, on both trees.

- **All 15 rows** match the record on minified and Brotli bytes, and on modules at the candidate. The _Before_ column matches the input exactly. Module counts do not change.
- **Slack** matches on every row, and is 49 to 95 B on the thirteen package rows.
- **`drag.js` stays 142 and baseline B stays 6,916.**
- **`measure.ts` changes five `control:` values and no budget.** ~~All six~~ All seven `size.node` control rows pass (count corrected 2026-11-04, [`request-application-claude.md`](../architecture/request-application-claude.md) §34.3; the result stands). The interval is that one change, with no manifest or lockfile in the diff.

### The whole suite, once

**1,456 pass, 5 fail, 68 skipped, of 1,529. 74 of 78 files pass.** It equals the record, and the failing set is exactly what was expected:

- `decisions.node`: _should hold every witness it claims_;
- the four `docs.node` rows, each with TypeDoc's exit code 3;
- `react.browser` and `stories.browser` do not load.

**F-447 did not recur** in this run: `consumer.node`'s sourcemap row passed, in a fresh worktree, with one run. No other failure occurred, so nothing was dismissed by analogy.

`just typecheck` reports only the two `.scripts/` errors at `vitest-config.ts:181` and `vitest-one-shot.ts:34`.

## Routed, not decided

| Item | To | Question |
| --- | --- | --- |
| reviewer-1 | architect | Does D-209 extend to a behavior action's fault, or is that a named silence? Does §32.2's enumeration need correcting before F-446 closes? |
| reviewer-2 | architect | Is a cancel-superseded rejection D-209's, a new finding, or a named silence, and what does the walk report for it? |
| reviewer-3, reviewer-4 | architect | The wording, including declaration comments out of §32.5's scope |
| reviewer-5 | architect | Whether acceptance needs the settlement carrier's rows |
| reviewer-6, reviewer-7 | architect, for the implementer | Whether they are handled at acceptance or after |
| §32.10's attribution | architect | The owner's correction, at acceptance |

## Limits

- **Each reading ran once,** in Chromium, on one machine. A mutation shows that rows see it, not that a property holds wherever it reaches.
- **Probes are throwaway drives,** not rows. The `landing({ duration })` probe never called its function, so it is no evidence about that slot. Other slots a consumer can fill were not probed, and the tables above name the ones that were.
- **§32.11's construction-window aliasing and `admit` throwing past `#drain` were not re-derived.** The first is invalid use, and the second was not probed.
- **The whole-suite baseline figure at the input (1,431 pass) is the record's and §31.8's.** I did not rerun it, because the rows' accepted-tree reading covers the discrimination it would show.

## Next

Architect acceptance under §32.10, with the items above. D-209's marker and row and F-446 stay as they are until then.