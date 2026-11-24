# `mx-slider` (RD-55, #173) — feature proof, the remediation

**Files were read at:** `7ec87c834`, the head of #220 (`material-x/slider-1`), in slot `c`. The remediation is `3c36609c3..7ec87c834`. Every run used a scratch copy of that tree with the packages rebuilt in it. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2, headless, on Linux. The first proof is [`feature-proof-claude.md`](feature-proof-claude.md), and the local ids continue from it.

**Subject:** the [plan](../../slider-1/slider-plan.md) (the dispositions, the owner's answers, the implementation report's rulings, the amended `SL-D2`, `SL-D3` and `SL-D6`), `repo:RD-55`, the [report](../../slider-1/slider-report.md), the diff, and #220's description.

**Verdict: `reviewer-1` to `reviewer-5` and `reviewer-7` are closed, and `reviewer-6` is closed except for what `reviewer-13` adds. Two new tier A findings need an answer.** A press that is held back is reported when the slider has focus and is disabled, moved, removed or loses the focus (`reviewer-8`). A second finger's number is taken in Firefox, and in Chromium its lift ends the hold (`reviewer-9`). `reviewer-10` and `reviewer-11` are tier A and small. `reviewer-12` is an unsound row helper. Nothing found reopens the native range or the public surface.

## The earlier findings

| Finding | Status | Evidence |
| --- | --- | --- |
| `reviewer-1` | **Closed** for a press that scrolls, in Chromium and Firefox. The four cases end as their controls do, also when the slider has focus. Eight kinds of write, each while held, after the cancel and after the lift, stay and fire nothing | [`recheck-touch.txt`](checks/recheck-touch.txt), [`recheck-firefox.txt`](checks/recheck-firefox.txt) |
| `reviewer-2` | **Closed** in the three engines. 2720 cases for each engine: 17 containers, four direction pairs, eight texts, five values. No container and no page gains overflow at an inline end, and the text stays between the slider's ends and is centred where it fits. The two exceptions are below | [`recheck-overflow.txt`](checks/recheck-overflow.txt) |
| `reviewer-3` | **Closed** in the three engines, the same in each: `-18`, `-18°`, `−18°`, `-18 %`, `+5`, `(18)`, Arabic and Hebrew texts, and `Intl`'s direction marks, in both directions | [`recheck-mouse-and-text.txt`](checks/recheck-mouse-and-text.txt) |
| `reviewer-4` | **Closed** in the three engines: `aria-label=""` and `" "` beside a `<label>` give `L`. The committed accessibility readings (`built.txt`) reproduce byte for byte | `names.ts` and `built.ts` rerun |
| `reviewer-5` | **Closed.** The row reads text nodes and fails without `aria-hidden` | the report's witness |
| `reviewer-6` | **Closed** as ruled | rows and witnesses; `reviewer-13` |
| `reviewer-7` | **Closed.** #220 names the many steps and the centre | #220, read on 2026-11-24 |

**The held state** follows the pointer, and not `:active`, in the three engines: a still press on the track, the same dragged 150 px below, the handle, the label, the right and middle buttons, each size, a slider disabled, in a disabled fieldset, moved or removed during it, and a slider disabled and enabled again, then pressed. By touch it is held at the touch and ends at the lift, the cancel and the scroll, in Chromium and Firefox. The exception is `reviewer-11`. `display: none` is the accepted limit.

## The departure: the second finger's lift

**The report's claim holds in Chromium for a slide,** beside a bare range each time: the second finger's touch ends the native drag, the value and the look don't change, and exactly one `change` fires, with no other `input`. It fires at the first lift of either finger on the slider, or at the cancel if both are still down. A finger elsewhere on the page changes nothing, and the first goes on. A later cancel adds nothing. Until the first finger lifts, the handle looks held and doesn't follow it.

**`SL-D3` can stand with that, if it says that the commit is at the first lift and not at the first finger's cancel.** Nothing that a consumer is promised is lost. But the claim covers the slide in Chromium only. The same native behavior breaks two other sentences of the plan, and these `SL-D3` can't stand with as they are: `reviewer-9`.

## Scope

**Covered:** the slider's rows rerun (Chromium 372 pass; Firefox and WebKit 314 pass, 58 skip); typecheck and publint on the copy, format and lint on the changed files; sizes (3950 and 24802, as #220 says); CI on `7ec87c834`, whose `chromium` job fails only in the ten visual rows without a baseline, so `verify` fails; the held press by finger, pen and mouse, tap, slide, scroll, cancel, second finger, disabling, removal, hiding, focus, a key and eight kinds of write at each moment, with the events, the value, the input, the form value, the drawing, the indicator's text and the look after each; 22 mutations, none from the report; JSDoc, `slider.mdx` and #220.

**Not covered:** touch in WebKit, which the suite can't emulate; Safari, iOS, Android and any physical touch; a pen's drag in Chromium, where the emulated pen's moves reach neither the slider nor a bare range as a drag (a pen's press and release were read, and its drag in Firefox); assistive technology, except one value set through Firefox's `nsIAccessibleValue`; the visual rows; the costs. Firefox's touches are its own synthesized events, and nothing there scrolls, so its cancel is sent.

## Findings

### reviewer-8

**Tier A.** A held press is reported, and not dropped, when the slider has focus and is disabled, moved, removed or loses the focus.

- **Contract:** `SL-D3`: _a slider that is disabled drops a held press_; a disconnection ends a held press as a scroll, without an event; and _a press that becomes a scroll does nothing_.
- **Observed,** in Chromium by emulated touch, `value="30"`, the focus from a tap on the label, then a finger at 70 ([`recheck-touch.txt`](checks/recheck-touch.txt)):

  | During the held press | Events | Value | Without focus |
  | --- | --- | --- | --- |
  | Disabled, by attribute or fieldset | `input` 70, `change` 70, on the disabled slider | 70 | none, 30 |
  | Moved in the DOM, or removed | `input` 70, `change` 70 | 70 | none, 30 |
  | Focus moves to another element, then the press scrolls | `input` 70, `change` 70 before the scroll | 70 | none, 30 |

- **A pen's press gives the slider focus,** so in Chromium a pen has the first two without any earlier focus ([`recheck-pen-and-focus.txt`](checks/recheck-pen-and-focus.txt)). By label, keyboard, script or mouse the focus is ordinary.
- **Firefox:** disabling, moving and removing are right, with and without focus. The loss of focus is as in Chromium, and the value stays 70 after the cancel ([`recheck-firefox.txt`](checks/recheck-firefox.txt)). And a slider hidden with `display: none` during a held press, then cancelled, fires an `input` with the number shown and becomes the user's: an attribute set to 60 afterwards leaves 30.
- **Cause, inferred from the order of the events and from `slider.ts`:** the engine fires `change` when a focused range loses its focus or is disabled, before the component's own callbacks run, and `SL-D3` takes any native `change` as the user's.
- **Why the rows pass:** the two rows press a slider that has no focus.
- **Required property:** a held press that is disabled, disconnected or becomes a scroll fires nothing and changes nothing, whatever has the focus. Whether a loss of focus alone ends a held press as the user's is the architect's: `SL-D3`'s letter allows it, and its first sentence doesn't.
- **Route:** the architect for the loss of focus; the implementer for the rest.

### reviewer-9

**Tier A.** A second finger's number is taken in Firefox, and in Chromium a second finger's lift ends the hold.

- **Contract:** `SL-D3`: _while one pointer's press is in progress, another pointer's isn't followed_; the rulings: a second finger that touches and lifts during a slide _changes neither the state nor the value_; _a press that becomes a scroll does nothing_.
- **Observed,** with the first finger at 50 and the second at 90, `value="30"`; a bare range gives the same numbers:

  | Case | Chromium | Firefox |
  | --- | --- | --- |
  | Slide to 65; the second touches and lifts | 65, `change` 65 | **90,** `input` 90, `change` 90 |
  | Held; the second touches and lifts | `input` 50, `change` 50, at its lift | **90,** `input` 90, `change` 90 |
  | Held; the second touches and lifts; the first then scrolls (cancelled, in Firefox) | **50 stays** | **90 stays** |
  | Held on the handle, at 30; the second touches and lifts | **90,** `input` 90, `change` 90 | not read |

- **Why it is a problem:** the value jumps to the place of a finger that the plan says isn't followed, and a press that scrolls keeps a number.
- **Why the rows pass:** they are Chromium's, and the second finger's lift is read in a slide only.
- **Limit:** synthesized touches. No phone was read.
- **Required property:** either another finger's touch and lift change nothing in both engines, or `SL-D3` says that only the press's tracking and the held look ignore another pointer, and that the native range's number and commit apply.
- **Route:** the architect, with the departure.

### reviewer-10

**Tier A,** small. After a cancelled press, a value that assistive technology sets is refused if it is the number from before the press.

- **Contract:** `SL-D1`: assistive technology changes a native range's value. `SL-D3` drops the engine's own restoration, and lets a key end the cancelled press.
- **Observed,** in Firefox through `nsIAccessibleValue`: a press at 30 that is cancelled, a script sets 29, and assistive technology sets 30. The slider stays at 29 with no event. A bare range, and a slider without the press, take 30 and fire both events. The next value, 31, is taken ([`recheck-firefox.txt`](checks/recheck-firefox.txt)).
- **Why it is a problem:** the cancelled press has no end but a press, a key or another number, so one action is lost, at any later time. It needs the number to have changed since.
- **Required property:** the drop ends with the engine's restoration, or the plan accepts the case.
- **Route:** the architect to accept it or not; then the implementer.

### reviewer-11

**Tier A,** small. With two mouse buttons the held look differs from the drag in Chromium and Firefox.

- **Contract:** `SL-D6`, the held state's property 1: _it begins at a press of the primary button_.
- **Observed** ([`recheck-mouse-and-text.txt`](checks/recheck-mouse-and-text.txt)): in Chromium the left button pressed while the right is down drags the handle and fires `input` and `change`, and the slider looks at rest throughout. Firefox doesn't drag, and WebKit looks held. With the right button pressed during a left drag, Chromium and Firefox look held after the left is released, until the right is, and WebKit doesn't.
- **Required property:** the look agrees with the drag, or the plan accepts it as a limit.
- **Route:** the architect.

### reviewer-12

**Tier B.** The rows that state _one `change`_ can't see a second one with the same value.

- **Observed:** `recordEvents` leaves out consecutive repeats. With `isUncommitted = false` removed from the commit, a slide whose second finger lifts and which is then cancelled fires `change` 65 twice ([`recheck-mutations.txt`](checks/recheck-mutations.txt)), and _"should not follow a second finger during a slide"_, the witness of the departure's _exactly one_, passes, as do all 372 rows. _"should commit a slide that the system cancels"_ and _"should fire input and one change on …"_ count through the same helper.
- **Limit:** a `change` that is doubled everywhere fails three other rows in Chromium and two in Firefox and WebKit.
- **Required property:** a second `change` in these gestures makes their rows fail.
- **Route:** the implementer.

### reviewer-13

**Tier C.** Properties that `SL-D3` states and no row reads. Each mutation leaves every row passing, and the first three were seen to change what the slider does.

- **A press after a scroll is decided anew.** Mutated, a second scroll on the slider gives 70 with `input` and `change`.
- **A primary pointer's press begins anew.** Mutated, a press after a missed release doesn't look held, in the three engines' rows.
- **A press forgets an earlier slide that wasn't committed.** Mutated, a slide that is disabled, then a scroll, fires `change`.
- **A pen is held** like a finger: mutated so that only a finger is, no row fails. Chromium can emulate the press.
- **A native `change` reports a held press:** only `reviewer-8`'s and `reviewer-9`'s cases reach it.
- **The indicator's `pointer-events: none`.**
- **Not gaps, or not shown to be:** the phase after a tap on the handle, another pointer's move or cancel, and `break-word` for `anywhere`. No difference was found in what a consumer sees.
- **Route:** the implementer, for what is accepted.

### reviewer-14

**Tier B.** #220's description and the report state the second finger for one engine.

- **#220:** _"A second finger isn't followed … In Chromium its lift ends the native drag and fires the slide's `change`"_. In Firefox its lift moves the value (`reviewer-9`).
- **JSDoc and `slider.mdx`** say _a touch_. A pen is held too, so it moves the handle at the lift or the first step as well.
- **Required property:** the texts agree with what is ruled. They are otherwise right: the width, the indicator's ends and clipping, the sign's side, and the scroll were checked against the readings.
- **Route:** the coordinator for #220, and the implementer for the rest, after `reviewer-9`.

## Observations, no finding

- **The indicator adds 56 px of block overflow in a `column-reverse` scroller** when the slider is its topmost item, in Chromium and Firefox and not in WebKit. Such a scroller scrolls above its start. `SL-D6` says _at either end_, so it is the architect's to say whether this counts.
- **A 24 px slider** gives 1 px of overflow for a CJK or emoji text, because one character is wider than the 4 px that the padding leaves. 40 px has none.
- **Enabled again, or moved, during a finger's slide:** Chromium goes on with the slide and the slider follows it, without the held look, as property 2 says.
- **A key during a held press** takes the pressed number and its step (`ArrowUp` gives 71, and 30 was shown), by `SL-D3`'s _next native `input`_.
- **`valuetext=""`** draws an empty 20 px indicator and gives an empty `aria-valuetext`. Unchanged since the first proof.
- **A page that prevents `pointerdown`, or takes the capture,** leaves the held look without a drag. Its own doing.
- **Playwright's Firefox** delivers no release outside the window, so the look and the native drag both stay. No real Firefox was read.

## Next

The architect answers `reviewer-8` (the loss of focus), `reviewer-9` with the departure, `reviewer-10` and `reviewer-11`. Then the implementer takes `reviewer-8`, `reviewer-12` and what is accepted. None of them changes a drawing at rest, so the baselines don't depend on them. `reviewer-9`'s numbers can also be read on the phones.

The probes are `recheck-*.ts` in [`probes/`](probes/), and they were not run on any other tree.