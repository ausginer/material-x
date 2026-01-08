import {
  attribute,
  pseudoClass,
  pseudoElement,
} from '../../.tproc/selector.ts';
import type { BlockAdjuster, RenderBlock } from '../../.tproc/TokenPackage.ts';
import type { DeclarationBlockRenderer } from '../../.tproc/TokenPackage.ts';
import { composeDeclarationRenderer } from '../../.tproc/TokenPackage.ts';
import type { GroupResult } from '../../.tproc/utils.ts';

const STATE_NAMES = ['pressed', 'selected'] as const;

export const BUTTON_GROUP_SIZES = [
  'xsmall',
  'small',
  'medium',
  'large',
  'xlarge',
] as const;

export const BUTTON_GROUP_ALLOWED_TOKENS: readonly string[] = [
  'between-space',
  'inner-corner.corner-size',
];

export const STANDARD_ALLOWED_TOKENS: readonly string[] = [
  ...BUTTON_GROUP_ALLOWED_TOKENS,
  'interaction.easing',
  'interaction.duration',
  'interaction.width.multiplier',
];

export const CONNECTED_ALLOWED_TOKENS: readonly string[] =
  BUTTON_GROUP_ALLOWED_TOKENS;

export const CONNECTED_ALLOWED_TOKENS_WITH_SHAPE: readonly string[] = [
  ...BUTTON_GROUP_ALLOWED_TOKENS,
  'container.shape',
];

export function groupButtonGroupTokens(tokenName: string): GroupResult {
  const parts = tokenName.split('.');
  let state = 'default';
  const nameParts: string[] = [];

  for (const part of parts) {
    if (STATE_NAMES.includes(part)) {
      state = part;
      continue;
    }

    nameParts.push(part);
  }

  return {
    path: state,
    name: nameParts.join('.'),
  };
}

function stripHostStateSelector(selector: string): string {
  if (!selector.startsWith(':host(') || !selector.endsWith(')')) {
    return selector;
  }

  const inner = selector.slice(6, -1);
  const cleaned = inner
    .replaceAll(':active', '')
    .replace(/:state\([^)]+\)/g, '');

  if (cleaned.length === 0) {
    return ':host';
  }

  return `:host(${cleaned})`;
}

export function createSlottedStateAdjuster(): BlockAdjuster {
  const pressedSelector = pseudoElement('slotted', pseudoClass('active'));
  const selectedSelector = pseudoElement('slotted', attribute('checked'));
  const slottedMap: Readonly<Record<string, string>> = {
    pressed: pressedSelector,
    selected: selectedSelector,
  };

  return (block) => {
    const slotted = slottedMap[block.path];

    if (!slotted) {
      return block;
    }

    const host = stripHostStateSelector(block.selectors);
    const selector = `${host} ${slotted}`;

    return { ...block, selectors: selector };
  };
}

export function dropNonDefaultBlocks(block: RenderBlock): RenderBlock | null {
  return block.path === 'default' ? block : null;
}

export function createHostAttributeAdjuster(
  attrName: string,
  value: string,
): BlockAdjuster {
  const attrSelector = attribute(attrName, value);

  return (block) => {
    const selector = addHostParams(block.selectors, attrSelector);

    if (selector === block.selectors) {
      return block;
    }

    return { ...block, selectors: selector };
  };
}

function addHostParams(selector: string, params: string): string {
  return selector
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();

      if (trimmed.includes(':host(')) {
        return trimmed.replace(':host(', `:host(${params}`);
      }

      if (trimmed.includes(':host')) {
        return trimmed.replace(':host', `:host(${params})`);
      }

      return trimmed;
    })
    .join(', ');
}

export function createButtonGroupDeclarationRenderer(
  ...adjusters: readonly BlockAdjuster[]
): DeclarationBlockRenderer {
  return composeDeclarationRenderer(...adjusters);
}
