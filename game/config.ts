import type { ShipDef, ModeDef, ModeId, Quality, Universe, Discovery } from '~/types'

export const FIELD = { x: 5.6, y: 3.2 }
export const SCORE = { perMeter: 1, perEnergy: 25, perPass: 10 }
export const SHIP_RADIUS = 0.8

export const QUALITY: Record<Quality, { dpr: number; stars: number; dust: number; streaks: number; fx: number; decor: number }> = {
  low: { dpr: 0.75, stars: 260, dust: 0, streaks: 90, fx: 160, decor: 7 },
  medium: { dpr: 1, stars: 520, dust: 0, streaks: 150, fx: 320, decor: 13 },
  high: { dpr: 1.5, stars: 800, dust: 0, streaks: 220, fx: 520, decor: 20 }
}

export const SHIPS: ShipDef[] = [
  {
    id: 'aurora', name: 'AURORA-X', role: 'Balanced fighter',
    desc: 'White and gunmetal armor over blue-violet energy systems. Predictable at every speed.',
    stats: { speed: 1, handling: 1, hyper: 1, magnet: 0 },
    look: { style: 0, span: 3.4, sweep: 0.7, fin: 1.7, engines: 3, hull: 0xdde2ec, dark: 0x1a1d29, glow: 0x7a6cff, accent: 0x3d8bff }
  },
  {
    id: 'phantom', name: 'PHANTOM-X', role: 'Stealth skirmisher',
    desc: 'A matte black blade with canards and V-tails. Sharper steering at the cost of raw speed.',
    stats: { speed: 1.02, handling: 1.28, hyper: 1, magnet: 0 },
    look: { style: 1, span: 3.2, sweep: 1, fin: 1.1, engines: 2, hull: 0x2c303c, dark: 0x0b0c12, glow: 0x8a4dff, accent: 0x9d6bff }
  },
  {
    id: 'vortex', name: 'VORTEX-7', role: 'Aggressive interceptor',
    desc: 'Forward-swept wings and tall rear blades. Hyperdrive recharges much faster.',
    stats: { speed: 1.1, handling: 1.1, hyper: 1.45, magnet: 0 },
    look: { style: 2, span: 3.5, sweep: 0.9, fin: 2.4, engines: 3, hull: 0xe6e0da, dark: 0x2a1317, glow: 0xff7a3a, accent: 0xff3b2a }
  },
  {
    id: 'helios', name: 'HELIOS PRIME', role: 'Energy cruiser',
    desc: 'Broad delta wings around a crescent collector array. Pulls energy orbs from much further away.',
    stats: { speed: 1.05, handling: 1.05, hyper: 1.1, magnet: 2.5 },
    look: { style: 3, span: 4, sweep: 0.3, fin: 1.4, engines: 3, hull: 0xeadfbb, dark: 0x2a2418, glow: 0xffb23a, accent: 0x3de0d0 }
  },
  {
    id: 'singularity', name: 'SINGULARITY', role: 'Prototype',
    desc: 'Four-engine experimental frame with a rotating containment ring and radiating spines.',
    stats: { speed: 1.18, handling: 1.32, hyper: 1.5, magnet: 2 },
    look: { style: 4, span: 3.5, sweep: 1.2, fin: 1.9, engines: 4, hull: 0x1a1426, dark: 0x06040a, glow: 0xb84dff, accent: 0xffd24a }
  }
]

export const MODES: Record<ModeId, ModeDef> = {
  classic: {
    id: 'classic', name: 'Classic', tier: 'Easy', perk: 'Forgiving', threat: 1,
    desc: 'Relaxed, forgiving flight. Extra hull, a gentle difficulty ramp and rare hazards. Ideal for learning the stars.',
    speed: 1, ramp: 0.8, density: 0.8, regen: 1, hp: 120,
    dmg: 0.75, heal: 1.25, grace: 1.5, lvlStep: 750, lvlShift: 0, maxPattern: 3,
    hazard: 1.4, portal: 1, evGap: [13, 22], epic: false
  },
  survival: {
    id: 'survival', name: 'Survival', tier: 'Hard', perk: 'No mercy', threat: 3,
    desc: 'Brutal debris fields, a fast ramp and a fragile hull. Comets and anomalies arrive early and hits hurt.',
    speed: 1.1, ramp: 1.6, density: 1.5, regen: 0.85, hp: 70,
    dmg: 1.3, heal: 0.6, grace: 1, lvlStep: 450, lvlShift: 1, maxPattern: 4,
    hazard: 0.65, portal: 1.1, evGap: [13, 22], epic: false
  },
  hyperdrive: {
    id: 'hyperdrive', name: 'Hyperdrive', tier: 'Epic', perk: 'Epic events', threat: 2,
    desc: 'Balanced difficulty made for exploring. Frequent wormholes plus epic events: stardust rivers, warp currents and supernova spectacles.',
    speed: 1.15, ramp: 1, density: 1, regen: 2.2, hp: 100,
    dmg: 1, heal: 1, grace: 1.2, lvlStep: 600, lvlShift: 0, maxPattern: 3,
    hazard: 1, portal: 0.65, evGap: [8, 14], epic: true
  }
}

const sk = (top: number, bottom: number, acc: number, a: number, b: number, wash: number, aur = 0, grid = 0) => ({ top, bottom, acc, a, b, wash, aur, grid })

export const UNIVERSES: Universe[] = [
  { name: 'Nebulon Reach', bg: 0x03040a, rim: 0x7a5cff, hue: 0.72, styles: [0, 0, 1, 3, 2], portal: [0x6a8bff, 0xb06bff], sky: sk(0x05071f, 0x03040a, 0x3a2a9a, 0x4a6aff, 0x9a5aff, 0.6) },
  { name: 'Crimson Veil', bg: 0x0c0307, rim: 0xff5a3a, hue: 0.98, styles: [1, 4, 4, 2, 1], portal: [0xff5a3a, 0xffb060], tint: 0xffc8b8, sky: sk(0x240509, 0x0c0307, 0x8a1a2a, 0xff4a3a, 0xff9a5a, 0.7, 0.6), fog: 0x1a0408, fogD: 0.0035 },
  { name: 'Verdant Drift', bg: 0x020a08, rim: 0x3affb0, hue: 0.4, styles: [0, 0, 1, 2], portal: [0x2affb0, 0x7affd0], neb: 1.2, sky: sk(0x04261a, 0x020a08, 0x1a8a5a, 0x3affb0, 0x9affd0, 0.65, 0.5), ambient: 'spores' },
  { name: 'Golden Expanse', bg: 0x0a0803, rim: 0xffc23a, hue: 0.1, styles: [1, 1, 2, 4, 0], portal: [0xffc23a, 0xfff0a0], tint: 0xfff0c8, sky: sk(0x2a1c05, 0x0a0803, 0x9a6a1a, 0xffc23a, 0xffe08a, 0.6), sig: ['sun'], sun: 0xffc23a, ambient: 'dust' },
  { name: 'Glacial Deep', bg: 0x020812, rim: 0x59e0ff, hue: 0.55, styles: [3, 3, 0, 2], portal: [0x59e0ff, 0xc0f0ff], tint: 0xd8eeff, sky: sk(0x06223a, 0x020812, 0x2a6aa0, 0x59e0ff, 0xc0f0ff, 0.4, 0.7), ambient: 'snow' },
  { name: "Dracula's Dominion", bg: 0x0a0004, rim: 0xb0102a, hue: 0.98, styles: [4, 2, 2], portal: [0x8a0f2a, 0xff2a4a], sat: 0.9, lum: 0.45, neb: 0.7, planets: 0.5, galaxies: 0.2, clusters: 0.3, starMul: 0.8, tint: 0xff9a9a, ambient: 'embers', exposure: 0.9, sky: sk(0x1c000c, 0x050002, 0x5a0a1a, 0x8a0f2a, 0x4a0a3a, 0.55), fog: 0x1a0006, fogD: 0.0048, sig: ['bloodmoon', 'bats'] },
  { name: 'Digital Matrix', bg: 0x000a03, rim: 0x22ff66, hue: 0.38, styles: [2, 2, 3], portal: [0x11ff66, 0xccffdd], sat: 0.9, lum: 0.55, neb: 0.2, planets: 0.2, galaxies: 0, clusters: 0, bh: 0.2, comets: 0.4, fields: 0.3, starMul: 0.6, tint: 0x66ff99, ambient: 'rain', exposure: 1.1, rock: { color: 0x2a6a3a, emissive: 0x0aff50, k: 0.7 }, fieldColor: 0x1a5a2a, fieldGlow: 0x0a8a30, sky: sk(0x021f0b, 0x000a03, 0x0a5a22, 0x22ff66, 0x99ffbb, 0.15, 0, 0.9), fog: 0x00140a, fogD: 0.0042, sig: ['glyphs', 'gridfloor'] },
  { name: 'Love Nebula', bg: 0x0a0309, rim: 0xff7aa8, hue: 0.92, styles: [0, 1, 3], portal: [0xff5a98, 0xffc0dc], sat: 1.1, lum: 1.1, neb: 1.7, galaxies: 0.8, clusters: 1.4, tint: 0xffd0e4, ambient: 'hearts', heal: 1.5, exposure: 1.1, rock: { color: 0xf0a8c8, emissive: 0x8a2a5a, k: 0.55 }, fieldColor: 0xe08ab0, fieldGlow: 0x7a2050, sky: sk(0x3a1034, 0x14041a, 0xb83a8a, 0xff7aa8, 0xffc0e8, 0.95, 0.35), fog: 0x1c0618, fogD: 0.0032, sig: ['heart', 'lovestars'] },
  { name: 'Black Void', bg: 0x000000, rim: 0x222244, hue: 0.7, styles: [2], portal: [0x333366, 0x8888cc], sat: 0.3, lum: 0.3, neb: 0, planets: 0, galaxies: 0, clusters: 0, bh: 0, comets: 0, fields: 0.4, starMul: 0.3, tint: 0x9999aa, exposure: 0.9, sky: sk(0x000000, 0x000000, 0x0a0a14, 0x222244, 0x444466, 0.05), sig: ['eye'] },
  { name: 'Empty Space', bg: 0x010206, rim: 0x445566, hue: 0.6, styles: [2], portal: [0x8899aa, 0xeef3ff], neb: 0, planets: 0, galaxies: 0, clusters: 0, bh: 0, comets: 0, fields: 0, stations: 0, starMul: 0.45, empty: true, sky: sk(0x05070c, 0x020306, 0x10141c, 0x334455, 0x556677, 0.05) },
  { name: 'The Abyss', bg: 0x010208, rim: 0x2a3a6a, hue: 0.62, styles: [2, 3, 0], portal: [0x3a4a8a, 0x9aa8e8], sat: 0.6, lum: 0.35, neb: 0.4, planets: 0.3, galaxies: 0.2, starMul: 0.6, tint: 0x8899cc, exposure: 0.85, sky: sk(0x01091f, 0x010208, 0x0a2a6a, 0x1a8aff, 0x3affd0, 0.5, 0.25), ambient: 'plankton', sig: ['jelly'], fog: 0x010a1c, fogD: 0.0042 },
  { name: 'Aurora Paradise', bg: 0x020a10, rim: 0x59ffd0, hue: 0.48, styles: [0, 3, 1], portal: [0x59ffd0, 0xd0a0ff], sat: 1.2, lum: 1.1, neb: 1.4, galaxies: 1.5, clusters: 1.5, starMul: 1.3, sky: sk(0x06263a, 0x020a10, 0x1a6a8a, 0x59ffd0, 0xd06aff, 0.55, 1.4), ambient: 'motes' },
  { name: 'Toxic Mist', bg: 0x060a02, rim: 0xb0ff30, hue: 0.22, styles: [1, 4, 2], portal: [0xb0ff30, 0xf0ff90], lum: 0.8, neb: 1.3, tint: 0xe0ff90, sky: sk(0x182a04, 0x060a02, 0x4a7a0a, 0xb0ff30, 0xf0ff90, 1, 0.15), fog: 0x0e1a03, fogD: 0.0065, ambient: 'spores' },
  { name: 'Inferno', bg: 0x0a0200, rim: 0xff6a20, hue: 0.04, styles: [4, 4, 1], portal: [0xff6a20, 0xffd060], sat: 1.1, lum: 0.8, bh: 1.2, tint: 0xffc090, ambient: 'embers', sky: sk(0x340a02, 0x0a0200, 0xaa3a0a, 0xff6a20, 0xffd060, 0.85, 0.3), sig: ['sun'], sun: 0xff5a1a, fog: 0x1c0600, fogD: 0.0038 },
  { name: 'Twilight Bloom', bg: 0x07040f, rim: 0xb08cff, hue: 0.8, styles: [0, 3, 1], portal: [0xb08cff, 0xffb0e0], sat: 0.9, lum: 1.15, neb: 1.5, galaxies: 1.3, clusters: 1.2, sky: sk(0x120838, 0x3a1040, 0x7a3a9a, 0xb08cff, 0xffb0e0, 0.75, 0.35), ambient: 'petals' },
  { name: 'The Crystal Universe', bg: 0x030a1c, rim: 0x59e6ff, hue: 0.58, styles: [3, 3, 1, 3], portal: [0x59e6ff, 0xb48cff], sat: 1.1, lum: 1.05, neb: 1.5, galaxies: 0.8, clusters: 1.3, tint: 0xd0f0ff, ambient: 'shards', realm: 'crystal', rock: { color: 0x7ad8ff, emissive: 0x2a60d0, k: 0.9 }, fieldColor: 0x8ae6ff, fieldGlow: 0x2a80d0, sky: sk(0x07124a, 0x02061a, 0x2a5ad0, 0x38e0ff, 0xa070ff, 0.95, 0.35), fog: 0x041238, fogD: 0.0034, sig: ['crystals'], tag: 'Collect crystal shards to upgrade your ship' },
  { name: 'The Fractured Timeline', bg: 0x07040f, rim: 0xffc070, hue: 0.12, styles: [0, 4, 3, 2, 1], portal: [0xffc070, 0xb48cff], sat: 1, lum: 1, neb: 1.1, stations: 1, chrono: true, realm: 'chrono', ambient: 'chrono', tint: 0xfff0d8, sky: sk(0x1a0c3a, 0x060310, 0x7a4ab0, 0xffc070, 0x9a8aff, 0.75, 0.3), fog: 0x0c0618, fogD: 0.0034, sig: ['timerings'], tag: 'Some wormholes lead to other eras of this universe', rock: { color: 0xb0a090, emissive: 0x402a60, k: 0.5 },
    eras: [
      { name: 'Age of Dawn', patch: { styles: [4, 4, 1], neb: 1.7, planets: 1.3, galaxies: 0.4, starMul: 1.5, rim: 0xffd090, tint: 0xd8e4ff, portal: [0xffd090, 0xfff4d0], sky: sk(0x1c1070, 0x05030f, 0x6a4aff, 0xffe08a, 0x6aa8ff, 1, 0.25), fog: 0x0a0624, fogD: 0.003 } },
      { name: 'Age of Embers', patch: { styles: [2, 2, 4], neb: 0.5, planets: 0.8, galaxies: 0.2, clusters: 0.3, starMul: 0.5, rim: 0xff6a3a, tint: 0xffb090, portal: [0xff6a3a, 0xffc090], sky: sk(0x2a0808, 0x050101, 0x6a1a10, 0xff5a2a, 0xffa060, 0.6, 0.1), fog: 0x1a0403, fogD: 0.0046 } }
    ] },
  { name: 'The Living Universe', bg: 0x0a0309, rim: 0xff4a9a, hue: 0.9, styles: [5, 5, 5, 0, 1], portal: [0xff4a9a, 0x6aff9a], sat: 1.15, lum: 0.95, neb: 1.3, galaxies: 0.4, clusters: 0.5, tint: 0xffd8e8, ambient: 'bio', realm: 'living', living: true, worm: 'bio', heal: 1.25, rock: { color: 0xd88a9a, emissive: 0x7a1a3a, k: 0.6 }, fieldColor: 0xc8707a, fieldGlow: 0x6a1030, sky: sk(0x2a0a22, 0x0a0308, 0x8a1a5a, 0xff4a8a, 0x6aff9a, 0.9, 0.3), fog: 0x14040e, fogD: 0.0038, sig: ['organisms', 'leviathan'], tag: 'Some of what you see is watching you' },
  { name: 'The Black Hole Universe', bg: 0x030108, rim: 0xff7a2a, hue: 0.07, styles: [2, 4, 1], portal: [0xff7a2a, 0xffd090], sat: 0.9, lum: 0.8, neb: 0.5, planets: 0.5, galaxies: 0.7, clusters: 0.4, bh: 1.5, fields: 2, starMul: 1.1, tint: 0xffd8b8, ambient: 'embers', realm: 'hole', pull: true, rock: { color: 0x8a7060, emissive: 0x4a1808, k: 0.5 }, fieldColor: 0x7a6258, fieldGlow: 0x5a2010, sky: sk(0x0c0414, 0x000000, 0x4a1608, 0xff7a2a, 0xffd090, 0.4, 0), fog: 0x08030a, fogD: 0.0036, sig: ['maw'], tag: 'Gravity wells bend your course' },
  { name: 'The Ocean of Stars', bg: 0x010a18, rim: 0x2affd0, hue: 0.5, styles: [0, 0, 3, 1], portal: [0x2affd0, 0x80c0ff], sat: 1.1, lum: 1.05, neb: 1.6, galaxies: 0.8, clusters: 0.8, tint: 0xc8f4ff, ambient: 'bubbles', realm: 'ocean', rock: { color: 0x7a8a98, emissive: 0x1a5a7a, k: 0.5 }, fieldColor: 0x6a8a9a, fieldGlow: 0x1a4a6a, sky: sk(0x042a4a, 0x010a1c, 0x1a7a9a, 0x2affd0, 0x4a8aff, 0.85, 1.2), fog: 0x021a30, fogD: 0.0036, sig: ['waves'], tag: 'Cosmic currents can carry you far off course' },
  { name: 'The Frozen Universe', bg: 0x020812, rim: 0x9ae0ff, hue: 0.57, styles: [3, 3, 3, 2], portal: [0x9ae0ff, 0xffffff], sat: 0.6, lum: 1.15, neb: 0.8, stations: 1, iced: true, tint: 0xe0f4ff, ambient: 'snow', realm: 'frozen', rock: { color: 0xcfe8ff, emissive: 0x2a5a90, k: 0.55 }, fieldColor: 0xbfe4ff, fieldGlow: 0x3a7ab0, sky: sk(0x0a2a4a, 0x020a14, 0x4a8ac0, 0x9ae0ff, 0xe0f8ff, 0.5, 0.4), fog: 0x0c2036, fogD: 0.0038, sig: ['frozen'], tag: 'Cold fronts drain your hyperdrive' },
  { name: 'The Chaos Universe', bg: 0x08020f, rim: 0xff2a8a, hue: 0.85, styles: [0, 1, 2, 3, 4], portal: [0xff2a8a, 0x2affe0], sat: 1.35, lum: 1.05, neb: 1.2, planets: 1.3, comets: 1.5, fields: 1.3, chaos: true, worm: 'unstable', ambient: 'motes', realm: 'chaos', rock: { color: 0xc090ff, emissive: 0x602060, k: 0.5 }, fieldColor: 0xa070d0, fieldGlow: 0x602080, sky: sk(0x200a30, 0x05020a, 0xff2a8a, 0x2affe0, 0xffe02a, 0.9, 0.8, 0.2), fog: 0x120520, fogD: 0.0036, tag: 'Physics changes without warning' },
  { name: 'The Corrupted Universe', bg: 0x04000a, rim: 0xff00aa, hue: 0.88, styles: [2, 4, 0, 3], portal: [0xff00aa, 0x00ffe0], sat: 1.3, lum: 1, neb: 0.7, planets: 0.8, galaxies: 0.3, clusters: 0.3, fields: 1.2, glitch: 1, worm: 'unstable', ambient: 'static', realm: 'corrupt', late: 3, tint: 0xffa8ff, rock: { color: 0xff40c0, emissive: 0x2000a0, k: 0.8 }, fieldColor: 0xd030a0, fieldGlow: 0x1020a0, sky: sk(0x080010, 0x000000, 0xff00aa, 0x00ffe0, 0xffffff, 0.35, 0, 0.7), fog: 0x0a0014, fogD: 0.0042, tag: 'Reality is breaking. Follow the stable signal' }
]

export const DISCOVERIES: Discovery[] = [
  { id: 'geode', name: 'Galaxy Geode', realm: 'crystal', blurb: 'A gigantic crystal with an entire miniature galaxy inside it.' },
  { id: 'eternal', name: 'The Eternal Moment', realm: 'chrono', secret: true, blurb: 'A planet that has existed in the same moment for billions of years.' },
  { id: 'mimic', name: 'The Mimic', realm: 'living', blurb: 'The planet you were approaching was a living creature.' },
  { id: 'titan', name: 'The Titan', realm: 'living', blurb: 'A colossal organism so large that entire star systems orbit it.' },
  { id: 'forge', name: 'Wormhole Forge', realm: 'hole', blurb: 'A mysterious structure orbiting a black hole, generating wormholes.' },
  { id: 'upwelling', name: 'The Upwelling', realm: 'ocean', blurb: 'A hidden region where the cosmic ocean flows up into another dimension.' },
  { id: 'relic', name: 'Relic World', realm: 'frozen', blurb: 'An ancient planet frozen in time, holding technology of an extinct civilization.' },
  { id: 'origin', name: 'The Origin', realm: 'chaos', blurb: 'A stable region at the center of the chaos: the source of all wormholes.' },
  { id: 'patientzero', name: 'Patient Zero', realm: 'corrupt', secret: true, blurb: 'The source of the corruption spreading through the wormhole network.' }
]

export function drawUniverse(bag: number[], current: number, visited: number): number {
  const eligible = (i: number) => i !== current && (UNIVERSES[i].late ?? 0) <= visited
  for (let pass = 0; pass < 2; pass++) {
    if (!bag.length) {
      const all = UNIVERSES.map((_, i) => i)
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[all[i], all[j]] = [all[j], all[i]]
      }
      bag.push(...all)
    }
    const at = bag.findIndex(eligible)
    if (at >= 0) return bag.splice(at, 1)[0]
    bag.length = 0
  }
  return (current + 1) % UNIVERSES.length
}
