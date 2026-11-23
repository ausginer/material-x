# `useCSSProps` reads at first use (RF-109, RF-106, RF-105) — feature proof

**Files were read at:** `07943db4a`, the head of #199 (`core/css-props-1`), in slot `c`. The base is `origin/main` at `35ea25892`, and `857eb99bc` is the hook alone. Base readings replaced `useCSSProps.ts` and `sortable-list.ts` with their text at `35ea25892` in the same tree, with core rebuilt, and the head was restored and rebuilt afterwards. Probes and mutations were removed after their runs. Browsers: Playwright's Chromium, Firefox and WebKit.

**Subject:** `repo:RF-109`, `repo:RF-106` and `repo:RF-105` in [`00-index.md`](../../00-index.md), with the implementer's dated paragraphs; the amended [plan](../../list-sortable-1/list-sortable-plan.md), section 4; the implementer's [readings](../../css-props-1/checks/); and the diff `35ea25892...07943db4a`.

**Verdict: each entry's required properties are implemented as written, in the three engines, and every row count and size in the record reproduces. The change also has two effects that the entries don't record, both tier A and both from the new moment of reading in the ripple.** `reviewer-1`: a touch press on an element that is removed within the 150 ms touch delay now reports an uncaught `CSSVariableError`, in all ten elements I tried and in the three engines, where the base reports nothing. `reviewer-2`: the ripple's exit fade starts from an opacity that depends on the first interaction in the connection. Both go to the architect, and `reviewer-1` needs an answer before #199 merges.

## Scope

**Covered.**

- **Rows** ([`rows.txt`](checks/rows.txt)). material-x's `tests/button`, `fab`, `checkbox`, `radio`, `list` and `core`, browser and spec projects: 1,753 passed, 1 expected fail, 4 skipped. core's browser project: 690 passed. CI on #199 passes every job that ran.
- **RF-109 property 1, when it reads.** The core rows discriminate ([`mutations.txt`](checks/mutations.txt)), in each engine:

  | Mutation | Rows that fail |
  | --- | --- |
  | The base's hook | The six the record names, and 3 errors |
  | No discard at connect | The reconnect row |
  | Nothing kept | Later calls, a change within the connection, and the values after a disconnect. In material-x, the landing-duration row too |
  | Kept before the parse | The call after one that throws |
  | Discarded at disconnect too | The values after a disconnect |

- **RF-109 property 2 and the hidden iframe** ([`iframe.txt`](checks/iframe.txt)). At the head, ten elements that connected in a hidden iframe show their ripple after it is shown, with no error, in the three engines: the five adopters of the rows, and icon, link, switch and switch-icon buttons and the link list item. On the base each of the ten fails in Firefox alone. With the base's hook the five committed ripple rows fail in Firefox only, and with RF-105 kept on that hook the list's iframe row fails in Firefox only, as the record says. A programmatic click while the iframe is still hidden reports one `CSSVariableError` in Firefox, from the click, and a press after it is shown has its ripple. Property 2 allows that.
- **RF-109 property 3 and RF-106.** The generated declaration of `useCSSProps` is identical at the base and at the head. With the local typed `string` again, core doesn't typecheck (`TS2322` at the assignment), so the type now has to be true.
- **RF-105** ([`ripple-and-list.txt`](checks/ripple-and-list.txt)). `timing` is the hook's function, with no wrapper, and drag passes it four numbers that it doesn't take. `onStart`'s read of `--_level` isn't in the diff. With an invalid `--_drag-duration`, connecting reports nothing. The first landing reports it through drag's `reportError`, as on the base. The move is committed and announced, the `drag` state is cleared, and after the value is corrected the next landing uses it. A later change in the connection doesn't reach the landing and a reconnect does. With the base's `sortable-list.ts`, the landing-duration row fails in each engine.
- **Every consumer of the hook.** `ripple.ts` and `sortable-list.ts` are the only two. The ripple's adopters are the button, FAB, checkable and interactive list item cores. No other code reads at a changed moment. The ripple's consequences are the two findings.
- **Sizes** ([`sizes.txt`](checks/sizes.txt)). All 20 rows reproduce at the base, the hook and the head.
- **`text-field/text-field`'s +52 B.** `text-field.ts` imports `icon-button.ts`, so its bundle has the ripple and the hook. `multiline-text-field.ts` doesn't, and doesn't move. The minified bundle grows by 32 bytes, the same as each of the other five button, checkbox and text-field bundles I measured that contain the hook. At gzip 9, Brotli 9 and Brotli 5 the text field grows by 14, 16 and 13 B, as the others do (13 to 17 B, 9 to 20 B). Only Brotli 11, size-limit's setting, gives +52, and it gives −4 for `split-button` with the same added text. So the spread −4 to +52 is the encoder's, and the claims hold as readings. `complete`'s −80 is RF-105's own: the list's parsing code goes, and the hook was already in that graph.
- **The conflict with #197.** Merging with `origin/material-x/live-region-1` at `85051cf6c` gives one conflict, the import lines of `sortable-list.ts`. `00-index.md` and the list's test file merge cleanly. I didn't run the merged tree.
- **Gates:** typecheck in core and material-x, `fmt-check` and `lint` on the changed files, and `git diff --check`, all clean.

**Not covered:** Safari, a trusted touch (the probe dispatches `PointerEvent`s at the ripple's own listeners, which don't read `isTrusted`), the visual project, and the plan's other sections. This branch doesn't edit the plan: its amendment was already on `main`.

## Findings

### reviewer-1

**Tier A, introduced by this change.** The first read can happen after the host has left the document, and then it throws in a task of the ripple's own.

- **Current behaviour** ([`ripple-and-list.txt`](checks/ripple-and-list.txt), [probe](probes/ripple-and-list.browser.test.ts.txt)), the same in the three engines:
  - A touch press on an element that hasn't read in this connection, removed 50 ms later. The touch-delay timer calls `startAnimation`, and `Invalid value for --_ripple-duration` is reported as an uncaught error. It happens for the five button types, the FAB, the checkbox, the radio, and both interactive list items: 30 of 30 readings. On the base, 0 of 30.
  - A press, then a move of the element (a reconnect), then its removal before the fade. The fade's read throws, as an unhandled rejection. On the base there is none. I read this one on `mx-button` only.
  - On `mx-button`, none of these reports an error: a touch press and removal after an earlier press in that connection, a touch press and a move, a mouse press and a removal, and a mouse press and a move.
- **Cause.** A detached element has no computed style, so the parser throws. The base had read at connect, so a value existed whenever a listener had run. The ripple's 150 ms timer isn't cancelled at disconnect, and the fade waits up to 225 ms. Both can call the hook on a host that has left.
- **Contract.** Property 1 has the hook read _"at the first call in a connection"_ and the values _"stay available after a disconnect until"_ the next connect. It doesn't say what a call returns after a disconnect when the connection made no call, and property 2 lets the call throw. So the implementation follows the entry's text, and the entry doesn't cover this case. Its effect is an error the base didn't report.
- **Why it is a problem.** The end user's touch and the consumer's removal are both valid: a menu item, a dismissible row or a route that goes away on `pointerdown`, or a framework that replaces the node. The consumer sees an uncaught error in its error monitoring and can't prevent it.
- **Why the rows don't see it.** The rows press connected elements, and the row for a disconnect calls the hook before it.
- **Required property.** A press whose element leaves the document, or moves and then leaves, before the ripple starts or fades reports no error, in each engine, and a row observes it.
- **Routing.** To the architect: whether the hook or the ripple owns it is a contract call. It needs an answer before #199 merges, or a registration as a known regression.

### reviewer-2

**Tier A, introduced by this change.** The opacity that the ripple's exit fade starts from now depends on the first interaction in the connection.

- **Current behaviour** ([`fade.txt`](checks/fade.txt), [probe](probes/fade-and-iframe.browser.test.ts.txt)), identical in the three engines. `--_ripple-opacity` is 0.1 at rest and 0.08 under hover, for the five button types, the checkbox and the radio. The fade's first keyframe, against the opacity painted when it starts:

  | Interactions in a connection | Base: fade from, painted | Head: fade from, painted |
  | --- | --- | --- |
  | Mouse first | 0.1, 0.08 | 0.08, 0.08 |
  | Keyboard first | 0.1, 0.1 | 0.1, 0.1 |
  | Keyboard after the mouse | 0.1, 0.1 | 0.08, 0.1 |
  | Mouse after the keyboard | 0.1, 0.08 | 0.1, 0.08 |

  The FAB and the list items have 0.1 in both states and don't change.

- **Contract.** It follows from property 1. RF-105 lists its accepted effects, and RF-109 lists none for the ripple, whose only state-dependent variable is this one. On the base the value was the resting one for every fade.
- **Why it is a problem.** A mouse press's fade now agrees with the paint, which it didn't. A keyboard press's fade agreed with the paint, and after a mouse press it no longer does: it starts with a step from 0.1 to 0.08. The same press renders differently by what came before it. The step is 0.02, so this is small.
- **Required property.** The entry states which state's value the fade uses, and the fade doesn't depend on an earlier interaction, or the dependence is recorded as accepted.
- **Routing.** To the architect. It doesn't block the merge, in my view.

### reviewer-3

**Tier C.** The record names the cause of the size change less exactly than the reading allows.

- **Current behaviour.** RF-109's paragraph says the rows that contain the hook move by −4 to +52 B, and RF-105's says `list/sortable-list` grows _"because its graph now contains the hook"_. The first is right and gives no cause, so +52 B reads as a cost of the text field. The added text is 32 bytes in every row, and the spread is Brotli 11's. For the second, the module was in the list's graph on the base too, through `fns.ts`, for `CSSVariableError`. What is new is the function.
- **Required property.** The record says what the bytes are.
- **Routing.** To the implementer, optional.

## Recheck at `4bb981301`

**Files were read at:** `4bb981301`, in slot `c`: `fa509f2e0` (the repair), `e9b7aeab6` (the merge of `main` at `2d1b5ca51`) and `4bb981301` (the record). **Subject:** the rulings at `4f8b0fbdf` in `repo:RF-109` and `repo:RF-114`, and the implementer's second dated paragraph. Probes and mutations were removed after their runs, and the last build in slot `c` is the head's.

**Verdict: `reviewer-1`, `reviewer-2` and RF-114 are repaired as ruled, in the three engines, and `reviewer-3` is answered. The claimed rows, counts and sizes reproduce, and the merge kept both sides.** Two new tier C findings and one pre-existing observation are below. None stops the merge.

### What was checked

- **`reviewer-1`** ([`recheck-ripple.txt`](checks/recheck-ripple.txt), [probe](probes/recheck-ripple.browser.test.ts.txt)). The proof's own probe, at the new head: 45 of 45 readings report nothing. That is the touch press removed within the delay on ten elements, the touch after an earlier press, the moved touch, and the press that is removed, moved, or moved and removed, in each engine.
- **`reviewer-2`.** In ten elements and the four orders, the fade has the one keyframe 0, and the painted opacity at its start equals the one before it. It is 0.08 under hover and 0.1 otherwise for the five button types, the checkbox and the radio, and 0.1 for the FAB and the list items. The three engines agree on every line. `--_ripple-opacity` is read by no TypeScript and stays in `main.styles.css`, and `parseNum` and `createNumberParser` are gone. `parseMs` keeps its behavior.
- **RF-114.** Four clicks 290 ms apart report three `AbortError` rejections at `07943db4a`, on `mx-button`, `mx-checkbox`, `mx-fab` and `mx-list-button-item` in each engine, and none at the head. A trusted double click reports none in either tree, because its second click comes before the fade.
- **`reviewer-3`** is answered by the new size bullet and the pull request's description.
- **The JSDoc** of `useCSSProps` says both limits of property 1. The diff of core's source against `07943db4a` is that comment alone.
- **Rows** ([`recheck-rows.txt`](checks/recheck-rows.txt)). 81 of 81 pass at the head. With `ripple.ts` and `fns.ts` of `07943db4a`, 14 fail in each engine, and they are the ones the record names. With the base's files 15 fail in each engine, and five more in Firefox, which are the hidden-iframe rows.
- **The part beyond the trial edit** ([`recheck-mutations.txt`](checks/recheck-mutations.txt)). Each statement of the disconnect was removed alone:

  | Removed | Rows that fail, in each engine |
  | --- | --- |
  | `clearTimeout` | The touch after a put-back has its whole delay |
  | The start event's reset | The touch after a put-back, and its whole delay |
  | The generation's increment | No fade after a removal |
  | The scale's cancel, or the drift's | A moved press ends, and no animation is left |
  | The catch on `finished` | The removal during the fade, and the unhandled rejection |
  | `clearTimeout` and the state's reset | The touch within the delay, and the whole delay |
  | The state's reset, the context-menu flag's, or the fade's cancel | **None** (`reviewer-4`) |
  | The whole callback's body | Six rows |

  So the timer's clear, the generation and the start event's reset are each necessary, and each has a row. With a first keyframe of 0.1, nine fade rows fail in each engine.

- **The merge.** The index's changed lines from `fa509f2e0` and from `main` are each identical to the two sides' own. The remerge difference is the one conflict, both of whose sides are kept, with RF-114 after RF-113. No identifier is claimed twice.
- **Nothing else moved.** Against `2d1b5ca51` the branch changes the hook, `ripple.ts`, `fns.ts`, `sortable-list.ts`, their tests and records. `sortable-list.ts` and its tests are unchanged since `07943db4a`, and so are RF-105's and RF-106's entries.
- **Sizes** ([`recheck-sizes.txt`](checks/recheck-sizes.txt)). All 20 rows and the eight bundles reproduce. From the base: `list/sortable-list` +55, `text-field/text-field` +9, `complete` −66, the other ripple rows −5 to +20 B, and no other row. The six bundles grow by 46 (text field) or 50 bytes minified, 32 of them the hook's.
- **Suites and gates.** material-x's `button`, `fab`, `checkbox`, `radio`, `list` and `core`, browser and spec projects: 1,819 passed, 1 expected fail, 4 skipped. core's browser project: 690 passed. Typecheck in both packages, `fmt-check`, `lint` and `git diff --check` are clean. CI passes every job that ran at `4bb981301`. I didn't rerun the 2,778 of the whole projects or the node project.
- **Against today's `main`,** `e37343f3a`, with #197 and #196 merged, the one conflict is the import lines of `sortable-list.ts`. I didn't run that merge.

### Findings of the recheck

#### reviewer-4

**Tier C. Three of the disconnect's statements have no row that fails without them.** They are the state's reset, the context-menu flag's reset and the fade's cancel.

- **Evidence.** Each removed alone passes 81 of 81. Each has an effect, the same in the three engines. Without the state's reset, a click after a held press is put back starts one animation in place of two. Without the fade's cancel, an element removed during its fade and put back still has an animation 530 ms later. Without the flag's reset, a touch outside the box after a context menu and a put-back starts nothing.
- **Contract.** The ruling requires all three, and the code has them. Its list of rows doesn't ask for them, so this isn't a departure. The record doesn't claim witnesses for them.
- **Required property.** A change that loses one of the three fails a row, or the gap is accepted.
- **Routing.** To the architect or the coordinator, optional.

#### reviewer-5

**Tier C. The record's list of the rows that fail on the base leaves out three.** It names the touch after a put-back, the animations left, RF-114's row and three of the four fade orders. The fade after a removal, the moved press and the whole delay fail there too, in each engine, in the implementer's own [reading](../../css-props-1/checks/ripple-rows.txt) and in mine. The count for `07943db4a` is right. **Routing:** to the implementer, optional.

### Observed, and not introduced here

- **A touch that follows a cancelled touch within its delay starts early.** A touch, a `pointercancel` and a touch 100 ms later: the second has its two animations 90 ms in, in place of 150, because the first press's timer isn't cleared when the press ends without a disconnect. It reads the same with `ripple.ts` of `07943db4a`, which is the base's. Tier A by consequence, small and pre-existing. The rulings cover the disconnect only. **Routing:** to the architect, to register or refuse.
- **`moveBefore` ends a press.** A held press on `mx-button` loses its two animations at `moveBefore` in Chromium and Firefox, and kept them at `07943db4a`. WebKit has no `moveBefore`. The elements define no `connectedMoveCallback`, so the platform runs their disconnect and connect callbacks. This follows the ruling's _"a move disconnects too"_. Core documents a `movedCallback` for `moveBefore`, and no source in core or material-x defines a `connectedMoveCallback`.
- **A release after a put-back, in Firefox,** starts a ripple where the other engines start none: 60 ms after the release the element has two animations. Reading the code, a `click` on an inactive press starts one, as a keyboard click does. I didn't read whether Firefox dispatched that click.