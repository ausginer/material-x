# Work queue on GitHub Issues — plan

**Status: proposed, for the owner.** Nothing is written to GitHub, and no identifier is minted. Written by the architect on 2026-11-18 at `377ca72df` (`origin/main`), on `repo/work-queue-1`, on the coordinator's task. The owner has agreed to try the change. The decision below is proposed as `repo:RD-22`. The main slot's architect registers it in [`00-index.md`](../00-index.md) after the owner accepts this plan.

## Problem

[`00-index.md`](../00-index.md) and the package records hold decisions, findings, evidence and reasons, and they work. The queue does not have a home. The queue is what is next, in what order, what waits on the owner and what is not urgent. Today it exists only in the coordinator's session and in chat. It was nearly lost twice: once when sessions crashed, and once when a second coordinator process stayed alive. The owner sees his pending questions only in a terminal.

The owner's direction, as relayed: plan in GitHub, _"with tickets and all that"_. The owner added a constraint during this task, as relayed: everything on GitHub is in English and follows the rules for pull requests. Only the owner and the coordinator talk in Russian, and that text never reaches GitHub.

## Readings

Read by the architect on 2026-11-18 with `gh` and `git`:

- **The repository** `ausginer/material-x` is public. Issues are enabled. Projects and Discussions are disabled.
- **Accounts.** `gh` is authenticated as `Lodin`, the only collaborator, with the scopes `gist`, `read:org` and `repo`. It doesn't have the `project` scope. So every agent's write to GitHub uses the owner's account, and a reader can't tell the owner's text from an agent's by author.
- **Merges** are squash only. The squash commit message is `COMMIT_MESSAGES`, the branch's commit messages, not the pull request description. A merged branch is deleted (`delete_branch_on_merge`).
- **Labels:** GitHub's nine defaults, plus `record-baselines` and `safari`, which workflows use.
  - `baselines.yml` runs when a pull request gets `record-baselines`, and removes the label afterwards.
  - `safari.yml`: a failing scheduled run comments on the open issue labelled `safari`, or opens one when none is open (`.github/workflows/safari.yml:123`–`:127`). So **any open issue that has the `safari` label receives the next failure's comment.**
- **Issues:** one, #32, opened by `github-actions` with `safari`, closed. **Milestones:** none.
- **Issue dependencies:** `GET /repos/ausginer/material-x/issues/32/dependencies/blocked_by` returns `[]`. So GitHub's _blocked by_ relation is available on this repository.
- **Open pull requests:** #37 (`repo/declarations-check-1`, slot `b`) and #38 (`repo/ci-deps-1`, the main checkout).
- **The record is spread over unmerged branches.** `main` registers entries up to `RF-56` and `RD-19`. `RF-57` is on `repo/declarations-check-1`, `RF-58` and `RD-21` are on `repo/ci-deps-1`, `RF-59` and the correction of `RF-40` are on `repo/host-has-fallback-1`, and `RF-60` and `RD-20` are on `repo/traits-plugin-1`. The highest numbers on any branch are `RF-60` and `RD-21`.

The last reading is the main reason for the split below. A record entry exists on its branch until that branch merges. An issue exists in one place for all branches, from the moment it is created. A queue must answer _"what is next"_ across all slots at once, so it can't live in a file that each branch has its own copy of.

## Decision, proposed as `repo:RD-22`

**GitHub Issues are the repository's work queue. The `.plan/` records stay the only record.** An issue says what is to be done, in what order, whom it waits on and where it is in progress. It never says why. These properties hold:

1. **An issue holds queue state only.** That is the work item, its order (labels and milestone), whom it waits on, the slot and branch that hold it, and whether it is done. An issue doesn't hold a decision, a reason, evidence or a tier.
2. **An issue names its record entry by qualified address, and copies nothing from it.** The title opens with the address and then states the work in the queue's own words, for example `repo:RF-59 — Detect :host:has() support on first use, not at import`. The entry's title isn't copied, because records retitle entries. When the entry is on an unmerged branch, the body names that branch or its pull request, because the link to `main`'s file resolves only after the merge.
3. **At most one open issue has a given address as its subject.** Before a writer creates an issue, it lists the open issues and filters their titles for the exact address locally. GitHub's search isn't used for this check, because `repo:` is a search qualifier and search splits `RF-59` at the hyphen. One entry can produce several issues in sequence, for example a reading and then a repair, but only one is open at a time.
4. **The record holds no queue state.** A new entry doesn't state an order, a priority or a schedule. Phrases such as _"lowest priority"_, _"unscheduled"_ and _"not urgent"_ go on the issue as labels. A dated routing fact stays in the record, such as _"routed to the owner"_, and so does the architect's analysis of consequence and priority within a tier. Existing entries aren't rewritten, because the record is append-only.
5. **What first appears on GitHub is copied into the record before anyone relies on it.** An owner's answer in an issue comment, or a workflow's failure report, is a source. The architect records it in the owning entry and cites the issue's URL. The record's copy rules. An issue is never the only place where a decision or a reason exists.
6. **A work item that has no entry yet** is either a task with no decision or finding behind it, such as a roadmap item, or an observation not yet registered. A roadmap item's body says that the unit which takes it plans it in `.plan/`. An observation gets the `unregistered` label, and the body states it in one or two sentences. The architect registers it, and then the coordinator puts the address in the title and removes the label.
7. **Writers.**
   - **The coordinator** is the routine writer. It creates issues, edits them, sets labels and milestones, comments, and closes issues that no pull request closes. It writes on the owner's direction, or on a role's closing message that proposes a queue change.
   - **The owner** sets the order and may create, edit or close any issue. The coordinator applies an order that the owner states in chat.
   - **Roles** write to the queue only through a pull request description: `Closes #N` when the pull request completes the work item, `Refs #N` when it only advances it. A role's report may propose queue changes. It doesn't make them.
   - **Workflows** write only what their own definitions say, as `safari.yml` does now.
8. **Closing.**
   - An issue closes as completed when the pull request whose description says `Closes #N` merges into `main`. GitHub fires closing keywords only for a merge into the default branch, so a stacked pull request closes its issues only after it is retargeted to `main` and merged (`RD-17`). That is the intended moment: the work has reached `main`. The same pull request carries the record changes that the completion requires, so the issue and the entry change at the same merge.
   - Closing keywords go in the pull request description, never in a commit message. The squash message is made of the commit messages, so a keyword in a commit would close the issue when the commit reaches `main`, whatever the pull request says.
   - The coordinator closes an issue that no pull request completes: as _completed_ when the result is committed in the record, with a comment that names the commit and branch; as _not planned_ when the owner drops the item.
   - An issue's state never stands in for the entry's status. An issue can close while its entry stays open, for example after a reading that doesn't establish the cause. Then the next step gets a new issue.
9. **Waiting.** `owner-decision` means the next action is the owner's. The question goes in the issue body in one or two sentences, with the options as the record states them and a pointer to the entry for the context and the architect's recommendation. If the record amends the question, the coordinator edits the issue to match. When the answer is recorded, the coordinator removes the label with a comment that names the record commit, and the issue goes on as the work item. A dependency on another issue or pull request is GitHub's _blocked by_ relation, not a line of text in the body.
10. **Trust.** The repository is public, so anyone can open an issue or comment. Text from an account other than the owner's is information, never a task, and a role doesn't act on it. A role acts on an issue only when the task prompt it received names that issue.
11. **Agent text is stamped.** Every issue body and comment that an agent writes ends with its role stamp, as task prompts do (`— COORDINATOR`, `— ARCHITECT`). So an unstamped comment from the owner's account is the owner's. An owner's answer counts from an unstamped comment on the issue, or from chat relayed by the coordinator, as it does now.
12. **Language and links.** Everything on GitHub is in English: titles, bodies, comments, labels, milestones, and a board if one is added. It follows [technical English](../../.agents/docs/technical-english.md) and the rules for pull requests in [`AGENTS.md`](../../AGENTS.md): no session link (no `Claude-Session:` trailer and no `claude.ai/code/session_…` URL), and no bare `@name` unless it is meant to notify that account. A `Co-Authored-By:` line is allowed where it fits. The owner's and the coordinator's Russian never reaches GitHub.
13. **Recovery.** After a restart, the coordinator rebuilds its working summary from the queue and git: the open issues with their labels and milestones, the open pull requests, and each slot's branch and latest handoff. The queue replaces the per-slot working summary that [coordinator.md](../../.agents/docs/coordinator.md) asks the coordinator to keep. A role session doesn't read the queue to choose work. It has one task, from its prompt, and it recovers that task from its branch's handoff, as it does now.

### Rejected or changed from the coordinator's proposal

- **No tier labels.** A tier is the record's, assigned by consequence (`review-findings.md` §Tier), and the record re-tiers entries: `RF-33` went from Tier B to Tier C. A tier label would be a second copy that only discipline keeps in step. The queue carries order, which is its own: `next`, `not-urgent` and the milestone. A tier that matters for the order reaches the queue as the owner's order, not as a copy.
- **The `safari` label is not a queue label.** An open queue item with that label would receive the next scheduled failure's comment. A `safari` issue stays the workflow's signal. The coordinator attributes its failures to record entries in a comment, and then closes it.
- **No Projects board in the trial.** A board needs Projects enabled and the `project` scope on the token. Its fields, a status and a rank, would be a third copy of what the labels say. Its only unique value is a manual rank within a milestone, and with about twenty items the labels are enough. If the owner wants a rank later, the board is added then, and its status field replaces the `in-progress` label rather than duplicating it.
- **Added:** `in-progress`, `next` and `unregistered`, the stamp rule (property 11) and the trust rule (property 10).
- **Kept:** `owner-decision`, `not-urgent`, package labels, one milestone per release, and `Closes #N` in pull request descriptions.
- **Open pull requests get no issue.** #37 and #38 are their own queue items, and recovery lists open pull requests. An issue for each would be a second item for one unit, and its `Closes` would need an edit to an existing description. A unit that starts from now on starts from an issue.

## Labels and milestones

| Label | Meaning |
| --- | --- |
| `owner-decision` | The next action is the owner's: a question or a choice |
| `next` | The owner has ordered this item to be taken next |
| `not-urgent` | Taken when nothing else is ready |
| `in-progress` | A unit holds the item; a comment names the slot, branch and base |
| `unregistered` | The observation has no record entry yet; the architect owes one |
| `pkg:core`, `pkg:material-x`, `pkg:drag`, `pkg:box-quad`, `pkg:tproc` | The package whose code changes |
| `pkg:build-tools` | `vite-traits-plugin`, `vite-custom-element-assets` or `size-limit-preset-rolldown` |
| `repo` | Repository-level: CI, the harness, the record tooling |

An item without `next` or `not-urgent` is in the normal queue. GitHub's default labels, `record-baselines` and `safari` are unchanged, and the queue doesn't use them.

Milestones, one per first release: **`box-quad first release`**, **`drag first release`** and **`material-x first release`**. The owner may rename them to versions. A milestone has no due date unless the owner sets one. An owed item whose deadline is a release, such as `RD-20`'s browserslist, belongs to that release's milestone. The milestone is the queue's form of that deadline.

## Where the rules live

| Document | Change |
| --- | --- |
| **New:** `.agents/docs/work-queue.md` | Operation. Properties 1–13 as current-state rules, the labels and milestones, the body form, and the recovery commands. The single home of the issue rules, including property 12. |
| [`AGENTS.md`](../../AGENTS.md) | The bullet on session links covers issue text too, and states that everything written to GitHub is English. This file is resident, so every role that touches GitHub has the rule. |
| [`handoff.md`](../../.agents/docs/handoff.md) §Publish the branch | One paragraph: a pull request description names its issue with `Closes #N` or `Refs #N`, never in a commit message. Link to `work-queue.md`. Implementers read this file when they finalize. |
| [`coordinator.md`](../../.agents/docs/coordinator.md) | Read `work-queue.md`. Recover state from the queue as well as git. The per-slot working summary becomes the `in-progress` issue and its comment. The queue is not a decision ledger. |
| [`agent-workflow.md`](../../.agents/docs/agent-workflow.md) §Recovering state | The durable part of the working summary is the queue. The `.agents/codex/` note stays a convenience. |
| [`documentation.md`](../../.agents/docs/documentation.md) §8, §9 | A row: GitHub Issues are the work queue, what is next and whom it waits on, never a reason (`work-queue.md`). A change-record line. |
| `.claude/agents/coordinator.md` | One line: the coordinator maintains the queue as `work-queue.md` says. Its writes to GitHub are within its authority. |
| [`00-index.md`](../00-index.md) | `RD-22`, registered by the main slot's architect: this decision. |

**Why a new document.** `coordinator.md` is read by the coordinator only, `agent-workflow.md` is read by no role at runtime, and `handoff.md` is retrieved when a role finalizes. The issue rules have several readers: the coordinator, every role that writes a pull request, and the owner. Each of those three documents names `work-queue.md` at the point where its reader needs it.

## Body form

```text
Record: `repo:RF-59`, registered on `repo/host-has-fallback-1`, not yet on `main`.
Step: <only when the issue is one step of the entry, one sentence>

— COORDINATOR
```

For `owner-decision`, the question and its options follow the `Record:` line. For a roadmap item: `Record: none yet. The unit that takes it plans it in .plan/.` For `unregistered`: the observation in one or two sentences. Nothing else goes in the body. A short body is how property 2 is kept.

## First population

Proposed. The coordinator listed the items. The architect proposes titles, labels and milestones. The owner sets `next`.

| Subject | Title (after the address) | Labels | Milestone | Note |
| --- | --- | --- | --- | --- |
| `repo:RF-40` | Close on the reading, or on rows that pass in all three engines? | `owner-decision`, `pkg:material-x` | material-x | The correction is on `repo/host-has-fallback-1` (slot `c`). The architect recommends the rows. That branch holds the planned witness. |
| `repo:RF-59` | Detect `:host:has()` support on first use, not at import | `pkg:material-x` | material-x | Tier A in the record. Observed at `abfc843a8`. |
| `repo:RF-60` | Make the flattener's brand row print its generated modules, then reproduce the failure | `pkg:build-tools` | — | On `repo/traits-plugin-1`. |
| `repo:RF-44` | Items 2 and 3: flatten method traits, and measure the per-class form | `pkg:build-tools`, `in-progress` | — | **Added by the architect.** Slot `d`'s unit. It waits on #37 (_blocked by_). |
| `repo:RF-36` | Read the Safari landing stall in the unskipped `useReorderable` rows | `pkg:core` | — | Outside the gate. No `safari` label (above). |
| `repo:RF-41` | Make the visual layer see a state layer, or state that it can't | `repo`, `pkg:material-x` | — |  |
| `repo:RF-45` | Measure material-x's public entries, with budgets or a recorded manual procedure | `pkg:material-x`, `repo` | material-x |  |
| `repo:RF-49` | Split `.oxlintrc.json` into a generated file and a hand-written file | `repo` | — | Decided and not implemented. |
| `repo:RF-55` | Make `rolldown` a peer of the two Vite plugins, or narrow their public types | `pkg:build-tools` | — |  |
| `repo:RF-57` | Stop a transformer trait's class field from shadowing a subclass accessor | `pkg:core`, `not-urgent` | — | On `repo/declarations-check-1`. Its entry says _"lowest priority, unscheduled"_, which becomes the label. |
| `repo:RF-48` | Read whether aube 2.10.1 still removes the workspace links after `aube add`, then decide on an upstream report | `repo` | — | The report is a public write to another project, and it is the owner's choice (`RF-48` property 4). |
| `repo:RD-20` | Write material-x's browserslist query | `owner-decision`, `pkg:material-x` | material-x | On `repo/traits-plugin-1`. The owner writes the query. |
| unregistered | `createContext` throws outside a secure context | `pkg:core`, `unregistered` | — | See below. |
| none | Move agents' LSP to TypeScript 7's own language server, and remove `link-tsserver.ts` | `repo`, `not-urgent` | — | A task, not a defect: see below. |
| none | Landing page | `repo` | — | Roadmap. |
| none | Documentation and examples | `repo` | — | Roadmap. It may be split per package when a unit takes it. |
| none | Release `@ydinjs/box-quad` | `pkg:box-quad`, `owner-decision` | box-quad | The release needs the owner's authorization (`coordinator.md`). |
| none | Release `@ydinjs/drag` | `pkg:drag`, `owner-decision` | drag | As above. |
| none | Release `@ydinjs/material-x` | `pkg:material-x`, `owner-decision` | material-x | As above. |
| none | Triage the open record entries that no issue carries | `repo` | — | **Added by the architect.** See below. |

Issues without an address in the table get titles without one.

**`createContext`, read by the architect at `377ca72df`.** `createContext` returns `crypto.randomUUID()` (`packages/core/src/controllers/useContext.ts:33`–`:35`). The JSDoc says it requires HTTPS. `material-x/src/button-group/button-group-context.ts:25` calls it when the module loads. `randomUUID` exists only in a secure context, so on a page served over plain HTTP from a host other than `localhost`, importing the button group module throws. That is **inferred** from the code and the platform's secure-context rule. It was not observed. It is a finding, not a task. The issue opens with `unregistered` (property 6), and the main slot's architect registers the entry, proposed as `repo:RF-61`. The tier is that architect's call: a consumer who serves over plain HTTP observes an import failure, which is Tier A unless the JSDoc's requirement counts as part of the contract. The coordinator named `getRandomValues` as the repair. The entry states a required property, that `createContext` works in every context a page can run in, and leaves the repair to the unit.

**The LSP item,** on the coordinator's description of 2026-11-18. The repository typechecks with TypeScript 7. The `typescript-lsp` plugin that agents use for symbol questions runs TypeScript 6's tsserver. The `typescript` dependency is the `@typescript/typescript6` wrapper, which ships no `lib/tsserver.js`, so the `postinstall` script `.scripts/link-tsserver.ts` writes one that forwards to `@typescript/old` (the script's own comment says this, and `RD-17` and `RD-19` name the script). The work is to move agents' LSP to TypeScript 7's language server, so that the script and the TypeScript 6 dependency for LSP can be removed. Nothing is wrong today, so it is a task with no entry, and the unit that takes it plans it in `.plan/`. The owner marked it _"not urgent at all"_, as relayed, and expects that this work or an upstream change (the TypeScript team or VoidZero) will settle it. If an upstream change settles it, the coordinator closes the issue as _not planned_ with a comment that names the upstream change.

**The triage item.** The coordinator's list doesn't carry every open entry on `main`. Entries whose status line on `main` reads open include `RF-4`, `RF-8`, `RF-12`, `RF-21` to `RF-28`, `RF-30`, `RF-33`, `RF-46`, `RF-47` and `RF-51` to `RF-56`. Some are closed by work in flight: `RF-51` and `RF-54` by #37. Many date from `drag2`, which `RD-5` deleted. This list comes from the first status line of each entry, not from a reading of each entry. So the architect reads each one, records a closure where one is due, and proposes an issue for each one that is still owed. Nothing open is left unqueued without a reason.

## Owner questions

1. **Accept the plan as a trial?** In particular: no tier labels and no board (above).
2. **Milestones:** are the three names right, in the order box-quad, drag, material-x? Do the landing page and the documentation belong to a release's milestone?
3. **`next`:** which items to take next. The architect recommends `RF-59`, the only Tier A item, and an answer to `RF-40`, which keeps slot `c`'s branch parked.
4. **Answers on GitHub:** do you want to answer `owner-decision` issues in English comments, or keep answering in chat? Both count (property 11).

## Implementation

In this order, each step after the previous one is accepted:

1. **Registration.** The main slot's architect registers `RD-22`, and `RF-61` when accepted, in [`00-index.md`](../00-index.md). This is not done on this branch.
2. **Documents.** An implementer on `repo/work-queue-1` writes `work-queue.md` and the changes in [Where the rules live](#where-the-rules-live). A reviewer checks them against this plan's properties.
3. **GitHub.** After the owner accepts the documents, the implementer creates the labels and milestones and then the issues, from the [first population](#first-population) as the owner amends it. The coordinator then sets _blocked by_ for `RF-44` on #37. The implementer saves the readback in `.plan/work-queue-1/checks/`: `gh label list`, the milestones, and `gh issue list --state all --json number,title,labels,milestone,body`.

**Verification of step 3**, from the readback:

- every title and body is English, and none contains `claude.ai/code` or `Claude-Session`;
- every address in a title resolves with `.scripts/entry.sh` on `main` or on the branch that its body names;
- no address is the subject of two open issues;
- no queue issue has the `safari` label;
- every body that an agent wrote ends with a stamp.

**Not owed now:** a checking script. Property 3 and the record split are kept by the writers and checked by the readback. If the trial shows drift, a small check is the next step: open issues whose entry is closed on `main`, and duplicate addresses.

## Proposed identifiers

- `repo:RD-22` — this decision.
- `repo:RF-61` — `createContext` outside a secure context, if the main slot's architect registers it.

Both are the next free numbers across all branches at the readings above. The main slot's architect confirms them when registering.