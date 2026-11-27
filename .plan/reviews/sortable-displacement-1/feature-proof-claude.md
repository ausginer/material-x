# `mx-sortable-list`'s neighbors slide with Material's timing (RD-60): feature proof

**Lens:** `reviewer`, feature proof of [`RD-60`](../../decisions/RD-60.md) with its notes and the architect's ruling on the implementer's four departures, for pull request #310. Requested by the coordinator.

**Commit read:** `5e188e4b3` on `material-x/sortable-displacement-1`, which has `main` at `7ac961122` merged. The code is the owner's `65c6f432e` and the implementer's `4a68971ee`. The commits after them change records only.

**Outcome: accepted. No finding.** Properties 1, 2, 3, 5 and 7 hold as the notes make them exact, and so does property 4 as the ruling corrects it. Property 6 holds for what the unit adds. Every mutation that removes a property's mechanism fails its rows in Chromium, Firefox and WebKit, and the same rows fail in each engine. The one exception is the mutation whose extra failures the ruling explains. CI's `verify` ran in full on the head and passed: run 45871203621. The PR has a `verify` run that the merge can use. Two observations are at the end.

## Scope and method

- **The affected files,** unmutated, in Chromium: `tests/list/`, and the files that import the list: `aria-own-value`, `axe`, `slotted-content`, `core/elevation.spec`, `core/animations/ripple` and `package-entries.node` ([reading](checks/chromium-affected.txt)). Firefox and WebKit are read from CI (`RD-62` property 4).
- **Mutations,** [`mutations.mjs`](probes/mutations.mjs.txt), against the whole of `sortable-list.browser.test.ts`, in Chromium, Firefox and WebKit, one engine at a time ([readings](checks/mutations.txt)). They are the implementer's six that remove a mechanism, the architect's row 6 witness, and three of mine. All of them are animation and timing, which `RD-62` property 5 has repeated in each engine.
- **Sizes:** `just size` at the head, and with `origin/main`'s `sortable-list.ts` and two list `tokens.ts` files in its place ([reading](checks/sizes.txt)).
- **Read, not rerun:** the implementer's [overshoot and focus readings](../../sortable-displacement-1/checks/shots.txt), with his probe and the screenshots of the focus at 100 and 250 ms and of WebKit's key overshoot. The architect's [refused key move](../../sortable-displacement-1/checks/refused-key-animation.txt) and [landing swap](../../sortable-displacement-1/checks/landing-swap-witness.txt) readings: I repeated the landing swap. The amendments of `RD-31`, `RF-127` and the list plan.
- **Not read:** Safari, a real device, touch, a story by eye, and material-x's full suite. `RF-151` and `RF-152`, which aren't this unit's.

## Properties

| Property | Reading |
| --- | --- |
| 1, `displacement: layoutAnimation({ timing })`, pointer and key | **Holds.** By reading, one composition in `sortable-list.ts`. Removing it fails the 11 motion, return, preference-change and timing rows in each engine. |
| 2, the timing from the sortable sheet's private properties, `expressive.default-spatial` | **Holds.** `LAYOUT_CSS_PROPS` is one `useCSSProps` call apart from the landing's, and the four properties are in `list/styles/sortable`'s `:host`. Row 5 reads tproc's pair and a page's values. Leaving `timing` out, a linear easing (mine), and the neighbors reading the landing's properties (mine) each fail row 5 in each engine. |
| 3, no motion under `prefers-reduced-motion: reduce` | **Holds,** where Playwright emulates it. Making drag's layout animation ignore the preference (mine, in drag's build) fails row 4's four rows in each engine, as removing the emulation does. |
| 4, the rest unchanged; the returns as the ruling corrects them | **Holds.** The file's rows outside _neighbors_ pass unmutated in each engine, 184 in Chromium and 172 in Firefox and WebKit, and the returns are animated: `Escape`, a refused pointer drop, and a key move and a pointer drop that are never committed. A refused key move and a commit 100 ms late are not returns (ruling 1 and 2). Their rows assert what the ruling says. |
| 5, no public surface; the JSDoc | **Holds.** The _Neighbors_ item follows _Lift_ and names the preference. No `@cssprop` or attribute is added. |
| 6, only `list/sortable-list` and `complete` grow | **Holds for what the unit adds,** against the merged `main`: `list/sortable-list` 9.35 to 9.94 kB and `complete` 26.31 to 26.89 kB, within the estimate of +0.65 kB. `text-field/text-field` moves 8.63 to 8.64 kB; see observation 2. |
| 7, `mx-list` carries none of it | **Holds.** Leaving the four properties in the default sheet fails row 7's `mx-list` row in each engine. Removing `--_drag-*` from the sortable sheet fails rows 6 and 7's `mx-sortable-list` row, and two landing rows. |

**Mutations,** the number of rows of the file that fail:

| Mutation | Chromium | Firefox | WebKit | Group |
| --- | --: | --: | --: | --- |
| None | 0 / 202 | 0 / 190 | 0 / 190 |  |
| `displacement` removed | 11 | 11 | 11 | repeated: property 1 |
| `timing` left out | 11 | 4 | 8 | repeated: property 2 |
| The landing's pair in the neighbors' tokens | 2 | 2 | 2 | repeated |
| The four properties in the default list sheet | 1 | 1 | 1 | repeated: property 7 |
| `--_drag-*` removed from the sortable sheet | 5 | 5 | 5 | repeated |
| Row 4 without the emulation | 4 | 4 | 4 | repeated: row 4's instrument |
| The landing reads the neighbors' properties (the architect's) | 2 | 2 | 2 | repeated: row 6 |
| own: the neighbors read the landing's properties | 11 | 11 | 11 | doubted |
| own: drag's layout animation ignores the preference | 4 | 4 | 4 | property 3's mechanism |
| own: the neighbors' easing is `linear` | 1 | 1 | 1 | doubted |

In each engine the rows that fail are the same, but for `timing` left out. Its two row 5 rows fail in each engine, and so the witness holds. The extra motion and return rows that fail differ by engine, and from the implementer's counts (Firefox 6 and WebKit 4 in his run). That is ruling 3's frame dependence: drag's 160 ms default ends inside the read. Unmutated, those rows have an hour of motion. None of the implementer's witnesses is left to his record alone: all six are repeated, the landing's pair in the neighbors' tokens with them.

**The record.** The ruling's two corrections are notes, and property 4's sentence is left as written with the note after it, as the register's notes do. `RD-31`'s _Not adopted_, the plan's bullet and `RF-127`'s sentence each keep their text, with the supersession after it.

## Observations

Not findings.

1. **The node rows failed first in this slot,** with _"Property `--_layout-animation-duration` is not collected"_. Their setup runs `tsdown` without `build-prepare`, so the private-property cache was stale. After `just build-prepare` the 33 rows pass, and CI's `chromium` job, which builds, passes them. A local runner who doesn't build after the unit meets the same error. That is the test setup's, not this unit's.
2. **`text-field/text-field` grows 10 B against the merged `main`,** where the implementer's reading at the base had it fall 40 B. `text-field` imports neither the list nor drag. `collect-props.ts` gives every private property a short name from one list, and the unit adds two names and moves two, so other sheets' mangled names change. The rows that fall (`list/list`, the button and link items, the buttons) are the same shift. Whether property 6's _"only … grow"_ counts a shift of that kind is the architect's. The unit adds no byte to `text-field`.

## CI

`verify`, run [45871203621](https://github.com/ausginer/material-x/actions/runs/45871203621), `pull_request`, on `5e188e4b3`: **success**, with `records` and `deploy` skipped ([lines](checks/ci.txt)). It ran the whole suite, so the `[noci]` subjects of the head commits didn't reduce it. In its `firefox` and `webkit` jobs each affected file passes: `sortable-list.browser` 190 of 202, with 12 Chromium-only rows skipped, the list's other browser and spec files, `ripple`, `slotted-content`, `aria-own-value` and `elevation.spec`. `axe` is Chromium's. Its `chromium` job passes all of them, with the two node files. The earlier run on `5448c4fd6`, 45870083434, was cancelled. No commit before it has a run.

## Verification of this report

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and the relative links checked against the files with a script. Lint doesn't apply to Markdown. The program restores every file it touches after each run. `git status` was clean after each engine, and drag's built `layout-animation.js`, which git ignores, has its preference test again. After the size readings, the package was rebuilt from the head.