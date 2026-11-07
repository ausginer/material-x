# Session-class probe

The probe that `drag:DRD-24` defines: an operation class over a read-only state that `Gesture` shares with it. It was built in a temporary detached worktree at `184f430bb` on `drag/production`, and only `src/draggable.ts` changed. **Nothing is merged, and production source is unchanged.** The architect decides what happens next (§Decision owed).

| File | What it is |
| --- | --- |
| [`draggable.diff.txt`](draggable.diff.txt) | The candidate as a unified diff against `184f430bb`. From the repository root, `git apply packages/drag/.plan/probes/session-class/draggable.diff.txt` applies it |
| [`results.txt`](results.txt) | Raw summaries: suite, size rows and minified-name attribution, for the base and the candidate |
| [`session-probe.browser.test.ts.txt`](session-probe.browser.test.ts.txt) | A scratch Chromium test that counts `Session` objects in heap snapshots. It ran only in the candidate tree and is not committed as a test |

## Result against the pass conditions

| Condition | Result |
| --- | --- |
| The three-engine suite passes with no test edited | **Not satisfiable in this environment.** Firefox and WebKit are not installed (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`), so `just test-engines` runs Chromium only. In Chromium the base and the candidate have the same result: 294 passed, and the same 2 failed. No test was edited |
| Typecheck and lint pass | Pass, after the handoff loop. See §Lint |
| No non-null assertion on the slot remains | Holds. The remaining `!` are on `defaultView`, `behavior.command`, `#steps.shift()`, `disposers.pop()` and `#resolveDestroyed`, as at base |
| A sample allocates nothing | Holds in Chromium. `hot-path` › "should allocate per sample only the CSS string a lifted write needs" passes. It sums allocation in `draggable.ts`, which now holds `Session` too |
| An operation allocates one session | Holds. `new Session` occurs only in `#open`. The scratch test counted `Session` objects during three operations and after destruction: `[1, 1, 1, 0]` in Chromium |
| The slot is cleared at the same three points, in the same order | Holds by construction. See §Ordering |
| `#applyRequests` stays the one reader, and only `Gesture` enters a pass | Holds. Every `#enter` call is inside `Gesture`. `Session` calls `#enter` only through the public `requestStep` and `requestCancel`, which `DRD-24` allows for its `Drag` |

**No stop condition was met.** No test needed an edit, every ordering was kept, and no allocation was added on a sample.

### Base failures, not caused by the candidate

These fail identically at `184f430bb` and in the candidate, and were not repaired:

- `destruction` › "should cancel a running landing and the row animations" and `sortable options` › "should keep a row animation past the terminal, until destruction". These are `DRD-25`'s displacement defect, which `composition-handoff.md` item 2 fixes.
- `size.node.test.ts` › "draggable alone": the control row reads 2117 B against 2024 B (control moved by 93 B). This is already so at the base.

The candidate adds failures of the size gate only. See §Size.

## Structure

**`GestureState`**, one object that `Gesture` holds in `#state`:

- the slot (`session`) and the landing (`cancelLanding`), which only `Gesture` writes;
- the fixed values `root`, `behavior`, `window` and `threshold`;
- `controller`, the `Gesture` instance typed as its public `DraggableController`, which a `Drag` forwards `requestStep` and `requestCancel` to while its operation is current;
- `raise`, the existing `#raise`, which the lift and every disposer report through;
- `complete`, the one pass entry that a verdict settling later needs.

Each `Session` receives `Readonly<GestureState>`. Writing `gesture.session` or `gesture.cancelLanding` from `Session` is a type error.

**`Session`** holds the steps inside one operation: the sample (`move`) and release (`up`) steps, ending a pending press (`endPending`, aborting only its own controllers), `activate`, the drop and the verdict request (`#drop`, `#requestVerdict`), `closeMotion`, `release`, and `conclude` up to the landing.

**`Gesture`** keeps the listeners, the gate, the reader, the scope checks, `#raise`, `#cancel`, admission, `#open`, and every write to the slot and the landing: `#endPending`, `#activate`, `#complete`, `#conclude` with focus and the terminal step, and `#teardown`.

**`#enter(step, argument, session?)`.** The sample, release and pending-press steps receive the session that `#onPointer` tested as a third argument. `countRefused` still reads the event. The third parameter is optional and passed to the step through a cast, so the compiler does not check that a step needing a session receives one.

## How activation takes the landing, and why

**`Gesture` hands the landing to the activation.** `Gesture.#activate` reads `cancelLanding`, clears the field, and then stores whatever `session.activate(cancelLanding)` returns. `activate` returns `null` once it has used the landing, and returns it unchanged when the item was removed during the press, before the landing is touched.

- **Disconnected item:** at base the take comes after the `isConnected` check, so the landing stays in the field. Here it is cleared and written back, so it stays cancellable by the next activation or destruction, as at base.
- **A throw from the lift, `setPointerCapture`, `activate` or `start`:** the assignment after the call does not run, so the field stays `null`. At base the field was also cleared before the lift.

**Rejected: the session calls the canceller and leaves it in the field.** That canceller has already run, and it would stay until `conclude` or teardown replaces it. Teardown, or the next activation, would then call it a second time when the lift threw or a landing did not start. A second `flight.cancel()` and `elevation.cancel()` is probably harmless, but base never makes that call, and avoiding it costs one more write per activation.

## Ordering

- **Pending press, slot cleared:** `Gesture.#endPending` calls `session.endPending()` (abort motion, abort operation) and then clears the slot. This is the base order. `#move` and `#up` return right after it, as at base.
- **No `start`:** `session.conclude` runs closing, settle, release and the landing. `Gesture` then stores the landing, clears the slot and restores focus, as at base.
- **With `start`:** `Gesture` builds the terminal step, which clears the slot, runs `end`, and restores focus in `finally`. This is the base step.
- **The landing after conclude** is stored after `conclude` returns, rather than inside it. Nothing runs between those two points.
- **Verdict completion:** `Session` keeps the `done` flag and clears its `verdictAborter`. `Gesture.#complete` then applies the base's checks and pass entry unchanged.
- **A `Drag`'s `requestCancel`** goes through the public `controller.requestCancel`, which calls `#cancel(reason, 'request')` as before. It adds one call frame.

## Checks and orderings the base does not have

1. **`if (cancelLanding)` in `Gesture.#conclude`.** At base, `#conclude` assigned `lift.land(landing)` whenever it called it, even when the result was `null`. Here, `conclude` returns `null` both when no landing was started and when `land` returned `null`, so `Gesture` writes only a non-null result. That is equivalent because the field is always `null` when `land` is called: the activation that set `lift` took the landing.
2. **A second write to `cancelLanding` per activation:** clear, then store the result. In the disconnected case this restores the same value.
3. **A result code from `Session.move`**, `SAMPLED`, `PRESS_ENDED` or `THRESHOLD_CROSSED`, and a branch on it in `Gesture.#move`. An active sample pays one comparison with `SAMPLED`.
4. **A boolean from `Session.up`** and a branch on it in `Gesture.#up`.
5. **`#onPointer` reads the slot once into a local.** The conditions are the base's.

**Not a new runtime check, but weaker than it looks:** `Readonly<GestureState>` is shallow. It stops `Session` from writing `session` and `cancelLanding`. It does not stop code holding the view from writing a field of `gesture.session`, such as another operation's `decision`. The candidate has no such write.

## Size

Probe evidence only, not a `DRO-4` reading. The rows are `just size` at the base and the candidate, in one session. No ceiling or control was changed.

| Row | Base min | Candidate min | Δ | Base Brotli | Candidate Brotli | Δ |
| --- | --- | --- | --- | --- | --- | --- |
| draggable alone | 6563 | 7333 | +770 | 2117 | 2392 | **+275** |
| draggable + lift | 11929 | 12699 | +770 | 4075 | 4356 | +281 |
| sortable + y | 19940 | 20714 | +774 | 6529 | 6805 | +276 |
| complete | 20972 | 21746 | +774 | 6902 | 7192 | +290 |

Every row is +770 to +774 B minified and +265 to +290 B Brotli. At the candidate, every row fails its Brotli ceiling, by 72 to 273 B. At base, all rows except the control pass.

**Cause, attributed from the minified "draggable alone" bundle** (`results.txt`):

- **+424 B of member names that are not mangled.** Member names on `Session` and `GestureState` are written out in full: `session` +18 references, `cancelLanding` +7, `behavior` +11, `closeMotion`, `window`, `controller`, `raise` and others. At base these values were `#private` fields, which the minifier shortens to one letter (−128 B of private-name references here).
- **About 474 B of other code:** the remaining 346 B of the delta plus the 128 B saved on private names. This is the class declaration and constructor, field initializers, the method return codes and branches, and `runDisposer`. It was not attributed further.

The rows that the change cannot touch were not designed as controls in this probe. Every composition imports `draggable.ts`, so every row moves.

## Line counts

Counted from the base and candidate files. "Code" excludes blank lines and comments.

| Unit                              | Lines | Code |
| --------------------------------- | ----- | ---- |
| `draggable.ts` at base            | 1132  | 763  |
| — `Session` record type           | 24    | 15   |
| — `Gesture`                       | 692   | 514  |
| `draggable.ts` in the candidate   | 1256  | 831  |
| — result codes and `GestureState` | 33    | 18   |
| — `runDisposer`                   | 12    | 11   |
| — `Session` class                 | 343   | 237  |
| — `Gesture`                       | 450   | 331  |

`Gesture` shrinks by 242 lines (183 code). The file grows by 124 lines (68 code).

## Tradeoffs

The probe does not establish that either form is better. What it observed:

- **Ordering:** the variant kept every ordering, and the Chromium results are identical. It needed five small new points (§Checks): two writes and a returned landing for the activation handoff, two result values from the sample and release steps, and a guarded store after `conclude`. Each follows from the read-only view: a write the operation made in place is now a value that it returns to `Gesture`.
- **Structure:** the requirement is visible in the types. A `Session` method has its operation as `this`, and `Session` can't write controller state. The cost is a second object in the kernel. A reader following one transition, such as a threshold crossing, now reads three places: `#onPointer`, `Session.move`, and `Gesture.#move` and `#activate`. At base it read one method. A verdict also crosses back into `Gesture` through `complete`.
- **Size:** +275 B Brotli on "draggable alone" (+13 %), and about the same on every composition. Most of it is unmangled member names. A variant that keeps those names mangled would need a different arrangement, such as private names, and was not tried.
- **Hot path, not measured:** an active sample now reads `this.#gesture.behavior` in `Session.move`, and `Gesture.#move` compares one return value. Base read `this.#session` 6 times. No timing was taken (no measurement campaign).

## Limits

- **Chromium only.** The three-engine condition is unmet here. It must be run where Firefox and WebKit are installed before the variant can be adopted.
- Allocation per sample was checked only by the existing Chromium heap-sampling test, on active samples. Pending samples before the threshold were not sampled.
- The session count used `countHeapObjects('Session')` from the suite's commands. In the candidate tree no other heap class is named `Session`. The count during an operation (1) shows that the instrument sees the class.

## Lint

The first draft failed `just lint` with 3 errors in its own new lines: `@typescript-eslint/method-signature-style` twice, on `raise` and `complete` in `GestureState`, and `@typescript-eslint/prefer-optional-chain` once, on `#onPointer`'s `!session || …` guard. Those declarations were rewritten as method signatures, and the guard was returned to base's `event.pointerId !== session?.drag.pointerId`, which TypeScript narrows. Then `fmt`, `lint-fix`, `fmt` and `lint` gave no errors, and `typecheck` passed.

## Decision owed

The architect adopts the variant and rewrites `composition-handoff.md` item 1, amends `DRD-24`, or keeps the parameter form. The candidate is preserved only as `draggable.diff.txt`.

## Disposition

**`DRD-24` was revised on the owner's requirement.** This probe built the boundary that `DRD-24`'s earlier text set: a shared state, result codes, and a lifecycle split between `Gesture` and `Session`. It is evidence about that boundary, not against an operation class. The revised entry names the restrictions that produced this shape and withdraws or narrows each one. [`session-prototype-handoff.md`](../../session-prototype-handoff.md) tests the new boundary, with its record in `probes/session-owner/`.