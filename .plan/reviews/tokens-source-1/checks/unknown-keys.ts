// For each distinct object path in the raw tables (arrays collapsed, id-keyed
// map entries collapsed to <key>), injects an unknown key into the first
// object at that path in DB.load()'s table order and converts in memory.
// Prints each path and whether the conversion refused, with the refusal's
// "table: token: field" head. No table value is printed.
// Usage: node unknown-keys.ts <tproc dir> <tables dir>
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const [tproc, dir] = process.argv.slice(2) as [string, string];
const { convert } = await import(join(tproc, 'scripts/convert.ts'));
const ORDER = [
  'COLOR.20543ce18892f7d9',
  'ELEVATION.20543ce18892f7d9',
  'TOKEN_TYPE_UNSPECIFIED.20543ce18892f7d9',
  'TYPOGRAPHY.20543ce18892f7d9',
  'TOKEN_TABLE.1c4257f8804f9478',
  'TOKEN_TABLE.41587918e51cca98',
  'TOKEN_TABLE.60990dd98dea0998',
  'TOKEN_TABLE.36500f77b86d20a5',
  'TOKEN_TABLE.0fe2282006ae098b',
  'TOKEN_TABLE.082d7fd6e058b011',
  'TOKEN_TABLE.624e8f2da4007fc8',
  'TOKEN_TABLE.31f16b44fe03b0c0',
  'TOKEN_TABLE.6acb269a58d5f93f',
  'TOKEN_TABLE.6c818a16475113bd',
];
const texts = await Promise.all(
  ORDER.map((f) => readFile(join(dir, `${f}.json`), 'utf8')),
);
const WORD = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/u;
const KEY = 'zzUnknownKey';
// Every distinct object path, in first-seen order, with its table index.
const paths = new Map<string, number>();
const collect = (v: unknown, p: string, t: number) => {
  if (Array.isArray(v)) {
    for (const x of v) collect(x, `${p}[]`, t);
    return;
  }
  if (v && typeof v === 'object') {
    if (!paths.has(p)) paths.set(p, t);
    for (const [k, x] of Object.entries(v))
      collect(x, `${p}.${WORD.test(k) ? k : '<key>'}`, t);
  }
};
texts.forEach((text, t) => collect(JSON.parse(text), 'T', t));
// The first object at `path` inside `v`.
const find = (v: any, p: string, at: string): any => {
  if (at === p) return v;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = find(x, p, `${at}[]`);
      if (r) return r;
    }
    return null;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      const next = `${at}.${WORD.test(k) ? k : '<key>'}`;
      if (p === next || p.startsWith(next + '.') || p.startsWith(next + '[')) {
        const r = find(x, p, next);
        if (r) return r;
      }
    }
  }
  return null;
};
const sources = () =>
  ORDER.map((f, i) => {
    const [kind, componentId] = f.split('.') as [string, string];
    return { kind, componentId, table: JSON.parse(texts[i]!) };
  });
let refused = 0,
  converted = 0;
for (const [p, t] of paths) {
  const s = sources();
  const target = find(s[t]!.table, p, 'T');
  if (!target) {
    console.log(`${p}: not found`);
    continue;
  }
  target[KEY] = 1;
  try {
    convert(s, { release: null, fetchDate: null, legacy: true });
    converted++;
    console.log(`CONVERTED ${p}`);
  } catch (e) {
    refused++;
    const m = String((e as Error).message);
    console.log(
      `refused   ${p} -> ${m.includes(KEY) ? 'names the key' : 'other: ' + m.split(': ').slice(2, 4).join(': ').slice(0, 80)}`,
    );
  }
}
console.log(
  `object paths ${paths.size}: refused ${refused}, converted ${converted}`,
);
