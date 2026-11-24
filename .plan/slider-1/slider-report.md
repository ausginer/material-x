# `mx-slider` — implementation report

**Written by the implementer on 2026-11-23,** on the coordinator's task for #173, on `material-x/slider-1` from `bcb3e7aaa`. It implements the [plan](slider-plan.md) and `repo:RD-55`. No property of the plan failed in an engine.

## Outcome

- **Source:** `packages/material-x/src/slider/`, with the element, the template, the default and size token packages and the styles. `files.json`, `package.json` (`files` by hand, `exports` by the build) and `react.ts` have the entry.
- **Docs of the component:** JSDoc, `slider.stories.tsx` and `slider.mdx`.
- **Tests:** `tests/slider/`. `SliderLike` joins the `traits-baseline` list, so each element of the snapshot gains one line. The text field spec's `srgb()` moved to `tests/browser.ts`, its second user being here. `readAccessibilityTree` also gives `ignored`, `description` and `value`, and there are two new commands, `touchDrag` and `emulateForcedColors`.

## What the plan doesn't state

- **All private custom properties are on `.track`,** tokens included, so the slotted label inherits none. A row checks it.
- **The value indicator has no box while it isn't shown** (`display` with `allow-discrete` beside the opacity). An invisible box would add scrollable overflow at an end. While it is shown at an end, it extends beyond the slider.
- **`.handle` is `aria-hidden`,** so the indicator's generated text isn't exposed.
- **`value` accepts `null`,** which gives the midpoint. `min`, `max` and `step` read `null` when absent, as the other attributes do.
- **`error` also sets `:state(error)`,** as on the other controls.
- **`useNameable` isn't called:** the host's `name` submits, and the inner input isn't in the form's tree.
- **Forced colors:** active track `Highlight`, inactive track and handle `CanvasText`, all `GrayText` when disabled. They win over the public color properties.
- **The label** has no typography of its own and inherits the page's.

## For the architect

Three differences were reported at `ed272a010`: the cost of a move, the off-centre press in Firefox, and the width. The plan's amendment at `8d77d1d00` answers them, and [the next section](#the-amendment) is its implementation. None is open.

## The amendment

Implemented on 2026-11-24, on `8d77d1d00` merged with `origin/main` at `3aef04f7e`. The sections below it are of `ed272a010` unless they say otherwise.

- **`.stop` is an element** before `.handle`, as `SL-D6` says. `.track::before` is the inactive track and `::after` the active one. The disabled opacities are `opacity` on the parts. Both `color-mix()`es, the gradient and the paddings are gone, and `stop-indicator.shape` is read: `full` is half the indicator's size.
- **The drawing is the same:** the five sizes, disabled and RTL at four values, in the three engines, and in forced colors in Chromium and Firefox. Between 160 and 500 pixels differ over 28 sliders at device scale 4, and 2706 to 2982 with the stop indicator hidden ([readings](checks/stop-indicator-built.txt)). The remaining difference wasn't located by pixel. The plan reads it as the gradient's soft edge.
- **Rows:** the stop indicator's box in both directions at 25, 97, 98 and 100, its corner, its color and opacity in each state, and that it paints above the inactive track, read by the order of hits. Row 4 has the presses 1.5 px off the handle's centre and on the stop indicator.
- **Firefox rounds the pointer down to a whole pixel.** At 1.5 px past the centre that gives no change by itself, so the row puts its slider 0.15 px in, and the pointer is on a whole pixel. Then Firefox gives 39 and 41 from 40. The plan's row holds.
- **Width:** the sentence is in the JSDoc and in `slider.mdx`.
- **Witnesses:** [thirteen mutations](checks/witnesses.txt), three of them for row 4. Each makes its rows fail in the three engines, except the 1 px thumb. It makes the off-centre row fail in Chromium and WebKit only, because Firefox's answer doesn't depend on the thumb. There the prevented press does.
- **Cost of a move,** in µs per change, the median with the minimum in parentheses, with two adjacent runs of each build ([readings](checks/built-move-cost.txt)). The load average was 3.4 to 6.1, so the Chromium medians differ by more between two runs of one build than between the builds, and the minima compare better:

  | Engine   | Row         | Before               | After                |
  | -------- | ----------- | -------------------- | -------------------- |
  | Chromium | plain       | 101 (55), 66 (54)    | 55 (47), 141 (62)    |
  | Chromium | `indicator` | 96 (77), 83 (74)     | 72 (63), 124 (87)    |
  | Firefox  | plain       | 276 (198), 278 (220) | 208 (158), 260 (158) |
  | Firefox  | `indicator` | 324 (266), 346 (260) | 274 (184), 340 (226) |
  | WebKit   | plain       | 600 (400), 498 (372) | 470 (328), 426 (340) |
  | WebKit   | `indicator` | 624 (464), 532 (412) | 494 (354), 466 (378) |

  Firefox's minimum for the plain slider falls by 40 and 62 µs, which agrees with the plan's 42. In Chromium no difference is established. In WebKit each of the two readings is lower, and the load fell during them, so this isn't established either. `built-move-cost.ts` doesn't hold the handle, so the indicator isn't shown.

- **Size (Brotli):** `slider/slider` 3642 to 3575 and `complete` 24463 to 24425. The other rows move by 20 bytes or less, without a change of their source.
- **Tests,** whole material-x, one engine at a time, without the visual project: Chromium 1309 passed and 2 expected fail; Firefox 1269 passed, 3 expected fail, 39 skipped; WebKit 1270 passed, 2 expected fail, 39 skipped. Format, lint, typecheck and publint pass.
- **Docs:** `docs-build` passes, and `docs-smoke` with 120 of 120 pages.
- **Not run:** as below. The phone check is after the merge, by the owner's ruling.

## The feature proof's dispositions

Implemented on 2026-11-24, on `5f191a509`: the plan's work list with `SL-D2`, `SL-D3` and `SL-D6` as amended, and `repo:RD-55` clause 4. The sections below it are of `ed272a010`.

- **A finger's press is held** until it isn't a scroll, in `slider.ts` only. Core's `useARIA` isn't touched. The [built element's readings](checks/held-press-built.txt) in Chromium and [in Firefox](checks/held-press-firefox-built.txt) are the events and values of the plan's variant that holds the press.
- **The indicator** is an element as wide as the track, with two pseudo-elements beside its text.
- **The name:** an `aria-label` that is empty or white space isn't a source.
- **Rows:** 1, 8, 10, 12 and 13 of the plan, the spec layer's indicator, and the transparent input. `touch` replaces the command `touchDrag`, and `readAccessibilityTree` can give text nodes.
- **Additions the plan doesn't state,** each with a row: a held press is dropped when the slider is disabled; a key ends a cancelled press; a second finger doesn't take over a held press; and in Firefox the restored number is also dropped when it is the number shown, because bounds written during the press can change it.
- **A page's capturing listener on an ancestor still sees the held native `input`,** with `value` as before the press. The component's listener stops the event at the input, after the ancestors' capture phase.
- **Witnesses:** [31 mutations](checks/witnesses-feature-proof.txt). Each makes its rows fail, in every engine it ran in. Those of touch and of the accessibility tree ran in Chromium. Without the drop of Firefox's restoring `input`, three cases of `held-press-firefox.ts` end at 30 and not at 90, 60 and 80.
- **Cost of a change,** in µs, minima of two runs of each build, before and after ([readings with medians](checks/indicator-built-cost.txt)). The load average was 8 to 18.

  | Engine   | Hidden before | Hidden after | Shown before | Shown after |
  | -------- | ------------- | ------------ | ------------ | ----------- |
  | Chromium | 75, 81        | 64, 62       | 89, 97       | 97, 100     |
  | Firefox  | 210, 180      | 198, 180     | 280, 243     | 330, 283    |
  | WebKit   | 410, 355      | 375, 360     | 503, 478     | 555, 500    |

  Shown costs 2 to 8 more in Chromium, 40 to 50 in Firefox and 23 to 53 in WebKit. The plan's bounds are 9, 45 and 155. Firefox's first run is over by 5, at the load of 15.

- **Size (Brotli):** `slider/slider` 3593 to 3888 and `complete` 24508 to 24718. No other row of the reading changes.
- **Tests,** whole material-x, one engine at a time, without the visual project: Chromium 1381 passed and 2 expected fail (with the node project); Firefox 1282 passed, 3 expected fail, 62 skipped; WebKit 1283 passed, 2 expected fail, 62 skipped. Format, lint, typecheck, publint, `docs-build` and `docs-smoke` (120 of 120) pass. The [accessibility readings](checks/built.txt) are unchanged.
- **Not run:** the visual project, Safari, physical touch, and assistive technology.

### For the architect

**WebKit drops `:active` from a range while the mouse is down.** In WebKit 27.2 a press on the track away from the thumb, held still, loses it after about 0.1 s, and the next move brings it back ([readings](checks/press-active.txt)). A press on the thumb, or moved at once, keeps it, and so does a button. It reproduces on a bare range, and Safari wasn't checked. So the 2 px handle and the indicator go away in that window, and `SL-D6`'s "the held state stays" doesn't hold there. It is as before this section. Row 12's fade passed without `@starting-style` for this reason, so it presses the handle now. The mechanism wasn't changed.

## The held state and the second finger

Implemented on 2026-11-24, on `943d3a912`: the plan's [rulings](slider-plan.md#the-implementation-reports-rulings) and the amended `SL-D3` and `SL-D6`.

- **Held is `:state(pressed)`** on the host, set at `pointerdown` and cleared at the `pointerup` or `pointercancel` of that pointer, on disabling and on a disconnection. The tokens' `pressed` block and the indicator's rule follow it. Their specificity is as with `:active`, so the disabled look still wins.
- **Another pointer** isn't followed while `pointer` is set, unless it is primary. The end of the press clears it.
- **The reading** of the built element: [`held-state-built.txt`](checks/held-state-built.txt), with the plan's required values for each row in the three engines. After `display: none` it stays held, as the plan's limit says.
- **Rows:** the plan's, and two more: a finger that isn't the first one down is followed after a tap and after a scroll. `pointerPress` and `pointerRelease` take a button, and `touch` takes a finger's id, because CDP's `touchEnd` lifts the points that it lists. Row 12's press is back on the track.
- **Witnesses:** [15 mutations](checks/witnesses-held-state.txt), each failing its rows in every engine it ran in. Those of touch ran in Chromium. With the indicator or the handle on `:active`, WebKit fails the still press and the drag outside, the three engines fail the label, and Chromium and Firefox fail the disabled slider. The right button fails in Firefox and WebKit, and in Chromium in one run of two: there the probe read `:active` as false before and true now. The cause wasn't sought.
- **Departure: in Chromium the second finger's lift commits the slide.** On a bare range the second finger's touch ends the native drag: no further `input` comes, and `change` fires when that finger lifts ([reading](checks/second-finger.txt), [script](probes/second-finger.mjs)). So after a second finger that touches and lifts, the first's later cancel has nothing to commit, where the plan has it commit. The value and the state don't change, and `change` fires once. A second row has the cancel while the second finger is down, where the cancel commits. The native `change` isn't stopped.
- **Cost of a change,** in µs, minima of two runs of each build, before and after ([medians](checks/held-state-cost.txt)), at a load of 4 to 5. No build or state is consistently cheaper, except that Firefox's shown is 13 and 38 more:

  | Engine   | Hidden before | Hidden after | Shown before | Shown after |
  | -------- | ------------- | ------------ | ------------ | ----------- |
  | Chromium | 48, 66        | 49, 63       | 67, 94       | 68, 106     |
  | Firefox  | 220, 178      | 203, 198     | 318, 283     | 330, 320    |
  | WebKit   | 358, 423      | 335, 403     | 510, 615     | 510, 570    |

  This probe shows the indicator by keyboard focus, so it doesn't set the state. A move doesn't write it.

- **Size (Brotli):** `slider/slider` 3888 to 3950 and `complete` 24718 to 24802. No other row moves.
- **Tests,** whole material-x, one engine at a time, without the visual project: Chromium 1391 passed and 2 expected fail (with the node project); Firefox 1288 passed, 3 expected fail, 66 skipped; WebKit 1289 passed, 2 expected fail, 66 skipped. The two last rows were added after it, and `tests/slider` then passed in the three engines. Format, lint, typecheck, publint, `docs-build` and `docs-smoke` (120 of 120) pass.
- **Not run:** the visual project, Safari, physical touch, and assistive technology.

## Verification

- **Tests,** whole material-x, one engine at a time, with no visual project: Chromium 1297 passed and 2 expected fail (with the node project); Firefox 1221 passed, 3 expected fail, 39 skipped; WebKit 1222 passed, 2 expected fail, 39 skipped. After it, only the stories' layout changed.
- **Witnesses:** [sixteen mutations](checks/witnesses.txt). Every one makes its rows fail in each engine it ran in. The plan's three (rows 2, 8 and 10) and the `aria-valuenow` one are among them.
- **Accessibility trees:** [`built.ts`](probes/built.ts) on the built element gives [readings](checks/built.txt) that match `SL-D4` in the three engines. Firefox's value and description are `nsIAccessible`'s.
- **Docs:** `docs-build` passes, and `docs-smoke` with 120 of 120 pages. Two stories were viewed, one in each of Chromium and WebKit, after the layout fix. Sizes, RTL, disabled, held and focused were viewed on a probe page, and forced colors in Chromium.
- **Format, lint, typecheck and publint** pass. Five `strict-void-return` errors in the new test file were corrected by hand after `lint-fix` left them.
- **Not run:** the visual project (`repo:RD-13`), Safari, physical touch, and assistive technology. The baselines don't exist, so the gate's `chromium` job fails until the owner records them.

## Size

Brotli bytes from `size-limit`, built at `bcb3e7aaa` and at the implementation. No limit applies. The other rows move by 58 bytes or less, and the cause of each wasn't sought.

| Row                     | Before | After | Change |
| ----------------------- | ------ | ----- | ------ |
| `slider/slider`         | —      | 3642  | new    |
| `complete`              | 22746  | 24463 | 1717   |
| `text-field/text-field` | 8417   | 8475  | 58     |

## Owed

- **The owner:** records the baselines, and tries the _Slider / Scrolling Page_ story on an iPhone and an Android phone after the merge, by his ruling that the coordinator relayed.
- **After the merge:** the plan's documentation unit.