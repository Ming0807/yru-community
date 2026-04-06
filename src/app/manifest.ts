import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YRU Community',
    short_name: 'YRU',
    description: 'ชุมชนออนไลน์สำหรับนักศึกษามหาวิทยาลัยราชภัฏยะลา',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#E88B9C',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable' as const,
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable' as const,
      },
    ],
    shortcuts: [
      {
        name: 'ตั้งกระทู้ใหม่',
        short_name: 'ตั้งกระทู้',
        description: 'เขียนกระทู้ใหม่ในชุมชน',
        url: '/post/create',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    categories: ['education', 'social'],
    lang: 'th',
  };
}
