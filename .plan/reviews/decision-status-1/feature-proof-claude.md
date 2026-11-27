# A decision's status sentence: review of `RD-68`

**Lens:** `reviewer`, review of [#329](https://github.com/ausginer/material-x/pull/329): `RD-68`, the rule that it adds to `documentation.md` §6 with its §9 row, the pointer in `handoff.md`, and the 28 status sentences that it corrects in 18 decision files. `RD-68` governs. Requested by the coordinator on 2026-11-27. An earlier attempt at this review was lost uncommitted with the slots' volume, and this one was run again from the start.

**Commit read:** `856db95cb` on `repo/decision-status-1`, from `origin/main` `9342359bf`. Records and docs only, so no build, test or mutation applies.

**Method:** `git diff` and `git merge-base` in slot f, `gh` for the pull requests, issues and repository settings, and three Node scripts of mine, saved with their output in [`feature-proof-claude-checks/`](feature-proof-claude-checks/). The scripts ran from my scratch directory. No tracked file was edited except this record and that directory.

## Scope

**Covered:**

- each of the 28 added sentences: the pull request and commit it names, that the commit is on `main` at the base, that the pull request implements what the sentence says, and that no word of the original sentence was removed;
- the six decisions that `RD-68` lists as still true;
- every decision file's status paragraph, and every paragraph that opens with _"\*\*Amended"_, scanned for wording other than `RD-68`'s searched phrases, with each match read;
- the rule in `documentation.md` §6, its §9 row and the `handoff.md` pointer, against `RD-64`, `.agents/docs/work-queue.md`, `AGENTS.md` and `RD-68`'s own unit;
- every relative link and anchor in `RD-68.md`, `documentation.md`, `handoff.md` and the 18 changed files, and `RD-68`'s one link to a pinned commit.

**Not covered:** dated notes beyond the paragraphs above, unless a match led to them; the decisions of packages other than drag, which have none; `RD-52` and `RD-60`, which `RD-68` leaves to #321.

## Results

**The 28 corrections are correct** ([checks](feature-proof-claude-checks/corrections.txt), [pairings](feature-proof-claude-checks/pairings.txt)).

- The diff adds 28 fragments marked _"added 2026-11-27"_, in the 18 files that `RD-68` names. The word diff removes no word from those files.
- The 20 pull requests that they name are merged on the dates given, and each named commit is the pull request's merge commit and an ancestor of `9342359bf`.
- Each pull request implements what its sentence says. Where the branch alone doesn't show it, I read the commits or the workflow:
  - `RD-12`'s two Safari amendments: #27's Safari commits;
  - `RD-12`'s _Tab_ bullet: #29's `b70c6bb35`;
  - `RD-14`'s feature-proof amendment: #30's docs-smoke remediation commits;
  - `RD-28` steps 2 and 3: #87's title;
  - `RD-31`'s seventh amendment: registered on #99's branch;
  - `drag:DRO-18`: `verify.yml` at `275ad0f5c` has a `safari` job running `test-safari` over the `*/safari` projects, and at `8cf9781fa` a `webkit` job over `*/webkit`.

**The leftovers** ([checks](feature-proof-claude-checks/leftovers.txt)):

- These are still true:
  - `RD-29` is _"deferred by the owner … Not executed"_.
  - `RD-56`'s stage 4 isn't approved.
  - `RD-63` is in force only at the cut-over. #297, which records it, says _"nothing here is in force before `RD-56`'s cut-over"_.
  - `drag:DRD-59` is withdrawn. Its surviving property 8 is a rule that needs no code.
  - `drag:DRD-70` is deferred.
- `drag:DRD-23` isn't still true: see `proof-3`.

**Missed staleness: none found** ([sample](feature-proof-claude-checks/sample.txt)).

- The status-paragraph scan matched 50 files, and the amendment scan matched 8 paragraphs. Each match is one of these:
  - a sentence that `RD-68` corrects;
  - a sentence answered by a later sentence or dated note in its file, which is `RD-68`'s criterion for _Already current_;
  - a status that is still true;
  - not a status.
- Two of these are answered but not named in `RD-68`'s lists:
  - `RD-26`'s three amendments of 2026-11-20 are answered by the dated note _"the three amendments of 2026-11-20 are implemented, by PR #85 … Their *Unimplemented* lines are answered"_.
  - `RD-27`'s 2026-11-20 amendment still says _"#81, not yet merged"_. `RD-68` counts `RD-27` as current by its status paragraph of 2026-11-22.
- `RD-48`'s status is _"The site unit implements it."_ That is still true: the base has no `packages/site`, and #54 is open.

**Links** ([output](feature-proof-claude-checks/links.txt)): 180 relative links and their anchors resolve, among them `documentation.md#a-decisions-status` and `handoff.md#record-the-handoff`. The script's one other hit is `RD-26`'s code `[Symbol.hasInstance](o)`, which is not a link and is unchanged since the base. The pinned link to `ee41855dc`'s `use-sortable-1/feature-proof-claude.md` resolves on GitHub.

**`RD-64`:** consistent. Its property 2 made drag's status row _"the paragraph after its decision's heading"_, which is where `RD-68` property 1 puts a status. `drag:DRO-18`'s corrected sentence is in its third paragraph, where that status already was.

## Findings

### Local id `proof-1` — the rule forbids a merge commit in a status, and all 28 corrections name one

**Tier B.** Routed to the architect: the rule's text and its exemplars disagree, so its scope is the architect's call.

- **Current text:** `documentation.md` §6 says _"**The sentence names no merge:** no "not yet merged", no "when #N merges", and no merge commit."_ `RD-68` property 3 says the same.
- **Observed:** every one of the 28 added fragments names its merge commit, such as _"**Implemented** by #27, merged 2026-11-16 as `275ad0f5c`"_. `RD-68`'s table also lists _"#24, `3228d1f07`"_.
- **Why it is a problem:** the reason for property 3 is that the implementing branch can't know its merge. That reason doesn't cover a sentence written after the merge, and the corrections are true. But the rule states no such scope, and the only examples in the tree are the corrections. An implementer who copies them breaks the rule's words. A reviewer who reads the words has 28 findings in this very unit.
- **Evidence:** [corrections.txt](feature-proof-claude-checks/corrections.txt), the fragment list; [rule.txt](feature-proof-claude-checks/rule.txt), §6's sentence.
- **Required property:** the rule and the sentences written under it agree on whether a status written after the merge may name the merge commit.

### Local id `proof-2` — the branch form reaches `main`, and nothing replaces it with `#N`

**Tier B.** Routed to the architect: it is about the rule's form and its consistency with `work-queue.md`.

- **Current text:** the implementer adds _"**Implemented** by #N"_, _"or "on `<branch>`" while the pull request has no number yet"_, and _"`#N` leads to the merge"_. No sentence says who replaces the branch form with `#N`, or when.
- **Observed, in this unit:** `856db95cb` was committed at 11:04:53Z, and #329 was opened at 11:05:13Z. So `RD-68`'s own status says _"**Implemented** on `repo/decision-status-1`"_. If #329 merges at this head, that is the sentence on `main`.
- **Why that is the usual case:** `AGENTS.md` lets an agent open the pull request _"once a unit is finalized and pushed"_, so the implementing commit normally comes before the number. The repository has `delete_branch_on_merge: true`, so on `main` the branch name leads to no branch. The review rule, _"leaves its status unimplemented"_, doesn't apply to the branch form, so no review is owed a finding for it.
- **Consistency:** `work-queue.md` counts _"the slot and branch that hold it"_ as queue state, and says _"The record holds no queue state."_ A status that names the implementing branch, kept as the status after the merge, records that queue fact.
- **Evidence:** [rule.txt](feature-proof-claude-checks/rule.txt).
- **Required property:** a status on `main` names the pull request that implemented its decision, and the rule says who makes that true when the implementing commit precedes the pull request's number.

### Local id `proof-3` — `drag:DRD-23` is listed as still true because `DRF-7` is open, and `DRF-7` is closed

**Tier C.** For the architect, with `RD-68`.

- **Current text:** `RD-68`'s _Still true_ lists _"`drag:DRD-23` (`DRF-7` is open)"_.
- **Observed:** `DRD-23`'s status paragraph says the check _"isn't implemented: `DRF-7` is open under it"_. It then says _"`DRF-7` closed at `f50f4a35a`"_ and _"The last bullet is applied in full."_ The drag register has `DRF-7` as _"Tier B, **closed at `f50f4a35a`**"_, and `f50f4a35a` is an ancestor of the base.
- **Why it is a problem:** `DRD-23`'s status is current. It belongs with `RD-68`'s _Already current_, and the reason `RD-68` gives for listing it is false. Nothing else depends on the list, so the tier is C.
- **Evidence:** [leftovers.txt](feature-proof-claude-checks/leftovers.txt).
- **Required property:** `RD-68`'s audit states each decision's status as its file and register have it.

**No other finding.** `handoff.md`'s pointer names the rule where an implementer reads before committing, as `RD-68` property 6 says.

## Verdict

**The 28 corrections are accepted.** Each is true, and each keeps its original sentence. My sample found no stale status that the audit missed. The audit misclassifies one decision that was already current (`proof-3`, Tier C).

**The rule has two Tier B findings for the architect,** `proof-1` and `proof-2`. `proof-2` already holds for `RD-68`'s own status at this head.

## Closure

Ruled by the architect on 2026-11-27, at `3a40b6908`. `RD-68`'s amendment of 2026-11-27 holds the reasons and what properties 2 and 3 said before.

| Finding | Ruling | Changed |
| --- | --- | --- |
| `proof-1` | **Closed.** The rule's words are narrowed to its reason: the implementing branch names no merge, because it can't know it. A sentence written after the merge, as an audit's, names the merge it read, and its form is stated. The 28 corrections stand as accepted. | `RD-68` property 3 and _Not adopted_; `documentation.md` §6 and its §9 row |
| `proof-2` | **Closed.** The branch form is withdrawn. The implementer adds _"**Implemented** by #N"_ in a commit after it opens the pull request, and until then the sentence stays unimplemented, so §6's existing review clause has a finding if the number is never added. `RD-68`'s own status now says #329. | `RD-68` property 2, its status and _Not adopted_; `documentation.md` §6; `handoff.md`'s pointer |
| `proof-3` | **Closed.** `drag:DRD-23` moves to _Already current_, with `DRF-7`'s closure at `f50f4a35a`. `RD-26`'s three amendments of 2026-11-20, which the review found answered and unlisted, are named there too. | `RD-68` _Not changed_ |