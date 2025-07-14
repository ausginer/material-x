import download from '../download.ts';
import type { TokenTable } from '../TokenTable.ts';

const TEXT_FIELD_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.60990dd98dea0998.json',
);

export async function downloadTextFieldTokens(): Promise<TokenTable> {
  return await download(TEXT_FIELD_TOKENS_URL);
}
