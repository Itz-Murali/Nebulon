import * as THREE from 'three'
import { dotMaterial, dotUniforms } from './dots'

import type { AmbientId } from '~/types'

export type AmbientMode = AmbientId

interface Cfg { color: number[][]; size: number; vy: number; sway: number; trail: number; heart: boolean; speed: number; cols: number; glyph?: boolean; sparkle?: boolean }

const CFG: Record<AmbientMode, Cfg> = {
  rain: { color: [[0.1, 1, 0.35], [0.05, 0.8, 0.3], [0.3, 1, 0.55]], size: 0.5, vy: -15, sway: 0, trail: 7, heart: false, speed: 0.15, cols: 120, glyph: true },
  hearts: { color: [[1, 0.45, 0.65], [1, 0.7, 0.82], [1, 0.3, 0.5], [1, 0.85, 0.9]], size: 0.26, vy: 0.9, sway: 1.3, trail: 1, heart: true, speed: 0.25, cols: 130, sparkle: true },
  embers: { color: [[1, 0.35, 0.15], [1, 0.6, 0.2]], size: 0.07, vy: 2.5, sway: 0.8, trail: 1, heart: false, speed: 0.3, cols: 160 },
  snow: { color: [[1, 1, 1], [0.8, 0.9, 1]], size: 0.06, vy: -1.4, sway: 0.5, trail: 1, heart: false, speed: 0.4, cols: 160 },
  motes: { color: [[0.6, 1, 0.9], [1, 0.7, 1], [1, 0.95, 0.7]], size: 0.07, vy: 0.3, sway: 1.5, trail: 1, heart: false, speed: 0.2, cols: 140 },
  plankton: { color: [[0.2, 0.7, 1], [0.3, 1, 0.9]], size: 0.08, vy: 0.2, sway: 1, trail: 1, heart: false, speed: 0.15, cols: 170 },
  spores: { color: [[0.7, 1, 0.2], [0.9, 1, 0.5]], size: 0.09, vy: 0.5, sway: 1.1, trail: 1, heart: false, speed: 0.2, cols: 150 },
  petals: { color: [[1, 0.7, 0.85], [1, 0.9, 0.95]], size: 0.11, vy: -0.9, sway: 1.4, trail: 1, heart: false, speed: 0.3, cols: 120 },
  dust: { color: [[1, 0.8, 0.4], [1, 0.9, 0.6]], size: 0.06, vy: 0.1, sway: 0.4, trail: 1, heart: false, speed: 0.35, cols: 170 },
  shards: { color: [[0.4, 0.9, 1], [0.7, 0.5, 1], [1, 1, 1]], size: 0.085, vy: 0.3, sway: 0.6, trail: 1, heart: false, speed: 0.25, cols: 150 },
  bio: { color: [[0.3, 1, 0.6], [1, 0.4, 0.9], [0.6, 1, 0.9]], size: 0.13, vy: 0.4, sway: 1.7, trail: 1, heart: false, speed: 0.18, cols: 110 },
  bubbles: { color: [[0.5, 0.9, 1], [0.8, 1, 1], [0.4, 1, 0.85]], size: 0.1, vy: 1.7, sway: 1.3, trail: 1, heart: false, speed: 0.25, cols: 150 },
  static: { color: [[1, 0.2, 0.8], [0.2, 1, 1], [1, 1, 1]], size: 0.09, vy: 0, sway: 3.2, trail: 1, heart: false, speed: 0.5, cols: 130 },
  chrono: { color: [[1, 0.85, 0.5], [0.7, 0.8, 1], [0.9, 0.7, 1]], size: 0.075, vy: -0.5, sway: 0.5, trail: 1, heart: false, speed: 0.1, cols: 140 }
}

const GLYPHS = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐ'

const glyphAtlas = (): THREE.CanvasTexture => {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const x = c.getContext('2d')!
  x.fillStyle = '#000'
  x.fillRect(0, 0, 256, 128)
  x.fillStyle = '#fff'
  x.font = 'bold 24px monospace'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  for (let i = 0; i < 32; i++) x.fillText(GLYPHS[i % GLYPHS.length], (i % 8) * 32 + 16, Math.floor(i / 8) * 32 + 17)
  const t = new THREE.CanvasTexture(c)
  t.flipY = false
  return t
}

const MAX = 900
const SPK = 150
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export class Ambient {
  readonly group = new THREE.Group()
  private round: THREE.Points
  private heart: THREE.Points
  private geo = new THREE.BufferGeometry()
  private pos = new Float32Array(MAX * 3)
  private col = new Float32Array(MAX * 3)
  private hx = new Float32Array(MAX)
  private hy = new Float32Array(MAX)
  private hz = new Float32Array(MAX)
  private ph = new Float32Array(MAX)
  private glyphPts: THREE.Points
  private glyphMat: THREE.ShaderMaterial
  private atlas: THREE.CanvasTexture
  private sparkles: THREE.Points
  private spkGeo = new THREE.BufferGeometry()
  private spkPos = new Float32Array(SPK * 3)
  private spkCol = new Float32Array(SPK * 3)
  private spkPh = new Float32Array(SPK)
  private cfg: Cfg | null = null
  private t = 0
  private f = 1
  private cols = 0

  constructor() {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3))
    this.round = new THREE.Points(this.geo, dotMaterial(0.08, true, 0.9, true))
    this.heart = new THREE.Points(this.geo, dotMaterial(0.2, true, 0.9, true, 0xffffff, true))
    this.round.frustumCulled = false
    this.heart.frustumCulled = false

    const seed = new Float32Array(MAX)
    for (let i = 0; i < MAX; i++) seed[i] = Math.random()
    this.geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
    this.atlas = glyphAtlas()
    this.glyphMat = new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: this.atlas }, uT: { value: 0 }, uSize: { value: 0.5 }, uH: dotUniforms.uH },
      vertexShader: `
uniform float uSize;uniform float uH;attribute vec3 color;attribute float seed;varying vec3 vC;varying float vS;
void main(){vC=color;vS=seed;vec4 mv=modelViewMatrix*vec4(position,1.0);
gl_PointSize=clamp(uSize*uH*0.5/max(-mv.z,0.1),2.0,52.0);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `
uniform sampler2D uAtlas;uniform float uT;varying vec3 vC;varying float vS;
void main(){
  float rate=2.0+fract(vS*3.7)*6.0;
  float idx=floor(fract(vS*7.31+floor(uT*rate)*0.1379)*32.0);
  vec2 cell=vec2(mod(idx,8.0),floor(idx/8.0));
  vec2 uv=(cell+gl_PointCoord)/vec2(8.0,4.0);
  float g=texture2D(uAtlas,uv).r;
  if(g<0.04)discard;
  gl_FragColor=vec4(vC*g*1.7,g);
}`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    this.glyphPts = new THREE.Points(this.geo, this.glyphMat)
    this.glyphPts.frustumCulled = false

    for (let i = 0; i < SPK; i++) {
      this.spkPos[i * 3] = rnd(-18, 18)
      this.spkPos[i * 3 + 1] = rnd(-10, 10)
      this.spkPos[i * 3 + 2] = rnd(-70, 3)
      this.spkPh[i] = rnd(0, 6.28)
      const w = Math.random()
      this.spkCol[i * 3] = 1
      this.spkCol[i * 3 + 1] = 0.55 + w * 0.4
      this.spkCol[i * 3 + 2] = 0.75 + w * 0.25
    }
    this.spkGeo.setAttribute('position', new THREE.BufferAttribute(this.spkPos, 3))
    this.spkGeo.setAttribute('color', new THREE.BufferAttribute(this.spkCol, 3))
    this.sparkles = new THREE.Points(this.spkGeo, dotMaterial(0.07, true, 0.9, true))
    this.sparkles.frustumCulled = false

    this.group.add(this.round, this.heart, this.glyphPts, this.sparkles)
    this.group.visible = false
  }

  setQuality(f: number): void {
    this.f = f
  }

  setMode(m: AmbientMode | ''): void {
    if (!m) {
      this.cfg = null
      this.group.visible = false
      return
    }
    const c = (this.cfg = CFG[m])
    this.cols = Math.max(20, Math.floor(c.cols * this.f))
    const n = this.cols * c.trail
    this.geo.setDrawRange(0, n)
    for (let i = 0; i < this.cols; i++) {
      this.hx[i] = rnd(-16, 16)
      this.hy[i] = rnd(-9, 9)
      this.hz[i] = rnd(-60, 3)
      this.ph[i] = rnd(0, 6.28)
      const base = c.color[Math.floor(Math.random() * c.color.length)]
      for (let k = 0; k < c.trail; k++) {
        const b = c.trail === 1 ? rnd(0.5, 1) : 1 - (k / c.trail) * 0.85
        const o = (i * c.trail + k) * 3
        const head = c.trail > 1 && k === 0
        this.col[o] = head ? 0.85 : base[0] * b
        this.col[o + 1] = head ? 1 : base[1] * b
        this.col[o + 2] = head ? 0.9 : base[2] * b
      }
    }
    ;(this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true
    ;(this.round.material as THREE.ShaderMaterial).uniforms.uSize.value = c.size
    ;(this.heart.material as THREE.ShaderMaterial).uniforms.uSize.value = c.size
    ;(this.sparkles.material as THREE.ShaderMaterial).uniforms.uSize.value = 0.07
    this.round.visible = !c.heart && !c.glyph
    this.heart.visible = c.heart
    this.glyphPts.visible = !!c.glyph
    this.sparkles.visible = !!c.sparkle
    this.group.visible = true
  }

  update(dt: number, speed: number): void {
    const c = this.cfg
    if (!c) return
    this.t += dt
    this.glyphMat.uniforms.uT.value = this.t
    if (c.heart) {
      const ph = (this.t * 1.1) % 1
      const beat = Math.exp(-Math.pow((ph - 0.08) * 16, 2)) + 0.65 * Math.exp(-Math.pow((ph - 0.3) * 16, 2))
      ;(this.heart.material as THREE.ShaderMaterial).uniforms.uSize.value = c.size * (1 + 0.16 * beat)
    }
    if (c.sparkle) {
      for (let i = 0; i < SPK; i++) {
        const o = i * 3
        this.spkPos[o + 2] += speed * 0.22 * dt
        this.spkPos[o + 1] += (0.5 + 0.4 * Math.sin(this.t * 2 + this.spkPh[i])) * dt
        this.spkPos[o] += Math.sin(this.t * 0.9 + this.spkPh[i]) * 0.8 * dt
        if (this.spkPos[o + 2] > 5 || this.spkPos[o + 1] > 11) {
          this.spkPos[o] = rnd(-18, 18)
          this.spkPos[o + 1] = rnd(-10, 4)
          this.spkPos[o + 2] = rnd(-70, -12)
        }
      }
      ;(this.spkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
      ;(this.sparkles.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.55 + 0.45 * Math.sin(this.t * 5)
    }
    for (let i = 0; i < this.cols; i++) {
      this.hz[i] += speed * c.speed * dt
      this.hy[i] += c.vy * dt
      this.hx[i] += Math.sin(this.t * 0.8 + this.ph[i]) * c.sway * dt
      if (this.hz[i] > 5 || this.hy[i] < -11 || this.hy[i] > 11) {
        this.hx[i] = rnd(-16, 16)
        this.hz[i] = rnd(-60, -12)
        this.hy[i] = c.vy < 0 ? rnd(8, 11) : c.vy > 0.5 ? rnd(-11, -8) : rnd(-9, 9)
      }
      for (let k = 0; k < c.trail; k++) {
        const o = (i * c.trail + k) * 3
        this.pos[o] = this.hx[i]
        this.pos[o + 1] = this.hy[i] + k * 0.55
        this.pos[o + 2] = this.hz[i]
      }
    }
    ;(this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
  }

  dispose(): void {
    this.geo.dispose()
    ;(this.round.material as THREE.Material).dispose()
    ;(this.heart.material as THREE.Material).dispose()
    this.glyphMat.dispose()
    this.atlas.dispose()
    this.spkGeo.dispose()
    ;(this.sparkles.material as THREE.Material).dispose()
  }
}
