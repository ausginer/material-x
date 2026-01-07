import type { ProcessedTokenSet } from './processTokenSet.ts';
import { TokenPackageProcessor } from './TokenPackageProcessor.ts';

export type TokenManager = Readonly<{
  set(setOrSetName: string | ProcessedTokenSet): TokenPackageProcessor;
}>;

export const t: TokenManager = {
  set: (setOrSetName) => new TokenPackageProcessor(setOrSetName),
};

export { TokenPackage } from './TokenPackage.ts';
export { TokenPackageProcessor as TokenProcessor } from './TokenPackageProcessor.ts';
export type {
  AppendInput,
  Extendable,
  ExtensionManager,
  Grouper,
  GroupResult,
  TokenSet,
} from './utils.ts';
