// Reviewer's witness of RD-64 property 2, independent of probes/witness.mjs.
// For each #### RD/DRD/DRO entry of the two indexes at BEFORE, compares it with its file at AFTER:
// the texts are split into link targets and the rest; the rest must be equal, and each target that
// differs must resolve to the same place (or follow rule 5 for a link into an index).
// usage: node witness.mjs <git-dir> <before> <after>
import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';

const [gitDir, BEFORE, AFTER] = process.argv.slice(2);
const git = (...a) =>
  execFileSync('git', ['-C', gitDir, ...a], {
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  });
const show = (rev, p) => git('show', `${rev}:${p}`);
const treeAfter = new Set(
  git('ls-tree', '-r', '--name-only', AFTER).split('\n'),
);
const dirsAfter = new Set();
for (const f of treeAfter) {
  let d = posix.dirname(f);
  while (d !== '.') {
    dirsAfter.add(d);
    d = posix.dirname(d);
  }
}

const scopes = [
  { root: '', index: '.plan/00-index.md', re: /^(RD)-\d+$/ },
  {
    root: 'packages/drag/',
    index: 'packages/drag/.plan/00-index.md',
    re: /^(DRD|DRO)-\d+$/,
  },
];
const slugOf = (h) =>
  h
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
// a link destination: ](...)
const LINK = /\]\(([^)\s]+)\)/g;
const split = (text) => {
  const targets = [];
  const rest = text.replace(LINK, (_, t) => {
    targets.push(t);
    return ']()';
  });
  return { targets, rest };
};
const resolve = (fromFile, t) => {
  if (/^[a-z]+:/i.test(t) || t.startsWith('/')) return { abs: t };
  const [p, frag] = t.split('#');
  const path =
    p === ''
      ? fromFile
      : posix.normalize(posix.join(posix.dirname(fromFile), p));
  return { path: path.replace(/\/$/, ''), frag: frag ?? null };
};

const report = {
  ids: 0,
  sameExceptTargets: 0,
  differs: [],
  targetsChanged: 0,
  sameTarget: 0,
  rule5: { toFile: 0, toDir: 0, fragToFile: 0, kept: 0 },
  badTargets: [],
  statusParagraphs: 0,
  statusMismatch: [],
};
for (const s of scopes) {
  const lines = show(BEFORE, s.index).split('\n');
  const ids = new Map(); // slug -> id, of moved entries
  const entries = [];
  let cur = null;
  for (const line of lines) {
    const m = /^#### ([A-Za-z][A-Za-z0-9]*-\d+)(?: — (.+))?$/.exec(line);
    if (/^#{1,4} /.test(line)) {
      if (cur) entries.push(cur);
      cur = null;
    }
    if (m && s.re.test(m[1])) {
      cur = { id: m[1], lines: [line] };
      ids.set(slugOf(line.slice(5)), m[1]);
    } else if (cur) cur.lines.push(line);
  }
  if (cur) entries.push(cur);
  // status table
  const status = new Map();
  let inStatus = false;
  for (const line of lines) {
    if (/^## /.test(line)) inStatus = line === '## Decision status';
    const m = inStatus && /^\| ((?:DRD|DRO)-\d+) \| (.*) \|$/.exec(line);
    if (m) status.set(m[1], m[2]);
  }
  const decDir = `${s.root}.plan/decisions`;
  for (const e of entries) {
    report.ids++;
    const file = `${decDir}/${e.id}.md`;
    let after = show(AFTER, file).split('\n');
    let before = e.lines;
    // strip trailing blank lines for comparison (file ends without newline)
    while (before.length && before.at(-1) === '') before = before.slice(0, -1);
    while (after.length && after.at(-1) === '') after = after.slice(0, -1);
    if (status.has(e.id)) {
      // after: heading, '', '**Status:** <row>', '', ...
      const para = after[2];
      if (
        after[1] !== '' ||
        !para?.startsWith('**Status:** ') ||
        after[3] !== ''
      )
        report.statusMismatch.push(`${e.id}: shape`);
      else {
        const a = split(para.slice(12));
        const b = split(status.get(e.id));
        if (a.rest !== b.rest) report.statusMismatch.push(`${e.id}: text`);
        a.targets.forEach((t, i) =>
          check(e.id, file, t, s.index, b.targets[i]),
        );
        report.statusParagraphs++;
      }
      after = [after[0], ...after.slice(3)];
    } else if (/^DRD/.test(e.id)) report.statusMismatch.push(`${e.id}: no row`);
    const A = split(after.join('\n'));
    const B = split(before.join('\n'));
    if (A.rest !== B.rest || A.targets.length !== B.targets.length) {
      report.differs.push(e.id);
      continue;
    }
    report.sameExceptTargets++;
    B.targets.forEach((t, i) => check(e.id, file, A.targets[i], s.index, t));
  }
  function check(id, file, nt, index, ot) {
    if (nt === ot && /^[a-z]+:/i.test(ot)) {
      report.absoluteKept = (report.absoluteKept ?? 0) + 1;
      return;
    }
    if (nt === ot) {
      (report.relativeUnchanged ??= []).push(`${id}: ${ot}`);
      return;
    }
    const o = resolve(index, ot);
    const n = resolve(file, nt);
    if (nt !== ot) report.targetsChanged++;
    if (o.abs) {
      if (nt !== ot)
        report.badTargets.push(`${id}: absolute changed ${ot} -> ${nt}`);
      return;
    }
    const exists = (p) => treeAfter.has(p) || dirsAfter.has(p);
    if (o.path === index) {
      // a link into the index (or same-file fragment)
      const movedId = o.frag && ids.get(o.frag);
      if (movedId) {
        if (n.path === `${decDir}/${movedId}.md` && !n.frag)
          report.rule5.fragToFile++;
        else report.badTargets.push(`${id}: frag ${ot} -> ${nt}`);
        return;
      }
      if (o.frag) {
        if (n.path === index && n.frag === o.frag) report.rule5.kept++;
        else report.badTargets.push(`${id}: frag kept? ${ot} -> ${nt}`);
        return;
      }
      if (n.path === index) report.rule5.kept++;
      else if (n.path === decDir) report.rule5.toDir++;
      else if (n.path.startsWith(decDir + '/') && exists(n.path))
        report.rule5.toFile++;
      else report.badTargets.push(`${id}: index ${ot} -> ${nt}`);
      return;
    }
    if (o.path === n.path && o.frag === n.frag) {
      report.sameTarget++;
      return;
    }
    report.badTargets.push(`${id}: ${ot} -> ${nt} (${o.path} vs ${n.path})`);
  }
}
console.log(JSON.stringify(report, null, 1));
