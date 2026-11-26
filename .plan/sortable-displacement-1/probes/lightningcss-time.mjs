// How lightningcss, which every material-x sheet passes through
// (packages/vite-custom-element-assets/src/css/transform.ts), prints a <time> in
// a custom property. Run from the repository root:
//   node .plan/sortable-displacement-1/probes/lightningcss-time.mjs
import { createRequire } from 'node:module';

const require = createRequire(
  new URL(
    '../../../packages/vite-custom-element-assets/package.json',
    import.meta.url,
  ),
);
const { transform } = require('lightningcss');
const code =
  ':host{--a:500ms;--b:150ms;--c:100ms;--d:99ms;--e:50ms;--f:0ms;--g:2s}';

console.log(`input: ${code}`);
for (const minify of [false, true]) {
  const out = transform({ filename: 'a.css', code: Buffer.from(code), minify });
  console.log(
    `minify=${minify}: ${out.code.toString().replace(/\s+/g, ' ').trim()}`,
  );
}
