// Checks one build's source maps for the trait modules:
//   node maps.ts <outDir> [<referenceOutDir>]
// For each .js whose source is a trait's (`@trait` or `trait(this)`): the map's sourcesContent is the file
// on disk; each `get NAME()` maps to the source line with `accessor NAME`, and
// the class to the line with `class NAME`. With a reference build, also says
// whether each map is byte-identical to the reference's.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';

const [outDir, reference] = process.argv.slice(2) as [string, string?];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.js.map')) yield path;
  }
}

function lineAt(code: string, index: number): { line: number; column: number } {
  const before = code.slice(0, index).split('\n');
  return { line: before.length, column: before.at(-1)!.length };
}

let checked = 0;
let failures = 0;
let identical = 0;
let differing: string[] = [];
for (const mapPath of walk(outDir)) {
  const raw = readFileSync(mapPath, 'utf8');
  const json = JSON.parse(raw);
  const sourcePath = resolve(dirname(mapPath), json.sources[0]);
  if (!existsSync(sourcePath)) continue;
  const source = readFileSync(sourcePath, 'utf8');
  if (!/@trait\b|\btrait\(this\)/u.test(source)) continue;
  checked += 1;
  const rel = relative(outDir, mapPath);
  const problems: string[] = [];
  if (json.sourcesContent?.[0] !== source) {
    problems.push('sourcesContent is not the file on disk');
  }
  const js = readFileSync(mapPath.slice(0, -4), 'utf8');
  const trace = new TraceMap(raw);
  const sourceLines = source.split('\n');
  const probes: Array<[RegExp, (name: string) => string]> = [
    [/\bget (\w+)\(\)/gu, (name) => `accessor ${name}`],
    [/\b(?:var|class) (\w+)(?: = class)? extends/gu, (name) => `class ${name}`],
  ];
  for (const [pattern, expected] of probes) {
    for (const match of js.matchAll(pattern)) {
      const at = lineAt(
        js,
        match.index +
          (match[0].startsWith('get') ? 0 : match[0].indexOf(match[1]!)),
      );
      const original = originalPositionFor(trace, at);
      const line = original.line
        ? sourceLines[original.line - 1]!
        : '(unmapped)';
      // A component's own class is not in a trait source; only check the trait's.
      if (!source.includes(expected(match[1]!))) continue;
      if (!line.includes(expected(match[1]!))) {
        problems.push(
          `${match[0]} maps to line ${original.line}: ${line.trim()}`,
        );
      }
    }
  }
  if (problems.length > 0) {
    failures += 1;
    console.log(`FAIL ${rel}\n  ${problems.join('\n  ')}`);
  }
  if (reference) {
    const other = join(reference, rel);
    if (existsSync(other) && readFileSync(other, 'utf8') === raw)
      identical += 1;
    else differing.push(rel);
  }
}
console.log(`${checked} trait maps checked, ${failures} with problems`);
if (reference) {
  console.log(
    `${identical} identical to ${reference}, ${differing.length} differ${differing.length ? `: ${differing.join(', ')}` : ''}`,
  );
}
