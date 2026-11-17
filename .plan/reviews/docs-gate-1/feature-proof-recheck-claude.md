# Docs gate, first unit — feature proof recheck of R1 and R2

**Commit files were read at:** `8f62beedf448aa02391e7663923598d08f982102` (`repo/docs-gate-1`, the main checkout, clean). **Diff read:** `81c9fe47e` (exclusive) → `8f62beedf` (inclusive): the architect's disposition `c97b671be`, the remediation `9e3a39610`, and the CI reading `8f62beedf`.

**Governing records:**

- [`docs-gate-handoff.md`](../../docs-gate-1/docs-gate-handoff.md) §Disposition of the feature proof at `81c9fe47e` and §Remediation of the feature proof;
- `repo:RD-14` property 6 as amended, in [`00-index.md`](../../00-index.md);
- `drag:DRF-48`'s dated readings, in [drag's index](../../../packages/drag/.plan/00-index.md);
- the report's [§Remediation of the feature proof](../../docs-gate-1/docs-gate-report.md#remediation-of-the-feature-proof), with its `checks/remediation-*.txt`;
- my [feature proof](feature-proof-claude.md).

**Lens:** feature proof, a targeted recheck. It isn't a full round. Nothing is repaired.

## Scope

**Covered.**

- **The scripts.** `.scripts/docs-smoke.ts` at the head, read line by line against its version at `81c9fe47e`, which I'll call _the old script_.
- **Local probes**, on one `just docs-build` of the head. `.docs` was restored from a copy after each mutation, and `diff -rq` against the copy was empty at the end. Three scratch copies of the script were used:
  - the old script;
  - _the offline harness_: Chromium is launched with `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1` and a proxy at `127.0.0.1:9`, where nothing listens. That breaks every network path except the server's. It runs with both the old and the head script;
  - the head script with a counter of the requests that R1's route answers.
- **`RF-46`'s real build.** A scratch worktree at `5e1828d06`, which has Vite 8.3.8 and `rolldown` 1.3.2, after `npm ci` and `just docs-build`. Its `.docs` carries 48 malformed preload tokens. The old and the head script ran against it. The worktree is removed.
- **CI:** runs 44025945743 at `9e3a39610` and 44027436469 at `8f62beedf`, with their job results and the `docs` job's step times.
- **R3 and R4,** as records only.

**Not covered.**

- No typecheck, lint, `just test` or `docs-dev` was run. The report states its TypeScript checks on the script.
- `deploy` hasn't run. After the merge, the coordinator reads it.

## R1. Requests outside the origin: holds

- **The code.**
  - `page.route((url) => url.origin !== origin, (route) => route.fulfill({ status: 200, body: '' }))` (`:220`–`:223`). It is registered on every page before navigation, and a page's routes cover all of its frames.
  - The console rule (`:202`) has no condition on the message or its origin. The rules for `pageerror`, Storybook's error events, and failed or 4xx/5xx requests under the origin are unchanged. There is no allow list.
  - The header comment states the property.
- **No network.**

  | Probe | Script | Exit | Result |
  | --- | --- | --- | --- |
  | N0, clean | head | 0 | 102 of 102, 12.4 s |
  | N1, offline harness | old | 1 | 2 of 102. All 100 preview entries fail, each on the same four `Failed to load resource: net::ERR_PROXY_CONNECTION_FAILED` errors for the Google Fonts stylesheets and fonts |
  | N2, offline harness | head | 0 | 102 of 102, 13.0 s. 406 requests answered by the route |
  | N3, `.invalid` stylesheet in `iframe.html` | old | 1 | 2 of 102. 100 entries fail on `net::ERR_NAME_NOT_RESOLVED (https://docs-smoke.invalid/probe.css)` |
  | N4, `.invalid` stylesheet in `iframe.html` | head | 0 | 102 of 102 |
  - **N1 shows that the harness discriminates.** With the same harness, a request outside the origin that reached the network failed and logged a console error.
  - **So in N2, no page's request outside the origin reached the network.**
  - The check's empty answers make Chromium log _"Failed to decode downloaded font"_ as type `warning`, which is outside the rule. No page failed because of the check's response.

- **The console rule is unconditional.**

  | Probe | Mutation | Exit | Result |
  | --- | --- | --- | --- |
  | M1 | `console.error("probe-M1")` in `checkbox.stories` | 1 | 4 checkbox entries fail on `console error: probe-M1` |
  | C1 | `console.error("Failed to load resource: net::ERR_INTERNET_DISCONNECTED (https://fonts.gstatic.com/x.woff2)")` in `checkbox.stories` | 1 | the same 4 entries fail. No filter on the message text hides an error that names a third-party resource |
  | M3 | `icon.stories` moved away | 1 | 4 icon entries fail on `HTTP 404`, `request failed` and their console errors. A failure under the origin still fails |

  In the feature proof, M3 also failed four of the list's entries. I didn't save their messages, so I don't claim a cause for that difference.

## R2. The manager: holds

- **The code.** `index.html` is a preview target (`:101`). The init script and the exposed function reach every frame (comment at `:225`), so the embedded preview reports through the same mechanism as an entry's page. `api/index.html` keeps `load` (`:107`).
- **The entry the manager opens** when its URL names none is `drag-custom-behavior--resize-handle`, which agrees with the report. I read it from the page's frames after the check settled: `…/?path=/story/drag-custom-behavior--resize-handle` and `…/iframe.html?id=drag-custom-behavior--resize-handle&viewMode=story`.
- **Probes.**

  | Probe | Mutation | Script | Exit | `index.html` |
  | --- | --- | --- | --- | --- |
  | R2a | `)` appended to `draggable.stories` | old | 1 | **passes**, 101 of 102 |
  | R2a | `)` appended to `draggable.stories` | head | 1 | **fails** on `SyntaxError: Unexpected token ')'` and `storyMissing`, 100 of 102 |
  | R2b | `)` appended to `radio.stories`, which the manager doesn't open | head | 1 | passes, and the 5 radio entries fail |
  | M8 | `throw` at parse in `index.html` | head | 1 | fails, `uncaught: Error: probe-M8` |
  | M7 | `throw` 1 s after `load` in `index.html` | head | 1 | fails, `uncaught: Error: probe-M7`. Not a criterion: under R3, the result depends on how long the embedded preview takes to render |

  R2b is the scope that `RD-14` property 6 states: the manager passes on the entry it embeds, and every other entry is checked on its own page.

- **On `RF-46`'s real build:**

  | Script | Exit | Result |
  | --- | --- | --- |
  | old | 1 | 2 of 102 in 48.2 s. `index.html` **passes** |
  | head | 1 | 1 of 102 in 3.8 s. `FAIL index.html` with `uncaught: SyntaxError: missing ) after argument list`, `RF-46`'s error. Only `api/index.html` passes |

  On `RF-46`'s own defect, the page the owner reported now fails.

## R3 and R4: match the disposition

- **R3.**
  - The header comment states the observed period: from navigation until `load` or the completion signal, whichever is later, and not after. It also states that a later error is outside the check.
  - `RD-14` property 6 states the same, and the amendment note records why.
  - The script's behavior is unchanged in that respect.
- **R4.**
  - _Measurements_ carries `drag:DRF-48`'s six readings, which match drag's index row for row. It says that neither variance nor the beta is established, and that `DRF-48` governs the row. _"Inferred to be variance"_ is gone.
  - The timeout bullet states the failure path and that `timeout-minutes` stays at 5.
  - §Remediation covers R1 to R3, with their witnesses, the local time, and run 44025945743's step times.

## The duplicate messages: they don't matter for the verdict

**The observation.** In R2a, `index.html`'s failure lists `console error: SyntaxError…` and `storyMissing` twice each.

**What I read.** I made a scratch copy that tags each report with the reporting window's path and time origin.

- Both `storyMissing` reports come from the same `iframe.html` document, 1 ms apart. Neither came from the manager's window.
- The console error is also logged twice. The second copy arrived after the page had settled and before it closed.

So the reading doesn't show _"the preview's `storyMissing` reaches both the preview's and the manager's channel"_, as the report says. The embedded preview reports the missing entry twice. I didn't read why.

**Why it doesn't matter.**

- Each copy is a real failure from the embedded preview.
- A duplicate only adds a line to a page that is already failing, so it can't make a failing page pass, or a passing page fail.

The wrong explanation in the report is `recheck-1`.

## Finding

### recheck-1 — The report explains the duplicates wrongly, and two closing lines are out of date

**Tier C.** It concerns the record only, and the check's verdict is unaffected.

- **The duplicates.** §Remediation R2 says that `storyMissing` _"reaches both the preview's and the manager's channel"_. The reading above contradicts it.
- **Not verified.** §Not verified still lists _"The run of this report's commit, which changes only `docs`'s `timeout-minutes` and Markdown"_. That commit is `948390aa5`, and its run, 44020422663, is green.
- **Next.** The report's last line still names the feature proof as the next step. The feature proof is `81c9fe47e`, and its disposition is `c97b671be`.
- **Required property:** the report states only what its readings show about the duplicate messages, and its _Not verified_ and _Next_ are current at the head.
- **Routed** to the architect, who decides whether this is owed before the merge.

## Observation, not a finding

**The `docs` job's longest run is now 3 min 0 s,** at `9e3a39610`, which is 1.67 times inside `timeout-minutes: 5`. `npm ci` alone took 1 min 26 s.

- The disposition kept 5 minutes, partly because R1 removes the smoke check's wait on third-party hosts, which was the largest variable part the review measured.
- In this run, the variable part was `npm ci`. At `8f62beedf`, the job took 2 min 18 s, and `docs-smoke` took 21 s in CI in both runs.
- Point (a) is decided. I record the reading for the architect, and don't reopen it.

## CI

| Run | Commit | `docs` | Gate jobs and `verify` | `deploy` |
| --- | --- | --- | --- | --- |
| 44025945743 | `9e3a39610` | success, 3 min 0 s | all success | skipped |
| 44027436469 | `8f62beedf` | success, 2 min 18 s | all success | skipped |

At `8f62beedf`, `docs`'s steps took: `npm ci` 58 s, `playwright install` 27 s, `docs-build` 17 s, `docs-smoke` 21 s, and the upload 1 s.