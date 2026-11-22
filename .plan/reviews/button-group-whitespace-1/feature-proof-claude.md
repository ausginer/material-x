# The button groups with whitespace between their buttons — feature proof

**Files were read at:** `aa7831ae4`, the head of #117 (`repo/button-group-whitespace-1`), in slot `e`. The base is `main` at `682639048`. The tree was clean apart from one temporary source revert and one probe, which this record names. Both were removed after their runs, and `git status` was clean afterwards except for this review's files.

**Subject:** `repo:RF-72` in [`00-index.md`](../../00-index.md#rf-72--the-button-groups-treat-every-slotted-node-as-a-button-so-whitespace-between-buttons-throws), its required property, and the implementer's dated entry. The coordinator relayed #105 and asked for these checks: that the new rows discriminate; that roving tabindex, the `data-first` and `data-last` marks, selection and pointer handling still hold; that the size figures are correct; and whether the defect belongs to core's `useSlot`.

**Verdict: the change holds, and it is in the right place for `RF-72`.** Every claim in the implementer's entry reproduces, and the readings below are mine, saved in [`checks/`](checks/). I have one finding, `reviewer-1` (tier B), on core's `useSlot`. It isn't caused by #117 and doesn't block it. It turns on `@ydinjs/core`'s public surface, so it is routed to the architect.

## Scope

**Covered.**

- **The diff,** `682639048..aa7831ae4`. Each group's callback now ignores the `nodes` argument and reads `slot.assignedElements()`, with the same cast it had before as a type argument, now as an `as` assertion behind `oxlint-disable-next-line typescript/no-unsafe-type-assertion`. `mx-button-group` keeps the result for its pointer handlers. `mx-connected-button-group` clears and sets `data-first` and `data-last` on it. `useSlot.ts` and `useRovingTabindex.ts` are unchanged. Neither call passes `{ flatten: true }`, as before, so a forwarded `<slot>` is handled as it was.
- **The rows discriminate,** in Chromium, Firefox and WebKit. At the head, the 81 behaviour rows of `tests/button-group/` pass ([`behaviour-head.txt`](checks/behaviour-head.txt)). With the two source files set to `682639048`'s content and the tests left at the head, the four new rows fail in each engine: 12 failed, 69 passed ([`behaviour-base-src.txt`](checks/behaviour-base-src.txt)). I reran the same tree with `--dangerouslyIgnoreUnhandledErrors`, and the same 12 rows still fail, each on its own `expect` ([`behaviour-base-src-ignore-unhandled.txt`](checks/behaviour-base-src-ignore-unhandled.txt)). So no row depends on Vitest's unhandled-error gate. The readings: `['', '']` against `['-1', '-1']` for the neighbours, three errors collected for press, release and cancel, no edge marks, and one error for the slot change.
- **The behaviour around the fix,** with a probe that runs each case on the same three items with no whitespace and with `RF-72`'s separated markup, in three engines at the head ([probe](probes/whitespace.browser.test.ts.txt), [output](checks/probe-head.txt)). Both markups read the same in every case and engine, 24 rows of 24:
  - **Roving tabindex:** tab stops `[0, -1, -1]`. ArrowRight gives `[-1, 0, -1]` and moves focus to the second item. End gives `[-1, -1, 0]`, Home gives `[0, -1, -1]`, and ArrowLeft from the first wraps to the last.
  - **Selection:** `value="b"` checks the second item, and setting `value` to `a` checks the first. Clicking the third item doesn't change `value` in either markup, so whitespace doesn't change it.
  - **Edge marks:** after the last item is removed, the marks are `[['', null], [null, '']]`. After an item and a text node are prepended, they are `[['', null], [null, null], [null, '']]`.
  - **Pointer handling** on `mx-button-group`: pressing the first button sets only the middle button's trailing property, pressing the last sets only the middle's leading property, and both `pointerup` and `pointercancel` clear every property.
- **The order tests.** They now write whitespace markup, and they pass at the head. With the base source, their own assertions still pass. The slot callback's errors surface only as 6 of the 9 unhandled errors that Vitest attributes to those two files. The errors make the run exit non-zero but don't fail a row. That is expected: the rows observe upgrade order, and `RF-72`'s property is observed by the four new rows.
- **The spec project:** the button-group files pass in three engines, 150 rows, as the entry says.
- **Sizes.** I read all 33 rows at the head with `just size-reading` ([`size-head.json`](checks/size-head.json)). Every row equals the implementer's [`size-after-fix.json`](../../button-group-whitespace-1/checks/size-after-fix.json). Against [`size-before-fix.json`](../../button-group-whitespace-1/checks/size-before-fix.json), exactly four rows move: `button/split-button` 7496 → 7516, `button-group/button-group` 3113 → 3118, `button-group/connected-button-group` 3864 → 3884, and `complete` 22158 → 22205. None has a limit.
- **Lint, format and types** for the five changed files: `oxlint`, ESLint and `oxfmt --check` are clean, and `tsc -p tsconfig.json --noEmit` in `packages/material-x` exits 0.
- **Core's `useSlot` and its callers,** read at the head for `reviewer-1`: `useRovingTabindex.ts`, `polyfills.ts`, `ListItemCore.ts`, `sortable-list.ts` and `TextFieldCore.ts`.

**Not covered.**

- Real Safari. The `*/safari` projects need macOS, and this host is Linux. Every WebKit reading comes from Playwright's WebKit.
- The usage snippets in `button-group.mdx` and `connected-button-group.mdx`, which `RF-72` cites. They weren't rendered. The probe's separated markup has the same shape.
- The full suite. The whole button-group directory ran, in both the behaviour and the spec projects.

## Findings

### reviewer-1

**Tier B, not caused by #117.** Core's `useSlot` lets a caller type the slot's assigned nodes as an element type. The compiler accepts that type, the nodes don't have it, and `RF-72`'s defect came from this signature.

- **Current contract.** `useSlot<T extends Node = Node>(host, slotOrSelector, callback: SlotControllerUpdateCallback<T>)` is exported as `@ydinjs/core/controllers/useSlot.js`. Its callback receives `nodes: readonly T[]`, which is `slot.assignedNodes() as T[]` behind an `oxlint-disable` in `useSlot.ts:50-51`. The doc comment says the nodes include _text nodes and other non-element nodes_. The type parameter is documented as _the node type expected from the observed slot_. So `useSlot<HTMLElement>` compiles, and its callback gets text nodes and comments typed as `HTMLElement`.
- **Why it is a problem.** The signature tells an integrator something the runtime contradicts, and the compiler can't catch the mismatch at the call site. Both in-repository callers that passed a type argument were misled in the same way: `useSlot<ButtonLike & ControlledElement>` and `useSlot<ButtonLike & Checkable & ControlledElement>` at `682639048`, which is `RF-72`. The callers that work either use only the count (`useHasSlottedPolyfill`), check every node (`ListItemCore`'s `instanceof HTMLElement`, `useRovingTabindex`'s `isItem`), or ignore the nodes. None of them passes a type argument. After #117, no caller in the repository passes one, and the two groups read `slot.assignedElements()` behind casts of their own. So the type parameter now has no in-repository use except the default, and the hazard remains for any other integrator of `@ydinjs/core`. CONTRIBUTING §1.2 puts _callback shapes_ among the constraints that belong in types. Here the type states a constraint that doesn't hold.
- **Why #117's fix is still in the right place.** `RF-72`'s required property is stated for the two groups, and the groups now meet it in three engines without any change to core. A change to core's signature would be a separate public-surface decision, and it isn't needed to close `RF-72`. `@ydinjs/core` is 0.1.0 with no release tag in the repository, so CONTRIBUTING §8's freedom to change an unreleased API would apply to that decision. Whether to take it is the architect's call.
- **Evidence.** `packages/core/src/controllers/useSlot.ts` at `aa7831ae4`. `git show 682639048:packages/material-x/src/button-group/{button-group,connected-button-group}.ts` shows the two type arguments. `grep -rn 'useSlot<' packages --include=*.ts` at the head finds only the declaration.
- **Required property.** The type that `useSlot` gives its callback's nodes is one that every node it passes actually has.
- **Routing.** To the architect, as a public-surface question on `@ydinjs/core`. It isn't a defect in #117, and it doesn't block it.

### No other finding

The fix satisfies `RF-72`'s required property for both groups in three engines. The new rows discriminate on their own assertions. Roving tabindex, the edge marks, selection and pointer handling read the same with and without whitespace. The size figures are exact.