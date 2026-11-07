# Instrument repair handoff

**One bounded unit for one implementer.** It repairs the two instrument defects that the [ownership report](ownership-report.md) found, before the combined review reads the branch. The architect's assessment of that unit, and how its findings were handled, are in [`00-index.md`](00-index.md) §Disposition of the ownership report. The instrument rule this unit applies is the last bullet of `DRD-23`.

**Base:** `drag/production` at the commit that carries this file. Its source equals `89995c27e`'s. Work on that branch.

**Do not change:**

- Anything under `src/`.
- Any test except `tests/hot-path.browser.test.ts`, and in `tests/support/commands.node.ts` only `stopHeapSampling`.
- The per-sample test's threshold (`kernelPerMove < 16`, in bytes per move over 300 samples), its 64-byte sampling interval, its sample count, its scenario, and its lift assertion (`lift.ts:translate` is the one lift function that allocates).
- `bench/compare.ts`'s scenarios, rules, `judge`, rounds, the A/A pass, and each injection's `name`, `scenario`, `expect` and injected cost.
- `bench/compare.ts`'s `isKernelFunction`. It selects the kernel by function name, which is the open finding `DRF-1`, not this unit's work.
- `bench/compare.ts`'s existing fail-fast: an injection that doesn't apply throws `injection does not apply in <file>: <find>`, and `--prove` exits non-zero.
- No timing campaign: no `compare.ts` comparison, and no `--prove` run that launches a browser. No accepted cost and no re-based ceiling. `DRO-7` stays the owner's.

## Work, in order

Each item is its own commit.

### 1. The per-sample test observes the kernel's modules

**Defect:** `hot-path` › "should allocate per sample only the CSS string a lifted write needs" sums the sampled bytes of keys that start with `draggable.ts:`. Since `bb644d6d7` the kernel's per-sample code is in `src/kernel/session.ts` and `src/kernel/gesture.ts`, so the sum is 0 whatever the kernel allocates, and the assertion can't fail. The readings at `0dcb80fb1` and earlier, including `DRO-6`'s, were taken while the kernel was in `draggable.ts`, and they stand.

**Required properties:**

- **The kernel's sum counts every module of the kernel, selected by location:** every module under `src/kernel/`, and `src/draggable.ts`. A new module under `src/kernel/` is counted with no test edit.
- **The sum counts no other module.** Today the command keys a frame by its file's base name, and a URL from another package can also contain `/src/`. The selection must not depend on a base name being unique. If that needs a different key, change `stopHeapSampling`'s key, and keep `lift.ts:translate` as the lift's key, or change only its spelling.
- The comment above the assertion stays true. If you change the selection's form, update the comment.

**Proof, in Chromium.** Inject each mutation into a working copy, run the test, then restore the source:

| Run | Source | Runs | Required result |
| --- | --- | --: | --- |
| Unmutated | This item's commit | 5 | Passes in every run. Record each run's per-function bytes |
| M1: an array of four numbers allocated on every sample in `Session`'s sample handler (`#move`, after the button check), stored in a module-level variable so that it is not optimized away | This item's test | 5 | Fails the kernel assertion in every run |
| M2: the same allocation in `Gesture.enter`, which every sample passes through | This item's test | 5 | Fails the kernel assertion in every run |
| M1 | The test at `ff69cb8d7` | 1 | Passes. This shows the defect |
| M3: one object with two number properties per sample, in the same place as M1 | This item's test | 5 | Record only: the per-move kernel figure and the pass or fail of each run. Not a gate |

M3 checks the test's own comment, "An object per sample would show as tens of bytes", at the smallest object. If M3 passes in any run, report it as a finding about the threshold's resolution. **Don't change the threshold or the interval.**

**Check:** `tests/hot-path.browser.test.ts` passes under the three-engine recipe. Typecheck and lint pass.

### 2. `compare.ts`'s injections match the source, and a dry run proves they apply

**Defect:** three of `INJECTIONS`' `find` strings no longer occur in the source, so `--prove` throws when it reaches one of them, after it has run every selected injection listed before it. The last recorded `--prove` run is `b91db2818`'s, where all six applied. The split at `bb644d6d7` later moved two of the sites to `src/kernel/`:

| Injection | Stale since | Site in the current source |
| --- | --- | --- |
| "about 1 ms of script per cycle, at the drop" | `3084191bb`, the owner's composition refactor | `sortable.ts`, `drop`: the statement that reads `drag.state.insertion!` before `buildReorderRequest` |
| "1 KB allocated per move" | `3084191bb` | `kernel/session.ts`, `#move`: after the button check, where the sample's `x` and `y` are written, on every sample |
| "one entry on the step list per frame" | `276947f82`, the operation-class adoption | `kernel/gesture.ts`, `requestStep`: the branch that enters a pass because none is running. As before, the step goes onto `#steps` and a no-op pass is entered, with `gesture.ts`'s own `NOOP` |

**Required properties:**

- **Each of the three injects the same cost on the same scenario,** at the site above. The `file` names the module's path under `src/`, for example `kernel/session.ts`. `bundlePatched` already joins that path under the copied `src`. The two injections that the ownership unit updated stay as they are.
- **`--prove` applies every selected injection before it launches a browser.** The first one that doesn't apply ends the run with the existing error, and no scenario runs. An injection doesn't apply when:
  - its `find` occurs in its file not exactly once;
  - its patched bundle equals the bundle of the same copy without the patch, built the same way, so that only the patch can cause a difference. A comparison with production's bundle would also differ by the copy's paths.
- **A dry option stops after that pass,** launches no browser and exits 0 when every injection applies. Document it in the file's header comment, next to `--prove`. `--only` selects the injections it checks, as it does for `--prove`.
- A `--prove` run without the dry option behaves as before, apart from the earlier application.

**Verification, with no browser.** Run every command with `CHROME_EXECUTABLE` set to a path that doesn't exist, so a launch would fail with a different error:

| Run | Required result |
| --- | --- |
| The dry run | Exits 0, and lists all six injections as applied |
| D1: the drop injection's `find` set back to its stale text | Exits non-zero with `injection does not apply`. No other error |
| D2: one `find` set to a text that occurs twice in its file, such as `drag.state.lift!.translate(drag.x - drag.originX, drag.y - drag.originY);` in `sortable.ts` | Exits non-zero with `injection does not apply` |
| D3: one `replace` set equal to its `find` | Exits non-zero, naming that injection |

Restore `compare.ts` after each mutation.

**By reading, record for each of the three injections the call path from its scenario to the patched site.** For example: a `pointermove` in "bytes per move by function, 20 items" reaches `Session`'s `#move` through `Gesture.enter`. Also record that the bytes rule's `isKernelFunction` still names the patched function: `#move` for the allocation, and `requestStep` or a `#`-named member for the step list. A site that the scenario doesn't reach, or that the rule doesn't name, is a return condition.

**Check:** typecheck and lint pass on `bench/compare.ts`.

### 3. Report

1. Run the [handoff](../../../.agents/docs/handoff.md) checks on every changed file.
2. **Write `instrument-repair-report.md` beside this file.** It holds:
   - your commits;
   - item 1's runs, with the per-function bytes, and the M3 reading;
   - item 2's dry run, D1 to D3, and the call paths;
   - anything you returned.

   Put the raw output in `measurements/<date>-instrument-repair.txt`.

3. Push and stop.

## Return to the architect

Stop and return if:

- The unmutated per-sample test fails in any of its five runs. That is a kernel figure for `DRO-7`, not something to fix here.
- M1 or M2 doesn't fail in all five runs.
- The test can't select the kernel by location without changing the threshold, the interval or the scenario.
- An injection can't be written at the current source with the same cost on the same scenario, or its site isn't reached by the scenario, or the bytes rule doesn't name it.
- The application check needs a browser or a timing run.
- Any change needs an edit under `src/` or to another test.

## After this unit

- **The owner reads `DRO-7`** from the ownership report. Its per-sample kernel figure comes from item 1's unmutated runs, because the ownership unit's run couldn't fail on the kernel.
- **Then a combined independent review** reads the remediation, the composition unit, the ownership unit and this unit, at this unit's last commit.
- `compare.ts --prove` and the timing comparison stay deferred, as the owner decided.