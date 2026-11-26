# drag2 retirement: feature proof

**By:** a `reviewer`, on 2026-11-15, on `drag2/removal`.

## What was read

- **Pinned to `a5f028959`,** the report commit, in the main checkout. The checkout was clean at that commit when this review started.
- **The reviewed range is `b376b356c..a5f028959`:** seven commits, listed in the [report](../../drag2-retirement-report.md) §Commits. drag2's deleted sources are read at `0870abd75`. `0870abd75..b376b356c` changes no file under `packages/drag2/` ([`commands.sh`](proof-reviewer-probes/commands.sh.txt)).
- **Governing records:**
  - `drag:DRD-64`, `drag:DRO-17` and `drag:DRF-43`, in [`00-index.md`](../../00-index.md);
  - `repo:RD-5`, in [`.plan/00-index.md`](../../../../../.plan/decisions/RD-5.md);
  - the [assessment](../../drag2-retirement-assessment.md) and the [handoff](../../drag2-retirement-handoff.md);
  - the owner's constraint: TransformedStage is ported with the faithful lift only, with no lift-mode control.
- **The report** is [`drag2-retirement-report.md`](../../drag2-retirement-report.md), with its evidence under [`probes/drag2-retirement/`](../../probes/drag2-retirement/).
- **Scope:**
  - nothing that `DRD-64` says drag keeps from drag2 is lost;
  - the seven stories behave as drag2's did, on drag's API;
  - the resolver and every `drag2:` address still resolve;
  - no current-state document or tooling depends on the deleted tree;
  - the report's verification claims reproduce.
- **Not covered:**
  - `drag2-guarantees-handoff.md` (`DRF-45`), a later unit;
  - WebKit, which doesn't launch in this container;
  - the root `npx just test` and the root `npx just lint`. I ran the root `tsc`, drag's full suite, and lint on every code file the range touches;
  - the stories in `npx just docs-dev` by hand. A browser probe drives each story's hint claims instead (§The stories).

## Result

**The retirement meets `DRD-64`, `DRF-43` and `repo:RD-5`.**

- **The stories:** every story behaves as its hint says, in Chromium and Firefox. The repository's story test catches each commit path removed by a mutation.
- **The resolver** prints the same bytes as drag2's resolver at `0870abd75` for every address checked: 731 drag2 ids, 185 `drag` and `repo` ids, and every address cited in the tree.
- **No current-state document or tooling depends on `packages/drag2/`.**
- **Every report claim that I re-ran reproduced.**

**One finding, tier C:** CustomPlaceholder's placeholder doesn't keep drag2's look, and the report doesn't call that a departure (§Findings).

**The report's six open items are confirmed as stated** (§The report's open items). None of them is new, and none is caused by this range apart from item 1, the split deletion.

## Method

- **A detached worktree at `a5f028959`** under the scratch directory. Its `node_modules` entries are linked to the main checkout's, except `@ydinjs/*`, which is linked to the worktree's own packages. It built its own build-tool packages, box-quad, core and drag. It is removed after this review.
- **Old-resolver trees:** `git archive` extractions of `0870abd75`. One holds drag2 with its own records. The other holds drag2's resolver code beside `a5f028959`'s `drag` and `repo` records.
- **The old `compare.ts`:** an extraction of `b376b356c`.
- **Mutations and probes** ran in the worktree, applied by content and restored from copies. The worktree's `git status` showed only the probe file while it was present.
- **No `npm install` ran,** and nothing under `node_modules`, a lockfile or a browser changed.

## What drag keeps from drag2

| `DRD-64` | What I checked | Result |
| --- | --- | --- |
| 1. Deleted whole | `63d56fd89` deletes 598 files, all under `packages/drag2/`, the count at `0870abd75`. No other commit in the range touches `packages/drag2/`. The directory is absent | **Met** |
| 2. Read at `0870abd75` | Every drag2 path that a current-state file names exists at `0870abd75`: 11 paths. Every `drag2:` address resolves there (§The resolver) | **Met** |
| 3. No dependency in current-state documents | §Documents and tooling | **Met** |
| 4. The drag2 arm withdrawn | `bench/lab-drag2.ts` is gone. drag's typecheck exits 0, with no `TS2724`. `--rejudge` gives the same output as before on every recording that holds a drag2 or prototype arm (§The bench) | **Met** |
| 5. The stories | §The stories | **Met**, with `proof-reviewer-1` |
| 6. The resolver moves | §The resolver | **Met** |
| 7. The guarantee tests | `DRF-45`, out of scope | Not reviewed |

The two accessibility conclusions are in drag's section of `.agents/docs/accessibility.md`, in present tense: no multi-press keyboard mode, on its two grounds; and, as `[Docs]`, a `handle()` that removes keyboard reordering unless the handle can take focus. drag's section already states the other drag2 conclusions: a refused command at the edge, Escape, the narrowed handle and the `aria-hidden` placeholder. drag2's `Q-13` section went with it. No current-state file cites `drag2:Q-13`, which never resolved.

## The stories

### Against the handoff's properties

- **Property 1: sortable commits.** Each sortable story commits in `onReorder`, through `flushSync`, by splicing `from` to `to`. It calls nothing else.
- **Property 2: free-drag commits.** Each free-drag story commits an accepted drop in `onEnd`, through `commitDrop`, which adds `result.request.localDeltaX` and `localDeltaY` to the box's `translate`.
- **The owner's constraint.** TransformedStage has no `args` and no lift control. Its comment and hint describe only the faithful lift.
- **Property 3: hints.** Grid drops drag2's claim about `y()`. Every remaining claim is one that a probe case observed (below), or one that drag's source states: `aria-hidden` and the sizing in `placement.ts`, and the viewport bounds in `bounds.ts`.
- **Property 4: one stylesheet.**
  - Every class in it is used by a story.
  - The resize handle's `resizable` and `grip` are kept.
  - The placeholder rules target `[data-drag-placeholder]`.
  - drag2's `box-sizing: border-box` on the placeholder is dropped. That is correct, because `createPlaceholder` sets it inline.
- **Property 5: the browser test** is in `DRAG_SOURCE_ONLY_BROWSER_TESTS`, and it drives each case the handoff lists.
- **Titles.** `Drag/Sortable`, `Drag/Free Drag` and `Drag/Custom Behavior`.
- **The Storybook build** exits 0, and its index lists the eight `Drag` stories and no `Drag2` title ([list](proof-reviewer-probes/storybook-drag-stories.txt)).

### Runs

- **`tests/stories.browser.test.ts`:** 8 of 8 in Chromium and 8 of 8 in Firefox ([Chromium](proof-reviewer-probes/stories/stories-chromium.log), [Firefox](proof-reviewer-probes/stories/stories-firefox.log)).
- **My probe** ([source](proof-reviewer-probes/stories/reviewer-stories-probe.browser.test.ts.txt)) checks what the test doesn't drive. It passes 9 of 9 in Chromium and in Firefox:

  | Case | Story | What it asserts |
  | --- | --- | --- |
  | P1 | Interactive | Escape mid-drag runs an animation, and the box ends at home within 1 px ("Escape sends it home with a landing") |
  | P2 | Interactive, `axis: x`, `tilted` | only x moves, the drop stays within 1 px, and the box keeps its own `transform` (handoff property 2) |
  | P3 | Interactive | a second drag starts where the first drop stayed, and stays where it is dropped |
  | P4 | Interactive, bounded | a drag past the area ends inside it, at its edge |
  | P5 | TransformedStage | the lifted box keeps its size, the local-delta readout moves, and a second drop stays |
  | P6 | List | Escape mid-drag leaves the order unchanged |
  | P7 | List | two `ArrowDown` presses on a focused row move it two slots and keep focus |
  | P8 | CustomPlaceholder | the factory's element carries its text and class, is marked `aria-hidden`, is sized to the row, and is gone after the drop |
  | P9 | ZoomedContext | the lifted row and the placeholder keep the zoomed row's size |

- **P4's first version failed in Firefox only.** It moved the pointer 1,000 px past the box, out of the viewport, and the box ended outside the area's measured position ([first version](proof-reviewer-probes/stories/reviewer-stories-probe-v1.browser.test.ts.txt), [log](proof-reviewer-probes/stories/stories-firefox.log)). With the pointer kept inside the viewport, and the scroll asserted to be 0, P4 passes in both engines ([Chromium](proof-reviewer-probes/stories/p4-browser.log), [Firefox](proof-reviewer-probes/stories/p4-__firefox.log)). The hint claims containment for a drag, not for a pointer that leaves the viewport, so I take that run as a probe artefact. I didn't establish what Firefox did there.

### Mutations of the stories

The test fails each mutation ([summary](proof-reviewer-probes/stories/mutations.txt), [script](proof-reviewer-probes/stories/story-mutations.sh.txt)):

| Mutation | Fails |
| --- | --- |
| MS1: `onReorder` accepts without committing | the four sortable cases |
| MF1: `commitDrop` doesn't write `translate` | Interactive and TransformedStage |
| MF2: AsyncDropConfirmation skips `saving…` | AsyncDropConfirmation |

### Against drag2's stories at `0870abd75`

The labels, the markup (`role="list"`, focusable `role="listitem"` rows, the grip glyph), the tile set, the controls and the stage transform are drag2's. The differences:

- **Expected:** commits in drag's terms; no `invalidate()`; `landing()` composed in Interactive; no lift control; AsyncDropConfirmation's status in an `<output>`; the glyph's class renamed from `handle` to `glyph`.
- **Not stated as a departure:** CustomPlaceholder's look (`proof-reviewer-1`).

## The resolver

- **Every drag2 heading id at `0870abd75`,** matched loosely (`^####\s+id`): all 731 give identical stdout, stderr and exit code from `.scripts/entry.sh` and from drag2's resolver at `0870abd75` ([results](proof-reviewer-probes/resolver/drag2-compare.txt)).
- **Every `drag` and `repo` heading id at `a5f028959`,** with every `drag:` and `repo:` address cited anywhere in the tree: all 185 resolve identically, from the new resolver and from drag2's resolver code reading the same records ([results](proof-reviewer-probes/resolver/current-compare.txt)). That shows one reading of an entry.
- **Every `drag2:` address cited anywhere in the tree,** 19 of them, resolves, except `drag2:Q-13`. It fails with `unknown local id` in both resolvers. It is cited only in dated records, and the assessment already says that it resolves nowhere.
- **The `repo` project passes 14 of 14** ([log](proof-reviewer-probes/resolver/repo-project.log)). Its fixture `entry-drag2-D-210.txt` equals both resolvers' output for `drag2:D-210`. The cases are the handoff's, without drag2's record-integrity cases, and the missing-commit case runs in a fixture repository with no commits.
- **A retired scope is read at its commit.** `drag2` is read through `git ls-tree -r` and `git show` at `0870abd75`. `.plan/contract/` has no subdirectories there, so the recursive listing reads the same 11 files as the old reading.

## Documents and tooling

- **`git grep -n drag2` outside `.plan/`** matches only the kinds the handoff lists, plus `agent-workflow.md:86` and `review-findings.md:31`, which item 2 requires (the report's open item 2).
- **No tracked file outside `.plan/` links into `packages/drag2/`.** Every remaining path is named at `0870abd75`, and each of the 11 exists there.
- **drag's README** doesn't name drag2. drag's contract names it only in a section title and a change row, with no link.
- **The change records** of `CONTRIBUTING.md` and `documentation.md` gain one row each. The other rows are unchanged once links are normalised: each link became a `drag2:` address or a path at `0870abd75`.
- **The root `vitest.config.ts` and `.scripts/vitest-config.ts`** define 15 projects, as the corrected `Justfile` comment says: 14 from six package configurations, plus `repo`. `nx show projects` lists no drag2.
- **`.gitignore`.** At `b376b356c`, no tracked `bench/**/*.js` or `bench/**/*.d.ts` file existed outside drag2, so removing the exceptions loses nothing.
- **The lockfile** loses exactly the ten entries the report lists, and nothing is added or changed. The top-level fields are unchanged.
- **Root `tsc -p tsconfig.json --noEmit`** exits 0 ([log](proof-reviewer-probes/root-tsc.log)).
- **Lint** ([log](proof-reviewer-probes/lint.log)):
  - drag's `npx just lint` exits 0;
  - oxlint is clean on the six root code files the range touches. ESLint reports one error, `require-unicode-regexp` at `.scripts/vite-config.ts:82`, a line from `e842821ea` (July 2026);
  - `oxfmt --check` is clean on every file the range adds or changes.

## The bench

- **`--rejudge`.** I ran it with the new script and with `compare.ts` at `b376b356c` on all 28 tracked recordings that hold `raw` readings ([summary](proof-reviewer-probes/rejudge/summary.txt)).
  - **The 7 recordings with drag2 or prototype arms,** `2026-11-10-performance-b1` included, give identical output.
  - **Of the other 21,** 9 give output that differs only in the script's path, inside an error that both scripts raise.
  - **The remaining 12 only gain lines.** Their before arm is named `before` or `base`. The old script judged them against `drag2` and `prototype`, which they don't hold, so it printed no verdict for that arm. The new script prints it. The recordings carry those comparisons themselves: for example, `2026-11-11-sensitivity-E1.json` has `"against": "base"`. No line is removed in any of the 21. This follows the handoff's "judges against the before arms the recording holds", and it widens what `--rejudge` reports for `--before` recordings. That is an improvement, not a defect.
- **`measure.ts --prototype`** prints a prototype column on all nine rows. Its output equals the report's [`measure-prototype.txt`](../../probes/drag2-retirement/measure-prototype.txt) byte for byte, once trailing whitespace is ignored ([log](proof-reviewer-probes/measure-prototype.log)).
- **`compare.ts --rounds 1 --only "300 moves, one frame each, 20 items"`** exits 0, with prototype verdicts against production and the control ([log](proof-reviewer-probes/compare-one-row.log)). No timing result is drawn from it.
- **Item 6's change** aliases `@ydinjs/box-quad` to `packages/box-quad/src/index.ts` at `599684791` for the prototype arm only, as `DRF-43` requires.

## drag's suite

- **`npx just test` in drag, in the worktree:** 763 passed and 5 failed. The 5 are `size.node.test.ts`'s ceiling rows ([summary](proof-reviewer-probes/drag-test-summary.txt)), as the report states.
- **drag's typecheck exits 0** ([log](proof-reviewer-probes/drag-typecheck.log)).
- **The size inputs are unchanged.** `b376b356c..a5f028959` changes nothing under drag's `src` apart from the stories, nothing under `tests/fixtures`, and in `bench/size` only `measure.ts`. So the five size verdicts can't come from this range.

## The report's open items

| Report item | Confirmed |
| --- | --- |
| 1. The deletion is split over two commits | Yes. At `63d56fd89`, `vitest.config.ts`, `Justfile`, `.scripts/vitest-config.ts` and `package-lock.json` still name drag2 (3, 6, 13 and 9 times). At `3a77addd8` they name it 0 times. So the handoff's one-commit property isn't met, and `63d56fd89` has a configuration that names a missing package. The owner's decision |
| 2. The grep list contradicts item 2 | Yes. The two matches are the sentences that item 2 requires |
| 3. WebKit not run | Not checked, a known limit of the environment |
| 4. `--prove --dry` fails | Yes, with the same `injection does not apply` error at `b376b356c` and at `a5f028959` ([head](proof-reviewer-probes/prove-dry-head.log), [input](proof-reviewer-probes/prove-dry-input.log)). The injected line isn't in `sortable/operation.ts` at `b376b356c` or at `0870abd75`. Not caused by this range |
| 5. Size ceilings and the control | Yes. Same violations as the report's, and their inputs are unchanged by this range |
| 6. Lint fixes in new code | Consistent with the clean lint above |

## Findings

### CustomPlaceholder doesn't keep drag2's placeholder look (`proof-reviewer-1`)

- **Tier:** C. Routed to the architect, who may route it to the owner.
- **Current behavior.** drag2's CustomPlaceholder factory drew a dashed `#6750a4` border on a 12% tint, with no text. drag's factory returns an element with class `slot` and the text "Drop here", and the stylesheet gives it a solid border, a `#e8def8` fill and `#4f378b` text.
- **Why it is a problem.** `DRO-17` keeps drag2's stories because "they look better", and the handoff's row for CustomPlaceholder changes only the factory's context. The report describes the new element, but it doesn't say that the look departs from drag2's. No consumer observes it, and nothing relies on it.
- **Evidence.** `git show 0870abd75:packages/drag2/src/sortable.stories.tsx`, `makePlaceholder`; `packages/drag/src/sortable.stories.tsx`, `makePlaceholder`; the `.list .slot[data-drag-placeholder]` rule in `packages/drag/src/stories.module.css`. P8 confirms what drag renders.
- **Required property:** either the story's placeholder has drag2's look, or the record accepts the new look as a departure.

## Evidence limits

- **Chromium and Firefox only.** WebKit doesn't launch here.
- **The Storybook stories were not opened by hand.** The probe drives each story through the same React mount as the repository test.
- **No root `npx just test` and no root `npx just lint`.** I didn't reproduce the report's totals for them: 1666 passed and 7 failed, and the pre-existing lint errors.
- **The compare row** shared the machine with nothing else, but one round is no timing result.
- **The logs** replace the scratch directory's path with `<scratch>`, and their trailing whitespace and trailing blank lines are removed.

## Scratch work

- The worktree, the extractions and the probe copies are under this session's scratch directory, and are removed after this review is committed.
- No background process remains.
- **This review adds files only under `packages/drag/.plan/reviews/drag2-retirement/`.**

## Next

The architect reads this review with the report. The architect disposes of `proof-reviewer-1`, and leaves open items 1 and 2 to the owner, as the report proposes. `drag2-guarantees-handoff.md` (`DRF-45`) is the separate next unit. This review closes no finding, changes no source, test or decision, and opens no PR.