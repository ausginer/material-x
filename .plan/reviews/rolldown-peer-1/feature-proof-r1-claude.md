# material-x's `publint` recipe on an `aube pack` tarball — feature proof, `RF-55` task R1

**Files were read at:** `109472aab` (`repo/rolldown-peer-1`, PR #83), in a scratch worktree of my own. **Diff reviewed:** `0dc493a9d`, the implementation of R1, and the merge `109472aab` of `origin/main` at `2c731045b`. Below `packages/material-x` and `.plan/rolldown-peer-1`, the merge changes only `packages/material-x/src/reference/api.mdx`, so it doesn't affect the recipe.

**Governing record:** `repo:RF-55` in [`00-index.md`](../../00-index.md), the block _"Ruled 2026-11-20 by the architect"_, item _"Implementer task R1"_, and its three proofs. Task 3 is out of scope.

**Lens:** feature proof. Each claim below is from my own reading or my own run. I reran the implementer's script ([rerun](checks/publint-recipe-rerun.txt)) and ran my own edge cases ([script](checks/publint-recipe-edges.sh), [transcript](checks/publint-recipe-edges.txt)). Each run used an empty `TMPDIR` of its own. I didn't run npm in any form, and I didn't run the recipe's old form. I repaired nothing and amended no record.

**Verdict: R1 meets the ruling, and nothing blocks.** I found one Tier C finding, about the PR description. It is older than R1 and doesn't block the merge.

## Scope

**Covered.**

- **The recipe** (`packages/material-x/Justfile`, `publint`). It is a bash shebang recipe with `set -euo pipefail`. It assigns `pack_dir="$(mktemp -d)"`, then sets `trap 'rm -rf "${pack_dir:?}"' EXIT`, runs `aube pack --ignore-scripts --pack-destination "${pack_dir:?}" > /dev/null`, and runs `publint run "${pack_dir:?}"/*.tgz`. `aube run publint` reaches it through `package.json`'s `"publint": "just publint"`. This is what the ruling prescribes: `aube pack --ignore-scripts --pack-destination <temp dir>`, publint on that tarball, and the temp dir removed.
- **Proof 1, a pass.** After `aube exec just build` at the worktree's root, `aube run publint` exits 0 with _"All good!"_. It lints `<TMPDIR>/tmp.*/ydinjs-material-x-0.1.0.tgz`, and its output doesn't contain `npm pack`.
- **Proof 2, a failure.** With `button/button.js` moved out of the built output, the recipe exits 1 and reports _"pkg.exports["./button/button.js"].default is ./button/button.js but the file does not exist."_ With the file restored, it passes again. The manifest's `exports` names `./button/button.js`.
- **Proof 3, the temp dir.** The run's `TMPDIR` holds 0 entries after the pass, after the failure and after the restored run.
  - All three results are the same as the implementer's [`publint-recipe.txt`](../../rolldown-peer-1/checks/publint-recipe.txt), line for line, apart from the random `tmp.*` names.
- **Edge case: zero tarballs.** The recipe's bash sets neither `nullglob` nor `failglob`, so an unmatched glob passes the literal path `…/tmp.*/*.tgz`. publint 0.3.25's `run` (`publint/src/cli.js`) treats a path as a tarball only when `fs.stat` finds a file. Otherwise it takes the path as a package directory. There, `getPackageJson` fails and the CLI calls `process.exit(1)` before `publint()` runs, so nothing is linted and nothing is packed. With an `aube` shim that exits 0 and writes nothing, the recipe exits 1 with _"Unable to read package.json at …/\*.tgz"_. The output doesn't mention `npm pack`, and `TMPDIR` is empty. **The case fails closed.** The message names a `package.json` and not the missing tarball, but the result is still a failure.
- **Edge case: several tarballs.** This case can't occur. `mktemp -d` creates a new, empty directory, and `aube pack` on one package writes one tarball. My real `aube pack` wrote one. With a shim that writes two, `publint run a.tgz b.tgz` exits 0 and lints only `a-0.1.0.tgz`. `cac` ignores the extra positional argument, and no error is reported. So the recipe is not safe for several tarballs, but no input produces them.
- **Edge case: `aube pack` fails.** A shim that exits 3 makes the recipe exit 3. publint doesn't run, and the trap leaves `TMPDIR` empty.
- **Edge case: `mktemp` fails.** With a `mktemp` shim that exits 1 and prints nothing, the recipe exits 1. `set -e` stops the recipe at the assignment, because a plain assignment takes the status of its command substitution. The trap isn't installed yet, and `aube` isn't called, because the `aube` shim recorded no call. Nothing was created, so the recipe has nothing to remove. If the trap ran with `pack_dir` empty, `${pack_dir:?}` would stop `rm` before it ran.
  - When `TMPDIR` itself can't be used, `mktemp` never runs. `just` writes its shebang script to `TMPDIR` and fails first with exit 1: _"could not be run because of an IO error while trying to create a temporary directory"_.
- **Other places that run publint without a tarball.** `git grep publint` at `109472aab` finds the recipe, `package.json`'s script, and `tsdown.config.ts`'s `publint: true`. The ruling already puts `publint: true` inside `RD-16`. No workflow runs publint. That matches the ruling's _"Where the fix applies"_.
- **Handoff.** The commit messages of `0dc493a9d` and `109472aab` have no session link and no closing keyword. PR #83 is open, isn't a draft, has head `109472aab` and has no auto-merge. Its body says `Refs #48` and has no session link.

**Not covered.** Task 3. Any CI run. The recipe's old form, because it runs `npm pack`. publint's warnings and suggestions: the recipe passes no `--strict` and no `--level`, which is the same as the old `publint` call, and the ruling asks for neither.

## Findings

### reviewer-1

**Tier C, for the coordinator. PR #83's description says the branch has no manifest or source changes, but the branch now has both.**

- **Current behavior.** The body begins _"Design and record only. No manifest or source changes yet."_ and describes only the architect's decision and plan. At `109472aab` the branch changes both plugins' `package.json` (task 1), the lockfile, and material-x's `Justfile` (R1).
- **Why it matters.** The owner merges from the PR, and its description is wrong about what the merge contains. Nothing is consumer-observable. A squash merge's message is made of the commit messages, so the wrong text doesn't reach `main`. This makes it Tier C.
- **Evidence.** `gh pr view 83 --json body,headRefOid` on 2026-11-20 returned head `109472aab` and the body quoted above. The description was already wrong at tasks 1 and 2, so the finding is older than R1.
- **Required property.** Before the owner merges, the PR description describes the changes that the branch contains. `Refs #48` stays until task 3 lands.