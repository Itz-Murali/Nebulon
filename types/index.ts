export type Screen = 'loading' | 'menu' | 'playing' | 'paused' | 'over' | 'hangar' | 'settings'
export type Quality = 'low' | 'medium' | 'high'
export type ModeId = 'classic' | 'survival' | 'hyperdrive'

export interface ShipStats { speed: number; handling: number; hyper: number; magnet: number }
export interface ShipLook { style: 0 | 1 | 2 | 3 | 4; span: number; sweep: number; fin: number; engines: 2 | 3 | 4; hull: number; dark: number; glow: number; accent: number }
export interface ShipDef { id: string; name: string; role: string; desc: string; stats: ShipStats; look: ShipLook }
export interface ModeDef {
  id: ModeId; name: string; desc: string
  tier: string; perk: string; threat: 1 | 2 | 3
  speed: number; ramp: number; density: number; regen: number; hp: number
  dmg: number; heal: number; grace: number; lvlStep: number; lvlShift: number; maxPattern: number
  hazard: number; portal: number; evGap: [number, number]; epic: boolean
}
export type RealmId = 'crystal' | 'chrono' | 'living' | 'hole' | 'ocean' | 'frozen' | 'chaos' | 'corrupt'
export type AmbientId = 'rain' | 'hearts' | 'embers' | 'snow' | 'motes' | 'plankton' | 'spores' | 'petals' | 'dust' | 'shards' | 'bio' | 'bubbles' | 'static' | 'chrono'
export interface Era { name: string; patch: Partial<Universe> }
export interface Discovery { id: string; name: string; realm: RealmId; blurb: string; secret?: boolean }
export interface Universe { name: string; bg: number; rim: number; hue: number; styles: number[]; portal: [number, number]; sat?: number; lum?: number; neb?: number; planets?: number; galaxies?: number; clusters?: number; bh?: number; comets?: number; fields?: number; starMul?: number; tint?: number; ambient?: AmbientId | ''; exposure?: number; sky?: { top: number; bottom: number; acc: number; a: number; b: number; wash: number; aur: number; grid: number }; fog?: number; fogD?: number; sig?: string[]; sun?: number
  empty?: boolean
  realm?: RealmId
  late?: number
  stations?: number; iced?: boolean; chrono?: boolean; living?: boolean; chaos?: boolean; pull?: boolean; glitch?: number
  fieldColor?: number; fieldGlow?: number
  rock?: { color: number; emissive: number; k: number }
  heal?: number
  worm?: 'bio' | 'unstable'
  eras?: Era[]
  tag?: string
}

export interface Stats { runs: number; totalDist: number; totalEnergy: number; maxSpeed: number; bestDist: number; bestScore: number }
export interface Settings { volume: number; muted: boolean; quality: Quality; sens: number; reduceMotion: boolean; fpp: boolean; music: boolean }
export interface Save { v: number; pilot: string; ship: string; stats: Stats; settings: Settings; codex: string[] }

export interface HudState { dist: number; score: number; speed: number; energy: number; hyper: number; hyperOn: boolean; level: number; universe: string; warp: number; notice: string; hp: number; maxHp: number; hit: number; flash: string; cheat: boolean; glitch: number; storm: number; glare: number; tag: string; frost: number; scramble: boolean; corrupt: number; fpp: boolean; bank: number }
export interface RunResult { mode: ModeId; score: number; dist: number; energy: number; passed: number; time: number; maxSpeed: number; universes: number; found: string[] }
export interface RunReport { run: RunResult; recordScore: boolean; recordDist: boolean }
