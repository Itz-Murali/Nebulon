const site = (process.env.SITE_URL || 'https://nebulon-frontier.vercel.app').replace(/\/$/, '')
const abs = (path: string) => `${site}${path}`

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: false,
  devtools: { enabled: false },
  css: ['@fontsource-variable/orbitron', '@fontsource-variable/exo-2', '@fontsource/share-tech-mono', '~/assets/css/main.css', '~/assets/css/lobby.css', '~/assets/css/site.css'],
  typescript: { strict: true },
  app: {
    head: {
      title: 'Nebulon: Infinite Frontier',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', type: 'image/png', href: '/icons/icon-192.png' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
        { rel: 'canonical', href: `${site}/` },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'VideoGame',
            name: 'Nebulon: Infinite Frontier',
            url: `${site}/`,
            image: abs('/brand/og-image.jpg'),
            genre: 'Space flight',
            applicationCategory: 'Game',
            operatingSystem: 'Any',
            isAccessibleForFree: true,
            codeRepository: 'https://github.com/Itz-Murali/Nebulon',
            author: [{ '@type': 'Person', name: 'Itz-Murali', url: 'https://github.com/Itz-Murali' }, { '@type': 'Person', name: 'Itz-Anya', url: 'https://github.com/Itz-Anya' }]
          })
        }
      ],
      meta: [
        { property: 'og:title', content: 'Nebulon: Infinite Frontier' },
        { property: 'og:description', content: 'A 3D endless space-exploration game that runs entirely in your browser.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: `${site}/` },
        { property: 'og:site_name', content: 'Nebulon' },
        { name: 'twitter:url', content: `${site}/` },
        { property: 'og:image', content: abs('/brand/og-image.jpg') },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'NEBULON: Infinite Frontier' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Nebulon: Infinite Frontier' },
        { name: 'twitter:description', content: 'A 3D endless space-exploration game that runs entirely in your browser.' },
        { name: 'twitter:image', content: abs('/brand/og-image.jpg') },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no' },
        { name: 'theme-color', content: '#05070d' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Nebulon' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'description', content: 'A 3D endless space-flight game that runs entirely in your browser.' }
      ]
    }
  }
})
