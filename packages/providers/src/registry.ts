import type { Catalog, ProviderId } from '@pastra/catalog';
import { catalog as defaultCatalog } from '@pastra/catalog';
import type { ProviderAdapter } from './types';
import { makeStubAdapter } from './stub';

export class AdapterRegistry {
  readonly #adapters = new Map<ProviderId, ProviderAdapter>();

  constructor(adapters: ProviderAdapter[]) {
    for (const a of adapters) this.#adapters.set(a.id, a);
  }

  get(id: ProviderId): ProviderAdapter {
    const a = this.#adapters.get(id);
    if (!a) throw new Error(`No adapter registered for provider: ${id}`);
    return a;
  }

  has(id: ProviderId): boolean {
    return this.#adapters.has(id);
  }

  all(): ProviderAdapter[] {
    return [...this.#adapters.values()];
  }
}

/**
 * Build a registry with a stub adapter for every catalog provider, overridden by any real adapters
 * supplied. The local environment runs entirely on stubs (docs/architecture.md section 15).
 */
export function buildRegistry(
  real: Partial<Record<ProviderId, ProviderAdapter>> = {},
  catalog: Catalog = defaultCatalog,
): AdapterRegistry {
  const adapters = catalog.providers.map((spec) => real[spec.id] ?? makeStubAdapter(spec));
  return new AdapterRegistry(adapters);
}

/**
 * Assert that every provider has an adapter whose fetched metric keys are exactly the catalog's
 * metric keys for that provider (docs/architecture.md section 7). Throws on the first mismatch.
 */
export async function assertCatalogCoverage(
  registry: AdapterRegistry,
  catalog: Catalog = defaultCatalog,
): Promise<void> {
  for (const spec of catalog.providers) {
    const adapter = registry.get(spec.id);
    const result = await adapter.fetch({ externalId: 'coverage-check' });
    const got = new Set(Object.keys(result.metrics));
    const want = new Set(spec.metrics.map((m) => m.key));
    for (const key of want) {
      if (!got.has(key)) throw new Error(`${spec.id}: adapter is missing metric ${key}`);
    }
    for (const key of got) {
      if (!want.has(key)) throw new Error(`${spec.id}: adapter returned unknown metric ${key}`);
    }
  }
}
