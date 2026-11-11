import type { Rarity } from '@pastra/scoring';
import { cn } from '@/lib/cn';

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

/**
 * The card face: a gradient surface with the name, level, rarity and last four digits plus the
 * Visa mark. Rarity is cosmetic only, derived from the pass level (docs/product-spec.md section 9).
 */
export function CardFace({
  name,
  level,
  rarity,
  last4,
  frozen = false,
}: {
  name: string;
  level: number;
  rarity: Rarity;
  last4?: string;
  frozen?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative aspect-[1.586] w-full overflow-hidden rounded-card p-5 text-white shadow-xl',
        frozen && 'grayscale',
      )}
      style={{ background: frozen ? '#2a2c34' : 'var(--grad-card)' }}
    >
      <div className="flex items-start justify-between">
        <img src="/brand/pastra-mark-on-card.svg" alt="Hextra" width={36} height={36} />
        <span className="text-xs font-semibold uppercase tracking-widest opacity-90">
          {RARITY_LABEL[rarity]}
        </span>
      </div>

      <div className="absolute bottom-5 left-5 right-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-head text-sm font-bold tracking-wide">{name}</div>
            <div className="text-xs opacity-80">
              LVL {level}
              {last4 ? ` · •••• ${last4}` : ''}
            </div>
          </div>
          <img src="/brand/visa-white.png" alt="Visa" height={20} className="h-5 w-auto" />
        </div>
      </div>

      {frozen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 font-head text-sm font-bold uppercase tracking-widest">
          Frozen
        </div>
      )}
    </div>
  );
}
