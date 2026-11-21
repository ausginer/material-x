# Feature proof: core declares `"sideEffects": false` (`RD-30`), PR #91

**Read at** `42999d4a3` on `core/side-effects-1`, against the [plan](../../core-side-effects-1/core-side-effects-plan.md) at `ddb70b49f` and `RD-30` in the [register](../../00-index.md). The implementation is `cf7d43270`, and the [report](../../core-side-effects-1/core-side-effects-report.md) is `42999d4a3`. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-20. Everything ran in a detached worktree at `42999d4a3`, with rolldown 1.3.2.

**Scope:**

- **Covered:** tasks 1 to 5 against the plan, properties 1 to 5 of the check, proofs 1 to 7, and the four departures that the report names.
- **Rerun, not taken from the report:** proof 1 and both of its mutations, plus a third mutation ([mutations](checks/mutations.txt)); proofs 2 and 3 ([release checks](checks/release-checks.txt)); proof 4, proof 5 and `consumer-drop.ts` of proof 6 ([tree, size, consumer](checks/tree-size-consumer.txt)); proof 7, with one extra root run that has rolldown imported at the module's top ([gates](checks/gates.txt)).
- **Probes of this pass:** [`edges.ts`](probes/edges.ts) ([transcript](checks/edges.txt)) gives the check exports that are missing, that import a package the project doesn't have, or that import a multibyte stylesheet. [`without-dependencies.sh`](probes/without-dependencies.sh) ([transcript](checks/without-dependencies.txt)) runs `release-check.ts` with no `node_modules`, as the release workflow does before `aube ci`.
- **Not rerun:** `consumer-entries.ts`. Proof 6 is evidence for the record, not a gate.
- **Not read:** why loading rolldown moves `drag:DRI-17`'s row. The coordinator assigned that to #70.

**Verdict:** the unit does what the plan says, and proofs 1 to 7 hold as the report states. The four departures are acceptable. The second one, the lazy import, is required by the release workflow, for a reason that the record doesn't give (`reviewer-1`). Two findings, both Tier C. Neither one changes what the check accepts or refuses.

## The four departures

1. **rolldown doesn't bundle CSS, so the check emits an imported stylesheet as an asset itself. Acceptable.**
   - With the plugin's `load` returning `null`, the fixture's style row makes rolldown throw `UNSUPPORTED_FEATURE` (_"Bundling CSS is no longer supported"_). The whole check then throws instead of reporting a problem (mutation M3).
   - With the plugin, property 4 holds as written. Counting only chunks drops `effects/style.js` from the problems (M2).
   - The plugin emits the asset when rolldown loads the stylesheet, before tree shaking, so the CSS row is caught under `moduleSideEffects: true` too. That is why M1 fails two names and not three, as the report says. Under `() => true`, rolldown keeps every module that it loads, so detecting the stylesheet at load reports the same entries as detecting it in the output.
   - An imported stylesheet with multibyte text is counted in bytes: 35 bytes, not 29 UTF-16 units, because `readFile` gives the plugin a `Buffer` ([edges](checks/edges.txt)).
2. **rolldown is imported in `checkSideEffects`. Acceptable, and required, but not for the reason that the record gives** (`reviewer-1`).
   - **The DRI-17 failure is reproducible.** With rolldown imported at the module's top, one root `just test` here failed `drag:DRI-17`'s row at 17.41 against the ceiling of 16. As committed, one root run passed: 146 files and 2,307 tests ([gates](checks/gates.txt)).
   - **For DRI-17, the lazy import changes when rolldown loads, not whether it loads.** `release-check.node.test.ts` is the only importer of `release-check.ts`. Its box-quad row calls `checkConsumer` with a manifest whose `sideEffects` is `false`, so rolldown is still loaded in every root run. The passing runs show a different load order, not a cause that was removed. That is the measurement's sensitivity, which `drag:DRF-53` and #70 own. It isn't a defect of this unit. See _Routed_ below.
   - **The release workflow needs the lazy import.** `release.yml`'s `prepare` job runs `release-check.ts release` before `aube ci`, with the comment _"The script needs only Node's built-in modules, `git` and `gh`, so it runs first."_ With no `node_modules`, the committed script loads and prints its usage. With rolldown imported at the top, the script fails with `ERR_MODULE_NOT_FOUND` (_"Cannot find package 'rolldown'"_) before its first check ([without dependencies](checks/without-dependencies.txt)).
3. **Proof 2's effect run calls steps 6 and 7 directly. Acceptable.**
   - With `globalThis.ydinProbe = 1;` in `src/utils/runtime.ts`, core's `size` script fails: _"emitter … Package size limit has exceeded by 2 B"_, at a 210 B limit.
   - `checkLocal` builds, runs the `size` script, packs with `aube pack --ignore-scripts`, and calls `checkTarball`. The direct path differs in two ways. It skips the `size` script, which isn't what proof 2 tests. It passes no version, and `checkTarball` then reads `pack.manifest.version`, which is `local`'s value too.
   - The rerun gives 22 `side-effects` problems, `@ydinjs/core/utils/runtime.js` and the 21 exports that import it, each keeping 23 bytes. The other 152 problems are identical to the run without the effect ([release checks](checks/release-checks.txt)).
4. **A missing export now also gets a `side-effects` problem. Acceptable as an outcome. The message is `reviewer-2`.**
   - The changed row's fixture is box-quad's manifest, which declares `"sideEffects": false`. So the check runs on it, and `['consumer', 'side-effects']` records what it now reports.
   - rolldown keeps an import it can't resolve, and `logLevel: 'silent'` hides the warning. The bare import of a missing file keeps 21 bytes ([edges](checks/edges.txt)). The release fails either way, which is the safe side.

## Findings

### reviewer-1 — Tier C, doesn't block: the record explains the lazy import by `drag:DRI-17`, and doesn't name the release workflow, which can't run the script with a static import

- **Current behavior:**
  - The report (_"Where the implementation departs from the plan"_) and `RD-30`'s _Implemented_ line explain the lazy import by the DRI-17 failure only, and the report calls it _"an observation for drag's record"_.
  - The comment at the import in `release-check.ts` says _"Loaded when a manifest makes the claim, so a command or a test that bundles nothing doesn't load rolldown."_ It doesn't say that a command must run with no dependencies installed.
  - `release.yml` runs `release-check.ts release` before `aube ci`, with the comment that the script needs only Node's built-in modules.
- **Why it is a problem:**
  - The record gives a test's measurement as the reason for an import that the release workflow needs. The DRI-17 reason goes away when #70 is resolved, and moving the import back to the top would then look justified.
  - That change would make the first step of every release run fail. Root `just test` and CI's tests always run with `node_modules` installed, so no test detects it. The next check run detects it, and it fails loudly before anything is staged.
- **Evidence:** [`without-dependencies.txt`](checks/without-dependencies.txt): as committed, the script loads with no `node_modules`. With the import at the top, it fails with `ERR_MODULE_NOT_FOUND`.
- **Required property:** the constraint that `release-check.ts` loads only Node's built-in modules when the module is evaluated is stated where the import is, and in this unit's record, as the reason for the import's position.

### reviewer-2 — Tier C, doesn't block: an import that doesn't resolve is reported as an effect, with a remedy that doesn't apply

- **Current behavior:** a bare import of an export whose file is missing, or of a module that imports a package the project doesn't have, gives _"a bare import of p/missing.js keeps 21 bytes: remove the effect, or list the module in sideEffects"_ ([edges](checks/edges.txt)). The import that rolldown kept is the one that it couldn't resolve, and the warning that would name it is silenced.
- **Why it is a problem:**
  - Property 5 requires the message to say how to repair the problem. Neither of the remedies it gives repairs a missing file or an undeclared dependency.
  - For a missing file, step 7's `consumer` problem also names the cause. For a runtime import of an undeclared package that the declarations don't import, the `side-effects` problem is probably the only one. This is inferred from the type check's input, not observed.
- **Required property:** a `side-effects` problem that is caused by an import that rolldown didn't resolve identifies the import that didn't resolve, or doesn't give "remove the effect" as its remedy.

## Routed

- **To #70 (`drag:DRF-53`), Mx Architect: not a finding of this unit.**
  - With rolldown imported at `release-check.ts`'s top, the root `just test` fails DRI-17's row every time it has been run: four of four in the implementer's runs, at 16.85 per move, and one of one here, at 17.41.
  - As committed, rolldown still loads in the same root run, later in the file's rows.
  - This is a reproducible trigger for #70. It doesn't show that the lazy import fixed anything.

## Plan conformance

- **Task 1:** `"sideEffects": false` comes after `"type"` in `packages/core/package.json`, and a build doesn't rewrite it.
- **Task 2:** properties 1 to 5 are met.
  - It reads the packed manifest, which `checkTarball` passes to `checkConsumer`.
  - It resolves from the consumer project through `cwd`.
  - It uses the repository's rolldown, which `aube ci` installs before step 7 in `release.yml`.
  - It uses `moduleSideEffects: () => true`.
  - It counts code and asset bytes, and each message names the specifier, the bytes and a repair (see `reviewer-2`).
  - A field that isn't `false` gives exactly one problem.
  - The module's doc comment, `checkConsumer`'s doc comment and `CheckName` name the check.
- **Task 3:** the three rows cover proof 1's cases. The pure module's case is the absence of `effects/pure.js` from the named list. All 49 rows pass.
- **Task 4:** step 7 in `releasing.md` says both things the task requires.
- **Task 5:** the report and the _Implemented_ line exist.

**Proofs:**

| Proof | Result |
| --- | --- |
| 1 | M1 and M2 fail the row as the report says, and M3 shows why the plugin is needed |
| 2 | 152 expected problems with no `side-effects` problem. With the scratch effect, 22 `side-effects` problems |
| 3 | box-quad exits 0 with no problem |
| 4 | 294 paths, byte-identical with and without the field: 119 `.js`, 119 `.map`, 55 `.d.ts` and one `.json` |
| 5 | The 33 rows of the size reading are identical |
| 6 | Each of `consumer-drop.ts`'s 27 rows matches the plan's transcript, with the field and without it |
| 7 | Typecheck, lint and fmt-check exit 0. `just test` passes |