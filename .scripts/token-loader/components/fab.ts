import download from '../download.ts';
import type { TokenTable } from '../TokenTable.ts';

const FAB_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.41587918e51cca98.json',
);

export async function downloadFABTokens(): Promise<TokenTable> {
  return await download(FAB_TOKENS_URL);
}
