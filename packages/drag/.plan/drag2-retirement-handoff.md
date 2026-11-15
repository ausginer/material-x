# Handoff: retire `@ydinjs/drag2`

**Recipient:** the implementer. **Branch:** `drag2/removal`. **Input:** `0870abd75`, which is `main` after #19, and the architect's record commit on this branch.

**Governing records:** `drag:DRD-64` and `drag:DRO-17` in [`00-index.md`](00-index.md), `repo:RD-5` in [`.plan/00-index.md`](../../../.plan/00-index.md), and `drag:DRF-43`. The comparison that makes deletion safe is [`drag2-retirement-assessment.md`](drag2-retirement-assessment.md). The tests for the guarantees that only drag2 asserted are a separate unit, [`drag2-guarantees-handoff.md`](drag2-guarantees-handoff.md), which this one doesn't wait for.

**Scope:** carry drag2's stories into drag, move the record resolver out of drag2, remove every reference to drag2 outside the records, delete the package, and repair the prototype arm. **Do not expand:** don't port any drag2 test, source or document beyond what the items below name, don't change drag's `src` apart from the stories, and don't rewrite any dated record.

**drag2's final tree is `0870abd75`.** No commit on this branch changes a file under `packages/drag2/`, apart from the commit that deletes it. Read drag2 there with `git show 0870abd75:packages/drag2/<path>`.

**Order.** Items 1 to 4 leave drag2 in place and the tree green. Item 5 deletes it with the wiring that names it, in one commit, so that no commit has a configuration that points at a missing package. Item 6 is independent. Commit each item separately.

## 1. The stories

drag2's seven stories replace drag's `Sortable` and `Free Drag` stories. They are rewritten on drag's API. They are not copied: drag2's comments describe drag2's mechanics, such as fragments, `invalidate()` after a commit and lift modes, and are false for drag.

**Files:** `src/sortable.stories.tsx`, `src/free-drag.stories.tsx` and `src/stories.module.css`. `src/draggable.stories.tsx` (`Custom Behavior/ResizeHandle`) stays, with its styles. Titles stay `Drag/Sortable`, `Drag/Free Drag` and `Drag/Custom Behavior`.

| drag2 story | In drag | What changes |
| --- | --- | --- |
| Sortable / List | List | drag2's labels, markup and look: `role="list"`, focusable `role="listitem"` rows, the grip glyph |
| Sortable / Grid | Grid | `xy()`, drag2's eight tiles in a wrapping field |
| Sortable / CustomPlaceholder | CustomPlaceholder | the factory receives drag's `PlaceholderContext` |
| Sortable / ZoomedContext | ZoomedContext | the list under `zoom: 1.25` |
| Free drag / Interactive | Interactive | replaces drag's `Bounded`: the `axis`, `bounded` and `tilted` controls, plus `landing()` |
| Free drag / AsyncDropConfirmation | AsyncDropConfirmation | the status text through `onStart`, an async `onDrop` and `onEnd` |
| Free drag / TransformedStage | TransformedStage | the rotated, scaled stage and its local-delta readout. **No lift control:** drag has the faithful lift only (architecture plan §5) |

**Required properties:**

1. **Every sortable story commits inside `onReorder`,** through `flushSync` from `from` and `to`, as drag's current stories do, and calls nothing else. drag pulls `items()` at each press, so there is no `invalidate()` call.
2. **Every free-drag story commits an accepted drop in `onEnd`,** by writing `result.request.localDeltaX` and `localDeltaY` into the box's `translate`, as drag's `Bounded` does now. A box that returns home after an accepted drop is a defect. `tilted`'s own `transform` composes with that `translate`.
3. **Every hint and comment states only what drag does.** A claim that drag doesn't make true is removed and not reworded. For example, drag2's Grid hint says that the same drag under `y()` proposes nothing. Keep that claim only if you observe it in drag. Comments follow drag's own stories: short, present tense, no decision numbers.
4. **One stylesheet** holds drag2's look and the resize handle's styles. A class that no story uses is removed. The placeholder rule targets `[data-drag-placeholder]`, which drag writes.
5. **`tests/stories.browser.test.ts`** mounts each story with React, as `tests/frameworks.browser.test.ts` does, and drives it with real pointer input:
   - each sortable story: two pointer reorders in a row, with the rendered order asserted after each;
   - Interactive with `bounded`, and TransformedStage: one drag and an accepted drop, after which the box's rectangle stays where it was dropped, within 1 px;
   - AsyncDropConfirmation: the status passes through `saving…` to `accepted`;
   - ResizeHandle: one drag changes the target's size, and `Escape` during a second drag restores it.

   The file runs in the source browser project. It isn't added to the consumer project, because the stories import `src`.

**Checks:** the new test passes in Chromium, Firefox and WebKit (`npx just test-engines`). The Storybook build (`nx run @ydinjs/material-x:docs:build`) succeeds, and the `Drag` group lists the eight stories. Look at each story in `npx just docs-dev` and record one line per story in the report: whether it works as its hint says.

## 2. Documentation that names drag2

Current-state documents stop depending on drag2 (`drag:DRD-64` property 3). Each change below is required. Its wording is yours.

| File | Change |
| --- | --- |
| `.agents/docs/accessibility.md` | Remove §Drag (`@ydinjs/drag2` sortable). Before removing it, move its two conclusions that drag's section doesn't state into drag's section, in present tense: **a multi-press keyboard mode is not supported, on its two grounds** (parity with what drag replaced, and one-press-per-move being a complete pattern), which replaces the line that cites `drag2:Q-13 below`; and, under missing requirements as `[Docs]`, **a `handle` removes keyboard reordering unless the consumer makes the handle focusable.** No drag test asserts the second claim yet: row S4 of [`drag2-guarantees-handoff.md`](drag2-guarantees-handoff.md) adds one. If S4 hasn't landed, confirm the claim in drag with a scratch probe, write it, and say how you confirmed it in the report |
| `.agents/docs/architecture.md` | Remove the sentence on drag2 as reference evidence |
| `.agents/docs/coordinator.md` | Remove drag2's reading list and package from the workspace list. The register sentence keeps `repo` and names no drag2 register |
| `.agents/docs/agent-workflow.md` | The example addresses become `drag:DRD-13` and `repo:RD-1`. The register sentence says that drag2's bare `D-`/`F-`/`Q-`/`I-` series are retired and closed to every other scope (`repo:RD-1`, `repo:RD-5`) |
| `.agents/docs/review-findings.md` | The same statement of the bare series |
| `.agents/docs/documentation.md` | §7: remove the `references.node.test.ts` row, and record withdrawn capabilities only in the record. §9: add one change row, which names `repo:RD-5` |
| `.agents/docs/handoff.md` | §Markdown step 2: no repository instrument checks Markdown links, so check them manually or with a scratch script and report how |
| `.agents/docs/measure/brief.md` | Each drag2 path is named as read at `0870abd75` |
| `CONTRIBUTING.md` | §Reading one entry of a record: the command is `.scripts/entry.sh drag:DRD-13`, the scope map is in `.scripts/entry.ts`, and the `awk` example reads `packages/drag/.plan/00-index.md`. Add one sentence: a retired scope resolves at the commit that its scope row names. §1.1: remove `, onError in drag2`. §4's evidence line: its link to `failure-vocabulary-cost-claude.md`, a drag2 review, becomes that path named at `0870abd75`. Change record: one new row naming `repo:RD-5`. Re-point an existing row's link to a drag2 path as `drag2:<id>` or as the path at `0870abd75`. The row's text doesn't change |

Each document's own change record follows its rule, and no rule text keeps a dated amendment.

**Not changed:** every file under `packages/*/.plan/` and `.plan/`, the three `.plan/*.json` traces, and `packages/drag/.plan/contract.md` §Accepted differences from drag2.

**Checks:** `npx oxfmt` on each file, links checked by a scratch script (report it as that), `git diff --check`.

## 3. The record resolver (`repo:RD-5`)

`packages/drag2/.scripts/entry.{sh,ts}` and the `entries` reading in `packages/drag2/tests/ledger.ts` become `.scripts/entry.sh` and `.scripts/entry.ts`.

**Required properties:**

1. **The same interface and the same three refusals:** `<scope>:<local-id>`, a bare id refused, and unknown scope, unknown id and duplicated id told apart, each with exit 1.
2. **Scopes:** `repo` (`.plan/00-index.md`), `drag` (`packages/drag/.plan/00-index.md`, `packages/drag/.plan/contract.md`) and `drag2`, retired. The example in the usage text and in the unqualified-address hint is `drag`.
3. **A retired scope is read at the commit its row names, never from the working tree.** `drag2` is read at `0870abd75`, from `.plan/contract/*.md` and `.plan/obligations.md`, through `git ls-tree` and `git show`. For every id that `packages/drag2/.scripts/entry.sh drag2:<id>` prints at `0870abd75`, the new resolver prints the same bytes. A clone that doesn't hold the commit gets an error that names the commit, which differs from the three refusals.
4. **One reading of an entry:** the `####` heading rule and the `#{1,4}` terminator, as now. No new dependency. The resolver doesn't need `markdown-it`.
5. **Tests:** `.scripts/entry.node.test.ts` carries the cases of `packages/drag2/tests/entry.node.test.ts` that test the resolver and not drag2's record: titled and titleless entries, exact match, the sub-clause, a multi-letter family, `repo:RD-1`, both `drag` documents, the three refusals told apart, and the duplicate. It adds the retired scope: `drag2:D-210` prints the text that the old resolver prints at `0870abd75`. A node project named `repo` in `.scripts/vitest-config.ts`'s workspace config runs `.scripts/**/*.node.test.ts`. A duplicate case uses a fixture and not a real record.

**Checks:** root `tsc -p tsconfig.json --noEmit` reports no new error in `.scripts/`. The new tests pass. Run `.scripts/entry.sh` on `repo:RD-5`, `drag:DRD-64`, `drag:DRI-1` and `drag2:D-210`, and compare each byte for byte with the old resolver's output for the same address at `0870abd75`, `repo:RD-5` and `drag:DRD-64` excepted. Record the outputs in the report.

## 4. drag's bench without drag2 (`drag:DRD-64` property 4)

- Delete `bench/lab-drag2.ts`.
- `bench/compare.ts`: without `--before`, the arms are the prototype, production and the control. `judge`'s default `against` is `['prototype']`. **`--rejudge` judges against the before arms the recording holds,** so a recording from before this change, with a `drag2` arm, is judged as it was. Header and comments name no drag2.
- `Justfile`'s `compare` comment and `bench/size/measure.ts`'s header name no drag2.

**Checks:** `npx just typecheck` in `packages/drag` exits 0. This removes the two `TS2724` errors, which come only through `lab-drag2.ts`. Run `node bench/compare.ts --prove --dry`. Run `node bench/compare.ts --rejudge .plan/measurements/2026-11-10-performance-b1.json` before and after the change. That run has a `drag2` arm, and the two printed summaries are identical.

## 5. Delete drag2, with its wiring (one commit)

- **Delete** every tracked file under `packages/drag2/` (598 at `0870abd75`, `.plan/` included), and the ignored output under it.
- **Root `Justfile`:** remove `drag2` from `size`, `typecheck`, `fmt`, `fmt-check`, `lint` and `lint-fix`. Correct the test comment's project and configuration counts.
- **`vitest.config.ts`:** remove the drag2 command import and its two options.
- **`.scripts/vitest-config.ts`:** remove `drag2Root`, `drag2Commands`, `DRAG2_SHIPPED_BROWSER_TESTS`, `DRAG2_NODE_BUILD`, the four drag2 projects, and the sentence at line 38 that names drag2. Keep `createDragTestProjects`, which drag uses.
- **`.scripts/vite-config.ts`:** keep `define: { __DEV__: 'true' }`, which drag needs. Its comment explains it for drag's `src/globals.d.ts`.
- **`.scripts/call-graph.ts`:** the example path names no drag2.
- **`.gitignore`:** the `src/**/*.d.ts` exception stays, because drag and `size-limit-preset-rolldown` have authored declarations. Its comment names drag's `globals.d.ts`. Remove the `bench/**/*.js` and `bench/**/*.d.ts` exceptions and their comment: their only tracked files are drag2's.
- **`package-lock.json`:** regenerated with `npm install`. The only change is the removal of `packages/drag2`, `node_modules/@ydinjs/drag2` and the packages that only drag2 required. Report the removed entries.

**Checks:**

- `git grep -n drag2 -- ':(exclude,glob)**/.plan/**' ':(exclude,glob).plan/**'` matches only:
  - `drag2:` addresses;
  - the resolver's `drag2` row and its test;
  - `CONTRIBUTING.md`'s and `documentation.md`'s change-record rows;
  - drag2 paths named at `0870abd75`, in `.agents/docs/measure/brief.md` and `CONTRIBUTING.md` §4.

  Report any other match and stop.

  **Note, 2026-11-15, after the unit:** this list is wrong. It leaves out the register sentences in `.agents/docs/agent-workflow.md` and `review-findings.md`, which item 2 requires to name drag2's retired bare series, so each leaves one match. Item 2 takes precedence, and those two matches are expected. Item 5 also landed as two commits, `63d56fd89` and `3a77addd8`. The owner accepted that, because pull requests are squash-merged ([`00-index.md`](00-index.md) §Disposition of the drag2 retirement review). The text above is unchanged.

- Root `npx just typecheck`, `npx just lint` and `npx just test` exit 0, and the test summary counts the projects as the corrected comment does.
- In `packages/drag`: `npx just test`, `npx just test-engines` and `npx just size`, the last with the same verdicts as at the input.

## 6. The prototype arm (`drag:DRF-43`)

Bundle the prototype arm of `compare.ts`, and `measure.ts --prototype`, against `packages/box-quad/src` at `599684791`, read with `git archive` like the prototype's own source. Nothing else changes.

The architect showed that this is enough: on `0870abd75`, `bench/lab.ts` on the prototype's `src` fails to bundle against the current box-quad (`MISSING_EXPORT` `box` and `space`), and bundles against box-quad at `599684791`.

**Checks:** `node bench/size/measure.ts --prototype` prints a prototype column. `node bench/compare.ts --rounds 1 --only "<one move row>"` reaches a verdict for the prototype, production and control arms. A timing result isn't owed.

## Report

`packages/drag/.plan/drag2-retirement-report.md`:

- the commit of each item;
- each check above, with its result or the reason it didn't run;
- the story lines from item 1;
- the resolver outputs from item 3;
- the removed lockfile entries.

Leave the decision status rows to the architect. The unit stops at the pushed report, and the pull request is the owner's.