# What a sortable drag actually executes: two DevTools traces, read structurally

**Architect measurement note, 2026-08-29.** Phase 23. Two enhanced Chrome DevTools traces of one manual pointer drag each, recorded from `bench/profile/complete.ts`, with source maps and source contents embedded:

| Trace | Composition | Bundle |
| --- | --- | --- |
| [`sortable-landing-layoutAnimation.json`](../../traces/phase23/sortable-landing-layoutAnimation.json) | `sortable`, `y()`, `landing()`, `layoutAnimation()` | `index-s9ESf5OE.js`, 34 modules |
| [`sortable-minimal.json`](../../traces/phase23/sortable-minimal.json) | `sortable`, `y()` | `index-b_wcr7ct.js`, 31 modules |

**Read from the traces first.** The plan narrative was consulted only after the topology below was reconstructed, and §7 is where the two meet. **No production change is proposed**, and the one architectural question this turned up is named in §8 without being settled.

---

## 1. Method, and what these traces can and cannot support

The CPU profile is reassembled from `Profile` + `ProfileChunk`, nodes linked by their `parent` field, and every frame resolved through the embedded source map to an authored file and line; function names are recovered from `sourcesContent` at the mapped line, because the minified `callFrame.functionName` is not the authored one. The **call tree is a merged aggregate over the whole recording**, not a timeline — sibling branches under one node happened at different moments — so §2 also carries a first-sample/last-sample ordering, which is the timeline.

Three classes of claim are kept apart throughout, because they have different strengths:

- **Execution topology** — which frame calls which, and in what order. Strong. The sampler recovers call paths reliably even when it misses durations.
- **Runtime performance** — milliseconds. **Weak, and never load-bearing here.** These are manual gestures of different lengths (70 vs 81 pointer moves), recorded once each. Every duration below is context, not evidence.
- **Bundle/topology attribution** — §4. Computed from the source maps by attributing each generated-column span to its source. Both bundles are a **single generated line**, so consecutive-column differences are exact byte spans. This is a real measurement of _these_ bundles, and it is **not** the package's Brotli budget: it is minified-uncompressed, it is Vite's page build rather than `bench/size`, and it includes `box-quad` and the fixture. Ratios transfer; absolute figures do not.

**One sampling caveat governs every absence claim.** Sample interval is ~0.16 ms, so a function that never appears may simply be fast. "Not sampled" is used below only as corroboration of something the source already settles, never on its own.

---

## 2. The happy-path execution topology

### 2.1 The order, from first/last sample timestamps

| Stage | `minimal` | `complete` |
| --- | --- | --- |
| `admitPress` | 320.9 | 465.9 |
| `activate` → `acquireActivation` → `runActivationSeam` | 422–428 | 515–519 |
| active phase (`write`, `moved`, `spatialFrame`) | 438 → 1072 | 532 → 1415 |
| `closeOperation` → `runReleaseSeam` → `openResolution` → `onReorder` | 1087.7 | 1495.0 → 1497.9 |
| `openSettlement` → `armSettlement` | 1088.5 | 1499.1 → 1501.3 |
| `joinSettlement` | — | **1700.0** |
| `retireOperation` | 1089.8 | 1701.6 |

**The single sharpest structural difference in the whole comparison is on the last three rows.** Without `landing()`, release-to-retirement is **2.1 ms** and entirely synchronous inside the `pointerup` task. With it, `armSettlement` installs a runner and the kernel then holds the operation open for **~200 ms** before `joinSettlement` fires from the runner's completion callback. Landing does not add a step to the terminal; it converts a synchronous terminal into an asynchronous gate, and the settlement-attempt machinery in the kernel exists to hold that gate.

### 2.2 Per pointer sample — identical in both compositions

```
onPointer  [kernel.ts:828]
└ dispatchKernel                     enqueue + drain, per sample
  └ drain  [queue.ts:67]
    └ handle  [kernel.ts:2365]
      └ handleMove  [kernel.ts:1912]
        ├ begin  [kernel.ts:402]        Object.assign(draft, current) — the frame transaction
        └ runLeaf → runPhase  [seams.ts:503,377]
          └ runMoved → moved  [spec.ts:1000]
            ├ write     [presentation.ts:376]   visual.style.transform = compose(x, y)
            └ schedule  [invalidation.ts:74]    rAF coalescer, at most one handle
```

Three facts here matter more than the timings.

- **The seam phase machinery is on the per-sample path, not only on transaction boundaries.** Every pointer move opens and closes a phase through `runLeaf`/`runPhase`. `CODE_OF_SIZE.md` §0 already prices the re-entry latch on this path at ~1 ns and calls it a cost that does not exist; the topology confirms _where_ it sits.
- **The frame transaction is per sample too.** `begin()` shallow-copies the frame on every move. The frame is **7 kernel fields + 7 sortable fields = 14, fixed** ([`kernel/frames.ts`](../../src/kernel/frames.ts), [`sortable/frames.ts`](../../src/sortable/frames.ts)), and features contribute none (D-10 reserves feature frame state and does not implement it). **So the per-sample copy does not widen with composition** — a property worth stating positively, because it is the shape that would have made every optional feature a hot-path cost and it does not.
- **Coalescing works as designed.** 70 pointer moves → 36 rAF fires in `minimal`; 81 → 44 in `complete`. `schedule` guards on `handle === 0`, so a sample never requests a second frame.

### 2.3 Per spatial frame — the coalesced work

```
runNow  [invalidation.ts:61]
└ spatialFrame  [spec.ts:275] → dispatch → dispatchKernel → drain → handle
  └ handleBehaviorAction  [kernel.ts:2343]
    └ runCore → runPhase  [seams.ts:441,377]
      ├ prepared → prepare → action.prepare  [spec.ts:1025]
      │   └ resolveInsertion → y.resolve  [y.ts:114]
      │       ├ verified.refresh  (warm-cache short-circuit in the common case)
      │       ├ centreOf(placeholder) → getBoundingClientRect     ← one live read per frame
      │       └ scan of the packed buffer, then insertionAt
      └ effected → effect → action.effect  [spec.ts:1181]
          └ if (placeholderAt(placeholder, insertion)) return;    ← the no-op exit
```

**Most spatial frames stop at that early return.** `placeholderAt` decides before the bracket, deliberately ([`spec.ts:1186-1194`](../../src/sortable/spec.ts)) — _an already-correct gap is the common case, not the rare one_. What still runs on every frame is the whole generic path above it: enqueue, drain, `handleBehaviorAction`, `runCore`, `runPhase`, `begin`, the behavior's `prepare`, the axis resolve and **one `getBoundingClientRect` on the placeholder**, then commit.

### 2.4 Per committed insertion move

`minimal`:

```
effect
├ movePlaceholder  [placement.ts:302] → before()          ← DOM move
├ invalidateInSeam
└ measureInSeam → y.measure → verified.refresh
    ├ shift → translation → getBoundingClientRect  ×2     ← the two span witnesses
    └ rect-index.refresh → getBoundingClientRect          ← the full rebuild, on refusal
```

`complete` adds `beforeInsertionMove` (cancel outstanding animations, measure) before the write and `afterInsertionMove` (measure, `animate()`) after it.

### 2.5 Release, round-trip, settlement, retirement

`complete`: `handleUp → closeOperation → runReleaseSeam` (whose `prepare` calls `y.resolve` again and `settleDisplacement → beforeInsertionMove`) `→ openResolution → invoke → onReorder` — **the consumer's reorder runs synchronously inside the `pointerup` task** — then `handleResolutionSettled → openSettlement → armSettlement`, which measures the anchor through `runUnclassifiedValue` and starts the runner. ~200 ms later the runner's callback re-enters through `completeLanding → dispatchKernel → drain → handleLandingSettled → advanceSettlement → joinSettlement`, which disposes the lift session, pins, removes the placeholder, and `retireOperation` unwinds `spec.retire` and then `verified-refresh.retire`.

`minimal` runs the same spine minus the runner: `openSettlement → advanceSettlement → joinSettlement`, all inside the same drain.

---

## 3. The structural diff

**Modules that disappear entirely: exactly three.** `src/sortable/layout-animation.ts`, `src/shared/landing-runner.ts`, `src/sortable/landing.ts`. 31 of 34 modules are shared.

This is stronger evidence than "the composition omits them", because **the `minimal` fixture still carries the `import { landing }` and `import { layoutAnimation }` statements** — visible in its own embedded `sourcesContent` — and simply does not pass them to `sortable()`. The bundler dropped three statically-imported modules on reachability alone.

**Call paths that disappear:** `beforeInsertionMove`/`afterInsertionMove` (both the spatial bracket and `settleDisplacement`'s), the entire landing runner (`landing-runner.ts:106,173,199,200`), `armSettlement`'s runner branch, `completeLanding`, `handleLandingSettled`, and `verified-refresh`'s `unchanged` after-witness.

**Generic machinery that remains, identically:** the queue, the seam driver, the frame transaction, the whole action-dispatch spine, `openSettlement`/`advanceSettlement`/`joinSettlement`, `armSettlement`'s **anchor half**, `runUnclassifiedValue`, the `beforeMove`/`afterMove` bracket structure with two empty pipelines, `settleDisplacement`'s guard, and the two `SettlementAttempt` landing fields.

**Frames that exist only to support extensibility, on the ordinary happy path**, ranked by how often they run:

| Frequency | Frame | Serves |
| --- | --- | --- |
| per sample | `runLeaf`/`runPhase` around `moved` | seam failure classification + re-entry refusal |
| per spatial frame | `handleBehaviorAction` → `runCore` → `runPhase` → `begin` | behavior-action protocol, frame transaction |
| per committed move | two empty `for…of` over `slots.beforeMove`/`slots.afterMove` | displacement hook pipelines |
| per settlement | `createSettlementAttempt`, `holds` accounting, `runUnclassifiedValue` | landing-hold capability + unclassified anchor |

---

## 4. Bundle attribution, from the source maps

Per-module minified bytes in each profiled bundle:

| Module                                 |  complete |   minimal |         Δ |
| -------------------------------------- | --------: | --------: | --------: |
| `src/kernel/kernel.ts`                 |      8756 |      8761 |        −5 |
| `src/sortable/spec.ts`                 |      5533 |      5543 |       −10 |
| `src/kernel/presentation.ts`           |      2789 |      2794 |        −5 |
| `box-quad/index.js`                    |      2074 |      2068 |        +6 |
| **`src/sortable/layout-animation.ts`** |  **1374** |     **0** | **+1374** |
| `src/kernel/seams.ts`                  |      1284 |      1284 |         0 |
| `src/sortable/verified-refresh.ts`     |      1234 |      1234 |         0 |
| `src/sortable/placement.ts`            |      1045 |      1040 |        +5 |
| `src/sortable/assemble.ts`             |       980 |       980 |         0 |
| `src/sortable/rect-index.ts`           |       720 |       720 |         0 |
| `src/sortable/collection.ts`           |       705 |       705 |         0 |
| **`src/shared/landing-runner.ts`**     |   **611** |     **0** |  **+611** |
| `src/sortable/y.ts`                    |       602 |       602 |         0 |
| `src/kernel/lifetimes.ts`              |       539 |       539 |         0 |
| `src/kernel/invalidation.ts`           |       400 |       398 |        +2 |
| `src/kernel/pointer.ts`                |       342 |       341 |        +1 |
| `src/kernel/queue.ts`                  |       331 |       331 |         0 |
| `src/sortable/config.ts`               |       289 |       289 |         0 |
| `src/sortable/keyboard.ts`             |       283 |       283 |         0 |
| `src/kernel/realm.ts`                  |       263 |       263 |         0 |
| `src/sortable/behavior.ts`             |       239 |       238 |        +1 |
| `src/kernel/errors.ts`                 |       202 |       202 |         0 |
| `src/sortable/domain.ts`               |       191 |       191 |         0 |
| … 11 further modules ≤ 180 B each      |           |           |      ≤ ±8 |
| **`src/sortable/landing.ts`**          |    **67** |     **0** |   **+67** |
| **TOTAL**                              | **31850** | **29793** | **+2057** |

**The three optional modules account for 2,052 B of a 2,057 B delta. Every other module in the graph moves by ≤ 10 B**, which is minifier name-length noise, not code.

By category, in `minimal`:

| Category | Bytes | Share |
| --- | --: | --: |
| kernel spine (14 modules incl. `presentation.ts`) | 15437 | 51.8 % |
| sortable behavior (12 modules) | 9560 | 32.1 % |
| axis + geometry cache (`y`, `rect-index`, `verified-refresh`) | 2556 | 8.6 % |
| `box-quad` (third-party) | 2068 | 6.9 % |
| fixture | 172 | 0.6 % |

### 4.1 The landing capability, split across the tier boundary

Measuring by source line range in the **`minimal`** bundle — where all of it is unreachable:

| Region in `kernel.ts`                      |   Bytes |
| ------------------------------------------ | ------: |
| `createSettlementScope` / `holdForLanding` |     147 |
| `rollbackLandingHold`                      |      64 |
| `completeLanding`                          |     151 |
| `armSettlement`'s runner branch            |     215 |
| `handleLandingSettled`                     |     120 |
| **subtotal, tight**                        | **697** |

Excluded from that figure, and real: the `landing`/`landingHeld` fields on `SettlementAttempt`, the `holds` counter, and each `attempt.landingHeld` test scattered through `joinSettlement`, `advanceSettlement` and `handleLandingSettled`'s guard — call it ~825 B with them.

**The landing implementation that tree-shakes is 678 B** (`landing-runner.ts` 611 + `landing.ts` 67). **The kernel-side landing SPI that does not is ~700–825 B.** The capability is split roughly in half across the tier boundary, and only one half is optional.

### 4.2 The displacement bracket, in `minimal`

`settleDisplacement` 123 B + the spatial effect's bracket body 68 B + `assemble.ts`'s hook-array plumbing 196 B ≈ **387 B** of structure whose pipelines are empty.

---

## 5. Six things the trace shows that source reading would not

**5.1 Three rect-reading boundaries per committed move in `minimal`, five in `complete`.** `minimal`: `centreOf` in the resolve, `translation` in the verified span check (×2 reads), and `rect-index.refresh`'s full scan. `complete` adds `beforeInsertionMove`'s and `afterInsertionMove`'s. They belong to three different owners — the axis resolver, the refresh verifier, the cache — and no single frame in the source shows them adjacent.

**5.2 The verified fast path and the full rebuild both fire during one ordinary drag.** `verified-refresh.refresh` and its fallback `rect-index.refresh` are _both_ sampled under `measureInSeam` in both traces. The module exists to avoid the full N-row scan; on this recording it avoided some and not others. Its own doc names the degradation — a span reaching the end of the list has no witness outside it — so this is the documented behaviour observed, not a defect. It is worth recording because the module's 1,234 B is justified by an avoidance rate nothing currently measures.

**5.3 `layoutAnimation()` changes the cost of machinery it does not touch.** `Layout` events per rAF fire: **18/36 in `minimal`, 44/44 in `complete`**; `UpdateLayoutTree` 55 vs 133. The animations keep layout dirty, so `centreOf`'s single `getBoundingClientRect` in the _axis resolve_ — an unchanged code path — forces layout on essentially every frame instead of roughly half. This is an interaction between an optional feature and the generic path, visible only in a trace.

**5.4 `armSettlement` measures an anchor on every settlement, composed landing or not** — and that is correct rather than waste. Its own comment says so (_measured unconditionally, before the landing branch, because the join pins to this value whether or not a runner was installed_), and `minimal` confirms it: `joinSettlement → runLeaf → runPhase → (kernel.ts:1706) → write` consumes the pin with no landing present. **This is the case where machinery looks landing-specific in source and the trace proves it is shared.** `anchorTarget` also performs a DOM move (`item.before(placeholder)` or `homeGap`) before measuring, so it is doing the recovery, not just reading.

**5.5 The consumer's `onReorder` runs inside the `pointerup` task.** `closeOperation → openResolution → invoke → onReorder → insertBefore`, synchronously, before the settlement opens. The contract implies it; the trace shows the consumer's DOM mutation landing in the same task as the release seam.

**5.6 Retirement unwinds two nested levels.** `retireOperation → unwind → spec.retire → unwind → verified-refresh.retire`. Each optional stateful participant adds an `unwind` frame, and `unwind` is re-entered rather than iterated.

---

## 6. Runtime observations, held separately

Stated only because they were measured, and not used as evidence for anything above.

- The single largest authored self-time in both traces is `presentation.ts` `write` — 5.73 ms / 9.06 ms — which is one `style.transform` assignment per sample. Irreducible, and it is the right thing to be at the top.
- `getBoundingClientRect` self-time totals ~8 ms in `minimal` and ~20.5 ms in `complete`, consistent with 5.3.
- 120 `Animation` events in `complete`, 0 in `minimal`.
- Total sampled JS is a small fraction of both recordings (~2.1 s and ~2.3 s idle out of 2.29 s / 2.52 s). **Nothing here says the library is slow**, and nothing here is a benchmark.

---

## 7. The owner and coordinator hypotheses

**① _The optional implementation modules appear to tree-shake well._ — CONFIRMED, and stronger than stated.** Not merely "well": the delta between the two bundles is 2,057 B and the three optional modules are 2,052 B of it, with every other module within ±10 B. Better still, they were dropped while **statically imported** by the `minimal` fixture. The finding is exact rather than approximate.

**② _The larger remaining cost may be generic protocol/extensibility infrastructure rather than the optional implementations._ — CONFIRMED.** The `minimal` bundle is 29,793 B minified with the optional implementations at zero; the kernel spine alone is 51.8 % and `kernel.ts` + `spec.ts` + `presentation.ts` + `seams.ts` are 66.7 % of the library-only total. **The corollary is the sharper half and it follows from ①**: because nothing else shrank when the optional modules left, none of the generic machinery supporting them is conditional. Perfect tree-shaking of the implementations _is_ the evidence that their infrastructure is unconditional.

**③ _The kernel/seam/action dispatch spine remains essentially intact in the minimal composition._ — CONFIRMED, and "essentially" can be dropped.** `seams.ts` is 1284 B in both, byte-identical; `queue.ts` 331 in both; `kernel.ts` differs by 5 B of name noise. The spine is not merely intact, it is unchanged, and §2.2 shows it executing per pointer sample.

**④ _The displacement `beforeMove`/`afterMove` bracket may be worth examining._ — CONFIRMED as a fact, REFINED as a priority.** The bracket structure does remain with both pipelines empty, and two empty `for…of` loops run per committed move. But its residue is ~387 B, it is the _smallest_ of the extensibility residues measured here, and `placeholderAt`'s early return means it is not entered at all on most spatial frames. **It is real and it is not the centre of gravity.** One correction to the framing: `settleDisplacement` already guards on `slots.beforeMove.length === 0`, so the release path costs a length test, not a pipeline.

**⑤ _Landing's implementation disappears in minimal, while generic settlement/landing capability machinery may still remain because it belongs to the kernel SPI._ — CONFIRMED, and this is the centre of gravity.** §4.1 puts a number on it: ~700–825 B of `kernel.ts` is landing-hold capability unreachable without `landing()`, against 678 B of landing implementation that tree-shakes. **The optional half of this capability is smaller than the mandatory half.** But ⑤ needs one refinement in the other direction: not everything that _looks_ like landing machinery is — `armSettlement`'s anchor measurement and `runUnclassifiedValue` are shared, proved by `minimal`'s own join consuming the pin (5.4). The line between the two is narrower than the section headings suggest.

**A different centre of gravity than any of the five.** Ranked by unconditional bytes serving a capability the composition did not ask for, the order is: the **landing hold in the kernel** (~700–825 B), then `keyboard.ts` (283 B, an accessibility position D-106 refuses to reopen on byte grounds and this note does not), then the **displacement bracket** (~387 B, spread across three modules). Everything else large in `minimal` — the queue, the seam driver, the frame transaction, `presentation.ts` — is exercised by the ordinary drag on every sample and is not extensibility residue at all.

---

## 8. The architectural question this raises, named and not settled

> **Q-L1 — should the settlement's landing-hold be a kernel capability the behavior installs, rather than a fixed part of the settlement protocol?**

The facts that raise it: the hold is ~700–825 B of `kernel.ts`, unreachable without `landing()`, and it does not tree-shake because it is threaded through `SettlementAttempt`'s fields, `armSettlement`'s branch, `joinSettlement`'s guards and a queue action (`handleLandingSettled`) rather than sitting behind one call. The optional half of the capability is smaller than the mandatory half.

The facts that argue against moving it: `SettlementScope.holdForLanding` **is** the kernel SPI — a behavior-facing capability the kernel publishes on purpose — and D-56's subpath rule and the disclosure ladder both bear on where such a thing may live. The gate is also a _lifecycle_ property (§2.1: it holds the operation open for ~200 ms), and lifecycle is the kernel's by construction. A version that installs the hold would need the attempt's field set to become variable, which reaches D-10's reserved-but-unimplemented feature frame state.

**This note does not answer it**, and the question needs source and `bench/size` proof before it can be: the ~825 B is minified and attributed by line range, and a Brotli figure from the package's own instrument is the only one the budgets accept. What the traces establish is that the question is worth asking and roughly what it is worth.

---

## 9. Findings

**F-174 — the profiled bundle's per-module attribution has never been taken, and it answers a question `bench/size` cannot.** Tier C, open. `bench/size` reports Brotli per _composition_; it cannot say which module inside a composition carries the bytes. The embedded source maps do, exactly, for the profiled bundle — §4 is the first such decomposition in the record, and it is what makes ② checkable rather than plausible. `bundle-structure.md` reasons about the shared set from composition marginals; a per-module attribution is a different instrument reaching the same subject, and the two have never been compared.

**F-175 — a shipped optimization's effectiveness is unmeasured, and the trace shows both of its paths firing.** Tier C, open. `verified-refresh.ts` is 1,234 B in every `y()` composition and exists to avoid `rect-index`'s full scan on a committed move. Both traces sample the verified span check **and** the full-rebuild fallback within one ordinary drag. Its own documentation names the degradation, so the observation is not a defect — but no instrument records the avoidance rate, so the module's size is justified against an unquantified benefit. §5.2.

**F-176 — an optional feature changes the cost of a generic path it does not touch.** Tier C, open. `layoutAnimation()` keeps layout dirty across the drag, so `Layout` per animation frame goes from 18/36 to 44/44 and `centreOf`'s single unchanged `getBoundingClientRect` in the axis resolve forces layout on essentially every frame. The composition rule the package reasons with — features are additive and pay for themselves — holds for bundle bytes and **does not hold for forced layout**. Not a defect and not costed; recorded because it is invisible in source. §5.3.

---

## 10. What would falsify this

- **§4's ratios are minified, and Brotli compresses generic machinery better than feature code.** If a Brotli-per-module attribution puts the kernel spine materially below 51.8 %, ② weakens — though ① and ③ are byte-identity claims and survive either way.
- **The ~825 B for the landing hold is attributed by line range**, and the ranges were read by hand. A different reading of where `createSettlementScope` ends, or of which `attempt.landingHeld` tests are hold-only, moves it. Q-L1 should not be decided on this figure.
- **One recording each.** 5.2's mixed fast-path/fallback result and 5.3's layout counts are single observations of a manual gesture; a second recording of a shorter drag, or one that never reaches the end of the list, could show either differently.
- **Absence claims are sampling-limited.** 15 of 31 modules in `minimal` carry no sampled frame; for construction-only modules (`assemble.ts`, `config.ts`, `behavior.ts`) the architecture already says so and the trace corroborates, but nothing here proves a module did not run.