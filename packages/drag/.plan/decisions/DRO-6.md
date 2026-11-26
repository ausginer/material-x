#### DRO-6 — Adopt the operation class at its measured cost

**Approved by the owner on 2026-11-07, and adopted at `276947f82`.** The [composition report](../composition-report.md) records the approval as relayed: the costs below are accepted for adoption, the priority is a clear architecture with well-defined ownership, and **timing evaluation and tuning are deferred.** The text below is the decision as it was put. The [prototype](../probes/session-owner/README.md) at `b54832a0e` meets `DRD-24`. Its adoption is a single kernel commit, item 1. Its costs below are measured against `e06476d2b`, whose source is production's.

**Size.** Brotli is the figure that governs.

- **`draggable` alone:** +103 B, from 2117 to 2220. Minified, +372 B.
- **Every other row:** +96 to +121 B, because each one imports the kernel.
- **Seven rows then exceed their ceilings:**
  - `draggable` alone by 81 B;
  - `freeDrag` + `bounds` + `landing` by 73 B;
  - `freeDrag` by 68 B;
  - example: canvas group by 52 B;
  - example: drop zone by 31 B;
  - example: resize handle by 27 B;
  - `draggable` + `lift` by 23 B.
- **The three `sortable` rows stay under their ceilings.**
- **The control row** is already 93 B off its 2024 B figure at the base. The adoption moves it another 103 B.
- **The minified +372 B of `draggable` alone has four causes:**
  - +439 B for interface and public member names, which the minifier can't shorten;
  - +128 B for more references to private names;
  - −612 B for the record's field names, which were unmangled and are now `#`-private;
  - +417 B for other code: the second class and its constructor, the interface methods, `handleEvent`'s dispatch, `runDisposer` and the returned controller object.

**Allocation.**

- **Per sample:** none. The per-sample test passes, in Chromium only.
- **Per pointer operation:** 3 more functions, the gate steps `#move`, `#up` and `#endPending`, which the base created once per controller. That makes 9 objects and 6 functions, where the base created 9 and 3.
- **Per keyboard command:** the same 3 more, which a command never calls. That makes 7 objects and 7 functions, where the base created 7 and 4.
- **Per controller:** 5 fewer functions and 1 more object, the returned controller.
- **Per operation, without allocation:** four field writes copy the fixed values into the session.

**Per-sample work, not measured.** A sample now pays:

- one string comparison in `handleEvent`;
- the platform's dispatch through a listener object instead of a function;
- a direct read of `this.#drag`, where the base read through `this.#session!`.

No timing was taken.

**What approval decides:**

- **You accept the size and allocation figures above as the adoption's cost.** The adoption commit lands with those seven rows and the control red. It re-bases nothing.
- **The ceilings and the control are re-based under `DRO-4`,** from the reading at the composition unit's last commit, which names this adoption as a cause.
- **Timing is judged in that reading, under `DRD-22`'s rules.** The composition report names the adoption commit and its parent, so a slower cycle row can be attributed to it.

**If you decline,** `DRD-24`'s fallback lands as item 1, and the ownership model stays recorded as the target. The fallback has no size reading.

**Recommendation: approve.** These figures are the cost of the boundary you set:

- The names the boundary needs cost about as many minified bytes as the unmangled record fields they replace.
- The net growth is the code of a second class.
- The three functions are created once per press, not per sample.