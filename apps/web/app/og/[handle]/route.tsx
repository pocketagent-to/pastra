import { ImageResponse } from 'next/og';
import { hexVertex, ringVertex } from '@/lib/hexagon';
import { axesValues, EXAMPLE_PASS } from '@/lib/example';

export const runtime = 'nodejs';

const FORMATS = {
  x: { width: 1200, height: 675 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
} as const;

const AXES = [
  { key: 'sports', label: 'SPORTS' },
  { key: 'gaming', label: 'GAMING' },
  { key: 'crypto', label: 'CRYPTO' },
  { key: 'music', label: 'MUSIC' },
  { key: 'social', label: 'SOCIAL' },
  { key: 'lifestyle', label: 'LIFESTYLE' },
] as const;

/** Fetch a Google font as TTF for satori (old UA => ttf, not woff2). Null on failure (offline). */
async function loadFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
    const css = await fetch(api, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36',
      },
    }).then((r) => r.text());
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(?:truetype|opentype)['"]?\)/);
    if (!match) return null;
    return await fetch(match[1]!).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * GET /og/{handle}.png — the branded share card (docs/product-spec.md section 11, design/Share.html).
 * Query: `v` = x | story | square (aspect), `show` = hex,level,numbers,stamps,sports.
 */
export async function GET(request: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  const name = handle.replace(/\.png$/, '');
  const pass = EXAMPLE_PASS;

  const url = new URL(request.url);
  const v = url.searchParams.get('v');
  const dims = v === 'story' ? FORMATS.story : v === 'square' ? FORMATS.square : FORMATS.x;
  const landscape = dims.width > dims.height;
  const show = new Set(
    (url.searchParams.get('show') ?? 'hex,level,numbers')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const [head700, head800, body600] = await Promise.all([
    loadFont('Unbounded', 700),
    loadFont('Unbounded', 800),
    loadFont('Inter', 600),
  ]);
  const fonts = [
    head700 && { name: 'Unbounded', data: head700, weight: 700 as const, style: 'normal' as const },
    head800 && { name: 'Unbounded', data: head800, weight: 800 as const, style: 'normal' as const },
    body600 && { name: 'Inter', data: body600, weight: 600 as const, style: 'normal' as const },
  ].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    weight: 700 | 800 | 600;
    style: 'normal';
  }[];
  const head = fonts.some((f) => f.name === 'Unbounded') ? 'Unbounded' : 'sans-serif';
  const bodyFont = fonts.some((f) => f.name === 'Inter') ? 'Inter' : 'sans-serif';

  // ---- hexagon geometry ----
  const av = axesValues();
  const values = AXES.map((a) => (a.key === 'sports' && !show.has('sports') ? 0 : av[a.key]));
  const valuePts = values.map((s, i) => {
    const vtx = hexVertex(i, s <= 0 ? 0 : Math.max(s, 6));
    return `${round(vtx.x)},${round(vtx.y)}`;
  });
  const dots = values.map((s, i) => hexVertex(i, s <= 0 ? 0 : Math.max(s, 6)));
  const ring = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const p = ringVertex(i, r);
      return `${round(p.x)},${round(p.y)}`;
    }).join(' ');

  const hexSize = landscape ? 330 : 380;
  const BOX = hexSize + 110;
  const C = BOX / 2;
  const labelR = (105 * hexSize) / 260 + 30;
  const labelPos = (i: number) => ({
    x: C + labelR * Math.sin((60 * i * Math.PI) / 180),
    y: C - labelR * Math.cos((60 * i * Math.PI) / 180),
  });

  const hexagon = show.has('hex') && (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: BOX,
        height: BOX,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={hexSize} height={hexSize} viewBox="-130 -130 260 260">
        {[35, 70, 105].map((r, idx) => (
          <polygon
            key={r}
            points={ring(r)}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={idx === 2 ? 0.26 : 0.13}
            strokeWidth={1.5}
          />
        ))}
        {AXES.map((_, i) => {
          const p = ringVertex(i, 105);
          return (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={round(p.x)}
              y2={round(p.y)}
              stroke="#FFFFFF"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={valuePts.join(' ')}
          fill="#9D4EDD"
          fillOpacity={0.5}
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {dots.map((d, i) => (
          <circle key={i} cx={round(d.x)} cy={round(d.y)} r={5.5} fill="#FF6B2C" />
        ))}
      </svg>
      {AXES.map((a, i) => {
        const pos = labelPos(i);
        const hideVal = a.key === 'sports' && !show.has('sports');
        return (
          <div
            key={a.key}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 15,
                fontWeight: 700,
                color: '#A3A8B3',
                fontFamily: bodyFont,
              }}
            >
              {a.label}
            </div>
            {!hideVal && (
              <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, fontFamily: head }}>
                {av[a.key]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ---- logo mark ----
  const logo = (size: number) => (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <rect width="120" height="120" rx="30" fill="#1F4BFF" />
      <g transform="translate(60 60) scale(0.74) translate(-60 -60)">
        <polygon
          points="60,10 103.3,35 103.3,85 60,110 16.7,85 16.7,35"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={9}
          strokeLinejoin="round"
        />
        <polygon
          points="60,46.7 91.3,41.9 88,76.2 60,79 40.3,71.4 50.1,54.3"
          fill="#FF6B2C"
          stroke="#FF6B2C"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );

  const numbers = pass.keyNumbers.slice(0, landscape ? 2 : 3);
  const stamps = pass.stamps.slice(0, 3);

  // Scale the name down for long handles so the LVL badge never overlaps it.
  const nameSize =
    name.length > 13
      ? landscape
        ? 42
        : 52
      : name.length > 10
        ? landscape
          ? 50
          : 60
        : landscape
          ? 58
          : 66;

  const identity = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 800, fontFamily: head }}>
          {name}
        </div>
        {show.has('level') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 30,
              fontWeight: 800,
              fontFamily: head,
              color: '#0A0A0A',
              background: '#FF6B2C',
              borderRadius: 16,
              padding: '8px 18px',
            }}
          >
            {`LVL ${pass.level}`}
          </div>
        )}
      </div>
      {show.has('level') && (
        <div
          style={{
            display: 'flex',
            fontSize: 34,
            fontWeight: 800,
            fontFamily: head,
            background: 'linear-gradient(90deg, #FF6B2C, #C04DFF, #7C9BFF)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {pass.title}
        </div>
      )}
    </div>
  );

  const numbersBlock = show.has('numbers') && (
    <div style={{ display: 'flex', gap: 40 }}>
      {numbers.map((n) => (
        <div key={n.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              fontWeight: 800,
              fontFamily: head,
              color: '#FF6B2C',
            }}
          >
            {n.value}
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#C7CBD6', fontFamily: bodyFont }}>
            {n.label}
          </div>
        </div>
      ))}
    </div>
  );

  const stampsBlock = show.has('stamps') && (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {stamps.map((s) => (
        <div
          key={s.key}
          style={{
            display: 'flex',
            fontSize: 22,
            fontWeight: 600,
            fontFamily: bodyFont,
            padding: '9px 20px',
            borderRadius: 999,
            border: '2px solid rgba(255,255,255,0.85)',
          }}
        >
          {s.label}
        </div>
      ))}
    </div>
  );

  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {logo(40)}
      <div
        style={{
          display: 'flex',
          fontSize: 26,
          fontWeight: 800,
          fontFamily: head,
          letterSpacing: 1,
        }}
      >
        HEXTRA
      </div>
      <div style={{ display: 'flex', fontSize: 22, color: '#8A8F9C', fontFamily: bodyFont }}>
        · build your pass
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: `${dims.width}px`,
          height: `${dims.height}px`,
          display: 'flex',
          flexDirection: 'column',
          padding: 72,
          color: 'white',
          background: 'radial-gradient(130% 80% at 50% 0%, #10217A 0%, #05081F 48%, #000000 100%)',
          fontFamily: bodyFont,
        }}
      >
        {landscape ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 40 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: 30,
                  justifyContent: 'center',
                }}
              >
                {identity}
                {numbersBlock}
                {stampsBlock}
              </div>
              {show.has('hex') && (
                <div style={{ display: 'flex', alignItems: 'center' }}>{hexagon}</div>
              )}
            </div>
            <div style={{ display: 'flex' }}>{footer}</div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 26,
              textAlign: 'center',
            }}
          >
            {identity}
            {hexagon}
            {numbersBlock}
            {stampsBlock}
            <div style={{ display: 'flex', marginTop: 10 }}>{footer}</div>
          </div>
        )}
      </div>
    ),
    {
      width: dims.width,
      height: dims.height,
      fonts: fonts.length ? fonts : undefined,
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
