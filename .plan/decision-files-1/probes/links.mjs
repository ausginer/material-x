// Counts, read-only, the links that moving each #### RD-, DRD- and DRO- entry of the two indexes into
// <root>/.plan/decisions/<id>.md would touch, by the plan's rules. Run from the repository root: node .plan/decision-files-1/probes/links.mjs
// fragMoved/fragOther: links into an index with a fragment of a moved entry, or another. toFile: no fragment, the line names one moved
// identifier and no finding. toDir: several moved identifiers and no finding. unchanged: the rest.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, normalize, relative } from 'node:path';
const INDEXES = ['.plan/00-index.md', 'packages/drag/.plan/00-index.md'];
const ENTRY = /^#### ((?:RD|DRD|DRO)-\d+)( —|$)/;
const moved = new Map(); // id -> index
const inMoved = new Map(); // index -> Set of line numbers inside moved entries
for (const f of INDEXES) {
  const lines = readFileSync(f, 'utf8').split('\n');
  const set = new Set();
  let cur = null;
  lines.forEach((l, i) => {
    if (/^#{1,4} /.test(l)) {
      const m = ENTRY.exec(l);
      cur = m ? m[1] : null;
      if (m) moved.set(m[1], f);
    }
    if (cur) set.add(i);
  });
  inMoved.set(f, set);
}
const files = execFileSync(
  'git',
  ['-c', 'core.quotePath=false', 'ls-files', '*.md', '*.mdx'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n');
const LINK = /\]\(([^)\s]+)\)/g;
const c = {
  insideRel: 0,
  insideFrag: 0,
  insideAbs: 0,
  toIndexInside: 0,
  elseToIndex: 0,
  elseToIndexFrag: 0,
  
  
  elseFiles: new Set(),
};
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  const inside = inMoved.get(f);
  lines.forEach((l, i) => {
    for (const m of l.matchAll(LINK)) {
      const t = m[1];
      if (/^[a-z]+:/i.test(t)) {
        if (inside?.has(i)) c.insideAbs++;
        continue;
      }
      const [p, frag] = t.split('#');
      const target = p ? normalize(join(dirname(f), p)) : f;
      if (inside?.has(i)) {
        if (p) c.insideRel++;
        else c.insideFrag++;
        if (INDEXES.includes(target)) c.toIndexInside++;
        continue;
      }
      if (!INDEXES.includes(target) || (!p && !inside)) {
        if (!p) continue;
        if (!INDEXES.includes(target)) continue;
      }
      if (!p) continue; // same-file fragment outside moved entries
      c.elseToIndex++;
      c.elseFiles.add(f);
      if (frag) c.elseToIndexFrag++;
      const ids = new Set(
        [...l.matchAll(/\b(?:[a-z0-9-]+:)?((?:RD|DRD|DRO)-\d+)\b/g)]
          .map((x) => x[1])
          .filter((x) => moved.has(x)),
      );
      const fids = /\b(?:RF|DRF|RQ)-\d+\b/.test(l);
      const k = frag
        ? /^(rd|drd|dro)-\d+--/.test(frag)
          ? 'fragMoved'
          : 'fragOther'
        : ids.size === 1 && !fids
          ? 'toFile'
          : ids.size > 1 && !fids
            ? 'toDir'
            : 'unchanged';
      c[k] = (c[k] ?? 0) + 1;
    }
  });
}
console.log(
  JSON.stringify(
    { moved: moved.size, ...c, elseFiles: c.elseFiles.size },
    null,
    1,
  ),
);
