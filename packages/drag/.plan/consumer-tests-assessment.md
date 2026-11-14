# Consumer tests: assessment

**Read:** [`consumer-tests-report.md`](consumer-tests-report.md) at `87288b9d2` on `drag/size`, and the unit's code commit `5ea7bb7e6`. **Governing records:** [`consumer-tests-handoff.md`](consumer-tests-handoff.md), `DRD-54` and `DRO-15` in [`00-index.md`](00-index.md). Assessed by the architect on 2026-11-13.

**Outcome: accepted, with one guard gap.** The `consumer` project runs 22 files and 326 tests against the emitted tree, and all of them pass. The source projects keep their titles and verdicts, and no return condition was met. The owner found and reproduced the gap:

- **The consumer resolver rejects `../src/kernel/callbacks.ts` but resolves the same module's absolute filesystem path to its source.** That breaks `DRD-54` property 2. The handoff's W1 tried only the relative form, so it couldn't find this. It is now `DRF-23` (§2), and the next unit repairs it, with a witness that tells the two resolvers apart.
- **The build's clean doesn't touch `src/`** (§3). The report's note on the clean is correct, but it can be read as covering `src/sortable/`. It doesn't.

On the owner's direction, `DRO-15` step 2 is decided as `DRD-55`, and [`published-gate-handoff.md`](published-gate-handoff.md) carries it together with the repair (§5).

## 1. What the architect checked

| Check | Result |
| --- | --- |
| `git diff --stat 9c7b73047 87288b9d2 -- packages/drag .scripts` | `.scripts/vitest-config.ts`, `packages/drag/vitest.config.ts`, the three `tests/support/` files, the three changed and three new browser files, the report and `measurements/`. All inside the handoff's §Boundaries |
| `5ea7bb7e6`'s configuration and support diff | Read in full. The consumer project is created only when `DRAG_CONSUMER` is passed, and drag2's calls don't pass it. The engines configuration is unchanged |
| The runs' totals, from the saved logs | Base: 420 tests, 414 passed, 58.20 s. Final: 746 tests, 740 passed, 99.60 s. Three engines: 1,071 passed, 18 skipped. Each equals the report |
| [The title comparison](measurements/2026-11-12-consumer-compare.txt) | Per project, the same titles and verdicts as the base. The eight moved tests are matched by title. The four excluded files are the source-only list |
| W1 | The log shows `src/kernel/callbacks.ts is not a published entry of @ydinjs/drag` |
| W2 | 38 tests in two projects: four `drag:DRI-13` failures in `consumer`, and all 19 pass in `browser` |
| W3, the configuration that throws | 23 failed files: the 22 consumer files, plus `size.node.test.ts` with its six known rows. 414 of 420 source tests passed, as at the base |
| The resolver's code | The gap is a single test: `if (!importer \|\| !id.startsWith('.')) return null` passes every non-relative specifier to Vite's own resolution (§2) |
| The clean's pathspecs | A dry run with probe files ([record](measurements/2026-11-13-clean-dry-run.txt), §3) |

**The added source-only test is accepted.** "should call the layoutAnimation sink with its receiver, with rows in flight" spies on the sink's `report` and `settle`. Only `DisplacementSink` declares those members, and `DRD-39` keeps that installer type unpublished. That is `DRD-54` property 3's "a member that no published type declares", the reason the handoff gave for the `DRD-50` tests.

## 2. The guard gap: `DRF-23`

**What happens.** `resolvePublishedEntries` in `.scripts/vitest-config.ts` handles a specifier only when it starts with `.`. It does nothing with any other specifier, so Vite resolves that specifier as it would in the source projects. An import of `<checkout>/packages/drag/src/kernel/callbacks.ts` then loads the source module, with no error. The owner reproduced this.

**Other forms the same test lets through.** These were found by reading the code and are not reproduced:

- a path from the Vite root, `/src/kernel/callbacks.ts`;
- `/@fs/<absolute path>`;
- a `file:` URL.

Each of these names a file under `src/` in a way that doesn't start with `.`. A relative specifier with a query, such as `?raw`, is rejected, but for the wrong reason: its path no longer ends in `.ts`. The same specifier for an entry would be rejected too, when it should be redirected.

**Why W1 didn't find it.** The handoff asked for one runtime import, `../src/kernel/callbacks.ts`. That is the only form the resolver handles, so the witness passed under the gap. The handoff's witness didn't discriminate, and that is the architect's omission, not the unit's.

**What is required** (`DRD-54` property 2, as amended on 2026-11-13):

- **The resolved file decides, not the form of the specifier.** In the consumer project, every import that would reach a file under the package's `src/` has one of two outcomes:
  - when the file is a published entry's source, the import reaches that entry's emitted file, as `@ydinjs/drag/<entry>.js` resolves;
  - otherwise it is an error at resolution that names the module.
- **This holds for every form:**
  - a relative specifier;
  - an absolute filesystem path;
  - a path from the Vite root;
  - a `/@fs/` path;
  - a `file:` URL;
  - any of these with a query or hash suffix.
- **No module whose file is under `src/` loads in the consumer project.**

**The witness must discriminate.** One set of scratch imports, one for each form, runs against the resolver at `87288b9d2` and against the repair.

- **At `87288b9d2`:** at least the absolute path must load the source module.
- **At the repair:**
  - every form must fail with an error that names the module;
  - an entry's source file reached by its absolute path must give the same export as the relative import, which is the emitted module.

The handoff's part A states each run.

**What it affects now:** nothing in the committed suite. None of the 22 consumer files imports `src` by a non-relative path. The gap leaves the guard open for the next test that does, and step 2's gate needs the same rule for the fixtures (`DRD-55`).

## 3. The clean doesn't target `src/sortable`

The report's note says: "Any untracked file under `packages/drag/sortable/` is deleted on each consumer run, as `just build` already does." That is correct, and it refers to the **emitted** directory, `packages/drag/sortable/`.

`package-files.ts clean` runs `git clean -fx` in the package root. The pathspecs come from `files.json`:

- each top-level entry's four emitted files, such as `draggable.js` and `draggable.d.ts.map`;
- the first segment of each entry that has a directory: `lift`, `sortable` and `free-drag`;
- the extras `_virtual`, `kernel` and `shared`.

`git clean` reads each pathspec relative to its working directory, so `sortable` and `kernel` match `packages/drag/sortable/` and `packages/drag/kernel/`. They never match `packages/drag/src/sortable/` or `src/kernel/`.

**Checked on 2026-11-13 at `87288b9d2`** ([record](measurements/2026-11-13-clean-dry-run.txt)). The architect created untracked probe files in `src/sortable/`, `src/kernel/` and the emitted `sortable/`, ran the clean's command with `-n`, and then removed the probes:

- **The listing names the emitted `sortable/` and none of the `src/` probes.**
- **The control:** the same `git clean -n -x`, given the three probe paths directly, lists all three. So the `src/` probes are missing from the first listing because of the pathspecs, not because the clean can't remove those files.

The four `sortable/*-1.ts` inspection prototypes that the report mentions were safe in `src/sortable/` and are at risk only in the emitted directory. The report found none in the checkout, so nothing was lost either way.

## 4. Notes the report raises

- **`tsdown` falls back to `tsdown.config.ts` when `--config` names a missing file.** This is recorded. A witness that needs a failed build uses a configuration that throws while it loads, as W3 did. The next handoff states this.
- **The emitted tree changes during a run.** Each Chromium run cleans and rebuilds the package root. Step 2 makes the node project read that tree too, so **one build per run must serve both projects** (`DRD-55` property 1). Two builds in one run would rewrite files that the other project is reading.
- **Wall time:** 58.2 s before and 99.6 s after. It isn't gated. The consumer project adds the build and one more browser group.
- **A failed import disturbs files that run after it,** in either project, in browser mode. That is Vitest's browser runner, not the consumer project. A witness reads its verdict from the targeted file, as the report did.
- **An observation, outside this unit:** in every browser project, `@ydinjs/box-quad` resolves through its workspace link and exports map to `packages/box-quad/index.js`. That file is box-quad's own emitted build, it isn't tracked, and nothing in drag's run rebuilds it. Drag's browser verdicts therefore read whatever box-quad build ran last. This follows the repository's convention, in which a dependency is built before its dependents (`nx.json`'s `^build`). `DRD-55` keeps the gate's box-quad on its source for that reason. No action is taken here.

## 5. What follows

- **Recorded:**
  - this disposition, and `DRF-23`;
  - `DRD-54`'s amended property 2, and the result of its unit;
  - `DRD-55`, the gate on the published build;
  - `DRD-51`'s properties 1 and 3, amended by `DRD-55`;
  - `DRO-15`'s state, and P4's state in [`performance-plan.md`](performance-plan.md).
- **Handed off:** [`published-gate-handoff.md`](published-gate-handoff.md), one implementer unit:
  - part A repairs `DRF-23`, with the discriminating witness;
  - part B implements `DRD-55`.
- **The owner's:**
  - `DRO-15` step 3, the mangle. It waits for part B's figures, which are the published build's results;
  - `DRO-4`'s re-base, which also receives every verdict that part B changes.
- **Budgets are unchanged,** and the deferred campaigns stay stopped.