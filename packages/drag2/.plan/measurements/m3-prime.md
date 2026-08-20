# M-3′ — the composition surface at two behaviors

**Run 2026-08-19** against `4ca671f5` plus this commit's harness rows, on the tree that will ship. M-3′ is the first Phase 21 measurement, taken under the contract in [`phase-21.md`](phase-21.md) as corrected by D-96. It re-declares [M-3](m3.md) rather than re-running it: every sortable row is unchanged in method, and what is new is free drag's half of the surface, the combined graph, and the cross-behavior absence claim.

## Reproducibility

The six inputs [05](../contract/05-lifecycle-invariants.md) §Measurements owed asks for, all of them values in `bench/size/measure.ts` rather than flags:

| Input | Value |
| --- | --- |
| Workload and harness | `bench/size/measure.ts`, checked in; each composition is the exact set of named imports a consumer writes |
| Bundler | Rolldown **1.1.5** (workspace lockfile), `platform: 'neutral'`, ESM out, no aliases |
| Minifier / compression | Rolldown built-in `minify: true`; Brotli via `node:zlib` at default quality (**11**) |
| Engine | Node **v26.4.0**, Linux 7.1.8 x86_64, 12th Gen Intel Core i7-1255U |
| Sampling | None, and none is needed — the pipeline is deterministic, which `tests/bench/size.node.test.ts` asserts rather than assumes |
| Equivalence check | Baseline A must fill exactly the slots `assemble()` fills, asserted in the same suite |

Bytes are deterministic, so this file's figures reproduce exactly on any machine at these versions; the CPU and OS are recorded for completeness, not because a byte count depends on them.

## Results

All figures Brotli bytes. **Decision-driving:** the module-graph rows and the re-based budgets. **Telemetry:** every absolute below, the combined-versus-sum delta, and baseline B.

| Composition | Brotli | Modules | Budget |
| --- | --: | --: | --: |
| minimal | 10,738 | 31 | 10,890 |
| minimal (xy) | 10,787 | 31 | 10,940 |
| minimal + layoutAnimation | 11,162 | 32 | 11,310 |
| minimal + landing | 11,020 | 33 | 11,170 |
| complete | 11,447 | 34 | 11,600 |
| **free drag minimal** | **8,717** | 27 | 8,870 |
| **free drag + bounds** | **8,863** | 28 | 9,010 |
| **free drag + landing** | **9,016** | 29 | 9,170 |
| **free drag complete** | **9,162** | 30 | 9,310 |
| **both behaviors** | **12,995** | 47 | 13,150 |
| baseline A — feature-matched, non-composed | 11,158 | 29 | 11,310 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | 26 | 7,040 |

Module counts include the harness's synthetic entry; the graph identities below exclude it.

## The topology test — the union identity holds

**The observable is the graph, not the delta** (D-95 (b), D-96 (5)). The combined composition must pull the union of the two single-behavior graphs and nothing else, so every module both behaviors need resolves once.

```
both behaviors            46 package modules
complete ∪ free drag complete  46 package modules
in combined and neither single: none
in a single and not combined:   none
modules emitted into >1 chunk:  none, in every composition
```

**16 modules are shared** — the fifteen under `kernel/` plus `shared/landing-runner.js`, which both behaviors' `landing()` reaches. Sharing is asserted rather than assumed, because the identity holds vacuously if the two behaviors share nothing: the combined graph is asserted to be exactly `|sortable| + |free drag| − |shared|`.

**The topology-reopen condition did not trigger.** D-48's `kernel.js` split holds at two behaviors; nothing is duplicated, and no export-topology question is opened.

The instrument was falsified before the result was recorded: scored against the wrong parts (`minimal` and `free drag minimal` instead of the two complete rows) it reports **5** violations, so a passing identity is a measurement rather than a tautology.

**Telemetry, and it is not the test**: the combined composition is 12,995 B against a 20,611 B sum of its two parts — the shared kernel counted once rather than twice. This number is recorded because a reader will ask for it, and it is not evidence for the topology claim, which the graph identity settles on its own.

## Cross-behavior absence

New at M-3′, and not a re-run: the tree-shaking claim restated at two behaviors. Every free-drag composition asserts that **no `sortable/` module** appears in its graph, and every sortable composition that **no `free-drag/` module** appears in its. Stated as a subtree prefix rather than a module list, because a list would pass vacuously the moment either behavior gains a file.

All ten rows hold. A consumer importing one behavior reaches none of the other's modules.

## The budget re-base

Five sortable rows and baseline A were **over budget** at the start of this run — by 247–407 B — which is the erosion `plan.md` §Phase 21 predicted: the Checkpoint E floor fixes landed under the standing rule that a budget re-bases rather than a correctness fix shrinking, and the overruns were carried as muted telemetry until a measurement phase could re-base against the shipping artifact.

Every budget is now **its measurement plus 150 B**, one uniform rule across all twelve rows including baseline B, whose measurement did not move.

**What the headroom is for** — the half the previous re-bases left implicit. 150 B is about one module. It is sized to notice **a module appearing in a graph**, which is the failure this harness exists to catch, and it is deliberately too small to absorb a feature: a change that fits inside it silently is a change that added no module. It is not a performance allowance, and it may never be spent to avoid landing a floor fix.

## What M-3′ closes, and what it does not

- **Closed:** the composition surface is re-declared at two behaviors; the subpath topology question D-48 left open is answered by the union identity; the budgets are re-based with their headroom given a stated purpose; the cross-behavior tree-shaking claim is now asserted continuously rather than believed.
- **Not touched:** §Check D-56 remains **Phase R's** and is not recorded as satisfied here. M-1′, M-4′, M-5 and M-2′ are unrun. No production module changed in this measurement.