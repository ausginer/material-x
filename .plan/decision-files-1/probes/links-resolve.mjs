// Every relative link in a tracked Markdown file of the tree, and whether its path resolves to a
// file or a directory. Fragments aren't checked. A link in a fenced block or an inline code span
// isn't read. Run from the root of the tree:
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
          (line.slice(0, match.index).match(/`/gu)?.length ?? 0) % 2 === 1
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
