# Storybook stories for `@ydinjs/box-quad`

**Status:** implemented on 2026-11-22 at `97b789f54` ([record](plan.md#record)). It was settled first. The owner answered the three questions on 2026-11-22 with the recommended option of each ([§4](#4-owners-answers)). The decisions are registered as `BQ-13` to `BQ-18` in [`plan.md`](plan.md)'s ledger, where they're the record, and this plan holds their required properties. [§9](#9-revisions) lists what each revision changed. **Amended on 2026-11-22 by [§10](#10-the-sliders-move-into-the-stories):** the stories are slow because every arg change re-renders Storybook's manager, and their sliders move into the stories. That amendment is settled, and it is implemented at `64c1d4459` ([record](plan.md#record)). The owner answered `SB-Q4` A on 2026-11-22, and the main slot's architect registered `SB-D8` as `BQ-19` and `BQ-20` and `SB-D9` as `BQ-21`, which supersede `BQ-14`, `BQ-16` and `BQ-18` ([record](plan.md#record)).

- **Read at** `origin/main` `4fd8b9a67`, after the 1.0.0 release reading (#147).
- **Written by** the architect in slot `b`, on `box-quad/storybook-1`. An architect outside the main slot proposes and doesn't record ([agent workflow](../../../.agents/docs/agent-workflow.md#parallel-units)). So the first revision gave local names: decisions `SB-D1` to `SB-D7` and owner questions `SB-Q1` to `SB-Q3`. **Registered by** the main slot's architect on 2026-11-22, in slot `b` on the coordinator's request: `SB-D1` to `SB-D6` are `BQ-13` to `BQ-18`, in that order. `SB-D7` applies `repo:RD-32` and is not a decision of its own (§3, last section). The questions keep their local names, because box-quad's register has no question series.
- **Input:** the owner's request, relayed by the coordinator on 2026-11-22. box-quad 1.0.0 is released, and he wants Storybook stories for it, starting with a reproduction of the live demo of [getBoxQuadsPolyfill](https://jogibear9988.github.io/getBoxQuadsPolyfill#live-demo) (MIT, Copyright (c) 2024 Jochen Kühner).
- **The demo's source** was read at [`jogibear9988/getBoxQuadsPolyfill`](https://github.com/jogibear9988/getBoxQuadsPolyfill) commit `c3e766291` (2026-11-16): `index.html`'s `#live-demo` section, `site.js` and `site.css`. The deployed page wasn't opened.
- **Governing records:**
  - box-quad's [`README.md`](../README.md) and [contract](contract/00-index.md), in particular [artifact 1](contract/01-public-api.md);
  - `BQ-6` (the cache is removed) and `BQ-12` (the API in force), in [`plan.md`](plan.md);
  - `repo:RD-14` (the docs site and its smoke check);
  - [test architecture](../../../.agents/docs/test-architecture.md) (Storybook isn't a test runtime);
  - CONTRIBUTING's _Dependencies of a published package_;
  - [releasing](../../../.agents/docs/releasing.md) (the tarball holds nothing under `src/`).
- **Evidence:** [`probes/storybook-demo/`](probes/storybook-demo/). [`native-parity.ts`](probes/storybook-demo/native-parity.ts) compares box-quad's read with Firefox 159's native `getBoxQuads()` on the demo's geometry, and [`zoom-diagnosis.ts`](probes/storybook-demo/zoom-diagnosis.ts) separates ancestor zoom, rotation and scroll. Their output is in the `.txt` file beside each. Both load the package's built `index.js`, built from `origin/main` `4fd8b9a67`.

## 1. What the demo does

- **The stage** is a `position: relative` box with `padding: 28px`, `overflow: hidden` and no border. It holds a backplate grid, a `relativeTo: demo stage` badge, a stack, and an SVG overlay at `inset: 0`.
- **The stack** holds two absolutely positioned cards.
  - The _Ancestor_ card is at `left: 90px; top: 110px`, `300 × 200`, with a `2px` border.
  - The _Target node_ is at `left: 170px; top: 146px`, `220 × 120` content, with `padding: 20px 28px`, an `8px` border, `transform-origin: center`, and `transform: rotate(Rdeg) skewX(Sdeg)`.
  - **The two are siblings, not parent and child:** the _Ancestor_ card overlaps the target and doesn't contain it. Nothing between the target and the stage is transformed.
- **Controls:**
  - _Rotation_ from −55 to 55, default −18;
  - _Skew_ from −20 to 20, default 8;
  - _Box_: `margin`, `border`, `padding` or `content`, default `border`;
  - a cache toggle, which calls the polyfill's `useCache()` and `clearCache()`.
- **The read:** `target.getBoxQuads({ box, relativeTo: stage })` after every input and window resize. The first quad is drawn as a dashed polygon with a circle of radius 5 at each corner. The overlay's `viewBox` is the stage's client size.
- **The readout:**
  - _Mode_ says whether a native `getBoxQuads` existed before the polyfill was installed;
  - _Quads_ is the number of quads returned;
  - _First point_ is p1 to one decimal;
  - _Quad points_ lists p1 to p4 to two decimals.
- **Not in the demo:** iframes, the `convert*FromNode` methods, transformed ancestors, zoom and scrolling.

## 2. How the demo maps to box-quad

box-quad isn't a `getBoxQuads()` polyfill and never calls the native one (README). It measures the border box only, gives one quad or `false`, and keeps no cache (`BQ-6`).

| The demo | box-quad |
| --- | --- |
| `getBoxQuads({ box: 'border', relativeTo: stage })` | `coordinates(target, t)`, `coordinates(stage, s)`, `projection(t, quad, s)` |
| The quads array, and _Quads_ | One `Quad`, or `false` from the read |
| p1 to p4 | The same four corners in the same order: p1 is the local origin, p2 is along local x, p3 is opposite p1, and p4 is along local y |
| _Box_ select | No equivalent: border box only (`BQ-15`) |
| Cache toggle | No equivalent: the cache is removed (`BQ-6`) |
| _Mode_, native or polyfill | No equivalent: box-quad never calls the native read |
| `convertQuadFromNode` | `projection` of one element's `Box` into another's space, which is what the demo already does |
| `convertPointFromNode`, `convertRectFromNode` | No function: a `Box` holds the matrix, and the consumer applies it |

**The probe confirms the first row** ([`native-parity.txt`](probes/storybook-demo/native-parity.txt)). In Firefox 159 with `layout.css.getBoxQuads.enabled`, box-quad's read and the native read agree at the defaults and at the sliders' extremes:

- p1 to p4 are in the same order;
- the largest difference is `0.0153 px`, under Firefox's layout unit of 1/60 px;
- at rotation 0 and skew 0 the two are equal.

**Ancestor rotation and scroll keep that agreement, and ancestor zoom doesn't** ([`zoom-diagnosis.txt`](probes/storybook-demo/zoom-diagnosis.txt)). With the stage and the target both inside `zoom: 1.25`:

- box-quad's values are unchanged, in the stage's own CSS pixels;
- Firefox's native values are 1.25 times larger.

The live demo has no zoom, so the reproduction is unaffected. §8 lists the difference.

## 3. Decisions

Each section's heading ends with the decision's address in the ledger.

### The stories live in `packages/box-quad/src` and need no Storybook configuration change: `BQ-13`

- **Files:**
  - `packages/box-quad/src/box-quad.stories.tsx`, with `title: 'Box Quad'` and one export per story;
  - `packages/box-quad/src/stories.module.css`, as `packages/drag/src` has.
- **The stories import the source,** `./index.ts`, as drag's stories import theirs. So the stories exercise what the tests exercise, with no build step.
- **The shared Storybook already collects them.** `.storybook/main.ts` adds one specifier for each package that has a `src` directory. The docs build and `docs-smoke` then load every story ([`BQ-18`](#verification-typecheck-lint-the-docs-smoke-check-and-a-recorded-reading-bq-18)).
- **Nothing published changes:**
  - `files.json`'s only runtime entry is `index`, so tsdown doesn't build the stories;
  - the manifest's `files` doesn't list them;
  - the release workflow's tarball check rejects any path under `src/`;
  - `typedoc.json`'s only entry point is `src/index.ts`;
  - `createBoxQuadTestConfig` includes `tests/**` only.

  So no version, changelog section or size row changes.

- **Dependencies:** `react`, `react-dom`, `@types/react` and `@types/react-dom` go in box-quad's `devDependencies`, at the versions drag pins. The stories are unpublished files, so CONTRIBUTING's first question places them there. Storybook itself stays in the root's `devDependencies`, as for drag.
- **Typecheck and lint already cover the stories,** because box-quad's `tsconfig.json` includes `src/**/*` and `../../types.d.ts`, which declares `*.module.css`.

### _Live Demo_ reproduces the demo's scenario and its readings: `BQ-14`

**Required properties:**

- **The geometry is the demo's:** the stage, the stack and both cards as §1 gives them. The target's `transform` is `rotate(Rdeg) skewX(Sdeg)` from the story's args.
- **Args:** `rotation` is a range from −55 to 55, default −18, and `skew` is a range from −20 to 20, default 8, both in steps of 1. They are Storybook args, as drag's stories use, so the values show in the controls panel and in the URL.
- **The read** is `coordinates(target, t) && coordinates(stage, s) && projection(t, quad, s)` with storage the story owns.
- **The overlay's user space is the stage's border-box space:** its origin is the stage's border-box top-left corner, and one user unit is one CSS pixel of the stage. With no border on the stage, as in the demo, an SVG at `inset: 0` with no `viewBox` meets this.
- **The overlay always matches the target.** It is redrawn after every arg change and every resize of the stage, before the next frame paints, so the polygon never lags the transform.
- **The readout:**
  - _Read_ shows the read's result, `true` or `false`;
  - _First point_ is p1 to one decimal;
  - _Quad points_ lists `p1: (x, y)` to `p4` to two decimals.

  When the read returns `false`, the overlay is empty and the points show `-`. The demo's sliders can't produce `false`, so _Read_ shows `true` in this story. _Failed Reads_ shows `false` (`BQ-16`).

- **The story's description** says that the values are CSS pixels in the stage's untransformed border-box space, and that the stage's scroll position doesn't change them. It gives the credit of `BQ-17`.
- **Theme and width:** colours come from the preview's `--md-sys-color-*` tokens, so the story reads in the light and the dark theme. The stage keeps its fixed geometry. A container narrower than the stage scrolls horizontally, and that scroll doesn't change the relative read.

### What replaces the demo's controls that box-quad has no counterpart for: `BQ-15`

- **The _Box_ select is left out,** by the owner's answer to `SB-Q1`, and the story says that box-quad measures the border box only.
- **The cache toggle is left out.** box-quad has no cache since `BQ-6`. The nearest member is `coordinates`'s `above`, which reuses a `Space` the caller already holds. A toggle for it would change nothing visible, as the demo's cache toggle doesn't, so the story shows nothing for it.
- **_Mode_ is replaced by _Read_.** box-quad never calls the native read, so there is no mode to report. The read's boolean is the API's one outcome, and it is what a consumer checks.
- **_Quads_ is folded into _Read_.** box-quad gives one quad or none.

### Three more stories cover what the demo omits: `BQ-16`

All three are in this unit, by the owner's answer to `SB-Q3`. Each follows `BQ-14`'s rules for args, theme and redrawing.

- **_Nested Spaces_: a read through transformed, zoomed and scrolled ancestors.**
  - An untransformed story root holds the overlay and an ancestor with `rotate` and `zoom` from args. Inside the ancestor is a scroll container, and inside the scroll container is the target with its own rotation.
  - The read projects the target into the root's space, so the whole chain lies between them.
  - **Required property:** the polygon stays on the target's border at any arg value, and while the scroll container scrolls. It is redrawn on the scroll container's `scroll` event too.
  - The description says that a target scrolled out of sight still has a quad, because box-quad doesn't clip. The overlay then draws outside the scroll container.
- **_Pointer Delta_: README's second example.**
  - A box inside an ancestor with `rotate` and `zoom` from args is dragged with the pointer, through `ancestry` and `localDelta`, writing `translate`.
  - **Required property:** the box stays under the pointer while it is dragged, at any rotation and zoom.
  - `@ydinjs/drag` uses box-quad internally. This story shows box-quad's own API, with no controller.
- **_Failed Reads_: the boolean contract.**
  - Three targets whose read returns `false`, each shown with its _Read_ value, and a fourth whose read succeeds, for contrast:
    - an element under a 3D transform, such as `rotateX(40deg)`;
    - an inline element split across two lines;
    - an element with `display: none`.
  - **Required property:** each `false` read draws no overlay. The description says that a `false` read leaves the caller's storage untouched.
- **No iframe story.** Storybook renders every story inside an iframe already, so each story reads within one iframe's document, which is what box-quad supports. A read across two documents breaks a precondition, and a story shouldn't show it as working.
- **No `convert*FromNode` story.** `projection` between two elements is `convertQuadFromNode`, and _Live Demo_ and _Nested Spaces_ show it. box-quad has no point or rect function (§2).

### Nothing is copied from the demo, and the stories credit it: `BQ-17`

This is the owner's answer to `SB-Q2`.

- **What the reproduction takes is the scenario:** the cards' positions and sizes, the target's padding, border and transform, the sliders' ranges and defaults, and what the readout reports. These are the demo's numbers and behaviour, not its text.
- **What it doesn't take:** the demo's markup, CSS and JavaScript. The story is written for box-quad's API in React, styled with the preview's tokens.
- **The credit** goes in _Live Demo_'s description, where the docs page shows it, and in the stories file's module comment: _"Reproduces the [live demo](https://jogibear9988.github.io/getBoxQuadsPolyfill#live-demo) of getBoxQuadsPolyfill by Jochen Kühner (MIT)."_
- **No license notice is owed,** because no demo text is copied. Copying any would need the demo's MIT notice in the file that holds the copy, and that is outside this decision (§7).

### Verification: typecheck, lint, the docs smoke check, and a recorded reading: `BQ-18`

- **No permanent test.** The test architecture excludes Storybook as a test runtime. The numbers come from box-quad's tested functions (`tests/projection.browser.test.ts` and the others), and the story code only draws them.
- **Every change:** `aube exec just typecheck` and `aube exec just lint` in `packages/box-quad`, per the handoff.
- **The docs build:** `aube exec just docs-build` and `aube exec just docs-smoke` at the root. The smoke check loads every story in Chromium and fails on any exception, console error or render error (`repo:RD-14`). The `verify` workflow's `docs` job runs both in `full` mode, which a `.tsx` change always triggers.
- **One reading, recorded under `probes/storybook-demo/` with its script:**
  - **Firefox, with `layout.css.getBoxQuads.enabled`:** _Live Demo_'s overlay corners, read through the SVG's `getScreenCTM()`, agree with the target's native `getBoxQuads()` within 0.02 px. Read at the defaults and at the four slider extremes, as `native-parity.ts` does for the read alone. That witness fails if the overlay's user space is offset from the stage's border box.
  - **Chromium and WebKit:** at rotation 0 and skew 0, _Live Demo_'s overlay corners equal the target's `getBoundingClientRect()` corners.
  - **A screenshot of each story** in the light and the dark theme, in Chromium.
  - **_Pointer Delta_:** a drag scripted with Playwright's mouse at a rotated and zoomed arg set ends with the box's centre under the pointer, within 1 px.

### The unit is one pull request on `box-quad/storybook-1`

This section was `SB-D7`. It applies `repo:RD-32` and isn't registered as a decision of its own. The plan and its implementation share the branch. The pull request opens after the implementation is pushed. Adding a link to the stories in box-quad's README isn't part of this unit: the README ships in the tarball, so a link there waits for the next release and a decision of its own.

## 4. Owner's answers

The owner answered on 2026-11-22, in chat, relayed by the coordinator: **`SB-Q1` A, `SB-Q2` A and `SB-Q3` A.** The options he didn't choose stay below as they were offered.

### SB-Q1 — Does _Live Demo_ reproduce the _Box_ select?

- **A (recommended, chosen): no.** The story says that box-quad measures the border box only. box-quad offers no box option (README, _What is supported_). A story that offers one would suggest a feature the package doesn't have.
- **B: yes, derived in the story.** The padding, content and margin boxes are the border box's local rectangle inset or outset by the computed `border-*-width`, `padding-*` and `margin-*`, mapped through the `Box`'s matrix. That arithmetic would live in a story with no test, and it would need its own reading under `zoom` and with `auto` margins.

### SB-Q2 — Is anything copied from the demo?

- **A (recommended, chosen): nothing.** The reproduction takes the scenario and is written for box-quad (`BQ-17`). The credit is a courtesy and a pointer, and no license notice is owed.
- **B: the demo's markup and CSS, adapted.** The file that holds the copy then carries the demo's MIT notice. The demo's colours and fonts don't follow the preview's theme, so they would be replaced anyway.

### SB-Q3 — Which stories does this unit add?

- **A (recommended, chosen): _Live Demo_, _Nested Spaces_, _Pointer Delta_ and _Failed Reads_** (`BQ-14`, `BQ-16`). Together they show each function and its `false` path.
- **B: _Live Demo_ and _Nested Spaces_.** The pointer delta and the failed reads come later or not at all.
- **C: _Live Demo_ only.**

## 5. Size

- **Published bytes don't change** (`BQ-13`): no entry, export or shipped file is added. No size row is read.
- **Estimate of what lands,** for the four stories: one stories file of about 350 to 450 lines and one CSS module of about 120 lines. The probes add nothing beyond what this plan commits.

## 6. Implementation steps

1. **Done 2026-11-22:** the owner answered `SB-Q1` to `SB-Q3`, and the main slot's architect registered `BQ-13` to `BQ-18`. No answer changed a decision.
2. `aube add -D` the four packages of `BQ-13` in `packages/box-quad`, at drag's versions.
3. _Live Demo_ (`BQ-14`, `BQ-15`, `BQ-17`), then _Nested Spaces_, _Pointer Delta_ and _Failed Reads_ (`BQ-16`).
4. `BQ-18`'s checks, and its reading saved under `probes/storybook-demo/` with the script that took it.
5. A dated paragraph in [`plan.md`](plan.md)'s record that names the commit and the reading, and marks `BQ-13` to `BQ-18` implemented.
6. Push, and open the pull request with `Refs` to the work-queue item the coordinator names.

## 7. Not adopted

- **In-canvas sliders and a select, as the demo has them.** Storybook args show the same controls, put the state in the URL, and match drag's stories. _§10 reverses this for the sliders (`SB-D8`): with args, each step of a dragged slider re-renders the manager._
- **A comparison with the native `getBoxQuads()` in the story.** Only Firefox has it, and only behind a preference. box-quad doesn't call it, and the story would report the browser, not the package. The recorded reading of `BQ-18` makes that comparison once.
- **An MDX page for box-quad.** The README and the API reference already document the package. Each story's description carries what that story needs.
- **A shadow-tree variant of _Nested Spaces_.** box-quad supports shadow trees and its tests cover them. It can be added later as an arg.
- **One stories file per story.** box-quad is one module with four functions, and drag splits its stories by module.
- **A _Box_ select derived in the story** (`SB-Q1` B). The owner chose A.
- **The demo's markup and CSS, adapted, under its MIT notice** (`SB-Q2` B). The owner chose A.
- **Fewer stories in this unit** (`SB-Q3` B and C). The owner chose A.

## 8. Not established

- **Real Safari:** not read. WebKit is Playwright's build.
- **The deployed demo page:** not opened. The demo was read from its source at `c3e766291`.
- **Zoom:** whether box-quad's or Firefox's native units under ancestor `zoom` are the ones the specification intends. box-quad's are its contract's, and its tests cover them. The stories don't depend on it: _Live Demo_ has no zoom, and _Nested Spaces_ reads relative to an unzoomed root.
- **The size estimate** is the architect's estimate, not a measurement.

## 9. Revisions

- **2026-11-22, first revision:** the first plan, with `SB-D1` to `SB-D7` and `SB-Q1` to `SB-Q3`, at `a26a111c1`.
- **2026-11-22, this revision, by the main slot's architect:** the owner's answers, all A, and the registration of `SB-D1` to `SB-D6` as `BQ-13` to `BQ-18`. The status, §3's headings and the text that said _pending_ or _recommends_, §4's title, §5's estimate, §6's steps and §7's list changed. No required property changed. §3's third, fourth and fifth sections said _"pending `SB-Q1`"_, _"pending `SB-Q3`"_ and _"pending `SB-Q2`"_, with the architect's recommendation. The fifth also said what MIT would require if demo text were copied. §5 also estimated about 150 and 60 lines for `SB-Q3` C. §8 doesn't change.
- **2026-11-22, the amendment, by the architect in slot `b`, on `box-quad/storybook-2`:** [§10](#10-the-sliders-move-into-the-stories) and the status line were added. §7's first entry was annotated. It isn't deleted, because §10 cites it. Nothing else in §1 to §9 changed. `BQ-13` to `BQ-18` stay as registered until the main slot's architect registers `SB-D8` and `SB-D9`.
- **2026-11-22, the registration of §10, by the main slot's architect:** the owner's answer `SB-Q4` A, and `SB-D8` and `SB-D9` registered as `BQ-19` to `BQ-21`. The status line, §10.3's two headings and §10.4's title changed, and §10.4 gained the answer. No required property changed. The headings said _"(`SB-D8`, amends `BQ-14` and `BQ-16`)"_ and _"(`SB-D9`, amends `BQ-18`)"_, §10.4's title said _"Owner's question"_, and the status line said that the amendment proposes the two decisions and asks `SB-Q4`.
- **2026-11-22, §10 implemented, by the implementer:** the status line says that §10 is implemented at `64c1d4459`. It said _"That amendment is settled and not yet implemented."_

## 10. The sliders move into the stories

**Input:** the owner's report on 2026-11-22, relayed by the coordinator for work-queue item #169. He found the stories _"hellishly slow"_, and thought Storybook rather than box-quad was the cause. His suggestion was to put the sliders in the page instead of Storybook's controls. His DevTools trace of a _Live Demo_ slider drag is the evidence. He read its flame graph and found only `sb-manager` frames and no box-quad function.

- **Read at** `origin/main` `23b245efb`, which holds #159's stories unchanged.
- **Written by** the architect in slot `b`, on `box-quad/storybook-2`. As in the first revision, this slot proposes and doesn't record. The decisions have local names `SB-D8` and `SB-D9`, and the question is `SB-Q4`. The main slot's architect registers them.
- **Evidence,** all in [`probes/storybook-demo/`](probes/storybook-demo/):
  - [`trace-attribution.ts`](probes/storybook-demo/trace-attribution.ts) reads the owner's trace, with its output in [`trace-attribution.txt`](probes/storybook-demo/trace-attribution.txt). The 66 MB trace isn't tracked. It is `packages/box-quad/.plan/storybook-perf-trace.json` in the main checkout.
  - [`controls-cost.ts`](probes/storybook-demo/controls-cost.ts) is the reproduction, with its output in [`controls-cost.txt`](probes/storybook-demo/controls-cost.txt).

### 10.1 What the owner's trace shows

The trace holds two same-origin frames in one renderer process: the manager page at `?path=/story/box-quad--live-demo` and its preview iframe. The owner dragged the _Rotation_ range in the Controls panel.

- **The longest task, 582 ms, is the recording itself:** 579 ms of it is `CpuProfiler::StartProfiling`, before the drag.
- **The drag** produced five `input` events. Over the following second the main thread was busy for 551 ms. Eleven tasks were longer than a 60 Hz frame, 338 ms in all, and the longest took 48 ms.
- **Script time by frame,** from the `FunctionCall` events:

  | Frame   | Script                                           |     Time |
  | ------- | ------------------------------------------------ | -------: |
  | Manager | `sb-manager/globals-runtime.js`                  | 373.7 ms |
  | Manager | everything else                                  |   2.8 ms |
  | Preview | Storybook, React and the preview's other scripts |   8.3 ms |
  | Preview | `box-quad.stories.tsx`                           |   0.7 ms |

- **CPU samples in the same window:** 362 ms manager, 26 ms preview, 1.6 ms box-quad, 49 ms garbage collection.
- **Where the manager's time goes:** `globals-runtime.js` is the manager's bundled React and emotion. Its hottest named frames are emotion's style serialisation (`serializeStyles`, `handleInterpolation`, `insertStyles`), and the rest are minified React frames.

**The owner's reading is confirmed.** The time is in the manager frame. The preview and box-quad together take about 2 % of the script time.

### 10.2 The reproduction

`controls-cost.ts` changes _Live Demo_'s `rotation` 60 times, one change per frame. It profiles the renderer and attributes each sample to the manager, the preview or box-quad by the URL of its nearest script frame. It also counts the transforms the target actually got. The reading is from a Storybook dev server in slot `b`, run in headless Chromium in the development container. So the absolute times are that machine's, and the ratios between rows are what the reading shows. The ranges below cover the three committed runs.

| Scenario | Wall time | Manager | Preview | box-quad |
| --- | --: | --: | --: | --: |
| Controls panel's range, dragged | 7.5–8.0 s | 6.1–6.5 s | 374–446 ms | 34–40 ms |
| The same, sidebar hidden (`&nav=false`) | 3.6–4.2 s | 2.7–3.1 s | 389–463 ms | 33–39 ms |
| `updateStoryArgs` from the manager, no pointer | 2.1–2.5 s | 1.4–1.9 s | 350–464 ms | 32–43 ms |
| The same, panel hidden (`&panel=false`) | 2.9–3.3 s | 2.3–2.7 s | 357–367 ms | 33–41 ms |
| The same, sidebar hidden | 1.6–1.8 s | 1.0–1.2 s | 352–391 ms | 29–39 ms |
| `updateStoryArgs` in `iframe.html`, no manager | 1.0 s | — | 286–346 ms | 32–39 ms |
| **A range in the story, dragged on the manager page** | **2.0 s** | **3.6–8.6 ms** | **114–171 ms** | **50–63 ms** |
| The transform written and the read repeated by hand | 1.0 s | — | 1–4 ms | 15–21 ms |

How to read the table:

- **The Controls drag costs the manager 100 to 110 ms per change** on this machine, and the main thread is idle for under 1 % of the drag. The owner's trace has the same split between the frames: manager to preview is about 14 to 1 in both. In the trace that is about 70 ms of manager script per `input` event.
- **Every arg change re-renders the manager,** whichever way the change arrives. The pointer isn't the cause: an `updateStoryArgs` emitted with no pointer still costs 17 to 45 ms of manager time. Each change also makes the manager replace its URL once, to write `&args=`. A `history.replaceState` hook in the manager page showed it, called from the manager's router.
- **Most of that time is the sidebar tree.** The hottest named manager frames are the tree's node (`Node2`), `getSidebarVisibleStatus`, `useContextMenu`, `withStatusColor`, `CollapseIcon2` and polished's colour functions. Hiding the sidebar roughly halves the drag's cost. Hiding the panel doesn't reduce it, and the Controls table's own components take a few milliseconds over all 60 changes.
- **The preview and box-quad aren't the problem.** Storybook's args path inside the preview costs about 5 to 6 ms per change, including React's development build. box-quad's read and redraw cost about 1 ms per change or less in every scenario.
- **A range inside the story removes the manager's cost.** Over 59 transforms its total manager time is 4 to 9 ms, and the main thread is idle for three quarters of the drag. That row's 2.0 s is the probe's own pace: Playwright's input round trip into the iframe plus one frame per step. The row was taken with a temporary prototype story that wraps _Live Demo_'s own view. `controls-cost.txt` gives its source, and it was deleted afterwards.

The preview's theme decorator calls `top.history.replaceState` on every story render, so twice per arg change. A replace dispatches no event and the manager doesn't re-render for it. With `&theme=dark` the theme survived every arg change. So the decorator isn't a cause, and this amendment leaves it alone.

### 10.3 Decisions

#### The sliders are in the stories, and no story takes Storybook args: `BQ-19` and `BQ-20`

It replaces `BQ-14`'s _Args_ property, its _"redrawn after every arg change"_, and `BQ-16`'s _"follows `BQ-14`'s rules for args"_.

**Required properties:**

- **Each slider is a native `<input type="range">` rendered by the story,** with a visible label and the current value beside it. Its `name` is the former arg's name. Its minimum, maximum, step and initial value are the former `argTypes` and `args`:
  - _Live Demo_: `rotation` and `skew`;
  - _Nested Spaces_: `ancestorRotation`, `ancestorZoom` and `targetRotation`;
  - _Pointer Delta_: `ancestorRotation` and `ancestorZoom`.

  _Failed Reads_ has no slider and doesn't change.

- **A slider changes only the story's own state.** The value is state of the story's view. Changing it calls no Storybook API: no `args` or `argTypes` on the story, no `useArgs`, no `updateArgs`, and no channel event. So the manager doesn't learn of the change, and it doesn't re-render.
- **The overlay and the readout follow every change before the next frame paints,** as `BQ-14` requires for arg changes today. The view's layout effect, keyed on the values, already does this.
- **The sliders sit outside the geometry they control.** They aren't inside the stage, the rotated ancestor or the scroll container. So they don't move the target or the stage relative to each other, and they aren't transformed with them.
- **Theme and keyboard:** the sliders take their colours from the preview's `--md-sys-color-*` tokens, as the stage does, and the native range keeps its keyboard behaviour.
- **The descriptions** of _Live Demo_, _Nested Spaces_ and _Pointer Delta_ stop referring to args or the Controls panel. Each says what its sliders change.
- **No args remain,** so the Controls panel is empty for box-quad's stories and the docs page has no controls table. `SB-Q4` B is the alternative.

**Why:** §10.2's rows. A dragged slider changes its value about 60 times a second. Through args, each change costs the manager 17 to 110 ms on the probe's machine, so the drag can't keep up. Inside the story the manager's cost is under 0.2 ms per change. A preview-side fix can't remove the manager's re-render, because it happens in the manager.

#### What the stories' reading measures: `BQ-21`

- **`controls-cost.ts` is the before-and-after witness of `SB-D8`.**
  - **Before:** the rows in `controls-cost.txt`. The implementer runs the script once more before changing the stories, so the before and after readings come from one machine.
  - **After:** run against the implemented stories. The script then skips the two Controls rows and the three `updateStoryArgs` rows, and reads `in-story range` on _Live Demo_ itself, with no `MX_IN_STORY`.
  - **Passes when** `in-story range` shows 59 transforms, under 60 ms of manager time for the 60 changes (1 ms per change), and a main thread idle for more than half of the drag's wall time. The prototype's row meets all three, at 4 to 9 ms and 74 to 81 % idle. The Controls drag fails the second and the third, at 6.1 to 6.5 s and under 1 % idle.
- **`stories-reading.ts` sets values through the sliders, not through `&args=` URLs.** It sets the range's value and dispatches `input`, or uses the keyboard. Its witnesses and tolerances don't change: the Firefox overlay parity at the defaults and the four extremes, the Chromium and WebKit `getBoundingClientRect()` corners at rotation 0 and skew 0, and the _Pointer Delta_ drag within 1 px.
- **The screenshots are retaken,** because the sliders change each story's layout.
- **Typecheck, lint, `docs-build` and `docs-smoke`** stay as `BQ-18` gives them.

### 10.4 Owner's answer

#### Do the stories keep Storybook args as their initial values? (`SB-Q4`)

**Answered on 2026-11-22: A,** relayed by the coordinator: _"it's mostly a dynamic demonstration anyway"_ (in translation).

- **A (recommended): no.** The sliders' initial values are the demo's defaults, written in the story. There is one source of truth, and the Controls panel and the docs page show nothing that could disagree with the sliders. What is lost: a URL can't open a story at an arg set (`&args=rotation:30`). Only `stories-reading.ts` used that, and `SB-D9` moves it to the sliders.
- **B: yes, hidden.** Each story keeps its `args` as the sliders' initial values and hides them from the Controls panel. The view remounts when the args change, so a URL with `&args=` still opens the story at those values. The cost is a mechanism that nothing visible shows, and a fact this plan hasn't established: whether Storybook still applies URL args to an arg that the panel hides. `stories-reading.ts` could then keep its URLs.

### 10.5 Implementation steps

1. The owner answers `SB-Q4`, and the main slot's architect registers `SB-D8` and `SB-D9`.
2. **Before:** `node packages/box-quad/.plan/probes/storybook-demo/controls-cost.ts <origin>` against a dev server of the unchanged stories. Append the output to `controls-cost.txt` under a dated heading.
3. **The stories:**
   - one labelled range component in `box-quad.stories.tsx`, shared by the three stories;
   - each view holds its values in React state with the former defaults;
   - `args`, `argTypes` and the `render` arguments go;
   - the descriptions change as `SB-D8` requires;
   - a controls row goes in `stories.module.css`.
4. **The reading:** `stories-reading.ts` sets values through the sliders. Rerun it, and replace its output and screenshots.
5. **After:** `controls-cost.ts` against the implemented stories, appended under its own dated heading, with `SB-D9`'s pass condition checked against it.
6. **The checks:** `aube exec just typecheck` and `aube exec just lint` in `packages/box-quad`, then `aube exec just docs-build` and `aube exec just docs-smoke` at the root.
7. A dated paragraph in [`plan.md`](plan.md)'s record that names the commit and both readings.
8. Push `box-quad/storybook-2`, and open the pull request with `Refs #169`.

### 10.6 Size

- **Published bytes don't change** (`BQ-13`): only `src/box-quad.stories.tsx`, `src/stories.module.css` and the probes change.
- **Estimate:** about 40 lines added and 35 removed in the stories file, about 25 lines of CSS, and about 30 changed lines in `stories-reading.ts`. This is an estimate, not a measurement.

### 10.7 Not adopted

- **Throttling or skipping box-quad's reads.** They cost about 1 ms per change or less in every scenario, so there is nothing to save.
- **Fewer re-renders in the preview on arg updates.** Storybook's args path inside the preview is about 5 to 6 ms per change. The manager's re-render is the cost, and the preview can't prevent it.
- **Throttling the arg updates,** with a custom control or a debounced `updateArgs`. Every update still re-renders the manager for 17 to 110 ms, so the slider would step visibly, and the story would carry a manager-facing mechanism.
- **Hiding the sidebar for these stories.** It halves the cost, which leaves about 50 ms per change. It would also take the sidebar away from the reader.
- **Number fields in the Controls panel instead of ranges.** A typed value pays the manager's cost once, which is acceptable. But a number field is no reproduction of the demo's sliders, and it leaves the drag unfixed.
- **Writing the transform imperatively instead of through React state.** In the preview, that path costs about 0.3 ms per change against React state's 3 to 4 ms in the development build, and both fit in a frame. React state keeps the view declarative, and its layout effect already meets `BQ-14`'s redraw rule.
- **A Storybook upgrade or an upstream report** as this unit's fix. The manager's re-render on each arg update is Storybook's behaviour, and the fix doesn't depend on it changing.

### 10.8 Not established

- **Why the pointer path costs three to five times the channel path** in the manager. The profile doesn't separate the range's own handling from the re-render that follows. `SB-D8` removes both.
- **Real browsers and GPU rendering:** the reproduction is headless Chromium with software rendering. The owner's trace, from his browser, has the same ratio between the manager and the preview.
- **A built site:** the reproduction is a dev server, as the owner's trace is. The manager's bundle is prebuilt, so it is the same in a built site. The preview's React is the development build here, so the preview costs less in a built site.
- **Other stories:** no other story in the repository has a range control. Any arg change elsewhere also re-renders the manager, once per click or keystroke. Whether a repository rule for continuous controls is wanted is outside this unit.