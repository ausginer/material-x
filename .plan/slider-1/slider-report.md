# `mx-slider` — implementation report

**Written by the implementer on 2026-11-23,** on the coordinator's task for #173, on `material-x/slider-1` from `bcb3e7aaa`. It implements the [plan](slider-plan.md) and `repo:RD-55`. No property of the plan failed in an engine.

## Outcome

- **Source:** `packages/material-x/src/slider/`, with the element, the template, the default and size token packages and the styles. `files.json`, `package.json` (`files` by hand, `exports` by the build) and `react.ts` have the entry.
- **Docs of the component:** JSDoc, `slider.stories.tsx` and `slider.mdx`.
- **Tests:** `tests/slider/`. `SliderLike` joins the `traits-baseline` list, so each element of the snapshot gains one line. The text field spec's `srgb()` moved to `tests/browser.ts`, its second user being here. `readAccessibilityTree` also gives `ignored`, `description` and `value`, and there are two new commands, `touchDrag` and `emulateForcedColors`.

## What the plan doesn't state

- **All private custom properties are on `.track`,** tokens included, so the slotted label inherits none. A row checks it.
- **The stop indicator is a gradient in the content box of the inactive track's `::after`.** The box's logical paddings place it, because no background position follows the direction. The gradient is a circle, so `stop-indicator.shape` isn't read.
- **The value indicator has no box while it isn't shown** (`display` with `allow-discrete` beside the opacity). An invisible box would add scrollable overflow at an end. While it is shown at an end, it extends beyond the slider.
- **`.handle` is `aria-hidden`,** so the indicator's generated text isn't exposed.
- **`value` accepts `null`,** which gives the midpoint. `min`, `max` and `step` read `null` when absent, as the other attributes do.
- **`error` also sets `:state(error)`,** as on the other controls.
- **`useNameable` isn't called:** the host's `name` submits, and the inner input isn't in the form's tree.
- **Forced colors:** active track `Highlight`, inactive track and handle `CanvasText`, all `GrayText` when disabled. They win over the public color properties.
- **The label** has no typography of its own and inherits the page's.

## For the architect

- **The cost of a move is above `SL-D8`'s on the built element** ([readings](checks/built-move-cost.txt)), on a loaded host, so only adjacent runs compare. Against the prototype's `all`, the built element without and with the indicator took 80 and 94 µs against 59 in Chromium, 352 and 490 against 168 in Firefox, and 428 and 464 against 484 in WebKit. The built reading includes dispatching the event, and `move-cost.ts` doesn't. Two ablations, tokens on the host and no gradient, gave no difference beyond the noise in Firefox and Chromium. The cause isn't established. A 60 Hz frame is 16 700 µs.
- **A press on the handle off its centre can change the value by a step in Firefox.** With a 196px travel, a press 1.6px from the centre gave 41 from 40 in Firefox, and no change in Chromium and WebKit. `SL-D1`'s reading pressed at the centre.
- **A slider in a shrink-wrapping container has no width of its own,** because the host is a block and its content is absolutely positioned. A flex row that doesn't stretch it collapses it to its label. The plan gives no minimum size, so none was added.

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

- **The owner:** tries the _Slider / Scrolling Page_ story on an iPhone and an Android phone before the merge, and records the baselines.
- **After the merge:** the plan's documentation unit.