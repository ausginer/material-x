# D-208 remediation 6R: bounded recheck of the landed shared-refusal candidate

**Tree read.** Review commit `70368bfde` on `drag2/fin-review2`, parent `85e659cca`.

Hashes, diffs and site reads came from git objects. The suite, the mutations, the call-count row and the declaration builds ran in the main checkout, which was clean at `70368bfde` before and after. Each mutation and the parent's declaration build changed tracked `src/` files temporarily. After each, the files were restored and their blobs or `git status` checked. Ignored build output was left rebuilt at the candidate.

**Subject.** [`request-application-claude.md`](../architecture/request-application-claude.md) §28.5.

**Scope.** The pass covered every item in §28.5: identity, the refusal, `channel(deliver)`, the kernel's route, constructor order, the diagnostic outcomes, R33, R21, M1 to M3, the text, the declarations, the premises and the record against its raw file.

It did **not** cover:

- M-2′, M-2″'s rounds, Q-a3, any new harness or any allocation round;
- a3, the owner's acceptance, the low readings' cause, the estimator or F-445;
- the comment pass, 5R and 5R.1;
- F-442, F-443 and the compression pass;
- lint, format and typecheck, whose residue the landing record states and §28.5 does not ask to re-run;
- browsers other than Chromium, and `react.browser` and `stories.browser`, which do not load.

## Result

**No correctness or semantic defect, no failed premise and no record mismatch.** Two tier C text findings go to the architect. Neither touches code that runs.

The outcome stays as §28.1 words it: _retained heap A; allocation a3; no regression demonstrated and none excluded; the remaining uncertainty accepted by the owner, 2026-11-04._ This pass does not change that outcome or its limits, and it does not close 6R.

## Findings

| Id | Tier | Claim |
| --- | --- | --- |
| reviewer-1 | C | Comments outside the diff still call the kernel's route a channel, and one published comment calls the mint's allocation a closure |
| reviewer-2 | C | 05:253's new precision says the unwind guard and `FeatureContext.report` are minted channels, and each is a function over one |

**reviewer-1.**

- **Current behavior.** The kernel's route is not a channel at the candidate (§25.2), and `channel` returns a bound function. These comments were not in the diff and still read as before:
  - `free-drag/spec.ts:223–224`: _This and the kernel's channel over the spec's `reportError` both reach `#deliver`, and they are two channels over one sink_. This one describes the replaced form most directly;
  - `free-drag/spec.ts:207` and `sortable/spec.ts:1693`: _the kernel's channels_, as the callers of `reportError`;
  - `kernel/kernel.ts:413`: _the channels_, listed among the controller's `readonly` fields, where the field is now the route;
  - `kernel/unwind.ts:30` and `:37`: _one controller's channel_, for a guard that also takes the route;
  - `kernel/spec.ts`, `BehaviorContext.channel`, which is published: _each call allocates one closure_.
- **Why it matters.** §25.5 asks that other text stating the kernel's route is a mint be reported. Behavior does not change. The published sentence's advice, one mint per sink at construction, still holds.
- **Evidence.** These sites came from a targeted search for _channel_ and _mint_ over the kernel's modules and the two behaviors. It is not a census, and §25.5 does not ask for one. The implementer's record says the same of its own list.
- **Required property.** Text states what the code does at the frozen tree. §28.3 already covers how a comment-only change affects the acceptance. A change to the published comment would also change `kernel/spec.d.ts`, so §25.5's declaration control would have to be read against it.

**reviewer-2.**

- **Current behavior.** 05:253 reads: _each behavior's own channel, its unwind guard and the composition's `FeatureContext.report` are channels minted through `BehaviorContext.channel`_.
- **Evidence.**
  - There are four mint sites, and neither item is one of them.
  - The unwind guard is `createUnwind(this.#notify)` at `sortable/spec.ts:318` and `free-drag/spec.ts:244`, so it reports through a minted channel.
  - `FeatureContext.report` is a closure at `sortable/behavior.ts:146` and `free-drag/behavior.ts:70`. It wraps the error and calls the minted `composition`. D-208's own text calls it _the behavior's mapping over the kernel's channel_.
- **Why it matters.** Every diagnostic on these routes does pass through a minted channel, so the operative claim holds. The sentence is imprecise about what is minted, and it is the sentence written to remove that kind of ambiguity. §25.5 prescribes the wording, and the landed text follows it.
- **Required property.** 05:253 states what the code does.
- **For the architect.** This file's blob is one of §28.3's objects. §28.3's correction rule speaks of comments and `src/`, and it does not name the contract.

## Checks that held

### Identity

Every object equals §28.3, and the candidate's parent has `src/` at `4630579d2`.

| Path under `packages/drag2/` | Object at `70368bfde` |
| --- | --- |
| `src/` | tree `c0713204a55b24ffc44f9ac0a92d80efa28c7aeb` |
| `src/kernel/kernel.ts` | blob `f370952e1ef2e73de585a8ced10224621672cc4b` |
| `src/kernel/seams.ts` | blob `8b8910f98b67ff11a629a9a54d0ad0f382b006b5` |
| `src/kernel/spec.ts` | blob `a5d737331cc0e6d41bc77c5397f8fdfb713343c5` |
| `tests/kernel/capture.node.test.ts` | blob `0f748723f3f3582b516e3a8d87055d9d4d501fd2` |
| `.plan/contract/05-lifecycle-invariants.md` | blob `9a3dc5f23469327967f3a7da48c77ea74b832ae3` |

The commit touches those five files and `d208-step6.md`, and nothing else. In `d208-step6.md` the only change to an earlier line is the newline a final line gained when text was appended.

**Code as opposed to comments.** Both trees were transpiled with comments removed and then diffed:

- `seams.ts` and `spec.ts` have no code difference.
- `capture.node` changes the one census entry.
- `kernel.ts` changes `deliverUnlessApplied` and `reportToSpec` (new), the constructor, `Kernel.channel` and the one argument at `#arm`'s call. Nothing else.

### The refusal and panic

- The only `closed` test that refuses a diagnostic is `kernel.ts:380`, in `deliverUnlessApplied`. The route (`:533`) and `channel` (`:2600`) both deliver through it.
- The other `closed` reads are `#cancelWith` (`:777`), `#failOperation` (`:823`) and `Kernel.dispatch` (`:2630`). They are intake reads, and the census lists all three unchanged.
- `panic` differs only in comments. It calls `#spec.reportError` directly behind its own `try`/`catch`.

### `channel(deliver)`

| Property | Reading | Row |
| --- | --- | --- |
| Signature unchanged | `channel(deliver: Notify): Notify`; `kernel/spec.d.ts`'s member is identical | declaration diff below |
| Receiver `undefined` | `.bind(bracket, undefined, deliver)`, then `deliver.call(receiver, error)` | none |
| Extra argument ignored | it binds to no parameter, and `deliver` is called with `error` alone | none |
| Throw absorbed | `deliver.call` is inside the `try` | _should absorb a throw from the sink_ |
| Delivers in the factory, before arming | `#bracket` is a field initializer on `Kernel`, so it exists from construction | _should deliver in the construction window and drop once destruction is applied_ |
| Drops after application | the `closed` test | same row, and R33 (a)–(d) |
| Same bracket | `Kernel.#bracket` is `readonly` and is the object the replaced arrow read at each call | — |

No row pins the receiver or the extra argument. Those two rest on reading, as §28.5 allows.

### The kernel's route

- **Collaborators still hold it.**
  - the driver: the constructor's third argument to `SeamDriver`;
  - each operation's lifetimes: `kernel.ts:1024`;
  - the unwind guard: `kernel.ts:535`;
  - construction's unwind: `armed?.report` at `kernel.ts:2813`, reached only once `armed` is assigned after construction returns.
- **`reportError`.** `reportToSpec` reads and calls `this.reportError(error)` inside the `try`, after the refusal, with the spec as receiver, at each delivery.
- **`this.#spec`.** It is `readonly` and assigned once from the constructor's `spec`, which is `#arm`'s `next`, the object the replaced arrow called.

### Constructor order

**No path reaches the route before `#bracket` and `#spec` are assigned.** The syntax tree of `ArmedController` was walked for calls that run eagerly:

- **Field initializers:** none. Each is a literal, an arrow, or an object literal of functions.
- **Constructor body:** three calls, in this order:
  1. `createUnwind(this.report)` at `:535`, which returns a closure without calling `notify`;
  2. `new FrameTransaction` at `:541`, after both assignments, which stores two references;
  3. `new SeamDriver` at `:542`, after both assignments, which stores three references.
- **Escape:** `this` and the arrow do not leave the constructor before it returns, and `#arm` publishes the controller only afterwards.

The `closed` test sitting outside the `try` therefore has no early path to throw on.

### Diagnostic outcomes

The unmutated suite passes every row below.

| D-208 _required behavior_ | Row |
| --- | --- |
| Teardown is silent | `diagnostic-intake`, both behaviors: _should deliver nothing when destruction requested at depth 0 is applied_, _…from a slot is applied at its boundary_. `kernel.browser`: _should run both scrubs when a reset throws during destroy_ |
| A panic delivers one `DraggableError` with stage `null` | `diagnostic-intake`, both behaviors: _should deliver only the panic when a panic tears the controller down_, which asserts length 1, the class, `stage` null and `cause`. `kernel.browser`: _should close, report and only then tear down on a panic_ |
| A late `FeatureContext.report` is dropped | `diagnostic-intake`, both behaviors: _should drop a kept report once the promise has settled_ |
| An earlier one is delivered, as `drag: composition/unwind-failed` | `diagnostic-intake`, both behaviors: _should deliver a report made between the request and its application_, _should deliver a report and a failed hook on a live controller_ |
| The pre-arm composition unwind is delivered | `diagnostic-intake`, both behaviors: _should deliver the construction unwind before draggable() rethrows_ |
| A throwing hook at retirement on a live controller is reported as `drag: unwind/step-failed` | `diagnostic-intake`, both behaviors: _should deliver a report and a failed hook on a live controller_ |

### R33 and R21

**The whole suite, run once unmutated, matches the landing record:** 1,419 pass, 10 fail and 68 are skipped, of 1,497. 74 of 78 files pass.

- **The 10 failures** are the six `size.node` controls and the four `docs.node` rows the record names.
- **Not loaded:** `react.browser` and `stories.browser`.
- **The 34 passes above 1,385** are `m2pp-rule.node`'s 34 rows.

**R33 passes in full:** `diagnostic-intake`'s 14 rows and R33 (h).

**R21:**

- `capture.node` passes 15 of 15.
- The test's code diff is exactly the one re-pin: `Kernel.channel: closed` is removed and `deliverUnlessApplied: closed` is added, with §25.3's comment. No other census entry changes, and neither does the ledger row or _should find no lifecycle or request read outside the kernel_.
- A syntax-tree search for the identifier `channel` over `src/` finds the four mint sites, `sortable/spec.ts:317`, `free-drag/spec.ts:243`, `sortable/behavior.ts:126` and `free-drag/behavior.ts:52`, plus the definition at `kernel/kernel.ts:2599` and the declaration at `kernel/spec.ts:105`. No alias exists.
- The same search finds no `.closed` or `.idle` read under `sortable/` or `free-drag/`.
- `BehaviorContext` has no lifecycle member.

### The mutations

Each was applied alone, as an exact-text patch to the checkout, and then the whole suite ran. No row disappeared, and no failure in the unmutated run turned green. The patched files were byte-compared and `git status` was empty after each restore.

**M1, 19 rows, against the record's 19.** It removes `if (this.closed) { return; }` from `deliverUnlessApplied`.

- `capture.node`: _should find lifecycle and request reads only at the runner, intake, the channel and unit entries_.
- `diagnostic-intake`, sortable and free drag, five each: _should deliver nothing when destruction requested at depth 0 is applied_, _should deliver nothing when destruction requested from a slot is applied at its boundary_, _should deliver only the panic when a panic tears the controller down_, _should drop a kept report once the promise has settled_, _should deliver a report made between the request and its application_.
- `kernel.browser`, eight:
  - _should open no round-trip for a destroy requested in the release effect_;
  - _should open no round-trip for a destroy requested in the release prepare_;
  - _should open no round-trip for a destroy requested by an action the release effect dispatched_;
  - _should refuse every later notification once onError destroys_;
  - _should run both scrubs when a reset throws during destroy_;
  - _should close, report and only then tear down on a panic_;
  - _should read closed once the requesting unit has ended_;
  - _should deliver in the construction window and drop once destruction is applied_.

**M2, 11 rows, against the record's 11.** The refusal becomes `if (this.closed || this.requested)`, and a `requested` getter reading `REQUESTED` is added to `ExecutionBracket`.

- `capture.node`: _should derive the lifecycle accessors it matches from the bracket_, and the census row above.
- `diagnostic-intake`, sortable and free drag: _should deliver a report made between the request and its application_.
- `free-drag/lifecycle.browser`: _should report the admission failure of the unit that requested destruction_.
- `free-drag/validation.browser`: _should report the invalid home of the unit that requested destruction_.
- `kernel.browser`:
  - _should open no round-trip for a destroy requested in the release effect_;
  - _should report out-of-range tags while a destroy request is registered and not yet applied_;
  - _should read open for the rest of the requesting unit_;
  - _should agree with the physical signal inside the requesting unit_;
  - _should deliver in the construction window and drop once destruction is applied_.

**M3, 2 rows, against the record's 2.** The arrow calls `this.#spec.reportError(error)` behind its own `try`/`catch`, without the refusal.

- `kernel.browser`: _should run both scrubs when a reset throws during destroy_, the row §25.5 requires, and _should refuse every later notification once onError destroys_.

M1, M2 and M3 name the same rows as the record's table.

### Text

- **05:253.** The original sentence is struck, the precision is dated, and it says the route is not minted and applies the same refusal. Apart from reviewer-2, the text states what the code does.
- **The changed comments** state what the code does: `deliverUnlessApplied`, `reportToSpec`, the `report` field, the constructor, `panic`, `#unwindArm`, `channel`, the driver's field in `seams.ts`, `reportError` in `spec.ts`, and the two in `capture.node`.
- **Record identifiers.** No changed line under `src/` or `tests/` carries one. The search covered `D-`, `F-`, `Q-`, `I-`, `R-`, `M-`, `§`, `R21`-style names and the word _record_.
- **Declarations.** Built with `just build` at both trees, 33 files each. 32 are byte-identical. `kernel/spec.d.ts` differs at three lines, all inside `BehaviorSpec.reportError`'s doc comment.

### The premises

**By reading, no changed function and not the arrow runs in the allocation windows unless a diagnostic is reported.**

- **Construction is outside every window.** The constructor, `#arm` and all four mints run at construction, and the harness builds each fixture before its window opens. Pre-window setup includes `freeFixture()` for the drop rows.
- **Every route to the arrow or to `deliverUnlessApplied`** is a report on a fault:
  - `kernel.ts:832`, `:966`, `:1055`, `:2198`, `:2222` and `:2476`;
  - the driver's `#notify`;
  - the lifetimes' `#notify`;
  - a guard's catch;
  - the behaviors' `#notify(failure.report)`.
- **Nothing on the fixtures' paths triggers one.** Their consumer slots do not throw, tags are in range, and `moveTo` passes a plain object. The kernel's capture element is the `root` the fixtures stub. `failure` is null on an accepted drop.
- **`createOperationLifetimes(this.report)`** runs per press and passes the route as a value without calling it.

This is reading, and the fixtures set no `onError`, so a delivered warning would be silent. §28.1's Q1, the arrow's exact call count, **stays unanswered**.

**Run: the call-count row, once in each project, equals §Costs and §Call counts.**

| Window | DEV | Shipped | §Costs |
| --- | --- | --- | --- |
| press, then 2,000 samples | `#handleMove` 2,001, `#handleOpenResolution` 0 | same | same |
| 50 drops | `#handleMove` 100, `#handleUp` 50, `#handleOpenResolution` 50 | same | same |
| 2,000 `moveTo` calls | `moveTo` 2,000, `#handleOpenResolution` 0 | same | same |

M-2″'s 48 allocation runs in the raw file also carry one distinct set of these counts.

**For §24.5 step 5:** the diff changes no code in a per-sample function, per the comment-stripped diff above, and the counts are identical. The row also prints per-call and per-drop allocation lines as a by-product. They were not read against anything, and this is not an allocation round.

### The record against its raw file

- **The rule.** `node bench/m2pp/rule.ts .plan/measurements/d208-m2pp-raw.jsonl` reproduces `d208-m2pp-rule.json` by value (`deepStrictEqual`). The bytes differ only because the committed file was formatted: the script indents by one space, and `oxfmt` over its output gives the committed file byte for byte.
- **M-2″'s tables, compared programmatically against that output and the raw file:**
  - every cell of the 20-row allocation table, with `k`/`n` also recounted from the rounds;
  - every cell of the six-row retained table;
  - all 240 whole-byte cells across sets G, AB, AC, P and D;
  - all 72 load figures.

  There were no mismatches. The first load comparison flagged 23 rows because my script paired set D's load across two runs. The table states it across the round's four, and on that basis there were none.

- **Other figures, all matching:**
  - the 168 runs with none failed;
  - load 1.95 to 6.86;
  - V0 to V2, `L` of 2 with its two cells, and `T` at 5 and 9 of 72 with p 0.3997;
  - the low-reading and probe tables;
  - the three further literal misses;
  - 3 of 5,760 negative readings;
  - `moveTo` DEV's twelve `d` values;
  - 0 attributed bytes.
- **§28.1's figures** match, including the three further cells under `p` 0.05, which with `moveTo`'s two make §27.2's five.
- **`S`** is 20.5 as the sum of `k − n/2`, and 13.5 with `moveTo` left out. `p` was not recomputed, as §28.5 allows.
- **The landing record** uses §28.1's wording verbatim. The words §28.1 forbids do not appear in its subsection, and _no regression_ appears only inside the permitted phrase. Its statement about `seams.ts` lines 147 and 148 matches the diff. Its suite totals match this pass's run. Its lint and typecheck residue were not re-run.

## Reported for closure, not findings

**A bound function is not an arrow in a few ways no valid use reaches.** This is from reading the language semantics, with nothing run:

- a channel's `name` changes to `bound deliverUnlessApplied`, and its `length` stays 1;
- `new channel(error)` no longer throws. It would run with a fresh `this`, so `this.closed` is `undefined` and the refusal does not apply;
- `deliver.call` and `deliverUnlessApplied.call` now look up `call`, so a `deliver` that shadows it, or a patched `Function.prototype.call`, is observed. The arrow's lookup is outside the `try`.

None of these is a use the contract offers, and §25.5's list does not name them.

## Limits

- The premise check and `channel`'s receiver and extra-argument properties are reading. No row pins them.
- The mutation runs are one run each, in Chromium, on one machine. Row names are compared with the record's table and with step 4's counts.
- The search behind reviewer-1 is bounded and is not a census.
- This pass reads no allocation or retained-heap figure as evidence about the candidate. A and a3 are carried as recorded.

## Next

The architect's closure under §28.6, which also disposes of reviewer-1 and reviewer-2. Control redeclaration and `d208-requests.md` stay pending.