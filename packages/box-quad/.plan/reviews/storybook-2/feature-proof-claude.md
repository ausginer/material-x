# Feature proof: box-quad's sliders inside the stories (#169, PR #177)

**Read at** `59967767a` on `box-quad/storybook-2`. The stories are at `64c1d4459`. The governing records are §10 of the [Storybook plan](../../storybook-plan.md) and `box-quad:BQ-13` to `BQ-21` in [`plan.md`](../../plan.md), with the owner's answer `SB-Q4` A, and the record entry _"the stories' sliders are inside the stories, and BQ-19 to BQ-21 are implemented"_. The merge base is `23b245efb`. `main` is at `fa056ff71`: its three later commits change nothing under `packages/box-quad`, `packages/core` or `.storybook`, and `git merge-tree` merges with no conflict. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task.

Everything ran in slot `b`, with Playwright's Chromium 158, Firefox 159 and WebKit 27.2 and Node 26.13.1.

**Verdict:** the change does what #169 asks. A dragged slider costs the manager nothing that could be observed, and every reading in the record reproduces. `BQ-21`'s acceptance passes. One defect needs a disposition before the merge: `reviewer-1`, where _Nested Spaces_' ancestor covers its own sliders at some values, in the three engines. `reviewer-2` and `reviewer-3` are Tier C.

**Scope:**

- **Rerun:** `aube install` (up to date), box-quad's `typecheck`, `lint` and `fmt-check`, the root `docs-build` and `docs-smoke` (112 of 112), `stories-reading.ts`, `slider-errors.ts`, the #159 proof's two error probes, and `controls-cost.ts` three times on a dev server of this tree ([reading](checks/implementer-probes-rerun.txt)).
- **This pass's probes:**
  - [`sliders-proof.ts`](probes/sliders-proof.ts), on the built site: every value of every slider, keys, pointer drag, the channel, names, docs mode, unmount and errors ([reading](checks/sliders-proof.txt));
  - [`manager-quiet.ts`](probes/manager-quiet.ts), on a dev server: what the manager does during a drag, with a control ([reading](checks/manager-quiet.txt));
  - [`layout.ts`](probes/layout.ts): widths 1000, 375 and 320 px ([reading](checks/layout.txt));
  - [`covered-drag.ts`](probes/covered-drag.ts): what covers a slider ([reading](checks/covered-drag.txt)).
- **Not covered:** real Safari, a screen reader, touch, GPU rendering, the manager's cost on a built site, and the docs page's _Show code_ blocks. The _before_ reading wasn't rerun, since no checkout of the old stories was made. The control in `manager-quiet.ts` stands in for it.

## The requirements

| Requirement | Holds | Evidence |
| --- | --- | --- |
| `BQ-19`, `BQ-20`: native labelled ranges with the value beside them, and the former names, ranges, steps and defaults | Yes | Compared with the old `argTypes`. All 750 keyboard steps over the seven sliders land on the expected value, and the shown text equals it each time |
| Accessible name and keyboard | Yes | Blink's accessibility tree names the sliders _Rotation_ and _Skew_ with their value, so the `<output>` isn't part of the name. Playwright's role query finds the same names in the three engines. Arrows, Page Up, Page Down, Home and End work in each |
| Colours from the tokens | Yes | `accent-color` is the theme's primary: read as `rgb(151, 217, 69)` in the dark theme, and seen in the light theme's screenshots. A theme switch keeps the slider values |
| Only the story's own state, no Storybook API | Yes | During a 40-move drag of each slider, in three engines: no manager channel event, no `history.replaceState`, and 0 to 2 manager DOM mutations. The control, 40 `updateStoryArgs` on the same page, makes 309 to 915 mutations and 38 to 80 `replaceState` calls. No channel event from the preview either. Storybook's shortcut keys on a focused slider don't reach the manager |
| No `args` or `argTypes`; docs page without a controls table | Yes | Grep of the stories. The docs page has 0 args tables, and the Controls panel shows Storybook's _This story has no controls_ |
| Overlay follows before the next frame paints | Yes | Read in the first `requestAnimationFrame` after each `input`: the worst miss between overlay and target bounds is 6.6e-3 px, in Firefox, over every value and the pointer drags of _Live Demo_ and _Nested Spaces_ |
| Sliders outside the geometry they control | In the DOM yes. On screen not at every value | `reviewer-1`. No slider or stage moves while any slider is set across its range, and no page scrolls sideways at 1000, 375 or 320 px |
| Docs mode with several stories | Yes | Nine ranges on one page, with _Live Demo_ rendered twice. Moving each changes one range and at most one overlay |
| Cleanup on unmount | Yes | Eight story switches in one preview: the live `ResizeObserver`s and the story's `scroll` listener return to each story's own count, in three engines |
| No `ResizeObserver` loop error, no console error | Yes | 0 page errors in `slider-errors.ts` and the #159 probes, and 0 page or console errors in `sliders-proof.ts`. On the dev server the only warnings come from Storybook's manager and from Firefox's own reporting. None is from the stories |
| `BQ-20`: _Pointer Delta_ at any rotation and zoom | Yes | Three drags in one visit, at 30/1.5, −150/0.5 and 95/2: at most 0.000 px |
| `BQ-21`: reading, screenshots, parity | Yes | Same digits as the committed output. The eight screenshots are byte-equal |
| `BQ-21`: `controls-cost.ts` | Yes | Three runs: 59 transforms each. The manager takes 8.1, 5.6 and 6.7 ms, under 60 ms. Idle is 1476 of 2016, 1513 of 1997 and 1494 of 2008 ms, 73 to 76 %. The record has 4.8 to 5.7 ms and 76 to 78 % |
| `BQ-13`, `BQ-15`, `BQ-17` | Unchanged | The diff touches two files under `src/`, neither published, and no manifest. The credit and the _Box_ text are unchanged |
| The PR description | Yes | Each number and claim matches the committed output. It says `Closes #169`, where the plan's §10.5 step 8 says `Refs #169`. [`handoff.md`](../../../../../.agents/docs/handoff.md) uses `Closes` when the item is completed, so this isn't a finding |

## Findings

### reviewer-1 — Tier A: _Nested Spaces_' ancestor covers its own sliders at low zoom and steep rotation

- **Current behavior / contract:** `BQ-19` says the sliders sit outside the geometry they control, and `BQ-20` applies `BQ-19`'s rules to _Nested Spaces_. The stage doesn't clip the ancestor and is painted above the controls row. The ancestor keeps its width while its height shrinks with `zoom`, so at 0.5 it is a 416 × 103 px strip that rotates out of the stage's top.
- **Why it is a problem:** where the ancestor covers a range, the pointer reaches the ancestor instead. At 1000 px the covered slider is _Target rotation_, whose thumb at its default value can be out of the pointer's reach. The keyboard still works, and so do other values. The overflow isn't new, but before this change it covered no control.
- **Evidence / reproduction:** at a 1000 px viewport, _Ancestor rotation_ 45 (End) and _Ancestor zoom_ 0.5 (Home):
  - the ancestor covers 43 to 56 % of the _Target rotation_ range ([screenshot](checks/covered-slider.png)). Dragging its thumb from −20 by 40 px leaves the value at −20 in Chromium, Firefox and WebKit, and `ArrowRight` then moves it to −19;
  - over 1456 pairs of rotation and zoom (zoom sampled every 0.1) with the other values at their defaults, that range is partly covered at 86 to 105 pairs and its thumb at 40 to 50;
  - at 1600 px, where the sliders share one row, _Ancestor rotation_ is the covered range, at 86 to 105 pairs and 43 to 56 % at worst. Its thumb isn't covered, because the thumb has moved to the far end;
  - the other stories aren't affected: _Pointer Delta_ and _Live Demo_ clip their stage.
- **Required property:** at every value of the story's sliders, each slider can be reached and dragged with the pointer.

### reviewer-2 — Tier C: the range's declared 200 px width never applies

- **Current behavior / contract:** `.range input` declares `flex: 0 1 200px`. The range renders at the engine's intrinsic width instead: 129 px in Chromium and WebKit and 160 px in Firefox, at 1000 px. At 375 px it is the same size, or 159 px in Firefox, and 80 px on the docs page. No requirement names a width.
- **Why it is a problem:** the stylesheet states a width that the stories don't have. _Pointer Delta_'s rotation, 360 steps, shares a travel of about 113 px in Chromium.
- **Evidence / reproduction:** [the reading's last section](checks/implementer-probes-rerun.txt): raising the basis to 400 px, or using `auto`, leaves each engine's width unchanged. `0 0 200px` gives 200 px.
- **Required property:** a width the stylesheet declares for the range is the width it has where there is room.

### reviewer-3 — Tier C: three statements in the record don't match what is committed

- **Current behavior / contract:** the record and the probe headers describe the committed readings.
  - `plan.md`: _"The other rows match §10.2's ranges, except `channel, sidebar hidden` at 737 ms of manager time"_. The controls drag's preview time is 454.1 ms against 374–446, and panel-hidden's is 405.5 ms against 357–367. Sidebar-hidden is also out in wall time (1.1 s against 1.6–1.8), preview (255.8 against 352–391) and box-quad (24.9 against 29–39). The repeated-by-hand row's preview time is 0.0 ms against 1–4.
  - `plan.md`: the registration at `8b99db9d4` _"was merged in before the record"_. The history is linear: `64c1d4459`'s parent is `8b99db9d4`, and there is no merge commit.
  - `stories-reading.ts`'s header still calls itself _"`BQ-18`'s reading"_. `BQ-18` is superseded by `BQ-21`.
- **Why it is a problem:** a later reader who compares readings would take the rows as equal, and would look for the witness under an inactive decision. No verdict depends on it: the manager column, which is the argument, matches as stated.
- **Evidence / reproduction:** `controls-cost.txt` under _"before, on the unchanged stories"_ against the plan's §10.2 table; `git log --graph`; `stories-reading.ts` line 2.
- **Required property:** each statement in the record agrees with the committed output and history it describes.

## Observation, not a finding

Each range's value is an `<output>`, so a polite live region in Blink's tree, beside the native slider's own announcement and the readout's. `BQ-19` doesn't speak to it, and no screen reader was run.

## Outcome

- **Findings:** `reviewer-1` (A), `reviewer-2` (C), `reviewer-3` (C). Nothing here needs a decision to be created, amended or superseded; whether `reviewer-1` is repaired in this pull request is the coordinator's and owner's call.
- **Queue:** no change proposed. #169's _redraws without visible lag_ is met, and the issue stays in progress until the pull request merges.