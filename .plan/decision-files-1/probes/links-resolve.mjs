// Every relative link in a tracked Markdown file of the tree, and whether its path resolves to a
// file or a directory. Fragments aren't checked. A link in a fenced block or an inline code span
// isn't read, a span as CommonMark reads it, as in move.mjs. Run from the root of the tree:
//
//     node .plan/decision-files-1/probes/links-resolve.mjs
//
// It prints the counts, and each broken link as `<file>:<line> <target>`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LINK = /\]\(([^)\s]+)\)/gu;
const files = execFileSync(
  'git',
  [
    '-c',
    'core.quotePath=false',
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '*.md',
    '*.mdx',
  ],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n');
let links = 0;
/**
 * Whether the match at `index` of `line` is inside an inline code span, as CommonMark reads one: a
 * run of n backticks opens it, and the next run of exactly n closes it. A run that nothing closes
 * is text.
 */
function inCode(line, index) {
  const runs = [...line.matchAll(/`+/gu)];

  for (let i = 0; i < runs.length && runs[i].index < index; i += 1) {
    const close = runs.findIndex(
      (run, j) => j > i && run[0].length === runs[i][0].length,
    );

    if (close !== -1) {
      if (index < runs[close].index) {
        return true;
      }

      i = close;
    }
  }

  return false;
}

const broken = [];

for (const file of files) {
  let fence = false;

  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, at) => {
      if (/^\s*(```|~~~)/u.test(line)) {
        fence = !fence;
      }

      if (fence) {
        return;
      }

      for (const match of line.matchAll(LINK)) {
        const href = match[1];

        if (
          /^[a-z][a-z0-9+.-]*:/iu.test(href) ||
          href.startsWith('#') ||
          href.startsWith('/') ||
          inCode(line, match.index)
        ) {
          continue;
        }

        links += 1;
        const path = decodeURI(href.split('#')[0]);

        if (!existsSync(join(dirname(file), path))) {
          broken.push(`${file}:${at + 1} ${href}`);
        }
      }
    });
}

process.stdout.write(
  `${JSON.stringify({ files: files.length, links, broken: broken.length }, null, 1)}\n${broken.join('\n')}\n`,
);
