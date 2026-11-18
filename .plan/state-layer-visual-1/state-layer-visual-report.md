# State layers in the visual layer — report

Implementer's report on `repo:RD-23`, for `repo:RF-41`, on `repo/state-layer-visual-1`, pull request #66. Input: `bc3609e33`, with `origin/main` merged as `8dc3e78d1` so that the visual runs install from the system-package cache (`RD-21`). Governing records: the [plan](state-layer-visual-plan.md) and `RD-23` properties 1 to 6.

## What was done

1. **The reading** (property 3): run 44276375207 at `e29c54651`, saved in [`checks/threshold-reading.md`](checks/threshold-reading.md). The scratch workflow `state-layer-reading.yml` and a scratch threshold hook in `.scripts/vitest-config.ts` existed only at that commit. `a3926b964` removed the workflow, and `0bd5a467b` the hook.
2. **The threshold** (properties 1 and 2): **0.01**, at `0bd5a467b`. The visual project's browser configuration in `createVisualTestProjects` sets `expect.toMatchScreenshot` to pixelmatch with `threshold: 0.01`. `includeAA` and the mismatched-pixel allowance keep Vitest's defaults, `false` and none. No row passes its own options. A comment beside the setting names `RD-23`.
   - (i) all three focused rows fail at 0.01 against their stale baselines, and each diff covers the layer's area, not only its edges. The radio's diff is 873 counted pixels in rings over the disc, with 380 antialiased pixels between them that the comparator doesn't count. The stale `button-focused` and `radio-focused` baselines show no layer. The stale `checkbox-focused` baseline shows the hover layer, so that row measures the hover layer against the focus layer. At 0.02 it passes, so 0.02 doesn't qualify. It is the only row that rules out 0.045 to 0.02.
   - (ii) with the hover layer at opacity 0, all three hovered rows fail from 0.045 down.
   - (iii) runs `a` and `b` agree on every row and count at every swept value, on two image builds and four processor models. All 21 jobs, on five processor models, agree on every row that the mutation doesn't touch.
3. **The re-recording** (property 4): the `record-baselines` label on #66 started recording run 44277501389, which recorded `0bd5a467b`. Its proposal, #67, changed exactly the five rows that failed in both reading runs at 0.01:
   - `button-focused`, `checkbox-focused`, `radio-focused`: each now shows its focus layer. The old checkbox baseline showed the hover layer, and the other two no layer;
   - `button-group-standard-disabled` (309 pixels at 0.01, on the disabled labels' text) and `checkbox-disabled` (11 pixels, on the disabled check mark and dash). Neither was known to be stale before the reading.

   The owner merged #67 as `082c6086b`. His review of each image under `RD-13` is separate from the feature proof.

4. **The documentation** (property 6): `.agents/docs/test-architecture.md` §What screenshots prove gains the paragraph _The comparator sees a state layer_, with an evidence line naming the reading, at `0bd5a467b`.

## Witness 2

The gate's `chromium` job at 0.01 with the new baselines, at `362851ed3`. That commit is `082c6086b` with `origin/main` (`a133bebee`, #59) merged; the merge changed no baseline and no lockfile.

| Run | Attempt | `chromium` job | Image | Processor | Visual rows |
| --- | --- | --- | --- | --- | --- |
| 44279730764 | 1 | 134717314524, success | 20261111.370.1 | AMD EPYC 9V45 | 19 passed |
| 44279730764 | 2 | 134722348592, success | 20261111.370.1 | Intel Xeon Platinum 8573C | 19 passed |

`verify` passed in both attempts. Attempt 2 was a re-run of the `chromium` job: it ran `chromium` and `verify`, and it carries the other jobs' results from attempt 1. **A pre-merge reading,** not witness 2: run 44278143094 at `082c6086b`, before #59 reached `main`, passed every job.

## Verification and limits

- `.scripts/vitest-config.ts`: `oxfmt`, `oxlint` and ESLint pass, and the root `tsc -p tsconfig.json` reports nothing in it. `just typecheck` passes across the packages.
- A local run at 0.1 and at 0 only showed that the setting reaches the comparator. Local visual runs aren't evidence (`RD-13` property 7).
- Markdown: `oxfmt`, `git diff --check`, and the relative links checked by resolving each path. No linter applies to Markdown.
- The hover witness is the reading's mutation run only. No hovered baseline was stale, so no hovered row changed.

## Open

- `RF-41`'s closure, and `RD-23`'s status line, are the architect's. `0bd5a467b` marked `RD-23` _partly implemented_ in `.plan/00-index.md`. The architect adopts or adjusts that.
- **Next:** a feature proof of #66 against `RD-23` properties 1 to 6.