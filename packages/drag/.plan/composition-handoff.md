# Composition handoff

**One bounded unit for one implementer. It does two things: `Gesture`'s steps take the operation as a parameter, and the three findings on the composition refactor are closed.** The decisions are `DRD-24` and `DRD-25` in [`00-index.md`](00-index.md). The behavior owed is [`contract.md`](contract.md), whose public surface and `DRI-14` gained one rule each.

**Base:** `drag/production` at the commit that carries this file. It contains the owner's refactor `3084191bb` and the owner's restore of the `items()` copy, `d4286ce64`. Work on that branch, and keep `d4286ce64`'s `#pull` as it is.

**Do not expand:**

- No class for one operation, and no other new class.
- No change to the reader's precedence, the gate or the slots.
- No change to the typed-array locals in `y.ts`, `xy.ts`, `rect-index.ts` and `linear-shift.ts`. They are on the per-sample path, and changing them is a performance question.
- No new public option.
- No measurement campaign, no accepted cost and no re-based ceiling. `DRO-4` stays open.

## Work, in order

### 1. Kernel: the operation as a parameter (`DRD-24`)

**Its own commit, before any behavior change.**

- `#move` and `#up` receive the `Session` that `#onPointer` tested, like `#activate`, `#drop` and `#conclude` already do. After this item, `src/draggable.ts` has no `this.#session!`.
- `this.#session` is read only where its absence is a handled case: the listeners, `#applyRequests`, `#runStep`, `#raise`, `#cancel`, `#press`, `#command`, the `Drag` scope checks, `#requestVerdict`'s check and `#teardown`.
- **How the step receives the session is your choice, within these limits:**
  - nothing is allocated per sample (DRI-17);
  - each step stays a function created once per controller;
  - `__DEV__` refusal counting still reads the refused event (DRI-6).

  Passing the session to `#enter` as a further argument, after the event, meets all three limits.

- **Keep every local that captures a value before its field is cleared or replaced, with its comment.** `DRD-24` lists them. You may also add a local that names a value read several times in one step.
- **Check:** the whole three-engine suite passes with no test edited. Typecheck and lint pass.

### 2. Built-ins (`DRD-25`)

- **Displacement.** `sortable()` calls `config.displacement` once. It passes the sink to `SortableBehavior`'s constructor and registers the sink's `retire` with the kernel's `use`. The constructor no longer calls the installer.
  - **Check:** "should cancel a running landing and the row animations" and "should keep a row animation past the terminal, until destruction" pass in three engines.
  - **Witness:** both fail at `d4286ce64` in three engines.
- **Placeholder context.** `activate` passes the `placeholder` factory a new object with exactly `item`, `visual`, `box` and `rect`, built once per activation.
  - **Test:** a factory that records its argument sees exactly those four keys, and none of the `Drag`'s members, such as `requestCancel` or `state`. The rule is in the contract's public surface, which has no `DRI` address, so the test cites `drag:DRD-25`, as the class tests cite `drag:DRD-20`.
  - **Witness:** it fails at `d4286ce64`.
- **`items()` ownership.**
  - **Documentation:** one or two sentences in the `items` TSDoc in `SortableConfig`. They say that each pull copies the returned array, and that the consumer keeps its array and may change it at any time.
  - **Witness test:** it must fail when `#pull` returns the consumer's array, and pass with the copy. `DRD-25` names a candidate. The consumer's `items()` returns one array that it keeps, and `onReorder` moves the item within that array and returns a pending verdict. An `Escape` then cancels the drag, and the landing must target the item's home, not the proposed gap. Use `landing` with a duration long enough to observe the target. Choose the observation that is stable in three engines.
  - **Check:** prove the test discriminates with a mutation that removes the copy, and record it.
- **Check:** the three-engine suite passes. The `items()` witness cites `drag:DRI-14`.

### 3. Finalize

1. Run the [handoff](../../../.agents/docs/handoff.md) checks on every changed file.
2. Run the package's `lint`, `typecheck`, `test` and `fmt-check`, and the three-engine recipe.
3. Report the package's `size` output as a gate result at your last commit. It is not a `DRO-4` reading, and you don't re-base it.
4. Write `composition-report.md` beside this file. It names your commits, each test with its witness and mutation, the gate results with their commit, and anything you returned.
5. Push and stop.

## Return to the architect

Stop and return if:

- A step can't receive the session without an allocation per sample or without losing refusal counting.
- Item 1 needs a test edited.
- The `items()` copy has no scenario that discriminates in an engine. Keep the copy, report the engine and stop the witness there.
- A fix conflicts with another contract entry.

## After this unit

A fresh review round reads the remediation and this unit together, at this unit's last commit. The owner then reads `DRO-1` to `DRO-5`, with `DRO-4`'s figures taken at that commit.