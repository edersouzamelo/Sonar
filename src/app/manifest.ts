import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SONAR',
    short_name: 'SONAR',
    description: 'Sistema SONAR para apoio a processos logisticos.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F4F9FF',
    theme_color: '#0F5F9F',
    icons: [
      {
        src: '/sonar-logo-transparent.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/sonar-logo-transparent.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
