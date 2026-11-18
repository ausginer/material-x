# Threshold reading on GitHub's runner

`repo:RD-23` property 3. Run [44276375207](https://github.com/ausginer/material-x/actions/runs/44276375207), on 2026-11-18, by the scratch workflow `state-layer-reading.yml` at `e29c54651`. That commit is the unit's input commit `8dc3e78d1` (`bc3609e33` with `origin/main` merged) plus the scratch workflow and a scratch hook that reads the visual project's threshold from `MX_VISUAL_THRESHOLD`. Both are removed by the commit that sets the threshold.

**Method.** One job per threshold and run, 21 jobs, on `ubuntu-24.04` in `RD-9`'s environment. The system packages came through `.github/actions/browser` (`RD-21`). Each job ran `just test --project visual/material-x` with `MX_TEST_VISUAL=1`, with the reporters `default` and `json`. Runs `a` and `b` are the same commit. Run `hover` first replaced `opacity: var(--_ripple-opacity)` in the ripple's `:host(:hover) &::before` rule (`packages/material-x/src/core/animations/ripple/styles/main.styles.css`) with `opacity: 0`. Every button, checkbox and radio draws its hover layer through that rule. Each cell is the row's result, and for a failure, the mismatched-pixel count from the comparator's message. The tables were generated from the jobs' JSON reports. The failing jobs' diff images were read from the run's artifacts, which GitHub keeps for 90 days.

**Runners.** Two image builds of one release and five processors:

| Threshold | Run | Image | Processor |
| --- | --- | --- | --- |
| 0.1 | a | ubuntu24 20261111.370.1 | AMD EPYC 9V74 80-Core Processor |
| 0.1 | b | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.1 | hover | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.06 | a | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.06 | b | ubuntu24 20261111.370.1 | INTEL(R) XEON(R) PLATINUM 8573C |
| 0.06 | hover | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.045 | a | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.045 | b | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.045 | hover | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.03 | a | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.03 | b | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.03 | hover | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.02 | a | ubuntu24 20261111.370.1 | AMD EPYC 9V45 96-Core Processor |
| 0.02 | b | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.02 | hover | ubuntu24 20261111.370.1 | AMD EPYC 7763 64-Core Processor |
| 0.01 | a | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0.01 | b | ubuntu24 20261111.370.1 | AMD EPYC 9V74 80-Core Processor |
| 0.01 | hover | ubuntu24 20261111.370.1 | AMD EPYC 7763 64-Core Processor |
| 0 | a | ubuntu24 20261111.370.1 | AMD EPYC 9V74 80-Core Processor |
| 0 | b | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |
| 0 | hover | ubuntu24 20261111.127.1 | Intel(R) Xeon(R) 6975P-C |

## Results

### Run a

| Row | 0.1 | 0.06 | 0.045 | 0.03 | 0.02 | 0.01 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| button-group: a connected group with a selected button | pass | pass | pass | pass | pass | pass | pass |
| button-group: a disabled standard group | pass | FAIL 65 | FAIL 151 | FAIL 198 | FAIL 240 | FAIL 309 | FAIL 391 |
| button-group: connected size matrix | pass | pass | pass | pass | pass | pass | pass |
| button-group: standard size matrix | pass | pass | pass | pass | pass | pass | pass |
| button: buttons composed with a leading icon | pass | pass | pass | pass | pass | pass | pass |
| button: color variant matrix | pass | pass | pass | pass | pass | pass | pass |
| button: enabled and disabled buttons | pass | pass | pass | pass | pass | pass | pass |
| button: hovered elevated button | pass | pass | pass | pass | pass | pass | pass |
| button: keyboard-focused button | pass | FAIL 2204 | FAIL 2278 | FAIL 2317 | FAIL 2362 | FAIL 2405 | FAIL 2519 |
| button: size and shape matrix | pass | pass | pass | pass | pass | pass | pass |
| button: switch variant matrix | pass | pass | pass | pass | pass | pass | pass |
| checkbox: disabled state matrix | pass | FAIL 2 | FAIL 3 | FAIL 3 | FAIL 4 | FAIL 11 | FAIL 14 |
| checkbox: hovered checkbox | pass | pass | pass | pass | pass | pass | pass |
| checkbox: keyboard-focused checkbox | pass | pass | pass | pass | pass | FAIL 1066 | FAIL 1194 |
| checkbox: selection state matrix | pass | pass | pass | pass | pass | pass | pass |
| radio: disabled state matrix | pass | pass | pass | pass | pass | pass | pass |
| radio: hovered radio | pass | pass | pass | pass | pass | pass | pass |
| radio: keyboard-focused radio | pass | FAIL 698 | FAIL 698 | FAIL 702 | FAIL 866 | FAIL 873 | FAIL 888 |
| radio: selection state matrix | pass | pass | pass | pass | pass | pass | pass |

### Run b

| Row | 0.1 | 0.06 | 0.045 | 0.03 | 0.02 | 0.01 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| button-group: a connected group with a selected button | pass | pass | pass | pass | pass | pass | pass |
| button-group: a disabled standard group | pass | FAIL 65 | FAIL 151 | FAIL 198 | FAIL 240 | FAIL 309 | FAIL 391 |
| button-group: connected size matrix | pass | pass | pass | pass | pass | pass | pass |
| button-group: standard size matrix | pass | pass | pass | pass | pass | pass | pass |
| button: buttons composed with a leading icon | pass | pass | pass | pass | pass | pass | pass |
| button: color variant matrix | pass | pass | pass | pass | pass | pass | pass |
| button: enabled and disabled buttons | pass | pass | pass | pass | pass | pass | pass |
| button: hovered elevated button | pass | pass | pass | pass | pass | pass | pass |
| button: keyboard-focused button | pass | FAIL 2204 | FAIL 2278 | FAIL 2317 | FAIL 2362 | FAIL 2405 | FAIL 2519 |
| button: size and shape matrix | pass | pass | pass | pass | pass | pass | pass |
| button: switch variant matrix | pass | pass | pass | pass | pass | pass | pass |
| checkbox: disabled state matrix | pass | FAIL 2 | FAIL 3 | FAIL 3 | FAIL 4 | FAIL 11 | FAIL 14 |
| checkbox: hovered checkbox | pass | pass | pass | pass | pass | pass | pass |
| checkbox: keyboard-focused checkbox | pass | pass | pass | pass | pass | FAIL 1066 | FAIL 1194 |
| checkbox: selection state matrix | pass | pass | pass | pass | pass | pass | pass |
| radio: disabled state matrix | pass | pass | pass | pass | pass | pass | pass |
| radio: hovered radio | pass | pass | pass | pass | pass | pass | pass |
| radio: keyboard-focused radio | pass | FAIL 698 | FAIL 698 | FAIL 702 | FAIL 866 | FAIL 873 | FAIL 888 |
| radio: selection state matrix | pass | pass | pass | pass | pass | pass | pass |

### Run hover

| Row | 0.1 | 0.06 | 0.045 | 0.03 | 0.02 | 0.01 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| button-group: a connected group with a selected button | pass | pass | pass | pass | pass | pass | pass |
| button-group: a disabled standard group | pass | FAIL 65 | FAIL 151 | FAIL 198 | FAIL 240 | FAIL 309 | FAIL 391 |
| button-group: connected size matrix | pass | pass | pass | pass | pass | pass | pass |
| button-group: standard size matrix | pass | pass | pass | pass | pass | pass | pass |
| button: buttons composed with a leading icon | pass | pass | pass | pass | pass | pass | pass |
| button: color variant matrix | pass | pass | pass | pass | pass | pass | pass |
| button: enabled and disabled buttons | pass | pass | pass | pass | pass | pass | pass |
| button: hovered elevated button | pass | pass | FAIL 2211 | FAIL 2264 | FAIL 2285 | FAIL 2334 | FAIL 2453 |
| button: keyboard-focused button | pass | FAIL 2204 | FAIL 2278 | FAIL 2317 | FAIL 2362 | FAIL 2405 | FAIL 2519 |
| button: size and shape matrix | pass | pass | pass | pass | pass | pass | pass |
| button: switch variant matrix | pass | pass | pass | pass | pass | pass | pass |
| checkbox: disabled state matrix | pass | FAIL 2 | FAIL 3 | FAIL 3 | FAIL 4 | FAIL 11 | FAIL 14 |
| checkbox: hovered checkbox | pass | FAIL 890 | FAIL 890 | FAIL 890 | FAIL 1132 | FAIL 1132 | FAIL 1132 |
| checkbox: keyboard-focused checkbox | pass | pass | pass | pass | pass | FAIL 1066 | FAIL 1194 |
| checkbox: selection state matrix | pass | pass | pass | pass | pass | pass | pass |
| radio: disabled state matrix | pass | pass | pass | pass | pass | pass | pass |
| radio: hovered radio | pass | pass | FAIL 970 | FAIL 976 | FAIL 984 | FAIL 996 | FAIL 1080 |
| radio: keyboard-focused radio | pass | FAIL 698 | FAIL 698 | FAIL 702 | FAIL 866 | FAIL 873 | FAIL 888 |
| radio: selection state matrix | pass | pass | pass | pass | pass | pass | pass |

## Reading

- **Condition (iii), between runs:** runs `a` and `b` agree on every row and every count at every threshold, across both image builds and five processors. No swept value shows a false failure.
- **Condition (i), focus:** `button-focused` and `radio-focused` fail from 0.06 down. `checkbox-focused` fails only at 0.01 and 0. At 0.01 each focused row's diff covers the whole focus layer, the button's pill and the checkbox's and radio's discs, not only their edges.
- **Condition (ii), hover:** with the hover layer at opacity 0, `checkbox-hovered` fails from 0.06 down, and `button-hovered` and `radio-hovered` from 0.045 down. Without the mutation, all three pass at every threshold.
- **The threshold is 0.01:** the largest swept value that meets all three conditions. At 0.02, `checkbox-focused` passes against its stale baseline.
- **Rows that fail in both runs at 0.01 (property 4):**
  - `button-focused`, `checkbox-focused` and `radio-focused`: the stale baselines, which show no focus layer;
  - `button-group-standard-disabled`, 309 pixels: the diff is on the three disabled labels' text;
  - `checkbox-disabled`, 11 pixels: the diff is on the disabled checkbox's check mark and dash.

  The last two were not known to be stale. Their counts are the same in every job and on every processor, so they are differences between the stored baseline and the rendering, not noise. The recording workflow re-records all five, and the owner reviews each under `RD-13`.