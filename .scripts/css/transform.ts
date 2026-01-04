import type { SourceMap } from 'node:module';
import { transform as t } from 'lightningcss';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export default function transform(
  input: string,
  fileName = 'unknown.css',
  sourceMap = false,
): Readonly<{ code: string; map?: SourceMap }> {
  const { code: encoded, map } = t({
    filename: fileName,
    code: encoder.encode(input),
    minify: true,
    sourceMap: sourceMap,
  });

  const _map: SourceMap | undefined = map
    ? JSON.parse(decoder.decode(map))
    : undefined;

  return { code: decoder.decode(encoded), map: _map };
}
