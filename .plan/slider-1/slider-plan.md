# mx-slider — plan

**Status: decided by the owner's answers to [Q1](#q1--whose-is-the-value) and [Q2](#q2--what-does-a-hosts-aria-label-do), with no question open.** It is [`repo:RD-55`](../00-index.md), and ready for implementation. Where the entry and this plan differ, the entry governs. Written by an architect on 2026-11-23, on the coordinator's task for [#173](https://github.com/ausginer/material-x/issues/173), on `material-x/slider-1` from `origin/main` at `92a386a17`, and [amended](#revisions) the same day. It is unit C of the [landing plan](../landing-1/landing-plan.md#order) (`repo:RD-47`). The labels `SL-…` are local to this plan, and [the last section](#proposed-record-entries) gives the addresses of the entries that were minted from them.

**The unit:** one element, `mx-slider`, a continuous slider with one value. It is horizontal. The range slider, stops and the vertical slider wait ([what stays possible](#what-stays-possible)).

## The answer in short

- **A native `<input type="range">` in the shadow tree is the control** (`SL-D1`). It owns the pointer, touch, the keyboard, the arithmetic and the accessible node. It is transparent, and the component draws everything from one custom property.
- **The slider's value is the user's, as a text field's text is** (`SL-D2`, the owner's answer to Q1). `value` is a number.
- **The name comes from a host `aria-labelledby`, the `label` slot, a host `aria-label` or a `<label>`, in that order** (`SL-D4`). Host `aria-*` is mirrored, as the text fields mirror it, so a host `aria-label` also leaves the second named node of `RF-94`. The owner accepted that for now (Q2).
- **A value change costs 36, 94 and 284 µs of style and layout** in Chromium, Firefox and WebKit, and reads no layout (`SL-D8`).
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
| — | [`engine-sources.txt`](checks/engine-sources.txt) — what assistive technology can do to an ARIA slider, and iOS's touch area |

## SL-D1 — The control is a native range

**Decision.** The shadow tree holds an `<input type="range">` that is the focus target, the pointer target and the accessible node. This is `architecture.md`'s first exception to the `.host` invariant: the focus target can't be a container.

**Evidence.**

- **Assistive technology changes a native range's value, and in Firefox it can't change an ARIA slider's.** Firefox's `LocalAccessible::SetCurValue` returns `false`, and only native ranges and spinners override it. Its Android bridge marks only those two as settable. Chromium and WebKit synthesize arrow keys for an ARIA slider, so the evidence against one is Firefox's alone, and Firefox on desktop and Android is in `RD-20`'s floor. These are readings of each engine's `main`, not runs with assistive technology.
- **The host as the slider would be named by the platform.** A host with the slider role takes its name from `aria-label` and from `<label for>` in all three engines, as one node. That is its one advantage, and it doesn't outweigh a control that a TalkBack user in Firefox can't move.
- **A 4 px thumb is enough.** The native thumb has the handle's width, 4 px, so the native travel is the drawn travel. In all three engines a press anywhere on the track jumps there, a press on the thumb doesn't change the value, and a drag past an end stops at it. On iOS only the thumb starts a drag, and WebKit widens a thumb's touch area by 12.5 px on each side when a dimension is under 48 px. So 4 × 44 px becomes 29 × 69 px. No input is wider than its track, so nothing overflows.
- **The arithmetic is the platform's:** clamping, stepping, the step base and decimals. A step of 0.1 gives `0.3` and `0.7`, not `0.30000000000000004`.

**Not adopted:**

- **The host as the slider, with its own pointer and keyboard code:** the evidence above.
- **A hybrid,** the native range for the keyboard and assistive technology and the component's own pointer code over it. It would give one pointer behavior in every engine, at the price of capture, touch disambiguation, focus and text selection written by hand. Nothing measured needs it. It stays available behind the same public surface.
- **A range in the light DOM,** slotted: it would be named and submitted natively, and it would make the consumer write the input, unlike any other component here.

**Costs, accepted:**

- **In WebKit the horizontal arrow keys don't mirror in RTL:** `ArrowRight` increases the value and the handle moves left. Chromium and Firefox mirror. The ARIA practices say _Right Arrow increases_ and don't mirror either. The component leaves the engine's behavior.
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

- `value` reads the current value. The consumer may set it at any time, also inside an `input` handler and in the middle of a drag, and the drag goes on.
- The `value` attribute is the initial value. It is followed until the user moves the slider or a script sets `value`, as in `TextFieldCore`. The property doesn't reflect.
- Setting `value` fires no event.
- **The order in which `value`, `min`, `max` and `step` are set doesn't matter.** A native range clamps at each write, so `value = 200` followed by `max = 300` leaves 100, and the engines differ when the value is an attribute (Chromium and Firefox 100, WebKit 200). Frameworks set properties in the order that the markup names them. So the component keeps the number last asked for, by the consumer or the user, and writes it to the input again after each change of `min`, `max` or `step`. `value` reads the input.
- The input's `value` **content attribute is never written,** because it would move the step base.

## SL-D3 — Events

As `RD-52` says. Both are plain `Event`s, and the value is read from the element.

- **`input`:** the native event, which bubbles and is composed, so it crosses the host by itself in all three engines. The component handles it at the input, so `value`, the drawing and the form value are current when the consumer's handler runs.
- **`change`:** the native event stops at the shadow root. The component dispatches `new Event('change', { bubbles: true })` on the host, not through the notifier that `RF-117` deletes.
- **Keyboard:** each key that changes the value fires `input`, then `change`.
- **A press that becomes a scroll restores the value.** On `pointercancel` the component puts back the value that the input had at `pointerdown`, if it differs, and dispatches a plain `input` with the native flags on the input. In Chromium under emulated touch this read `i21 → i50`, no `change`, and the page scrolled. A horizontal touch drag isn't cancelled. Firefox restores by itself on `touchcancel` and fires `input`, by reading, so the component has nothing left to restore there, whichever event comes first.
- **`touch-action: pan-y`** on the input. The vertical slider will need `pan-x`.

## SL-D4 — Name and accessibility

**The owner's answer to Q2: as the text field.** Host `aria-*` is mirrored to the input with core's `useARIA`, and the second named node is accepted for now, as `RF-94`'s. The slider follows the text field's rule, except where a reading shows that it doesn't work.

**The name, first match wins.** Each row was read in all three engines, with 14 combinations of sources in [`mirroring.txt`](checks/mirroring.txt).

|  | Source | How | The text field |
| --- | --- | --- | --- |
| 1 | Host `aria-labelledby` | `input.ariaLabelledByElements` is the host's `ariaLabelledByElements` | **Differs.** It mirrors the ids, which the shadow tree doesn't have, so the host's reference names nothing. The field is unnamed, or falls to its slot or `aria-label` |
| 2 | The `label` slot, when it has an element | `input.ariaLabelledByElements` is the shadow label | The same: its slot wins over a host `aria-label` |
| 3 | Host `aria-label` | mirrored | The same |
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
  <span class="handle"></span>
</div>
```

- The host is a block, and the shadow root delegates focus, which reaches the input through a block host in all three engines. `.track`'s `::before` is the active track and its `::after` the inactive track with the stop indicator at its end. `.handle` is the handle, and its `::after` is the value indicator. `.handle` is an element and not the native thumb, so that rows can measure it, and one rule draws it in every engine.
- **The fraction is one inline custom property on `.track`,** never on the host. On the host with 200 light children a change costs 2.2 to 4.5 times as much. It also doesn't write the consumer's `style`.
- **Geometry.** With `w` the handle's current width and `c` its centre, `c = handle.width / 2 + f × (100% − handle.width)`. The handle covers `c ± w / 2`. The active track ends `active.handle.leading-space` before it, and the inactive track starts `active.handle.trailing-space` after it. Both stop at zero size inside the track: the probe's zero-width part lies 6 px outside it, where it could add scrollable overflow.
- **Corners.** The outer corners are the size's `shape.leading` and `shape.trailing`. The inner corners are the 2 px of `active.track.inner-corner.corner-size`. Its value names right corners, so the package maps them to the active track's end and the inactive track's start.
- **Sizes** change the track's height, the handle's height and the outer corners. The inset icons of the three larger sizes wait, so `icon.size` and `icon.padding` aren't read.
- **States.** The handle is 4 px. It is 2 px while the input is `:active` and while it is `:focus-visible`, and both track ends follow it. The held state stays while the pointer is outside, in all three engines. A mouse press isn't `:focus-visible` in any of them. Hover changes nothing but names its token. There is no state layer and no ripple: their tokens are deprecated.
- **Focus indicator.** The slider sets have no token for one, and 2 px alone is too weak to see. The shared `focusTokens` outline goes around `.handle` on `:focus-visible`.
- **Disabled** draws each part's disabled color and opacity. The stop indicator's only disabled opacity is deprecated, so it uses `disabled.handle.opacity`, which has the same value (0.38).
- **Value indicator,** with `indicator` set: shown while the handle is held or has keyboard focus, above it by `value-indicator.active.bottom-space`, centred on it. Its block padding is that token too, so it is 44 px tall. No current token gives its padding or shape. Literals, with provenance: 10 px inline padding from Material Components for Android's `Widget.Material3.Slider.Label`, read through a subagent on 2026-11-23, and a full corner, which is the architect's inference, not a reading. The visual review settles it. The text is written only when `indicator` is set.
- **Motion.** The value isn't animated: the handle is at the pointer. The handle's width changes at once. Compose's does too, and the sets name no motion. The value indicator fades by `opacity` alone, over the fast-effects duration. So nothing that `RF-107` counts as motion moves, and the unit doesn't wait for it.
- **Forced colors.** The native input is transparent and backgrounds are overridden there, so a rule draws the parts in system colors (`CanvasText`, `Highlight`, `GrayText`). Without it the slider would be invisible.

## SL-D7 — Direction

The drawing uses logical properties only, so it follows the computed direction, from `dir` or from CSS. The native input follows it too: a press at 20 % from the left gives 80 in both forms, and the drawn handle is under the pointer, in all three engines. The component reads no direction. The arrow keys are the engine's (`SL-D1`).

## SL-D8 — What a pointer move costs

Per `input`: one read of the input's value, one `setProperty` on `.track`, one `setFormValue`, the indicator's text if it is set, and the native range's own work. **No layout or style is read, and the component writes no host attribute.** A consumer that sets `valuetext` on each move writes one, and `useARIA`'s observer runs a callback that finds no `aria-*` name. Style and layout for one change, flushed, as the median of 20 rounds of 500, on a page of 1000 elements:

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

## What stays possible

- **Range slider:** another element, with two inputs over one `.track` and a second fraction. Nothing here names the only value.
- **Stops:** drawn on the same two track parts from `min`, `max` and `step`, by a future attribute. `indicator` is named so that a `stops` attribute doesn't collide with it.
- **Vertical:** `writing-mode` on `.track` and `touch-action: pan-x`. The insets are logical.
- **The inset icon:** a slot, and the tokens left unread.

## Tests the unit owes

In each engine of `RD-20`'s floor, unless stated, under the `test-component` and `test-visual-contract` skills. The floor's mobile browsers have no suite, as `RD-20` accepts.

**`browser` rows**

1. Each attribute and property, with its default; `step` that isn't a number; a signed range's default.
2. `value`, `min`, `max` and `step` give the same result in each order, as attributes and as properties. **Witness:** without the rewrite, `value` before `max` fails as properties in every engine (read in all three).
3. The `value` attribute is followed until a user move or a script write, and a reset restores it.
4. A press, a drag and a drag past each end: the value, the events and their order, flags and target, and `value` and the form value already current in the handler.
5. A value written inside an `input` handler during a drag: the drag goes on. The same value written back: `change` fires. `change` after a rewritten value isn't asserted in WebKit.
6. Every key, in LTR and RTL. The horizontal arrows in RTL assert WebKit's own direction separately, so a change of the engine is seen.
7. A fractional step over seven presses.
8. Chromium, by emulated touch: a vertical pan scrolls and leaves the value as it was, with no `change`. A horizontal drag isn't restored. **Witness:** without the restoration the first one fails.
9. Form: name, `FormData`, reset, disabled by attribute and by fieldset, under pointer and Tab; validity through `setCustomValidity`; `error` and `required`.
10. Name, from each engine's own accessibility tree: each of the four sources alone; each pair; three sources; each source added and removed at run time; the slot filled at run time. The control's name is `SL-D4`'s. **Witness:** with the text field's transform, the `aria-labelledby` and `<label>` rows fail.
    - The host: not exposed where `SL-D4`'s table says so. **The named host under a host `aria-label` is a known row for each engine, pinned as `RF-94`'s,** so `RF-94`'s repair reverses it.
    - A host `aria-describedby` describes the control. A host `aria-valuenow` doesn't change the reported value in Chromium (**witness:** without the exclusion it reports 5). A host `aria-valuetext` wins over `valuetext`, and its removal restores it.
    - Chromium through CDP in the suite, as the list roles are. Firefox and WebKit by the committed probe, rerun on the built element, with Firefox's value and description from `nsIAccessible`. `aria-valuetext` in Chromium and WebKit is asserted as the input's attribute, because their readers don't give it.
11. The label click focuses the input, for the slot, the wrapping label and `for`.
12. The value indicator is shown on a press and on keyboard focus and not otherwise, with `valuetext`'s text.
13. No scrollable overflow at either end, in both directions.
14. Reconnection and a move in the DOM: no doubled event.
15. Under `prefers-reduced-motion: reduce`, no motion property animates (`RF-107` property 1). Not in Safari.

**`spec` rows,** against the token package: handle and track geometry and the spaces for each size; the corners; the colors and opacities in each state; the handle's width held and focused, with the track ends; the indicator's box; the stop indicator's place; the focus outline. RTL mirrors one size.

**`visual`:** sizes at three values, disabled, RTL, held with the indicator, keyboard focus, forced colors. The recording workflow makes the baselines.

**The package:** `files.json`, `react.ts`, the traits baseline, `package-entries`, the story and its page, and the size row reported. No size is estimated here: none was measured.

**Documentation, in its own pull request,** prepared as a patch: an `accessibility.md` section, `architecture.md`'s exceptions (the `.host` one, and Q1's), and the component list.

## Prototype checkpoint

**None is needed.** The two assumptions that could have overturned the design were probed: that the name reaches a shadow range once, and that the drawn handle stays under a native drag in both directions. What is left is a range's behavior on a physical phone and under a real screen reader. No finding there would change the surface: a defect in touch moves the pointer code to `SL-D1`'s hybrid, behind it. **The architect asks that the owner try the story on an iPhone and an Android phone before the merge,** including a vertical scroll that starts on the slider.

## Not measured

- Physical touch, iOS Safari and Android. iOS's touch area is a reading of WebKit's source. Emulated touch ran in Chromium only.
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