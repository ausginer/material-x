import download from '../download.js';
import type TokenSystemProcessor from '../TokenSystemProcessor.js';
import type { TokenTable } from '../TokenTable.js';
import {
  type SassDeclarationSet,
  tokenValueToCSSVarWithFallback,
} from '../utils.js';

const ELEVATION_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/ELEVATION.20543ce18892f7d9.json',
);

export async function downloadElevationTokens(): Promise<TokenTable> {
  return await download(ELEVATION_TOKENS_URL);
}

export function processElevation(
  processor: TokenSystemProcessor,
): readonly SassDeclarationSet[] {
  return processor.tokenSets
    .filter(({ displayName }) => !displayName.startsWith('[Deprecated]'))
    .map((tokenSet) =>
      processor.processTokenSet(tokenSet, tokenValueToCSSVarWithFallback),
    )
    .toArray();
}
