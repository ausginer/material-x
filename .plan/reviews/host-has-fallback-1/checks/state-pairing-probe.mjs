// RF-59 feature proof: lists each :host(:state(has-<x>)) in a built material-x sheet whose selector list carries no
// :host:has(.<x>.has-slotted) or :host:has(.<x>:has-slotted). Usage: node state-pairing-probe.mjs <built .css.js>...
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const src = readFileSync(f, 'utf8');
  // extract selector lists preceding '{'
  const sels = src
    .split('{')
    .map((s) => s.split(/[};]/).pop().trim())
    .filter((s) => s.includes(':state(has-'));
  let bad = 0,
    n = 0;
  for (const s of sels) {
    for (const st of [...s.matchAll(/:host\(:state\(has-([\w-]+)\)\)/g)]) {
      n++;
      const cls = st[1];
      if (!new RegExp(`:host:has\\([^)]*\\.${cls}[.:]has-slotted`).test(s)) {
        bad++;
        console.log('UNPAIRED', f, cls, '::', s.slice(0, 200));
      }
    }
  }
  console.log(f, 'state selectors', n, 'unpaired', bad);
}
