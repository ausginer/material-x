import TokenSystemProcessor from '../TokenSystemProcessor.js';
import { tokenValueToCSSVarWithFallback } from '../utils.js';

const COLOR_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/COLOR.20543ce18892f7d9.json',
);

const COLOR_SPEC_URL = new URL(
  'https://m3.material.io/styles/color/static/baseline',
);

export default async function getColors(): Promise<void> {
  const processor = await TokenSystemProcessor.init(
    COLOR_TOKENS_URL,
    COLOR_SPEC_URL,
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
