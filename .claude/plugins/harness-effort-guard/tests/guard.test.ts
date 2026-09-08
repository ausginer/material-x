import { strictEqual } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  childRecord,
  definition,
  project,
  run,
  SCRIPTS,
  unreadableDomain,
  worktreeProject,
} from './support.ts';

const GUARD = join(SCRIPTS, 'guard.ts');

type Event = Readonly<{
  hook_event_name: string;
  session_id: string;
  cwd: string;
  transcript_path?: string;
  agent_id?: string;
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

type Observation = Readonly<Record<string, unknown>>;

/**
 * Drive the hook once and return the record it appended, alongside the stdout
 * it handed back to the host — the two halves of one observation.
 *
 * `CLAUDE_PROJECT_DIR` is set to the fixture and `CLAUDE_CODE_EFFORT_LEVEL`
 * unset unless a case says otherwise, so the ambient session running these
 * tests cannot decide their outcome.
 */
async function observed(
  root: string,
  event: Event,
  env: Readonly<Record<string, string | undefined>> = {},
): Promise<Readonly<{ record: Observation; stdout: string }>> {
  const dataDir = join(root, 'data');
  const { stdout } = await run('node', [GUARD, '--data-dir', dataDir], {
    env: {
      CLAUDE_PROJECT_DIR: root,
      CLAUDE_CODE_EFFORT_LEVEL: undefined,
      HARNESS_EFFORT_GUARD_MODE: undefined,
      ...env,
    },
    input: JSON.stringify(event),
  });
  const log = await readFile(join(dataDir, 'observations.jsonl'), 'utf8');

  return { record: JSON.parse(log.trim().split('\n').at(-1)!), stdout };
}

/** Drive the hook and return its streams, for cases that assert on stderr. */
async function raw(
  root: string,
  event: Event,
  env: Readonly<Record<string, string | undefined>> = {},
): Promise<Readonly<{ code: number; stdout: string; stderr: string }>> {
  return await run('node', [GUARD, '--data-dir', join(root, 'data')], {
    env: {
      CLAUDE_PROJECT_DIR: root,
      CLAUDE_CODE_EFFORT_LEVEL: undefined,
      HARNESS_EFFORT_GUARD_MODE: undefined,
      ...env,
    },
    input: JSON.stringify(event),
  });
}

/** Whether the hook told the host to refuse the call. */
function blocked(stdout: string): boolean {
  if (stdout === '') {
    return false;
  }

  const emitted = JSON.parse(stdout) as Readonly<{
    hookSpecificOutput?: Readonly<{ permissionDecision?: string }>;
  }>;

  return emitted.hookSpecificOutput?.permissionDecision === 'deny';
}

/** The startup context a lifecycle event hands back to the host. */
function context(stdout: string): string {
  const emitted = JSON.parse(stdout) as Readonly<{
    hookSpecificOutput?: Readonly<{ additionalContext?: string }>;
  }>;

  return emitted.hookSpecificOutput?.additionalContext ?? '';
}

async function exemptProject(): Promise<string> {
  return await project({
    'explore.md': definition('name: Explore\nmodel: haiku'),
    'architect.md': definition('name: architect\nmodel: opus\neffort: high'),
  });
}

function call(agent: string, level?: string): Event {
  return {
    hook_event_name: 'PreToolUse',
    session_id: 's1',
    cwd: '/workspaces',
    agent_type: agent,
    ...(level != null && { effort: { level } }),
  };
}

/**
 * `AGENTS.md` §Before dispatching a governed worker turns "is the guard
 * loaded?" into a decision the coordinator makes from startup context, because
 * a fresh checkout's first session runs before the plugin is loadable. That
 * rule is only as good as the signal: a session the guard is loaded into must
 * say so, and a coordinator carries no role to say it about.
 */
describe('guard announcement', () => {
  it('should announce itself to a session carrying no role', async () => {
    const root = await exemptProject();
    const { stdout } = await observed(root, {
      hook_event_name: 'SessionStart',
      session_id: 's1',
      cwd: '/workspaces',
    });

    strictEqual(context(stdout).includes('Effort guard active'), true);
  });

  it('should announce itself to a governed worker, naming its level', async () => {
    const root = await exemptProject();
    const { stdout } = await observed(root, {
      hook_event_name: 'SubagentStart',
      session_id: 's1',
      cwd: '/workspaces',
      agent_type: 'architect',
    });

    strictEqual(
      context(stdout).includes('Role architect declares effort high'),
      true,
    );
  });

  it('should announce itself to a worker outside the effort invariant', async () => {
    const root = await exemptProject();
    const { stdout } = await observed(root, {
      hook_event_name: 'SubagentStart',
      session_id: 's1',
      cwd: '/workspaces',
      agent_type: 'Explore',
    });

    strictEqual(context(stdout).includes('Effort guard active'), true);
  });

  it('should still report a contaminated environment alongside it', async () => {
    const root = await exemptProject();
    const { stdout } = await observed(
      root,
      { hook_event_name: 'SessionStart', session_id: 's1', cwd: '/workspaces' },
      { CLAUDE_CODE_EFFORT_LEVEL: 'medium' },
    );

    strictEqual(
      context(stdout).includes('CLAUDE_CODE_EFFORT_LEVEL is set'),
      true,
    );
  });
});

describe('guard against a domain it cannot read', () => {
  it('should deny rather than read the failure as an empty domain', async () => {
    const root = await unreadableDomain();
    const { record } = await observed(root, call('architect', 'high'));

    strictEqual(record.decision, 'deny');
  });

  it('should record the failure as a guard error', async () => {
    const root = await unreadableDomain();
    const { record } = await observed(root, call('architect', 'high'));

    strictEqual(record.cause, 'guard-error');
  });

  it('should block the tool call while enforcing', async () => {
    const root = await unreadableDomain();
    const { stdout } = await observed(root, call('architect', 'high'), {
      HARNESS_EFFORT_GUARD_MODE: 'enforce',
    });

    const emitted = JSON.parse(stdout) as Readonly<{
      hookSpecificOutput: Readonly<{ permissionDecision: string }>;
    }>;

    strictEqual(emitted.hookSpecificOutput.permissionDecision, 'deny');
  });

  // Root discovery reads the filesystem too. Left outside the guard's own error
  // handling it ends the hook process instead of producing a verdict, and a
  // PreToolUse that never answers is a tool call that proceeds unchecked.
  it('should deny when discovering the root is what fails', async () => {
    const root = await unreadableDomain();
    const { record } = await observed(
      root,
      { ...call('architect', 'high'), cwd: root },
      { CLAUDE_PROJECT_DIR: undefined },
    );

    strictEqual(record.cause, 'guard-error');
  });

  it('should allow when no role is acting', async () => {
    const root = await unreadableDomain();
    const { record } = await observed(root, {
      hook_event_name: 'PreToolUse',
      session_id: 's1',
      cwd: root,
    });

    strictEqual(record.decision, 'allow');
  });
});

describe('guard', () => {
  it('should allow an exempt role that reports no effort', async () => {
    const { record } = await observed(await exemptProject(), call('Explore'));

    strictEqual(record.decision, 'allow');
  });

  it('should record an exempt role as governed rather than out-of-domain', async () => {
    const { record } = await observed(await exemptProject(), call('Explore'));

    strictEqual(record.resolution, 'exempt');
  });

  it('should record an exempt role with no declared level', async () => {
    const { record } = await observed(await exemptProject(), call('Explore'));

    strictEqual(record.declared, null);
  });

  it('should name the exemption as the cause of the allow', async () => {
    const { record } = await observed(await exemptProject(), call('Explore'));

    strictEqual(record.cause, 'exempt');
  });

  it('should allow an exempt role while enforcing', async () => {
    const { stdout } = await observed(await exemptProject(), call('Explore'), {
      HARNESS_EFFORT_GUARD_MODE: 'enforce',
    });

    strictEqual(stdout, '');
  });

  it('should deny an exempt role under a process-wide override', async () => {
    const { record } = await observed(await exemptProject(), call('Explore'), {
      CLAUDE_CODE_EFFORT_LEVEL: 'medium',
      HARNESS_EFFORT_GUARD_MODE: 'enforce',
    });

    strictEqual(record.cause, 'poisoned-env');
  });

  it('should record the override an exempt role ran under', async () => {
    const { record } = await observed(await exemptProject(), call('Explore'), {
      CLAUDE_CODE_EFFORT_LEVEL: 'medium',
    });

    strictEqual(record.poisoned, true);
  });

  it('should deny a haiku definition that also declares an effort', async () => {
    const root = await project({
      'explore.md': definition('name: Explore\nmodel: haiku\neffort: high'),
    });
    const { record } = await observed(root, call('Explore'));

    strictEqual(record.decision, 'deny');
  });

  it('should still deny a role bearing the invariant at the wrong level', async () => {
    const root = await exemptProject();
    const { record } = await observed(root, call('architect', 'medium'));

    strictEqual(record.cause, 'mismatch');
  });

  it('should record the reported model on a verdict', async () => {
    const root = await exemptProject();
    const { record } = await observed(root, {
      ...call('architect', 'high'),
      model: 'opus',
    });

    strictEqual(record.model, 'opus');
  });

  it('should record the reported model on an announcement', async () => {
    const root = await exemptProject();
    const { record } = await observed(root, {
      hook_event_name: 'SessionStart',
      session_id: 's1',
      cwd: '/workspaces',
      agent_type: 'architect',
      model: 'opus',
    });

    strictEqual(record.model, 'opus');
  });

  it('should omit the model when the runtime reports none', async () => {
    const root = await exemptProject();
    const { record } = await observed(root, call('architect', 'high'));

    strictEqual('model' in record, false);
  });
});

/**
 * Whether a denial is *applied* is decided by two conditions, and each was a
 * single token whose removal changed what the guard enforces while leaving
 * every record, announcement and exit code identical. These cases are the two
 * negatives and the positive that separate them.
 */
describe('guard enforcement gating', () => {
  const mismatch = (): Event => call('architect', 'medium');

  it('should block a violation while enforcing at PreToolUse', async () => {
    const root = await exemptProject();
    const { stdout } = await observed(root, mismatch(), {
      HARNESS_EFFORT_GUARD_MODE: 'enforce',
    });

    strictEqual(blocked(stdout), true);
  });

  it('should block nothing while observing, whatever the verdict', async () => {
    const root = await exemptProject();
    const { record, stdout } = await observed(root, mismatch());

    strictEqual(record.decision, 'deny');
    strictEqual(blocked(stdout), false);
  });

  it('should block nothing at Stop even while enforcing', async () => {
    const root = await exemptProject();
    const { record, stdout } = await observed(
      root,
      { ...mismatch(), hook_event_name: 'Stop' },
      { HARNESS_EFFORT_GUARD_MODE: 'enforce' },
    );

    strictEqual(record.decision, 'deny');
    strictEqual(blocked(stdout), false);
  });

  it('should block nothing at SubagentStop even while enforcing', async () => {
    const root = await exemptProject();
    const { stdout } = await observed(
      root,
      { ...mismatch(), hook_event_name: 'SubagentStop' },
      { HARNESS_EFFORT_GUARD_MODE: 'enforce' },
    );

    strictEqual(blocked(stdout), false);
  });

  it('should record the mode it ran in', async () => {
    const root = await exemptProject();
    const { record } = await observed(root, mismatch(), {
      HARNESS_EFFORT_GUARD_MODE: 'enforce',
    });

    strictEqual(record.enforced, true);
  });
});

/**
 * The notice has to describe what happened on this event in this mode. Claiming
 * a block where nothing was blocked is the instrument misreporting itself, and
 * `Stop` is the case where no tool call exists to block at all.
 */
describe('guard reporting', () => {
  const mismatch = (): Event => call('architect', 'medium');

  it('should say a call was blocked only when one was', async () => {
    const root = await exemptProject();
    const { stdout } = await observed(root, mismatch(), {
      HARNESS_EFFORT_GUARD_MODE: 'enforce',
    });
    const emitted = JSON.parse(stdout) as Readonly<{
      hookSpecificOutput: Readonly<{ permissionDecisionReason: string }>;
    }>;

    strictEqual(
      emitted.hookSpecificOutput.permissionDecisionReason.includes(
        'The tool call was blocked.',
      ),
      true,
    );
  });

  it('should not claim a block while observing', async () => {
    const root = await exemptProject();
    const { stderr } = await raw(root, mismatch());

    strictEqual(stderr.includes('The tool call was blocked.'), false);
  });

  it('should say it is observing rather than enforcing', async () => {
    const root = await exemptProject();
    const { stderr } = await raw(root, mismatch());

    strictEqual(stderr.includes('observing, not enforcing'), true);
  });

  it('should say no call was in flight at Stop', async () => {
    const root = await exemptProject();
    const { stderr } = await raw(
      root,
      { ...mismatch(), hook_event_name: 'Stop' },
      { HARNESS_EFFORT_GUARD_MODE: 'enforce' },
    );

    strictEqual(stderr.includes('No tool call was in flight at Stop'), true);
  });
});

/**
 * A worktree carries its own `.claude/` at its own commit, so it can govern
 * part of the role set and allow the rest, or govern all of it at a superseded
 * generation. The refusal is of dispatch, which is what leaves an isolated
 * single worker able to run there.
 */
describe('guard worktree refusal', () => {
  it('should refuse dispatch from a linked worktree', async () => {
    const root = await worktreeProject();
    const { record } = await observed(root, {
      ...call('architect', 'high'),
      tool_name: 'Agent',
    });

    strictEqual(record.cause, 'worktree-dispatch');
  });

  it('should refuse a resume from a linked worktree', async () => {
    const root = await worktreeProject();
    const { record } = await observed(root, {
      ...call('architect', 'high'),
      tool_name: 'SendMessage',
    });

    strictEqual(record.cause, 'worktree-dispatch');
  });

  it('should refuse dispatch by a role the worktree does not declare', async () => {
    const root = await worktreeProject();
    const { record } = await observed(root, {
      ...call('implementer', 'medium'),
      tool_name: 'Agent',
    });

    strictEqual(record.cause, 'worktree-dispatch');
  });

  it('should let a single worker act in a worktree', async () => {
    const root = await worktreeProject();
    const { record } = await observed(root, {
      ...call('architect', 'high'),
      tool_name: 'Bash',
    });

    strictEqual(record.decision, 'allow');
  });

  it('should allow dispatch from the main checkout', async () => {
    const root = await exemptProject();
    const { record } = await observed(root, {
      ...call('architect', 'high'),
      tool_name: 'Agent',
    });

    strictEqual(record.decision, 'allow');
  });

  it('should record which root it judged', async () => {
    const root = await worktreeProject();
    const { record } = await observed(root, {
      ...call('architect', 'high'),
      tool_name: 'Agent',
    });

    strictEqual(record.worktree, true);
  });
});

/**
 * The end-to-end half of the topology assertion: `judge` decides it, but only
 * the guard reads a hook payload, and reading `tool_input.subagent_type` is
 * where the observed failure was invisible. These cases feed the real field
 * shape — confirmed against a live `PreToolUse` payload for the `Agent` tool —
 * rather than a `Check` a test constructed.
 */
describe('guard governed dispatch topology', () => {
  async function dispatchProject(): Promise<string> {
    return await project({
      'architect.md': definition('name: architect\nmodel: opus\neffort: high'),
      'consolidator.md': definition(
        'name: consolidator\nmodel: opus\neffort: medium',
      ),
      'reviewer.md': definition('name: reviewer\nmodel: opus\neffort: high'),
      'integrity.md': definition(
        'name: integrity\nmodel: sonnet\neffort: high',
      ),
      'cleanup.md': definition('name: cleanup\nmodel: sonnet\neffort: medium'),
      'der.md': definition('name: der\nmodel: opus\neffort: medium'),
    });
  }

  function spawn(
    agent: string,
    level: string | undefined,
    tool_input: Readonly<{ subagent_type?: string; name?: string }>,
  ): Event {
    return { ...call(agent, level), tool_name: 'Agent', tool_input };
  }

  it('should deny a consolidator selecting a general-purpose worker', async () => {
    const { record } = await observed(
      await dispatchProject(),
      spawn('consolidator', 'medium', { subagent_type: 'general-purpose' }),
    );

    strictEqual(record.cause, 'topology-escape');
  });

  it('should block that call under enforcement', async () => {
    const { stdout } = await observed(
      await dispatchProject(),
      spawn('consolidator', 'medium', {
        subagent_type: 'general-purpose',
        name: 'reviewer',
      }),
      { HARNESS_EFFORT_GUARD_MODE: 'enforce' },
    );

    strictEqual(blocked(stdout), true);
  });

  it('should allow a consolidator launching a governed lens', async () => {
    const { record } = await observed(
      await dispatchProject(),
      spawn('consolidator', 'medium', { subagent_type: 'reviewer' }),
    );

    strictEqual(record.decision, 'allow');
  });

  it('should record which role a permitted dispatch selected', async () => {
    const { record } = await observed(
      await dispatchProject(),
      spawn('consolidator', 'medium', {
        subagent_type: 'reviewer',
        name: 'reviewer',
      }),
    );

    strictEqual(record.dispatch_target, 'reviewer');
  });

  it('should deny the right name under the wrong role', async () => {
    const { record } = await observed(
      await dispatchProject(),
      spawn('consolidator', 'medium', {
        subagent_type: 'cleanup',
        name: 'reviewer',
      }),
    );

    strictEqual(record.cause, 'topology-identity');
  });

  // The tool defaults `subagent_type` to the general-purpose agent, so an
  // omitted field is a selection rather than an abstention. Reading it as "no
  // role chosen" would leave the plainest escape open.
  it('should deny a dispatch that names no role at all', async () => {
    const { record } = await observed(
      await dispatchProject(),
      spawn('consolidator', 'medium', { name: 'reviewer' }),
    );

    strictEqual(record.cause, 'topology-escape');
  });

  it('should deny a consolidator spawning outside its four lenses', async () => {
    const { record } = await observed(
      await dispatchProject(),
      spawn('consolidator', 'medium', { subagent_type: 'architect' }),
    );

    strictEqual(record.cause, 'topology-escape');
  });

  it('should allow an ordinary worker delegating a search', async () => {
    const { record } = await observed(
      await dispatchProject(),
      spawn('architect', 'high', { subagent_type: 'general-purpose' }),
    );

    strictEqual(record.decision, 'allow');
  });

  // A resume reaches a worker whose role was fixed when it was spawned, so the
  // call selects nothing and there is nothing to assert about it.
  it('should allow a dispatcher resuming a named worker', async () => {
    const { record } = await observed(await dispatchProject(), {
      ...call('consolidator', 'medium'),
      tool_name: 'SendMessage',
      tool_input: { name: 'reviewer' },
    });

    strictEqual(record.decision, 'allow');
  });

  it('should leave an ordinary tool call unjudged by topology', async () => {
    const { record } = await observed(await dispatchProject(), {
      ...call('consolidator', 'medium'),
      tool_name: 'Bash',
    });

    strictEqual(record.decision, 'allow');
  });
});

/**
 * An invocation that cannot produce a verdict has to leave a record saying so.
 * A hook that dies silently is indistinguishable from one that never ran, which
 * is the state the log exists to rule out.
 */
describe('guard invocation failures', () => {
  it('should record hook input it cannot read', async () => {
    const root = await exemptProject();
    const dataDir = join(root, 'data');

    await run('node', [GUARD, '--data-dir', dataDir], { input: 'not json' });

    const log = await readFile(join(dataDir, 'observations.jsonl'), 'utf8');
    const record = JSON.parse(log.trim().split('\n').at(-1)!) as Observation;

    strictEqual(record.kind, 'unreadable');
  });

  it('should exit non-zero on hook input it cannot read', async () => {
    const root = await exemptProject();
    const { code } = await run(
      'node',
      [GUARD, '--data-dir', join(root, 'data')],
      {
        input: 'not json',
      },
    );

    strictEqual(code, 1);
  });

  it('should report a missing data directory rather than inventing one', async () => {
    const { code, stderr } = await run('node', [GUARD], {
      input: JSON.stringify(call('architect', 'high')),
    });

    strictEqual(code, 1);
    strictEqual(stderr.includes('--data-dir is required'), true);
  });
});

/**
 * The identity repair over the real payload shape. A child's governed role is
 * what its `subagent_type` selected, and no hook reports that: on the teammate
 * spawn path `agent_type` holds the worker's assigned address, which resolves
 * out-of-domain — and out-of-domain is an allow. So the role is read from the
 * runtime's own per-agent record, keyed by the exact `agent_id`.
 */
describe('guard governed child identity', () => {
  const AGENT = 'aarc-reviewer-a649572ecba89ff0';

  async function lensProject(): Promise<string> {
    return await project({
      'reviewer.md': definition('name: reviewer\nmodel: opus\neffort: high'),
      'explore.md': definition('name: Explore\nmodel: haiku'),
    });
  }

  /** One effort-bearing event from a child worker, against a written record. */
  async function child(
    root: string,
    record: string | null,
    level: string | undefined,
    agentId = AGENT,
  ): Promise<Observation> {
    const transcript = await childRecord(root, agentId, record);
    const { record: observation } = await observed(root, {
      hook_event_name: 'PreToolUse',
      session_id: 'session-1',
      cwd: '/workspaces',
      transcript_path: transcript,
      agent_id: agentId,
      agent_type: 'arc-reviewer',
      ...(level != null && { effort: { level } }),
    });

    return observation;
  }

  const TEAMMATE = JSON.stringify({
    agentType: 'arc-reviewer',
    name: 'arc-reviewer',
    customAgentType: 'reviewer',
    taskKind: 'in_process_teammate',
  });
  const SUBAGENT = JSON.stringify({
    agentType: 'reviewer',
    name: 'arc-reviewer',
    toolUseId: 'toolu_1',
    spawnDepth: 1,
  });

  it('should resolve the role a teammate record names', async () => {
    const record = await child(await lensProject(), TEAMMATE, 'high');

    strictEqual(record.governed_role, 'reviewer');
  });

  it('should allow a teammate child at its declared level', async () => {
    const record = await child(await lensProject(), TEAMMATE, 'high');

    strictEqual(record.decision, 'allow');
  });

  it('should deny a teammate child at the wrong level', async () => {
    const record = await child(await lensProject(), TEAMMATE, 'medium');

    strictEqual(record.cause, 'mismatch');
  });

  it('should hold it to the resolved role rather than the address', async () => {
    const record = await child(await lensProject(), TEAMMATE, 'medium');

    strictEqual(record.declared, 'high');
  });

  it('should resolve the role a subagent record names', async () => {
    const record = await child(await lensProject(), SUBAGENT, 'high');

    strictEqual(record.governed_role, 'reviewer');
  });

  it('should allow a subagent child at its declared level', async () => {
    const record = await child(await lensProject(), SUBAGENT, 'high');

    strictEqual(record.cause, 'match');
  });

  // Both identities are evidence. The failure was invisible because nothing
  // recorded a second opinion beside what the runtime said.
  it('should keep the runtime agent_type beside the resolved role', async () => {
    const record = await child(await lensProject(), TEAMMATE, 'high');

    strictEqual(record.agent_type, 'arc-reviewer');
  });

  it('should say the role came from the per-agent record', async () => {
    const record = await child(await lensProject(), TEAMMATE, 'high');

    strictEqual(record.identity_source, 'agent-record');
  });

  it('should say a main-thread role came from agent_type', async () => {
    const { record } = await observed(
      await lensProject(),
      call('reviewer', 'high'),
    );

    strictEqual(record.identity_source, 'agent-type');
  });

  it('should leave a main-thread role resolving as it did', async () => {
    const { record } = await observed(
      await lensProject(),
      call('reviewer', 'high'),
    );

    strictEqual(record.governed_role, 'reviewer');
  });

  it('should allow a child whose selected role is out of domain', async () => {
    const record = await child(
      await lensProject(),
      JSON.stringify({ agentType: 'general-purpose' }),
      'medium',
    );

    strictEqual(record.decision, 'allow');
  });

  it('should record that child as out-of-domain rather than governed', async () => {
    const record = await child(
      await lensProject(),
      JSON.stringify({ agentType: 'general-purpose' }),
      'medium',
    );

    strictEqual(record.resolution, 'out-of-domain');
  });

  it('should keep an exempt child exempt', async () => {
    const record = await child(
      await lensProject(),
      JSON.stringify({ agentType: 'probe', customAgentType: 'Explore' }),
      undefined,
    );

    strictEqual(record.cause, 'exempt');
  });

  it('should resolve a resumed worker from its stable agent_id', async () => {
    const root = await lensProject();

    await child(root, TEAMMATE, 'high');

    const second = await child(root, null, 'high');

    strictEqual(second.cause, 'match');
  });
});

/**
 * The private record is the one thing this design depends on that the runtime
 * does not document. Every way of failing to read a role out of it denies, so a
 * runtime that moves or renames it stops governed child work at once instead of
 * silently returning to the state being fixed.
 */
describe('guard unresolvable child identity', () => {
  const AGENT = 'aworker-1234567890abcdef';

  async function unresolved(record: string | null, path?: string) {
    const root = await project({
      'reviewer.md': definition('name: reviewer\nmodel: opus\neffort: high'),
    });
    const transcript = await childRecord(root, AGENT, record);
    const { record: observation, stdout } = await observed(
      root,
      {
        hook_event_name: 'PreToolUse',
        session_id: 'session-1',
        cwd: '/workspaces',
        ...(path !== '' && { transcript_path: path ?? transcript }),
        agent_id: AGENT,
        agent_type: 'arc-reviewer',
        effort: { level: 'medium' },
      },
      { HARNESS_EFFORT_GUARD_MODE: 'enforce' },
    );

    return { record: observation, stdout };
  }

  it('should deny when the record is missing', async () => {
    const { record } = await unresolved(null);

    strictEqual(record.cause, 'unresolved-identity');
  });

  it('should block that call under enforcement', async () => {
    const { stdout } = await unresolved(null);

    strictEqual(blocked(stdout), true);
  });

  it('should deny when the record is malformed', async () => {
    const { record } = await unresolved('{ not json');

    strictEqual(record.cause, 'unresolved-identity');
  });

  it('should deny when the record is not an object', async () => {
    const { record } = await unresolved('null');

    strictEqual(record.cause, 'unresolved-identity');
  });

  it('should deny when the record names no role', async () => {
    const { record } = await unresolved(JSON.stringify({ spawnDepth: 1 }));

    strictEqual(record.cause, 'unresolved-identity');
  });

  it('should deny when the payload carries no transcript path', async () => {
    const { record } = await unresolved(
      JSON.stringify({ agentType: 'reviewer' }),
      '',
    );

    strictEqual(record.cause, 'unresolved-identity');
  });

  it('should deny when the transcript path is not one it can read from', async () => {
    const { record } = await unresolved(
      JSON.stringify({ agentType: 'reviewer' }),
      '/nowhere/session',
    );

    strictEqual(record.cause, 'unresolved-identity');
  });

  // Never the reported agent_type, which is what an out-of-domain allow would
  // have been built on.
  it('should not fall back to the runtime agent_type', async () => {
    const { record } = await unresolved(null);

    strictEqual(record.decision, 'deny');
  });

  it('should still record what the runtime called the worker', async () => {
    const { record } = await unresolved(null);

    strictEqual(record.agent_type, 'arc-reviewer');
  });
});

/**
 * `SubagentStart` fires before the runtime writes the record, and cannot deny.
 * So identity is deferred there rather than resolved from the address, which
 * would make the log assert out-of-domain about a worker that is governed.
 */
describe('guard deferred child identity', () => {
  async function announce(): Promise<
    Readonly<{ record: Observation; stdout: string }>
  > {
    const root = await project({
      'reviewer.md': definition('name: reviewer\nmodel: opus\neffort: high'),
    });

    return await observed(root, {
      hook_event_name: 'SubagentStart',
      session_id: 'session-1',
      cwd: '/workspaces',
      transcript_path: `${root}/transcripts/session-1.jsonl`,
      agent_id: 'aarc-reviewer-a649572ecba89ff0',
      agent_type: 'arc-reviewer',
    });
  }

  it('should record the identity as deferred', async () => {
    const { record } = await announce();

    strictEqual(record.identity_source, 'deferred');
  });

  it('should claim no role for a worker it has not resolved', async () => {
    const { record } = await announce();

    strictEqual('governed_role' in record, false);
  });

  it('should not record the address as an out-of-domain role', async () => {
    const { record } = await announce();

    strictEqual(record.resolution, 'no-role');
  });

  it('should still announce the guard to the worker', async () => {
    const { stdout } = await announce();

    strictEqual(context(stdout).includes('Effort guard active'), true);
  });
});

/**
 * The dispatcher's identity is the resolved governed role too. A consolidator
 * running as a named teammate reports its address as `agent_type`, and a
 * topology keyed on that field would find no entry for it and leave the one
 * dispatcher the harness constrains unconstrained.
 */
describe('guard governed dispatcher identity', () => {
  const AGENT = 'around-console-0123456789abcdef';

  async function roundProject(): Promise<string> {
    return await project({
      'consolidator.md': definition(
        'name: consolidator\nmodel: opus\neffort: medium',
      ),
      'reviewer.md': definition('name: reviewer\nmodel: opus\neffort: high'),
      'integrity.md': definition(
        'name: integrity\nmodel: sonnet\neffort: high',
      ),
      'cleanup.md': definition('name: cleanup\nmodel: sonnet\neffort: medium'),
      'der.md': definition('name: der\nmodel: opus\neffort: medium'),
    });
  }

  async function dispatches(
    tool_input: Readonly<{ subagent_type?: string; name?: string }>,
  ): Promise<Observation> {
    const root = await roundProject();
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({
        agentType: 'round-console',
        customAgentType: 'consolidator',
        taskKind: 'in_process_teammate',
      }),
    );
    const { record } = await observed(root, {
      hook_event_name: 'PreToolUse',
      session_id: 'session-1',
      cwd: '/workspaces',
      transcript_path: transcript,
      agent_id: AGENT,
      agent_type: 'round-console',
      effort: { level: 'medium' },
      tool_name: 'Agent',
      tool_input,
    });

    return record;
  }

  it('should hold a named consolidator to its topology', async () => {
    const record = await dispatches({ subagent_type: 'general-purpose' });

    strictEqual(record.cause, 'topology-escape');
  });

  it('should let a named consolidator launch an unnamed lens', async () => {
    const record = await dispatches({ subagent_type: 'reviewer' });

    strictEqual(record.decision, 'allow');
  });

  it('should record the dispatcher under its resolved role', async () => {
    const record = await dispatches({ subagent_type: 'general-purpose' });

    strictEqual(record.governed_role, 'consolidator');
  });
});

/**
 * The Review Swarm containment. The identity repair lets the guard understand a
 * named worker; it does not make the runtime run one as the role that was
 * selected, and named lenses declaring `high` were observed running at the
 * parent's `medium`. Until that changes the swarm stays on the unnamed path.
 */
describe('guard review swarm containment', () => {
  async function swarmProject(): Promise<string> {
    return await project({
      'consolidator.md': definition(
        'name: consolidator\nmodel: opus\neffort: medium',
      ),
      'reviewer.md': definition('name: reviewer\nmodel: opus\neffort: high'),
      'integrity.md': definition(
        'name: integrity\nmodel: sonnet\neffort: high',
      ),
      'cleanup.md': definition('name: cleanup\nmodel: sonnet\neffort: medium'),
      'der.md': definition('name: der\nmodel: opus\neffort: medium'),
      'architect.md': definition('name: architect\nmodel: opus\neffort: high'),
    });
  }

  async function launches(
    agent: string,
    level: string,
    tool_input: Readonly<{ subagent_type?: string; name?: string }>,
  ): Promise<Observation> {
    const { record } = await observed(await swarmProject(), {
      ...call(agent, level),
      tool_name: 'Agent',
      tool_input,
    });

    return record;
  }

  it('should deny a named lens spawn', async () => {
    const record = await launches('consolidator', 'medium', {
      subagent_type: 'reviewer',
      name: 'arcb-rem-reviewer',
    });

    strictEqual(record.cause, 'topology-name');
  });

  it('should deny it for every lens the topology permits', async () => {
    for (const lens of ['reviewer', 'integrity', 'cleanup', 'der']) {
      const record = await launches('consolidator', 'medium', {
        subagent_type: lens,
        name: `pass-${lens}`,
      });

      strictEqual(record.cause, 'topology-name', lens);
    }
  });

  it('should allow the ordinary unnamed lens dispatch', async () => {
    const record = await launches('consolidator', 'medium', {
      subagent_type: 'integrity',
    });

    strictEqual(record.cause, 'match');
  });

  it('should record the name a denied spawn asked for', async () => {
    const record = await launches('consolidator', 'medium', {
      subagent_type: 'reviewer',
      name: 'arcb-rem-reviewer',
    });

    strictEqual(record.dispatch_name, 'arcb-rem-reviewer');
  });

  // The containment is the swarm boundary's, not a rule about names. Named
  // workers stay legitimate everywhere the topology has no opinion.
  it('should allow a named worker from an unconstrained dispatcher', async () => {
    const record = await launches('architect', 'high', {
      subagent_type: 'general-purpose',
      name: 'doc-surveyor',
    });

    strictEqual(record.decision, 'allow');
  });

  it('should deny a governed role name used as an address anywhere', async () => {
    const record = await launches('architect', 'high', {
      subagent_type: 'general-purpose',
      name: 'reviewer',
    });

    strictEqual(record.cause, 'topology-identity');
  });

  it('should allow a name that selects the role it claims', async () => {
    const record = await launches('architect', 'high', {
      subagent_type: 'architect',
      name: 'architect',
    });

    strictEqual(record.decision, 'allow');
  });
});

/**
 * The model a role declares is executable in the same sense as its effort. At
 * dispatch the check needs nothing observed about a running child, which is why
 * it is made there as well as at the child's own events.
 */
describe('guard governed model at dispatch', () => {
  async function selects(
    tool_input: Readonly<{ subagent_type?: string; model?: string }>,
  ): Promise<Observation> {
    const root = await project({
      'consolidator.md': definition(
        'name: consolidator\nmodel: opus\neffort: medium',
      ),
      'reviewer.md': definition('name: reviewer\nmodel: opus\neffort: high'),
      'integrity.md': definition(
        'name: integrity\nmodel: sonnet\neffort: high',
      ),
      'cleanup.md': definition('name: cleanup\nmodel: sonnet\neffort: medium'),
      'der.md': definition('name: der\nmodel: opus\neffort: medium'),
    });
    const { record } = await observed(root, {
      ...call('consolidator', 'medium'),
      tool_name: 'Agent',
      tool_input,
    });

    return record;
  }

  it('should allow a sonnet lens selected with no override', async () => {
    const record = await selects({ subagent_type: 'integrity' });

    strictEqual(record.decision, 'allow');
  });

  it('should allow a sonnet lens selected with sonnet', async () => {
    const record = await selects({
      subagent_type: 'integrity',
      model: 'sonnet',
    });

    strictEqual(record.decision, 'allow');
  });

  it('should deny a sonnet lens selected with opus', async () => {
    const record = await selects({ subagent_type: 'integrity', model: 'opus' });

    strictEqual(record.cause, 'dispatch-model');
  });

  it('should deny cleanup selected with opus', async () => {
    const record = await selects({ subagent_type: 'cleanup', model: 'opus' });

    strictEqual(record.cause, 'dispatch-model');
  });

  it('should allow reviewer selected with opus', async () => {
    const record = await selects({ subagent_type: 'reviewer', model: 'opus' });

    strictEqual(record.decision, 'allow');
  });

  it('should allow der selected with opus', async () => {
    const record = await selects({ subagent_type: 'der', model: 'opus' });

    strictEqual(record.decision, 'allow');
  });

  it('should record the model the call asked for', async () => {
    const record = await selects({ subagent_type: 'integrity', model: 'opus' });

    strictEqual(record.dispatch_model, 'opus');
  });
});

/**
 * The runtime half. The per-agent record exposes the effective model on the
 * teammate shape and not on the subagent one, so the check is made where the
 * evidence exists and reported as unverified where it does not.
 */
describe('guard governed model at runtime', () => {
  const AGENT = 'apass-integrity-50f9a6228593bfa1';

  async function ran(
    record: Readonly<Record<string, unknown>>,
  ): Promise<Observation> {
    const root = await project({
      'integrity.md': definition(
        'name: integrity\nmodel: sonnet\neffort: high',
      ),
    });
    const transcript = await childRecord(root, AGENT, JSON.stringify(record));
    const { record: observation } = await observed(root, {
      hook_event_name: 'PreToolUse',
      session_id: 'session-1',
      cwd: '/workspaces',
      transcript_path: transcript,
      agent_id: AGENT,
      agent_type: 'pass-integrity',
      effort: { level: 'high' },
    });

    return observation;
  }

  const TEAMMATE = {
    agentType: 'pass-integrity',
    customAgentType: 'integrity',
    taskKind: 'in_process_teammate',
  };

  it('should allow a child running the model its role declares', async () => {
    const record = await ran({ ...TEAMMATE, model: 'claude-sonnet-5' });

    strictEqual(record.decision, 'allow');
  });

  it('should record that model check as a match', async () => {
    const record = await ran({ ...TEAMMATE, model: 'claude-sonnet-5' });

    strictEqual(record.model_check, 'match');
  });

  it('should deny a child running a model its role does not declare', async () => {
    const record = await ran({ ...TEAMMATE, model: 'claude-opus-5' });

    strictEqual(record.cause, 'model-mismatch');
  });

  it('should record the runtime model beside the declared one', async () => {
    const record = await ran({ ...TEAMMATE, model: 'claude-opus-5' });

    strictEqual(record.runtime_model, 'claude-opus-5');
    strictEqual(record.declared_model, 'sonnet');
  });

  // A record shape carrying no model supports no verdict about one. Claiming a
  // pass there would be the instrument inventing evidence.
  it('should not fabricate a check the record cannot support', async () => {
    const record = await ran({ agentType: 'integrity', toolUseId: 'toolu_1' });

    strictEqual(record.model_check, 'unverified');
  });

  it('should allow that child on its effort alone', async () => {
    const record = await ran({ agentType: 'integrity', toolUseId: 'toolu_1' });

    strictEqual(record.cause, 'match');
  });

  it('should leave an out-of-domain child outside the model invariant', async () => {
    const record = await ran({
      agentType: 'general-purpose',
      model: 'claude-opus-5',
    });

    strictEqual(record.decision, 'allow');
  });
});
