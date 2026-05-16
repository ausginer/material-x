import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { TupleToUnion } from 'type-fest';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { ProcessorAdjuster } from '../../../.tproc/utils.ts';
import {
  defaultFilledTokens,
  defaultSwitchFilledTokens,
  defaultSwitchTokens,
  defaultTokens,
} from '../default/tokens.ts';
import {
  buttonAllowedTokensSelector,
  mainTokenSelector,
  switchTokenSelector,
  createButtonExtensions,
  createScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
  notDisabledTokenSelector,
  omitSelectedShape,
} from '../utils.ts';

const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;
type Sizes = TupleToUnion<typeof SIZES>;

function isDefaultSize(size: Sizes): boolean {
  return size === 'small';
}

const createPackage = (
  size: Sizes,
  adjuster: ProcessorAdjuster = (processor) => processor,
) =>
  adjuster(
    t
      .set(`md.comp.button.${size}`)
      .group(groupButtonTokens)
      .select(buttonAllowedTokensSelector)
      .adjustTokens(fixFullShape)
      .renderDeclarations(
        createScopedDeclarationRenderer(
          isDefaultSize(size)
            ? undefined
            : {
                name: 'size',
                value: size,
              },
        ),
      ),
  ).build();

const defaultRenderer = createScopedDeclarationRenderer();

export const defaultSizeMainTokens: ReadonlySignal<TokenPackage> = computed(
  () =>
    createPackage('small', (processor) =>
      processor
        .select(mainTokenSelector)
        .extend(
          createButtonExtensions(
            defaultTokens.value,
            defaultFilledTokens.value,
          ),
        )
        .renderDeclarations(defaultRenderer),
    ),
);

export const defaultSizeSwitchTokens: ReadonlySignal<TokenPackage> = computed(
  () =>
    createPackage('small', (processor) =>
      processor
        .select(
          switchTokenSelector,
          notDisabledTokenSelector,
          omitSelectedShape,
        )
        .extend(
          createButtonExtensions(
            defaultTokens.value,
            defaultFilledTokens.value,
            defaultSwitchTokens.value,
            defaultSwitchFilledTokens.value,
          ),
        )
        .renderDeclarations(defaultRenderer),
    ),
);

function createNonDefaultRenderer(size: Sizes) {
  return createScopedDeclarationRenderer({
    name: 'size',
    value: size,
  });
}

export const mainTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.filter((s) => s !== 'small').map((size) =>
    computed(() =>
      createPackage(size, (processor) =>
        processor
          .select(mainTokenSelector)
          .extend(
            createButtonExtensions(
              defaultTokens.value,
              defaultFilledTokens.value,
            ),
          )
          .renderDeclarations(createNonDefaultRenderer(size)),
      ),
    ),
  );

export const switchTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.filter((s) => s !== 'small').map((size) =>
    computed(() =>
      createPackage(size, (processor) =>
        processor
          .select(
            switchTokenSelector,
            notDisabledTokenSelector,
            omitSelectedShape,
          )
          .extend(
            createButtonExtensions(
              defaultTokens.value,
              defaultFilledTokens.value,
              defaultSwitchTokens.value,
              defaultSwitchFilledTokens.value,
            ),
          )
          .renderDeclarations(createNonDefaultRenderer(size)),
      ),
    ),
  );
