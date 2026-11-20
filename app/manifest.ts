import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VivoLocal',
    short_name: 'VivoLocal',
    description: 'Vendé en vivo y recibí cafecitos',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b10',
    theme_color: '#E11D48',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
