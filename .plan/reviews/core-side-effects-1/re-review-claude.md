# Re-review: the remediation of the `RD-30` feature proof, PR #91

**Read at** `5a16e410b` on `core/side-effects-1`. The subject is the diff `f2556af8a..5a16e410b`, which is commits `4d013a076` and `5a16e410b`, against the [feature proof](feature-proof-claude.md) at `f2556af8a`. Reviewer: Claude, the pass that wrote the feature proof, on the coordinator's task of 2026-11-21. Everything ran in a detached worktree at `5a16e410b`, with rolldown 1.3.2 and Node 26.13.1.

**Scope:**

- **Covered:** whether `reviewer-1` and `reviewer-2` are resolved; whether the 171-line change to `release-check.ts` adds a defect; whether the path before `aube ci` reaches rolldown or any module that isn't built in.
- **Rerun:** the feature proof's [`edges.ts`](probes/edges.ts) and [`without-dependencies.sh`](probes/without-dependencies.sh) ([transcript](checks/re-review-edges.txt)).
- **New probe:** [`unresolved-edges.ts`](probes/unresolved-edges.ts) ([transcript](checks/unresolved-edges.txt)). It covers a `node:` built-in, an effect next to an import that doesn't resolve, a module two levels deep that doesn't resolve, two modules that import one missing package, and a dynamic import of a missing file. Each one ran at `5a16e410b` and at `f2556af8a`.
- **Not rerun:** `release-check.node.test.ts`, the root gates and `just release-check`. CI run 44745534141 on `5a16e410b` concluded `success`. I read the implementer's transcripts (`remediation-*.txt`) but didn't reproduce them.
- **Not read:** `drag:DRI-17`'s row, which failed in one of the implementer's two root runs at 23.89. That row belongs to #70.

**Verdict:** both findings are resolved. The lazy import holds. One new finding, Tier C: the new repair message for an import that doesn't resolve is wrong for a `node:` built-in. No package that declares the field imports one.

## The findings of the feature proof

### reviewer-1 — resolved

- **The import's comment** (`.scripts/release-check.ts:775-777`) states the constraint: the first step of a release run runs the script before `aube ci`, so evaluating the module needs only Node's built-in modules, and only step 7 imports rolldown.
- **The report** (_"rolldown is imported when step 7 runs"_) gives the release workflow as the reason, links the probe, and keeps DRI-17 as an observation for #70. A _Corrected_ line records the change.
- **`RD-30`'s _Implemented_ line** (`.plan/00-index.md:1764`) says the same, with a _Corrected_ line at `:1766`.

### reviewer-2 — resolved

- **An export whose file is missing:** _"p/missing.js doesn't resolve: publish the file that its export names"_ (`release-check.ts:863`, [re-review edges](checks/re-review-edges.txt)). It is covered by the row at `release-check.node.test.ts:625`.
- **A module's import of a package that isn't installed:** the message names the module and the import, and the repair is _"publish the module, or declare its package in dependencies"_ (`release-check.ts:864`). It is covered by the row at `release-check.node.test.ts:714`, which also covers a missing relative module.
- **A missing relative import made the check throw at `f2556af8a`** (_"Build failed with 1 error"_, [unresolved edges](checks/unresolved-edges.txt)). The feature proof didn't find this. At `5a16e410b` the check reports the import (`deep.js`, `dynamic.js`). An error from `generate` that contains any code other than `UNRESOLVED_IMPORT` is still thrown (`release-check.ts:841-851`).
- **The other logs are still hidden.** `logLevel: 'silent'` is replaced by an `onLog` that keeps only `UNRESOLVED_IMPORT` (`release-check.ts:790-794`). No probe printed a rolldown warning.
- **`releasing.md` step 7** names the new case (`.agents/docs/releasing.md:88`).

## The lazy import

- **What evaluating the module loads:** the static imports are `node:` modules, `./ci-scope.ts` (which imports only `node:child_process` and `node:fs/promises`), and `import type { RolldownLog } from 'rolldown'` (`release-check.ts:46`). Node's type stripping erases a type-only import. With no `node_modules`, the committed script loads and prints its usage. With the import at the top, it fails with `ERR_MODULE_NOT_FOUND` ([re-review edges](checks/re-review-edges.txt)).
- **What the `release` command calls:** `checkRelease` calls `checkInputs`, `readTagRelease` or `readPackageRelease`, `checkCommit`, `checkRegistry`, `writeOutputs` and `writeSummary`. None of them calls `checkConsumer`.
- **The only dynamic import** is `release-check.ts:778`, in `checkSideEffects`. Its only caller is `checkConsumer` (`:964`). `checkConsumer`'s only caller is `checkTarball` (`:1047`), which runs for the `package` and `local` commands. `release.yml` runs `package` at line 139, after `aube ci` at line 114.

## New finding

### reviewer-3 — Tier C, doesn't block: an import of a `node:` built-in is reported as a package that isn't declared

- **Current behavior:** the check bundles with `platform: 'neutral'`, so rolldown doesn't resolve `node:fs` and logs `UNRESOLVED_IMPORT`. A module that imports a built-in gets _"a bare import of p/builtin.js reaches p/builtin.js, whose import of node:fs doesn't resolve: publish the module, or declare its package in dependencies"_ ([unresolved edges](checks/unresolved-edges.txt)). Neither repair applies to a built-in.
- **What was there before:** at `f2556af8a` the same module got _"keeps 16 bytes: remove the effect, or list the module in sideEffects"_. That message was wrong too. A package that imports a built-in fails the check in both versions, even when its modules have no effect. That refusal predates this remediation. The new message is new.
- **Why it is a problem:** property 5 requires the message to say how to repair the problem. `reviewer-2`'s required property says that a problem caused by an import that doesn't resolve identifies that import without giving a repair that doesn't apply. "declare its package in dependencies" doesn't apply to `node:fs`.
- **Reach:** the published packages that import built-ins are `size-limit-preset-rolldown` and `vite-traits-plugin`. Neither declares `sideEffects`, and the check doesn't run for them. So no release is affected today. A Node package that declares the field would be refused, and the message would give the wrong repair.
- **Required property:** a `side-effects` problem whose unresolved import is a platform built-in doesn't tell the author to declare a package in dependencies. Whether the check accepts a built-in import from a package that declares `"sideEffects": false` decides the refusal. That is a scope question for the architect, because the plan covers only browser packages.

## Observations, not findings

- **Order:** when one bundle has more than one import that doesn't resolve, the order of their messages can change between runs. `twice.js` listed `one.js` first in one run and `two.js` first in the next. The order across exports is stable, because each export's problems stay in their place in `Promise.all`'s result. The test rows have one import that doesn't resolve per export, so the order doesn't make them flaky.
- **An effect next to an import that doesn't resolve** is reported only as the import (`effect-and-missing.js`). The report states this. The release still fails, and the effect is reported once the import is fixed.
- **When the module is the export itself**, the message names it twice (_"a bare import of p/x.js reaches p/x.js"_). This is correct but repeats the name.