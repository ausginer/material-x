/**
 * Proof 3: compares two `surface.json` readings after one normalisation of
 * both sides, and prints every remaining difference.
 *
 * - Brand members, a symbol key `[$x]` whose type is `true`, are removed.
 * - `#private` is removed.
 * - An alias is compared by its properties where it has them, and otherwise
 *   by its expanded type. The renamed type names reach a reading only as alias
 *   names, which the expanded properties don't carry.
 * - A trait's instance alias, `type X = Interface<typeof X>`, that the
 *   reading after the migration has as a class `X` instead, is the named
 *   rename: the alias's properties are compared with the class's instance
 *   members, and the class's statics with none.
 * - The modules the migration renames, `traits/primitives` and
 *   `traits/attributes` into `traits/composition` and
 *   `traits/attribute-traits`, are listed, not compared.
 *
 * `node .plan/trait-migration-1/baseline/surface-compare.ts <before.json> <after.json>`
 */
import { readFile } from 'node:fs/promises';

type Members = Readonly<Record<string, string>>;
type ClassSurface = Readonly<{ instance: Members; static: Members }>;
type AliasSurface = Readonly<{ type: string; properties?: Members }>;
type Entry = Readonly<{
  classes: Readonly<Record<string, ClassSurface>>;
  aliases: Readonly<Record<string, AliasSurface>>;
}> | null;
type Surface = Readonly<Record<string, Entry>>;

const [beforePath, afterPath] = process.argv.slice(2);
const before = JSON.parse(await readFile(beforePath!, 'utf8')) as Surface;
const after = JSON.parse(await readFile(afterPath!, 'utf8')) as Surface;

function normalize(members: Members | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(members ?? {}).filter(
      ([key, type]) =>
        key !== '#private' && !(key.startsWith('[$') && type === 'true'),
    ),
  );
}

const differences: string[] = [];

function compareMembers(
  where: string,
  a: Members | undefined,
  b: Members | undefined,
): void {
  const left = normalize(a);
  const right = normalize(b);
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    if (left[key] !== right[key]) {
      differences.push(
        `${where} ${key}\n    before: ${left[key] ?? '(absent)'}\n    after:  ${right[key] ?? '(absent)'}`,
      );
    }
  }
}

const RENAMED_MODULES = new Set([
  'core/traits/primitives.js',
  'core/traits/attributes.js',
  'core/traits/composition.js',
  'core/traits/attribute-traits.js',
]);
const renamed: string[] = [];

for (const entry of new Set([...Object.keys(before), ...Object.keys(after)])) {
  const a = before[entry];
  const b = after[entry];
  if (RENAMED_MODULES.has(entry)) {
    renamed.push(`${entry}: ${a ? 'removed' : 'added'}`);
    continue;
  }
  if (!a || !b) {
    differences.push(`${entry}: ${a ? 'removed' : 'added'}`);
    continue;
  }
  for (const name of new Set([
    ...Object.keys(a.classes),
    ...Object.keys(b.classes),
  ])) {
    const ca = a.classes[name];
    const cb = b.classes[name];
    const alias = a.aliases[name];
    if (!ca && cb && alias?.properties && !b.aliases[name]) {
      renamed.push(`${entry} type ${name} -> class ${name}`);
      compareMembers(
        `${entry} class ${name} (was type) instance`,
        alias.properties,
        cb.instance,
      );
      compareMembers(`${entry} class ${name} (was type) static`, {}, cb.static);
      continue;
    }
    if (!ca || !cb) {
      differences.push(`${entry} class ${name}: ${ca ? 'removed' : 'added'}`);
      continue;
    }
    compareMembers(`${entry} class ${name} instance`, ca.instance, cb.instance);
    compareMembers(`${entry} class ${name} static`, ca.static, cb.static);
  }
  for (const name of new Set([
    ...Object.keys(a.aliases),
    ...Object.keys(b.aliases),
  ])) {
    const aa = a.aliases[name];
    const ab = b.aliases[name];
    if (aa && !ab && b.classes[name] && !a.classes[name]) {
      continue;
    }
    if (!aa || !ab) {
      differences.push(`${entry} type ${name}: ${aa ? 'removed' : 'added'}`);
      continue;
    }
    if (aa.properties && ab.properties) {
      compareMembers(`${entry} type ${name}`, aa.properties, ab.properties);
    } else if (aa.type !== ab.type) {
      differences.push(
        `${entry} type ${name}\n    before: ${aa.type}\n    after:  ${ab.type}`,
      );
    }
  }
}

console.log(`Named renames, ${renamed.length}:\n${renamed.join('\n')}\n`);
console.log(
  differences.length === 0
    ? 'No difference after the normalisation.'
    : `${differences.length} differences after the normalisation:\n\n${differences.join('\n')}`,
);
