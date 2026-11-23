# mx-slider — plan

**Status: ready for the owner's answers to [Q1](#q1--whose-is-the-value) and [Q2](#q2--what-does-a-hosts-aria-label-do), and then for implementation.** Written by an architect on 2026-11-23, on the coordinator's task for [#173](https://github.com/ausginer/material-x/issues/173), on `material-x/slider-1` from `origin/main` at `92a386a17`. It is unit C of the [landing plan](../landing-1/landing-plan.md#order) (`repo:RD-47`). The labels `SL-…` are local to this plan. No record identifier is minted or amended here, and [the proposed entries](#proposed-record-entries) are for the main slot's architect.

**The unit:** one element, `mx-slider`, a continuous slider with one value. It is horizontal. The range slider, stops and the vertical slider wait ([what stays possible](#what-stays-possible)).

## The answer in short

- **A native `<input type="range">` in the shadow tree is the control** (`SL-D1`). It owns the pointer, touch, the keyboard, the arithmetic and the accessible node. It is transparent, and the component draws everything from one custom property.
- **The slider's value is the user's, as a text field's text is** (`SL-D2`, the owner's Q1). `value` is a number.
- **The name comes from a `label` slot or from a `<label>`** (`SL-D4`). No host `aria-*` is read or copied, so the slider has one named node instead of `RF-94`'s two (one case in Firefox remains). What the host's `aria-label` does is the owner's Q2.
- **A value change costs 36, 94 and 284 µs of style and layout** in Chromium, Firefox and WebKit, and reads no layout (`SL-D8`).
- **No prototype checkpoint is needed** ([why](#prototype-checkpoint)).

## Inputs

`repo:RD-20`, `RD-47`, `RD-49`, `RD-52`, `RF-50`, `RF-94`, `RF-107`, `RF-110` and `RF-117`; the landing plan; `CONTRIBUTING.md`; `architecture.md`; `accessibility.md`; core's traits and `element.ts`; `CheckableCore.ts` and `TextFieldCore.ts`; the six `md.comp.slider*` sets. The consumers are the box-quad demo's ranges (`-55…55` and `-20…20`, step 1, with a unit) and the picker's hue, chroma and tone.

## Readings

Run on 2026-11-23 in Playwright's Chromium 158, Firefox 159 and WebKit 27.2, on Linux, headless. The probes are standalone pages, because no slider exists.

| Probe | Readings |
| --- | --- |
| [`naming.ts`](probes/naming.ts) | [`naming.txt`](checks/naming.txt) — each engine's own accessibility tree |
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

**Whose the value is.** The owner's Q1. The recommended answer, (a), is planned here: the value is the user's input, the second exception to the controlled principle after the text fields.

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

`RF-94`'s shape is a control that can't be named, or a host that becomes a second named node. The readings, per source of the name:

| Source | Control | Host |
| --- | --- | --- |
| `<label for>` around a `label` slot, in the shadow tree | named in all three | no name in any. WebKit has an unnamed `group` |
| A wrapping `<label>`, given to the input as `ariaLabelledByElements`, host role `none` | named in all three | not exposed in Chromium, Firefox or WebKit |
| `<label for>`, the same | named in all three | not exposed in Chromium and WebKit. **Firefox keeps a `generic` node with the name** |
| Host `aria-label` or `aria-labelledby`, mirrored | named in all three | a second named node in all three, with role `none` too |
| Host `aria-label`, moved to the input and removed from the host | named in all three | no name in any |

**Decision.**

1. **The `label` slot,** inside a shadow `<label for>`. This is the text fields' slot name. Its content is the visible label above the track. A click on it focuses the slider.
2. **A `<label>`,** wrapping or with `for`. The component sets `input.ariaLabelledByElements` to `internals.labels`. A click on it focuses the slider in all three engines. The element references reach from a shadow tree to its host's tree, which a mirrored id can't, so this also answers one of `RF-94`'s open points: _how a light-DOM label reaches a shadow control_. The labels are read when the slider connects and when it takes focus. **A label added later, to a slider that hasn't taken focus since, isn't read.** Labels that the page holds when the slider connects or upgrades are, whatever their order.
3. **If both exist, the `<label>` elements name it,** because the accessible-name computation takes an element reference before a native label. This combination wasn't read.
4. **The host's role is `none`,** through its internals. The host has no name or value of its own.
5. **`disabled`, the value, its bounds and `aria-valuetext`** are the input's.
6. **Host `aria-*` isn't read** (Q2).

Validation: `useValidatable` puts `aria-invalid` on the input. It also puts `aria-required` there when `required` is set, which the slider role doesn't define. A range always has a value, so `required` means nothing here, as on a native range, and the documentation says so.

## SL-D5 — Forms

- `static formAssociated = true`, with `Nameable` and `Validatable`. The element's validity is the consumer's, and the range has no native validators that could fail.
- **The form value** is the input's string, set on connection and on each change. Its cost in a move isn't separable from the readings' noise.
- **Reset** restores the `value` attribute, or the midpoint, and clears what the user set.
- **`disabled`, by attribute or by a fieldset,** disables the input. `formDisabled` fires for both, and `:disabled` already reads the new state inside it in all three engines. Core's controller passes no argument, so the component reads `matches(':disabled')`, and `useDisableable` isn't needed.
- **State restoration is absent,** as in the text fields, because core drops the arguments of `formStateRestoreCallback` (`SL-F2`).

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

Per `input`: one read of the input's value, one `setProperty` on `.track`, one `setFormValue`, the indicator's text if it is set, and the native range's own work. **No layout or style is read, and no attribute is written.** Style and layout for one change, flushed, as the median of 20 rounds of 500, on a page of 1000 elements:

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
10. Name, from each engine's own accessibility tree through the probe's readers where the suite has none: each source, once, on the control; the host unnamed; `<label for>`'s Firefox node as a known row. Also `aria-valuetext` and disabled. Chromium's through CDP, as `list-roles` does; Firefox and WebKit by the committed probe, rerun on the built element.
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
- A screen reader or any assistive technology. The accessibility trees were read, not heard.
- Paint in Firefox and WebKit, and frames there. The host was shared, and the figures are of headless software rendering, good for comparing the variants.
- The element's bundle size, and the demo's work for each `input`.
- Forced colors, the value indicator's drawing and the corners. No probe drew them.

## Questions for the owner

### Q1 — Whose is the value?

`architecture.md` says that every component is controlled, with the text fields as the one exception. A slider's drag is the same kind of input: each move is a keystroke.

- **(a) The user's, as a text field's text: `value` reads it, the consumer may set it, the handle follows the pointer by itself. Recommended.** It costs a second exception to the principle.
- (b) The consumer's, as a checkbox's: the handle moves only when the consumer sets `value` in answer to an event. The consumer has to learn the proposed number. An `input` is a plain `Event` (`RD-52`), so the component needs a named event class of its own, or `input` and `change` would report the old number. Each move waits for the consumer's render before the handle moves. The native `change` can't be used either: after a revert it doesn't fire in Chromium or WebKit, and in WebKit not even when the value is committed in the next frame. So the component would track each gesture's end itself.
- (c) The consumer's while a `controlled` attribute is set, and the user's otherwise. Two models in one element, and both costs.

**Why (a).** The owner decided the text fields' exception on speed: _"this is already a question of performance. Speed matters more than the principle."_ A pointer move is as frequent as a frame. (a) needs no new event, uses the platform's `change`, and a consumer that does want a controlled slider sets `value` in its handler, which works in the middle of a drag.

### Q2 — What does a host's `aria-label` do?

Named by its label slot or by a `<label>`, the slider has one named node (and Firefox's second one with `for`). A host `aria-label` can't be honored without a second named node unless the component removes it from the host.

- **(a) Nothing: the documentation says to use the slot or a `<label>`. Recommended.** It costs a trap: `<mx-slider aria-label="Hue">` leaves the slider unnamed, and a named generic host beside it.
- (b) The component moves it: it sets the name on the input and removes the attribute. One named node in all three engines. It costs a component that edits the attributes its consumer wrote, which [`attribute-vs-state-styling.md`](../../.agents/docs/attribute-vs-state-styling.md) avoids, and a framework or a test that reads `aria-label` back finds none.
- (c) The component copies it, as `useARIA` does. The slider is named, and the host is a second named node in all three engines. This is `RF-94`'s `FV-F2`, repeated.

**Why (a).** M3 gives a slider a visible label, and both consumers have one. `RF-94`'s unit has to choose between (b) and (c) for the whole package, and (a) leaves that choice open: adding a source of the name later breaks no one. **If the owner wants the slider safe against the trap now, (b) is the one that keeps one node.** The slider then sets the package's precedent.

## Proposed record entries

For the main slot's architect to mint. Nothing in the index is edited here.

- **A decision entry for `SL-D1` to `SL-D9`,** pointing here, with the owner's answers to Q1 and Q2. Q1 (a) also makes the slider the second exception in `architecture.md` §Components.
- **For `RF-94`:** a dated note that `ariaLabelledByElements` carries a light-DOM label to a shadow control in all three engines, that the host's role `none` hides the host node for a wrapping label, that Firefox keeps it for `for`, and that nothing but removing the attribute hides it for `aria-label` ([readings](checks/naming.txt)).
- **`SL-F1`, proposed, by reading only:** core's `formDisabled` passes no argument, and `useDisableable` reads only the host's attribute. So `mx-checkbox`, `mx-radio` and the other form controls in a `<fieldset disabled>` match `:disabled`, while their native control doesn't, because it isn't in the fieldset's tree. It may stay reachable and operable by keyboard. Not run.
- **`SL-F2`, proposed, by reading only:** core's `formStateRestore` passes neither the state nor the reason, so no form control can restore its value after a navigation or from autofill. The slider has the same limit.