# Report: the open repository findings and the docs workflow, first unit

**Handoff:** [`findings-1-handoff.md`](findings-1-handoff.md), with the architect's amendments of 2026-11-16 to items 4, 5 and 7. **Input:** `18b79a407` on `repo/findings-1`. **Pull request:** [#29](https://github.com/ausginer/material-x/pull/29), not a draft. **Governing records:** `repo:RD-14`, `RF-23`, `RF-30`, `RF-33` to `RF-37` and `RF-39` in [`../00-index.md`](../00-index.md), and box-quad's [contract](../../packages/box-quad/.plan/contract/00-index.md).

**State: items 1, 2, 4, 5 and 6 done; item 3 stopped (`RF-36`); item 7 implemented, with its Safari keyboard rows stopped under `RD-8` property 5.** `verify` fails at the head only in Safari, on the 9 keyboard-focus rows that `RD-12` property 10's Tab preference was to reach: the preference reads back as set and Safari's Tab still doesn't reach a button. The owner decides ([§7](#7-rf-35-and-rf-39-the-focus-state-layer-and-the-focus-indicator)). The recording proposed no baseline.

| Item | Finding | Outcome |
| --- | --- | --- |
| 1 | `RD-14` | Done. actionlint wasn't run |
| 2 | `RF-23`, `RF-30` | Done |
| 3 | `RF-36` | **Stopped:** no slow landing caught in 75 landings; the skips stay |
| 4 | `RF-33` | Done: `focus()` forwards to the native control |
| 5 | `RF-34` | Done: the row asserts 1e-4 plus Firefox's derived bound |
| 6 | `RF-37` | Done: the repository's cache directory caused it |
| 7 | `RF-35`, `RF-39` | Implemented; spec rows pass in Chromium and Firefox. **Stopped in Safari:** Tab doesn't reach the controls. No baseline changed |

## Commits

| Commit | Content |
| --- | --- |
| `4768f9ce4` | Item 1: `docs.yml`, the shared `_package-builds` recipe; item 2: `RF-23`'s comment and `RF-30`'s sentence |
| `7d53bd6f9`, `79411463a` | **Scratch probes, removed in `344f4b76a`:** Safari's landing timings, Firefox's focus delegation, client-rect quantization, autofocus |
| `8bc863d88` | Item 6: Vite's cache directory |
| `fa464af52` | Item 4: the `focus()` forward, the markings removed, the new rows |
| `fba999fd8` | Item 5: the row's derived bound and tolerance |
| `a0a34315f` | Item 7: the focus layer and the shadow-tree focus trigger |
| `599c59ba9` | Item 5: box-quad's support-matrix row |
| `13ce7b2a2`, `0d7501276`, `e28900043`, `903077257`, `b70c6bb35` | The architect's rulings, merged |
| `344f4b76a` | The scratch probes removed |
| `c34cb01d7` | Readings under `checks/` |
| `0ebc8d72d` | Item 7: each keyboard-focus row asserts that Tab reached the native control |
| `bba157cf3`, `6818dc8aa` | **Scratch, removed in this report's commit:** the Tab preference readings in the `safari` job and their probe row |
| this report's commit | This report |

## 1. The docs workflow (`RD-14`)

**Reproduced.** On a fresh clone of `275ad0f5c` after `npm ci`, `npx just docs-build` exits 1 with _Rolldown failed to resolve import "@ydinjs/box-quad"_ from `packages/drag/src/draggable.stories.tsx` ([`checks/docs-build-fresh-clone-before.txt`](checks/docs-build-fresh-clone-before.txt)).

**The recipe** (`RD-14` property 4).

- `Justfile:88`–`:97`: a private recipe `_package-builds` builds every workspace package that the tests, the stories or the Vite configuration import by name. `_test-builds` now depends on it and adds material-x's `build:prepare`.
- `Justfile:29`–`:32`: `docs-build` depends on `_package-builds`.
- **Why a shared recipe and not an nx dependency:** Storybook collects every package's stories, and drag's stories import box-quad, which isn't one of material-x's dependencies. An nx `dependsOn` on material-x's `docs:build` would have to name drag's dependencies from material-x, or add a dependency edge between packages that don't depend on each other. The tests already needed exactly this set built, so the set lives in one recipe that both use.
- No package's exports or build output change.
- **Fresh clone of `4768f9ce4`:** `docs-build` exits 0, and `.docs/` holds Storybook and `api/` ([`checks/docs-build-fresh-clone-after.txt`](checks/docs-build-fresh-clone-after.txt)).

**The workflow** (`.github/workflows/docs.yml`, `RD-14` properties 1 to 3).

- Triggers: a push to `main`; a `pull_request` of type `opened`, `reopened`, `synchronize` or `ready_for_review`; and `workflow_dispatch`. `build` skips a draft.
- Concurrency: a pull request's runs share `docs-<number>` and a newer one cancels the older one. Every other run's group is its run id, so it cancels nothing.
- `build` has `contents: read`, runs `npm ci` and `npx just docs-build`, and uploads `.docs` with `upload-pages-artifact`.
- `deploy` needs `build`, runs only for `refs/heads/main` on a push or a manual run, holds `pages: write` and `id-token: write`, uses `github-pages`, and has job concurrency `pages` with `cancel-in-progress: false` and `queue: max`, so a deployment waits rather than being cancelled. GitHub's concurrency documentation: _"`max`: Up to 100 jobs or workflow runs can be pending in the concurrency group."_ Without `queue: max`, a pending deployment is cancelled by a newer one.
- `ubuntu-24.04`, and `NODE_VERSION: 26`, which `verify.yml` names.
- Pins: `checkout` and `setup-node` at `verify.yml`'s hashes; `upload-pages-artifact` v5.0.0 (`fc324d35…`), `configure-pages` v6.0.0 (`45bfe019…`) and `deploy-pages` v5.0.1 (`368f8252…`), each the commit of its latest release tag, named in a comment.

**On #29:** run [43875177531](https://github.com/ausginer/material-x/actions/runs/43875177531): `build` passed, `deploy` was skipped, and the artifact holds Storybook's `index.html` and `iframe.html` and the API's `api/index.html`, `api/core/` and `api/material-x/`, 277 entries ([`checks/docs-pull-request-run.txt`](checks/docs-pull-request-run.txt)).

**The `github-pages` environment** ([`checks/pages-environment-policy.txt`](checks/pages-environment-policy.txt)): custom branch policies are on and protected branches off, and the only policy is the branch `main`. Not changed.

**Not done: actionlint.** No container runtime is available in the devcontainer, and downloading actionlint's release binary into it was refused by the session's permission policy. `docs.yml` hasn't been checked by actionlint. The workflow ran on #29 as described above.

## 2. `RF-23` and `RF-30`

- **`RF-23`,** `Justfile:46`–`:53`: the comment says that the root configuration contributes every project the per-package configurations do, for the engines in `MX_TEST_ENGINES` and with visual only under `MX_TEST_VISUAL=1`, and `repo`. It states no count.
- **`RF-30`,** `.scripts/vitest-one-shot.ts:109`–`:111`: the refusal now ends _"A --sequence.groupOrder flag on the command line gives every project that same value; other --sequence.\* flags merge into each project's sequence and leave its groupOrder alone."_ No node test covers the refusal, so it was run against Vitest 5.1.0 with two browser projects ([`checks/rf30-one-shot-refusal.txt`](checks/rf30-one-shot-refusal.txt)): `--sequence.groupOrder=3` is refused with the new sentence, and `--sequence.shuffle` and `--sequence.seed=7` run 70 tests and pass.

**For the architect:** `RF-23` and `RF-30` meet their required properties.

## 3. `RF-36`: the Safari top-layer wait

**Stopped under the item's second stop:** no attempt caught a slow landing, and the timings don't explain the two failures. Both Safari skips stay, with their `RF-36` citations, and the fixed waits are unchanged.

**The probe** (scratch, `packages/core/tests/traits/rf36-probe.browser.test.ts`, added in `7d53bd6f9` and removed in `344f4b76a`) repeated both rows' gesture 15 times per job: the list's sole item, pressed, moved 90 px and released, with no reorder listener and the rows' own `{ duration: 200 }` timing. It recorded, from the gesture's start, the host's `pointerup`, the return of `ue.pointer`, the visual's `animate()` and its `finished`, the item's `toggle` to open and to closed, the start of the wait, and when `:popover-open` cleared. It also recorded `document.visibilityState`, `document.hasFocus()` and the interval between two animation frames, before and after. Its wait was 5,000 ms, so a slow landing would be timed rather than fail.

**Readings,** in the `safari` job on `macos-26` ([attempt 1](checks/rf36-safari-timings-attempt-1.txt), [2](checks/rf36-safari-timings-attempt-2.txt), [3](checks/rf36-safari-timings-attempt-3.txt), [4](checks/rf36-safari-timings-attempt-4.txt), [5](checks/rf36-safari-timings-attempt-5.txt)):

- 75 landings in Safari. **The visual left the top layer 216 to 256 ms after the gesture started, in every one.** `pointerup` reached the host 1 to 17 ms in, and `ue.pointer` returned 0 to 2 ms after it. The animation started with `pointerup` and finished 214 to 251 ms in; `toggle` to closed and the cleared `:popover-open` followed within 9 ms.
- The window was visible and focused before and after every landing. The frame interval was 14 to 19 ms, except one reading of 40 ms after a landing that had already finished at 222 ms (attempt 4, run 6).
- Chromium, the same probe, once per run: 217 to 238 ms.
- Against the rows' 1,000 ms wait, every landing left at least 744 ms. The two recorded failures waited 1,026 and 1,015 ms.

**What the readings rule out, for this probe's conditions:** a release that arrives after `ue.pointer` returns, an unfocused or hidden window, throttled frames, and a late `animation.finished`. **What they don't reach:** the failures happened in the full core project's run, after other files in the same Safari session, once in about six runs each. The probe ran in the same project and the same job, but its 15 landings per job didn't reproduce the condition. The cause is still not established.

**Attempt 5:** its first rerun was never acquired by a hosted macOS runner (_"The job was not acquired by Runner of type hosted even after multiple attempts"_, with GitHub's notice of macOS arm64 capacity constraints) and was cancelled. Its retry, job 133356649810, ran.

**For the architect:** `RF-36` stays open with both skips. The probe's readings are the record's. A next reading would need the failing condition itself, for example the two rows unskipped with the same timestamps logged, across several full Safari runs.

## 4. `RF-33`: focus delegation in Firefox

**The cause, by elimination** ([`checks/rf33-elimination-ci.txt`](checks/rf33-elimination-ci.txt), run [43872551455](https://github.com/ausginer/material-x/actions/runs/43872551455)): a host whose shadow root delegates focus keeps delegating in Firefox with `attachInternals()`, with `formAssociated`, and with `mx-button`'s template and slots. Adopting `mx-button`'s stylesheets stops it. A local bisection put it on one declaration, `:host { display: contents }` (`button/styles/default/main.styles.css:51`). Chromium delegates in every variant.

**The smallest reproduction, for Mozilla** (the owner's to file):

```html
<!doctype html>
<script>
  customElements.define(
    'x-host',
    class extends HTMLElement {
      constructor() {
        super();
        const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
        root.innerHTML =
          '<style>:host { display: contents }</style><button>inner</button>';
      }
    },
  );
</script>
<x-host></x-host>
<script>
  const host = document.querySelector('x-host');
  host.focus();
  // Chromium and Safari: the inner button. Firefox 159: <body>.
  console.log(document.activeElement, host.shadowRoot.activeElement);
</script>
```

- Expected, per HTML's _focusing steps_ and _get the focusable area_: a shadow host whose shadow root delegates focus focuses its focus delegate. Neither step requires the host to have a box.
- In CI: Firefox 159.0 doesn't delegate with `display: contents`, and does without the rule and with `display: inline`. Chromium and Safari delegate in all three.
- `autofocus` on such a host, in a fresh top-level document: Firefox leaves focus on `<body>`, and Chromium and Safari focus the inner button. With `display: inline`, every engine focuses the inner button.

**The repair** (the architect's ruling in `RF-33`).

- `packages/material-x/src/core/utils/useCore.ts:17`–`:28`: `forwardFocus(host, control)` sets `host.focus` to `(options) => control.focus(options)`. Same signature as `HTMLElement.prototype.focus`; options pass through; no engine detection. Its comment says what it works around, cites `RF-33`, and says it can go once Firefox delegates through such a host.
- Called once in each shared core: `button/ButtonCore.ts:114` (`mx-button`, `mx-icon-button`, `mx-link-button`, `mx-switch-button`, `mx-switch-icon-button`) and `list/ListInteractiveItemCore.ts:56` (`mx-list-button-item`, `mx-list-link-item`). These are every material-x element whose host is `display: contents` and whose shadow root delegates focus: FAB, the split button and the plain list item are `display: contents` without delegating focus, and checkbox, radio and the text field delegate focus without `display: contents`.
- **The target is delegation's:** in Chromium and Safari, `HTMLElement.prototype.focus` and the forward focus the same element for all seven ([`checks/rf33-repair-readings-run-1.txt`](checks/rf33-repair-readings-run-1.txt), `RF33F`). A control that can't be focused keeps focus where it was, as delegation does.
- `delegatesFocus: true` stays on every shadow root. No public export, type, attribute or event changes: `core/` isn't in material-x's `exports` or `files`, so `forwardFocus` isn't published, and the components' classes declare no new member, because `focus` is assigned per instance.
- **No size instrument covers material-x:** the root `size` recipe measures box-quad, core and drag only.

**Rows.**

- The four `it.fails` markings and their `RF-33` comments are removed (`button/button.browser.test.ts`, `button-group/button-group.browser.test.ts`).
- New rows that `focus()` on the host focuses its control: `mx-link-button` (`button.browser.test.ts`), `mx-switch-button` and `mx-switch-icon-button` (`SwitchCore.browser.test.ts`), `mx-list-button-item` and `mx-list-link-item` (new `tests/list/list-item.browser.test.ts`).
- **The row that watches Firefox:** `mx-button` › _should delegate focus to the native button through the shadow root alone_ calls `HTMLElement.prototype.focus.call(host)`, marked `it.fails` in Firefox with a comment citing `RF-33`.
- **Three runs of the `firefox` job** ([`checks/firefox-three-runs.txt`](checks/firefox-three-runs.txt)): [43886020747](https://github.com/ausginer/material-x/actions/runs/43886020747) and its rerun at `c34cb01d7`, and [43889993969](https://github.com/ausginer/material-x/actions/runs/43889993969) at `bba157cf3`. Each succeeded with one expected failure, the watching row. Chromium and Safari pass these rows in each of those runs.

**Tab and autofocus**, read in each engine for the architect ([`checks/rf33-repair-readings-run-1.txt`](checks/rf33-repair-readings-run-1.txt)):

- **Tab** from the page focuses `mx-button`'s native button in Chromium and Firefox. **In Safari, Tab leaves focus on `<body>`.** Safari's default keyboard navigation doesn't Tab to buttons, so this is read as Safari's preference, not as delegation; it wasn't changed in the runner.
- **autofocus on an `mx-*` host** couldn't be observed in the test page: a plain `<button autofocus>` added there doesn't focus either, in any engine, because the page has already used its one autofocus. Safari focused `mx-button`'s control in one such row, which the control row doesn't explain. The fresh-document readings above are the evidence: Firefox doesn't autofocus a `display: contents` host, and the forward doesn't cover autofocus, which doesn't call `focus()`.

**For the architect:** `RF-33`'s required property holds in Firefox through the forward. What stays open is the architect's: Firefox's own delegation (the watching row) and autofocus on these hosts in Firefox.

## 5. `RF-34`: box-quad's precision in Firefox

**The reading** ([`checks/rf34-rects-run-1.txt`](checks/rf34-rects-run-1.txt), [`checks/rf34-quantum-per-engine.txt`](checks/rf34-quantum-per-engine.txt), runs [43872551455](https://github.com/ausginer/material-x/actions/runs/43872551455) and [43875177436](https://github.com/ausginer/material-x/actions/runs/43875177436)), from the row's own fixture:

| Engine | `getClientRects()[0]` = `getBoundingClientRect()` | q | r | Width error | Height error |
| --- | --- | --- | --- | --- | --- |
| Firefox 159.0 | right 25.98333740234375, bottom 27.98333740234375 | 1/60 px | 2^-14 px | +0.00764 | −0.00985 |
| Chromium | right 25.980762481689453, bottom 27.990381240844727 | none | — | −3.1e-5 | +3.4e-6 |
| Safari | as Chromium | none | — | +2.0e-6 | −2.2e-7 |

An edge counts as quantized at q when it equals a multiple of q rounded to a multiple of r. The first reading's test, _a multiple of 1/60 to within 1e-9_, was too narrow, and I raised it; the architect ruled the cause confirmed (`RF-34`).

**The bound,** derived next to the fixture (`packages/box-quad/tests/coordinates.browser.test.ts:206`–`:235`) from the recovery's own formula (`src/index.ts:373`–`:374`): w = (W|d| − H|c|)/det and h = (H|a| − W|b|)/det. An edge rounding of ±(q/2 + r/2) moves W and H by at most e = q + r, so w by at most e(|c| + |d|)/det and h by at most e(|a| + |b|)/det. For `rotate(30deg) scale(1.5)`, det = 1.125 and both are 1.821 e = **0.03047 px**, above the observed 0.0076 and 0.0098.

**The row** (`:246`–`:268`): it asserts 1e-4 in Chromium and Safari and 1e-4 plus that bound in Firefox; the `it.fails` marking is removed. **Its title changed** from _"…to within a ten-thousandth"_ to _"…to within the engine precision"_, because the old title no longer states what it asserts. `RF-34`'s entry and the CI unit's report name the old title.

**The contract:** box-quad's `contract/04-support-matrix.md` §2.3 gains the row _Recovered size of a transformed box_, naming each engine's q and r and the reading.

The row passes in the same three `firefox` runs, and in Chromium and Safari, with every other box-quad row unchanged ([`checks/firefox-three-runs.txt`](checks/firefox-three-runs.txt)).

**For the architect:** `RF-34`'s required property holds: box-quad states the precision per engine, and the row asserts it in each.

## 6. `RF-37`: the Vite warning

**Its source** ([`checks/rf37-warning-source.txt`](checks/rf37-warning-source.txt)):

- `@vitest/browser` 5.1.0 puts the module runner into the browser's dependency pre-bundle itself: `node_modules/@vitest/browser/dist/index.js:3787`–`:3795` includes `"vitest > vite/module-runner"`.
- Vite 8.3.8 warns about a dynamic import it can't analyze only when the importer isn't in `node_modules` (`node_modules/vite/dist/node/chunks/node.js:26692`–`:26693`).
- The repository's `cacheDir: '.vite'` (`.scripts/vite-config.ts`, since `e842821ea`, with no stated reason) put the pre-bundle at `packages/<name>/.vite/vitest/<hash>/deps/`, outside `node_modules`.
- So **the repository's configuration causes it.** Upstream, [vitest-dev/vitest#11293](https://github.com/vitest-dev/vitest/issues/11293) reports the same warning and was closed on 2026-10-02 with a comment _"Fixed: 5.0.3"_.

**The change:** `cacheDir: '.vite'` is removed, so Vite uses its default `node_modules/.vite`. The pre-bundle keeps the same 19 entries, each from the same source file. Only its directory moved ([`checks/rf37-warning-source.txt`](checks/rf37-warning-source.txt), metadata before and after).

**Readings** ([`checks/rf37-ci-warning-counts.txt`](checks/rf37-ci-warning-counts.txt)): a local Chromium run and a local Firefox run printed it before, and a local Chromium run prints nothing after. In CI, run 43872551455 printed it 8 times in `chromium`, 7 in `firefox` and 6 in `safari`; run 43875177436, after the change, 0 in each.

**Left in place:** `.gitignore`'s `/.vite` and `/packages/*/.vite` lines, and `package-files.ts`'s `-e .vite`, now cover a directory that no new run writes. Existing checkouts keep their old `.vite` directories until cleaned.

**For the architect:** `RF-37`'s required property holds: a browser run starts without the warning.

## 7. `RF-35` and `RF-39`: the focus state layer and the focus indicator

The owner answered yes. The architect ruled (b), focus over hover through variables of its own, and then (iii), one shadow-tree trigger for radio and checkbox, registering `RF-39`.

**The values** come from each component's own token selection, as the pressed state layer already does (`specialTokens`):

- `mx-button`: `button/styles/default/tokens.ts:29`–`:30` maps `focus-layer.opacity` and `focus-layer.color` to `md.comp.button.focused.state-layer.*` in the default state, so they are set whatever state the host is in. Each colour variant maps its own focused colour: `elevated/tokens.ts:29`, `outlined/tokens.ts:30`, `text/tokens.ts:20`, `tonal/tokens.ts:29`–`:30` (tonal also overrides opacity, as it does for the pressed layer). `icon/tokens.ts:105` does the same for `mx-icon-button`, because the button's focus rule is in the default sheet that every button adopts; without it, an icon button would draw the button's colour.
- `mx-radio` and `mx-checkbox`: `radio/styles/default/tokens.ts:32`–`:39` and `checkbox/styles/default/tokens.ts:47`–`:54` map them per selection state, to `unselected.focus.state-layer.*` and `selected.focus.state-layer.*`. The compiled sheets set them on `:host` and on `:host(:state(checked))`; the checkbox also on `:state(indeterminate)`.
- The existing `--_state-layer-*` and `--_ripple-*` variables are untouched, so hover, press and mouse focus render as before. Checkbox's `error.*` tokens aren't selected by its package and get no focus layer.
- No change to tproc's processing.

**The layer,** on the ripple's `::before`:

- `button/styles/default/main.styles.css:104`–`:114`: `:host .host:focus-visible > .ripple::before`, with `opacity: var(--_focus-layer-opacity, 0)`, so a button whose tokens define none draws nothing.
- `radio/styles/default/main.styles.css:54`–`:64` and `checkbox/styles/default/main.styles.css:63`–`:73`: `:host .input:focus-visible ~ .ripple::before`. The ripple is a later sibling of the input in both shadow roots.
- Each selector is more specific than the ripple's `:host(:hover) .ripple::before`, so the focus layer shows over hover. The press wave is the ripple's `::after` and is untouched. A disabled host can't take keyboard focus, and the ripple's `:host([disabled])` rule hides it.

**`RF-39`, the indicator in Firefox:** Firefox 159.0 doesn't match `:host:has(.input:focus-visible)`, so neither radio's nor checkbox's keyboard focus outline showed there.

- Radio: `.input:focus-visible ~ .off` (`radio/styles/default/main.styles.css:66`).
- Checkbox: the outline moves from the host to a new `<span class="indicator" aria-hidden="true">` after the input (`checkbox/checkbox.tpl.html:2`), with no `part`, stretched over the host's grid cell with the host's radius (`checkbox/styles/default/main.styles.css:75`–`:86`).
- In Chromium, the box, outline and radius are unchanged: checkbox 40 × 40 at the same position, 3px solid, offset 2px, radius 20px, on the host before and on `.indicator` after; radio 20 × 20, 3px, 2px, 10px on `.off` before and after. Firefox now draws both ([`checks/rf39-indicator-before-after.txt`](checks/rf39-indicator-before-after.txt), local).

**Spec-contract rows,** new file `packages/material-x/tests/core/focus-layer.spec.browser.test.ts`, for each of the three components. Expectations come from each package's `focused` or `unselected.focus` state and its `hovered` or `unselected.hover` state through the bridge, not from the `focus-layer.*` mapping, and the observation is the ripple's `::before` computed colour and opacity, read after the shadow root's transitions finish:

- keyboard focus (Tab) shows the focused colour and opacity;
- keyboard focus with hover shows the same;
- hover alone shows the hovered values;
- after a mouse click with the pointer moved off, opacity 0;
- `RF-39`'s rows: keyboard focus draws the indicator, and a mouse click doesn't.

Locally, 18 of 18 pass in three Firefox runs and two Chromium runs. Renaming every focus-layer and indicator selector so it matches nothing fails the 8 rows that depend on them ([`checks/rf35-focus-layer-mutation.txt`](checks/rf35-focus-layer-mutation.txt)).

**Baselines: none changed.** The labeled recording on #29, [43886019999](https://github.com/ausginer/material-x/actions/runs/43886019999), recorded `c34cb01d7`. visual/material-x with `--update` passed 19 of 19, `files.txt` was empty, `propose` took the _nothing changed_ path, and `unlabel` removed the label. There is no proposal for the owner ([`checks/rf35-labeled-recording.txt`](checks/rf35-labeled-recording.txt)).

- **Why:** Vitest's screenshot comparator is pixelmatch with `threshold: 0.1` per pixel and no mismatched pixels allowed (`node_modules/@vitest/browser/dist/index.js:1617`–`:1635`, @vitest/browser 5.1.0), and the repository sets no comparator options. `--update` rewrites only a baseline whose comparison fails. At the tokens' 0.1 opacity over the fixtures' light surface, the focus layer stays under that threshold, so `button-focused`, `radio-focused` and `checkbox-focused` still match.
- **So the gate's `chromium` job matches every baseline** at each head since `a0a34315f`, but **the focused baselines can't see the focus layer.** The spec rows are what cover it. Whether the visual layer should see a 10% layer is a decision on the comparator, which I didn't change.

**Tab in Safari: stopped under `RD-8` property 5** (the architect's ruling (a) on `RD-12` property 10, and its stop clause).

- `verify` [43886020747](https://github.com/ausginer/material-x/actions/runs/43886020747) at `c34cb01d7`: 9 rows failed in `spec/material-x/safari`. They were the keyboard-focus, keyboard-focus-with-hover and indicator rows for the three components. Every other Safari row passed.
- `0ebc8d72d` makes each keyboard-focus row first assert that `document.activeElement` is the host and that its shadow root's `activeElement` is the native control, so a failed reach can't read as a missing layer.
- **Reading 1** ([43889993969](https://github.com/ausginer/material-x/actions/runs/43889993969), [`checks/rd12-tab-reading-1.txt`](checks/rd12-tab-reading-1.txt)): in the `safari` job, as the runner's user, `WebKitTabToLinksPreferenceKey` alone, `com.apple.Safari.ContentPageGroupIdentifier.WebKit2TabsToLinks` alone, and both, written to `com.apple.Safari`. Each read back as 1. A scratch row then pressed Tab once on a page holding one `mx-button`: focus stayed on `<body>` in every configuration, and with neither key.
- **Reading 2** ([43892383154](https://github.com/ausginer/material-x/actions/runs/43892383154), [`checks/rd12-tab-reading-2.txt`](checks/rd12-tab-reading-2.txt)): the same three configurations written to Safari's sandbox container domain (`~/Library/Containers/com.apple.Safari/Data/Library/Preferences/com.apple.Safari`, which exists on the runner) and again to the global domain. Every write read back as set, and Tab stayed on `<body>` in all six.
- So the job can write and read back the preference, and Tab still doesn't reach a button: the ruling's stop. **The 9 rows are neither limited nor disabled**, and `verify` fails on them in Safari until the owner decides. The scratch readings are removed. `verify.yml` is unchanged from the unit's input. Not established: whether Safari under `safaridriver` reads these preferences at all, or whether WebDriver's Tab key goes through the path the preference governs.

**For the architect:** in Chromium and Firefox, `RF-35`'s and `RF-39`'s properties hold through the spec rows. Safari's keyboard rows are the owner's decision (above). The focused baselines don't show the layer.

## 8. `RF-42`: Option-Tab in Safari

The owner chose (a), the handoff's _If the owner answers (a)_.

- **The key:** `tests/core/focus-layer.spec.browser.test.ts` presses Option-Tab (`{Alt>}{Tab}{/Alt}`) in Safari and Tab in Chromium and Firefox. One constant, `TAB`, chooses the key by `server.browser`, and its comment cites `RF-42` (`964af56ab`).
- **The reach assertion is unchanged.** It still runs before the layer or the indicator is read.
- **The reading:** `verify` [44003141576](https://github.com/ausginer/material-x/actions/runs/44003141576) at `964af56ab` passes in every job. In `spec/material-x/safari`, the 9 rows went from failing at the reach assertion to passing (116 of 116). Every other Safari project's counts are identical to run 43895450645's. So the fallback, `it.fails` under `RF-42`, wasn't taken ([`checks/rf42-option-tab-safari.txt`](checks/rf42-option-tab-safari.txt)).

## 9. Item 8: the feature-proof findings

The review's `reviewer-2`, `reviewer-3` and `reviewer-4`, as the handoff disposes of them. `reviewer-1` is `RF-43`'s and isn't in this item. Head `a81841cb0`: `verify` [44008539924](https://github.com/ausginer/material-x/actions/runs/44008539924) passes in every job, and _Publish Docs_ [44008539891](https://github.com/ausginer/material-x/actions/runs/44008539891) builds and skips `deploy` ([`checks/item8-ci.txt`](checks/item8-ci.txt)). The only marking is `RF-33`'s watching row in Firefox. `RF-42` holds none, because it ended in option (a). No baseline changed.

**Step 1, the forward on the prototype chain** (`reviewer-2`, `7c09927f0`), in the per-class form that the owner chose after the trait stopped:

- **The trait stopped.** As a trait (`implementer/item8-step1-trait-wip`, `92e13f9d6`, unpushed), `npx just build-lib` warned seven times that the flattener retained each adopter's composition, because `vite-traits-plugin` normalizes only descriptor traits. That gap is `RF-44`'s.
- **The form:** `forwardFocus(host, control)` records the control in a module `WeakMap` (`core/utils/useCore.ts`), and `focusControl(host, options)` focuses it. The seven classes (`Button`, `IconButton`, `LinkButton`, `SwitchButton`, `SwitchIconButton`, `ListButtonItem`, `ListLinkItem`) each declare `override focus(options?: FocusOptions)`, which only calls `focusControl`.
- **Unchanged:** the forward's comment, its target from `useButtonCore` and `useInteractiveListItemCore`, and `delegatesFocus: true`. No other member or type changes.
- **Rows:** `tests/core/utils/useCore.browser.test.ts` has 9 rows, passing in every engine:
  - `Object.hasOwn(host, 'focus')` is false and the class prototype declares `focus`, for each of the seven;
  - a subclass of `mx-button`'s class and one of `mx-list-button-item`'s, each with its own `focus()` that counts calls and calls `super.focus()`: one call, no own property, and the control has focus.

  The watching row is unchanged and still fails as expected in Firefox.

- **The build** prints no flattener warning.
- **Size:** the `measurements` job has no material-x row or budget, so no budget covers these entries. A local reading of each entry, bundled and minified, at `a941ed888` and at `7c09927f0`: +63 minified bytes, +2 to +23 brotli and +17 to +26 gzip per entry ([`checks/item8-step1-size.txt`](checks/item8-step1-size.txt)).

**Step 2, a disabled host** (`reviewer-4`, `a941ed888`): `button.browser.test.ts` and `list-item.browser.test.ts` each gain a row that focuses an `<input>`, then calls `focus()` on a disabled `mx-button` or `mx-list-button-item`. `document.activeElement` stays on the input in Chromium, Firefox and Safari, so there's no stop.

**Step 3, the focus-layer mappings** (`reviewer-3`, `a941ed888`): 10 _keyboard focus_ rows in `focus-layer.spec.browser.test.ts`, each asserting the reach first, and pressing Option-Tab in Safari:

- `mx-button` `elevated`, `outlined`, `text` and `tonal`, against `button.color.*`'s `focused` state;
- `mx-icon-button` filled (the default, with no attribute), `tonal` and `standard`, against icon-button's own colour packages, now registered in the bridge as `icon-button.color.*`. Those are the colours whose packages declare a focus-layer variable. An icon button's `outlined` and `elevated` take the button's packages, which the `mx-button` rows read;
- `mx-checkbox` checked and indeterminate, and `mx-radio` checked, against `selected.focus`.

No mapping stands without a row. All 28 rows pass in each engine.

**The mutation reading** (local Chromium, [`checks/item8-focus-layer-mutation.txt`](checks/item8-focus-layer-mutation.txt)):

- With every focus-layer mapping dropped, all 10 new rows fail.
- With only each row's own mapping dropped, 9 fail. **`mx-icon-button` filled** passes. tproc deduplicates its mapping into the button default's, because its focused colour equals the default's. As ruled, the row stands, and the default's mapping is what the mutation must drop. It is the only such row.

## Checks for every item

- **Format, lint, typecheck:** every changed `.ts`, `.css` and `.html` file went through `fmt`, `lint-fix`, `fmt` and `lint` from its package, or through the repository-level tools for `.scripts/` and `Justfile`; lint reported nothing. `just typecheck` passes in material-x, box-quad and drag, and `tsc -p tsconfig.json` passes for `.scripts/`. The workflow files were formatted by `oxfmt`, and no linter is configured for them (actionlint: see §1). The Markdown files were formatted by `oxfmt`, their links checked by a scratch script, and `git diff --check` is clean.
- **Local runs** (devcontainer, not evidence): material-x's browser and spec projects pass in Chromium (295 rows) and Firefox (294 and the watching row) at `a0a34315f`.
- **`verify` at the head:** listed in the closing message. It fails in Safari on the 9 rows of §7, and only there, until the owner decides.

## Not done

- **Item 3 (`RF-36`):** stopped; the two Safari skips stay.
- **Item 7 in Safari:** stopped under `RD-8` property 5; 9 rows fail there, and `verify` with them.
- **Item 7's baselines:** none changed, so nothing for the owner to review; the focused baselines don't show the focus layer.
- **actionlint** wasn't run on `docs.yml` (§1).
- **The docs deployment** after merge is the coordinator's to read.
- **For the owner:** the Firefox reproduction in §4 is ready to file.

## Next

The architect reads this report, and a feature-proof review follows before the owner merges.