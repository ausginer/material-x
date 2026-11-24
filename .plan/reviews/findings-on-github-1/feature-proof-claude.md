# Findings on GitHub, the documents — feature proof, `RD-56` stage 1

**Files were read at:** `b8d8dce76` (`repo/findings-on-github-1`, slot `f`, clean, equal to `origin`, pull request #244). **Diff reviewed:** `2990a5add` to `b8d8dce76`, and the merge `2990a5add`. Documents only.

**Governing records, at the same commit:** `repo:RD-56` in [`00-index.md`](../../00-index.md), and the [plan](../../findings-on-github-1/findings-on-github-plan.md), with the work list _Stage 1: the documents_.

**Lens:** feature proof. The implementer's six disagreements were not read. Nothing is repaired, and no record is amended.

**Verdict: each rule of the work list's item 1 is in `findings.md`, and items 2 to 4 are in their documents, with one gap against item 2 (`reviewer-1`). There are ten findings, all Tier C. Two (`reviewer-1`, `reviewer-2`) are in the text against the plan. The other eight follow from the plan or are shared with it, and go to the architect.** An implementer and a reviewer can execute a pinned finding. A coordinator can't (`reviewer-3`). An architect can in the ordinary case and can't after a fault (`reviewer-4`).

## Scope

**Covered:** `findings.md` against item 1, rule by rule; `work-queue.md` sentence by sentence against item 2; the `AGENTS.md` addition; `documentation.md` §8 and §9; the note in the plan; the merge; `coordinator.md`, `coordinator-setup.md`, `agent-workflow.md`, `handoff.md`, `review-findings.md`, and the definitions of the architect, coordinator, implementer, reviewer and consolidator.

**Not covered:** the tool, which isn't written (`.scripts/finding.ts` doesn't exist on any branch read). Its checks are taken from the plan's stage 2. GitHub's behavior on a locked issue, and `gh issue edit` and `gh issue comment`, were not run, because the task writes nothing to GitHub. `.github/ISSUE_TEMPLATE` doesn't exist, so there is no template to compare.

## Item 1, rule by rule

| Rule | In `findings.md` | Reading |
| --- | --- | --- |
| What it governs | Opening | Matches. Adds that `work-queue.md` governs the place in the queue, which item 2 says |
| Address, title, code comment, JSDoc, commit | _Address_ | Matches. The cited authority for the code comment doesn't allow it yet, `reviewer-7` |
| Reading | _Reading_ | Matches |
| Body's form | _The body_ | Matches the form. Adds what a question holds, and that nothing else states the tier. Both are in the plan's _Fields_ table, not in item 1 |
| Amendment's form | _The amendment_ | Matches. Adds _A correction is the next amendment_, from the plan's contract, clause 2 |
| Registering | _Registering_ | Matches, and expands _then the same_ correctly. `reviewer-2`, `reviewer-9` |
| Amending | _Amending_ | Matches. `reviewer-4` |
| Writers, Trust, Evidence, Closing | Their sections. Trust is in _Reading_ | Matches. `reviewer-5`, `reviewer-6` |
| What isn't a finding, Searching | Their sections | Matches. `reviewer-2` |

The three additions restate accepted text of the plan. They aren't findings.

## Findings

### reviewer-1 — `work-queue.md`'s list of limited statements is not complete

**Tier C.** Against item 2, last bullet.

- **Current behavior.** The paragraph at `:7` says that the rest of the document still applies to a finding, and lists the statements that hold for other issues only. These statements are in neither the list nor the four things that `findings.md` governs:
  1. `:92`, the coordinator moves the item _with a comment that names the record commit_. A finding's answer is an amendment, and there is no record commit.
  2. `:20`, _One entry can produce several issues in sequence_. `RD-56` property 1 is that a finding is one issue. `findings.md` doesn't state that property, and only says that a finding that comes back is the same issue.
  3. `:45`, after the architect registers an observation the coordinator _removes the label_. `findings.md` `:77` gives that to the architect. Only the title's address, in the same sentence, is limited.
  4. `:72`, _Roles write to the queue only through a pull request description_, and _the exception_ is an implementer. The architect's new bullet at `:70` is a second exception. It names the body, the amendments and the tier, and not the creation of the issue, the lock, the `pkg:` labels or the closing comment, which `findings.md` assigns to the architect.
- **Why it is a problem.** Both documents apply to one issue, and they give a writer two instructions.
- **Also.** The list's eight short paraphrases must each be matched to a sentence elsewhere. _"that the record is the only one"_ doesn't say the only what, and the last clause joins two statements with _or_.
- **Required property.** For an issue with a `tier:` label, no sentence of `work-queue.md` that still applies contradicts `findings.md`, and a reader can tell which sentences apply.

### reviewer-2 — the search for a duplicate is linked to a filter that can't find one

**Tier C.**

- **Current behavior.** _Registering_, step 1 (`:72`), says to filter the open issues for the same subject and links _Searching_. _Searching_ lists issues of every state and filters them for a `tier:` label.
- **Evidence.** The command run on 2026-11-24 returns 121 issues, 68 open and 0 with a `tier:` label. Followed literally, the step reads an empty list. An `unregistered` issue, or one with an `RF-` address, has no tier label and is never compared.
- **Also.** A finding that comes back is a closed issue (`:110`), and step 1 looks at open ones only, so its duplicate isn't found. Findings in registers aren't searched at all. These two follow the plan.
- **Required property.** The check before creation compares the new subject with every issue that could already be about it.

### reviewer-3 — no document tells the coordinator to pin a revision

**Tier C.** Routed to the architect: the plan's item 1 has the rule only in the retrieval header.

- **Current behavior.** _A prompt pins `#N rM`_ is clause 4 of the plan's contract and `RD-56` property 2. In the documents it is only a condition for a reader: `findings.md`'s header and `AGENTS.md`. Nothing says that a coordinator's prompt must pin it, that the prompt doesn't copy the text, or where the coordinator learns the current `M`. The coordinator definition and `coordinator.md` name `work-queue.md` and not `findings.md`. `agent-workflow.md`'s _Prompt format_ says _input revision, canonical records_.
- **Why it is a problem.** A prompt that says `#N` alone doesn't trigger the `AGENTS.md` sentence. The role then reads `work-queue.md` and may read the issue with `gh`.
- **The same for a writer.** `findings.md` is retrieved _before writing one_, and no role definition or resident file has that edge (`documentation.md` §3). An architect reaches it only through the paragraph inside `work-queue.md`.
- **Required property.** Each role that must pin, read or write a finding is led to the rule by a document it already reads.

### reviewer-4 — after some faults a finding can't be repaired by the stated rules

**Tier C.** Routed to the architect: the plan's stage 1 and stage 2 give this together.

- **Current behavior.** _Nobody edits an amendment after it is posted. A correction is the next amendment_, and _A refusal at any step stops the work_ (`:68`, `:90`). The plan's tool refuses an amendment without its stamp, an edited amendment, a number that is missing or surplus, and a body edited after its amendment.
- **Counterexamples, by reading the plan's checks, not run.**
  1. Amendment 2 is posted without `— ARCHITECT`. Check 6 refuses the issue. Amendment 3 doesn't remove the fault, and an edit of Amendment 2 is also refused.
  2. Amendment 4 is posted at revision 2. Check 7 refuses, and nothing that may be posted makes the sequence 1 to N.
  3. Someone edits the body without an amendment. Check 8 refuses. _Amending_ begins with a run of the tool, which refuses, so the work stops before the amendment that would repair it.
- **Also.** When a tier changes, the order of the label change among the four steps isn't stated.
- **Required property.** A writer's fault has a stated way back to a finding that the tool accepts, or a stated owner of that decision.

### reviewer-5 — an owner's comment on a finding has no route to its reader

**Tier C.** Routed to the architect: the plan's _Trust_ section has the rule, and its work list doesn't.

- **Current behavior.** `work-queue.md` `:77` still applies: an unstamped comment from the owner's account _counts as his if he writes one_. The plan says the same. The rule that carries such a comment into the record (`:13`) is now limited to other issues. `findings.md` says only that the owner answers in chat, that no other comment is part of the contract, and, with `AGENTS.md`, that the issue is read only with the tool. The plan's tool never prints other comments.
- **Why it is a problem.** The owner's comment counts, and the architect who should record it doesn't see it.
- **Required property.** What the owner writes on a finding either doesn't count, by a rule, or reaches the architect before someone acts on the finding.

### reviewer-6 — closing isn't tied to a revision, and its remaining steps have no actor

**Tier C.** Routed to the architect: the plan has the same form.

- **Current behavior.** The acceptance comment names `<sha>` and not a revision. An amendment after the acceptance and before the merge leaves an issue that `Closes #N` closes with an unaccepted contract. Nothing has a role run the tool again after the start of its work.
- **Also.** `findings.md` doesn't say who reopens an issue, and `work-queue.md` doesn't either. The plan's closure without a pull request (_the coordinator's closing comment names the commit or the reason_) and its _links the report and the review_ aren't in the work list or the document. `findings.md` doesn't say that the issue's state is the finding's status, after `work-queue.md`'s rule to the contrary was limited.
- **Required property.** The closed contract is the accepted one, and each step of closing and reopening has a named writer.

### reviewer-7 — sentences in neighboring documents are false for the trial's finding

**Tier C.** Routed to the architect: item 5 forbids the edits until stage 4, and the work list's review rule is that no sentence is false while the trial's finding is the only one. The two disagree for:

| Sentence | Against |
| --- | --- |
| `handoff.md` `:82`, _A role writes to the queue only this way_, the pull request's description. The architect reads it before each finalization | The architect writes the issue, its amendments and the closing comment |
| `coordinator.md` `:37`, the queue holds _never a decision or a reason_ | The body has _Why it is a problem_ |
| `documentation.md` §8, the changed row: _never a reason_, then a body that is a contract with a reason. This one is inside the diff | Itself |
| `documentation.md` §5.2, a bare pointer is _an index entry into the record_, and the example is `(D-74)` | `findings.md` cites this section as what permits `(#N)`, which isn't in the record. §5.1's list of identifiers that JSDoc may not carry doesn't have `#N` |

- **Required property.** Either each such sentence is limited for the trial's finding, or the contradiction is accepted and named with stage 4 as its end.

### reviewer-8 — the `AGENTS.md` addition is ambiguous, and half of it repeats `findings.md`

**Tier C.** Routed to the architect, whose item 3 dictates the text.

The addition is 195 bytes, resident in every context. Each part:

| Part | Needed there |
| --- | --- |
| A prompt that pins `#N rM` names a finding: read `findings.md` | Yes. It is the only edge, and it must hold before a role opens the issue |
| Read the issue only with the tool that it names | Not shown. _Reading_ in `findings.md` says it, and the role has read that file. It helps only a role that opens the issue before the file |
| `work-queue.md` isn't needed for it | Needed, because the sentence before it requires `work-queue.md` before an issue's text is read. As written it is ambiguous |

- **Current behavior.** _it_ can be the finding, the reading or the whole task. A role with a pinned finding that then writes a pull request description that names the issue, or an architect that amends, does need `work-queue.md`, by that file's header. An architect needs it for the description's bounds and the stamps. The header of `work-queue.md` still says _before reading an issue's text_ with no exception.
- **Required property.** The exception covers reading the pinned finding, and nothing that the role writes.

### reviewer-9 — who registers, and with which labels, differs from `RD-56`

**Tier C.** Routed to the architect: the work list and the entry differ, and the document follows the work list.

1. `RD-56`'s table: until the cut-over, _the main slot's architect_ for the trial's issue. `findings.md` and item 1 say _the architect_. `agent-workflow.md` allows architects in other slots.
2. `RD-56` property 4: the coordinator writes package labels. `findings.md` `:73` and item 1 give them to the architect, and `work-queue.md` `:69` gives labels to the coordinator.
3. `findings.md` names `pkg:` labels only. `work-queue.md`'s label for a repository-level item is `repo`, so a repository-level finding has no label by the rule.
4. The meaning of `Revision N`, the number of the last amendment, is clause 3 of the plan's contract. `findings.md` shows `Revision 0` and `Amendment 1` in two forms and doesn't state the relation that the tool checks. The optional revision of the tool (`[r<revision>]`), which an architect needs when no revision is pinned, isn't named either. _One writer per body at a time_ from the plan isn't in the work list or the document.

- **Required property.** The entry, the plan and the documents name the same writer, and the document states each rule that the tool enforces.

### reviewer-10 — the plan's two authorization statements, and wording

**Tier C.**

1. The plan's status line says that stages 1 to 3 are authorized, that stage 1 is next, and that no document has changed. The added note says that the owner approved the start of stages 1 and 2. Whether stage 3 is authorized now isn't clear. `RD-56` still says _unimplemented_. The note is the only change outside items 1 to 4, and it is in the architect's record.
2. `findings.md` uses two names for one account. `Lodin` is never said to be the owner's account, which _Registering_ names.
3. The pull request's description lists `git diff --check` as a check. It passes on the stage's diff. On the whole branch, `git diff --check origin/main...HEAD` fails once: `.plan/findings-on-github-1/probes/record-only.py.txt:2`, trailing whitespace, from `87c55405f`. `.gitattributes` exempts `checks/` and not `probes/`.

- **Required property.** One statement of what is authorized, one name for the account, and a check result that states its range.

## The merge

It conflicted in `.plan/00-index.md` alone, and the result keeps both sides.

- The lines that `main` adds and removes since the base `ee7d838cc` (306 and 3), and those that the merge brings to the branch, are the same multiset (equal hashes, sorted).
- Against `main`, the merge adds the branch's 37 lines and removes none. Every other file equals `main`'s or is the branch's own.
- `RD-53` then `RD-56` read in order. `entry.ts --duplicates`: _no duplicated address in drag, repo_.

## Verification

- Root `just fmt-check`: exit 0, before this report and with it.
- Links and anchors of the five changed Markdown files by a scratch script (GitHub-style slugs): none broken.
- `git diff --check 2990a5add b8d8dce76`: clean. The whole branch is in `reviewer-10`.
- `gh api user`: the account is `Lodin`. `gh issue list --state all --limit 1000 --json number,title,body,labels` runs.
- Markdown only, so lint, types and tests don't apply.

## Next

The architect rules on `reviewer-3` to `reviewer-9` and item 1 of `reviewer-10`. `reviewer-1`, `reviewer-2` and the rest of `reviewer-10` can be routed with the ruling on the implementer's disagreements.