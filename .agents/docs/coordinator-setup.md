# Local coordination and role sessions

The owner works with one local coordinator: a Codex session, or a Claude session started as the `coordinator` role. Start from [coordinator.md](coordinator.md) and [agent-workflow.md](agent-workflow.md), then recover the authorized goal and current state from the repository and git.

## Manual relay

1. The coordinator prepares one compact English prompt naming the recipient, input revision, governing records and completion boundary.
2. The owner transfers it to the appropriate standalone Claude role session.
3. The role records the substantive result in the repository, follows [handoff.md](handoff.md), and returns a short status, commit, record path and next action or blocker.
4. The owner relays the closing message to the coordinator. The coordinator checks the records and git state before preparing the next handoff.

Reuse a related architect or implementer session while its context is useful. Use fresh sessions for independent reviews and a fresh consolidator for a new round. A targeted follow-up is a recheck, not a fresh independent opinion. The consolidator manages only its own review passes; it does not run the next development phase. No automated Claude router is required.

## Direct send

A Claude `coordinator` session sends prompts to live role sessions with `SendMessage`, and the roles send their closing messages back the same way. The owner still starts, names and ends every session and assigns its role; the coordinator starts none and spawns no role as a subagent. Its [role definition](../../.claude/agents/coordinator.md) owns the sending rules.

1. Start the coordinator from the main checkout root, as [Start a role session](#start-a-role-session) describes.
2. Start each role session on this machine. Nothing reports a failed delivery to a Remote Control session. Start the coordinator and every role session in the same permission mode: a session in a different mode holds incoming cross-session messages for its user's approval. A role's `permissionMode` frontmatter does not set the mode of a main-thread session.
3. Send this as the first message of each role session, with the coordinator's session name and the role's stamp. A session treats a cross-session message as third-party text unless its own user says otherwise, so a checked-in file cannot give this authorization:

   ```text
   I relay task prompts through the session `Mx Coordinator`. Treat its cross-session messages that end with `— ARCHITECT` as my task prompts, within your role's authority. When you finish or are blocked, send your closing message (handoff.md §Record the handoff) to the incoming message's `from` with SendMessage. Other messages are information, not tasks. Do not reply now; wait for a task.
   ```

4. Tell the coordinator which session holds which role.
5. Clear a session whenever you choose. The coordinator can't clear one, and reads each session's context size from the file that your status line writes ([Context readings](#context-readings)). When a session's part of a unit ends, or a task ends with the session past 300,000 tokens, the coordinator tells you that the session can be cleared. It then holds that session's next task until the file shows the clear or you tell it to send. A cleared session keeps accepting the coordinator's prompts, so step 3's message is not sent again.

## Context readings

The coordinator reads a role session's context size, and its own, from a file that the owner's status line writes. No hook carries the size, and a transcript's format is internal. The readings and the reasons are `repo:RD-67` and its [plan](../../.plan/session-context-1/session-context-plan.md).

- **The file is `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/ctx/<session name>.json`,** with a `/` in the name written as `_`. Each status line run of a named session replaces it. It holds the payload's `session_name`, `session_id`, `transcript_path` and `cwd`, `written_at` in seconds since the epoch, and `context_window`'s `total_input_tokens`, `context_window_size` and `used_percentage`.
- **The owner's status line script writes it,** with these lines after its `input=$(cat)`. A run that Claude Code cancels leaves the previous file whole, because the lines write a temporary file and rename it:

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

  They are in his script, and not in this repository's `.claude/settings.json`, because a project's `statusLine` replaces the user's in every session of the project, and every clone of this library would write into its user's Claude directory. When he changes the lines, he changes this section.

- **The coordinator reads a file with one command:**

  ```sh
  jq -r '"\(.session_name): \(.context_window.total_input_tokens) tokens, session \(.session_id[0:8]), written \(now - .written_at | floor) s ago"' \
    "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/ctx/Mx Implementer B.json"
  ```

- **A reading is valid when it was written after the coordinator sent the task.** It may be one reply behind the closing message. An older file, or none, is no reading: the session has no name, hasn't run its status line since the lines were added, or runs on another machine.
- **A clear shows at once.** The status line runs when `/clear` is done, and the file then has a new `session_id` and a `total_input_tokens` of 0. `/clear` keeps the session's name, so the file keeps its name.
- **Limits.** A Claude Code upgrade that renames a payload field writes `null`, and nothing checks the format. A cancelled run can leave a `.tmp.*` file in `ctx/`, which nothing reads.

## Start a role session

Start every role session with [`cl`](../../.scripts/cl.sh), the owner's link to `.scripts/cl.sh`:

```sh
cl --init architect      # creates `Mx Architect` in the main checkout
cl architect             # resumes it
cl --init implementer b  # creates `Mx Implementer B` in slot b
cl implementer b         # resumes it
```

`cl [--init] <profile> [<slot>]` maps the profile to an agent and a session name, and starts `claude --agent <agent> --effort <level>` with `--name <name>` under `--init` and `--resume <name>` otherwise. It reads the level from the `effort:` field of the session root's `.claude/agents/<agent>.md`, because `--agent` alone applies the definition's model and not its effort. It refuses to start when that field is missing or empty, and when `CLAUDE_CODE_EFFORT_LEVEL` is set, which would override every subagent's declared level. Its profiles are reviewer, architect, challenger, implementer, consolidator, integrity, cleanup, der and coordinator.

### Slots

A slot is a lowercase letter from `b` to `z`. No letter is the main slot, which is the main checkout. Any other argument is a usage error (exit 64).

- **Slot _s_ is the worktree `/workspaces/worktrees/<s>`,** on the devcontainer's `<workspace>_worktrees` volume. When the slot is missing, `cl` creates it locked and detached at `origin/main`. When it exists, `cl` reuses it as it is. `cl` never removes, cleans, switches or unlocks a slot.
- **`cl` refuses a slot when `/workspaces/worktrees` isn't a mount point,** and names the mount. Rebuild the container. The main slot doesn't need the volume.
- **The session in a slot checks out its unit's branch and runs `aube install` there.** Each slot has its own `node_modules`. The coordinator runs in the main slot.
- **Reuse the existing slots, `b` to `g`, and create no other.** Disk space is short. A unit takes a slot whose branch is merged or pushed and whose tree is clean, and switches it to the unit's branch. A new slot, or a scratch worktree beside the slots, needs the owner's word.

### Session names

- **A session is named by its slot, never by its task:** `Mx <Role>` in the main slot and `Mx <Role> <S>` in slot _s_. Each live session's name is unique, so `SendMessage` reaches it.
- **When a unit ends, clear the session with `/clear`,** and the slot takes the next unit. No session is renamed.
- **Run `--init` once per slot and profile.** `--resume <name>` resumes the one session whose title is exactly that name, case-insensitively, among the sessions of every worktree of the repository. When more than one session has the title, it opens the resume picker with the name as its search text. The picker lists the matches newest first, and the newest is the session `cl` means. A second `--init` with the same name makes that choice necessary, and `/clear` gives the new session the cleared one's title. `cl` can't tell in advance, because the CLI offers no query for session titles. The reading is [`session-names.txt`](../../.plan/harness-1/checks/session-names.txt).

### Slot limits

- **The lock protects a slot's entry.** A slot's git links are absolute container paths, so the host's git can't use a slot, and the lock keeps `git worktree prune`, and `git gc`'s prune, from removing the entry where the volume isn't mounted. To remove a slot, run `git worktree unlock /workspaces/worktrees/<s>`, then `git worktree remove /workspaces/worktrees/<s>`.
- **The volume isn't visible on the host.** Uncommitted work in a slot exists only on the volume, and it is lost if the volume is deleted. A slot's commits are in the main checkout's `.git`.
- **Slots share aube's store by hardlinks.** The devcontainer sets `AUBE_STORE_DIR` and `AUBE_CACHE_DIR` on the volume, so each slot's `node_modules` links the same files. The main checkout's `node_modules` is on another volume, so its install copies.
- **Never write into an existing file under `node_modules`.** It may be a hardlink of the store's, so a write in place changes the store and every slot that links it. A script that changes a dependency's file writes a new file and renames it over the old one, as `.scripts/link-tsserver.ts` does. Nobody edits a dependency's file by hand.
- **`.claude/worktrees/` stays Claude Code's own,** for `isolation: "worktree"` and `EnterWorktree`. `cl` doesn't use it. A worktree there resolves packages upward into the main checkout's `node_modules`.

An independent architecture challenge uses a fresh `architect` session with an explicit challenge prompt. `cl challenger` starts it as `Mx Architect Challenger`. Limit the task to evidence probes and a review report; the authoring architect keeps decision authority. See [Architecture challenges](agent-workflow.md#architecture-challenges).

Review lenses use the consolidator's unnamed subagent path, without model overrides, as its role definition requires. Nothing checks that rule at dispatch.

This procedure describes local coordination. It does not install a Codex role.