# State layers in the visual layer — plan

**Status: proposed, for the owner.** No identifier is minted. Written by the architect on 2026-11-18 at `377ca72df` (`origin/main`), on `repo/state-layer-visual-1`, on the coordinator's task. It plans the repair of `repo:RF-41`. The decision below is proposed as the next free `RD-` number: `repo:RD-24` if `RD-22` (work queue) and `RD-23` (material-x size rows) are registered first. The main slot's architect registers it.

Canonical entry: `RF-41` — the screenshot comparator doesn't see a state layer at the tokens' opacities ([`00-index.md`](../00-index.md)). Its required property: either the visual layer detects a state layer at the tokens' lowest opacity on the fixtures' surfaces, with no false failure in `RD-9`'s pinned environment, or [`test-architecture.md`](../../.agents/docs/test-architecture.md) states what the visual layer can't see and names the spec rows as the coverage of state layers.

## Readings

Read by the architect at `377ca72df`:

- **The comparator.** `@vitest/browser` 5.1.0's default is pixelmatch with `threshold: 0.1`, `includeAA: false`, and no allowance for mismatched pixels (`node_modules/@vitest/browser/dist/index.js`, `defaultOptions$1`). The repository sets no comparator option: `.scripts/vitest-config.ts` has none, and no `toMatchScreenshot` call passes one.
- **The setting exists per project.** Vitest's browser configuration takes `expect.toMatchScreenshot.comparatorOptions`, including `threshold` (`node_modules/vitest/dist/chunks/plugin.d.LRFSN46m.d.ts:796`–`:805`). The visual project is declared once, in Chromium, by `createVisualTestProjects` (`.scripts/vitest-config.ts:429`). Only material-x has visual tests.
- **The rows.** 19 baselines in four files: `button`, `button-group`, `checkbox` and `radio`. Three show a hover state (`button-hovered`, `checkbox-hovered`, `radio-hovered`) and three show keyboard focus (`button-focused`, `checkbox-focused`, `radio-focused`). The fixture surface is white (`tests/support/browser-setup.ts:116`).
- **The tokens' opacities.** In the button, checkbox and radio tables, the hover layer is 0.08, and the focus and press layers are 0.1. So the lowest opacity that the visual rows show is the hover layer's 0.08.
- **The stale baselines.** Per the [findings report](../findings-1/findings-1-report.md) §7, the focus layer was added after the three focused baselines were recorded. The labeled recording at `c34cb01d7` (run 43886019999) rewrote nothing, because `--update` rewrites only a baseline whose comparison fails. So `button-focused`, `checkbox-focused` and `radio-focused` show no focus layer, while the components draw one.
- **The arithmetic,** as an estimate, not a reading. pixelmatch fails a pixel when its YIQ distance exceeds 35215 × _t_². A layer of opacity _a_ moves each pixel by _a_ × (layer − surface), so the distance scales with _a_². `RF-41` estimated about 113 for the weakest case at 0.1, a primary layer over the button's surface. The hover layer at 0.08 then gives about 72, which fails a pixel only below _t_ ≈ 0.045. These figures come from token colors. The rendered colors decide.

**What this means for the design.** The three stale focused baselines are a witness that already exists in the pinned environment. A threshold that sees the focus layer makes those three rows fail against their current baselines, and the default threshold of 0.1 doesn't. Visual tests don't run locally (`test-architecture.md` §What screenshots prove), so the reading that chooses the threshold runs on GitHub's runner.

## Decision, proposed as the next free `RD-`

**The visual project compares screenshots at a threshold low enough to see a state layer at the tokens' lowest opacity on the fixtures' surfaces. The threshold is chosen by a reading on GitHub's runner, and the baselines that then fail are re-recorded and reviewed under `RD-13`.** These properties hold:

1. **One setting for the visual project.** The threshold is set once, in the visual project's browser configuration (`expect.toMatchScreenshot.comparatorOptions.threshold`), and no row overrides it. `includeAA` stays `false`, and no mismatched pixel is allowed, as now. A comment beside the setting names this decision.
2. **The threshold is the largest value in the reading that meets all three conditions:**
   - **(i) focus is seen:** each of the three focused rows fails against its current baseline, the stale one with no focus layer, and the diff covers the layer's area, not only its edges;
   - **(ii) hover is seen:** with a scratch mutation that sets the hover layer's opacity to 0, each of the three hovered rows fails;
   - **(iii) nothing else moves between runs:** two runs at the same commit give the same result and the same mismatched-pixel count for every row. The value is the largest one, so that the instrument is no stricter than the property requires.
3. **The reading.** On GitHub's `ubuntu-24.04` runner, in `RD-9`'s environment, at the unit's input commit: the visual project at the thresholds 0.1, 0.06, 0.045, 0.03, 0.02, 0.01 and 0, twice at each, and once at each with the hover mutation. Each row records pass or fail, and the mismatched-pixel count from the failure message. The reading runs outside the gate, by a scratch workflow or step that the unit removes, and its output is saved in `.plan/state-layer-visual-1/checks/`.
4. **Rows that fail at the chosen threshold.** A row that fails in both runs without the mutation has a baseline that no longer matches the rendering, as the focused rows don't. All such rows are re-recorded by the recording workflow (`RD-13`), in the unit's pull request, and the owner reviews each changed baseline: a focused baseline must now show the focus layer. A row that fails in only one of two runs is noise, and that threshold is not chosen (condition iii).
5. **If no swept value meets all three conditions,** the comparator stays at 0.1. The unit takes the required property's second branch: `test-architecture.md` states that the visual layer doesn't see a state layer at the tokens' opacities, names `tests/core/focus-layer.spec.browser.test.ts` and the other state-layer spec rows as the coverage, and carries one evidence line naming the reading (`documentation.md` §1). The three focused baselines are still re-recorded, by deleting them before a recording, so that a baseline titled _focused_ shows the focus layer. That is a stop for the owner before the documentation is written, because it changes what the owner chose.
6. **`test-architecture.md` §What screenshots prove** states the rule that applies: under the main branch, that the threshold is chosen so that a state layer at the tokens' lowest opacity on the fixture surface fails a comparison, with one evidence line naming the reading; under property 5, what the visual layer can't see.

**Why.**

- **A row titled _hovered_ or _focused_ exists to show that state.** At 0.1 it can't, and three of its baselines are already wrong without anything failing. A baseline says _"this approved rendering must not change without review"_ (`test-architecture.md`). At 0.1 it doesn't say that for any change smaller than about a tenth of the color range, which includes every state layer.
- **One setting, not per-row options.** The default threshold exists to absorb rendering differences between environments, and `RD-9` removes those by pinning one. A small color change, for example to an outline, is as invisible as a state layer today. Overriding the threshold per row would protect only the rows someone remembered, and a second value would need its own reading.
- **The reading, not the arithmetic, chooses the value.** The arithmetic gives an upper bound from token colors. Noise in the pinned environment, if any, gives the lower bound, and only runs on the runner read it. Condition (iii) is the check that `RF-41`'s _"no false failure"_ asks for.
- **The stale baselines are the witness for focus.** They exist, and they are exactly the case `RF-41` describes. A mutation is still needed for hover, because no hovered baseline is known to be stale.

**Not adopted.**

- **The documentation branch by default.** It is cheaper, but it leaves six rows whose titles claim more than they check, and three wrong baselines. It stays as the fallback in property 5.
- **Thresholds per row.** See _Why_.
- **Fixtures with more contrast**, such as a dark surface behind the state rows, to make the layer easier to see. That changes what the rows show in order to suit the comparator. The tokens and the white surface are what consumers see.
- **Allowing some mismatched pixels.** That trades sensitivity in area for sensitivity in color, and a state layer covers the whole control, so it doesn't help.

## Owner questions

1. **Which branch of `RF-41`'s required property?** (a) The visual layer sees state layers: the comparator is tightened under properties 1–4, with the documentation as the fallback if the reading fails (property 5). (b) Only the documentation: the comparator stays at 0.1, and the focused baselines are re-recorded so they show the layer. **The architect recommends (a).** Its cost: one reading of 21 visual runs on the runner (7 thresholds, twice each and once with the mutation), and your review of every baseline that the chosen threshold shows to be stale, at least the three focused ones. Later, small color changes will also need your review, which is the purpose of a baseline.
2. **The review load.** Under (a), every later change that moves a rendering by more than the new threshold proposes a baseline change for you to review. **The architect recommends accepting that.** The alternative is (b).

## Implementation

After the owner's answer, and after the decision is registered:

1. **One implementer unit on `repo/state-layer-visual-1`.** The reading (property 3) comes first, and it is saved. Then the threshold (properties 1 and 2), the re-recording through the `record-baselines` label (property 4), and the documentation (property 6). If no value qualifies, the unit stops under property 5 and reports to the coordinator.
2. **Witnesses, in the reading:** conditions (i) and (ii) are the mutation evidence for the chosen value. After the re-recording, the gate's `chromium` job passes at the new threshold with the new baselines, in two runs.
3. **Review:** a feature proof against properties 1–6. The owner's review of each re-recorded baseline under `RD-13` is separate from the feature proof.
4. **Closure:** the pull request closes `RF-41` in the record, and its issue with `Closes #N` once the queue exists.

**Nearest consumers.** `RF-35`'s focus-layer spec rows don't change: they stay the coverage of the layer's color and opacity against the tokens, which a screenshot can't give. `RF-43` changed the switch buttons in #35. If `button-switch-variants` moved by less than 0.1, the reading shows that row failing in both runs, and it is re-recorded under property 4 like any other stale baseline.

## Proposed identifiers

- The next free `RD-` number for this decision: `repo:RD-24` if `RD-22` and `RD-23` are registered first. The main slot's architect confirms it.
- `RF-41` is closed by the implementing pull request. No new finding.