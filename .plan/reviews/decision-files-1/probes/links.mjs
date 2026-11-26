// Reviewer's link check, independent of probes/links-resolve.mjs. Reads a commit through git, not a
// working tree. Every tracked .md/.mdx file; inline links `](dest)` and `](<dest>)`, and reference
// definitions `[x]: dest`; fenced blocks skipped; code spans read as CommonMark does (a run of n
// backticks closes on the next run of exactly n). A relative destination resolves if its path is a
// file or a directory of the commit. Also counts fragment links into the two indexes and the
// decisions files that name no heading (GitHub-style slug).
// usage: node links.mjs <git-dir> <rev>
import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';

const [gitDir, REV] = process.argv.slice(2);
const git = (...a) =>
  execFileSync('git', ['-C', gitDir, '-c', 'core.quotePath=false', ...a], {
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  });
const all = git('ls-tree', '-r', '--name-only', REV)
  .split('\n')
  .filter(Boolean);
const files = new Set(all);
const dirs = new Set();
for (const f of all) {
  let d = posix.dirname(f);
  while (d !== '.') {
    dirs.add(d);
    d = posix.dirname(d);
  }
}
const md = all.filter((f) => /\.mdx?$/.test(f));
const cache = new Map();
const text = (p) => {
  if (!cache.has(p)) cache.set(p, git('show', `${REV}:${p}`));
  return cache.get(p);
};
const slugs = (p) => {
  const set = new Set();
  const seen = new Map();
  let fence = false;
  for (const l of text(p).split('\n')) {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (fence) continue;
    const m = /^#{1,6} (.*)$/.exec(l);
    if (!m) continue;
    let s = m[1]
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const n = seen.get(s) ?? 0;
    seen.set(s, n + 1);
    set.add(n ? `${s}-${n}` : s);
  }
  return set;
};
const codeRanges = (line) => {
  const runs = [...line.matchAll(/`+/g)];
  const ranges = [];
  for (let i = 0; i < runs.length; i++) {
    const j = runs.findIndex(
      (r, k) => k > i && r[0].length === runs[i][0].length,
    );
    if (j !== -1) {
      ranges.push([runs[i].index, runs[j].index + runs[j][0].length]);
      i = j;
    }
  }
  return ranges;
};
let links = 0;
const broken = [];
const badFrag = [];
for (const f of md) {
  let fence = false;
  let n = 0;
  for (const line of text(f).split('\n')) {
    n++;
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const ranges = codeRanges(line);
    const inCode = (i) => ranges.some(([a, b]) => i >= a && i < b);
    const dests = [];
    for (const m of line.matchAll(/\]\(\s*(<[^>]*>|[^)\s]+)/g))
      if (!inCode(m.index)) dests.push(m[1].replace(/^<|>$/g, ''));
    const ref = /^\s{0,3}\[[^\]]+\]:\s*(\S+)/.exec(line);
    if (ref) dests.push(ref[1].replace(/^<|>$/g, ''));
    for (const d of dests) {
      if (
        /^[a-z][a-z0-9+.-]*:/i.test(d) ||
        d.startsWith('/') ||
        d.startsWith('#')
      )
        continue;
      links++;
      const [p, frag] = d.split('#');
      const path = posix
        .normalize(posix.join(posix.dirname(f), decodeURI(p)))
        .replace(/\/$/, '');
      if (!files.has(path) && !dirs.has(path)) {
        broken.push(`${f}:${n} ${d}`);
        continue;
      }
      if (
        frag &&
        files.has(path) &&
        /(00-index|decisions\/[A-Z]+-\d+)\.md$/.test(path) &&
        !slugs(path).has(frag.toLowerCase())
      )
        badFrag.push(`${f}:${n} ${d}`);
    }
  }
}
console.log(
  JSON.stringify(
    {
      rev: REV,
      files: md.length,
      links,
      broken: broken.length,
      fragmentsIntoRecordsNamingNoHeading: badFrag.length,
    },
    null,
    1,
  ),
);
console.log(broken.join('\n'));
console.log('-- fragments');
console.log(badFrag.join('\n'));
