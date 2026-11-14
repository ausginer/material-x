# `CallbackList` insertion dispatch in Chromium

This probe compares two ways for a `CallbackList` to add an entry. It measures them in Chromium and changes no production code, instrument, threshold or budget. No campaign was run.

- **"string"**: `src/kernel/callback-list.ts` at `0a28f909a`. A list holds the name of its insertion method and adds with `this.#entries[this.#insertName](callback, receiver)`.
- **"function"**: `src/kernel/callbacks.ts`, the owner's uncommitted edit on `drag/size` at `eb8ee5e25`. A list holds `Array.prototype.push` or `unshift` and adds with `this.#insert.call(this.#entries, callback, receiver)`. [`owner-callbacks.ts.txt`](owner-callbacks.ts.txt) is a copy of the file as measured (SHA-256 `3fef74e7…cc25bd`). The owner's edit was not changed or staged. `git diff` for the whole tree had SHA-256 `971e4ef8…e1415` before and after the readings.

`run`, `has`, `empty` and `clear` have the same code in both versions.

| File | Contents |
| --- | --- |
| [`dispatch.ts.txt`](dispatch.ts.txt) | The probe. Its header describes the method |
| [`owner-callbacks.ts.txt`](owner-callbacks.ts.txt) | The "function" source as measured |
| [`2026-11-12-callback-dispatch.json`](../../measurements/2026-11-12-callback-dispatch.json) | Every timed batch, and the summary the probe printed |

## Method

To run it, copy `dispatch.ts.txt` to a scratch `.ts` file, then run `node <copy>.ts --launches 8 --rounds 40 --warmup 20 --out <file>` from the repository root. The probe reads "string" from `git show 0a28f909a` and "function" from the working tree. It removes the types with `node:module`'s `stripTypeScriptTypes` and serves both modules unchanged to one headless Chrome page through Playwright. The page is cross-origin isolated, so `performance.now()` has 5 µs resolution.

- **Both implementations are in the same page.** Each one has its own generated harness functions, so no harness call site sees both classes. A queue and a stack of one implementation share its class, as the step queue and the disposer stacks do in production. The warm-up runs both kinds of list before any timing.
- **Control.** A third variant, "control", loads the `0a28f909a` source again as a separate module. This gives a second class with the same code. Its distance from "string" shows the probe's noise and order bias.
- **Paths.** `d1` is one `add` and then one `run` per operation. `d4` is four `add` calls and then four `run` calls. `construct` is one `queue()` and one `stack()` per operation, stored in a 1024-slot ring so that the lists escape. Construction is timed in its own batches.
- **Checked counter.** The callback adds its argument to a counter on its receiver. After every batch the harness compares the counter with the expected count and checks that the list is empty. For construction it counts the `empty` lists in the ring. A mismatch stops the run. No mismatch occurred.
- **Alternation.** Each round times one batch for each variant and each case. The order rotates every round and reverses every other round. There are 8 fresh browser launches, and the module that is evaluated first rotates by launch. Each launch has 20 untimed warm-up rounds and 40 timed rounds, which gives 320 timed batches for each variant and each case. A batch is about 15 to 40 ms long.
- **Environment.** Chrome for Testing 157.0.8103.38, headless, Node v26.13.0, 12 CPUs. The load average was 3.3 to 4.4 at the end of the run, from other processes on the machine.

## Readings

The ratio for each round is the batch's ns/op divided by the "string" batch's ns/op in the same round, minus 1. A negative ratio means "function" was faster. The table shows the median over 320 rounds, the p10 to p90 range, and the range of the 8 per-launch medians.

| Case | "string" ns/op, median | "function" ns/op, median | function/string | Rounds below 0 | Per-launch medians | control/string | Per-launch medians, control |
| --- | --: | --: | --- | --: | --- | --- | --- |
| `d1` queue | 36.96 | 31.07 | −16.0% [−30.5% +2.9%] | 284/320 | −14.9% to −17.6% | −0.2% [−22.2% +19.5%] | −1.8% to +2.4% |
| `d1` stack | 26.81 | 20.29 | −24.3% [−29.7% −11.7%] | 302/320 | −23.4% to −24.9% | +0.1% [−12.9% +18.6%] | −0.4% to +1.1% |
| `d4` queue | 189.17 | 161.92 | −13.9% [−25.1% +1.3%] | 286/320 | −12.7% to −16.0% | −0.2% [−15.4% +18.8%] | −2.9% to +1.0% |
| `d4` stack | 104.23 | 78.90 | −25.2% [−30.3% −12.3%] | 302/320 | −24.7% to −25.9% | +0.6% [−4.2% +22.3%] | −0.1% to +13.6% |
| `construct` | 16.92 | 15.98 | −5.6% [−20.5% +17.1%] | 235/320 | −3.1% to −9.6% | −0.7% [−13.3% +16.6%] | −2.8% to +0.6% |

The `construct` ns/op is for one `queue()` and one `stack()` together. One control launch on `d4` stack had a median of +13.6%. The other seven were between −0.1% and +1.2%.

## Observed difference

- **Add and run: "function" is faster in every launch.** The function reference is about 24 to 25% faster for a stack and 14 to 16% faster for a queue. By the medians, that is about 6 to 7 ns per entry added and run. The queue's relative saving is smaller because `unshift` costs more than `push`. The per-launch medians are within about 3 percentage points of each other. The control's per-launch medians are within about 3% of zero, except the one launch noted above. So the difference is several times larger than the probe's noise.
- **Construction: a small difference that is not certain.** "function" was faster in all 8 per-launch medians, by 3 to 10%, which is about 1 ns for each pair of lists. The p10 to p90 range of the rounds includes zero, and the control's spread is of the same order. One construction happens per controller and per operation, so this path is not repeated during a drag.

## Uncertainty and limits

- **Absolute ns/op are not reliable. The ratios are.** The p10 to p90 range of absolute times is about 1.5× wide, and the medians are about a third higher than in a shorter trial run made just before. Both effects are consistent with load from other processes. The rounds are paired, so these effects apply to both sides of a ratio, and the per-launch ratios stay close together.
- **The workload is synthetic.** Each harness adds the same callback and receiver, and the lists stay short. It shows the cost of the insertion path in isolation. It does not measure a drag. The production lists receive a small number of entries per controller or operation. So the inferred saving for one drag is tens of nanoseconds, which no frame-level instrument here can detect. This is an inference, and no drag was measured.
- **The cause is inferred and was not verified.** One keyed load at `this.#entries[this.#insertName]` receives two different names, `'push'` and `'unshift'`. A call through a stored builtin with `Function.prototype.call` avoids that load. No V8 tracing flags were used to confirm this.
- One browser version, one machine and one engine. Firefox and WebKit were not measured.

Bundle size was not measured here. The size pass records size in [`size-pass-assessment.md`](../../size-pass-assessment.md).