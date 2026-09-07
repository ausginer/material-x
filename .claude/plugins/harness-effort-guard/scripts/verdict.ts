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
  | 'worktree-dispatch'
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
  /** Whether this event is a tool call that would bring another worker into being. */
  dispatching: boolean;
  /** Whether the resolved project root is a linked worktree rather than the main checkout. */
  worktree: boolean;
  /** The resolved project root, named by the worktree refusal so the reader can see which one. */
  root: string | null;
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
    'Fix the role configuration or the invocation; the guard does not repair session state.'
  );
}

function worktreeMessage(root: string): string {
  return (
    'Dispatch from a linked worktree is refused.\n\n' +
    `Root:     ${root}\n\n` +
    'A worktree carries its own .claude/ at its own commit, so it can govern part of the\n' +
    'role set and silently allow the rest, or govern all of it at a superseded generation.\n' +
    'Neither is fixable by configuring the worktree. Dispatch from the main checkout;\n' +
    'a worktree session may still run as a single worker.'
  );
}

/**
 * What the guard did about a denial on this event, in this mode.
 *
 * Separate from the violation because it is not a property of the violation:
 * the same fault is blocked at an enforcing `PreToolUse`, recorded and no more
 * while observing, and — at `Stop` or `SubagentStop` — reaches the guard when
 * there is no tool call in existence to block. A denial notice that claims a
 * block in the latter two cases is the instrument misreporting itself.
 */
export function appliedNotice(applied: boolean, event: string): string {
  if (applied) {
    return 'The tool call was blocked.';
  }

  return event === 'PreToolUse'
    ? 'Nothing was blocked: the guard is observing, not enforcing.'
    : `No tool call was in flight at ${event}. This turn is recorded; it cannot be blocked.`;
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
  // Asked of every actor, governed or not, and before anything about the role:
  // a worktree cannot answer for the generation of the contract the workers it
  // spawns would run under, so the refusal is of the act rather than of the
  // caller. A worktree session that dispatches nothing is untouched.
  if (check.dispatching && check.worktree) {
    return deny(
      'worktree-dispatch',
      worktreeMessage(check.root ?? '(unknown)'),
    );
  }

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

  // Before the exemption, and this ordering is the session gate. The override
  // outranks frontmatter for every subagent at once, so it is a property of the
  // session rather than a per-role mismatch — and the exempt role is the session
  // here, and the only actor that can dispatch. Denying it stops the fault at
  // its source instead of reporting it at a bystander; startup itself cannot be
  // refused, so the first tool call is the earliest boundary available.
  if (check.poisoned) {
    return deny('poisoned-env', poisonMessage(check.role));
  }

  // A role carrying no effort obligation, so nothing after this point applies:
  // there is no declared level to hold it to, and absent reported effort is the
  // expected observation rather than a violation.
  if (check.resolution.kind === 'exempt') {
    return { decision: 'allow', reason: 'exempt' };
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
