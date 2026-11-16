# Report: CI verification, first unit — stopped at item 5

**Handoff:** [`ci-verification-handoff.md`](ci-verification-handoff.md). **Input:** `6d1c80162` on `ci/verification`. **Governing records:** `repo:RD-2`, `repo:RD-6` to `repo:RD-9`, `repo:RF-29` and `repo:RF-32` in [`../00-index.md`](../00-index.md), the [design](ci-verification-design.md), and `.agents/docs/test-architecture.md` §CI policy.

**Outcome: stopped under `RD-8` property 5,** in item 5's lint repairs. 108 `camelcase` errors are on snake_case keys that another program reads by name. The repository's formatter and lint rules leave no way to repair them without turning a rule off, adding a disable comment or renaming a runtime key ([§The stop](#the-stop)). **Items 1 to 4 are done,** with their checks. Item 5's lint exclusion and formatting are done. Item 5's other lint repairs and items 6 to 8 are not started. **No pull request was opened,** and no CI run exists.

## Commits

| Commit | Content |
| --- | --- |
| `27e54e9ac` | Items 1 and 2: Playwright's Chromium, the devcontainer install, Roboto, the fixture glyph, `MX_TEST_ENGINES`, drag's `test-engines` |
| `51fa04c9d` | Item 1: the re-recorded baselines. Only files under `__screenshots__/` |
| `e53069636` | Item 1: the replaced baselines and the Roboto check, kept for review |
| `e45f5665f` | Items 3 and 4: the `measurement` tag, the split size rows, the JSON readings, the size report and its tests |
| `33fc22dce` | Item 5: lint stops reading `.plan/`; the record and five authored CSS files are formatted |
| this report's commit | This report and the lint inventory |

## 1. The pinned visual environment

**Changes:**

- `.scripts/vitest-config.ts:242` `createChromiumProvider` launches with `channel: 'chromium'`, which is Playwright's full Chromium build in new headless mode. `CHROME_EXECUTABLE`, the `/usr/local/bin/chrome` default and `executablePath` are gone. `--expose-gc` and `--enable-precise-memory-info` still reach drag's Chromium projects (`RD-6` property 6). `DEBUG`'s flags are unchanged.
- `.devcontainer/post-create/playwright-browsers.sh` runs `playwright install chromium firefox` from the workspace's `node_modules`. `.devcontainer/on-start/playwright-browsers.sh` runs the same script. Both are called from `post-create.sh` and `on-start.sh`. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` is unchanged. **Limit:** the devcontainer runs no `npm ci`. On a first creation, before `npm ci`, the script prints the two commands and exits 0, and the next start installs the browsers.
- `@fontsource/roboto` 5.3.0 is an exact `devDependency` of `@ydinjs/material-x` (`packages/material-x/package.json:133`). The lockfile change adds only that package.
- `packages/material-x/tests/support/browser-setup.ts:41` loads the faces that the fixtures render: the latin subset at weights 500 and 700, each with the unicode range that the package declares. Each face is awaited in `beforeAll`. The text stacks at `:80`, `:81` and `:89` name `Roboto` alone. The icon font is unchanged.
- **A fixture changed:** `packages/material-x/tests/button/button.visual.browser.test.ts:27`. The leading-icon fixture used `★`, which no Roboto subset maps. A CDP probe showed that it rendered in DejaVu Sans, a system font. It is now `+`. **The owner confirmed this change** (relayed by the coordinator, 2026-11-16).

**Which faces, and why:** [`checks/platform-fonts.txt`](checks/platform-fonts.txt), from [`checks/platform-fonts.probe.ts`](checks/platform-fonts.probe.ts) (`CSS.getPlatformFontsForNode` on every element, through the test iframe and the shadow roots).

- Every glyph now renders in `Roboto-Medium`, `Roboto-Bold` or the vendored icon font. No glyph renders in a system font.
- Weight 700 is used. Before the 700 face was loaded, Chromium synthesized it from 500.
- Weight 400 isn't used, so it isn't loaded.

[`checks/font-faces.probe.ts`](checks/font-faces.probe.ts) was a first, computed-style probe.

**Chromium, locally:** [`checks/chromium-binary-local.txt`](checks/chromium-binary-local.txt), from [`checks/chromium-binary.probe.browser.test.ts`](checks/chromium-binary.probe.browser.test.ts).

- CDP `Browser.getVersion` reads `Chrome/158.0.8127.18`.
- The process is `~/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome --headless`, which is not the headless shell.
- **Not read in CI:** no CI run exists.

**The re-recording.** The visual suite first ran once against the old baselines ([`visual/before-rerecording/`](visual/before-rerecording/): actual images, the four diff images that exist, and `run.log`). Then `npx vitest run --project visual/material-x --update` ran in the devcontainer. **There are 19 baselines, not the 23 that the design's reading counts.**

| Baseline (`*-chromium-linux.png`) | Re-recorded | Old image | Diff image before re-recording |
| --- | --- | --- | --- |
| `button-color-variants` | changed | `visual/old-baselines/button/…` | none: 765×72 became 744×72 |
| `button-enabled-and-disabled` | changed | yes | none: dimensions differ |
| `button-focused` | changed | yes | none: dimensions differ |
| `button-hovered` | changed | yes | none: dimensions differ |
| `button-icon-composition` | changed | yes | none: dimensions differ |
| `button-sizes-and-shapes` | changed | yes | yes |
| `button-switch-variants` | changed | yes | none: dimensions differ |
| `button-group-connected-selected` | changed | yes | none: dimensions differ |
| `button-group-connected-sizes` | changed | yes | yes |
| `button-group-standard-disabled` | changed | yes | none: dimensions differ |
| `button-group-standard-sizes` | changed | yes | yes |
| `checkbox-disabled`, `-focused`, `-hovered`, `-states` | unchanged | — | — |
| `radio-disabled`, `-focused`, `-hovered` | unchanged | — | — |
| `radio-states` | unchanged | — | yes, 29 pixels (see below) |

The new images are the files under `packages/material-x/tests/*/__screenshots__/` at `51fa04c9d`. The old ones are in [`visual/old-baselines/`](visual/old-baselines/). The text-free checkbox and radio images matched in Chromium 158.

**The owner reviewed the re-recorded baselines in `51fa04c9d` and approves them** (relayed by the coordinator, 2026-11-16).

**`radio-states` is intermittent locally** (`RF-29`'s row). It failed in the run against the old baselines with 29 pixels on the unchecked ring. It passed in the `--update` run, so it was not re-recorded. In five runs after the re-recording it failed once. It is not yet handled under `RD-8` (item 6).

**The Roboto check:** [`checks/roboto-load-failure.txt`](checks/roboto-load-failure.txt). Two mutations, each reverted:

- With the package's font files moved away, all 4 visual files fail to import `browser-setup.ts`, and no test runs.
- With each face's URL broken, all 4 files fail in `beforeAll` with `NetworkError`, and 19 tests are skipped.

Neither reaches a comparison.

## 2. One engine selection

- `.scripts/vitest-config.ts:192` to `:229`: `MX_TEST_ENGINES`. An unknown or empty list throws, naming the known engines.
- `:263` `createBrowserTestConfig(engine, …)`: a non-Chromium project has `fileParallelism: false`, one worker, Playwright's provider without launch arguments, and its engine's instance.
- `:336` names a project `<name>/<engine>`.
- `:365` `createEngineTestProjects` declares a browser project once per listed engine.
- `:375` `createVisualTestProjects` declares visual once, in Chromium.
- `:730` the workspace composes the per-package lists in the order the browser groups had before.
- `createDragAllEnginesTestConfig` and `packages/drag/vitest.engines.config.ts` are deleted, along with its line in `packages/drag/tsconfig.json`.
- `assignGroupOrder` is unchanged. It still gives each browser project its own group.
- drag's existing `isChromium` rows read `server.browser`, so the non-Chromium variants skip them without an edit.
- **An interpretation:** the handoff says that visual is declared once _"whatever the variable says"_, and that a run without `chromium` declares _"no Chromium browser project"_. Visual is a Chromium browser project, so it is declared only when the list names `chromium`.
- **drag's `test-engines`** (`packages/drag/Justfile:33`):
  - it runs `vitest.config.ts` with all three engines and selects `--project 'browser*' --project 'shipped*'`;
  - **it doesn't run drag's node, declaration or consumer projects**, so its names equal those at `a8726c57d`;
  - a `--project` argument replaces the default selection, because `--project` flags add up, so `DRO-18`'s `--project browser --project browser/firefox …` selects only what it names.

**Check:** [`checks/engine-selection.txt`](checks/engine-selection.txt), from [`checks/list-projects.ts`](checks/list-projects.ts), which resolves the configuration with `createVitest` and runs nothing.

- It lists the default, `firefox` and all three engines, at the root and for drag, and the root's `--project '*/firefox'` selection.
- drag's `test-engines` lists `browser`, `browser/firefox`, `browser/webkit`, `shipped`, `shipped/firefox` and `shipped/webkit`. That is identical to `vitest.engines.config.ts` listed at `a8726c57d` in a detached worktree.
- Vitest appends ` (<engine>)` to every browser project's name, as it did before.

## 3. Measurement rows

- `.scripts/vitest-config.ts:314` declares the tag `measurement` in every project's base configuration.
- `packages/drag/bench/size/measure.ts:244` `ceilingViolations` and `:262` `graphViolations` split the checks. `violations` returns both. The messages are word for word.
- `packages/drag/tests/size.node.test.ts:24` has one graph row per composition. `:28` has one ceiling-and-control row per composition, tagged.
- `packages/drag/tests/hot-path.browser.test.ts:262` and `:319`: the two allocation rows are tagged.
- `npx just size` prints the same table and exits 0 (all ten Brotli figures unchanged).

**The search:** every `*.test.ts` in every package and `.scripts`, for heap sampling, heap snapshots, `performance.now` and `performance.memory`, budgets, ceilings, byte counts, and every `toBeLessThan` / `toBeGreaterThan`.

- None of the 74 inequality assertions is a quantity against a budget. Each is a geometry tolerance or a behavior count.
- **Not tagged:**
  - drag's retention rows in `destruction.browser.test.ts`, which are behavior (`RD-7` property 1);
  - `hot-path`'s layout-read and spatial-search counts, which are `drag:DRI-17`'s behavior;
  - size's `draggable alone` module-list row, which is a graph row.
- No speed row exists.

**Checks:** [`checks/measurement-tag-mutations.txt`](checks/measurement-tag-mutations.txt). Tag selection was confirmed against Vitest 5.1.0, including inside `it.each` (10 of 21 size rows) and `it.runIf(…)(name, options, fn)`.

- **Lowering `draggable + lift`'s ceiling by 1 B** fails that row (`over its 3931 B ceiling by 1 B`) under `npx just test` and under `--tags-filter measurement`. Under `!measurement`, 66 files pass.
- **Importing `src/lift.ts` into `tests/fixtures/resize-handle.ts`** fails that composition's graph row (`must not contain lift.js`) under `!measurement`, and nothing else.
- **"Only that ceiling row" doesn't hold as stated.** `hot-path.browser.test.ts:261`, an allocation row, failed in both runs that include it, independently of the mutation: 36.5 and 28.2 B per move against 16. It passed at `a8726c57d` in the image's Chrome 157, and Chromium is now 158. It is a measurement row, so it is outside the gate. Locally it fails `npx just test` in drag. Not yet handled (item 6).

## 4. Machine-readable sizes and the size report

- `packages/drag/bench/size/measure.ts:289`: with `--json`, the gate prints one JSON array instead of the table. Each row has its name, Brotli, gzip and ceiling. The exit status is as before.
- `.scripts/size-reading.ts` builds each package as its `size` recipe does, then reads size-limit's `--json` for `box-quad` and `core`, and `measure.ts --json` for drag. It writes `{ rows: [{ package, row, brotli, gzip, limit }] }`. gzip is `null` for size-limit, which reports none.
- The root `Justfile:64` adds `just size-reading FILE`, and `:69` adds `just size-report …`.
- `.scripts/size-report.ts` is pure: files in, Markdown out. It writes `<!-- mx-size-report -->`, a table with each row's head, base, change and limit, `added` and `removed` rows, `**over by N B**`, and "**No base reading:**" when the base gives none. It also lists the measurement rows from Vitest's JSON report, each with its result and the first line of its failure. It prints one `::warning` annotation per exceeded limit and per failed measurement row.
- `.scripts/size-report.node.test.ts`: 13 `repo` tests. They cover a row that grew, shrank or stayed the same, a row added and a row removed, a row over its limit, a missing base reading, absent limit and gzip, measurement results with an escaped pipe, a missing measurement report, the warnings, and the Vitest report parser. All pass.
- End to end in the devcontainer: `just size-reading` wrote 14 rows (1 box-quad, 3 core, 10 drag), and `just size-report` rendered them with "No base reading".
- **The posting step doesn't exist yet** (item 7).

## 5. Static checks, as far as the stop

**Lint stops reading `.plan/`.**

- `eslint.config.ts:23` ignores `**/.plan/**/*`.
- `.oxlintrc.json:14` does the same for the repository-level run. oxlint doesn't inherit `ignorePatterns` through `extends`, so each package's `.oxlintrc.json` gains `"ignorePatterns": [".plan/**/*"]`.
- In every package, oxlint and ESLint on `.plan` now report 0 errors.

**Formatting:** [`checks/fmt-whitespace.txt`](checks/fmt-whitespace.txt).

- `fmt-check` reported 2 box-quad and 57 drag `.plan/` files. After `just fmt`, every JSON file parses to the same value. Every other file is equal with all whitespace removed, except one.
- **`packages/drag/.plan/probes/size-acceptance-cleanup/placement.ts`:** oxfmt added trailing commas to multi-line argument lists. With whitespace and the commas before a closing bracket removed, the two versions are equal, and no string or template text changed. **The program is the one that ran, so this is not a data change, and I didn't stop.** The handoff's "whitespace only" is otherwise exact.
- **The handoff's premise about material-x's five `main.styles.css` files doesn't hold.** They are tracked, authored CSS under `src/` (`.gitignore` admits `*.styles.css`), not build output, so a fresh checkout has them and `fmt-check` fails on them.
  - I formatted them. The diff is whitespace only.
  - material-x's build output (`button`, `button-group`, `checkbox`, `core`, `fab`, `icon`, `list`, `radio`, `text-field`) is byte-identical before and after.
  - So this is a repair that changes no emitted behavior. Nothing generated needed skipping.

**Typecheck:** the root `tsconfig` and the packages I touched exit 0. The root `just typecheck` has not been run after these commits.

### The stop

**`RD-8` property 5: _"a repair would need a rule turned off, a disable comment or a changed runtime name."_** The inventory is [`checks/lint-inventory.txt`](checks/lint-inventory.txt), at `33fc22dce`, with oxlint and ESLint run separately so ESLint is read in every package. There are 142 errors, and 108 of them are `camelcase` on keys that another program reads by name:

| Where | Errors | What reads the key |
| --- | --- | --- |
| `.claude/plugins/harness-effort-guard/tests/guard.test.ts` | 91 | Claude Code's hook payload (`hook_event_name`, `session_id`, `agent_type`) |
| `.claude/plugins/harness-effort-guard/scripts/guard.ts` | 12 | the same payload, and the guard's log record |
| `packages/vite-custom-element-assets/src/html.ts:20`–`:23` | 4 | `@minify-html/node`'s options (`RF-32` names these) |
| `packages/tproc/tests/helpers.ts:44` | 1 | the token database's `custom.token_class` field |

**No form passes both tools:**

- `eslint-config-vaadin` sets `camelcase: ['error', { properties: 'always' }]` (`rules/eslint/suggestions.js:6`).
- A quoted key escapes the rule, but oxfmt, with `quoteProps` as needed, rewrites `{ 'session_id': 1 }` back to `{ session_id: 1 }`.
- A computed key `{ ['minify_css']: true }` survives oxfmt, but the preset sets `no-useless-computed-key` to error.

So each repair needs one of the three things the decision rules out. This is also `RF-32`'s return condition. **`.claude/` is also outside the handoff's file scope.**

**The other 34 errors look repairable, and none was repaired:**

- **box-quad:** `tests/api.declaration.test.ts:34`–`:38` and `:104`–`:107`, `no-meaningless-void-operator`.
- **core:** `src/traits/primitives.ts:51` `no-generated-empty-object-type`; `src/utils/DOM.ts:37` `no-unnecessary-type-parameters`; `tests/traits/reorderable.browser.test.ts:648` `prefer-arrow-callback`.
- **tproc:** `src/processToken.ts:153` and `src/resolve.ts:59`, `no-unnecessary-condition`.
- **vite-custom-element-assets:** `src/css/generation.ts:256` and `:257`, oxlint `no-multi-assign`; `src/css/css.ts:31` and `src/index.ts:237`, `:238`, `require-unicode-regexp`.
- **vite-traits-plugin:** `src/analyze.ts:85`, `no-restricted-syntax` (`for..in`).
- **size-limit-preset-rolldown:** `tsdown.config.ts:16`, `require-unicode-regexp` twice.
- **material-x:**
  - `src/core/animations/ripple/ripple.ts:173`, oxlint `no-unnecessary-type-assertion`;
  - `ripple.ts:77`, `:92` and `:106`, `no-unnecessary-condition`;
  - `src/button-group/ButtonGroupCore.ts:37` and `src/list/ListItemCore.ts:19`, `no-generated-empty-object-type`;
  - `src/text-field/styles/utils.ts:111`, `no-undef-init`;
  - `tsdown.config.ts:12`, `require-unicode-regexp`.
- **Repository level:** `.scripts/css/debug.ts`, `.scripts/docs-api.ts`, `.scripts/vite-config.ts` and `.storybook/docs/paths.ts`, `require-unicode-regexp`.
- drag has none.

A repair under `src/` has to show that the emitted JavaScript is unchanged. A `u` flag can change what a pattern matches.

**What the architect decides:** how these keys satisfy `RF-32`'s required property, or whether that property changes for keys that another program reads. For example, a `camelcase` `allow` list or `properties: 'never'` in the lint configuration counts as a rule change under `RD-8` property 5. Whether `.claude/` is linted by the root recipe at all is another such decision.

## Not done

- **Item 5:** the 34 repairable lint errors; `just fmt-check`, `just lint` and `just typecheck` on a fresh checkout.
- **Item 6:** the Chromium root run with coverage and without `measurement` rows, and the Firefox runs, five times each. Two rows are already seen, and neither is handled yet:
  - `radio.visual` _should match the selection state matrix_, intermittent (1 of 5);
  - `hot-path` :261, the allocation row, failing in Chromium 158.

  `RF-29`'s `tproc` row was not re-read.

- **Items 7 and 8:** `verify.yml`, `codecov.yml`, the pull request and every CI reading. No CI run exists. Chromium in CI is unread.
- `packages/drag/bench/compare.ts:2090` and `:2132` still launch `CHROME_EXECUTABLE` or `/usr/local/bin/chrome`. It is a manual comparison, not a test run, and it is outside the handoff's file scope.

## Next

The architect reads this report and decides the `camelcase` sites. The unit resumes from item 5's repairable errors.