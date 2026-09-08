import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { IdentitySource } from './identity.ts';
import type { ModelCheck } from './verdict.ts';

/**
 * One line of the observation log.
 *
 * The two kinds are not interchangeable, and the difference is structural
 * rather than conventional: an `announcement` comes from a lifecycle event,
 * which by contract carries no effort, and therefore has no `actual` and no
 * `verdict` field at all — not null ones. Nothing reading the log can count a
 * normal session start as a failed check.
 *
 * `verdict` records establish the invariant. `announcement` records answer the
 * separate question of which sessions and subagents were guarded at all, which
 * is why an absent role means unguarded rather than clean.
 */
export type Record =
  | Readonly<{
      /**
       * The hook could not read its own input, so nothing else about the event
       * is known — not the role, not even which event it was. It is recorded
       * because the alternative is a gap, and a gap reads as a call that never
       * happened rather than one that went unchecked.
       */
      kind: 'unreadable';
      at: string;
      error: string;
    }>
  | Readonly<{
      kind: 'announcement';
      at: string;
      event: string;
      session_id: string;
      agent_id?: string;
      /** What the runtime called this actor, kept verbatim beside the resolved role. */
      agent_type?: string;
      /**
       * The role the harness holds this actor to. Absent where none was
       * established — a session carrying no role, or a child whose identity is
       * deferred to its first enforceable event.
       */
      governed_role?: string;
      identity_source: IdentitySource;
      model?: string;
      project_root: string | null;
      worktree: boolean;
      declared: string | null;
      resolution: string;
      poisoned: boolean;
    }>
  | Readonly<{
      kind: 'verdict';
      at: string;
      event: string;
      session_id: string;
      agent_id?: string;
      agent_type?: string;
      governed_role?: string;
      identity_source: IdentitySource;
      model?: string;
      project_root: string | null;
      worktree: boolean;
      declared: string | null;
      resolution: string;
      poisoned: boolean;
      /**
       * The role a spawning call selected, absent on every event that selects
       * none. Present or absent rather than nullable, on the same reasoning as
       * `model`: a null would claim the call chose nothing, where the truth is
       * that it was not a call that chooses.
       */
      dispatch_target?: string;
      /** The address a spawning call assigned, absent where it assigned none. */
      dispatch_name?: string;
      /** The model a spawning call explicitly asked for, absent where it asked for none. */
      dispatch_model?: string;
      /** The model the acting role's definition declares, null where it declares none. */
      declared_model: string | null;
      /**
       * The model the runtime recorded for this actor, absent where the record
       * shape carries none. Absent is why `model_check` can say `unverified`.
       */
      runtime_model?: string;
      model_check: ModelCheck;
      actual: string | null;
      decision: 'allow' | 'deny';
      cause: string;
      enforced: boolean;
    }>;

/**
 * Append one record. Never throws: a guard that fails because it could not
 * write its own diary would deny every tool call in the session.
 */
export async function observe(dataDir: string, record: Record): Promise<void> {
  try {
    await mkdir(dataDir, { recursive: true });
    await appendFile(
      join(dataDir, 'observations.jsonl'),
      `${JSON.stringify(record)}\n`,
    );
  } catch {
    // Recording is evidence, not enforcement. Enforcement stands without it.
  }
}
