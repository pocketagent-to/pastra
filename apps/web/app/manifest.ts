import type { MetadataRoute } from 'next';

/** Web app manifest — makes HEXTRA installable to the home screen (served at /manifest.webmanifest). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HEXTRA',
    short_name: 'HEXTRA',
    description: 'Your pass: six sides of your life in one hexagon, plus a crypto card.',
    start_url: '/pass',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#05081f',
    theme_color: '#05081f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
