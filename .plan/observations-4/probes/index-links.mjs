import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const file = process.argv[2];
const text = readFileSync(file, 'utf8');
const lines = text.split('\n');
const slug = (h) =>
  h
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
    .replace(/ /g, '-');
const anchorsOf = (f) => {
  const s = new Map();
  const out = new Set();
  let fence = false;
  for (const l of readFileSync(f, 'utf8').split('\n')) {
    if (/^```/.test(l)) fence = !fence;
    if (fence) continue;
    const m = /^#{1,6} (.*)$/.exec(l);
    if (!m) continue;
    let b = slug(m[1]);
    const n = s.get(b) ?? 0;
    s.set(b, n + 1);
    out.add(n ? `${b}-${n}` : b);
  }
  return out;
};
lines.forEach((l, i) => {
  for (const m of l.matchAll(/\]\(([^)\s]+)\)/g)) {
    const t = m[1];
    if (/^[a-z]+:/.test(t)) continue;
    const [p, a] = t.split('#');
    const target = p ? resolve(dirname(file), p) : file;
    if (!existsSync(target)) {
      console.log(`${i + 1}: missing ${t}`);
      continue;
    }
    if (
      a &&
      target.endsWith('.md') &&
      !anchorsOf(target).has(decodeURIComponent(a))
    )
      console.log(`${i + 1}: anchor ${t}`);
  }
});
