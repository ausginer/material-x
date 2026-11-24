# Findings on GitHub

> Retrieved before reading a finding that a prompt pins as `#N rM`, and before writing one.

An issue with a `tier:` label is a finding, and its body is the finding's contract. Only the finding that the trial of `repo:RD-56` names has the label. Every other finding is registered in its scope's register, as [review findings](review-findings.md) says. [`work-queue.md`](work-queue.md) governs the finding's place in the queue.

## Address

- **The address is `#N`,** and `ausginer/material-x#N` outside the repository.
- **The title is plain words,** without an address.
- **A code comment may carry `(#N)` as its one bare pointer** ([documentation, §5.2](documentation.md#52-internal-comments)). Published JSDoc never carries it.
- **A commit message may name `#N`,** with no closing keyword.

## Reading

1. Run `node .scripts/finding.ts <number> r<revision>` with the pinned revision.
2. When the tool refuses, or the revision is later than the pinned one, stop and report it.

The body alone is the contract. An amendment explains a change and isn't a source. No other comment is part of the contract.

**Only text by `Lodin` with the architect's stamp is the contract.** A stamp isn't a proof, because every agent writes as that account.

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

1. Filter the open issues locally for the same subject ([Searching](#searching)).
2. Create the issue from [the body's form](#the-body) with `Revision 0`, the `tier:` label and the `pkg:` labels.
3. Lock it with `gh issue lock`.
4. Run the tool.

**From an `unregistered` issue by the owner's account:** write the body into that issue as `Revision 1`, post Amendment 1, remove the `unregistered` label, set the `tier:` and `pkg:` labels, then lock it and run the tool.

**An issue that another account opened is never made a finding.** The architect opens a new one, and the coordinator closes the other with a link to it.

## Amending

In this order:

1. Run the tool at the current revision.
2. Edit the body with `gh issue edit --body-file`, with the next `Revision`.
3. Post the amendment with `gh issue comment --body-file`.
4. Run the tool at the new revision.

A change of tier is an amendment, and the body then has a new revision with no other change. A refusal at any step stops the work.

## Writers

- **The architect alone** writes the body, the amendments and the `tier:` label.
- **The coordinator** writes what `work-queue.md` says, and never the body. The architect amends a description that no longer holds.
- **The owner** answers in chat. The architect records the answer as an amendment, in English.
- **An implementer or a reviewer** writes only its pull request or its report.

## Evidence

- **A few lines are in the body.** A probe, and a reading that a probe or a run produced, is committed in the repository, because others run it.
- **When the repair follows at once,** the evidence is on the unit's branch, in `.plan/<unit>/` or the package's `.plan/`, and merges with the repair.
- **When the finding waits,** the evidence goes by a pull request of its own.
- **The issue cites evidence by path, and by the pull request that carries it.** The path resolves on `main` after the merge, and in the pull request before it.

## Closing

Before the merge, the architect comments _Accepted for closure at `<sha>`_ with what the acceptance rests on. The pull request says `Closes #N`, and the rest is [`work-queue.md`'s](work-queue.md#closing).

A finding that comes back is the same issue, reopened, with an amendment.

## What isn't a finding

- **A ruling that changes a public surface or a package's contract** is a decision in its register. The finding's body names it.
- **A plan** stays in `.plan/`. The body of a finding that needs one names it.

## Searching

List the findings of every state, and filter them locally for a `tier:` label:

```sh
gh issue list --state all --limit 1000 --json number,title,body,labels
```