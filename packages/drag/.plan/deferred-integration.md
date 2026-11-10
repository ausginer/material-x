# Deferred integration findings from the architecture plan

**Status: implemented at `3561f3e97` and `d7e7b0d3a`, 2026-11-07.** Two leftover sentences in drag2, `drag/production:integrity-7`, are scheduled in [`remediation-handoff.md`](remediation-handoff.md) §7. Before that, the owner made this cleanup part of completion and kept drag2 as reference evidence, and `drag2:D-210` decided the retirement.

**When written, no edits were made.** What follows is the work to do, with these corrections at `599684791`.

- **Sites moved.** `bench/size/measure.ts` names the row at about lines 115 and 537. Find each site by searching for `baseline B` and `shipped.js`.
- **The main checkout has a false green.** It still holds ignored legacy build output in `packages/drag`, so the row and its test passed there on 2026-11-06, measuring the old package. The table below is the state in a clean checkout.

**Input:** `7723f3e8a`, with the removal as simulated in a throwaway worktree and as recorded in `drag/rebuild`'s `packages/drag/.plan/rebuild-clean-slate.md` at `17b818efe`.

## Baseline B

**Recommendation: retire the row. Do not suspend it, re-base it, re-point it or vendor the old package.** Delete `packages/drag2/bench/size/shipped.js` and its row before integration, and before any package named `@ydinjs/drag` exports `./sortable.js`.

**Why it can't simply wait:**

| Tree state | The row reports | Modules | What catches it |
| --- | --- | --- | --- |
| Legacy present, at `7723f3e8a` | 6,916 B Brotli, 22,618 B minified | 26 | Nothing to catch |
| Name gone | 51 B Brotli, 47 B minified | 1 | The exact control, as `control moved by -6865 B`. The 7,040 B ceiling passes |
| Name re-occupied by a new package | The new package | Whatever it has | Only the exact control, and a re-base would normalize it |

Rolldown reports `UNRESOLVED_IMPORT` as a warning and treats the import as external, so the 51 B is the cost of an import stub. A new implementation under 7,040 B would pass the ceiling and read as "baseline B".

**Why retire:** the question it answered, what migrating from the shipped package costs, is void because nothing is published.

**Rejected:**

- **Re-basing the control to 51.** It would freeze the stub as truth.
- **Pointing it at the new implementation.** That is a different question under an old name.
- **A tarball or vendored copy.** It keeps removed sources alive to preserve a control in a package that is itself being replaced.

**Capability withdrawn, in the instrument's terms (§18):** exact byte reproduction of a 26-module, 22.6 KB minified graph that no drag2 source reaches, which is detection of a bundler, minifier, compressor or dependency shift at that scale, separately from package edits. Last figure: 6,916 B Brotli, 22,618 B minified, 26 modules, ceiling 7,040 B, at `7723f3e8a`. That detection is real: the row caught a dependency update at `01d88645f`, from 6,889 B to 6,916 B. The new package's harness has to design its own control.

**A harness property worth keeping regardless:** a measurement with an unresolved import should fail. An `onLog` handler that throws on `UNRESOLVED_IMPORT` makes the build fail, verified with `measure.ts`'s rolldown call. The architecture plan's handoff already requires this of the new package.

**Acceptance when picked up:**

- All other rows are byte-identical before and after.
- `git grep` finds no `@ydinjs/drag/` import in drag2's `bench`, `tests` or `src`.
- No live sentence counts or names the row. The sites are `bench/size/measure.ts` (lines 102–103, 115, about 130, 176), `tests/bench/size.node.test.ts` (121, 198), `README.md` (172, 184, 186) and `.plan/obligations.md` (99, 101).
- `budget-rebases.md` gets a dated retirement entry.
- `.plan/contract/05-lifecycle-invariants.md` M-3 §Specification is amended, as `drag2:D-210` decides.
- The size, decisions and references tests pass.

## References to deleted files

With `packages/drag` removed, `tests/references.node.test.ts` fails on eight citations. My simulation and the removal record agree on the list, so it isn't repeated here: see `rebuild-clean-slate.md` §drag2's normative tree cites removed paths.

**Recommendation:** strike each through, which is the repository's retired-reference convention, and state that the file is recoverable at `7723f3e8a`. **One is more than a link:** `02-kernel-behavior-contract.md` says its signatures are compiled against `docs/contract-probe-2/contract.ts`, and nothing compiles that now, so that sentence needs correcting and not only striking.

**Other incoming references seen, none blocking:**

- Dated drag2 records link to legacy files in 28 files. They are exempt from the test and recoverable by commit.
- drag2's `ledger.md` links to `../../drag/.plan/phase-1/08-compatibility-ledger.md`.
- drag2's README §Migrating describes a migration that no longer exists.
- `.agents/docs/measure/brief.md`, `architecture.md` and `accessibility.md` name `@ydinjs/drag` in prose. They become true again once the new package exists, so read them then.
- `packages/box-quad/typedoc.json` names `@ydinjs/drag`, which looks like an unrelated copy-paste defect.

## Evidence

[`probes/architecture-plan/`](probes/architecture-plan/README.md) keeps `baseline-b.mts.txt`, `baseline-b-occupied.mts.txt`, `legacy-measure.mts.txt` and `shipped-at-7723.js.txt`.