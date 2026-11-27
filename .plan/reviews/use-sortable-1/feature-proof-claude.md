# Core's event helper removed, and `mx-sortable-list`'s `useSortable` hook (RF-117, RF-118): feature proof

**Lens:** `reviewer`, feature proof of [`RF-117`](../../00-index.md) and [`RF-118`](../../00-index.md), with the architect's notes of 2026-11-26 and the implementer's notes, for pull request #321. The coordinator requested it.

**Commit read:** `94167bb33` on `material-x/use-sortable-1`. The commit includes `origin/main` at `085be1e2b` (#315, `RF-152`), merged at `316b53be2`. The unit's diff against `main` is the diff against the merge base: 19 files. The diff touches core's `utils/DOM.ts`, `controllers/useRovingTabindex.ts`, `README.md` and `tests/utils/DOM.browser.test.ts`; `CONTRIBUTING.md`; material-x's `core/utils/events.ts`, `list/sortable-list.ts`, `list/useSortable.ts`, `list/reorder-event.ts`, `CheckableCore.ts`, `SwitchCore.ts`, `split-button.ts` and `TextFieldCore.ts`; the index and the unit's readings and probe. No material-x test file differs from `main`.

**Outcome: accepted. Three findings, all tier C, two of them for the architect.** Each required property of both entries holds by reading. The unmutated rows pass in Chromium here and in Firefox and WebKit on CI. The `RF-117` witness holds at the head in all three engines: each of the 24 flag mutations fails at least one row of its site's file in each engine. Four of my six mutations of the hook fail rows in each engine. The two that survive change code that the unit moved without editing, and the entry says that the rows don't show it. CI's `verify` passed on `94167bb33`. On the coordinator's question about the manifest: the change loses nothing that the entries, the manifest's readers in the repository or the docs require. It isn't a finding.

## Scope and method

- **Unmutated, in Chromium:** every project of `packages/material-x` (52 files, 2850 rows passed, 2 expected to fail) and `packages/core` (28 files, 390 rows) ([reading](checks/chromium.txt)).
- **Firefox and WebKit, unmutated,** are read from CI's run 45975245450 on `94167bb33` (`RD-62`): Firefox 4328 rows passed, WebKit 4339, each with 137 files passed and 1 skipped, and `verify` succeeded ([reading](checks/ci.txt)).
- **Mutations,** each run against the site's own test file in Chromium, Firefox and WebKit at once ([script](probes/mutations.mjs.txt), [readings](checks/mutations.txt)):
  - the implementer's 24 flag flips, at the head, with `ReorderEvent`'s site in `reorder-event.ts`;
  - six mutations of `useSortable.ts` of my own, H1 to H6, against `sortable-list.browser.test.ts`.
- **The manifest** was rebuilt at the head (`aube exec just build-cem`), and the modules, exports and readers in the repository were listed ([reading](checks/manifest.txt)).
- **Read and not run:** sizes, `react.d.ts` and the node rows were not measured again. CI's `measurements` and `static` jobs passed on the head, and the Chromium run above includes the node project. No typecheck or lint was run here. CI's `static` job covers them.
- **Not covered:** Safari. The visual project isn't in the list, and the unit doesn't touch styles.

## RF-117

- **Property 2.** `DOM.ts` no longer has `DEFAULT_EVENT_INIT`, `EventDefinitions`, `EventNotifier` or `createEventNotifier`. The four rows that tested them are gone, and the other rows of `DOM.browser.test.ts` are unchanged. The README's example keeps only `toggleState`. `notify` is no longer in `core/utils/events.ts`, which keeps `useClickActivation` and `useFormActivation`. No alias is left: outside `.plan/` and the change record's row, the tree has no reference to the four names or to `notify` from `events.ts`.
- **Property 3.** `ReorderEvent` calls `super('reorder', { bubbles: true, cancelable: true, composed: true })`.
- **Property 4, by reading.** The removed notifier merged each definition over `{ bubbles: true, composed: true, cancelable: true }`. So `input` and `secondaryaction` were `{ bubbles, composed }` and `change` was `{ bubbles }`. The new dispatches pass those flags in the same order: `input`, then `change`. `CheckableCore` still dispatches `change` before it sets `input.checked`. Each `Event` is still created right before its dispatch.
- **Property 4 and the witness, by run.** All 24 flips fail rows in each engine. The counts match the implementer's Chromium reading for each site, once per engine. `ReorderEvent`'s `cancelable` flip also fails _"should animate the neighbor back when the page refuses a pointer drop"_ in each engine.
- **Property 5.** `CONTRIBUTING.md`, Part I, _Shape_, has the bullet with `RD-52`'s wording, character for character. The change record has the row.
- **`RD-52`'s status line.** It still says _Unimplemented_ (fp-3).

## RF-118

- **Property 1, amended.** The constructor is `super(); useListCore(this, [sortableStyles]); useSortable(this);`. The element's JSDoc, the three public types and `customElements.define` stay in `sortable-list.ts`.
- **Property 2, amended.** `useSortable(host: ControlledElement): void` takes no options and is in `src/list/`, next to `sortable-item.ts`. The hook holds every item that the entry and the amendment list. That includes the `command` toggle, the handle rule with `isDisabled`, `displacement` before `landing`, `DRAG_CSS_PROPS`, `LAYOUT_CSS_PROPS`, `COMMIT_TIMEOUT`, and the disconnect's clearing of `drag`. I compared the code line by line with `main`'s `sortable-list.ts`. The only changes are `this` to `host`, the provider's parameter renamed from `host` to `item`, and the proposal (property 3).
- **Property 3.** `createProposal` returns one object per `reorder`. `proposal` replaces `others` and `commit`. `onEnd` reads the object into `ended` and then sets `proposal` to `null`, and the disconnect sets it to `null`. The `check` closure is `null` before `wait` starts and after `done`, so `commit()` is inert outside the wait. The retention that the finding describes is gone. The proposal's closure stays reachable only through the verdict signal's `abort` listener, and drag drops that signal when the verdict completes (`packages/drag/src/kernel/session.ts`, `#requestVerdict`, `this.#verdictAborter = null`). The object's `request` field has no reader (fp-2).
- **Property 4.** `reorder-event.ts` holds both names. `sortable-list.ts` re-exports them. The test file still imports `ReorderEvent` from `src/list/sortable-list.ts` and passes, so the public address is unchanged.
- **Properties 5 and 6.** Only `sortable-list.ts` imports `useSortable` in `src/` and `tests/`. The node rows, including _"should reach @ydinjs/drag from list/sortable-list"_, pass in the Chromium run's node project.
- **Property 7.** The `getComputedStyle(dragged).getPropertyValue('--_level')` read and its WebKit comment are in `onStart`.
- **No behavior change: the amended registration order.** `useListCore` runs in the constructor. Then `useSortable` runs, in this order: `useAriaNotifyPolyfill`, the slot query, `useCSSProps(LAYOUT_CSS_PROPS)`, `useCSSProps(DRAG_CSS_PROPS)`, `useProvider`, `useSlot` and `use`. This is `main`'s order.
- **No behavior change: the hook mutations** ([readings](checks/mutations.txt)):
  - **Killed in each engine:** H1, `onEnd` reads a proposal that was already cleared (11 rows per engine). H2, `onEnd` tests `to` instead of `from` (13). H3, a slot change doesn't commit (8). H4, the other items include the moved item (1).
  - **H5 survives in each engine.** H5 removes the `check()` that runs when the wait starts. By reading, a commit made inside the handler still ends the wait, because its `slotchange` comes after the wait has set `check`.
  - **H6 survives in each engine.** H6 makes the wait ignore its signal, so a destroyed controller's wait ends only by its 500 ms timer. The entry's third bullet says _"its timer ends"_, and the code meets this. No row witnesses it.
  - Both survivors are lines that the unit moved without changing. The entry says that these properties are among those that _"the rows don't show by themselves"_, and its acceptance asks for no new row. This is a limit of the instrument, not a finding.
- **Acceptance.** The browser rows of `sortable-list` pass unedited in all three engines. The size and the `react.d.ts` readings are the implementer's, and I didn't measure them again.
- **`RF-152`.** `fns.ts` at the head is byte-identical to `main`'s. `parseMs` multiplies by 1 for a value that ends in `ms`, in either case, and by 1000 otherwise. The hook imports it from `../core/utils/fns.ts` for both duration descriptions, so the unit keeps it.

## The coordinator's question: `ReorderEvent` in `custom-elements.json`

**What changed.** The manifest lists the 22 runtime entrypoints of `files.json` (`cem.config.ts`'s `globs`). At the head, it has no declaration named `ReorderEvent`. `src/list/sortable-list.ts` exports `ReorderEvent` and `ReorderEventInit` with `declaration.module: "./reorder-event.ts"`, and no listed module has that path. Before `RF-118`, the class was declared in that module ([implementer's reading](../../use-sortable-1/checks/manifest.txt)). The `reorder` event entry of `SortableList` is unchanged: a name and a description, and no `type`.

**What requires it, and what doesn't:**

- **The entries.** `RF-118`'s acceptance asks only for the reading before and after, and the implementer made it. Property 4's _"public address"_ is the import path, and it holds in the JS and in the typings.
- **The manifest's readers in the repository.** Storybook's `.storybook/docs/cem.ts` selects declarations by `tagName` and reads only their summary, attributes, slots, CSS parts, CSS properties and events. It never read the `ReorderEvent` class declaration, which has no `tagName`. The `docs` job passed on the head. No other source reads the file. `package.json` publishes it as `customElements`, and the registry answers 404 for the package (`RF-117`), so no published reader exists.
- **The docs.** No document outside `.plan/` names `ReorderEvent` or describes the manifest's content.
- **Precedent.** `text-field.ts` and `multiline-text-field.ts` already re-export three types with `declaration.module: "./TextFieldCore.ts"`, an unlisted module. The new references have the same shape.

So nothing that is required is lost. A manifest reader outside the repository that follows the reference can no longer find the class's fields there. Whether the manifest should cover modules that aren't entrypoints is a question about the manifest's configuration. The implementer's note already routes it to the architect as an observation, and this pass adds no finding.

## Findings

### fp-1 — The unit's committed probe stops at the head before it reaches `ReorderEvent`

- **Tier C.** The record's reproducibility. No consumer is affected, and the witness holds at the head by my run.
- **Current behavior.** `.plan/use-sortable-1/probes/event-flags.mjs` names `src/list/sortable-list.ts` as `ReorderEvent`'s site. From `5472eba5b` on, that file doesn't contain `super('reorder', { bubbles: true, cancelable: true, composed: true })`, which is in `reorder-event.ts`. By reading, run at `94167bb33`, the probe runs the 21 flips of the other sites and then throws `ReorderEvent: text not found once`. I didn't run it. Its reading, `checks/event-flags.txt`, names no commit. The implementer's note gives `e67e120bb` only in the paragraph's header.
- **Why it matters.** The note links the probe as the evidence of the witness, and the probe was reformatted at the head (`94167bb33`). A reader who runs it at the head gets an error, and nothing in the reading or the probe says that it ran at `e67e120bb`.
- **Evidence.** `grep -c` finds the text 0 times in `sortable-list.ts` and once in `reorder-event.ts`. My script, which uses the moved site, kills all three of `ReorderEvent`'s flips in each engine.
- **Required property.** The witness's probe and reading say the commit they ran at, or the probe runs at the head that cites it.

### fp-2 — `RF-118` property 3 asks the proposal to hold the request, and nothing reads it. For the architect

- **Tier C.** Internal. No observable effect.
- **Current behavior.** `Proposal` has a `request: ReorderRequest` field because property 3 requires it. Nothing reads `proposal.request` or `ended.request`. `wait` uses the `request` parameter that it captures, and `onEnd` uses `result.request`.
- **Why it matters.** The field is required by the contract, not by the code. So the implementation is faithful, and the field is machinery with no responsibility (`CONTRIBUTING.md` §2.2). Deciding whether the property should name it is a contract call, not a defect in the implementation.
- **Evidence.** `grep -n "request" packages/material-x/src/list/useSortable.ts`: the field's declaration (line 54) and its initializer (line 101), and no member read.
- **Required property.** The architect decides whether property 3 holds as written. The implementation doesn't change before then.

### fp-3 — `RD-52` still says _Unimplemented_ after its unit. For the architect

- **Tier C.** The record only.
- **Current behavior.** `.plan/decisions/RD-52.md` says _"**Unimplemented:** `RF-117` is its unit."_ At `94167bb33`, `RF-117` is implemented and marked closed by #321. The unit doesn't touch the decision.
- **Why it matters.** A reader of the decision is told that its rule doesn't yet hold in the code. Only the architect amends a decision. The same is true of `RD-60` on `main` after #310, so this happens more than once and is reported once here.
- **Required property.** A decision's status line matches its implementation once the unit merges, or the record states that status lines aren't maintained.

## Open issues

No open issue's description stops holding with this unit. #207 and #208 are the entries' issues, and the pull request closes both. #111 is about core's `EventEmitter`, not the deleted notifier. #200 (`drag:DRF-55`) is drag's, and the entry says that the unit doesn't change it.

## Next

The coordinator routes fp-2 and fp-3 to the architect, and fp-1 to whoever owns the unit's record. None of them blocks the merge. CI's `verify` passed on `94167bb33`.