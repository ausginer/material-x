# `parseMs` reads a time unit regardless of case (RF-152): recheck

**Lens:** `reviewer`, a recheck of [`reviewer-1`](feature-proof-claude.md#reviewer-1-a-time-with-its-unit-in-capitals-still-reads-1000-times-too-long) of the [feature proof](feature-proof-claude.md) of `4fcc0a457`. It checks the repair against the architect's ruling in [`RF-152`](../../00-index.md)'s dated note, for pull request #315. Requested by the coordinator.

**Commit read:** `0e2817bf4` on `material-x/parse-ms-1`. After `37b8e5066`, which is the feature proof's record, come the architect's `3471619eb`, which is records only, and the implementer's `0e2817bf4`. The second changes `fns.ts`'s expression and JSDoc, adds four rows to `fns.browser.test.ts`, and adds its note.

**Outcome: accepted. No finding. `reviewer-1` is resolved.** `parseMs` gives 250 for `250MS`, `250Ms` and `0.25S`, and it throws on `MS`, in Chromium, Firefox and WebKit. The witness holds in each engine. The rest of the feature proof still holds at the head: each of its mutations, repeated against the new expression, fails its rows in each engine. CI's `verify` passed on the head: run 45886263768.

## Scope and method

- **The ruling:** what the implementer owes, read against the diff `37b8e5066..0e2817bf4`.
- **Mutations** of `parseMs`, run against `fns.browser.test.ts` and the whole of `sortable-list.browser.test.ts`, in Chromium, Firefox and WebKit, one engine at a time ([script](probes/mutations-recheck.sh.txt), [readings](checks/mutations-recheck.txt)). They are the ruling's witness, one mutation of mine for the fold, and the feature proof's three mutations against the new expression.
- **Not repeated:** the consumers' reading and the spellings probe. Neither depends on `fns.ts`, and the unit changes no sheet. For lowercase units the new expression gives what the old one gave.

## The ruling's requirements

| Requirement | Reading |
| --- | --- |
| `parseMs` reads the unit regardless of case | **Holds.** It compares the value's last two characters, folded with `toLowerCase`, with `ms`. `toLowerCase` doesn't depend on the locale. |
| Rows read `250MS` and `250Ms` as 250, read `0.25S` as 250, and throw on `MS` | **Holds,** in each engine. They are the last three value rows and the fourth throw row of `fns.browser.test.ts`. |
| **Witness:** the `250MS` and `250Ms` rows fail at `4fcc0a457` | **Holds,** in each engine. Putting `4fcc0a457`'s `v.endsWith('ms')` back fails those two rows of 216 and nothing else. `0.25S` and `MS` pass with it, as the ruling says. |
| Nothing else in the entry changes | **Holds.** The architect's note and the implementer's note are added after the earlier notes, and nothing above them changes. |

**Mutations,** the number of rows of the two files that fail out of 216. 12 rows of `sortable-list.browser` run in Chromium only:

| Mutation | Chromium | Firefox | WebKit | Group |
| --- | --: | --: | --: | --- |
| None | 0 | 0 | 0 |  |
| `v.endsWith('ms')` (the witness) | 2 | 2 | 2 | repeated: removes the fold |
| own: `.replace('M', 'm')` in place of the fold | 1 | 1 | 1 | doubted: `250MS` |
| own: always seconds, `* 1000` | 5 | 5 | 5 | `RF-152`'s first witness |
| own: never scaled, `* 1` | 9 | 9 | 8 | doubted: seconds |
| own: no `isNaN` test | 4 | 4 | 4 | the throw |

The rows that fail are the same in each engine, with one exception under _never scaled_. The motion row _"should animate the rows that a slow pointer move and a flick displace"_ fails in Chromium and Firefox but not in WebKit, as in the [feature proof](feature-proof-claude.md#properties): whether it fails depends on frames. Under _always seconds_, the four `ms` rows fail and so does the neighbors' `250ms` row, so the first witness still holds at the head.

## CI

`verify`, run [45886263768](https://github.com/ausginer/material-x/actions/runs/45886263768), `pull_request`, on `0e2817bf4`: **success**, with `records` and `deploy` skipped ([lines](checks/ci-recheck.txt)). It ran the full suite. In the `firefox` and `webkit` jobs, each affected file passes:

- `fns.browser`, 13 rows;
- `sortable-list.browser`, 203 rows with 12 skipped;
- `list-roles`, `ripple.browser` and `elevation.spec`;
- `sortable-list.spec`, 26 rows in Firefox and 36 in WebKit.

The `chromium` job passes all of them. Locally, the two mutated files pass unmutated in each engine: 216 rows in Chromium, and 204 in Firefox and in WebKit, with 12 skipped.

## Verification of this report

The report is Markdown and saved text only. I ran `oxfmt` on the report and `git diff --check`, and checked the relative links and anchors against the files with a script. Lint doesn't apply to Markdown. The mutation script restores `fns.ts` after each run, and `git status` showed nothing after each engine. The scratch copies are in this session's scratchpad and are removed after the commit.