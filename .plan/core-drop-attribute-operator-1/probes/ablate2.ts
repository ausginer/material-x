// Rewrites head's direct define/querySelector call sites back to helper calls and prints Brotli bytes per ablation.
import { readFile } from 'node:fs/promises';
import { brotliCompressSync, constants } from 'node:zlib';
const br = (s: string) =>
  brotliCompressSync(Buffer.from(s), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;
const head = await readFile(process.argv[2]!, 'utf8');
const define =
  head.replaceAll('customElements.define(', '__D(') +
  'function __D(e,t){customElements.define(e,t)}';
const qs =
  head.replace(
    /([\w$]+)\.shadowRoot\.querySelector(All)?\(/gu,
    (_m, h, all) => `__Q${all ?? ''}(${h},`,
  ) +
  'function __Q(e,t){return e.shadowRoot?.querySelector(t)}function __QAll(e,t){return e.shadowRoot?.querySelectorAll(t)}';
const both =
  define.replace(
    /([\w$]+)\.shadowRoot\.querySelector(All)?\(/gu,
    (_m, h, all) => `__Q${all ?? ''}(${h},`,
  ) +
  'function __Q(e,t){return e.shadowRoot?.querySelector(t)}function __QAll(e,t){return e.shadowRoot?.querySelectorAll(t)}';
console.log({ head: br(head), define: br(define), qs: br(qs), both: br(both) });
