# `drag:DRD-71` and `repo:RF-127` (#228) — feature proof

**Files were read at:** `48bd23f9a`, the head of #235 (`drag/command-signal-1`), in slot `b`. The base is `ee7d838cc`. `origin/main` at `864e5345a` merges cleanly. Every run used scratch copies of the branch and of the base with the packages rebuilt in them. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2, headless, on Linux.

**Subject:** `DRD-71` in [drag's index](../../../packages/drag/.plan/00-index.md), `RF-127` and `RD-31`'s eighth amendment in [`00-index.md`](../../00-index.md), drag's [contract](../../../packages/drag/.plan/contract.md), the implementation notes, the diff `ee7d838cc...48bd23f9a`, and #235's description.

**Verdict: both do what they say, in the three engines. No finding is tier A or B.** Two findings are tier C: no row reads a key toward the start (`reviewer-1`), and two sentences of the register are out of date (`reviewer-2`). Nothing found holds the merge.

## Scope

**Covered, `DRD-71`** ([`kind.txt`](checks/kind.txt)), on the published build. The same probe on the base gives the same lines, apart from the kind and the count of arguments:

- **The kind:** `'pointer'` for a mouse by real input; for touch and a pen in Chromium by emulated input; and for a dispatched `pointerType` of mouse, touch, pen and none in the three engines. `'command'` for each of the four arrow keys, with `y()` and for two of them with `xy()`, and with a landing. `onStart` gets two arguments and the same receiver as before, once for each operation.
- **The order:** a command's `onReorder` and `onEnd` come before a microtask queued in `onStart`. A real pointer's come after a task.
- **No start:** a key at each edge, a key that isn't an arrow, `data-drag-ignore`, a `null` handle, an item that leaves between admission and activation, a press without a move, and one with Alt.
- **An `onStart` that cancels, destroys, throws, invalidates, removes the item or reorders the list,** by key and by mouse. The outcome is the base's, and the next key and the next mouse drag have their own kinds. A throw is one reported fault with `end:canceled:fault`.
- **Sequences:** `K M K K M M K`; with an Escape, a drag out and back, and no-ops; a key during a drag and a key and a press during a pending verdict, which start nothing; a verdict that is refused or throws.
- **An `onStart` that takes the item alone, and none,** work as before.
- **What didn't change:** the built JavaScript of drag differs in `sortable/operation.js` alone, and the declarations in `sortable`, `sortable/behavior` and `sortable/domain`. So the kernel and `freeDrag` are the base's byte for byte. `freeDrag`'s `onStart` gets one argument.
- **Types:** a strict consumer's `tsc` against the published declarations accepts an `onStart` with none, one and two parameters, an exhaustive `switch` over the kind and its name, and rejects another kind and a kind for `freeDrag` ([source](probes/types.ts.txt)).

**Covered, `RF-127`** ([`list.txt`](checks/list.txt)), on the built elements, frame by frame, the same on the base:

- **A key move paints no footprint** in any frame or in the `reorder` handler, with a commit in the handler, in a microtask, in the next task, in the next frame, after 100 ms and 700 ms, never, refused, with React state and with `flushSync`; static and button items, and a handle; with the preference for reduced motion and without. 87 readings, and none paints. On the base each paints, where it has a frame or a handler. **By pixels too:** the placeholder's box in a pending key move is the same as with a hidden placeholder, and differs on the base.
- **Nothing else moves:** the placeholder's place and height, the item's and the neighbor's order and rest, and the flight's presence, start and end are the base's, to the frame that each run caught. Under reduced motion there is no flight, as on the base.
- **A pointer drag paints the footprint in every frame,** held, in the `reorder` handler and during a pending commit, and also: after a key move that was accepted, refused, timed out, ended by Escape, or whose item left; during a key move's flight; after a disconnection or a move in the DOM in the middle; after a key at the edge; after `K K P K`; with a handle; and, in Chromium, by a finger. After each, the next key move paints none. A key move after a disconnection in the middle of a pointer drag paints none.
- **The state's reach:** items, their content, a nested list, its items and an `mx-list` keep their visibility, and a nested list's key move doesn't set the outer list's state. A page's `transition: all`, outline and opacity on the placeholder show nothing in a key move.

**Covered, both:** the rows rerun (drag's `keyboard.browser` in the source and the consumer project: Chromium 40, Firefox and WebKit 36 and 4 skipped; material-x's `tests/list/`: 175, 173 and 2 skipped, 173 and 2 skipped); drag's node and declaration projects, 76; typecheck; the root `fmt-check`; CI on `48bd23f9a`, where every job passes; ten mutations, none from the report ([`mutations.txt`](checks/mutations.txt)); the README, the contract, the JSDoc and #235; [sizes](checks/sizes.txt), which are #235's in every figure, with every other row unchanged.

**The bench, not counted:** `compare.ts --prove --dry` and `--floors --dry` stop at `injection does not apply in sortable/operation.ts: this.#lift.translate(drag.x - …)` on the base too, with the same message. So it is on `main`. The two injections that this unit changed apply.

**Not covered:** Safari; a touch screen; assistive technology; the bench's readings; the visual project, which CI ran; touch in Firefox and WebKit by real input; drag's whole suite, which CI ran in the three engines.

## Findings

### reviewer-1

**Tier C.** No row reads the kind of a key toward the start.

- **Observed:** with `'command'` reported only for a key toward the end, the 172 rows of `keyboard`, `callbacks` and `sortable` pass in the source and the consumer project, in the three engines. Each row of `DRD-71` presses `ArrowDown`, and so does each footprint row of the list, so an `ArrowUp` would paint the footprint with no failure there either, by reading.
- **What the element does:** `ArrowUp` and `ArrowLeft` give `'command'`, and an `ArrowUp` in the list paints none. Read.
- **Required property:** a key in each direction has a row that fails when its kind is wrong, or the record says that one is enough. `DRD-71` asks for _an arrow key_.
- **Route:** the implementer, if it is wanted.

### reviewer-2

**Tier C.** The register says that `DRD-71` isn't implemented.

- **Observed:** drag's index has, in the table of entries, _"Ready for an implementer. Unimplemented, and not in the contract"_. The contract states it. The implementer's note corrects the entry's first paragraph only.
- **Required property:** the table agrees with the entry.
- **Route:** the architect, when he closes it.

## Observations, no finding

- **The contract's exception** to a command's drop is _"unless `onStart` cancels or destroys"_. A throw ends it too, as a fault (`DRI-7`), and so does an `onStart` that removes the item and invalidates. The README and the JSDoc say _ends_, which covers them.
- **The state stays after a key move,** as `RF-127` says, so `mx-sortable-list:state(command)` matches in a page's CSS until the next operation. A page's own slotted element with `data-drag-placeholder` is hidden as long. The attribute is drag's, so this is the page's misuse.
- **A page's `[data-drag-placeholder] { visibility: visible }`** wins over the list's rule, as any outer rule does.
- **An `onStart` with a second parameter of the consumer's own,** such as a method with an optional argument passed as it is, now gets the kind. `DRD-71` property 6 promises only the one that takes the item.
- **A lifted item removed during a pending commit** reports `sortable/landing-placeholder-lost`, on the base too. It is registered.

## Next

The architect closes the two entries. The probes are in [`probes/`](probes/).