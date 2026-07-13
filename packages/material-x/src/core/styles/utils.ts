import type { ProcessedTokenValue } from '@ydinjs/tproc/processTokenSet.js';
import type { ResolveAdjuster } from '@ydinjs/tproc/resolve.js';

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

export function notDisabledTokenSelector(path: string): boolean {
  return !disabledTokenSelector(path);
}
