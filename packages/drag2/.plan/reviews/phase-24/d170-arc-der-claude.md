# D-170 arc — decision elimination review

**Files read at `b73b6779`** (`drag2/fin-review`), the tip of the review range `261a3a16..b73b6779`. Decision text read from `npx just decisions` and `npx just decisions --retired`, both run from `packages/drag2` (176 and 79 rows respectively), and from `.plan/contract/00-index.md` §D-167, §D-168, §D-169, §D-170 and its four amendment sections read in full. Pre-image citations taken with `git show 261a3a16:…` and `git show 63922766:…` rather than from the working tree.

**F-300 is deferred and is not re-raised.**

## Scope

**Question asked**: does any machinery or constraint standing in the tree at `b73b6779` rest on a justification the D-170 arc retired or amended?

**Forward pass — inactive decisions.** `npx just decisions` reports nine inactive rows (`D-7`, `D-33`, `D-73`, `D-88`, `D-150`, `D-162`, `D-164`, `D-167`, `D-169`). Two are the arc's own: **D-167 and D-169 introduce no machinery at all** — both are _declining_ decisions whose operative clause is "the closure-factory representation is retained", so there is nothing they minted that could survive their retirement. D-169's one positive contribution, the two-or-more-shorter-lifetime-bindings test, is carried forward inside D-170's live text and is not orphaned. The other seven predate the arc and were traced only far enough to confirm they are outside it (D-162's routed `space` argument survives under D-165, which is active; the rest are Revision-2-era).

**Forward pass — retired fragments of active decisions.** D-170 is `active` with retired content, and this is where the pass concentrated. Every construct its amendments name as withdrawn was traced into the tree at `b73b6779`:

| Retired by | Construct | In the tree at `b73b6779` |
| --- | --- | --- |
| §The surviving barriers | `refresh`'s entry, post-geometry and post-placeholder liveness readings | Gone. `src/sortable/rect-index.ts` holds exactly one `live()` read, at line 315, immediately before `getBox(item)` |
| §The surviving barriers | `#abort()` as a named private member with a shared exit | Gone. Inlined at its one site (`rect-index.ts:322-324`); no `#abort` identifier in `src/` or `tests/`, and all nine surviving `abort()` calls are `AbortController` |
| §The surviving barriers | `remeasureHole(placeholder, live, …): boolean` | Gone. `remeasureHole(placeholder, start, end, centre): void` (`rect-index.ts:427-447`), and `linear-shift.ts`'s `hollow` branch (226-235) carries no abort arm |
| §The surviving barriers (F-304) | `linear-shift.moved`'s post-`box` reading; `xy.resolve`'s pre-`compareDocumentPosition` reading | Both gone, each replaced by a comment stating the placement rule (`linear-shift.ts:324-329`, `xy.ts:256-261`) |
| §The ownership boundary, reversed 2026-09-07 | The four `RectIndex` accessors | Gone. No `get values()`/`get count()`/`get hole()`/`get items()` anywhere in `src/`; `RectIndexView` is a declared four-member reader with no method members (`rect-index.ts:90-101`) |
| §The behavior-facing interface | the separate `host` record; `KernelHost` | The object and the type are gone from `src/`. `interface BehaviorContext` (`src/kernel/spec.ts:40-99`) is implemented by `class Kernel` (`src/kernel/kernel.ts:320-324`) and narrowed structurally at `src/kernel.ts:247`. **The vocabulary is not gone — see dr-1.** |
| §The behavior-facing interface | `cancel: host.cancel` / `destroy: host.destroy` "must stay silent" | Withdrawn as stated; both controllers wrap (`src/sortable/controller.ts:66-72`, `src/free-drag/controller.ts:88-95`) |
| Step 6 landing note | `Object.create(host)` in the sortable harness | Gone; forwards member by member |
| §The ownership boundary (F-299) | `verifyEquivalence`'s repair writes | Gone; the instrument snapshots through the read view and rebuilds under a constant-true `live` (`rect-index.ts:559-600`) |

**Backward pass.** Traced from surviving machinery to the decision behind it: the single `live()` barrier and its threading (`InsertionRuntimeView.live` → `LinearShift.refresh(live)` → `RectIndex.refresh(live)`, plus `DisplacementReport`'s fifth-from-last `live` argument), `RectIndexView` and `ReadonlyFloat64Array`, `Kernel.closed` as a getter, `arm` on the class and off the interface, `AttemptSlots`, `thenOf` as a module function, `ConstraintView`, the ten `unbound-method` suppressions, and the `LinearShift`/`RectIndex` two-binding read/write split. All but one are live under D-170's current text or under a decision it composes with (D-36, D-37, D-38, D-53, D-168, Q-18); the exception is dr-4.

**Verification performed in this agent.** `npx just decisions` and `--retired`; `npx eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts src tests` from the package directory (**zero `@typescript-eslint/unbound-method` diagnostics**); full-tree greps for every construct in the table above; `git diff --stat 261a3a16..b73b6779` per path; `git log -S`/`-L` to date `linear-shift.ts`'s stop arm and the pre-image of `abort()`.

**Not covered.** Bundle-size figures and `budget-rebases.md` were not re-measured — that is D-106's standing instrument. The browser suite was not run; no finding below turns on runtime behaviour. Test-body correctness, F-303's retargeting arithmetic, and the free-drag/sortable spec class field lists were read for orphaned constructs only, not reviewed for coverage — that is the feature-proof pass's question, not this one's.

**One observation outside my lens, passed on rather than filed as a finding.** `npx just lint` over the package does not pass at `b73b6779`: six errors in `tests/kernel/lifetimes.node.test.ts` (3 × `strict-void-return`), `tests/packaging.node.test.ts` (1 × `prettier/prettier`) and `tests/probes/13b-settlement.ts` (`import-x/order`, `method-signature-style`). None of the three files is touched anywhere in `261a3a16..b73b6779`, so this is pre-existing and out of range; it is recorded because D-170's falsifiers are stated against "the package-local `lint-fix` recipe on the file as shipped" and a consolidator should know the whole-package recipe is red for unrelated reasons.

## Findings

### dr-1 — The `host` vocabulary the step-6 amendment deleted survives in shipped source, including in the two behavior factories' parameter binding · **Tier B**

**The surviving construct.** Both behavior factories still bind and thread the deleted façade's name:

- `src/sortable/behavior.ts:77` and `:101` — `return (host) => …`, threading `host` into `createSortableSpec(host, …)`, `createSortableController(host)`, `host.realm`, `host.root`, and `if (host.closed)` (lines 78-79, 128, 132-133, 144, 162);
- `src/free-drag/behavior.ts:54` — the same, at lines 56, 58-59, 70, 87.

Both pass `host` into parameters the arc _did_ rename to `kernel` (`src/sortable/spec.ts:359,1880`; `src/sortable/controller.ts:42`; `src/free-drag/controller.ts:70`), so one call site now spells the same value two ways.

Four of the nine remaining `host.*` prose references sit in **published-entry docblocks** and instruct a behavior author to call a member on an object that no longer exists: `src/kernel.ts:168` (`A behavior author calls host.fail(stage, error)`), `src/kernel.ts:227` (`The factory is called with the kernel host`), `src/drag.ts:42` (`the behavior author who calls host.fail`), `src/sortable.ts:89` (`a behavior calling host.cancel`). The second of these already ships: `packages/drag2/kernel.d.ts:13` carries it verbatim, in a build whose export list is current (it exports `BehaviorContext`). `src/kernel/seams.ts` holds five more in internal docblocks (lines 150, 248, 325, 349, 397, 505, 558) and one stale factory reference at line 108 (`Supplied by createKernel`, which step 6 replaced with `class Kernel`).

**The decision it rests on.** `KernelHost` as a composed capability record handed to `BehaviorFactory` — D-47 published it, D-53 gave it the liveness member, and the scope record's §3.4 (carried into D-170's body) stated `host` "is not the entity and does not become the class — it is a capability façade composed from four owners and **stays a record**".

**What changed, and where it is recorded.** D-170 §The behavior-facing interface, amended 2026-09-06 on the owner's correction, record [`f305-owner-correction-behavior-kernel-claude.md`](f305-owner-correction-behavior-kernel-claude.md). It supersedes §The step-6 boundary's conclusion, deletes the separate `host` object, and renames the type outright: "**`KernelHost` becomes `interface BehaviorContext`** … with `arm` on the class and off the interface, **and the parameter renamed `host` → `kernel` wherever it is threaded**". The alias is refused rather than declined, on `CONTRIBUTING.md` §8. The rename landed at the kernel and spec tier (`src/kernel/spec.ts:521`, `src/sortable/spec.ts`, both controllers, `src/kernel.ts:247`) and stopped short of the two behavior factories, which `git diff --stat 261a3a16..b73b6779 -- src/sortable/behavior.ts src/free-drag/behavior.ts src/drag.ts src/sortable.ts` shows are **untouched across the entire range**.

**Is the justification live?** No. There is no host object and no `KernelHost` type; the value is the kernel under a narrower declared type, which is the whole substance of the amendment. The rename clause is normative text of a live decision, not a preference.

**What removal would be.** Identifier and comment text only. The parameter is module-private in both files and appears in no `.d.ts` signature; nothing about the runtime, lifecycle, public API or ownership boundary moves. The one currently-shipping sentence (`kernel.d.ts:13`) is documentation.

### dr-2 — The arc's rename carried a D-41-retired claim forward under the new name, so a live typecheck fixture now asserts `BehaviorContext` has a member it does not · **Tier B**

**The surviving construct.** `tests/revision/phase-14.ts`, three prose statements:

- line 193 — "the acknowledgement arrives through `BehaviorContext.presentationCommitted()`";
- lines 214-216 — "**`BehaviorContext` is imported.** Seven members: six unchanged … and `presentationCommitted`, which is D-33's and shipped with Phase 15";
- line 199 — "`ResolutionOptions`, `ReorderResolution` and `SortableController.ready(request)` are the shipped ones".

Verified against the tree: `BehaviorContext` has exactly seven members — `realm`, `root`, `dispatch`, `fail`, `closed`, `cancel`, `destroy` (`src/kernel/spec.ts:42-96`) — and none is `presentationCommitted`; `SortableController` is `invalidate`, `cancel`, `destroy` (`src/sortable/controller.ts:24-36`). The same file contradicts its own prose thirty lines apart: `n10` and `n11` are `@ts-expect-error` assertions that `holdForReadiness` and `sortableController.ready` are "deleted with the readiness protocol (D-41)" (lines 1016-1019).

**The decision it rests on.** D-33's authored-presentation acknowledgement protocol, which put `presentationCommitted()` on the host and `ready(request)` on the controller.

**What changed, and where it is recorded.** D-41 (Revision 2) deletes the protocol in full rather than amending it — `00-index.md` §D-33 ("Retracted by D-41 … The whole protocol is deleted, not amended"), §D-41, `02-kernel-behavior-contract.md:1280` and `:1326`, `05-lifecycle-invariants.md` §I-35. So the premise expired long before this arc. **What the arc did** is the finding: commit `31ac5204` renamed `KernelHost` → `BehaviorContext` inside these sentences (confirmed by `git diff 261a3a16..b73b6779 -- tests/revision/phase-14.ts`), which converts three plainly-dated claims about a deleted type into three false claims about the type a behavior author is handed today.

**Is the justification live?** No, in both directions: the member does not exist, and the fixture's own header states the rule it is now breaking — "A restatement that outlives its implementation is how a fixture starts lying, which is why each half is deleted the moment `src/` agrees with it".

**What removal would be.** Comment text in a type-only fixture. No compile assertion changes; `n10`/`n11` already pin the correct property.

### dr-3 — Live contract sections still state normative constraints over the retired `KernelHost`, while sibling sections were updated · **Tier B**

**The surviving construct.** Five live normative statements name a type that no longer exists:

- `.plan/contract/01-construction-ownership.md:93` — the enumeration of what `@ydinjs/drag/kernel` publishes: "`BehaviorFactory`, `BehaviorInstall`, `BehaviorSpec` and `KernelHost` **are** the vocabulary";
- `.plan/contract/03-feature-composition.md:598` — the `InsertionRuntimeView` widening table's `live` row: "the reading is the logical latch and nothing else — `KernelHost`'s liveness member (D-53)";
- `.plan/contract/03-feature-composition.md:705` — the same rule in prose, "which the behavior holds and forwards as `InsertionRuntimeView.live`";
- `.plan/contract/05-lifecycle-invariants.md:229` — **I-36 itself**, a live invariant: "**The reading is the latch — read through `KernelHost`'s logical-liveness member (D-53)**";
- `.plan/contract/05-lifecycle-invariants.md:981` — the live test-obligation row: "**the sanctioned reading is `KernelHost`'s logical-liveness member** (D-53)".

**The decision it rests on.** D-53, which added the logical-liveness reader to `KernelHost` as the one sanctioned reading D-38 leaves available.

**What changed, and where it is recorded.** The rule is untouched; only its subject was renamed, by D-170 §The behavior-facing interface, with no alias. **The propagation is partial, and the partiality is what makes the survivors read as current**: `03-feature-composition.md:1200`, `03-feature-composition.md:1351` and `02-kernel-behavior-contract.md:769` all carry the rename as an explicit `~~KernelHost~~ BehaviorContext` correction, so a reader has direct evidence the documents were swept — and the five above were missed. The implementation already reads the renamed member (`src/sortable/spec.ts:352`, `readonly #live = (): boolean => !this.#kernel.closed`), so the contract is behind the code it governs, not ahead of it.

**Is the justification live?** The constraint is live; its stated subject is not.

**What removal would be.** Contract text; no runtime, lifecycle or API consequence. Tier B because the export enumeration at `01:93` is what a kernel-tier integrator reads to learn the published vocabulary, and it names a type they cannot import.

**Deliberately not raised.** `02-kernel-behavior-contract.md:615,1326,1752,1794`, `05-lifecycle-invariants.md:223,227,239,658,747,925` and `tests/COVERAGE.md:38` also contain `KernelHost`, and every one is dated argument prose about D-32/D-33/D-41 that is already past-tensed or struck. That is the record doing its job, and it is not a cleanup target.

### dr-4 — `LinearShift.refresh`'s stop arm re-retires a cache the callee already retired, and open-codes `LinearShift.retire()` · **Tier C**

**The surviving construct.** `src/sortable/linear-shift.ts:261-266`:

```ts
if (!index.refresh(snapshot, dragged, getBox, live, placeholder, settle)) {
  this.#forget();
  index.retire();

  return false;
}
```

`RectIndex.refresh` reaches `return false` from exactly one place, and its two statements before it are `this.retire(); return false;` (`rect-index.ts:322-324`). `RectIndex.retire()` is `items.length = 0; count = 0; #dirty = true; #measured = -1` (`rect-index.ts:465-470`) — idempotent — so the caller's call is a no-op. The pair `#forget(); #index.retire();` is also, statement for statement, the body of `LinearShift.retire()` (`linear-shift.ts:370-373`), which step 2 minted.

**The decision or assumption it rests on.** None recorded. `git log -S "index.retire();" -- src/sortable/linear-shift.ts` dates the caller-side call to `63922766`, and `git show 63922766^:packages/drag2/src/sortable/rect-index.ts` shows the closure-era `abort()` already ran `index.retire()` at that commit's parent — so the call has been redundant since it was written, and no decision, review record or code comment states a reason for it. The nearest candidate justification is the callee's own "`retire()` is this class's one definition of _stop_", which is the argument for the call being _inside_ `refresh`.

**What changed about the justification.** D-170 step 2 (`12311981`) converted `createLinearShift` to `class LinearShift` and, in the same pass, gave it a `retire()` member with this exact body — so the arc created a named definition of the stop the arm open-codes, without folding the arm into it. The stop path itself was re-argued in §The surviving barriers, which restated where the retire belongs and placed it in the callee.

**Is the justification live under current policy?** There is nothing to keep alive. `CONTRIBUTING.md`'s size-and-ownership policy and D-170's own "one definition of _stop_" reasoning both point the other way.

**What removal would be.** Internal only. `RectIndex.retire()` is idempotent, so no consumer-observable state, timing or published value changes; no lifecycle, API or ownership boundary is touched. **Routed to the Architect rather than settled here** only in the sense that whether `LinearShift` should retire itself on this path at all — as against calling its own `retire()` — is an ownership question about which object owns the stop, and this pass does not choose.

## Checked and found sound (null results)

- **No runtime withholding machinery exists to become orphaned.** F-305's owner correction turned on "no `Object.freeze`, `seal`, `defineProperty`, `Proxy` or `WeakMap` anywhere in `src/`". Re-verified at `b73b6779`: `grep -rn "Object.freeze\|Object.seal\|defineProperty\|new Proxy\|WeakMap\|WeakSet" src/` returns nothing. The premise the amendment rests on is still true of the tree, and `arm` gained no runtime guard (`src/kernel/kernel.ts:306-318` states the contract in prose, as F-308 required).
- **The step-0 gate's inherited weakening is currently inert.** `ignoreStatic: true` is F-295's "inherited from the preset, not chosen", and `grep -rn "^\s*static " packages/drag2/src` finds no static member in any of the five converted classes — so nothing the migration produced falls outside what the rule reports.
- **The gate is armed and silent.** `npx eslint -c eslint.config.ts src tests` from the package directory produced zero `@typescript-eslint/unbound-method` diagnostics; the rule is set to `error` after Oxlint's derived disables at `eslint.config.ts:82-85`. The ten narrow suppressions the step-0 landing note counts are all present and all still platform-prototype captures — `.scripts/ce-hmr.ts` ×2, `src/kernel/kernel.ts:300` (`thenOf`), `tests/sortable/placement.browser.test.ts`, `tests/perf/q7.browser.test.ts`, `tests/kernel/presentation.browser.test.ts`, `tests/sortable/displacement.browser.test.ts` ×3, `tests/sortable/features.browser.test.ts` — ten sites in seven files, matching the record.
- **`live` is threaded nowhere that no longer reads it.** After the reduction to one reading, the three consumers of the capability are `RectIndex.refresh`'s single barrier, the displacement sink at the head of every `report` call (`src/sortable/slots.ts:35-54`, reached from `linear-shift.ts:433` and `xy.ts:206,338,362`), and `createPlaceholder`'s post-factory mechanics (`src/sortable/spec.ts:805-812`). `LinearShift` holds no `#live` field and declares no liveness member, exactly as §The surviving barriers requires; `linear-shift.ts:101-105` states the absence as a property.
- **`refresh`'s `boolean` return keeps a live reason.** It is vacuous only for a composition naming neither `box` nor `visual`; with a resolver composed the stop is reachable, so the arm is not machinery for a withdrawn case.
- **The two-binding read/write split is the shape the amendment asked for, not a residue of the deleted accessors.** `y.ts:184-189`, `xy.ts:159-166` and `LinearShift`'s `#index`/`#view` pair (`linear-shift.ts:112-120`, both assigned the same object at 182-183) are the "one field and two declarations of its type at different sites" arrangement the 2026-09-07 reversal specifies, with `RectIndexView` declared and never derived and carrying no method members.
- **`ConstraintView` is retained by a live clause.** Q-18 is settled inside §The behavior-facing interface, on the test that a materialized narrowing is a control panel only when a receiver already exists at the same lifetime and nullability; `ConstraintView` has none. Not re-argued here.
- **D-102's module-graph exclusivity is intact.** `bench/size/measure.ts:240-269` still asserts `sortable/linear-shift.js` absent from the `minimal (xy)` composition and present in `minimal`. The arc did not move it.
- **No compatibility shim was introduced for any of the five conversions.** No re-exported factory alias, no `createRectIndex`/`createLinearShift`/`createSeamDriver`/`createKernel` binding survives in `src/`; the only occurrences of those names are the stale `seams.ts:108` docblock covered by dr-1 and historical `.plan` prose.

## Method

`npx just decisions` and `npx just decisions --retired` from `packages/drag2`, both saved and partitioned by status (166 active, 9 inactive; 42 decisions carrying retired content, D-170 among them). D-170's live entry and its four amendment sections read in full from `.plan/contract/00-index.md:1505-1563`, with D-167 and D-169's superseded originals read at `:1487-1504` for the backward traces. Forward traces run as full-tree greps for each withdrawn construct, listed in the Scope table with the result; backward traces run by reading each surviving construct's declaration and every call site. Range facts established with `git diff --stat 261a3a16..b73b6779`, `git show 261a3a16:…`, `git show 63922766:…`, `git log -S` and `git log -L`. The receiver gate was run rather than assumed. No production code, contract or decision was modified.

LSP plugin — unavailable. Probed at the start of the pass with `ToolSearch` (`select:`-style and keyword queries for a language-server tool); nothing matched, and the fallback to grep was used throughout. This pass's evidence is presence/absence of named constructs across a known file set plus decision-record text, much of it in `.plan/` Markdown rather than TypeScript, so the fallback cost it nothing discriminating.