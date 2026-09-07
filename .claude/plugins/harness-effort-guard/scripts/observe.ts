import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

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
      agent_type?: string;
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
