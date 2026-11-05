# D-206 step 2: the split and capture — feature proof

**Trees read.** Implementation `877fb9612`. Baseline `222445777`, whose `src/` is the `src/` accepted for step 1 at `44e2074f1`. Branch `drag2/fin-review2`. Suite, lint and typecheck ran in the shared checkout at `877fb9612`, which was clean. Mutations, probes, composition and the paired runtime runs used detached worktrees at `877fb9612` and `222445777`.

**Subject.** `drag2:D-206` step 2, as `request-application-claude.md` §8 step 2 and §14.4 bound it: D-201's properties 3, 4, 10 and 12 and its decomposition, as D-202 property 1 carries them, together with everything §14.4 requires step 2 to keep from step 1. The inputs read were:

- D-201, D-202 and D-206 in `contract/00-index.md`;
- `request-application-claude.md` §2.11–§2.13, §7, §8, §9 and §14;
- `snapshot-units-claude.md` §2 (the record for D-201's decomposition and capture), §3 and §5;
- `measurements/d206-step2.md`.

**Scope.** The pass covered:

- the whole of `src/kernel/kernel.ts` at `877fb9612` from the façade through every handler, read against the baseline file. It also covered the `seams.ts` and `rect-index.ts` diffs;
- `tests/kernel/capture.node.test.ts` in full, the new `kernel.browser` mint-failure row and the new `features.browser` R19 row;
- the shared Vitest configuration change (`.scripts/vitest-config.ts`), drag2's `vitest.config.ts` and the `zero-read` header change, with project routing in package and workspace modes;
- the record's composition, census, mutation, property-13 and runtime claims;
- the COVERAGE §The split and capture section and the one amended paragraph of 01.

It did **not** cover:

- steps 3–6 (no in-unit ledger read was expected to go, and none did);
- re-running 13 of the record's 18 mutations, which are listed below;
- browsers other than Chromium, or M-2;
- `react.browser` and `stories.browser`, which do not load at either tree; their baseline status is carried from step 1's acceptance;
- a full read of 02 and 05 for statements about the kernel's object structure. Both were searched for references to the replaced members.

## Result

**No step-2 blocker.** This pass found three findings: one Tier B and two Tier C. None of them is a regression, and none changes program behavior. Every requirement §14.4 states for step 2 holds at `877fb9612`:

- **Decomposition and property 3.** The `Kernel` façade owns the realm, root, bracket, ingress `AbortController` and one nullable `#armed` reference (`kernel.ts:2557–2600`). `ArmedController` holds every handler, the slots and the controller-scope context. That context is in `readonly` fields assigned only in the constructor (`:366–389`, `:498–531`). None of those fields is tested for presence.
- **Property 4.** Each unit entry resolves the operation and activation records and passes them down. `#measureTarget`, `#joinSettlement`, `#startTail`, `#acquireActivation`, `#closeOperation`, `#openResolution` and the settlement transition no longer read the slots. These are the sites `snapshot-units` §2.2 named. The settlement input is the seam's capability (`SettlementAttempt.input`, `:1387–1402`), and `AttemptSlots` has lost `settlementInput`. The one remaining mid-unit slot read is `#preparationValid` (`:539–549`), and step 3 deletes it. That matches the input's set of cancel-record and failure-record reads site for site (baseline `:489`, `:747`, `:801`, `:1406`, `:1933`, `:2040`, `:2114`, `:2145`).
- **Property 10.** Steps 3–6 are written once in `#release` (`:586–624`), which is reached only from `#retireOperation(identity)` and `teardown()`. Step 7 is split across two `finally` blocks: the tail in `teardown()` and the ingress abort in the façade's `#teardown` (`:2679–2685`). The records are dropped after the frame resets. The `null` retirement mode is gone. A mint failure disposes the local record and publishes nothing (`:986–1025`). This is the decided behavior change. The consequence the record does not state is that the draft keeps the part fields `admit` wrote until the next `begin()` overwrites them (`transaction.ts:56–58`) or teardown resets them. That is retention, not a correctness hazard, and it is what _touches no frame_ decides.
- **Property 12.** No top-level `let` or `var` and no mutable static remains in `src/`. I confirmed this with an independent parse. `let verifying` and `setRefreshVerification` are deleted, and nothing outside `zero-read` used them at the input.
- **Kept from step 1.** `OPEN_RESOLUTION` reads its five clauses at its entry (`:1964–1983`). Registration is written only in `#failOperation` after the demotion return (`:813`). `closed` reads the bracket. `lifetimes.ts`, `queue.ts` and `execution.ts` are unchanged. Every step-1 row passes, the five R30 rows and both null-command rows included. Reviewer-B's three `execution.node` rows pass.

| Check | Result |
| --- | --- |
| Full suite at `877fb9612` (`vitest run`, every project) | 1,368 passed, 23 failed, 60 skipped. `react.browser` and `stories.browser` do not load. The 23 are `docs.node` ×4, which fail identically at the baseline (rerun there), and `size.node` ×19: the six control rows red at the baseline plus the 13 budget rows. Matches the record |
| Typecheck, drag2 | the two `.scripts/vitest-*.ts` errors only, as at the input |
| Lint, changed files | eslint: 6 errors, the same rules and count as the same files at the baseline (`only-throw-error` ×2, `no-unnecessary-condition` ×2, `unbound-method` ×2). oxlint: clean, `.scripts/vitest-config.ts` included |
| Composition (`just size` in both worktrees) | every tip figure equals the record's _after_ column byte for byte. The six baseline control figures equal its _before_ column, and the rest agree at the reporter's 0.01 kB. Module counts are equal on every row. The 13 overruns are the ones the owner tolerated |
| Property 13 (`probes/snapshot-units/run.sh` at both trees) | outputs identical as sets of lines, every model row `ok`, P4/P5/P7 12 of 12 and P8 4 of 4 |
| Routing (`vitest list --filesOnly --json`) | package mode: `browser` 39, `shipped` 1 (`zero-read`), `node` 25, `declaration` 9. Workspace mode: `browser/drag2` 39, `shipped/drag2` 1, `browser/drag` 8, and drag keeps its own projects. `zero-read` appears in no other project |
| Mutations re-run | `OPEN_RESOLUTION`'s failure clause dropped: **4 red**, the two kernel and two sortable R30 rows, as recorded. `__DEV__` defined `true` in the `shipped` project: **5 of 15** `zero-read` rows red; with `false` all 15 pass, in package mode and in workspace mode |

## Runtime, kept apart from analysis

**The record's measurement.** Six paired M-1 runs give medians of about 8.2 → 8.8 µs at 50 rows and 7.7 → 8.5 µs at 200 rows. Within one arm the spread is 3.5–26 µs. The record makes no claim from them, and that reading is correct: the figures do not resolve a difference in either direction.

**Independent measurement.** The same harness and arms ran at `222445777` and `877fb9612` in the same session, Chromium, `browser` project (`__DEV__` true on both trees), 56 runs per tree:

| Set | Order | Tree | n=50 median | n=200 median | runs in the >5 µs mode (n=50 / n=200) |
| --- | --- | --- | --: | --: | --- |
| 40 pairs | alternating | baseline | 3.906 µs | 3.906 µs | 4 / 5 of 40 |
| 40 pairs | alternating | tip | 3.906 µs | 3.809 µs | 6 / 4 of 40 |
| 16 pairs | 8 baseline-first, 8 tip-first | both | 3.1–3.5 µs low mode on both | 3.1–3.5 µs | baseline-first eight: tip 4 / 1, baseline 1 / 0. Tip-first eight: tip 0 / 1, baseline 0 / 0 |
| allocation arm, 16 runs | — | both | 0.0 B per sample, every run |  |  |

The figures are quantized at about 0.1 µs. The low-mode medians are equal (3.809 µs at n=50 and 3.711 µs at n=200 on both trees). The tip's excess of high-mode runs in the first, baseline-first eight did not reproduce under reversed or alternating order. **No end-to-end difference is resolved at about 0.1 µs, roughly 3%. A smaller one cannot be excluded.** The allocation figure is the only measured runtime property, and it holds.

**Code analysis.** Per active sample the tip makes one more field read (`#armed`, `:2581`) and passes one more argument through `runLeaf` and `#runPhase`. The façade hop replaces the input's call to the private `#handle` (baseline `:345–347`), so it adds no call. The moved leaf no longer hops through `#runMoved` (baseline `:1819–1825`, tip `:1854–1856`), which removes one call. No closure or object is added per sample. Per settlement the attempt record grows from two fields to four, and the object count is the same. Each failure report allocates one more object, and each controller one more. **No runtime regression was demonstrated, and the analysis predicts none above call-overhead scale.** M-1's resolving run is still step 6's.

## Findings

### step2-A — the object-valued constant census omits every constant whose initializer is type-asserted · Tier B

- **Finding.** Property 12's census and `capture.node`'s _should hold only these object-valued constants in library modules_ count six library constants. The tree has thirteen.
- **Current behavior.** `objectConstants` (`capture.node.test.ts`) accepts only an initializer that is directly an object literal, array literal or `new` expression. An initializer wrapped in `as`, `as const` or `satisfies` is skipped. Seven module constants are initialized that way:
  - `free-drag/config.ts` `LAST_WINS_KEYS` and `sortable/config.ts` `LAST_WINS_KEYS` (`satisfies`);
  - `free-drag/domain.ts` `ACCEPTED` and `FreeDragResolution`, and `sortable/domain.ts` `ACCEPTED` and `ReorderResolution` (`as`);
  - `kernel/pointer.ts` `SESSION_POINTER_EVENTS` (`as`).
- **Why it is a problem.** The record's census table says _6 … the same 6_. Both the record and COVERAGE say the row "pins the list exactly, so a seventh is classified when it appears". Property 12 is required with a census, and this instrument does not do what those documents say: a new shared object spelled with `as const` or `satisfies` passes it unclassified.
- **Evidence.** An independent TypeScript-API pass over `src/` at `877fb9612` reported each initializer kind. `capture.node` passes with none of the seven in its expected list.
- **Not affected.** Property 12 still holds. All seven were read at every use: `ACCEPTED` is compared by identity only (`sortable/spec.ts:1529`, `free-drag/spec.ts:763`), the two `LAST_WINS_KEYS` and `SESSION_POINTER_EVENTS` are iterated, and the two resolution objects are factory tables. The mutable-binding census itself (no `let`, `var` or mutable static) is correct.
- **Required property.** The census and the row enumerate every module-level constant initialized with an object, an array or `new`, however the initializer is type-asserted. The record's count is the count for the tree it names.
- **Blocking.** Not a step-2 blocker. It is required before the decision's own acceptance relies on the census.

### step2-B — the record's call-path analysis counts the façade hop as an added call · Tier C

- **Finding.** `d206-step2.md` §Runtime says the bracket callback "reads `#armed` and calls `handle` on it, which is one field read and one call more". It concludes "net: one field read and one argument more per active sample".
- **Current behavior.** The input's callback already called the private `#handle` (`222445777` `kernel.ts:345–347`). The hop adds a field read, not a call. With `#runMoved` gone, the net is one field read, one argument and **one call fewer**.
- **Why it matters.** The error points toward cost, so no conclusion changes. The owner asked for the analysis to be kept apart from measurement, though, and the analysis should count what the two trees do.
- **Required property.** The call-path analysis states the counted difference for the trees it names.

### step2-C — 05 still names `Kernel.#panic` · Tier C

- **Finding.** `05-lifecycle-invariants.md:233` and `:839` locate the one post-closure `onError` delivery at `Kernel.#panic`. That member no longer exists. The delivery is now `ArmedController.panic` (`kernel.ts:732–735`), reached through the façade's panic callback.
- **Why it matters.** Both passages are dated decision text, and the behavior they describe is unchanged. The record's Limits say 01 was read and that 02 has no structural sentence, but they do not mention 05.
- **Required property.** Contract text that names a kernel member names one that exists. Alternatively, the passages are marked as describing the structure as it then stood. Which of the two applies is the architect's call. Step 5's pass, or the §8 acceptance re-read, can take this up.

## Considered and not raised

- **The bracket callbacks assert `#armed!`.** After a failed construction the bracket stays `LIVE` and `#armed` is `null`. A retired behavior that kept its `BehaviorContext` and dispatched later would therefore throw from `dispatch`, and the panic callback would throw too. The input absorbed the same call. This is not raised as a defect, because 01 §Construction ownership (`:401`) makes behavior construction externally inert. A conforming behavior holds nothing that can call the context after its own failed construction, and neither first-party behavior can: every behavior `dispatch` in `src/` is a controller method or runs inside an operation.
- **The record's five zero-count mutations** (the two `finally`s, the record drop order, the stale-retirement guard, and unwind reference and publication order) are disclosed with reasons. Each guards an ordering the input also left unpinned. The publication-before-attachment order is the one stated in present-tense contract text (01 `:413`). Its only observable consequence is that a `fail()` from a patched `addEventListener` reaches `onError` as `failure/not-classified`, and no row asserts it. That is a coverage note, not a step-2 defect.
- **R19 is sortable-only.** The record discloses this.
- **The shared configuration's tuple return** became `UserConfig[]`, with casts at the workspace destructuring. The positions are correct in both modes (verified above).

## Verification limits

- Chromium only. M-2 was not measured.
- Mutations not re-run: the 13 others in the record's census, including the 38-row teardown skip, the slot-read leaf, the façade guards, both R19 mutations and the five zeros.
- `react.browser` and `stories.browser` were not loaded at either tree; their status at the baseline is taken from step 1's acceptance.
- Runtime timing comes from the M-1 harness in one devcontainer session, with `__DEV__` true on both trees, quantized at about 0.1 µs. It bounds a difference; it does not measure one.
- 02 and 05 were searched for the replaced member names (`#spec`, `#runPhysicalTeardown`, `#runMoved`, `settlementInput`, `Kernel.#…`) rather than read in full.

## Dispositions proposed

| Item | Proposal |
| --- | --- |
| step2-A (Tier B) | The implementer's. Nonblocking for step 2. It must be corrected before the decision's acceptance relies on the census |
| step2-B (Tier C) | The implementer's, in the step-2 record or step 6's. Nonblocking |
| step2-C (Tier C) | The architect's, for whether dated contract text is re-pointed. Nonblocking |
| Step 2 | **No blocker found.** Acceptance is the architect's. D-206 stays `Unimplemented (Remediation)`, F-432 to F-435 stay open, and the witness (`d206-requests.md` absent) holds |