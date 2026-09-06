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
} from './support.ts';

const GUARD = join(SCRIPTS, 'guard.ts');

type Event = Readonly<{
  hook_event_name: string;
  session_id: string;
  cwd: string;
  agent_type?: string;
  model?: string;
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

  it('should allow an exempt role under a process-wide override', async () => {
    const { record } = await observed(await exemptProject(), call('Explore'), {
      CLAUDE_CODE_EFFORT_LEVEL: 'medium',
      HARNESS_EFFORT_GUARD_MODE: 'enforce',
    });

    strictEqual(record.decision, 'allow');
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
