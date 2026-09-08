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
  | 'topology-name'
  | 'dispatch-model'
  | 'model-mismatch'
  | 'unresolved-identity'
  | 'guard-error';

/**
 * What could be established about the acting role's model on this event.
 *
 * `unverified` is the honest answer for a record shape that carries no model,
 * and is deliberately distinct from `match`: a check that could not be made is
 * not a check that passed, and a log conflating the two would claim the runtime
 * model was verified on paths where it is not observable at all.
 */
export type ModelCheck = 'match' | 'mismatch' | 'unverified' | 'undeclared';

/**
 * Which roles a governed dispatcher may bring into being.
 *
 * The topology is a property of the harness, not of any role definition:
 * nothing in `.claude/agents/` states who may spawn whom, so it is written here
 * and a change to the dispatch model is an edit to this map. The entry mirrors
 * a rule [`consolidator.md`](../../../agents/consolidator.md) already carries in
 * prose, because a prompt is advice to a model and this is a refusal.
 *
 * **A dispatcher absent from the map is unconstrained.** An ordinary worker
 * spawning `Explore` or a general-purpose searcher is legitimate and stays
 * legitimate; the assertion is about the one place where the topology requires
 * a governed worker and an out-of-domain substitute would be allowed by every
 * other row of the decision table.
 */
export const DISPATCH_TOPOLOGY: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([
  ['consolidator', new Set(['reviewer', 'integrity', 'cleanup', 'der'])],
]);

/**
 * Whether a runtime model value denotes the model a definition declares.
 *
 * The runtime reports two forms and both were observed in its own records: the
 * alias a definition or a caller writes — `opus`, `haiku` — and a concrete
 * identifier naming the family as one of its dash-separated segments,
 * `claude-opus-5`. Equality answers the first and segment membership the
 * second.
 *
 * Segment membership rather than a substring or prefix test, because the family
 * is a whole segment in every identifier observed, and a substring test would
 * let an unrelated declaration answer for one. This is the smallest rule the
 * two observed forms require; a third form is an edit here.
 */
export function modelMatches(declared: string, runtime: string): boolean {
  return declared === runtime || runtime.split('-').includes(declared);
}

/**
 * Compare a declared model against the one the runtime reported, saying which
 * of the four answers this is rather than collapsing the two that are not
 * failures.
 */
export function checkModel(
  declared: string | null | undefined,
  runtime: string | undefined,
): ModelCheck {
  if (runtime == null) {
    return 'unverified';
  }

  if (declared == null) {
    return 'undeclared';
  }

  return modelMatches(declared, runtime) ? 'match' : 'mismatch';
}

export type Check = Readonly<{
  /**
   * The **governed role** that is acting — for a main-thread session the
   * `agent_type` the runtime reports, and for a child the role its per-agent
   * record says was selected.
   *
   * Never a worker's address. The two are separate concepts and a hook reports
   * the address in the role's field on one spawn path, which is what
   * `identityError` exists to refuse rather than to paper over.
   *
   * Absent when no role is acting: the main thread of a session started without
   * `--agent`.
   */
  role: string | undefined;
  /**
   * Why a child's governed identity could not be established, when it could
   * not.
   *
   * Read before every allow, `no-role` included: a child whose identity is
   * unknown would otherwise arrive here indistinguishable from a main thread
   * carrying no role, and be allowed for the very reason it should be refused.
   */
  identityError: string | undefined;
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
   * resumes, and the runtime lets it be anything — including rewriting it when
   * it collides with a name already used in the session. The two are checked
   * against each other precisely because they are independent.
   */
  assignedName: string | undefined;
  /** Whether `assignedName` is the exact name of a role the guard governs. */
  nameClaimsRole: boolean;
  /**
   * The model the spawning call explicitly asked for, when it asked for one.
   *
   * An omitted override is not a conflict: a caller selecting a governed role
   * should not have to restate that role's own declaration to use it.
   */
  requestedModel: string | undefined;
  /** The model the selected `target` role declares, when the target is governed. */
  targetModel: string | undefined;
  /**
   * The model the runtime recorded for this actor, where the runtime records
   * one at all. Absent means the check could not be made, never that it passed.
   */
  runtimeModel: string | undefined;
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
  assignedName: string,
  target: string,
): string {
  return (
    'Governed role name used as a worker address.\n\n' +
    `Dispatcher:    ${dispatcher}\n` +
    `name:          ${assignedName}\n` +
    `subagent_type: ${target}\n\n` +
    'name is the address a later resume uses; subagent_type is the role the worker\n' +
    'runs as. A call naming a governed role must select that same role, or the worker\n' +
    'answers to one identity and reasons as another — and on one spawn path the\n' +
    'runtime records that address as the worker\u2019s own type, where it would resolve a\n' +
    'general-purpose worker as the governed role it was merely named after.'
  );
}

function namedWorkerMessage(dispatcher: string, assignedName: string): string {
  return (
    'A governed review lens may not be spawned under a runtime name.\n\n' +
    `Dispatcher: ${dispatcher}\n` +
    `name:       ${assignedName}\n\n` +
    'A named spawn takes the runtime\u2019s in-process teammate path, which has been\n' +
    'observed not to honour the selected role\u2019s declared model and effort: lenses\n' +
    'declaring high ran at the parent\u2019s medium. Until that changes, omit name and\n' +
    'let the lens take the ordinary subagent path. The guard understands named\n' +
    'workers; the runtime does not yet run them as the role that was selected.'
  );
}

function dispatchModelMessage(
  target: string,
  declared: string,
  requested: string,
): string {
  return (
    'Governed role model overridden at dispatch.\n\n' +
    `subagent_type: ${target}\n` +
    `Declares:      ${declared}\n` +
    `Requested:     ${requested}\n\n` +
    'The model a role declares is part of its contract, in the same sense as the\n' +
    'effort it declares. Selecting one role and running it on another model class\n' +
    'produces a worker the definition does not describe. Drop the override, or\n' +
    'select the role whose declaration you want.'
  );
}

function runtimeModelMessage(
  role: string,
  declared: string,
  runtime: string,
): string {
  return (
    'Harness model invariant violated.\n\n' +
    `Role:     ${role}\n` +
    `Expected: ${declared}\n` +
    `Actual:   ${runtime}\n\n` +
    'Fix the role configuration or the invocation; the guard does not repair session state.'
  );
}

function identityFailureMessage(detail: string): string {
  return (
    'Governed worker identity could not be established.\n\n' +
    `${detail}\n\n` +
    'A child worker\u2019s role comes from the runtime\u2019s own per-agent record, because the\n' +
    'reported agent_type holds the worker\u2019s address rather than its role on one spawn\n' +
    'path. With no record to read there is no role to hold to a declaration, so the\n' +
    'call is refused rather than allowed as a name outside the guard\u2019s domain.'
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
): Verdict | null {
  const permitted = DISPATCH_TOPOLOGY.get(dispatcher);

  if (permitted == null || target == null) {
    return null;
  }

  return permitted.has(target)
    ? null
    : deny('topology-escape', escapeMessage(dispatcher, target, permitted));
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

  // Ahead of the `no-role` allow, which it would otherwise be mistaken for. A
  // child whose governed role could not be read carries no role here for the
  // opposite reason a main thread does — not because none is acting, but
  // because the one that is acting could not be named.
  if (check.identityError != null) {
    return deny(
      'unresolved-identity',
      identityFailureMessage(check.identityError),
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
  const escape = escapes(check.role, check.target);

  if (escape != null) {
    return escape;
  }

  // Held to every dispatcher, not only the ones the topology names. A worker
  // spawned under the name of a governed role is recorded by the runtime with
  // that name as its own type on the subagent path, so the name would resolve a
  // general-purpose worker as the governed role — the identity claim is about
  // what the runtime will later say this worker is, which no dispatcher is
  // entitled to misstate. Only a name claiming a governed role is held to the
  // type: a descriptive name belongs to the caller.
  if (
    check.target != null &&
    check.assignedName != null &&
    check.nameClaimsRole &&
    check.assignedName !== check.target
  ) {
    return deny(
      'topology-identity',
      identityMessage(check.role, check.assignedName, check.target),
    );
  }

  // A compatibility containment rather than part of the identity mechanism: the
  // guard resolves named workers correctly, but the runtime has been observed
  // running them at neither the model nor the effort the selected role
  // declares. It is scoped to the dispatchers the topology names, because those
  // are the spawns whose governance the round depends on. Named workers stay
  // legitimate everywhere else, and this row retires when the runtime honours
  // the selected role on that path.
  if (
    check.target != null &&
    check.assignedName != null &&
    DISPATCH_TOPOLOGY.has(check.role)
  ) {
    return deny(
      'topology-name',
      namedWorkerMessage(check.role, check.assignedName),
    );
  }

  // The earliest point at which a model override is refusable, and the only one
  // that is free of the runtime: the child does not exist yet, so nothing has to
  // be observed about it. An omitted override is no conflict — the selected
  // role's own declaration is what a caller gets by naming it.
  if (
    check.targetModel != null &&
    check.requestedModel != null &&
    check.target != null &&
    !modelMatches(check.targetModel, check.requestedModel)
  ) {
    return deny(
      'dispatch-model',
      dispatchModelMessage(
        check.target,
        check.targetModel,
        check.requestedModel,
      ),
    );
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
  // session rather than a per-role mismatch, and no role in that session can
  // reach its declared level. Exempting the roles that carry no level would let
  // such a session act through them while the fault stands; startup itself
  // cannot be refused, so the first tool call is the earliest boundary
  // available.
  if (check.poisoned) {
    return deny('poisoned-env', poisonMessage(check.role));
  }

  // Independent of effort and read before the exemption, because a role outside
  // the effort invariant is not outside its own model declaration. Absent
  // runtime evidence is `unverified` and passes here: a record shape carrying
  // no model supports no verdict about one, and inventing a successful check
  // from silence is the failure this ordering exists to avoid.
  const { model: declaredModel } = check.resolution;

  if (
    declaredModel != null &&
    check.runtimeModel != null &&
    checkModel(declaredModel, check.runtimeModel) === 'mismatch'
  ) {
    return deny(
      'model-mismatch',
      runtimeModelMessage(check.role, declaredModel, check.runtimeModel),
    );
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
