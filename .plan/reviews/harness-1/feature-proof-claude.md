# Harness unit — feature proof

**Files were read at:** `51403a4af6511f393da2585ba05e8e85f22ece17` (`repo/harness-1`, the main checkout, clean), the head of pull request [#33](https://github.com/ausginer/material-x/pull/33). **Diff reviewed:** `d6838d0f1` (exclusive), the merge of `origin/main` at `8cf9781fa`, to `51403a4af` (inclusive). **Records read at the same commit.**

**Governing records:** [`harness-handoff.md`](../../harness-1/harness-handoff.md) items 1 to 6, its _Review before merge_ and its amendment at `51a992b49`; [`harness-report.md`](../../harness-1/harness-report.md) and its readings under [`checks/`](../../harness-1/checks/); `repo:RD-17` as amended twice, `repo:RD-18`, `repo:RD-16` property 12 and `repo:RF-48`'s _Decision_, in [`00-index.md`](../../00-index.md).

**Lens:** feature proof. Each claim below is my own reading of the tree, CI or a local probe, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: the proof holds.** Every item of the handoff is implemented as the records require, and each witness I could repeat agrees with the report. There are three Tier C findings, and none of them blocks the merge. reviewer-1 concerns the owner's configuration, not the tree: a second registration of the effort guard, which `RD-18` property 4's step doesn't name, still loads in every session in this container. The implementer's `add` and `remove` wording in `implementer.md` departs from the handoff's wording. That departure is supported by evidence and agrees with `RF-48`'s decision (_The `remove` departure_).

## Scope

**Covered.**

- The non-record diff from `d6838d0f1`, file by file: `.scripts/cl.sh` line by line, `.scripts/cl.node.test.ts` case by case, `.scripts/link-tsserver.ts`, `.claude/settings.json`, `.devcontainer/devcontainer.json`, `post-create/chown.sh`, `.oxlintrc.json`, `eslint.config.ts`, `AGENTS.md`, `CLAUDE.md`, `README.md`, the four changed documents under `.agents/docs/`, and `consolidator.md`, `coordinator.md` and `implementer.md` under `.claude/agents/`.
- The documents against `RD-17` properties 2, 4, 5, 7, 8 and 9, and against `RD-18` properties 1 to 3.
- **Runs.** I ran `cl.node.test.ts` locally in the `repo` project: 18 passed. In CI run 44090020230, at head `51403a4af`, every job succeeded or was skipped by design. Its `chromium` log shows `repo .scripts/cl.node.test.ts (18 tests)` passing.
- **The witness search** at the head (_Items that hold_).
- **Links and anchors** in every changed document outside `.plan/`, and in the report and the handoff, with a scratch script: none is broken. I also ran `git diff --check` over the reviewed range (reviewer-3).
- **The saved readings:** `cl-mutations.txt`, `tsserver-replace.txt`, `stack-procedure.txt`, `session-names.txt`, `slot-volume.txt` and `rf48-repair.txt`, against the handoff's steps.
- **Slots `b` and `c`, read-only:** their worktree entries, and `stat` of `typescript/lib/tsserver.js` and `typescript/package.json` in `b`, `c` and the main checkout.
- **The `known_hosts` rule:** `gh api meta`'s keys against `~/.ssh/known_hosts`.
- **The Claude Code configuration under `$CLAUDE_CONFIG_DIR`,** for what still loads the guard (reviewer-1).

**Not covered.** These areas are unread, which isn't the same as clean.

- I ran no `aube install`, `aube add` or `aube remove`, and no command that writes in a slot. Slot `b` holds the owner's live sessions. The volume, store and `RF-48` readings are the report's, and I checked them only against their transcripts and the current link counts.
- I didn't run `cl` against the real `claude`, and I didn't observe the resume picker. The report states the same limit.
- I didn't watch a container rebuild with an empty `_worktrees` volume.
- I didn't run `just lint`, `just fmt-check` or `just typecheck` locally. CI's `static` job runs all three at the head and passed.
- I ran no shellcheck. I read `cl.sh` instead.

## Items that hold, with no finding

- **Item 1, the search.** `git grep -nE 'effort guard|effort-guard|claude-role|harness-effort|HARNESS_EFFORT|governed role|Effort guard active|harness-orchestration'` at the head matches 19 files, all under `.plan/`. Outside `.plan/`, no match.
- **Item 1, removed.** Every path in `RD-18` property 1 is gone. `.claude/settings.json` is `{"enabledPlugins":{"typescript-lsp@claude-plugins-official":true}}`. The `.oxlintrc.json` override and all 17 camelcase names are gone, and `static` passes without them.
- **Item 1, rewritten.** `AGENTS.md` loses §Before running a governed role and its dispatch rule. §Where things are gains `cl <profile> [<slot>]`. `CLAUDE.md` §Running a role, `README.md`, `agent-workflow.md` line 30, `coordinator.md`, `.claude/agents/coordinator.md` and `consolidator.md` match the handoff's list. The no-`name`, no-`model` rule stays, with _"Nothing checks either rule at dispatch"_ in place of _"refused at the boundary"_. That is `RD-18` property 3.
- **Item 1, `cl` reads the level (`RD-18` property 2).** `cl.sh:82–92` reads `effort:` only between the frontmatter delimiters. The fixture definition puts `effort: low` in the body, so a reader that ignored the delimiters would fail the case. `cl` refuses a missing definition, a missing field and an empty field, with exit 78, and refuses a set `CLAUDE_CODE_EFFORT_LEVEL` (`cl.sh:48–51`). The test leaves that variable out of the child's environment unless a case sets it, so a value in the runner's own environment can't leak in. Six mutations each fail at least one case (`cl-mutations.txt`).
- **Item 2, `cl`'s interface (`RD-17` properties 1 to 3).**
  - The slot argument is checked against an explicit `b`–`z` list (`cl.sh:43–46`), so `B`, `bb` and `a` exit 64.
  - The mount check comes before any path is built, and `"${slots:?}/${slot:?}"` follows `AGENTS.md`'s rule (`cl.sh:61–69`).
  - A slot is created with `--detach --lock --reason 'session slot'` at `origin/main`. An existing slot is reused without any git command. The session name's letter is upper-cased.
  - `CL_SLOT_ROOT` is the only test hook. The success cases' stub `mountpoint` comes through `PATH`, which the handoff leaves to the implementer.
  - The test covers every case of witness 1.
- **Item 2, the volume and the store (`RD-17` property 9).**
  - The mount and both `AUBE_*` variables are as specified, and `chown.sh` covers the volume.
  - `link-tsserver.ts` writes `<target>.<pid>.tmp` and renames it over the target.
  - Now, in `b` and `c`, `typescript/package.json` shares one inode with 4 links, and `tsserver.js` has 1 link and holds the wrapper. The main checkout's `package.json` has 1 link, which `RD-17` property 9 accepts.
- **Item 2, the documents.** These carry what the handoff requires:
  - **`coordinator-setup.md`:** §Slots, §Session names and §Slot limits, with the slot names, `/clear` instead of renaming, `--init` once per slot and profile, the lock and the removal commands, the volume's invisibility on the host, the shared store, the rule against writing into a dependency's file, and `.claude/worktrees/`.
  - **`agent-workflow.md`:** §Parallel units and §Stacks, with the single minter, one unit per slot and one open task per session, the index kept as one file, the stack procedure with the squash-merge account, upper units waiting on decisions, and per-PR reviews.
  - **`coordinator.md`:** the per-slot summary and the count of index conflicts.

  Each statement matches its `RD-17` property.

- **Item 2, witnesses 3 and 4.** `stack-procedure.txt` shows one conflict at L05, a clean L15, and `git diff main...b` with only `b`'s L05 and L25. `session-names.txt` reads the match as exact and case-insensitive, across every worktree, sorted newest first. With more than one match, `--resume` opens the picker. Its limit, the key used for deduplication, is stated there and in `RD-17` property 2.
- **Item 3.** `AGENTS.md` §Evidence carries the counter-example word for word, in the same paragraph.
- **Item 4.** `implementer.md:23` carries the rule word for word.
- **Item 6.** `coordinator-setup.md` §Session names says that the picker lists matches newest first, and that the newest is the session `cl` means. This replaces _"the owner chooses"_, as `RD-17` property 2 is amended.
- **The `known_hosts` rule** (the owner's addition, `51403a4af`). `gh api meta --jq '.ssh_keys[] | "github.com " + .'` equals the `github.com` lines of `~/.ssh/known_hosts`, as the report says.

## The `remove` departure

The handoff's item 5 quotes the rule with _"aube 2.10.0's `add` drops the workspace links"_. `implementer.md:22` says _"aube 2.10.0's `add` and `remove` drop the workspace links"_.

- **The evidence supports it.** In `rf48-repair.txt` step 4, `aube remove left-pad` at the checkout root exits 0. Then `node_modules/@ydinjs` and `size-limit-preset-rolldown` are gone, and step 3's `aube install --frozen-lockfile --force` restores both.
- **It agrees with the decision.** `RF-48` _Required properties_ 2 already names both commands for the repair. Only the handoff's explanatory clause named `add` alone. The handoff's own instruction says to word the rule _"to match its neighbours"_. The change makes the rule's reason state what the witness showed.
- **For the architect, not a defect:** `RF-48`'s _Decision_ still says _"So the cause is aube's `add`"_ (`00-index.md:1571`). The `remove` reading is recorded only in the report's item 5. Whether the record carries it, and when `RF-48`, `RD-17` and `RD-18` stop saying _"unimplemented"_, are the architect's decisions.

## Findings

### reviewer-1 — A second registration of the effort guard still loads in every session in this container, and `RD-18` property 4's step doesn't remove it

**Tier C.** Nothing in the tree is wrong, and the guard no longer denies. The finding concerns the owner's configuration, which `RD-18` property 4 says isn't the repository's.

- **Current behaviour.** This review session started with the hook context _"Effort guard active. Role reviewer declares effort high."_ That text comes from the guard at `$CLAUDE_CONFIG_DIR/plugins/cache/devcontainer-clipboard/harness-effort-guard/0.1.0`:
  - `scripts/guard.ts:91` builds the string.
  - `$CLAUDE_CONFIG_DIR/settings.json` enables `harness-effort-guard@devcontainer-clipboard` at user scope, and `installed_plugins.json` records it as installed on 2026-10-06, version 0.1.0.
  - Its `hooks.json` runs `guard.ts` on `SessionStart`, `Stop`, `SubagentStop` and every `PreToolUse` (matcher `*`).
  - With `HARNESS_EFFORT_GUARD_MODE` now unset, `guard.ts:169` and `:351` apply no verdict. It observes and announces, and nothing more.
- **Current contract.** The owner decided that _"the effort guard is removed"_ (handoff, owner decision 3). After this unit, `coordinator-setup.md:66` and `consolidator.md` say that nothing checks the dispatch rules. `RD-18` property 4 and owner decision 1 name one cleanup step, `claude plugin marketplace remove material-x`. That step removes the `material-x` registration, not this one. No record mentions `devcontainer-clipboard` (`git grep` finds nothing).
- **Why it is a problem.** After the step that the records describe, each session still receives _"Effort guard active"_. The repository's documents no longer explain that string, and it contradicts them. Each tool call still starts a `node` process for a guard that applies nothing. A future reader could also take the string as evidence that something checks the consolidator's rules.
- **Required property.** After `RD-18` property 4's step, no effort guard loads in the owner's sessions. Otherwise, the record names every registration that the owner removes.
- **Routed** to the architect, for the owner. The configuration is outside the repository, and only the owner can change it.

### reviewer-2 — The report says that `chown.sh` runs before `setup.sh`'s install, and `setup.sh` installs nothing

**Tier C.** A record's sentence only. The property that it supports holds.

- **Current contract.** `harness-report.md:49`: _"`post-create/chown.sh` gives the volume to `node`, and it runs before `setup.sh`'s install."_
- **Evidence.** `post-create.sh` runs `chown.sh`, then `setup.sh`, then `typescript-language-server.sh`. `setup.sh`, 11 lines, makes `cl.sh` executable and links it. It runs no `aube`. The first aube command after the chown is `typescript-language-server.sh:9`, `aube add -g typescript-language-server@6.0.3`. With `containerEnv`'s `AUBE_STORE_DIR` and `AUBE_CACHE_DIR`, that command is the first to write to the volume's store. It runs after the chown, so the ordering holds.
- **Why it is a problem.** The report names the wrong step as the one that depends on the chown. A reader who checks or changes the post-create order would look at the wrong script. The step that does depend on the chown, the global add writing into the shared store, isn't recorded.
- **Required property.** The report's account of the post-create order names the step that first writes to the volume.
- **Routed** to the architect, who decides whether the report is corrected.

### reviewer-3 — The handoff's `git diff --check` fails over the unit's diff, and the report doesn't say so

**Tier C.** The lines are in captured evidence, and no instrument reads them.

- **Current contract.** The handoff's _Order_ step 8 lists `git diff --check` among the checks on every changed file. The report's _What wasn't verified_ doesn't mention it.
- **Evidence.** `git diff --check d6838d0f1..51403a4af` exits non-zero. It reports trailing whitespace on 15 lines of `.plan/harness-1/checks/guard-search.txt` (lines 27, 73, 75, 79, 87, 90, 97, 101, 119, 129, 162, 163, 167, 168 and 175), which are grep lines cut at a fixed width, and on `stack-procedure.txt:31`, a `git log --graph` line ending in `|/ `.
- **Why it is a problem.** A check that the handoff requires fails, and the report presents neither the result nor an exception. The likely reason is that trimming would change saved output. That reason is plausible, but the record doesn't state it.
- **Required property.** Either `git diff --check` passes over the unit's diff, or the record states the exception for verbatim transcripts.
- **Routed** to the architect.

## Observations, not findings

- **`cl.node.test.ts:175–185` reads the repository's own `architect.md` and `implementer.md`,** and asserts `high` and `medium`. It tests the data, not `cl`. It connects the fixture cases to the handoff's witness, _"`cl architect` passes `--effort high`"_. A legitimate change to either definition's `effort:` then fails this test as well. That cost is small and visible, and the handoff asked for those two levels.
- **`coordinator-setup.md` §Session names** implies that a picker appears after a `/clear`. `RD-17` property 2 marks this as inferred: the key used for deduplication wasn't read. The document links the reading, which states the limit, and `RD-17` property 2 holds either way.
- **The user-level settings still list `extraKnownMarketplaces.material-x`.** With `.claude-plugin/marketplace.json` removed, that entry refers to a directory with no manifest. Owner decision 1 already covers this (_"a session may report the missing marketplace"_).