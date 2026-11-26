# Owner class refactor: reading of the receiver follow-up, and acceptance

**Read by the architect on 2026-11-15** on `drag/class-refactor`, at `cb24e927e`. **The inputs:**

- the [receiver follow-up report](class-refactor-receiver-report.md) at `f6b4bdf4c`, on the unit's commit `c9e728bad` from the base `c157dffb5`, with its evidence under [`measurements/2026-11-15-class-refactor-receiver/`](measurements/2026-11-15-class-refactor-receiver/);
- the independent [recheck](reviews/class-refactor-receiver/recheck-reviewer.md) at `cb24e927e`, which read `f6b4bdf4c`, with its probes under [`recheck-reviewer-probes/`](reviews/class-refactor-receiver/recheck-reviewer-probes/).

**The governing records:**

- `DRD-63` in [`00-index.md`](decisions/DRD-63.md), with property 2 as revised on 2026-11-14;
- what `DRD-63` amends: `DRD-35` properties 1 and 7, and `DRD-37` property 4;
- the [recheck assessment](class-refactor-recheck-assessment.md), §4 (Q4) and §5 (what remains before acceptance);
- the [follow-up handoff](class-refactor-receiver-handoff.md).

**Scope.** This record changes no source. The architect repeated the mechanical checks that the recheck assessment §5 item 2 names, and ran no browser test, size, allocation or timing run. The evidence is under [`measurements/2026-11-15-class-refactor-acceptance/`](measurements/2026-11-15-class-refactor-acceptance/).

## 1. Result

**`DRD-63` is implemented, and the owner's class refactor is accepted at `c9e728bad`.**

- **Property 2 holds as revised** at sites 1 to 3. The architect's checks reproduce the report's and the recheck's results (§2).
- **Properties 1 and 3 to 7 stand** on the [remediation report](owner-class-refactor-report.md) and its [recheck](reviews/owner-class-refactor-remediation/recheck-reviewer.md) at `42f42a164`. The follow-up's emitted JavaScript and source maps are byte-identical to `42f42a164`'s. Its source change is two type annotations, which compile to nothing. So the runtime results at `42f42a164` hold at `c9e728bad`:
  - Chromium, all projects: 754 of 759 pass, and the five failures are the `drag:DRI-18` size rows;
  - the allocation readings in the recheck assessment §4.
- **The out-of-block import line is accepted** (§3).
- **The owner accepted the Q4 costs,** with budgets unchanged and no speed claim (§4).
- **Q3's defaults stand.** The owner recorded no other answer: `DRO-13` stands, the receiver guard stays in the types, and the probe stays in the project.

**Closed at `c9e728bad`:** `class-refactor-reviewer-1` to `-6`, and `class-refactor-recheck-1`. No new finding is raised.

## 2. The architect's mechanical checks

The architect extracted `42f42a164` and `cb24e927e` with `git archive` into two scratch trees. In each tree, `node_modules`, `packages/drag/node_modules` and `packages/drag2` are links to the main checkout, so both builds read one box-quad build. Each mutation was applied by content, and each file was restored from its own copy and confirmed with `cmp` ([`checks.sh`](measurements/2026-11-15-class-refactor-acceptance/checks.sh.txt), [`builds.sh`](measurements/2026-11-15-class-refactor-acceptance/builds.sh.txt)).

| Check | Result | Evidence |
| --- | --- | --- |
| Scope | `42f42a164..cb24e927e` changes three files outside `.plan/`: `retirable.ts` and `invalidatable.ts` by one line each, and `tests/callbacks.declaration.test.ts` by 23 added lines and none removed. `c9e728bad..cb24e927e` changes nothing outside `.plan/` | `git diff --stat`, `--numstat` |
| The form | `retire(this: this): void` and `invalidate(this: this): void` on `Retirable` and `Invalidatable`. The JSDoc on `invalidate` is unchanged | the diff |
| The appended cases with their directives removed | W1, W2 and W3 each give one `TS2739` at the receiver argument, at lines 193, 194 and 195 of the stripped file. W3 names `resolve`, `confirm` and `moved`, and not `invalidate` | [`checks.txt`](measurements/2026-11-15-class-refactor-acceptance/checks.txt) §A1 |
| M7, through `tsc` | `TS2578` at lines 193, 195 and 197, and no other error. With the directives also removed, the three calls give no error | [`checks.txt`](measurements/2026-11-15-class-refactor-acceptance/checks.txt) §M7 |
| M7, through the `declaration` project | the control passes 4 of 4 files and 27 of 27 tests. Under M7, `callbacks.declaration.test.ts` fails on lines 193, 195 and 197 | [`m7-declaration.txt`](measurements/2026-11-15-class-refactor-acceptance/m7-declaration.txt) |
| The six receiver removals | each gives exactly one `TS2345` at its own site: `behavior.ts` (207,14) and (209,24), `sortable.ts` (59,16) and (67,26), `drop-targets.ts` (73,14) and (68,24). The types that the errors name equal the report's table | [`checks.txt`](measurements/2026-11-15-class-refactor-acceptance/checks.txt) §removals |
| The recheck's probe | both lines fail with `TS2739`, as the report and the recheck give | [`checks.txt`](measurements/2026-11-15-class-refactor-acceptance/checks.txt) §probe |
| Emitted JavaScript | 33 `.js` and 30 `.js.map` files, all byte-identical. Both `.js` hash lists equal the report's two lists and the recheck's list for `f6b4bdf4c` | [`hashes-42f42a164.js.txt`](measurements/2026-11-15-class-refactor-acceptance/hashes-42f42a164.js.txt), [`hashes-cb24e927e.js.txt`](measurements/2026-11-15-class-refactor-acceptance/hashes-cb24e927e.js.txt) |
| Declarations | 29 files. Only `sortable/retirable.d.ts` and `sortable/invalidatable.d.ts` differ, by the two receiver annotations. `free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts` are identical | [`dts.diff.txt`](measurements/2026-11-15-class-refactor-acceptance/dts.diff.txt) |
| In the main checkout at `cb24e927e` | drag's `npx just lint` exits 0. `npx just typecheck` reports only drag2's two `TS2724`. The `declaration` project passes 4 of 4 files and 27 of 27 tests, with no type errors | [`main-checks.txt`](measurements/2026-11-15-class-refactor-acceptance/main-checks.txt) |

**Limits:**

- One box-quad build served both trees. `packages/box-quad` is unchanged between the two commits.
- `free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts` are compared with `42f42a164`'s build only. Their equality to `5b581fbdf`'s build rests on the remediation report and its recheck.

## 3. The import line outside the appended block

**What happened.** The handoff required two things: change `tests/callbacks.declaration.test.ts` by "the appended block only", and type the cases through a `RectIndex` "imported from `src`". The unit added `import type { RectIndex } from '../src/sortable/rect-index.ts';` at line 17, with the file's other imports. The report disclosed this, and the recheck noted it as an observation and not a finding.

**Decision: accepted. The handoff's text was defective, not the unit.** Under the repository's lint, the two requirements can't both hold. The architect checked this ([`checks.txt`](measurements/2026-11-15-class-refactor-acceptance/checks.txt) §import):

- an `import` statement inside the block fails oxlint's `import(first)`;
- an `import()` type in the parameter fails `typescript(consistent-type-imports)`.

**Why the line meets what the boundary protects:**

- The boundary existed so that the test kept every existing line, as `DRD-63` property 2 requires. The line removes and changes no existing line, and the diff removes 0 lines from the file.
- The line is a type-only import, so it emits nothing. No instrument reads the file's line count or import list.
- `DRD-63` property 2 asks for appended cases, and the cases are appended. An import is not a case.

`DRD-63` doesn't change. The handoff stays as history.

## 4. Q4: the owner accepts the final costs

**The owner accepted the costs at the remediated end,** as the recheck assessment §4 gives them. The architect recorded the acceptance on 2026-11-15, at the owner's instruction, in `DRD-63` §Costs. **The figures are final:** the follow-up's emitted JavaScript is byte-identical to `42f42a164`'s, so no size, allocation or timing figure moved.

**What the owner accepted:**

- **Size,** per row against `5b581fbdf`:
  - Brotli −32 to +39 B, gzip −31 to +20 B, and minified 0 to +895 B;
  - the same five red rows as at `5b581fbdf`, with no new red row;
  - three of those rows grow: "example: drop zone" by 8 B Brotli, "freeDrag + bounds + landing" by 39 B and "complete" by 18 B.
- **Allocation,** sampled with `__DEV__` false:
  - +21.9 B per cold committed move on `y()`, in `LinearShift.moved`, which falls as the code warms up;
  - no difference shown per warm move;
  - −420.3 B per idle `y()` lifetime and −442.7 B per lifetime with one operation.
- **Timing:** no difference shown at the snapshot, which is inconclusive.

**What the acceptance doesn't do:**

- **It re-bases nothing.** Every budget is unchanged, and the five red rows stay red until a re-base under `DRO-4`.
- **It makes no speed claim.** Allocation isn't speed, and no timing result supports a faster or slower claim. No timing campaign is owed.

**The outstanding-Q4 status is corrected.** The report at `f6b4bdf4c` and the recheck at `cb24e927e` both name the owner's answer to Q4 as their next step. Q4 is answered. The recheck's §Next carries a dated note that says so. The report and the recheck assessment §5 stay as history, and this record supersedes their "Next".

## 5. Next

**The pull request is the owner's.** It carries the failing checks that `5b581fbdf` already had: the five `drag:DRI-18` size rows, and drag2's two `TS2724`. Firefox and WebKit didn't run on the refactor. No unit, review or campaign is owed before the pull request.