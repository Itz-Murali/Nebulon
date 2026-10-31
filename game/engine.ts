import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildShip, updateRig, disposeRig, type ShipRig } from './ships'
import { SHIPS, MODES, FIELD, SCORE, QUALITY, SHIP_RADIUS, UNIVERSES, DISCOVERIES, drawUniverse } from './config'
import { AudioFx } from './audio'
import { glowTexture, streakTexture, rockTexture } from './textures'
import { Cosmos, type SpaceEvent } from './cosmos'
import { Wormhole } from './wormhole'
import { dotUniforms, dotMaterial } from './dots'
import { Ambient } from './ambient'
import { Sky } from './sky'
import { Signature } from './signature'
import { Realms, type RealmHost, type RealmFx } from './realms'
import type { Save, ModeId, ModeDef, HudState, RunResult, Quality, Universe } from '~/types'

export interface EngineHooks {
  save: () => Save
  hud: (h: HudState) => void
  end: (r: RunResult) => void
  find: (id: string) => boolean
}

export type View = 'menu' | 'hangar' | 'play'
type Kind = 'asteroid' | 'satellite' | 'wreck' | 'crystal' | 'comet' | 'anomaly' | 'bat' | 'fireball'
interface Disposable { dispose(): void }
interface Obs { kind: Kind; obj: THREE.Object3D; active: boolean; passed: boolean; x: number; y: number; z: number; x0: number; r: number; ph: number; extra: number; spin: THREE.Vector3; y0: number; amp: number; fq: number; glitchy: boolean; gt: number; ghost: boolean }
interface Orb { obj: THREE.Group; active: boolean; type: number; x: number; y: number; z: number; ph: number; parts: THREE.Object3D[] }
interface Mods { base: number; lat: number; k: number; magnet: number; drain: number; regen: number }

const SPAWN_Z = -190
const FX_MAX = 520
const WARP_TIME = 2
const RC: Record<Kind, number> = { asteroid: 0.85, satellite: 1.6, wreck: 1.7, crystal: 1.2, comet: 0.9, anomaly: 1.25, bat: 0.6, fireball: 0.8 }
const ORB_POOL = [40, 16, 10]
const ORB_VALUE = [1, 3, 5]
const DMG: Record<Kind, number> = { asteroid: 20, satellite: 18, wreck: 28, crystal: 18, comet: 30, anomaly: 25, bat: 8, fireball: 14 }
const HEAL = [0, 5, 15]
const TAU = Math.PI * 2
const ORB_COLOR = [[0.3, 0.55, 1], [0.7, 0.4, 1], [1, 0.8, 0.25]]

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt)
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)]

const rockGeometry = (seed: number) => {
  const g = new THREE.IcosahedronGeometry(1, 1)
  const p = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const h = Math.sin(v.x * 12.9 + v.y * 78.2 + v.z * 37.7 + seed) * 43758.5
    v.multiplyScalar(0.72 + (h - Math.floor(h)) * 0.45)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

export class Engine {
  readonly audio = new AudioFx()
  sens = 1

  private own: Disposable[] = []
  private renderer!: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(62, 1, 0.3, 4000)
  private rigs = new Map<string, ShipRig>()
  private rig: ShipRig | null = null
  private shipId = ''
  private raf = 0
  private last = 0
  private t = 0
  private dt = 0.016
  private view: View = 'menu'
  private paused = false
  private phase: 'idle' | 'run' | 'crash' = 'idle'
  private quality: Quality = 'medium'
  private portrait = false
  private keys = { l: false, r: false, u: false, d: false }
  private hyperHeld = false
  private target = new THREE.Vector2()
  private pos = new THREE.Vector2()
  private vel = new THREE.Vector2()
  private bank = 0
  private pitch = 0
  private yaw = 2.45
  private yawVel = 0
  private drag: { id: number; x: number; y: number } | null = null
  private camPos = new THREE.Vector3(0, 1.4, 9)
  private camLook = new THREE.Vector3()
  private shake = 0
  private dz = 0
  private hudT = 0

  private md: ModeDef = MODES.classic
  private modeId: ModeId = 'classic'
  private mod: Mods = { base: 24, lat: 12, k: 6.5, magnet: 2, drain: 30, regen: 13 }
  private run = { dist: 0, energy: 0, passed: 0, time: 0, maxSpeed: 0 }
  private speed = 0
  private level = 0
  private sinceSpawn = 0
  private safe = { x: 0, y: 0 }
  private hyper = 100
  private hyperActive = false
  private hyperLock = false
  private hyperLerp = 0
  private crashT = 0
  private universe = 0
  private def: Universe = UNIVERSES[0]
  private eraIx = -1
  private nextEra = -1
  private bag: number[] = []
  private infection = 0
  private realms!: Realms
  private realmSpd = 1
  private fogK = 1
  private fogBase = 0.003
  private rollCam = 0
  private fpp = false
  private foundRun: string[] = []
  private noticeQ: string[] = []
  private discT = 0
  private tagQ: { t: number; text: string } | null = null
  private rerollT = 0
  private visited = 1
  private warp = 0
  private warpT = 0
  private warpSwapped = false
  private portalOn = false
  private portalZ = 0
  private nextPortal = 1500

  private cosmos!: Cosmos
  private worm!: Wormhole
  private nextUniverse = 1
  private relief = 0
  private eventT = 14
  private notice = ''
  private noticeT = 0
  private ambient!: Ambient
  private sky!: Sky
  private sig!: Signature
  private beams: { g: THREE.Group; life: number }[] = []
  private beamSide = 1
  private batMat!: THREE.SpriteMaterial
  private lensS = 0
  private boost = 1
  private lensSeen = false
  private glitchT = 0
  private glitchNext = 12
  private batNext = 8
  private stormNext = 12
  private stormT = 0
  private stormWarn = 0
  private fireT = 0
  private phenoNext = 20
  private epicNext = 18
  private epicLast = -1
  private riverLeft = 0
  private riverClock = 0
  private riverPh = 0
  private surgeWait = 0
  private surgeT = 0
  private surgeK = 0
  private chain: { t: number; kind: SpaceEvent; text: string }[] = []
  private pulsar = { on: false, t: 0, dir: 1, hit: false }
  private flareT = 0
  private flareWarn = 0
  private sweep!: THREE.Mesh
  private sweepGlow!: THREE.Sprite
  private cheatT = 0
  private beamMats: THREE.ShaderMaterial[] = []
  private debris: { m: THREE.Mesh; v: THREE.Vector3; w: THREE.Vector3; life: number }[] = []
  private exploded = false
  private crashV = new THREE.Vector2()
  private blast!: THREE.Sprite
  private blastT = 1
  private smokeT = 0
  private hp = 100
  private maxHp = 100
  private invuln = 0
  private hitFlash = 0
  private cheat = false
  private spin = 0
  private ease = 1
  private flashColor = '#ffffff'
  private zaps: THREE.Line[] = []
  private zapLife: number[] = []
  private streaks!: THREE.LineSegments
  private streakData = { x: new Float32Array(220), y: new Float32Array(220), z: new Float32Array(220) }
  private decor!: THREE.InstancedMesh
  private decorData = { x: new Float32Array(34), y: new Float32Array(34), z: new Float32Array(34), s: new Float32Array(34), r: new Float32Array(34) }
  private rimLight!: THREE.DirectionalLight
  private fxPts!: THREE.Points
  private fxData = { vel: new Float32Array(FX_MAX * 3), life: new Float32Array(FX_MAX), max: new Float32Array(FX_MAX), base: new Float32Array(FX_MAX * 3), next: 0 }
  private pools: Record<Kind, Obs[]> = { asteroid: [], satellite: [], wreck: [], crystal: [], comet: [], anomaly: [], bat: [], fireball: [] }
  private allObs: Obs[] = []
  private orbs: Orb[] = []
  private glowTex!: THREE.Texture
  private streakTex!: THREE.Texture
  private res = {} as {
    rockGeos: THREE.BufferGeometry[]
    rockMat: THREE.Material
    metal: THREE.Material
    wreckMat: THREE.Material
    foil: THREE.Material
    panel: THREE.Material
    green: THREE.Material
    amber: THREE.Material
    crystal: THREE.Material[]
    ice: THREE.Material
    tail: THREE.SpriteMaterial
    plasma: THREE.Material
    orbMats: THREE.MeshStandardMaterial[]
    glowMats: THREE.SpriteMaterial[]
    ringMats: THREE.MeshBasicMaterial[]
    oct: THREE.BufferGeometry
    ico: THREE.BufferGeometry
    tor: THREE.BufferGeometry
    box: THREE.BoxGeometry
    sphere: THREE.SphereGeometry
    sphereLo: THREE.SphereGeometry
    tmp: THREE.Object3D
  }

  constructor(private canvas: HTMLCanvasElement, private hooks: EngineHooks) {}

  private keep<T extends Disposable>(x: T): T {
    this.own.push(x)
    return x
  }

  initialize() {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: (window.devicePixelRatio || 1) < 1.5, powerPreference: 'high-performance' }))
    r.outputColorSpace = THREE.SRGBColorSpace
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.toneMappingExposure = 1.05

    const pm = new THREE.PMREMGenerator(r)
    const env = pm.fromScene(new RoomEnvironment(), 0.04)
    this.scene.environment = env.texture
    this.scene.environmentIntensity = 0.45
    this.keep(env)
    pm.dispose()

    const u = UNIVERSES[0]
    this.scene.background = new THREE.Color(u.bg)
    this.scene.fog = new THREE.FogExp2(u.bg, 0.003)

    const key = new THREE.DirectionalLight(0xd6e2ff, 2.4)
    key.position.set(4, 9, 10)
    this.rimLight = new THREE.DirectionalLight(u.rim, 2.2)
    this.rimLight.position.set(-6, 3, -12)
    this.scene.add(key, this.rimLight, new THREE.AmbientLight(0x1a2040, 0.8))

    this.buildResources()
    this.buildStreaks()
    this.buildDecor()
    this.cosmos = new Cosmos()
    this.scene.add(this.cosmos.group)
    this.sky = new Sky(this.renderer)
    this.scene.add(this.sky.mesh)
    this.sig = new Signature()
    this.scene.add(this.sig.group)
    this.ambient = new Ambient()
    this.scene.add(this.ambient.group)
    this.worm = new Wormhole(this.glowTex)
    this.realms = new Realms(this.scene, this.realmHost())
    const tetra = this.keep(new THREE.TetrahedronGeometry(0.28))
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(tetra, i % 4 === 0 ? this.res.amber : this.res.metal)
      m.visible = false
      this.scene.add(m)
      this.debris.push({ m, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0 })
    }
    this.blast = new THREE.Sprite(this.keep(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffd9a0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })))
    this.blast.visible = false
    this.scene.add(this.blast)
    this.scene.add(this.worm.group, this.worm.tunnel, this.worm.ring)
    const bv = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'
    const bf = 'uniform vec3 uC;varying vec2 vUv;void main(){float c=1.0-abs(vUv.x-0.5)*2.0;float core=pow(c,7.0);float glow=pow(c,1.5);float e=smoothstep(0.0,0.06,vUv.y)*smoothstep(1.0,0.94,vUv.y);vec3 col=uC*glow*1.3+vec3(1.0)*core;gl_FragColor=vec4(col,(glow*0.8+core)*e);}'
    for (const hex of [0xffc23a, 0x5ae0ff]) {
      this.beamMats.push(this.keep(new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(hex) } }, vertexShader: bv, fragmentShader: bf, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })))
    }
    const bgeo = this.keep(new THREE.PlaneGeometry(1, 1))
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group()
      const a = new THREE.Mesh(bgeo, this.beamMats[i % 2])
      const b = new THREE.Mesh(bgeo, this.beamMats[i % 2])
      b.rotation.y = Math.PI / 2
      g.add(a, b)
      g.visible = false
      this.scene.add(g)
      this.beams.push({ g, life: 0 })
    }
    this.sweep = new THREE.Mesh(bgeo, this.beamMats[1])
    this.sweep.visible = false
    this.scene.add(this.sweep)
    this.sweepGlow = new THREE.Sprite(this.keep(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xcff4ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 })))
    this.sweepGlow.scale.setScalar(4)
    this.sweepGlow.visible = false
    this.scene.add(this.sweepGlow)
    const bc = document.createElement('canvas')
    bc.width = 128
    bc.height = 64
    const bx = bc.getContext('2d')!
    bx.translate(64, 34)
    bx.fillStyle = '#2a0610'
    bx.strokeStyle = 'rgba(255,60,90,0.9)'
    bx.lineWidth = 2
    bx.beginPath()
    bx.moveTo(0, -6)
    bx.quadraticCurveTo(-14, -26, -58, -14)
    bx.quadraticCurveTo(-44, -4, -48, 8)
    bx.quadraticCurveTo(-36, 2, -28, 14)
    bx.quadraticCurveTo(-18, 4, -8, 12)
    bx.lineTo(0, 4)
    bx.lineTo(8, 12)
    bx.quadraticCurveTo(18, 4, 28, 14)
    bx.quadraticCurveTo(36, 2, 48, 8)
    bx.quadraticCurveTo(44, -4, 58, -14)
    bx.quadraticCurveTo(14, -26, 0, -6)
    bx.fill()
    bx.stroke()
    const bt = this.keep(new THREE.CanvasTexture(bc))
    bt.colorSpace = THREE.SRGBColorSpace
    this.batMat = this.keep(new THREE.SpriteMaterial({ map: bt, transparent: true, depthWrite: false }))
    this.buildOrbs()
    this.buildFx()
    this.setShip(this.hooks.save().ship)
    this.setQuality(this.hooks.save().settings.quality)
    this.setUniverse(0)
    this.resize()

    window.addEventListener('resize', this.resize)
    window.addEventListener('orientationchange', this.resize)
    window.addEventListener('keydown', this.kd)
    window.addEventListener('keyup', this.ku)
    window.addEventListener('blur', this.clearInput)
    window.addEventListener('pointerdown', this.unlock, { passive: true })
    document.addEventListener('click', this.clickSfx)
    this.canvas.addEventListener('pointerdown', this.pd)
    this.canvas.addEventListener('pointermove', this.pm)
    this.canvas.addEventListener('pointerup', this.pu)
    this.canvas.addEventListener('pointercancel', this.pu)

    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  private buildResources() {
    const k = this.keep.bind(this)
    this.glowTex = k(glowTexture())
    this.streakTex = k(streakTexture())
    const rt = k(rockTexture())
    const std = (o: THREE.MeshStandardMaterialParameters) => k(new THREE.MeshStandardMaterial(o))
    const emi = (c: number, i: number) => std({ color: 0x000000, emissive: c, emissiveIntensity: i })
    const orbCols = [0x2f7bff, 0xa04dff, 0xffc23a]
    this.res = {
      rockGeos: [1, 2, 3, 4].map(s => k(rockGeometry(s))),
      rockMat: std({ color: 0xb0a89e, map: rt, bumpMap: rt, bumpScale: 3, roughness: 0.95, metalness: 0.05, flatShading: true, emissive: 0x2a2420, emissiveIntensity: 0.4 }),
      metal: std({ color: 0x2a2f3c, roughness: 0.5, metalness: 0.9 }),
      wreckMat: std({ color: 0x4a4f5c, roughness: 0.7, metalness: 0.7, flatShading: true }),
      foil: std({ color: 0xc9a24a, metalness: 1, roughness: 0.35 }),
      panel: std({ color: 0x14224a, metalness: 0.8, roughness: 0.35, emissive: 0x0a1a44, emissiveIntensity: 0.6 }),
      green: emi(0x3aff8a, 2.5),
      amber: emi(0xffa21f, 2.4),
      crystal: [0x66e0ff, 0xd080ff].map(c => k(new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85, flatShading: true }))),
      ice: std({ color: 0xcfe8ff, roughness: 0.6, emissive: 0x1a3a66, flatShading: true }),
      tail: k(new THREE.SpriteMaterial({ map: this.glowTex, color: 0x9fd8ff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.5, depthWrite: false })),
      plasma: k(new THREE.MeshBasicMaterial({ color: 0x8ab4ff, wireframe: true, transparent: true, opacity: 0.7 })),
      orbMats: orbCols.map(c => std({ color: 0x000000, emissive: c, emissiveIntensity: 2.6, roughness: 0.3 })),
      glowMats: orbCols.map(c => k(new THREE.SpriteMaterial({ map: this.glowTex, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85 }))),
      ringMats: orbCols.map(c => k(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))),
      oct: k(new THREE.OctahedronGeometry(0.5)),
      ico: k(new THREE.IcosahedronGeometry(0.28, 2)),
      tor: k(new THREE.TorusGeometry(0.5, 0.025, 6, 32)),
      box: k(new THREE.BoxGeometry(1, 1, 1)),
      sphere: k(new THREE.SphereGeometry(1, 48, 32)),
      sphereLo: k(new THREE.SphereGeometry(1, 16, 12)),
      tmp: new THREE.Object3D()
    }
  }

  private buildStreaks() {
    const n = QUALITY.high.streaks
    const d = this.streakData
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2)
      const rad = rnd(5, 30)
      d.x[i] = Math.cos(a) * rad
      d.y[i] = Math.sin(a) * rad * 0.6
      d.z[i] = rnd(-250, 10)
    }
    const g = this.keep(new THREE.BufferGeometry())
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3))
    this.streaks = new THREE.LineSegments(g, this.keep(new THREE.LineBasicMaterial({ color: 0x9fb6ff, transparent: true, opacity: 0, fog: false, depthWrite: false })))
    this.streaks.frustumCulled = false
    this.streaks.visible = false
    this.scene.add(this.streaks)
  }

  private buildDecor() {
    const n = QUALITY.high.decor
    this.decor = new THREE.InstancedMesh(this.res.rockGeos[0], this.res.rockMat, n)
    this.decor.frustumCulled = false
    for (let i = 0; i < n; i++) this.placeDecor(i, rnd(-380, 10))
    this.scene.add(this.decor)
  }

  private placeDecor(i: number, z: number) {
    const d = this.decorData
    const a = rnd(0, Math.PI * 2)
    const rad = rnd(14, 55)
    d.x[i] = Math.cos(a) * rad
    d.y[i] = Math.sin(a) * rad * 0.7
    d.z[i] = z
    d.s[i] = rnd(0.8, 4)
    d.r[i] = rnd(0, 6)
  }

  private makeOrb(type: number): Orb {
    const R = this.res
    const g = new THREE.Group()
    const parts: THREE.Object3D[] = []
    const spr = new THREE.Sprite(R.glowMats[type])
    spr.scale.setScalar(type === 2 ? 2.6 : 2)
    g.add(spr)
    const piv = new THREE.Group()
    g.add(piv)
    parts.push(piv)
    const m = (geo: THREE.BufferGeometry, mat: THREE.Material) => new THREE.Mesh(geo, mat)
    if (type === 0) {
      piv.add(m(R.ico, R.orbMats[0]))
      const a = m(R.tor, R.ringMats[0])
      const b = m(R.tor, R.ringMats[0])
      b.rotation.x = Math.PI / 2
      piv.add(a, b)
      parts.push(a, b)
    } else if (type === 1) {
      const c = m(R.oct, R.orbMats[1])
      c.scale.set(0.65, 1.2, 0.65)
      piv.add(c)
      const orbit = new THREE.Group()
      for (let i = 0; i < 3; i++) {
        const s = m(R.oct, R.orbMats[1])
        const a = (i / 3) * Math.PI * 2
        s.scale.setScalar(0.3)
        s.position.set(Math.cos(a) * 0.65, Math.sin(a * 2) * 0.2, Math.sin(a) * 0.65)
        orbit.add(s)
      }
      piv.add(orbit)
      parts.push(orbit)
    } else {
      const a = m(R.oct, R.orbMats[2])
      const b = m(R.oct, R.orbMats[2])
      b.rotation.set(Math.PI / 4, Math.PI / 4, 0)
      a.scale.setScalar(0.85)
      b.scale.setScalar(0.85)
      const core = m(R.ico, R.orbMats[2])
      core.scale.setScalar(0.9)
      const ring = m(R.tor, R.ringMats[2])
      ring.scale.setScalar(1.5)
      ring.rotation.x = Math.PI / 2
      piv.add(a, b, core, ring)
      parts.push(ring)
    }
    g.visible = false
    this.scene.add(g)
    return { obj: g, active: false, type, x: 0, y: 0, z: 0, ph: 0, parts }
  }

  private buildOrbs() {
    ORB_POOL.forEach((n, type) => {
      for (let i = 0; i < n; i++) this.orbs.push(this.makeOrb(type))
    })
  }

  private buildFx() {
    const g = this.keep(new THREE.BufferGeometry())
    const pos = new Float32Array(FX_MAX * 3)
    for (let i = 0; i < FX_MAX; i++) pos[i * 3 + 1] = -9999
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(FX_MAX * 3), 3))
    this.fxPts = new THREE.Points(g, this.keep(dotMaterial(0.32, true, 1, true)))
    this.fxPts.frustumCulled = false
    this.scene.add(this.fxPts)
  }

  private setUniverse(i: number, era = -1) {
    this.universe = i
    const base = UNIVERSES[i]
    const patch = era >= 0 ? base.eras?.[era]?.patch : undefined
    this.eraIx = patch ? era : -1
    const u: Universe = patch ? { ...base, ...patch } : base
    this.def = u
    this.fogBase = u.fogD ?? 0.003
    ;(this.scene.background as THREE.Color).setHex(u.bg)
    ;(this.scene.fog as THREE.FogExp2).color.setHex(u.fog ?? u.bg)
    ;(this.scene.fog as THREE.FogExp2).density = this.fogBase * this.fogK
    this.sky.set(u)
    const leak = u.realm === 'corrupt' ? 0 : Math.min(0.5, this.infection * 0.2)
    if (leak > 0) this.sky.setGlitch(Math.max(u.glitch ?? 0, leak))
    this.sig.set(u)
    this.rimLight.color.setHex(u.rim)
    this.cosmos.setTheme(u)
    this.cosmos.setInfection(leak)
    this.cosmos.reset(i === 0)
    this.ambient.setMode(u.ambient ?? '')
    this.renderer.toneMappingExposure = u.exposure ?? 1.05
    const rm = this.res.rockMat as THREE.MeshStandardMaterial
    rm.color.setHex(u.rock?.color ?? 0xb0a89e)
    rm.emissive.setHex(u.rock?.emissive ?? 0x2a2420)
    rm.emissiveIntensity = u.rock?.k ?? 0.4
    this.decor.visible = !u.empty
    this.worm.setStyle(u.worm ?? (this.infection > 0 && !u.empty ? 'unstable' : ''))
    this.realms.set(u, { visited: this.visited, infection: this.infection, cheat: this.cheat })
  }

  private realmHost(): RealmHost {
    return {
      say: t => (this.discT > 0 ? this.noticeQ.push(t) : this.say(t)),
      burst: (x, y, z, n, sp, r, g, b) => this.burst(x, y, z, n, sp, r, g, b),
      pulse: (hex, x, y) => this.worm.pulse(hex, x, y),
      hurt: a => this.hurt(a),
      heal: a => { this.hp = Math.min(this.maxHp, this.hp + a) },
      hull: a => { this.maxHp += a; this.hp += a },
      energy: n => { this.run.energy += n },
      orb: (x, y, z, type) => this.spawnOrb(x, y, z, type),
      river: n => { this.riverLeft += n; this.riverClock = 0 },
      quiet: d => { this.sinceSpawn = Math.min(this.sinceSpawn, -d) },
      portalSoon: sec => { if (!this.portalOn && this.warpT <= 0) this.nextPortal = Math.min(this.nextPortal, this.run.time + sec) },
      recharge: () => { this.hyper = 100; this.hyperLock = false },
      sfx: n => this.audio.play(n),
      found: id => this.onFound(id)
    }
  }

  private onFound(id: string) {
    const d = DISCOVERIES.find(x => x.id === id)
    if (!d) return
    const fresh = this.hooks.find(id)
    if (!this.foundRun.includes(id)) this.foundRun.push(id)
    const bonus = d.secret ? 80 : 50
    this.run.energy += bonus
    this.hp = Math.min(this.maxHp, this.hp + 25)
    this.say(`${fresh ? 'New discovery' : 'Discovery'}: ${d.name}  +${bonus}`)
    this.discT = 3.4
    this.flashColor = '#ffffff'
    this.hitFlash = 0
    this.audio.play('hyper')
  }

  setFpp(v: boolean) {
    this.fpp = v
    if (this.rig && this.view === 'play' && this.phase === 'run') this.rig.group.visible = !v
  }

  private fppActive(): boolean {
    return this.fpp && this.view === 'play' && (this.phase === 'run' || (this.phase === 'crash' && !this.exploded))
  }

  private say(text: string) {
    this.notice = text
    this.noticeT = 3.5
  }

  private tickEvents(dt: number, announce: boolean) {
    this.eventT -= dt
    if (this.def.empty) return
    if (this.eventT > 0 || this.cosmos.event) return
    this.eventT = rnd(this.md.evGap[0], this.md.evGap[1])
    const kinds: SpaceEvent[] = ['meteors', 'supernova', 'ion', 'singularity']
    const kind = kinds[Math.floor(Math.random() * kinds.length)]
    this.cosmos.trigger(kind)
    if (announce) {
      const names: Record<SpaceEvent, string> = { meteors: 'Meteor shower', flare: 'Solar flare', supernova: 'Supernova in the distance', ion: 'Ion storm', singularity: 'Singularity ahead' }
      this.say(names[kind])
    }
  }

  setShip(id: string) {
    if (this.shipId === id && this.rig) return
    const def = SHIPS.find(s => s.id === id) ?? SHIPS[0]
    let rig = this.rigs.get(def.id)
    if (!rig) {
      rig = buildShip(def)
      this.rigs.set(def.id, rig)
    }
    if (this.rig) {
      this.scene.remove(this.rig.group)
      rig.group.position.copy(this.rig.group.position)
      rig.group.scale.copy(this.rig.group.scale)
    } else {
      rig.group.scale.setScalar(0.85)
    }
    this.rig = rig
    this.shipId = def.id
    this.scene.add(rig.group)
  }

  setQuality(q: Quality) {
    this.quality = q
    const c = QUALITY[q]
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, c.dpr))
    this.cosmos.setCount(c.stars)
    this.cosmos.setLite(q === 'low' ? 0 : q === 'medium' ? 1 : 2)
    this.ambient.setQuality(q === 'low' ? 0.4 : q === 'medium' ? 0.7 : 1)
    this.ambient.setMode(this.def.ambient ?? '')
    this.realms.setLite(q === 'low' ? 0 : q === 'medium' ? 1 : 2)
    this.sig.lite = q === 'low'
    this.sig.set(this.def)
    this.sky.setQuality(q)
    this.streaks.geometry.setDrawRange(0, c.streaks * 2)
    this.decor.count = c.decor
    this.resize()
  }

  setView(v: View) {
    if (this.view === 'play' && v !== 'play') {
      this.clearWorld()
      this.infection = 0
      this.fogK = 1
      this.rollCam = 0
      this.noticeQ = []
      if (this.universe !== 0 || this.eraIx !== -1) this.setUniverse(0)
    }
    this.view = v
    this.paused = false
    this.phase = 'idle'
    this.audio.setDrone(false, 0)
    this.streaks.visible = false
    this.worm.close()
    if (this.rig) this.rig.group.visible = true
  }

  setHyper(v: boolean) {
    this.hyperHeld = v
  }

  private get shipScale() {
    return this.portrait ? 0.3 : 0.42
  }

  private get sr() {
    return (SHIP_RADIUS * this.shipScale) / 0.42
  }

  startRun(mode: ModeId) {
    const s = this.hooks.save()
    const ship = SHIPS.find(x => x.id === s.ship) ?? SHIPS[0]
    const md = MODES[mode]
    this.setShip(ship.id)
    this.clearWorld()
    this.modeId = mode
    this.md = md
    this.mod = {
      base: 24 * ship.stats.speed,
      lat: 12 * ship.stats.handling,
      k: 6.5 * ship.stats.handling,
      magnet: 2 + ship.stats.magnet,
      drain: 30,
      regen: 13 * ship.stats.hyper * md.regen
    }
    this.run = { dist: 0, energy: 0, passed: 0, time: 0, maxSpeed: 0 }
    this.pos.set(0, 0)
    this.target.set(0, 0)
    this.vel.set(0, 0)
    this.bank = 0
    this.pitch = 0
    this.safe = { x: 0, y: 0 }
    this.hyper = 100
    this.hyperActive = false
    this.hyperLock = false
    this.hyperLerp = 0
    this.shake = 0
    this.warp = 0
    this.warpT = 0
    this.portalOn = false
    this.worm.close()
    this.nextPortal = rnd(22, 40) * md.portal
    this.relief = 0
    this.boost = 1
    this.glitchT = 0
    this.glitchNext = rnd(8, 14) * md.hazard
    this.batNext = rnd(6, 10) * md.hazard
    this.stormNext = rnd(10, 16) * md.hazard
    this.epicNext = rnd(14, 22)
    this.epicLast = -1
    this.riverLeft = 0
    this.surgeWait = 0
    this.surgeT = 0
    this.surgeK = 0
    this.chain = []
    this.stormT = 0
    this.stormWarn = 0
    this.phenoNext = rnd(18, 28)
    this.pulsar.on = false
    this.flareT = 0
    this.flareWarn = 0
    this.lensS = 0
    this.maxHp = md.hp
    this.hp = md.hp
    this.invuln = 0
    this.hitFlash = 0
    this.spin = 0
    this.ease = 1
    this.eventT = rnd(md.evGap[0], md.evGap[1])
    this.notice = ''
    this.noticeT = 0
    this.visited = 1
    this.bag = []
    this.infection = 0
    this.eraIx = -1
    this.nextEra = -1
    this.foundRun = []
    this.noticeQ = []
    this.discT = 0
    this.tagQ = null
    this.realmSpd = 1
    this.fogK = 1
    this.rollCam = 0
    this.realms.reset()
    this.speed = this.mod.base * md.speed
    this.level = 0
    this.sinceSpawn = this.gap()
    this.setUniverse(0)
    this.view = 'play'
    this.phase = 'run'
    this.exploded = false
    this.paused = false
    this.hudT = 0
    if (this.rig) {
      this.rig.group.visible = !this.fpp
      this.rig.group.rotation.set(0, 0, 0)
    }
  }

  restartRun() {
    this.startRun(this.modeId)
  }

  pause(): boolean {
    if (this.view !== 'play' || this.phase !== 'run') return false
    this.paused = true
    this.audio.setDrone(false, 0)
    return true
  }

  resume() {
    this.paused = false
    this.last = performance.now()
  }

  abandonRun(): RunResult | null {
    if (this.view !== 'play' || this.phase === 'idle') return null
    const r = this.result()
    this.phase = 'idle'
    return r
  }

  private result(): RunResult {
    const r = this.run
    return { mode: this.modeId, score: this.score(), dist: r.dist, energy: r.energy, passed: r.passed, time: r.time, maxSpeed: r.maxSpeed, universes: this.visited, found: [...this.foundRun] }
  }

  private score() {
    const r = this.run
    return Math.floor(r.dist * SCORE.perMeter) + r.energy * SCORE.perEnergy + r.passed * SCORE.perPass
  }

  private clearWorld() {
    for (const o of this.allObs) {
      o.active = false
      o.obj.visible = false
    }
    for (const o of this.orbs) {
      o.active = false
      o.obj.visible = false
    }
    const col = this.fxPts.geometry.attributes.color as THREE.BufferAttribute
    ;(col.array as Float32Array).fill(0)
    col.needsUpdate = true
    this.fxData.life.fill(0)
    this.streaks.visible = false
    this.worm.close()
  }

  private gap() {
    return clamp(70 - this.level * 1.5, 52, 70)
  }

  private suspended = false

  suspend(on: boolean) {
    this.suspended = on
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = clamp((now - this.last) / 1000, 0.001, 0.05)
    this.last = now
    if (this.suspended) return
    if (!(this.view === 'play' && this.paused)) {
      this.t += dt
      this.dt = dt
      if (this.view === 'play') {
        if (this.phase === 'run') this.updateRun(dt)
        else if (this.phase === 'crash') this.updateCrash(dt)
      } else {
        this.updateIdle(dt)
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  private updateIdle(dt: number) {
    const rig = this.rig
    if (!rig) return
    this.dz = 6 * dt
    this.worldStep(dt, 0)
    this.cosmos.update(dt, 2.5)
    this.ambient.update(dt, 6)
    this.sky.update(dt, this.camera.position, 6)
    this.sig.update(dt, 6)
    this.worm.update(dt, 0, 0, 0)
    const wide = this.camera.aspect > 1.15
    const hangar = this.view === 'hangar'
    const tx = wide ? 2.3 : 0
    const ty = wide ? -0.1 : 1.9
    const sc = (hangar ? 0.95 : 0.85) * (this.portrait ? 0.68 : 1)
    const g = rig.group
    g.position.x += (tx - g.position.x) * damp(4, dt)
    g.position.y += (ty + Math.sin(this.t * 1.3) * 0.08 - g.position.y) * damp(4, dt)
    g.position.z += (0 - g.position.z) * damp(4, dt)
    g.scale.setScalar(g.scale.x + (sc - g.scale.x) * damp(4, dt))
    if (hangar) {
      if (!this.drag) this.yaw += (this.yawVel + 0.25) * dt
      this.yawVel *= Math.exp(-2.5 * dt)
    } else {
      this.yaw += (2.45 + Math.sin(this.t * 0.3) * 0.35 - this.yaw) * damp(2, dt)
    }
    g.rotation.set(0.12, this.yaw, Math.sin(this.t * 0.9) * 0.03)
    updateRig(rig, this.t, 0.55)
    this.camGoal(0, hangar ? 1.2 : 1.5, hangar ? 7.5 : 8.6, 0, 0.1, 0, 3, dt)
    this.setFov(this.portrait ? 72 : 62)
    this.updateFx(dt)
  }

  private camGoal(px: number, py: number, pz: number, lx: number, ly: number, lz: number, k: number, dt: number) {
    const a = damp(k, dt)
    this.camPos.x += (px - this.camPos.x) * a
    this.camPos.y += (py - this.camPos.y) * a
    this.camPos.z += (pz - this.camPos.z) * a
    this.camLook.x += (lx - this.camLook.x) * a
    this.camLook.y += (ly - this.camLook.y) * a
    this.camLook.z += (lz - this.camLook.z) * a
    this.camera.position.copy(this.camPos)
    this.camera.lookAt(this.camLook)
  }

  private setFov(f: number) {
    if (Math.abs(this.camera.fov - f) > 0.05) {
      this.camera.fov = f
      this.camera.updateProjectionMatrix()
    }
  }

  private worldStep(dt: number, hy: number) {
    const d = this.dz
    const c = QUALITY[this.quality]
    if (hy > 0.02) {
      this.streaks.visible = true
      const sd = this.streakData
      const sp = this.streaks.geometry.attributes.position as THREE.BufferAttribute
      const sa = sp.array as Float32Array
      const len = 1.5 + hy * 18
      for (let i = 0; i < c.streaks; i++) {
        let z = sd.z[i] + d * 1.2
        if (z > 10) z -= 260
        sd.z[i] = z
        const o6 = i * 6
        sa[o6] = sd.x[i]
        sa[o6 + 1] = sd.y[i]
        sa[o6 + 2] = z
        sa[o6 + 3] = sd.x[i]
        sa[o6 + 4] = sd.y[i]
        sa[o6 + 5] = z - len
      }
      sp.needsUpdate = true
      ;(this.streaks.material as THREE.LineBasicMaterial).opacity = Math.min(1, hy) * 0.7
    } else {
      this.streaks.visible = false
    }

    const dd = this.decorData
    const tmp = this.res.tmp
    for (let i = 0; i < c.decor; i++) {
      dd.z[i] += d
      if (dd.z[i] > 14) this.placeDecor(i, dd.z[i] - 400)
      tmp.position.set(dd.x[i], dd.y[i], dd.z[i])
      tmp.rotation.set(dd.r[i] + this.t * 0.1, dd.r[i] * 2 + this.t * 0.07, 0)
      tmp.scale.setScalar(dd.s[i])
      tmp.updateMatrix()
      this.decor.setMatrixAt(i, tmp.matrix)
    }
    this.decor.instanceMatrix.needsUpdate = true
  }

  private updateRun(dt: number) {
    const m = this.mod
    const md = this.md
    const run = this.run
    const rig = this.rig!
    run.time += dt

    const k = this.keys
    const ix = (k.r ? 1 : 0) - (k.l ? 1 : 0)
    const iy = (k.u ? 1 : 0) - (k.d ? 1 : 0)
    const rf = this.realms.update(dt, { dz: this.dz, speed: this.speed, px: this.pos.x, py: this.pos.y, sr: this.sr, magnet: this.magnetR(), cheat: this.cheat, hyper: this.hyperActive, fpp: this.fppActive(), visited: this.visited, infection: this.infection })
    this.sig.player.x = this.pos.x
    this.sig.player.y = this.pos.y
    this.sig.player.hyper = this.hyperLerp
    const inv = this.glitchT > 0 || rf.invert ? -1 : 1
    const lat = m.lat * rf.handling
    this.target.x = clamp(this.target.x + (ix * inv * lat + rf.fx) * dt, -FIELD.x, FIELD.x)
    this.target.y = clamp(this.target.y + (iy * inv * lat * 0.8 + rf.fy) * dt, -FIELD.y, FIELD.y)
    const lens = this.cosmos.lens()
    if (lens) {
      this.target.x = clamp(this.target.x + Math.sign(lens.x - this.pos.x) * lens.s * 2.4 * dt, -FIELD.x, FIELD.x)
      this.lensS += (lens.s - this.lensS) * damp(4, dt)
      if (!this.lensSeen && lens.s > 0.5) {
        this.lensSeen = true
        this.say('Gravity lensing: black hole pull')
      }
    } else {
      this.lensS += (0 - this.lensS) * damp(4, dt)
      this.lensSeen = false
    }
    if (this.warpT > 0) this.target.multiplyScalar(1 - damp(3, dt))
    const px = this.pos.x
    const py = this.pos.y
    const a = damp(m.k, dt)
    this.pos.x += (this.target.x - this.pos.x) * a
    this.pos.y += (this.target.y - this.pos.y) * a
    this.vel.set((this.pos.x - px) / dt, (this.pos.y - py) / dt)

    if (this.hyperHeld && !this.hyperActive && this.hyper >= 15 && !this.hyperLock) {
      this.hyperActive = true
      this.audio.play('hyper')
    }
    if (this.hyperActive) {
      this.hyper -= m.drain * this.realms.up.drain * dt
      if (this.hyper <= 0 || !this.hyperHeld) {
        this.hyperActive = false
        if (this.hyper <= 0) {
          this.hyper = 0
          this.hyperLock = true
        }
      }
    } else if (rf.drain > 0 && !this.cheat) {
      this.hyper = Math.max(0, this.hyper - rf.drain * dt)
      if (this.hyper <= 0) this.hyperLock = true
    } else {
      this.hyper = Math.min(100, this.hyper + m.regen * this.realms.up.regen * dt)
      if (this.hyper >= 25) this.hyperLock = false
    }
    if (this.cheat) this.hyper = 100
    this.hyperLerp += ((this.hyperActive || this.cheat ? 1 : 0) - this.hyperLerp) * damp(4, dt)
    this.boost += ((this.cheat && this.hyperHeld ? 3 : this.surgeT > 0 ? 1.3 : 1) - this.boost) * damp(5, dt)
    const hy = this.hyperLerp

    const diff = Math.max(0, run.dist - this.relief)
    this.level = Math.floor(diff / md.lvlStep) + md.lvlShift
    const base = (m.base + Math.min(diff * 0.004 * md.ramp, 10)) * md.speed
    this.realmSpd += (rf.spd - this.realmSpd) * damp(4, dt)
    this.speed = base * (1 + 0.55 * hy) * (1 + this.warp * 1.2) * (this.cheat ? 1.8 : 1) * this.boost * this.realmSpd
    const d = this.speed * dt
    this.dz = d
    run.dist += d
    this.ease = Math.min(1, this.ease + d / 1500)
    run.maxSpeed = Math.max(run.maxSpeed, this.speed * 10)

    this.updatePortal(dt, d)

    if (!this.portalOn && this.warpT <= 0) {
      this.sinceSpawn += d
      const gap = this.gap()
      if (this.sinceSpawn >= gap) {
        this.sinceSpawn -= gap
        this.spawnPattern()
      }
    }

    this.worldStep(dt, Math.max(hy, this.warp, this.surgeK))
    this.cosmos.update(dt, this.speed * 0.3 + this.warp * 30)
    this.ambient.update(dt, this.speed)
    this.sky.update(dt, this.camera.position, this.speed)
    this.sig.update(dt, this.speed)
    if (!this.portalOn && this.warpT <= 0) {
      this.tickEvents(dt, true)
      this.tickEpic(dt)
    }
    this.tickHazards(dt)
    this.worm.update(dt, this.warp, this.pos.x, this.pos.y)
    this.noticeT = Math.max(0, this.noticeT - dt)
    this.discT = Math.max(0, this.discT - dt)
    if (this.noticeT <= 0.05 && this.noticeQ.length && this.discT <= 0) this.say(this.noticeQ.shift()!)
    if (this.tagQ && (this.tagQ.t -= dt) <= 0) {
      if (this.noticeT <= 0.05) this.say(this.tagQ.text)
      this.tagQ = null
    }
    this.fogK += (rf.fog - this.fogK) * damp(2, dt)
    ;(this.scene.fog as THREE.FogExp2).density = this.fogBase * this.fogK
    this.rollCam += (rf.roll - this.rollCam) * damp(4, dt)
    this.updateObstacles(dt)
    this.updateOrbs(dt)
    this.tickRiver(dt)

    this.shake = Math.max(0, this.shake - dt * 2.5)
    this.invuln = Math.max(0, this.invuln - dt)
    this.hitFlash = Math.max(0, this.hitFlash - dt * 1.8)
    this.updateZaps(dt)

    const ss = this.shipScale
    this.bank += (-this.vel.x * 0.05 - this.bank) * damp(8, dt)
    this.pitch += (this.vel.y * 0.025 - 0.07 * hy - this.pitch) * damp(8, dt)
    this.bank = clamp(this.bank, -0.9, 0.9)
    const g = rig.group
    g.position.x += (this.pos.x - g.position.x) * damp(14, dt)
    g.position.y += (this.pos.y + Math.sin(this.t * 2) * 0.03 - g.position.y) * damp(14, dt)
    g.position.z += (0 - g.position.z) * damp(8, dt)
    g.scale.setScalar(g.scale.x + (ss * (1 - 0.55 * this.warp) - g.scale.x) * damp(5, dt))
    this.spin += this.warp * dt * 9
    if (this.warp === 0) this.spin += (Math.round(this.spin / TAU) * TAU - this.spin) * damp(8, dt)
    g.rotation.set(this.pitch + (Math.random() - 0.5) * 0.05 * hy, 0, this.bank + this.spin)
    updateRig(rig, this.t, 0.45 + hy * 1.1 + this.warp * 0.8)
    this.updateFx(dt)

    const fpp = this.fppActive()
    rig.group.visible = !fpp
    if (fpp) {
      const sh = this.shake * 0.1
      const ex = this.pos.x + (Math.random() - 0.5) * sh
      const ey = this.pos.y + 0.3 + (Math.random() - 0.5) * sh
      this.camGoal(ex, ey, -0.4, this.pos.x * 0.92 + this.vel.x * 0.03, this.pos.y * 0.9 + 0.12 + this.vel.y * 0.02, -30, 26, dt)
      this.camera.rotateZ(this.bank * 0.55 + this.rollCam + Math.sin(this.spin) * 0.5 * this.warp + (Math.random() - 0.5) * 0.02 * hy)
    } else {
      const tz = (this.portrait ? 6.6 : 5.8) + hy * 1.2
      this.camGoal(this.pos.x * 0.6, this.pos.y * 0.55 + 1.6, tz, this.pos.x * 0.75, this.pos.y * 0.6 + 0.3, -14, 5, dt)
      this.camera.rotateZ(-this.vel.x * 0.004 + this.rollCam)
    }
    this.setFov((this.portrait ? 76 : 62) + hy * 14 + this.warp * 35 + this.lensS * 5 + (this.boost - 1) * 8 + this.surgeK * 8)

    this.audio.setDrone(true, clamp(this.speed / 90, 0, 1))

    this.hudT -= dt
    if (this.hudT <= 0) {
      this.hudT = 0.08
      this.emitHud()
    }
  }

  private emitHud() {
    this.hooks.hud({
      dist: this.run.dist,
      score: this.score(),
      speed: this.speed * 10,
      energy: this.run.energy,
      hyper: this.hyper,
      hp: this.hp,
      maxHp: this.maxHp,
      hit: this.hitFlash,
      flash: this.flashColor,
      cheat: this.cheat,
      glitch: Math.min(1, this.glitchT),
      storm: this.stormWarn > 0 ? 0.3 : this.stormT > 0 ? 0.65 : 0,
      glare: this.flareT > 0 ? Math.min(1, this.flareT / 3.5) : 0,
      hyperOn: this.hyperActive,
      level: this.level,
      universe: this.def.name + (this.eraIx >= 0 ? ' · ' + (UNIVERSES[this.universe].eras?.[this.eraIx]?.name ?? '') : ''),
      warp: this.warp,
      notice: this.noticeT > 0 ? this.notice : '',
      tag: this.realms.fx.tag,
      frost: this.realms.fx.frost,
      scramble: this.realms.fx.scramble,
      corrupt: this.realms.fx.corrupt,
      fpp: this.fppActive(),
      bank: this.bank
    })
  }

  private magnetR(): number {
    return this.mod.magnet + this.realms.up.magnet
  }

  private tickRiver(dt: number) {
    if (this.riverLeft <= 0 || this.phase !== 'run') return
    this.riverClock -= dt
    if (this.riverClock > 0) return
    this.riverClock = 0.11
    const i = this.riverLeft--
    this.riverPh += 0.38
    const x = clamp(Math.sin(this.riverPh) * 3.9, -FIELD.x + 0.8, FIELD.x - 0.8)
    const y = clamp(Math.sin(this.riverPh * 0.7 + 1) * 1.9, -FIELD.y + 0.6, FIELD.y - 0.6)
    this.spawnOrb(x, y, SPAWN_Z, i === 1 ? 2 : i % 9 === 0 ? 1 : 0)
  }

  private updatePortal(dt: number, d: number) {
    if (!this.portalOn && this.warpT <= 0 && this.run.time >= this.nextPortal) {
      this.portalOn = true
      this.nextEra = -1
      this.nextUniverse = drawUniverse(this.bag, this.universe, this.visited)
      const tint = UNIVERSES[this.nextUniverse].portal[0]
      this.flashColor = '#' + UNIVERSES[this.nextUniverse].portal[1].toString(16).padStart(6, '0')
      const destEras = UNIVERSES[this.nextUniverse].eras
      this.nextEra = destEras && Math.random() < 0.5 ? Math.floor(Math.random() * destEras.length) : -1
      this.say('Wormhole detected')
      this.worm.setStyle(this.def.worm ?? (this.infection > 0 && !this.def.empty ? 'unstable' : ''))
      this.worm.setColors(this.def.portal, tint)
      this.worm.spawn(-520)
      this.rerollT = 0.8
    }
    if (this.portalOn && this.def.chaos) {
      this.rerollT -= dt
      if (this.rerollT <= 0) {
        this.rerollT = rnd(0.5, 1)
        const ok = UNIVERSES.map((_, i) => i).filter(i => i !== this.universe && (UNIVERSES[i].late ?? 0) <= this.visited)
        this.nextUniverse = pick(ok)
        this.nextEra = -1
        this.worm.setColors(this.def.portal, UNIVERSES[this.nextUniverse].portal[0])
        this.flashColor = '#' + UNIVERSES[this.nextUniverse].portal[1].toString(16).padStart(6, '0')
      }
    }
    if (this.portalOn) {
      this.worm.advance(d)
      if (this.worm.z > -4) {
        this.portalOn = false
        this.warpT = WARP_TIME
        this.warpSwapped = false
        this.audio.play('hyper')
        this.worm.pulse(this.def.portal[1], this.pos.x, this.pos.y)
        this.burst(this.pos.x, this.pos.y, -2, 70, 12, 0.7, 0.8, 1)
      }
    }
    if (this.warpT > 0) {
      this.warpT -= dt
      const p = clamp(1 - this.warpT / WARP_TIME, 0, 1)
      this.warp = Math.sin(Math.PI * p)
      if (!this.warpSwapped && p >= 0.5) {
        this.warpSwapped = true
        const sameUniverse = this.nextUniverse === this.universe && this.nextEra !== this.eraIx
        if (!sameUniverse) this.visited++
        this.setUniverse(this.nextUniverse, this.nextEra)
        for (const o of this.allObs) {
          o.active = false
          o.obj.visible = false
        }
        for (const o of this.orbs) {
          o.active = false
          o.obj.visible = false
        }
        this.worm.close()
        this.relief = this.run.dist - Math.max(0, this.run.dist - this.relief) * 0.5
        this.ease = 0.6
        this.worm.pulse(this.def.portal[1], this.pos.x, this.pos.y)
        this.burst(this.pos.x, this.pos.y, -2, 90, 14, 1, 0.9, 0.7)
        if (sameUniverse) this.say('Time shift: ' + (this.eraIx >= 0 ? UNIVERSES[this.universe].eras![this.eraIx].name : 'the present'))
        else this.say('Entering ' + this.def.name)
        this.tagQ = this.def.tag ? { t: 3.6, text: this.def.tag } : null
      }
      if (this.warpT <= 0) {
        this.warp = 0
        this.sinceSpawn = -40
        this.nextPortal = this.run.time + rnd(30, 65) * this.md.portal
      }
    }
  }

  private updateCrash(dt: number) {
    this.crashT -= dt
    const k = 1 - this.crashT / 2.3
    const sd = this.exploded && k < 0.7 ? dt * 0.45 : dt
    this.speed *= Math.exp(-1.2 * dt)
    this.dz = this.speed * sd
    this.shake = Math.max(0, this.shake - dt * 1.2)
    this.hitFlash = Math.max(0, this.hitFlash - dt * 1.4)
    this.worldStep(sd, 0)
    this.cosmos.update(sd, this.speed * 0.3)
    this.ambient.update(sd, this.speed)
    this.sky.update(sd, this.camera.position, this.speed)
    this.sig.update(sd, this.speed)
    this.worm.update(sd, 0, 0, 0)
    this.realms.update(sd, { dz: this.dz, speed: this.speed, px: this.pos.x, py: this.pos.y, sr: this.sr, magnet: 0, cheat: false, hyper: false, fpp: this.fppActive(), visited: this.visited, infection: this.infection })
    for (const o of this.allObs) {
      if (!o.active) continue
      o.z += this.dz
      o.obj.position.z = o.z
      if (o.z > 14) {
        o.active = false
        o.obj.visible = false
      }
    }
    for (const o of this.orbs) if (o.active) this.moveOrb(o, sd, false)
    const g = this.rig!.group
    if (!this.exploded) {
      g.position.x += this.crashV.x * dt
      g.position.y += this.crashV.y * dt
      g.position.z -= dt * 1.5
      g.rotation.z += dt * (6 + k * 18)
      g.rotation.x += dt * 2.5
      g.rotation.y += dt * 1.3
      this.smokeT -= dt
      if (this.smokeT <= 0) {
        this.smokeT = 0.05
        this.burst(g.position.x, g.position.y, g.position.z + 1, 3, 2.5, 1, 0.5, 0.15)
        this.burst(g.position.x, g.position.y, g.position.z + 1, 2, 1.5, 0.5, 0.5, 0.55)
      }
      if (k >= 0.4) this.explode()
    } else {
      for (const d of this.debris) {
        if (d.life <= 0) continue
        d.life -= sd
        d.m.position.addScaledVector(d.v, sd)
        d.m.rotation.x += d.w.x * sd
        d.m.rotation.y += d.w.y * sd
        d.m.scale.setScalar(Math.max(0.01, Math.min(1, d.life)))
        if (d.life <= 0) d.m.visible = false
      }
      if (this.blastT < 1) {
        this.blastT = Math.min(1, this.blastT + sd / 0.7)
        this.blast.scale.setScalar(4 + 36 * this.blastT)
        ;(this.blast.material as THREE.SpriteMaterial).opacity = 1 - this.blastT
        if (this.blastT >= 1) this.blast.visible = false
      }
    }
    this.updateFx(sd)
    const s = this.shake
    if (this.fppActive()) {
      this.rig!.group.visible = false
      this.camGoal(g.position.x + (Math.random() - 0.5) * s * 0.12, g.position.y + 0.3, g.position.z - 0.4, g.position.x * 0.92, g.position.y * 0.9 + 0.1, -30, 18, dt)
      this.camera.rotateZ(g.rotation.z * 0.4)
    } else {
      this.camGoal(this.pos.x * 0.6 + (Math.random() - 0.5) * s * 0.25, this.pos.y * 0.55 + 1.6 + (Math.random() - 0.5) * s * 0.25, (this.portrait ? 6.6 : 6.4) + k * 3, this.pos.x * 0.75, this.pos.y * 0.6 + 0.3, -14, 3, dt)
    }
    this.setFov(this.portrait ? 76 : 62)
    this.hudT -= dt
    if (this.hudT <= 0) {
      this.hudT = 0.08
      this.emitHud()
    }
    if (this.crashT <= 0) {
      for (const d of this.debris) d.m.visible = false
      this.blast.visible = false
      this.phase = 'idle'
      this.audio.setDrone(false, 0)
      this.hooks.end(this.result())
    }
  }

  private updateObstacles(dt: number) {
    const run = this.run
    for (const o of this.allObs) {
      if (!o.active) continue
      if (o.amp > 0) {
        o.x = o.x0 + Math.sin(this.t * o.fq + o.ph) * o.amp
        o.y = o.y0 + Math.cos(this.t * o.fq * 0.8 + o.ph * 1.3) * o.amp * 0.7
        o.extra = Math.sin(this.t * 1.7 + o.ph) * 7 + 2
        o.obj.position.x = o.x
        o.obj.position.y = o.y
      }
      if (o.glitchy) this.glitchObstacle(o, dt)
      o.z += this.dz + o.extra * dt
      o.obj.position.z = o.z
      switch (o.kind) {
        case 'asteroid':
        case 'wreck':
        case 'satellite':
        case 'crystal':
          o.obj.rotation.x += o.spin.x * dt
          o.obj.rotation.y += o.spin.y * dt
          break
        case 'comet':
          o.obj.children[0].rotation.y += dt
          break
        case 'bat':
          o.x = o.x0 + Math.sin(this.t * 3 + o.ph) * 2.2
          o.y = o.spin.y + Math.cos(this.t * 2.4 + o.ph) * 1.4
          o.obj.position.set(o.x, o.y, o.z)
          o.obj.scale.set(2 * (0.55 + 0.45 * Math.abs(Math.sin(this.t * 14 + o.ph))), 1.5, 1)
          break
        case 'fireball':
          o.x += o.spin.x * dt
          o.y += o.spin.z * dt
          o.obj.position.set(o.x, o.y, o.z)
          break
        case 'anomaly': {
          o.x = o.x0 + Math.sin(this.t * 1.4 + o.ph) * 2.5
          o.obj.position.x = o.x
          o.obj.scale.setScalar(1 + Math.sin(this.t * 6 + o.ph) * 0.1)
          o.obj.rotation.y += dt * 1.5
          break
        }
      }
      if (!o.passed && o.z > 2.5) {
        o.passed = true
        run.passed++
      }
      if (o.z > 14) {
        o.active = false
        o.obj.visible = false
        continue
      }
      if (this.phase !== 'run') continue
      if (this.cheat && o.z > -(75 + 55 * (this.boost - 1)) && o.z < -2) {
        this.zap(o)
        this.destroy(o)
        run.passed++
        continue
      }
      if (!o.ghost && this.warpT <= 0 && this.hit(o)) this.damage(o)
    }
  }

  private glitchObstacle(o: Obs, dt: number) {
    if (o.z < -50) {
      o.gt -= dt
      if (o.gt <= 0) {
        o.gt = rnd(0.6, 1.6)
        if (Math.random() < 0.55) o.ghost = !o.ghost
        else {
          o.x = clamp(o.x + rnd(-2.2, 2.2), -9.5, 9.5)
          o.obj.position.x = o.x
        }
      }
      o.obj.visible = !o.ghost || Math.random() < 0.1
    } else if (o.ghost) {
      o.ghost = false
      o.obj.visible = true
      this.burst(o.x, o.y, o.z, 12, 5, 1, 0, 0.7)
    }
  }

  private hit(o: Obs): boolean {
    const mv = this.dz + o.extra * this.dt
    const zc = o.z >= 0 && o.z - mv <= 0 ? 0 : Math.min(Math.abs(o.z), Math.abs(o.z - mv))
    const dx = this.pos.x - o.x
    const dy = this.pos.y - o.y
    const rr = o.r + this.sr * 0.8
    return dx * dx + dy * dy + zc * zc < rr * rr
  }

  private crash() {
    this.phase = 'crash'
    this.crashT = 2.3
    this.exploded = false
    this.smokeT = 0
    this.shake = 0.8
    this.hitFlash = 1
    this.crashV.set(this.vel.x * 0.25 + rnd(-1, 1), this.vel.y * 0.25 + 1.2)
    this.audio.setDrone(false, 0)
    this.audio.play('shield')
  }

  private explode() {
    this.exploded = true
    const x = this.rig ? this.rig.group.position.x : this.pos.x
    const y = this.rig ? this.rig.group.position.y : this.pos.y
    if (this.rig) this.rig.group.visible = false
    this.burst(x, y, 0, 110, 16, 1, 0.6, 0.2)
    this.burst(x, y, 0, 60, 9, 1, 0.95, 0.8)
    this.worm.pulse(0xff8a3a, x, y)
    this.blast.position.set(x, y, 0.5)
    this.blast.visible = true
    this.blastT = 0
    this.shake = 2
    this.hitFlash = 1
    this.audio.play('crash')
    for (const d of this.debris) {
      d.m.position.set(x, y, 0)
      d.v.set(rnd(-7, 7), rnd(-5, 6), rnd(-6, 4))
      d.w.set(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8))
      d.life = rnd(1.1, 1.9)
      d.m.visible = true
      d.m.scale.setScalar(1)
    }
  }

  private destroy(o: Obs) {
    o.active = false
    o.obj.visible = false
    this.burst(o.x, o.y, o.z, 26, 7, 1, 0.65, 0.3)
  }

  private damage(o: Obs) {
    if (this.invuln > 0) return
    this.destroy(o)
    this.hurt(DMG[o.kind])
  }

  private hurt(a: number) {
    if (this.invuln > 0 || this.cheat || this.phase !== 'run') return
    this.hp -= Math.max(1, Math.round(a * this.md.dmg * this.realms.up.dmg))
    this.invuln = this.md.grace
    this.hitFlash = 1
    this.shake = 0.9
    this.audio.play('shield')
    if (this.hp <= 0) {
      this.hp = 0
      this.crash()
    }
  }

  private spawnBats() {
    const n = 5 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) {
      const o = this.take('bat')
      o.x0 = o.x = clamp(this.pos.x + rnd(-3, 3), -FIELD.x - 1, FIELD.x + 1)
      o.y = clamp(this.pos.y + rnd(-2, 2), -4, 4)
      o.spin.set(0, o.y, 0)
      o.z = SPAWN_Z + rnd(-2, 2) - i * 3
      o.r = RC.bat
      o.extra = 7
      o.obj.position.set(o.x, o.y, o.z)
    }
  }

  private spawnFireball() {
    const o = this.take('fireball')
    const z = SPAWN_Z * 0.8 - rnd(0, 10)
    o.x0 = o.x = clamp(this.pos.x + rnd(-4, 4), -FIELD.x - 1, FIELD.x + 1)
    o.y = rnd(4, 6.5)
    o.z = z
    o.r = RC.fireball
    o.extra = 11
    const T = Math.abs(z) / Math.max(this.speed + 11, 20)
    const ty = clamp(this.pos.y + rnd(-1.5, 1.5), -FIELD.y, FIELD.y)
    o.spin.set(rnd(-0.6, 0.6), 0, (ty - o.y) / T)
    o.obj.position.set(o.x, o.y, o.z)
    o.obj.scale.setScalar(1)
  }

  private tickEpic(dt: number) {
    const md = this.md
    this.surgeK += ((this.surgeT > 0 ? 0.85 : 0) - this.surgeK) * damp(3, dt)
    if (!md.epic || this.phase !== 'run' || this.def.empty) return

    if (this.surgeWait > 0) {
      this.surgeWait -= dt
      if (this.surgeWait <= 0) {
        this.surgeT = 6
        this.worm.pulse(0xb06bff, this.pos.x, this.pos.y)
        this.audio.play('hyper')
        this.say('Warp current: ride it')
      }
    }
    if (this.surgeT > 0) this.surgeT -= dt

    if (this.chain.length) {
      const c = this.chain[0]
      c.t -= dt
      if (c.t <= 0 && !this.cosmos.event) {
        this.chain.shift()
        this.cosmos.trigger(c.kind)
        this.say(c.text)
      }
    }

    this.epicNext -= dt
    if (this.epicNext > 0 || this.riverLeft > 0 || this.surgeWait > 0 || this.surgeT > 0 || this.chain.length) return
    this.epicNext = rnd(24, 36)
    let which = Math.floor(Math.random() * 3)
    if (which === this.epicLast) which = (which + 1) % 3
    this.epicLast = which
    const sp = Math.max(this.speed, 20)
    if (which === 0) {
      this.riverLeft = 30
      this.riverClock = 0
      this.sinceSpawn = Math.min(this.sinceSpawn, -(3.6 * sp + 30))
      this.say('Epic event: stardust river')
    } else if (which === 1) {
      this.riverLeft = 36
      this.riverClock = 0
      this.surgeWait = 3.8
      this.sinceSpawn = Math.min(this.sinceSpawn, -(10.5 * sp * 1.15))
      this.say('Epic event: warp current ahead')
    } else {
      this.chain = [
        { t: 0, kind: 'supernova', text: 'Epic event: supernova bloom' },
        { t: 5.5, kind: 'meteors', text: 'Epic event: meteor cascade' },
        { t: 11, kind: 'ion', text: 'Epic event: ion aurora' }
      ]
    }
  }

  private tickHazards(dt: number) {
    if (this.portalOn || this.warpT > 0 || this.phase !== 'run') return
    const name = this.def.name
    if (name === 'Digital Matrix') {
      this.glitchNext -= dt
      if (this.glitchT <= 0 && this.glitchNext <= 0) {
        this.glitchT = 3.5
        this.glitchNext = rnd(12, 20) * this.md.hazard
        this.say('System glitch: controls inverted')
      }
    }
    if (this.glitchT > 0) {
      this.glitchT -= dt
      if (this.glitchT <= 0) this.say('Controls restored')
    }
    if (name === "Dracula's Dominion") {
      this.batNext -= dt
      if (this.batNext <= 0) {
        this.batNext = rnd(10, 16) * this.md.hazard
        this.spawnBats()
        this.say('Bat swarm approaching')
      }
    }
    if (name === 'Inferno') {
      this.stormNext -= dt
      if (this.stormT <= 0 && this.stormWarn <= 0 && this.stormNext <= 0) {
        this.stormWarn = 2
        this.stormNext = rnd(16, 24) * this.md.hazard
        this.say('Fire storm incoming')
      }
      if (this.stormWarn > 0) {
        this.stormWarn -= dt
        if (this.stormWarn <= 0) this.stormT = 5
      }
      if (this.stormT > 0) {
        this.stormT -= dt
        this.fireT -= dt
        if (this.fireT <= 0) {
          this.fireT = 0.5
          this.spawnFireball()
        }
      }
    }
  }

  private fire(tx: number, ty: number, tz: number, width: number) {
    const b = this.beams.find(x => x.life <= 0)
    if (!b) return
    this.beamSide = -this.beamSide
    const from = new THREE.Vector3(this.pos.x + this.beamSide * 0.7, this.pos.y - 0.05, -1.3)
    const to = new THREE.Vector3(tx, ty, tz)
    const dir = to.clone().sub(from)
    const len = dir.length()
    b.g.position.copy(from).addScaledVector(dir, 0.5)
    b.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    b.g.userData.w = width
    b.g.userData.len = len
    b.life = 0.2
    b.g.visible = true
    this.burst(from.x, from.y, from.z, 3, 3, 1, 0.85, 0.35)
  }

  private zap(o: Obs) {
    this.fire(o.x, o.y, o.z, 0.55)
    this.burst(o.x, o.y, o.z, 18, 8, 1, 0.9, 0.4)
    this.shake = Math.max(this.shake, 0.22)
  }

  private updateZaps(dt: number) {
    for (const b of this.beams) {
      if (b.life <= 0) continue
      b.life -= dt
      if (b.life <= 0) {
        b.g.visible = false
        continue
      }
      const k = b.life / 0.2
      const w = (b.g.userData.w as number) * (0.5 + 0.5 * k)
      for (const m of b.g.children) m.scale.set(w, b.g.userData.len as number, 1)
    }
  }

  toggleCheat(): boolean {
    this.cheat = !this.cheat
    this.realms.setCheat(this.cheat)
    this.say(this.cheat ? 'Cheat mode activated' : 'Cheat mode off')
    if (this.phase === 'run') {
      this.worm.pulse(this.cheat ? 0xffd24a : 0x9fb6ff, this.pos.x, this.pos.y)
      this.burst(this.pos.x, this.pos.y, 0, 70, 11, 1, 0.85, 0.3)
    }
    return this.cheat
  }

  private take(kind: Kind): Obs {
    let o = this.pools[kind].find(p => !p.active)
    if (!o) {
      o = this.make(kind)
      this.pools[kind].push(o)
      this.allObs.push(o)
    }
    o.active = true
    o.passed = false
    o.obj.visible = true
    o.ph = rnd(0, 6.28)
    o.amp = 0
    o.glitchy = false
    o.ghost = false
    return o
  }

  private make(kind: Kind): Obs {
    const R = this.res
    const g = new THREE.Group()
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(x, y, z)
      g.add(m)
      return m
    }
    const glow = (mat: THREE.SpriteMaterial, size: number, x = 0, y = 0, z = 0) => {
      const s = new THREE.Sprite(mat)
      s.scale.setScalar(size)
      s.position.set(x, y, z)
      g.add(s)
      return s
    }
    let obj: THREE.Object3D = g
    switch (kind) {
      case 'asteroid':
        obj = new THREE.Mesh(pick(R.rockGeos), R.rockMat)
        break
      case 'satellite': {
        mesh(R.sphereLo, R.foil).scale.setScalar(0.62)
        for (const sd of [-1, 1]) {
          const disc = mesh(this.keep(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 28)), R.panel, sd * 1.7, 0, 0)
          disc.rotation.z = Math.PI / 2
          const arm = mesh(this.keep(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8)), R.metal, sd * 0.85, 0, 0)
          arm.rotation.z = Math.PI / 2
        }
        const dish = mesh(this.keep(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, 0.9)), R.metal, 0, 0.7, 0)
        dish.rotation.x = -0.4
        mesh(this.keep(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6)), R.metal, 0, 1.2, 0)
        mesh(R.sphereLo, R.green, 0.4, 0.45, 0.45).scale.setScalar(0.07)
        break
      }
      case 'wreck': {
        const hullGeo = this.keep(new THREE.CapsuleGeometry(0.45, 1.9, 6, 14))
        mesh(hullGeo, R.wreckMat).rotation.z = Math.PI / 2
        const nose = mesh(this.keep(new THREE.ConeGeometry(0.45, 1.2, 10)), R.wreckMat, -2, 0.05, 0)
        nose.rotation.z = Math.PI / 2 + 0.25
        const wing = mesh(this.keep(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 20)), R.wreckMat, 0.3, 0.1, 0.9)
        wing.rotation.set(0.15, 0.2, 0.35)
        for (let i = 0; i < 3; i++) {
          const rib = mesh(this.keep(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6)), R.metal, 1 + i * 0.3, 0.1, 1.4)
          rib.rotation.set(Math.PI / 2, 0, rnd(-0.3, 0.3))
        }
        const eng = mesh(this.keep(new THREE.CylinderGeometry(0.35, 0.4, 1, 14)), R.metal, 1.6, -0.1, 0)
        eng.rotation.z = Math.PI / 2
        mesh(R.sphereLo, R.amber, 2.15, -0.1, 0).scale.setScalar(0.25)
        glow(R.glowMats[2], 1.6, 0.3, 0.5, 0.5)
        break
      }
      case 'crystal': {
        for (let i = 0; i < 5; i++) {
          const c = mesh(R.oct, R.crystal[i % 2], rnd(-0.4, 0.4), rnd(-0.3, 0.3), rnd(-0.4, 0.4))
          c.scale.set(rnd(0.3, 0.5), rnd(0.9, 1.5), rnd(0.3, 0.5))
          c.rotation.set(rnd(-0.8, 0.8), rnd(0, 3), rnd(-0.8, 0.8))
        }
        glow(R.glowMats[0], 3.2)
        break
      }
      case 'comet': {
        const rock = mesh(pick(R.rockGeos), R.ice)
        rock.scale.setScalar(0.9)
        glow(R.glowMats[0], 3.5)
        for (let i = 1; i <= 9; i++) {
          const s = new THREE.Sprite(R.tail)
          s.scale.setScalar(3 - i * 0.25)
          s.position.set(0, 0, -i * 1.3)
          g.add(s)
        }
        break
      }
      case 'bat': {
        const s = new THREE.Sprite(this.batMat)
        s.scale.set(2, 1.5, 1)
        obj = s
        break
      }
      case 'fireball': {
        mesh(R.sphereLo, R.amber).scale.setScalar(0.45)
        glow(R.glowMats[2], 3.4)
        for (let i = 1; i <= 6; i++) glow(R.glowMats[2], 2.6 - i * 0.3, 0, i * 0.35, -i * 1)
        break
      }
      default: {
        mesh(this.keep(new THREE.IcosahedronGeometry(1.1, 2)), R.plasma)
        mesh(R.sphereLo, R.orbMats[0]).scale.setScalar(0.5)
        const t = mesh(R.tor, R.ringMats[0])
        t.scale.setScalar(2.2)
        t.rotation.x = 1.2
        glow(R.glowMats[0], 4.2)
      }
    }
    obj.visible = false
    this.scene.add(obj)
    return { kind, obj, active: false, passed: false, x: 0, y: 0, z: 0, x0: 0, r: 1, ph: 0, extra: 0, spin: new THREE.Vector3(), y0: 0, amp: 0, fq: 0, glitchy: false, gt: 0, ghost: false }
  }

  private spawnPattern() {
    if (this.def.empty) return
    const lvl = this.level
    const md = this.md
    const prev = { ...this.safe }
    const reach = clamp((12 * 0.7 * (this.gap() - 20)) / Math.max(this.speed, 20), 2.4, 6)
    this.safe.x = clamp(prev.x + rnd(-reach, reach), -FIELD.x + 0.8, FIELD.x - 0.8)
    this.safe.y = clamp(prev.y + rnd(-reach * 0.6, reach * 0.6), -FIELD.y + 0.7, FIELD.y - 0.7)
    const sx = this.safe.x
    const sy = this.safe.y
    const z0 = SPAWN_Z
    const kinds: Kind[] = ['asteroid', 'satellite', 'crystal']
    if (lvl >= 1) kinds.push('wreck')
    if (lvl >= 2) kinds.push('comet')
    if (lvl >= 3) kinds.push('anomaly')
    const want = (2 + lvl * 0.35) * md.density * 0.6 * this.ease * (this.universe === 0 ? 1 : 0.85)
    const n = clamp(Math.floor(want) + (Math.random() < want % 1 ? 1 : 0), 1, md.maxPattern)

    for (let i = 0; i < n; i++) {
      const kind = pick(kinds)
      const scale = kind === 'asteroid' ? rnd(0.8, 1.7) : 1
      const rc = RC[kind] * scale
      const wobble = this.def.chaos ? 2.4 : this.def.realm === 'corrupt' ? 2.6 : 0
      const clear = rc + this.sr + 2 + wobble + (kind === 'anomaly' ? 2.5 : 0)
      for (let t = 0; t < 8; t++) {
        const x = rnd(-9, 9)
        const y = rnd(-5.5, 5.5)
        if ((x - sx) ** 2 + (y - sy) ** 2 < clear * clear) continue
        const o = this.take(kind)
        o.x = o.x0 = x
        o.y = y
        o.z = z0 - rnd(kind === 'comet' ? 8 : 0, 18)
        o.r = rc
        o.extra = kind === 'comet' ? 9 : 0
        o.obj.position.set(x, y, o.z)
        o.obj.scale.setScalar(scale)
        o.obj.rotation.set(rnd(0, 6), rnd(0, 6), kind === 'comet' ? 0 : rnd(0, 6))
        o.spin.set(rnd(-0.7, 0.7), rnd(-0.7, 0.7), 0)
        if (this.def.chaos && kind !== 'comet') {
          o.y0 = y
          o.amp = rnd(1, 2.2)
          o.fq = rnd(0.8, 2.4)
        }
        if (this.def.realm === 'corrupt') {
          o.glitchy = true
          o.gt = rnd(0.3, 1.2)
        }
        break
      }
    }

    const cnt = 5
    const span = this.gap() - 20
    for (let k = 1; k <= cnt; k++) {
      const f = k / (cnt + 1)
      const roll = Math.random()
      this.spawnOrb(sx + (prev.x - sx) * f, sy + (prev.y - sy) * f, z0 + span * f, roll < 0.06 ? 2 : roll < 0.22 ? 1 : 0)
    }
  }

  private spawnOrb(x: number, y: number, z: number, type: number) {
    if (this.def.empty) return
    const o = this.orbs.find(p => !p.active && p.type === type)
    if (!o) return
    o.active = true
    o.x = x
    o.y = y
    o.z = z
    o.ph = rnd(0, 6.28)
    o.obj.visible = true
    o.obj.position.set(x, y, z)
  }

  private moveOrb(o: Orb, dt: number, magnet: boolean) {
    o.z += this.dz
    if (magnet && this.cheat) {
      const a = damp(7, dt)
      o.x += (this.pos.x - o.x) * a
      o.y += (this.pos.y - o.y) * a
      if (o.z < -2) o.z += Math.min(-o.z * 0.5, 60 * dt)
      if (Math.random() < 0.3) {
        const c = ORB_COLOR[o.type]
        this.spawnFx(o.x, o.y, o.z, (this.pos.x - o.x) * 1.5, (this.pos.y - o.y) * 1.5, 6, 0.3, c[0], c[1], c[2])
      }
    } else if (magnet && o.z > -14 && o.z < 4) {
      const dx = this.pos.x - o.x
      const dy = this.pos.y - o.y
      const mr = this.magnetR()
      if (dx * dx + dy * dy < mr * mr) {
        const a = damp(6, dt)
        o.x += dx * a
        o.y += dy * a
      }
    }
    o.obj.position.set(o.x, o.y + Math.sin(this.t * 3 + o.ph) * 0.15, o.z)
    o.parts[0].rotation.y += dt * 2
    for (let i = 1; i < o.parts.length; i++) o.parts[i].rotation.y += dt * (1.5 + i)
    if (o.z > 12) {
      o.active = false
      o.obj.visible = false
    }
  }

  private updateOrbs(dt: number) {
    for (const o of this.orbs) {
      if (!o.active) continue
      this.moveOrb(o, dt, true)
      if (!o.active) continue
      const zc = o.z >= 0 && o.z - this.dz <= 0 ? 0 : Math.min(Math.abs(o.z), Math.abs(o.z - this.dz))
      const dx = this.pos.x - o.x
      const dy = this.pos.y - o.y
      const cr = this.cheat ? 2.4 : 1.5
      if (dx * dx + dy * dy + zc * zc < cr * cr || (this.cheat && o.z > -1.5 && dx * dx + dy * dy < 9)) this.collect(o)
    }
  }

  private collect(o: Orb) {
    o.active = false
    o.obj.visible = false
    const c = ORB_COLOR[o.type]
    this.burst(o.x, o.y, o.z, 16, 4.5, c[0], c[1], c[2])
    this.audio.play('orb')
    const v = ORB_VALUE[o.type]
    this.run.energy += v * this.realms.up.orb
    this.hp = Math.min(this.maxHp, this.hp + Math.round(HEAL[o.type] * this.md.heal * (this.def.heal ?? 1)))
    if (!this.hyperActive) this.hyper = Math.min(100, this.hyper + 2 * v)
    this.realms.onOrb(o.type)
    this.sig.player.pulse = 1
  }

  private spawnFx(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, r: number, g: number, b: number) {
    const f = this.fxData
    const n = QUALITY[this.quality].fx
    const i = f.next % n
    f.next = (f.next + 1) % n
    const p = this.fxPts.geometry.attributes.position as THREE.BufferAttribute
    p.setXYZ(i, x, y, z)
    f.vel[i * 3] = vx
    f.vel[i * 3 + 1] = vy
    f.vel[i * 3 + 2] = vz
    f.life[i] = f.max[i] = life
    f.base[i * 3] = r
    f.base[i * 3 + 1] = g
    f.base[i * 3 + 2] = b
  }

  private burst(x: number, y: number, z: number, n: number, speed: number, r: number, g: number, b: number) {
    for (let i = 0; i < n; i++) {
      const th = rnd(0, Math.PI * 2)
      const ph = Math.acos(rnd(-1, 1))
      const s = rnd(0.3, 1) * speed
      this.spawnFx(x, y, z, Math.sin(ph) * Math.cos(th) * s, Math.sin(ph) * Math.sin(th) * s, Math.cos(ph) * s, rnd(0.4, 1.1), r, g, b)
    }
  }

  private updateFx(dt: number) {
    const f = this.fxData
    const p = this.fxPts.geometry.attributes.position as THREE.BufferAttribute
    const c = this.fxPts.geometry.attributes.color as THREE.BufferAttribute
    const pa = p.array as Float32Array
    const ca = c.array as Float32Array
    const n = QUALITY[this.quality].fx
    for (let i = 0; i < n; i++) {
      if (f.life[i] <= 0) {
        if (ca[i * 3] !== 0 || ca[i * 3 + 1] !== 0 || ca[i * 3 + 2] !== 0) ca.fill(0, i * 3, i * 3 + 3)
        continue
      }
      f.life[i] -= dt
      pa[i * 3] += f.vel[i * 3] * dt
      pa[i * 3 + 1] += f.vel[i * 3 + 1] * dt
      pa[i * 3 + 2] += f.vel[i * 3 + 2] * dt + this.dz
      const k = clamp(f.life[i] / f.max[i], 0, 1)
      ca[i * 3] = f.base[i * 3] * k
      ca[i * 3 + 1] = f.base[i * 3 + 1] * k
      ca[i * 3 + 2] = f.base[i * 3 + 2] * k
    }
    p.needsUpdate = true
    c.needsUpdate = true
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.portrait = w / h < 1
    dotUniforms.uH.value = h * this.renderer.getPixelRatio()
    dotUniforms.uDpr.value = this.renderer.getPixelRatio()
    this.cosmos?.setLateral(this.portrait ? 0.6 : 1)
    this.camera.updateProjectionMatrix()
  }

  private clearInput = () => {
    this.keys = { l: false, r: false, u: false, d: false }
    this.hyperHeld = false
  }

  private key(e: KeyboardEvent, down: boolean) {
    switch (e.code) {
      case 'KeyA': case 'ArrowLeft': this.keys.l = down; break
      case 'KeyD': case 'ArrowRight': this.keys.r = down; break
      case 'KeyW': case 'ArrowUp': this.keys.u = down; break
      case 'KeyS': case 'ArrowDown': this.keys.d = down; break
      case 'Space': this.hyperHeld = down; break
      default: return
    }
    if (this.view === 'play') e.preventDefault()
  }

  private kd = (e: KeyboardEvent) => {
    this.audio.unlock()
    this.key(e, true)
  }
  private ku = (e: KeyboardEvent) => this.key(e, false)
  private unlock = () => this.audio.unlock()
  private clickSfx = (e: MouseEvent) => {
    if ((e.target as Element | null)?.closest('button')) this.audio.play('click')
  }

  private pd = (e: PointerEvent) => {
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
    this.canvas.setPointerCapture(e.pointerId)
  }

  private pm = (e: PointerEvent) => {
    const d = this.drag
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    d.x = e.clientX
    d.y = e.clientY
    if (this.view === 'play' && this.phase === 'run' && !this.paused) {
      const h = this.canvas.clientHeight || 1
      const inv = this.glitchT > 0 ? -1 : 1
      this.target.x = clamp(this.target.x + (dx / h) * 18 * this.sens * inv, -FIELD.x, FIELD.x)
      this.target.y = clamp(this.target.y - (dy / h) * 11 * this.sens * inv, -FIELD.y, FIELD.y)
    } else if (this.view === 'hangar') {
      this.yaw += dx * 0.012
      this.yawVel = dx * 0.6
    }
  }

  private pu = (e: PointerEvent) => {
    if (this.drag && this.drag.id === e.pointerId) this.drag = null
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('orientationchange', this.resize)
    window.removeEventListener('keydown', this.kd)
    window.removeEventListener('keyup', this.ku)
    window.removeEventListener('blur', this.clearInput)
    window.removeEventListener('pointerdown', this.unlock)
    document.removeEventListener('click', this.clickSfx)
    this.canvas.removeEventListener('pointerdown', this.pd)
    this.canvas.removeEventListener('pointermove', this.pm)
    this.canvas.removeEventListener('pointerup', this.pu)
    this.canvas.removeEventListener('pointercancel', this.pu)
    this.sky.dispose()
    this.sig.dispose()
    this.realms.dispose()
    this.ambient.dispose()
    this.cosmos.dispose()
    this.worm.dispose()
    this.rigs.forEach(disposeRig)
    this.own.forEach(o => o.dispose())
    this.decor.dispose()
    this.renderer.dispose()
    this.audio.dispose()
  }
}
