# Report: CI verification, first unit

**Handoff:** [`ci-verification-handoff.md`](ci-verification-handoff.md). **Input:** `6d1c80162` on `ci/verification`. **Governing records:** `repo:RD-2`, `repo:RD-6` to `repo:RD-9`, `repo:RF-29` and `repo:RF-32` in [`../00-index.md`](../00-index.md), the [design](ci-verification-design.md), and `.agents/docs/test-architecture.md` §CI policy.

**Current state, after the third resumption (at `53927298b`, then `e93e490ea` for `RD-12` and `1fdef08ae` for `RD-13`): blocked by a repository rule.** [§Resumed after `RD-11`](#resumed-after-rd-11).

- Items 5 to 7 are done, and item 6's local inventory is handled: 3 rows repaired, 12 repaired through core's test setup, and 5 Firefox rows disabled with `repo:RF-33` and `repo:RF-34`.
- Pull request #27 is open. The baseline proposal, #28, is open for the owner's review.
- **The blocker:** `verify` can't start. The repository's Actions policy now allows only actions owned by `ausginer`, and refuses the pinned `actions/*` and `codecov/codecov-action` (run 43819462065, `startup_failure`). `RD-13`'s stops say a repository rule that refuses the workflow is reported, not worked around. The owner decides.
- **Not finished:** Safari, `RD-12` items 5 to 8; the reproduction after #28 merges and its three runs; the Codecov upload; the measurement-job and gate checks; and the draft check.
- **The branch head is a reading state:** `e0a4173a9`'s `safari` job runs only the frame probe and one row, and `packages/box-quad/tests/zz-frame.probe.browser.test.ts` exists for it. Both are reverted after the reading.

**Outcome, second stop (resumed at `e5d7260aa`): stopped again under `RD-8` property 5,** in item 5's lint repairs ([§Resumed at item 5](#resumed-at-item-5-and-the-second-stop)).

- `RD-10`'s allow list cleared the 108 `camelcase` errors.
- 31 of the other 34 errors are repaired.
- **3 remain, and each needs a public type changed, a disable comment or a rule change:** two published material-x types that resolve to `{}`, and core's public generic `$` overload, which oxlint already exempts with a disable comment and ESLint reports again.
- Items 6 to 8 are not started. No pull request was opened.

**Outcome, first stop (at `c2dbf6292`):** stopped under `RD-8` property 5 on the `camelcase` sites ([§The stop](#the-stop)), which `RD-10` decided. Items 1 to 4 are done with their checks, and the owner approved the re-recorded baselines.

## Commits

| Commit | Content |
| --- | --- |
| `27e54e9ac` | Items 1 and 2: Playwright's Chromium, the devcontainer install, Roboto, the fixture glyph, `MX_TEST_ENGINES`, drag's `test-engines` |
| `51fa04c9d` | Item 1: the re-recorded baselines. Only files under `__screenshots__/` |
| `e53069636` | Item 1: the replaced baselines and the Roboto check, kept for review |
| `e45f5665f` | Items 3 and 4: the `measurement` tag, the split size rows, the JSON readings, the size report and its tests |
| `33fc22dce` | Item 5: lint stops reading `.plan/`; the record and five authored CSS files are formatted |
| `c2dbf6292` | The first stop's report and the lint inventory |
| `e9da25c08` | Item 5, resumed: `RD-10`'s allow list, 31 lint repairs, and their checks |
| `a2a4c5488` | The second stop's report |
| `4e8eaf9d2` | Item 5: `RD-11`'s ESLint configuration |
| `234ade127` | Item 5: lint builds what it resolves; the static checks pass on a fresh checkout |
| `f0ec37881` | Item 6: `just test` builds its prerequisites; tproc's and radio's rows repaired |
| `9c96be2d8` | Item 7: `verify.yml`, `codecov.yml`, coverage of package source; `drag:DRF-48` and `RF-29`'s note |
| `6e5484670` | Item 6: core's setup ignores Firefox's capture error for a synthetic pointer; the `chromium` job's history; the measurement job's project selection; the CI screenshots of the visual stop |
| `26453da9c` | `RD-12`: Safari through the WebdriverIO provider, the `safari` job, `test-engines` |
| `16e0185b0` | Item 6: core's stylesheet assertion; five Firefox rows disabled with `RF-33` and `RF-34`; coverage uploads on every run. **It also holds the architect's then-uncommitted `.plan/00-index.md` text** (`RD-13`'s draft), staged by mistake with the whole file. The architect's `1fdef08ae` followed it, and neither was rewritten |
| `e0a4173a9` | **Reading only, to be reverted:** the Safari frame probe and one row |
| `ba3c4019e` | `RD-13`: `baselines.yml`, visual only with `MX_TEST_VISUAL=1`, Chromium-only local runs, diagnostics |
| this report's commit | This report |

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

## Resumed at item 5, and the second stop

**Input:** `e5d7260aa` (`RD-10`, and the handoff's §Resuming after the stop at item 5).

**`RD-10`'s allow list** is at `eslint.config.ts`, in the block before `buildFromOxlintConfigFile`:

- 22 anchored names in four commented groups: Claude Code's hook payload, the guard's observation log, `@minify-html/node`'s options, and the token data's `token_class`.
- The rule stays at `error` with `properties: 'always'`, and no file under `.claude/` changed.
- Each name was checked against `RD-10` property 2:
  - The payload names are read from the hook input in `guard.ts`.
  - The log fields are documented in the plugin's `README.md` or `.agents/docs/harness-effort-guard.md`, except `project_root` and `session_id`. The plugin's `observe.ts` reads both from the log, so they qualify as fields that the record's reader uses.
  - `@minify-html/node`'s `index.d.ts` declares its options.
  - `TokenTable.ts:108` declares `token_class`.
- **The near-miss check:** with `guard.ts:272` changed to `session_idx`, ESLint reports `Identifier 'session_idx' is not in camel case`. Reverted ([`checks/camelcase-near-miss.txt`](checks/camelcase-near-miss.txt)).

**The repairs**, all in `e9da25c08`:

| Site | Rule | Repair | Emitted JavaScript |
| --- | --- | --- | --- |
| `packages/box-quad/tests/api.declaration.test.ts`, 9 sites | `no-meaningless-void-operator` | The five `void`s of variables that calls already use are deleted. The four `@ts-expect-error` constants are exported instead of voided | test only. Typecheck still requires every `@ts-expect-error` |
| `packages/core/src/traits/primitives.ts:51` | `no-generated-empty-object-type` | `keyof Constructor<object>`, the same keys as `Constructor<Record<never, never>>` | unchanged. Only the internal type in `primitives.d.ts` changes |
| `packages/core/tests/traits/reorderable.browser.test.ts:648` | `prefer-arrow-callback` | The receivers come from `spy.mock.contexts`, read before the restore, not from a `this` callback | test only. The row passes |
| `packages/tproc/src/resolve.ts:55` | `no-unnecessary-condition` | `isAxisValue` takes `ProcessedTokenValue \| null`, so its own `!= null` is needed by its type | unchanged |
| `packages/tproc/src/processToken.ts:153` | `no-unnecessary-condition` | The upstream value is compared as `unknown`. The message uses `${textTransform}`, because any string type makes `String()` an unnecessary conversion, and an `as unknown` inside it an unnecessary assertion | `String(x)` becomes `${x}` in a template. Equal for every JSON value; 12 checked, including strings, numbers, booleans, objects, arrays and `NaN` |
| `packages/vite-custom-element-assets/src/css/generation.ts:256` and `:257` | `no-multi-assign` | Each assignment is its own statement | the same four operations, in the same order |
| `vite-custom-element-assets` `css.ts:31`, `index.ts:237`, `:238`; `size-limit-preset-rolldown/tsdown.config.ts:16` (2); `material-x/tsdown.config.ts:12`; `.scripts/css/debug.ts:39`, `.scripts/docs-api.ts:17`, `.scripts/vite-config.ts:74`, `.storybook/docs/paths.ts:6` | `require-unicode-regexp` | `u` flag | the flag only. Each pattern matches identically over 149,165 inputs ([`checks/unicode-flag.txt`](checks/unicode-flag.txt), [probe](checks/unicode-flag.probe.ts)) |
| `packages/vite-traits-plugin/src/analyze.ts:85` | `no-restricted-syntax` (`for..in`) | `for (const key of Object.keys(current))` | the loop only. Across 206 source files and 102,733 AST objects from `oxc-parser`, `for..in` and `Object.keys` give the same keys ([`checks/for-in-keys.txt`](checks/for-in-keys.txt), [probe](checks/for-in-keys.probe.ts)). The plugin's 52 tests pass |
| `packages/material-x/src/core/animations/ripple/ripple.ts:77`, `:92`, `:106` | `no-unnecessary-condition` | The three parameters read only `currentCSSZoom`, so they take `Zoomed`, `Readonly<{ currentCSSZoom?: number }>`, which states that older browsers lack it. The `?? 1` stays | unchanged |
| `ripple.ts:173` | `no-unnecessary-type-assertion` | `css` is already a `CSSStyleSheet`, so the `as` is removed | unchanged |
| `packages/material-x/src/text-field/styles/utils.ts:111` | `no-undef-init` | `let error: string \| undefined;` | unchanged: no built file differs in material-x |

**How emitted output was compared** ([`checks/lint-repairs-emitted.txt`](checks/lint-repairs-emitted.txt)):

- Each package was built in the main tree twice, with every file its build writes compared. The first build had the repairs reverted, which is `e5d7260aa`'s source. The second had them reapplied from the saved diff, which applied exactly.
- **Results:**
  - material-x: 1 of 256 files differs, a source map.
  - size-limit-preset-rolldown: 0 of 5 differ.
  - core: `primitives.d.ts`'s internal type and a source map.
  - The other JavaScript differences are exactly the rows above that change code.
- **A first attempt was discarded:** builds in a detached worktree resolved the workspace packages through the main tree's `node_modules`, so they mixed the two trees.

**The tests run on the repaired packages:** box-quad 242, core 263 and vite-traits-plugin 52 pass. tproc fails only `RF-29`'s row, with the same message as before.

**Lint now** ([`checks/lint-inventory-resumed.txt`](checks/lint-inventory-resumed.txt)): oxlint exits 0 in every package and at the repository level. ESLint exits 0 everywhere except at these three sites.

### The second stop

`RD-8` property 2 repairs only where _"the repair changes no product behavior, no public surface and no decided contract,"_ and property 5 stops where a repair would need _"a rule turned off, a disable comment or a changed runtime name."_ These three need one or the other:

| Site | Rule | Why no repair keeps the surface |
| --- | --- | --- |
| `packages/material-x/src/button-group/ButtonGroupCore.ts:37` | `no-generated-empty-object-type` | `ButtonGroupLikeProps = Props<typeof ButtonGroupLike>` is exported, and resolves to `{}` because the trait has no props. Any spelling of `{}` is reported by this rule or by `no-empty-object-type`, and any non-empty type changes what the export means |
| `packages/material-x/src/list/ListItemCore.ts:19` | `no-generated-empty-object-type` | `ListItemCoreProperties = Record<never, never>` is exported from the published `list` entries and intersected in `ListInteractiveItemCore.ts:25` and re-exported as `ListItemProperties` (`list-item.ts:19`). `Readonly<Record<string, never>>` would make every intersected property `never` |
| `packages/core/src/utils/DOM.ts:37` | `no-unnecessary-type-parameters` | The public overload `$<E extends Element = Element>(host, selectors: string): E \| null \| undefined` mirrors `querySelector`'s generic, and `useSlot.ts:44` calls `$<HTMLSlotElement>`. **oxlint runs the same rule** (`.oxlintrc.json:131`) and the line already carries `// oxlint-disable-next-line typescript/no-unnecessary-type-parameters`. `buildFromOxlintConfigFile` doesn't disable ESLint's copy, so ESLint reports what the repository already exempted |

**What the architect decides:**

- whether these two exported types and this overload change, which is a public surface decision for material-x and core;
- or whether the lint configuration treats them otherwise. For the third, that could mean disabling ESLint's duplicate of a rule that oxlint enforces, as the configuration's block after `buildFromOxlintConfigFile` already does for five rules.

## Resumed after `RD-11`

**Input:** `53927298b` (`RD-11`), then `e93e490ea` (`RD-12`, Safari) and `1fdef08ae` (`RD-13`, baselines on GitHub's runner), as the coordinator relayed each.

### Item 5, completed

- **`RD-11`** (`4e8eaf9d2`): `eslint.config.ts` turns off `@typescript-eslint/no-unnecessary-type-parameters`, in the block after `buildFromOxlintConfigFile` that turns off rules oxlint duplicates. It also turns off `@typescript-eslint/no-generated-empty-object-type`, with a comment that names the `allow` of `typescript/no-empty-object-type`. No source file changed.
  - With `DOM.ts`'s `oxlint-disable-next-line` comment removed in a scratch edit, oxlint reports `no-unnecessary-type-parameters` at `src/utils/DOM.ts:39`, from core's directory and from the root. Reverted ([`checks/rd11-oxlint-still-enforces.txt`](checks/rd11-oxlint-still-enforces.txt)).
  - oxlint and ESLint, run separately, exit 0 in all eight packages and at the repository level ([`checks/lint-after-rd11.txt`](checks/lint-after-rd11.txt)).
- **On a fresh checkout,** `just lint` failed: type-aware lint resolves workspace packages through their builds, which a fresh tree lacks, and the root ESLint run reads material-x's generated `custom-elements.json`. `RD-6` property 3 repairs the recipe (`234ade127`):
  - `nx.json` gives `lint` and `lint:fix` `dependsOn: ["^build"]`, as `typecheck` has.
  - drag's `project.json` adds its own `build`, because `tests/support/oracles.build.ts` imports its emitted modules.
  - vite-traits-plugin's `project.json` adds core's `build` as a task dependency. Its fixtures import `@ydinjs/core`, and a project dependency would form a cycle, because core's build uses the plugin.
  - The root `lint` and `lint-fix` run material-x's `build:cem` before the repository-level files.
- **Each recipe on its own fresh clone of `234ade127`** after `npm ci`: `just fmt-check` exits 0 in 6 s, `just lint` in 38 s, and `just typecheck` in 6 s ([`checks/fresh-checkout.txt`](checks/fresh-checkout.txt)).
- A probe comment I had edited contained `**/*`, which ends a block comment. It is reworded, and the probe's result is unchanged.

### Item 6, the local inventory and its dispositions

**`just test` on a fresh checkout** couldn't load Vitest's configuration: `.scripts/vite-config.ts` imports `@ydinjs/vite-custom-element-assets`'s build, and that plugin reads the property list that material-x's `build:prepare` writes. The root `test` recipe now builds `box-quad`, `core`, `tproc` and the two Vite plugins, then runs material-x's `build:prepare` (`f0ec37881`). drag's own build stays the consumer project's global setup.

**Chromium,** `CI=true npx just test --coverage --tags-filter '!measurement'` on a fresh clone ([`checks/inventory-local.txt`](checks/inventory-local.txt)):

- **The first run** failed 2 rows: `RF-29`'s `tproc` row and `radio.visual` _should match the selection state matrix_.
- **After the repairs below,** five runs at `f0ec37881` passed: 1,844 tests, 12 skipped, exit 0, 261 to 267 s each.

**Firefox,** `MX_TEST_ENGINES=firefox npx just test --project '*/firefox' --tags-filter '!measurement'`, five runs at `f0ec37881`: the same 18 rows failed in each, about 432 s each.

| Row | Engine | First error | Handling |
| --- | --- | --- | --- |
| `tproc` `TokenPackageProcessor` › _should apply inheritance and render declarations_ (`RF-29`) | node | `expected { 'state-layer.opacity': 0.08 } to deeply equal { 'container.color': 'red', …(1) }` | **Repaired in the test.** `state()` is documented as deduped against what a state inherits (`TokenPackage.ts:61`, `ExtensionManager.ts:161`), and `hovered` inherits `container.color: red` |
| `radio.visual` › _should match the selection state matrix_ (`RF-29`) | Chromium | 29 pixels differ, 1 run in 5 | **Repaired in the test setup.** The pointer stayed where an earlier test had left it, and over the unchecked radio it rendered hovered. The failing capture is pixel-identical to one taken with that radio hovered on purpose. `browser-setup.ts` moves the pointer to the page's corner before each test. A scratch test that leaves the pointer there fails the row without the reset and passes with it ([`checks/radio-pointer.txt`](checks/radio-pointer.txt)). A first probe ruled out animations ([probe](checks/radio-animations.probe.browser.test.ts)) |
| core `useReorderable`, 12 rows | Firefox | `expected false to be truthy` and others; the drag never activated | **Repaired in core's test setup** (`6e5484670`). `user-event`'s untrusted pointer is unknown to the browser, and Firefox throws `NotFoundError: Element.setPointerCapture: Invalid pointer id` where Chromium does nothing. The setup ignores that one error, and every other one still throws. With it, all 47 rows of the file pass in Firefox |
| core `useShadowDOM` › _should adopt the provided stylesheets_ | Firefox | `expected [ CSSStyleSheet{} ] to deeply equal [ CSSStyleSheet{} ]` | **Repaired in the test.** In Firefox the adopted sheet is the same object, but deep equality doesn't match the observable array against an array. The assertion compares a copy |
| material-x `mx-button` and `mx-icon-button` › _should delegate focus to the native button_; `mx-connected-button-group roving tabindex` › _ArrowRight_ and _End_ | Firefox | `expected null to be <button …>`; `expected -1 to be +0` | **Disabled in Firefox,** `it.fails`, with **`repo:RF-33`**. A plain `delegatesFocus` host delegates in the same Firefox and `mx-button` doesn't; the group rows depend on that focus |
| box-quad `coordinates numeric precision` › _should derive a rotated and scaled size to within a ten-thousandth_ | Firefox | `expected 0.007638968374838129 to be less than or equal to 0.0001` | **Disabled in Firefox,** `it.fails`, with **`repo:RF-34`**. Firefox's 1/60 px layout unit is the inferred cause |

- **Disabled rows:** 5 in Firefox, and none in Chromium. **`RF-29`'s note** (dated 2026-11-16) records both repairs.
- **The measurement row** `hot-path.browser.test.ts:261` is registered as **`drag:DRF-48`** and left as it is. It failed locally in Chromium 158 and passed in the CI measurement job.
- **No finding was registered for Playwright's WebKit,** as the Safari section directs.

### Item 7, the workflow

`.github/workflows/verify.yml` (`9c96be2d8`, then `6e5484670`, `16e0185b0`, `26453da9c` and `ba3c4019e`) and `codecov.yml`:

- **Jobs:**
  - `static`, `chromium`, `firefox` and `safari`;
  - `verify`, which needs the four and fails unless each succeeded;
  - `measurements`, which has `continue-on-error`.
- **Triggers and runners:** RD-6's triggers, with cancellation for pull requests only, and drafts skipped in every job. `contents: read`, and `pull-requests: write` for `measurements` only. `ubuntu-24.04`, `macos-26` for `safari`, and Node 26. Every action is pinned to a full commit hash.
- **Test jobs** run Vitest's default reporters and fail on its exit status.
- **`chromium`:**
  - checks out the full history, because the record resolver's `repo` tests read retired scopes from it;
  - sets `MX_TEST_VISUAL=1` and logs the runner image and the processor;
  - uploads coverage whenever the run isn't cancelled, and the screenshots when it fails.
- **Coverage:** Vitest's `coverage.include` is `packages/*/src/**` and `src/**`, and `reportOnFailure` is on (`76f8cac47`), because the first upload found no report after failing tests. `codecov.yml` sets both statuses to informational and ignores tests, tooling and dependencies.
- **`measurements`:**
  - runs the measurement rows with the declaration projects excluded, because a declaration project has no tags and its rows appeared in the first report;
  - reads the size reading at the head and at the merge base, writes the report to the job summary, and posts or updates the comment.
- **`timeout-minutes`** are provisional: 10 for `static`, 20 for `chromium`, and 30 for the others. They are re-set from item 8's readings once a full run completes.

### `RD-12`: Safari

- **Dependencies:** `@vitest/browser-webdriverio` 5.0.0 and `webdriverio` 10.2.0, exact root `devDependencies`. `npm ls @vitest/browser` shows one copy, 5.1.0 ([`checks/vitest-browser-copies.txt`](checks/vitest-browser-copies.txt)). npm blocked `geckodriver`'s install script, which Safari doesn't use.
- **The factory:**
  - The engines are `chromium`, `firefox` and `safari`, and `webkit` is the unknown-engine error.
  - A Safari project uses the WebdriverIO provider, isn't headless, has one worker and no file parallelism, and has `traceView: 'off'`.
- **drag's `test-engines`** runs the engines `MX_TEST_ENGINES` lists, after `RD-13`. `click-guard.browser.test.ts:372` names `safari`.
- **The project lists,** including Safari's, are read with a listing that starts no browser ([`checks/engine-selection.txt`](checks/engine-selection.txt)).
- **The `safari` job** enables remote automation with `sudo safaridriver --enable` and logs the macOS and Safari versions.
- **First reading** (run 43815220593, `26453da9c`):
  - macOS 26.7.2 (25G332), Safari 27.2. `npm ci` succeeded on macOS, and the projects loaded.
  - Every row of `browser/material-x/safari`'s `CheckableCore.browser.test.ts`, 44 of 44, failed at about 30 s each, including rows that send no input. The job reached its 30-minute timeout before Vitest printed any error.
- **A narrowed reading** (`e0a4173a9`) runs the frame probe ([probe](checks/safari-frame.probe.browser.test.ts)) and one `CheckableCore` row. Its first run broke on my own quoting: `just` re-split a `-t` pattern containing `|`, and the shell ran it as a pipe. Its second run, at `ba3c4019e`, couldn't start (see the blocker).
- **Not done:** the frame reading, the commands (`RD-12` property 4), the rows limited for Safari (property 5), and Safari's inventory and three runs.

### `RD-13`: baselines on GitHub's runner

- **Implemented** in `ba3c4019e`:
  - `.github/workflows/baselines.yml`, with its two jobs. `record` has a read-only token, checks out the pull request's head commit, records with the update flag, and uploads only the added or changed files. `propose` runs no repository code and accepts only baseline paths.
  - The visual project is declared only with `MX_TEST_VISUAL=1`. material-x's `test-visual` and `test-visual-update` recipes are removed, and the `test-component` skill's two mentions say that visual runs only in CI and the recording workflow records baselines.
  - The devcontainer installs only Chromium.
- **The update flag** rewrites a baseline only where its comparison failed or it didn't exist, from Vitest 5.1.0's matcher code and item 1's run ([`checks/update-flag-writes.txt`](checks/update-flag-writes.txt)).
- **The path filter** accepts all 19 committed baselines and refuses all 8 bad paths, including `..` segments and a non-PNG under `__screenshots__/` ([`checks/baselines-path-filter.txt`](checks/baselines-path-filter.txt)).
- **This unit's recording,** run [43819875527](https://github.com/ausginer/material-x/actions/runs/43819875527):
  - The label was added under the owner's authorization, and the run recorded at `ba3c4019e`.
  - Runner image ubuntu24 20261111.370.1, AMD EPYC 9V74 80-Core processor, Chromium 158.0.8127.18. `record` took 88 s and `propose` 22 s.
  - It opened [#28](https://github.com/ausginer/material-x/pull/28) from `baselines/ci/verification` into `ci/verification`, with exactly the 16 baselines that CI failed, and removed the label.
  - **The owner reviews and merges #28. I didn't merge it.**

### The visual stop, for the record

Run [43813617164](https://github.com/ausginer/material-x/actions/runs/43813617164) at `9c96be2d8`, Chrome for Testing 158.0.8127.18 on `ubuntu-24.04` image 20261111.370.1:

- 16 of the 19 baselines recorded in the devcontainer failed, by 2 to 1,014 pixels, on anti-aliased edges, with matching dimensions.
- The next run, 43815220593, failed the same 16 rows by the same counts.
- Every actual and diff image is under [`visual/ci-run-43813617164/`](visual/ci-run-43813617164/).
- `RD-13` decided it.

### CI runs

| Run | Head | static | chromium | firefox | third engine | measurements |
| --- | --- | --- | --- | --- | --- | --- |
| [43813617164](https://github.com/ausginer/material-x/actions/runs/43813617164) | `9c96be2d8` | pass, 111 s | fail, 358 s: 16 visual rows and 5 `repo` rows (shallow clone) | fail, 514 s: 18 rows | `webkit`, fail, 391 s: 2 drag rows (recorded only) | pass, 184 s. Comment posted with "no base reading" |
| [43815220593](https://github.com/ausginer/material-x/actions/runs/43815220593) | `26453da9c` | pass, 104 s | fail, 393 s: the same 16 visual rows | fail, 510 s: the 6 rows the next commit handles | `safari`, timed out at 30 min | pass, 170 s |
| [43819003831](https://github.com/ausginer/material-x/actions/runs/43819003831) | `e0a4173a9` | fail, 39 s: the temporary probe unformatted | fail, 435 s: the 16 visual rows; Codecov found no report | **pass, 476 s** | `safari` reading, fail, 162 s: my quoting | pass, 168 s |
| [43819462065](https://github.com/ausginer/material-x/actions/runs/43819462065) | `ba3c4019e` | startup failure: the Actions policy |  |  |  |  |

### The blocker

Run 43819462065's message: _"The actions actions/checkout@3d3c42e5…, actions/setup-node@949feb24…, codecov/codecov-action@303a32d7…, and actions/upload-artifact@cf430e03… are not allowed in ausginer/material-x because all actions must be from a repository owned by ausginer."_ The recording run just before it used the same `actions/*` and succeeded, so the policy changed between them. I reported it through the coordinator and changed nothing.

## Not done

- **The blocker** above, which is the owner's.
- **After the owner's merge of #28:** `RD-13` items 7 and 8. That means the reproduction in three `chromium` runs, with each run's image version and processor, and a second labeled run that proposes nothing.
- **Safari:** `RD-12` items 5 to 8. After the reading, revert `e0a4173a9`'s probe and its job steps.
- **Item 8's checks:** the Codecov upload succeeding; the measurement job with a lowered ceiling; the gate with a failing row; the draft check; and the jobs' `timeout-minutes` from observed durations.

## Next

The owner resolves the Actions policy and reviews and merges #28. Then the unit resumes with the Safari reading and `RD-13`'s reproduction.