import { rejects, strictEqual } from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readChildIdentity, recordPath } from '../scripts/identity.ts';
import { childRecord, project } from './support.ts';

/**
 * The private layout the design depends on, pinned in one place so a runtime
 * that moves the record has one test to point at rather than every child case
 * in the suite failing for an unexplained reason.
 *
 * No unit test can detect the runtime changing this. What it can do is state
 * what the guard believes, so the belief is legible when the fail-closed
 * denials start.
 */
describe('recordPath', () => {
  it('should place the record beside the session transcript', () => {
    strictEqual(
      recordPath('/projects/repo/session-1.jsonl', 'aworker-1'),
      '/projects/repo/session-1/subagents/agent-aworker-1.meta.json',
    );
  });

  it('should key the record on the agent id verbatim', () => {
    strictEqual(
      recordPath('/p/s.jsonl', 'aarcb-rem-reviewer-a649572ecba89ff0').endsWith(
        'agent-aarcb-rem-reviewer-a649572ecba89ff0.meta.json',
      ),
      true,
    );
  });
});

describe('readChildIdentity', () => {
  const AGENT = 'aworker-0123456789abcdef';

  it('should read the selected role from a teammate record', async () => {
    const root = await project({});
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({
        agentType: 'arc-reviewer',
        customAgentType: 'reviewer',
      }),
    );

    strictEqual((await readChildIdentity(transcript, AGENT)).role, 'reviewer');
  });

  it('should read the selected role from a subagent record', async () => {
    const root = await project({});
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({ agentType: 'reviewer', toolUseId: 'toolu_1' }),
    );

    strictEqual((await readChildIdentity(transcript, AGENT)).role, 'reviewer');
  });

  // The address is embedded in the agent id on one spawn path and is not the
  // role. Nothing here parses it.
  it('should not read the address as the role', async () => {
    const root = await project({});
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({ agentType: 'arc-reviewer', customAgentType: 'cleanup' }),
    );

    strictEqual((await readChildIdentity(transcript, AGENT)).role, 'cleanup');
  });

  it('should report the runtime model where the record carries one', async () => {
    const root = await project({});
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({ agentType: 'reviewer', model: 'claude-opus-5' }),
    );

    strictEqual(
      (await readChildIdentity(transcript, AGENT)).model,
      'claude-opus-5',
    );
  });

  it('should report no runtime model where the record carries none', async () => {
    const root = await project({});
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({ agentType: 'reviewer' }),
    );

    strictEqual((await readChildIdentity(transcript, AGENT)).model, undefined);
  });

  it('should reject a transcript path it cannot locate a record from', async () => {
    await rejects(readChildIdentity('/projects/session-1', AGENT));
  });

  it('should reject an absent transcript path', async () => {
    await rejects(readChildIdentity(undefined, AGENT));
  });

  it('should reject a record that is not there', async () => {
    const root = await project({});
    const transcript = await childRecord(root, AGENT, null);

    await rejects(readChildIdentity(transcript, AGENT));
  });

  it('should reject a record it cannot parse', async () => {
    const root = await project({});
    const transcript = await childRecord(root, AGENT, '{ not json');

    await rejects(readChildIdentity(transcript, AGENT));
  });

  it('should reject a record naming no role', async () => {
    const root = await project({});
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({ spawnDepth: 1 }),
    );

    await rejects(readChildIdentity(transcript, AGENT));
  });

  it('should reject a record whose role is not a string', async () => {
    const root = await project({});
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({ agentType: 7 }),
    );

    await rejects(readChildIdentity(transcript, AGENT));
  });

  // Keyed on the exact id, so two workers that requested one name have two
  // records and neither can answer for the other.
  it('should answer only for the agent id it was asked about', async () => {
    const root = await project({});
    const transcript = await childRecord(
      root,
      AGENT,
      JSON.stringify({ agentType: 'reviewer' }),
    );

    await rejects(readChildIdentity(transcript, `${AGENT}-2`));
  });

  it('should locate the record under the transcript it was given', async () => {
    const root = await project({});
    const transcript = await childRecord(root, AGENT, null, 'session-9');

    strictEqual(transcript, join(root, 'transcripts', 'session-9.jsonl'));
  });
});
