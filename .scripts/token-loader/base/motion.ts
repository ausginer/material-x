import download from '../download.js';
import type TokenSystemProcessor from '../TokenSystemProcessor.js';
import type { TokenTable } from '../TokenTable.js';
import {
  type SassDeclarationSet,
  tokenValueToCSSVarWithFallback,
} from '../utils.js';

const MOTION_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TYPE_UNSPECIFIED.20543ce18892f7d9.json',
);

export async function downloadMotionTokens(): Promise<TokenTable> {
  return await download(MOTION_TOKENS_URL);
}

export function processMotion(
  processor: TokenSystemProcessor,
): readonly SassDeclarationSet[] {
  return processor.tokenSets
    .filter(({ displayName }) => !displayName.startsWith('[Deprecated]'))
    .map((tokenSet) =>
      processor.processTokenSet(tokenSet, tokenValueToCSSVarWithFallback),
    )
    .toArray();
}
