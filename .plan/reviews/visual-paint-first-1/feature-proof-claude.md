# PR #346, `RF-159`'s paint-first visual rows: feature proof

**Files were read at:** `1edc36b27`, the head of `material-x/visual-paint-first-1` and of PR #346, detached in slot d. **Diff reviewed:** `origin/main...1edc36b27`, all of it. The source is `86bb2696f`, and `1edc36b27` changes only `RF-159`'s status.

**Governing record:** `RF-159` in [`00-index.md`](../../00-index.md), by the architect at `e3957c9b2`, with its evidence in [`visual-paint-first-1/`](../../visual-paint-first-1/). Also `RD-13` for the baselines and `RD-23` for the comparator.

**Lens:** feature proof. Every claim comes from my own reading or from a run I made.

- **Runs:** in [`checks/`](checks/).
- **Scripts:** in [`probes/`](probes/). The probe files sat in `packages/material-x/tests/` while they ran.
- **Restoring:** every edit of `tests/browser.ts` was restored from `HEAD`. The probe files are removed, and `git status` is clean apart from this record.

**Verdict:** the unit meets `RF-159`'s properties 1 and 3.

- **Every input-driven row has the wait:** all eight rows whose state comes from input await a painted frame before the input, and no other visual row applies input.
- **The wait decides the order,** and the image that CI now draws is #336's failing image, byte for byte.
- **The comparator is unchanged.**

Property 2 and the CI witness wait for `RD-13`'s recording, as the entry says. There is one Tier C finding, `reviewer-1`, in the PR's description. Nothing here blocks the recording.

## Scope

- **Read:**
  - `nextPaint()` and `nextFrame()` in `tests/browser.ts`.
  - The four changed visual files, and every visual test file for input ([input](checks/input-rows.txt)).
  - The comparator in `.scripts/vitest-config.ts`, which the diff doesn't touch.
  - The steps that each row takes: fixture, settle, wait, input, matcher.
  - `RF-159`'s status against `documentation.md` §6, `RD-68`, `findings.md`, and the register's merged entries.
  - The PR's title and description.
- **Ran:**
  - The implementer's witness probe in Chromium, unmutated and under four mutations of `nextPaint()` ([witness](checks/witness-mutations.txt)).
  - A probe of `nextPaint()`'s two callbacks in Chromium, Firefox and WebKit ([frames](checks/frames.txt)).
  - `verify` on the head, read from CI ([CI](checks/ci.txt)), with its screenshots artifact.
- **Not read:**
  - Why Chromium's raster depends on the order, which the entry leaves open.
  - The radio's focused timing, which is #347.
  - Touch and pen input: no visual row uses them.

## `nextPaint()`

**A painted frame, not a delay, in Chromium. The visual project runs only there.**

- **What it is:** two `requestAnimationFrame` callbacks in sequence. The second is requested from inside the first, so it runs in the next rendering update.
- **The two callbacks are two rendering updates** in every sample, 20 of 20 in each of Chromium, Firefox and WebKit ([frames](checks/frames.txt)). The gap between them is about 16 ms, with some longer.
  - Firefox's timestamp is its refresh tick's own time. In 5 samples the first callback's timestamp precedes the call, which was made late in the previous tick. The gap is still positive.
- **Why that is a paint:** HTML's event loop runs a rendering update's animation-frame callbacks before its style, layout and paint steps. So when the second callback runs, the update that ran the first one has painted, and the fixture was appended before that update. The input is sent after the second callback, so it lands on a painted fixture whatever its round trip takes.
- **The witness reads it** ([witness](checks/witness-mutations.txt), `head`): under the new steps the focused button's fixture is `2e63a491` in 10 of 10, with 82 and 254 at the apex. Under the old steps it is `a077a846` in 10 of 10. The other rows' hashes equal the implementer's.
- **Is two frames right?** The guarantee needs two, and the doc comment says why. One frame also orders the paint first in practice (`one-frame`, below), because the same update paints right after its callbacks. That relies on the input not being processed inside that update, which holds but which the comment doesn't need to argue. Two frames cost about 16 ms per row.
- **In Firefox and WebKit,** no visual row runs, so no row there depends on this. The two-update reading holds there as well, should a later row in another engine use the helper.

## The rows

**All eight have it, and no other row applies input** ([input](checks/input-rows.txt)).

- **The eight rows:** button, checkbox and radio hovered and focused, and slider held and focused. Each awaits `nextPaint()` after its fixture settles and before `userEvent.hover`, `userEvent.tab` or `commands.pointerPress`.
- **The slider rows** now await `whenFontsReady()` first, and the held row reads `getBoundingClientRect()` after the paint, as the implementer says.
- **The other visual files** have no input:
  - `card`'s and `button-group`'s rows set attributes.
  - The top app bar's scrolled row calls `scrollTo` from script after `createBar()` has awaited a frame, and waits for `:state(scrolled)`. A script scroll isn't the input that `RF-159` names, and the row hasn't failed.
- **No comparator setting changes:** the diff touches no file under `.scripts/`, `.github/` or any `vitest.config.ts`. No image is committed.

## Mutations

Each replaces `nextPaint()`'s body and reruns the implementer's witness probe in Chromium ([witness](checks/witness-mutations.txt)). Only the probe's _new_ steps call the helper, so each mutation shows in _new_ only.

| Id | `nextPaint()` | `button-focused`, new | Result |
| --- | --- | --- | --- |
| `head` | two frames | `2e63a491` x10 | the paint-first image |
| `no-wait` | empty | `a077a846` x10 | **Killed:** the old image |
| `one-frame` | one frame | `2e63a491` x10 | Survives, **equivalent** in Chromium: the update that runs the callback paints before the input arrives |
| `timeout-0` | `setTimeout(0)` | `a077a846` x10 | **Killed:** the timer task runs before the update paints |
| `timeout-50` | `setTimeout(50)` | `2e63a491` x10 | Survives locally. Fifty milliseconds exceeds a frame here, so the order is the paint-first one by timing, not by a guarantee |

- **What the witness can tell:** a wait that does nothing, and a short delay, are seen. A delay long enough on this machine isn't distinguishable from a paint wait by any screenshot. That is the ruling's reason for rejecting a timeout, and the code is what holds it: `nextPaint()` waits for frames.
- **The other seven rows** give the same hashes under every mutation, except the radio's focused fixture. That splits 9 to 1 between `711b664f` and `3377e0b9` in some readings, under both orders and both waits. That is #347.
- **The engines:** this property's mechanism is paint order, and only the visual project, in Chromium only, observes it. So the mutations ran in Chromium. The frames probe covers the other two engines.

## CI

`verify` run [46068228537](https://github.com/ausginer/material-x/actions/runs/46068228537), `pull_request`, on `1edc36b2715309c806099c17959fabbcffc93dd6`: **failure**, from the `chromium` job only, as expected ([reading](checks/ci.txt)).

- **`chromium`** (Intel Xeon 6975P-C): 1 file failed and 192 passed; 1 row failed, 5572 passed, 2 expected failures and 12 skipped.
  - The one failure is _"should match the keyboard-focused button"_: 1 pixel differs, then _"Matcher did not succeed in time"_.
  - The other seven input rows pass against their current baselines.
- **The images, from the `screenshots` artifact:**
  - The reference is the committed `button-focused-chromium-linux.png` (sha256 `c4689afd…`).
  - The actual and the diff are byte-identical to #336's failing actual and diff in [`ci-images/`](../../visual-paint-first-1/checks/ci-images/) (`f29c965a…` and `8a4050e5…`).
  - So the row now draws the image that the four failing runs drew. Under the old steps, that image was drawn intermittently. On this processor family, #336's reading has passes.
- **`firefox` and `webkit`** pass. Their projects have no visual rows, and the eight changed files are visual only.
- **What remains for the CI witness:**
  1. The owner adds `record-baselines`, and the recording run proposes `button-focused.png`.
  2. The proposal names any other image it changes. By this run, none is expected.
  3. The owner reviews and merges it into the branch.
  4. The `chromium` job then passes on the new head, and in one rerun of it, as `RF-159`'s witness says.

## The status and the description

- **`RF-159`'s status:** _"Tier B, **open**, **ready**, pre-existing. … **Implemented** by #346, whose baselines are re-recorded on it through `RD-13`'s workflow."_
  - **Under `RD-68`:** that rule is for decisions, and the entry follows its form. _"**Implemented** by #N"_ is added in a commit after the pull request opened (`1edc36b27`, `[noci]`), and it names no branch and no merge.
  - **The register's practice for a finding** is that the implementing branch closes the entry _"at its merge"_. `RF-153` to `RF-156` on `main` read _"**closed** … by #N … at its merge (the last note). Before closure: open, ready."_ `RF-159` still says _"open"_, so that closure is still owed before the merge. It fits after the CI witness. No rule makes it a defect today, so it is listed under the queue, not as a finding.
- **The title**, _"material-x: visual rows paint their fixture before applying input (RF-159)"_, matches.
- **The description** has `Closes #336`, no session link and no bare `@name`. Its change and witness bullets match. `reviewer-1` is the exception.

## Findings

| Id | Tier | Blocks | Owner | Claim |
| --- | --- | --- | --- | --- |
| reviewer-1 | C | no | implementer | The description says that each of the other seven rows _"gives the same image under the old steps and the new ones"_. The radio's focused fixture gives no single image under either order. |

### reviewer-1 — the description's baseline bullet overstates the radio

- **Observed:** under _Expected not to change_, the description says of the other seven rows: _"Locally, each gives the same image under the old steps and the new ones"_.
- **The implementer's own reading** says _"The other six rows give the same image under old and new"_. It records the radio's focused fixture as 9 to 1 under both orders, and my head run reads it that way too.
- **The description's next bullet** discloses the radio's behaviour, so the two bullets disagree rather than hide it.
- **Tier:** C. It changes no behaviour and no instrument. It is what the owner reads before reviewing the recording.
- **Required property:** the baseline bullet states what the reading shows for each of the seven rows.

## Observations

- **`one-frame` and `timeout-50` survive.** The first is equivalent by the event loop. The second shows what a screenshot witness can't do. Neither is a defect in the unit.
- **The top app bar's scrolled row** changes state by script, not by input, and already awaits a frame before it scrolls. If a later rule in `test-architecture.md` is worded as _"input"_, it doesn't cover this row, and nothing suggests it needs to.
- **The CI change is deterministic in one run:** on an Intel Xeon 6975P-C, the head draws #336's failing image. Before, that family both passed and failed.

## Queue

- **#336** closes with #346.
- **#347** is outside this unit.
- **No open issue's description stops holding because of this record.**
- **Owed before the merge:**
  - the recording, the owner's review and the CI witness above;
  - `RF-159`'s status closed as the register's merged entries close, by the implementer;
  - `reviewer-1`.