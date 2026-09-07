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
  | 'topology-escape'
  | 'topology-identity'
  | 'guard-error';

/**
 * Which roles a governed dispatcher may bring into being.
 *
 * The topology is a property of the harness, not of any role definition:
 * nothing in `.claude/agents/` states who may spawn whom, so it is written here
 * and a change to the dispatch model is an edit to this map. Both entries
 * mirror a role that already carries the rule in prose —
 * [`agent-router.md`](../../../agents/agent-router.md) and
 * [`consolidator.md`](../../../agents/consolidator.md) — because a prompt is
 * advice to a model and this is a refusal.
 *
 * **A dispatcher absent from the map is unconstrained.** An ordinary worker
 * spawning `Explore` or a general-purpose searcher is legitimate and stays
 * legitimate; the assertion is about the two places where the topology requires
 * a governed worker and an out-of-domain substitute would be allowed by every
 * other row of the decision table.
 */
export const DISPATCH_TOPOLOGY: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([
  [
    'agent-router',
    new Set([
      'architect',
      'implementer',
      'consolidator',
      'reviewer',
      'integrity',
      'cleanup',
      'der',
    ]),
  ],
  ['consolidator', new Set(['reviewer', 'integrity', 'cleanup', 'der'])],
]);

/**
 * Every role some dispatcher is permitted to select — the names that mean a
 * governed worker rather than a description of one.
 *
 * Derived rather than written twice: a role added to a dispatcher's set is a
 * role whose name carries the identity claim below, and the two lists agreeing
 * is not something a reader should have to check.
 */
const GOVERNED_WORKERS: ReadonlySet<string> = new Set(
  [...DISPATCH_TOPOLOGY.values()].flatMap((permitted) => [...permitted]),
);

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
  /**
   * The role a spawning call would bring into being — the call's
   * `subagent_type`, defaulted where the runtime defaults it.
   *
   * Absent for a resume, which selects no role: `SendMessage` reaches an
   * existing worker whose type was fixed when it was spawned, so there is
   * nothing for the topology to assert about it.
   */
  target: string | undefined;
  /**
   * The `name` a spawning call assigns the worker, when it assigns one.
   *
   * A distinct concept from `target`: this is the address a later `SendMessage`
   * resumes, and the runtime lets it be anything. The two are checked against
   * each other precisely because they are independent.
   */
  identity: string | undefined;
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

function escapeMessage(
  dispatcher: string,
  target: string,
  permitted: ReadonlySet<string>,
): string {
  return (
    'Governed dispatch topology violated.\n\n' +
    `Dispatcher: ${dispatcher}\n` +
    `Requested:  ${target}\n` +
    `Permitted:  ${[...permitted].join(', ')}\n\n` +
    'subagent_type selects the role the worker runs as. A role this dispatcher may not\n' +
    'select is not a worker it may substitute: an out-of-domain agent resolves outside\n' +
    'the guard\u2019s domain, so no effort invariant applies to it and the topology the\n' +
    'round depends on is gone without a word in the transcript.'
  );
}

function identityMessage(
  dispatcher: string,
  identity: string,
  target: string,
): string {
  return (
    'Governed dispatch topology violated.\n\n' +
    `Dispatcher:    ${dispatcher}\n` +
    `name:          ${identity}\n` +
    `subagent_type: ${target}\n\n` +
    'name is the address a later resume uses; subagent_type is the role the worker\n' +
    'runs as. A call naming a governed role must select that same role, or the worker\n' +
    'answers to one identity and reasons as another.'
  );
}

/**
 * Whether this dispatching call escapes the topology its dispatcher is held to,
 * and `null` when it does not — including for every dispatcher the map does not
 * name and every call that selects no role.
 */
function escapes(
  dispatcher: string,
  target: string | undefined,
  identity: string | undefined,
): Verdict | null {
  const permitted = DISPATCH_TOPOLOGY.get(dispatcher);

  if (permitted == null || target == null) {
    return null;
  }

  if (!permitted.has(target)) {
    return deny(
      'topology-escape',
      escapeMessage(dispatcher, target, permitted),
    );
  }

  // Only a name claiming a governed role is held to the type: a descriptive
  // name belongs to the caller, and constraining it would make the guard an
  // opinion about vocabulary rather than about topology.
  return identity != null &&
    GOVERNED_WORKERS.has(identity) &&
    identity !== target
    ? deny('topology-identity', identityMessage(dispatcher, identity, target))
    : null;
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

  // Read before the effort machinery, and independent of it. The failure this
  // answers is one every row below allows: a governed dispatcher spawning an
  // out-of-domain worker produces a child that resolves `out-of-domain`, and
  // that resolution is an allow — so the substitution is invisible to the
  // invariant precisely because it escaped the domain the invariant governs.
  const escape = escapes(check.role, check.target, check.identity);

  if (escape != null) {
    return escape;
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
