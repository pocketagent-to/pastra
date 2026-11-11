import { ImageResponse } from 'next/og';
import { hexPolygon, ringPolygon } from '@/lib/hexagon';
import { axesValues, EXAMPLE_PASS } from '@/lib/example';

export const runtime = 'nodejs';

const FORMATS = {
  x: { width: 1200, height: 675 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
} as const;

const AXIS_ORDER = ['sports', 'gaming', 'crypto', 'music', 'social', 'lifestyle'] as const;

/**
 * GET /og/{handle}.png — the share card (docs/product-spec.md section 11). Query params let the
 * Share screen drive it: `v` = x | story | square (aspect), `show` = a comma list of
 * hex,level,numbers,stamps,sports controlling what the card renders.
 */
export async function GET(request: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  const name = handle.replace(/\.png$/, '');
  const pass = EXAMPLE_PASS;

  const url = new URL(request.url);
  const v = url.searchParams.get('v');
  const dims = v === 'story' ? FORMATS.story : v === 'square' ? FORMATS.square : FORMATS.x;
  const show = new Set(
    (url.searchParams.get('show') ?? 'hex,level,numbers')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const av = axesValues();
  // "Sports side" hidden -> drop the sports axis to the centre.
  const values = AXIS_ORDER.map((a) => (a === 'sports' && !show.has('sports') ? 0 : av[a]));
  const numbers = pass.keyNumbers.slice(0, 3);
  const stamps = pass.stamps.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: `${dims.width}px`,
          height: `${dims.height}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 30,
          padding: 64,
          color: 'white',
          background: 'linear-gradient(135deg, #10217A 0%, #05081F 60%, #000000 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800 }}>{name}</div>
          {show.has('level') && (
            <div
              style={{
                display: 'flex',
                fontSize: 32,
                fontWeight: 700,
                background: 'linear-gradient(90deg, #FF6B2C, #C04DFF, #7C9BFF)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {pass.title}
            </div>
          )}
          {show.has('level') && (
            <div
              style={{ display: 'flex', fontSize: 38, fontWeight: 700 }}
            >{`LVL ${pass.level}`}</div>
          )}
        </div>

        {show.has('hex') && (
          <svg width="320" height="280" viewBox="-180 -150 360 300">
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
        )}

        {show.has('numbers') && (
          <div style={{ display: 'flex', gap: 36, justifyContent: 'center' }}>
            {numbers.map((n) => (
              <div
                key={n.label}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
              >
                <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#FF6B2C' }}>
                  {n.value}
                </div>
                <div style={{ display: 'flex', fontSize: 22, color: '#C7CBD6' }}>{n.label}</div>
              </div>
            ))}
          </div>
        )}

        {show.has('stamps') && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {stamps.map((s) => (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  fontSize: 24,
                  fontWeight: 600,
                  padding: '10px 20px',
                  borderRadius: 999,
                  border: '2px solid #FFFFFF',
                }}
              >
                {s.label}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', fontSize: 26, color: '#C7CBD6', marginTop: 8 }}>
          hextra · build your pass
        </div>
      </div>
    ),
    {
      width: dims.width,
      height: dims.height,
      // Public share card: CDN serves the rendered PNG for a day and refreshes in the background.
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
