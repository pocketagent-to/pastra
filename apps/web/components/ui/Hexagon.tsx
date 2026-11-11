import type { Axis } from '@pastra/catalog';
import { AXIS_SHORT } from '@/lib/axes';
import {
  HEX_AXIS_ORDER,
  HEX_RINGS,
  HEX_VIEWBOX,
  hexPolygon,
  hexVertex,
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
  /** Draw the numeric value beside each vertex (design/Main.html). Off automatically in compare. */
  showValues?: boolean;
  /** Make each axis label/value a link to its detail screen (/pass/{axis}). */
  linkAxes?: boolean;
}

/** Hand-placed label / value anchors, matching design/Main.html (order = HEX_AXIS_ORDER). */
const LABEL_POS = [
  { x: 0, y: -132, anchor: 'middle' as const },
  { x: 100, y: -64, anchor: 'start' as const },
  { x: 100, y: 52, anchor: 'start' as const },
  { x: 0, y: 124, anchor: 'middle' as const },
  { x: -100, y: 52, anchor: 'end' as const },
  { x: -100, y: -64, anchor: 'end' as const },
];
const VALUE_POS = [
  { x: 0, y: -114, anchor: 'middle' as const },
  { x: 100, y: -46, anchor: 'start' as const },
  { x: 100, y: 70, anchor: 'start' as const },
  { x: 0, y: 142, anchor: 'middle' as const },
  { x: -100, y: 70, anchor: 'end' as const },
  { x: -100, y: -46, anchor: 'end' as const },
];

function toArray(values: Partial<Record<Axis, number>>, hidden: Set<Axis>): number[] {
  return HEX_AXIS_ORDER.map((axis) => (hidden.has(axis) ? 0 : (values[axis] ?? 0)));
}

/**
 * The six-axis hexagon (docs/architecture.md section 13, design/Main.html). Accessible as an image
 * with a text summary; a hidden axis is drawn at zero with a grey label.
 */
export function Hexagon({
  values,
  compare,
  hidden = [],
  size = 260,
  showLabels = true,
  showValues = true,
  linkAxes = false,
}: HexagonProps) {
  const hiddenSet = new Set(hidden);
  const primary = toArray(values, hiddenSet);
  const isCompare = Boolean(compare);
  const isEmpty = !isCompare && primary.every((v) => v <= 0);
  const withValues = showValues && !isCompare && !isEmpty;
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
      className="font-head"
    >
      <defs>
        <linearGradient id="hexfill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF6B2C" />
          <stop offset="50%" stopColor="#C04DFF" />
          <stop offset="100%" stopColor="#3D6BFF" />
        </linearGradient>
      </defs>

      {/* Grid rings: outer solid (or dashed when empty), inner grey */}
      {HEX_RINGS.map((r) => {
        const outer = r === 105;
        if (outer && isEmpty) {
          return (
            <polygon
              key={r}
              points={ringPolygon(r)}
              fill="none"
              stroke="#6B7080"
              strokeWidth={2}
              strokeDasharray="7 6"
            />
          );
        }
        return (
          <polygon
            key={r}
            points={ringPolygon(r)}
            fill="none"
            stroke={outer ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.15)'}
            strokeWidth={outer ? 1.25 : 1}
          />
        );
      })}

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
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        );
      })}

      {/* Value polygon */}
      {!isEmpty &&
        (isCompare ? (
          <polygon
            points={hexPolygon(primary)}
            fill="none"
            stroke="#7C9BFF"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ) : (
          <polygon
            points={hexPolygon(primary)}
            fill="url(#hexfill)"
            fillOpacity={0.72}
            stroke="#FFFFFF"
            strokeWidth={2.25}
            strokeLinejoin="round"
          />
        ))}

      {/* Compare polygon (dashed orange) */}
      {isCompare && (
        <polygon
          points={hexPolygon(toArray(compare ?? {}, new Set()))}
          fill="none"
          stroke="#FF6B2C"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
      )}

      {/* Vertex dots (own pass) */}
      {!isEmpty &&
        !isCompare &&
        HEX_AXIS_ORDER.map((axis, i) => {
          const v = primary[i] ?? 0;
          if (v <= 0) return null;
          const p = hexVertex(i, v);
          return <circle key={axis} cx={p.x} cy={p.y} r={4.5} fill="#FF6B2C" />;
        })}

      {/* Value numbers */}
      {withValues && (
        <g fontSize={14} fontWeight={700} fill="#FFFFFF">
          {HEX_AXIS_ORDER.map((axis, i) => {
            const v = primary[i] ?? 0;
            if (v <= 0) return null;
            const pos = VALUE_POS[i];
            if (!pos) return null;
            const node = (
              <text x={pos.x} y={pos.y} textAnchor={pos.anchor}>
                {v}
              </text>
            );
            return linkAxes ? (
              <a key={axis} href={`/pass/${axis}`}>
                {node}
              </a>
            ) : (
              <g key={axis}>{node}</g>
            );
          })}
        </g>
      )}

      {/* Labels */}
      {showLabels && (
        <g fontSize={9.5} fontWeight={700} letterSpacing={0.5}>
          {HEX_AXIS_ORDER.map((axis, i) => {
            const pos = LABEL_POS[i];
            if (!pos) return null;
            const node = (
              <text
                x={pos.x}
                y={pos.y}
                textAnchor={pos.anchor}
                fill={hiddenSet.has(axis) ? '#6B7080' : '#C7CBD6'}
              >
                {AXIS_SHORT[axis].toUpperCase()}
              </text>
            );
            return linkAxes ? (
              <a key={axis} href={`/pass/${axis}`}>
                {node}
              </a>
            ) : (
              <g key={axis}>{node}</g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
