import {
  findProjectRoot,
  isLinkedWorktree,
  resolveRole,
  type Resolution,
} from './resolve-role.ts';
import { observe } from './observe.ts';
import { appliedNotice, judge, type Check } from './verdict.ts';

/**
 * Events that carry `effort` by contract, and so may produce a verdict.
 *
 * PostToolUse carries it too, but the tool has already run by then: a second
 * verdict per call buys no enforcement and doubles the process spawns.
 */
const EFFORT_BEARING = new Set(['PreToolUse', 'Stop', 'SubagentStop']);

/**
 * Tool calls that bring another worker into being.
 *
 * The worktree refusal is of dispatch rather than of work, so it needs the act
 * named. A tool absent from this set is ordinary work and is never refused for
 * being in a worktree, which is what lets an isolated single worker run there.
 */
const DISPATCH_TOOLS = new Set(['Agent', 'Task', 'SendMessage']);

type HookInput = Readonly<{
  hook_event_name: string;
  session_id: string;
  cwd: string;
  agent_id?: string;
  agent_type?: string;
  model?: string;
  tool_name?: string;
  effort?: Readonly<{ level: string }>;
}>;

function announcement(
  event: string,
  role: string | undefined,
  declared: string | null,
  poisoned: boolean,
  error: string | undefined,
): unknown {
  // Unconditional, and first. The dispatch gate in AGENTS.md is keyed on this
  // string, and it asks one question — is the guard loaded — which is answered
  // the same way whether or not the role set resolved. Folding a resolution
  // failure into this sentence would drop the string in the one case a reader
  // most needs to tell "loaded but broken" from "not installed yet".
  const lines = ['Effort guard active.'];

  if (error != null) {
    lines.push(`Role definitions could not be resolved: ${error}`);
  } else if (role != null && declared != null) {
    lines.push(`Role ${role} declares effort ${declared}.`);
  }

  if (poisoned) {
    lines.push(
      'CLAUDE_CODE_EFFORT_LEVEL is set. It is a process-wide hard override, so declared ' +
        'per-role effort cannot be honoured in this session.',
    );
  }

  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: lines.join(' '),
    },
  };
}

function argument(flag: string): string | undefined {
  const at = process.argv.indexOf(flag);

  return at < 0 ? undefined : process.argv[at + 1];
}

function emit(output: unknown): void {
  process.stdout.write(JSON.stringify(output));
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

const main = async (): Promise<void> => {
  // Every wired hook passes --data-dir, and installation.test.ts pins that for
  // each event. Its absence is a wiring defect rather than a mode, so it is
  // reported instead of being absorbed by a temp-directory fallback that no
  // caller reaches and nothing would ever read.
  const dataDir = argument('--data-dir');

  if (dataDir == null) {
    process.stderr.write('Effort guard: --data-dir is required.\n');
    process.exitCode = 1;

    return;
  }

  let input: HookInput;

  try {
    input = JSON.parse(await readStdin()) as HookInput;
  } catch (cause) {
    // Ahead of the guard's own error handling, so it has to leave the same
    // evidence that handling does: a hook that dies silently is indistinguishable
    // from one that never ran, which is the state the log exists to rule out.
    const detail = cause instanceof Error ? cause.message : String(cause);

    await observe(dataDir, {
      kind: 'unreadable',
      at: new Date().toISOString(),
      error: detail,
    });
    process.stderr.write(`Effort guard: unreadable hook input. ${detail}\n`);
    process.exitCode = 1;

    return;
  }

  const enforcing = process.env.HARNESS_EFFORT_GUARD_MODE === 'enforce';
  const poisoned = process.env.CLAUDE_CODE_EFFORT_LEVEL != null;
  const role = input.agent_type;

  let root: string | null = null;
  let worktree = false;
  let resolution: Resolution | undefined;
  let error: string | undefined;

  // Finding the root is inside the same catch as resolving against it: both
  // read the filesystem, both can fail for the same reasons, and an escaping
  // rejection would end the hook process without a verdict — which a
  // PreToolUse cannot turn into a denial, so the call would proceed unchecked.
  try {
    // CLAUDE_PROJECT_DIR is the root Claude Code established and is stable
    // across cwd changes within the session; the fallback shares the launcher's
    // rule rather than reimplementing it.
    root = process.env.CLAUDE_PROJECT_DIR ?? (await findProjectRoot(input.cwd));
    worktree = root != null && (await isLinkedWorktree(root));

    if (role != null) {
      // No root is an empty domain, not a failure: a tree that declares no
      // roles has nothing to hold this one to. Being unable to look is a
      // different answer, and it arrives here as a rejection.
      resolution =
        root == null
          ? { kind: 'out-of-domain', role }
          : await resolveRole(root, role);
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }

  const declared = resolution?.kind === 'declared' ? resolution.effort : null;
  const shared = {
    at: new Date().toISOString(),
    event: input.hook_event_name,
    session_id: input.session_id,
    ...(input.agent_id != null && { agent_id: input.agent_id }),
    ...(role != null && { agent_type: role }),
    // Recorded on every kind of record, not lifecycle announcements alone.
    // Whether the runtime names the acting model at the decision point is what
    // decides whether the invariant can key on anything but a declaration, and
    // a log that carries the field on only some events cannot answer that: an
    // absent model would be indistinguishable from an unrecorded one.
    ...(input.model != null && { model: input.model }),
    project_root: root,
    worktree,
    declared,
    resolution: error != null ? 'error' : (resolution?.kind ?? 'no-role'),
    poisoned,
  };

  if (!EFFORT_BEARING.has(input.hook_event_name)) {
    await observe(dataDir, { kind: 'announcement', ...shared });

    emit(announcement(input.hook_event_name, role, declared, poisoned, error));

    return;
  }

  const check: Check = {
    role,
    resolution,
    actual: input.effort?.level,
    poisoned,
    dispatching: input.tool_name != null && DISPATCH_TOOLS.has(input.tool_name),
    worktree,
    root,
    error,
  };
  const verdict = judge(check);

  await observe(dataDir, {
    kind: 'verdict',
    ...shared,
    actual: input.effort?.level ?? null,
    decision: verdict.decision,
    cause: verdict.decision === 'allow' ? verdict.reason : verdict.cause,
    enforced: enforcing,
  });

  if (verdict.decision !== 'deny') {
    return;
  }

  const applied = enforcing && input.hook_event_name === 'PreToolUse';

  if (applied) {
    emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `${verdict.message}\n\n${appliedNotice(true, input.hook_event_name)}`,
      },
    });

    return;
  }

  // Stop and SubagentStop are observation points and cannot block: by the time
  // either fires the turn's inference is already paid for, and there is no tool
  // call in existence to refuse. They are wired because a turn that dispatches
  // without calling a tool reaches no other effort-bearing event, and the trust
  // claim needs such a turn to appear in the log at all.
  process.stderr.write(
    `${verdict.message}\n\n${appliedNotice(false, input.hook_event_name)}\n`,
  );
};

await main();
