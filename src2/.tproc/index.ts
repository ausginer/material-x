import { TokenPackageProcessor } from './TokenPackageProcessor.ts';

export type TokenManager = Readonly<{
  set(name: string): TokenPackageProcessor;
}>;

export const t: TokenManager = {
  set: (name) => new TokenPackageProcessor(name),
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
  VariantScope,
} from './utils.ts';
