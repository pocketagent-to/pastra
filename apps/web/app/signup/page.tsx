import { catalog } from '@pastra/catalog';

/**
 * Placeholder sign-up screen (A1). The real screen — Google and email only — is built in stage 3
 * from the `SignUp` mockup. This stub confirms the app boots and can read the catalog on the server.
 */
export default function SignUp() {
  const liveServices = catalog.providers.filter((p) => p.status === 'live').length;
  return (
    <main
      style={{
        maxWidth: 430,
        margin: '0 auto',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 16px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Pastra</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: 320 }}>
        Six sides of your life in one hexagon, plus a crypto card. Scaffold is live — screens arrive
        in stage 3. {liveServices} services ready in the catalog.
      </p>
    </main>
  );
}
