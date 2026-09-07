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

  // The environment check precedes the exemption. The exempt role is the
  // session's own router and the only actor that can dispatch, so denying it
  // stops the fault at its source rather than reporting it at a bystander.
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

const ROUTER: Resolution = {
  kind: 'exempt',
  role: 'agent-router',
  file: '/agents/agent-router.md',
};
const CONSOLIDATOR: Resolution = {
  kind: 'declared',
  role: 'consolidator',
  effort: 'medium',
  file: '/agents/consolidator.md',
};

/** A router spawning `target`, optionally under the worker `name` given. */
function routes(target: string, identity?: string): Check {
  return check({
    role: 'agent-router',
    resolution: ROUTER,
    actual: undefined,
    dispatching: true,
    target,
    identity,
  });
}

/** A consolidator launching one review lens. */
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
 * The observed failure: the router spawned `general-purpose` where the owner
 * addressed `architect`, the child resolved `out-of-domain`, and every row of
 * the effort table allowed it — the substitution was invisible to the invariant
 * precisely because it left the domain the invariant governs.
 *
 * So these cases are about the target role, not about the prose that asks for
 * it. `subagent_type` reaches the hook, so it is what they assert on.
 */
describe('judge governed dispatch topology', () => {
  it('should deny a router substituting a general-purpose worker', () => {
    strictEqual(judge(routes('general-purpose')).decision, 'deny');
  });

  it('should name the escape as the cause', () => {
    const verdict = judge(routes('general-purpose'));

    strictEqual(
      verdict.decision === 'deny' && verdict.cause,
      'topology-escape',
    );
  });

  it('should deny a substitution carrying the governed worker name', () => {
    strictEqual(judge(routes('general-purpose', 'architect')).decision, 'deny');
  });

  it('should deny a router spawning a role no dispatcher may select', () => {
    strictEqual(judge(routes('Explore')).decision, 'deny');
  });

  it('should allow a router spawning a resumable named worker', () => {
    strictEqual(judge(routes('architect', 'architect')).decision, 'allow');
  });

  it('should allow a router spawning a one-shot worker', () => {
    strictEqual(judge(routes('consolidator')).decision, 'allow');
  });

  it('should allow a router spawning a review lens directly', () => {
    strictEqual(judge(routes('cleanup')).decision, 'allow');
  });

  // `name` addresses a worker for a later resume; `subagent_type` chooses the
  // role it runs as. A call can carry one and not the other, which is the
  // ambiguity the router definition used to leave open.
  it('should deny a worker named for a role its type does not select', () => {
    strictEqual(judge(routes('implementer', 'architect')).decision, 'deny');
  });

  it('should name the identity claim as the cause', () => {
    const verdict = judge(routes('implementer', 'architect'));

    strictEqual(
      verdict.decision === 'deny' && verdict.cause,
      'topology-identity',
    );
  });

  it('should allow a descriptive name alongside a governed type', () => {
    strictEqual(judge(routes('reviewer', 'arc-b-pass')).decision, 'allow');
  });

  it('should deny a consolidator substituting a generic worker for a lens', () => {
    strictEqual(judge(launches('general-purpose')).decision, 'deny');
  });

  it('should deny a consolidator spawning outside its four lenses', () => {
    strictEqual(judge(launches('architect')).decision, 'deny');
  });

  it('should allow a consolidator launching each of its lenses', () => {
    for (const lens of ['reviewer', 'integrity', 'cleanup', 'der']) {
      strictEqual(judge(launches(lens)).decision, 'allow', lens);
    }
  });

  // The assertion is scoped to the two dispatchers the topology constrains.
  // An ordinary worker delegating a search is legitimate and stays so.
  it('should allow an ordinary worker spawning a general-purpose agent', () => {
    const verdict = judge(
      check({ dispatching: true, target: 'general-purpose' }),
    );

    strictEqual(verdict.decision, 'allow');
  });

  it('should allow a resume, which selects no role', () => {
    const verdict = judge(
      check({
        role: 'agent-router',
        resolution: ROUTER,
        actual: undefined,
        dispatching: true,
        target: undefined,
        identity: 'architect',
      }),
    );

    strictEqual(verdict.decision, 'allow');
  });

  // Read before the effort machinery: the escape is what the effort rows cannot
  // see, so a dispatcher whose own resolution failed must still be refused.
  it('should deny an escape even when the resolver failed', () => {
    const verdict = judge(
      check({
        role: 'agent-router',
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
