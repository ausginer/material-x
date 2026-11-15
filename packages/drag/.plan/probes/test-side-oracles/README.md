# Probe: the development checks as test-side oracles

Run by the architect on 2026-11-15 at `883836d96`, in Chromium, for `drag:DRD-67`, on the owner's hypothesis that a test-side interceptor for `RectIndex` can replace `__DEV__`. `src` and `tests` were unchanged. The probe's files were scratch files under `packages/drag/tests/`, plus a scratch config, and all of them were removed afterwards.

**What was probed.** No module mocking was used. [`oracles.probe.ts.txt`](oracles.probe.ts.txt) wraps methods on the prototypes of the classes that the modules already export, `RectIndex` and `Gesture`:

- **Equivalence.** `shift` marks an index as pending, and `invalidate` and `retire` clear the mark. `measure` records the `getBox` and sink it was given. `measurePlaceholder` keeps the placeholder's x as the cache held it before the re-read. At the next `collect` with the same collection version, the oracle measures the window and the placeholder with a separate `RectIndex`, compares them with the live index through `at`, `first`, `end` and `count`, and records any mismatch over 1/16 px. It writes nothing to the live index or the DOM.
- **Refusals.** `enter` counts a call that carries a step and an `Event` while another `enter` of the same gesture is on the stack, each event once, trusted and untrusted apart.

[`source.probe.test.ts.txt`](source.probe.test.ts.txt) installs the oracle on `src/sortable/rect-index.ts` and `src/kernel/gesture.ts`. [`build.probe.test.ts.txt`](build.probe.test.ts.txt) installs it on the emitted `sortable/rect-index.js` and `kernel/gesture.js`, which the published build's `y.js` and `session.js` import. Both run the cases in [`cases.probe.ts.txt`](cases.probe.ts.txt). Copy the files back under `packages/drag/tests/` (the config to `packages/drag/vitest.probe.config.ts`) and run:

- source with `__DEV__` false: `npx vitest run -c vitest.probe.config.ts --project shipped tests/zz-spy-src.browser.test.ts`
- source with `__DEV__` true: `PROBE_DEV=1 npx vitest run -c vitest.probe.config.ts --project browser tests/zz-spy-src.browser.test.ts`. That config's `shipped` list was then `[]`, and later revisions of the file differ only in that list.
- the published build: `npx vitest run -c vitest.probe.config.ts --project consumer tests/zz-spy-build.browser.test.ts`

## Results

| Case | Source, `__DEV__` false | Published build (consumer project) | Source, `__DEV__` true |
| --- | --- | --- | --- |
| Plain column, sweep | 10 checks, no mismatch, no disagreement | the same | 0 checks: the development check invalidates first |
| S2's rotate fixture | 10 checks, no mismatch; the sweep still gives `at 95: proposed 1, measured 2` | the same | 0 checks; the sweep gives `[]` |
| Collapsing margins | 12 checks, 10 mismatches at slot 1; `at 203: proposed 2, measured 3` | the same | 0 checks; the drag ends with the development fault |
| `DRD-52`'s placeholder moved along x | 4 checks, 4 mismatches at the placeholder, no fault | the same | 0 checks; 1 development fault |
| Two ordinary drags | refusals 0 and 0 | the same | refusals 0 and 0, and the development counter 0 and 0 |
| A nested synthetic press from `onStart` | 1 untrusted refusal; the development counter reads 0 | the same | 1 untrusted refusal, and the development counter 1 |

## What it shows

- **The oracle sees what the development check sees, at the same moment:** the first resolution after a committed move. It catches both of the development check's failure classes, a slot and the placeholder's x. Because it doesn't change the cache, the rotate fixture's predicted chain survives it (`proposed 1` at 95, as in the build without it).
- **It runs against the published build,** where the development check doesn't exist. The build is unbundled and unminified, and its modules export `RectIndex` and `Gesture`, so the test imports the same module instance that `y.js` and `session.js` import.
- **The refusal oracle counts exactly what the development counter counts** where both exist, and it still counts where the counter is folded away.
- **Under `__DEV__` true the oracle never fires,** because the development check invalidates the index before it collects. The two don't coexist, and they don't need to.