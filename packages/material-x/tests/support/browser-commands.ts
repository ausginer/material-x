import type {
  TokenContractRequest,
  TokenContractResponse,
} from './visual-contracts.node.ts';

declare module 'vitest/browser' {
  interface BrowserCommands {
    resolveTokenContract(
      request: TokenContractRequest,
    ): Promise<TokenContractResponse>;
  }
}
