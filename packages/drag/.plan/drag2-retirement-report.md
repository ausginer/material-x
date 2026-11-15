# Report: drag2 retired

**Handoff:** [`drag2-retirement-handoff.md`](drag2-retirement-handoff.md). **Input:** `b376b356c` on `drag2/removal`, with drag2 read at `0870abd75`. **Governing records:** `drag:DRD-64`, `drag:DRO-17`, `drag:DRF-43` and `repo:RD-5`. The owner's constraint of 2026-11-15 applies: TransformedStage has the faithful lift only, with no lift control.

**Outcome:** all six items are implemented. Two departures from the handoff are open and need a decision (§Open). Raw evidence is in [`probes/drag2-retirement/`](probes/drag2-retirement/).

## Commits

| Item | Commit | Subject |
| --- | --- | --- |
| 1. Stories | `aa68dae08` | drag: take drag2's seven stories, rewritten on drag's API, with a browser test |
| 3. Resolver | `1e763c326` | repo: move the record resolver to .scripts and read drag2 at its final commit |
| 2. Documents | `73691a47c` | docs: stop current-state documents depending on drag2 |
| 4. Bench | `15e0a1b20` | drag: withdraw the drag2 arm from compare.ts and judge recordings against their own before arms |
| 5. Deletion | `63d56fd89` | drag2: delete the package and the wiring that names it |
| 5. Wiring | `3a77addd8` | drag2: remove the wiring and lockfile entries that name the deleted package |
| 6. Prototype arm | `5c1ce7bfe` | drag: bundle the prototype arm against box-quad at the prototype's revision |

Item 3 is committed before item 2, because item 2's `CONTRIBUTING.md` names `.scripts/entry.sh`, which item 3 creates.

**Item 5 is two commits, not one.** A failed `git add` pathspec left the wiring out of `63d56fd89`, so that commit deletes drag2 while the root configuration still names it. `3a77addd8` follows directly. `AGENTS.md` forbids amending without being asked, so the two are not squashed. See §Open, item 1.

## Item 1: the stories

`src/sortable.stories.tsx`, `src/free-drag.stories.tsx` and `src/stories.module.css` are rewritten on drag's API. `tests/stories.browser.test.ts` drives every story. `src/draggable.stories.tsx` is unchanged.

- Every sortable story commits inside `onReorder` through `flushSync`, from `from` and `to`, and calls nothing else.
- Every free-drag story commits an accepted drop in `onEnd`, by adding `result.request.localDeltaX` and `localDeltaY` to the box's `translate`. Interactive keeps the offset across a control change.
- **Grid's hint drops drag2's claim** that the same drag under `y()` proposes nothing. It was not observed in drag, so it was removed rather than reworded.
- **CustomPlaceholder's factory returns an element with a class and the text "Drop here".** drag sizes it and writes `aria-hidden` and `data-drag-placeholder`, so the factory no longer sets a size.
- The stylesheet holds drag2's look and the resize handle's two classes. drag's former `.cell` is removed. The default placeholder rule targets `[data-drag-placeholder]`.
- `tests/stories.browser.test.ts` is added to `DRAG_SOURCE_ONLY_BROWSER_TESTS`, so the consumer project leaves it out.

**Checks:**

| Check | Result |
| --- | --- |
| `tests/stories.browser.test.ts`, Chromium (`npx just test`) | 8 of 8 passed |
| The same file, `npx just test-engines` | Chromium and Firefox: 16 of 16 passed. **WebKit did not launch** (§Open, item 3) |
| `nx run @ydinjs/material-x:docs:build` | **At item 5,** exit 0, and the `Drag` group lists the eight stories. At item 1 it failed on drag2's own stories (`MISSING_EXPORT` `box` and `space`), which item 5 deletes |
| Lint, format and drag typecheck on the item's files | clean. The typecheck's only errors were drag2's two `TS2724`, removed by item 4 |

**One line per story,** in `npx just docs-dev` at item 5, driven with Chrome DevTools pointer and key input:

- **Sortable/List:** works as its hint says. A pointer drag moved Inbox to third, and ArrowDown on the focused row moved it again with focus kept.
- **Sortable/Grid:** works as its hint says. A diagonal drag from tile 1 onto tile 7 moved it into the second row.
- **Sortable/CustomPlaceholder:** works as its hint says. During the drag the placeholder had the factory's text and class, `aria-hidden="true"`, and the dragged row's size (360 × 43). None was left after the drop.
- **Sortable/ZoomedContext:** works as its hint says. The lifted row and the placeholder measured 450 × 54, the zoomed size of a 360 px row.
- **Free Drag/Interactive:** works as its hint says. Bounded, a drag of (200, 100) committed `translate: 201px 101px` and stayed put. A drag past the area clamped to its corner. With `axis: x` and `tilted`, only x moved and the tilt composed with the `translate`. Escape was not exercised by hand.
- **Free Drag/AsyncDropConfirmation:** works as its hint says. The status went idle → dragging… → saving… → accepted, and the lift held the box at the drop point until it was accepted.
- **Free Drag/TransformedStage:** works as its hint says. The lifted box kept the stage's rotation and scale (121 × 121 bounding box throughout), the readout showed a local delta of (136, 39), and the box stayed where it was dropped.
- **Custom Behavior/ResizeHandle:** works as its hint says. A (60, 40) viewport drag resized the target from 240 × 140 to 312 × 178 in the parent's own space. The browser test covers Escape.

## Item 2: documents

Changed: `.agents/docs/accessibility.md`, `architecture.md`, `coordinator.md`, `agent-workflow.md`, `review-findings.md`, `documentation.md`, `handoff.md`, `measure/brief.md` and `CONTRIBUTING.md`.

- **accessibility.md:** §Drag (`@ydinjs/drag2` sortable) is removed. drag's section now states that a multi-press keyboard mode is not supported, on the two grounds. It also states, as `[Docs]`, that a `handle()` removes keyboard reordering unless the consumer makes the handle focusable.
  - **S4 had not landed,** so the handle claim was confirmed with a scratch probe in Chromium ([`handle-probe.browser.test.ts.txt`](probes/drag2-retirement/handle-probe.browser.test.ts.txt)). With a handle, a focused row whose handle is not focusable did not reorder on ArrowDown. A focused handle reordered, and a focused row with no handle reordered (the control). 3 of 3 passed. The probe was removed from `tests/`.
- **brief.md:** each drag2 path is named at `0870abd75`. Two links were already broken before this unit (`../drag/contract/05-…` and `03-…`). They pointed at drag2's contract and now name it at `0870abd75`.
- **CONTRIBUTING.md:** the changes item 2 lists. The existing change-record rows that linked into drag2 now cite `drag2:<id>` or name the path at `0870abd75`. The citations `(D-171, D-173)` and `(D-174, D-175)` in §Reading one entry of a record become `drag2:` addresses.
- **documentation.md:** the §9 change-record rows that linked into drag2 are re-pointed the same way.

**Checks:** `npx oxfmt` on each file. A scratch link checker ([`links.py.txt`](probes/drag2-retirement/links.py.txt)) checked relative links and their `.md` anchors in the nine files: 49 links, 0 bad, after the `brief.md` repair. This is a scratch check, not a repository instrument. `git diff --check` was clean.

## Item 3: the resolver

`.scripts/entry.sh`, `.scripts/entry.ts`, `.scripts/entry.node.test.ts` and the fixture `.scripts/fixtures/entry-drag2-D-210.txt`. The workspace config gains a node project named `repo` that runs `.scripts/**/*.node.test.ts`.

- The scopes are `drag` (the example in the usage text and the hint), `repo`, and `drag2`, retired at `0870abd75`. The retired scope is read through `git ls-tree` and `git show` from `.plan/contract/*.md` and `.plan/obligations.md`.
- A clone without the commit gets `drag2 is retired and read at 0870abd75, which this clone does not hold` (exit 1), which is distinct from the three refusals.
- The entry reading is the `####` heading and the `#{1,4}` terminator, with no dependency.
- The duplicate case and the missing-commit case run in a fixture repository: a temporary `git init` directory holding a copy of the resolver and a `.plan/00-index.md` that defines `RD-1` twice.

**Checks:**

| Check | Result |
| --- | --- |
| Root `tsc -p tsconfig.json --noEmit` | exit 0 |
| `vitest run --project repo` | 14 of 14 passed |
| **Every drag2 id against the old resolver.** All 731 ids that open a `####` heading in drag2's current-state documents at `0870abd75`, through `packages/drag2/.scripts/entry.sh` (before deletion) and `.scripts/entry.sh` | 731 identical, stdout, stderr and exit code |
| The four named addresses, against the old resolver run in a temporary worktree at `0870abd75` | `drag:DRI-1` and `drag2:D-210` identical byte for byte. `repo:RD-5` and `drag:DRD-64` are excepted: at `0870abd75` the old resolver prints `unknown local id`, because neither entry existed |

The outputs are in [`probes/drag2-retirement/resolver/`](probes/drag2-retirement/resolver/): `new-<address>.txt` from the new resolver, and `old-at-0870abd75-<address>.txt` from the old one.

The refusals differ from the old resolver's in two ways the handoff requires. The unqualified-address hint offers `drag:` rather than `drag2:`, and the unknown-scope message lists `drag, repo, drag2`.

## Item 4: the bench

- `bench/lab-drag2.ts` is deleted.
- Without `--before`, `compare.ts` builds the prototype, production and the control. `judge`'s default `against` is `['prototype']`.
- `--rejudge` judges against the arms the recording holds, apart from `production` and `control`.
- No header, comment or recipe names drag2. The press-cycle comment that said drag2 refuses a press during its landing now gives the row-animation reason alone, and the wait is unchanged.

**Checks:**

| Check | Result |
| --- | --- |
| `npx just typecheck` in `packages/drag` | exit 0. The two `TS2724` errors are gone |
| `--rejudge .plan/measurements/2026-11-10-performance-b1.json`, before and after | identical (103 lines, files `rejudge-b1-before.txt` and `rejudge-b1-after.txt`) |
| `node bench/compare.ts --prove --dry` | **exit 1, and already at the input.** See §Open, item 4 |
| Lint and format on the changed files | clean |

## Item 5: deletion

All 598 tracked files under `packages/drag2/` are deleted, the same count as at `0870abd75`. The ignored output under it is deleted too, including `.codeanalyzer/analysis_cache.json` and the built tree.

- **Wiring:** `drag2` is removed from the root `Justfile`'s `size`, `typecheck`, `fmt`, `fmt-check`, `lint` and `lint-fix`. The test comment now reads 15 projects: the 14 of the six per-package configurations, and `repo`. The old comment said 17 and seven, which was already stale before drag2's removal.
- `vitest.config.ts` and `.scripts/vitest-config.ts` drop drag2's command import, its options, `DRAG2_SHIPPED_BROWSER_TESTS`, `DRAG2_NODE_BUILD`, the four projects and the sentence that named drag2.
- `.scripts/vite-config.ts` keeps its `__DEV__` define, with a comment that names drag's `src/globals.d.ts`. `.scripts/call-graph.ts`'s example path is `/tmp/drag-cants/`.
- In `.gitignore`, the `src/**/*.d.ts` exception stays, with its comment naming drag's `globals.d.ts`. The `bench/**/*.js` and `bench/**/*.d.ts` exceptions and their comment are removed.

**Lockfile,** regenerated with `npm install`. 10 entries were removed, and none were added or changed:

- `packages/drag2` (0.1.0) and `node_modules/@ydinjs/drag2`;
- `packages/drag2/node_modules/`: `markdown-it` 15.0.3, `linkify-it` 6.1.0, `entities` 8.1.0, `argparse` 3.0.4 and `uc.micro` 3.0.0;
- `node_modules/@types/markdown-it` 14.2.0, `@types/linkify-it` 5.0.0 and `@types/mdurl` 2.0.0.

**Checks:**

| Check | Result |
| --- | --- |
| `git grep -n drag2` outside `.plan/` | matches only the listed kinds, apart from `agent-workflow.md:86` and `review-findings.md:31`. See §Open, item 2 |
| Root `npx just typecheck` | exit 0 |
| Root `npx just lint` | **exit 1, from errors that predate this unit.** Seven packages fail lint, none in a file this unit touches, and repository-level files have 107 eslint errors. The one in a touched root file, `.scripts/vite-config.ts:82` (`require-unicode-regexp`), is on a line present at the input. drag's lint passes |
| Root `npx just test` | 15 projects ran, as the corrected comment says. 1666 passed and 7 failed. The 7 are drag's five size rows (below), tproc's `TokenPackageProcessor` inheritance test, and material-x's radio visual matrix (29 px differ). The last two are in packages this branch does not change |
| `npx just test` in `packages/drag` | 763 passed, and the 5 that failed are `size.node.test.ts`'s ceiling rows |
| `npx just size` in `packages/drag` | **the same verdicts as at the input:** the table and every violation identical (`size-before.txt` and `size-after.txt`). At the input, five rows are over their ceilings and the control moved by 165 B. This unit changes no source, so that is outside its scope |
| `npx just test-engines` in `packages/drag` | Chromium and Firefox: 56 files, 743 passed and 9 skipped. **WebKit's 28 files did not run,** because `browserType.launch` fails on missing host libraries (§Open, item 3). The run exits 1 for that reason |

## Item 6: the prototype arm

`compare.ts`'s `prototypeArm` and `measure.ts --prototype` take `packages/box-quad/src` at `599684791` from the same `git archive` as the prototype's source, and alias `@ydinjs/box-quad` to it. Every other arm, and every `--before` arm, still uses the current box-quad.

| Check | Result |
| --- | --- |
| `node bench/size/measure.ts --prototype` | prints a prototype column on all nine rows. It exits 1 on the same input violations as `npx just size` ([`measure-prototype.txt`](probes/drag2-retirement/measure-prototype.txt)) |
| `node bench/compare.ts --rounds 1 --only "300 moves, one frame each, 20 items"` | exit 0, with verdicts for the prototype against production and the control. No timing result is owed. The run shared the machine with a browser suite ([`compare-one-move-row.txt`](probes/drag2-retirement/compare-one-move-row.txt)) |
| `npx just typecheck` and lint | clean, after giving `bundleSize`'s new parameter an explicit type for `isolatedDeclarations` |

## Open

1. **Item 5 is split across `63d56fd89` and `3a77addd8`**, against the handoff's one-commit property. `63d56fd89` is a commit whose configuration names a missing package. The owner can squash the two, or accept them as they are.
2. **The handoff contradicts itself.** Item 2 requires the register sentences in `agent-workflow.md` and `review-findings.md` to say that drag2's bare series are retired. Item 5's grep list does not include them, so each leaves one match. They were left as item 2 requires and reported, not reworded around the check.
3. **WebKit was not run.** `~/.cache/ms-playwright/webkit-env.sh` and the libraries it linked are missing since the Playwright reinstall, as [`slot-array-report.md`](slot-array-report.md) records. Restoring them is an environment change this unit was not given. Every engines run here covers Chromium and Firefox only.
4. **`compare.ts --prove --dry` already failed at the input** and at `0870abd75`. The injection `this.#lift.translate(drag.x - drag.originX, drag.y - drag.originY);` no longer occurs in `sortable/operation.ts`, because #18 split the call over several lines. It was not repaired, because it is outside this handoff.
5. **The size ceilings and the moved control already fail at the input.** Five rows are over their ceilings, and the control moved by 165 B. They are unchanged here.
6. Lint fixes this unit made by hand, in its own new code: `strict-void-return` and `prefer-promise-reject-errors` in `.scripts/entry.ts` and its test (`promisify` replaced by a callback wrapper with typed parameters), and the `isolatedDeclarations` annotation in item 6. No pre-existing lint error was touched.

The decision status rows are left to the architect. **Next:** the owner reviews the branch and decides on items 1 and 2 above. `drag2-guarantees-handoff.md` (`DRF-45`) is the separate next unit.