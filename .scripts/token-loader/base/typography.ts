import TokenSystemProcessor from '../TokenSystemProcessor.js';
import { tokenValueToCSSVarWithFallback } from '../utils.js';

const TYPOGRAPHY_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TYPOGRAPHY.20543ce18892f7d9.json',
);

const TYPOGRAPHY_SPEC_URL = new URL(
  'https://m3.material.io/styles/typography/type-scale-tokens',
);

export default async function getTypography(): Promise<void> {
  const processor = await TokenSystemProcessor.init(
    TYPOGRAPHY_TOKENS_URL,
    TYPOGRAPHY_SPEC_URL,
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
