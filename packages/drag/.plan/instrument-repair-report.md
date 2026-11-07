# Instrument repair report

**Input:** `drag/production` at `c63ea2bae`, which carries [`instrument-repair-handoff.md`](instrument-repair-handoff.md). Its source is the same as `89995c27e`'s. **Governing records:** the handoff, and the last bullet of `DRD-23` in [`00-index.md`](00-index.md).

**Outcome: returned to the architect at item 1.** The repaired per-sample test selects the kernel by location, but the unmutated test fails in 3 of the 5 prescribed runs. The kernel figure is 16.11 to 16.64 B per move against `< 16`. Across all 11 runs on the repaired selection, the figure is 13.33 to 17.49 B per move and 6 runs fail. The handoff treats this as "a kernel figure for `DRO-7`, not something to fix here", and lists it first under §Return to the architect.

**Update, at the owner's authorization: the repair is committed.** The owner authorized committing the repaired test despite its recorded intermittent failures (§Committed repair). That authorization accepts no performance cost and resolves no measurement uncertainty. The threshold, the sampling interval, the scenario and the assertions are unchanged, and nothing under `src/` is changed. **Known failures:** the committed test fails intermittently on the unmodified source, in 3 of the 5 prescribed runs and 6 of all 11 recorded runs (§Item 1: unmutated runs). **Mutation sensitivity is still unverified:** M1, M2, the M1 run against `ff69cb8d7`'s test, and M3 weren't run. Item 2 wasn't run either. No cost is accepted, no ceiling or control is re-based, no `compare.ts` comparison or `--prove` run was made, and no browser was launched for `compare.ts`.

| Commit | Content |
| --- | --- |
| `70bf1a7ed`, `c3794392d` | This report as first returned, and [`2026-11-07-instrument-repair.txt`](measurements/2026-11-07-instrument-repair.txt) |
| the commit carrying this update | The repaired test (§Committed repair), and this update |

Raw output, with the repair's patch and every run's per-function bytes, is in [`2026-11-07-instrument-repair.txt`](measurements/2026-11-07-instrument-repair.txt).

## Item 1: the repair under test

The patch in the raw output changes two places. Neither change touches the threshold, the 64-byte interval, the 300 samples, the scenario or the lift assertion.

- **`tests/support/commands.node.ts`, `stopHeapSampling` only.** A frame is selected when its url's _path_ starts with the argument, and keyed as `<rest of the path>:<function>`, for example `kernel/session.ts:#move`. Before, a frame was selected when its whole url contained the argument anywhere, and keyed by the file's base name.
- **`tests/hot-path.browser.test.ts`.** The argument stays `'/src/'`. The kernel sum counts every key starting with `kernel/` or `draggable.ts:`, so a new module under `src/kernel/` is counted with no test edit. The lift's key is still `lift.ts:translate`. The comment above the assertion now names the kernel's modules.

**Why a path prefix and not a url derived from the test module.** The browser server's root is `packages/drag`. A module under `src/` is served at `http://localhost:<port>/src/…`, and a module outside the root is served under another path, such as `/@fs/…` or `/node_modules/…`. A path that starts with `/src/` is therefore this package's source only. Another package's `…/packages/core/src/…` contains `/src/` but doesn't start with it. Deriving the prefix from `import.meta` doesn't work here, and the probe showed why:

- The test module itself is served at `/workspaces/material-x/packages/drag/tests/…`.
- Vite rewrites `new URL('../src/', import.meta.url)` to `http://localhost:<port>/src`, with no trailing slash.
- Vite rewrites `import.meta.resolve('../src/')` to the file-system form `/workspaces/…/drag/src/`, which matches no frame. With that form the profile came back empty.

**Assumption:** the selection depends on the server's root being the package, which `vitest.config.ts` sets through `createDragTestConfig(new URL('./', import.meta.url), …)`. A `src` module imported through an absolute `/@fs/` path would be missed. The M1 and M2 runs would have tested sensitivity for `session.ts` and `gesture.ts`, but they weren't run (see below).

## Committed repair

The commit carrying this update applies the patch saved in the raw output (`git apply --ignore-whitespace`) to `tests/hot-path.browser.test.ts` and `tests/support/commands.node.ts`. It differs from the saved patch in one character. In `stopHeapSampling`, `path?.startsWith(urlPart)` became `path.startsWith(urlPart)`: ESLint's `no-unnecessary-condition` rejected the optional chain, because `path` is always a string, `''` when the frame has no url. Behavior is unchanged: `''` doesn't start with `/src/`, so such a frame still takes its caller's key. The saved patch hadn't been linted when it was recorded.

| Check on the two changed files | Result |
| --- | --- |
| `just fmt`, `just lint-fix`, `just fmt`, `just lint` | Pass, after the one-character change above |
| `just typecheck` | Pass |
| Test runs | None in this update, by instruction. The readings below are the only runs of this selection, and they stand as recorded |

The readings below were taken on the saved patch's working copy, before that change.

## Item 1: unmutated runs, Chromium

All runs are of `npx just test tests/hot-path.browser.test.ts -t 'allocate per sample'` on the repaired working copy. The kernel figure is in bytes per move, over 300 moves. In every run the only lift key was `lift.ts:translate`.

| Set | Run | Kernel B/move | Result |
| --- | --- | --: | --- |
| Probe | 1 | 16.31 | Fail |
| **Prescribed** | 1 | 16.64 | **Fail** |
| **Prescribed** | 2 | not printed | Pass |
| **Prescribed** | 3 | 16.11 | **Fail** |
| **Prescribed** | 4 | not printed | Pass |
| **Prescribed** | 5 | 16.27 | **Fail** |
| Logged | 1–3, 5 | not printed (console shown only on failure) | Pass |
| Logged | 4 | 16.19 | Fail |
| Logged, `--silent=false` | 1 | 14.20 | Pass |
| Logged, `--silent=false` | 2 | 13.55 | Pass |
| Logged, `--silent=false` | 3 | 17.49 | Fail |
| Logged, `--silent=false` | 4 | 13.33 | Pass |
| Logged, `--silent=false` | 5 | 14.44 | Pass |

A passing run of the test as written prints no bytes. The two logged sets added a temporary `console.log` of the figure and the bytes in the working copy. That log isn't part of the patch.

**Kernel bytes by function, sampled self bytes over 300 moves.** These are the ranges across the nine runs whose bytes were printed:

| Function                    |             Bytes |
| --------------------------- | ----------------: |
| `session.ts:handleEvent`    |         1280–1948 |
| `gesture.ts:#runStep`       |           424–904 |
| `session.ts:#move`          |           448–964 |
| `gesture.ts:#applyRequests` |           228–556 |
| `gesture.ts:enter`          |           168–668 |
| `session.ts:requestStep`    |           104–496 |
| `gesture.ts:requestStep`    |           116–260 |
| `session.ts:stepTarget`     | absent, or 80–248 |
| `session.ts:advance`        |            92–172 |

No `draggable.ts:` key appeared. The lift's `lift.ts:translate` read 30108–34856 B, about 100–116 B per move. That matches the 109 B CSS string in [`implementation-report.md`](implementation-report.md).

**What this shows.** The kernel bytes are spread thinly across the whole per-sample and per-frame path: the pointer event's entry, the pass, the frame step and the step's target. No single function carries an object per sample: the largest, `handleEvent`, is about 4–6.5 B per move. The total sits on the threshold, and the 64-byte sampling interval moves it by a few bytes per move from run to run. I can't tell from these runs whether the kernel at `bb644d6d7` and later allocates more per move than it did in `draggable.ts` at `0dcb80fb1`. The old key can't see the split modules, and `DRO-6`'s figures were not recorded per function in a form comparable with these. **This is the per-sample kernel figure for `DRO-7`.** I haven't judged whether it is a cost or the threshold's resolution, and I haven't changed the threshold or the interval.

## Not run

- **M1, M2, the M1 run against `ff69cb8d7`'s test, and M3.** Mutation sensitivity of the committed test is therefore unverified. M1 and M2 are gates that only mean something against a test that passes unmutated. Their result would be ambiguous on a test that already fails in 3 of 5 runs. M3 is record-only, but it reads the same threshold.
- **Item 2,** the `compare.ts` injections and the dry application check. It doesn't depend on item 1, but the handoff stops the unit at the first return condition. It can start as soon as the architect says so, and needs no browser.

## Returned

1. **Unmutated per-sample test fails, 3 of 5 prescribed runs** (§Return to the architect, first bullet). The kernel's per-move figure on the repaired selection is 13.33–17.49 B, against `< 16`. Deciding whether this is a `DRO-7` cost or the threshold's resolution is the owner's and the architect's call. The repair is now committed at the owner's authorization, with these failures known (§Committed repair). That decision is still open.
2. **The selection's assumption,** that the server root is the package so `/src/` at the start of a path is this package, for the architect to accept or replace.

## Checks

- `git diff --check`: clean. Markdown formatted with `npx just fmt`. Lint doesn't apply to Markdown.
- The links in this report resolve to files in `.plan/`.
- The committed repair's format, lint and typecheck are in §Committed repair. When the report was first returned, the patch hadn't been linted.
- Scratch: the per-run logs were removed after their content was copied into the committed raw file.