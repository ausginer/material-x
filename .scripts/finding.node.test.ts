import { execFile } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const FINDING = join(import.meta.dirname, 'finding.ts');

/** Prints the saved answer, and fails on any call but `api graphql`. */
const STUB_GH = `#!/usr/bin/env sh
if [ "$1 $2" != 'api graphql' ]; then
  echo "stub gh: unexpected call: $*" >&2
  exit 70
fi
for arg do printf '%s\\n' "$arg"; done >> "\${0%/*}/call"
cat "\${0%/*}/answer.json"
`;

const USAGE = 'usage: node .scripts/finding.ts <number> [r<revision>]\n';
const ISSUE_URL = 'https://github.com/ausginer/material-x/issues/300';

type Run = Readonly<{ code: number; stdout: string; stderr: string }>;
type Account = Readonly<{ login: string }> | null;

type IssueComment = Readonly<{
  author: Account;
  body: string;
  createdAt: string;
  lastEditedAt: string | null;
}>;

type IssueOptions = Readonly<{
  author?: Account;
  editor?: Account;
  state?: string;
  body?: string;
  lastEditedAt?: string | null;
  labels?: readonly string[];
  comments?: readonly IssueComment[];
  totalCount?: number;
}>;

const OWNER: Account = { login: 'Lodin' };
const STRANGER: Account = { login: 'stranger' };

let bin: string;

/** The time of day, on one day, as GitHub writes it. */
function at(time: string): string {
  return `2026-11-24T${time}Z`;
}

function bodyAt(revision: number): string {
  return `It breaks. Size: small.\n\n## What happens\n\nIt breaks.\n\nRevision ${revision}\n\n— ARCHITECT`;
}

function comment(
  body: string,
  time: string,
  overrides: Partial<IssueComment> = {},
): IssueComment {
  return {
    author: OWNER,
    body,
    createdAt: at(time),
    lastEditedAt: null,
    ...overrides,
  };
}

function amendment(
  n: number,
  time: string,
  overrides: Partial<IssueComment> = {},
): IssueComment {
  return comment(
    `### Amendment ${n}\n\nReason ${n}.\n\n> Nothing replaced.\n\n— ARCHITECT`,
    time,
    overrides,
  );
}

/** A finding at r2 that is in order, with the body edited before Amendment 2. */
const R2: IssueOptions = {
  editor: OWNER,
  body: bodyAt(2),
  lastEditedAt: at('11:00:00'),
  comments: [amendment(1, '10:00:00'), amendment(2, '11:00:05')],
};

/** Runs the command on the issue that the stub answers with. */
async function finding(
  options: IssueOptions,
  ...args: readonly string[]
): Promise<Run> {
  const {
    author = OWNER,
    editor = null,
    state = 'OPEN',
    body = bodyAt(0),
    lastEditedAt = null,
    labels = ['pkg:core', 'tier:B'],
    comments = [],
    totalCount = comments.length,
  } = options;

  await writeFile(
    join(bin, 'answer.json'),
    JSON.stringify({
      data: {
        repository: {
          issue: {
            number: 300,
            title: 'The thing breaks',
            url: ISSUE_URL,
            state,
            body,
            lastEditedAt,
            author,
            editor,
            labels: { nodes: labels.map((name) => ({ name })) },
            comments: { totalCount, nodes: comments },
          },
        },
      },
    }),
  );

  return await run(args.length > 0 ? args : ['300']);
}

async function run(args: readonly string[]): Promise<Run> {
  return await new Promise((resolve) => {
    execFile(
      process.execPath,
      [FINDING, ...args],
      { env: { ...process.env, PATH: `${bin}:${process.env['PATH']}` } },
      (error, stdout, stderr) => {
        resolve({ code: error ? Number(error.code) : 0, stdout, stderr });
      },
    );
  });
}

function refusal(message: string): Run {
  return { code: 1, stdout: '', stderr: `${message}\n` };
}

beforeEach(async () => {
  bin = await mkdtemp(join(tmpdir(), 'finding-'));
  await writeFile(join(bin, 'gh'), STUB_GH);
  await chmod(join(bin, 'gh'), 0o755);
});

afterEach(async () => {
  await rm(bin, { recursive: true, force: true });
});

describe('finding', () => {
  describe('a finding in order', () => {
    it('should print r0 with its body', async () => {
      expect(await finding({})).toEqual({
        code: 0,
        stderr: '',
        stdout: `#300 r0 tier:B OPEN ${ISSUE_URL}\n\nThe thing breaks\n\n${bodyAt(0)}\n\nComments left out: 0\n`,
      });
    });

    it('should ask GitHub once, for the given number', async () => {
      await finding({}, '300');
      const call = await readFile(join(bin, 'call'), 'utf8');

      expect(
        call.split('\n').filter((line) => line === 'graphql'),
      ).toHaveLength(1);
      expect(call).toContain('\nnumber=300\n');
    });

    it('should print r2 with its amendments and without other comments', async () => {
      const result = await finding({
        ...R2,
        comments: [
          comment('Started: slot b.\n\n— COORDINATOR', '09:00:00'),
          amendment(1, '10:00:00'),
          comment('I think so.', '10:30:00'),
          amendment(2, '11:00:05'),
          comment('Accepted for closure.\n\n— ARCHITECT', '12:00:00'),
        ],
      });

      expect(result).toEqual({
        code: 0,
        stderr: '',
        stdout: [
          `#300 r2 tier:B OPEN ${ISSUE_URL}`,
          'The thing breaks',
          bodyAt(2),
          '--- Amendments. They explain the changes and are not the contract. ---',
          `${at('10:00:00')}\n${amendment(1, '10:00:00').body}`,
          `${at('11:00:05')}\n${amendment(2, '11:00:05').body}`,
          'Comments left out: 3\n',
        ].join('\n\n'),
      });
    });

    it("should leave out another account's amendment", async () => {
      const result = await finding({
        ...R2,
        comments: [
          ...R2.comments!,
          amendment(3, '12:00:00', { author: STRANGER }),
        ],
      });

      expect(result.code).toBe(0);
      expect(result.stdout).not.toContain('Amendment 3');
      expect(result.stdout).toContain('\n\nComments left out: 1\n');
    });

    it("should leave out an absent account's amendment", async () => {
      const result = await finding({
        ...R2,
        comments: [...R2.comments!, amendment(3, '12:00:00', { author: null })],
      });

      expect(result.code).toBe(0);
      expect(result.stdout).not.toContain('Amendment 3');
    });

    it('should read CRLF line ends', async () => {
      const crlf = (text: string): string => text.replaceAll('\n', '\r\n');
      const result = await finding({
        ...R2,
        body: crlf(bodyAt(2)),
        comments: R2.comments!.map((entry) => ({
          ...entry,
          body: crlf(entry.body),
        })),
      });

      expect(result).toEqual(await finding(R2));
      expect(result.code).toBe(0);
    });

    it('should print a closed issue with its state', async () => {
      const result = await finding({ ...R2, state: 'CLOSED' });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain(`#300 r2 tier:B CLOSED ${ISSUE_URL}\n`);
    });

    it('should print the given revision', async () => {
      expect(await finding(R2, '300', 'r2')).toEqual(await finding(R2));
    });

    it("should pass an edit in the last amendment's second", async () => {
      const result = await finding({ ...R2, lastEditedAt: at('11:00:05') });

      expect(result.code).toBe(0);
    });

    it('should read exactly 100 comments', async () => {
      const result = await finding({ totalCount: 100 });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('\n\nComments left out: 100\n');
    });
  });

  describe('a finding out of order', () => {
    it('should refuse with the message of gh when gh fails', async () => {
      await writeFile(
        join(bin, 'gh'),
        `#!/usr/bin/env sh\necho '{"data":{"repository":{"issue":null}}}'\necho 'gh: Could not resolve to an Issue with the number of 225.' >&2\nexit 1\n`,
      );

      expect(await run(['225'])).toEqual(
        refusal('gh: Could not resolve to an Issue with the number of 225.'),
      );
    });

    it('should refuse an issue that another account opened', async () => {
      expect(await finding({ author: STRANGER })).toEqual(
        refusal('#300 was opened by stranger, not Lodin'),
      );
    });

    it('should refuse an issue whose author is absent', async () => {
      expect(await finding({ author: null })).toEqual(
        refusal('#300 was opened by an absent account, not Lodin'),
      );
    });

    it('should refuse a body that another account edited last', async () => {
      expect(await finding({ ...R2, editor: STRANGER })).toEqual(
        refusal('#300 was last edited by stranger, not Lodin'),
      );
    });

    it('should refuse an issue without a tier', async () => {
      expect(await finding({ labels: ['pkg:core'] })).toEqual(
        refusal(
          '#300 has no tier label, not exactly one of tier:A, tier:B, tier:C',
        ),
      );
    });

    it('should refuse an issue with two tiers', async () => {
      expect(await finding({ labels: ['tier:A', 'tier:C'] })).toEqual(
        refusal(
          '#300 has tier:A and tier:C, not exactly one of tier:A, tier:B, tier:C',
        ),
      );
    });

    const BAD_ENDING = refusal(
      '#300\'s body doesn\'t end with "Revision <N>" and "— ARCHITECT"',
    );

    it('should refuse a body without its revision', async () => {
      expect(await finding({ body: 'It breaks.\n\n— ARCHITECT' })).toEqual(
        BAD_ENDING,
      );
    });

    it('should refuse a body without its stamp', async () => {
      expect(
        await finding({ body: bodyAt(0).replace('ARCHITECT', 'COORDINATOR') }),
      ).toEqual(BAD_ENDING);
    });

    it('should refuse more than 100 comments', async () => {
      expect(await finding({ totalCount: 101 })).toEqual(
        refusal('#300 has 101 comments, more than 100'),
      );
    });

    it('should refuse an amendment without its stamp', async () => {
      expect(
        await finding({
          ...R2,
          comments: [
            amendment(1, '10:00:00', { body: '### Amendment 1\n\nReason.' }),
            amendment(2, '11:00:05'),
          ],
        }),
      ).toEqual(refusal('#300\'s Amendment 1 doesn\'t end with "— ARCHITECT"'));
    });

    it('should refuse an amendment that was edited', async () => {
      expect(
        await finding({
          ...R2,
          comments: [
            amendment(1, '10:00:00', { lastEditedAt: at('10:05:00') }),
            amendment(2, '11:00:05'),
          ],
        }),
      ).toEqual(refusal(`#300's Amendment 1 was edited at ${at('10:05:00')}`));
    });

    it('should refuse a missing amendment', async () => {
      expect(
        await finding({ ...R2, comments: [amendment(1, '11:00:05')] }),
      ).toEqual(
        refusal(
          "#300's body is r2 and its amendments are 1, not 1 to 2 in order",
        ),
      );
    });

    it('should refuse a surplus amendment', async () => {
      expect(
        await finding({
          ...R2,
          comments: [...R2.comments!, amendment(3, '12:00:00')],
        }),
      ).toEqual(
        refusal(
          "#300's body is r2 and its amendments are 1, 2, 3, not 1 to 2 in order",
        ),
      );
    });

    it('should refuse amendments out of order', async () => {
      expect(
        await finding({
          ...R2,
          comments: [amendment(2, '10:00:00'), amendment(1, '11:00:05')],
        }),
      ).toEqual(
        refusal(
          "#300's body is r2 and its amendments are 2, 1, not 1 to 2 in order",
        ),
      );
    });

    it('should refuse a body that was edited at r0', async () => {
      expect(
        await finding({ editor: OWNER, lastEditedAt: at('09:00:00') }),
      ).toEqual(
        refusal(`#300's body is r0 and was edited at ${at('09:00:00')}`),
      );
    });

    it('should refuse a body that was edited after its last amendment', async () => {
      expect(await finding({ ...R2, lastEditedAt: at('11:00:06') })).toEqual(
        refusal(
          `#300's body was edited at ${at('11:00:06')}, after Amendment 2 at ${at('11:00:05')}`,
        ),
      );
    });

    it('should refuse a revision later than the given one', async () => {
      expect(await finding(R2, '300', 'r1')).toEqual(
        refusal('#300 is at r2, later than the given r1'),
      );
    });

    it('should refuse a revision earlier than the given one', async () => {
      expect(await finding(R2, '300', 'r3')).toEqual(
        refusal('#300 is at r2, earlier than the given r3'),
      );
    });
  });

  describe('usage', () => {
    it.each([
      [],
      ['drag:DRF-1'],
      ['#300'],
      ['0'],
      ['300', '2'],
      ['300', ''],
      ['300', 'r'],
      ['300', 'r2', 'r3'],
      ['--help'],
    ])('should print the usage for %j', async (...args) => {
      expect(await run(args)).toEqual({ code: 1, stdout: '', stderr: USAGE });
    });
  });
});
