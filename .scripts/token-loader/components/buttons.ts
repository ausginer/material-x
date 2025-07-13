import download from '../download.js';
import type { TokenTable } from '../TokenTable.js';

const BUTTON_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.1c4257f8804f9478.json',
);

export async function downloadButtonTokens(): Promise<TokenTable> {
  return await download(BUTTON_TOKENS_URL);
}
