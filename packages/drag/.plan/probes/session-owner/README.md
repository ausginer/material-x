# Session-owner prototype

The prototype that [`session-prototype-handoff.md`](../../session-prototype-handoff.md) defines for `drag:DRD-24`: the session owns one operation and makes all of its transitions, and the controller owns what spans operations. Both talk through a small interface. The behavior owed is [`contract.md`](../../contract.md), unchanged.

**Base:** `e06476d2b` on `drag/production`. The candidate was built in a detached worktree at that commit, and only `src/draggable.ts` changed. **Nothing is merged, and production source is unchanged.** The earlier probe's candidate was not used. The owner's `drag/session-class-preview` branch was not touched.

| File | What it is |
| --- | --- |
| [`draggable.diff.txt`](draggable.diff.txt) | The candidate as a unified diff against `e06476d2b`. From the repository root, `git apply packages/drag/.plan/probes/session-owner/draggable.diff.txt` applies it. `git diff --check` reports its blank context lines as trailing whitespace. The space is part of the diff format, so it stays |
| [`results.txt`](results.txt) | Raw summaries: the suite in three engines, `just size`, the minified-name attribution, the heap count and the line counts, for the base and the candidate |

## Result

| Check | Result |
| --- | --- |
| 1. The suite in three engines, no test edited | **Met in Chromium, Firefox and WebKit.** The behavior failures are the same at base and candidate in every engine: the two `DRD-25` tests. The candidate adds failures of the size gate only (§Size). See §Suite |
| 2. Typecheck and lint | Pass, after the handoff loop. See §Lint |
| 3. The boundary, by reading | Holds on every point. See §Boundary |
| 4. Ordering | Every required ordering is kept. See §Ordering, and §Differences from the base for the checks that change |
| 5. Allocation | The per-sample test passes. It runs only in Chromium. One session object per operation, and none after destruction: `[1, 1, 1, 0]` in Chromium. Per operation the candidate creates 3 more functions than the base, and per controller 5 fewer functions and 1 more object. See §Allocation |

**No stop condition was met.** No test needed an edit, every ordering in `DRD-24`'s required properties was kept, no sample allocates, and the controller and the session read or write none of each other's fields. Every interface member is one that `DRD-24` lists. `handleEvent` is the listener form that the handoff offers, and only the platform calls it.

## Does the session own its operation?

**Yes, by the reading below. The orchestration of an operation moved into the session. It is not behind a forwarding layer.**

- **Every transition of an operation is a session method, and runs in the session.** Samples and the threshold (`#move`), ending a pending press (`#endPending`), release (`#up`), activation, the drop, the verdict request and its completion, conclusion with focus, the terminal step, and destruction's part (`terminate`). At base all of these were `Gesture` methods that read `this.#session!`.
- **The controller makes no choice from the session's state.** It calls `advance()` and stops its loop when that returns `false`. `advance` itself decides between concluding and running the next step. `stepTarget()` gives the `Drag` or `null`, and `decide()` records a cancel. Nothing returns a code that tells the controller which transition to run.
- **The controller's part of an operation is the slot and the landing, and the session decides when.** The session calls `detach()` at the three points where the base cleared the slot, `takeLanding()` before the lift measures, and `keepLanding()` at conclusion.
- **What the controller still orchestrates spans operations:** admission and the construction of a session, the gate and its refusal count, the deferred steps and the reader's precedence, destruction and its order, the controller's disposers, and the root's listeners.

**What stays coupled, and why it is not orchestration:**

- The session holds the controller and calls 8 of its members (§Interface). Each is a controller responsibility named in `DRD-24`: the gate, faults, the slot, the landing and deferred steps.
- A fault the session catches goes through `raise`, which decides the _current_ session through `decide`. When the session that caught it is current, this is a round trip back into the same session. That is `DRD-24`'s "Raise: `#raise`, unchanged". It keeps one fault path for the lift, disposers, the reader and steps.
- `Gesture` keeps `#root`, `#window` and `#threshold` only to pass them to each session. `#behavior` is also read by admission.

## Structure

**`Session`**, a module-private class whose fields are all `#`-private. It holds the operation's `Drag`, admission, the motion and operation `AbortController`s, disposers, phase, decision, next step, verdict aborter, lift, `started`, focus and the release outcome. It also holds its own copies of the fixed values: the behavior, root, window and threshold.

**`Gesture`**, the controller. It holds the root's listeners, the controller's disposers, admission, the gate (`#running`), the step list, the destruction slot, the reader, the slot (`#session`) and the landing (`#cancelLanding`).

**`draggable()`** returns a new object with exactly `requestStep`, `requestCancel`, `requestDestroy` and `use`, each the `Gesture` instance's stable arrow function. The instance and its interface stay inside the module.

**`runDisposer(dispose, outcome, raise)`**, a module function that both sides use. It replaces `Gesture.#dispose`, which the session can't call.

## Interface

From the controller to the session:

| Member | What it does | Callers | Base code it replaces |
| --- | --- | --- | --- |
| `constructor(gesture, behavior, root, window, threshold, admission, pointerId, x, y)` | Builds the `Drag` and installs the listeners. A command operation sets its first step, the activation | `Gesture.#open`, from `#press` and `#command` | `#open`, and `#command`'s write to `session.next` |
| `advance(): boolean` | One turn of the reader: concludes an unapplied decision, or else takes and runs the next step. Returns whether it did either | `Gesture.#applyRequests` only | The reader's decision and next-step branches |
| `decide(reason, origin): void` | Records a cancel as the decision if none is recorded. Enters no pass | `Gesture.raise`, `Gesture.requestCancel`; the session's own `#cancel` | `decision ??=` in `#raise` and `#cancel` |
| `stepTarget(): LiftedDrag \| null` | The `Drag` from the end of activation until the drop or the decision, and `null` otherwise | `Gesture.#runStep` | `#runStep`'s condition |
| `terminate(): void` | Destruction's part: closes motion, aborts the verdict, releases with `null` | `Gesture.#teardown` | The session branch of `#teardown` |

From the session to the controller:

| Member | What it does | Callers in `Session` | Base code it replaces |
| --- | --- | --- | --- |
| `enter(step, argument)` | The gate. Unchanged except its name, which loses `#` so that the session can call it | `handleEvent` (sample, release, pending press), `#cancel`, the verdict's completion | `#enter` |
| `raise(error)` | Reports a fault, and decides the current operation if nothing has. Stable, so the lift receives it as before | the `Drag`'s `use`, `#activate` (passed to the lift), `terminate`, `#release`, `#conclude` | `#raise`, renamed |
| `isCurrent(session)` | Whether `session` is in the slot | the `Drag`'s `requestStep` and `requestCancel`, `handleEvent` for `Escape`, the verdict's completion | `this.#session === session`, and `this.#session` truthiness in `#onEscape` |
| `detach()` | Clears the slot | `#endPending`, the terminal step, `#conclude` without `start` | The three writes of `null` to `#session` outside teardown |
| `takeLanding()` | Returns the landing's canceller and clears it | `#activate` | `#activate`'s read and clear of `#cancelLanding` |
| `keepLanding(cancel)` | Stores the canceller that `lift.land` returned | `#conclude` | `#conclude`'s write to `#cancelLanding` |
| `raiseInPass(error)` | The verdict's way in for a fault. Raises at once when a pass is running, so that pass's reader applies it, and otherwise enters a new pass with `raise` | the verdict's completion | `complete`'s read of `#running` |
| `requestStep(step)` | The public method | the `Drag`'s `requestStep` | Unchanged |

The fixed values are not read from the controller (§Choices).

## Choices

| Choice | Made | Why |
| --- | --- | --- |
| Member names | As in §Interface. `enter` and `raise` keep the base's names without `#` | Each names the controller's responsibility at the call site. `decide` records and does not apply, which the doc comment says. `takeLanding` and `keepLanding` name the two directions of the landing, and `raiseInPass` says where the fault is raised |
| How the listeners enter the gate | **The session is the listener object, through `handleEvent`.** The gate steps `#move`, `#up` and `#endPending` are arrow fields, created once per operation | The listeners add no function per operation, and the session's `this` is its operation. A step passed to the gate must be a stable function that `enter` calls without a receiver, so the steps are arrow fields. Escape and the pointer events share `handleEvent`, which tests `event.type === 'keydown'` first |
| The verdict's way in | **An acceptance records the decision and calls `enter(NOOP, null)`, as at base. A fault calls `raiseInPass(error)`** | An acceptance needs no knowledge of the running pass. Inside a pass the gate refuses it, the reader of that pass applies the decision, and the refusal count does not see a `null` argument. Only the fault path read `#running` at base. Reporting it outside the pass would let an `error` listener's requests run in a separate pass, which `DRI-1` and `DRI-7` forbid. So the one member that reads `#running` does it inside the controller |
| Fixed values | **Copied into the session's `#` fields at construction** | No controller field becomes public. A sample reads `this.#behavior` and `this.#threshold` as the base read them on `Gesture`, with no second hop. The minifier mangles the names. The cost is four constructor arguments and four field writes per operation, with no allocation |

## Boundary

Evidence for check 3, from the candidate file. Line numbers are those of `draggable.ts` with the diff applied.

- **`Gesture` uses only the session's interface members.** Every `session` reference in `Gesture` (917–1191): `this.#session?.advance()` (998), `this.#session?.decide(fault, 'fault')` (1015), `this.#session ? this.#session.stepTarget() : null` (1070), `this.#session.decide(reason, 'request')` (1075), `new Session(…)` (1152), `session?.terminate()` (1174). The rest are reads and writes of the slot and its comparison in `isCurrent`.
- **The session's other members are `#`-private.** Members of `Session` (408–909) without `#`: `constructor`, `advance`, `decide`, `stepTarget`, `terminate` and `handleEvent`. Every field is `#`-private.
- **The session writes no controller field, and calls only the controller's interface.** `Session` names `#gesture.` or `gesture.` with: `detach` 3, `enter` 5, `isCurrent` 4, `keepLanding` 1, `raise` 8, `raiseInPass` 1, `takeLanding` 1, `requestStep` 1. A search for an assignment to `gesture.<member>` finds none. `Gesture`'s fields are `#`-private, so the compiler refuses any access from `Session`.
- **No step returns a value from which the controller chooses a transition.** Every gate step and every session method returns `void`, except `advance(): boolean`, whose `false` ends the reader's loop, and `stepTarget()`, which gives the step's argument.
- **`draggable()` returns an object other than the `Gesture` instance**, built in `draggable` with exactly `requestStep`, `requestCancel`, `requestDestroy` and `use`.
- **`enter` is the only code that sets the gate.** `#running =` occurs only at 968 (`true`) and 979 (`false`), both in `enter`. `raiseInPass`, `requestStep` and `requestDestroy` read it.
- **The reader is the only loop that applies requests, and the only caller of `advance`.** `.advance(` occurs once, at 998 in `#applyRequests`.
- **No non-null assertion on the slot remains.** A search for `#session!` and `session!` finds nothing. The remaining `!` are on `defaultView`, `behavior.command`, `#steps.shift()`, `#disposers.pop()` (both sides) and `#resolveDestroyed`, as at base.
- **Neither the controller object, a `Drag` nor any hook argument reaches the session or the controller's interface.** The returned object holds four arrow functions. The `Drag`'s closures capture the session and the controller and expose neither. The lift receives `raise`, as `DRD-24` allows.

## Ordering

| Point | Base | Candidate |
| --- | --- | --- |
| Pending press | `#endPending`: abort motion, abort operation, clear the slot (815–817) | `#endPending`: abort motion, abort operation, `detach()` (666–668) |
| Conclusion without `start` | closing, settle, release, landing, then clear the slot and restore focus (1058–1059) | the same steps, then `detach()` and `restoreFocus` (905–906) |
| Conclusion with `start` | terminal step: clear the slot, `end`, restore focus in `finally` (1049–1054) | terminal step: `detach()`, `end`, `restoreFocus` in `finally` (896–901) |
| Teardown | take the slot and the resolver, clear both, clear the steps; close motion and abort the verdict, release with `null`; cancel the landing; the controller's disposers; the listeners; resolve (1066–1099) | the same order. The session's part is `terminate()` (1174 → 559–567), called where the base's `if (session)` block was |
| Landing taken | after the `isConnected` check, before the lift (839–841) | `takeLanding()` at the same point (690) |
| Landing cancelled | in the `finally` after the lift (856) | the same (705) |
| Landing stored | after release, `this.#cancelLanding = lift.land(landing)` (1038) | after release, `keepLanding(lift.land(landing))` (885). A throw from `land` skips the store, as at base |
| A verdict | acceptance: decide, then `enter(NOOP)`; fault: `#raise` in a running pass, else `#enter(#raise)` | the same, with `raiseInPass` choosing the branch (771) |

### Differences from the base

Each check or ordering that the base does not have, and each base check that the candidate drops:

1. **`handleEvent` tests `event.type === 'keydown'` first.** A pointer sample pays one string comparison that the base did not, because one listener object now takes both kinds of event. It allocates nothing.
2. **The pointer path does not read the slot.** The base returned when `this.#session?.drag.pointerId` did not match, so an empty slot also returned. The candidate compares with `this.#drag.pointerId`. A pointer listener is attached only while motion is open, and motion closes before or with every clear of the slot: `#endPending` aborts motion before `detach()`, conclusion closes motion before it, and teardown clears the slot and then calls `terminate()`, whose first act aborts motion, with no foreign code between them. So the slot holds this session whenever the listener runs. The same argument covers the `interrupted` cancel, which at base went through `#cancel`'s slot test.
3. **`Escape` tests `isCurrent(this)`, where the base tested that the slot is non-null.** The keydown listener lives until release, which comes before the slot is cleared except in teardown, where the slot is empty. So the two tests agree.
4. **A `Drag`'s `requestCancel` tests `isCurrent` once.** The base tested it and then `#cancel` tested the slot again.
5. **`#endPending` enters the gate with `null` as its argument**, where the base passed the session. `countRefused` reads `isTrusted`, which is `undefined` for both, so a refused pending-press step is not counted in either.
6. **A command operation sets its first step in the constructor, before the controller stores it in the slot.** The base set it after `#open` returned. Nothing runs between the two.
7. **The three gate steps are created for a command operation too**, which never uses them (§Allocation).
8. **`draggable()` builds the 4-member controller object** once per controller.

No ordering in `DRD-24`'s required properties changed.

## Allocation

**The per-sample test passes.** It runs only in Chromium (`it.runIf(isChromium)`), in the `shipped` project: `hot-path` › "should allocate per sample only the CSS string a lifted write needs". It sums allocation in `draggable.ts`, which now holds `Session`. A sample enters the gate with `this.#move` or `this.#up`, which are fields.

**Session objects, from the earlier probe's scratch heap test** ([`session-probe.browser.test.ts.txt`](../session-class/session-probe.browser.test.ts.txt), copied unchanged into the candidate tree, run in Chromium, then deleted): `[1, 1, 1, 0]`, one `Session` during each of three operations and none after destruction. At base the session is an object literal, so the class-name count does not apply there.

**Per operation, by reading** (a pointer press that activates and drops, without lift or a thenable verdict):

| Created | Base | Candidate |
| --- | --- | --- |
| Session | 1 record | 1 `Session` |
| `Drag` and its `use`, `requestStep`, `requestCancel` | 1 object, 3 functions | the same |
| Motion and operation `AbortController`s with their signals | 4 objects | the same |
| Disposer array, motion options, event-type array, keydown options | 4 objects | the same |
| Window listeners | `#onPointer` and `#onEscape`, per controller | the session itself |
| Gate steps for the window's events | none: `#move`, `#up`, `#endPending` per controller | 3 functions: `#move`, `#up`, `#endPending` |
| `next` steps, the click guard, the verdict's aborter, `complete` and `then` callbacks, outcomes | as at base | the same |
| **Total for the session's opening** | **9 objects, 3 functions** | **9 objects, 6 functions** |

A command operation has no motion options and no event-type array: 7 objects and 4 functions at base (with the activation step), 7 objects and 7 functions in the candidate.

**Per controller:** the base's `Gesture` has 15 arrow-function fields. The candidate's has 10, because `#onEscape`, `#onPointer`, `#move`, `#endPending` and `#up` moved to the session. `draggable()` adds 1 object. So a controller creates 5 fewer functions and 1 more object.

`decide(reason, origin)` builds the outcome only when no decision exists, as the base's `??=` did.

## Line counts

Counted from the base and candidate files. "Code" excludes blank lines and lines that are only comments.

| Unit                                                    | Lines | Code |
| ------------------------------------------------------- | ----- | ---- |
| `draggable.ts` at base                                  | 1132  | 763  |
| — `Session` record type, with its doc comment (246–269) | 24    | 15   |
| — `Gesture` (410–1101)                                  | 692   | 514  |
| `draggable.ts` in the candidate                         | 1231  | 811  |
| — `runDisposer`                                         | 11    | 11   |
| — `Session` class (408–909)                             | 502   | 354  |
| — `Gesture` (917–1191)                                  | 275   | 205  |

`Gesture` shrinks by 417 lines (309 code). The file grows by 99 lines (48 code).

## Size

Probe evidence only, not a `DRO-4` reading. The rows are `just size` at the base and the candidate, in one session. No ceiling or control was changed.

| Row | Base min | Candidate min | Δ | Base Brotli | Candidate Brotli | Δ | Gate at candidate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| draggable alone | 6563 | 6935 | +372 | 2117 | 2220 | +103 | over its 2139 B ceiling by 81 B; control moved by 196 B |
| draggable + lift | 11929 | 12301 | +372 | 4075 | 4192 | +117 | over its 4169 B ceiling by 23 B |
| example: resize handle | 9230 | 9602 | +372 | 3244 | 3340 | +96 | over its 3313 B ceiling by 27 B |
| example: drop zone | 12649 | 13021 | +372 | 4341 | 4462 | +121 | over its 4431 B ceiling by 31 B |
| example: canvas group | 9384 | 9756 | +372 | 3269 | 3366 | +97 | over its 3314 B ceiling by 52 B |
| freeDrag | 14827 | 15199 | +372 | 4926 | 5035 | +109 | over its 4967 B ceiling by 68 B |
| freeDrag + bounds + landing | 15513 | 15885 | +372 | 5184 | 5283 | +99 | over its 5210 B ceiling by 73 B |
| sortable + y | 19940 | 20316 | +376 | 6529 | 6629 | +100 | passes |
| sortable + xy | 19556 | 19932 | +376 | 6464 | 6570 | +106 | passes |
| complete | 20972 | 21348 | +376 | 6902 | 7003 | +101 | passes |

At base, every row passes except the control: "draggable alone" reads 2117 B against its 2024 B control (moved by 93 B), as the earlier probe also found. Every row moves by +372 to +376 B minified and +96 to +121 B Brotli, because every composition imports `draggable.ts`. No row was designed as a control for this change. In the candidate, seven rows fail their Brotli ceilings, by 23 to 81 B, and the three `sortable` rows pass.

**Attribution of the minified difference of "draggable alone", +372 B** (`results.txt`, from a scratch Rolldown build with `measure.ts`'s options that reproduces both readings exactly):

| Cause | Bytes |
| --- | --- |
| Interface and public member names written out in full: `raise` +80, `enter` +55, `isCurrent` +45, `requestDestroy` +28, `requestCancel` +26, `decide` +24, `detach` +24, `raiseInPass`, `takeLanding`, `keepLanding` and `requestStep` +22 each, `stepTarget` +20, `terminate` +18, `advance` +14, `handleEvent` +11, `use` +6 | +439 |
| More references to private names, which the minifier shortens to 2 bytes: 264 against 200 | +128 |
| The base's session record fields, which were unmangled property names and are now `#`-private: `drag` −120, `decision` −96, `verdictAborter` −70, `phase` −60, and 9 more | −612 |
| Other code: the class declaration, the constructor's arguments and field writes, the interface methods' bodies, `handleEvent`'s dispatch, `runDisposer` and the controller object, net of removed `this.#session!` reads | +417 |
| **Total** | **+372** |

So the unmangled interface names cost about as much as the base's unmangled record fields saved. The net cost is mostly the code of a second class and its constructor. The earlier probe measured +770 B minified and +275 B Brotli on its different boundary.

## Suite

Base and candidate ran in one session, with no test edited.

| Run | Base | Candidate |
| --- | --- | --- |
| `just test-engines` (Chromium, Firefox, WebKit) | 6 failed, 866 passed, 16 skipped (888) | 6 failed, 866 passed, 16 skipped (888) |
| `just test` (Chromium and node) | 3 failed, 313 passed (316) | 9 failed, 307 passed (316) |

**The failures in three engines are the same at both:** `destruction` › "should cancel a running landing and the row animations" and `sortable options` › "should keep a row animation past the terminal, until destruction", in each of Chromium, Firefox and WebKit. These are `DRD-25`'s displacement defect, which `composition-handoff.md` item 2 fixes. They were not repaired.

**`just test` adds failures of the size gate only.** At base it fails those two tests and `size.node.test.ts` › "draggable alone", whose control row has already moved. The candidate fails the same three, plus six more `size.node.test.ts` rows over their ceilings (§Size). No behavior test differs.

**The three-engine condition that the earlier probe left open is met.**

## Lint

The first pass of the handoff loop failed `just lint` with one error, in the candidate's new code: `typescript(consistent-type-assertions)` on the controller object in `draggable()`, written as an object literal with `as`. It is now a typed `const` that is cast on return. Then `fmt`, `lint-fix`, `fmt` and `lint` gave no errors, `typecheck` passed, and `git diff --check` was clean.

## Limits

- **The engines ran in a dev container with user-space libraries.** Firefox 157.0 and WebKit 27.2 are Playwright 1.64.1's builds, installed into the user's Playwright cache. WebKit's system libraries are not installed on the image, and there is no root. They were fetched with `apt-get download` from Debian trixie, unpacked into a scratch directory, and linked into WebKit's own `sys/lib`. `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` and Mesa's EGL vendor directory were set. Chromium is the image's `/usr/local/bin/chrome`. Base and candidate ran with the same setup in one session.
- **Allocation per sample** was checked only by the existing heap-sampling test, on active samples. Pending samples before the threshold were not sampled. The session count is Chromium only, because `countHeapObjects` uses the DevTools protocol.
- **No timing.** An active sample now pays one more string comparison in `handleEvent` (§Differences from the base, item 1), and reads `this.#drag` and `this.#phase` where the base read `this.#session!` and its properties. Neither was measured.
- The size rows are probe evidence, not a `DRO-4` reading. Nothing is accepted.

## Decision owed

The architect adopts the model and replaces `composition-handoff.md` item 1 with its adoption, changes the interface and asks for another prototype, or applies `DRD-24`'s fallback. The size cost in §Size goes to the owner before adoption.

## Disposition

**The model meets `DRD-24`, and the architect recommends adopting it.** `DRD-24`'s §Prototype result separates the test evidence recorded here from what the architect verified by reading the applied diff. The architect re-ran no test. [`composition-handoff.md`](../../composition-handoff.md) item 1 applies this diff unchanged, once the owner approves the cost in `DRO-6`. If the owner declines, item 1's fallback form lands instead.