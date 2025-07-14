import download from '../download.ts';
import type { TokenTable } from '../TokenTable.ts';

const TYPOGRAPHY_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TYPOGRAPHY.20543ce18892f7d9.json',
);

export async function downloadTypographyTokens(): Promise<TokenTable> {
  return await download(TYPOGRAPHY_TOKENS_URL);
}
