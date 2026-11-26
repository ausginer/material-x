# Feature proof — the tool that reads a finding (`repo:RD-56`, stage 2, #250)

**Read at `77f5df0e5`,** `repo/finding-tool-1`, on 2026-11-24. Against [the plan](../../findings-on-github-1/findings-on-github-plan.md)'s _The tool_ and _Stage 2: the tool_ with both sets of rulings, `RD-56` in [the register](../../decisions/RD-56.md), [`findings.md`](../../../.agents/docs/findings.md) and the [repair model](../../findings-on-github-1/probes/repair-model.mjs). #244 at `97e69359e` changes neither the plan nor `.agents/`, and the branch merges with it without a conflict.

**Verdict: every planned check is there, in the planned order, and refuses what the plan says. One finding is tier B and is the architect's, because the tool does what the plan says and the plan's premise is false. Three are tier C.** No refusal of a state that the plan passes was found. The one request, its fields, the output, the usage and the absence of a dependency agree with the plan.

## Scope

Read: `.scripts/finding.ts`, `.scripts/finding.node.test.ts`, the plan's checks 1 to 9 one by one, the agreement with the model, 60 mutations ([reading](checks/mutations.txt), 25 survive: one is `reviewer-1`'s property, 9 are `reviewer-2`'s and 15 `reviewer-3`'s), GitHub's real answers for #228 and #234, `gh`'s failures, what GitHub returns for `editor` (public issues, read only), and the conventions (run directly, no dependency, lint and format).

Not read: anything that needs a write to GitHub, so a lock, a label change and an amendment posted by `gh issue comment` are unread. Replica lag between a write and the tool's next read. Suspended or blocked accounts. `.scripts/` outside the two files, and stage 1's documents beyond agreement with the tool.

## Findings

### reviewer-1 — tier B, the architect's: a body edited by a deleted account passes check 2

**Current behavior.** An absent editor skips check 2. GitHub returns a null `editor` both for a body that was never edited and for one whose editor's account is deleted, and only `lastEditedAt` tells them apart. The tool asks for `lastEditedAt` already, and it isn't in check 2.

**Why it is a problem.** The plan says _"an absent editor means never edited"_, and the code comment repeats it. `RD-56` property 5 says that the tool refuses _"an edit by another account"_. The statement is false, so plan and decision disagree. A body that such an account wrote, followed by the amendment by `Lodin`, prints as the contract: check 8 sees only the time.

**Evidence.** [`editor.ts`](probes/editor.ts), [reading](checks/editor.txt). Two scans read about 13,900 public issues, of which about 4,765 have an edited body (two of their queries share a day). `editor` is null on 94 of them, with `lastEditedAt` set and a null editor in each edit of the history that was printed (microsoft/vscode#70162, rust-lang/rust#81555, flutter/flutter#33687). On no issue is an `editor` set without an edit.

[`answers.txt`](checks/answers.txt), _the editor is null, as GitHub answers for a deleted account_: r1 exits 0 and prints. The same answer with another login is refused.

**What isn't read.** All 94 also have a null author, so each is a deleted account that edited its own issue. The exact case, a live author with a deleted editor, isn't among them: the second scan also looked in the first ten edits of each body, and found no edit by a deleted account on an issue whose author is live. That GitHub returns null there too is inferred from the field, not observed. It also needs write access, and `Lodin` is the only collaborator now, so nothing reaches it today.

**Required property.** A body with an edit passes check 2 only when the editor is `Lodin`. A body without one passes with a null editor. A row has the first, and no test has it now: making it so leaves all 37 rows passing.

### reviewer-2 — tier C: the tests can't see the question, so a field removed from it turns a check off and every row passes

The stub answers with the same fields whatever is asked. Nine mutations of the query all survive ([`mutations.txt`](checks/mutations.txt), _ask_). Four turn a check off without a sign, because the comparison with `undefined` is false:

| Removed from the query | What stops |
| --- | --- |
| the body's `editor` | check 2's editor |
| the body's `lastEditedAt`, or the comments' `createdAt` | check 8 above r0 |
| `totalCount` | check 5, and the last line has `NaN` |

The others are the comment's `lastEditedAt` (each amendment is then refused), the number of comments, `last` for `first`, an order, and another repository. The stage asks that _"removing any one check makes a test fail"_. It holds for the code and not for the question. At this commit the question is right: the answers for #228 and #234 have every field, and the checks that read them run on them.

**Required property.** A removed field, or a changed repository, number of comments or order, fails a row.

### reviewer-3 — tier C: weaker forms of checks 3, 4 and 6 and of reading pass every row

The removals of the 31 listed mutations fail the rows that the pull request names, as mine do. These others survive, each with all 37 rows passing:

- Check 3 counts any `tier:` label.
- Check 4 takes `See Revision 2`, `Revision 2 of it`, a line that ends with the stamp, and a `Revision` line anywhere.
- Check 6 takes a stamp inside a line or anywhere in the comment, reads only the first amendment, takes a heading below the first line, of any level, or with text after the number.
- The two patterns of the usage lose their end anchor (`300x`, `r2x`).
- `trimEnd` removed. This one refuses real text: GitHub keeps a final newline (82 of the latest 100 bodies and 1 of 62 comments have one), and then no amendment that ends with it would pass. No row has a final newline.
- `gh`'s message has no fallback, so `gh` that isn't installed gives an empty message.

**Required property.** Each narrowing that the plan states is discriminated: the first line, the whole line of the stamp and of the revision, every amendment, the three exact labels, and a final newline.

### reviewer-4 — tier C: an answer that isn't JSON, or has no issue, ends in a stack trace

`gh` exits 0 with colored output when `CLICOLOR_FORCE=1` or `GH_FORCE_TTY=1` is in the environment. The tool then prints V8's `SyntaxError` and its stack ([`answers.txt`](checks/answers.txt)). An answer whose issue is null does the same with a `TypeError`. It is safe: exit 1 and an empty standard output. But the plan asks for _"one message on standard error that names the cause"_, and the reader is told neither that GitHub wasn't read nor why. `gh` gave no null issue without exit 1 in any reading.

**Required property.** The environment's color settings don't change the answer, or the refusal names the cause.

## What agrees

- **The model.** [`agreement.ts`](probes/agreement.ts) runs the tool's own text on the model's states as GitHub answers ([reading](checks/agreement.txt)). It agrees on all 46,800, and 4 are in order. After the repair of all 46,796 others, not of a fifth, it refuses none. It agrees on all 376,296 stopped repairs, and refuses none after they are started again. The same with an unsound amendment that is unstamped instead of edited, and with several actions in one second (3 and 5), where a fifth state is in order. No refusal printed to standard output, and none was without a message.
- **The editor is the last editor.** On 549 bodies with several editors and at most ten edits, `editor` is the latest edit's on every one. A stranger's edit followed by `Lodin`'s is therefore read as `Lodin`'s, which is what the plan says.
- **The other live claims.** In the latest 100 issues here, the comments are in order of creation, the total equals the list, and no time has a fraction (none in 4,765 elsewhere). Only this repository's comments were read for the order.
- **The request and its failures** ([`answers.txt`](checks/answers.txt)). One call. A pull request's number, an unknown one and one too large for `Int` end with `gh`'s message. So do a bad token and an absent `gh`. Real answers for #228 and #234, given a label and an ending, pass at r0 and print. With `#228`'s own time of edit, check 8 refuses.
- **Spoofs.** Another or absent author of the issue or an amendment, an edited amendment, a surplus, missing or reordered one, and another account's `### Amendment N` behave as planned.
- **Usage and messages.** Every other form prints the usage. Messages name both revisions and which is later.
- **Checks run.** 37 rows pass in the `repo` project. `oxlint`, ESLint and `oxfmt` are clean on both files. The typecheck wasn't run.

## Observed, and not findings

- `Revision 01`, `### Amendment 01` and `r01` are read as 1, in both the plan's forms and the tool's argument. Nothing prints differently for them.
- A heading with a space after its number, or after an empty first line, isn't an amendment by the plan's first-line rule, and the comment is left out. With the body at that revision it is refused as missing, and without it the body is unchanged.
- The message for a surplus at r0 is _"not 1 to 0 in order"_.
- `finding.ts` has the shebang of `entry.ts` and not its executable bit. The use is `node .scripts/finding.ts`, so neither is needed.
- An edit in the last amendment's own second, after it, passes. The plan says so.