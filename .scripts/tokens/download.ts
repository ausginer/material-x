import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { type JSONModule, root } from '../utils.ts';
import type { TokenTable } from './TokenTable.ts';

const CACHE_DIR = new URL('node_modules/.cache/tokens/', root);

export default async function download(url: URL): Promise<TokenTable> {
  const cacheFile = new URL(
    url.pathname.substring(url.pathname.lastIndexOf('/') + 1),
    CACHE_DIR,
  );

  try {
    const contents: JSONModule<TokenTable> = await import(
      fileURLToPath(cacheFile),
      { with: { type: 'json' } }
    );
    return contents.default;
  } catch {
    console.log(`Caching tokens from ${url}`);

    const response = await fetch(url);
    const data = await response.text();

    await mkdir(new URL('./', cacheFile), { recursive: true });
    await writeFile(cacheFile, data, 'utf8');

    return JSON.parse(data);
  }
}
