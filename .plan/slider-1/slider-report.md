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