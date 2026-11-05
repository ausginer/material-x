# D-208 remediation 5R.1: delta recheck of the closing commit

**Tree read.** Review commit `7f1900ccf` on `drag2/fin-review2`, parent `ba40b6387`. `ba40b6387`'s `src/` equals `5e5a493d2`'s: `git diff 5e5a493d2 ba40b6387` touches no `src/` or test file.

Hashes, diffs and site reads came from git objects in the shared checkout. Lint, format and typecheck ran in the shared checkout, which was clean at `7f1900ccf`. The builds, the declarations and the suite ran in two detached scratch worktrees, one at `5e5a493d2` (the keep list's control) and one at `7f1900ccf`. Both worktrees are removed.

**Subject.** [`request-application-claude.md`](../architecture/request-application-claude.md) §22.3's delta recheck: the closing commit against §22.2's required properties and §22.3's keep list.

**Scope.** The pass covered:

- the four sites §22.3 names, at `ba40b6387..7f1900ccf`:
  - `sortable/spec.ts:796–798`;
  - 05:199;
  - 07:686;
  - the appended §Closing commit subsection of `d208-step5.md`;
- every item on §22.3's keep list, measured by this pass.

It did **not** cover:

- 5R.1's accepted items 1–3, or any comment or contract text outside the four sites;
- any search or census, or F-442's instances in either behavior;
- `c186f120e`, the budget overruns and `d208-requests.md`;
- browsers other than Chromium, and `react.browser` and `stories.browser`, which do not load.

The record's claim that the 15 rows also equal 5R's tip table is not on the keep list, and I did not check it.

## Result

**The closing commit satisfies §22.3. Nothing in this pass prevents the architect from closing 5R.1.**

- Each of the three corrected sites meets its §22.2 property.
- The record subsection carries what §22.3's fourth site requires.
- Every keep-list item holds.
- The commit touches exactly the four sites' files: `sortable/spec.ts`, 05, 07 and `d208-step5.md`.

**No defect found at any of the four sites, so nothing was fixed in place.** I raise no finding and route nothing to the architect.

## Sites

| Site | §22.2 property | At `7f1900ccf` | Verdict |
| --- | --- | --- | --- |
| `sortable/spec.ts:796–798` → `:796–800` | The cancel's source is stated as the class states it. A source may be named only as an example, marked as one, and no exhaustive list | _consumer code reached during this activation before `onStart` registers a cancellation — the placeholder factory in `prepare` and the placeholder's `connectedCallback` above are examples, not a complete list — and the effect then fails before `onStart`_ | **Meets.** The source is general, matching §21.3's first condition (consumer code reached from `prepare` or `effect`). The two named sources are marked as examples, and nothing in the comment lists sources exhaustively. The edit is confined to the parenthesis, and no changed line exceeds 80 columns |
| 05:199, I-31's heading | _only then_ gets a dated qualification that names the class, points to the row's notes and 02 §I-31, and says the class is open under F-442. Nothing else changes | The qualification is inserted after _(Q-15, D-66)_. It is dated 2026-11-03 and cites §22.2. It names _the admitted class of two-fault paths_ by §21.3's two conditions and states its one `canceled` terminal for an unnotified start. It points to _this row's notes_ and to 02 §I-31, and says _open under F-442_ | **Meets.** A character diff against `ba40b6387` shows a single insertion and no other change to the row. That keeps _`destroy()` is once again the only exception_. Both pointers resolve. The row's notes at 05:203 state the class and cite 02 §I-31 and F-442. 02:861 is §I-31's section, and the link form matches 05:203's |
| 07:686, L-2's body | The body states that L-2 is I-31 as it applies to free drag, cited and not restated. The old wording stays struck, with a date, and the heading and the 07:713 discharge row are unchanged | The old sentence is wrapped in `~~…~~`, followed by _Replaced by a citation 2026-11-03 (D-83, applied by D-208 remediation 5R.1, … §22.2): L-2 is I-31 ([05] §I-31) as it applies to free drag, cited and not restated._ | **Meets.** A character diff shows only the two insertions. The citation makes no claim about free drag's instances. `#### L-2` at :684 and the `**L-1**, **L-2**` row at :713 are untouched |

**`d208-step5.md` §Closing commit — 2026-11-03** (§22.3, site 4). The pass checked each requirement in turn.

- **Placement.** The subsection is a `###` appended after §Remediation 5R.1's last subsection (`## Remediation 5R.1` at :550). The diff is a pure append, apart from the newline it adds to the former last line.
- **The _twice_ correction.** The dated correction quotes §Item 1's _reaches consumer code twice before the start notification_. That sentence is verbatim at :567, and :567 is unedited. The correction names the third source by `#invalidateInSeam()` (`:791`) and `invalidateInsertion()` (`:527`); both citations are accurate at `7f1900ccf`. It also says that no list of sources is established as exhaustive, and it states the first condition generally.
- **Before and after.** The table's _before_ quotations match `5e5a493d2`, and its _after_ statements match `7f1900ccf` at all three sites. The cited range `:796–799` covers the sentence's source clause. Its last clause, _the effect then fails before `onStart`_, wraps onto `:800`.
- **Verification.** Each statement the record makes is one this pass reproduced (below).
- **Input.** _`ba40b6387`, whose `src/` equals `5e5a493d2`'s_ is accurate.

## Keep list

| Item | Result |
| --- | --- |
| Every `src/` stripped hash equals `5e5a493d2`'s | All 62 tracked `src/` TypeScript files hash equal under 5R's instrument: the TypeScript printer with `removeComments`, blank lines dropped, SHA-256, first 16 hex characters. The 62 include `globals.d.ts`. `sortable/spec.ts` is `610e73e86ef0b6a9` at both revisions, which is the record's digest. `ba40b6387` also equals `5e5a493d2` |
| The 15 composition rows are byte-equal to `5e5a493d2`'s | `just size --files` in both worktrees: the report is identical, line for line, from the measurement onward, covering bytes, module counts and budget lines. Every `.measured/*/measured` bundle is byte-identical. The generated `entry.js` inputs differ only in the worktree's absolute path |
| Published declarations byte-identical | The same 33 `.d.ts` paths, with equal SHA-256 |
| The failing set is the same 14 rows | `vitest run`, every project, at `7f1900ccf`: 1,377 passed and 14 failed, with 60 skipped. The failing set is the four budget rows and six control rows in `size.node`, and four rows in `docs.node`. The same run at `5e5a493d2` gives the same counts, and its 14 failing rows are identical by file and test name. `react.browser` and `stories.browser` fail to import in both |
| `references.node` passes | 4 of 4 |
| The same seven lint errors, from `packages/drag2` | eslint over the four files that carry them, plus the two contracts and the record. `free-drag/assemble.ts` has 1 `no-unnecessary-condition` and `free-drag/spec.ts` 1 `consistent-return`. `kernel/seams.ts` has 2 `only-throw-error` and 2 `no-unnecessary-condition`, and `sortable/spec.ts` 1 `consistent-return`. The three Markdown files are reported as ignored. `oxlint` reports nothing on the four `.ts` files, and `oxfmt --check` passes on the four changed files |
| No test changes | `ba40b6387..7f1900ccf` touches no file under `tests/` |
| `git diff --check` | `ba40b6387..7f1900ccf`: clean |
| Typecheck (the record's claim, not on the keep list) | `tsc -p tsconfig.json --noEmit` in `packages/drag2`: only the two `.scripts/vitest-*.ts` errors |

## Considered and not raised

- **The instrument's serialization.** The record's digest reproduces when the file is parsed without parent pointers (`setParentNodes: false`) and the printed text's non-blank lines are joined with `\n`. It does not reproduce with parent pointers set, or with the lines joined with no separator. The earlier [5R.1 recheck](d208-5r1-recheck-claude.md) described the join as having no separator. Equality between the two trees holds under every variant I ran, and equality is the keep property, so this changes no result.
- **The record cites §21.3 for the first condition** but quotes §22.2's wording of it. The two agree in substance: consumer code reached from the activation unit, from `prepare` or the effect, before the start notification.
- **The record's `:796–799`** omits the clause that wraps onto `:800`. The table states the source clause, and that clause ends at `:799`. Nothing to raise.

## Verification limits

- Chromium only. `react.browser` and `stories.browser` do not load in either tree.
- No probe ran. The site verdicts compare text against §21.3 and §22.2 as written, and they do not re-derive the class from the code.
- Lint covered the four files carrying the seven errors, plus the three Markdown files, from the package directory, which is the scope the record states.

## Dispositions proposed

| Item | Proposed route |
| --- | --- |
| §22.3 sites 1–3 | Meet §22.2's properties. **No defect** |
| §22.3 site 4, the record | Meets §22.3 |
| Keep list | Met in full |
| 5R.1's closure | Not blocked by this pass. §22.4 conditions 1 and 2 hold. Condition 3, the dated closure, is the architect's |
| Anything outside the four sites | None found in scope, and nothing routed |