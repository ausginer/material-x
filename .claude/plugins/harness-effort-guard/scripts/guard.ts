import {
  findProjectRoot,
  isLinkedWorktree,
  resolveRole,
  type Resolution,
} from './resolve-role.ts';
import { readChildIdentity, type IdentitySource } from './identity.ts';
import { observe } from './observe.ts';
import { appliedNotice, checkModel, judge, type Check } from './verdict.ts';

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

/**
 * The dispatch tools that bring a *new* worker into being, and so choose its
 * role.
 *
 * `SendMessage` is dispatch and is not here: it reaches a worker that already
 * exists, whose role was fixed when it was spawned. A resume selects nothing,
 * so there is nothing for the topology to assert about it.
 */
const SPAWN_TOOLS = new Set(['Agent', 'Task']);

/**
 * The role a spawning call selects when it names none.
 *
 * Observed in the tool's own contract: `subagent_type` is optional and its
 * absence resolves to the general-purpose agent. Reading absence as "no role
 * selected" would leave the plainest escape open — a call that simply omits the
 * field gets exactly the out-of-domain worker the assertion exists to refuse.
 */
const DEFAULT_SUBAGENT = 'general-purpose';

type HookInput = Readonly<{
  hook_event_name: string;
  session_id: string;
  cwd: string;
  /**
   * The session transcript, and the only path the per-agent records are located
   * from: the session's workers are recorded beside it, under a directory named
   * for the transcript itself.
   */
  transcript_path?: string;
  /**
   * Present on every event of a child worker and on no main-thread event, which
   * is what separates the two identity rules.
   */
  agent_id?: string;
  /**
   * What the runtime calls this actor. The acting role for a main thread, and
   * on one spawn path the worker's assigned address rather than its role, which
   * is why a child's role is read from its per-agent record instead.
   */
  agent_type?: string;
  model?: string;
  tool_name?: string;
  tool_input?: Readonly<{
    subagent_type?: string;
    name?: string;
    model?: string;
  }>;
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
  const reported = input.agent_type;
  const agentId = input.agent_id;
  const effortBearing = EFFORT_BEARING.has(input.hook_event_name);
  const spawning = input.tool_name != null && SPAWN_TOOLS.has(input.tool_name);
  const assignedName = spawning ? input.tool_input?.name : undefined;
  const target = spawning
    ? (input.tool_input?.subagent_type ?? DEFAULT_SUBAGENT)
    : undefined;
  // Decided by the payload alone, so it is recorded even when reading the
  // record fails: which rule was meant to govern this event is evidence in its
  // own right, and a failure to apply it must not also erase it.
  const source: IdentitySource =
    agentId == null
      ? 'agent-type'
      : effortBearing
        ? 'agent-record'
        : 'deferred';

  let root: string | null = null;
  let worktree = false;
  // A main thread was started with --agent, so what the runtime reports is the
  // role it was given, and reading it depends on no filesystem. Assigned here
  // rather than beside the child rule so that a root discovery that fails still
  // leaves an acting role to deny — with no role, the verdict is the `no-role`
  // allow, and the guard's own failure would pass unremarked.
  let role: string | undefined = agentId == null ? reported : undefined;
  let runtimeModel: string | undefined;
  let identityError: string | undefined;
  let targetModel: string | undefined;
  let nameClaimsRole = false;
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

    // A child's role is never the reported `agent_type`: on one spawn path that
    // field holds the worker's address. At SubagentStart the record does not
    // exist yet, and that event cannot deny, so identity is simply deferred to
    // the first enforceable event — resolving the address as an out-of-domain
    // role instead would make the log assert a falsehood about a worker that is
    // in fact governed.
    if (agentId != null && effortBearing) {
      try {
        const child = await readChildIdentity(input.transcript_path, agentId);

        role = child.role;
        runtimeModel = child.model;
      } catch (cause) {
        identityError = cause instanceof Error ? cause.message : String(cause);
      }
    }

    if (role != null) {
      // No root is an empty domain, not a failure: a tree that declares no
      // roles has nothing to hold this one to. Being unable to look is a
      // different answer, and it arrives here as a rejection.
      resolution =
        root == null
          ? { kind: 'out-of-domain', role }
          : await resolveRole(root, role);
    }

    if (spawning && root != null && target != null) {
      // The selected role's own declaration, so an override that contradicts it
      // is refusable before the worker exists — the one point at which the
      // model contract needs nothing observed about a running child.
      const selected = await resolveRole(root, target);

      targetModel =
        selected.kind === 'out-of-domain'
          ? undefined
          : (selected.model ?? undefined);

      nameClaimsRole =
        assignedName != null &&
        (await resolveRole(root, assignedName)).kind !== 'out-of-domain';
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }

  const declared = resolution?.kind === 'declared' ? resolution.effort : null;
  const declaredModel =
    resolution != null && resolution.kind !== 'out-of-domain'
      ? resolution.model
      : null;
  const shared = {
    at: new Date().toISOString(),
    event: input.hook_event_name,
    session_id: input.session_id,
    ...(agentId != null && { agent_id: agentId }),
    // What the runtime called this actor, kept as it arrived. The resolved role
    // goes in its own field rather than over the top of this one: the whole
    // failure that motivated the second field was invisible because nothing
    // recorded a second opinion beside the first, and a log that overwrites the
    // raw value cannot answer what the runtime said after it changes again.
    ...(reported != null && { agent_type: reported }),
    ...(role != null && { governed_role: role }),
    identity_source: source,
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
    identityError,
    resolution,
    actual: input.effort?.level,
    poisoned,
    dispatching: input.tool_name != null && DISPATCH_TOOLS.has(input.tool_name),
    target,
    assignedName,
    nameClaimsRole,
    requestedModel: spawning ? input.tool_input?.model : undefined,
    targetModel,
    runtimeModel,
    worktree,
    root,
    error,
  };
  const verdict = judge(check);

  await observe(dataDir, {
    kind: 'verdict',
    ...shared,
    // Which role a spawning call selected, so the log can answer the question
    // the topology assertion exists for. A child that never started leaves no
    // SubagentStart, so without this the denied dispatch would record only that
    // something was refused, and a permitted one would not say what it chose.
    ...(check.target != null && { dispatch_target: check.target }),
    ...(check.assignedName != null && { dispatch_name: check.assignedName }),
    ...(check.requestedModel != null && {
      dispatch_model: check.requestedModel,
    }),
    declared_model: declaredModel,
    ...(runtimeModel != null && { runtime_model: runtimeModel }),
    // Which of the four answers the model question got, so an unverifiable
    // check is legible as unverified rather than as a pass. Recorded on every
    // verdict for the same reason `model` is: a field present only where it
    // succeeds answers with the log's shape instead of the runtime's.
    model_check: checkModel(declaredModel, runtimeModel),
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
