// Compares two package-lock.json files by what Node resolves, not by entry key.
// Usage, from the repository root: node <this file> <before.json> <after.json>
// 1. name@version pairs that appear in, or disappear from, the whole lockfile.
// 2. For each entry present in both, each dependency whose version, found by
//    Node's upward walk over the lockfile's paths, differs.
// 3. In <after>, each non-optional dependency whose found version is outside
//    its range.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const semver = createRequire(`${process.cwd()}/`)('semver');
const [before, after] = process.argv
  .slice(2)
  .map((path) => JSON.parse(readFileSync(path, 'utf8')).packages);

const NM = 'node_modules/';

function versionOf(lock, key) {
  const entry = lock[key];
  return entry.link ? lock[entry.resolved]?.version : entry.version;
}

function find(lock, from, name) {
  let dir = from;
  for (;;) {
    const key = `${dir ? `${dir}/` : ''}${NM}${name}`;
    if (key in lock) {
      return { key, version: versionOf(lock, key) };
    }
    if (!dir) {
      return undefined;
    }
    const cut = dir.lastIndexOf(`/${NM}`);
    dir = cut >= 0 ? dir.slice(0, cut) : '';
  }
}

function pairs(lock) {
  const set = new Set();
  for (const [key, entry] of Object.entries(lock)) {
    if (key.includes(NM)) {
      set.add(`${key.slice(key.lastIndexOf(NM) + NM.length)}@${entry.version}`);
    }
  }
  return set;
}

function dependencyNames(key, entry) {
  return new Set([
    ...Object.keys(entry.dependencies ?? {}),
    ...Object.keys(entry.optionalDependencies ?? {}),
    ...Object.keys(entry.peerDependencies ?? {}),
    ...(key.includes(NM) ? [] : Object.keys(entry.devDependencies ?? {})),
  ]);
}

const a = pairs(before);
const b = pairs(after);
console.log('1. name@version new to the lockfile:');
for (const pair of b) if (!a.has(pair)) console.log(`  + ${pair}`);
console.log('   name@version gone from the lockfile:');
for (const pair of a) if (!b.has(pair)) console.log(`  - ${pair}`);

console.log('2. Resolved version changes, for entries present in both:');
for (const [key, entry] of Object.entries(after)) {
  if (!(key in before) || entry.link) continue;
  for (const name of dependencyNames(key, entry)) {
    const was = find(before, key, name)?.version;
    const now = find(after, key, name)?.version;
    if (was !== now)
      console.log(`  ${key || '(root)'} -> ${name}: ${was} => ${now}`);
  }
}

console.log('3. Out-of-range resolutions in <after>:');
for (const [key, entry] of Object.entries(after)) {
  if (entry.link || entry.optional) continue;
  const ranges = { ...entry.dependencies };
  for (const [name, range] of Object.entries(entry.peerDependencies ?? {})) {
    if (!entry.peerDependenciesMeta?.[name]?.optional) ranges[name] = range;
  }
  if (!key.includes(NM)) Object.assign(ranges, entry.devDependencies);
  for (let [name, range] of Object.entries(ranges)) {
    if (range.startsWith('npm:'))
      range = range.slice(range.lastIndexOf('@') + 1);
    if (!semver.validRange(range)) continue;
    const hit = find(after, key, name);
    if (!hit) {
      console.log(`  missing: ${key || '(root)'} -> ${name} ${range}`);
    } else if (
      semver.valid(hit.version) &&
      !semver.satisfies(hit.version, range, { includePrerelease: true })
    ) {
      console.log(
        `  ${key || '(root)'} -> ${name} ${range}: ${hit.key} ${hit.version}`,
      );
    }
  }
}
