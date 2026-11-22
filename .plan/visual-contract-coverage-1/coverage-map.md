# Visual-contract coverage map of material-x

**What this is:** a reviewer's reading of which properties material-x's tproc-backed visual contracts observe, component by component. It was read from `origin/main` at `c08dbd7fc` for [#122](https://github.com/ausginer/material-x/issues/122), and the coordinator relayed the reviewer's closing message verbatim on 2026-11-22. `repo:RD-34` adopts it as the inventory, and each gap group is a finding, `repo:RF-82` to `repo:RF-92`. It is a dated reading and not a current-state document. An entry's status says what its unit covered, and a later re-read replaces this map.

**Evidence:** the reviewer's probe, [`render-token-packages.ts`](probes/render-token-packages.ts), rendered all 97 production token packages. The probe imports the `tokens.ts` files from the main checkout, which had the same tproc and `tokens.ts` files as `c08dbd7fc`. Its output is in [`emitted-properties.txt`](checks/emitted-properties.txt), the private properties that each package emits per selector, and [`rendered-token-packages.css.txt`](checks/rendered-token-packages.css.txt), the rendered CSS.

**What the architect checked,** at `00fd35592`, before ruling on the static candidates:

- **The disabled text field and the prefix and suffix:** in the stylesheets, and in the token store ([reading](checks/text-field-tokens.txt), [probe](probes/text-field-tokens.ts)). Confirmed: see `RF-79` and `RF-81`.
- **The unread properties:** a search of `src/` for each name, in both its `var(--_…)` form and its token form. Confirmed for each of them, and no JavaScript reads them. `interaction-width-multiplier` is read, but the reviewer didn't list it.
- **The variation axes, corrected:** in every package, `opsz` equals the label's font size and `wght` equals its weight token, and every other axis is at its default. So they add nothing to what `font-weight` and automatic optical sizing already render. See `RF-81`.
- **The button group's interaction timing, beyond the map:** the standard group's press interaction doesn't change any rendered width, so the timing has nothing to animate. See `RF-80`.
- **The three assertions under _Circular, or not a contract_:** read in the tests. Confirmed, and ruled in `RD-34`.

**Not run:** any contract or rendered value besides `RF-80`'s probe. Every _candidate_ below is a source reading, as the reviewer says.

## Where each task went

| The reviewer's task | Address | Size |
| --- | --- | --- |
| 1. Text field, filled and outlined | `RF-82` | _medium_ |
| 2. FAB, all variants | `RF-83` | _medium_ |
| 3. List items | `RF-84` | _medium_ |
| 4. Icon buttons and switch icon buttons | `RF-85` | _medium_ |
| 5. Interaction states across the button family | `RF-86` | _medium_ |
| 6. Switch buttons | `RF-87` | _medium_ |
| 7. Checkbox and radio | `RF-88` | _medium_ |
| 8. Split button | `RF-89` | _medium_ |
| 9. Focus indicator | `RF-90` | _medium_ |
| 10. Button group | `RF-91` | _small_ |
| 11. Typography tails | `RF-92`, ruled in `RF-81` | _small_ |
| Candidate: the disabled text field | `RF-79` | _small_ |
| Candidate: emitted but unread tokens | `RF-81` | _small_ |
| Candidate: the button group's interaction timing | `RF-80` | _medium_ |
| Known: the shadow colour | `RF-77` |  |
| Known: the list's selected and disabled states | `RF-71` |  |

## The reviewer's reading

The rest of this document is the reviewer's closing message as the coordinator relayed it. The only changes are the heading levels and the scratchpad paths, which now point to the copies in this directory.

Read-only, from origin/main c08dbd7fc. Contract tests cover the mx-button family's resting state well and almost nothing else. FAB, split button, outlined text field, icon-button sizes and the list's visual properties have no contract at all.

Method: read every *.spec.browser.test.ts, the two behaviour tests that call the bridge (list-item, text-field), the bridge registry and browser.ts. Rendered all 97 production token packages with a node probe, which lists which private properties each state emits. tproc and every tokens.ts are identical between local main and origin/main. Checked each emitted property against every var() read in src and in the generated CSS. No slot, branch or commit. Probe and output: [`render-token-packages.ts`](probes/render-token-packages.ts), [`rendered-token-packages.css.txt`](checks/rendered-token-packages.css.txt) and [`emitted-properties.txt`](checks/emitted-properties.txt).

Legend: C covered, P partly, — none. Test keys: BS button.spec (sizes), BC button.color.spec, FL core/focus-layer.spec, BG button-group.spec, CB checkbox.spec, CC CheckableCore.spec; LI list/list-item.browser and TF text-field.browser (bridge geometry inside behaviour tests); EL core/elevation.spec (on #120's branch only, not on main).

### mx-button (filled | elevated | tonal | outlined | text)

- Container colour: C | C | C | C | C (BC, rest only).
- Label/icon colour: C | C | C | C | C (BC, rest only).
- Outline width/colour: n/a | n/a | n/a | C (BC) | n/a.
- Shape: square C (BS, all sizes, measured on filled). Round P (BS derives height/2 and never reads container.shape.round). Pressed :active morph —.
- Typography: font size, line height, weight and family C (BS, all sizes). Tracking —. Variation axes —.
- Spacing/size: height, inline padding, gap and icon size C (BS, all sizes).
- Elevation (elevated only): rest P on main (BC asserts only that the shadow differs from filled's), C in EL; disabled→0 P (BC compares with filled's shadow); hover P (BC asserts only that the shadow changed); focus/pressed level —.
- Shadow colour: —. EL's colour half is circular, and the colour is wrong: #120 reviewer-2 (now RF-77).
- Hover state layer: C | — | — | — | —. Hover label/icon colour: —.
- Focus state layer: C on all five (FL).
- Focus indicator: P on all five (FL checks outline-style solid only; thickness, offset and colour —).
- Pressed (ripple, label colour, shape): —.
- Disabled: elevated label colour × opacity C (BC). Everything else —. The filled disabled package (disabledTokens) isn't in the registry.
- mx-link-button: no spec test (same packages).

### mx-switch-button (filled | elevated | tonal | outlined)

- Unselected and selected container/label/icon colours: — on all four. The contracts are registered but used only by FL.
- Checked shape morph: — (shapeTokens not registered).
- Size: — (switchTokens and defaultSizeSwitchTokens not registered).
- Focus layer: C on all four, unselected and selected (FL). Hover layer: filled only (FL).
- Pressed and disabled: — (includes the outlined disabled outline colour and the checked-disabled container).

### mx-icon-button (filled | tonal | standard) and mx-switch-icon-button

- Colours, sizes (height, padding and icon size × 5), wide/narrow widths, round/square/pressed shape, disabled: — everywhere. The size and width packages aren't registered.
- Focus layer: C (FL). Hover layer: switch-icon filled only.

### mx-split-button

- Everything —. No contract is registered (inner corners per size with their hover/pressed morph, leading/trailing spaces, trailing icon size).

### Button groups

- Standard between-space: C (BG, 5 sizes).
- Connected between-space: —.
- Connected inner corner at rest: P (BG reads one corner of the middle button).
- Connected outer corners at rest: — (only through the selected pill).
- Connected selected pill, pressed inner corners and the selected button's neighbour: C (BG).

### mx-checkbox

- Container size, shape, outline width and unselected outline colour: C (CB).
- State-layer size, full radius and icon size: C (CC).
- Checked container colour: —.
- Glyph colour: P (CB reads icon.color at rest, while the glyph is hidden).
- Hover: unselected C (FL); selected —.
- Focus: unselected, checked and indeterminate C (FL).
- Pressed and disabled: —.

### mx-radio

- State-layer size, radius and icon size: C (CC).
- Unselected and selected icon colours, hover icon colour, checked hover: —.
- Focus: unselected and checked C (FL). Hover: unselected C (FL).
- Pressed and disabled: —.
- There is no radio spec file, though checkbox.spec's header points to one.

### mx-fab (default/primary/secondary × tonal × default/medium/large × extended)

- Everything — on main. Nothing is registered.
- EL adds the resting elevation layers for default and extended. Colour is as for the button. The hovered level isn't covered.

### Lists

- Item heights: two-line and three-line C (LI); one-line —.
- Leading video small and large: C (LI). Avatar, image and icon sizes: —.
- Colours (label, supporting, overline, icons, container), typography, spacing (leading, trailing, top, bottom, between), and the expressive shape per state (hover, focus, pressed, selected, dragged): —.
- Hover and pressed layers: —.
- Selected and disabled: — (known: #104 RF-71).
- Dragged elevation: C in EL only; colour per #120 reviewer-2.
- mx-list container shape, segmented gap and footprint colour: — (listTokens not registered).

### Text fields

- Filled (mx-text-field and mx-multiline-text-field): lead/trail/prefix/suffix spacing and the support row gap C (TF). Height, every colour, typography (label, input, supporting, populated label), top-corner shape, active indicator thickness and colour: — at rest and in hover, focus, error and disabled.
- Outlined: everything —. The outlined, error and disabled packages aren't registered.

### Core

- Focus indicator (focusTokens): P (outline-style only).
- Elevation (elevationTokens): EL only.
- mx-icon has no tokens.

### Circular, or not a contract

1. BC "should resolve elevation 1 by default and 0 when disabled" compares tproc's output with the literals '1' and '0', with no browser observation and no provenance for the literals. It isn't a contract.
2. EL's expectedLayers takes the colour from the box's generated --_shadow-color. The colour half is circular, as #120's review says.
3. BG's selected-pill test: `expect([inner, outer]).toEqual([full, full])` is a tautology while the token is var(--_shape-full), because expectedRadius returns the same element's height / 2. The readCorners assertion beside it is the real observation.
4. BC's other elevation rows are relational: they compare with filled's shadow or with the resting shadow, not with tokens. Weak, but not circular. No test on main reads a generated custom property on both sides.

### Candidate differences from static reading (not rendered; not in the queue)

- Disabled text field: the input text has no disabled opacity. `--_input-text-opacity` (0.38) is emitted and never read, and disabled.styles.css doesn't cover .input. The active indicator is a border on .notched-outline, which takes `opacity: var(--_container-opacity)`, so it is likely dimmed to the container's 0.04 instead of its own `--_active-indicator-opacity` (0.38, unread). The icon and supporting-text opacity tokens are also unread; they're dimmed by the label opacity, which has the same value. Likely visible.
- Text field prefix/suffix take the label's typography and the placeholder colour, and never read `--_input-text-prefix-color`/`-suffix-color`. The values are equal today, so this is latent.
- Tokens emitted and never read: button/FAB `label-text-font-tracking` and `label-text-variation-axes`; text-field `input-text-tracking` and `label-text-populated-line-height`; switch `container-color-reverse`/`label-text-color-reverse`; button-group `interaction-duration`/`-easing`; list `*-type-*` duplicates. Every tracking value is 0px today, so this is latent. Whether the unread tokens are intended is the architect's call.

### Bridge and adapter gaps

- Not registered: FAB (all), split, icon-button size/width, button shapeTokens, switch size, button disabledTokens, text-field outlined/error/disabled, listTokens, focusTokens, and elevation/fab.color.default (on #120 only).
- Local helpers to move to tests/support when a second test needs them: FL's state-layer ::before observed/expected; BG's readCorners and the full = height / 2 formula (the text field's per-corner shape needs both); EL's level → layered shadow; BC's inline colour-mix for disabled opacity.
- Missing adapters: letter-spacing (0px against `normal`), font-variation-settings, the pressed ripple on ::after (it animates, so it needs a settle), and the focus-indicator width/offset/colour.

### Ordered tasks (likelihood × visibility)

1. Text field, filled and outlined. Colours, typography, height, shape, and active indicator/outline at rest, hover, focus, error and disabled. Register the outlined/error/disabled packages. The static candidates above make the disabled case first.
2. FAB, all variants. Register size/colour/tonal/extended. Container size/shape/colour, icon colour/size, extended label typography/width, and hover elevation. Elevation reuses EL once #120 merges; shadow colour per reviewer-2.
3. List items. Colours, typography, spacing, one-line height and the per-state shape; register listTokens for the container shape and segmented gap. Selected/disabled is #104 (RF-71): cite it.
4. Icon buttons and switch icon buttons: sizes, widths, colours, shapes, disabled. Register their size/width packages.
5. Interaction states across the button family: hover layers for the non-filled colours; pressed (ripple colour/opacity, the :active shape morph, pressed label colour); disabled for all colours (register disabledTokens); the elevated button's exact hover/focus/pressed levels (on EL's helper).
6. Switch buttons: selected colours, the checked shape morph (register shapeTokens), sizes.
7. Checkbox and radio: selected colours, disabled, selected hover, pressed. Add a radio spec file.
8. Split button: register it; sizes and the inner-corner morph.
9. Focus indicator thickness, offset and colour against focusTokens, for every focusable component.
10. Button group: connected between-space, outer corners at rest, all four corners; drop the tautological assertion.
11. Typography tails: tracking and variation axes. Architect-first, because the tokens are unread by design or by omission. Also replace BC's literal elevation assertion with a contract.

### Known, cited rather than re-found

- #120 reviewer-2 (shadow colour; now RF-77).
- #103 RF-70 (penumbra, fixed by #120).
- #104 RF-71 (list selected/disabled).
- The button group's spec-consistency.md: the connected XS inner corner, where the upstream token says 8 and the diagram says 4.
- The button's spec-consistency.md: disabled elevated keeps its elevation. BC now covers this.

### What the reviewer couldn't read or did not do

- Ran no browser and probed no rendered value, so every "candidate" is a source reading.
- Didn't read the M3 site. Motion tokens out of scope. Didn't assess the screenshot tests.
- EL was read from #120's branch, which isn't merged.
- The unread-token scan is a text match on var(--_name) in src plus the generated CSS; no JavaScript reads the names listed.