/**
 * Reads a V8 log written with `--log-ic --log-code` (the benchmark's Chromium
 * run with `BENCH_V8_LOG`) and prints, for each inline cache site that reads or
 * writes the benchmark's keys, the states it went through, its last state and
 * the number of distinct receiver maps its misses saw.
 *
 * States, as V8's log writes them: `0` uninitialized, `1` monomorphic, `P`
 * polymorphic, `N` megamorphic, `X` no feedback vector yet (lazy feedback
 * allocation), `^` handler recomputed.
 *
 * `node .plan/trait-mixin-measure-1/probe/ic-log.ts <v8.log>`
 */
import { readFile } from 'node:fs/promises';

const KEYS = new Set([
  'disabled',
  'get',
  'set',
  'getRaw',
  'setRaw',
  'getAttribute',
  'setAttribute',
  'removeAttribute',
  'from',
  'to',
]);

const IC_TYPES = new Set(['LoadIC', 'StoreIC', 'KeyedLoadIC', 'KeyedStoreIC']);

type Code = { start: number; end: number; name: string; script?: string };

/** Code ranges, kept sorted by start; a new range replaces any it overlaps. */
const codes: Code[] = [];

function indexOf(address: number): number {
  let lo = 0;
  let hi = codes.length - 1;
  let found = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;

    if (codes[mid]!.start <= address) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return found;
}

function insert(code: Code): void {
  let i = indexOf(code.start);

  if (i >= 0 && codes[i]!.end <= code.start) {
    i += 1;
  } else if (i < 0) {
    i = 0;
  }

  let j = i;

  while (j < codes.length && codes[j]!.start < code.end) {
    j += 1;
  }

  codes.splice(i, j - i, code);
}

function find(address: number): Code | undefined {
  const i = indexOf(address);
  const code = codes[i];

  return code && address < code.end ? code : undefined;
}

/** Splits a log line at commas that aren't escaped (`\x2C` is V8's escape). */
function fields(line: string): string[] {
  return line.split(',');
}

type Site = {
  where: string;
  type: string;
  key: string;
  states: string[];
  maps: Set<string>;
};

const [path] = process.argv.slice(2);

if (path == null) {
  throw new Error('usage: node ic-log.ts <v8.log>');
}

const sites = new Map<string, Site>();

/** A benchmark site's script id → its `sourceURL`, from `script-source`. */
const sourceURLs = new Map<string, string>();

for (const line of (await readFile(path, 'utf8')).split('\n')) {
  const f = fields(line);

  if (f[0] === 'script-source') {
    const url = /sourceURL=(site-[\w-]+)\.js/u.exec(line)?.[1];

    if (url != null) {
      sourceURLs.set(f[1]!, url);
    }
  } else if (f[0] === 'code-source-info') {
    // The script a code object belongs to: names an anonymous benchmark site.
    const code = codes[indexOf(Number.parseInt(f[1]!, 16))];

    if (code && code.start === Number.parseInt(f[1]!, 16)) {
      code.script = f[2];
    }
  } else if (f[0] === 'code-creation') {
    const start = Number.parseInt(f[4]!, 16);
    const size = Number(f[5]);
    insert({ start, end: start + size, name: f[6]! });
  } else if (f[0] === 'code-move') {
    const from = Number.parseInt(f[1]!, 16);
    const to = Number.parseInt(f[2]!, 16);
    const i = indexOf(from);
    const code = codes[i];

    if (code && code.start === from) {
      codes.splice(i, 1);
      insert({ ...code, start: to, end: to + (code.end - code.start) });
    }
  } else if (IC_TYPES.has(f[0]!)) {
    const [type, pc, , lineNo, column, from, to, map, key] = f as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];

    if (!KEYS.has(key)) {
      continue;
    }

    const code = find(Number.parseInt(pc, 16));
    const site = code?.script == null ? undefined : sourceURLs.get(code.script);
    const name = (site ?? code?.name ?? '<unknown>')
      .replace(
        /https?:\/\/[^ ]*\/(?:@fs)?\/workspaces\/[^ ]*?\/(packages|\.build)\//u,
        '$1/',
      )
      .replace(/https?:\/\/localhost:\d+\//u, '')
      .replace(/:\d+:\d+$/u, '');
    const where = `${name.trim() === '' ? '(benchmark site)' : name.trim()} @${lineNo}:${column}`;
    const id = `${where} ${type} .${key}`;
    let entry = sites.get(id);

    if (!entry) {
      entry = { where, type, key, states: [], maps: new Set() };
      sites.set(id, entry);
    }

    if (from !== to || entry.states.length === 0) {
      entry.states.push(`${from}→${to}`);
    }

    entry.maps.add(map);
  }
}

console.log('| Site | IC | Key | Transitions | Last state | Maps seen |');
console.log('| --- | --- | --- | --- | --- | --: |');

// Only the components', core's and the benchmark sites' code, and only a site
// that had feedback: `X→X` alone is a site that ran before its function had a
// feedback vector.
const ours = /^(?:.* )?(?:packages\/|\.build\/)|^site-/u;

for (const site of [...sites.values()].toSorted((a, b) =>
  a.where.localeCompare(b.where),
)) {
  const last = site.states.at(-1)!.split('→')[1];
  const transitions = site.states.filter((s) => s !== 'X→X').join(' ');

  if (!ours.test(site.where.trim()) || transitions === '') {
    continue;
  }

  console.log(
    `| ${site.where} | ${site.type} | ${site.key} | ${transitions || 'X'} | ${last} | ${site.maps.size} |`,
  );
}
