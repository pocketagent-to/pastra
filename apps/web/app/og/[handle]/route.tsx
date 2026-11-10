import { ImageResponse } from 'next/og';
import { hexPolygon, ringPolygon } from '@/lib/hexagon';
import { axesValues, EXAMPLE_PASS } from '@/lib/example';

export const runtime = 'nodejs';

/** GET /og/{handle}.png — the 1200×675 share card (docs/product-spec.md section 11). */
export async function GET(_request: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  const name = handle.replace(/\.png$/, '');
  const pass = EXAMPLE_PASS;
  const values = Object.values(axesValues());

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '675px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px',
          color: 'white',
          background: 'linear-gradient(135deg, #10217A 0%, #05081F 60%, #000000 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 64, fontWeight: 800 }}>{name}</div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                marginTop: 8,
                background: 'linear-gradient(90deg, #FF6B2C, #C04DFF, #7C9BFF)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {pass.title}
            </div>
            <div
              style={{ fontSize: 40, marginTop: 24, fontWeight: 700 }}
            >{`LVL ${pass.level}`}</div>
          </div>
          <svg width="340" height="300" viewBox="-180 -150 360 300">
            {[35, 70, 105].map((r) => (
              <polygon
                key={r}
                points={ringPolygon(r)}
                fill="none"
                stroke="#3A3D47"
                strokeWidth={1}
              />
            ))}
            <polygon
              points={hexPolygon(values)}
              fill="#C04DFF"
              fillOpacity={0.6}
              stroke="#C04DFF"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div style={{ marginTop: 40, fontSize: 28, color: '#C7CBD6' }}>
          pastra · build your pass
        </div>
      </div>
    ),
    { width: 1200, height: 675 },
  );
}
