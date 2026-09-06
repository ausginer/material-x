import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  findProjectRoot,
  resolveRole,
  type Resolution,
} from './resolve-role.ts';
import { observe } from './observe.ts';
import { judge, type Check } from './verdict.ts';

/**
 * Events that carry `effort` by contract, and so may produce a verdict.
 *
 * PostToolUse carries it too, but the tool has already run by then: a second
 * verdict per call buys no enforcement and doubles the process spawns.
 */
const EFFORT_BEARING = new Set(['PreToolUse', 'Stop', 'SubagentStop']);

type HookInput = Readonly<{
  hook_event_name: string;
  session_id: string;
  cwd: string;
  agent_id?: string;
  agent_type?: string;
  model?: string;
  effort?: Readonly<{ level: string }>;
}>;

function announcement(
  event: string,
  role: string | undefined,
  declared: string | null,
  poisoned: boolean,
  error: string | undefined,
): unknown {
  const lines = [];

  if (error != null) {
    lines.push(`Effort guard could not resolve the acting role: ${error}`);
  } else if (role != null && declared != null) {
    lines.push(
      `Effort guard active. Role ${role} declares effort ${declared}.`,
    );
  }

  if (poisoned) {
    lines.push(
      'CLAUDE_CODE_EFFORT_LEVEL is set. It is a process-wide hard override, so declared ' +
        'per-role effort cannot be honoured in this session.',
    );
  }

  return lines.length === 0
    ? {}
    : {
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
  const input: HookInput = JSON.parse(await readStdin());
  const dataDir =
    argument('--data-dir') ?? join(tmpdir(), 'harness-effort-guard');
  const enforcing = process.env.HARNESS_EFFORT_GUARD_MODE === 'enforce';
  const poisoned = process.env.CLAUDE_CODE_EFFORT_LEVEL != null;
  const role = input.agent_type;

  // CLAUDE_PROJECT_DIR is the root Claude Code established and is stable across
  // cwd changes within the session; the fallback shares the launcher's rule
  // rather than reimplementing it.
  const root =
    process.env.CLAUDE_PROJECT_DIR ?? (await findProjectRoot(input.cwd));

  let resolution: Resolution | undefined;
  let error: string | undefined;

  if (role != null) {
    try {
      // No root is an empty domain, not a failure: a tree that declares no
      // roles has nothing to hold this one to.
      resolution =
        root == null
          ? { kind: 'out-of-domain', role }
          : await resolveRole(root, role);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
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

  if (
    verdict.decision === 'deny' &&
    enforcing &&
    input.hook_event_name === 'PreToolUse'
  ) {
    emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: verdict.message,
      },
    });

    return;
  }

  // Stop and SubagentStop report without blocking: a Stop-triggered retry would
  // re-run inference at the same wrong effort and loop. An observe-mode
  // PreToolUse denial is likewise reported rather than applied.
  if (verdict.decision === 'deny') {
    process.stderr.write(`${verdict.message}\n`);
  }
};

await main();
