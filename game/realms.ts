import * as THREE from 'three'
import type { Universe, RealmId } from '~/types'
import { dotMaterial } from './dots'
import { galaxyTexture, glowTexture, cloudTexture } from './cosmosTextures'
import { BH_FRAG } from './signature'

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt)
const pickOf = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

const FX = 5.6
const FY = 3.2
const SPAWN_Z = -190

export interface RealmHost {
  say(text: string): void
  burst(x: number, y: number, z: number, n: number, speed: number, r: number, g: number, b: number): void
  pulse(hex: number, x: number, y: number): void
  hurt(amount: number): void
  heal(amount: number): void
  hull(amount: number): void
  energy(n: number): void
  orb(x: number, y: number, z: number, type: number): void
  river(n: number): void
  quiet(dist: number): void
  portalSoon(seconds: number): void
  recharge(): void
  found(id: string): void
  sfx(name: 'orb' | 'hyper' | 'shield'): void
}

export interface RealmIn {
  dz: number
  speed: number
  px: number
  py: number
  sr: number
  magnet: number
  cheat: boolean
  hyper: boolean
  fpp: boolean
  visited: number
  infection: number
}

export interface RealmFx {
  fx: number
  fy: number
  spd: number
  drain: number
  handling: number
  invert: boolean
  fog: number
  roll: number
  frost: number
  scramble: boolean
  corrupt: number
  tag: string
}

interface Drift {
  obj: THREE.Object3D
  x: number
  y: number
  z: number
  k: number
  zEnd: number
  spawn(d: Drift, first: boolean): void
  tick?(dt: number, t: number, d: Drift): void
  disc?: string
  foundZ?: number
  done?: boolean
  onFound?(d: Drift): void
}

interface Plan { id: string; at: number; spawned: boolean; build: () => Drift }

const UPGRADES = ['Crystal Magnet', 'Lattice Hull', 'Prism Drive', 'Refraction Plating', 'Harmonic Core']
const CHAOS = ['flip', 'shear', 'invert', 'heavy', 'light', 'vortex', 'blackout', 'dilation'] as const
type ChaosKind = (typeof CHAOS)[number]
const CHAOS_TAG: Record<ChaosKind, string> = { flip: 'GRAVITY FLIP', shear: 'LATERAL SHEAR', invert: 'CONTROLS INVERTED', heavy: 'HEAVY GRAVITY', light: 'ZERO GRAVITY', vortex: 'VORTEX', blackout: 'NAVIGATION OFFLINE', dilation: 'TIME DILATION' }
const CHAOS_SAY: Record<ChaosKind, string> = {
  flip: 'Gravity is flipping',
  shear: 'Lateral shear: you are being dragged sideways',
  invert: 'Controls inverted',
  heavy: 'Heavy gravity: the ship will barely turn',
  light: 'Zero gravity: the ship overreacts',
  vortex: 'A vortex is spinning you around',
  blackout: 'Navigation offline: instruments unreliable',
  dilation: 'Time dilation: speed is warping'
}

const cv = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}
const tex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export class Realms {
  readonly group = new THREE.Group()
  readonly fx: RealmFx = { fx: 0, fy: 0, spd: 1, drain: 0, handling: 1, invert: false, fog: 1, roll: 0, frost: 0, scramble: false, corrupt: 0, tag: '' }
  up = { lv: 0, magnet: 0, drain: 1, regen: 1, dmg: 1, orb: 1 }
  crystals = 0

  private host: RealmHost
  private realm: RealmId | '' = ''
  private lite = 1
  private t = 0
  private time = 0
  private dist = 0
  private infection = 0
  private drifters: Drift[] = []
  private specials: Drift[] = []
  private plan: Plan[] = []
  private misses: Record<string, number> = {}
  private perSet: { dispose(): void }[] = []
  private cache = new Map<string, THREE.Texture>()
  private geo: Record<string, THREE.BufferGeometry> = {}
  private glow: THREE.Texture
  private ring: THREE.Texture
  private cheat = false
  private px = 0
  private py = 0
  private sr = 0.8

  private shards: { g: THREE.Group; active: boolean; x: number; y: number; z: number; ph: number }[] = []
  private shardAt = 0
  private aura: THREE.Sprite
  private wells: { g: THREE.Group; active: boolean; x: number; y: number; z: number; swirl: THREE.Mesh; ring: THREE.Sprite; mat: THREE.ShaderMaterial }[] = []
  private wellAt = 0
  private wellPull = 0

  private cur = { s: 'calm' as 'calm' | 'warn' | 'on', t: 8, kind: 'jet' as 'jet' | 'rip', dir: 1 }
  private flow: THREE.Points
  private flowPos = new Float32Array(150 * 3)
  private flowCol = new Float32Array(150 * 3)
  private flowK = 0
  private front = { s: 'calm' as 'calm' | 'warn' | 'on', t: 9 }
  private immune = 0
  private mist: { s: THREE.Sprite; x: number; y: number; z: number }[] = []
  private mistK = 0
  private zone = { s: 'calm' as 'calm' | 'warn' | 'on', t: 6, kind: 'flip' as ChaosKind, dir: 1 }
  private calmT = 0
  private jitter = 0
  private popups: { m: THREE.Mesh; life: number }[] = []
  private popAt = 0
  private glitchPulse = 0

  constructor(private scene: THREE.Scene, host: RealmHost) {
    this.host = host
    this.glow = glowTexture('255,255,255', 128)
    this.ring = this.ringTex()
    this.group.visible = true
    scene.add(this.group)

    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0x5ae6ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }))
    this.aura.visible = false
    this.group.add(this.aura)

    const fg = new THREE.BufferGeometry()
    for (let i = 0; i < 150; i++) this.flowCol[i * 3] = this.flowCol[i * 3 + 1] = this.flowCol[i * 3 + 2] = 0.8
    fg.setAttribute('position', new THREE.BufferAttribute(this.flowPos, 3))
    fg.setAttribute('color', new THREE.BufferAttribute(this.flowCol, 3))
    this.flow = new THREE.Points(fg, dotMaterial(0.28, true, 0, true))
    this.flow.frustumCulled = false
    this.flow.visible = false
    this.group.add(this.flow)

    this.buildShards()
    this.buildWells()
    this.buildMist()
    for (let i = 0; i < 6; i++) {
      const g = new THREE.IcosahedronGeometry(1, 0)
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x00ffe0, wireframe: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))
      m.visible = false
      this.group.add(m)
      this.popups.push({ m, life: 0 })
    }
  }

  private keep<T extends { dispose(): void }>(x: T): T {
    this.perSet.push(x)
    return x
  }

  private cached(key: string, make: () => THREE.Texture): THREE.Texture {
    let t = this.cache.get(key)
    if (!t) {
      t = make()
      this.cache.set(key, t)
    }
    return t
  }

  private ringTex(): THREE.Texture {
    const [c, x] = cv(256, 256)
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.8, 'rgba(255,255,255,0)')
    g.addColorStop(0.9, 'rgba(255,255,255,0.95)')
    g.addColorStop(0.96, 'rgba(255,255,255,0.3)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 256, 256)
    return tex(c)
  }

  private spr(map: THREE.Texture, color: number, size: number, op: number, add = true): THREE.Sprite {
    const s = new THREE.Sprite(this.keep(new THREE.SpriteMaterial({ map, color, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false, opacity: op })))
    s.scale.set(size, size, 1)
    return s
  }

  private g(name: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    return (this.geo[name] ??= make())
  }

  setLite(level: number): void {
    this.lite = level
  }

  reset(): void {
    this.crystals = 0
    this.up = { lv: 0, magnet: 0, drain: 1, regen: 1, dmg: 1, orb: 1 }
    this.misses = {}
    this.infection = 0
    this.clear()
    this.realm = ''
  }

  private clear(): void {
    for (const d of [...this.drifters, ...this.specials]) this.group.remove(d.obj)
    this.drifters = []
    this.specials = []
    this.plan = []
    for (const d of this.perSet) d.dispose()
    this.perSet = []
    for (const s of this.shards) { s.active = false; s.g.visible = false }
    for (const w of this.wells) { w.active = false; w.g.visible = false }
    for (const p of this.popups) { p.life = 0; p.m.visible = false }
    for (const m of this.mist) m.s.visible = false
    this.flow.visible = false
    this.aura.visible = false
    this.wellPull = 0
    this.flowK = 0
    this.mistK = 0
  }

  set(u: Universe, ctx: { visited: number; infection: number; cheat: boolean }): void {
    this.clear()
    this.realm = u.realm ?? ''
    this.infection = ctx.infection
    this.cheat = ctx.cheat
    this.time = 0
    this.dist = 0
    this.shardAt = rnd(18, 30)
    this.wellAt = rnd(80, 140)
    this.cur = { s: 'calm', t: rnd(8, 13), kind: 'jet', dir: 1 }
    this.front = { s: 'calm', t: rnd(8, 12) }
    this.zone = { s: 'calm', t: rnd(5, 8), kind: 'flip', dir: 1 }
    this.calmT = 0
    this.popAt = rnd(2, 5)
    this.buildScenery()
    this.planDiscoveries()
  }

  private planDiscoveries(): void {
    const add = (id: string, chance: number, lo: number, hi: number, build: () => Drift) => {
      const p = clamp(chance + 0.18 * (this.misses[id] ?? 0), 0, 1)
      if (this.cheat || Math.random() < p) this.plan.push({ id, at: this.cheat ? rnd(2, 4) : rnd(lo, hi), spawned: false, build })
      else this.misses[id] = (this.misses[id] ?? 0) + 1
    }
    switch (this.realm) {
      case 'crystal': add('geode', 0.4, 7, 16, () => this.buildGeode()); break
      case 'chrono': add('eternal', 0.3, 7, 18, () => this.buildEternal()); break
      case 'living':
        add('mimic', 0.75, 5, 11, () => this.buildMimic())
        add('titan', 0.3, 14, 24, () => this.buildTitan())
        break
      case 'hole': add('forge', 0.4, 8, 18, () => this.buildForge()); break
      case 'ocean': add('upwelling', 0.4, 8, 18, () => this.buildUpwelling()); break
      case 'frozen': add('relic', 0.4, 8, 18, () => this.buildRelic()); break
      case 'chaos': add('origin', 0.35, 10, 22, () => this.buildOrigin()); break
      case 'corrupt': add('patientzero', 0.35, 8, 18, () => this.buildPatientZero()); break
    }
  }

  setCheat(v: boolean): void {
    this.cheat = v
  }

  update(dt: number, i: RealmIn): RealmFx {
    this.t += dt
    this.time += dt
    this.px = i.px
    this.py = i.py
    this.sr = i.sr
    this.dist += i.dz
    const f = this.fx
    f.fx = f.fy = 0
    f.spd = 1
    f.drain = 0
    f.handling = 1
    f.invert = false
    f.fog = 1
    f.roll = 0
    f.scramble = false
    f.tag = ''
    let corrupt = 0

    switch (this.realm) {
      case 'crystal': this.updShards(dt, i); break
      case 'hole': this.updWells(dt, i); break
      case 'ocean': this.updCurrents(dt, i); break
      case 'frozen': this.updFront(dt, i); break
      case 'chaos': this.updChaos(dt, i); break
      case 'corrupt': corrupt = 0.35; break
    }
    if (this.realm !== 'frozen') f.frost += (0 - f.frost) * damp(3, dt)

    const infect = this.realm === 'corrupt' ? 1 : this.infection > 0 ? clamp(0.25 * this.infection, 0, 0.6) : 0
    if (infect > 0) {
      this.popAt -= dt
      if (this.popAt <= 0) {
        this.popAt = rnd(0.6, 2.2) / (infect + 0.2)
        this.popup()
      }
      this.glitchPulse -= dt
      if (this.glitchPulse <= 0) this.glitchPulse = rnd(1.5, 4) / (infect + 0.3)
      corrupt = Math.max(corrupt, 0)
      corrupt = infect * (0.18 + (this.glitchPulse < 0.12 ? 0.55 : 0))
    }
    for (const p of this.popups) {
      if (p.life <= 0) continue
      p.life -= dt
      p.m.position.z += i.dz
      p.m.rotation.x += dt * 2
      p.m.rotation.y += dt * 1.4
      p.m.visible = p.life > 0 && (p.life > 0.35 || Math.random() < 0.5)
      if (p.life <= 0) p.m.visible = false
    }
    f.corrupt = corrupt

    this.updDrifters(dt, i)
    this.updPlan()

    const lv = this.up.lv
    this.aura.visible = lv > 0 && !i.fpp
    if (this.aura.visible) {
      this.aura.position.set(i.px, i.py, 0.4)
      this.aura.scale.setScalar(3.2 + lv * 0.7 + Math.sin(this.t * 3) * 0.15)
      ;(this.aura.material as THREE.SpriteMaterial).opacity = 0.16 + lv * 0.06
    }

    if (this.cheat) {
      f.fx = f.fy = 0
      f.drain = 0
      f.invert = false
      f.handling = 1
      f.scramble = false
      f.roll *= 0.4
    }
    return f
  }

  onOrb(type: number): void {
    if (this.realm === 'frozen' && type === 2 && this.front.s === 'on') this.front.t -= 3
  }

  private addDrifters(n: number, build: () => Drift): void {
    for (let k = 0; k < n; k++) {
      const d = build()
      d.spawn(d, true)
      d.obj.position.set(d.x, d.y, d.z)
      this.group.add(d.obj)
      this.drifters.push(d)
    }
  }

  private updDrifters(dt: number, i: RealmIn): void {
    for (const d of this.drifters) {
      d.z += i.dz * d.k
      d.obj.position.set(d.x, d.y, d.z)
      d.tick?.(dt, this.t, d)
      if (d.z > d.zEnd) d.spawn(d, false)
    }
    for (let n = this.specials.length - 1; n >= 0; n--) {
      const d = this.specials[n]
      d.z += i.dz * d.k
      d.obj.position.set(d.x, d.y, d.z)
      d.tick?.(dt, this.t, d)
      if (!d.done && d.disc && d.z > (d.foundZ ?? -200)) {
        d.done = true
        this.misses[d.disc] = 0
        this.host.found(d.disc)
        d.onFound?.(d)
      }
      if (d.z > d.zEnd) {
        this.group.remove(d.obj)
        this.specials.splice(n, 1)
      }
    }
  }

  private updPlan(): void {
    if (this.specials.length) return
    for (const p of this.plan) {
      if (p.spawned || this.time < p.at) continue
      p.spawned = true
      const d = p.build()
      d.disc = p.id
      d.spawn(d, true)
      d.obj.position.set(d.x, d.y, d.z)
      this.group.add(d.obj)
      this.specials.push(d)
      return
    }
  }

  private buildShards(): void {
    const geo = new THREE.OctahedronGeometry(0.5)
    for (let n = 0; n < 12; n++) {
      const g = new THREE.Group()
      const cyan = n % 2 === 0
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cyan ? 0x6af0ff : 0xc090ff }))
      m.scale.set(0.55, 1.15, 0.55)
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: cyan ? 0x38d8ff : 0xa070ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 }))
      halo.scale.setScalar(2.4)
      g.add(halo, m)
      g.visible = false
      this.group.add(g)
      this.shards.push({ g, active: false, x: 0, y: 0, z: 0, ph: rnd(0, 6) })
    }
  }

  private updShards(dt: number, i: RealmIn): void {
    const f = this.fx
    this.shardAt -= i.dz
    if (this.shardAt <= 0) {
      this.shardAt = rnd(30, 52)
      const n = 1 + Math.floor(Math.random() * 3)
      let x = rnd(-FX + 0.8, FX - 0.8)
      let y = rnd(-FY + 0.7, FY - 0.7)
      for (let k = 0; k < n; k++) {
        const s = this.shards.find(p => !p.active)
        if (!s) break
        s.active = true
        s.x = clamp(x, -FX, FX)
        s.y = clamp(y, -FY, FY)
        s.z = SPAWN_Z - k * 9
        s.g.visible = true
        x += rnd(-1.6, 1.6)
        y += rnd(-0.9, 0.9)
      }
    }
    for (const s of this.shards) {
      if (!s.active) continue
      s.z += i.dz
      const dx = i.px - s.x
      const dy = i.py - s.y
      const d2 = dx * dx + dy * dy
      if (s.z > -14 && s.z < 4 && (i.cheat || d2 < i.magnet * i.magnet)) {
        const a = damp(i.cheat ? 8 : 6, dt)
        s.x += dx * a
        s.y += dy * a
      }
      s.g.position.set(s.x, s.y + Math.sin(this.t * 3 + s.ph) * 0.15, s.z)
      s.g.rotation.y += dt * 2.4
      if (s.z > 12) { s.active = false; s.g.visible = false; continue }
      const zc = s.z >= 0 && s.z - i.dz <= 0 ? 0 : Math.min(Math.abs(s.z), Math.abs(s.z - i.dz))
      if (d2 + zc * zc < 1.7 * 1.7 || (i.cheat && s.z > -2 && d2 < 6)) this.collectShard(s)
    }
    const next = this.up.lv >= UPGRADES.length ? 'MAX' : `${this.crystals % 4}/4`
    f.tag = this.up.lv > 0 || this.crystals > 0 ? `CRYSTAL Lv ${this.up.lv}  ${next}` : 'COLLECT SHARDS'
  }

  private collectShard(s: { g: THREE.Group; active: boolean; x: number; y: number; z: number }): void {
    s.active = false
    s.g.visible = false
    this.host.burst(s.x, s.y, s.z, 14, 4, 0.4, 0.9, 1)
    this.host.sfx('orb')
    this.crystals++
    if (this.up.lv >= UPGRADES.length) {
      this.host.heal(4)
      return
    }
    if (this.crystals % 4 !== 0) return
    const lv = ++this.up.lv
    const name = UPGRADES[lv - 1]
    switch (lv) {
      case 1: this.up.magnet = 1.6; break
      case 2: this.host.hull(20); break
      case 3: this.up.drain = 0.7; this.up.regen = 1.3; break
      case 4: this.up.dmg = 0.8; break
      case 5: this.up.orb = 2; break
    }
    this.host.say(`Crystal upgrade ${lv}/5: ${name}`)
    this.host.pulse(0x6af0ff, this.px, this.py)
    this.host.burst(this.px, this.py, 0, 60, 9, 0.5, 0.9, 1)
    this.host.sfx('hyper')
  }

  private buildWells(): void {
    const frag = `uniform float t;varying vec2 vUv;
void main(){
  vec2 p=(vUv-0.5)*2.0;float r=length(p);if(r>1.0)discard;
  float a=atan(p.y,p.x);
  float sw=0.5+0.5*sin(a*3.0+r*18.0-t*4.0);
  float disk=smoothstep(0.16,0.3,r)*(1.0-smoothstep(0.65,1.0,r));
  float core=1.0-smoothstep(0.1,0.16,r);
  vec3 col=mix(vec3(1.0,0.35,0.08),vec3(1.0,0.85,0.55),1.0-r)*disk*(0.4+sw);
  gl_FragColor=vec4(col,clamp(disk*(0.35+0.5*sw)+core,0.0,1.0));
}`
    const geo = new THREE.PlaneGeometry(2, 2)
    const core = new THREE.SphereGeometry(1, 20, 14)
    for (let n = 0; n < 3; n++) {
      const g = new THREE.Group()
      const mat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
      const swirl = new THREE.Mesh(geo, mat)
      swirl.scale.setScalar(6)
      const hole = new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color: 0x000000 }))
      hole.scale.setScalar(1.05)
      const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ring, color: 0xffb070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }))
      ring.scale.setScalar(15)
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xff7a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.4 }))
      glow.scale.setScalar(12)
      g.add(glow, swirl, hole, ring)
      g.visible = false
      this.group.add(g)
      this.wells.push({ g, active: false, x: 0, y: 0, z: 0, swirl, ring, mat })
    }
  }

  private updWells(dt: number, i: RealmIn): void {
    const f = this.fx
    this.wellAt -= i.dz
    if (this.wellAt <= 0) {
      this.wellAt = rnd(190, 300)
      const w = this.wells.find(p => !p.active)
      if (w) {
        w.active = true
        w.x = rnd(-FX + 1, FX - 1)
        w.y = rnd(-FY + 0.8, FY - 0.8)
        w.z = SPAWN_Z - 20
        w.g.visible = true
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + 0.4
          this.host.orb(w.x + Math.cos(a) * 3.4, w.y + Math.sin(a) * 2.4, w.z, k === 0 ? 1 : 0)
        }
      }
    }
    let pull = 0
    for (const w of this.wells) {
      if (!w.active) continue
      w.z += i.dz
      w.g.position.set(w.x, w.y, w.z)
      w.mat.uniforms.t.value = this.t
      w.swirl.rotation.z += dt * 0.8
      w.ring.scale.setScalar(15 + Math.sin(this.t * 2.2) * 1.2)
      if (w.z > 14) { w.active = false; w.g.visible = false; continue }
      const win = w.z < -6 ? smooth(-70, -6, w.z) : 1 - smooth(-6, 10, w.z)
      const dx = w.x - i.px
      const dy = w.y - i.py
      const d = Math.max(0.4, Math.hypot(dx, dy))
      const R = 7.5
      if (d < R && win > 0) {
        const mag = 7.5 * Math.pow(1 - d / R, 1.2) * win
        f.fx += (dx / d) * mag
        f.fy += (dy / d) * mag
        f.roll += clamp((-dx / d) * mag * 0.012, -0.12, 0.12)
        pull = Math.max(pull, mag / 7.5)
      }
      const zc = w.z >= 0 && w.z - i.dz <= 0 ? 0 : Math.min(Math.abs(w.z), Math.abs(w.z - i.dz))
      const rr = 1.15 + i.sr * 0.8
      if (!i.cheat && dx * dx + dy * dy + zc * zc < rr * rr) {
        w.active = false
        w.g.visible = false
        this.host.burst(w.x, w.y, w.z, 40, 8, 1, 0.5, 0.15)
        this.host.hurt(30)
      }
    }
    this.wellPull += (pull - this.wellPull) * damp(5, dt)
    if (this.wellPull > 0.15) f.tag = 'GRAVITY WELL'
  }

  private updCurrents(dt: number, i: RealmIn): void {
    const f = this.fx
    const c = this.cur
    f.fx += Math.sin(this.time * 0.35) * 1.2
    c.t -= dt
    if (c.s === 'calm' && c.t <= 0) {
      c.s = 'warn'
      c.t = 2
      c.kind = Math.random() < 0.55 ? 'jet' : 'rip'
      c.dir = Math.random() < 0.5 ? -1 : 1
      this.host.say(c.kind === 'jet' ? 'Cosmic current ahead: a tailwind' : `Cosmic current ahead: a crosswind to the ${c.dir > 0 ? 'right' : 'left'}`)
      this.host.quiet(i.speed * 8.5)
      this.seedFlow(c.kind, c.dir)
    } else if (c.s === 'warn' && c.t <= 0) {
      c.s = 'on'
      c.t = c.kind === 'jet' ? rnd(3.5, 5) : rnd(4, 5.5)
      this.host.sfx('hyper')
    } else if (c.s === 'on' && c.t <= 0) {
      c.s = 'calm'
      c.t = rnd(11, 17)
    }
    const target = c.s === 'on' ? 1 : c.s === 'warn' ? 0.35 : 0
    this.flowK += (target - this.flowK) * damp(3, dt)
    const live = c.s === 'on' ? 1 : 0
    if (live) {
      if (c.kind === 'jet') f.spd = 1.4
      else {
        f.fx += c.dir * 8
        f.roll += -c.dir * 0.1
      }
    }
    this.flow.visible = this.flowK > 0.02
    if (this.flow.visible) {
      ;(this.flow.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.flowK * 0.85
      const p = this.flowPos
      const sp = (i.speed + 40) * dt
      for (let n = 0; n < 150; n++) {
        const o = n * 3
        if (c.kind === 'jet') {
          p[o + 2] += sp * 1.6
          if (p[o + 2] > 6) { p[o] = rnd(-12, 12); p[o + 1] = rnd(-7, 7); p[o + 2] = rnd(-130, -90) }
        } else {
          p[o] += c.dir * 38 * dt
          p[o + 2] += i.dz * 0.5
          if (Math.abs(p[o]) > 20 || p[o + 2] > 6) { p[o] = -c.dir * 18; p[o + 1] = rnd(-7, 7); p[o + 2] = rnd(-90, -4) }
        }
      }
      ;(this.flow.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
    if (c.s !== 'calm') f.tag = c.s === 'warn' ? 'CURRENT AHEAD' : c.kind === 'jet' ? 'CURRENT: TAILWIND' : 'CURRENT: CROSSWIND'
  }

  private seedFlow(kind: 'jet' | 'rip', dir: number): void {
    const p = this.flowPos
    for (let n = 0; n < 150; n++) {
      p[n * 3] = kind === 'jet' ? rnd(-12, 12) : rnd(-18, 18) * dir
      p[n * 3 + 1] = rnd(-7, 7)
      p[n * 3 + 2] = kind === 'jet' ? rnd(-130, 4) : rnd(-90, -4)
    }
  }

  private buildMist(): void {
    for (let n = 0; n < 12; n++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xcfeaff, transparent: true, depthWrite: false, opacity: 0 }))
      s.scale.setScalar(rnd(22, 40))
      s.visible = false
      this.group.add(s)
      this.mist.push({ s, x: rnd(-14, 14), y: rnd(-8, 8), z: rnd(-90, -5) })
    }
  }

  private updFront(dt: number, i: RealmIn): void {
    const f = this.fx
    const fr = this.front
    this.immune = Math.max(0, this.immune - dt)
    fr.t -= dt
    if (fr.s === 'calm' && fr.t <= 0) {
      fr.s = 'warn'
      fr.t = 2
      this.host.say('Cold front approaching: hyperdrive will drain')
    } else if (fr.s === 'warn' && fr.t <= 0) {
      fr.s = 'on'
      fr.t = rnd(8, 11)
    } else if (fr.s === 'on' && fr.t <= 0) {
      fr.s = 'calm'
      fr.t = rnd(10, 15)
      this.host.say('The cold front passes')
    }
    const hot = this.immune > 0
    const target = hot ? 0 : fr.s === 'on' ? 0.85 : fr.s === 'warn' ? 0.15 : 0
    f.frost += (target - f.frost) * damp(1.4, dt)
    if (fr.s === 'on' && !hot) {
      f.drain = 15
      f.handling = 0.78
      f.fog = 1.8
    } else if (fr.s === 'warn') f.fog = 1.25
    this.mistK += ((fr.s === 'on' && !hot ? 1 : fr.s === 'warn' ? 0.4 : 0) - this.mistK) * damp(2, dt)
    for (const m of this.mist) {
      m.s.visible = this.mistK > 0.03
      if (!m.s.visible) continue
      m.z += i.dz * 0.9
      if (m.z > 8) { m.z = rnd(-110, -80); m.x = rnd(-14, 14); m.y = rnd(-8, 8) }
      m.s.position.set(m.x, m.y, m.z)
      ;(m.s.material as THREE.SpriteMaterial).opacity = this.mistK * 0.22 * smooth(-110, -70, m.z) * (1 - smooth(-14, 6, m.z))
    }
    f.tag = hot ? 'THERMAL CORE' : fr.s === 'on' ? 'COLD FRONT' : fr.s === 'warn' ? 'FROST WARNING' : ''
  }

  private updChaos(dt: number, i: RealmIn): void {
    const f = this.fx
    const z = this.zone
    if (this.calmT > 0) {
      this.calmT -= dt
      f.tag = 'STABLE REGION'
      return
    }
    z.t -= dt
    if (z.s === 'calm' && z.t <= 0) {
      z.s = 'warn'
      z.t = 1.6
      z.kind = pickOf([...CHAOS])
      z.dir = Math.random() < 0.5 ? -1 : 1
      this.host.say('Physics anomaly ahead')
    } else if (z.s === 'warn' && z.t <= 0) {
      z.s = 'on'
      z.t = rnd(5, 8)
      this.host.say(CHAOS_SAY[z.kind])
      this.host.pulse(0xff2a8a, this.px, this.py)
    } else if (z.s === 'on' && z.t <= 0) {
      z.s = 'calm'
      z.t = rnd(5, 9)
      this.host.say('Physics stabilising')
    }
    if (z.s === 'warn') f.tag = 'ANOMALY'
    if (z.s !== 'on') return
    f.tag = CHAOS_TAG[z.kind]
    const ramp = smooth(0, 0.5, z.t < 0.5 ? z.t : 0.5)
    const lead = smooth(0, 0.4, 1) * ramp
    switch (z.kind) {
      case 'flip': f.fy = z.dir * 6.5 * lead; f.roll = z.dir * 0.3 * lead; break
      case 'shear': f.fx = z.dir * 7 * lead; f.roll = -z.dir * 0.12 * lead; break
      case 'invert': f.invert = true; break
      case 'heavy': f.handling = 0.45; break
      case 'light': f.handling = 1.9; break
      case 'vortex': f.fx = -this.py * 2.4 * lead; f.fy = this.px * 2.4 * lead; f.roll = Math.sin(this.t * 2) * 0.2; break
      case 'blackout':
        f.scramble = true
        this.jitter += (rnd(-1, 1) - this.jitter) * damp(6, dt)
        f.fx = this.jitter * 5
        f.fy = Math.cos(this.t * 3) * 2
        break
      case 'dilation': f.spd = 0.6 + 0.8 * (0.5 + 0.5 * Math.sin(this.t * 1.6)); break
    }
    void i
  }

  private popup(): void {
    const p = this.popups.find(x => x.life <= 0)
    if (!p) return
    const shapes = ['oct', 'ico', 'tet', 'dod', 'box'] as const
    const shape = pickOf([...shapes])
    const geo = this.g('pop_' + shape, () => {
      switch (shape) {
        case 'oct': return new THREE.OctahedronGeometry(1)
        case 'ico': return new THREE.IcosahedronGeometry(1, 0)
        case 'tet': return new THREE.TetrahedronGeometry(1)
        case 'dod': return new THREE.DodecahedronGeometry(1)
        default: return new THREE.BoxGeometry(1.4, 1.4, 1.4)
      }
    })
    p.m.geometry = geo
    ;(p.m.material as THREE.MeshBasicMaterial).color.setHex(pickOf([0xff00aa, 0x00ffe0, 0xffffff]))
    const sd = Math.random() < 0.5 ? -1 : 1
    p.m.position.set(sd * rnd(5, 26), rnd(-10, 12), rnd(-150, -60))
    p.m.scale.setScalar(rnd(1.5, 6))
    p.life = rnd(0.7, 2.6)
    p.m.visible = true
  }

  private sideSpawn(d: Drift, first: boolean, xr: [number, number], yr: [number, number]): void {
    const sd = Math.random() < 0.5 ? -1 : 1
    d.x = sd * rnd(xr[0], xr[1])
    d.y = rnd(yr[0], yr[1])
    d.z = first ? rnd(-380, -30) : -380 - rnd(0, 50)
  }

  private buildScenery(): void {
    const L = this.lite
    const n = (a: number, b: number, c: number) => (L === 0 ? a : L === 1 ? b : c)
    switch (this.realm) {
      case 'crystal': this.addDrifters(n(2, 4, 6), () => this.crystalDrift()); break
      case 'chrono':
        this.addDrifters(n(2, 3, 5), () => this.frozenDebris())
        this.addDrifters(n(1, 2, 3), () => this.timeRipple())
        break
      case 'ocean': this.addDrifters(n(3, 5, 7), () => this.island()); break
      case 'frozen': this.addDrifters(n(3, 5, 8), () => this.iceChunk()); break
      case 'chaos': this.addDrifters(n(3, 5, 8), () => this.chaosShape()); break
      case 'corrupt': this.addDrifters(n(5, 8, 12), () => this.fragment()); break
    }
  }

  private crystalDrift(): Drift {
    const g = new THREE.Group()
    const geo = this.g('hexcone', () => new THREE.CylinderGeometry(0, 1, 2.4, 6, 1))
    const mat = this.keep(new THREE.MeshPhysicalMaterial({ color: 0x7ad8ff, emissive: 0x2a60d0, emissiveIntensity: 0.9, roughness: 0.1, transparent: true, opacity: 0.72, flatShading: true }))
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(rnd(-1.2, 1.2), rnd(0.2, 1.4), rnd(-1.2, 1.2))
      m.scale.set(rnd(0.5, 1.1), rnd(0.8, 2), rnd(0.5, 1.1))
      m.rotation.set(rnd(-0.6, 0.6), rnd(0, 6), rnd(-0.6, 0.6))
      g.add(m)
    }
    g.add(this.spr(this.glow, pickOf([0x38e0ff, 0xa070ff]), 9, 0.4))
    const sc = rnd(1.6, 3.4)
    g.scale.setScalar(sc)
    const sp = rnd(0.1, 0.4)
    return { obj: g, x: 0, y: 0, z: 0, k: 1, zEnd: 20, spawn: (d, f) => this.sideSpawn(d, f, [9, 40], [-14, 16]), tick: dt => { g.rotation.y += dt * sp } }
  }

  private frozenDebris(): Drift {
    const g = new THREE.Group()
    const geo = this.g('shard', () => new THREE.BoxGeometry(0.4, 0.15, 1.6))
    const mat = this.keep(new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.85 }))
    const dir = new THREE.Vector3()
    for (let i = 0; i < 16; i++) {
      dir.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize()
      const m = new THREE.Mesh(geo, mat)
      const r = rnd(2, 8)
      m.position.copy(dir).multiplyScalar(r)
      m.lookAt(dir.clone().multiplyScalar(r * 2))
      m.scale.setScalar(rnd(0.7, 1.9))
      g.add(m)
    }
    g.add(this.spr(this.glow, 0xdff4ff, 30, 0.22), this.spr(this.ring, 0xbfe0ff, 26, 0.45))
    return { obj: g, x: 0, y: 0, z: 0, k: 1, zEnd: 20, spawn: (d, f) => this.sideSpawn(d, f, [10, 38], [-10, 14]) }
  }

  private timeRipple(): Drift {
    const s = this.spr(this.ring, pickOf([0xffc070, 0xb48cff]), 20, 0)
    const per = rnd(3, 5)
    const off = rnd(0, 5)
    return {
      obj: s, x: 0, y: 0, z: 0, k: 0.6, zEnd: 10,
      spawn: (d, f) => this.sideSpawn(d, f, [18, 60], [-14, 30]),
      tick: (dt, t) => {
        const k = ((t + off) % per) / per
        s.scale.setScalar(10 + 120 * k)
        ;(s.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.6
      }
    }
  }

  private island(): Drift {
    const g = new THREE.Group()
    const rock = new THREE.Mesh(
      this.g('islandRock', () => new THREE.IcosahedronGeometry(1, 1)),
      this.keep(new THREE.MeshStandardMaterial({ color: 0x5a6a78, roughness: 0.9, flatShading: true, emissive: 0x0a2a3a, emissiveIntensity: 0.6 }))
    )
    const w = rnd(5, 12)
    rock.scale.set(w, rnd(1.6, 3.2), w * rnd(0.6, 1))
    g.add(rock)
    g.add(this.spr(this.glow, 0x2ad8ff, w * 2.6, 0.28))
    for (let i = 0; i < 4; i++) {
      const l = this.spr(this.glow, pickOf([0x5affc0, 0x9affff]), rnd(2, 4), 0.9)
      l.position.set(rnd(-w * 0.6, w * 0.6), rock.scale.y * 0.9 + 0.3, rnd(-w * 0.4, w * 0.4))
      g.add(l)
    }
    const ph = rnd(0, 6)
    return {
      obj: g, x: 0, y: 0, z: 0, k: 1, zEnd: 20,
      spawn: (d, f) => this.sideSpawn(d, f, [11, 55], [-14, 18]),
      tick: (dt, t, d) => {
        g.position.y = d.y + Math.sin(t * 0.6 + ph) * 1.3
        g.rotation.y += dt * 0.05
        g.rotation.z = Math.sin(t * 0.4 + ph) * 0.06
      }
    }
  }

  private iceChunk(): Drift {
    const g = new THREE.Group()
    const geo = this.g(Math.random() < 0.5 ? 'iceOct' : 'iceIco', () => (Math.random() < 0.5 ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 0)))
    const m = new THREE.Mesh(geo, this.keep(new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.25, emissive: 0x2a5a90, emissiveIntensity: 0.6, flatShading: true, transparent: true, opacity: 0.88 })))
    m.scale.set(rnd(2, 8), rnd(2, 9), rnd(2, 8))
    g.add(m, this.spr(this.glow, 0x9ad8ff, 20, 0.22))
    const sp = new THREE.Vector2(rnd(-0.3, 0.3), rnd(-0.3, 0.3))
    return { obj: g, x: 0, y: 0, z: 0, k: 1, zEnd: 20, spawn: (d, f) => this.sideSpawn(d, f, [9, 45], [-14, 18]), tick: dt => { m.rotation.x += sp.x * dt; m.rotation.y += sp.y * dt } }
  }

  private chaosShape(): Drift {
    const g = new THREE.Group()
    const col = pickOf([0xff2a8a, 0x2affe0, 0xffe02a])
    const mk = (geo: THREE.BufferGeometry, c: number) => new THREE.Mesh(geo, this.keep(new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })))
    const parts: THREE.Mesh[] = []
    if (Math.random() < 0.5) parts.push(mk(this.keep(new THREE.TorusKnotGeometry(2, 0.5, 64, 8)), col))
    else {
      parts.push(mk(this.g('ico2', () => new THREE.IcosahedronGeometry(2.4, 1)), col), mk(this.g('ico0', () => new THREE.IcosahedronGeometry(1.6, 0)), 0xffffff), mk(this.g('oct1', () => new THREE.OctahedronGeometry(1)), pickOf([0xff2a8a, 0x2affe0])))
    }
    parts.forEach(m => g.add(m))
    const sp = parts.map(() => new THREE.Vector3(rnd(-1.5, 1.5), rnd(-1.5, 1.5), rnd(-1.5, 1.5)))
    let jump = rnd(1, 3)
    const ph = rnd(0, 6)
    g.scale.setScalar(rnd(1.2, 2.6))
    return {
      obj: g, x: 0, y: 0, z: 0, k: 1, zEnd: 20,
      spawn: (d, f) => this.sideSpawn(d, f, [9, 40], [-12, 16]),
      tick: (dt, t, d) => {
        parts.forEach((m, i) => { m.rotation.x += sp[i].x * dt * (i % 2 ? -1 : 1); m.rotation.y += sp[i].y * dt; m.rotation.z += sp[i].z * dt })
        jump -= dt
        if (jump <= 0) {
          jump = rnd(1.2, 3.5)
          d.x = -d.x * rnd(0.6, 1.2)
          d.y = clamp(d.y + rnd(-6, 6), -14, 18)
          if (Math.abs(d.x) < 9) d.x = Math.sign(d.x || 1) * 9
        }
        g.scale.setScalar(g.scale.x + (Math.max(0.6, 1.6 + Math.sin(t * 2 + ph) * 0.8) - g.scale.x) * 0.05)
      }
    }
  }

  private fragment(): Drift {
    const g = new THREE.Group()
    const type = Math.floor(Math.random() * 3)
    let step = rnd(0, 1)
    if (type === 0) {
      const m = new THREE.Mesh(this.g('cube', () => new THREE.BoxGeometry(1, 1, 1)), this.keep(new THREE.MeshBasicMaterial({ map: this.cached('checker', checkerTex), color: 0xffffff })))
      m.scale.setScalar(rnd(2, 7))
      g.add(m)
    } else if (type === 1) {
      const geo = this.g('shellPart', () => new THREE.SphereGeometry(1, 14, 10, 0, 4.2, 0, 2.4))
      const w = new THREE.Mesh(geo, this.keep(new THREE.MeshBasicMaterial({ color: 0x00ffe0, wireframe: true, side: THREE.DoubleSide })))
      const s = new THREE.Mesh(geo, this.keep(new THREE.MeshBasicMaterial({ color: 0x120018, side: THREE.BackSide })))
      s.scale.setScalar(0.985)
      g.add(w, s)
      g.scale.setScalar(rnd(3, 9))
    } else {
      const pg = this.keep(new THREE.PlaneGeometry(1, 1, 6, 6))
      const idx = Array.from(pg.index!.array as ArrayLike<number>)
      const keep: number[] = []
      for (let i = 0; i < idx.length; i += 3) if (Math.random() < 0.62) keep.push(idx[i], idx[i + 1], idx[i + 2])
      pg.setIndex(keep)
      g.add(new THREE.Mesh(pg, this.keep(new THREE.MeshBasicMaterial({ color: pickOf([0xff00aa, 0x00ffe0]), wireframe: true, side: THREE.DoubleSide }))))
      g.scale.setScalar(rnd(6, 16))
    }
    g.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6))
    return {
      obj: g, x: 0, y: 0, z: 0, k: 1, zEnd: 20,
      spawn: (d, f) => this.sideSpawn(d, f, [8, 42], [-14, 18]),
      tick: (dt, t, d) => {
        step -= dt
        if (step <= 0) {
          step = rnd(0.25, 0.9)
          g.rotation.x += (Math.PI / 4) * Math.floor(rnd(1, 3))
          g.rotation.y += (Math.PI / 6) * Math.floor(rnd(1, 3))
        }
        g.position.x = d.x + (Math.random() < 0.04 ? rnd(-0.8, 0.8) : 0)
        g.visible = Math.random() > 0.015
        void t
      }
    }
  }

  private big(d: Partial<Drift> & { obj: THREE.Object3D }): Drift {
    return { x: 0, y: 0, z: -420, k: 0.45, zEnd: 40, foundZ: -240, spawn: () => {}, ...d }
  }

  private place(d: Drift, x: number, y: number, z = -420): void {
    d.x = x * (Math.random() < 0.5 ? -1 : 1)
    d.y = y
    d.z = z
  }

  private buildGeode(): Drift {
    const g = new THREE.Group()
    const geo = this.g('geoOct', () => new THREE.OctahedronGeometry(1, 0))
    const shell = new THREE.Mesh(geo, this.keep(new THREE.MeshPhysicalMaterial({ color: 0x8ae6ff, emissive: 0x2a60d0, emissiveIntensity: 0.5, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, flatShading: true, side: THREE.DoubleSide, depthWrite: false })))
    shell.scale.set(30, 60, 30)
    const edges = new THREE.LineSegments(this.keep(new THREE.EdgesGeometry(geo)), this.keep(new THREE.LineBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })))
    edges.scale.copy(shell.scale)
    const gal = this.spr(this.cached('geode-galaxy', () => galaxyTexture('255,226,185', '150,178,255', 21, 4.6)), 0xffffff, 46, 0.95)
    const core = this.spr(this.glow, 0xffe8c0, 14, 0.9)
    const n = 80
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * 16
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = rnd(-24, 24) * (1 - r / 24)
      pos[i * 3 + 2] = Math.sin(a) * r * 0.6
    }
    const sg = this.keep(new THREE.BufferGeometry())
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const sc = new Float32Array(n * 3).fill(1)
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3))
    const stars = new THREE.Points(sg, this.keep(dotMaterial(3, true, 1, true)))
    stars.frustumCulled = false
    g.add(this.spr(this.glow, 0x5ac8ff, 170, 0.32), shell, edges, stars, gal, core)
    const smallGeo = this.g('hexcone', () => new THREE.CylinderGeometry(0, 1, 2.4, 6, 1))
    const smallMat = this.keep(new THREE.MeshPhysicalMaterial({ color: 0x7ad8ff, emissive: 0x2a60d0, emissiveIntensity: 0.9, roughness: 0.1, transparent: true, opacity: 0.75, flatShading: true }))
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(smallGeo, smallMat)
      const a = (i / 7) * 6.28
      m.position.set(Math.cos(a) * 24, -28 + rnd(-3, 3), Math.sin(a) * 18)
      m.scale.set(rnd(3, 6), rnd(5, 11), rnd(3, 6))
      m.rotation.set(rnd(-0.4, 0.4), rnd(0, 6), Math.cos(a) * -0.5)
      g.add(m)
    }
    const d = this.big({ obj: g, onFound: dd => this.host.pulse(0x8ae6ff, dd.x * 0.1, dd.y * 0.1) })
    d.spawn = dd => this.place(dd, 40, 6)
    d.tick = (dt, t) => {
      ;(gal.material as THREE.SpriteMaterial).rotation += dt * 0.25
      shell.rotation.y += dt * 0.05
      edges.rotation.y = shell.rotation.y
      core.scale.setScalar(14 + Math.sin(t * 2) * 2)
    }
    return d
  }

  private buildEternal(): Drift {
    const g = new THREE.Group()
    const R = 24
    const body = new THREE.Mesh(this.g('sph', () => new THREE.SphereGeometry(1, 48, 32)), this.keep(new THREE.MeshStandardMaterial({ map: this.cached('earth', earthTex), roughness: 0.8, emissive: 0x20304a, emissiveIntensity: 0.35 })))
    body.scale.setScalar(R)
    g.add(body, this.spr(this.glow, 0xffe2a0, R * 4.2, 0.3), this.spr(this.glow, 0xbfe4ff, R * 3, 0.25))
    const tickGeo = this.g('tick', () => new THREE.BoxGeometry(0.5, 2.2, 0.3))
    const tickMat = this.keep(new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9 }))
    const clock = new THREE.Group()
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2
      const m = new THREE.Mesh(tickGeo, tickMat)
      m.position.set(Math.sin(a) * (R + 9), Math.cos(a) * (R + 9), 0)
      m.rotation.z = -a
      m.scale.y = i % 5 === 0 ? 2 : 1
      clock.add(m)
    }
    clock.rotation.x = 0.5
    clock.rotation.y = 0.4
    g.add(clock)
    const n = 60
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(R + 3, R + 26))
      pos.set([v.x, v.y, v.z], i * 3)
    }
    const mg = this.keep(new THREE.BufferGeometry())
    mg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    mg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3))
    const motes = new THREE.Points(mg, this.keep(dotMaterial(2.2, true, 0.9, true)))
    motes.frustumCulled = false
    g.add(motes)
    const d = this.big({ obj: g })
    d.spawn = dd => this.place(dd, 48, 8)
    return d
  }

  private buildMimic(): Drift {
    const g = new THREE.Group()
    const R = 22
    const flesh = this.cached('flesh', fleshTex)
    const body = new THREE.Mesh(this.g('sph', () => new THREE.SphereGeometry(1, 48, 32)), this.keep(new THREE.MeshStandardMaterial({ map: flesh, bumpMap: flesh, bumpScale: 2, roughness: 0.55, emissive: 0x3a0818, emissiveIntensity: 0.7 })))
    body.scale.setScalar(R)
    g.add(body, this.spr(this.glow, 0xff4a9a, R * 3, 0.16))
    const eyeT = this.cached('eye', eyeTex)
    const pupT = this.cached('pupil', pupilTex)
    const specs = [{ x: 0, y: 3, s: 11 }, { x: -10, y: -6, s: 5.5 }, { x: 11, y: -5, s: 6.5 }]
    const eyes = specs.map(sp => {
      const e = new THREE.Group()
      const sclera = this.spr(eyeT, 0xffffff, sp.s * 2, 1, false)
      const pupil = this.spr(pupT, 0xffffff, sp.s, 1, false)
      pupil.scale.set(sp.s * 0.36, sp.s * 0.95, 1)
      pupil.position.z = 0.05
      e.add(sclera, pupil)
      e.position.set(sp.x, sp.y, Math.sqrt(Math.max(1, R * R - sp.x * sp.x - sp.y * sp.y)) * 0.985)
      e.scale.y = 0.02
      g.add(e)
      return { e, pupil, s: sp.s, sclera }
    })
    let open = 0
    let revealed = false
    let exhaled = false
    let blinkT = rnd(2, 4)
    let blink = 0
    const ph = rnd(0, 6)
    const d = this.big({ obj: g, k: 0.5, foundZ: -150, zEnd: 70 })
    d.spawn = dd => this.place(dd, 31, 6, -360)
    d.tick = (dt, t, dd) => {
      body.scale.set(R * (1 + 0.03 * Math.sin(t * 3.1 + ph)), R * (1 + 0.03 * Math.sin(t * 2.3 + 1)), R)
      if (dd.z > -165 && !revealed) revealed = true
      if (revealed) {
        open = Math.min(1, open + dt * 1.2)
        blinkT -= dt
        if (blinkT <= 0) { blinkT = rnd(2.5, 4.5); blink = 1 }
        blink = Math.max(0, blink - dt * 5)
        const lx = clamp((this.px - dd.x) / 50, -1, 1)
        const ly = clamp((this.py - dd.y) / 25, -1, 1)
        for (const ey of eyes) {
          ey.e.scale.y = Math.max(0.02, open * (1 - blink * 0.95))
          ey.pupil.position.x = lx * ey.s * 0.28
          ey.pupil.position.y = ly * ey.s * 0.2
        }
        if (!exhaled && dd.z > -105) {
          exhaled = true
          this.host.burst(dd.x, dd.y, dd.z + R, 70, 12, 0.5, 1, 0.65)
          this.host.pulse(0xff4a9a, this.px, this.py)
          this.host.sfx('shield')
        }
      }
    }
    d.onFound = () => {
      this.host.say('That planet is alive...')
      this.host.pulse(0xff4a9a, this.px, this.py)
    }
    return d
  }

  private buildTitan(): Drift {
    const g = new THREE.Group()
    const clouds: THREE.Sprite[] = []
    const cols = [0xff4a9a, 0x7affa8, 0xc070ff, 0xff7aa0, 0x6ae0ff]
    cols.forEach((c, i) => {
      const s = this.spr(this.cached('titan-cloud' + (i % 3), () => cloudTexture(i % 2 ? '255,70,140' : '90,255,170', 3 + i * 5)), c, 280 + i * 30, 0.55)
      s.position.set(rnd(-20, 20), rnd(-14, 14), -i * 4)
      g.add(s)
      clouds.push(s)
    })
    const core = this.spr(this.glow, 0xffc0e0, 90, 0.8)
    g.add(core)
    const arms: { sp: THREE.Sprite[]; a: number; ph: number }[] = []
    for (let i = 0; i < 8; i++) {
      const sp: THREE.Sprite[] = []
      for (let k = 0; k < 10; k++) {
        const s = this.spr(this.glow, i % 2 ? 0x7affa8 : 0xff4a9a, 30 - k * 2, 0.55)
        g.add(s)
        sp.push(s)
      }
      arms.push({ sp, a: (i / 8) * Math.PI * 2, ph: rnd(0, 6) })
    }
    const sysGeo = this.g('sphLo', () => new THREE.SphereGeometry(1, 14, 10))
    const systems: { grp: THREE.Group; planets: { m: THREE.Mesh; r: number; sp: number; a: number }[]; a: number; rad: number; sunMat: THREE.SpriteMaterial }[] = []
    for (let i = 0; i < 7; i++) {
      const grp = new THREE.Group()
      const sun = this.spr(this.glow, pickOf([0xfff0c0, 0xaad0ff, 0xffb070]), 14, 1)
      grp.add(sun)
      const planets: { m: THREE.Mesh; r: number; sp: number; a: number }[] = []
      for (let k = 0; k < 2 + (i % 2); k++) {
        const m = new THREE.Mesh(sysGeo, this.keep(new THREE.MeshBasicMaterial({ color: pickOf([0x6a9aff, 0xff9a6a, 0x9affb0, 0xe8e0ff]) })))
        m.scale.setScalar(rnd(0.6, 1.3))
        grp.add(m)
        planets.push({ m, r: 5 + k * 3.5, sp: rnd(0.6, 1.6), a: rnd(0, 6) })
      }
      g.add(grp)
      systems.push({ grp, planets, a: (i / 7) * Math.PI * 2 + 0.3, rad: rnd(95, 150), sunMat: sun.material as THREE.SpriteMaterial })
    }
    const d = this.big({ obj: g, k: 0.5, foundZ: -270, zEnd: -25 })
    d.spawn = dd => this.place(dd, 62, 10, -430)
    d.tick = (dt, t, dd) => {
      const fade = 1 - smooth(-170, -40, dd.z)
      const beat = 1 + 0.05 * Math.sin(t * 1.1) + 0.03 * Math.sin(t * 2.7)
      clouds.forEach((c, i) => {
        ;(c.material as THREE.SpriteMaterial).opacity = 0.5 * fade
        ;(c.material as THREE.SpriteMaterial).rotation += dt * 0.02 * (i % 2 ? -1 : 1)
        c.scale.setScalar((280 + i * 30) * beat)
      })
      ;(core.material as THREE.SpriteMaterial).opacity = 0.8 * fade
      const lean = clamp((this.px - dd.x) / 100, -0.6, 0.6)
      for (const arm of arms) {
        for (let k = 0; k < arm.sp.length; k++) {
          const f = k / (arm.sp.length - 1)
          const a = arm.a + Math.sin(t * 0.5 + arm.ph + f * 2.4) * 0.35 + f * 0.6
          const r = 40 + f * 130
          const s = arm.sp[k]
          s.position.set(Math.cos(a) * r + lean * f * 40 * (Math.cos(arm.a) > 0 ? -1 : 1), Math.sin(a) * r * 0.8, f * 6)
          ;(s.material as THREE.SpriteMaterial).opacity = (0.55 - f * 0.25) * fade
        }
      }
      for (const sy of systems) {
        const a = sy.a + t * 0.02
        sy.grp.position.set(Math.cos(a) * sy.rad, Math.sin(a) * sy.rad * 0.75, 14)
        sy.sunMat.opacity = fade
        for (const p of sy.planets) {
          p.a += dt * p.sp
          p.m.position.set(Math.cos(p.a) * p.r, Math.sin(p.a) * p.r * 0.35, Math.sin(p.a) * p.r * 0.6)
          ;(p.m.material as THREE.MeshBasicMaterial).transparent = true
          ;(p.m.material as THREE.MeshBasicMaterial).opacity = fade
        }
      }
    }
    d.onFound = () => this.host.pulse(0xff4a9a, this.px, this.py)
    return d
  }

  private buildForge(): Drift {
    const g = new THREE.Group()
    const mat = this.keep(new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, cHot: { value: new THREE.Color(0xffb86a) }, cCool: { value: new THREE.Color(0xff5a1a) } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: BH_FRAG, transparent: true, depthWrite: false
    }))
    const bh = new THREE.Mesh(this.g('plane2', () => new THREE.PlaneGeometry(2, 2)), mat)
    bh.scale.setScalar(130)
    bh.rotation.z = -0.3
    g.add(this.spr(this.glow, 0xff9a50, 380, 0.2), bh)
    const orbit = new THREE.Group()
    orbit.rotation.x = 1.25
    const ringMesh = new THREE.Mesh(this.keep(new THREE.TorusGeometry(110, 0.9, 6, 120)), this.keep(new THREE.MeshBasicMaterial({ color: 0x9ab4d8, transparent: true, opacity: 0.8 })))
    orbit.add(ringMesh)
    const pylon = this.g('pylon', () => new THREE.BoxGeometry(4, 12, 4))
    const pm = this.keep(new THREE.MeshBasicMaterial({ color: 0xb8c8e0 }))
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const m = new THREE.Mesh(pylon, pm)
      m.position.set(Math.cos(a) * 110, Math.sin(a) * 110, 0)
      m.rotation.z = a
      orbit.add(m)
      const l = this.spr(this.glow, i % 3 === 0 ? 0x7affff : 0xffd890, 9, 0.9)
      l.position.copy(m.position)
      orbit.add(l)
    }
    const gate = new THREE.Group()
    const gt = new THREE.Mesh(this.keep(new THREE.TorusGeometry(20, 1.6, 8, 48)), this.keep(new THREE.MeshBasicMaterial({ color: 0xaaf0ff })))
    gate.add(gt, this.spr(this.glow, 0x7ac8ff, 70, 0.6))
    gate.position.set(110, 0, 0)
    orbit.add(gate)
    g.add(orbit)
    const buds: { s: THREE.Sprite; life: number; vx: number }[] = []
    for (let i = 0; i < 4; i++) {
      const s = this.spr(this.ring, 0x9ae0ff, 10, 0)
      s.visible = false
      g.add(s)
      buds.push({ s, life: 0, vx: 0 })
    }
    let bud = 0
    const d = this.big({ obj: g, k: 0.42, foundZ: -250, zEnd: 40 })
    d.spawn = dd => this.place(dd, 75, 16, -440)
    d.tick = (dt, t) => {
      mat.uniforms.t.value = t
      orbit.rotation.z += dt * 0.18
      bud -= dt
      if (bud <= 0) {
        bud = 1.3
        const b = buds.find(x => x.life <= 0)
        if (b) {
          const wp = new THREE.Vector3()
          gate.getWorldPosition(wp)
          g.worldToLocal(wp)
          b.s.position.copy(wp)
          b.vx = rnd(-14, 14)
          b.life = 2.4
          b.s.visible = true
        }
      }
      for (const b of buds) {
        if (b.life <= 0) continue
        b.life -= dt
        const k = 1 - b.life / 2.4
        b.s.position.x += b.vx * dt
        b.s.scale.setScalar(10 + 60 * k)
        ;(b.s.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.9
        if (b.life <= 0) b.s.visible = false
      }
    }
    d.onFound = () => {
      this.host.say('The structure is tearing open a wormhole')
      this.host.portalSoon(2.5)
      this.host.pulse(0x9ae0ff, this.px, this.py)
    }
    return d
  }

  private buildUpwelling(): Drift {
    const g = new THREE.Group()
    const n = 220
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const h = new Float32Array(n)
    const a = new Float32Array(n)
    const r0 = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      h[i] = rnd(-30, 110)
      a[i] = rnd(0, 6.28)
      r0[i] = rnd(5, 24)
      const w = Math.random()
      col[i * 3] = 0.35 + w * 0.5
      col[i * 3 + 1] = 0.9
      col[i * 3 + 2] = 0.9 + w * 0.1
    }
    const geo = this.keep(new THREE.BufferGeometry())
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const pts = new THREE.Points(geo, this.keep(dotMaterial(3.2, true, 1, true)))
    pts.frustumCulled = false
    const rift = this.spr(this.ring, 0xc8ffff, 80, 0.9)
    rift.position.y = 112
    const rift2 = this.spr(this.ring, 0x9ad0ff, 130, 0.5)
    rift2.position.y = 112
    const lightUp = this.spr(this.glow, 0xe8ffff, 160, 0.7)
    lightUp.position.y = 112
    const base = this.spr(this.glow, 0x2affd0, 120, 0.55)
    base.position.y = -30
    g.add(pts, rift, rift2, lightUp, base)
    const d = this.big({ obj: g, k: 0.55, foundZ: -210, zEnd: 40 })
    d.spawn = dd => this.place(dd, 40, -28, -380)
    d.tick = (dt, t) => {
      for (let i = 0; i < n; i++) {
        h[i] += (24 + 14 * (h[i] / 110)) * dt
        if (h[i] > 112) { h[i] = -30; r0[i] = rnd(5, 24) }
        const f = clamp((h[i] + 30) / 142, 0, 1)
        a[i] += dt * (0.5 + f * 1.6)
        const r = r0[i] * (1 - 0.7 * f)
        pos[i * 3] = Math.cos(a[i]) * r
        pos[i * 3 + 1] = h[i]
        pos[i * 3 + 2] = Math.sin(a[i]) * r * 0.6
      }
      ;(geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
      ;(rift.material as THREE.SpriteMaterial).rotation = t * 0.4
      rift2.scale.setScalar(130 + Math.sin(t * 1.5) * 10)
    }
    d.onFound = () => {
      this.host.say('The ocean is flowing upward: ride the current')
      this.host.river(26)
      this.host.pulse(0xc8ffff, this.px, this.py)
    }
    return d
  }

  private buildRelic(): Drift {
    const g = new THREE.Group()
    const R = 28
    const body = new THREE.Mesh(this.g('sph', () => new THREE.SphereGeometry(1, 48, 32)), this.keep(new THREE.MeshStandardMaterial({ map: this.cached('relic', () => relicTex(false)), emissiveMap: this.cached('relicE', () => relicTex(true)), emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.35, metalness: 0.1 })))
    body.scale.setScalar(R)
    g.add(body, this.spr(this.glow, 0x9ae0ff, R * 3.6, 0.3))
    const ob = this.g('obelisk', () => new THREE.BoxGeometry(1.4, 9, 1.4))
    const om = this.keep(new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.8, roughness: 0.3, emissive: 0x0a3a4a, emissiveIntensity: 0.6 }))
    const ringG = new THREE.Group()
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      const m = new THREE.Mesh(ob, om)
      m.position.set(Math.cos(a) * (R + 14), Math.sin(a) * (R + 14), 0)
      m.rotation.z = a - Math.PI / 2
      ringG.add(m)
      const tipGlow = this.spr(this.glow, 0x5affea, 5, 0.9)
      tipGlow.position.set(Math.cos(a) * (R + 19), Math.sin(a) * (R + 19), 0)
      ringG.add(tipGlow)
    }
    ringG.rotation.x = 1.1
    ringG.rotation.y = 0.3
    g.add(ringG)
    const beacon = this.spr(this.glow, 0x7affee, 14, 0.9)
    beacon.scale.set(10, 90, 1)
    beacon.position.y = R + 40
    g.add(beacon)
    const d = this.big({ obj: g, k: 0.45, foundZ: -230, zEnd: 40 })
    d.spawn = dd => this.place(dd, 54, 10)
    d.tick = (dt, t) => {
      ;(beacon.material as THREE.SpriteMaterial).opacity = 0.5 + 0.4 * Math.sin(t * 2)
    }
    d.onFound = () => {
      this.host.say('Ancient technology recovered: thermal core online')
      this.host.recharge()
      this.immune = 45
      this.host.pulse(0x7affee, this.px, this.py)
    }
    return d
  }

  private buildOrigin(): Drift {
    const g = new THREE.Group()
    const tm = (c: number) => this.keep(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }))
    const t1 = new THREE.Mesh(this.keep(new THREE.TorusGeometry(30, 0.8, 8, 96)), tm(0xffffff))
    const t2 = new THREE.Mesh(this.keep(new THREE.TorusGeometry(23, 0.8, 8, 96)), tm(0xffd890))
    const t3 = new THREE.Mesh(this.keep(new THREE.TorusGeometry(16, 0.8, 8, 96)), tm(0x7affff))
    g.add(t1, t2, t3, this.spr(this.glow, 0xffffff, 60, 1), this.spr(this.glow, 0xb0a0ff, 200, 0.35))
    const lines = 70
    const lp = new Float32Array(lines * 6)
    const lc = new Float32Array(lines * 6)
    const v = new THREE.Vector3()
    for (let i = 0; i < lines; i++) {
      v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(70, 160))
      lp.set([0, 0, 0, v.x, v.y, v.z], i * 6)
      const c = pickOf([[1, 1, 1], [1, 0.4, 0.8], [0.3, 1, 1], [1, 0.9, 0.4]])
      lc.set([c[0], c[1], c[2], 0, 0, 0], i * 6)
    }
    const lg = this.keep(new THREE.BufferGeometry())
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3))
    lg.setAttribute('color', new THREE.BufferAttribute(lc, 3))
    const threads = new THREE.LineSegments(lg, this.keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })))
    g.add(threads)
    const pr = this.spr(this.ring, 0xffffff, 10, 0)
    g.add(pr)
    const d = this.big({ obj: g, k: 0.42, foundZ: -240, zEnd: 40 })
    d.spawn = dd => this.place(dd, 52, 10)
    d.tick = (dt, t) => {
      t1.rotation.x += dt * 0.5
      t2.rotation.y += dt * 0.7
      t3.rotation.z += dt * 0.9
      threads.rotation.y += dt * 0.06
      threads.rotation.x += dt * 0.03
      const k = (t % 2) / 2
      pr.scale.setScalar(20 + 200 * k)
      ;(pr.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.7
    }
    d.onFound = () => {
      this.host.say('A stable region: this is where the wormholes begin')
      this.calmT = 12
      this.zone.s = 'calm'
      this.zone.t = 14
      this.host.portalSoon(4)
      this.host.pulse(0xffffff, this.px, this.py)
    }
    return d
  }

  private buildPatientZero(): Drift {
    const g = new THREE.Group()
    const cube = this.g('cube', () => new THREE.BoxGeometry(1, 1, 1))
    const chk = this.cached('checker', checkerTex)
    const mats = [
      this.keep(new THREE.MeshBasicMaterial({ map: chk })),
      this.keep(new THREE.MeshBasicMaterial({ color: 0xff00aa, wireframe: true })),
      this.keep(new THREE.MeshBasicMaterial({ color: 0x00ffe0, wireframe: true })),
      this.keep(new THREE.MeshBasicMaterial({ color: 0x0a0010 }))
    ]
    const lattice = new THREE.Group()
    const bits: { m: THREE.Mesh; home: THREE.Vector3 }[] = []
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) {
      if (Math.random() < 0.3) continue
      const m = new THREE.Mesh(cube, pickOf(mats))
      m.scale.setScalar(rnd(3, 6.5))
      const home = new THREE.Vector3((x - 1.5) * 9, (y - 1.5) * 9, (z - 1.5) * 9)
      m.position.copy(home)
      lattice.add(m)
      bits.push({ m, home })
    }
    const tether = this.keep(new THREE.BufferGeometry())
    tether.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, -400]), 3))
    const tl = new THREE.Line(tether, this.keep(new THREE.LineBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })))
    const pr = this.spr(this.ring, 0xff00aa, 10, 0)
    const pr2 = this.spr(this.ring, 0x00ffe0, 10, 0)
    g.add(lattice, tl, pr, pr2, this.spr(this.glow, 0xff00aa, 170, 0.3), this.spr(this.glow, 0xffffff, 28, 0.9))
    let step = 0
    const d = this.big({ obj: g, k: 0.45, foundZ: -230, zEnd: 40 })
    d.spawn = dd => this.place(dd, 50, 8)
    d.tick = (dt, t) => {
      step -= dt
      if (step <= 0) {
        step = rnd(0.12, 0.5)
        lattice.rotation.set(rnd(-0.5, 0.5) + t * 0.1, rnd(0, 6.28), rnd(-0.4, 0.4))
        for (const b of bits) b.m.position.copy(b.home).add(new THREE.Vector3(rnd(-1.4, 1.4), rnd(-1.4, 1.4), rnd(-1.4, 1.4)))
        g.visible = Math.random() > 0.08
      }
      const k = (t % 1.6) / 1.6
      pr.scale.setScalar(20 + 220 * k)
      ;(pr.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.7
      const k2 = ((t + 0.8) % 1.6) / 1.6
      pr2.scale.setScalar(20 + 220 * k2)
      ;(pr2.material as THREE.SpriteMaterial).opacity = (1 - k2) * 0.6
    }
    d.onFound = () => {
      this.host.say('Signal traced: the corruption is spreading through the wormhole network')
      this.host.pulse(0xff00aa, this.px, this.py)
    }
    return d
  }

  dispose(): void {
    this.clear()
    this.scene.remove(this.group)
    this.cache.forEach(t => t.dispose())
    this.cache.clear()
    Object.values(this.geo).forEach(g => g.dispose())
    this.geo = {}
    this.glow.dispose()
    this.ring.dispose()
    this.flow.geometry.dispose()
    ;(this.flow.material as THREE.Material).dispose()
    ;(this.aura.material as THREE.Material).dispose()
    for (const s of this.shards) s.g.traverse(o => {
      const m = o as THREE.Mesh
      if (m.material) (m.material as THREE.Material).dispose()
    })
    for (const w of this.wells) w.g.traverse(o => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      if (m.material) (m.material as THREE.Material).dispose()
    })
    for (const m of this.mist) (m.s.material as THREE.Material).dispose()
    for (const p of this.popups) (p.m.material as THREE.Material).dispose()
  }
}

function checkerTex(): THREE.Texture {
  const [c, x] = cv(64, 64)
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    x.fillStyle = (i + j) % 2 ? '#ff00ff' : '#0a000f'
    x.fillRect(i * 8, j * 8, 8, 8)
  }
  const t = tex(c)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function fleshTex(): THREE.Texture {
  const [c, x] = cv(512, 256)
  x.fillStyle = '#8a2a46'
  x.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 160; i++) {
    x.globalAlpha = rnd(0.08, 0.3)
    x.fillStyle = Math.random() < 0.5 ? '#c04a68' : '#4a1022'
    x.beginPath()
    x.arc(rnd(0, 512), rnd(0, 256), rnd(6, 46), 0, Math.PI * 2)
    x.fill()
  }
  x.globalAlpha = 0.8
  x.lineCap = 'round'
  for (let i = 0; i < 46; i++) {
    x.strokeStyle = Math.random() < 0.7 ? 'rgba(255,130,160,0.7)' : 'rgba(120,255,170,0.5)'
    x.lineWidth = rnd(0.8, 2.6)
    x.beginPath()
    let px = rnd(0, 512), py = rnd(0, 256)
    x.moveTo(px, py)
    for (let k = 0; k < 6; k++) {
      px += rnd(-40, 40)
      py += rnd(-30, 30)
      x.quadraticCurveTo(px + rnd(-20, 20), py + rnd(-20, 20), px, py)
    }
    x.stroke()
  }
  return tex(c)
}

function eyeTex(): THREE.Texture {
  const [c, x] = cv(256, 256)
  let g = x.createRadialGradient(128, 128, 20, 128, 128, 124)
  g.addColorStop(0, '#fff6d8')
  g.addColorStop(0.7, '#f0d090')
  g.addColorStop(1, 'rgba(160,40,40,0)')
  x.fillStyle = g
  x.beginPath()
  x.ellipse(128, 128, 124, 112, 0, 0, Math.PI * 2)
  x.fill()
  g = x.createRadialGradient(128, 128, 20, 128, 128, 66)
  g.addColorStop(0, '#fff070')
  g.addColorStop(0.55, '#5aff9a')
  g.addColorStop(0.92, '#0a6a40')
  g.addColorStop(1, '#021a10')
  x.fillStyle = g
  x.beginPath()
  x.arc(128, 128, 66, 0, Math.PI * 2)
  x.fill()
  x.strokeStyle = 'rgba(255,90,90,0.5)'
  x.lineWidth = 1.5
  for (let i = 0; i < 14; i++) {
    const a = rnd(0, 6.28)
    x.beginPath()
    x.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 90)
    x.lineTo(128 + Math.cos(a + rnd(-0.2, 0.2)) * 124, 128 + Math.sin(a) * 110)
    x.stroke()
  }
  return tex(c)
}

function pupilTex(): THREE.Texture {
  const [c, x] = cv(128, 128)
  const g = x.createRadialGradient(64, 64, 6, 64, 64, 60)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.75, 'rgba(0,0,0,0.95)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.beginPath()
  x.arc(64, 64, 60, 0, Math.PI * 2)
  x.fill()
  return tex(c)
}

function earthTex(): THREE.Texture {
  const [c, x] = cv(512, 256)
  const g = x.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#2a6ab0')
  g.addColorStop(1, '#0d2d5a')
  x.fillStyle = g
  x.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 26; i++) {
    x.fillStyle = Math.random() < 0.7 ? `rgba(${rnd(50, 90)},${rnd(120, 160)},${rnd(50, 80)},0.95)` : `rgba(${rnd(150, 190)},${rnd(130, 160)},${rnd(80, 110)},0.95)`
    x.beginPath()
    let px = rnd(0, 512), py = rnd(40, 216)
    x.moveTo(px, py)
    for (let k = 0; k < 14; k++) {
      px += rnd(-26, 26)
      py = clamp(py + rnd(-20, 20), 20, 236)
      x.lineTo(px, py)
    }
    x.closePath()
    x.fill()
  }
  x.fillStyle = 'rgba(255,255,255,0.9)'
  x.fillRect(0, 0, 512, 16)
  x.fillRect(0, 240, 512, 16)
  x.strokeStyle = 'rgba(255,255,255,0.45)'
  x.lineCap = 'round'
  for (let i = 0; i < 40; i++) {
    x.lineWidth = rnd(3, 9)
    x.beginPath()
    const px = rnd(0, 512), py = rnd(20, 236)
    x.moveTo(px, py)
    x.quadraticCurveTo(px + rnd(-40, 40), py + rnd(-12, 12), px + rnd(30, 80), py + rnd(-6, 6))
    x.stroke()
  }
  return tex(c)
}

function relicTex(emissive: boolean): THREE.Texture {
  const [c, x] = cv(512, 256)
  const base = x.createLinearGradient(0, 0, 0, 256)
  base.addColorStop(0, '#e8f6ff')
  base.addColorStop(0.5, '#9ac4e4')
  base.addColorStop(1, '#d8eeff')
  x.fillStyle = emissive ? '#000' : base
  x.fillRect(0, 0, 512, 256)
  if (!emissive) {
    for (let i = 0; i < 120; i++) {
      x.globalAlpha = rnd(0.05, 0.25)
      x.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#5a8ab8'
      x.beginPath()
      x.arc(rnd(0, 512), rnd(0, 256), rnd(5, 40), 0, Math.PI * 2)
      x.fill()
    }
    x.globalAlpha = 1
  }
  const col = emissive ? '#5affea' : 'rgba(40,110,130,0.7)'
  x.strokeStyle = col
  x.fillStyle = col
  x.lineWidth = emissive ? 1.8 : 1.2
  for (let cx = 0; cx < 7; cx++) {
    const ox = rnd(20, 490), oy = rnd(50, 210)
    for (let k = 0; k < 10; k++) {
      const w = rnd(6, 26)
      const px = ox + rnd(-60, 60), py = oy + rnd(-30, 30)
      x.strokeRect(px, py, w, w * rnd(0.5, 1.4))
      if (k % 3 === 0) x.fillRect(px + 2, py + 2, 3, 3)
    }
    x.beginPath()
    x.moveTo(ox - 70, oy)
    x.lineTo(ox + 70, oy)
    x.moveTo(ox, oy - 40)
    x.lineTo(ox, oy + 40)
    x.stroke()
  }
  return tex(c)
}

