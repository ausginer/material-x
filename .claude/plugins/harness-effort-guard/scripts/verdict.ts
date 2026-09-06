import type { Resolution } from './resolve-role.ts';

/**
 * The outcome of one effort check.
 *
 * `allow` carries no message; every `deny` carries one, in a single shape
 * whatever the cause — the guard reports expected against actual and requires
 * the role configuration or the invocation to be fixed. It classifies nothing
 * beyond that, and repairs nothing.
 */
export type Verdict =
  | Readonly<{ decision: 'allow'; reason: AllowReason }>
  | Readonly<{ decision: 'deny'; cause: DenyCause; message: string }>;

export type AllowReason = 'no-role' | 'out-of-domain' | 'exempt' | 'match';
export type DenyCause =
  | 'undeclared'
  | 'no-runtime-effort'
  | 'mismatch'
  | 'poisoned-env'
  | 'guard-error';

export type Check = Readonly<{
  /** Absent when no role is acting: the main thread of a session started without `--agent`. */
  role: string | undefined;
  /** Absent when the resolver threw; `error` then says why. */
  resolution: Resolution | undefined;
  /**
   * The effective effort the runtime reported for this turn, after any silent
   * downgrade for the selected model. Absent is a violation, not an excuse:
   * a model that cannot reach a declared level has not reached it. The one
   * exception is a role outside the effort invariant, for which absent is the
   * expected observation and nothing here is read at all.
   */
  actual: string | undefined;
  /** Whether `CLAUDE_CODE_EFFORT_LEVEL` is set in the guard's environment. */
  poisoned: boolean;
  error: string | undefined;
}>;

function deny(cause: DenyCause, message: string): Verdict {
  return { decision: 'deny', cause, message };
}

function violationMessage(
  role: string,
  expected: string | undefined,
  actual: string,
): string {
  return (
    'Harness effort invariant violated.\n\n' +
    `Role:     ${role}\n` +
    `Expected: ${expected}\n` +
    `Actual:   ${actual}\n\n` +
    'The tool call was blocked because this role is running at the wrong effort.\n' +
    'Fix the role configuration or the invocation; the guard does not repair session state.'
  );
}

function poisonMessage(role: string): string {
  return (
    'Harness effort invariant unenforceable.\n\n' +
    `Role:     ${role}\n` +
    'Cause:    CLAUDE_CODE_EFFORT_LEVEL is set\n\n' +
    'That variable is a process-wide hard override: it outranks /effort, settings and\n' +
    'agent frontmatter, so subagents cannot run at their own declared levels while it\n' +
    'is present. Unset it and start the session again.'
  );
}

/**
 * Decide one effort-bearing observation.
 *
 * Only ever called for `PreToolUse`, `Stop` and `SubagentStop`. Lifecycle
 * events carry no effort by contract and reach a path that does not call this,
 * so a normal `SessionStart` cannot be mistaken for a failed check.
 */
export function judge(check: Check): Verdict {
  // Asked before the guard's own failures: with no role acting there is nothing
  // to hold to a level, whatever went wrong while looking for one. Every
  // remaining branch can therefore name the acting role.
  if (check.role == null) {
    return { decision: 'allow', reason: 'no-role' };
  }

  if (check.error != null) {
    return deny(
      'guard-error',
      `The effort guard could not resolve the acting role.\n\n${check.error}`,
    );
  }

  if (check.resolution == null) {
    // An acting role always resolves to one of the three outcomes. Reaching
    // here means the caller skipped resolution, and comparing against a
    // declaration that was never read would report "Expected: undefined".
    return deny(
      'guard-error',
      `The effort guard did not resolve role "${check.role}".`,
    );
  }

  if (check.resolution.kind === 'out-of-domain') {
    return { decision: 'allow', reason: 'out-of-domain' };
  }

  // Read ahead of the override check, and of the reported effort, because
  // nothing about the turn can move it: this role has no declared level to
  // dishonour, and denying it would report a session-wide fault at the one role
  // that can neither cause nor fix it.
  if (check.resolution.kind === 'exempt') {
    return { decision: 'allow', reason: 'exempt' };
  }

  // A process-wide override outranks /effort, settings and frontmatter alike,
  // so a parent launching subagents at differing levels cannot be honest while
  // it is set — whatever this particular turn happens to report.
  if (check.poisoned) {
    return deny('poisoned-env', poisonMessage(check.role));
  }

  if (check.resolution.kind === 'undeclared') {
    return deny(
      'undeclared',
      `Role "${check.role}" declares no effort:, so there is nothing to hold it to.\n` +
        `Add an effort: field to ${check.resolution.file}.`,
    );
  }

  const expected = check.resolution.effort;

  if (expected === check.actual) {
    return { decision: 'allow', reason: 'match' };
  }

  return check.actual == null
    ? deny(
        'no-runtime-effort',
        violationMessage(check.role, expected, '(none reported)'),
      )
    : deny('mismatch', violationMessage(check.role, expected, check.actual));
}
