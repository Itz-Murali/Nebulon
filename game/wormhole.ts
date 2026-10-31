import * as THREE from 'three'
import { dotMaterial } from './dots'

const VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'

const DISC = `
uniform float t;uniform vec3 c1;uniform vec3 c2;uniform vec3 dst;uniform float uA;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x),f.y);}
void main(){
  vec2 p=(vUv-0.5)*2.0;float r=length(p);if(r>1.0)discard;
  float a=atan(p.y,p.x);
  float tw=a+3.2/(r+0.18)-t*1.7;
  float arms=sin(tw*3.0)*0.5+0.5;
  float fb=n(vec2(tw*1.6,r*7.0-t*2.2))*0.65+n(vec2(tw*3.1,r*13.0-t*3.5))*0.35;
  float sw=mix(arms,fb,0.5);
  float core=smoothstep(0.58,0.0,r);
  vec2 g=p*140.0;vec2 cl=floor(g);vec2 fq=fract(g)-0.5;
  float hv=h(cl);
  vec2 off=(vec2(h(cl+1.7),h(cl+4.1))-0.5)*0.5;
  float dotA=smoothstep(0.11,0.0,length(fq-off));
  float st=step(0.955,hv)*dotA*core*(0.55+0.45*sin(t*2.5+hv*60.0));
  vec3 col=mix(c1,c2,sw)*(0.45+(1.0-r)*1.3);
  col=mix(col,dst*1.7+vec3(st),core*0.88);
  float rim=smoothstep(0.76,0.93,r)*smoothstep(1.0,0.95,r);
  col+=mix(c2,vec3(1.0),0.55)*rim*2.2;
  float flick=0.85+0.15*sin(t*9.0+a*5.0);
  float alpha=smoothstep(1.0,0.88,r)*(0.5+core*0.5+rim)*flick*uA;
  gl_FragColor=vec4(col,alpha);
}`

const FUNNEL = `
uniform float t;uniform vec3 c1;uniform vec3 c2;uniform float uA;varying vec2 vUv;
void main(){
  float a=vUv.x*6.2831853;float l=vUv.y;
  float sp=sin(a*5.0+l*14.0-t*3.0)*0.5+0.5;
  float ring=sin(l*40.0+t*6.0)*0.5+0.5;
  vec3 col=mix(c1,c2,sp)*(0.35+l*1.6)+vec3(1.0)*pow(ring*sp,5.0)*0.6;
  float fade=smoothstep(0.0,0.12,l)*(0.35+0.65*l);
  gl_FragColor=vec4(col,fade*(0.3+0.5*sp)*uA);
}`

const TUNNEL = `
uniform float t;uniform vec3 c1;uniform vec3 c2;uniform float uA;varying vec2 vUv;
void main(){
  float a=vUv.x*6.2831853;float l=vUv.y;
  float sp=sin(a*7.0+l*26.0-t*14.0)*0.5+0.5;
  float st=sin(l*70.0+t*46.0)*0.5+0.5;
  vec3 col=mix(c1,c2,sp)*(0.5+st*0.9)+vec3(1.0)*pow(st*sp,6.0);
  float edge=smoothstep(0.0,0.12,l)*smoothstep(1.0,0.7,l);
  gl_FragColor=vec4(col,uA*edge*(0.35+0.5*sp));
}`

export class Wormhole {
  readonly group = new THREE.Group()
  readonly tunnel: THREE.Mesh
  readonly ring: THREE.Sprite
  private ringT = 1
  private disc: THREE.Mesh
  private funnel: THREE.Mesh
  private discMat: THREE.ShaderMaterial
  private funnelMat: THREE.ShaderMaterial
  private tunnelMat: THREE.ShaderMaterial
  private rim: THREE.Mesh
  private glow: THREE.Sprite
  private light: THREE.PointLight
  private pts: THREE.Points
  private pdata: { a: Float32Array; r: Float32Array; s: Float32Array }
  private disposables: { dispose(): void }[] = []
  private t = 0
  private fade = 0
  private open = false
  private style: '' | 'bio' | 'unstable' = ''
  private tend = new THREE.Group()
  private tendrils: { a: number; ph: number; sprites: THREE.Sprite[] }[] = []
  private jt = 0
  private jx = 0
  private jy = 0
  private js = 1

  constructor(glowTex: THREE.Texture) {
    const keep = <T extends { dispose(): void }>(x: T): T => {
      this.disposables.push(x)
      return x
    }
    const shader = (frag: string, side: THREE.Side) =>
      keep(
        new THREE.ShaderMaterial({
          uniforms: { t: { value: 0 }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, dst: { value: new THREE.Color() }, uA: { value: 0 } },
          vertexShader: VERT,
          fragmentShader: frag,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side
        })
      )
    this.discMat = shader(DISC, THREE.DoubleSide)
    this.funnelMat = shader(FUNNEL, THREE.BackSide)
    this.tunnelMat = shader(TUNNEL, THREE.BackSide)

    this.disc = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), this.discMat)
    this.disc.scale.setScalar(18)

    const fg = keep(new THREE.CylinderGeometry(2, 17, 110, 56, 1, true))
    fg.rotateX(-Math.PI / 2)
    fg.translate(0, 0, -55)
    this.funnel = new THREE.Mesh(fg, this.funnelMat)

    this.rim = new THREE.Mesh(
      keep(new THREE.TorusGeometry(17.5, 0.5, 10, 96)),
      keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }))
    )
    this.glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xb06bff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 })))
    this.glow.scale.setScalar(90)
    this.light = new THREE.PointLight(0xb06bff, 0, 160, 1.4)
    this.light.position.set(0, 0, 8)

    const n = 160
    const pos = new Float32Array(n * 3)
    this.pdata = { a: new Float32Array(n), r: new Float32Array(n), s: new Float32Array(n) }
    for (let i = 0; i < n; i++) {
      this.pdata.a[i] = Math.random() * Math.PI * 2
      this.pdata.r[i] = 2 + Math.random() * 16
      this.pdata.s[i] = 0.6 + Math.random() * 1.2
    }
    const pg = keep(new THREE.BufferGeometry())
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.pts = new THREE.Points(pg, keep(dotMaterial(0.2, true, 0.9, false, 0xffffff)))
    this.pts.frustumCulled = false

    const pink = keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xff4a9a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85 }))
    const tip = keep(new THREE.SpriteMaterial({ map: glowTex, color: 0x7affa8, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.95 }))
    for (let i = 0; i < 16; i++) {
      const sprites: THREE.Sprite[] = []
      for (let k = 0; k < 8; k++) {
        const sp = new THREE.Sprite(k === 7 ? tip : pink)
        this.tend.add(sp)
        sprites.push(sp)
      }
      this.tendrils.push({ a: (i / 16) * Math.PI * 2, ph: Math.random() * 6.28, sprites })
    }
    this.tend.visible = false

    this.group.add(this.funnel, this.disc, this.rim, this.glow, this.light, this.pts, this.tend)
    this.group.visible = false

    const tg = keep(new THREE.CylinderGeometry(9, 9, 220, 56, 1, true))
    tg.rotateX(-Math.PI / 2)
    this.tunnel = new THREE.Mesh(tg, this.tunnelMat)
    this.tunnel.position.z = -100
    this.tunnel.frustumCulled = false
    this.tunnel.visible = false

    const c = document.createElement('canvas')
    c.width = c.height = 256
    const x = c.getContext('2d')!
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.72, 'rgba(255,255,255,0)')
    g.addColorStop(0.88, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.95, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 256, 256)
    const rt = keep(new THREE.CanvasTexture(c))
    this.ring = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: rt, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })))
    this.ring.visible = false
  }

  pulse(hex: number, x: number, y: number) {
    this.ring.position.set(x, y, -7)
    ;(this.ring.material as THREE.SpriteMaterial).color.setHex(hex)
    this.ringT = 0
    this.ring.visible = true
  }

  setColors(from: [number, number], dest: number) {
    for (const m of [this.discMat, this.funnelMat, this.tunnelMat]) {
      m.uniforms.c1.value.setHex(from[0])
      m.uniforms.c2.value.setHex(from[1])
      m.uniforms.dst.value.setHex(dest)
    }
    ;(this.rim.material as THREE.MeshBasicMaterial).color.setHex(from[1])
    ;(this.glow.material as THREE.SpriteMaterial).color.setHex(from[0])
    this.light.color.setHex(from[1])
    ;(this.pts.material as THREE.ShaderMaterial).uniforms.uColor.value.setHex(from[1])
  }

  setStyle(kind: '' | 'bio' | 'unstable') {
    this.style = kind
    this.tend.visible = kind === 'bio'
    if (kind !== 'unstable') {
      this.group.scale.setScalar(1)
      this.group.rotation.z = 0
    }
  }

  spawn(z: number) {
    this.open = true
    this.fade = 0
    this.group.position.set(0, 0, z)
    this.group.visible = true
  }

  close() {
    this.open = false
    this.group.position.x = 0
    this.group.position.y = 0
    this.group.visible = false
    this.light.intensity = 0
  }

  get active() {
    return this.open
  }

  get z() {
    return this.group.position.z
  }

  advance(d: number) {
    this.group.position.z += d
  }

  update(dt: number, warp: number, shipX: number, shipY: number) {
    this.t += dt
    if (this.ringT < 1) {
      this.ringT = Math.min(1, this.ringT + dt / 0.9)
      this.ring.scale.setScalar(6 + 150 * this.ringT * (2 - this.ringT))
      ;(this.ring.material as THREE.SpriteMaterial).opacity = (1 - this.ringT) * 0.95
      if (this.ringT >= 1) this.ring.visible = false
    }
    for (const m of [this.discMat, this.funnelMat, this.tunnelMat]) m.uniforms.t.value = this.t
    if (this.open) {
      this.fade = Math.min(1, this.fade + dt * 0.8)
      this.discMat.uniforms.uA.value = this.fade
      this.funnelMat.uniforms.uA.value = this.fade
      this.rim.rotation.z += dt * 0.4
      this.rim.scale.setScalar(1 + Math.sin(this.t * 3) * 0.015)
      if (this.style === 'unstable') {
        this.jt -= dt
        if (this.jt <= 0) {
          this.jt = 0.1 + Math.random() * 0.45
          this.jx = (Math.random() - 0.5) * 4
          this.jy = (Math.random() - 0.5) * 3
          this.js = 1 + (Math.random() - 0.5) * 0.25
        }
        const a = 1 - Math.exp(-14 * dt)
        this.group.position.x += (this.jx - this.group.position.x) * a
        this.group.position.y += (this.jy - this.group.position.y) * a
        this.group.scale.setScalar(this.group.scale.x + (this.js - this.group.scale.x) * a)
        this.group.rotation.z += dt * (Math.random() < 0.05 ? 3 : 0.2)
        const fl = Math.random() < 0.07 ? 0.35 : 1
        this.discMat.uniforms.uA.value = this.fade * fl
      }
      if (this.style === 'bio') {
        const lx = Math.max(-1, Math.min(1, shipX / 6))
        const ly = Math.max(-1, Math.min(1, shipY / 4))
        for (const td of this.tendrils) {
          for (let k = 0; k < td.sprites.length; k++) {
            const f = k / (td.sprites.length - 1)
            const sway = Math.sin(this.t * 1.4 + td.ph + f * 2.2) * 0.22 * f
            const ang = td.a + sway
            const rad = 18 - f * 8
            const sp = td.sprites[k]
            sp.position.set(Math.cos(ang) * rad + lx * f * f * 7, Math.sin(ang) * rad + ly * f * f * 5, f * 15 + 0.5)
            sp.scale.setScalar(k === 7 ? 3.4 + Math.sin(this.t * 4 + td.ph) * 0.6 : 3.6 * (1 - f * 0.55))
          }
        }
      }
      ;(this.glow.material as THREE.SpriteMaterial).opacity = 0.5 * this.fade + Math.sin(this.t * 2) * 0.08
      this.light.intensity = this.fade * (6 + Math.sin(this.t * 5) * 1.5)
      const p = this.pts.geometry.attributes.position as THREE.BufferAttribute
      const pa = p.array as Float32Array
      const d = this.pdata
      for (let i = 0; i < d.a.length; i++) {
        d.r[i] -= dt * 4 * d.s[i]
        if (d.r[i] < 0.8) d.r[i] = 17
        d.a[i] += dt * (1.2 + 6 / (d.r[i] + 1)) * d.s[i]
        pa[i * 3] = Math.cos(d.a[i]) * d.r[i]
        pa[i * 3 + 1] = Math.sin(d.a[i]) * d.r[i]
        pa[i * 3 + 2] = -((17 - d.r[i]) / 17) * 90
      }
      p.needsUpdate = true
    }
    this.tunnelMat.uniforms.uA.value = warp
    this.tunnel.visible = warp > 0.03
    this.tunnel.position.x = shipX * 0.5
    this.tunnel.position.y = shipY * 0.5
  }

  dispose() {
    this.disposables.forEach(d => d.dispose())
  }
}
