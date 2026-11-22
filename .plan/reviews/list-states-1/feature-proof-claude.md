# Interactive list items show their selected, disabled and press styles — feature proof

**Files were read at:** `7271c5b9f`, the head of #151 (`material-x/rf71-list-states-1`), in slot `c`. The base is `main` at `f1387729d`, the head's parent. Each base reading replaced `packages/material-x/src/list` with its text at `f1387729d` in the same tree, and the head was restored afterwards. The three probes were copied into `packages/material-x/tests/list/` for their runs and removed after them. The last build in slot `c` is the head's. Browsers: Playwright 1.65.0's Chromium, Firefox and WebKit, with Node 26.13.1.

**Subject:** `repo:RF-71` in [`00-index.md`](../../00-index.md), its _Settled_ paragraph and the implementer's dated paragraph; the architect's [selection paths](../../observations-2/checks/selection-paths.txt) and [opacity tokens](../../observations-2/checks/list-item-opacity-tokens.txt) readings; the implementer's readings in [`list-states-1/checks/`](../../list-states-1/checks/); and the diff `f1387729d...7271c5b9f`. The coordinator asked me to check that the rows aren't circular, and that the `color-mix()` route gives the token's colour and opacity exactly. It also asked for focus, hover and dragged on selected items, #120's elevation rows, the record's correction about `useDisableableLinkable`, and the size claim, including the rows that import no list stylesheet.

**Verdict: the Settled paragraph is implemented as written, and every figure in the record reproduces.** I have three findings. `reviewer-1` is tier A and introduced by this change: a press on a disabled item now clicks the element beneath it. `reviewer-2` is tier B: the opacity rows take one token as their oracle for every slot. `reviewer-3` is tier C, about the record's wording. `reviewer-1` turns on how far the Settled pointer property reaches, so it goes to the architect.

## Scope

**Covered.**

- **The witness** ([`rows.txt`](checks/rows.txt)). At the head, the new spec file and `list-item.browser.test.ts` pass 129 of 129 in the three engines. On the base sheets, 72 fail and 57 pass. The 72 are the 24 rows the record names, in each engine. The 57 are the two control rows per item and the 15 rows of `list-item.browser.test.ts` per engine, the four new pointer rows included. This is the implementer's result.
- **The whole material-x browser and spec projects at the head,** three engines: 1840 passed, 1 expected fail, 4 skipped ([`rows.txt`](checks/rows.txt)). The figure is the record's, and it includes #120's elevation rows in `tests/core/elevation.spec.browser.test.ts`. CI on #151 at `7271c5b9f` passes every job, `chromium`, `firefox`, `webkit`, `static`, `docs`, `measurements` and `verify` included.
- **The rows aren't circular.** Each oracle comes from `resolveTokenContract`, which reads `effective(state)` of `list-item.default`, the `listItemTokens` package. Each observation is a computed style of the rendered element: `.host`'s `background-color`, `opacity` and `transition-*`, a slot's `color` and `opacity`, or a slotted `mx-icon`'s `color`. No row reads a generated custom property. For these paths `effective()` holds only the path's own tokens, with nothing inherited: `selected.hovered` has no `container.color` ([`effective-states.txt`](checks/effective-states.txt), [probe](probes/effective-states.ts)). So each row reads only a token that its own state sets, and that is the token the row should compare against.
- **The `color-mix()` route is exact.** A selected, disabled item's container serializes as `color(srgb 0.0980392 0.113725 0.0745098 / 0.38)` in two engines and `color(srgb 0.098039 0.113725 0.07451 / 0.38)` in the third. The token is `on-surface`, `rgb(25, 29, 19)`, at 0.38. Each channel, scaled to 0–255, is within 1.3·10⁻⁴ of the token's value, which is the serialization's precision, and the alpha is 0.38 exactly. An unselected item serializes `surface` as `color(srgb 0.968627 0.984314 0.917647)`, 247, 251 and 234 exactly ([`probe.txt`](checks/probe.txt), `raw` lines). The rows round to 8-bit channels and a two-digit alpha, so they can't resolve finer than that. The raw readings above can, and show no approximation.
- **Selected and unselected items while hovered, focused, dragged and pressed,** both items, three engines, read by the [probe](probes/rf71-review-probe.spec.browser.test.ts.txt). The oracle is the four token layers merged in the Settled paragraph's cascade order: main `default`, main state, the selection's `default`, the selection's state. The probe reads the container colour, the container shape, the label, overline and supporting-text colours, both icon colours and `--_level`. At the head all 16 combinations agree in each engine. On the base sheets, every selected combination shows the unselected colours, and every unselected one shows `on-surface-variant` for the trailing icon where `unselected.default` gives `on-surface`. So the probe discriminates. Hover was a real pointer, pressed a real press and focused `focus()`. Dragged was `toggleState(internals(item), 'drag', true)`, not a lift. A real lift is covered by #120's dragged-level elevation rows, which pass.
- **The cascade claim,** that the selection sheet's order changes no value today. It is consistent with the 16 combinations above and with the disabled rows. I didn't enumerate the custom properties.
- **The ripple row can fail.** A press on an enabled item leaves two animations in its shadow root, and a press on a disabled item leaves none, at the head and at the base ([`probe.txt`](checks/probe.txt), `ripple` lines).
- **The record's correction about `useDisableableLinkable` holds.** By reading: `packages/core/src/traits/linkable.ts` adds a `click` listener on the internal anchor, through `useEvents(host, …, target)`. While the host has `disabled`, the listener calls `preventDefault()` and `stopPropagation()`, and the anchor has no `href`. So on `main` the link item's click stops at the anchor. The button item's click doesn't happen for another reason: its native button is disabled. The base click-through reading agrees: an ancestor sees `mousedown` and no `click` for the link item ([`clickthrough.txt`](checks/clickthrough.txt)). The correction is in the implementer's dated paragraph, and the Settled paragraph isn't edited.
- **A disabled item in `mx-sortable-list`** doesn't lift and isn't reordered by a pointer drag, with or without a handle, at the head and at the base. At the head the press hits `mx-sortable-list`, and at the base it hits the item. The probe's keyboard leg reorders nothing in either tree, but it had no enabled control, so it only shows that the two trees agree.
- **The disabled hover layer.** The ripple's `::before` is the item's hover layer, and `:host([disabled]) .ripple { display: none }` hides it in both trees. The Settled _no state layer_ holds independently of `pointer-events`.
- **Sizes** ([`names-and-sizes.txt`](checks/names-and-sizes.txt)). `just size-reading` at the base and at the head reproduces both committed readings in all 33 rows, and a second head reading is byte-identical. **The rows that import no list stylesheet move by renaming only.** `collect-props.ts`'s map at the head renames 8 of 227 names, all of them 2 letters long. The 8 short names `--cr` … `--cy` are permuted, and the set of names is unchanged. After mapping the head's short names back to the base's, every built material-x `.js` file equals the base build, except `list/styles/item/interactive-box.css.js` and `list/styles/item/main.css.js`, the two sheets whose text this change alters ([`remap.ts`](probes/remap.ts)). So the button, button-group, FAB and text-field deltas come only from Brotli compressing different letters. Why the names move is `reviewer-3`.
- **The renderer.** `createListItemDeclarationRenderer` gives one selector per block, and the base gave none for a state without a `STATE_MAP` entry. `groupListItemTokens` yields only `LIST_ITEM_STATES`, each of which has an entry or is `default`, so the difference is unreachable. `mx-list-item` sets no `selected` state, so the main sheet's `focused` block losing `:host(:state(selected))` changes nothing it shows.

**Not covered.**

- Real Safari: the `*/safari` projects need macOS.
- The visual project, which runs only in CI. No list baseline exists.
- The implementer's `pointer-events` mutation, which I didn't re-run. `reviewer-1`'s reading is consistent with it.
- Forced colours, right-to-left, and a consumer's `--md-list-item-container-color`. The last one now also goes through `--_container-opacity`, which only `selected.disabled` sets.
- Typecheck and lint, which CI's `static` job passes.

## Findings

### reviewer-1

**Tier A, introduced by this change.** A pointer press on a disabled interactive item dispatches `mousedown` and `click` on the element beneath it, and they bubble to the item's ancestors.

- **Current behaviour.** Each item is disabled, alone in an `mx-list` inside a wrapper `<div>`. After a press and release at the item's centre, the wrapper receives `pointerdown`, `mousedown` and `click`, each targeted at `mx-list`, for both items in Chromium, Firefox and WebKit. `document.elementFromPoint()` there returns `mx-list` ([`clickthrough.txt`](checks/clickthrough.txt), [probe](probes/clickthrough.browser.test.ts.txt)).
- **Before the change,** the same press reached the wrapper only as `pointerdown` on `mx-list-button-item`, and as `pointerdown` and `mousedown` on `mx-list-link-item`, with no `click`, in each engine. A disabled native `<button>` in the same place gives the wrapper `pointerdown` alone.
- **Cause.** `:host(:state(disabled)) { pointer-events: none; }` takes the host and, by inheritance, its whole flat tree out of hit-testing, so the press targets whatever is under the item. The record chose the host over `.host` so that the item itself gets no click, and the [mutation](../../list-states-1/checks/mutation-pointer-events.txt) shows that `.host` alone doesn't achieve it.
- **Why the rows don't see it.** _"should dispatch no click from a pointer press"_ listens on the item. The click no longer targets the item, so the row passes.
- **Why it is a problem.** A consumer that handles clicks on an ancestor now acts on a press of a disabled item. Examples are a delegated listener on the list, a clickable card or row around the list, or an outside-click check that reads the target. The Settled property says the item dispatches no `click` _"as a disabled native button doesn't"_. Beside a disabled native button, no ancestor receives `click` or `mousedown`, and on `main` no ancestor received a `click` from either item.
- **Required property.** A pointer press on a disabled interactive item dispatches no `click` to the item or to any of its ancestors, as with a disabled native button, in each engine at `RD-20`'s floor, and a row observes it at an ancestor.
- **Routing.** To the architect. The Settled paragraph states the property for the item and leaves the rule's placement to the implementer. Whether it covers ancestors, and whether `mousedown` belongs with `click`, is a contract call. It needs answering before #151 merges, or it is registered as a known regression.

### reviewer-2

**Tier B.** The disabled-opacity rows take one token, `list-item.disabled.label-text.opacity`, as the oracle for every slot and for the selected state, so they can't detect a slot whose own token differs.

- **Current behaviour.** Each of the five _"should render the … content at the disabled opacity"_ rows, and the selected, disabled label row, compares the slot's computed `opacity` with `disabled`'s `opacity` in `list-item.default`. `tokens.ts` appends that token to `disabled` from `md.comp.list.list-item.disabled.label-text.opacity`. The slots' own tokens are `disabled.leading-icon.opacity`, `.overline.opacity`, `.supporting-text.opacity` and `.trailing-icon.opacity`, and `selected.disabled.*.opacity` for the selected state. `listItemAllowedTokensSelector` admits none of them, so the contract can't resolve them. `effective('selected.disabled')` has no `opacity` ([`effective-states.txt`](checks/effective-states.txt)).
- **Why it holds today.** Every one of those tokens is 0.38, as the architect's [reading](../../observations-2/checks/list-item-opacity-tokens.txt) at `cbb06d265` shows, and the Settled paragraph relies on that equality for the single `opacity: var(--_opacity)`.
- **Why it is a problem.** Nothing re-reads the equality. A token-store update that changed one slot's opacity token would leave the rendered sheet unchanged, because the token isn't selected, and leave all six rows green, while the item departs from that token. The rows are the instrument for `RF-71`'s disabled-content property, so the instrument is unsound for that change.
- **Coverage, noted here.** The Settled row list asks that a selected, disabled item's _content_ show 0.38. The rows read the label slot only. The other four slots take the same `slot` rule, so this is a narrower witness and not a gap in the rule.
- **Required property.** Each disabled-content row compares with the token that governs its slot and selection state, or a row fails when those tokens stop being equal to the one the sheet renders.
- **Routing.** To the architect: which tokens `list-item.default` carries is the package's token selection, and the Settled paragraph rests on the equality.

### reviewer-3

**Tier C.** The record's explanation of the non-list size deltas names the deletion of `interactive.css.ts` as part of the cause, and the deletion has no effect on the names.

- **Current text.** _"The glob read `interactive.css.ts` although no module imported it. That file is deleted, and its properties are now first mentioned by `interactive-box.css.ts`, so the order and the short names change."_
- **Observed.** With `interactive.css.ts` and `interactive.styles.css` restored at the head, unimported, `collect-props.ts`'s map is identical to the head's ([`names-and-sizes.txt`](checks/names-and-sizes.txt), [`name-map.ts`](probes/name-map.ts)). In the glob's order, `interactive-box.css.ts` is the fourth file and `interactive.css.ts` the fifth. The head prepends the selection blocks to `interactive-box.css.ts`, so `--_container-expressive-shape`, `--_overline-color` and `--_trailing-supporting-text-color` are now mentioned before `--_elevation-penumbra`, `--_top-space`, `--_bottom-space`, `--_leading-space` and `--_trailing-space`. These 8 names swap their short names among `--cr` … `--cy`.
- **Why it matters.** Only to a reader of the record. The second half of the sentence is the mechanism, and the record's _"which name moves each row isn't read"_ is now answered: the non-list rows change only by these 8 names (_Sizes_, under _Scope_).
- **Required property.** The record attributes the size movement to the cause that the readings establish.
- **Routing.** To the implementer, as a record correction on #151's branch.

## Recheck of the repairs, 2026-11-22

**Files were read at:** `54168b0b1`, the implementer's repair commit, on the architect's ruling `f2c5da332`, in slot `c`. The subject is the ruling paragraph in `RF-71` (_"Ruled 2026-11-22 by the architect"_) and the implementer's dated paragraph after it. This is a targeted recheck of the three findings above, not a second proof. Each probe was copied into `packages/material-x/tests/list/` for its run and removed after it. The comparison readings replaced `packages/material-x/src/list` with its text at `7271c5b9f` or `f1387729d`, and the head was restored afterwards. Readings: [`recheck.txt`](checks/recheck.txt).

**Verdict: the three repairs meet the ruling, and every claim in the implementer's paragraph reproduces.** I have two new findings, `recheck-1` and `recheck-2`, both tier A and both **pre-existing**: `main` reads the same. Neither is introduced by #151, and neither blocks it.

### What was rechecked

- **`reviewer-1`, repaired.**
  - **The deletion.** Between `7271c5b9f` and the head, `src/` changes only by the deletion of `:host(:state(disabled)) { pointer-events: none; }` and its comment. Nothing replaces them. The remaining `pointer-events: none` rules in the list, ripple and elevation sheets sit on `mx-list-item`'s static box, the ripple and the elevation layers, never on an interactive item's host.
  - **The new rows.** _"should dispatch no click to an ancestor of the list"_ and _"should target the item with the press"_ pass for both items in the three engines. With `7271c5b9f`'s `interactive-box.styles.css` restored, exactly those two rows fail for both items in each engine, 12 in all, and the file's other 45 pass. This is the implementer's witness.
  - **The property, read at the wrapper of an `mx-list`,** in both listener phases ([probe](probes/recheck-boundary.browser.test.ts.txt)):
    - no bubbling `click` reaches the wrapper from either item, selected or not, in the three engines;
    - `pointerdown` targets the item;
    - the head reads the same as `main` for every event, and `7271c5b9f` sent every event to `mx-list`.
  - **The out-of-scope cases are as ruled.** The link item's `mousedown` reaches the wrapper in both phases, with the item as its target, and its `click` reaches a capture-phase listener with the item as its target. The button item gives the wrapper only `pointerdown`.
  - **Hover and press, without the rule.** The host now matches `:hover` and `:active` again. A disabled item's shape, container colour, label colour, leading icon colour and label opacity don't change while hovered or pressed, selected or not, in each engine. For a selected item, `selected.disabled` comes after `selected.hovered` and `selected.pressed` in the same sheet, at the same specificity, and sets every property they set.
- **`reviewer-2`, repaired.**
  - **The `node` row** reads the eleven tokens the ruling names from tproc's store and compares each with `disabled.label-text.opacity`. It passes all eleven.
  - **My own witness** ([probe](probes/recheck-opacity.node.test.ts.txt)): the row's file, with `disabled.state-layer.opacity` (0.1) and a token that doesn't exist added to the list, fails exactly those two cases, _"expected { opacity: 0.1 } to deeply equal { opacity: 0.38 }"_ and _"expected undefined …"_. The other eleven pass. So the row fails for a differing value and for a missing token.
  - **The selected, disabled opacity row** runs for each slot of `CONTENT_SLOTS`. The spec file goes from 28 to 36 rows per engine.
- **`reviewer-3`, corrected.** The _Size_ bullet now gives the cause [`names-and-sizes.txt`](checks/names-and-sizes.txt) establishes, and the sentence on which name moves each row is gone.
- **The whole run and the size reading.**
  - The material-x browser, spec and node projects pass in the three engines: 1911 passed, 1 expected fail, 4 skipped. That is the implementer's figure.
  - `just size-reading` at the head equals the implementer's [`size-after-repair.json`](../../list-states-1/checks/size-after-repair.json) in all 33 rows. Against `7271c5b9f`, `list/list-button-item` −2, `list/list-link-item` −4 and `complete` −6, and every other row is unchanged.

**Not covered:** Safari, the visual project, and the implementer's own substitution probe, which my witness replaces.

### recheck-1

**Tier A, pre-existing.** A pointer press focuses a disabled `mx-list-link-item`, whose `disabled` is documented as _"Disables navigation and focus"_.

- **Current behaviour.** After a press and release on a disabled link item, selected or not, `document.activeElement` is the item, its shadow root's active element is the internal `<a>`, and `focusin` fires. This happens in Chromium, Firefox and WebKit ([`recheck.txt`](checks/recheck.txt), the `boundary` and `link-focus` readings). The item doesn't match `:focus-visible`. A disabled button item isn't focused.
- **Cause, by reading.** `useDisableableLinkable` in `packages/core/src/traits/linkable.ts` sets the disabled anchor's `tabIndex` to −1 and removes its `href`. That takes it out of the tab order and leaves it focusable by a pointer.
- **Why it is not this change's defect.** `main` (`f1387729d`) reads the same in each engine. `7271c5b9f` hid it, because the host's `pointer-events: none` kept the press from reaching the anchor. The repair returns to `main`'s behaviour, as the ruling intends.
- **Why it is a problem.** The element says `disabled` disables focus, and a disabled native control can't be focused. A consumer's `focus` and `focusin` handlers run for a disabled item. Focus also leaves where it was, so the next `Tab` starts from the disabled item.
- **`mx-link-button`,** which uses the same trait, isn't focused by a press. Its press never reaches its anchor (`recheck-2`).
- **Required property.** A pointer press on a disabled `mx-list-link-item` doesn't move focus, in each engine at `RD-20`'s floor, and a row observes it.
- **Routing.** To the architect, for registration. It needs no decision before #151 merges.

### recheck-2

**Tier A, pre-existing, outside `RF-71`.** A press on a disabled `mx-button` or `mx-link-button` dispatches `pointerdown` and `click` on the element beneath it.

- **Current behaviour.** Each is disabled, in a wrapper `<div>`, and pressed at the centre of its internal `.host`. `document.elementFromPoint()` there returns the `<div>`, and the `<div>` receives `pointerdown` and `click` targeted at itself, in Chromium, Firefox and WebKit ([`recheck.txt`](checks/recheck.txt), the `button-clickthrough` reading, [probe](probes/recheck-button-clickthrough.browser.test.ts.txt)).
- **Cause, by reading.** The host computes `display: contents`. `button/styles/default/disabled.styles.css` gives the disabled `.host` `pointer-events: none`. So the element has no box of its own that takes the press. This is `reviewer-1`'s mechanism in the button family.
- **Why it is not this change's defect.** #151 doesn't touch the button stylesheets, and `main` carries the same rule.
- **Why it is a problem.** The ruling's measure for the list items applies here too: a press on a disabled native button gives no element a `click`. A consumer with a click handler on a container, a card or a row acts on a press of a disabled button.
- **Not read:** the other elements built on `ButtonCore`, which adopts `disabled.styles.css`: the icon buttons, the split button and the switches.
- **Required property.** A pointer press on a disabled button-family element dispatches no `click` to any element, in each engine at `RD-20`'s floor, and a row observes it at an ancestor.
- **Routing.** To the architect, for registration as a finding of its own.