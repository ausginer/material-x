/**
 * `.scripts/size-report.ts`: the size comment's Markdown and warnings from a
 * head reading, an optional base reading and the measurement rows' results, and
 * the base that the command line states.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  parseVitestReport,
  readBase,
  renderSizeReport,
  SIZE_REPORT_MARKER,
  sizeWarnings,
  type SizeReading,
  type SizeRow,
} from './size-report.ts';

const row = (
  name: string,
  brotli: number,
  limit: number | null = 1000,
): SizeRow => ({
  package: 'drag',
  row: name,
  brotli,
  gzip: brotli + 50,
  limit,
});

const reading = (...rows: SizeRow[]): SizeReading => ({ rows });

const lineOf = (report: string, name: string): string =>
  report.split('\n').find((line) => line.startsWith(`| drag | ${name} |`)) ??
  '';

describe('renderSizeReport', () => {
  it('should start with the hidden marker', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100)),
      base: reading(row('a', 100)),
      measurements: [],
    });

    expect(report.startsWith(`${SIZE_REPORT_MARKER}\n`)).toBe(true);
  });

  it('should report a row that grew with a positive change', () => {
    const report = renderSizeReport({
      head: reading(row('a', 120)),
      base: reading(row('a', 100)),
      measurements: [],
    });

    expect(lineOf(report, 'a')).toBe(
      '| drag | a | 120 | 100 | +20 | 1000 | 170 |',
    );
  });

  it('should report a row that shrank with a negative change', () => {
    const report = renderSizeReport({
      head: reading(row('a', 90)),
      base: reading(row('a', 100)),
      measurements: [],
    });

    expect(lineOf(report, 'a')).toBe(
      '| drag | a | 90 | 100 | -10 | 1000 | 140 |',
    );
  });

  it('should report a row that stayed the same with a change of 0', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100)),
      base: reading(row('a', 100)),
      measurements: [],
    });

    expect(lineOf(report, 'a')).toBe(
      '| drag | a | 100 | 100 | 0 | 1000 | 150 |',
    );
  });

  it('should mark a row that exists only at the head as added', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100), row('b', 50)),
      base: reading(row('a', 100)),
      measurements: [],
    });

    expect(lineOf(report, 'b')).toBe(
      '| drag | b | 50 | — | added | 1000 | 100 |',
    );
  });

  it('should mark a row that exists only at the base as removed', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100)),
      base: reading(row('a', 100), row('b', 50)),
      measurements: [],
    });

    expect(lineOf(report, 'b')).toBe('| drag | b | — | 50 | removed | — | — |');
  });

  it('should mark a row over its limit with the excess', () => {
    const report = renderSizeReport({
      head: reading(row('a', 1001)),
      base: reading(row('a', 1000)),
      measurements: [],
    });

    expect(lineOf(report, 'a')).toBe(
      '| drag | a | 1001 | 1000 | +1 | 1000 **over by 1 B** | 1051 |',
    );
  });

  it('should report the head alone and say that none is stored for a missing base reading', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100)),
      base: 'missing',
      measurements: [],
    });

    expect(report).toContain(
      "**No base reading:** `main`'s run for the merge base stored no size reading",
    );
    expect(lineOf(report, 'a')).toBe('| drag | a | 100 | — |  | 1000 | 150 |');
  });

  it('should report the head alone and say that the lookup failed for a failed lookup', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100)),
      base: 'failed',
      measurements: [],
    });

    expect(report).toContain(
      "**No base reading:** the lookup of `main`'s stored reading for the merge base failed",
    );
    expect(report).not.toContain('stored no size reading');
    expect(lineOf(report, 'a')).toBe('| drag | a | 100 | — |  | 1000 | 150 |');
  });

  it('should report the head alone and say nothing about a stored reading in a run that looks up no base', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100)),
      base: null,
      measurements: [],
    });

    expect(report).not.toContain('No base reading');
    expect(report).not.toContain('stored');
    expect(lineOf(report, 'a')).toBe('| drag | a | 100 | — |  | 1000 | 150 |');
  });

  it('should show a row without a limit or a gzip figure with dashes', () => {
    const report = renderSizeReport({
      head: reading({
        package: 'core',
        row: 'element',
        brotli: 312,
        gzip: null,
        limit: null,
      }),
      base: null,
      measurements: [],
    });

    expect(report).toContain('| core | element | 312 | — |  | — | — |');
  });

  it('should report each measurement row with its result and its message', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100)),
      base: null,
      measurements: [
        { name: 'hot path should allocate', passed: true, message: null },
        {
          name: 'size should satisfy the ceiling of a',
          passed: false,
          message: 'over its 99 B ceiling | by 1 B',
        },
      ],
    });

    expect(report).toContain('| hot path should allocate | passed |');
    expect(report).toContain(
      '| size should satisfy the ceiling of a | **failed:** over its 99 B ceiling \\| by 1 B |',
    );
  });

  it('should say so when the measurement rows did not report', () => {
    const report = renderSizeReport({
      head: reading(row('a', 100)),
      base: null,
      measurements: null,
    });

    expect(report).toContain('**No result:**');
  });
});

describe('sizeWarnings', () => {
  it('should warn once per row over its limit and per failed measurement row', () => {
    expect(
      sizeWarnings({
        head: reading(row('a', 1001), row('b', 10)),
        base: null,
        measurements: [
          { name: 'm1', passed: true, message: null },
          {
            name: 'm2',
            passed: false,
            message: 'expected 36 to be less than 16',
          },
        ],
      }),
    ).toEqual([
      'drag, a: 1001 B is over its 1000 B limit by 1 B',
      'm2: expected 36 to be less than 16',
    ]);
  });
});

describe('parseVitestReport', () => {
  it('should keep the rows that ran, with the first line of a failure', () => {
    expect(
      parseVitestReport({
        testResults: [
          {
            assertionResults: [
              { fullName: 'a passes', status: 'passed' },
              { fullName: 'b is filtered out', status: 'skipped' },
              {
                fullName: 'c fails',
                status: 'failed',
                failureMessages: [
                  '\u001b[31mAssertionError: no\u001b[39m\n    at x',
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { name: 'a passes', passed: true, message: null },
      { name: 'c fails', passed: false, message: 'AssertionError: no' },
    ]);
  });
});

describe('readBase', () => {
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'size-report-'));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('should give a missing reading when the lookup found none stored', async () => {
    expect(await readBase(join(directory, 'absent.json'), true)).toBe(
      'missing',
    );
  });

  it('should give no base when the run looked none up', async () => {
    expect(await readBase(undefined, false)).toBeNull();
  });

  it('should give a failed lookup when the base file is absent', async () => {
    expect(await readBase(join(directory, 'absent.json'), false)).toBe(
      'failed',
    );
  });

  it('should give a failed lookup when the base file holds no reading', async () => {
    const path = join(directory, 'not-a-reading.json');

    await writeFile(path, '{"error":"not found"}');

    expect(await readBase(path, false)).toBe('failed');
  });

  it('should give the reading that the base file holds', async () => {
    const path = join(directory, 'reading.json');
    const base = reading(row('a', 100));

    await writeFile(path, JSON.stringify(base));

    expect(await readBase(path, false)).toEqual(base);
  });
});
