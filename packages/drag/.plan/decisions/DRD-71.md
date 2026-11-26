#### DRD-71 — `sortable` tells `onStart` whether the operation is a pointer's or a command's

**Status:** active, decided on 2026-11-24 by the architect and accepted by the owner the same day (Q1 (a)). Amended the contract's public surface in the implementing commit. Implemented at `ec2fd5ec2` on `drag/command-signal-1` (#235), and accepted by the architect on 2026-11-24. `repo:RF-127` uses it, and `repo:RF-129` will

**Decided on 2026-11-24 by the architect, and accepted by the owner the same day: Q1 (a). Implemented on `drag/command-signal-1`, and accepted (the last note). When decided: ready for an implementer, unimplemented, and not in the contract.** From the owner's answer about `repo:RF-127`, in chat, relayed by the coordinator. The architect had told him that the list infers the kind of operation from the order of drag's callbacks, and offered the alternative that drag says it: _"Выглядит так 🤔 Давай спросим отдельно"_ ("It looks like it. Let's ask separately"). Planned on `drag/command-signal-1`. `DRD-70` is the highest `DRD-` on any branch on `origin`. Bytes aren't a constraint now, as the coordinator relays, and architecture is.

**The signal is `onStart`'s second argument.** It is the string `'pointer'` or `'command'`, of the type `SortableOperationKind`, which `sortable.js` exports:

```ts
/**
 * `'pointer'`: a pointer drags the item until its release.
 * `'command'`: no pointer. Unless `onStart` ends the operation, the drop follows it
 * synchronously. An arrow key starts one.
 */
type SortableOperationKind = 'pointer' | 'command';

onStart?(item: HTMLElement, kind: SortableOperationKind): void;
```

**Properties.**

1. **`onStart` receives `'pointer'` for an operation that `admit` admitted,** by mouse, touch or pen, and `'command'` for one that `command` admitted, which today is an arrow key.
2. **The kinds are told apart by how the operation runs, not by its device.** A `'command'` is complete in one run: its drop follows `onStart` with no pointer between them, unless `onStart` cancels or destroys. So `'command'` means that nothing is in progress for the user to see before the consumer's commit. A device name wouldn't say that: an operation held between key presses (`DRD-70`, deferred) is a keyboard's too, and has such a progress. If drag ever gets one, it gets a value of its own, and code that compares with `'command'` stays right.
3. **A consumer's own command doesn't exist.** No method of `SortableController` starts an operation. If one is added, its operation runs as a key's does, and is `'command'`.
4. **One place.** The request, the results, the `placeholder` factory's context, the DOM and the controller don't carry the kind. A controller runs one operation at a time, and `onStart` comes before `onReorder` and `onEnd`, so a consumer that needs the kind there keeps it. One that needs it on a custom placeholder keeps the element from its factory and changes it in `onStart`, which runs before anything paints.
5. **The kernel doesn't change,** and "draggable alone" stays byte-identical. A custom behavior already knows: the kernel called its `admit` or its `command`, and `drag.pointerId` is `-1` for a command. `freeDrag` runs no command, so its `onStart` doesn't change.
6. **A consumer whose `onStart` takes only the item doesn't change,** in types or at runtime.
7. **Who uses it:** `mx-sortable-list` (`repo:RF-127`, `repo:RF-129`), the only consumer of `sortable` in the repository outside drag. drag's stories don't change: they commit with `flushSync`, so a command paints no placeholder frame in them. drag writes no style and no state for a command, as before.

**Why.**

- **drag holds the fact and the consumer has to guess it.** `SortableOperation` has kept the command's direction, or `null` for a pointer, since activation. The consumer can only see when callbacks run.
- **At `onStart`, because what a consumer shows starts there.** The list's two uses are the item's look and the placeholder's, both before the first paint.
- **A string, not a boolean or a number.** The call site reads `kind === 'command'`, a third value can be added, and drag's public vocabulary is strings already (`CancelOrigin`, the results' `type`). `CONTRIBUTING.md` §4's test holds: a consumer has to write this value.
- **A positional argument, not an object.** It is one value, and an object of its own would need an ownership reason (§9).
- **The contract allows it.** An option's callback receives documented values and never the kernel's `Drag` (`DRD-25`).

**Cost,** on the published build, against `73a2320ef` ([readings](../../../../.plan/command-signal-1/checks/drag-sizes.txt)). Minified, Brotli in brackets:

| Candidate | "sortable + y" | "sortable + xy" | "complete" |
| --- | --- | --- | --- |
| **`onStart(item, 'pointer' \| 'command')`** | **+35 (+5)** | **+35 (+22)** | **+35 (+13)** |
| `onStart(item, isCommand)`, a boolean | +15 (+3) | +15 (+10) | +15 (+6) |
| `onStart(item, { kind })` | +42 (+13) | +42 (+11) | +42 (+17) |
| `data-drag-placeholder="command"` | +70 (+15) | +70 (+8) | +70 (+11) |
| `kind` on the request | +32 (+14) | +32 (+11) | +32 (+16) |

Every other row reads 0. The argument is additive, so drag's release (#57) doesn't wait for it. No pointer sample, frame or drop does more work. The owner's answer approves the change, so the implementing unit moves the three rows' ceilings to its own final readings, with no further approval (`DRO-20`). A move of any other row is a stop.

**Not adopted:**

- **The microtask between `onStart` and `onReorder`** (`repo:RF-127`). It isn't the better choice. It works, with no change in drag, and its readings stand: a command is recognized in the three engines. But it knows at `onReorder` what drag knows at `onStart`, so a look set at `onStart` has to be undone. Each consumer has to write it, and to know the contract's _Consistency_ rule to trust it. And a scripted pointer drag in one run is taken for a command.
- **The request or the result** (`request.kind`). Too late for `onStart`, and a cancel before the drop has no request.
- **The `placeholder` factory's context.** It serves one use, and a consumer that gives no factory would need one to learn the kind.
- **An attribute on the placeholder.** It serves CSS alone, and makes a DOM value part of the public surface.
- **A property of the controller or an observer's state.** It could be read between operations, where it has no meaning, and drag has no observer that a consumer reads.
- **The event that started the operation.** It is a richer promise: a `pointerdown` from before the threshold, held by the consumer, and a programmatic command would have none.
- **A separate option, such as `onCommand`.** A consumer would handle the start in two callbacks.

**Q1, for the owner — is this how drag says it?** **Answered on 2026-11-24: (a),** in chat, relayed by the coordinator: _"Q1-Q4: (a)"_. The other three letters are `repo:RF-129`'s.

- **(a) `onStart(item, kind)`, as above. Recommended. Chosen.**
- (b) `onStart(item, isCommand)`, a boolean. The smallest, and it can't take a third kind.
- (c) The microtask, with no change in drag, as `repo:RF-127` had it.

**Implementation,** on `drag/command-signal-1` with `repo:RF-127`, as one unit:

- `SortableOperation.start` passes the kind. `sortable/domain.ts` declares the type, and `sortable.js` exports it (`DRD-39`).
- **The bench:** two injections of `bench/compare.ts` find the text of `start` and its call of `onStart` in `sortable/operation.ts`. Their `find` and `replace` follow the new text. Found on 2026-11-24, at the check for readiness.
- **The contract:** the public surface names the type with `sortable.js`'s exports and states properties 1 to 3 in the paragraph on the options, and the change record gets a row. The README's keyboard text says what `kind` is.
- **Rows,** in each engine and in the consumer project against the published build (`DRD-54`): a mouse drag reports `'pointer'`, once. An arrow key reports `'command'`, once, before `onReorder`. After a command, the next pointer drag reports `'pointer'`. A key at the edge, and one that `data-drag-ignore` declines, call no `onStart`. Emulated touch reports `'pointer'`, in Chromium. **Witness:** each kind passed for the other fails its row. A declaration test, beside `DRD-39`'s: an `onStart` that takes only the item is accepted, and `SortableOperationKind` is exported.
- **Size:** _small_.

**Dated 2026-11-24 by the implementer: implemented on `drag/command-signal-1`, from `44c041ddf`, for #228, and not closed.** Requested by the coordinator. The contract states it now, so the heading's _"Unimplemented, and the contract doesn't state it yet"_ no longer holds.

- **Source:** `SortableOperation.start` passes the kind, from the direction that it already keeps. `sortable/domain.ts` declares `SortableOperationKind`, and `sortable.js` exports it. The kernel, the request, the results and `freeDrag` don't change.
- **Documents:** the contract's public surface has properties 1 to 3 and the type, and the change record a row. The README had no text on what an arrow key does, so a paragraph is new. The API documents are built from the JSDoc.
- **Rows:** `keyboard.browser.test.ts` has six, with emulated touch in Chromium only, in the source and the consumer project. `published-types.declaration.test.ts` has two.
- **Witnesses** ([reading](../../../../.plan/command-signal-1/checks/mutations.txt), [script](../../../../.plan/command-signal-1/probes/mutations.mjs)), in Chromium, Firefox and WebKit, one at a time, in both projects:
  - A pointer's kind for a command fails the row of the arrow key and the row of the drag after it, and no other. A command's kind for a pointer fails the mouse's, the touch's and the row of the drag after a command, and no other. The kinds exchanged, and no kind, fail each of them.
  - A second `onStart` at the drop fails the rows that count it. A start at a key at the edge fails the edge's row, and a `data-drag-ignore` that declines nothing fails its row.
  - Without the export, and with an `onStart` that takes no kind, `tsc` fails in the declaration rows.
- **Suites,** one engine at a time, source, shipped and consumer projects: Chromium 876 passed; Firefox 856 passed and 20 skipped; WebKit 856 passed and 20 skipped. Node project: 49 passed. Typecheck, format and lint pass.
- **Size,** as the entry's reading: minified +35 on each, Brotli "sortable + y" 6533 to 6538, "sortable + xy" 6484 to 6506, "complete" 7143 to 7156. The three ceilings are those readings (`DRO-20`). Every other row reads 0, and "draggable alone" is 2189.
- **The bench:** the two injections' `find` and `replace` follow the new text, and each applies with `--dry --only`. **Found beside it:** `--prove --dry` and `--floors --dry` stop at another injection, _one forced layout per move_ and its floors, whose `find` is `this.#lift.translate(drag.x - drag.originX, …)`, and the source has `this.#drag.x`. It isn't this unit's text, so it isn't repaired. Not registered: the architect's.
- **Not run:** Safari, a touch device, and the bench itself.

**Dated 2026-11-24 by the implementer: `reviewer-1` of the [feature proof](../../../../.plan/reviews/command-signal-1/feature-proof-claude.md) has its row.** Requested by the coordinator. No source changes. `origin/main` at `eddf39e7b` is merged.

- **Rows:** _should report 'command' once for …, before onReorder_ runs for `ArrowDown` and `ArrowUp`, and so does the list's _should paint nothing in the handler of a move by …_. So drag's file has seven rows of this entry, and the list's eleven.
- **Witness** ([reading](../../../../.plan/command-signal-1/checks/mutations-2.txt), [script](../../../../.plan/command-signal-1/probes/mutations.mjs)): with `'command'` only toward the end, the `ArrowUp` row fails in Chromium, Firefox and WebKit, in the source and the consumer project, and no other. With that drag built, the list's `ArrowUp` row fails in the three engines, and no other. The second was by hand, with the mutation in drag's source and a build.
- **Suites,** on the merge, one engine at a time: drag's browser, shipped and consumer projects: Chromium 878 passed; Firefox and WebKit 858 passed and 20 skipped. Node and declaration projects: 76. material-x without the visual project: Chromium 1128 passed and 2 expected fail (with the node project); Firefox 1078 passed, 3 expected fail, 13 skipped; WebKit 1079 passed, 2 expected fail, 13 skipped. The traits snapshot passes unchanged, and drag's size rows are at their ceilings. The root `fmt-check`, `lint`, `typecheck` and `typecheck-declarations` pass.

**Dated 2026-11-24 by the architect: accepted,** on the [feature proof](../../../../.plan/reviews/command-signal-1/feature-proof-claude.md) at `48bd23f9a` and the note above, read at `2e2c80ca0`. #235 merges it, with `repo:RF-127`.

- **Properties 1 to 6 hold** by the proof, in the three engines on the published build. Property 7's first user is `repo:RF-127`.
- **`reviewer-1`: settled by its rows.** The witness is the gap that the finding names: `'command'` for the down direction alone fails the `ArrowUp` rows, in the three engines, and no other.
- **`reviewer-2`: settled here.** The table's row and the entry's first paragraph say what is true now.
- **No recheck is owed.** Since `48bd23f9a` this unit's own code is the two tests. In the merges of `main`, the one conflict was in `.plan/00-index.md`. The suites ran on the merge that brings `main`'s code, and the second merge brings records only.
- **The proof's observation on the contract is taken:** a throw in `onStart`, and an `onStart` that removes the item and invalidates, end a command too. The contract now says _"unless `onStart` ends the operation"_, as the JSDoc does, where it said _"unless `onStart` cancels or destroys"_. Property 2 is read that way. The behavior doesn't change. The other four observations need nothing.
- **The bench's stale injections aren't a finding of their own:** they are `DRD-45` property 9's, whose note of this day has them. `DRF-56` isn't minted.
- **`verify` passes on `2e2c80ca0`.** This commit adds records, and the contract's one sentence.
- **Not run:** Safari, a touch device, assistive technology, and the bench's readings.