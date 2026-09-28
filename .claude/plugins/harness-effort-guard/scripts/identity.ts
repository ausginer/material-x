import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * What the runtime's per-agent record says about one child worker.
 *
 * `role` is the **governed role** — the `subagent_type` the dispatching call
 * selected — and is the only identity a verdict may key on. It is not the
 * worker's address: a spawn may assign an arbitrary `name`, the runtime may
 * silently rewrite that name when it collides, and on one of the two observed
 * spawn paths the address is what a hook reports as `agent_type`.
 *
 * `model` is the model the runtime recorded for the worker, absent on the
 * record shape that carries no such field. Absent means *not observable here*,
 * never *matches*.
 */
export type ChildIdentity = Readonly<{
  role: string;
  model: string | undefined;
}>;

/**
 * Where a verdict's governed role came from.
 *
 * Recorded on every record so the log can answer which rule governed a given
 * run — the first question anyone asks after a runtime upgrade, and one an
 * `agent_type` field alone cannot answer, since on one spawn path it holds
 * something else entirely.
 */
export type IdentitySource = 'agent-type' | 'agent-record' | 'deferred';

const TRANSCRIPT_SUFFIX = '.jsonl';

/**
 * Where the runtime keeps the per-agent record for `agentId`.
 *
 * Derived wholly from a path the hook payload supplies: the session transcript
 * is `<dir>/<session>.jsonl` and the session's workers are recorded beside it
 * in `<dir>/<session>/subagents/`. No home directory, no assumed projects root,
 * and nothing parsed out of `agentId`, which embeds the worker's address on one
 * spawn path and must not be read for it.
 */
export function recordPath(transcriptPath: string, agentId: string): string {
  return join(
    transcriptPath.slice(0, -TRANSCRIPT_SUFFIX.length),
    'subagents',
    `agent-${agentId}.meta.json`,
  );
}

/**
 * The governed role of the child worker `agentId`, from the runtime's own
 * record of it.
 *
 * **Rejects rather than guesses.** The record is an undocumented artifact of a
 * private layout, so every way of failing to read a role out of it — no usable
 * path in the payload, no file, an unreadable or malformed one, a shape naming
 * no role — throws, and the caller denies. Falling back to the reported
 * `agent_type` would restore exactly the defect this exists to close: on the
 * teammate spawn path that field holds the worker's address, which resolves
 * out-of-domain, and out-of-domain is an allow.
 *
 * `customAgentType ?? agentType` is correct on both observed shapes. The
 * teammate record puts the selected role in `customAgentType` and the address
 * in `agentType`; the subagent record omits `customAgentType` and puts the
 * selected role in `agentType`.
 */
export async function readChildIdentity(
  transcriptPath: string | undefined,
  agentId: string,
): Promise<ChildIdentity> {
  if (transcriptPath == null || !transcriptPath.endsWith(TRANSCRIPT_SUFFIX)) {
    throw new Error(
      `No usable transcript path to locate the per-agent record for ${agentId}; ` +
        `the payload carried ${transcriptPath ?? '(none)'}.`,
    );
  }

  const file = recordPath(transcriptPath, agentId);
  let record: unknown;

  try {
    record = JSON.parse(await readFile(file, 'utf8'));
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);

    throw new Error(`Per-agent record ${file} could not be read: ${detail}`);
  }

  if (typeof record !== 'object' || record == null) {
    throw new Error(`Per-agent record ${file} is not an object.`);
  }

  const { agentType, customAgentType, model } = record as Readonly<{
    agentType?: unknown;
    customAgentType?: unknown;
    model?: unknown;
  }>;
  const role = [customAgentType, agentType].find(
    (candidate) => typeof candidate === 'string' && candidate !== '',
  );

  if (role == null) {
    throw new Error(
      `Per-agent record ${file} names no governed role: neither customAgentType nor agentType holds one.`,
    );
  }

  return {
    role: role as string,
    model: typeof model === 'string' && model !== '' ? model : undefined,
  };
}
