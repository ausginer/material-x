# Combined review remediation: assessment

**Read by:** the architect, on `drag/feature-composition` at `26919a938`, with a clean tree. **Inputs:** [`combined-review-remediation-report.md`](combined-review-remediation-report.md) at `f2ac81bc5`, and the [feature proof](reviews/combined-ownership/remediation-reviewer.md) committed at `26919a938`, which read `7afece05a..f2ac81bc5`. **Governing records:** [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md), [`combined-review-assessment.md`](combined-review-assessment.md) §4 and §7, and `DRD-39`, `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` in [`00-index.md`](00-index.md).

**Outcome:**

- `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` are closed. Their required properties hold at `f2ac81bc5`.
- `DRD-39` is implemented at `d1a262306`.
- The proof's `RR-a` and `RR-b` are registered together as `DRF-19`. Each is a test title that states something false, so `DRF-19` is owed before merge under the rule in [`combined-review-assessment.md`](combined-review-assessment.md) §4.
- [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md) repairs `DRF-19`. It changes only two test files.
- The combined review isn't reopened, and the optional findings keep their routes.

§5 is the current list of owner decisions and merge conditions. It replaces [`combined-review-assessment.md`](combined-review-assessment.md) §7.

## 1. Checks made in this pass

The proof ran the handoff's checks and mutations at `f2ac81bc5` and added probes M2b and H1 to H3. This pass repeated only the cheap checks, at `26919a938`. `26919a938` adds only the proof's Markdown, so the source is the same as at `f2ac81bc5`.

| Check | Result |
| --- | --- |
| `npx just typecheck`, `npx just lint` in `packages/drag` | Exit 0. Neither oxlint nor ESLint printed a diagnostic |
| `grep -rn "kernel/" src`, outside `src/kernel/` | Only `src/draggable.ts` |
| `grep -rn RectIndexView src tests bench` | No match |
| `src/draggable.ts` and `src/free-drag.ts` exports | `VerdictAwaiter` from the first. `DragAxis`, `FreeDragSubject` and `ResolveHome` from the second |
| `git branch -r --contains 599684791` | Lists `origin/drag/prototype` (`DRO-5`) |

**Not repeated here:** the builds, the emitted-file comparison, `typedoc`, the browser runs, M1 and M2. The proof records them.

## 2. Closures

| Finding | Required property | Result |
| --- | --- | --- |
| `DRF-10` | The built-ins import kernel types only through public entries, and each type that a published signature names is exported or recorded as unpublished | **Closed.** `DRD-39`'s seven properties hold (proof §Item 1, and §1 above). `typedoc` warns only for the two unpublished installers. M1 fails for each of the four exports |
| `DRF-6` | Each statement about reduced motion for landings covers the landings `landing()` starts, and says that a custom `Landing` owns the preference | **Closed.** The README, `.agents/docs/accessibility.md` and the landing test's title hold it (proof §Item 2) |
| `DRF-8` | Every assertion in a DRI-3 terminal test can fail when the kernel violates the property its title names | **Closed.** The five `log` assertions are removed, and what remains can fail (proof §Item 3). The handoff also required each new title to name what remains. One case label doesn't, and `DRF-19` carries it |
| `DRF-9` | A test's title names only properties its assertions can fail on | **Closed** for the two titles it names. M2 fails the count assertion, and M2b fails the position assertion (proof §Item 4) |
| `DRF-12` | The cache's read-only view has one declaration, and its comment describes the code | **Closed.** The interface is deleted |
| `DRF-16` | Each comment names the code as it is | **Closed.** The three lines are corrected |

**Accepted without a finding:**

- **`shared/invalidation.js` differs from `b01a0283d`'s in one JSDoc line.** The owner authorized this before the report, and the proof confirms that the line is the only difference. No other emitted `.js` file differs.
- **The `no-extraneous-class` directive on `Failing` in `operation-lifecycle`.** The class keeps the authoring form that the test's title names, and the directive gives its reason. A function in its place would name a form that the test doesn't use. The proof found no defect, and this is a test-style choice. The file keeps the class and the directive.
- **The report's reading of "no reachable code" for the two failed-acquisition `log` assertions.** Each one could fail only after the assertion before it had failed. The report states that reading, and the proof confirms it for both tests. It meets `DRF-8`'s required property.
- **The owner's `92fbb93e1` (`Fallible`)** is type-only and publishes nothing, as [`combined-review-assessment.md`](combined-review-assessment.md) §8 read it. The proof confirms the emitted files.

## 3. `RR-a` and `RR-b`

**Rule.** [`combined-review-assessment.md`](combined-review-assessment.md) §4: a finding is owed before merge when merging without its repair would leave a statement that the package or the record makes false, and a test title is such a statement. Both items are title against body. That is `DRF-9`'s class, and neither one is `DRF-8`'s class. They are registered as one finding, `DRF-19`, with two instances, in the way `DRF-9` holds two titles.

### 3.1 `RR-a`: the `fault` case label

**Decision: owed before merge, as `DRF-19` (a).**

- The retitled `terminals` test renders "…: fault before the throw" for a case where nothing runs before the throw. The handoff's item 3 required that the title name what the remaining assertions check, and this case label doesn't.
- The remediation introduced the defect. The earlier label, "%s before start", read correctly for all three cases.
- `DRF-8`'s own required property is about assertions, and it holds. So `DRF-8` closes, and the label is tracked as `DRF-19` instead of keeping `DRF-8` open for one string.
- **Required property:** each case's rendered title describes what that case's body does before the throw. The case with no step before the throw doesn't name one.

### 3.2 `RR-b`: the hidden-visual test

**Decision: owed before merge, as `DRF-19` (b).** The test is not a `DRF-8` instance.

- **Its first `log` assertion can fail.** It fails when the lift returns from `acquire` for a visual with no box (probe H1). So it isn't an assertion that no reachable code can make fail, which is `DRF-8`'s class. It is a second witness of the same lift defect that the fault assertion catches (H2). Nothing requires removing it, and the follow-up doesn't remove it.
- **The title states something false.** "A platform throw" names a source of the fault that the body doesn't produce: the throw is the library's own `lift/visual-no-box-space` from `Lifter.acquire`. DRI-7's platform-call source is witnessed by the `showPopover` tests in the `drag:DRI-7 a failed acquisition` describe of the same file. So no guarantee is left unwitnessed, but the title is false. Under §4's rule, that is enough to make it owed before merge.
- **The title's subject is witnessed only indirectly.** `expect(faults).toHaveLength(1)` passes for any one fault.
- **The combined round could have found it.** The title is the same at `b01a0283d`. Registering it doesn't reopen that round. It was found because the owner asked the proof to classify this test, and it has the same class as a finding that round made owed before merge.
- **Required property:** the title names only what the assertions can fail on, and it names no platform call. The test identifies the reported fault as the lift's `lift/visual-no-box-space`, not only counts it.

### 3.3 Why the follow-up is owed now and not deferred

Both repairs are test-only, in two files, with no `src/` change and so no change to emitted JavaScript. Deferring them would merge two false test titles past a rule that made `DRF-8` and `DRF-9` owed before merge. The follow-up repairs only `DRF-19`, and adds no cleanup.

## 4. `DRD-39`

**Implemented at `d1a262306`** and proven at `f2ac81bc5`. Its status row now records this. No amendment.

## 5. Owner decisions and merge conditions

This list replaces [`combined-review-assessment.md`](combined-review-assessment.md) §7. That section stays as written, as the record at its commit.

**Not asked again, because they are approved or accepted:** `DRO-6`, `DRO-7`, `DRO-8`, `DRO-9`, `DRO-10` up to its 45 B, and `DRO-12`. The owner also authorized the JSDoc difference in `shared/invalidation.js`.

### 5.1 Merge conditions

The architect or the owner checks these. They aren't choices.

1. **`DRF-19` is repaired and closed.** [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md) repairs it, and the architect closes it on that unit's report.
2. **`DRO-5`:** `git branch -r --contains 599684791` lists `origin/drag/prototype`. This holds at `26919a938`. Check it again on the day of the merge.
3. **Typecheck and lint pass** at the commit that is merged.
4. **The test runs have only the known failures:** the six `DRO-4` size rows, each over its ceiling by the bytes recorded at `b01a0283d`, and, in some Chromium runs, the per-sample kernel test. Any other failure blocks the merge. This condition depends on decision 3 below.

### 5.2 The owner's decisions before merge

Decisions 1 and 2 accept costs. Decision 3 permits a merge with failing checks. **They are separate decisions.** Accepting the costs doesn't raise any ceiling, so the size rows still fail, and the merge still needs decision 3. Permitting the merge with failing checks accepts no cost.

1. **`DRO-10`'s excess.** The `targets` slot charges `freeDrag` +78 B and `freeDrag + landing` +59 B Brotli. `DRO-10` approves 45 B ([`feature-composition-report.md`](feature-composition-report.md) §Costs). The choices are to accept the excess or to name the part to remove.
2. **The reported costs that no approval covers.** The owner can answer them as one set, or name a part to remove:
   - the reports for `DRD-31` ([items borrowing](items-borrowing-report.md)) and `DRD-34` ([gesture receiver](gesture-receiver-report.md));
   - the [callback follow-up](callback-follow-up-report.md);
   - `DRD-33` beyond the slot charge: the landing capability's figures, the drop-target capability when it is composed (261 B Brotli and one allocation per operation), the `bounds` repair (`DRF-5`) and `RectIndex`'s encapsulation (+13 to +16 B).
3. **Permission to merge with failing checks.** The budgets are unchanged by the owner's direction, so `npx just test` fails the six size rows under `DRO-4` at merge. The per-sample kernel test also fails in some runs ([`combined-review-assessment.md`](combined-review-assessment.md) §2). The choices are:
   - merge with these checks failing; or
   - order the size re-base that `DRO-4` holds first. A re-base moves the ceilings to the measured sizes, which include the costs in decisions 1 and 2. So the architect recommends answering those two before ordering it.

### 5.3 Not before merge

- `DRO-3`: physical touch and pen devices, before the package is called released.
- `DRO-13`: deferred by the owner.
- Timing and optimization, with `DRF-1` and `DRF-7`, before the next `compare.ts --prove` run.
- The optional findings `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17` and `DRF-18`, with no merge condition.
- Whether an unused lint directive is a failure: a repository question ([`callback-list-completion-assessment.md`](callback-list-completion-assessment.md) §4).

**Defaults in force, which the owner hasn't answered:** `DRO-1` (pull at admission), `DRO-2` (a landing can be clipped) and `DRO-11` (no landing into a drop target). The code builds each default. None of them blocks merge, and an answer is needed only to change one.

## 6. Next

1. **An `implementer`** runs [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md) from the commit that carries this record, and reports.
2. **The architect** reads that report and diff, and closes `DRF-19`. No separate review pass is owed for two titles and one assertion. The handoff's mutation is the witness.
3. **The owner** answers §5.2 and merges when §5.1 holds.

No PR is open.