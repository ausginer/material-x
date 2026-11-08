# Feature-composition prototype

The prototype for [`feature-composition-assessment.md`](../../feature-composition-assessment.md). It tests whether `freeDrag` and the lift can be extended by capabilities imported on their own, with nothing charged to a composition that omits them beyond the host's call sites. The behavior owed is [`contract.md`](../../contract.md), apart from the changes the assessment lists.

**Base:** `688613863` on `drag/production`. The prototype was built in a worktree on `drag/feature-composition`. **Nothing is merged, and production source on the branch is unchanged:** the source was reverted before the record was committed. drag2 was read as reference and not changed.

| File | What it is |
| --- | --- |
| [`composition.diff.txt`](composition.diff.txt) | **The prototype.** A unified diff against `688613863`: the landing capability, the drop-target capability and slot, the updated tests and fixture, and the new test file. From the repository root, `git apply packages/drag/.plan/probes/feature-composition/composition.diff.txt` applies it |
| [`rect-index.diff.txt`](rect-index.diff.txt) | `RectIndex` under CONTRIBUTING's class-encapsulation rule. A separate diff against `688613863`, measured but not part of the recommendation's code |
| [`compose.ts.txt`](compose.ts.txt) | The composition probe: bundles each composition as `bench/size/measure.ts` does, and reports bytes and which capability code each bundle carries |
| [`results.txt`](results.txt) | Raw output: the probe and the size instrument at the base, at an intermediate state and with the prototype, the suites, the mutations and the static checks |

**How the runs were made:**

- The worktree's `node_modules` and `packages/drag/node_modules` were symbolic links to the main checkout's. Both paths are ignored.
- The composition probe was copied to `packages/drag/bench/compose-probe.ts`, so that `rolldown` resolves from the package, and run there as `node bench/compose-probe.ts $PWD`. A row whose modules don't exist in the tree prints `n/a`. The probe finds capability code by marker strings, such as `prefers-reduced-motion` for the landing animation.
- The size instrument is `node bench/size/measure.ts`. The suites are `npx just test` (Chromium) and `npx just test-engines` in `packages/drag`.
- **WebKit did not launch in this environment.** Playwright reported missing host libraries, including `libpulsecommon-17.0.so`. The engine counts cover Chromium and Firefox only.
- **No timing was measured.**