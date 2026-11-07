# Size re-base to the clean-install toolchain, 2026-11-07

**Closes `drag/production:integrity-1`** under [`remediation-handoff.md`](../remediation-handoff.md) step 1. Tree: `6c1a1b0bb`, source unchanged. Command: `node bench/size/measure.ts --prototype` in `packages/drag`.

`packages/drag/package.json` pinned `rolldown` `1.1.5`, and the lock carried a nested copy that the root `overrides` (`"rolldown": "$rolldown"`, root `1.2.15`) makes invalid, so `npm ci` installs no nested copy. The pin and the nested lock entries are removed. `bench/size/measure.ts` now resolves the root `rolldown` `1.2.15`.

## Both readings

Brotli bytes. The prototype arm is `599684791`, measured by the same tool in the same run.

| Row | Minified, 1.1.5 | Brotli, 1.1.5 | Minified, 1.2.15 | Brotli, 1.2.15 | Change | Prototype Brotli, 1.2.15 |
| --- | --: | --: | --: | --: | --: | --: |
| `draggable` alone (control) | 5872 | 2035 | 5840 | 2024 | -11 | 3704 |
| `draggable` + `lift` | 11125 | 4017 | 11173 | 4036 | +19 | no such row |
| Example: resize handle | 8491 | 3151 | 8507 | 3164 | +13 | 3844 |
| Example: drop zone | 11845 | 4284 | 11893 | 4315 | +31 | 3974 |
| Example: canvas group | 8645 | 3162 | 8661 | 3176 | +14 | 4294 |
| `freeDrag` | 13561 | 4825 | 13609 | 4842 | +17 | 4589 |
| `freeDrag` + `bounds` + `landing` | 14281 | 5090 | 14329 | 5100 | +10 | 4856 |
| `sortable` + `y` | 18925 | 6567 | 19021 | 6600 | +33 | 6401 |
| `sortable` + `xy` | 18331 | 6461 | 18427 | 6478 | +17 | 6271 |
| `complete` | 19937 | 6945 | 20049 | 6960 | +15 | 6804 |

The 1.1.5 column equals the implementation report's table byte for byte.

## Re-base

**Trigger:** a toolchain change, with no source change, which moved every row. This is not a re-base during a pass: it precedes every remediation change.

- **Control:** `draggable` alone, 2035 → 2024.
- **Ceilings:** each ceiling moves by its row's toolchain change, so each row keeps the slack it had over its reading, and its sensitivity is unchanged.

| Row                               | Ceiling before | Ceiling after | Slack |
| --------------------------------- | -------------: | ------------: | ----: |
| `draggable` alone                 |           2150 |          2139 |   115 |
| `draggable` + `lift`              |           4150 |          4169 |   133 |
| Example: resize handle            |           3300 |          3313 |   149 |
| Example: drop zone                |           4400 |          4431 |   116 |
| Example: canvas group             |           3300 |          3314 |   138 |
| `freeDrag`                        |           4950 |          4967 |   125 |
| `freeDrag` + `bounds` + `landing` |           5200 |          5210 |   110 |
| `sortable` + `y`                  |           6700 |          6733 |   133 |
| `sortable` + `xy`                 |           6600 |          6617 |   139 |
| `complete`                        |           7050 |          7065 |   105 |

The remediation's later rows are read against these figures in [`remediation-report.md`](../remediation-report.md).