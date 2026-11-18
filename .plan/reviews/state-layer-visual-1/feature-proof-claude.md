# State layers in the visual layer — feature proof

**Files were read at:** `b51d3a9a0` (`repo/state-layer-visual-1`, a detached worktree, clean), the head of pull request [#66](https://github.com/ausginer/material-x/pull/66). **Commits reviewed:** `8dc3e78d1` and `362851ed3` (merges of `main`), `e29c54651` (the scratch reading), `a3926b964` (the saved reading), `0bd5a467b` (the threshold, the documentation and the index line), `082c6086b` (#67, the five re-recorded baselines) and `b51d3a9a0` (the report). **Records read at the same commit.**

**Governing records:** `repo:RD-23` and `RF-41` in [`00-index.md`](../../00-index.md); the [plan](../../state-layer-visual-1/state-layer-visual-plan.md), properties 1 to 6 and its _Implementation_; the implementer's [report](../../state-layer-visual-1/state-layer-visual-report.md) and [threshold reading](../../state-layer-visual-1/checks/threshold-reading.md).

**Lens:** feature proof. Each claim below is my own reading of the tree, the runs' artifacts and logs, or a local probe, unless it says otherwise. Nothing is repaired, and no record is amended. Written on 2026-11-18.

**Verdict: properties 1, 3, 4 and 6 hold, property 2 holds as written, and witness 2 holds. Property 5 doesn't apply. One premise of property 2 is false for one row, and that row alone selected 0.01.**

- **`reviewer-1`, for the architect.** The stale `checkbox-focused` baseline doesn't show _"no focus layer"_. It shows a layer at the hover opacity. So that row's witness for condition (i) measured a change from 0.08 to 0.1, not a focus layer that appeared. It is the only row that rules out 0.045, 0.03 and 0.02. With a witness that has no layer, the largest swept value that meets (i) to (iii) would be 0.045 (inferred, not read on the runner). The comparator is stricter than the decision's own rule selects. The comparator isn't blind, and I found no false failure.
- **Four other Tier C findings:** a false sentence about witness 2's second attempt (`reviewer-2`), the commit that removed the scratch workflow (`reviewer-3`), two overstatements in the reading's wording (`reviewer-4`), and `RD-23`'s status line, which the implementer wrote and which is now stale (`reviewer-5`).
- **No Tier A or Tier B defect.**

## Claims checked

1. **Reading run 44276375207: the runs agree at all seven thresholds, and 0.01 is the largest value that meets conditions (i) to (iii).** **Confirmed as written, with `reviewer-1` on its premise.**
   - I downloaded all 21 artifacts and built the three tables again from each job's `result.json` and `environment.txt` ([`checks/reading-regenerated.txt`](checks/reading-regenerated.txt)).
   - Every cell, count, image build, processor and commit matches the saved reading. All 21 jobs ran at `e29c54651`.
   - Runs `a` and `b` agree on every row and count at every threshold. The `hover` jobs also agree with `a` on every row the mutation doesn't touch.
   - By the tables, `checkbox-focused` passes at 0.02 and fails at 0.01. Every other condition holds at 0.045 and below. So 0.01 is the largest swept value that meets the conditions as written.
   - In each diff, the red pixels match the comparator's count ([`checks/pixels.txt`](checks/pixels.txt)). At 0.01, the red pixels cover the button's pill and the checkbox's disc, not only their edges. The radio's disc is covered in rings (`reviewer-4`). So condition (i)'s area clause holds.
2. **The five stale baselines.** **Confirmed.**
   - #67 changed exactly the five rows that fail in both runs at 0.01. Recording run 44277501389 recorded `0bd5a467b`.
   - Each new baseline is pixel-identical to the reading's `0.01-a` actual screenshot ([`checks/pixels.txt`](checks/pixels.txt)).
   - `button-group-standard-disabled` fails by 309 pixels at 0.01. Its diff is on the three labels' text.
   - `checkbox-disabled` fails by 11 pixels at 0.01. Its diff is on the check mark and the dash.
   - Each count is the same in all 21 jobs. Both differences are deterministic, so they aren't noise.
   - Last recorded: `checkbox-disabled` at `8b8b7be27` (2026-07-17), and `button-group-standard-disabled` at `275ad0f5c` (#27). Neither was re-recorded later, because each passed at 0.1.
3. **Witness 2: run 44279730764 at `362851ed3`, with attempts 1 and 2 green.** **Confirmed.**
   - The `chromium` jobs are 134717314524 (attempt 1) and 134722348592 (attempt 2). Both succeeded on image `20261111.370.1`, from each log's `Runner Image` group.
   - The processors were AMD EPYC 9V45 in attempt 1 and Intel Xeon Platinum 8573C in attempt 2.
   - Each job passed all 19 visual rows (4 + 7 + 4 + 4) and 2164 tests in all. `verify` succeeded in both attempts.
   - `git diff 082c6086b 362851ed3` touches no `__screenshots__` file, no lockfile and no workflow.
   - The report's description of attempt 2 is wrong (`reviewer-2`). That error doesn't affect the witness.
4. **The documentation meets property 6.** **Confirmed.**
   - `test-architecture.md` §What screenshots prove gains _The comparator sees a state layer_.
   - It states the rule under the main branch: the hover layer's 0.08, on the white surface, fails a comparison. It also states the one setting, `includeAA` off, no mismatched pixel allowed and no override.
   - Its single evidence line names the reading, and that relative link resolves.
   - No other document, skill or agent definition states the comparator's threshold or sensitivity.
5. **`0bd5a467b` marks `RD-23` _partly implemented_.** See `reviewer-5`.

## Scope

**Covered.**

- **Property 1:** `.scripts/vitest-config.ts` at `b51d3a9a0` sets the following in `createVisualTestProjects` only:
  - `comparatorName: 'pixelmatch'` and `comparatorOptions: { threshold: 0.01 }`;
  - a comment that names `repo:RD-23`.

  The comparator merges these options over `defaultOptions$1` (`node_modules/@vitest/browser/dist/index.js:1617`–`:1650`, 5.1.0), so `includeAA` stays `false` and no mismatched pixel is allowed. None of the 19 `toMatchScreenshot` calls passes options. The scratch hook `MX_VISUAL_THRESHOLD` is gone, and no `.github` file differs between `8dc3e78d1` and `b51d3a9a0`.

- **Property 3:**
  - The scratch workflow at `e29c54651` ran 21 jobs on `ubuntu-24.04`, with the gate's `NODE_VERSION` and `AUBE_VERSION`, `aube ci` and `.github/actions/browser`.
  - The hover mutation edits the ripple's `:host(:hover) &::before` rule. If the edit changes nothing, the job fails.
  - Outside the gate, the workflow runs on push, and only for its own path.
  - It differs from the gate's `chromium` job in one way: it runs only `--project visual/material-x`, without coverage. Witness 2 covers the gate's own invocation.
- **Property 4:** #67's base is this branch, and it changes the five files and nothing else. Both new focused disc samples are 232, a layer of 0.1 over white. The owner's review of each image under `RD-13` is separate, and I didn't read it.
- **The input commit.** The reading ran at `8dc3e78d1` plus the scratch files. `8dc3e78d1` is `bc3609e33` with `main` merged, and the report states it. The second merge brought `a133bebee` (#59), which changes slot rendering. Witness 2 shows all 19 rows unchanged at 0.01 after that merge.

**Not covered.** These areas are unread, which isn't the same as clean.

- I ran no workflow. `reviewer-1`'s value of 0.045 is inferred from the comparator applied to colour pairs and from `radio-focused`'s identical change. A focused checkbox with no layer wasn't read on the runner.
- I didn't run `oxfmt`, `oxlint`, ESLint or `tsc` on `.scripts/vitest-config.ts`. The report says that they pass.
- The `verify` run on `b51d3a9a0` was in progress, and I didn't read it.
- I didn't read the owner's review of #67's images.

## Findings

### reviewer-1 — Tier C: the stale `checkbox-focused` baseline shows the hover layer, so condition (i) measured 0.08 to 0.1 on that row, and that row alone selected 0.01

- **Observed** ([`checks/pixels.txt`](checks/pixels.txt)):
  - The `checkbox-focused` baseline replaced by #67 (`0bd5a467b`, last recorded at `8b8b7be27`, 2026-07-17) has a disc of `237,237,236` on a `255` surface. That is the colour of the `checkbox-hovered` baseline's disc, a layer of about 0.08.
  - The new baseline's disc is `232,232,231`, a layer of 0.1. The old and new `radio-focused` discs are `255` and `232`.
  - The baseline predates `browser-setup.ts`'s `beforeEach`, which parks the pointer at the page's corner (#27, `275ad0f5c`). Before that hook, the pointer stayed over the hovered checkbox from the previous test. So the old image shows a hovered checkbox. This cause is inferred. The colour is observed.
- **The comparator on these colours** (`@blazediff/core`'s `diff`, Vitest 5.1.0's pixelmatch, on uniform images):
  - `237` to `232` passes at 0.02 and above, and fails at 0.01 and 0. That is exactly `checkbox-focused`'s row in the reading.
  - `255` to `232` (no layer to the focus layer) fails from 0.06 down. That is `radio-focused`'s row.
- **What the records say:**
  - Plan, condition (i): _"each of the three focused rows fails against its current baseline, the stale one with no focus layer"_.
  - The reading's list of rows that fail: _"the stale baselines, which show no focus layer"_.
  - The reading's conclusion: _"At 0.02, `checkbox-focused` passes against its stale baseline"_, which is given as the reason that 0.01 is chosen.
  - The comment in `vitest-config.ts`: _"the reading … found 0.01 the largest value that sees them"_.
  - `RF-41`: _"`button-focused`, `radio-focused` and `checkbox-focused` still show no layer"_.
- **Consequence:**
  - Every condition except `checkbox-focused`'s holds at 0.045. The two hovered rows that fail last, `button-hovered` and `radio-hovered`, fail from 0.045 down.
  - So 0.01 comes from a witness that measured a change of 0.02 in opacity, not the appearance of a focus layer.
  - Property 2 asks for the largest value _"so that the instrument is no stricter than the property requires"_. If the checkbox's witness had no layer, as the condition assumes, that value is 0.045 (inferred).
  - No consumer observes a difference. The gate sees everything that `RD-23` requires, and 21 jobs showed no false failure at 0.01. The effect is a larger review load than the decision's rule selects: a change between the two thresholds proposes a baseline change.
  - Whatever value is chosen, the five re-recorded baselines are pixel-identical to the rendering, so they pass at any threshold.
- **Required property:** the threshold that `RD-23` records is the one that property 2 selects from witnesses that measure what condition (i) states. Alternatively, the record says that `checkbox-focused` measured 0.08 to 0.1 and why that row still decides the value. The records quoted above don't state that the stale `checkbox-focused` baseline shows no layer.
- **Routed** to the architect. Whether property 2 reads by its letter or by its premise is a decision about `RD-23`'s value, and the owner chose that rule. The implementer followed the letter.

### reviewer-2 — Tier C: the report says GitHub ran every job again in witness 2's second attempt, and only `chromium` and `verify` ran

- **Observed** ([`checks/witness-2-jobs.tsv`](checks/witness-2-jobs.tsv)):
  - Attempt 2 started at `10:00:49Z`. Its `chromium` job started at `10:00:55Z`, and its `verify` job at `10:06:59Z`.
  - Nine of the attempt's other jobs carry start and end times from `09:50:50Z` to `09:59:46Z`, before the attempt started. These are attempt 1's times. For example, `webkit` 134722353310 ran from `09:51:35Z` to `09:55:28Z` on runner `GitHub Actions 1000001688`, exactly as attempt 1's 134717314370 did. `records` and `deploy` were skipped.
- **What the report says:** _"Attempt 2 was started as a re-run of the `chromium` job, and GitHub ran every job of the run again, all green."_
- **Consequence:** none on the witness. Witness 2 needs only `chromium` twice. But the report states a run that didn't happen.
- **Required property:** the report states which jobs ran in attempt 2.
- **Routed** to the implementer.

### reviewer-3 — Tier C: the reading and the report credit `0bd5a467b` with removing the scratch workflow, and `a3926b964` removed it

- **Observed:** `a3926b964` deletes `.github/workflows/state-layer-reading.yml` and adds the reading. `0bd5a467b` removes only the scratch hook in `.scripts/vitest-config.ts`.
- **What the records say:**
  - Reading: _"Both are removed by the commit that sets the threshold."_
  - Report, item 1: _"`0bd5a467b` removed them."_
  - `0bd5a467b`'s subject: _"… and the scratch reading workflow is removed"_. That subject is history and isn't amended.
- **Consequence:** a reader who looks for the removal in `0bd5a467b` doesn't find it. Property 3 holds, because both scratch files are gone at the head.
- **Required property:** the reading and the report name the commit that removed each scratch file.
- **Routed** to the implementer.

### reviewer-4 — Tier C: the reading overstates two observations, and each conclusion still holds

- **Processors:** the reading says that runs `a` and `b` agree _"across both image builds and five processors"_. The `a` and `b` jobs ran on four processors. The fifth, AMD EPYC 7763, ran only `hover` jobs. On every row that the mutation doesn't touch, all 21 jobs agree, so five processors hold over the whole run, not over `a` and `b`. The report repeats this wording in item 2 (iii).
- **The radio's diff:** the reading says that each focused row's diff _"covers the whole focus layer"_. At 0.01, the radio's diff has 873 red pixels and 380 yellow ones in concentric rings over the disc ([`checks/pixels.txt`](checks/pixels.txt)). The comparator classifies the yellow pixels as antialiased and doesn't count them. The diff covers the disc's area, not only its edges, so condition (i) holds. But not every pixel of the layer is counted.
- **Required property:** the reading states each observation over the jobs and pixels it covers.
- **Routed** to the implementer.

### reviewer-5 — Tier C: `RD-23`'s status line was written by the implementer, and it is stale at the head

- **Observed:** `0bd5a467b` replaced `RD-23`'s _"Unimplemented"_ with _"Partly implemented 2026-11-18 … by the implementer"_. The new text ends: _"Their re-recording under property 4 is still owed."_ The re-recording was merged two commits later, as `082c6086b` (#67). `RF-41` is still **open**. The plan says that the implementing pull request closes it.
- **The rule:** _"Only the architect creates, amends, supersedes or renumbers architectural decisions. Other roles may report one as expired, contradicted or unimplemented"_ ([`agent-workflow.md`](../../../.agents/docs/agent-workflow.md)). The report routes the line to the architect: _"The architect adopts or adjusts that."_
- **Consequence:** at `b51d3a9a0`, the index states that work which is done is still owed. It also carries a status that the architect didn't write. `RF-41` isn't closed in the record.
- **Required property:** `RD-23`'s status and `RF-41`'s closure are the architect's text, and they describe the head. `reviewer-1` can affect both.
- **Routed** to the architect.