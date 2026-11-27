# `parseMs` reads a duration in milliseconds as milliseconds (RF-152): feature proof

**Lens:** `reviewer`, feature proof of [`RF-152`](../../00-index.md) and the implementer's dated note, for pull request #315. Requested by the coordinator.

**Commit read:** `4fcc0a457` on `material-x/parse-ms-1`, one commit on `main` at `d6f6cf60b` (#310). It changes `packages/material-x/src/core/utils/fns.ts`, adds `tests/core/utils/fns.browser.test.ts`, turns one row of `tests/list/sortable-list.browser.test.ts` into two, and adds the note and its reading.

**Outcome: accepted. One finding, tier C, for the architect.** The required property holds for the two spellings it names in Chromium, Firefox and WebKit: `0.25s` and `250ms` both give 250, and a value with no number throws a `CSSVariableError`. The witness holds: reverting the repair fails the same three rows in each engine. Each mutation of mine fails its `parseMs` rows in each engine. The consumers' claim holds in the production build. CI's `verify` passed on the head: run 45883437436. The finding is that a time whose unit is in capitals, which each engine reads as a `<time>`, still reads 1,000 times too long.

## Scope and method

- **The affected files,** unmutated, in Chromium: `fns.browser`, `sortable-list.browser`, `sortable-list.spec`, `list-roles`, `elevation.spec` and `ripple.browser`. These are the new file and the files that read or set one of the four properties ([reading](checks/chromium-affected.txt)). Firefox and WebKit are read from CI (`RD-62` property 4).
- **Mutations** of `parseMs`, run against `fns.browser.test.ts` and the whole of `sortable-list.browser.test.ts` in Chromium, Firefox and WebKit, one engine at a time ([script](probes/mutations.sh.txt), [readings](checks/mutations.txt)). There is the implementer's witness and three of mine.
- **The consumers:** every declaration of the four properties in material-x's production build at the head, and every time in milliseconds in that build ([reading](checks/build-durations.txt)). The build went to a scratch directory, with the private names it was built with. This repeats the implementer's [reading](../../parse-ms-1/checks/durations.txt) by a second method: he read the unminified `just debug` output of each `*.css.ts`, and I read what ships.
- **Spellings:** a probe of what `getComputedStyle` returns for nine spellings of a quarter second in each engine, and what the head's expression gives each one. I also checked how lightningcss prints the capitalized ones and how each engine reads them in `transition-duration` ([reading](checks/spellings.txt), probes [spellings](probes/spellings.mjs.txt), [lightningcss](probes/lightningcss-case.mjs.txt), [units](probes/units.mjs.txt)).
- **Not read:** Safari, a real device, a story by eye, and material-x's full suite locally. CI ran the full suite.

## Properties

| Property | Reading |
| --- | --- |
| `0.25s` and `250ms` both give 250 | **Holds,** in the three engines: the six value rows pass. With a value in milliseconds, the neighbors' timing row gives `{ duration: 250, easing: 'linear' }`. |
| A value with no number throws, as before | **Holds.** The three rows throw a `CSSVariableError`. Without the `isNaN` test, all three fail in each engine. |
| **Witness:** a row that gives a private duration in `ms` fails before the repair | **Holds,** in the three engines. Reverting to `parseFloat(v) * 1000` fails 3 of 212 rows: `250ms`, `99ms`, and the neighbors' `250ms` row. That matches the implementer's account. He read it at `d6f6cf60b`, not at `5448c4fd6`, which `RF-152` names, but `fns.ts` and `useCSSProps.ts` are the same at both (`git diff` is empty). |
| The consumers don't change | **Holds.** In the production build, the four properties have one declaration each, all in seconds: `--_ripple-duration:.15s`, `--_ripple-drift-duration:.5s`, `--_drag-duration:.65s`, `--_layout-animation-duration:.5s`. The only times in milliseconds in the build are the ripple's two `15ms` in one `transition`, which `parseMs` doesn't read. The rows outside this unit set these properties only in seconds (`0s`, `0.01s`, `3600s`, `0.25s`). The affected files pass unmutated in the three engines. |
| The value is trimmed first | **Holds.** `useCSSProps` trims each value, and core's row _"should trim computed CSS variable values before parsing"_ witnesses it. Each engine already returns `"  250ms  "` as `"250ms"`. |

**Mutations,** the number of rows of the two files that fail out of 212. 12 rows of `sortable-list.browser` run in Chromium only:

| Mutation | Chromium | Firefox | WebKit | Group |
| --- | --: | --: | --: | --- |
| None | 0 | 0 | 0 |  |
| `parseFloat(v) * 1000` (the witness) | 3 | 3 | 3 | repeated: removes the mechanism |
| own: never scaled, `* 1` | 8 | 8 | 7 | doubted: seconds |
| own: the units swapped | 11 | 11 | 10 | doubted: both |
| own: no `isNaN` test | 3 | 3 | 3 | the throw |

The witness and the `isNaN` mutation fail the same rows in each engine. The two other mutations of mine fail the same `parseMs` rows and the same timing rows in each engine. The one difference is the motion row _"should animate the rows that a slow pointer move and a flick displace"_: it fails in Chromium and Firefox but not in WebKit. Its timing is 1,000 times shorter there, so whether it fails depends on frames, as `RD-60`'s ruling 3 found for its own extra rows.

**The record.** The implementer's note is dated, follows `RF-152`'s required property, and leaves the entry's text unchanged. The JSDoc says that lightningcss prints a time of 100 ms or more in seconds and a shorter one in milliseconds, which agrees with `RD-60`'s [lightningcss reading](../../sortable-displacement-1/checks/lightningcss-time.txt).

## Findings

### reviewer-1: a time with its unit in capitals still reads 1,000 times too long

**Tier C.** Owner: the architect, who decides whether the required property's _"a `<time>` in either unit"_ covers a unit's case.

- **What happens:** `parseMs` scales by 1,000 unless the value ends in a lowercase `ms`. A custom property keeps the spelling it was given, so `getComputedStyle` returns `250MS` as `250MS` and `250Ms` as `250Ms`, and the head gives 250000 for each in the three engines, with no error. `0.25S` gives 250, because any value that doesn't end in `ms` is read as seconds.
- **Why it is in scope:** each engine reads those spellings as a `<time>`. `transition-duration: 250MS` and `250Ms` compute to `0.25s` in Chromium, Firefox and WebKit. `RF-152`'s _Why it is a problem_ names this path: _"a value that doesn't pass through lightningcss, gives a duration 1,000 times too long, with no error."_
- **Why no consumer sees it:** lightningcss prints `250MS` and `250Ms` as `.25s`, and `99MS` as `99ms`, minified or not. So no sheet of the package gives one. Only a value that a page sets at runtime, in a `style` attribute or with `setProperty`, on a private property, reaches `parseMs` in capitals.
- **Evidence:** [spellings](checks/spellings.txt). No row reads a unit in capitals, and a case-insensitive test of the unit passes every row of the unit.
- **Required property:** a `<time>` that the engines accept reads as its milliseconds whatever the case of its unit, or the register says which spellings `parseMs` reads.

## CI

`verify`, run [45883437436](https://github.com/ausginer/material-x/actions/runs/45883437436), `pull_request`, on `4fcc0a457`: **success**, with `records` and `deploy` skipped ([lines](checks/ci.txt)). It ran the full suite: `chromium` 193 files and 5506 rows; `firefox` and `webkit` 137 files each, with one skipped. In the `firefox` and `webkit` jobs, each affected file passes:

- `fns.browser`, 9 rows;
- `sortable-list.browser`, 203 rows with 12 skipped;
- `list-roles`, `ripple.browser` and `elevation.spec`;
- `sortable-list.spec`, 26 rows in Firefox and 36 in WebKit.

The `chromium` job passes all of them. This is the branch's only run, and the PR has a `verify` run that the merge can use.

Locally, in Chromium, the six affected files pass unmutated with 349 rows. In Firefox and WebKit, the two mutated files pass unmutated with 200 rows each and 12 skipped: the first run of each engine in [the mutations](checks/mutations.txt).

## Verification of this report

The report is Markdown and saved text only. I ran `oxfmt` on the report and `git diff --check`, and checked the relative links against the files with a script. Lint doesn't apply to Markdown.

The mutation script restores `fns.ts` after each run, and `git status` showed only this record after each engine. The production build went to this session's scratchpad, which is removed after the commit. The package's own build output and the private-property cache were neither rebuilt nor changed. I briefly copied a probe into material-x's ignored `node_modules/.cache/` by mistake and removed it unrun.