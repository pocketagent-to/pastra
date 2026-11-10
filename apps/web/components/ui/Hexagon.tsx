import type { Axis } from '@pastra/catalog';
import { AXIS_SHORT } from '@/lib/axes';
import {
  HEX_AXIS_ORDER,
  HEX_RINGS,
  HEX_VIEWBOX,
  hexPolygon,
  ringPolygon,
  ringVertex,
} from '@/lib/hexagon';

export interface HexagonProps {
  /** Axis scores keyed by axis; missing or hidden axes render at zero. */
  values: Partial<Record<Axis, number>>;
  /** Optional second set drawn dashed (for Compare). */
  compare?: Partial<Record<Axis, number>>;
  /** Axes hidden from the viewer (drawn at zero, greyed label). */
  hidden?: Axis[];
  size?: number;
  showLabels?: boolean;
}

function toArray(values: Partial<Record<Axis, number>>, hidden: Set<Axis>): number[] {
  return HEX_AXIS_ORDER.map((axis) => (hidden.has(axis) ? 0 : (values[axis] ?? 0)));
}

/**
 * The six-axis hexagon (docs/architecture.md section 13). Accessible as an image with a text
 * summary of all six values; a hidden axis is drawn at zero with a grey label.
 */
export function Hexagon({
  values,
  compare,
  hidden = [],
  size = 260,
  showLabels = true,
}: HexagonProps) {
  const hiddenSet = new Set(hidden);
  const primary = toArray(values, hiddenSet);
  const summary = HEX_AXIS_ORDER.map(
    (axis) => `${AXIS_SHORT[axis]} ${hiddenSet.has(axis) ? '—' : (values[axis] ?? 0)}`,
  ).join(', ');

  return (
    <svg
      viewBox={HEX_VIEWBOX}
      width={size}
      height={(size * 300) / 360}
      role="img"
      aria-label={`Hexagon pass: ${summary}`}
    >
      <defs>
        <linearGradient id="hexfill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF6B2C" />
          <stop offset="50%" stopColor="#C04DFF" />
          <stop offset="100%" stopColor="#3D6BFF" />
        </linearGradient>
      </defs>

      {/* Grid rings */}
      {HEX_RINGS.map((r) => (
        <polygon key={r} points={ringPolygon(r)} fill="none" stroke="#3A3D47" strokeWidth={1} />
      ))}
      {/* Spokes */}
      {HEX_AXIS_ORDER.map((axis, i) => {
        const outer = ringVertex(i, 105);
        return (
          <line
            key={axis}
            x1={0}
            y1={0}
            x2={outer.x}
            y2={outer.y}
            stroke="#3A3D47"
            strokeWidth={1}
          />
        );
      })}

      {/* Value polygon */}
      <polygon
        points={hexPolygon(primary)}
        fill="url(#hexfill)"
        fillOpacity={0.6}
        stroke="#C04DFF"
        strokeWidth={2}
      />

      {/* Compare polygon (dashed) */}
      {compare && (
        <polygon
          points={hexPolygon(toArray(compare, new Set()))}
          fill="none"
          stroke="#7C9BFF"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
      )}

      {/* Labels */}
      {showLabels &&
        HEX_AXIS_ORDER.map((axis, i) => {
          const p = ringVertex(i, 128);
          return (
            <text
              key={axis}
              x={p.x}
              y={p.y}
              fill={hiddenSet.has(axis) ? '#6b7280' : '#C7CBD6'}
              fontSize={13}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {AXIS_SHORT[axis]}
            </text>
          );
        })}
    </svg>
  );
}
