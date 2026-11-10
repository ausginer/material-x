# Combined review assessment

**Read at:** `92fbb93e1` on `drag/feature-composition`. That commit is the owner's `Fallible` change on top of `7afece05a`, which carries the [round summary](reviews/combined-ownership/combined-ownership-summary.md) and the three pass reports. The round read `b01a0283d`, whose production code is `50ed18a17`'s.

**Governing records:** the summary's §Routing, [`contract.md`](contract.md), and `DRD-14` to `DRD-38`, `DRF-1` to `DRF-18` and `DRO-1` to `DRO-13` in [`00-index.md`](00-index.md). The handover that the round started from is [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md) §6.

**Method:** the architect read the summary, the [`reviewer`](reviews/combined-ownership/proof-reviewer.md), [`integrity`](reviews/combined-ownership/integration-integrity.md) and [`cleanup`](reviews/combined-ownership/discipline-cleanup.md) reports, the register entries, and the source and test lines that each routed finding cites. **Repeated at `92fbb93e1`, in the main checkout:**

- `npx just typecheck` and `npx just lint` in `packages/drag`: exit 0, and lint prints nothing from either tool.
- `npx typedoc --options typedoc.json`: 0 errors and 6 warnings. The warnings name `FreeDragSubject`, `DisplacementInstaller`, `AxisInstaller`, `VerdictAwaiter`, `DragAxis` and `ResolveHome`, as `integrity-3` reports. The output went to the default `docs/` folder and was removed.
- `DRD-27`'s release bullet (the `Lifter`'s release and landing) and `landing.browser.test.ts` › "should start a named landing when releasing the top layer throws, and let the outcome stand" exist as §2 cites them.
- The lines that `DRF-8`, `DRF-9`, `DRF-12` and `DRF-16` cite hold what their entries say.

**Not repeated:** every suite, the three-engine `DRF-5` mutation, the size rows and the `compare.ts` text search. Those results are the passes'.

## 1. Result

- **`DRF-4` and `DRF-5` are closed** on the reviewer's result (§2).
- **`DRO-7` and `DRO-8` are accepted.** The owner accepted them before the round. The register now records that (§2).
- **`DRF-11` is closed** by a correction to the contract's DRI-9, which now states the rule `DRD-27` already makes (§3).
- **`DRF-10` is decided by `DRD-39`:** a type that a published signature names is exported from an entry (§3).
- **Required before merge:** `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16`. They form one unit, [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md). None of them changes emitted JavaScript.
- **Deferred with timing:** `DRF-7`, together with `DRF-1`.
- **Optional cleanup:** `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17` and `DRF-18`. Each stays open. None of them is a condition for merge.
- **Declaration kinds after `2bec0c431`:** the package's test and bench declarations are outside `DRO-13`, and no unit is owed for them. The other packages' declarations are routed to the repository register (§5).
- **The repository register's high-water mark** is routed to that register's owner (§6).
- **Owner decisions:** §7 lists what is still the owner's before merge. It does not repeat an accepted cost.

## 2. Closures and corrections

### `DRF-4` and `DRF-5`: closed

**`DRF-4` (a) and (b) hold at `b01a0283d`** (`reviewer`, §Repaired findings):

- The class witness and both built-ins call `draggable` without type arguments.
- The witness calls `nudge()` from a controller step, and only its class operation has that member.
- The session-reach test's three `@ts-expect-error` lines are on the `Drag` that `activate` receives, and each can fail.

**`DRF-5` holds:**

- With `this.bounds?.invalidate()` removed, the regression test fails in Chromium, Firefox and WebKit, with `boxTop` 200 where 50 is expected.
- The test asserts the scroll through `arenaAfter: 50`.

That mutation is the reviewer's, and neither the consolidator nor the architect repeated it. The required property of each entry is met, so both are closed at `b01a0283d`.

### `DRO-7` and `DRO-8`: accepted by the owner

The owner's answer, relayed in the summary, is "да, принимаем. Трейдофф вполне очевидный" ("yes, we accept. The trade-off is quite obvious"). The register's entries said "not accepted", and so did [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md) §6. **Both entries now record the acceptance, dated 2026-11-10.** It covers the figures that each entry records and the reports it cites:

- **`DRO-7`:** the [ownership report](ownership-report.md)'s figures at `039e8e153`, `433a0e06c` and `89995c27e`, and `DRD-29`'s figures in the [lift representation report](lift-representation-report.md).
- **`DRO-7`'s per-sample kernel figure:** `DRO-7` names it as its own figure. It is 13.33 to 17.49 B per move in the [instrument repair report](instrument-repair-report.md) §Item 1.
- **`DRO-8`:** the [activation result report](activation-result-report.md)'s figures at `1d5d3fa13` and `da139407e`, with the example closures and the motion object that the entry adds.

**The acceptance re-bases nothing.** That includes the per-sample test's `< 16` threshold. The repaired test fails on accepted source in some runs, because the accepted figure spans the threshold. **That is a known failure, as the six size rows are.** It stays one until a reading under `DRO-4` re-bases the threshold, or until optimization lowers the figure. Both wait for timing, which stays deferred.

### §6 of the completion assessment, corrected

That record stays as written. This record corrects it in two places:

- **`DRO-7` and `DRO-8` were accepted,** as above.
- **"The instrument repair … done" is wrong for item 2.** [`instrument-repair-report.md`](instrument-repair-report.md) §Not run records item 2 as not run, and `DRF-7` now records it as open.

**§6 also omitted one open item: the kernel's per-sample reading.** The index's status paragraph and [`activation-result-assessment.md`](activation-result-assessment.md) §7 left that reading open. `DRO-7`'s acceptance closes it as a cost. The threshold remains, as above.

## 3. The contract and the public types

### `DRF-11`: closed by correcting DRI-9

**The decision already in force is `DRD-27`'s release bullet.** It says: "The landing starts after the release. It is attempted even when the release threw, and each throw is reported separately." It leaves the choice between two disposers and one to the implementer. `Lifter.acquire` registers two. The README and `acquire`'s JSDoc describe the code. A browser test witnesses it: `landing` › "should start a named landing when releasing the top layer throws, and let the outcome stand".

**Only DRI-9's text disagrees with that rule.** Steps 5 and 6 said "the last disposer" and "in the same disposer". The correction doesn't change what any decision requires, so it is not a new decision (`documentation.md` §6, "A decision is atomic"). **The contract is corrected at this commit,** and its change record gives the old wording. No code changes.

### `DRF-10`: decided by `DRD-39`

**Decision: export each type that a published signature names, from the entry that publishes the signature.** The exception is the `axis` and `displacement` installer types, which stay unpublished. In this package that means four exports:

- `VerdictAwaiter`, from `draggable.js`;
- `DragAxis`, `FreeDragSubject` and `ResolveHome`, from `free-drag.js`.

After this change, the built-ins import `VerdictAwaiter` from `../draggable.ts`, so DRI-18's sentence about their kernel imports is true without an exception.

**Why export, and not record the names as unpublished:**

- **CONTRIBUTING §4's test is met.** `DRD-30` supports class operations. An author who writes one writes `drop()`'s return type, as both built-in operations do. A consumer who types a `home` callback or an `axis` value apart from the call writes the other three.
- **The cost is only surface.** Types emit nothing. The published signatures already fix these shapes, so exporting a name adds the name and makes no new promise about the shape.
- **The alternative costs more.** It inlines the types into the signatures and records them as unpublished. An author would then repeat a function type that the library's own operations name. DRI-18 would also need an exception for the operations that the README offers as the model.
- **The two installers keep their reason.** `DRD-2`, as `DRD-33` amended it, keeps the `axis` and `displacement` slots unpublished: no example wants one, and publishing them later breaks nothing. A consumer passes the value that `y()`, `xy()` or `layoutAnimation()` returns and never writes the installer type. `contract.md`'s capability paragraph already says this. `typedoc` keeps warning about these two, and that is expected.

**The contract's public surface is amended at this commit.** The [handoff](combined-review-remediation-handoff.md) implements `DRD-39`.

## 4. Routing of `DRF-6` to `DRF-18`

**The rule applied:** a finding is required before merge when merging without its repair would leave a statement that the package or the record makes false. That statement can be a document, a contract sentence, a test title or a comment. A finding where every statement is true and the code could only be smaller or cleaner is optional. **No finding is made a mandatory refactor.**

| Finding | Tier | Route | Reason |
| --- | --- | --- | --- |
| `DRF-6` | B | Before merge: handoff item 2 | A consumer is told that the library honors reduced motion for a `Landing` it doesn't run. The landing test's title makes the same claim. The repair is documentation and one test title |
| `DRF-7` | B | Deferred with timing, beside `DRF-1` | §4.1 |
| `DRF-8` | C | Before merge: handoff item 3 | Tests are presented as witnesses of a property they can't fail on. That is `DRF-4` (b)'s class, which was repaired before the review |
| `DRF-9` | C | Before merge: handoff item 4 | The same reason as `DRF-8`, in two titles |
| `DRF-10` | C | Before merge: handoff item 1, under `DRD-39` | DRI-18 is false in two imports, and four published names can't be imported |
| `DRF-11` | C | Closed at this commit | §3 |
| `DRF-12` | C | Before merge: handoff item 5 | The comment describes writable fields that no longer exist. Deleting the unused interface is the smallest true state, and it is cheaper than rewriting a comment for something that has no reader |
| `DRF-13` | C | Optional | The types and branches are consistent and only wider than the state. Narrowing them changes `sortable`'s axis code, which is outside a unit that changes no emitted JavaScript. It was proposed in [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) item 8 too, and it stays optional |
| `DRF-14` | C | Optional | The second call is idempotent. A rename would add a method or touch the listener's dispatch, and the gain is the name |
| `DRF-15` | C | Optional | It costs no bytes. The boundary only no longer has its original reason |
| `DRF-16` | C | Before merge: handoff item 6 | Two comments name identifiers that don't exist, and one argues about a past contract (CONTRIBUTING §Comments and JSDoc) |
| `DRF-17` | C | Optional | A dead harness command that no statement depends on |
| `DRF-18` | C | Optional | The copies agree today. Merging them touches about eight test files and both bench scripts, which is more than a focused review should carry. That includes `PROTOTYPE_REVISION`, which `DRO-5`'s retirement of the prototype arm may remove altogether |

**An optional finding** stays open in the register with no merge condition. A later unit that changes its file may take it, and the change is then read as that unit's.

### 4.1 `DRF-7` stays with timing

**Decision: `DRF-7` is owed before the next `compare.ts --prove` run, together with `DRF-1`, as the instrument unit that starts the first timing reading.** It is not owed before merge.

- **No consumer effect, and no false reading.** `--prove` throws at its first injection, so nobody can read a stale proof as a result.
- **The injection sites will move again.** The optimization that timing would start rewrites the same hot paths, `#move`, `requestStep` and `sortable`'s operation. Updating six text patches now probably means updating them twice.
- **The dry check belongs with the patches.** `DRD-23`'s last bullet states it as a property of the instrument. Its status row now says that the property isn't implemented.

## 5. Declaration kinds after `2bec0c431`

**The facts aren't disputed** (`reviewer-4`, `cleanup-9`): `d8d57383e` converted shapes to interfaces under the rule of 2026-11-08. `2bec0c431` then made library-created value shapes `type`. Two reach questions remain.

### `packages/drag`'s tests and bench: outside `DRO-13`

**Decision:** `DRO-13` covers the declarations in `src/` that it names. It doesn't cover the test and bench interfaces that `cleanup-9` lists: `GroupMove`, `CanvasGroup`, `ReactFixture`, `CdpSession`, `Page`, `Lifted`, `Named`, `Held`, `PageContext` and `Scenario`.

- They aren't published, and no consumer or third-party author meets them.
- Some describe objects that a host provides, `CdpSession` and `Page` among them, and these are proper interfaces under the clarified rule.
- **No unit is owed for them,** and they are no condition for merge. A unit that edits one of those files for another reason applies the rule to that file's declarations.
- `DRO-13`'s entry records this reach.

### The other packages: routed to the repository register

**This isn't `drag`'s to allocate.** The repository's `RF-` and `RQ-` series are allocated in [`.plan/00-index.md`](../../../.plan/00-index.md), and [`review-findings.md`](../../../.agents/docs/review-findings.md) makes this register refuse them. **For that register's owner,** the architect's reading of the clarified rule:

| Declaration | Package | Reading |
| --- | --- | --- |
| `CommitTracker`, `DragSession`, `KeyboardSession` | `core`, `src/traits/reorderable.ts` | Values that module-private factories create, and nothing else implements. By the rule they are `type`. They aren't exported, so the change has no surface |
| `TokenManager` | `tproc`, `src/index.ts` | The type of the single exported value `t`. By the rule it is `type`. **It is exported, so the change is a public-surface change in `tproc`,** for the same reason `DRD-38` recorded for `Drag`: a consumer can augment an interface and can't augment a type |
| `ModuleLoader` | `tproc` | **Host-provided, so it is an implementation contract, and it stays an interface.** This settles the difference between the passes: `cleanup-9` read it, and `reviewer-4` only listed it |
| `Flattening` | `vite-traits-plugin`, `tests/helpers.ts` | A test helper's return shape. By the rule it is `type`, with no surface |

**Nothing here blocks `drag`'s merge.** The question has no consumer effect in `drag`.

## 6. Observation for the repository register's owner

[`.plan/00-index.md`](../../../.plan/00-index.md) §Findings says "High-water marks after this round: **`RF-22`**". The same register carries `RF-23` to `RF-30`, and its `RQ-1` entry says "the next is `RF-31`". The high-water statement is stale.

**Routed, not edited:** that register is the repository's scope. The fix is a one-line correction there, and nothing in `drag` depends on it.

## 7. Owner decisions that remain

**Not asked again,** because they are approved or accepted: `DRO-6`, `DRO-7`, `DRO-8`, `DRO-9`, `DRO-10` up to its 45 B, and `DRO-12`.

**The owner's, before merge:**

1. **`DRO-10`'s excess.** The `targets` slot charges `freeDrag` +78 B and `freeDrag + landing` +59 B Brotli. `DRO-10` approves 45 B ([`feature-composition-report.md`](feature-composition-report.md) §Costs). The choices are to accept the excess or to name the part to remove.
2. **The reported costs that no approval covers.** The owner can answer them as one set, or name a part to remove:
   - the reports for `DRD-31` ([items borrowing](items-borrowing-report.md)) and `DRD-34` ([gesture receiver](gesture-receiver-report.md));
   - the callback follow-up ([report](callback-follow-up-report.md));
   - `DRD-33` beyond the slot charge: the landing capability's figures, the drop-target capability when it is composed (261 B Brotli and its allocation per operation), the `bounds` repair and `RectIndex`'s encapsulation (+13 to +16 B).
3. **Merging with the known failures.** The budgets stay unchanged, by the owner's direction. So at merge, `npx just test` fails the six size rows under `DRO-4`. The per-sample kernel test also fails in some runs (§2). **The owner says whether the merge proceeds with them failing, or orders the re-base that `DRO-4` holds.** This is not a new cost: the costs behind those rows are accepted or in items 1 and 2.

**A check before merge, not a decision:** `DRO-5`, `git branch -r --contains 599684791` lists `origin/drag/prototype`.

**Not before merge:**

- `DRO-3`: physical touch and pen devices, before the package is called released.
- `DRO-13`: deferred by the owner.
- Timing and optimization, `DRF-1` and `DRF-7`.
- An unused lint directive as a failure: a repository question ([`callback-list-completion-assessment.md`](callback-list-completion-assessment.md) §4).

**Defaults in force, and the owner hasn't answered them:** `DRO-1` (pull at admission), `DRO-2` (a landing can be clipped) and `DRO-11` (no landing into a drop target). The code builds each default. **None of them blocks merge,** and an answer is needed only to change one.

## 8. The owner's `Fallible` commit

`92fbb93e1` was committed after the round's revision, so no pass read it.

- **The change:** it adds `interface Fallible { raise(error: unknown): void }` to `src/kernel/drag.ts`. It types `runDragDisposer`'s and `runDisposers`' `controller` parameter with it, where the parameter was typed `Pick<Gesture<never, never, never>, 'raise'>`. `Gesture` now declares `implements Fallible`.
- **The architect's reading:**
  - The change is type-only.
  - `Fallible` is a contract that a parameter requires and a class implements, so it is properly an interface.
  - No entry exports it, and no published signature names it: `typedoc` gives no warning for it.
  - Typecheck and lint pass at `92fbb93e1`.
- **No finding.** The focused review's range includes this commit (handoff §Review).

## 9. Next

1. **An `implementer`** runs [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) from the commit that carries this record, and reports.
2. **A fresh `reviewer`** reads the range that the handoff's §Review gives.
3. **The architect** closes the unit's findings on that result.
4. **The owner** answers §7 and merges.

No PR is open.