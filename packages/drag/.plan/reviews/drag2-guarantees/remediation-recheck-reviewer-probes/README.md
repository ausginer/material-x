# Recheck reviewer's probes, at `349616213`

Every run used a `git archive` copy of `349616213`, made into a throwaway git repository so that the build's `git clean` works, with the checkout's `node_modules` directories linked in. Chromium only. [`run.sh`](run.sh) is the script, run once. It applies each diff with `git apply` from the repository root, runs `npx just test` in `packages/drag`, and restores the tree with `git checkout` and `git clean`. After each run it checks that the tree is clean, and the tree was clean after every run. [`results.txt`](results.txt) is the output, filtered to the `FAIL`, error and summary lines.

For the `-input` runs, the script also replaces one test file with its version at `326d86773`, the remediation's input. Those runs show whether the test as it was before the remediation detects the mutation.

| Run | Project | Result |
| --- | --- | --- |
| Unmutated: `y-geometry`, `refusals` | source and consumer | 34 of 34 pass |
| Unmutated: `keyboard`, `sortable`, `landing`, `free-drag`, `coordinates`, `layout-animation` | source | 159 of 159 pass. `layout-animation.browser.test.ts:266` passes |
| Saved `S2-3.diff` | source and consumer | Only `y-geometry.browser.test.ts:160` fails, in both projects, with `AssertionError: expected [ …(20) ] to deeply equal []`. That is the instrument's assertion. There is no oracle message |
| `refusal-instanceof.diff` | source and consumer | `refusals.browser.test.ts:135` fails in both projects: `expected { trusted: +0, untrusted: +0 } to deeply equal { trusted: +0, untrusted: 1 }` |
| `S4-target-only.diff` | source | Only `keyboard.browser.test.ts:225` fails. `:209` passes |
| `S8-visual-first.diff` | source | Only `sortable.browser.test.ts:1192` fails, with 69 disagreements |
| `S8-visual-first.diff`, input test file | source | 55 of 55 pass |
| `F4-null-viewport.diff` | source | `free-drag.browser.test.ts:351` fails: `expected [ 1230, 670 ] to deeply equal [ 1245, 685 ]` |
| `F5-no-activation.diff` | source | 10 tests fail. `coordinates.browser.test.ts:412` fails in both environments: `expected +0 to be close to 60` |
| `S1-settle-uncaught.diff` | source | `landing.browser.test.ts:334` and `:619` fail. `:619` has `outcomes: []` |
| `S1-late-revert.diff` | source | Only `landing.browser.test.ts:619` fails, on `parent` |
| `S1-late-revert.diff`, input test file | source | 25 of 25 pass |
| Saved `S6-7.diff` | source | 16 of 16 pass |
| `F8-one-entry.diff` | node | Only `consumer-types.node.test.ts:113` fails. The received value maps `free-drag/drop-targets` to `free-drag/bounds.d.ts` |
| `F8-one-entry.diff`, input test file | node | 2 of 2 pass |