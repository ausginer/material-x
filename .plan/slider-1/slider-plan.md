# mx-slider — plan

**Status: decided by the owner's answers to [Q1](#q1--whose-is-the-value) and [Q2](#q2--what-does-a-hosts-aria-label-do), and to the two questions on the amendment ([below](#the-owners-answers-on-the-amendment)), with no question open.** It is [`repo:RD-55`](../00-index.md). Where the entry and this plan differ, the entry governs. Written by an architect on 2026-11-23, on the coordinator's task for [#173](https://github.com/ausginer/material-x/issues/173), on `material-x/slider-1` from `origin/main` at `92a386a17`, and [amended](#revisions) the same day. Implemented at `6ecdc0155`, with the architect's corrections of 2026-11-24 ([revisions](#revisions)). **Amended on 2026-11-24 for the [feature proof](../reviews/slider-1/feature-proof-claude.md): `SL-D2`, `SL-D3`, `SL-D4`, `SL-D6` and the rows state the amended contract, and the implementer's work is in [the dispositions](#feature-proof-dispositions).** `RD-55` clause 4 is amended to match. It is unit C of the [landing plan](../landing-1/landing-plan.md#order) (`repo:RD-47`). The labels `SL-…` are local to this plan, and [the last section](#proposed-record-entries) gives the addresses of the entries that were minted from them.

**The unit:** one element, `mx-slider`, a continuous slider with one value. It is horizontal. The range slider, stops and the vertical slider wait ([what stays possible](#what-stays-possible)).

## The answer in short

- **A native `<input type="range">` in the shadow tree is the control** (`SL-D1`). It owns the pointer, touch, the keyboard, the arithmetic and the accessible node. It is transparent, and the component draws everything from one custom property.
- **The slider's value is the user's, as a text field's text is** (`SL-D2`, the owner's answer to Q1). `value` is a number.
- **The name comes from a host `aria-labelledby`, the `label` slot, a host `aria-label` or a `<label>`, in that order** (`SL-D4`). Host `aria-*` is mirrored, as the text fields mirror it, so a host `aria-label` also leaves the second named node of `RF-94`. The owner accepted that for now (Q2).
- **A value change costs 52, 135 and 328 µs of style and layout** in Chromium, Firefox and WebKit on the built element with the stop indicator as an element, and reads no layout (`SL-D8`).
- **No prototype checkpoint is needed** ([why](#prototype-checkpoint)).

## Inputs

`repo:RD-20`, `RD-47`, `RD-49`, `RD-52`, `RF-50`, `RF-94`, `RF-107`, `RF-110` and `RF-117`; the landing plan; `CONTRIBUTING.md`; `architecture.md`; `accessibility.md`; core's traits and `element.ts`; `CheckableCore.ts` and `TextFieldCore.ts`; the six `md.comp.slider*` sets. The consumers are the box-quad demo's ranges (`-55…55` and `-20…20`, step 1, with a unit) and the picker's hue, chroma and tone.

## Readings

Run on 2026-11-23 in Playwright's Chromium 158, Firefox 159 and WebKit 27.2, on Linux, headless. The probes are standalone pages, because no slider exists. `mirroring.ts` bundles the packages as built in slot c from `81671c1ad`, which changes no source of `92a386a17`.

| Probe | Readings |
| --- | --- |
| [`naming.ts`](probes/naming.ts) | [`naming.txt`](checks/naming.txt) — each engine's own accessibility tree |
| [`mirroring.ts`](probes/mirroring.ts) | [`mirroring.txt`](checks/mirroring.txt) — the same trees, for the amendment: every built element with a control, and a prototype with core's built `useARIA`, in the text field's form and this plan's |
| [`interaction.ts`](probes/interaction.ts) | [`interaction.txt`](checks/interaction.txt) — drags, keys, events, touch |
| [`drawing.ts`](probes/drawing.ts) | [`drawing.txt`](checks/drawing.txt) — geometry, states, `:disabled` |
| [`move-cost.ts`](probes/move-cost.ts) | [`move-cost.txt`](checks/move-cost.txt) — cost of one change |
| [`built-move-cost-cause.ts`](probes/built-move-cost-cause.ts) | [`built-move-cost-cause.txt`](checks/built-move-cost-cause.txt) — on the built element: why a change costs more than on the prototype |
| [`stop-indicator.ts`](probes/stop-indicator.ts) | [`stop-indicator.txt`](checks/stop-indicator.txt) — on the built element: the stop indicator as its own element draws the same |
| [`held-press.ts`](probes/held-press.ts), [`held-press-firefox.ts`](probes/held-press-firefox.ts) | [`held-press.txt`](checks/held-press.txt), [`held-press-firefox.txt`](checks/held-press-firefox.txt) — for the amendment: the built element and two variants under a touch that becomes a scroll, in Chromium by emulated touch and in Firefox by its own synthesized touch |
| [`indicator-overflow.ts`](probes/indicator-overflow.ts) | [`indicator-overflow.txt`](checks/indicator-overflow.txt) — for the amendment: scrollable overflow and place of the value indicator, the built one and five candidates |
| [`indicator-cost-and-text.ts`](probes/indicator-cost-and-text.ts) | [`indicator-cost-and-text.txt`](checks/indicator-cost-and-text.txt) — for the amendment: the cost of a change while it is shown, and signed texts in both directions |
| [`press-and-width.ts`](probes/press-and-width.ts) | [`press-and-width.txt`](checks/press-and-width.txt) — on the built element: presses off the handle's centre, and the width in shrinking containers |
| — | [`engine-sources.txt`](checks/engine-sources.txt) — what assistive technology can do to an ARIA slider, and iOS's touch area |

## SL-D1 — The control is a native range

**Decision.** The shadow tree holds an `<input type="range">` that is the focus target, the pointer target and the accessible node. This is `architecture.md`'s first exception to the `.host` invariant: the focus target can't be a container.

**Evidence.**

- **Assistive technology changes a native range's value, and in Firefox it can't change an ARIA slider's.** Firefox's `LocalAccessible::SetCurValue` returns `false`, and only native ranges and spinners override it. Its Android bridge marks only those two as settable. Chromium and WebKit synthesize arrow keys for an ARIA slider, so the evidence against one is Firefox's alone, and Firefox on desktop and Android is in `RD-20`'s floor. These are readings of each engine's `main`, not runs with assistive technology.
- **The host as the slider would be named by the platform.** A host with the slider role takes its name from `aria-label` and from `<label for>` in all three engines, as one node. That is its one advantage, and it doesn't outweigh a control that a TalkBack user in Firefox can't move.
- **A 4 px thumb is enough.** The native thumb has the handle's width, 4 px, so the native travel is the drawn travel. In all three engines a press anywhere on the track jumps there, a press on the thumb's centre doesn't change the value (in Firefox at 100 steps on 200 px only: see the costs below), and a drag past an end stops at it. On iOS only the thumb starts a drag, and WebKit widens a thumb's touch area by 12.5 px on each side when a dimension is under 48 px. So 4 × 44 px becomes 29 × 69 px. No input is wider than its track, so nothing overflows.
- **The arithmetic is the platform's:** clamping, stepping, the step base and decimals. A step of 0.1 gives `0.3` and `0.7`, not `0.30000000000000004`.

**Not adopted:**

- **The host as the slider, with its own pointer and keyboard code:** the evidence above.
- **A hybrid,** the native range for the keyboard and assistive technology and the component's own pointer code over it. It would give one pointer behavior in every engine, at the price of capture, touch disambiguation, focus and text selection written by hand. Nothing measured needs it. It stays available behind the same public surface.
- **A range in the light DOM,** slotted: it would be named and submitted natively, and it would make the consumer write the input, unlike any other component here.

**Costs, accepted:**

- **In WebKit the horizontal arrow keys don't mirror in RTL:** `ArrowRight` increases the value and the handle moves left. Chromium and Firefox mirror. The ARIA practices say _Right Arrow increases_ and don't mirror either. The component leaves the engine's behavior.
- **In Firefox a press off the thumb's centre moves the value to the pointer.** Chromium and WebKit keep the value anywhere on the thumb. Firefox does this to every native range: with its own thumb, a press 6 px from the centre gave 36 from 40. Firefox rounds the pointer down to a whole CSS pixel first, at device scale 1 and 2 ([reading](checks/press-rounding.txt); Playwright's Firefox, and whether a real mouse gives it whole pixels wasn't read). So the slider's 4 px thumb bounds the move under 3 px: half the thumb, and less than one pixel of rounding. The largest read is 15 of 1000 steps, 2.9 px. With narrow steps a press on the centre itself changes the value: 398 and 395 from 400. A press changes the value only where a step is narrower than about 6 px, and then it fires `input` and `change`. To prevent it, the component would need `SL-D1`'s hybrid. It isn't documented for consumers, because it is the native range's and they can do nothing about it.
- **If an `input` handler changes the value, WebKit drops the native `change`** at the end of that drag, and Chromium and Firefox fire it. Writing the same value back, as a framework does, loses nothing in any engine. The documentation says to read the final value from `input` if the handler rewrites it.
- **A vertical scroll that starts on the slider changes the value in Chromium** (`i21 c21`, then the page scrolls). `SL-D3` repairs it.

## SL-D2 — The public surface and whose the value is

| Attribute and property | Type | Absent |
| --- | --- | --- |
| `value` | number | the midpoint of `min` and `max`, as on a native range, which is 0 on a signed range |
| `min`, `max` | number | 0, 100 |
| `step` | number | 1 |
| `size` | `small`, `medium`, `large`, `xlarge` | extra small, M3's default |
| `indicator` | boolean | no value indicator |
| `valuetext` | string | the number itself |
| `name`, `disabled` | as the other form controls | — |
| `error`, `required` | core's `Validatable` | — |

- **`value` is a number, not `Valuable`'s string.** Its trait is the slider's own. `SL-D5` submits the string form.
- **`valuetext`** is the value in words, such as `−18°`. It is the value indicator's text and the control's `aria-valuetext`, so the two can't differ. A consumer that has a unit sets it in its `input` handler.
- **`step` has no `any`.** A finer slider sets a finer step, which also gives the arrow keys a size. A `step` that isn't a number reads as absent.
- **The box-quad demo and the picker need nothing else.**
- **Public custom properties:** `--md-slider-active-track-color`, `--md-slider-inactive-track-color`, `--md-slider-handle-color` and `--md-slider-stop-indicator-color`. With the first two and the last `transparent`, a page's gradient behind the slider shows through. `RD-49` property 5 draws the strip beside the slider and needs none of them.
- **Parts and slots:** `impl` on the input, and the slot `label`.

**Whose the value is.** The user's, as the owner answered to Q1 (a). It is the second exception to the controlled principle after the text fields.

- `value` reads the number that the slider shows, which is also the form value. It is the input's, except while a press is held back (`SL-D3`). The consumer may set it at any time, also inside an `input` handler and in the middle of a drag, and the drag goes on.
- The `value` attribute is the initial value. It is followed until the user moves the slider or a script sets `value`, as in `TextFieldCore`. The property doesn't reflect.
- Setting `value` fires no event.
- **The order in which `value`, `min`, `max` and `step` are set doesn't matter.** A native range clamps at each write, so `value = 200` followed by `max = 300` leaves 100, and the engines differ when the value is an attribute (Chromium and Firefox 100, WebKit 200). Frameworks set properties in the order that the markup names them. So the component keeps the number last asked for, by the consumer or the user, and writes it to the input again after each change of `min`, `max` or `step`.
- The input's `value` **content attribute is never written,** because it would move the step base.

## SL-D3 — Events

As `RD-52` says. Both are plain `Event`s, and the value is read from the element.

- **`input`:** the native event, which bubbles and is composed, so it crosses the host by itself in all three engines. The component handles it at the input, so `value`, the drawing and the form value are current when the consumer's handler runs.
- **`change`:** the native event stops at the shadow root. The component dispatches `new Event('change', { bubbles: true })` on the host, not through the notifier that `RF-117` deletes.
- **Keyboard:** each key that changes the value fires `input`, then `change`.
- **A press that becomes a scroll does nothing.** A finger's press changes a native range at once in Chromium and Firefox, before the browser knows whether it is a scroll. So the component **holds back** what the press did until the browser has decided:
  - **What is held:** the `input` that a press by anything but a mouse makes before its first `pointermove`. It doesn't reach the host, and nothing follows it: not `value`, the drawing, the form value, the indicator's text or the ownership.
  - **What ends it as the user's:** the next native `input`, the lift, or a native `change`. A lift without a move is a tap. The component then dispatches one plain `input` with the native flags, if the number differs from the one shown, and `change` follows.
  - **What ends it as a scroll:** `pointercancel`. The input is given the number that was asked for, which is what it would be without the press. No `input` and no `change` reaches the host, neither the engine's own `change` after the cancel (Chromium fires one if a script wrote in between) nor the engine's own restoration (Firefox puts its own number back). A disconnection ends it the same way, except that Firefox's own touch then ends as a tap at the lift, and the slider reports it.
  - **A script's write during it** (`value`, the attribute, a bound, `step`, a form reset) is an ordinary write and stays. Nothing was the user's yet, so there is nothing to overwrite. This is how `SL-D2` and `SL-D3` agree. After a write during a tap, the engine decides: Chromium keeps the script's number, with `change` and no `input`, and Firefox ends on the pressed one.
  - **After the press has been reported,** a cancel no longer is a scroll: the browser decides at the start, and in Chromium no pan at 20 to 80 degrees gave a second `input` before its cancel. What is left is the system taking the touch. The slide is then committed: the value stays, in Firefox too, and `change` fires. Material Components for Android takes its `ACTION_CANCEL` as a lift too.
  - **A mouse isn't held.** Its press moves the handle at once.
  - **Why held and not restored.** A restoration can't tell the user's press from a script's write that followed it. A consumer that copies the value back, and a player that follows its seek bar, write during the press _because of_ it, and an independent script doesn't. Whoever wins, one of them is wrong ([readings](checks/held-press.txt): with the owner restored and no `input`, the player stays at the pressed 70). Held, the consumer never learns of a press that was a scroll, so no case is left. Material Components for Android does this: `BaseSlider.onTouchEvent` starts in `ACTION_MOVE` inside a vertically scrolling container (read at `3a2969935`).
  - **Costs.** With a finger, a press on the track moves the handle at the lift or at the first step of the slide, and not at the touch. With a coarse `step` the handle waits for the finger to cross a step. While the finger rests, the input itself holds the pressed number, so assistive technology could read it. A slide from a held press back to the number shown fires an `input` with that number.
- **`touch-action: pan-y`** on the input. The vertical slider will need `pan-x`.

## SL-D4 — Name and accessibility

**The owner's answer to Q2: as the text field.** Host `aria-*` is mirrored to the input with core's `useARIA`, and the second named node is accepted for now, as `RF-94`'s. The slider follows the text field's rule, except where a reading shows that it doesn't work.

**The name, first match wins.** Each row was read in all three engines, with 14 combinations of sources in [`mirroring.txt`](checks/mirroring.txt).

|  | Source | How | The text field |
| --- | --- | --- | --- |
| 1 | Host `aria-labelledby` | `input.ariaLabelledByElements` is the host's `ariaLabelledByElements` | **Differs.** It mirrors the ids, which the shadow tree doesn't have, so the host's reference names nothing. The field is unnamed, or falls to its slot or `aria-label` |
| 2 | The `label` slot, when it has an element | `input.ariaLabelledByElements` is the shadow label | The same: its slot wins over a host `aria-label` |
| 3 | Host `aria-label`, unless it is empty or white space | mirrored | The same |
| 4 | `<label>`, wrapping or `for` | `input.ariaLabelledByElements` is `internals.labels` | **Differs.** It has no such source: a `<label>` leaves the field unnamed |

- **The order is the text field's where it has a source,** and a native input's for `aria-label` over `<label>`.
- **One owner of `aria-labelledby` on the input.** The element references and the attribute are one state, so a mirrored string erases the references. The transform given to `useARIA` drops `aria-labelledby` and `aria-describedby`, and the slider resolves them itself, after the mirror has run. Required: each combination, each removal or addition at run time, and filling the slot at run time, gives the table's name. The prototype did, with a second observer created after the mirror's.
- **`aria-describedby`** is resolved the same way, for the same reason: the mirrored ids describe nothing. The text field's host carries the description, and its control doesn't (read in Chromium). The slider's prototype was read in Chromium and Firefox.
- **When references and labels are read:** when the slider connects, when an `aria-*` attribute of the host or the slot changes, and when the input takes focus. **A `<label>` or a referenced element that appears later is read at the next of these.** A move resolves nothing.
- **A click on the slot's content or on a `<label>` focuses the slider** (read for both in all three engines).
- **`aria-valuenow`, `aria-valuemin` and `aria-valuemax` aren't mirrored.** In Chromium they replace the native range's own: with a host `aria-valuenow="5"` the control reports 5 while the value is −18. This is the one mirrored group with no counterpart in a text field.
- **`valuetext` against a host `aria-valuetext`:** the host's wins on the control, and removing it restores `valuetext`, as the text field's fallbacks do. The value indicator always shows `valuetext` or the number, so a consumer that sets `aria-valuetext` says something else to assistive technology on purpose. Read in Firefox: `H` for both, `V` after the removal. CDP gives Chromium's native value for a range whatever its `aria-valuetext`, also for a light-DOM one, and WebKit's inspector gives none. So neither was read there.
- **The other attributes are mirrored as they are,** `aria-invalid` and `aria-required` among them. The documentation says to set `error` instead, as the text field's does.

**The host node.** Its role is `none`, through its internals. A text field's host has no role.

| Sources present | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| The slot alone | not exposed | not exposed | an unnamed `group`, role or no role |
| A wrapping `<label>` alone | not exposed | not exposed | not exposed |
| `<label for>` alone | not exposed | `generic`, named | not exposed |
| The slot and a `<label>` | not exposed | `generic`, named, for `for`; not exposed for a wrapping one | `group`, named |
| A host `aria-label` or `aria-labelledby`, with anything | `generic`, named | `generic`, named | `group`, named |
| A host `aria-describedby` | `generic`, described | `generic` | `group`, named by the description |
| A host `aria-invalid` | not exposed | `generic` | `group` |

- **So role `none` earns its place in Chromium only,** and only without `aria-*`: it hides the `generic` host that a text field leaves. In the other two it changes no row of the table. It costs one internals field, and it stays.
- **A host `aria-label` beside a filled slot gives two names:** the control has the slot's, and the host node has the `aria-label`. This is the text field's today. The documentation says to use one of them.

**Disabled, the value and its bounds** are the input's.

**Validation:** `useValidatable` puts `aria-invalid` on the input. It also puts `aria-required` there when `required` is set, which the slider role doesn't define. A range always has a value, so `required` means nothing here, as on a native range, and the documentation says so.

## SL-D5 — Forms

- `static formAssociated = true`, with `Nameable` and `Validatable`. The element's validity is the consumer's, and the range has no native validators that could fail.
- **The form value** is the input's string, set on connection and on each change. Its cost in a move isn't separable from the readings' noise.
- **Reset** restores the `value` attribute, or the midpoint, and clears what the user set.
- **`disabled`, by attribute or by a fieldset,** disables the input. `formDisabled` fires for both, and `:disabled` already reads the new state inside it in all three engines. Core's controller passes no argument, so the component reads `matches(':disabled')`, and `useDisableable` isn't needed.
- **State restoration is absent,** as in the text fields, because core drops the arguments of `formStateRestoreCallback` (`repo:RF-120`).

## SL-D6 — Anatomy, sizes and states

```html
<label class="label" for="input"><slot name="label"></slot></label>
<div class="track">
  <input id="input" class="input" type="range" part="impl" />
  <span class="stop"></span>
  <span class="handle"></span>
  <span class="indicator" aria-hidden="true"><span class="text"></span></span>
</div>
```

- The host is a block, and the shadow root delegates focus, which reaches the input through a block host in all three engines. `.track`'s `::before` is the inactive track and its `::after` the active track. `.stop` is the stop indicator. `.handle` is the handle. `.indicator` places the value indicator and `.text` is its box and its text. `.handle` is an element and not the native thumb, so that rows can measure it, and one rule draws it in every engine.
- **The fraction is one inline custom property on `.track`,** never on the host. On the host with 200 light children a change costs 2.2 to 4.5 times as much. It also doesn't write the consumer's `style`.
- **Geometry.** With `w` the handle's current width and `c` its centre, `c = handle.width / 2 + f × (100% − handle.width)`. The handle covers `c ± w / 2`. The active track ends `active.handle.leading-space` before it, and the inactive track starts `active.handle.trailing-space` after it. Both stop at zero size inside the track: the probe's zero-width part lies 6 px outside it, where it could add scrollable overflow.
- **The stop indicator is an element of its own,** and not a gradient in the inactive track's box. Required: it lies at the track's inline end, `stop-indicator.trailing-space` from it, in the computed direction. Its inline size is `min(size, max(0px, inactive track − trailing space))`, so it shrinks to nothing as the handle comes. It paints above the inactive track and below the handle, without a `z-index` that leaves `.track`, which is why the inactive track is `::before`: an `::after` would paint over it. It takes no pointer event. Its corner is `stop-indicator.shape`. The disabled opacities are `opacity` on the parts, so no color is mixed. In forced colors the inactive track, the active track and `.stop` have opacity 1, and `.stop` is `Canvas`.
  - **Why:** it removes the gradient, the paddings and both `color-mix()`es, it reads the `shape` that `SL-D9` lists, and a change costs 42 µs less in Firefox (`SL-D8`). The drawing is the same in the three engines and both directions ([reading](checks/stop-indicator.txt)): the same box, and only edge pixels differ from the gradient's soft edge. It costs one element per slider.
- **Width.** The host is a block that fills its container, and it has no inline size of its own. A container that shrinks to its content, such as a flex row, gives it 0. It is a limit that the documentation states. The text field has the same one: it is 32 or 33 px wide in a flex row ([reading](checks/press-and-width.txt)). Not adopted:
  - **The input in flow,** which gives the slider the native range's preferred size: 129, 192 and 129 px in Chromium, Firefox and WebKit (Firefox's seems to follow the font: it is 160 px for the native range). A `min-content` container still gives 0, and in WebKit a change costs 5 to 7 % more.
  - **`min-inline-size: 200px`,** which is Material Web's. It overflows a narrower container, and the consumer has to undo it.
  - Either can be added later without a change of the surface.
- **Corners.** The outer corners are the size's `shape.leading` and `shape.trailing`. The inner corners are the 2 px of `active.track.inner-corner.corner-size`. Its value names right corners, so the package maps them to the active track's end and the inactive track's start.
- **Sizes** change the track's height, the handle's height and the outer corners. The inset icons of the three larger sizes wait, so `icon.size` and `icon.padding` aren't read.
- **States.** The handle is 4 px. It is 2 px while the input is `:active` and while it is `:focus-visible`, and both track ends follow it. The held state stays while the pointer is outside, in all three engines. A mouse press isn't `:focus-visible` in any of them. Hover changes nothing but names its token. There is no state layer and no ripple: their tokens are deprecated.
- **Focus indicator.** The slider sets have no token for one, and 2 px alone is too weak to see. The shared `focusTokens` outline goes around `.handle` on `:focus-visible`.
- **Disabled** draws each part's disabled color and opacity. The stop indicator's only disabled opacity is deprecated, so it uses `disabled.handle.opacity`, which has the same value (0.38).
- **Value indicator,** with `indicator` set: shown while the handle is held or has keyboard focus, above it by `value-indicator.active.bottom-space`, centred on it and kept between the slider's ends. Its block padding is that token too, so it is 44 px tall. No current token gives its padding or shape. Literals, with provenance: 10 px inline padding from Material Components for Android's `Widget.Material3.Slider.Label`, read through a subagent on 2026-11-23, and a full corner, which is the architect's inference, not a reading. The visual review settles it. The text is written only when `indicator` is set.
  - **Placement.** Required: the shown indicator adds no scrollable overflow, to the page or to a container, at either end, in either direction, whatever its text. It is centred on the handle wherever it fits between the slider's ends, and otherwise it stops at the end. A text that is longer than the slider wraps, and breaks inside a word if it has to, whatever `white-space` the page gives the slider. A slider narrower than the text's inline padding, 20 px, is outside this. It isn't in the box model while it isn't shown, as before.
  - **How, as measured:** `.indicator` is a flex container as wide as the track. Its two pseudo-elements are the spaces beside `.text`, with `flex: 1 1` and the basis `max(0px, 2c − 100%)` and `max(0px, 100% − 2c)`, where `c` is the handle's centre. Each takes half of the free space, so the text is centred, and the longer one gives way first. `.text` is `flex: none` with `max-inline-size: 100%`. It reads no layout, needs no script, no direction and no new platform feature.
  - **Text.** `.text` has `unicode-bidi: plaintext`, for the number and for `valuetext`. The text's own characters give its direction, and a text with no letters is left to right. So `-18` and `-18°` are drawn with the sign at the left in both directions, as a script-neutral number is, and a `valuetext` that begins in Arabic or Hebrew is laid out right to left. `Intl.NumberFormat`'s own direction marks keep working. The text is an element's and no longer generated content, so `data-value` goes. `aria-hidden` moves from `.handle` to `.indicator`.
  - **Not adopted:** see [`reviewer-2`](#reviewer-2).
- **Motion.** The value isn't animated: the handle is at the pointer. The handle's width changes at once. Compose's does too, and the sets name no motion. The value indicator fades by `opacity` alone, over the fast-effects duration. So nothing that `RF-107` counts as motion moves, and the unit doesn't wait for it.
- **Forced colors.** The native input is transparent and backgrounds are overridden there, so a rule draws the parts in system colors (`CanvasText`, `Highlight`, `GrayText`). Without it the slider would be invisible.

## SL-D7 — Direction

The drawing uses logical properties only, so it follows the computed direction, from `dir` or from CSS. The native input follows it too: a press at 20 % from the left gives 80 in both forms, and the drawn handle is under the pointer, in all three engines. The component reads no direction. The arrow keys are the engine's (`SL-D1`).

## SL-D8 — What a pointer move costs

Per `input`: one read of the input's value, one `setProperty` on `.track`, one `setFormValue`, the indicator's text if it is set, and the native range's own work. **No layout or style is read, and the component writes no host attribute.** A consumer that sets `valuetext` on each move writes one, and `useARIA`'s observer runs a callback that finds no `aria-*` name.

**The built element,** at `ed272a010`, with its event dispatched ([readings](checks/built-move-cost-cause.txt)). Style and layout for one change, flushed, as the median of 20 rounds of 400, on a page of 1000 elements, at a load average of 1 to 2 on 12 processors. The prototype was run in the same rounds, so the rows compare.

|  | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| The native range alone | 11 µs | 5 µs | 28 µs |
| The prototype with everything | 41 µs | 103 µs | 295 µs |
| **The built element** | 50 µs | 178 µs | 323 µs |
| The same, with the stop indicator as an element (adopted) | 52 µs | 135 µs | 328 µs |
| The built element, held, with the value indicator shown | 91 µs | 300 µs | 463 µs |
| The same, with the stop indicator as an element | 113 µs | 238 µs | 485 µs |

- **Why the first built readings were higher than the plan's.** Two causes:
  - **The host's load.** The prototype takes 41, 103 and 295 µs on this nearly idle host, near the plan's 36, 94 and 284. On the implementer's loaded host it took 59, 168 and 484.
  - **A real cost of the built styles.** Paired by round, a built change costs 1.3, 1.8 and 1.1 times the prototype's. With the prototype's styles on the built element it costs 0.9 times, and with the built styles on the prototype's script 1.2, 1.6 and 1.0. The script with the event is 4, 13 and 3 to 5 µs of the whole.
- **What in the styles, in Firefox** (the parts overlap, so they don't add up). The inactive track's gradient, paddings and `color-mix()` are 68 of the built element's 85 µs over the prototype, and the tokens as custom properties 35. The geometry and `:has()` are nothing that can be told from the noise. With the tokens, `:has()`, the geometry and the drawing of both track parts all replaced, the cost is the prototype's. In Chromium the tokens explain the difference, and WebKit's is too small to divide.
- **What is kept.** The tokens as custom properties are how every component reads them. The value indicator as a pseudo-element costs 38, 115 and 113 µs while the handle is held, and only then, or with keyboard focus, is it shown. As `.indicator` and `.text` it costs up to 9, 45 and 155 µs more (the minima of interleaved rounds, 120 to 130, 292 to 338 and 490 to 645 µs, at a load average of 6; the variant also kept the built one's attribute write, so these are upper bounds; [readings](checks/indicator-cost-and-text.txt)).
- **The prototype's value indicator was hidden and had few styles,** so the plan's first figures were below the cost of a shown one.
- **In Chromium a round takes one of two speeds,** about a factor of two apart, so there the minima compare better than the medians: 34, 42 and 47 µs for the prototype, the built element and the element with the stop indicator, and 75 and 79 µs for the two held rows. The stop indicator's element saves nothing in WebKit, and in Chromium it costs up to 5 µs more.
- **In Chromium's frames, with paint,** the built element takes 1763 µs of main-thread tasks, against 1680 and 1630 for the prototype in two rows of the same run, 1135 for the native range and 176 idle. The figures vary by about 200 µs, so none of the drawings can be told from another.

The prototype's own variants, read for the choice below, as the median of 20 rounds of 500:

|  | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| The native range alone | 11 µs | 2 µs | 24 µs |
| Logical insets (adopted) | 33 µs | 74 µs | 236 µs |
| Transform and `clip-path` | 37 µs | 52 µs | 264 µs |
| Insets with the text and the form value | 36 µs | 94 µs | 284 µs |
| Insets, with the property on a host that has 200 children | 148 µs | 164 µs | 640 µs |

In Chromium a frame that changes the value takes 1716 µs of main-thread tasks with everything, against 1011 µs for the native range alone and 198 µs idle. So the drawing is about 4 % of a 60 Hz frame there.

**Logical insets are adopted over `transform` and `clip-path`.** Flushed, insets are 12 % and 11 % cheaper in Chromium and WebKit, and in Firefox `clip-path` saves 22 µs. In Chromium's frames, with paint, `clip-path` saves 156 µs (1388 against 1544). It would need mirrored physical insets in RTL and other ones for the vertical slider. Insets need neither.

## SL-D9 — Tokens

All six sets are in the store (`RD-47`'s unit T). No deprecated token is read.

| Package | Set | Tokens |
| --- | --- | --- |
| default | `md.comp.slider` | `handle.color`, `handle.shape`, `handle.width`; `hover`, `focus`, `pressed` and `disabled` `.handle.width`; `pressed.handle.color`; `disabled.handle.color` and `.opacity`; `active.track.color`, `inactive.track.color`, and their focus, pressed and disabled forms with `disabled.*.track.opacity`; `active.track.inner-corner.corner-size`; `active.handle.leading-space`, `.trailing-space`; `stop-indicator.color`, `.shape`, `.size`, `.trailing-space`; `disabled.inactive.stop-indicator.container.color`; `value-indicator.*` |
| size | `md.comp.slider.<size>` | `active.track.height`, `inactive.track.height`, `active.track.shape.leading`, `inactive.track.shape.trailing`, `active.handle.height` |
| focus | `md.sys.state.focus-indicator.*` | the shared package |
| motion | fast effects | the value indicator's fade |

- **The size sets win over the base set's** `full` outer corner: the small track is 24 px tall and its corner 8 px, where `full` would be 12.
- **The value indicator's style mixes two styles upstream:** `label-large`'s font, size and line height with `body-large`'s weight (400) and tracking (0.5 px). The slider reads what upstream says. `RF-110` is on `main`, and the values above are read through it.

## Feature proof dispositions

The [feature proof](../reviews/slider-1/feature-proof-claude.md) at `3c36609c3`, ruled on 2026-11-24 by the architect. The sections and rows above state each ruling's contract.

### reviewer-1

**Accepted, and the mechanism is replaced.** The restoration goes. The press is held back until the browser has decided (`SL-D3`), so nothing has to be restored and `SL-D2` and `SL-D3` no longer conflict.

- **Not adopted, the restoration of what was asked for, with the script's write overwritten:** it repairs the first three cases and loses an independent script's value.
- **Not adopted, the same with the script's write kept:** a consumer that writes a number derived from the press, such as a player's position, turns the scroll into a seek. A write that equals the pressed number could be told apart, and a derived one can't.
- **Not adopted, nothing:** Chromium's native range commits the press that becomes a scroll.

### reviewer-2

**Accepted.** The indicator stays between the slider's ends (`SL-D6`). Candidates, read in the three engines with 17 pages each ([readings](checks/indicator-overflow.txt)); the 40 px in the _translated sheet_ row is the page's own:

| Candidate | Overflow | Where it fails |
| --- | --- | --- |
| Built | 19 to 63 px | at the inline end |
| **Flex, between the slider's ends (adopted)** | none | off the handle's centre by up to half its width at the ends (20 px for `100`) |
| Anchor positioning in the track | none, except a text longer than the slider | the same place as flex, by a newer feature |
| Anchor positioning in the viewport, two forms | none | **in Firefox an RTL slider in an LTR page, and the reverse, has its indicator off the screen** (755 px away at 0, 441 at 40). It floats beside its container when that scrolls |
| The same in the top layer | none | the same in Firefox, and 40 px off under a translated ancestor there. It needs script to open and close it with `:active` and `:focus-visible` |
| `overflow: clip` | — | not run: it cuts the indicator, which lies outside every box of the slider |
| Accept it | 19 to 63 px | a page that scrolls sideways while the handle is held |

- **Anchor positioning in the viewport is Material Components for Android's place** (`TooltipDrawable.calculatePointerOffset` keeps the label in the window; read at `3a2969935`), and its other mode, `LABEL_WITHIN_BOUNDS`, is the adopted one. It also escapes a container that clips. It is the better place when Firefox draws it, and a later change to it changes no surface. web-features gives its keys as Baseline since 2026-01-13 and the feature as a whole as not Baseline, read on 2026-11-24.
- **Limit, documented:** a container that clips above the slider cuts the indicator, as before.

### reviewer-3

**Accepted.** `unicode-bidi: plaintext` on the text, for the number and `valuetext` (`SL-D6`), read in the three engines for twelve texts. `isolate` with `direction: ltr` draws the number the same, and lays an Arabic or Hebrew `valuetext` out left to right. `valuetext` isn't isolated separately: one declaration serves both. A text with no letters, such as `-18 %` or `-١٨`, is drawn left to right in both directions. A consumer that wants the sign at the right puts a direction mark in `valuetext`, as `Intl.NumberFormat` does for its locales.

### reviewer-4

**Confirmed, the implementer's.** An `aria-label` with nothing but white space isn't a source (`SL-D4`).

### reviewer-5

**Confirmed, the implementer's,** with the indicator's elements (row 12).

### reviewer-6

**Amended.**

| Property | Ruling |
| --- | --- |
| `touch-action: pan-y` | a row reads the computed value in the three engines (row 8) |
| _If it differs_ | gone with the restoration. Row 8 has the pan from the handle |
| The equal bounds' guard | it earns its place: without it the inactive track and the stop indicator vanish. Row 1 reads them |
| The input's `opacity: 0` | a `spec` row, in the three engines |
| The fade in | row 12 |
| The indicator's `z-index` | the baselines, and no row |
| Forced colors in Firefox | Chromium's visual row, as planned. No row |

### reviewer-7

**Closed by reading:** #220's description says it, read on 2026-11-24. It needs the changes below.

### The implementer's work

In this order, on `material-x/slider-1`:

1. **The held press** (`SL-D3`, and `value` in `SL-D2`): replace the restoration. [`held-press-variants.ts`](probes/held-press-variants.ts) has one form that read right in both engines. It isn't prescribed.
2. **The indicator** (`SL-D6`): the two elements, the placement, `unicode-bidi`, and no `data-value` or `::after`. The forced-colors rule, the fade and the spec layer's adapters follow the new box.
3. **The empty `aria-label`** (`SL-D4`).
4. **Rows** 1, 8, 10, 12, 13 and the `spec` row, each with its witnesses, in the engines that it names. The two rows of the restoration go. Rerun `built.ts` and the Firefox probe on the built element.
5. **Docs:** JSDoc (`@event input`, and `indicator`) and `slider.mdx`: a touch that becomes a scroll changes nothing and fires nothing; with a finger the handle moves at the lift or the first slide; the indicator stays between the slider's ends and is cut by a container that clips above; a negative number's sign.
6. **The report:** sizes, and what differs from this list.

The proof's accepted items are then read again by the reviewer. The baselines are recorded after it, not before.

**The coordinator's:** #220's description (_restores the value_; the phones' step 2, where the value doesn't change during the scroll either; step 3, where the handle moves at the lift), and minting the note below, which is done.

### The owner's answers on the amendment

Answered by the owner on 2026-11-24, in chat, relayed by the coordinator, both as recommended. Nothing in the implementer's work changes.

- **On touch, should the handle wait for the lift or the first slide?** Recommended: yes, as Material on Android does in a scrolling page. A press on the track then shows nothing until then. The alternative is the handle jumping at the touch and back when the page scrolls, with a rule on whose value is lost. **Answered: yes.** _"Q1: думаю, да, соглашусь"_ ("I think yes, I agree").
- **At the ends, should the indicator stop at the slider's end?** Recommended: yes ([drawn](checks/indicator-elements-chromium.png), and [as built](checks/indicator-built-chromium.png)). It is off the handle's centre by up to half its width there. The alternative is a centred indicator and a page that can scroll sideways while the handle is held. **Answered: yes.** _"Q2: тоже да"_ ("also yes").

## What stays possible

- **Range slider:** another element, with two inputs over one `.track` and a second fraction. Nothing here names the only value.
- **Stops:** drawn on the same two track parts from `min`, `max` and `step`, by a future attribute. `indicator` is named so that a `stops` attribute doesn't collide with it.
- **Vertical:** `writing-mode` on `.track` and `touch-action: pan-x`. The insets are logical.
- **The inset icon:** a slot, and the tokens left unread.

## Tests the unit owes

In each engine of `RD-20`'s floor, unless stated, under the `test-component` and `test-visual-contract` skills. The floor's mobile browsers have no suite, as `RD-20` accepts.

**`browser` rows**

1. With equal bounds the handle, the inactive track and the stop indicator are drawn as at 0 (**witness:** without the guard the inactive track has no size). Each attribute and property, with its default; `step` that isn't a number; a signed range's default.
2. `value`, `min`, `max` and `step` give the same result in each order, as attributes and as properties. **Witness:** without the rewrite, `value` before `max` fails as properties in every engine (read in all three).
3. The `value` attribute is followed until a user move or a script write, and a reset restores it.
4. A press, a drag and a drag past each end: the value, the events and their order, flags and target, and `value` and the form value already current in the handler. A press on the handle's centre changes nothing. A press 1.5 px off it, on a 200 px slider of 100 steps, changes nothing in Chromium and WebKit, and in Firefox gives the value at the pointer, asserted separately so that a change of the engine is seen. The row puts its slider 0.15 px in, so that the pointer is on a whole pixel: without it Firefox rounds 1.5 px past the centre down and keeps 40. A press on the stop indicator gives the value there (**witness:** without `.stop`'s `pointer-events: none` it fails).
5. A value written inside an `input` handler during a drag: the drag goes on. The same value written back: `change` fires. `change` after a rewritten value isn't asserted in WebKit.
6. Every key, in LTR and RTL. The horizontal arrows in RTL assert WebKit's own direction separately, so a change of the engine is seen.
7. A fractional step over seven presses.
8. Chromium, by emulated touch (`SL-D3`):
   - A vertical pan that starts on the track scrolls and fires neither `input` nor `change`. The value, the form value and the drawing are as before, during it too. So does one that starts on the handle. **Witness:** without the hold the first fails.
   - After such a pan: a slider that followed its attribute follows it (30, then 60). One that followed its midpoint follows it (`max = 300` gives 150). A number out of bounds is kept (`value = 200`, then `max = 300` gives 200). **Witness:** with the press's number taken as asked for, each fails.
   - A script's write during the press that becomes a pan stays and fires no event: `value`, the attribute, a bound and a form reset. **Witness:** with the number at `pointerdown` restored, the first two fail. **Witness:** without the drop of the engine's `change`, the first two and the bound fail.
   - A tap fires one `input` and one `change`, with the new value in both. A horizontal drag that starts off the handle, one from the handle on a coarse step, and one that turns vertical fire `input`s and one `change` and don't scroll. **Witness:** with the first `input` held also after a move, the coarse one fails, so it reads the value before the lift.
   - A slide that the browser cancels keeps its value and fires `change`.
   - A key and a tap after a pan work at once. The slider moved in the DOM during a held press shows the number that it had, and its input has it too.
   - The dispatched `input` has the native flags.
   - In Firefox the same gestures by the committed probe, rerun on the built element: tap, drag, the coarse drag, press and cancel, a script's write during, a slide and cancel. **Witness:** without the drop of the engine's restoration, the script's write fails there.
   - The input's computed `touch-action` is `pan-y`, in the three engines. No gesture that the suite can make shows it.
9. Form: name, `FormData`, reset, disabled by attribute and by fieldset, under pointer and Tab; validity through `setCustomValidity`; `error` and `required`.
10. Name, from each engine's own accessibility tree: an empty and a white-space `aria-label` beside a `<label>` (named by the `<label>`), also when it becomes empty at run time; each of the four sources alone; each pair; three sources; each source added and removed at run time; the slot filled at run time. The control's name is `SL-D4`'s. **Witness:** with the text field's transform, the `aria-labelledby` and `<label>` rows fail.
    - The host: not exposed where `SL-D4`'s table says so. **The named host under a host `aria-label` is a known row for each engine, pinned as `RF-94`'s,** so `RF-94`'s repair reverses it.
    - A host `aria-describedby` describes the control. A host `aria-valuenow` doesn't change the reported value in Chromium (**witness:** without the exclusion it reports 5). A host `aria-valuetext` wins over `valuetext`, and its removal restores it.
    - Chromium through CDP in the suite, as the list roles are. Firefox and WebKit by the committed probe, rerun on the built element, with Firefox's value and description from `nsIAccessible`. `aria-valuetext` in Chromium and WebKit is asserted as the input's attribute, because their readers don't give it.
11. The label click focuses the input, for the slot, the wrapping label and `for`.
12. The value indicator is shown on a press and on keyboard focus and not otherwise, with `valuetext`'s text. Its showing runs an opacity transition (**witness:** without `@starting-style` it fails). Chromium's accessibility tree has no node with its text (**witness:** without `aria-hidden` it fails, so the row reads text nodes, which `readAccessibilityTree` leaves out today).
    - Signed, in both directions: the sign is drawn at the left of the digit for `-18` as the number and for `valuetext="-18°"`, read by the rects of the two characters. A `valuetext` of Arabic letters is laid out right to left in an LTR slider. **Witness:** without `unicode-bidi` the RTL ones fail.
13. No scrollable overflow at either end, in both directions, at rest and **with the indicator shown** by keyboard focus: in a container with `overflow: auto` and on the page, for `100`, `1000000` and a `valuetext` longer than the slider, and with an RTL slider in an LTR page. The shown indicator lies within the slider's ends, and it is centred on the handle at 50 and at the first value where it fits. **Witness:** with `flex-shrink: 0` on the spacers the ends fail, and without `max-inline-size` the long text does.
14. Reconnection and a move in the DOM: no doubled event.
15. Under `prefers-reduced-motion: reduce`, no motion property animates (`RF-107` property 1). Not in Safari.

**`spec` rows,** against the token package: handle and track geometry and the spaces for each size; the corners; the colors and opacities in each state; the handle's width held and focused, with the track ends; the indicator's box; the input's `opacity` of 0; the stop indicator's box, corner, color and opacity, in both directions and where the track is too short for it, and that it paints above the inactive track; the focus outline. RTL mirrors one size.

**`visual`:** sizes at three values, disabled, RTL, held with the indicator, keyboard focus, forced colors. The recording workflow makes the baselines.

**The package:** `files.json`, `react.ts`, the traits baseline, `package-entries`, the story and its page, and the size row reported. No size is estimated here: none was measured.

**The component's docs:** JSDoc and `slider.mdx` say that the slider fills its container and has no inline size of its own, so a container that shrinks to its content needs one set.

**Documentation, in its own pull request,** prepared as a patch: an `accessibility.md` section, `architecture.md`'s exceptions (the `.host` one, and Q1's), and the component list.

## Prototype checkpoint

**None is needed.** The two assumptions that could have overturned the design were probed: that the name reaches a shadow range once, and that the drawn handle stays under a native drag in both directions. What is left is a range's behavior on a physical phone and under a real screen reader. No finding there would change the surface: a defect in touch moves the pointer code to `SL-D1`'s hybrid, behind it. **The owner tries the story on an iPhone and an Android phone after the merge,** including a vertical scroll that starts on the slider, in the Storybook built from `main`. A defect is a follow-on unit. (Amended 2026-11-24 on the owner's ruling, relayed by the coordinator. It said _before the merge_.)

## Not measured

- **The held press in Safari and on iOS,** where nothing in the suite can make a touch. By reading, iOS moves only the thumb, so a press there makes no `input` before a move and nothing is held. A pen. Firefox's own decision to scroll: its probe sends the cancel.
- **The indicator's elements' cost as built,** above.
- A press in Firefox with a real mouse. Physical touch, iOS Safari and Android. iOS's touch area is a reading of WebKit's source. Emulated touch ran in Chromium only.
- **The amended element's cost on an idle host.** The figures with `.stop` are of the built element with the styles changed by the probe. The probe put `.stop` above with a `z-index`, so the swapped pseudo-elements weren't drawn. The implementer reran `built-move-cost.ts` on the change on a loaded host ([readings](checks/built-move-cost.txt)), so only the adjacent runs compare, and `RD-55`'s note of 2026-11-24 says what they show.
- A screen reader or any assistive technology. The accessibility trees were read, not heard, so nothing here says whether the second named node is announced.
- `aria-valuetext`'s effect in Chromium and WebKit, and descriptions in WebKit: their readers don't give them.
- Paint in Firefox and WebKit, and frames there. The host was shared, and the figures are of headless software rendering, good for comparing the variants.
- The element's bundle size, and the demo's work for each `input`.
- Forced colors, the value indicator's drawing and the corners. No probe drew them.

## Answered questions

Answered by the owner on 2026-11-23, in chat, relayed by the coordinator. The options are kept as asked.

### Q1 — Whose is the value?

`architecture.md` says that every component is controlled, with the text fields as the one exception. A slider's drag is the same kind of input: each move is a keystroke.

- **(a) The user's, as a text field's text: `value` reads it, the consumer may set it, the handle follows the pointer by itself. Recommended.** It costs a second exception to the principle.
- (b) The consumer's, as a checkbox's: the handle moves only when the consumer sets `value` in answer to an event. The consumer has to learn the proposed number. An `input` is a plain `Event` (`RD-52`), so the component needs a named event class of its own, or `input` and `change` would report the old number. Each move waits for the consumer's render before the handle moves. The native `change` can't be used either: after a revert it doesn't fire in Chromium or WebKit, and in WebKit not even when the value is committed in the next frame. So the component would track each gesture's end itself.
- (c) The consumer's while a `controlled` attribute is set, and the user's otherwise. Two models in one element, and both costs.

**Answered: (a).** _"q1 a"_.

**Why (a) was recommended.** The owner decided the text fields' exception on speed: _"this is already a question of performance. Speed matters more than the principle."_ A pointer move is as frequent as a frame. (a) needs no new event, uses the platform's `change`, and a consumer that does want a controlled slider sets `value` in its handler, which works in the middle of a drag.

### Q2 — What does a host's `aria-label` do?

Named by its label slot or by a `<label>`, the slider has one named node (and Firefox's second one with `for`). A host `aria-label` can't be honored without a second named node unless the component removes it from the host.

- (a) Nothing: the documentation says to use the slot or a `<label>`. Recommended. It costs a trap: `<mx-slider aria-label="Hue">` leaves the slider unnamed, and a named generic host beside it.
- (b) The component moves it: it sets the name on the input and removes the attribute. One named node in all three engines. It costs a component that edits the attributes its consumer wrote, which [`attribute-vs-state-styling.md`](../../.agents/docs/attribute-vs-state-styling.md) avoids, and a framework or a test that reads `aria-label` back finds none.
- **(c) The component copies it, as `useARIA` does.** The slider is named, and the host is a second named node in all three engines. This is `RF-94`'s `FV-F2`, repeated. **Chosen.**

**Answered: (c).** The owner first asked whether the `label` slot inside `<label for>` already covers it, as in the text field, and whether the duplicate node can be switched off for a screen reader. The coordinator explained from the readings that role `none` is ignored while a host `aria-label` is present, that `aria-hidden` hides the input too, and that removing the attribute is the only thing that worked. He answered: _"Безобразие, но тогда делаем как в text-field. Решать, как починить, будем потом (добавь в ишуи)"_ ("An outrage, but then we do it as in text-field. How to fix it, we'll decide later (add it to the issues)"). [#148](https://github.com/ausginer/material-x/issues/148) is `RF-94`'s issue and covers it.

`aria-hidden` on the host wasn't probed: that it hides the subtree is its definition.

## Proposed record entries

Minted on 2026-11-23 by the main slot's architect, at `eaff88884`. The text below is the proposal as it stood, and the entries govern:

| Proposal                           | Entry                            |
| ---------------------------------- | -------------------------------- |
| `SL-D1` to `SL-D9`, with Q1 and Q2 | `repo:RD-55`                     |
| The note for `RF-94`               | a dated note in `repo:RF-94`     |
| `SL-F1`                            | `repo:RF-119`, run and confirmed |
| `SL-F2`                            | `repo:RF-120`, run and confirmed |

**Proposed on 2026-11-23, after the implementation, and minted on 2026-11-24** in `RD-55`, adjusted to the built element: a dated note in `RD-55`, with no new entry. _"The plan is amended at the implementation's return. The stop indicator is an element of its own (`SL-D6`). A press off the thumb's centre moves the value to the pointer in Firefox, as on every native range there (`SL-D1`). The slider has no inline size of its own, as the text field has none (`SL-D6`). The cost of a move is the built element's (`SL-D8`)."_ The entry's own clauses stay true.

**Proposed on 2026-11-24, for the feature proof, and minted the same day** in `RD-55`, with the owner's answers, the indicator's cost and two limits added: a dated note in `RD-55`, with no new entry, and clause 4 amended. _"**Clause 4 now says:** Events are plain `Event`s (`RD-52`). A press that the browser turns into a scroll changes nothing and fires nothing: the component holds back a finger's press until the browser has decided. What it said: a press that the browser turns into a scroll restores the value. **Why:** a restoration can't tell the user's press from a script's write that followed it, so `SL-D2` and `SL-D3` gave different answers (`reviewer-1`). **The value indicator** is two elements inside the track: it stays between the slider's ends and adds no scrollable overflow (`reviewer-2`), and its text takes its direction from its characters, so a negative number keeps its sign at the left in RTL (`reviewer-3`). An empty `aria-label` isn't a name's source (`reviewer-4`). **Costs:** with a finger the handle moves at the lift or the first step of the slide, and the indicator is off the handle's centre at the ends."_

The first proposals, as they stood:

- **A decision entry for `SL-D1` to `SL-D9`,** pointing here, with the owner's answers to Q1 and Q2. Q1 (a) also makes the slider the second exception in `architecture.md` §Components.
- **For `RF-94`, a dated note, and no new finding.** The entry already holds the duplicate node (`FV-F2`) and the unnamed checkbox and radio (`FV-F1`), and its required property is the one that the slider doesn't meet yet. The note adds:
  - **The owner's answer to Q2:** the slider mirrors host `aria-*` as the text fields do, the second node is accepted for now, and how to repair it is decided later. `mx-slider` joins the elements that the repair covers. Until it is built, `RF-94` lists it by this plan.
  - **Every element with a control, read as built, with a host `aria-label="A"`** ([readings](checks/mirroring.txt)), the same in all three engines:

    | Elements | Control | Host |
    | --- | --- | --- |
    | `mx-button`, `mx-icon-button`, `mx-link-button`, `mx-switch-button`, `mx-switch-icon-button`, `mx-fab`, `mx-text-field`, `mx-multiline-text-field` | named `A` | a second node named `A`: `generic` in Chromium and Firefox, `group` in WebKit |
    | `mx-list-button-item`, `mx-list-link-item` | named `A` | its own `listitem`, named `A` as well. The node is the item's and stays. Only its name is repeated |
    | `mx-checkbox`, `mx-radio` | unnamed | named `A`: `generic` or `group` |

    `mx-split-button`, the groups, `mx-list` and `mx-list-item` weren't read.

  - **More of the same cause, read on `mx-text-field`:** a host `aria-labelledby` names nothing, so the field is unnamed (or falls to its slot). A host `aria-describedby` doesn't describe the control. A `<label>` leaves the control unnamed. This closes the entry's first _not established_ point for the ids: they don't resolve.
  - **What carries a light-DOM reference to a shadow control, in all three:** the element references, `ariaLabelledByElements` and `ariaDescribedByElements`. This answers the entry's _how a light-DOM label reaches a shadow control_. They don't hide the host.
  - **Possible repairs of the second node. None is chosen:**
    - **Move the attribute:** the component sets the name on the control and removes `aria-label` from the host. One named node in all three engines. It edits the consumer's attributes, and a framework or a test can't read it back.
    - **A plain attribute in place of `aria-label`,** such as `label`: one named node in all three engines, read on the prototype, with nothing to remove. A consumer who writes `aria-label` is where they are now, and it is new surface on every element.
    - **The host as the accessible control,** through its internals: one named node in all three engines for a slider role (read), and `<label for>` works by itself. The native control inside would have to leave the accessibility tree and stop taking focus, so its behavior is written by hand. `SL-D1` rejects it for the slider because of Firefox. It wasn't weighed for the others.
    - **Role `none` on the host** isn't a repair: every engine ignores it while the host has `aria-label` or `aria-labelledby`. It hides a Chromium host that has neither.
    - **The platform's reference target** for shadow roots, when it is Baseline. Not read here, and it isn't Baseline to the architect's knowledge.
  - **Size and the unit** are the entry's. Its plan decides.
- **`SL-F1`, proposed, by reading only:** core's `formDisabled` passes no argument, and `useDisableable` reads only the host's attribute. So `mx-checkbox`, `mx-radio` and the other form controls in a `<fieldset disabled>` match `:disabled`, while their native control doesn't, because it isn't in the fieldset's tree. It may stay reachable and operable by keyboard. Not run.
- **`SL-F2`, proposed, by reading only:** core's `formStateRestore` passes neither the state nor the reason, so no form control can restore its value after a navigation or from autofill. The slider has the same limit.

## Revisions

- **2026-11-23, `81671c1ad`:** the first plan, with Q1 and Q2 open.
- **2026-11-23, this revision,** for the owner's answers:
  - Q1 (a) and Q2 (c) answered. Q2's recommended answer, (a), isn't taken;
  - `SL-D4` rewritten: host `aria-*` is mirrored; the order of the four names, with the slot now before a `<label>`; `aria-labelledby` and `aria-describedby` by element reference; the three value attributes excluded; `valuetext` against `aria-valuetext`; the host node per combination;
  - row 10 rewritten, and `SL-D8` and _Not measured_ adjusted;
  - the proposed finding for `RF-94` is a dated note there.
- **2026-11-23, after the implementation at `ed272a010`,** for the three differences in its [report](slider-report.md):
  - `SL-D8`: the built element's figures, and the cause of the difference. The loaded host explains most of it, and the styles the rest;
  - `SL-D6`: the stop indicator is an element, and the two track pseudo-elements change places; the width is a documented limit;
  - `SL-D1`: the press off the thumb's centre in Firefox, an accepted cost;
  - rows 4 and the `spec` rows, the component's docs, and _Not measured_ follow. The proposed note is in [the last section](#proposed-record-entries).
- **2026-11-24, the architect,** at the amendment's return (`6ecdc0155`), relayed by the coordinator. `RD-55`'s note is minted, and no decision changes:
  - `SL-D1`: the press in Firefox. The bound was _about 2.4 px_, read at one place, and is under 3 px; the centre was said to change nothing, and with narrow steps it does; a step of about twice the bound is now 6 px. The earlier [reading](checks/press-and-width.txt) already had the centre's 398;
  - row 4: the 0.15 px inset, and why;
  - `SL-D8`'s figure in short is the adopted drawing's; it was `ed272a010`'s 50, 178 and 323 µs;
  - the check on phones is after the merge, and _Not measured_ follows;
  - three of the plan's probes are formatted, with no other change, because `fmt-check` failed on them.
- **2026-11-24, the architect,** for the feature proof at `3c36609c3`:
  - `SL-D3`: a press that becomes a scroll is held back and not restored, which settles its conflict with `SL-D2`. `SL-D2`: `value` is the number shown;
  - `SL-D4`: an empty `aria-label` isn't a source;
  - `SL-D6`: the value indicator is two elements, between the slider's ends, with its own text direction. It was the handle's `::after`, centred on the handle, with generated text;
  - rows 1, 8, 10, 12, 13 and the `spec` rows, `SL-D8`'s cost of the indicator, and _Not measured_ follow. Row 8 said: _"Chromium, by emulated touch: a vertical pan scrolls and leaves the value as it was, with no `change`. A horizontal drag isn't restored. Witness: without the restoration the first one fails."_ Row 13 said: _"No scrollable overflow at either end, in both directions."_;
  - [the dispositions](#feature-proof-dispositions), with the work list and two questions for the owner.
- **2026-11-24, the architect,** when minting `RD-55`'s note: the owner's answers, and two limits in `SL-D3`. A script's write during a tap and a move in the DOM during a held press are the engine's, as the readings have them.