import { not, type Predicate } from 'ydin/utils/runtime.js';
import type { ProcessedTokenValue } from '../../.tproc/processTokenSet.ts';
import type { ResolveAdjuster } from '../../.tproc/resolve.ts';

export type FullShapeFixCondition = (entry: string) => boolean;

export function createFullShapeFix(
  newValue: string,
  condition: FullShapeFixCondition = () => true,
): ResolveAdjuster {
  return (value, path): ProcessedTokenValue | null => {
    if (path.some(condition) && value === 'full') {
      return newValue;
    }

    return value;
  };
}

export function disabledTokenSelector(path: string): boolean {
  return path === 'disabled';
}

export const notDisabledTokenSelector: Predicate<[path: string]> = not(
  disabledTokenSelector,
);
