import TokenSystemProcessor from '../TokenSystemProcessor.js';
import { tokenValueToCSSVarWithFallback } from '../utils.js';

const MOTION_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TYPE_UNSPECIFIED.20543ce18892f7d9.json',
);

const MOTION_SPEC_URL = new URL(
  'https://m3.material.io/styles/motion/overview/specs',
);

export default async function getMotion(): Promise<void> {
  const processor = await TokenSystemProcessor.init(
    MOTION_TOKENS_URL,
    MOTION_SPEC_URL,
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
