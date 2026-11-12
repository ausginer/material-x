# Campaign runner report

**Base:** `9fb5ff3b2` on `drag/performance`. **Request:** the owner's request for a tested sequential runner for long performance campaigns. No decision governs it, and it changes no scenario, `judge` rule, threshold, injection or reading. It didn't touch the B2 or B3 runs, which were in progress.

## Outcome

[`bench/campaign.ts`](../bench/campaign.ts) and [`tests/campaign.node.test.ts`](../tests/campaign.node.test.ts).

- `run [--dir d] [--id id] -- '<command>' ...` runs each command through the shell and waits for its process to exit. The commands run in order. The first non-zero exit or terminating signal stops the sequence, and the runner exits with that code.
- `<dir>/<id>/status.json` records the run's id, working directory, runner process, state and start and end times. For each step it records the command, state, revision (`commit` and `dirty`), process, start and end times, exit code or signal, and log path. Each step's stdout and stderr go straight to `<n>.log`. Nothing is deleted. `--dir` defaults to `packages/drag/.campaigns`, which is git-ignored.
- **Outside measured sections:** the runner writes the status once after a step is spawned and once after it exits. While the step runs, the runner does no work and its output doesn't pass through the runner.
- **Interruption:** each step runs in its own process group. SIGINT, SIGTERM or SIGHUP to the runner is forwarded to the group. The runner then waits for the step to exit, records the run as `interrupted` with the signal, and exits with 128 plus the signal number.
- **`status [--json] [id ...]`** reads only `status.json` and `/proc`. A run recorded as `running` whose runner process (PID and start time) no longer exists is reported as `interrupted`. `stepAlive` says whether a step recorded as running still exists. That covers a runner killed with SIGKILL, which leaves its step running. The liveness check reads `/proc`, so the runner works on Linux only.

## Verification

| Check | Result |
| --- | --- |
| `npx vitest run -c vitest.config.ts tests/campaign.node.test.ts` | 23 passed. The fixtures are shell commands: success, failure at step 2 of 3, SIGTERM to the runner during a step, and SIGKILL to the runner during a step |
| Mutation: the runner doesn't stop on failure | 2 failed |
| Mutation: `status` doesn't check the runner's liveness | 1 failed |
| Mutation: the signal isn't forwarded to the step | The SIGTERM scenario timed out |
| Mutation: the step isn't in its own process group | The SIGTERM and SIGKILL scenarios failed |
| `npx just fmt`, `lint-fix`, `fmt`, `lint` on both files | Exit 0, with two line-level suppressions in `campaign.ts` whose reasons are stated in place |
| `npx just typecheck` | Exit 0 |

No browser ran, and this unit ran no Chromium suite run. The mutations were applied to a scratch copy and the file was restored and compared with `cmp`.

## Next

None owed. The architect or owner may route the next P1b runs through it.