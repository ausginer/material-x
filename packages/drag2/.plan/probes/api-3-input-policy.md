# Probe api-3 (E) — input policy for interactive descendants

**Question.** The probe plan §Probe E states one concrete suspicion: `preventDefault()` fires at **admission** (`src/kernel/kernel.ts:719`, the only call site, inside `runAdmission`) — that is _before_ the activation threshold is crossed — so a press on a nested control inside a draggable row may be defaulted away even for interactions that never become drags. Ten cases were named. This probe answers all ten by observation.

Repo evidence before this probe: **none**. Grep across all of `tests/` returns zero occurrences of `createElement('button'|'a'|'input')`, `contentEditable`, `tabIndex`, `.focus()`, `isComposing`, or any modifier-key property. `tests/kernel/pointer.browser.test.ts` is 54 lines about `acquirePointerCapture`. `tests/sortable/keyboard.browser.test.ts` never involves an interactive descendant — every keydown in it originates on an item or on the root.

**Shape.** Unlike `13a`/`13b`/`13c` this is not a typed compile probe, and unlike `api-1` it is not library-free — the claims are about what the _library_ does to browser default actions, so it runs the real `src/` under real input. The fixture is `tests/probe-e-input-policy.browser.test.ts` (throwaway; every observation is an inline snapshot, so the numbers below are what Chromium did, not what anyone expected).

**Method.** Chromium 1280×720, `deviceScaleFactor: 1`. Presses, moves and releases are dispatched through CDP `Input.dispatchMouseEvent`; keystrokes through Playwright's keyboard; IME composition through CDP `Input.imeSetComposition`. All input is therefore trusted, and the browser's own default actions — focus, caret placement, text selection, form-control operation, link activation — actually run. Synthetic `dispatchEvent` would have answered none of the ten questions.

The fixture is one `sortable()` over eight rows, each holding a drag grip plus one interactive descendant: `<button>`, `<a href>`, `<input type="text">`, `<input type="range">`, `<select size="3">`, a popup `<select>`, a prose `<span>`, and a `contenteditable` `<div>`. The default threshold is 8 (`src/sortable/slots.ts:220`), so a **tap** below means press → move 1px → release, which cannot activate, and a **drag** means press → four moves → release, which does.

`defaultPrevented` is read from a bubble-phase listener on `document`, which runs strictly after the kernel's own `root` listener (`kernel.ts:2278`, `:2287`).

**Calibration.** CDP coordinates land on the intended element (`elementFromPoint` matches, `:hover` matches), and a grip drag through the same input path produces `onStart` ×1, one reorder request, one `onFinish` and zero errors. Every "nothing happened" below is therefore a fact about the library, not a dead fixture.

---

## R-1 — a press is defaulted away at admission, and the loss is `mousedown`-shaped

`runAdmission` calls `event.preventDefault()` on the `pointerdown` the moment a member returns non-null (`kernel.ts:712-719`). Chromium's `pointerdown` default action _is_ the compatibility `mousedown`; `click` is generated from the un-prevented `pointerup`. So the split is not "everything dies" — it is exact:

| what it is a default action of | outcome |
| --- | --- |
| `mousedown` — focus, caret placement, selection start, form-control operation | **suppressed** |
| `pointerup` / `click` — activation, `href` navigation, ctrl/meta-click | **survives** |

Observed on a sub-threshold tap on the nested `<button>` (`dragStarted: 0` throughout):

| observation                                        | value   |
| -------------------------------------------------- | ------- |
| `pointerdown.defaultPrevented` at `document`       | `true`  |
| `mousedown` fired                                  | `false` |
| `focusin` targets                                  | `[]`    |
| `document.activeElement === button`                | `false` |
| `click` reached `document` with its default intact | `true`  |

This is the mechanism behind every row of R-2.

## R-2 — six interactions are destroyed with **no drag ever activated**

All six are strictly sub-threshold: `onStart` never fired, no placeholder was ever inserted, no reorder was ever requested. This is the sharpest form of the finding — the press is not merely "reserved for a drag that might happen", it is spent on a drag that provably did not.

| case | observed | native expectation |
| --- | --- | --- |
| `<button>` tap | click fires **live**; no `mousedown`; no focus | click + focus |
| `<a href>` tap | click fires **live** (navigation would occur); no `mousedown`; no focus | activate + focus |
| `<input type="text">` tap | not focused; `selectionStart` stays `0` | focus + caret at the press point |
| `<input type="range">` tap at 75% of the track | `value` stays `"0"` | value jumps to ≈75 |
| `<select size="3">` option tap | `value` `""` → `""`; not focused | option selected |
| `contenteditable` tap, then type `XY` | not focused; caret offset `0`; **no `beforeinput`**; text unchanged (`"quick brown fox"`) | focus, caret, insertion |

Links and buttons therefore _activate_ but never _focus_ — which breaks `:focus-visible`, focus-then-Enter, focus-restoration and screen-reader focus tracking, while leaving the happy-path click looking correct. That combination is worse than a clean break, because it hides the defect from casual testing.

## R-3 — every pointer text-selection gesture becomes a drag

A selection gesture is by construction longer than 8px, so it crosses the threshold. Observed:

| case | selection produced | `onStart` | reorder requested |
| --- | --- | --- | --- |
| drag 120px inside `<input type="text">` | `""` (also: not focused, no `selectstart`) | **1** | 0 |
| drag across the prose `<span>` | `""` (no `selectstart`) | **1** | 0 |
| drag the `<input type="range">` thumb 100px | `value` stays `"0"` | **1** | 0 |

The user asked to select text or move a slider and got a row drag. There is no configuration in the current surface that distinguishes the two intents.

## R-4 — an arrow key inside a focused descendant reorders the list instead of moving the caret

The command ingress binds `keydown` on **`root`** (`kernel.ts:2287`), bubbling. Any focused descendant's arrow key therefore reaches `command.admit` (`src/sortable/spec.ts:404-446`), which asks exactly two questions — is the key an arrow (`src/sortable/keyboard.ts:33-43`), and is a one-slot move feasible (`keyboardInsertion`) — and asks nothing about what the event landed on.

Caret at offset 5 in the nested `<input type="text">` (row index 2 of 8), single `ArrowRight`:

| observation                  | value                |
| ---------------------------- | -------------------- |
| `input.selectionStart` after | `5` — **unmoved**    |
| `keydown.defaultPrevented`   | `true`               |
| `onStart`                    | `1`                  |
| reorder request              | `{ from: 2, to: 3 }` |
| `onFinish`                   | `1`                  |

One keystroke in a text field performs a **complete accepted reorder**. Not a drag the user can abandon — `admitCommand` mints the operation and dispatches `ACTIVATE` in the same turn (`kernel.ts:789-795`), so it runs to `onFinish` immediately.

The same on `contenteditable`, and on a focused popup `<select>`:

| case | native effect | library effect |
| --- | --- | --- |
| `contenteditable`, `ArrowLeft` (feasible direction) | caret 5 → 4 | caret stays `5`; `onStart` 1; request 1 |
| popup `<select>` focused, `ArrowDown` | option `a` → `b` | `value` stays `"a"`; `onStart` 1; request 1 |
| nested input, `Shift`+`ArrowRight` | selection extends by one character | selection `""`; `onStart` 1; request 1 |

`Shift+Arrow` is worth stating separately: the modifier is not read anywhere in `src/`, so "extend selection" and "move item" are the same keystroke to the library.

## R-5 — the one place the keystroke keeps its native meaning is a positional accident

`keyboardInsertion` returns `null` at the collection edge, and `runAdmission` then leaves the default alone (`kernel.ts:712-717`). This is deliberate and correct as far as it goes (I-32), but it means the _same key in the same field_ behaves differently depending on which row it is in:

| focus location | key | `keydown.defaultPrevented` | `onStart` | caret |
| --- | --- | --- | --- | --- |
| input in row **0** (first) | `ArrowUp` | `false` | 0 | native |
| same input | `ArrowDown` | `true` | 1 | frozen |
| `contenteditable` in row **7** (last) | `ArrowRight` | `false` | 0 | 5 → 6 |
| same field | `ArrowLeft` | `true` | 1 | frozen |

A user editing text in the first row learns that Up works and Down does not. There is no rule here for a consumer to document.

## R-6 — modifier keys are not read at admission

`isPrimaryPress` (`src/kernel/pointer.ts:77-79`) tests `button === 0 && isPrimary` and nothing else. Grep confirms `shiftKey`, `ctrlKey`, `metaKey`, `altKey` and `isComposing` appear **nowhere** in `src/`.

Drag from the grip with each modifier held:

| held  | pointerdown prevented | `onStart` | reorder requested |
| ----- | --------------------- | --------- | ----------------- |
| none  | `true`                | 1         | 1                 |
| shift | `true`                | 1         | 1                 |
| ctrl  | `true`                | 1         | 1                 |
| meta  | `true`                | 1         | 1                 |
| alt   | `true`                | 1         | 1                 |

Sub-threshold modified tap on the nested link, all three of shift / ctrl / meta: pointerdown prevented, `onStart` 0, and the `click` still reaches `document` live — so ctrl/meta-click "open in new tab" survives for the same reason plain activation does (R-1).

Behaviour recorded, not judged. What the observation establishes is only that the library currently has no modifier policy at all, so any future one is a new decision rather than an adjustment.

## R-7 — IME composition **is** faithfully synthesizable here, and the drag ignores it

The probe plan allowed for this case being unanswerable. It is answerable. CDP `Input.imeSetComposition` establishes a real Chromium composition, not an imitation of one:

| observation | value |
| --- | --- |
| composition events on the input | `["compositionstart", "compositionupdate"]` |
| `input.value` during composition | `"にほ"` |
| `keydown.isComposing` for the following `ArrowDown` | `true` |
| `onStart` | **1** |
| reorder requested | **1** |

An arrow key during composition — which in every CJK IME navigates the candidate list — reorders the collection instead. This is R-4 with the aggravating factor that the user cannot see it coming: they are mid-word, not interacting with the list at all.

## R-8 — `handle()` fully resolves the pointer and keyboard descendant cases

`handle()` is the only descendant-scoping mechanism today (`src/sortable/handle.ts:26-30`; the narrowing is in `resolveItem`, `spec.ts:140-161`). It is a **complete** mitigation for R-1 … R-5, because a press outside the resolved handle declines and `runAdmission` then never calls `preventDefault()` at all.

Same fixture, same input, with `handle(item => item.querySelector('.grip'))` composed:

| case | without `handle()` | with `handle()` |
| --- | --- | --- |
| `<button>` tap | no `mousedown`, not focused | `mousedown` fires, **focused**, click live |
| text input tap | not focused, caret `0` | **focused**, caret `16` |
| text input 120px drag | selection `""`, `onStart` 1 | selection `"alpha bravo charlie"`, `onStart` **0** |
| prose drag | selection `""`, `onStart` 1 | `"lorem ipsum dolor sit amet"`, `onStart` **0** |
| range tap at 75% | `value` `"0"` | `value` **`"78"`** |
| `<select size="3">` option tap | `""` → `""` | `value` **`"b"`** |
| `contenteditable` tap + type | not focused, text unchanged | **focused**, `"quick broXYn fox"` |
| `ArrowRight` in the nested input | caret frozen, reorder | caret 5 → **6**, `defaultPrevented` `false`, `onStart` 0 |

Zero errors reported, and a grip drag still works (`onStart` 1, request 1).

**But `handle()` carries a cost that is itself a finding.** Because `resolveItem` requires the handle to be in the event's composed path, the keyboard command becomes reachable **only when focus is inside the handle**. The fixture had to set `grip.tabIndex = 0` by hand before `ArrowUp` from the grip admitted (it then did: `defaultPrevented` `true`, `onStart` 1, request 1). Since nothing in the library makes a handle focusable, **composing `handle()` silently removes keyboard reordering** unless the consumer independently makes the handle focusable. Trading a correctness defect for an accessibility regression is not a mitigation a library should be relying on as its answer.

`handle()` is also not a mitigation for R-6: a modified press on the grip admits exactly as an unmodified one does.

---

## The ten cases

| # | case | observed today | verdict |
| --- | --- | --- | --- |
| 1 | `<button>` in a row | click fires and is live; **no focus, no `mousedown`**; no drag activates | **release-blocking** (focus half) |
| 2 | `<a href>` in a row | activation survives (incl. ctrl/meta-click); **no focus** | **release-blocking** (focus half) |
| 3 | `<input type="text">` | **cannot be focused, cannot place a caret**; drag-select instead starts a row drag | **release-blocking** |
| 4 | `<input type="range">`, `<select>` | **cannot be operated at all** by pointer — tap and thumb-drag both inert; popup `<select>` also loses `ArrowDown` to the reorder command | **release-blocking** |
| 5 | selectable text in a row | **no selection is ever produced**; the gesture becomes a drag | **release-blocking** |
| 6 | `contenteditable` region | **no focus, no caret, no typing**; no `beforeinput` at all | **release-blocking** |
| 7 | arrow keys inside an editable/interactive descendant | the sortable command **captures them and completes a reorder**; caret frozen; edge rows behave differently from middle rows | **release-blocking — the most severe** |
| 8 | modifier keys at pointerdown | shift/ctrl/meta/alt all admit and activate identically to no modifier; no modifier is read anywhere in `src/` | recorded; **not** independently blocking |
| 9 | IME composition | synthesizable faithfully (`isComposing: true` observed); an arrow key during composition **reorders the list** | **release-blocking** (same root cause as 7) |
| 10 | `handle()` as the mitigation | resolves 1–7 completely; **removes keyboard reordering** unless the consumer makes the handle focusable; does not address 8 | mitigation exists but is not sufficient as the answer |

### Release-blocking set

**3, 4, 5, 6, 7, 9**, plus the focus half of **1** and **2**.

Two root causes, not eight:

1. **`preventDefault()` at admission** (`kernel.ts:719`) suppresses the compatibility `mousedown` for every admitted press, including presses that never become drags — cases 1–6.
2. **The command ingress asks nothing about its target** (`spec.ts:404-446`, listener on `root` at `kernel.ts:2287`) — cases 7 and 9.

Case 8 is recorded behaviour with no observed breakage: the library has no modifier policy, and whether it should is a design question this probe does not answer.

### What works correctly today

Recorded because it constrains any change:

- **Activation survives.** `click`, `href` navigation and ctrl/meta-click all reach the document with their default intact, because only `pointerdown` is prevented. Any fix must not lose this.
- **Declining is total.** When an admission member returns `null` — outside a handle, or at a collection edge — `preventDefault()` is not called and the native meaning is fully preserved (`kernel.ts:712-717`). The mechanism for "leave this input alone" already exists and is already correct; nothing today decides to _use_ it for interactive descendants.
- **`handle()` genuinely scopes both ingresses.** One rule, one place, and it works for pointer and keyboard alike.
- **The keyboard command itself is sound** when it is the user's intent: from a focused grip it admits, activates and completes with no errors.

---

## What this probe does not claim

- **Chromium only.** The `mousedown`-vs-`click` split in R-1 is Pointer Events spec behaviour, but the precise set of suppressed default actions has not been checked in WebKit or Gecko. R-2 and R-3 should be re-run once in each before any fix is designed against them.
- **Mouse only.** Every pointer observation used `pointerType: 'mouse'`. Touch is untested, and touch has additional defaults — scrolling, long-press context menu, tap highlight — that `preventDefault()` at admission would also consume. Nothing here says what happens on a touch device.
- **No popup `<select>` was pressed.** Pressing one opens a native menu that blocks the renderer and kills the test channel. Case 4's pointer half was observed on `<select size="3">`, a real listbox with no popup; the popup `<select>` was exercised by keyboard only. The inference that a popup `<select>` also fails to open is _consistent with_ the observed `mousedown` suppression but was not directly observed.
- **No real navigation was performed.** The `<a href>` case records the `click` event's `defaultPrevented` at `document`, after every library handler, and only then suppresses navigation. That is the quantity that decides whether the link activates; the navigation itself was not allowed to run.
- **It proposes nothing.** No API, no policy, no default. It does not say whether `preventDefault()` should move to the threshold crossing, whether admission should consult the event target, or whether either should be configurable — only that the current behaviour is what is tabulated above.
- **It says nothing about the lifecycle redesign.** Per the probe plan, probe E is independent of the transaction-bracket work and its results must not be allowed to reopen that model. Nothing observed here bears on it.
- **`onEnd`/terminal shapes are out of scope.** The probe reads `onStart`, `onReorder` and `onFinish` only as evidence that an operation ran; it makes no claim about their contract.