import { strictEqual } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
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
  agent_type?: string;
  model?: string;
  tool_name?: string;
  tool_input?: Readonly<{ subagent_type?: string; name?: string }>;
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
