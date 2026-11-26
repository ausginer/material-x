// `RD-64` property 2's witness: for each moved identifier, `.scripts/entry.sh` in the tree before
// the move and in the tree after it prints the same text, except each link target and drag's
// status paragraph. Both trees need the resolver that reads `.plan/decisions`.
//
//     node .plan/decision-files-1/probes/witness.mjs <tree before> <tree after>
//
// It prints the count of identifiers compared, the count of link targets that differ, the count of
// status paragraphs, and every identifier whose text differs in anything else.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [before, after] = process.argv.slice(2);
const SCOPES = [
  { name: 'repo', index: '.plan/00-index.md', moves: /^#### (RD-\d+)( —|$)/u },
  {
    name: 'drag',
    index: 'packages/drag/.plan/00-index.md',
    moves: /^#### ((?:DRD|DRO)-\d+)( —|$)/u,
  },
];
const LINK = /\]\(([^)\s]+)\)/gu;
const STATUS = /^\*\*Status:\*\* .*\n\n/mu;

const print = (root, address) =>
  execFileSync(join(root, '.scripts/entry.sh'), [address], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

let compared = 0;
let links = 0;
let statuses = 0;
const differ = [];

for (const { name, index, moves } of SCOPES) {
  const ids = readFileSync(join(before, index), 'utf8')
    .split('\n')
    .map((line) => moves.exec(line)?.[1])
    .filter(Boolean);

  for (const id of ids) {
    const address = `${name}:${id}`;
    const old = print(before, address);
    let next = print(after, address);
    const [heading, ...rest] = next.split('\n');
    const body = rest.join('\n');

    if (STATUS.test(body.replace(/^\n/u, ''))) {
      statuses += 1;
      next = `${heading}\n${body.replace(/^\n/u, '\n').replace(STATUS, '')}`;
    }

    const targets = (text) => [...text.matchAll(LINK)].map((m) => m[1]);
    const [a, b] = [targets(old), targets(next)];
    links += a.filter((target, i) => target !== b[i]).length;

    const mask = (text) => text.replace(LINK, '](…)');

    if (mask(old) !== mask(next) || a.length !== b.length) {
      differ.push(address);
    }

    compared += 1;
  }
}

process.stdout.write(
  `${JSON.stringify({ compared, linkTargetsChanged: links, statusParagraphs: statuses, differ }, null, 1)}\n`,
);
