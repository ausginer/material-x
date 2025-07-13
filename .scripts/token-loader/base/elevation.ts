import TokenSystemProcessor from '../TokenSystemProcessor.js';
import { tokenValueToCSSVarWithFallback } from '../utils.js';

const ELEVATION_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/ELEVATION.20543ce18892f7d9.json',
);

const ELEVATION_SPEC_URL = new URL('https://m3.material.io/styles/elevation');

export default async function getElevation(): Promise<void> {
  const processor = await TokenSystemProcessor.init(
    ELEVATION_TOKENS_URL,
    ELEVATION_SPEC_URL,
  );

  await Promise.all(
    processor.system.tokenSets
      .filter(({ displayName }) => !displayName.startsWith('[Deprecated]'))
      .map(
        async (tokenSet) =>
          await processor.writeTokenSet(
            tokenSet,
            processor.processTokenSet(tokenSet, tokenValueToCSSVarWithFallback),
          ),
      ),
  );
}
