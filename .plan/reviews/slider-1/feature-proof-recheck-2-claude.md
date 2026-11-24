# `mx-slider` (RD-55, #173) — feature proof, the rows and texts after the recheck

**Files were read at:** `715bca7fd`, the head of #220 (`material-x/slider-1`), in slot `c`. Runs used a scratch copy of that tree with the packages rebuilt in it. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2, headless, on Linux. The earlier rounds are [`feature-proof-claude.md`](feature-proof-claude.md) and [`feature-proof-recheck-claude.md`](feature-proof-recheck-claude.md), and the local ids continue from them.

**Subject:** the plan's [recheck rulings](../../slider-1/slider-plan.md#the-rechecks-rulings) and work list, the [report's section](../../slider-1/slider-report.md#the-rechecks-work-list), and `a0e9898c9` and `715bca7fd`.

**Verdict: no tier A or B finding. `reviewer-12` and the accepted part of `reviewer-13` are closed, `reviewer-14`'s texts in the package are true, and both departures are right.** One tier C finding, `reviewer-15`, is about #220's description.

## The rows

The slider's browser rows pass unmutated: 293 in Chromium, 231 in each of Firefox and WebKit. The report's seven mutations were all run again, and each fails exactly its one row in every engine it names. The messages show that each fails for its own reason ([readings](checks/recheck-2-mutations.txt)). The counts agree with [`witnesses-recheck.txt`](../../slider-1/checks/witnesses-recheck.txt), which adds the 85 spec rows.

| Row | The ruled behavior | What my own mutations add |
| --- | --- | --- |
| `recordEvents` | stated | With a doubled `change`, 31, 22 and 20 rows fail, and with the old helper 3, 2 and 2. A cancel that commits twice fails 2 rows, and 0 with the old helper |
| A second scroll | stated | Also fails if the hold works only once. `pan` waits for the scroll, so neither scroll is missed |
| A scroll after a slide ended by disabling | stated | Also fails if a cancel ends in `idle`: the engine's own `change` 51 then gets through |
| A held press that meets another element's focus | stated | Also fails with `change` before `input`, as `change 30`, `input 70` |
| A pen's press | stated | Also fails if neither the release nor the native `change` reports it |
| A press after a missed release | stated, by the departure | below |
| The hit test | stated | Also fails with `pointer-events: auto` on the text alone. The point is inside the viewport in the three engines, so a null hit doesn't make it pass |

## The departures

**The disabling in the missed-release row is right.** With `display: none` alone, the look at every step is the same with and without the mutation, in the three engines: the first press's look is still there (the plan's limit 7) and the mouse's one `pointerId` ends it. So no row of that form can have the plan's witness. In the committed form the mutation leaves the second press at rest (`4px`, `none`), and the release is really missed: if it had arrived, the mutation would have changed nothing. **Its limit:** the witness depends on disabling not forgetting the pointer. With that added to `endPress`, the mutation fails nothing. No code does it today.

**The two traits lines are right.** At `8223fa371` the snapshot has 21 elements. `mx-card` and `mx-slider` each list 16 traits and the other 19 list 17. At `715bca7fd` all 21 list the same 17, in the same order. `SliderLike` is `false` on the card and `CardLike` is `false` on the slider, as the received values in the failed runs say. Nothing else in the snapshot changes.

## The source and the texts

- **`slider.ts` doesn't change:** the scanner's tokens without comments are the same at `7ec87c834`, `8223fa371` and `715bca7fd` (1841 each). `styles/` and the template are byte-identical to `8223fa371`. The merges between the commits touch nothing of the slider's but the recorded images.
- **Sizes** are as reported: `slider/slider` 3947 and `complete` 25074. Typecheck passes on the copy.
- **JSDoc, `slider.mdx` and the comment on `pointerdown`** say what is ruled, and agree with the code and the earlier readings. **Limits of the evidence:** a pen's slide was read in Firefox only, and no engine was seen to take a pen's press for a scroll by itself. The texts leave out the accepted case of a press that the engine committed first. `SL-D3` and #220 state it.
- **The report's section** is true, and its links resolve. Its claim that `traits-baseline` failed in the three engines is so.

## CI

- **`715bca7fd`** ([run 45405726123](https://github.com/ausginer/material-x/actions/runs/45405726123)): `verify` succeeds. `chromium`, `firefox`, `webkit`, `docs`, `static` and `measurements` pass, `traits-baseline` in each engine and the slider's ten visual rows among them. `records` and `deploy` are skipped.
- **`d59e28c4d`** (run 45402002263): the implementer's assumption is verified, and it isn't only WebKit. `chromium`, `firefox` and `webkit` each fail one row, `traits-baseline`, with exactly the two missing lines. At `8223fa371` the same row fails in the three, with the ten visual rows that had no baseline.

## Scope

**Covered:** the above, and #220's description. **Not covered:** the settled behavior of the held press and the owner's Q1 and Q2, which weren't reopened; Safari, physical touch and assistive technology; the costs; the spec rows under mutation.

## Findings

### reviewer-15

**Tier C.** #220's description is behind its branch.

- **Current:** it says that the visual project wasn't run, that _the gate's `chromium` job fails until the baselines are recorded_, and, for the owner, _before the merge: record the baselines_. They were recorded in `15375ec43`, and `chromium` passes. Its sizes (3950 and 24802), suite counts (1391, 1288, 1289) and `docs-smoke` (120) are those of an earlier tree. The report has 3947 and 25074, 1496, 1383 and 1384, and 125. The list of mutations leaves out the recheck's seven.
- **Why it is a problem:** it asks the owner for a step that is done, and states a failing gate that passes.
- **Evidence:** #220 read on 2026-11-24, with run 45405726123.
- **Required property:** the description agrees with the branch's head. The second finger's paragraph and the pen are as ruled.
- **Route:** the coordinator.

## Observations, no finding

- **The focus and pen rows can't see a second `input` 70,** because `recordEvents` still merges repeats of `input`, which the plan allows. A native `change` that reports the held press twice fails no row. The tap's rows count `input` without merging, so only the path through `change` is open.
- **The pen's row reads no look.** With `pointerup` ignored for a pen, the native `change` reports the press and the row passes, and by the code the look would stay held.
- **The hit test reads the text's centre, as ruled.** The spaces beside it with `pointer-events: auto` fail nothing.

## Next

The coordinator corrects #220. Nothing is owed by the architect or the implementer. The phones' check follows the merge, as ruled.