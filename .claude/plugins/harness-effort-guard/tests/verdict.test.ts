import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Resolution } from '../scripts/resolve-role.ts';
import {
  checkModel,
  judge,
  modelMatches,
  type Check,
} from '../scripts/verdict.ts';

const DECLARED: Resolution = {
  kind: 'declared',
  role: 'architect',
  model: 'opus',
  effort: 'high',
  file: '/agents/architect.md',
};
const EXEMPT: Resolution = {
  kind: 'exempt',
  role: 'Explore',
  model: 'haiku',
  file: '/agents/explore.md',
};
const UNDECLARED: Resolution = {
  kind: 'undeclared',
  role: 'cleanup',
  model: 'sonnet',
  file: '/agents/cleanup.md',
};

function check(overrides: Partial<Check> = {}): Check {
  return {
    role: 'architect',
    identityError: undefined,
    resolution: DECLARED,
    actual: 'high',
    poisoned: false,
    dispatching: false,
    target: undefined,
    assignedName: undefined,
    nameClaimsRole: false,
    requestedModel: undefined,
    targetModel: undefined,
    runtimeModel: undefined,
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
  model: 'opus',
  effort: 'medium',
  file: '/agents/consolidator.md',
};

/**
 * A consolidator launching one review lens, optionally under a worker `name`.
 *
 * A name given here claims a governed role unless the case says otherwise,
 * which is the shape the widened identity rule is about.
 */
function launches(
  target: string,
  assignedName?: string,
  nameClaimsRole = assignedName != null,
): Check {
  return check({
    role: 'consolidator',
    resolution: CONSOLIDATOR,
    actual: 'medium',
    dispatching: true,
    target,
    assignedName,
    nameClaimsRole,
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

  // The containment rule: a named spawn takes the runtime's teammate path,
  // where the selected role's declared model and effort were observed not to be
  // honoured. The name agreeing with the type does not repair that.
  it('should deny a lens spawned under a runtime name', () => {
    strictEqual(judge(launches('reviewer', 'reviewer')).decision, 'deny');
  });

  it('should name the runtime name as the cause', () => {
    const verdict = judge(launches('reviewer', 'reviewer'));

    strictEqual(verdict.decision === 'deny' && verdict.cause, 'topology-name');
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

  it('should deny a descriptive name alongside a governed type', () => {
    strictEqual(
      judge(launches('reviewer', 'arc-b-pass', false)).decision,
      'deny',
    );
  });

  it('should allow an unnamed lens dispatch', () => {
    strictEqual(judge(launches('reviewer')).decision, 'allow');
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
        assignedName: 'reviewer',
        nameClaimsRole: true,
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

/**
 * The identity repair, at the level of the decision it changes: `role` is the
 * governed role a child's record named, and a child whose record could not be
 * read arrives with no role for the opposite reason a main thread does.
 */
describe('judge governed identity', () => {
  it('should deny a child whose identity could not be established', () => {
    const verdict = judge(
      check({
        role: undefined,
        resolution: undefined,
        identityError: 'no record',
      }),
    );

    strictEqual(verdict.decision, 'deny');
  });

  it('should name the identity failure as the cause', () => {
    const verdict = judge(
      check({
        role: undefined,
        resolution: undefined,
        identityError: 'no record',
      }),
    );

    strictEqual(
      verdict.decision === 'deny' && verdict.cause,
      'unresolved-identity',
    );
  });

  // The failure mode being closed: an unestablished identity looks exactly like
  // a main thread carrying no role, and that allow is what let four ungoverned
  // lenses through.
  it('should not read an unestablished identity as no role acting', () => {
    const verdict = judge(check({ role: undefined, resolution: undefined }));

    strictEqual(verdict.decision, 'allow');
  });

  it('should refuse identity failure ahead of the resolver failing too', () => {
    const verdict = judge(
      check({
        role: undefined,
        resolution: undefined,
        identityError: 'no record',
        error: 'two files',
      }),
    );

    strictEqual(
      verdict.decision === 'deny' && verdict.cause,
      'unresolved-identity',
    );
  });
});

/**
 * A governed role name may not be used as an address, whoever dispatches. On
 * the ordinary subagent path the runtime records the assigned name as the
 * worker's own type, so such a call would resolve a general-purpose worker as
 * the lens it was merely named after.
 */
describe('judge governed name masquerade', () => {
  function names(target: string, assignedName: string): Check {
    return check({
      dispatching: true,
      target,
      assignedName,
      nameClaimsRole: true,
    });
  }

  it('should deny a governed role name outside the topology table', () => {
    strictEqual(judge(names('general-purpose', 'reviewer')).decision, 'deny');
  });

  it('should name the identity claim as the cause outside the table', () => {
    const verdict = judge(names('general-purpose', 'reviewer'));

    strictEqual(
      verdict.decision === 'deny' && verdict.cause,
      'topology-identity',
    );
  });

  it('should deny a governed role name that is not a review lens', () => {
    strictEqual(
      judge(names('general-purpose', 'implementer')).decision,
      'deny',
    );
  });

  it('should allow a descriptive name outside the topology table', () => {
    const verdict = judge(
      check({
        dispatching: true,
        target: 'general-purpose',
        assignedName: 'doc-surveyor',
        nameClaimsRole: false,
      }),
    );

    strictEqual(verdict.decision, 'allow');
  });

  it('should allow a name that selects the role it claims', () => {
    strictEqual(judge(names('Explore', 'Explore')).decision, 'allow');
  });
});

/**
 * The model a role declares is part of its contract in the same sense as the
 * effort it declares, and the two are independent: a worker matching one and
 * violating the other is invalid.
 */
describe('judge governed model at dispatch', () => {
  function selects(
    target: string,
    targetModel?: string,
    requestedModel?: string,
  ): Check {
    return check({
      dispatching: true,
      target,
      targetModel,
      requestedModel,
    });
  }

  it('should allow a governed role selected with no model override', () => {
    strictEqual(judge(selects('integrity', 'sonnet')).decision, 'allow');
  });

  it('should allow an override agreeing with the declaration', () => {
    strictEqual(
      judge(selects('integrity', 'sonnet', 'sonnet')).decision,
      'allow',
    );
  });

  it('should deny an override contradicting the declaration', () => {
    strictEqual(judge(selects('integrity', 'sonnet', 'opus')).decision, 'deny');
  });

  it('should name the dispatch override as the cause', () => {
    const verdict = judge(selects('integrity', 'sonnet', 'opus'));

    strictEqual(verdict.decision === 'deny' && verdict.cause, 'dispatch-model');
  });

  it('should allow an override agreeing with an opus declaration', () => {
    strictEqual(judge(selects('reviewer', 'opus', 'opus')).decision, 'allow');
  });

  // An out-of-domain target declares nothing, so there is nothing to contradict.
  it('should leave an out-of-domain target outside the model invariant', () => {
    strictEqual(
      judge(selects('general-purpose', undefined, 'opus')).decision,
      'allow',
    );
  });
});

/**
 * The runtime half of the model contract, which is available only where the
 * per-agent record carries a model at all.
 */
describe('judge governed model at runtime', () => {
  const INTEGRITY: Resolution = {
    kind: 'declared',
    role: 'integrity',
    model: 'sonnet',
    effort: 'high',
    file: '/agents/integrity.md',
  };

  function ran(runtimeModel?: string): Check {
    return check({
      role: 'integrity',
      resolution: INTEGRITY,
      actual: 'high',
      runtimeModel,
    });
  }

  it('should allow a runtime model matching the declaration', () => {
    strictEqual(judge(ran('claude-sonnet-5')).decision, 'allow');
  });

  it('should allow an alias form of the declared model', () => {
    strictEqual(judge(ran('sonnet')).decision, 'allow');
  });

  it('should deny a runtime model contradicting the declaration', () => {
    strictEqual(judge(ran('claude-opus-5')).decision, 'deny');
  });

  it('should name the runtime model as the cause', () => {
    const verdict = judge(ran('claude-opus-5'));

    strictEqual(verdict.decision === 'deny' && verdict.cause, 'model-mismatch');
  });

  // Absent evidence is not a passed check, and it is not a failed one either.
  it('should allow when the record carries no runtime model', () => {
    strictEqual(judge(ran()).decision, 'allow');
  });

  it('should deny an exempt role running on a model it does not declare', () => {
    const verdict = judge(
      check({
        role: 'Explore',
        resolution: EXEMPT,
        actual: undefined,
        runtimeModel: 'claude-opus-5',
      }),
    );

    strictEqual(verdict.decision === 'deny' && verdict.cause, 'model-mismatch');
  });

  it('should leave an out-of-domain child outside the model invariant', () => {
    const verdict = judge(
      check({
        role: 'whoever',
        resolution: { kind: 'out-of-domain', role: 'whoever' },
        actual: undefined,
        runtimeModel: 'claude-opus-5',
      }),
    );

    strictEqual(verdict.decision, 'allow');
  });

  // Independent checks: matching one does not excuse violating the other.
  it('should still deny a wrong effort under a matching model', () => {
    const verdict = judge(
      check({
        role: 'integrity',
        resolution: INTEGRITY,
        actual: 'medium',
        runtimeModel: 'claude-sonnet-5',
      }),
    );

    strictEqual(verdict.decision === 'deny' && verdict.cause, 'mismatch');
  });
});

describe('modelMatches', () => {
  it('should match an alias against itself', () => {
    strictEqual(modelMatches('opus', 'opus'), true);
  });

  it('should match an alias against a concrete identifier naming it', () => {
    strictEqual(modelMatches('opus', 'claude-opus-5'), true);
  });

  it('should not match an alias against another family', () => {
    strictEqual(modelMatches('sonnet', 'claude-opus-5'), false);
  });

  // Segment membership rather than a substring test, which would let an
  // identifier answer for a declaration that is merely spelled inside it.
  it('should not match a fragment of a segment', () => {
    strictEqual(modelMatches('pus', 'claude-opus-5'), false);
  });
});

describe('checkModel', () => {
  it('should report an unobservable runtime model as unverified', () => {
    strictEqual(checkModel('opus', undefined), 'unverified');
  });

  it('should report a role declaring no model as undeclared', () => {
    strictEqual(checkModel(null, 'claude-opus-5'), 'undeclared');
  });

  it('should report agreement as a match', () => {
    strictEqual(checkModel('opus', 'claude-opus-5'), 'match');
  });

  it('should report disagreement as a mismatch', () => {
    strictEqual(checkModel('sonnet', 'claude-opus-5'), 'mismatch');
  });
});
