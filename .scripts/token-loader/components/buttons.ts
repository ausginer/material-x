import TokenSystemProcessor from '../TokenSystemProcessor.js';

const BUTTON_TOKENS_URL = new URL(
  'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.1c4257f8804f9478.json',
);

const BUTTON_SPEC_URL = new URL(
  'https://m3.material.io/components/buttons/specs',
);

export default async function getButtons(): Promise<void> {
  const processor = await TokenSystemProcessor.init(
    BUTTON_TOKENS_URL,
    BUTTON_SPEC_URL,
  );

  await Promise.all(
    processor.system.tokenSets
      .filter(({ displayName }) => !displayName.startsWith('[Deprecated]'))
      .map(
        async (tokenSet) =>
          await processor.writeTokenSet(
            tokenSet,
            processor.processTokenSet(tokenSet),
          ),
      ),
  );
}
