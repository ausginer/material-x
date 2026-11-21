// Scratch probe: drag's own instrument (bench/size/measure.ts bundleSize and
// publishedEntries) on compositions the sortable list would use.
import { join } from 'node:path';
const ROOT = process.argv[2]!;
const { bundleSize } = await import(join(ROOT, 'bench/size/measure.ts'));
const { publishedEntries } = await import(
  join(ROOT, 'tests/support/published-entries.ts')
);
const rows: Record<string, Record<string, string[]>> = {
  'sortable + y (control, = drag row)': {
    'src/sortable': ['sortable'],
    'src/sortable/y': ['y'],
  },
  'sortable + y + landing (the list)': {
    'src/sortable': ['sortable'],
    'src/sortable/y': ['y'],
    'src/sortable/landing': ['landing'],
  },
};
for (const [name, imports] of Object.entries(rows)) {
  const src =
    Object.entries(imports)
      .map(
        ([p, e]) =>
          `import { ${e.join(', ')} } from ${JSON.stringify(join(ROOT, `${p}.ts`))};`,
      )
      .join('\n') +
    `\nglobalThis.keep = [${Object.values(imports).flat().join(', ')}];\n`;
  const r = await bundleSize(src, ROOT, [publishedEntries(ROOT)]);
  console.log(
    `${name.padEnd(36)} ${String(r.minified).padStart(6)} min ${String(r.gzip).padStart(6)} gz ${String(r.brotli).padStart(6)} br  ${r.modules.length} modules`,
  );
  console.log('  modules: ' + r.modules.join(', '));
}
