// Rewrites head's lowered accessor pairs back to the operator call shape and prints Brotli bytes.
import { readFile } from 'node:fs/promises';
import { brotliCompressSync, constants } from 'node:zlib';
const br = (s: string) =>
  brotliCompressSync(Buffer.from(s), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;
const head = await readFile(process.argv[2]!, 'utf8');
let n = 0;
const ablated = head.replace(
  /get (\w+)\(\)\{return ([\w$.]+)\.from\(this\.getAttribute\((`[^`]+`)\)\)\}set \1\((\w)\)\{([\w$]+)\(this,\3,\2\.to\(\4\)\)\}/gu,
  (_m, name, conv, attr, v, fn) => {
    n++;
    return `get ${name}(){return ${fn}.get(this,${attr},${conv})}set ${name}(${v}){${fn}.set(this,${attr},${v},${conv})}`;
  },
);
console.log(
  'pairs',
  n,
  'head br',
  br(head),
  'ablated br',
  br(ablated),
  'min',
  head.length,
  ablated.length,
);
