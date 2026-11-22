import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = '/workspaces/material-x/packages/material-x/src';
const out = process.argv[2]!;
function walk(d: string): string[] {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : n === 'tokens.ts' ? [p] : [];
  });
}
let text = '';
for (const file of walk(root).sort()) {
  const mod: Record<string, unknown> = await import(file);
  for (const [name, v] of Object.entries(mod)) {
    const list = Array.isArray(v)
      ? v.map((x, i) => [`${name}[${i}]`, x] as const)
      : [[name, v] as const];
    for (const [label, sig] of list) {
      const pkg = (sig as { value?: { render?: () => string } })?.value;
      if (pkg && typeof pkg.render === 'function') {
        text += `\n#### ${file.slice(root.length + 1)} :: ${label}\n${pkg.render()}\n`;
      }
    }
  }
}
writeFileSync(out, text);
console.log('ok', text.length);
