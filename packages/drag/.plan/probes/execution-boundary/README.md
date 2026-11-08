# Execution-boundary prototype

The prototype for [`execution-boundary-assessment.md`](../../execution-boundary-assessment.md). It tests whether `Gesture.enter` can take input with its handler object, and requests through a named entry, with every contract result kept. The behavior owed is [`contract.md`](../../contract.md), unchanged.

**Base:** `ef8c6cd96` on `drag/production`. The prototype was built in a worktree on `drag/execution-boundary`, and only `src/kernel/gesture.ts` and `src/kernel/session.ts` changed. **Nothing is merged, and production source on the branch is unchanged:** the source was reverted before the record was committed.

| File | What it is |
| --- | --- |
| [`kernel-v3.diff.txt`](kernel-v3.diff.txt) | **The proposal.** A unified diff against `ef8c6cd96`. From the repository root, `git apply packages/drag/.plan/probes/execution-boundary/kernel-v3.diff.txt` applies it |
| [`kernel-v2.diff.txt`](kernel-v2.diff.txt) | v2: the same behavior with four explicit brackets. Every test that ran passed |
| [`kernel-v1.diff.txt`](kernel-v1.diff.txt) | v1: an idle step went through the list, and the refusal count was not per event. Its failures witness G4 and G8 |
| [`unbound-method-probe.ts.txt`](unbound-method-probe.ts.txt) | The scratch file showing that `@typescript-eslint/unbound-method` doesn't report a `#private` method passed as a value |
| [`results.txt`](results.txt) | Raw summaries: typecheck, the suite in Chromium and in Chromium and Firefox, the failures by name, and the size table, for the base and each version |

**WebKit did not launch in this environment.** Playwright reported missing host libraries: `libpulsecommon-17.0.so`, `libblas.so.3` and `liblapack.so.3`. `just test-engines` therefore exits non-zero in every run, and its counts cover Chromium and Firefox only.

**How the runs were made:**

- The worktree's `node_modules` and `packages/drag/node_modules` were symbolic links to the main checkout's. Both paths are ignored, and no drag test imports `@ydinjs/drag` by package name.
- Size comes from `node bench/size/measure.ts` in `packages/drag`. The suites come from `npx just test` and `npx just test-engines` there.