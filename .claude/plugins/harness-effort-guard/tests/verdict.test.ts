import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Resolution } from '../scripts/resolve-role.ts';
import { judge, type Check } from '../scripts/verdict.ts';

const DECLARED: Resolution = {
  kind: 'declared',
  role: 'architect',
  effort: 'high',
  file: '/agents/architect.md',
};
const EXEMPT: Resolution = {
  kind: 'exempt',
  role: 'Explore',
  file: '/agents/explore.md',
};
const UNDECLARED: Resolution = {
  kind: 'undeclared',
  role: 'cleanup',
  file: '/agents/cleanup.md',
};

function check(overrides: Partial<Check> = {}): Check {
  return {
    role: 'architect',
    resolution: DECLARED,
    actual: 'high',
    poisoned: false,
    dispatching: false,
    target: undefined,
    identity: undefined,
    worktree: false,
    root: '/checkout',
    error: undefined,
    ...overrides,
  };
}

describe('judge', () => {
  it('should allow when no role is acting', () => {
    const verdict = judge(check({ role: undefined, resolution: undefined }));

    strictEqual(verdict.decision, 'allow');
  });

  it('should allow a name outside the domain', () => {
    const resolution: Resolution = { kind: 'out-of-domain', role: 'whoever' };

    strictEqual(judge(check({ resolution })).decision, 'allow');
  });

  it('should allow a declared level the runtime reports', () => {
    strictEqual(judge(check()).decision, 'allow');
  });

  it('should deny a level the runtime reports differently', () => {
    strictEqual(judge(check({ actual: 'medium' })).decision, 'deny');
  });

  it('should deny a declared level the runtime does not report', () => {
    strictEqual(judge(check({ actual: undefined })).decision, 'deny');
  });

  it('should deny a governed role that declares no effort', () => {
    const verdict = judge(check({ resolution: UNDECLARED, actual: 'high' }));

    strictEqual(verdict.decision, 'deny');
  });

  it('should deny a role bearing the invariant under a process-wide override', () => {
    strictEqual(judge(check({ poisoned: true })).decision, 'deny');
  });

  it('should deny when the resolver failed', () => {
    const verdict = judge(check({ resolution: undefined, error: 'two files' }));

    strictEqual(verdict.decision, 'deny');
  });

  it('should allow an exempt role reporting no effort', () => {
    const verdict = judge(check({ resolution: EXEMPT, actual: undefined }));

    strictEqual(verdict.decision, 'allow');
  });

  it('should record an exempt allow under its own reason', () => {
    const verdict = judge(check({ resolution: EXEMPT, actual: undefined }));

    strictEqual(verdict.decision === 'allow' && verdict.reason, 'exempt');
  });

  it('should allow an exempt role whatever effort the runtime reports', () => {
    const verdict = judge(check({ resolution: EXEMPT, actual: 'low' }));

    strictEqual(verdict.decision, 'allow');
  });

  // The environment check precedes the exemption. The override is a property of
  // the session, and no role in it can reach a declared level, so a role
  // carrying none is not a hole to act through.
  it('should deny an exempt role under a process-wide override', () => {
    const verdict = judge(
      check({ resolution: EXEMPT, actual: undefined, poisoned: true }),
    );

    strictEqual(verdict.decision, 'deny');
  });

  it('should name the environment as the cause for an exempt role', () => {
    const verdict = judge(
      check({ resolution: EXEMPT, actual: undefined, poisoned: true }),
    );

    strictEqual(verdict.decision === 'deny' && verdict.cause, 'poisoned-env');
  });

  it('should still allow an exempt role in a clean environment', () => {
    const verdict = judge(check({ resolution: EXEMPT, actual: undefined }));

    strictEqual(verdict.decision, 'allow');
  });
});

const CONSOLIDATOR: Resolution = {
  kind: 'declared',
  role: 'consolidator',
  effort: 'medium',
  file: '/agents/consolidator.md',
};

/** A consolidator launching one review lens, optionally under a worker `name`. */
function launches(target: string, identity?: string): Check {
  return check({
    role: 'consolidator',
    resolution: CONSOLIDATOR,
    actual: 'medium',
    dispatching: true,
    target,
    identity,
  });
}

/**
 * The failure this answers was observed: a dispatcher asked for a governed role
 * spawned `general-purpose` instead, the child resolved `out-of-domain`, and
 * every row of the effort table allowed it — the substitution was invisible to
 * the invariant precisely because it left the domain the invariant governs.
 *
 * So these cases are about the target role, not about the prose that asks for
 * it. `subagent_type` reaches the hook, so it is what they assert on.
 */
describe('judge governed dispatch topology', () => {
  it('should deny a consolidator substituting a general-purpose worker', () => {
    strictEqual(judge(launches('general-purpose')).decision, 'deny');
  });

  it('should name the escape as the cause', () => {
    const verdict = judge(launches('general-purpose'));

    strictEqual(
      verdict.decision === 'deny' && verdict.cause,
      'topology-escape',
    );
  });

  it('should deny a substitution carrying a governed lens name', () => {
    strictEqual(
      judge(launches('general-purpose', 'reviewer')).decision,
      'deny',
    );
  });

  it('should deny a consolidator spawning outside its four lenses', () => {
    strictEqual(judge(launches('architect')).decision, 'deny');
  });

  it('should deny a lens no dispatcher may select', () => {
    strictEqual(judge(launches('Explore')).decision, 'deny');
  });

  it('should allow a consolidator launching each of its lenses', () => {
    for (const lens of ['reviewer', 'integrity', 'cleanup', 'der']) {
      strictEqual(judge(launches(lens)).decision, 'allow', lens);
    }
  });

  it('should allow a name matching the lens its type selects', () => {
    strictEqual(judge(launches('reviewer', 'reviewer')).decision, 'allow');
  });

  // `name` addresses a worker for a later resume; `subagent_type` chooses the
  // role it runs as. A call can carry one and not the other, which is the
  // ambiguity the dispatcher prose used to leave open.
  it('should deny a worker named for a role its type does not select', () => {
    strictEqual(judge(launches('cleanup', 'reviewer')).decision, 'deny');
  });

  it('should name the identity claim as the cause', () => {
    const verdict = judge(launches('cleanup', 'reviewer'));

    strictEqual(
      verdict.decision === 'deny' && verdict.cause,
      'topology-identity',
    );
  });

  it('should allow a descriptive name alongside a governed type', () => {
    strictEqual(judge(launches('reviewer', 'arc-b-pass')).decision, 'allow');
  });

  // The assertion is scoped to the dispatchers the topology constrains. An
  // ordinary worker delegating a search is legitimate and stays so.
  it('should allow an ordinary worker spawning a general-purpose agent', () => {
    const verdict = judge(
      check({ dispatching: true, target: 'general-purpose' }),
    );

    strictEqual(verdict.decision, 'allow');
  });

  it('should allow a resume, which selects no role', () => {
    const verdict = judge(
      check({
        role: 'consolidator',
        resolution: CONSOLIDATOR,
        actual: 'medium',
        dispatching: true,
        target: undefined,
        identity: 'reviewer',
      }),
    );

    strictEqual(verdict.decision, 'allow');
  });

  // Read before the effort machinery: the escape is what the effort rows cannot
  // see, so a dispatcher whose own resolution failed must still be refused.
  it('should deny an escape even when the resolver failed', () => {
    const verdict = judge(
      check({
        role: 'consolidator',
        resolution: undefined,
        error: 'two files',
        dispatching: true,
        target: 'general-purpose',
      }),
    );

    strictEqual(
      verdict.decision === 'deny' && verdict.cause,
      'topology-escape',
    );
  });
});
