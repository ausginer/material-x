# `coordinates`' fallback storage: `[]` against `new Float64Array(5)`

**For:** the owner. **Input:** `1de33ae40` on `box-quad/numeric-storage`. **Governing record:** `BQ-12` in [`plan.md`](plan.md), and property 8, which `BQ-12` carries from `BQ-11`. **Evidence:** [`probes/fallback-storage/`](probes/fallback-storage/README.md). Written by the architect on 2026-11-13.

**Recommendation: keep `[]`. No source change is needed,** and no decision is minted. This closes the box-quad exploration of `coordinates`' fallback.

## 1. The question

Without `above`, `coordinates` allocates its own storage for `ancestry` to fill. Since `BQ-11` that storage is `[]`. Before `BQ-11` it was `new Float64Array(5)`, through the removed `space()` factory, and the switch was booked on bytes alone. [`numeric-storage-report.md`](numeric-storage-report.md) states that its runtime and allocation effect wasn't measured. This comparison measures that one choice.

**Held fixed:**

- the optional `above` argument;
- `ancestry`'s implementation;
- the public API.

The candidate, [`probes/fallback-storage/candidate.ts`](probes/fallback-storage/candidate.ts), is the whole module with one line changed: `const read: Space = new Float64Array(5);`.

**Where the candidate lives.** It is committed runnable source in this worktree. It isn't at `src/index.ts`, because this branch is the PR's production source, and the outcome below is that production keeps `[]`. The probe README gives the commands to bundle it, test it and size it.

## 2. What was measured

All of this is in the [probe README](probes/fallback-storage/README.md), in Chromium only.

**Behavior.** With the candidate in `src`:

- the suite passes 242 of 242: the 240 existing tests and the coordinates-walk parity probe against `1de33ae40`;
- `tsc` passes.

**Bytes:**

- box-quad's module grows by 21 B Brotli, from 1197 to 1218;
- drag's rows that include `coordinates` move by −7 to +16 B Brotli, and by +33 B minified each;
- the control row and the canvas-group row don't move.

**Backing storage.** A five-slot `Float64Array` keeps its elements on the V8 heap: 164 B each when retained, with 0 B in array-buffer backing stores. So the sampling profiler counts them. A 16-slot one, as a contrast, puts 128 B in a backing store, which the profiler misses.

**Allocation,** bytes per call against the base, three pages each:

| Path | Candidate | Largest A/A |
| --- | --: | --: |
| fallback, depth 2 | +72.4 | 2.0 |
| fallback, depth 14 | +7.7 | 1.6 |
| fallback, depth 32 | +13.6, and +1.8 in an earlier run | 5.4 |
| `above`, alone | −0.4 | 0.7 |
| `above` after the fallback ran in the same page | +2.7 | 0.9 |

The attribution is measured per function:

- `coordinates` allocates about 150 B more per call;
- `ancestry` allocates 76 B less at depth 2, and 143 B less at depths 14 and 32.

**Timing,** under the owner's hold: no difference shown in any of the five scenarios. The A/A bounds were wide (475 ns at depth 2, 9.3 to 12.8 µs at depths 14 and 32, 150 to 300 ns with `above`), and the load average was 1.7 to 2.6.

## 3. What is inferred, not measured

- **Where the bytes go.** The `Float64Array`, about 164 B, replaces an empty `[]` header in `coordinates`. It also removes the growth of `[]`'s elements on `ancestry`'s first write, which is about 145 B by the backing witness. That accounts for the depth 14 and 32 rows. **Why `ancestry` saves only 76 B at depth 2 isn't identified.**
- **The `above` path.** It allocates no storage, so storage alone can't move it. The +2.7 B after the fallback has run fits load sites that have seen two kinds of storage. That is consistent with the coordinates-walk finding that merging sources costs allocation. The mechanism isn't confirmed, and it doesn't arise when a consumer uses only `above`, as drag does.
- **Runtime.** The candidate's timing directions are under every bound and claim nothing. Lower on 7 of 7 pages at depth 2, by 375 ns against a 475 ns bound, is a direction. It isn't a result.

## 4. Why `[]` stays

- **The candidate is larger.** It adds 21 B to the module, and it moves no drag row down by more than 7 B.
- **It allocates more, where it changes anything.** That is +72 B per call on the shallowest fallback and +8 to +14 B deeper, against nothing gained on any path.
- **No runtime gain is shown.** With no measured runtime or allocation advantage, CONTRIBUTING §0 and §14 leave bytes to decide, and bytes favor `[]`.
- **The shipped consumer is indifferent.** drag's `lift` calls `coordinates` with `above`, which allocates the same either way.

**There is no runtime/size tradeoff to weigh.** The candidate loses on size and on allocation, and timing shows nothing to set against that.

**What would reopen it:** timing with a much tighter A/A bound that confirmed the depth 2 direction, on a consumer that calls the fallback on a hot path. Neither exists today.

## 5. `BQ-12` property 8

Property 8 is unaffected either way. Both choices read the ancestry into fresh storage on each call, never into module state. The parity probe's re-entrant `getClientRects` test passes with the candidate.

## 6. Closed and open

- **Declined by the owner:** the shared-walk proposal, which takes `coordinates`' inherited values from the walk's `DOMMatrix`, and the caller-owned `DOMMatrix` form of it, arm B. Both are in [`coordinates-walk-proposal.md`](coordinates-walk-proposal.md). Neither is pursued.
- **Declined here:** `new Float64Array(5)` as the fallback storage.
- **Still open, and not investigated here:** the suite doesn't detect a reversed ancestor composition order. That is finding **F-7** in [`plan.md`](plan.md), and it awaits the owner's decision on a bounded test unit.

## 7. Next

Nothing is owed on the source. The PR is the owner's to evaluate and merge.