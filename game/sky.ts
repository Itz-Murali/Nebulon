import * as THREE from 'three'
import type { Quality, Universe } from '~/types'

const FRAG = `
uniform float t;uniform vec3 cTop;uniform vec3 cBot;uniform vec3 cAcc;uniform vec3 cA;uniform vec3 cB;uniform float wash;uniform float aur;uniform float grid;uniform float glitch;
varying vec2 vUv;
float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.02;a*=0.5;}return v;}
void main(){
  float phi=vUv.x*6.2831853;float th=(1.0-vUv.y)*3.14159265;
  vec3 d=vec3(-cos(phi)*sin(th),cos(th),sin(phi)*sin(th));
  float gk=floor(t*2.5);
  if(glitch>0.0){
    vec2 b=floor(vUv*vec2(34.0,18.0));
    float rr=h(vec3(b,gk));
    float row=h(vec3(floor(vUv.y*40.0),gk,3.0));
    if(row>1.0-0.12*glitch){d.x+=(h(vec3(b,gk+1.0))-0.5)*0.5;d=normalize(d);}
    if(rr>1.0-0.1*glitch){d=normalize(d+(vec3(h(vec3(b,1.0)),h(vec3(b,2.0)),h(vec3(b,3.0)))-0.5)*0.9);}
  }
  vec3 col=mix(cBot,cTop,smoothstep(-0.4,0.9,d.y));
  float f=fbm(d*2.6+vec3(0.0,0.0,t*0.006));
  float f2=fbm(d*5.0+7.3);
  col+=cAcc*smoothstep(0.4,0.95,f)*wash;
  col+=mix(cAcc,cA,0.5)*smoothstep(0.55,0.9,f2)*wash*0.45;
  float band=d.y-0.28-0.14*sin(d.x*4.5+fbm(d*3.0+t*0.05)*5.0+t*0.15);
  float cur=exp(-band*band*60.0)*smoothstep(-0.2,0.2,d.y)*(0.5+0.5*sin(d.x*22.0+t*0.6+f*6.0));
  col+=mix(cA,cB,smoothstep(-0.1,0.3,d.y))*cur*aur;
  float u=atan(d.x,-d.z);float v=asin(clamp(d.y,-1.0,1.0));
  vec2 g=abs(fract(vec2(u*9.0,v*12.0))-0.5);
  float line=smoothstep(0.47,0.5,max(g.x,g.y));
  float scan=0.5+0.5*sin(v*30.0-t*1.2);
  col+=cA*line*grid*(0.25+0.5*scan);
  if(glitch>0.0){
    vec2 b2=floor(vUv*vec2(24.0,12.0));
    float r2=h(vec3(b2,gk+9.0));
    if(r2>1.0-0.07*glitch){
      float r3=h(vec3(b2,5.0));
      vec3 gc=r3<0.4?vec3(1.0,0.05,0.6):(r3<0.8?vec3(0.0,0.8,0.9):vec3(0.8));
      col=mix(col,gc*0.55,0.8);
    }
  }
  gl_FragColor=vec4(pow(col,vec3(2.2)),1.0);
}`

export class Sky {
  readonly mesh: THREE.Mesh
  private bakeMat: THREE.ShaderMaterial
  private bakeScene = new THREE.Scene()
  private bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private rt: THREE.WebGLRenderTarget
  private geo = new THREE.SphereGeometry(3000, 32, 20)
  private skyMat: THREE.MeshBasicMaterial
  private quad: THREE.Mesh
  private qgeo = new THREE.PlaneGeometry(2, 2)
  private t = 0
  private acc = 0
  private animated = false
  private allowAnim = true
  private glitchK = 0
  private baseAnimated = false

  constructor(private renderer: THREE.WebGLRenderer) {
    const c = () => ({ value: new THREE.Color() })
    this.bakeMat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, cTop: c(), cBot: c(), cAcc: c(), cA: c(), cB: c(), wash: { value: 0.5 }, aur: { value: 0 }, grid: { value: 0 }, glitch: { value: 0 } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false
    })
    this.quad = new THREE.Mesh(this.qgeo, this.bakeMat)
    this.bakeScene.add(this.quad)
    this.rt = new THREE.WebGLRenderTarget(1024, 512, { depthBuffer: false })
    this.skyMat = new THREE.MeshBasicMaterial({ map: this.rt.texture, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false })
    this.mesh = new THREE.Mesh(this.geo, this.skyMat)
    this.mesh.renderOrder = -100
    this.mesh.frustumCulled = false
  }

  setQuality(q: Quality): void {
    this.allowAnim = q !== 'low'
    this.rt.setSize(q === 'low' ? 512 : 1024, q === 'low' ? 256 : 512)
    this.bake()
  }

  set(u: Universe): void {
    const s = u.sky ?? { top: u.bg, bottom: u.bg, acc: 0x101018, a: 0x4466aa, b: 0x88aaff, wash: 0.2, aur: 0, grid: 0 }
    const k = this.bakeMat.uniforms
    k.cTop.value.setHex(s.top)
    k.cBot.value.setHex(s.bottom)
    k.cAcc.value.setHex(s.acc)
    k.cA.value.setHex(s.a)
    k.cB.value.setHex(s.b)
    k.wash.value = s.wash
    k.aur.value = s.aur
    k.grid.value = s.grid
    this.baseAnimated = s.aur > 0 || s.grid > 0
    this.setGlitch(u.glitch ?? 0)
  }

  setGlitch(g: number): void {
    this.glitchK = g
    this.bakeMat.uniforms.glitch.value = g
    this.animated = this.baseAnimated || g > 0
    this.bake()
  }

  private bake(): void {
    this.bakeMat.uniforms.t.value = this.t
    const prev = this.renderer.getRenderTarget()
    this.renderer.setRenderTarget(this.rt)
    this.renderer.render(this.bakeScene, this.bakeCam)
    this.renderer.setRenderTarget(prev)
  }

  update(dt: number, cam: THREE.Vector3, speed = 0): void {
    this.t += dt
    this.mesh.position.copy(cam)
    this.mesh.rotation.y += dt * (0.008 + speed * 0.00018)
    this.mesh.rotation.z = Math.sin(this.t * 0.04) * 0.05
    if (this.animated && this.allowAnim) {
      this.acc += dt
      if (this.acc > (this.glitchK > 0 ? 0.4 : 0.9)) {
        this.acc = 0
        this.bake()
      }
    }
  }

  dispose(): void {
    this.geo.dispose()
    this.qgeo.dispose()
    this.bakeMat.dispose()
    this.skyMat.dispose()
    this.rt.dispose()
  }
}
