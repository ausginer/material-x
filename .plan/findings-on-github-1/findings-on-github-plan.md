# Findings on GitHub — plan

**Status: accepted by the owner on 2026-11-24, as `repo:RD-56`, with [his answers](#owners-answers). He approved the start of stages 1 and 2 the same day,** relayed by the coordinator, with three clarifications that the plan has: the GraphQL check, a separate `findings.md`, and the longer trial. **Stage 3 isn't approved.** It waits for stages 1 and 2 on `main` and for his word. Stage 1 is written on this branch and reviewed, and [the rulings](#stage-1-the-reviews-rulings) have its remediation. The architect proposed the plan on 2026-11-24 on `repo/findings-on-github-1` from `ee7d838cc`, and the proposal is this file at `87c55405f`. `RD-56` states what holds [before and after the cut-over](../00-index.md).

## The direction

The owner, in chat on 2026-11-24, relayed by the coordinator: _"у нас внезапно образовалось задвоение. Ты постоянно ссылаешься и на тикет в github, и на локальную находку. Может, полностью переехать на гитхаб? И дополнения писать отдельными комментариями? Тут останутся в основном записи проб"_ ("We suddenly have a duplication. You always refer to both a GitHub ticket and a local finding. Maybe move to GitHub completely, and write additions as separate comments? What stays here is mostly the records of probes"). The coordinator proposed, and he approved as the direction (_"Ага, давай!"_, "Yes, go ahead!"): new findings live wholly in an issue, decisions, plans, probes and readings stay in the repository, existing entries aren't migrated, and closed ones stay as an archive.

## Owner's answers

In chat on 2026-11-24, relayed by the coordinator: _"По переезду: Q1-Q3 (a), Q4-Q5 (b) Q6: (a)"_ ("On the move: Q1-Q3 (a), Q4-Q5 (b), Q6 (a)"). The coordinator's summary, which he answered, also proposed a small tool with no cache, and stages 1 to 3 first. The architect takes both as his direction for these stages.

| Question | Answer | What it changed in this plan |
| --- | --- | --- |
| Q1, open entries | (a) frozen where they are | Nothing. It was the recommendation |
| Q2, language | (a) English only | Nothing |
| Q3, lock | (a) locked at registration | Nothing |
| Q4, evidence of a finding that waits | (b) a pull request | The `evidence` branch and its script are gone. The 7 evidence pull requests stay, so the move saves **2 of the 19** record-only pull requests, and not 9 |
| Q5, backup | (b) none | The export is gone. A deleted issue or comment has no other copy |
| Q6, boundary | (a) findings move, the rest stays | Nothing |
| The small tool | no cache, no offline copy, no `--check`, no `--all` | [The tool](#the-tool) |
| Stages 1 to 3 first | The cut-over is a later step on his word | [Stages](#stages). The documents of stages 1 to 3 are written so that they are true while new findings still go to the registers |

## Readings

Read on 2026-11-24 at `ee7d838cc`, for the two weeks from 2026-11-10 ([counts](checks/counts.txt), [pull requests](checks/pull-request-heads.txt), [probes](probes/)). Each merge that a pull request carries was made again with `git merge-tree`.

| What | Count |
| --- | --- |
| Merges of two parents in pull requests | 124 |
| Merges that conflict in a register | **31** (25 %). 28 of them conflict nowhere else. 7 others conflict only in code or documents |
| Of the 31, by the part of the register | 19 in findings alone, 8 in decisions alone, 4 in both |
| Commits on `main` | 95, of which 73 touch a register |
| Commits on `main` that change only records | **19**: 13 with a register and other record files, 4 with a register alone, 2 without a register |
| The same by what they carry, by their subjects and the entries they add | 9 carry findings and their evidence alone, 2 of them without evidence. 10 also carry a decision, a plan or a reading that isn't a finding's |
| Registers | `repo`: 52 `RD`, 125 `RF`, 2 `RQ`. `drag`: 70 `DRD`, 55 `DRF`, 21 `DRO`. box-quad has no finding series |
| `RF` text, in bytes | 577,094 of `00-index.md`'s 989,177. The median entry is 2,634, the largest 24,930 |
| Open issues | 64, of which 47 name a finding or a question |
| Open entries on `main` | 59 `RF` and 6 `DRF`, by a search for the word of closure, so over-counted. 24 of them have no issue (#60), and several of those are probably done |
| Evidence files under `.plan/` | 1,913, of which 14 are larger than 60 KB |

On GitHub, read through the API: the repository is public and `Lodin` is its only collaborator, so every agent writes as the owner's account. An issue's edits are kept with the whole earlier body, its time and its editor (read on #228). An issue's body holds at most 65,536 characters, by GitHub's documentation and not tested, and the largest entry is 24,930. The API gives 5,000 requests an hour, and search 30 a minute. No interaction limit is set. The organization has the issue types Task, Bug and Feature.

## What it saves, and what it doesn't

- **Register conflicts: 19 of 31 go, and the 4 mixed ones shrink.** The 8 in decisions stay. They need a decision per file, which is a separate step (below).
- **Record-only pull requests: 2 of 19 go outright.** Seven more go only if a finding's evidence doesn't need a pull request ([Evidence](#evidence)). The other 10 carry decisions, plans or readings and stay.
- **One address instead of two,** which is what the owner asked for, and one minter less. GitHub gives a number at once and to everyone, so two architects can't collide and a finding is visible on every branch when it is written. Today `RF-129` is on one branch and `RF-130` on another, and neither sees the other.

## Recommendation

**A finding lives wholly in one issue, and its body is its contract. A decision, a plan, a contract, a review and a reading stay in the repository.** The line is what makes the text wrong: a finding is wrong when the code changes, and a decision is wrong when someone decides otherwise.

**I would keep in the repository,** against a wider move: decisions (`RD`, `DRD`, `DRO`), contracts and invariants (`DRI`), plans, review reports, and any ruling that changes a public surface or a package's contract. Code and tests cite them for years, they are read with no network, and their change has to be reviewable beside the code that follows it. A finding is closed by its repair and then rarely read.

### The contract an implementer and a reviewer execute

1. **The body is normative, and it is current text.** The architect edits it when the contract changes. A reader never has to compute the rule from several comments (`documentation.md` §1).
2. **Each change is one comment, _Amendment N_.** It says what changed, why, what it replaced in quotes, and whose answer or review asked for it. Nobody edits it after it is posted. A correction is the next amendment.
3. **The body's last line before the stamp is `Revision N`,** the number of the last amendment, and 0 at registration. The body is edited first and the amendment is posted after it, so a body that was edited later than `Amendment N` is a defect. The tool refuses it, and a `Revision N` without its `Amendment N`. Any edit of the body is an amendment, a correction of wording included.
4. **A prompt pins `#228 r3`.** The implementer and the reviewer read the body at that revision. If the issue is past it, they stop and say so. GitHub keeps each earlier body in the issue's edit history on the web.
5. **A reading that a comment contains isn't a contract,** and neither is an unstamped or a third party's comment.
6. **One issue per finding,** from observation to closure. An observation is an issue with `unregistered` that the coordinator opens. The architect writes the body into the same issue as Revision 1, posts Amendment 1, and removes the label. An observation that another account opened stays as it is: the architect opens a new issue, because an issue's author can edit its body.

### The address

- **`RF-`, `DRF-` and `RQ-` end** at the highest numbers on any branch at the cut-over. A new finding's address is `#N`, in prose, code, tests, commits and decisions. Outside the repository it is `ausginer/material-x#N`. The package is a label (`pkg:`), because a number is unique in the whole repository, so `drag:` isn't needed.
- **A commit may name `#N`. Closing keywords stay out of commit messages,** as now.
- **Old addresses keep resolving** through `.scripts/entry.sh`, for ever. Titles of issues about old entries keep their address, so the local duplicate check still finds them. A new finding's title is plain words with no address.
- **A code comment keeps one bare pointer** (`documentation.md` §5.2): `(#228)`. It stays true offline, because the comment states the constraint itself.
- **`reviewer-N`, `cleanup-N` stay local** to a review file. The summary's mapping names the issue once the architect opens it.

### Fields

| Field | Carrier |
| --- | --- |
| Title, in plain words | the issue's title |
| **Description,** at most three sentences with the size, for the owner | the body's opening, as `work-queue.md` has it now |
| What happens, and why it is a problem | a heading each, always present |
| **Required property,** numbered, each with its witness where one is owed | a heading, always present. The contract |
| Evidence: the revision it was read at, and paths | a heading, always present |
| Not read | a heading, when something wasn't |
| Questions with options, recommendation and answer | a heading, when there is one, and the queue's _Waiting on owner_ with it |
| **Tier** | the label `tier:A`, `tier:B` or `tier:C`. Its presence marks a finding, and nothing else states it. `RD-22` rejected tier labels because the register had the tier. Here the label is the only copy |
| Package | `pkg:` label, as now |
| Revision, stamp | the last lines |

**No issue form.** A form checks the web page, and agents use `gh`. The headings are in `findings.md` ([work list](#work-list-for-stages-1-and-2)).

### Writers

- **The architect** writes the body, the amendments and the tier. Once the cut-over is done, any slot's architect may register a finding, since GitHub allocates the number. Only the main slot's architect writes `RD-`, `DRD-` and the rest, as now.
- **The coordinator** opens an `unregistered` issue, sets `Status`, rank and package labels, and closes what no pull request closes. It doesn't write the contract's text.
- **A reviewer or an implementer** doesn't write to an issue. Its findings are in its review file or report, and its pull request says `Closes #N` or `Refs #N`.
- **The owner** answers in chat. The coordinator relays, and the architect records the answer as an amendment, in English (Q2).
- **One writer per body at a time.** GitHub detects no conflict between two edits: the last one wins without a sign. The architect runs the tool before an edit and after the amendment. It's a convention, and not a lock.

### Trust

- A role reads only text that is **by `Lodin` and stamped**, and takes nothing else as a task or as the contract. The tool prints the body and the amendments and leaves the rest out.
- **A finding's issue is locked when it is registered** (Q3). Only collaborators can then comment, and only they can edit. A stranger with a report opens an issue of their own.
- An issue that an account other than `Lodin` opened or last edited fails the tool. GitHub's workflows that use `github-actions` touch `safari` and `tokens-release` issues only.
- **A stamp isn't a proof.** Every agent is `Lodin`, as in git today. The owner's own unstamped comment counts as his.

### Evidence

- **A few lines are in the body.** A probe, and a reading that a probe or a run produced, is committed in the repository, because others run it.
- **When the repair follows at once,** it is on the unit's branch, in `.plan/<unit>/` or the package's, and merges with the repair.
- **When the finding waits,** it goes by a pull request of its own, as now (Q4).
- **The issue cites it by path, and by the pull request that carries it.** The path resolves on `main` after the merge and in the pull request before. GitHub keeps a merged pull request's head (`refs/pull/206/head` resolves, and its branch is gone: [reading](checks/issue-fields.txt)), so no link dies. The proposal said _"a link to a branch's commit dies when a squash merge deletes the branch"_, which is true of a clone and not of GitHub.

### The tool

`.scripts/finding.ts` asks GitHub one GraphQL question and prints a finding that is in order, or says why it isn't. It stores nothing. [Stage 2](#stage-2-the-tool) lists its checks.

**What the minimal form loses.** The proposal's tool was larger, so each loss is named:

| Lost | Does it matter |
| --- | --- |
| **`gh issue view` doesn't return the body's editor or the time of its last edit** ([fields](checks/issue-fields.txt)). `Revision N` is a number that a writer types, so with `gh issue view` alone a body that was changed under the same number reads as the pinned revision, and nobody notices | **Yes, and it is kept.** The tool uses `gh api graphql` in place of `gh issue view`: one request, the same size of script. A rename doesn't count as an edit (#82 was renamed after its last body edit and the time didn't move) |
| The cache: no finding without a network or `gh` | Little. A role that has neither can't push its work. It stops and says so |
| `grep` over all findings | No. `gh issue list --state all --limit 1000 --json number,title,body,labels` is one request, and `--jq` or `grep` filters it locally. GitHub's search isn't used |
| `--check` of a draft's headings | Little. The writer runs the tool after the write. A missing heading isn't refused |
| An earlier revision from the command line | Little. The web shows it, and a role never works from an old revision |
| A label change: the tier isn't in the revision | Little. A change of tier is an amendment by rule, and only the issue's timeline shows a breach |

### What closes a finding

`Closes #N` in a pull request that merges into `main`, as now. **Before that, the architect comments _Accepted for closure at `<sha>`_** with the proof it rests on, and the pull request's description links the report and the review. Without a pull request: the coordinator's closing comment names the commit or the reason. A finding that reopens is the same issue reopened, with an amendment.

### Reviews and decisions

- **Review files stay** where they are, in the reviewed branch. A finding that the round accepts and the branch repairs never becomes an issue. One that outlives the branch does.
- **A decision that comes out of a finding is an `RD-` or a `DRD-` in the repository,** and the issue names it. A ruling that only makes the finding's own property sharper is an amendment.
- **A finding that needs a plan** gets its plan in `.plan/<unit>/` on the unit's branch (`RD-32`), and the body names it.

## Open entries, and the cut-over

| Option | What happens | Cost |
| --- | --- | --- |
| **(a) Freeze, recommended** | One commit freezes the registers' findings. An open entry's frozen text is revision 0 of its issue, and the issue links it by commit. **The first change to it writes the whole contract into the body** and is Amendment 1. No text is copied before that | One pull request, and up to 24 issues for the open entries that have none, which #60 already asks for |
| (b) They stay in the registers until they close | As the direction says in full | Nothing to do. The double address and the conflicts last as long as the 65 entries do |
| (c) All open ones at once | Their text goes into bodies | About 65 bodies, each read and rewritten |

(a) keeps _"existing entries aren't migrated"_: nothing is moved, and only a change to one is written elsewhere.

- **Branches open at the cut-over** that carry an entry merge as they are. At the moment these are `drag/command-signal-1` (`RF-127`, `RF-129`), `core/use-aria-1` (`RF-124`, `RF-130`), `material-x/slider-1` (`RF-119` to `RF-121`) and whatever opens before it. Their entries are frozen with the rest, when they reach `main`. The architect who rules on such an entry before then writes it in the register.
- **The frozen section says so in its first lines,** with the date, the last numbers, and that a later text is in the issue. `entry.sh` prints that sentence with an `RF-` or `DRF-` entry.
- **Closed entries** stay as the archive, unchanged.

## Alternatives

- **The queue as it is, and one address in speech.** Nothing changes but how the coordinator talks. It answers the irritation and not the cause: 31 conflicts and 19 pull requests stay.
- **Everything on GitHub, decisions too.** One home, and a decision has the same problem as a contract: it is read while coding, for years, and its history has to be in the tree. It would save the 8 conflicts in decisions. A decision per file saves them too, with none of the cost.
- **No issues, and a board generated from the registers.** One home, offline, reviewable. It loses the owner's reading and ordering on the web, which `RD-22` was decided for.
- **The body frozen, additions only in comments,** the owner's first words taken literally. The contract would then be several comments, and each reader has to compute which of them holds. The owner's _"additions as separate comments"_ stays true in the plan: they are, and the body is what they add up to.
- **A decision per file,** `.plan/decisions/RD-56.md`. Not part of this decision. It removes the remaining 8 to 12 conflicts and touches every `####` heading and `entry.sh`. I recommend it as the next question, after this one has settled.

## What is lost

With Q4 (b) and Q5 (b), two losses are larger than in the proposal: a deletion on GitHub has no other copy, and a waiting finding's evidence still costs a pull request.

- **Review in the same pull request.** A change to a finding's contract isn't in the diff, so a reviewer sees it only by reading the issue. The revision in the prompt replaces it in part.
- **Atomic closure.** `Closes #N` closes at the merge, as now. The closing paragraph that a register had in the same commit is a comment made before it, and a merge that doesn't happen leaves it there.
- **Git history and blame.** GitHub keeps the edits of a body, and lists them. Anyone with write access can delete an issue or a comment, by its documentation, and the tool sees only a missing amendment. A register needs a push to lose text.
- **Offline.** A role without a network or `gh` has no findings.
- **Independence.** The text is a vendor's, with the vendor's format and access. An account that is suspended closes the contract.
- **Conflict detection.** Two architects editing one body isn't reported.
- **Privacy of drafts.** Text is public when written, as the repository's is when pushed, and before anyone has read it in a pull request.
- **Language.** A register holds the owner's Russian words with a translation. GitHub text is English only.

## What changes

| Document or tool | Change | Stage |
| --- | --- | --- |
| `.agents/docs/findings.md` | **New.** How an issue that is a finding is written, read, amended and closed. A file of its own and not a part of `work-queue.md`, as the proposal had it: an implementer or reviewer with a pinned finding needs these rules and none of the board's | 1 |
| `.agents/docs/work-queue.md` | Which issues `findings.md` governs, the tier labels, the architect as a writer of them | 1 |
| `AGENTS.md` | A pinned finding is read with the tool, after `findings.md` | 1 |
| `.agents/docs/documentation.md` | §8's row for `findings.md`, and §9's line | 1 |
| `.scripts/finding.ts`, `.scripts/finding.node.test.ts` | **New** | 2 |
| `.agents/docs/review-findings.md` | Where a finding that outlives its branch goes, who opens it, the series, the tier | 4 |
| `.agents/docs/documentation.md` §5.2, §6 | `(#228)` as a pointer. Findings are issues, with the current-state rule for the body and the append-only rule for amendments | 4 |
| `.agents/docs/agent-workflow.md`, `coordinator.md`, `handoff.md` | Who registers a finding, durable references, _The record stays one file_, the pinned revision in a prompt | 4 |
| `CONTRIBUTING.md`, _Reading one entry of a record_ | `#N` and the tool | 4 |
| `.claude/agents/consolidator.md` and other role definitions | The consolidator's canonical ids. The rest only where they name the series. `AGENTS.md` is in every role's context and carries the rule, so no role definition changes before that | 4 |
| `.scripts/entry.ts` and its tests | The note on frozen entries, and a check that no register claims an `RF-`, `DRF-` or `RQ-` above the frozen numbers. `--duplicates` stays for the decisions | 4 |
| `.plan/00-index.md`, `packages/drag/.plan/00-index.md` | The frozen line above the findings | 4 |
| `.github/workflows/` | None |  |
| Citations in code, tests and JSDoc | None. The 13 lines that cite an `RF-` or `DRF-` still resolve |  |

## Stages

| Stage | What | Who | Waits for |
| --- | --- | --- | --- |
| 1 | **The documents** of stage 1 above, on this branch, with `RD-56` and this plan, in one pull request. _Small_ | Implementer, then a reviewer against this plan | Nothing |
| 2 | **The tool,** on `repo/finding-tool-1`, stacked on this branch, in its own pull request. _Small_ | Implementer, then a reviewer | Nothing. It can be written beside stage 1 |
| 3 | **One real finding as a trial,** below. _Small_ | Coordinator, architect, and the unit that repairs it | Stages 1 and 2 on `main`, and **the owner's word** |
| 4 | **The cut-over:** the freeze commit, the documents of stage 4, and issues for the open entries that have none (#60). One pull request. _Medium_ | Architect for the registers, implementer for the rest | The trial's end, and **the owner's word** |
| 5 | **A look back** two weeks after stage 4: the same counts again. _Small_ | Architect | Stage 4 |

**The documents are the implementer's.** The decision is `RD-56`'s and the rules are settled below, so writing them is implementation, as `work-queue.md` was for `RD-22` (its plan's step 2). Project documentation has its own pull request, so the tool isn't in it. Stage 4's frozen lines in the registers are the architect's, because they are the record.

**The trial.**

1. It is the next new finding, after stages 1 and 2 are on `main` and the owner has approved the trial, that a unit repairs at once. The coordinator names it and creates the labels `tier:A`, `tier:B` and `tier:C`. It gets no `RF-` or `DRF-` number, and it is the only issue with a tier label. Tier A isn't excluded.
2. The main slot's architect opens the issue and runs the tool. The coordinator adds it to the board.
3. The implementer and a fresh reviewer each get `#N rM` and no copy of its text. Each reports what it couldn't find or had to ask.
4. It ends when the finding closes. The coordinator gives the owner the reports, the number of amendments, and each refusal of the tool. A trial without an amendment hasn't tried the revision rule, and the coordinator says so.
5. **If the owner stops there,** the architect registers the finding in its register from the issue's last body, removes the tier label, and `RD-56` is withdrawn with its documents and tool. Nothing else has to be undone.

## Work list for stages 1 and 2

The text is the implementer's, in [technical English](../../.agents/docs/technical-english.md). The rules and the forms aren't. A rule that can't be written as listed comes back to the architect. **Stage 1's list is as reviewed. Where [the rulings](#stage-1-the-reviews-rulings) differ from it or from the sections above, the rulings govern.**

### Stage 1: the documents

Branch `repo/findings-on-github-1`, this one.

1. **`.agents/docs/findings.md`,** with the one-line retrieval header: retrieved before reading a finding that a prompt pins as `#N rM`, and before writing one. It states these, and nothing about dates, alternatives or the trial's history:
   - **What it governs.** An issue with a `tier:` label is a finding, and its body is the finding's contract. Only the finding that `repo:RD-56`'s trial names has the label. Every other finding is registered in its scope's register, as `review-findings.md` says.
   - **The address** is `#N`, and `ausginer/material-x#N` outside the repository. A code comment may carry it as its one bare pointer. Published JSDoc never does. A commit message may name it, with no closing keyword. The title is plain words without an address.
   - **Reading.** Run `node .scripts/finding.ts <number> r<revision>` with the pinned revision. When the tool refuses or the revision is later than the pinned one, stop and report it. The body alone is the contract. An amendment explains a change and isn't a source. No other comment is part of it.
   - **The body's form,** as below.
   - **The amendment's form,** as below, and the rule that no amendment is edited after it is posted.
   - **Registering:** the architect creates the issue from the form with `Revision 0`, the `tier:` label and the `pkg:` labels, locks it with `gh issue lock`, and runs the tool. From an `unregistered` issue by the owner's account: the body is `Revision 1`, with Amendment 1, the `unregistered` label removed, then the same. An issue that another account opened is never made a finding: the architect opens a new one, and the coordinator closes the other with a link to it. Before creating one, filter the open issues locally for the same subject.
   - **Amending,** in this order: run the tool at the current revision. Edit the body with `gh issue edit --body-file`, with the next `Revision`. Post the amendment with `gh issue comment --body-file`. Run the tool at the new revision. A change of tier is an amendment, and the body then has a new revision with no other change. A refusal at any step stops the work.
   - **Writers.** The architect alone writes the body, the amendments and the `tier:` label. The coordinator writes what `work-queue.md` says and never the body: a description that no longer holds is the architect's to amend. The owner answers in chat, and the architect records the answer as an amendment, in English. An implementer or reviewer writes only its pull request or report.
   - **Trust.** Only text by `Lodin` with the architect's stamp is the contract. A stamp isn't a proof, because every agent writes as that account.
   - **Evidence,** as [above](#evidence).
   - **Closing.** Before the merge the architect comments _Accepted for closure at `<sha>`_ with what it rests on. The pull request says `Closes #N`, and the rest is `work-queue.md`'s. A finding that comes back is the same issue, reopened, with an amendment.
   - **What isn't a finding.** A ruling that changes a public surface or a package's contract is a decision in its register, and the finding's body names it. A finding that needs a plan names the plan in `.plan/`.
   - **Searching:** `gh issue list --state all --limit 1000 --json number,title,body,labels`, filtered locally for a `tier:` label.

   The body, where the description is bounded as in `work-queue.md`, the first four headings are always present, and _Not read_ and _Questions_ only when they have something:

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

   The amendment:

   ```text
   ### Amendment 1

   <what changed, why, and whose answer or review asked for it>

   > <the text it replaced, quoted, or "Nothing replaced.">

   — ARCHITECT
   ```

2. **`.agents/docs/work-queue.md`:**
   - after the opening paragraph: an issue with a `tier:` label is a finding, `findings.md` governs its title, body, amendments and reading, and the rest of `work-queue.md` still applies to it;
   - _No label states a tier_: except on such a finding, where the label is the only copy of the tier;
   - the labels table: `tier:A`, `tier:B`, `tier:C`, _the tier of a finding that `findings.md` governs, which the architect sets_;
   - _Writers_: the architect writes such a finding's body, amendments and tier, and the coordinator doesn't edit its body;
   - the statements it makes of every issue (the only record, no tier, copied into the record, the `Record:` line, the title's address) are limited to the other issues, by the first bullet or at their place.
3. **`AGENTS.md`,** beside the sentence that routes to `work-queue.md`: a prompt that pins `#N rM` names a finding. Read `findings.md`, and read the issue only with the tool. `work-queue.md` isn't needed for it.
4. **`.agents/docs/documentation.md`:** a row in §8 for `findings.md`, the row for GitHub Issues names it, and a line in §9.
5. **Nothing else.** `review-findings.md`, `agent-workflow.md`, the role definitions and `CONTRIBUTING.md` don't change, because new findings still go to the registers.
6. Checks: `handoff.md`'s Markdown checks. The pull request names `RD-56` and this plan. If an issue for the move exists, it says `Refs #N`.

The reviewer reads: each rule of item 1 is stated once and none is added, nothing outside the trial changes for an issue without a `tier:` label, and no sentence is false while the trial's finding is the only one.

### Stage 1: the review's rulings

Ruled on 2026-11-24 by the architect, on the [feature proof](../reviews/findings-on-github-1/feature-proof-claude.md) at `b8d8dce76` and the implementer's six disagreements, relayed by the coordinator. Nothing is the owner's to answer, and no property of `RD-56` changes.

**One rule replaces most of the repairs: `findings.md` says that it applies wherever another document says otherwise of a finding's issue.** A list of limited statements has to be complete, is matched by hand, and is needed again for each document. One sentence of precedence covers `work-queue.md`, `handoff.md`, `coordinator.md` and `documentation.md` §5.2. Every other sentence that a neighboring document has keeps its meaning for the other issues.

| Finding | Ruling |
| --- | --- |
| `reviewer-1` | **Accepted.** The precedence replaces the list. `findings.md` states that a finding is one issue |
| `reviewer-2` | **Accepted.** Before creation, the architect compares the subject with every issue in the list of _Searching_, unfiltered and of every state, and with the scope's register |
| `reviewer-3` | **Accepted.** A prompt about a finding pins `#N rM` and copies none of its text. `work-queue.md`'s paragraph says it, because the coordinator reads that file, and a writer reaches `findings.md` through it. No role definition changes |
| `reviewer-4` | **Accepted.** One way back, below. The label of a changed tier is set with the body's edit |
| `reviewer-5` | **Accepted.** The owner's comment still counts. Before an amendment and before the acceptance, the architect reads the issue's other comments and records the owner's as an amendment. The tool doesn't change |
| `reviewer-6` | **Accepted.** The acceptance names the revision, a later amendment needs a new acceptance, the coordinator reopens, and the issue's state is the finding's status. Without a pull request the coordinator's closing comment is as `work-queue.md` says, after the acceptance. The links to the report and the review aren't a rule: the acceptance says what it rests on |
| `reviewer-7` | **Accepted for `documentation.md` §8,** which contradicts itself. `handoff.md` and `coordinator.md` stay as they are, and the precedence covers them until stage 4. `findings.md` drops its link to §5.2: the sentence on the code comment stands alone. §5.2 changes in stage 4 |
| `reviewer-8` | **Accepted.** The `AGENTS.md` sentence is one clause, below. `work-queue.md`'s header excepts the pinned finding |
| `reviewer-9` | 1: **accepted,** the main slot's architect registers. 2 and 3: **the entry stands.** The coordinator sets `pkg:` or `repo`, as for any issue, and `findings.md` names no package label. 4: **accepted** for the meaning of `Revision N` and for the tool without a revision, which prints the current one. _One writer per body at a time_ is dropped: there is one minting architect until stage 4, and no rule enforces it |
| `reviewer-10` | 1: **accepted,** done in this commit. 2: **accepted,** the account is named once as the owner's, `Lodin`. 3: **accepted.** The whitespace is removed from the probe in this commit, and the description names the range |

**The implementer's disagreements:** 1 accepted, done in this commit. 2 accepted through the precedence, and the coordinator's comment at an answer names the amendment. 3 accepted through the writers below. 4 accepted: `unregistered` means that the observation isn't registered yet. 5 answered below. 6 **rejected**: that the numbers end is true from the cut-over and not before, and `findings.md` says what holds while the trial's finding is the only one. Stage 4 writes it.

**Why it is less:** the paragraph of limited statements goes, and no list is kept. The architect does not set package labels or remove `unregistered`, so the two documents' writers no longer disagree.

**#244 merges first,** and stage 2's pull request, which is stacked on it, is retargeted to `main` after. They needn't merge together: until stage 2 is on `main` no label exists, no prompt pins a finding, and a role that tries has no tool and stops. The trial waits for both.

#### The remediation, for the implementer

On this branch. Four files. The text is the implementer's, and the rules aren't.

1. **`findings.md`:**
   - opening: where another document says otherwise of such an issue, this one applies. A finding is one issue, from its observation to its closure;
   - _Address_: no link to `documentation.md` §5.2;
   - _Reading_: a prompt names a finding as `#N rM` and copies none of its text. Without a revision the tool prints the current one, which is how a writer or the coordinator learns `M`. The owner's account is `Lodin`, said where `Lodin` is first named;
   - _The body_: `Revision N` is the number of the last amendment, and 0 at registration;
   - _Registering_: the main slot's architect registers. Step 1 as `reviewer-2`. No `pkg:` label and no removal of `unregistered`. The coordinator does both, as `work-queue.md` says;
   - _Amending_: a changed tier's label is set with the body's edit in step 2. Before step 1, the architect reads the issue's other comments, and an owner's comment is recorded as an amendment;
   - _A fault_: a role that isn't the architect stops and reports a refusal, as now. The architect repairs it. An amendment that is out of form or of number is deleted with every later one, and they are posted again in order, each with its text. A body edited without an amendment, or by another account, gets the next revision, and the first run of the tool is left out. The next amendment, or the one posted again, names the fault;
   - _Writers_: the architect writes the body, the amendments, the `tier:` label, the lock and the acceptance. The coordinator writes the rest, as `work-queue.md` says;
   - _Closing_: _Accepted for closure at `<sha>`, revision N_. A later amendment needs a new one. Without a pull request, the acceptance comes before the coordinator's closing comment. The coordinator reopens, and the architect amends. The issue's state is the finding's status. When an answer is recorded, the coordinator's comment names the amendment.
2. **`work-queue.md`:**
   - the paragraph after the opening is replaced by: an issue with a `tier:` label is a finding, `findings.md` governs what it contains and who writes it and applies where they differ, the other rules here apply to it, and a prompt about it pins its revision;
   - the header: before reading an issue's text, except the finding that a prompt pins, for which `findings.md` is read instead;
   - _Writers_: the architect's bullet says that the architect writes a finding's issue as `findings.md` says, and that the coordinator doesn't edit its body. The sentence that other roles write only through the pull request's description names the exception with the implementer's;
   - _Labels_: `unregistered` is _The observation isn't registered yet, and the architect owes that_.
3. **`AGENTS.md`:** the added sentences become one: _To read an issue that a prompt pins as `#N rM`, read `findings.md` instead._ with its link, and nothing more.
4. **`documentation.md` §8:** the row for GitHub Issues: the work queue holds what is next and never a reason, except an issue with a `tier:` label, whose body is its contract. §9's line is as it is.
5. **#244's description:** `git diff --check` with its range, and what it no longer says. No `pkg:` text is added.

**Checks:** `handoff.md`'s Markdown checks, the root `fmt-check`, links and anchors, and `git diff --check origin/main...HEAD`.

**Recheck: owed, bounded.** By a reviewer who reads the changed sentences against this section, and that no added sentence contradicts another document for an issue without a `tier:` label. It doesn't reread item 1 as a whole.

### Stage 2: the tool

Branch `repo/finding-tool-1` from this branch's head, and its pull request's base is this branch. It changes two files, `.scripts/finding.ts` and `.scripts/finding.node.test.ts`, and no workflow: the `repo` Vitest project already includes `.scripts/**/*.node.test.ts`.

**Use:** `node .scripts/finding.ts <number> [r<revision>]`. Any other argument form prints the usage and exits 1. There is no shell wrapper and no option.

**It asks once,** with `gh api graphql`, for the issue's number, title, URL, state, body, author, editor, time of last edit, labels, and its first 100 comments with the total, and each one's author, body, creation time and time of last edit. The repository `ausginer/material-x` and the account `Lodin` are constants. Line ends are normalized before any check, because the web editor writes CRLF. An absent author or editor is `null`: an absent author isn't `Lodin`, and an absent editor means never edited.

**It prints,** when every check passes, to standard output and exits 0: `#<number> r<N> <tier label> <state> <url>`, the title, the body, and each amendment in order under a line that says amendments aren't the contract, with its time. Then one line with the number of comments left out. Other comments are never printed.

**It refuses** with exit 1, one message on standard error that names the cause, and nothing on standard output, when:

1. `gh` fails, with `gh`'s own message. A pull request's number and an unknown number fail this way;
2. the author isn't `Lodin`, or the last editor is another account;
3. the issue hasn't exactly one label of `tier:A`, `tier:B` and `tier:C`;
4. the body's last two non-empty lines aren't `Revision <N>` and `— ARCHITECT`;
5. the issue has more than 100 comments;
6. a comment by `Lodin` whose first line is `### Amendment <N>` doesn't end with the line `— ARCHITECT`, or was edited;
7. the amendments by `Lodin`, in order of creation, aren't exactly 1 to the body's `N`;
8. the body was edited after the creation of Amendment `N`, or at all when `N` is 0. Equal times pass, because GitHub's times are whole seconds;
9. a revision was given and the body's isn't that one. The message has both and says which is later.

A comment by another account is never an amendment, whatever it says.

**Tests** run the command as `cl.node.test.ts` does, with a stub `gh` first on `PATH` that prints a saved answer and fails on a call that isn't `api graphql`. One passing case each for r0, for r2 with other comments around it, for r2 with a third account's `### Amendment 3`, for CRLF, for a closed issue and for a given revision that matches. One refusing case for each of 1 to 9, two for each of 2, 6, 7 (a missing and a surplus amendment), 8 (N of 0 and more) and 9 (earlier and later), each asserting the message, the exit code and an empty standard output. Removing any one check makes a test fail, and the report says so.

**Live readings,** in the report: `node .scripts/finding.ts 228` refuses for its labels, and `225`, a pull request, refuses as `gh` fails. The order of checks is the order above. The `.ts` checks of `handoff.md` apply, with the repository-level commands.

## Questions for the owner

**Answered on 2026-11-24:** [Owner's answers](#owners-answers). The text below is as proposed.

- **Q1 — are the open entries frozen where they are?** (a) **Yes, with later text in the issue. Recommended.** (b) They stay in the registers until they close. (c) They move at once.
- **Q2 — in which language is the owner's answer on an issue?** (a) **English, as everything on GitHub is now, and the chat keeps the original. Recommended.** (b) His words quoted in Russian with a translation, as the registers do. It amends `AGENTS.md`'s rule.
- **Q3 — is a finding's issue locked to strangers?** (a) **Yes, at registration. Recommended.** A stranger can open another issue. (b) No, and the tool alone filters the comments.
- **Q4 — where does the evidence of a finding that waits go?** (a) **An append-only `evidence` branch, pushed without a pull request. Recommended.** It amends _"push the current work branch, and nothing else"_. (b) A pull request, as now.
- **Q5 — is there a backup outside GitHub's issues?** (a) **A weekly export to a workflow artifact. Recommended.** (b) None.
- **Q6 — does the proposed boundary hold?** (a) **Findings move, and decisions, plans, reviews and readings stay. Recommended.** (b) Decisions too, later, as another question.