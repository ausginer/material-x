# `mx-slider` (RD-55, #173) — feature proof

**Files were read at:** `85d11833c`, the head of #220 (`material-x/slider-1`), in slot `c`. The base is `origin/main` at `a4dee53d8`. Every run used a scratch copy of that tree with `@ydinjs/core` and `@ydinjs/material-x` rebuilt in it. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2, headless, on Linux.

**Subject:** the [plan](../../slider-1/slider-plan.md) (`SL-D1` to `SL-D9`, the tests it owes, the answered questions), `repo:RD-55` with its dated note in [`00-index.md`](../../00-index.md), the [report](../../slider-1/slider-report.md), and the diff `a4dee53d8...85d11833c`.

**Verdict: the element does what the plan says in the three engines, with three behaviors to settle, all tier A.** A press that becomes a scroll restores the number but not what the slider owned before it (`reviewer-1`). The shown value indicator gives a page scrollable overflow (`reviewer-2`). A negative value is drawn as `18-` in RTL (`reviewer-3`). The first is the one I would settle before the merge, because it loses a value that a script wrote. One row can't fail (`reviewer-5`, tier B). Nothing found changes the architecture or the public surface.

## Scope

**Covered:**

- **The slider's rows,** rerun: 288 pass in Chromium; 259 pass and 29 skip in each of Firefox and WebKit. `package-entries`, `traits-baseline`, typecheck and publint pass. CI on `85d11833c`: every job passes except `chromium`, whose only ten failures are the slider's visual rows, with no reference screenshot, and the `verify` job that collects it.
- **Value and bounds** ([`value.txt`](checks/value.txt)): 12,000 comparisons per engine with a fresh native range, after random sequences of `value`, `min`, `max`, `step`, the `value` attribute and properties, with absent, zero, negative and crossing values. No difference in the value or in the drawn handle.
- **Forms** (same file): `disabled` before connection, by property, on a clone, in, out of and back into a fieldset, in its first `<legend>` and nested; the form value after a bound, a rename, a removal and a `form` attribute; reset with changed bounds; `invalid`, `:invalid` and `willValidate`. All as `SL-D5` says. The shared `validatable.browser.test.ts`, with `mx-slider` added to its cases in the scratch copy, passes: 132 rows in Chromium, 123 and 9 skipped in the other two.
- **Pointer and capture** ([`pointer.txt`](checks/pointer.txt)): six gestures against a native range with the same thumb (away and back, far below, the right button, Escape, arrows after a press, the wheel) give the same events in each engine. During a drag the slider is disabled, put in a disabled fieldset, removed, moved, hidden, or given new bounds: it ends in a consistent state and nothing stays held. The documented loss of `change` in WebKit is confirmed for a drag. A key still fires it there.
- **Touch, Chromium only** ([`touch.txt`](checks/touch.txt)): a vertical pan, a pan on a page that can't scroll, horizontal, diagonal and turning drags, two fingers, a pan on the label and on a disabled slider, a drag in a horizontal scroller, and blur and a tap after a cancelled press. The value, the form value, `:active` and the indicator end as the plan says. `reviewer-1` is the exception.
- **Names:** [`built.ts`](../../slider-1/probes/built.ts) rerun in the three engines gives the committed readings byte for byte. [`names.txt`](checks/names.txt) adds 20 cases: two ids, a hidden reference, a missing id, two labels, element references set as properties, another shadow root, a move, text changed later. All name the control as `SL-D4` says, except `reviewer-4`.
- **Anatomy** ([`draw.txt`](checks/draw.txt)): the boxes of the track, the input, `.stop` and the handle in the five sizes at 0, 1, 40, 98 and 100, in both directions, are the same in the three engines and equal the store's values. Under three page resets (`box-sizing`, Tailwind's preflight, a harsh `*` rule) and under inherited text properties, no box and no pixel differs. Forced colors take the plan's system colors in Chromium, light and dark, and in Firefox.
- **Tokens:** I read the six sets from the store by themselves (`probes/tokens.ts`) and compared each with the published CSS. Every value agrees and no deprecated token is read. The private names are 43, each with the prefix, and the script writes `--mx-ds`, as the note says.
- **Public surface:** `files.json`, `exports`, `files`, `react.ts`, the `.d.ts` and the CEM entry list the same attributes, slot, part, four properties and three events as the element, its JSDoc and `slider.mdx`. The sizes are 3602 and 24505, as #220 now says.
- **Discrimination:** 26 mutations, in the three engines, none from the report ([`mutations.txt`](checks/mutations.txt)).

**Not covered:** Safari; a physical touch screen, iOS and Android; assistive technology; the visual project and its baselines; the cost of a move, which I didn't measure again; forced colors in WebKit, which doesn't emulate them; `RF-94` and `RF-119` to `RF-121`, accepted.

## Findings

### reviewer-1

**Tier A.** A press that becomes a scroll leaves the slider changed: it takes the value's ownership, and it overwrites a value that a script set during the press.

- **Contract:** `SL-D3`: such a press "restores the value". `SL-D2`: the `value` attribute is followed "until the user moves the slider or a script sets `value`"; the component keeps "the number last asked for"; the consumer may set `value` "in the middle of a drag".
- **Observed,** in Chromium by emulated touch, each beside a control without the press ([`touch.txt`](checks/touch.txt)):

  | Case | After a scroll that starts on the slider | Control |
  | --- | --- | --- |
  | `value="30"`, then the attribute is set to 60 | 30 | 60 |
  | No `value`, then `max = 300` | 50 | 150 |
  | `value = 200`, then `max = 300` | 100 | 200 |
  | A script sets `value = 90` during the press | 30, with an `input` | not applicable |

- **Why it is a problem:** the user changed nothing, and the number looks restored. But the slider no longer follows its attribute or its midpoint until a form reset, and the number asked for is replaced by the clamped one. In the last case the consumer's value is lost. The `input` events of the press also make the slider the user's, so a page that updates the attribute after one scroll across the slider sees no change.
- **Not established:** iOS, Android, and Firefox's own restoration, which is also an `input`.
- **Required property:** after a press that the browser turns into a scroll, the slider is as if the press hadn't been: it follows what it followed, and it keeps the number that was asked for. The plan has to say what happens to a value that a script set during the press, because `SL-D2` and `SL-D3` give different answers.
- **Route:** the architect, for that last case and to confirm the first three; then the implementer.

### reviewer-2

**Tier A.** While the value indicator is shown at the inline end, it adds scrollable overflow, also to the page.

- **Contract:** row 13 of the plan: "No scrollable overflow at either end, in both directions".
- **Observed,** in the three engines ([`pointer.txt`](checks/pointer.txt), [`over.txt`](checks/over.txt)): a container with `overflow: auto` gains 19 px in Chromium and 21 px in the other two, for `100`, held or with keyboard focus, and 34 and 39 px for `1000000`. A slider as wide as the page gives the page a horizontal overflow of the same size. With a page gutter of 16 px it is 11 to 14 px for `10000`, and 44 to 47 px with the `valuetext` "A long value text". It can be scrolled, and with keyboard focus it stays as long as the focus does. In an RTL container it is the same at the left edge, for `100`, and an RTL slider in an LTR page gives the page 12 px at `0`. At the inline start there is none.
- **Why the rows pass:** they read `scrollWidth` at rest, where the indicator has no box.
- **Why it is a problem:** a page gains a horizontal scroll while the user holds the handle at the maximum, where the indicator is most useful. The report discloses that it "extends beyond the slider". The plan neither accepts it nor excludes it from row 13.
- **Required property:** either the shown indicator adds no scrollable overflow, or the plan and the documentation accept it and row 13 says that it reads the resting state.
- **Route:** the architect.

### reviewer-3

**Tier A.** In RTL the value indicator draws a negative number as `18-`.

- **Contract:** `SL-D2`: the indicator shows the number or `valuetext`, "such as `−18°`". `SL-D6`: it shows the value. The box-quad demo's ranges are signed.
- **Observed,** in the three engines, with `dir="rtl"`, `min="-55" max="55" value="-18" indicator`: the text is drawn `18-` ([Chromium](checks/rtl-signed-chromium.png)), and with `valuetext="-18°"` it is `18°-` ([WebKit](checks/rtl-signed-unit-webkit.png)). The DOM holds `-18`. The generated text is laid out in the RTL paragraph, where a leading hyphen-minus takes the paragraph's direction.
- **Why it is a problem:** the component's own default text is misdrawn, for the signed range that is the plan's first consumer. A consumer can work around it only with a `valuetext` that carries a direction mark. No row reads the indicator of a negative value in RTL.
- **Limit:** whether `U+2212` in a consumer's `valuetext` is drawn differently wasn't read. I don't read Arabic or Hebrew typography as settled by this: which side a locale puts the sign on is the owner's or the architect's call.
- **Required property:** the component's own number is drawn with its sign where the plan says it belongs, in both directions, and a row reads it. Whether `valuetext` is isolated too is the plan's.
- **Route:** the architect.

### reviewer-4

**Tier A,** small. An empty `aria-label` on the host hides a `<label>`.

- **Contract:** `SL-D4`: the order is "a native input's for `aria-label` over `<label>`".
- **Observed,** in the three engines ([`names.txt`](checks/names.txt)): `<label for=s>L</label><mx-slider id=s aria-label="">` is unnamed, and so is `aria-label=" "`. A native range with `aria-label=""` is named `L`. A missing `aria-labelledby` id does fall through to the `<label>`.
- **Why it is a problem:** a template that writes an empty `aria-label` gives a slider with no name, beside a label that names it on every native input.
- **Required property:** an `aria-label` that names nothing isn't a source.
- **Route:** the implementer.

### reviewer-5

**Tier B.** The row "should not expose the value indicator" can't fail.

- **Observed:** with `aria-hidden` removed from `.handle`, Chromium exposes `StaticText "Shown"` ([`exposed.txt`](checks/exposed.txt)), and the row still passes. `readAccessibilityTree` leaves out `StaticText` and `InlineTextBox` nodes, which are the only nodes that the generated text gives.
- **Why it is a problem:** the property that the row names has no witness. The element itself is right: with `aria-hidden` nothing is exposed.
- **Required property:** removing `aria-hidden` from the handle makes a row fail.
- **Route:** the implementer.

### reviewer-6

**Tier C.** Properties that the plan states and that no row reads. Each was found by a mutation that no row catches in any engine.

- **`touch-action: pan-y` (`SL-D3`).** Without it all 288 rows pass. The computed value becomes `auto` and Chromium's native range still doesn't pan, so emulated touch can't tell. `touch-action: none` is caught, in Chromium. It is the property that the phone check depends on.
- **"if it differs" (`SL-D3`).** With the restoration dispatched without a difference, no row fails: no touch row presses the handle's place.
- **The equal bounds' guard.** The row "should draw the handle at 0 when the bounds are equal" passes without the guard, because an invalid fraction also puts the handle at the start.
- **The input's `opacity: 0`,** in the three engines. The baselines will cover Chromium.
- **The value indicator's `z-index` and its fade in** (`@starting-style`).
- **Forced colors** are read by a visual row only, in Chromium, as the plan has it. Firefox has none.
- **Not gaps:** `null` written as the text `null` gives the midpoint by itself, and an empty reference list names nothing. A size package that reads another size's set passes because the spec layer takes its expectations from the package, as for every component. The baselines will cover it.
- **Required property:** the first two have a row, or the plan says that they don't. The others are the consolidator's to weigh.
- **Route:** the implementer.

### reviewer-7

**Tier C.** #220's description says less than the record about a press in Firefox.

- **It says:** _"In Firefox a press on the handle off its centre can change the value by a step"_.
- **The record says** (`RD-55`'s note, `SL-D1`): with narrow steps the change is many steps, up to 15 of 1000, and a press on the centre itself changes it.
- **Required property:** the description agrees with the note.
- **Route:** the coordinator.

## Observations, no finding

- **Bounds that HTML doesn't accept as numbers,** such as `min="+5"`, `" 5 "`, `"5."` or `"0x10"`: the property and the drawing take the number, the native range ignores it, and the handle is drawn away from the thumb ([`value.txt`](checks/value.txt)). `step` is normalized and `min` and `max` aren't. Invalid markup, outside the contract.
- **A mirrored `aria-*` that is removed while the element is out of the document stays on the control,** as on `mx-text-field` (both read). The cause is `useARIA`, which on connection reads only the attributes that are present. Pre-existing and core's. I found no entry for it.
- **A press held on the slotted label** holds the handle too, 2 px wide with the indicator, in the three engines, because the platform makes a pressed label's control `:active`. `SL-D6` says `:active`, so it holds.
- **Enter in a slider doesn't submit its form.** A native range does in Chromium and WebKit, and not in Firefox. `mx-text-field` doesn't either, and no contract asks for it.
- **The value indicator inherits `font-style`, `text-indent`, `text-transform`, `white-space` and `word-spacing`** from the page. No component here resets them.

## Next

The architect answers `reviewer-1` to `reviewer-3`. Then the implementer takes `reviewer-1`, `reviewer-4`, `reviewer-5` and what is accepted of `reviewer-6`. `reviewer-7` is the coordinator's. The owner's steps, the baselines and the phones, are unchanged. Recording the baselines before `reviewer-2` and `reviewer-3` are answered may mean recording the held row again.

The probes are in [`probes/`](probes/).