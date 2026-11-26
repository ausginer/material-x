# The coordinator reads each role session's context size, and the owner clears it between units

**Status: decided 2026-11-26 as `repo:RD-67`,** in [`.plan/00-index.md`](../decisions/RD-67.md), on the owner's [answers](#questions-for-the-owner) of the same day. **Where this plan and `RD-67` differ, `RD-67` applies.** The documents changed in the same pull request: [coordinator-setup.md](../../.agents/docs/coordinator-setup.md) §Direct send step 5 and §Context readings, and [the coordinator's role definition](../../.claude/agents/coordinator.md) §Sessions. SC-4, SC-5, SC-6 and the section on idle compaction are amended below to the answers, and each amendment says what the text said. (**Amended 2026-11-26 by `RD-67`.** This paragraph began: _"**Status: proposed, waiting for the owner's answers**"_, and ended: _"The main architect mints them as one `RD` after the answers ([Identifiers](#identifiers)). Nothing outside this directory changes until then."_)

Written by the architect on `repo/session-context-1`, from `origin/main` at `b523011b6`, on the coordinator's task of 2026-11-26. The labels `SC-1` to `SC-7` are local to this plan ([Identifiers](#identifiers)).

**Where it comes from:**

- **The owner's question,** relayed by the coordinator: can a session's used context be read, and can the coordinator clear it without him. His words, translated: _"I don't much like how destructive autocompact is: it fires in the middle of a session. I'd rather do this more carefully, between tasks... But all the rest — yes, it can be done. My status line already works, by the way."_
- **His rulings:** no autocompact in the design, so no `--autocompact` and no `autoCompactWindow`. The rest of Mx Architect Explainer's proposal (A, B and C below) is approved for an architect to design.
- **The explainer's reading of the Claude Code documentation** at 2.1.332: nothing lets one session or a script clear or compact another, and a cross-session message's text is never run as a command. So the clear stays the owner's keystroke. This plan doesn't revisit it.

## What was read

All readings were taken on 2026-11-26 with Claude Code 2.1.332, in this container.

**The status line's payload, captured.** A probe session in slot b ran with `--settings` replacing the status line by [`capture.sh`](checks/capture.sh), which appends each payload to [`statusline-payloads.jsonl`](checks/statusline-payloads.jsonl). The owner's configuration wasn't touched. The session was started with `--name 'Mx Probe Statusline'` and a first prompt. After the reply, `/clear` was typed, then a second prompt. The four payloads show:

1. **`session_name` is in the payload** and is the `--name` value. The documentation says the same: the field is the custom name from `--name` or `/rename`, otherwise the AI-generated title, and it is absent when neither exists. So the explainer's open point, mapping `session_id` to a name, needs no transcript and no file of Claude Code's own: the name comes with the number.
2. **`/clear` keeps `session_name` and gives a new `session_id`** (`58a74a0c…` before it, `e84bc56f…` after it). This agrees with [coordinator-setup.md](../../.agents/docs/coordinator-setup.md#session-names): _"`/clear` gives the new session the cleared one's title"_.
3. **The status line runs as soon as the session starts and as soon as `/clear` is done,** with `total_input_tokens: 0` and `used_percentage: null`. The next payload comes after the next API response. So a file keyed by the session's name shows the clear at once.
4. **`total_input_tokens` is the sum of `current_usage`'s input fields** (45,200 = 2 + 19,500 + 25,698). `context_window_size` is 1,000,000 for this model, and `used_percentage` is that sum over the size, rounded (5).
5. **A fresh session's floor is 45,200 to 51,200 tokens** in this repository: the system prompt, the instructions and one short exchange.
6. **`transcript_path` names a file that may not exist.** Neither probe session's transcript was written, and so a resume of the cleared session failed with _"No conversation found"_ ([`resume.txt`](checks/resume.txt)). The design doesn't depend on transcripts. **Not read, as a result:** the payload of a session resumed by `cl`. The documentation says `session_name` is the `--name` value of a resumed session too.

**The documentation, read the same day** (`statusline.md`, `hooks.md`, `settings.md`, `settings-reference.md` on code.claude.com):

- **When the status line runs:** at session start and resume, after each new assistant message, after `/compact`, and at a few other events. Updates are debounced by 300 ms. **A new update cancels a script that is still running,** so a writer must never leave a half-written file.
- **No hook carries the context size.** `hooks.md` has no `context_window` and no `total_input_tokens`. The status line is the only documented carrier.
- **A project's `statusLine` overrides the user's.** The precedence is managed, command line, project local, shared project, user.
- **Idle compaction** ([below](#idle-compaction-isnt-part-of-this-design)).

**The owner's configuration, read and not changed.** `~/.claude` and `CLAUDE_CONFIG_DIR` (`/agents/claude`) are one directory, mounted from the host. `settings.json` sets `statusLine` to `bash ~/.claude/statusline-command.sh`, which prints the model, effort, agent and `context_window.total_input_tokens`, and writes nothing. It also sets `autoCompactEnabled: true` and, for `claude-opus-5-5`, `autoCompactWindow: "auto"`, and doesn't set `idleCompaction`.

**What the probe left.** No transcript and no file under `~/.claude/sessions/` names the probe. The owner's settings enable Remote Control at startup, so claude.ai may list a session named `Mx Probe Statusline`. It can be deleted there, and nothing depends on it.

## The design

### SC-1 — The status line writes one file per session name

**Each status line run writes `<config>/ctx/<session_name>.json`,** where `<config>` is `${CLAUDE_CONFIG_DIR:-$HOME/.claude}`, and replaces the previous file. A `/` in the name becomes `_`. A payload without `session_name` writes nothing. The file holds these fields of the payload, and the time of the write:

```json
{
  "session_name": "Mx Implementer B",
  "session_id": "e84bc56f-f66b-4b96-9f3c-6b7773402ca1",
  "transcript_path": "/agents/claude/projects/-workspaces-worktrees-b/e84bc56f-….jsonl",
  "cwd": "/workspaces/worktrees/b",
  "written_at": 1795689063,
  "context_window": {
    "total_input_tokens": 51200,
    "context_window_size": 1000000,
    "used_percentage": 5
  }
}
```

**The writer writes a temporary file in the same directory and renames it,** so a run that Claude Code cancels leaves the previous file whole.

**Why the name, and not the `session_id`, as the file's name.** The coordinator knows a session by its name: `ListAgents` and `SendMessage` use it, and [coordinator-setup.md](../../.agents/docs/coordinator-setup.md#session-names) makes each live session's name unique. Reading 2 shows that a clear keeps the name and changes the id, and reading 3 shows that the file then says 0 at once. A file per id would leave the pre-clear file with its large number beside the new one. The coordinator would have to pick the newest file for a name, and the files would accumulate, one per clear.

**Why these fields.** `total_input_tokens`, `context_window_size` and `used_percentage` are what the owner asked about. The `session_id` shows a clear even after the next reply, by changing. `cwd` shows the slot. `written_at` tells a fresh reading from an old one. `transcript_path` is there for diagnosis only (reading 6). `remaining_percentage` is 100 minus `used_percentage` and is left out. Cost, rate limits and the rest aren't the coordinator's.

### SC-2 — The writer is the owner's, in his own status line script, and the repository documents its format

**The owner adds the lines below to `~/.claude/statusline-command.sh`,** after its `input=$(cat)`. Nothing in the repository's `.claude/settings.json` changes. Tested on the four captured payloads ([`writer.txt`](checks/writer.txt), [`writer-lines.sh`](checks/writer-lines.sh)):

```bash
# Session context for the material-x coordinator: one file per session name.
ctx_name=$(echo "$input" | jq -r '.session_name // empty' | tr '/' '_')
if [ -n "$ctx_name" ]; then
  ctx_dir=${CLAUDE_CONFIG_DIR:-$HOME/.claude}/ctx
  mkdir -p "$ctx_dir"
  ctx_tmp=$(mktemp "$ctx_dir/.tmp.XXXXXX")
  echo "$input" | jq '{session_name, session_id, transcript_path, cwd,
      written_at: (now | floor), context_window: (.context_window
      | {total_input_tokens, context_window_size, used_percentage})}' \
    > "$ctx_tmp" && mv -f "$ctx_tmp" "$ctx_dir/$ctx_name.json"
fi
```

His display doesn't change. Sessions that are already running take the new lines at their next status line run, without a restart (`statusline.md`: _"If you edit your script, the changes appear the next time an update trigger re-runs it"_).

**Why not a tracked script wired from the project's `.claude/settings.json`.** A project's `statusLine` overrides the user's. A tracked one would replace the owner's line in every session of this repository. It would also give every clone of a public library a status line that writes into the user's Claude directory, for a coordinator that only the owner runs. The data and its only reader are on his machine.

**Why not a tracked writer that his script calls.** His script is global, across all his projects, and a call would tie it to one checkout's path. Also, the writer is eleven lines.

**Why not the transcript.** Its format is internal, and finding a session's transcript by name needs a second internal file, `~/.claude/sessions/<pid>.json`. Reading 6 also shows a transcript that was never written. The status line payload is documented and carries the name.

**What the repository owns:** the file's location and fields (SC-1) and these lines, in [coordinator-setup.md](../../.agents/docs/coordinator-setup.md) ([SC-6](#sc-6--the-documents-text)). When the owner changes the lines, he changes that section too.

### SC-3 — The coordinator reads the file of the session whose closing message arrived

**When a role's closing message arrives, the coordinator reads that session's file with one command:**

```sh
jq -r '"\(.session_name): \(.context_window.total_input_tokens) tokens, \(.context_window.used_percentage // 0)% of \(.context_window.context_window_size), session \(.session_id[0:8]), written \(now - .written_at | floor) s ago"' \
  "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/ctx/Mx Implementer B.json"
```

(**Amended 2026-11-26 by `RD-67`.** The command in [coordinator-setup.md](../../.agents/docs/coordinator-setup.md#context-readings) prints no percentage and no window size, because the coordinator compares tokens with 300,000 and tells the owner no size. The one above is the plan's.)

**A reading is valid when it was written after the coordinator sent the task.** An older file, or no file, is "no reading": the session hasn't run its status line since the owner's change, has no name, or runs on another machine. The coordinator then says so once and doesn't ask the session.

**The reading may be one reply behind.** A role sends its closing message with `SendMessage`, which is a tool call, and its turn ends with one more reply. A reply adds a few thousand tokens to a context of hundreds of thousands, which doesn't change what the reading is for.

### SC-4 — At the end of a unit, the coordinator tells the owner and holds that session's next unit

**Amended 2026-11-26 by `RD-67` properties 4 and 5, on the answers to Q1 and Q2.** The hold is adopted (Q1). The message names no size: _"Mx Implementer B: the unit is closed, the session can be cleared"_ (Q2: _"контекст упоминать не надо"_). Inside a unit, the 50% threshold and the mention of a size are replaced: **a closing message whose reading shows more than 300,000 `total_input_tokens` makes the coordinator tell the owner that the session can be cleared, and hold that session's next task the same way.** The paragraphs below are the text as proposed. The example said _"555k (55%), /clear before the next unit"_, and the third paragraph's rule and its _"holds nothing"_ no longer apply.

**At a closing message that ends the session's part of a unit, the coordinator tells the owner in one line,** in the owner's language, before it routes that session anything else. For example, _"Mx Implementer B: the unit is closed, 555k (55%), /clear before the next unit"_. A unit's end is the boundary at which [coordinator-setup.md](../../.agents/docs/coordinator-setup.md#session-names) already says to clear the session. So the coordinator reminds the owner at every unit's end, whatever the size, and adds no threshold there.

**The coordinator then holds that session's next unit** until one of two things happens: its file shows the clear, which is a `session_id` other than the one in the reading or a `total_input_tokens` of 0, or the owner tells it to send anyway. It checks the file when it next acts, for example on the owner's next message, and doesn't poll. It routes the other sessions' work meanwhile. **Without the hold, the boundary disappears:** the coordinator sends the next unit at once, the session is busy again, and the owner's only chance to clear is in the middle of a task, which is what he wants to avoid.

**Inside a unit, at a task boundary,** such as an architect's plan waiting for the owner's answers or an implementer between remediation passes, the coordinator mentions the size only when `used_percentage` is at least 50, and holds nothing. Clearing there loses context that the unit's next task can use ([coordinator-setup.md](../../.agents/docs/coordinator-setup.md#manual-relay): _"Reuse a related architect or implementer session while its context is useful"_), so it is the owner's choice. The 50 is the architect's proposal ([Q2](#questions-for-the-owner)): the sessions measured today were at 34 to 55%.

**Never in the middle of a task.** The coordinator mentions a size only at a closing message, which ends a task.

### SC-5 — The coordinator's own size

**At each owner checkpoint, the coordinator reads its own file,** `Mx Coordinator.json`, and tells the owner that it can be cleared when the file shows more than 300,000 `total_input_tokens`. (**Amended 2026-11-26 by `RD-67` property 6, on the answer to Q2.** This said: _"and mentions its size when `used_percentage` is at least the same 50."_) Its continuity is in the repository and the work queue on GitHub, so after a clear it recovers its state as [coordinator.md](../../.agents/docs/coordinator.md) says.

### SC-6 — The documents' text

**Amended 2026-11-26 by `RD-67`.** The documents carry the text as this pull request writes it, which follows `RD-67` properties 4 to 6: a session can be cleared at a unit's end or past 300,000 tokens, with no size, and the hold applies to both. The drafts below were written before the answers and are kept as proposed. They are not the text.

**[coordinator-setup.md](../../.agents/docs/coordinator-setup.md) §Direct send, step 5, becomes:**

> 5. Clear a session whenever you choose. The coordinator can see each session's context size, from the file that your status line writes (§Context readings below), and can't clear it. At the end of a unit, it tells you the session's size and holds the session's next unit until it sees the clear or you tell it to send. A cleared session keeps accepting the coordinator's prompts, so step 3's message is not sent again.

**A new section, `## Context readings`, after §Direct send,** holds SC-1's location and fields, SC-2's lines and the reason they are in the owner's script, SC-3's command, and the limits below. About twenty lines.

**[The coordinator's role definition](../../.claude/agents/coordinator.md) §Sessions,** whose paragraph _"You cannot read another session's context size or clear it … Send the next task without waiting for a clear; the owner clears a session at their own discretion"_ contradicts SC-3 and SC-4, becomes:

> You can read a role session's context size, and your own, from the file that the owner's status line writes (coordinator-setup.md §Context readings). You can't clear a session: `/clear` sent with `SendMessage` arrives as text. When a closing message ends a session's part of a unit, read its file and tell the owner its size in one line. Then hold that session's next unit until its file shows the clear or the owner tells you to send. Inside a unit, mention a size only at 50% or more, and hold nothing. Never mention one in the middle of a task.

The explainer's proposal named only step 5. The role definition says the same as step 5 and governs a coordinator session, so it changes too.

### SC-7 — Limits

- **A session with no file** writes none because it has no name, hasn't run its status line since the change, or is a Codex or Remote Control session on another machine. SC-3 makes that "no reading", and nothing else changes.
- **The format is the payload's, at 2.1.332.** A Claude Code upgrade that renames a field gives a `null` in the file, which the reading shows. No check watches this.
- **Two live sessions with one name** would write one file. [Session names](../../.agents/docs/coordinator-setup.md#session-names) already forbids that, for `SendMessage`'s sake.
- **A cancelled run can leave a `.tmp.*` file** in `ctx/`. The reader reads only the named file.

## Idle compaction isn't part of this design

**The owner's answer to Q3:** idle compaction is compaction while a session is idle, which he knows. The harness starts it when he has left a session alone for a while and the session is doing nothing, probably not even listening to a shell, which he hasn't established. He is still deciding whether to turn it off, and it isn't connected with this question. So it isn't what he called autocompact _"in the middle of a session"_, and nothing in the design depends on it. (**Amended 2026-11-26 by `RD-67` property 8.** This section was titled _"Idle compaction is on in the owner's settings"_, and after the reading below it said: _"So a role session that waits an hour for him, for example an architect at 468k waiting for his answers, is compacted between two of its tasks. That may be what he sees as autocompact "in the middle of a session". It is not established that he does: he can recognize it by that line."_)

**The reading, which stays true:** by `settings-reference.md`, idle compaction is on by default when `autoCompactEnabled` is on. It compacts a conversation that has reached 200,000 tokens and has been idle for about an hour, before the prompt cache expires, and the terminal then shows a line that starts with _"Compacted while idle, before the prompt cache expired"_. His settings turn `autoCompactEnabled` on and don't set `idleCompaction`. `"idleCompaction": false` in `~/.claude/settings.json`, or the _Idle compaction_ row in `/config`, turns it off. Compaction near the window's limit stays as he has set it.

## Cost

- **The owner:** eleven lines in his status line script, once.
- **Each status line run:** about 15 ms more. 50 runs of the writer took 0.74 s, and 50 runs of his current script 0.94 s ([`writer.txt`](checks/writer.txt)). It writes 400 bytes per session name, and there is one file per name.
- **The coordinator:** one command per closing message, and one per owner checkpoint for its own size. Each is about a hundred tokens of output.
- **The owner's time:** a slot whose unit has ended, or whose session is past 300,000 tokens at a task's end, waits for his `/clear` or his word. That is the point of the hold. The other slots don't wait. (**Amended 2026-11-26 by `RD-67`,** which adds the second case.)
- **The repository:** two documents. No tracked code, no CI and no test.

## Units, in order

1. **This plan.** On `repo/session-context-1`.
2. **The owner's answers, then the documents. Done 2026-11-26 as `RD-67`,** on the same branch and in the same pull request ([one unit](../../.agents/docs/agent-workflow.md#one-branch-and-one-pull-request-per-unit)). The main architect mints the decision and writes SC-6's text, because a rule in `.agents/docs/` and in a role definition changes. The owner adds SC-2's lines to his script whenever he chooses: until then, every reading is "no reading", and the coordinator says so.

## Identifiers

`SC-1` to `SC-7` are this plan's. **They are minted as `repo:RD-67`,** in [`.plan/00-index.md`](../decisions/RD-67.md), because `RD-64`'s unit, #302, hasn't landed. If #302 merges first, this branch writes the entry as `.plan/decisions/RD-67.md`, taking `main`'s side of the index conflict (`RD-64` property 7). `RD-66` (`repo/mutations-1`) was the highest `RD-` on any branch on `origin` at the minting, minted there after this plan was written.

## Questions for the owner

1. **The hold (SC-4).** At the end of a unit, the coordinator holds that session's next unit until it sees your `/clear` or you tell it to send. **Recommended: yes.** Without the hold, the next unit reaches the session before you can clear it. The cost is that the slot waits for you.
2. **The threshold inside a unit (SC-4, SC-5).** At a task boundary inside a unit, the coordinator mentions a session's size, and its own, at 50% of the window or more (500k for Opus 5.5) and holds nothing. **Recommended: 50%.** Another number is equally easy, and "never inside a unit" is too.
3. **Idle compaction.** Is it what you saw ([above](#idle-compaction-isnt-part-of-this-design))? If yes, `"idleCompaction": false` in your user settings turns it off. It's your setting, and the design doesn't need either answer.

**The owner's answers, 2026-11-26,** relayed by the coordinator. His words, with the coordinator's English, which the architect checked against the Russian:

1. **Q1: yes.** _"Да"_ ("Yes").
2. **Q2: no size, and 300k.** _"Ммм, на самом деле контекст упоминать не надо, достаточно будет, если ты при превышении 300к контекста при работе над задачей дождёшься её окончания и сообщишь мне, что сессию можно чистить."_ ("Hmm, actually there's no need to mention the context; it's enough if, when a session goes over 300k of context while working on a task, you wait for the task to end and tell me that the session can be cleared.")
3. **Q3: no.** _"Нене, Idle compaction - это сжатие именно в простое. Если я про вас забыл на некоторое время, харнесс инициирует сжатие. Но для этого сессия не должна ничего делать (скорее всего, даже shell слушать, но это не точно). Это нормально, я пока размышляю, стоит ли выключать или нет, но оно никак не связано с этим вопросом."_ ("No no, idle compaction is compaction specifically while idle. If I forget about you for a while, the harness starts a compaction. But for that the session must be doing nothing (probably not even listening to a shell, but that's not certain). That's fine; I'm still thinking about whether to turn it off, but it isn't connected with this question at all.")

How `RD-67` reads Q2 is in its _Readings of the answers_.