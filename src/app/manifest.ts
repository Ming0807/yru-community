import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YRU Community',
    short_name: 'YRU CMM',
    description: 'ชุมชนออนไลน์สำหรับนักศึกษามหาวิทยาลัยราชภัฏยะลา',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ec4899',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
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
      {
        name: 'Admin Dashboard',
        short_name: 'แอดมิน',
        description: 'จัดการระดับผู้ดูแลระบบ',
        url: '/admin',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
      }
    ]
  };
}
