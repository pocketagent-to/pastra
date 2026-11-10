export { AdapterError, isAdapterError, type AdapterErrorCode } from './errors';
export type {
  AuthKind,
  Tokens,
  BeginContext,
  CompleteContext,
  FetchContext,
  BeginResult,
  CompleteResult,
  FetchResult,
  ProviderAdapter,
} from './types';
export { makeStubAdapter, authKindFor } from './stub';
export { AdapterRegistry, buildRegistry, assertCatalogCoverage } from './registry';
export {
  createEvmWalletAdapter,
  buildWalletMessage,
  type EvmIndexer,
  type EvmWalletData,
} from './adapters/walletEvm';
