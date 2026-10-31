export const REPO = 'https://github.com/Itz-Murali/Nebulon'
export const SITE = 'https://nebulon-frontier.vercel.app'

export interface Creator {
  name: string
  handle: string
  github: string
  photo: string
}

export const CREATORS: Creator[] = [
  { name: '𝚨𝝒𝛄ꫝ 𓆩𔘓𓆪', handle: 'Itz-Anya', github: 'https://github.com/Itz-Anya', photo: 'https://random-images-anya.vercel.app/anya' },
  { name: '𝐌 𝐔 𝐑 𝚨 𝐋 𝐈 𓂃ִֶָ⋆.˚', handle: 'Itz-Murali', github: 'https://github.com/Itz-Murali', photo: 'https://itz-murali-images.vercel.app/api' }
]

export const MUSIC = { title: 'Sky High', artist: 'Elektronomia' }

export interface StackItem {
  name: string
  detail: string
  href: string
}

export const STACK: StackItem[] = [
  { name: 'Nuxt 3', detail: 'Single-page app shell and build tooling. The site is generated as static files.', href: 'https://nuxt.com' },
  { name: 'Vue 3', detail: 'Menus, HUD and settings. One composable owns the game state and talks to the engine.', href: 'https://vuejs.org' },
  { name: 'TypeScript', detail: 'Strict mode across the engine, the interface and the save system.', href: 'https://www.typescriptlang.org' },
  { name: 'Three.js', detail: 'WebGL rendering for ships, planets, wormholes and every universe, with custom GLSL shaders.', href: 'https://threejs.org' },
  { name: 'Web Audio API', detail: 'Engine drone and sound effects are synthesised live, so there are no sample files to download.', href: 'https://developer.mozilla.org/docs/Web/API/Web_Audio_API' },
  { name: 'Service worker and web manifest', detail: 'Makes Nebulon installable and keeps the whole game, music included, available offline.', href: 'https://developer.mozilla.org/docs/Web/Progressive_web_apps' },
  { name: 'anime.js', detail: 'Interface motion: menu reveals, panel transitions and page entrances.', href: 'https://animejs.com' },
  { name: 'Lucide', detail: 'Interface icons.', href: 'https://lucide.dev' },
  { name: 'Fontsource', detail: 'Orbitron, Exo 2 and Share Tech Mono, bundled so the game looks the same offline.', href: 'https://fontsource.org' },
  { name: 'Vercel', detail: 'Static hosting.', href: 'https://vercel.com' }
]

export const LIBRARIES: { name: string; license: string; href: string }[] = [
  { name: 'Three.js', license: 'MIT', href: 'https://github.com/mrdoob/three.js' },
  { name: 'Vue', license: 'MIT', href: 'https://github.com/vuejs/core' },
  { name: 'Nuxt', license: 'MIT', href: 'https://github.com/nuxt/nuxt' },
  { name: 'anime.js', license: 'MIT', href: 'https://github.com/juliangarnier/anime' },
  { name: 'Lucide', license: 'ISC', href: 'https://github.com/lucide-icons/lucide' },
  { name: 'Orbitron, Exo 2, Share Tech Mono (via Fontsource)', license: 'SIL Open Font License 1.1', href: 'https://fontsource.org' }
]

export const UPDATED = 'October 2026'
