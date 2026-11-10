import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { catalog } from '@pastra/catalog';
import {
  assertCatalogCoverage,
  buildRegistry,
  buildWalletMessage,
  createEvmWalletAdapter,
  type EvmIndexer,
} from '@pastra/providers';

describe('adapter registry (docs/architecture.md section 7)', () => {
  it('has a stub adapter for every catalog provider returning exactly its metrics', async () => {
    const registry = buildRegistry();
    await expect(assertCatalogCoverage(registry)).resolves.toBeUndefined();
  });

  it('a stub adapter returns the catalog metric keys for its provider', async () => {
    const registry = buildRegistry();
    const result = await registry.get('steam').fetch({ externalId: 'x' });
    const steam = catalog.providerById.get('steam')!;
    expect(Object.keys(result.metrics).sort()).toEqual(steam.metrics.map((m) => m.key).sort());
    expect(result.extras?.topGame).toBe('CS2');
  });

  it('wallet stubs sign a message rather than redirect', async () => {
    const registry = buildRegistry();
    const begin = await registry
      .get('wallet_evm')
      .begin({ userId: 'u', redirectUri: '', state: 'n1' });
    expect('messageToSign' in begin).toBe(true);
  });
});

describe('EVM wallet adapter (SIWE verification)', () => {
  const account = privateKeyToAccount(`0x${'1'.repeat(64)}`);
  const indexer: EvmIndexer = {
    async getWalletData() {
      return {
        ageYears: 5,
        firstTxYear: 2019,
        txCount: 1200,
        activeMonthsLastYear: 9,
        networks: 4,
        nftCount: 61,
      };
    },
  };
  const adapter = createEvmWalletAdapter({ domain: 'pastra.test', indexer });

  it('verifies a real signature and returns the address as external id', async () => {
    const message = buildWalletMessage('pastra.test', 'nonce-123');
    const signature = await account.signMessage({ message });
    const result = await adapter.complete({
      redirectUri: '',
      state: 's',
      params: { address: account.address, signature, message },
    });
    expect(result.externalId).toBe(account.address.toLowerCase());
    expect(result.tokens).toBeUndefined();
  });

  it('rejects a signature from a different signer', async () => {
    const message = buildWalletMessage('pastra.test', 'nonce-123');
    const signature = await account.signMessage({ message });
    const other = privateKeyToAccount(`0x${'2'.repeat(64)}`);
    await expect(
      adapter.complete({
        redirectUri: '',
        state: 's',
        params: { address: other.address, signature, message },
      }),
    ).rejects.toThrow(/Signature does not match/);
  });

  it('reads only counts and dates, never balances', async () => {
    const result = await adapter.fetch({ externalId: account.address.toLowerCase() });
    expect(result.metrics['wallet_evm.tx_count']).toBe(1200);
    expect(result.metrics['wallet_evm.nfts']).toBe(61);
    expect(result.extras?.firstTxYear).toBe(2019);
  });
});
