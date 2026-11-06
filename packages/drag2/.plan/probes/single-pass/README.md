# Single-pass prototype

The evidence behind [the single-pass proposal](../../reviews/architecture/single-pass-proposal-claude.md). It is not production code and no gate reads it. The sources keep a `.txt` suffix so that formatting, linting and typechecking leave them as they ran.

**Input:** `d3058ea3b`. Run in Chromium through the repository's `browser` Vitest project, at the browser `.scripts/vitest-config.ts` resolves.

| File | What it is |
| --- | --- |
| `gesture.ts.txt` | The single-pass kernel |
| `sortable.ts.txt`, `free-drag.ts.txt` | The behaviors on it, over the unchanged production modules |
| `parity.browser.test.ts.txt` | The differential suite, the stack-depth count and the sample timing |
| `parity-results.json.txt` | Both traces of every scenario, and whether they are equal |
| `stack-depth.json.txt`, `sample-time.json.txt` | The two measurements, from the final run |
| `swap-public-entries.patch.txt` | Points `src/sortable.ts` and `src/free-drag.ts` at the prototype |
| `production-suite-through-prototype.txt` | The browser project's result with that patch: passed, failed, whether the file reaches a public entry |
| `mutate.py.txt`, `mutants.json.txt` | The 18 mutations and the scenarios that caught each |
| `measure-size.mts.txt`, `size.txt` | esbuild minify and Brotli 11 of each composition |
| `count-lines.mts.txt`, `lines.txt` | Raw lines, and lines with comments and blanks removed |

## Reproducing

From the checkout root, in a throwaway worktree nested in the checkout so that `node_modules` resolves upward:

```sh
git worktree add --detach .claude/worktrees/drag2-single-pass d3058ea3b
W=.claude/worktrees/drag2-single-pass/packages/drag2
P=packages/drag2/.plan/probes/single-pass
mkdir -p $W/prototype $W/tests/prototype
for f in gesture sortable free-drag; do cp $P/$f.ts.txt $W/prototype/$f.ts; done
cp $P/parity.browser.test.ts.txt $W/tests/prototype/parity.browser.test.ts
cd $W
VITEST=/workspaces/material-x/node_modules/.bin/vitest
$VITEST run -c vitest.config.ts --project browser tests/prototype/parity.browser.test.ts
```

The suite writes `parity-results.json`, `stack-depth.json` and `sample-time.json` beside the package.

For the production suite, apply `swap-public-entries.patch.txt` and run `$VITEST run -c vitest.config.ts --project browser`. The parity suite's 7 pinned scenarios fail in that run by design, because both sides are then the prototype.

`mutate.py.txt`, `measure-size.mts.txt` and `count-lines.mts.txt` hold the absolute paths of the run. Adjust them before use. `mutate.py` takes the output path as its argument, and restores `gesture.ts` when it ends. A mutant that hangs the run counts as caught.