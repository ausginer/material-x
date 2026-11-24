# Findings on GitHub

> Retrieved before reading a finding that a prompt pins as `#N rM`, and before writing one, a prompt about one, or anything else about its issue to GitHub.

An issue with a `tier:` label is a finding, and its body is the finding's contract. Only the finding that the trial of `repo:RD-56` names has the label. Every other finding is registered in its scope's register, as [review findings](review-findings.md) says. [`work-queue.md`](work-queue.md) governs the finding's place in the queue. Where another document says otherwise of such an issue, this one applies.

A finding with the label is one issue, from its observation to its closure.

## Address

- **The address is `#N`,** and `ausginer/material-x#N` outside the repository.
- **The title is plain words,** without an address.
- **A code comment may carry `(#N)` as its one bare pointer.** Published JSDoc never carries it.
- **A commit message may name `#N`,** with no closing keyword.

## Reading

A prompt names a finding as `#N rM` and copies none of its text.

1. Run `node .scripts/finding.ts <number> r<revision>` with the pinned revision.
2. When the tool refuses, or the revision is later than the pinned one, stop and report it.

Without a revision, the tool prints the current one. A writer, or the coordinator that writes the prompt, learns `M` that way.

The body alone is the contract. An amendment explains a change and isn't a source. No other comment is part of the contract.

**Only text by `Lodin`, the owner's account, with the architect's stamp is the contract.** A stamp isn't a proof, because every agent writes as that account.

## The body

```text
<the description: at most three sentences, ending with the size>

## What happens

## Why it is a problem

## Required property

1. <a property, and its witness where one is owed>

## Evidence

Read at `<sha>`. <a few lines, or paths with the pull request that carries them>

## Not read

## Questions

Revision 0

— ARCHITECT
```

- **`Revision N`** is the number of the last amendment, and 0 at registration.
- **The description** is bounded as an issue's description is in [`work-queue.md`](work-queue.md#issues).
- **The first four headings are always present.** _Not read_ and _Questions_ are present only when they have something.
- **A question** has its options, the recommendation and, once there is one, the answer.
- **The tier** is the label `tier:A`, `tier:B` or `tier:C`, and nothing else states it.

## The amendment

Each change of the body is one comment:

```text
### Amendment 1

<what changed, why, and whose answer or review asked for it>

> <the text it replaced, quoted, or "Nothing replaced.">

— ARCHITECT
```

Nobody edits an amendment after it is posted. A correction is the next amendment.

## Registering

The main slot's architect registers.

1. Compare the subject with every issue that the command in [Searching](#searching) lists, unfiltered and of every state, and with the scope's register.
2. Create the issue from [the body's form](#the-body) with `Revision 0` and the `tier:` label.
3. Lock it with `gh issue lock`.
4. Run the tool.

**From an `unregistered` issue by the owner's account:** write the body into that issue as `Revision 1`, post Amendment 1, set the `tier:` label, then lock it and run the tool.

The coordinator sets the package or `repo` label and removes `unregistered`, as [`work-queue.md`](work-queue.md) says.

**An issue that another account opened is never made a finding.** The architect opens a new one, and the coordinator closes the other with a link to it.

## Amending

First read the issue's other comments. A comment of the owner's is recorded as an amendment, unless one already records it. Then, in this order:

1. Run the tool at the current revision.
2. Edit the body with `gh issue edit --body-file`, with the next `Revision`. Set the label of a changed tier with this edit.
3. Post the amendment with `gh issue comment --body-file`.
4. Run the tool at the new revision.

A change of tier is an amendment, and the body then has a new revision with no other change.

## A fault

A role that isn't the architect stops at a refusal and reports it. A failure of `gh` isn't a fault, and neither is a revision that differs from the pinned one. The architect repairs any other refusal in the one way below.

**The sound amendments** run from 1 in order, each in its form and unedited, up to the first that isn't. **R** is one more than the greatest number that the body or an amendment has.

1. Edit the body into its form, with the text that is to apply and `Revision R`. Set exactly one `tier:` label.
2. Post the amendments after the sound ones, in order, up to Amendment R. Each has the text that it had, and one whose number had no text says so. Amendment R names the fault and quotes any text that would be lost.
3. Delete every amendment that was there before step 2 and isn't sound.
4. Run the tool at revision R.

A repair that stops is started again from the beginning. A finding that the tool still refuses is registered again as a new issue. The architect then removes the old issue's `tier:` label, and the coordinator closes that issue with a link to the new one.

## Writers

- **The architect alone** writes the body, the amendments, the `tier:` label, the lock and the acceptance.
- **The coordinator** writes the rest, as `work-queue.md` says, and never the body. The architect amends a description that no longer holds.
- **The owner** answers in chat. The architect records the answer as an amendment, in English. When the coordinator then moves the item, its comment names the amendment.
- **An implementer or a reviewer** writes only its pull request or its report.

## Evidence

- **A few lines are in the body.** A probe, and a reading that a probe or a run produced, is committed in the repository, because others run it.
- **When the repair follows at once,** the evidence is on the unit's branch, in `.plan/<unit>/` or the package's `.plan/`, and merges with the repair.
- **When the finding waits,** the evidence goes by a pull request of its own.
- **The issue cites evidence by path, and by the pull request that carries it.** The path resolves on `main` after the merge, and in the pull request before it.

## Closing

Before the merge, the architect reads the issue's other comments, as before an amendment, and then comments _Accepted for closure at `<sha>`, revision N_ with what the acceptance rests on. A later amendment needs a new acceptance. The pull request says `Closes #N`, and the rest is [`work-queue.md`'s](work-queue.md#closing). Without a pull request, the acceptance comes before the coordinator's closing comment.

The issue's state is the finding's status. A finding that comes back is the same issue: the coordinator reopens it, and the architect amends it.

## What isn't a finding

- **A ruling that changes a public surface or a package's contract** is a decision in its register. The finding's body names it.
- **A plan** stays in `.plan/`. The body of a finding that needs one names it.

## Searching

List the issues of every state. For the findings, filter the list locally for a `tier:` label:

```sh
gh issue list --state all --limit 1000 --json number,title,body,labels
```