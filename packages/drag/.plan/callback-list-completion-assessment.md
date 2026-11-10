# Callback list completion assessment

**Read at:** `36dbd55db` on `drag/feature-composition`. That commit carries [`callback-list-completion-report.md`](callback-list-completion-report.md). The implementation is `50ed18a17`, and the handoff's base is `cd69d1149` with the owner's insertion edit ([`insertion-edit.diff.txt`](probes/callback-list/insertion-edit.diff.txt)).

**Governing records:** [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md), and `DRD-35` to `DRD-38`, `DRO-12` and `DRO-13` in [`00-index.md`](00-index.md).

**Method:** a reading of `git diff cd69d1149 50ed18a17` under `src/`, `tests/`, `.plan/probes/` and the package's configuration, and of the report and its [raw output](measurements/2026-11-09-callback-list-completion.txt). Some checks were repeated (§5). Every other result in §5 is the implementer's, and it is marked as reported.

## 1. Result

**`DRD-36`, `DRD-37` and `DRD-38` are implemented at `50ed18a17`, and they conform.** Both deviations are accepted, and so is one comment change that the report lists under item 1 and not as a deviation (§3). M8's result doesn't make `DRD-37` fail, and `DRD-37` is clarified to say how its property 3 is checked (§4). No `DRF` is opened.

**The owner's answers, 2026-11-10,** recorded in the index:

- **`DRO-12`: accepted** at the figures that the report measured at `50ed18a17`. The acceptance re-bases nothing. The size rows that fail at `50ed18a17` stay failing until a re-base under `DRO-4`.
- **`DRO-13`: deferred.** Its default holds: nothing changes kind beyond `Drag` and `Lift`. **`DropTargetTracker` is removed from the architect's list of values the library creates.** A third party may supply its own `DropTargets`, which returns a `DropTargetTracker`, so that interface is also a contract that third-party code implements. A later reading of `DRO-13` checks each remaining declaration for the same reason before it changes kind.

## 2. The properties, by reading

### `DRD-36`

`callback-list.ts` at `50ed18a17`, without its comments, is byte-identical to the base file with the owner's edit applied. The architect applied `insertion-edit.diff.txt` to `cd69d1149`'s file and compared it with the committed file. Only three comments differ.

| Property | At `50ed18a17` |
| --- | --- |
| 1. Insertion decides the order | `queue()` passes `'unshift'` and `stack()` passes `'push'`. `#insertName` is private and read-only. `add` calls `this.#entries[this.#insertName](callback, receiver)`, so the pair is inserted in one call, in that order |
| 2. One `run` | `run` takes the receiver and then the callback with `pop`, and calls the callback on the receiver. It doesn't branch on the kind |
| 3. No function per list | The factories pass a string literal. The class has no function field |
| 4. Unchanged from `DRD-35` | `has`, `empty`, `clear`, the private constructor and the three instances are unchanged |
| 5. A step that requests its own pair again | Added with `unshift` before every waiting entry, so it runs after them. M1 shows that the queue's order is observed |
| 6. The comments | The class comment says that a list holds only the name of the method it adds with, where each kind adds, and that `run` takes the entry at the end. `add`'s JSDoc says where each kind adds. No comment mentions a direction function |
| 7. Other `DRD-35` properties | M3 to M6 fail their checks. The suite passes in three engines (reported) |

### `DRD-37`

| Property | At `50ed18a17` |
| --- | --- |
| 1. Where | One block after `...config` in `packages/drag/eslint.config.ts`, for `**/*.{ts,tsx,mts,cts}`, with a comment that gives the reason and cites `drag:DRD-37`. No other lint configuration changed |
| 2. Its reach | Reported for a file in `src/`, a file in `tests/`, the probe, and `packages/core`. Repeated for `src/kernel/callback-list.ts` (§5) |
| 3. No directive remains | `grep -rn 'unbound-method'` over the package's `.ts` files finds only the configuration's block. The 24 removed directives are the report's table. Lint output names no unused directive. For the exit status, see §4 |
| 4. The types guard the built-in sites | M5 and M6 fail typecheck. `InsertionGeometry` and `DisplacementSink` are unchanged |

### `DRD-38`

`Drag<Operation = unknown>` and `Lift` are `type` aliases of `Readonly<{ … }>`. The member-level `readonly` modifiers are gone. Members, overloads, JSDoc and the generic default are unchanged. Typecheck passes without any change to a user of either type (reported). The contract's public surface already states this.

## 3. Deviations

1. **The package's `tsconfig.json` includes `./.plan/probes/callback-list/allocation.ts`: accepted.** The owner authorized it during the unit. It names one file, with no glob. It doesn't change the package's output: `tsdown` builds the entries in `files.json`, and `tsconfig.docs.json` includes only `src/`. **A consequence for later work:** `oxlint .` lints all of `.plan/`, and ESLint stops on a TypeScript file that no tsconfig includes. So a new `.ts` probe under `.plan/` needs its own entry in this list, or the package's `just lint` fails.
2. **Two comments in `tests/callback-list.declaration.test.ts`: accepted.** Item 2's grep could not pass while they named the rule. One comment explained a removed directive. The other now says that typecheck doesn't report the gap and that lint doesn't check this package for it, which is true under `DRD-37`. No assertion changed.
3. **`run`'s JSDoc, not listed as a deviation: accepted.** Item 1 named the class comment and `add`'s JSDoc. The report lists the change to `run`'s JSDoc in its item 1 row. That JSDoc now says that `run` removes the entry at the end of the array. The change is to a comment only, it is accurate, and it agrees with property 6.

**Report finding 3 is confirmed.** At `f06a99c4f` no tsconfig included the probe, so ESLint would also have failed on it, as Deviation 1 observed. The row in §Disposition of the callback list report names only `oxlint`. That row is left as written, and this record corrects it.

## 4. M8 and `DRD-37` property 3

**Observed:** an unused `unbound-method` directive in `src/` produces an ESLint warning, and `npx just lint` exits with status 0.

**Cause:** `packages/drag/eslint.config.ts` resolves `linterOptions.reportUnusedDisableDirectives` to `1` (warning), which is ESLint's default. Neither the root configuration nor the package's sets it. The package's `lint` recipe runs ESLint without `--max-warnings`. This applies to every package in the repository, and not only to `packages/drag`.

**Decision:**

- **`DRD-37` conforms.** Property 3 states the condition of the package at a commit. At `50ed18a17` the lint output names no unused directive (reported, and repeated in §5).
- **`DRD-37` is clarified, not changed:** property 3 is checked by reading lint's output, not by the exit status. A review that checks it reads the output.
- **No gate is added here.** Making an unused directive fail lint would change the repository's ESLint settings or every package's recipe, which `DRD-37` excludes and which belongs to repository policy. It is not a condition for the review or for merge. The owner may raise it as a repository decision.

## 5. Verification

**Reported by the implementer, not repeated:** the base check; typecheck; the handoff loop; `--print-config` for the test file, the probe and `packages/core`; `npx just test-engines` with WebKit (Chromium 353, Firefox 344, WebKit 344 passed, 18 skipped); the per-sample tests; `npx just test` (379 passed, six size rows failed that also failed at `53c87f988`); the size runs; the three allocation runs; and the eight mutations.

**Repeated by the architect at `36dbd55db`, in the main checkout:**

- The owner's edit, applied to `cd69d1149`'s `callback-list.ts`, differs from the committed file only in the three comments that §2 names.
- `grep -rn 'unbound-method'` over `packages/drag`'s `.ts` and `.tsx` files, excluding `node_modules`, finds only `eslint.config.ts:16`.
- `npx just lint` in `packages/drag`, with no file arguments, prints nothing from either tool and exits with status 0.
- `eslint --print-config src/kernel/callback-list.ts` with the package's configuration gives `@typescript-eslint/unbound-method` as `[0, { ignoreStatic: true }]` and `reportUnusedDisableDirectives` as `1`.
- **The size table's arithmetic:** each row's difference and each distance from a ceiling agrees with the table's own figures.
- **The allocation figures:** 72.1 B for a queue and 72.0 B for a stack, against 32.0 B for a bare array, is 40 B more per list, as reported.

**Not repeated:** typecheck, every suite, size, allocation and the mutations.

## 6. Status for the review

### The revision

**The code under review is `50ed18a17`'s.** The commits after it change only `.plan/`. The round reads the branch at the commit that carries this record.

### Scope

**The last independent review read `d7e7b0d3a`** (the [review round](reviews/production/production-summary.md) and the [architecture challenge](reviews/architecture/production-design-challenge.md)). No independent review has read any unit after it. So the combined review covers `packages/drag` outside `.plan/`, from `d7e7b0d3a` to the revision above: `src/`, `tests/`, `bench/`, `README.md` and the package's configuration. It checks the code against [`contract.md`](contract.md) and `DRD-14` to `DRD-38` as amended. The implementers' reports are inputs, and their results are the implementers' until the review repeats them.

**The decisions after `d7e7b0d3a`, and the record of each unit:**

| Decision | Implemented at | Reported in | Read by the architect |
| --- | --- | --- | --- |
| `DRD-14` to `DRD-23` | `b91db2818` | [`remediation-report.md`](remediation-report.md) | No record of a reading |
| `DRD-24`, `DRD-25` | `276947f82`, `2506dcbb6` | [`composition-report.md`](composition-report.md) | No record of a reading |
| `DRD-26` to `DRD-28` | `039e8e153`, `433a0e06c`, `89995c27e` | [`ownership-report.md`](ownership-report.md) | §Disposition of the ownership report |
| `DRD-29`, `DRF-2`, `DRF-3` | `8c5ace665`, `b33890461`, `d7828a280` | [`lift-representation-report.md`](lift-representation-report.md) | [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) |
| `DRD-30`, `DRF-4` | `da139407e`, `3a67df0ea`, `79be2c938` | [`activation-result-report.md`](activation-result-report.md), and [`activation-result-assessment.md`](activation-result-assessment.md) §7 | [`activation-result-assessment.md`](activation-result-assessment.md), except its §7 |
| `DRD-31` | `a390dfa29`, `0e7e1c7ef`, `4ef33b96e` | [`items-borrowing-report.md`](items-borrowing-report.md) | No |
| No decision: the callback follow-up | `7f1aa0f94`, `aa33ba79a` | [`callback-follow-up-report.md`](callback-follow-up-report.md) | No |
| `DRD-32` | `a8327a7c8` | [`execution-boundary-report.md`](execution-boundary-report.md) | No |
| `DRD-33`, `DRF-5` | `8626b04fd`, `59cc79e74`, `bfc2bfb0e`, `11950690f` | [`feature-composition-report.md`](feature-composition-report.md) | No |
| `DRD-34` | `fd7ae3e43` | [`gesture-receiver-report.md`](gesture-receiver-report.md) | [`gesture-receiver-assessment.md`](gesture-receiver-assessment.md) |
| `DRD-35` | `53c87f988` | [`callback-list-report.md`](callback-list-report.md) | §Disposition of the callback list report |
| `DRD-36` to `DRD-38` | `50ed18a17` | [`callback-list-completion-report.md`](callback-list-completion-report.md) | This record |

The owner's own commits in that range are in the scope as well, for example the kernel split at `bb644d6d7` and the behavior split at `7b9d3c874`.

### What blocks the review

**Nothing.** Every condition that the records set before the combined review is met, or the owner's direction of 2026-11-10 replaces it:

- the instrument repair and `DRF-4`'s remediation are done;
- `DRF-1` doesn't block the review, by its own entry;
- the owner has read `DRO-12` and answered `DRO-13`, and directs the round. That replaces the earlier "the owner inspects it before any review" conditions and the wait for the owner's `DRO-7` and `DRO-8` readings. Those costs stay unaccepted (below).

### Owed before merge, and not before the review

**Owner decisions on costs, each still unaccepted:**

- **`DRO-4`:** the size re-base. Six size rows fail in `npx just test` at `50ed18a17` (the report's §Size). No approval so far re-bases a row.
- **`DRO-7`** (the ownership revision) and **`DRO-8`** (the activation result): read by the architect, and not accepted by the owner.
- **`DRO-10`'s excess:** the `targets` slot charges `freeDrag` +78 B and `freeDrag + landing` +59 B Brotli, and `DRO-10` approves 45 B ([`feature-composition-report.md`](feature-composition-report.md) §Costs).
- **The other reported costs that no approval covers:** those in the reports for `DRD-31`, `DRD-33` beyond `DRO-10`'s slot charge, `DRD-34` and the callback follow-up. `DRD-32`'s figures are inside `DRO-9`, which the owner approved.

**Deferred, and not owed before merge unless the owner changes that:**

- **Timing and optimization,** deferred since `DRO-4`'s 2026-11-07 entry. `DRD-35`'s condition for reopening the list's representation is now only a timing reading that attributes a regression to the list, because the owner accepted `DRO-12`.
- **`DRF-1`:** before the next `compare.ts` run that launches a browser.
- **`DRO-13`:** the declaration kind of the controllers, `FrameTask` and `LinearShift`.
- **An unused directive as a lint failure** (§4): a repository question.
- **`DRO-3`:** physical touch and pen devices, which its recommendation puts before release.

### Notes for the round

- **The findings that the record lists as repaired and the architect didn't read:** `DRF-4` at `79be2c938` and `DRF-5` at `8626b04fd`. The round confirms each repair, and the architect closes the finding on its result.
- **`DRF-4` (b) is a migrated test whose subject changed** ([`activation-result-assessment.md`](activation-result-assessment.md) §6). Other migrated tests may have the same defect. Nobody has searched for them.
- **The report limits that no test covers,** for example the release's `frame.cancel()` and the ordering of the `dropTargets` factory ([`feature-composition-report.md`](feature-composition-report.md) §Limits).
- **`DRD-37`'s accepted consequence:** in this package, lint doesn't report a method read without its receiver. Typecheck reports it only where the method declares `this`.

**Next:** a fresh `consolidator` round on the revision and scope above. No PR is open.