# Findings on GitHub, the documents — the remediation's recheck, `RD-56` stage 1

**Files were read at:** `3840b2abc` (`repo/findings-on-github-1`, slot `f`, clean, equal to `origin`, #244). **Diff reviewed:** `7a8db0665` to `3840b2abc`, with the merge `4c32723ad`. The first round is [`feature-proof-claude.md`](feature-proof-claude.md), by another reviewer, and the local ids continue from it.

**Against:** the plan's [rulings](../../findings-on-github-1/findings-on-github-plan.md#stage-1-the-reviews-rulings) and remediation list.

**Verdict: the remediation list is executed completely and nothing is added to it. The precedence sentence leaves no contradiction for an issue with a `tier:` label, both placements are sound, and the merge is right. There are three findings, all Tier C.** A coordinator and an architect can execute a finding in the ordinary case. After a fault an architect can in the cases that the rulings name, and not in four others (`reviewer-11`). `reviewer-11` and `reviewer-12` follow from the rulings' own text and go to the architect. `reviewer-13` is the wording of one phrase.

## The rulings, one by one

| Ruling | Stated in | Reading |
| --- | --- | --- |
| `reviewer-1`, precedence | `findings.md` opening; `work-queue.md` second paragraph | Complete. The list of limited statements is gone |
| `reviewer-2`, duplicates | _Registering_ 1, _Searching_ | Complete: unfiltered, every state, and the register. The command returns 123 issues, 0 with a `tier:` label |
| `reviewer-3`, the pin | _Reading_; `work-queue.md` second paragraph | The list's items are complete. `reviewer-12` |
| `reviewer-4`, a fault | _A fault_, _Amending_ 2 | As ruled. `reviewer-11` |
| `reviewer-5`, the owner's comment | _Amending_, _Closing_ | Complete |
| `reviewer-6`, closing | _Closing_ | Complete: the revision, a new acceptance, who reopens, the status, and no pull request |
| `reviewer-7` | `documentation.md` §8; _Address_ without §5.2 | Complete. §9, `handoff.md` and `coordinator.md` unchanged, as ruled |
| `reviewer-8` | `AGENTS.md`, `work-queue.md`'s header | Complete, and the sentence is the ruled one |
| `reviewer-9` | _Registering_, _The body_, _Reading_ | Complete. No package label is named as the architect's |
| `reviewer-10` | _Reading_; #244 | Complete |
| Disagreements 1 to 6 | `work-queue.md` _Writers_ and _Labels_; _Writers_ in `findings.md` | Complete. The rejected 6 isn't written |

**Nothing beyond the rulings.** The rewritten punctuation of `work-queue.md`'s header keeps its meaning. `A refusal at any step stops the work` is replaced by the two sentences on a refusal.

## The precedence

I read each sentence of `work-queue.md`, `handoff.md`'s _Publish the branch_, `coordinator.md`, `agent-workflow.md` and `documentation.md` §5 and §8 that is false for a finding's issue. `findings.md` says otherwise of each, so it applies: the record, the tier, the address in the title, one entry in several issues, the `Record:` line, the description's editor, the question's editor, the answer's comment, and the state against the entry's status. The two statements of precedence agree.

For an issue without a `tier:` label no sentence changes its meaning, except for the ambiguity of `reviewer-13`. `unregistered` says the same as before for a register's entry.

## The two placements

- **The coordinator's comment that names the amendment, under _Writers_: sound.** It is about an answer and not a closing, it follows the sentence on the owner's answer, and it differs from `work-queue.md`'s _Waiting on the owner_, so it applies.
- **_A role that isn't the architect stops at a refusal and reports it_: sound.** It is the ruling's text. _Reading_ step 2 still tells every role to stop and report, and _A fault_ then gives the architect the next step.

## The merge and #244

- **The merge** conflicts with nothing that it loses: the lines that it adds to `00-index.md` are those of `eddf39e7b` to `f9729a393`, and against `f9729a393` the branch differs in its own 13 files only. `RD-56` and `RD-57` follow in order. `entry.ts --duplicates`: none.
- **#244's description** is true of `3840b2abc`. It names the range of `git diff --check`, and has no `pkg:` text. No issue has the move as its subject, so no `Refs` is owed.

## Scope

**Covered:** the above. **Not covered:** item 1 of the work list as a whole, as the plan says; the tool, which is on no branch on `origin`. Its checks 4, 6, 7 and 8 were modeled from the plan's stage 2, and the repairs run against the model ([readings](checks/fault-model.txt), [script](probes/fault-model.mjs)). GitHub wasn't written to. CI on `3840b2abc` was still running: `scope`, `static`, `docs` and `measurements` had passed, and the three engines had not ended.

## Findings

### reviewer-11

**Tier C.** _A fault_ leaves four cases without a repair that the tool accepts.

- **Contract:** the first round's `reviewer-4`: a writer's fault has a stated way back to a finding that the tool accepts, or a stated owner. The architect is the stated owner, so the property's second half holds.
- **Observed,** in the model. Amendments without a stamp, and a body edited without an amendment under its old number, are repaired as stated. These aren't:

  | Fault | By the text | What the model accepts |
  | --- | --- | --- |
  | **The work stopped between steps 2 and 3:** body r3, amendments 1 and 2 | _Gets the next revision_. After the body that is r4, refused: 3 is missing. After _the last amendment_ it is r3 | Amendment 3, with or without another edit |
  | **A surplus amendment:** posted twice, or posted with no edit of the body | _Deleted … posted again_, refused again with any number | The surplus one deleted and not posted again, or the body amended with it |
  | **An edited amendment** | Not named: it is in form and in number. _Nobody edits_ has no repair | As bullet 1 |
  | **A body out of form,** such as a lost stamp, also at r0 | Not named. Putting the stamp back is refused as an edit after the last amendment | As bullet 2, with the first run left out |

- **Also.** A number posted wrong is repaired only if it is corrected, and _each with its text_ doesn't say that the number changes. The tool also refuses a missing or a second `tier:` label, and a failure of `gh`, and neither is a fault of the two kinds.
- **Why it is a problem.** The first is the ordinary interruption of a session, and one reading of the text makes it worse. The first round named the edited amendment and the surplus one.
- **Required property.** For each of these states, the stated steps end in a finding that the tool accepts, or the text says that the architect chooses the repair.
- **Route:** the architect. The document has the ruling's text.

### reviewer-12

**Tier C.** The rule for a prompt is where the coordinator isn't led to read it.

- **Current behavior.** The ruling on `reviewer-3` is that a prompt pins `#N rM` **and copies none of its text**, and that `work-queue.md`'s paragraph says it. The remediation list, and the paragraph, have the pin alone. _Copies none of its text_ and how to learn `M` are only in `findings.md`, whose header is _before reading a finding that a prompt pins, and before writing one_. A coordinator that writes a prompt, moves an item after an answer, closes or reopens does neither.
- **What leads there:** the coordinator reads `work-queue.md` in full, and it says that `findings.md` applies where they differ. So a coordinator that follows the link finds all of it.
- **Required property.** The document that the coordinator reads sends it to `findings.md` for a finding's prompt and for its other acts, or states the rule.
- **Route:** the architect, because the ruling's table and its list differ.

### reviewer-13

**Tier C.** In `work-queue.md`, _a finding's issue_ can be read as an issue about a register's finding.

- **Current behavior.** _The architect writes a finding's issue … The coordinator doesn't edit its body_ and _The exceptions are the architect on a finding's issue_ lost the qualifier _that `findings.md` governs_. The same file uses _finding_ for a register's entry: in the opening paragraph, and in the title rule with `repo:RF-59` as its example. `findings.md` has the same in _A finding is one issue_, two sentences after _Every other finding is registered in its scope's register_.
- **Why it is a problem.** Of 123 issues, none has a `tier:` label and 48 of the 70 open titles have an `RF-` or `DRF-` address. Read so, the coordinator may not edit their bodies.
- **What limits it:** the second paragraph defines a finding by its label, and the first bullet says _as `findings.md` says_.
- **Required property.** The sentences are true for an issue without a `tier:` label however _finding_ is read.
- **Route:** the implementer. The phrase is in the ruling too.

## Observations, no finding

- **_A comment of the owner's is recorded as an amendment_** doesn't say _unless it already is_. The next amendment reads the same comments.
- **The link for _removes `unregistered`_** goes to `work-queue.md#labels`. The sentence about the removal is under _Issues_, beside _puts the address in the title_, which the precedence sets aside.
- **Which architect amends** isn't in `findings.md`, which says that the main slot's registers. `agent-workflow.md` gives amending to the main slot's, for a record identifier. The rulings dropped _one writer per body_ for that reason.

## Verification

- Root `just fmt-check`: exit 0, with this report and its probe.
- Links and anchors of the four documents and the plan by a scratch script: 50, none broken. This report's links were checked the same way.
- `git diff --check origin/main...HEAD` at `3840b2abc`: clean.
- Markdown only, apart from the probe, so lint, types and tests don't apply.

## Next

The architect rules on `reviewer-11` and `reviewer-12`. `reviewer-13` can go with that remediation. None of them blocks stage 2. The first case of `reviewer-11` can occur in the trial.