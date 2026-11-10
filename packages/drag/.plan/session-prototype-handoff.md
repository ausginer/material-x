# Session prototype handoff

**Done.** The record is [`probes/session-owner/`](probes/session-owner/README.md), at `b54832a0e`. Its disposition is in `DRD-24`, and adoption waits for the owner's `DRO-6`.

**One bounded prototype for one implementer. Build `DRD-24`'s ownership model in `src/draggable.ts`, check it against its base, and record the result. Nothing is merged, and production doesn't adopt it in this unit.** The decision is `DRD-24` in [`00-index.md`](00-index.md). The behavior owed is [`contract.md`](contract.md), unchanged.

**Base:** `drag/production` at the commit that carries this file. Build in a new worktree from that commit. **The owner's main checkout is on `drag/session-class-preview` and holds the earlier probe's candidate, uncommitted. Don't touch that checkout or that branch.**

**The earlier probe is evidence, not a starting point.** [`probes/session-class/`](probes/session-class/README.md) built a different boundary. Its notes on ordering and on how activation takes the landing still apply. Start from the base file.

**Do not expand:**

- Only `src/draggable.ts` changes. No test, other source file, ceiling or public type changes.
- No fix of `DRD-25`'s findings. [`composition-handoff.md`](composition-handoff.md) item 2 owns them. A test that fails at the base fails the same way in the prototype.
- No measurement campaign and no timing. Size rows are probe evidence, not a `DRO-4` reading. Nothing is accepted.
- No merge into `drag/production`'s source.

## Work

### 1. Build the model

`DRD-24` gives the boundary, the interface in both directions, and the required properties. Meet all of them.

**Your choices, each recorded with its reason:**

- the names of the interface members;
- how the session's listeners enter the gate: functions created once per operation, or the session itself as the listener object through `handleEvent`;
- the form of the verdict's way in;
- whether the session keeps the fixed values in its own fields or reads them from the controller.

**Return to the architect before adding an interface member that `DRD-24` doesn't list.** One that reads or writes the other side's state doesn't meet the goal.

### 2. Check

1. **The suite, in three engines, with no test edited.** Run the package's `test` and the three-engine recipe at the base and at the prototype, in one session. The failures must be the same at both.
   - Run where Firefox and WebKit are installed. The earlier probe couldn't, so its three-engine condition is still open.
   - If you can't install them, run Chromium, record that the condition is unmet, and continue. The architect can't adopt without it.
2. **Typecheck and lint** pass, after the [handoff](../../../.agents/docs/handoff.md) loop.
3. **The boundary, by reading.** For each point, record the evidence, such as a search and its result:
   - `Gesture` uses only the session's interface members, and the session's other members are `#`-private.
   - The session writes no controller field, and calls only the controller's interface.
   - No step returns a value from which the controller chooses a transition.
   - `draggable()` returns an object other than the `Gesture` instance, with exactly `requestStep`, `requestCancel`, `requestDestroy` and `use`.
   - `#enter` is the only code that sets the gate. The reader is the only loop that applies requests, and it is the only caller of the session's advance.
   - No non-null assertion on the slot remains.
4. **Ordering.** Show where the slot is cleared at its three points and in teardown, and where the landing is taken, cancelled and stored. Each must match the base's order relative to focus restoration and `end`. List every check or ordering that the base doesn't have.
5. **Allocation.**
   - The suite's per-sample allocation test passes.
   - Count the objects and functions created per operation at the base and in the prototype, by reading. Confirm the count of session objects with the earlier probe's scratch heap test, [`session-probe.browser.test.ts.txt`](probes/session-class/session-probe.browser.test.ts.txt), in Chromium. Don't commit it as a test.

### 3. Record

Put the record in `probes/session-owner/`:

- `README.md`, with the result of each check above and its evidence;
- the diff against the base, as `draggable.diff.txt`;
- the interface as built: each member, its direction, its callers, and the base code it replaces;
- your choices from step 1, and why;
- the line counts of `Gesture` and the session class, against the base file;
- every `just size` row at the base and the prototype. Attribute the minified difference of "draggable alone" to member names and other code, as the earlier probe did;
- the raw summaries, in `results.txt`;
- the limits, including any engine not run.

### 4. Finalize

1. Run the [handoff](../../../.agents/docs/handoff.md) checks on the Markdown you wrote.
2. Commit only the record on `drag/production`, then push and stop.
3. Remove the worktree after the record is committed.

## Stop and return

Stop, record what you have, and return to the architect if:

- a test needs an edit;
- an ordering in `DRD-24`'s required properties can't be kept;
- a sample allocates;
- the model needs the controller to read or write a session field, or the reverse, or needs an interface member `DRD-24` doesn't list.

## After this unit

The architect reads the record. The architect either adopts the model and replaces `composition-handoff.md` item 1 with its adoption, changes the interface and asks for another prototype, or applies `DRD-24`'s fallback. Any size or performance cost goes to the owner before adoption.