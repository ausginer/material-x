# Combined review of the ownership and composition work: round summary

**Reviewed tree:** `b01a0283d` on `drag/feature-composition`, range `d7e7b0d3a..b01a0283d`. The production code is `50ed18a17`'s; the later commits change only `.plan/`. All three passes read that commit with a clean tree. **Binding sources:** [`contract.md`](../../contract.md) and [`00-index.md`](../../00-index.md), `DRD-14` to `DRD-38` as amended. **Handover:** [`callback-list-completion-assessment.md`](../../callback-list-completion-assessment.md) §6, with the owner's correction below.

**Subject:** `packages/drag` outside `.plan/`, the owner's refactors in the range, and the related changes outside the package: the root `eslint.config.ts`, `.oxlintrc.json`, `.oxfmtrc.json`, `.scripts/vitest-config.ts`, `package-lock.json`, `packages/box-quad/tests/local-delta.browser.test.ts`, `packages/drag2` at `147abd54c` and `b499eaee0`, and the interface conversion `d8d57383e`. Devcontainer and unrelated tooling work (`.devcontainer/`, `.gitignore`, `.scripts/cl.sh`) are outside the round.

The passes ran independently and in parallel, and none saw another's report:

| Pass | Lens | Report |
| --- | --- | --- |
| `reviewer` | Feature proof, the repaired findings, migrated tests | [`proof-reviewer.md`](proof-reviewer.md) |
| `integrity` | Coherence outside the change, public surface, integration | [`integration-integrity.md`](integration-integrity.md) |
| `cleanup` | Machinery the responsibility doesn't require | [`discipline-cleanup.md`](discipline-cleanup.md) |

`der` didn't run: the request named three passes.

## The owner's correction to the handover

**The owner has accepted `DRO-7` and `DRO-8`:** "да, принимаем. Трейдофф вполне очевидный" ("yes, we accept. The trade-off is quite obvious"). §6 of the handover and the register's `DRO-7` and `DRO-8` entries still say "not accepted by the owner". Every pass worked from the correction. **The stale status is routed to the architect** (§Routing), and this summary doesn't edit those entries.

## Result

**No tier A finding.** No pass found a consumer-observable runtime defect. Two tier B findings and eleven tier C findings survive validation. One further item is a declaration-kind question, routed without an id.

**Both repaired findings hold** (`reviewer`, §Repaired findings):

- **`DRF-4` at `79be2c938`.** (a) The built-ins call `draggable` without type arguments, and the class witness calls `nudge()`, which only its class operation has, from a controller step. Typecheck passes. (b) The session-reach test's three `@ts-expect-error` lines are on the `Drag` that `activate` receives, and can fail.
- **`DRF-5` at `8626b04fd`.** With `this.bounds?.invalidate()` removed in a scratch worktree, the regression test failed in Chromium, Firefox and WebKit (`boxTop` 200 against 50, with `arenaAfter: 50`, so the scroll is asserted). It passes with the line. The consolidator didn't repeat the three-engine mutation; the result is the reviewer's.

**The architect closes both on this result**, as their entries say.

## Checks the passes ran

| Check | Result | Ran by |
| --- | --- | --- |
| `npx just typecheck`, `npx just lint` in `packages/drag` | exit 0, no output, so no unused directive | all three |
| `npx just test` (Chromium) | 379 passed, 6 failed: the six size rows | `reviewer`, `integrity` |
| `npx just test-engines` | 1041 passed, 18 skipped, as the completion report. WebKit launches only with `~/.cache/ms-playwright/webkit-env.sh` sourced | `reviewer`, `integrity` |
| Shipped declarations | none imports `type-fest`, so its `devDependencies` placement holds | all three |
| The 50 `@ts-expect-error` lines in the two declaration tests | none is vacuous | `integrity` |
| Root typecheck with core rebuilt; `core`, `drag2` node and `vite-traits-plugin` tests; root `oxlint`, `eslint`, `oxfmt` outside `packages/`; `npm ci --dry-run`; `typedoc` | pass. `tproc` fails only its existing `TokenPackageProcessor` test | `integrity` |

No timing was taken, `compare.ts` wasn't run, and nothing was re-based.

## Known size failures, deferred obligations and new defects

**Known size failures, unchanged:** the six rows under `DRO-4` fail as the handover gives them: `draggable alone` (and its control), `example: resize handle`, `example: drop zone`, `freeDrag`, `freeDrag + bounds + landing` and `complete`. `DRO-10`'s +78 B and +59 B weren't re-measured. Not findings.

**Deferred obligations, unchanged:** timing and optimization, `DRF-1`, `DRO-13`, an unused directive as a lint failure, and `DRO-3`. Not findings.

**A known item whose status the handover misstates:** the instrument repair's item 2 (the `compare.ts` injections and the dry application check). [`instrument-repair-report.md`](../../instrument-repair-report.md) §Not run records it as not run. §6 says "the instrument repair … done". It had no finding id, so it is registered now as `DRF-7`.

**Newly discovered defects:** `DRF-6` and `DRF-8` to `DRF-18`, below.

## Findings

Canonical ids are registered in [`00-index.md`](../../00-index.md) §Findings in the commit that carries this summary. The high-water mark moves from `DRF-5` to **`DRF-18`**. Only the `DRF-` series is allocated. The scope has no question series, and this round allocates no `DRI-` or `DRD-`.

### Local → canonical

| Local | Canonical | Tier | Claim |
| --- | --- | --- | --- |
| `reviewer-3`, `integrity-2` | `DRF-6` | B | README and accessibility record give every landing DRI-13's reduced-motion guarantee |
| `integrity-1` | `DRF-7` | B | `compare.ts --prove`: 0 of 6 injections apply, and no dry check |
| `reviewer-1` | `DRF-8` | C | DRI-3 "no terminal" tests assert on hooks the kernel never receives |
| `reviewer-2` | `DRF-9` | C | Two test titles name properties the bodies can't fail on |
| `cleanup-5`, `integrity-3` | `DRF-10` | C | Built-ins import unexported `VerdictAwaiter`, against DRI-18; published signatures name unexported types |
| `integrity-4` | `DRF-11` | C | DRI-9 steps 5–6 say one release disposer; `acquire` registers two |
| `cleanup-1` | `DRF-12` | C | `RectIndexView` has no use, and a stale comment |
| `cleanup-2` | `DRF-13` | C | `AxisQuery.insertion` admits a `null` nothing supplies |
| `cleanup-3` | `DRF-14` | C | `handleEvent()` called as the invalidation entry, bounds invalidated twice |
| `cleanup-4` | `DRF-15` | C | `shared/timing.ts` has one importer |
| `cleanup-6` | `DRF-16` | C | Stale comments: `onInvalidate`, `DEV`, "no longer declines" |
| `cleanup-7` | `DRF-17` | C | `tap` browser command has no caller |
| `cleanup-8` | `DRF-18` | C | Test and bench helpers defined several times |
| `reviewer-4`, `cleanup-9` | none: routed | — | Declaration kinds after `2bec0c431`'s clarification, outside `DRO-13`'s scope |

The register entries carry each finding's problem-report fields. This section records only what consolidation decided.

### Merges

- **The reduced-motion scope (`DRF-6`).** `reviewer-3` names the README sentence. `integrity-2` names the same sentence and `.agents/docs/accessibility.md:73`. One remediation unit: the statement of DRI-13's scope. Tier B in both: an integrator writing a `Landing` is misled about what the library does. `accessibility.md` is a repository document, but the guarantee it states is this package's, so the finding stays in this scope's series.
- **The private kernel type (`DRF-10`).** `cleanup-5` and `integrity-3` cite the same two imports against DRI-18. `integrity-3` adds the `typedoc` warnings for `FreeDragSubject`, `DragAxis` and `ResolveHome`, which published `freeDrag` types name and no entry exports. That scope is preserved in the entry, because it is the same question, whether a type a published signature names is nameable, and the same surface decision answers both.

### Validation

The consolidator repeated these mechanical claims at `b01a0283d`:

- `DRF-7`: each `find` literal of `INJECTIONS` searched in its `src/` file: 0 of 6 occur. `instrument-repair-report.md` §Not run lists item 2. **What this proves:** the injections don't apply. **What it doesn't:** that `--prove` fails at the first one after a browser launch rests on reading `prove()` and `bundlePatched`, which `integrity` did and this summary didn't repeat.
- `DRF-6`: `README.md:251`, `accessibility.md:73`, `contract.md:266` and `:271`.
- `DRF-8`: `terminals.browser.test.ts` L33–91. The operation is discarded with `void operation` before the throw or the `null`.
- `DRF-9`: the two bodies, and `tests/support/harness.ts`'s `afterEach`, which checks refused trusted events and not faults. So a detached `cancelLanding` that throws becomes a fault the test doesn't read.
- `DRF-10`: the two `import type` lines, `contract.md:324`, and that `src/draggable.ts` doesn't export `VerdictAwaiter`. The `typedoc` warnings are `integrity`'s run.
- `DRF-11`: `contract.md:224-225` and `src/lift.ts` L313–335. The landing's start is registered first and so runs after the release.
- `DRF-12` to `DRF-18`: the greps and lines each entry cites.

**Rejected:** none of the passes' findings. The reviewer's own rejections of four migrated-test candidates (§Migrated and rewritten tests) stand as the reviewer's.

### Tier notes

- **`DRF-7` is tier B, as `integrity` assigned it, on the instrument clause.** The failure is loud, not a false reading: `--prove` throws at its first injection. What the repository relies on, and doesn't have, is the proof that the comparison can see a cost, and the dry check `DRD-23` states.
- **`DRF-11` is tier C.** The contract is the package's record, not consumer documentation. The README and `acquire`'s JSDoc agree with the code, so no consumer reading of the package is misled.
- **`DRF-8`'s other instances** (three in `operation-lifecycle`, the failed-acquisition block of `faults`) are part of the same entry, not separate findings, because their other assertions carry each test's subject.

## Routing

**To the architect:**

1. **`DRO-7` and `DRO-8` are accepted by the owner** ("да, принимаем. Трейдофф вполне очевидный"). Their entries, the status paragraph and §6 still say "not accepted". The register's status is the architect's to amend.
2. **Close `DRF-4` and `DRF-5`** on the reviewer's result above, or say what more the closure needs.
3. **§6's "the instrument repair … done"** misstates item 2, which is `DRF-7`. Whether `DRF-7` is owed before merge or stays with timing is the architect's call. Its entry says "before the next `--prove` run", which is consistent with the deferral.
4. **Surface decisions:** `DRF-10` (export the named types, or record them as unpublished and amend DRI-18) and `DRF-11` (which text DRI-9 adopts for a throwing release). Both are contract choices that this summary doesn't make.
5. **`DRF-13`** was already proposed in [`operation-lifetime-assessment.md`](../../operation-lifetime-assessment.md) item 8 and not done. Whether it is implemented now is the architect's call.
6. **The declaration-kind question, routed without an id** (`reviewer-4`, `cleanup-9`). `d8d57383e` (2026-11-08) converted shapes to interfaces under the rule of that date. `2bec0c431` (2026-11-09) clarified that library-created value shapes are `type`. The passes agree on the facts and differ in reach:
   - Both name `core`'s `CommitTracker`, `DragSession` and `KeyboardSession`, `tproc`'s exported `TokenManager`, and `vite-traits-plugin`'s test type `Flattening`.
   - `reviewer-4` also lists `tproc`'s `ModuleLoader` as converted and unread. `cleanup-9` read it and judged it a proper interface, because the host provides it. Not reconciled here: whether a host-provided loader is an implementation contract is the clarified rule's application, which is the architect's.
   - `cleanup-9` adds drag's test and bench interfaces (`GroupMove`, `CanvasGroup`, `ReactFixture`, `CdpSession`, `Page`, `Lifted`, `Named`, `Held`, `PageContext`, `Scenario`). `DRO-13` names only the controllers, `FrameTask` and `LinearShift`.

   **No id is minted.** The cross-package part belongs to the repository's `RF-` series, which this package's register refuses. The `packages/drag` part is a question about `DRO-13`'s reach, and this scope has no question series. No consumer behavior changes. `TokenManager` is exported, so its declaration kind is a public-surface choice.

**To the owner, through the architect:** nothing new is asked. `DRO-4`'s re-base, `DRO-10`'s excess and the other uncovered costs stay as the handover lists them.

**Observation outside the round, for the repository register's owner:** [`.plan/00-index.md`](../../../../../.plan/00-index.md) §Findings states a high-water mark of `RF-22`, and the register carries `RF-23` to `RF-30`. Not investigated, and nothing allocated from it.

## Silence by lens

- **`reviewer`** didn't read `bench/`, beyond the diff stat, which its mandate leaves to the deferred timing. It read `rect-index.ts`, `xy.ts` and `keyboard.ts` only on their invalidation and retirement paths, and it didn't read the stories. Within what it read, it found the kernel, the lift, both built-ins and both capabilities conforming, and stated that proof clause by clause.
- **`integrity`** stated null results for the public surface, packaging, kernel independence from the lift, the other packages' interface conversions and repository configuration. It confirmed that the previous round's toolchain findings are repaired. It didn't read the line-by-line correctness of `xy.ts`, `y.ts`, `linear-shift.ts` or `rect-index.ts`, which is outside its question.
- **`cleanup`** found no runtime machinery in `src/` without a responsibility. It listed what it examined and found justified: `CallbackList` and the gate, the controller wrappers, the dev-only instruments, `geometry.ts` and the type-only machinery. It checked the test bodies mechanically and didn't judge their assertions, which is outside its question.

## Next

Stop for architectural routing. The architect reads this summary, amends the `DRO-7` and `DRO-8` status, decides the closures of `DRF-4` and `DRF-5` and the routes above, and hands any remediation off. No PR is open.