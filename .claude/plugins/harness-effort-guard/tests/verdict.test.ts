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

  it('should allow an exempt role under a process-wide override', () => {
    const verdict = judge(
      check({ resolution: EXEMPT, actual: undefined, poisoned: true }),
    );

    strictEqual(verdict.decision, 'allow');
  });
});
