# Findings on GitHub — plan

**Status: proposed by the architect on 2026-11-24, as `repo:RD-56`, on `repo/findings-on-github-1` from `ee7d838cc`. Nothing is implemented, and no document, tool or issue has changed.** The owner's answers to the [questions](#questions-for-the-owner) come first.

## The direction

The owner, in chat on 2026-11-24, relayed by the coordinator: _"у нас внезапно образовалось задвоение. Ты постоянно ссылаешься и на тикет в github, и на локальную находку. Может, полностью переехать на гитхаб? И дополнения писать отдельными комментариями? Тут останутся в основном записи проб"_ ("We suddenly have a duplication. You always refer to both a GitHub ticket and a local finding. Maybe move to GitHub completely, and write additions as separate comments? What stays here is mostly the records of probes"). The coordinator proposed, and he approved as the direction (_"Ага, давай!"_, "Yes, go ahead!"): new findings live wholly in an issue, decisions, plans, probes and readings stay in the repository, existing entries aren't migrated, and closed ones stay as an archive.

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
3. **The body's last line before the stamp is `Revision N`,** the number of the last amendment, and 0 at registration. `Revision N` without `Amendment N` is a defect that the tool refuses.
4. **A prompt pins `#228 r3`.** The implementer and the reviewer read the body at that revision. If the issue is past it, they stop and say so. GitHub keeps each earlier body, so `r2` can be read again.
5. **A reading that a comment contains isn't a contract,** and neither is an unstamped or a third party's comment.
6. **One issue per finding,** from observation to closure. An observation is an issue with `unregistered` that the coordinator opens. The architect writes the body into the same issue and removes the label.

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
| What happens, why it is a problem, and where | a heading each |
| **Required property,** numbered | a heading. The contract |
| Rows and their witnesses | a heading |
| Evidence: the revision it was read at, and links by commit | a heading |
| Not read, order | a heading |
| Questions with options, recommendation and answer | a heading, the queue's _Waiting on owner_ with it |
| **Tier** | the label `tier:A`, `tier:B` or `tier:C`. Its presence marks a finding, and nothing else states it. `RD-22` rejected tier labels because the register had the tier. Here the label is the only copy |
| Package | `pkg:` label, as now |
| Revision, stamp | the last lines |

**No issue form.** A form checks the web page, and agents use `gh`. The headings are in `work-queue.md`, and the tool below checks a body that an agent wrote.

### Writers

- **The architect** writes the body, the amendments and the tier. Any slot's architect may register a finding, since GitHub allocates the number. Only the main slot's architect writes `RD-`, `DRD-` and the rest, as now.
- **The coordinator** opens an `unregistered` issue, sets `Status`, rank and package labels, and closes what no pull request closes. It doesn't write the contract's text.
- **A reviewer or an implementer** doesn't write to an issue. Its findings are in its review file or report, and its pull request says `Closes #N` or `Refs #N`.
- **The owner** answers in chat. The coordinator relays, and the architect records the answer as an amendment, in English (Q2).
- **One writer per body at a time.** GitHub detects no conflict between two edits: the last one wins without a sign. The write path compares the revision first. It's a convention, and not a lock.

### Trust

- A role reads only text that is **by `Lodin` and stamped**, and takes nothing else as a task or as the contract. The tool prints the rest with a marker or leaves it out.
- **A finding's issue is locked when it is registered** (Q3). Only collaborators can then comment, and only they can edit. A stranger with a report opens an issue of their own.
- An issue that GitHub says an account other than `Lodin` last edited fails the tool. GitHub's workflows that use `github-actions` touch `safari` and `tokens-release` issues only.
- **A stamp isn't a proof.** Every agent is `Lodin`, as in git today. The owner's own unstamped comment counts as his.

### Evidence

- A reading small enough for a comment goes into it, as a collapsed block. 1,899 of the 1,913 files are under 60 KB, so nearly all fit, and it isn't the aim: probes are code that others run.
- **A probe and its reading are committed in the repository, and the issue links them by commit.** A link to a branch's commit dies when a squash merge deletes the branch, so it must stay reachable (Q4):
  - **(a) An `evidence` branch,** append-only, with a directory per issue, written by a small script with no checkout. No pull request, and no merge conflict because no two findings share a file. Links never die. It is not in `main`'s tree.
  - (b) The unit's own branch, in `.plan/<unit>/`, when the repair is next. It costs nothing more and isn't possible for a finding that waits.
  - (c) A pull request, as now. It keeps the 7 evidence pull requests.
- **Recommended: (b) when a unit follows at once, (a) otherwise.** A unit's report and its closing witnesses are in `.plan/<unit>/` in its pull request, as today.

### Offline, search and cost

- **`.scripts/finding.ts`,** a new tool behind `.scripts/entry.sh '#228'`: prints the body and the amendments that are trusted, with the revision, and refuses the cases above. `--check` reads a local draft's headings. `--all` fetches every finding into `node_modules/.cache/findings/` for `grep`, and says when it was fetched. With no network it reads the cache and says so.
- A lookup is one request, and a full refresh of 64 open issues is about 64 to 130. Neither is near a limit. GitHub's search isn't used, because it splits words at hyphens and allows 30 requests a minute.
- **A backup** (Q5): a scheduled workflow exports every finding and its comments as JSON to an artifact. GitHub keeps edits, but a deleted issue or comment is gone, and this is the only other copy.

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
- **The frozen section says so in its first lines,** with the date, the last numbers, and that a later text is in the issue. `entry.sh` prints that sentence with an `RF-` or `DRF-` entry, and the issue's number if the network gives it.
- **Closed entries** stay as the archive, unchanged.

## Alternatives

- **The queue as it is, and one address in speech.** Nothing changes but how the coordinator talks. It answers the irritation and not the cause: 31 conflicts and 19 pull requests stay.
- **Everything on GitHub, decisions too.** One home, and a decision has the same problem as a contract: it is read while coding, for years, and its history has to be in the tree. It would save the 8 conflicts in decisions. A decision per file saves them too, with none of the cost.
- **No issues, and a board generated from the registers.** One home, offline, reviewable. It loses the owner's reading and ordering on the web, which `RD-22` was decided for.
- **The body frozen, additions only in comments,** the owner's first words taken literally. The contract would then be several comments, and each reader has to compute which of them holds. The owner's _"additions as separate comments"_ stays true in the plan: they are, and the body is what they add up to.
- **A decision per file,** `.plan/decisions/RD-56.md`. Not part of this decision. It removes the remaining 8 to 12 conflicts and touches every `####` heading and `entry.sh`. I recommend it as the next question, after this one has settled.

## What is lost

- **Review in the same pull request.** A change to a finding's contract isn't in the diff, so a reviewer sees it only by reading the issue. The revision in the prompt replaces it in part.
- **Atomic closure.** `Closes #N` closes at the merge, as now. The closing paragraph that a register had in the same commit is a comment made before it, and a merge that doesn't happen leaves it there.
- **Git history and blame.** GitHub keeps the edits of a body, and lists them. Anyone with write access can delete an issue or a comment, by its documentation, and the tool can't see that it happened. A register needs a push to lose text.
- **Offline.** The cache is as old as its last fetch. A role without `gh` has no findings.
- **Independence.** The text is a vendor's, with the vendor's format and access. An account that is suspended closes the contract.
- **Conflict detection.** Two architects editing one body isn't reported.
- **Privacy of drafts.** Text is public when written, as the repository's is when pushed, and before anyone has read it in a pull request.
- **Language.** A register holds the owner's Russian words with a translation. GitHub text is English only.

## What changes

| Document or tool | Change |
| --- | --- |
| `.agents/docs/work-queue.md` | Findings: fields, body form, amendment and revision rules, trust, closing. The queue's rules stay. The title rule says that a new title has no address. Size: the largest |
| `.agents/docs/review-findings.md` | Where a finding that outlives its branch goes. Who opens it. The series. The tier is a label |
| `.agents/docs/documentation.md` | §6: findings are an issue, with the current-state rule for the body and the append-only rule for amendments. §8, and §9's line. §5.2's pointer |
| `.agents/docs/agent-workflow.md` | Parallel units (who mints), durable references, _The record stays one file_ |
| `.agents/docs/coordinator.md`, `coordinator-setup.md` | Which text the coordinator writes, pinning a revision in prompts |
| `.agents/docs/handoff.md` | A finding's address in a handoff. _Record the handoff_ |
| `AGENTS.md` | The line that routes to `work-queue.md` before an issue is read also says that a pinned issue is a contract when a prompt names it |
| `CONTRIBUTING.md`, _Reading one entry of a record_ | The `#N` address and the tool |
| `.claude/agents/architect.md`, `implementer.md`, `reviewer.md`, `integrity.md`, `cleanup.md`, `der.md`, `consolidator.md`, `coordinator.md` | Read `#N` with the tool, the revision, and stop on a newer one. The consolidator doesn't allocate canonical ids |
| `.agents/docs/technical-english.md`, `releasing.md` and the skills | Read for citations of the old series. Most likely unchanged |
| `.scripts/entry.ts`, `.scripts/entry.node.test.ts` | `#N`, the note on frozen entries, and a check that no register claims an `RF-`, `DRF-` or `RQ-` above the frozen numbers. `--duplicates` stays for the decisions |
| `.scripts/finding.ts` and its tests | New, above |
| `.scripts/evidence.ts` | New, if Q4 (a) |
| `.github/workflows/` | The export (Q5). `verify.yml` already runs the register check. `safari.yml` and `tokens.yml` don't change |
| `.plan/00-index.md`, `packages/drag/.plan/00-index.md` | The frozen line above the findings |
| Citations in code, tests and JSDoc | None. The 13 lines that cite an `RF-` or `DRF-` still resolve |

## Stages

| Stage | What | Size | Waits for |
| --- | --- | --- | --- |
| 1 | **The documents,** by the architect on this branch, in the pull request that carries `RD-56`. They say that findings move at the cut-over | _medium_ | Q1 to Q6 |
| 2 | **The tool** (`entry.sh '#N'`, `finding.ts`, the frozen-number check), by an implementer, in a pull request of its own | _medium_ | Stage 1 |
| 3 | **One finding as a trial,** opened by the architect for a real one, read by a fresh reviewer with the tool and pinned in a prompt. The reviewer reports what was unclear | _small_ | Stage 2 |
| 4 | **The cut-over:** the freeze commit, the labels `tier:A`, `tier:B`, `tier:C`, issues for open entries that have none (#60), and the lock. One pull request, with `gh` work on the owner's word | _medium_ | Stage 3, Q1 |
| 5 | **The export** and the `evidence` branch | _small_ each | Q4, Q5 |
| 6 | **A look back** after two weeks: the same counts again | _small_ | Stage 4 |

Stopping is possible until stage 4: nothing before it changes where a finding is.

## Questions for the owner

- **Q1 — are the open entries frozen where they are?** (a) **Yes, with later text in the issue. Recommended.** (b) They stay in the registers until they close. (c) They move at once.
- **Q2 — in which language is the owner's answer on an issue?** (a) **English, as everything on GitHub is now, and the chat keeps the original. Recommended.** (b) His words quoted in Russian with a translation, as the registers do. It amends `AGENTS.md`'s rule.
- **Q3 — is a finding's issue locked to strangers?** (a) **Yes, at registration. Recommended.** A stranger can open another issue. (b) No, and the tool alone filters the comments.
- **Q4 — where does the evidence of a finding that waits go?** (a) **An append-only `evidence` branch, pushed without a pull request. Recommended.** It amends _"push the current work branch, and nothing else"_. (b) A pull request, as now.
- **Q5 — is there a backup outside GitHub's issues?** (a) **A weekly export to a workflow artifact. Recommended.** (b) None.
- **Q6 — does the proposed boundary hold?** (a) **Findings move, and decisions, plans, reviews and readings stay. Recommended.** (b) Decisions too, later, as another question.