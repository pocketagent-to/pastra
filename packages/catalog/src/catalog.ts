import { AXES } from './types';
import type {
  Axis,
  Catalog,
  MetricKey,
  MetricSpec,
  ProviderId,
  ProviderSpec,
  StampSpec,
} from './types';
import { PROVIDERS } from './providers';
import { ACHIEVEMENT_STAMPS } from './stamps';
import { TITLE_TIE_ORDER, TITLE_WORDS } from './titles';

/** Fixed +5 to Crypto when the wallet owner holds an ENS name (docs/product-spec.md section 6.3). */
const ENS_AXIS_BONUS = 5;

/** A service stamp per connectable provider, awarded on connect and revoked on disconnect. */
function serviceStamps(providers: ProviderSpec[]): StampSpec[] {
  return providers.map((p) => ({
    key: `service_${p.id}`,
    axis: p.axis,
    kind: 'service' as const,
    label: p.name,
    provider: p.id,
  }));
}

/**
 * Assemble and validate the catalog. Throws if the data is internally inconsistent — a metric key
 * is duplicated, a `deltaOf` points nowhere, or a provider with no metrics has no axis bonus.
 */
export function buildCatalog(providers: ProviderSpec[] = PROVIDERS): Catalog {
  const providerById = new Map<ProviderId, ProviderSpec>();
  const metricById = new Map<MetricKey, MetricSpec & { provider: ProviderId; axis: Axis }>();
  const providersByAxis = new Map<Axis, ProviderSpec[]>();
  for (const axis of AXES) providersByAxis.set(axis, []);

  for (const provider of providers) {
    if (providerById.has(provider.id)) {
      throw new Error(`Duplicate provider id: ${provider.id}`);
    }
    providerById.set(provider.id, provider);
    providersByAxis.get(provider.axis)!.push(provider);

    if (provider.metrics.length === 0 && provider.axisBonus === undefined) {
      throw new Error(`Provider ${provider.id} has no metrics and no axis bonus`);
    }

    for (const metric of provider.metrics) {
      if (metricById.has(metric.key)) {
        throw new Error(`Duplicate metric key: ${metric.key}`);
      }
      const prefix = `${provider.id}.`;
      if (!metric.key.startsWith(prefix)) {
        throw new Error(`Metric ${metric.key} must be namespaced under ${prefix}`);
      }
      if (metric.scale === 'log' && (metric.t0 <= 0 || metric.t100 <= 0)) {
        throw new Error(`Log metric ${metric.key} needs positive thresholds`);
      }
      if (metric.t0 === metric.t100) {
        throw new Error(`Metric ${metric.key} has equal thresholds`);
      }
      metricById.set(metric.key, { ...metric, provider: provider.id, axis: provider.axis });
    }
  }

  // Second pass: deltaOf targets must resolve to a known metric of the same provider.
  for (const metric of metricById.values()) {
    if (metric.deltaOf && !metricById.has(metric.deltaOf)) {
      // The cumulative base metric need not be scored itself, but it must be namespaced correctly.
      if (!metric.deltaOf.startsWith(`${metric.provider}.`)) {
        throw new Error(
          `Metric ${metric.key} deltaOf ${metric.deltaOf} is not under ${metric.provider}`,
        );
      }
    }
  }

  const stamps: StampSpec[] = [...ACHIEVEMENT_STAMPS, ...serviceStamps(providers)];
  const stampKeys = new Set<string>();
  for (const stamp of stamps) {
    if (stampKeys.has(stamp.key)) throw new Error(`Duplicate stamp key: ${stamp.key}`);
    stampKeys.add(stamp.key);
  }

  return {
    axes: AXES,
    providers,
    providerById,
    metricById,
    providersByAxis,
    stamps,
    titleWords: TITLE_WORDS,
    titleTieOrder: TITLE_TIE_ORDER,
    ensAxisBonus: ENS_AXIS_BONUS,
  };
}

/** The default catalog built from the shipped provider list. */
export const catalog: Catalog = buildCatalog();
