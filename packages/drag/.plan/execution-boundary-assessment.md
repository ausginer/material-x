# The execution boundary around `Gesture.enter`

**Status, 2026-11-08: assessed by the architect, not decided.** No `DRD`, `DRF` or `DRO` entry is minted or amended. The proposal in §3 waits for the owner's discussion.

**Read at:** `ef8c6cd96`, in a worktree on the new branch `drag/execution-boundary`. The main checkout holds an uncommitted edit by the owner to `src/kernel/gesture.ts`. That edit moves the `#steps` declaration above `#session` and `#running`, and nothing here depends on it. It was read with `git diff` and left as it was.

**Method:**

- **Reading** of `src/kernel/` and `src/draggable.ts`.
- **A prototype** in the worktree's source, run and then reverted. Its diff and raw results are kept in [`probes/execution-boundary/`](probes/execution-boundary/README.md). Production source on the branch is unchanged.
- **Runs:**
  - the suite in Chromium and Firefox, at the base and with the prototype;
  - the per-sample allocation test, which runs only in Chromium;
  - typecheck, lint and the size measurement.

  **WebKit did not launch in this environment.** The host lacks `libpulsecommon-17.0.so`, `libblas.so.3` and `liblapack.so.3`, so no WebKit result is claimed.

- **No timing.**

**[E]** marks a claim established by a run recorded in the probe. **[R]** marks a claim established by reading.

**Governing records:**

- **Decisions:**
  - `DRD-1`: one reader, and `#running` refuses a nested pass;
  - `DRD-6`: the step list, which is empty on the hot path;
  - `DRD-24`: the boundary, the interface table and the required properties;
  - `DRD-26`: the session's members on the controller;
  - `DRD-20`'s binding bullets;
  - `DRD-23`'s instrument rule.
- **Contract entries:** `DRI-1`, `DRI-2`, `DRI-6`, `DRI-7`, `DRI-8`, `DRI-10` and `DRI-17`.
- **CONTRIBUTING:**
  - §2.2: no framework to remove duplication;
  - §10: a class needs semantics;
  - the TypeScript rule: declare receiver-dependent members as methods, and keep detached-safe callbacks as function types.

## The answer

- **No responsibility is missing an owner.** Pass execution belongs to the controller, by the lifetime rule `DRD-24` applies. Its reader is where three owners' state meets: destruction, the deferred steps, and the operation's decision and next step.

  A separate pass owner would have no lifetime of its own, and it would need a two-way interface with `Gesture` around a loop of about fifteen lines. It also would not change how work is passed in: `pass.enter(this.#move, event)` has the same shape as today's call (§2).

- **The owner's suspicion points at a real gap, in the gate's signature.** One `enter(fn, argument)` serves four kinds of entry with different semantics (§1). So:
  - internal work has to be a function value;
  - two module-level `NOOP`s stand for "no work";
  - "refused" means "lost" for input and "deferred" for a request;
  - destruction requested while idle is applied outside the reader.
- **Proposed: two entries by kind, both in `Gesture`** (§3).
  - **Input** enters with its handler object and its event, and the handler's method does the work.
  - **Requests, a step requested while idle, and a verdict's fault** go through one private pass. Its optional first step is a function only where the work is one already: the consumer's step, or `raise`.
- **The prototype's results [E]:**
  - every behavior test that ran in Chromium and Firefox passes, including the per-sample test, after one change to the development refusal count;
  - it creates 5 fewer functions per controller and 3 fewer per operation;
  - `draggable alone` grows by 13 B Brotli, and the other compositions by 16 to 23 B. `example: drop zone` goes over its ceiling by 11 B.

## 1. What `enter` carries today [R]

| Caller at `ef8c6cd96` | Call | Kind | When a pass is running | When the controller is closed |
| --- | --- | --- | --- | --- |
| `Gesture.#onPress` (`gesture.ts:262`) | `enter(this.#press, event)` | Input | Refused and counted | Refused |
| `Gesture.#onCommand` (`:285`) | `enter(this.#command, event)` | Input | Refused and counted | Refused |
| `Session.handleEvent`, a primary press while pending (`session.ts:328`) | `enter(this.#endPending, null)` | Input | Refused, **not counted**, because the argument is `null` | Not reached: motion is closed |
| `Session.handleEvent`, a sample or a release (`:339`, `:341`) | `enter(this.#move, pointer)`, `enter(this.#up, pointer)` | Input | Refused and counted | Not reached |
| `Gesture.requestStep` while idle (`gesture.ts:223`) | `enter(this.#runStep, step)` | A step requested while idle | Not called: the step is pushed instead | Not called |
| `Gesture.requestCancel` (`:236`), `Session.#cancel` (`session.ts:354`), a verdict's acceptance (`:486`) | `enter(NOOP, null)` | A request, already in its slot | "Refused": the running reader applies the slot | Refused |
| `Gesture.raiseInPass` while idle (`gesture.ts:206`) | `enter(this.raise, error)` | A verdict's fault | Not called: `raise` runs at once | Not reached: the session has ended |
| `Gesture.requestDestroy` while idle (`:247`) | `#teardown()`, **not the gate** | A request | Not called: the slot waits for the reader | — |

**What follows from one signature:**

1. **Internal work must be a function value**, because the gate calls `step(argument)` with no receiver.
   - `Gesture`: `#press`, `#command` and `#runStep` are arrow fields. Their listeners `#onPress` and `#onCommand` are arrow fields too, created even without a `command` hook. That is 5 functions per controller.
   - `Session`: `#move`, `#up` and `#endPending` are arrow fields, 3 functions per operation. `DRO-6` accepted them as the cost of the session class. A keyboard command creates all three and never calls them.
2. **"Refused" means two different things.** An input refused by a running pass is lost, which is `DRI-6`. A request "refused" by `enter(NOOP, null)` has already filled its slot, and the running reader applies it, which is `DRI-1`. The signature doesn't distinguish the two kinds.
3. **"No work" needs a placeholder.** `NOOP` is defined twice, in `gesture.ts:37` and `session.ts:115`.
4. **Destruction requested while idle is applied outside the reader.** `DRD-1` says that one reader applies requests, and here the request applies itself. It is sound at the base, because `#destroyed` closes every entry before `#teardown` runs, but it is a second place where a request is applied.
5. **The lint can't guard this shape [E].** `@typescript-eslint/unbound-method` flags a public method passed as a value, but not a `#private` method passed the same way. That was shown with a scratch file linted with the repository configuration, kept as [`unbound-method-probe.ts.txt`](probes/execution-boundary/unbound-method-probe.ts.txt).

   So if one of the arrow-field steps above became a private method while the gate still called it with no receiver, lint would pass, and the first sample would throw. The arrow form is the only protection, and nothing checks it. The root ESLint configuration calls this rule "the only instrument in the pipeline for a method read without a receiver". It doesn't cover `#` methods.

## 2. Is pass execution a separate responsibility? [R]

**Tested against `DRD-24`'s criterion,** which says that the controller owns what exists across operations or with no operation, and the session owns one operation. The test also asks what interface a separate owner would need.

- **Lifetime.** `#running`, the step list and the destruction slot exist with no operation. A request made while idle and the press that admits an operation both run a pass. All three end with the controller. They have the controller's lifetime, so by `DRD-24` they are the controller's.

  CONTRIBUTING §10 asks a class for meaningful lifecycle identity. A pass owner would be created and dropped with its `Gesture`, so it would have no identity of its own.

- **The interface it would need.** Taking the code at `ef8c6cd96` as the specification:

  | A separate pass owner would hold | It would ask `Gesture` | `Gesture` would ask it |
  | --- | --- | --- |
  | `#running`, the step list, the bracket and the reader's loop | whether destruction is requested, and to tear down. That is the reader's first branch | whether a pass is running, which `requestDestroy` reads to defer teardown |
  |  | for the step's argument: the current session's `stepTarget()` | to clear the steps, which `#teardown` does |
  |  | to advance the current session. That is the reader's last branch | to enter, and to apply |
  |  | to `raise` a throw, which decides the current session |  |
  |  | whether the controller is closed, which makes the gate refuse |  |

  **The session would then depend on two objects.** Today it reaches only `Gesture`. With a pass owner it would reach the pass owner for `enter`, `raiseInPass` and `requestStep`, and `Gesture` for `raise` and `detach`. The other choice is that `Gesture` forwards those calls.

  **Moving destruction into the pass owner doesn't close the loop.** `use` reads the destruction state, and teardown is controller work: the session, the controller's disposers and the root's listeners.

- **The precedence interleaves three owners:** destruction, the deferred steps, and the operation's decision and next step. That order is `DRI-2`'s one reader. Holding the loop in another object doesn't make the precedence any one object's. It only means the loop asks for two of its three inputs.
- **The function values come from the signature, not from the owner.** A pass owner with today's `enter(fn, argument)` still needs `#move`, `#up`, `#endPending`, `#press`, `#command` and `#runStep` as function values.
- **One pass object per pass** would allocate per sample, against `DRI-17`.

**Verdict: rejected.** Under §2.2 the result would be a forwarding layer between two objects with one lifetime. The responsibility is placed correctly. What the owner noticed is the gate's vocabulary, and §3 addresses that.

## 3. The proposed gate

**The decision should be made on these properties. The names are the prototype's, and they are illustrative.**

- **G1. One gate for input.** `enter(handler, event)` takes the object that does the work and the event. It calls the handler's method, which a module-internal interface declares in method syntax: `handleInput(event)`.
  - A running pass or a closed controller refuses the input.
  - A throw from the work is a fault.
  - The reader follows the work, and the gate reopens in `finally`.
- **G2. `Gesture` and `Session` are each the platform's listener object and the gate's handler.**
  - **`handleEvent` runs outside a pass.** It filters the events. It turns `Escape`, `pointercancel` and `lostpointercapture` into requests, and it passes everything else to the gate.
  - **`handleInput` runs inside the pass.** It dispatches on `event.type` to private methods.
  - The two kinds must stay apart. A request has to fill its slot even when a pass is running (`DRI-1`, `DRI-4`), and a gate refuses whatever it is given.
- **G3. One entry for requests: `apply()`.** It applies the requests now, unless a pass is running, whose reader applies them. Every request fills its slot and then calls it:
  - `requestCancel`;
  - the session's cancel, from `Escape`, an interruption or `drag.requestCancel`;
  - a verdict's acceptance;
  - **`requestDestroy`.** The reader then applies every request, including destruction while idle (§1, point 4).

  `apply` refuses nothing and counts nothing.

- **G4. A step requested while idle is the first step of its own pass, and never enters the list [E].** The prototype's first version pushed the step and then applied the list.
  - V8 regrows an emptied array's backing store on its next push, so that version allocated on every idle request: 23,636 B over 300 samples, attributed to `requestStep`.
  - The per-sample test failed: the kernel allocated 79 B per sample, against a bound of 16.
  - The base already avoids this. The list stays a `DRD-6` list, used only for requests made while a pass is running.
- **G5. A verdict's fault keeps its own entry.** In a running pass it is raised at once, so `DRI-7`'s "when caught" holds. While idle it is the first step of a new pass, so an `error` listener's requests wait for the reader.
- **G6. Requests, idle steps and faults share one private pass.** Its optional first step is a function only where the work is already a function: the consumer's step, or `raise`. So `#running` is set in two places: in the input gate, and in this pass.

  The prototype also tried four explicit entries, each with its own bracket. That version passed, but it set `#running` in four places.

- **G7. The reader doesn't change:** its precedence, its catch on each turn, and a step's argument computed when the step runs.
- **G8. The development count counts each refused event once.** This is an instrument change, and it is the owner's to accept under `DRD-23` (§4, last row).

**What stays a function value, and why:**

| Function | Why |
| --- | --- |
| `requestStep`, `requestCancel`, `requestDestroy`, `use` | The contract requires controller members that work detached |
| `raise` | `runDragDisposer` receives it detached, from 4 call sites |
| The `Drag` record's `use`, `requestStep` and `requestCancel` | Public members closed over the session. The callback assessment kept them |
| The `#next` transitions, the verdict's `complete` and its `then` callbacks, the click guard | Each one carries its own transition's data, or the platform calls it. The callback assessment kept them |

Making `raise` a method would mean passing `runDragDisposer` an object instead of a function. It would save 1 function per controller, and it is not proposed.

## 4. What is preserved

| Property | How it holds in the prototype | Evidence |
| --- | --- | --- |
| **`DRI-6`: nested input is refused**, and the next real press works | `enter` refuses on `#running` or `#destroyed`, as at the base. Every input entry goes through it | [E] Both `DRI-6` tests pass. The harness's check after each test found no trusted refusal |
| **`DRI-1`: a request made while idle applies before the call returns** | Each request fills its slot and calls `apply()`, which runs the reader before it returns. A request made during a pass finds `#running` set, and that pass's reader applies it | [E] `requests` › "should apply an idle request before the call returns" passes |
| **`DRI-2`'s precedence** | `#applyRequests` is unchanged, apart from one inlined call. A step requested while idle runs before the reader, where the destruction slot is empty and the list is empty: a pass drains the list before it ends | [R] [E] `order` passes |
| **`DRI-7`: faults** | The input's work and the pass's first step are each wrapped in `try`, and a throw calls `raise`. The reader catches each turn. `#running` resets in `finally`. A verdict's fault is raised in the running pass, or as a new pass's first step | [E] `faults` and `verdict` pass |
| **`DRI-8`: deferred writes** | During a pass a step is pushed, and coalesced by identity. While idle it is a first step. The step's argument is computed when it runs. That is now just before `#running` is set, and nothing runs in between. A `Drag`'s scope check is unchanged | [E] `requests` and `scoped-requests` pass, and so does the per-sample test |
| **`DRI-10`: destruction** | Teardown's order is unchanged. Destruction requested while idle now runs as a pass that the reader applies. Two consequences: <ul><li>teardown runs with `#running` set, so an input dispatched by a disposer is refused, as at the base, and is now counted in development builds;</li><li>a throw from teardown would be reported and not reach `requestDestroy`'s caller. Teardown is total [R]: `terminate` catches its platform calls, every disposer runs under `runDragDisposer`, and the abort and the resolution don't throw.</li></ul> | [E] `destruction` passes |
| **Lifecycle order** | The bodies of every session transition are unchanged. Arrow fields became private methods. The slot is cleared at the same three points | [R] [E] `operation-lifecycle`, `terminals`, `release` and `focus` pass |
| **`DRI-17`: nothing allocated per sample** | No function is passed. A sample makes one more string comparison, in `Session.handleInput` | [E] The per-sample test passes in Chromium |
| **The boundary** | `Session` reaches `Gesture` through `enter`, `apply`, `raise`, `raiseInPass`, `detach` and `requestStep`. `Gesture` reaches `Session` as before. The handler interface has one method and is internal to the kernel | [R] |
| **`DRI-6`'s development count** | **Changed:** each refused event counts once. A nested primary press during `activate` or `start` reaches the session's pending-press listener on the window and the root's listener. The base passed `null` from the session, so only the root counted the event. Passing the event counts it twice. The prototype counts each event once, through a set that exists only in development builds | [E] Without the set, `terminals` › "should refuse a nested press…" and `requests` › "should finish the step when a custom element reaction asks to press during activate" fail in Chromium and Firefox with `untrusted: 2`. With the set they pass. The production bundle has no development-only code: the one `WeakSet` in `draggable alone` is `admitted` |

## 5. The prototype's results

| Check | Base `ef8c6cd96` | Prototype |
| --- | --- | --- |
| Typecheck | Passes | Passes [E] |
| Lint on both kernel files | — | Passes [E] |
| Suite, Chromium (`just test`) | 344 passed, 3 failed. The 3 failures are size checks | 343 passed, 4 failed [E]. All 4 are size checks: the base's 3 and `example: drop zone` |
| Suite, Chromium and Firefox (`just test-engines`) | 633 passed, 9 skipped, none failed [E] | 633 passed, 9 skipped, none failed [E] |
| Suite, WebKit | **Not run.** The browser didn't launch | **Not run** |
| Per-sample test, Chromium | Passes | Passes [E] |

**Size** in bytes, minified and Brotli, from `bench/size/measure.ts` [E]:

| Composition                   | Base         | Prototype    | Brotli change |
| ----------------------------- | ------------ | ------------ | ------------- |
| `draggable alone`             | 6435 / 2123  | 6596 / 2136  | +13           |
| `draggable + lift`            | 11891 / 4129 | 12052 / 4152 | +23           |
| `example: resize handle`      | 9092 / 3229  | 9253 / 3247  | +18           |
| `example: drop zone`          | 12690 / 4420 | 12851 / 4442 | +22           |
| `example: canvas group`       | 9228 / 3230  | 9389 / 3250  | +20           |
| `freeDrag`                    | 15104 / 5059 | 15265 / 5077 | +18           |
| `freeDrag + bounds + landing` | 15789 / 5310 | 15950 / 5332 | +22           |
| `sortable + y`                | 20372 / 6641 | 20529 / 6659 | +18           |
| `sortable + xy`               | 19992 / 6584 | 20149 / 6606 | +22           |
| `complete`                    | 21525 / 7041 | 21682 / 7057 | +16           |

**Why the size grows,** by reading: the members `handleInput`, `handleEvent` (on `Gesture`) and `apply` are not `#`-private, so the minifier can't shorten them. The pass's second bracket also adds code. Removing the arrow fields and the two `NOOP`s saves less than that adds.

`example: drop zone` goes over its ceiling by 11 B. `freeDrag`, `freeDrag + bounds + landing` and the control row were over at the base already. **No cost is accepted here.**

**Allocation, by reading:**

| Where | Base | Prototype |
| --- | --- | --- |
| Per controller | 10 arrow fields: the 4 public members, `raise`, `#runStep`, `#onPress`, `#press`, `#onCommand`, `#command` | 5: the 4 public members and `raise` |
| Per operation, pointer or command | `#move`, `#up` and `#endPending`, plus the `Drag`'s 3 closures and the transitions | The `Drag`'s 3 closures and the transitions |
| Per module load | 2 `NOOP`s | None |
| Per sample | None [E] | None [E]. One more string comparison |

**Iterations,** each kept in the probe:

1. **v1:** the step list for an idle step, and the event passed at every input. It failed the per-sample test, and two refusal counts read 2 instead of 1, in Chromium and Firefox. These failures are G4's and G8's witnesses.
2. **v2:** the idle step as a first step, destruction through `apply`, and each event counted once. Four explicit brackets. Every test that ran passed.
3. **v3, proposed:** v2 with the brackets for requests, idle steps and faults merged into one private pass (G6).

## 6. Other designs

- **Keep the base.** It is sound, and its single bracket is the smallest mechanism. Its cost is the representation §1 describes: arrow fields that only the gate needs, a placeholder for "no work", two meanings of "refused", and an idle destruction applied outside the reader. Its 3 per-operation functions are `DRO-6`'s accepted cost.
- **A separate pass owner:** rejected in §2.
- **A receiver argument, `enter(step, receiver, argument)`** calling `step.call(receiver, argument)`. The callback assessment rejected this for its small saving.
  - Here it would also keep one signature for four kinds, and keep `NOOP`.
  - It amounts to binding by hand at every call site.
  - The lint can't check it for private methods [E].
- **A bracket at each call site,** an open call and a close call around the work. Each caller would then repeat the fault handling, and one gate would become a convention.
- **Running the whole of `handleEvent` inside the gate.** A running pass would then refuse `Escape`, `pointercancel` and `lostpointercapture`, and a request made during a pass would be lost (G2).
- **An idle step through the list:** v1's allocation, against `DRI-17`.
- **Four explicit brackets (v2):** correct, but `#running` is set in four places.

## 7. If the owner adopts it

**Records:**

- **A decision** amending `DRD-24`'s interface table:
  - the gate's row: input with its handler and event;
  - a new row for `apply`;
  - the handler interface.
- **`DRD-26`'s member list** gains `apply`.
- **`DRD-1`** notes that destruction requested while idle is applied by the reader.
- **`DRI-6`,** if the owner accepts G8: "development builds count each refused event once". The contract's change record cites the decision.
- Nothing else in the contract changes. The public types and `DraggableController` are unchanged.

**One implementer unit:** apply v3 in one commit, with no test edited. Its checks:

- the suite in Chromium, Firefox and **WebKit**;
- the per-sample test;
- the handoff loop.

**Mutations,** each shown to fail, then reverted and not committed:

| Mutation | What must fail |
| --- | --- |
| An idle step through the list | The per-sample test [E, v1] |
| No per-event set in the count | The two refusal tests [E, v1] |
| `apply` refuses when the controller is closed | `destruction`, because idle destruction would never be applied [R] |
| `enter` doesn't refuse while a pass is running | `DRI-6`'s tests [R] |

**Not authorized here:** timing, rebased ceilings and accepted costs. Size and allocation are recorded as `DRO-8`'s were, and the cost is the owner's.

**The lint gap in §1, point 5,** is a repository instrument question, and it is not part of this unit. It matters to the kernel only while the base's form stays.