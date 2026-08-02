/**
 * The documented surface has to equal the exported surface.
 *
 * TypeDoc runs over the eight public entries and nothing else, so anything it
 * reports as *referenced but not included* is a public type structurally
 * depending on something a consumer cannot name — reachable through a public
 * shape, resolvable by their compiler, and absent from the docs. That is a
 * surface defect, not documentation noise, and it is how `CollectionSnapshot`,
 * `PlaceholderFactory` and the two `ReorderResolution` members were found.
 *
 * Asserted rather than checked once, because the property regresses silently:
 * the next public type to reference an internal alias breaks it with no other
 * failing test. The fix is always to export what the public type depends on, or
 * to inline the structure — never to suppress the warning.
 */
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const MINUTE = 60_000;

type Run = Readonly<{ output: string; code: number | null }>;

function typedoc(out: string): Promise<Run> {
  return new Promise((done, fail) => {
    // A JSON target rather than `--emit none`: the run has to actually convert
    // every entry, and the generated-at line is the proof that it did. With
    // nothing to report TypeDoc prints no summary at all, so an empty stream
    // would otherwise be indistinguishable from a run that did nothing.
    const child = spawn(
      'npx',
      ['typedoc', '--options', 'typedoc.json', '--json', out],
      { cwd: ROOT },
    );
    let output = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      output += chunk;
    });
    child.on('error', fail);
    child.on('close', (code) => {
      done({ output, code });
    });
  });
}

describe('the documented surface', () => {
  it(
    'should resolve every reference a public type makes',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'drag2-docs-'));
      const { output, code } = await typedoc(join(dir, 'docs.json'));

      expect(code).toBe(0);
      // It converted every entry — otherwise "no warnings" is vacuous.
      expect(output).toContain('json generated at');
      // The level tag is ANSI-coloured, so the lines are matched on the word
      // and reported whole: the message is the useful part of the failure.
      expect(
        output.split('\n').filter((line) => line.includes('warning')),
      ).toEqual([]);
    },
    2 * MINUTE,
  );
});
