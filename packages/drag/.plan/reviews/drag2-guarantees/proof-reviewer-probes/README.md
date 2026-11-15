# Proof reviewer's probes, at `1c1e93bd9`

Every run used a `git archive` copy of `1c1e93bd9`, made into a throwaway git repository so that the build's `git clean` works, with the checkout's `node_modules` linked in. Chromium only. Each mutation was applied with `git apply`, run, and reverted with `git checkout`. Output was filtered to the `FAIL`, assertion and summary lines.

| Run | Project | Result |
| --- | --- | --- |
| Unmutated: `y-geometry`, `equivalence-check`, `refusals`, `layout-animation` | source and consumer | 34 of 35 pass in each. `layout-animation.browser.test.ts:266` fails in both, with the oracle's `slot 0` |
| `oracle-field.diff`: the oracle names the field and both values, `-t 'consumer animation on transform'` | source | `slot 0 field 0 predicted 0.33359000086784363 fresh 0.666920006275177`. Field 0 is `LEFT` |
| Saved `S2-tie-0.diff` | consumer | `Tests 13 passed (13)` |
| Saved `S2.diff` | source and consumer | `:79` fails on the instrument (`expected [ …(4) ] to deeply equal []`) and on the oracle. `:249` the same. `:220` and `:232` fail `expected [] to not deeply equal []` |
| Saved `S2-3.diff` | source and consumer | `:140` fails only on the oracle's after-test check (`disagreed … at slot 0, …`). No `AssertionError` from the instrument |
| Saved `S6-7.diff` | source | 15 pass. Only `:266` fails, as unmutated |
| Saved `S6-8.diff` | source | 16 of 16 fail. `:166`: `expected [ 1 ] to deeply equal []` |
| `S6-three-guards.diff`: `S6-7.diff` plus the `this.#lastGap === gap` guard removed, without `S6-8`'s added report | source | 15 fail. **`:166` passes** |
| Saved `S7-5.diff` | source | `:330`, `:350` and `:371` fail `expected 160 to be close to 80`. The saved log has `:330` failing `expected +0 to be close to -80` |
| Saved `S10.diff`, `-t transition` | source | `:1261` fails (`18.97… to be close to 80`). `:1274` passes |
| Saved `S10-2.diff`, `-t transition` | source | `:1274` fails with 36 disagreements. `S10-2.diff` and `S2-2.diff` are byte-identical (`cmp`) |
| `realm.browser.test.ts.txt` | source | Passes: a `PointerEvent` made in a same-origin iframe is not `instanceof Event` of the top window |