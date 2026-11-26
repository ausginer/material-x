# A member that can't take focus gives up the tab stop (RF-143): recheck

**Lens:** `reviewer`, the targeted recheck that [`RF-143`](../../00-index.md)'s ruling of 2026-11-26 owes, with the ruling of the cost in `1d2c5e0b8`, for #273 and pull request #287. Requested by the coordinator. The [feature proof](feature-proof-claude.md) at `810cffceb` was mine.

**Commit read:** `1d2c5e0b8` on `core/roving-hidden-1`. Its sources are `e8be2ba17`'s. "`main`" below is the three sources of the unit at `2485fb2df`, with core built from them, as in the proof. `origin/main` hasn't changed them since.

**Outcome: accepted. No finding.** The proof's three findings are answered, in Chromium, Firefox and WebKit. A hidden member in a group that isn't rendered now gives up the tab stop in WebKit (`reviewer-1`). A group defined before its members, behind `:not(:defined) { display: none }`, now has its ends (`reviewer-2`). The cost is within the property as the architect replaced it, in each engine (`reviewer-3`). The new witnesses fail their rows in each engine, and the sizes are those that the ruling accepts.

## Scope and method

What the ruling gives the recheck, in the three engines, one at a time, with the proof's probes copied into `packages/material-x/tests/button-group/` and removed afterward:

- **The group while it isn't rendered:** [`proof-unrendered`](probes/proof-unrendered.browser.test.ts.txt), 65 readings an engine ([readings](checks/recheck-unrendered.txt)), compared line by line with the proof's [readings](checks/unrendered.txt).
- **The late definition:** [`proof-late`](probes/proof-late.browser.test.ts.txt) ([readings](checks/recheck-late.txt)).
- **The cost, as the new property says:** the proof's [`proof-cost`](probes/proof-cost.browser.test.ts.txt), with the implementer's [script](../../roving-hidden-1/probes/cost-ends.sh) taking the engine as a parameter ([script](probes/recheck-cost.sh.txt)). Two series of three runs in turn with `main`, one with the head first and one with `main` first, each run a median of seven. The sums are taken by [`recheck-sum.mjs`](probes/recheck-sum.mjs.txt), which reproduces the implementer's 1.34, 0.91, 0.97 and 0.74 from his reading ([readings](checks/recheck-cost.txt)).
- **The new witnesses:** the five mutations of the implementer's [probe](../../roving-hidden-1/probes/witness-ends.mjs), unmutated first. They ran with a [copy](probes/recheck-witness.mjs.txt) that runs the same files in every engine: core's hook file, and the 11 material-x files that use the group, among them `split-button` ([readings](checks/recheck-witnesses.txt)). Each mutation builds core, and the sources and the build are restored.
- **The sizes:** `just size-reading` at the head and with `main`'s three sources ([readings](checks/recheck-sizes.txt)).

**Not read, by the ruling:** the proof's 203 readings of each engine, its other mutations, and the pressed inner corners. **Also not read:** Safari, screen readers, the docs build, material-x's full suite, typecheck and lint (this review changed no source).

## Results

**`reviewer-1`, the group while it isn't rendered.** In WebKit, `hidden` set on a member while the group, an ancestor's `hidden` or an ancestor's `display: none` keeps it unrendered gives `stop b | tab b back b | ends bd` in the 12 lines of those sets. The proof read `stop a | tab body back body` there. WebKit's computed `display` is still stale: the probe's raw lines read `contents` after `hidden`, at once and a frame later. The attribute now decides. The line _shown again in a display none ancestor_ reads in WebKit `stop a | tab a back a | ends ad`, as Chromium and Firefox do. At `810cffceb` it read `stop b`, which the ruling accepted as WebKit's limit, and here the limit isn't seen.

The head now reads the same in the three engines, apart from WebKit's raw lines and the target that Tab reaches past the group after a page's `display: none` on the tab stop's member. That second case isn't required ("a change of a page's style alone … is heard at the next read"), it is in every engine, and the proof read it so. Compared with the proof, the only other change is in the two lines of the _group hidden_ set where a page's `display: none` hides a member: the ends are `ad` where they were `bd`, as amended property 4 says, in each engine.

**`reviewer-2`, the late definition,** three engines: with `:not(:defined) { display: none }` the first member has `data-first` and 20 px outer corners, and the last has `data-last` and the same. This is `main`'s reading. The proof read 8 px on both members. Without the rule the head reads as before.

**`reviewer-3`, the cost,** summed over each series, head over `main`:

| Engine | Groups, head first | Groups, `main` first | Split buttons, head first | Split buttons, `main` first |
| --- | --: | --: | --: | --: |
| Chromium | 0.87 | 0.92 | 0.95 | 0.92 |
| Firefox | 0.58 | 1.10 | 0.88 | 0.83 |
| WebKit | 1.09 | 0.93 | 1.08 | 0.78 |

Each sum is at most 1.5, so the property holds in each engine. The machine had a load of 6.6 to 30.6 on 12 cores. By the property, a single pair above 1.5 isn't a finding, and the pairs are in the reading: none in Chromium (the highest is 1.36), 4 of 36 in Firefox and 5 of 36 in WebKit, the highest 3.34 and 2.57. Firefox's timer gives whole milliseconds, and its 20 groups take 14 to 28 ms. The proof read 3.4 to 7.5 in each Chromium row.

**The witnesses**, of core's 97 rows and of the material-x files' 277 in Chromium and 273 in Firefox and WebKit, where 4 rows run in Chromium only. Each passes unmutated in each engine:

| Mutation | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| `hidden` not read by the hook | core 2 | core 2 | core 4, material-x 1 |
| The group of `810cffceb`, ends by the computed `display` | material-x 2 | material-x 2 | material-x 3 |
| The ends not marked at a change of `hidden` | material-x 5 | material-x 5 | material-x 5 |
| The group's observer only while it is connected | material-x 1 | material-x 1 | material-x 1 |

The rows are those of the implementer's reading. The hidden ancestor's and the hidden host's rows fail in WebKit alone, as the ruling expects, because Chromium and Firefox read `none` there. In WebKit, the group of `810cffceb` also fails the material-x row of the hidden ancestor, by its stale ends, which is `reviewer-1`'s corners. Chromium and Firefox fail the `:not(:defined)` row and the page's `display` row of item 4 only.

**The sizes,** Brotli, with no other row of 36 moving and none over its limit: `button-group/connected-button-group` 4042 to 4147 (+105), `button/split-button` 7766 to 7872 (+106), `complete` 25869 to 26016 (+147). They are the implementer's readings and the ones that the ruling accepts.

## Observation

Not a finding: the hook's JSDoc paragraph on eligibility has one line of 99 characters (`useRovingTabindex.ts` line 251, "page's own style shows it. The controller keeps exactly one eligible item tabbable, or none when"). The formatter doesn't wrap comments, and nothing reads the width.

## Verification of this report

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and the root format check. The relative links were checked against the files with a script. Lint doesn't apply to Markdown.