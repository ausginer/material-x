import download from '../download.ts';
import type { TokenTable } from '../TokenTable.ts';

const COLOR_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/COLOR.20543ce18892f7d9.json',
);

export async function downloadColorTokens(): Promise<TokenTable> {
  return await download(COLOR_TOKENS_URL);
}
