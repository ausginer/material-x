import download from '../download.js';
import type TokenSystemProcessor from '../TokenSystemProcessor.js';
import type { TokenTable } from '../TokenTable.js';
import type { SassDeclarationSet } from '../utils.js';

const TEXT_FIELD_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.60990dd98dea0998.json',
);

export async function downloadTextFieldTokens(): Promise<TokenTable> {
  return await download(TEXT_FIELD_TOKENS_URL);
}

export function processTextFields(
  processor: TokenSystemProcessor,
): readonly SassDeclarationSet[] {
  return processor.tokenSets
    .filter(({ displayName }) => !displayName.startsWith('[Deprecated]'))
    .map((tokenSet) => processor.processTokenSet(tokenSet))
    .toArray();
}
