import * as THREE from 'three'
import type { Universe } from '~/types'
import { dotMaterial } from './dots'

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
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

const glowTex = () => {
  const [c, x] = cv(128, 128)
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.4)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return tex(c)
}

const moonTex = () => {
  const [c, x] = cv(512, 256)
  x.fillStyle = '#5a0a12'
  x.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 220; i++) {
    x.globalAlpha = rnd(0.1, 0.35)
    x.fillStyle = Math.random() < 0.5 ? '#2a0408' : '#a01a22'
    x.beginPath()
    x.arc(rnd(0, 512), rnd(0, 256), rnd(4, 40), 0, Math.PI * 2)
    x.fill()
  }
  x.globalAlpha = 1
  return tex(c)
}

const batTex = () => {
  const [c, x] = cv(128, 64)
  x.translate(64, 34)
  x.fillStyle = '#2a0610'
  x.strokeStyle = 'rgba(255,60,90,0.8)'
  x.lineWidth = 1.5
  x.beginPath()
  x.moveTo(0, -6)
  x.quadraticCurveTo(-14, -26, -58, -14)
  x.quadraticCurveTo(-44, -4, -48, 8)
  x.quadraticCurveTo(-36, 2, -28, 14)
  x.quadraticCurveTo(-18, 4, -8, 12)
  x.lineTo(0, 4)
  x.lineTo(8, 12)
  x.quadraticCurveTo(18, 4, 28, 14)
  x.quadraticCurveTo(36, 2, 48, 8)
  x.quadraticCurveTo(44, -4, 58, -14)
  x.quadraticCurveTo(14, -26, 0, -6)
  x.fill()
  x.stroke()
  return tex(c)
}

const heartTex = () => {
  const [c, x] = cv(256, 256)
  const g = x.createRadialGradient(128, 120, 10, 128, 120, 130)
  g.addColorStop(0, 'rgba(255,220,235,1)')
  g.addColorStop(0.5, 'rgba(255,90,150,0.85)')
  g.addColorStop(1, 'rgba(255,60,130,0)')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(128, 210)
  x.bezierCurveTo(20, 130, 30, 40, 100, 50)
  x.bezierCurveTo(120, 52, 128, 70, 128, 80)
  x.bezierCurveTo(128, 70, 136, 52, 156, 50)
  x.bezierCurveTo(226, 40, 236, 130, 128, 210)
  x.fill()
  return tex(c)
}

const glyphTex = () => {
  const [c, x] = cv(256, 512)
  x.fillStyle = '#000'
  x.fillRect(0, 0, 256, 512)
  const chars = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ'
  x.font = '16px monospace'
  for (let col = 0; col < 16; col++) {
    for (let row = 0; row < 32; row++) {
      if (Math.random() < 0.55) {
        x.fillStyle = `rgba(80,255,130,${rnd(0.2, 0.9)})`
        x.fillText(chars[Math.floor(Math.random() * chars.length)], col * 16, row * 16 + 14)
      }
    }
  }
  const t = tex(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

const jellyTex = () => {
  const [c, x] = cv(128, 192)
  const g = x.createRadialGradient(64, 50, 4, 64, 50, 52)
  g.addColorStop(0, 'rgba(180,255,255,0.95)')
  g.addColorStop(0.6, 'rgba(40,200,255,0.45)')
  g.addColorStop(1, 'rgba(20,120,255,0)')
  x.fillStyle = g
  x.beginPath()
  x.ellipse(64, 50, 46, 38, 0, Math.PI, 0)
  x.fill()
  x.strokeStyle = 'rgba(120,230,255,0.5)'
  x.lineWidth = 2
  for (let i = 0; i < 7; i++) {
    x.beginPath()
    const sx = 28 + i * 12
    x.moveTo(sx, 52)
    x.bezierCurveTo(sx + rnd(-14, 14), 100, sx + rnd(-14, 14), 140, sx + rnd(-8, 8), 188)
    x.stroke()
  }
  return tex(c)
}

const ringTex = () => {
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

const organismTex = () => {
  const [c, x] = cv(128, 128)
  const g = x.createRadialGradient(64, 60, 2, 64, 60, 46)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.beginPath()
  x.arc(64, 60, 46, 0, Math.PI * 2)
  x.fill()
  x.strokeStyle = 'rgba(255,255,255,0.55)'
  x.lineWidth = 2.2
  x.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3
    x.beginPath()
    x.moveTo(64 + Math.cos(a) * 30, 60 + Math.sin(a) * 30)
    x.quadraticCurveTo(64 + Math.cos(a + 0.5) * 50, 60 + Math.sin(a + 0.5) * 50, 64 + Math.cos(a + 0.2) * 62, 60 + Math.sin(a + 0.2) * 62)
    x.stroke()
  }
  x.fillStyle = 'rgba(255,255,255,1)'
  x.beginPath()
  x.arc(64, 60, 7, 0, Math.PI * 2)
  x.fill()
  return tex(c)
}

export const BH_FRAG = `
uniform float t;uniform vec3 cHot;uniform vec3 cCool;varying vec2 vUv;
void main(){
  vec2 p=(vUv-0.5)*2.0;
  float r=length(p);
  if(r>1.0)discard;
  float a=atan(p.y,p.x);
  float sh=1.0-smoothstep(0.27,0.30,r);
  float photon=exp(-pow((r-0.315)*34.0,2.0));
  vec2 q=vec2(p.x,p.y/0.2);
  float rq=length(q);
  float band=smoothstep(0.36,0.44,rq)*(1.0-smoothstep(0.8,1.0,rq));
  float ang=atan(q.y,q.x);
  float streak=0.65+0.35*sin(ang*3.0+rq*22.0-t*2.6)+0.15*sin(ang*11.0-t*1.3);
  float dop=0.45+0.9*smoothstep(0.8,-0.8,p.x);
  float front=smoothstep(0.02,-0.02,p.y);
  float diskA=band*streak*dop*(0.3+0.7*front);
  diskA*=1.0-sh*(1.0-front);
  float lens=smoothstep(0.31,0.36,r)*(1.0-smoothstep(0.5,0.74,r))*pow(abs(sin(a)),1.2)*(0.5+0.5*dop)*(0.6+0.4*sin(a*5.0+t*1.8));
  float halo=exp(-pow(max(r-0.3,0.0)*3.2,2.0))*0.3*(1.0-sh);
  float e=photon*1.3+diskA*1.4+lens*0.9+halo;
  vec3 col=mix(cCool,cHot,clamp(e*0.6+0.2*(1.0-r),0.0,1.0));
  col=mix(col,vec3(1.0,0.96,0.88),clamp(photon*0.8+diskA*0.35,0.0,1.0));
  float alpha=max(sh,clamp(e,0.0,1.0))*(1.0-smoothstep(0.92,1.0,r));
  gl_FragColor=vec4(col*min(e,1.3),alpha);
}`

type Item = { obj: THREE.Object3D; far: boolean; tick: (dt: number, t: number) => void }

export class Signature {
  readonly group = new THREE.Group()
  private items: Item[] = []
  private own: { dispose(): void }[] = []
  private perSet: { dispose(): void }[] = []
  private glow: THREE.Texture
  private t = 0
  private speed = 0
  lite = false
  player = { x: 0, y: 0, hyper: 0, pulse: 0 }

  constructor() {
    this.glow = glowTex()
    this.own.push(this.glow)
  }

  private keep<T extends { dispose(): void }>(x: T): T {
    this.perSet.push(x)
    return x
  }

  private sprite(map: THREE.Texture, color: number, size: number, op: number, blend = THREE.AdditiveBlending) {
    const s = new THREE.Sprite(this.keep(new THREE.SpriteMaterial({ map, color, blending: blend, transparent: true, depthWrite: false, opacity: op, fog: false })))
    s.scale.set(size, size, 1)
    return s
  }

  clear(): void {
    for (const it of this.items) this.group.remove(it.obj)
    this.items = []
    for (const d of this.perSet) d.dispose()
    this.perSet = []
  }

  set(u: Universe): void {
    this.clear()
    for (const k of u.sig ?? []) this.build(k, u)
  }

  private add(obj: THREE.Object3D, far: boolean, tick: (dt: number, t: number) => void = () => {}) {
    this.group.add(obj)
    this.items.push({ obj, far, tick })
  }

  private build(kind: string, u: Universe): void {
    switch (kind) {
      case 'bloodmoon': {
        const m = new THREE.Mesh(this.keep(new THREE.SphereGeometry(140, 48, 32)), this.keep(new THREE.MeshBasicMaterial({ map: this.keep(moonTex()), fog: false })))
        m.position.set(120, 70, -900)
        const g = new THREE.Group()
        const halo = this.sprite(this.glow, 0xff2a3a, 520, 0.55)
        halo.position.copy(m.position)
        g.add(m, halo)
        g.position.set(0, 0, 0)
        this.add(g, true, (dt) => (m.rotation.y += dt * 0.01))
        break
      }
      case 'bats': {
        const bt = this.keep(batTex())
        for (let i = 0; i < (this.lite ? 6 : 12); i++) {
          const s = this.sprite(bt, 0xffffff, rnd(5, 9), 0.9, THREE.NormalBlending)
          const dir = Math.random() < 0.5 ? -1 : 1
          let x = rnd(-120, 120)
          const y = rnd(-15, 40)
          const z = rnd(-110, -40)
          const sp = rnd(5, 12) * dir
          const ph = rnd(0, 6)
          s.position.set(x, y, z)
          this.add(s, false, (dt, t) => {
            x += sp * dt
            if (Math.abs(x) > 140) x = -Math.sign(x) * 130
            s.position.set(x, y + Math.sin(t * 1.3 + ph) * 3, z)
            s.scale.set(rnd(0, 0) + (5 + 4 * Math.abs(Math.sin(t * 9 + ph))) * 1.4, 4, 1)
          })
        }
        break
      }
      case 'heart': {
        const ht = this.keep(heartTex())
        const g = new THREE.Group()
        const halo = this.sprite(this.glow, 0xff5a98, 520, 0.32)
        const big = this.sprite(ht, 0xffffff, 260, 0.78)
        const small = this.sprite(ht, 0xffb0d4, 110, 0.7)
        small.position.set(190, -40, 40)
        const sparks: THREE.Sprite[] = []
        for (let i = 0; i < (this.lite ? 5 : 10); i++) {
          const sp = this.sprite(this.glow, 0xfff0f8, 22, 0.9)
          g.add(sp)
          sparks.push(sp)
        }
        g.add(halo, big, small)
        g.position.set(-90, 55, -700)
        this.add(g, true, (dt, t) => {
          const ph = (t * 1.1) % 1
          const beat = Math.exp(-Math.pow((ph - 0.08) * 14, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.3) * 14, 2))
          big.scale.setScalar(260 * (1 + 0.09 * beat))
          halo.scale.setScalar(520 * (1 + 0.12 * beat))
          halo.material.opacity = 0.28 + 0.14 * beat
          small.scale.setScalar(110 * (1 + 0.1 * Math.sin(t * 2.4 + 1.5)))
          sparks.forEach((sp, i) => {
            const a = t * 0.25 + (i / sparks.length) * Math.PI * 2
            sp.position.set(Math.cos(a) * 190, Math.sin(a) * 140 + 10, 10)
            sp.material.opacity = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)
          })
        })
        break
      }
      case 'lovestars': {
        const ht = this.keep(heartTex())
        const n = this.lite ? 10 : 22
        for (let i = 0; i < n; i++) {
          const sp = this.sprite(ht, i % 3 === 0 ? 0xffffff : 0xff9ac0, rnd(7, 15), 0.75)
          const bx = rnd(-170, 170)
          const by = rnd(-40, 80)
          const z = rnd(-250, -90)
          const ph = rnd(0, 6)
          const sz = rnd(7, 15)
          sp.position.set(bx, by, z)
          this.add(sp, false, (dt, t) => {
            sp.position.y = by + Math.sin(t * 0.5 + ph) * 4
            sp.material.rotation = Math.sin(t * 0.4 + ph) * 0.35
            const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + ph * 3)
            sp.material.opacity = 0.25 + 0.6 * tw
            sp.scale.set(sz * (0.8 + 0.3 * tw), sz * (0.8 + 0.3 * tw), 1)
          })
        }
        break
      }
      case 'eye': {
        const bh = new THREE.Mesh(
          this.keep(new THREE.PlaneGeometry(2, 2)),
          this.keep(
            new THREE.ShaderMaterial({
              uniforms: { t: { value: 0 }, cHot: { value: new THREE.Color(0xffb86a) }, cCool: { value: new THREE.Color(0xff5a1a) } },
              vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
              fragmentShader: BH_FRAG,
              transparent: true,
              depthWrite: false,
              fog: false
            })
          )
        )
        bh.scale.setScalar(150)
        bh.position.set(-120, 22, -800)
        bh.rotation.z = -0.3
        const halo = this.sprite(this.glow, 0xff9a50, 520, 0.22)
        halo.position.copy(bh.position)
        const grp = new THREE.Group()
        grp.add(halo, bh)
        this.add(grp, true, (dt, t) => ((bh.material as THREE.ShaderMaterial).uniforms.t.value = t))
        break
      }
      case 'eyeOld': {
        const g = new THREE.Group()
        const core = new THREE.Mesh(this.keep(new THREE.SphereGeometry(110, 48, 32)), this.keep(new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })))
        const ring = new THREE.Mesh(this.keep(new THREE.TorusGeometry(128, 3, 8, 128)), this.keep(new THREE.MeshBasicMaterial({ color: 0xffe6c0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, fog: false })))
        ring.rotation.x = 0.35
        const ring2 = new THREE.Mesh(this.keep(new THREE.TorusGeometry(190, 14, 8, 128)), this.keep(new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, fog: false })))
        ring2.rotation.x = 1.2
        g.add(core, ring, ring2, this.sprite(this.glow, 0xffb070, 700, 0.25))
        g.position.set(-70, 15, -800)
        this.add(g, true, (dt) => (ring2.rotation.z += dt * 0.15))
        break
      }
      case 'glyphs': {
        const gt = this.keep(glyphTex())
        ;(this.lite ? [-420] : [-420, -760, -1100]).forEach((z, i) => {
          const p = new THREE.Mesh(this.keep(new THREE.PlaneGeometry(900 + i * 300, 900 + i * 300)), this.keep(new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.2 - i * 0.04, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })))
          p.position.set((i - 1) * 90, 120, z)
          this.add(p, true, (dt) => {
            gt.offset.y -= dt * 0.03 * (1 + i * 0.4)
          })
        })
        break
      }
      case 'jelly': {
        const jt = this.keep(jellyTex())
        for (let i = 0; i < (this.lite ? 4 : 7); i++) {
          const s = this.sprite(jt, 0xffffff, rnd(10, 22), 0.8)
          const bx = rnd(-110, 110)
          const by = rnd(-30, 50)
          const z = rnd(-160, -60)
          const ph = rnd(0, 6)
          const sc = rnd(10, 22)
          s.position.set(bx, by, z)
          this.add(s, false, (dt, t) => {
            s.position.y = by + Math.sin(t * 0.4 + ph) * 8 + ((t * 2 + ph * 5) % 60) * 0.0
            s.position.x = bx + Math.sin(t * 0.25 + ph) * 12
            const pulse = 1 + Math.sin(t * 1.8 + ph) * 0.1
            s.scale.set(sc * pulse, sc * 1.5 * (2 - pulse), 1)
          })
        }
        break
      }
      case 'gridfloor': {
        const mk = (y: number, op: number, ycol: number) => {
          const mat = this.keep(
            new THREE.ShaderMaterial({
              uniforms: { uZ: { value: 0 }, uA: { value: op }, c: { value: new THREE.Color(ycol) } },
              vertexShader: 'varying vec2 vP;void main(){vec4 w=modelMatrix*vec4(position,1.0);vP=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}',
              fragmentShader: `uniform float uZ;uniform float uA;uniform vec3 c;varying vec2 vP;
void main(){
  vec2 g=vec2(vP.x/9.0,(vP.y+uZ)/9.0);
  vec2 f=abs(fract(g)-0.5);
  float l=max(smoothstep(0.455,0.5,f.x),smoothstep(0.455,0.5,f.y));
  float fade=smoothstep(-620.0,-60.0,vP.y)*(1.0-smoothstep(-30.0,25.0,vP.y));
  float side=1.0-smoothstep(120.0,320.0,abs(vP.x));
  float pulse=0.55+0.45*sin(vP.y*0.045+uZ*0.09);
  gl_FragColor=vec4(c*l*fade*side*(0.45+0.9*pulse),l*fade*side*uA);
}`,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
              fog: false
            })
          )
          const m = new THREE.Mesh(this.keep(new THREE.PlaneGeometry(700, 760)), mat)
          m.rotation.x = -Math.PI / 2
          m.position.set(0, y, -330)
          m.frustumCulled = false
          return { m, mat }
        }
        const floor = mk(-13, 0.9, 0x33ff77)
        const roof = mk(26, 0.4, 0x22cc66)
        this.group.add(floor.m, roof.m)
        this.items.push({ obj: floor.m, far: false, tick: () => {} }, { obj: roof.m, far: false, tick: () => {} })
        let z = 0
        const tickZ = (dt: number) => {
          z += (this.speed * 0.9 + 4) * dt
          floor.mat.uniforms.uZ.value = z
          roof.mat.uniforms.uZ.value = z
        }
        this.items.push({ obj: new THREE.Object3D(), far: false, tick: tickZ })
        break
      }
      case 'crystals':
      case 'frozen': {
        const ice = kind === 'frozen'
        const cols = ice ? [0xcfeeff, 0x8ad0ff, 0xffffff] : [0x38e0ff, 0x7a6aff, 0xa070ff, 0x4a8aff]
        const clusters = this.lite ? 3 : 6
        for (let c = 0; c < clusters; c++) {
          const g = new THREE.Group()
          const base = new THREE.Group()
          const n = 5 + Math.floor(Math.random() * 3)
          for (let i = 0; i < n; i++) {
            const h = rnd(40, 110) * (ice ? 1.1 : 1)
            const r = rnd(6, 14)
            const geo = this.keep(new THREE.CylinderGeometry(0, r, h, 6, 1))
            const col = cols[Math.floor(Math.random() * cols.length)]
            const mat = this.keep(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: ice ? 0.3 : 0.42, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
            const m = new THREE.Mesh(geo, mat)
            const edges = new THREE.LineSegments(this.keep(new THREE.EdgesGeometry(geo)), this.keep(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, fog: false })))
            const piece = new THREE.Group()
            piece.add(m, edges)
            piece.position.set(rnd(-24, 24), h * 0.4, rnd(-14, 14))
            piece.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.6, 0.6))
            base.add(piece)
          }
          g.add(base, this.sprite(this.glow, ice ? 0x9ad8ff : 0x5ac8ff, 240, 0.3))
          const sd = c % 2 ? 1 : -1
          const px = sd * rnd(70, 190)
          const py = rnd(-55, 45)
          g.position.set(px, py, rnd(-760, -330))
          g.rotation.z = rnd(-0.8, 0.8)
          const ringMat = this.keep(new THREE.SpriteMaterial({ map: this.keep(ringTex()), color: ice ? 0xbfeaff : 0x7aeaff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, fog: false }))
          const ring = new THREE.Sprite(ringMat)
          ring.visible = !ice
          g.add(ring)
          const per = rnd(3.2, 5.5)
          const off = rnd(0, 5)
          this.add(g, true, (dt, t) => {
            base.rotation.y += dt * 0.02
            if (ice) return
            const k = ((t + off) % per) / per
            ring.scale.setScalar(60 + 360 * k)
            ringMat.opacity = (1 - k) * (1 - k) * 0.7
          })
        }
        break
      }
      case 'organisms': {
        const ot = this.keep(organismTex())
        const palette = [0x5affb0, 0xff5ab8, 0x7ae8ff, 0xc8ff5a]
        const n = this.lite ? 5 : 10
        for (let i = 0; i < n; i++) {
          const col = palette[i % palette.length]
          const s = this.sprite(ot, col, 20, 0.85)
          const bx = rnd(-95, 95) + (Math.random() < 0.5 ? -1 : 1) * 18
          const by = rnd(-30, 50)
          const z = rnd(-190, -55)
          const ph = rnd(0, 6)
          const sz = rnd(10, 24)
          let x = bx
          let y = by
          let shy = 0
          s.position.set(x, y, z)
          this.add(s, false, (dt, t) => {
            const pl = this.player
            const scare = Math.max(pl.hyper > 0.4 ? 1 : 0, pl.pulse > 0.5 ? 0.5 : 0)
            shy += (scare - shy) * Math.min(1, dt * 4)
            const tx = bx * (1 - 0.45 * (1 - shy)) + pl.x * 2.2 * (1 - shy)
            x += (tx - x) * Math.min(1, dt * 0.6)
            y = by + Math.sin(t * 0.7 + ph) * 7
            s.position.set(x, y, z)
            const pulse = 1 + Math.sin(t * 2.4 + ph) * 0.12
            const k = (1 - shy * 0.4) * pulse
            s.scale.set(sz * k, sz * k * (1 + Math.sin(t * 2.4 + ph + 1.5) * 0.1), 1)
            s.material.opacity = 0.65 + 0.3 * Math.sin(t * 1.3 + ph) + pl.pulse * 0.3 + shy * 0.25
            s.material.rotation = Math.sin(t * 0.5 + ph) * 0.3
          })
        }
        break
      }
      case 'leviathan':
      case 'whales': {
        const whale = kind === 'whales'
        const count = this.lite ? 1 : 2
        for (let c = 0; c < count; c++) {
          const segs = whale ? 14 : 18
          const size = whale ? 26 : 22
          const gap = whale ? 15 : 12
          const c1 = whale ? 0x2ad8c8 : c % 2 ? 0x9a5aff : 0xff4a9a
          const c2 = whale ? 0xa0fff0 : 0x7affc0
          const root = new THREE.Group()
          this.group.add(root)
          const body: THREE.Sprite[] = []
          for (let i = 0; i < segs; i++) {
            const sp = this.sprite(this.glow, i < 2 ? c2 : c1, size, 0.5)
            root.add(sp)
            body.push(sp)
          }
          const eye = this.sprite(this.glow, 0xffffff, 9, 0.95)
          root.add(eye)
          const dir = c % 2 ? -1 : 1
          let x = rnd(-200, 200)
          const y = rnd(whale ? -20 : 15, whale ? 25 : 55)
          const z = rnd(-330, -230)
          const sp = rnd(5, 9) * dir
          const ph = rnd(0, 6)
          this.items.push({
            obj: root,
            far: false,
            tick: (dt, t) => {
              x += sp * dt
              if (Math.abs(x) > 300) x = -Math.sign(x) * 290
              const react = 1 + this.player.pulse * 0.35 + this.player.hyper * 0.25
              for (let i = 0; i < segs; i++) {
                const f = i / (segs - 1)
                const taper = whale ? (i > segs - 4 ? 0.5 + (i - (segs - 4)) * 0.45 : 0.55 + 0.75 * Math.sin(Math.PI * (i + 1.2) / (segs + 1.5))) : 0.5 + 0.75 * Math.sin(Math.PI * (i + 1.5) / (segs + 2))
                const b = body[i]
                b.position.set(x - dir * i * gap, y + Math.sin(t * 0.9 - i * 0.42 + ph) * (4 + f * 16), z + Math.sin(t * 0.5 - i * 0.3 + ph) * 8)
                const w = size * taper * react
                b.scale.set(whale && i > segs - 4 ? w * 1.7 : w, whale && i > segs - 4 ? w * 0.5 : w, 1)
                b.material.opacity = 0.42 + 0.14 * Math.sin(t * 1.2 - i * 0.5)
              }
              eye.position.set(x + dir * 6, y + 3 + Math.sin(t * 0.9 + ph) * 4, z + 2)
            }
          })
        }
        break
      }
      case 'maw': {
        const mk = (px: number, py: number, pz: number, scale: number, hot: number, cool: number, tilt: number) => {
          const grp = new THREE.Group()
          const mat = this.keep(
            new THREE.ShaderMaterial({
              uniforms: { t: { value: 0 }, cHot: { value: new THREE.Color(hot) }, cCool: { value: new THREE.Color(cool) } },
              vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
              fragmentShader: BH_FRAG,
              transparent: true,
              depthWrite: false,
              fog: false
            })
          )
          const bh = new THREE.Mesh(this.keep(new THREE.PlaneGeometry(2, 2)), mat)
          bh.scale.setScalar(scale)
          bh.rotation.z = tilt
          grp.add(this.sprite(this.glow, hot, scale * 3.4, 0.2), bh)
          const n = this.lite ? 36 : 90
          const pos = new Float32Array(n * 3)
          const col = new Float32Array(n * 3)
          const rad = new Float32Array(n)
          const ang = new Float32Array(n)
          const sp = new Float32Array(n)
          for (let i = 0; i < n; i++) {
            rad[i] = rnd(0.34, 1)
            ang[i] = rnd(0, 6.28)
            sp[i] = rnd(0.6, 1.4)
            const w = Math.random()
            col[i * 3] = 1
            col[i * 3 + 1] = 0.55 + w * 0.35
            col[i * 3 + 2] = 0.3 + w * 0.4
          }
          const geo = this.keep(new THREE.BufferGeometry())
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
          geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
          const pts = new THREE.Points(geo, this.keep(dotMaterial(7, true, 1, true)))
          pts.frustumCulled = false
          grp.add(pts)
          grp.position.set(px, py, pz)
          const c = Math.cos(tilt)
          const sn = Math.sin(tilt)
          this.add(grp, true, (dt, t) => {
            mat.uniforms.t.value = t
            for (let i = 0; i < n; i++) {
              rad[i] -= dt * 0.012 * sp[i] / rad[i]
              ang[i] += dt * 0.5 * sp[i] / (rad[i] * rad[i] * 3 + 0.2)
              if (rad[i] < 0.31) { rad[i] = 1; ang[i] = rnd(0, 6.28) }
              const rr = rad[i] * scale * 0.5
              const ex = Math.cos(ang[i]) * rr
              const ey = Math.sin(ang[i]) * rr * 0.2
              pos[i * 3] = ex * c - ey * sn
              pos[i * 3 + 1] = ex * sn + ey * c
              pos[i * 3 + 2] = Math.sin(ang[i]) < 0 ? 2 : -2
            }
            ;(geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
          })
        }
        mk(-170, 28, -560, 360, 0xffb86a, 0xff5a1a, -0.32)
        break
      }
      case 'waves': {
        const mk = (y: number, hex: number, op: number, flip: number) => {
          const mat = this.keep(
            new THREE.ShaderMaterial({
              uniforms: { t: { value: 0 }, c: { value: new THREE.Color(hex) }, uA: { value: op } },
              vertexShader: 'varying vec2 vP;void main(){vec4 w=modelMatrix*vec4(position,1.0);vP=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}',
              fragmentShader: `uniform float t;uniform vec3 c;uniform float uA;varying vec2 vP;
void main(){
  vec2 p=vP*0.02;
  float a=sin(p.x*3.0+t*0.7+sin(p.y*2.0+t*0.4)*1.5);
  float b=sin(p.y*4.0-t*0.9+sin(p.x*2.5-t*0.3)*1.2);
  float w=0.5+0.25*(a+b);
  float crest=smoothstep(0.62,0.95,w);
  float fade=smoothstep(-900.0,-80.0,vP.y)*(1.0-smoothstep(-40.0,40.0,vP.y));
  gl_FragColor=vec4(c*(0.25+crest*1.5)*fade,fade*uA*(0.25+crest*0.75));
}`,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
              fog: false
            })
          )
          const m = new THREE.Mesh(this.keep(new THREE.PlaneGeometry(1500, 1000)), mat)
          m.rotation.x = -Math.PI / 2 * flip
          m.position.set(0, y, -480)
          m.frustumCulled = false
          this.group.add(m)
          this.items.push({ obj: m, far: false, tick: (dt, t) => (mat.uniforms.t.value = t) })
        }
        mk(70, 0x5affe0, 0.85, 1)
        mk(-75, 0x4a7aff, 0.5, 1)
        break
      }
      case 'timerings': {
        const g = new THREE.Group()
        const addr = (r: number, tube: number, col: number, op: number) => {
          const m = new THREE.Mesh(this.keep(new THREE.TorusGeometry(r, tube, 8, 128)), this.keep(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })))
          g.add(m)
          return m
        }
        const r1 = addr(190, 1.6, 0xffc070, 0.55)
        const r2 = addr(150, 1, 0xb48cff, 0.45)
        const r3 = addr(105, 0.8, 0xffe8b0, 0.4)
        const tickMat = this.keep(new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
        const tg = this.keep(new THREE.BoxGeometry(3, 16, 1))
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2
          const tk = new THREE.Mesh(tg, tickMat)
          tk.position.set(Math.sin(a) * 170, Math.cos(a) * 170, 0)
          tk.rotation.z = -a
          g.add(tk)
        }
        const handGeo = this.keep(new THREE.BoxGeometry(3.2, 1, 1))
        handGeo.translate(1.6, 0, 0)
        const hand1 = new THREE.Mesh(handGeo, tickMat)
        hand1.scale.set(48, 3, 1)
        const hand2 = new THREE.Mesh(handGeo, tickMat)
        hand2.scale.set(34, 4, 1)
        g.add(hand1, hand2, this.sprite(this.glow, 0xffc070, 520, 0.18))
        g.position.set(150, 36, -700)
        g.rotation.y = -0.35
        this.add(g, true, (dt, t) => {
          r1.rotation.z += dt * 0.08
          r2.rotation.z -= dt * 0.12
          r3.rotation.z += dt * 0.2
          hand1.rotation.z = -t * 0.5
          hand2.rotation.z = t * 0.09 + Math.sin(t * 0.7) * 0.2
        })
        break
      }
      case 'sun': {
        const c = u.sun ?? 0xffc23a
        const g = new THREE.Group()
        g.add(this.sprite(this.glow, c, 640, 0.5), this.sprite(this.glow, 0xffffff, 130, 0.9))
        g.position.set(u.name === 'Inferno' ? -170 : 150, u.name === 'Inferno' ? -30 : 45, -900)
        this.add(g, true, (dt, t) => g.scale.setScalar(1 + Math.sin(t * 0.7) * 0.03))
        break
      }
    }
  }

  update(dt: number, speed: number): void {
    this.t += dt
    this.speed = speed
    this.player.pulse = Math.max(0, this.player.pulse - dt * 1.5)
    let n = 0
    for (const it of this.items) {
      if (it.far) {
        it.obj.position.z += speed * 0.01 * dt
        it.obj.position.x += Math.sin(this.t * 0.07 + n * 1.7) * 1.4 * dt
        it.obj.position.y += Math.cos(this.t * 0.05 + n * 2.3) * 0.7 * dt
      }
      n++
      it.tick(dt, this.t)
    }
  }

  dispose(): void {
    this.clear()
    this.own.forEach(o => o.dispose())
  }
}
