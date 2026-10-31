import * as THREE from 'three'

export const dotUniforms = { uDpr: { value: 1 }, uH: { value: 800 } }

export const dotMaterial = (size: number, atten: boolean, opacity = 1, vertexColors = true, color = 0xffffff, heart = false) =>
  new THREE.ShaderMaterial({
    uniforms: { uSize: { value: size }, uOpacity: { value: opacity }, uColor: { value: new THREE.Color(color) }, uTint: { value: new THREE.Color(0xffffff) }, uDpr: dotUniforms.uDpr, uH: dotUniforms.uH },
    defines: { ...(atten ? { ATTEN: '' } : {}), ...(heart ? { HEART: '' } : {}) },
    vertexShader: `
uniform float uSize;uniform float uDpr;uniform float uH;uniform vec3 uColor;uniform vec3 uTint;
attribute vec3 color;varying vec3 vC;
void main(){
  vC=${vertexColors ? 'color' : 'uColor'}*uTint;
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  #ifdef ATTEN
  gl_PointSize=max(uSize*uH*0.5/max(-mv.z,0.1),1.0);
  #else
  gl_PointSize=uSize*uDpr;
  #endif
  gl_Position=projectionMatrix*mv;
}`,
    fragmentShader: `
uniform float uOpacity;varying vec3 vC;
void main(){
  #ifdef HEART
  vec2 p=vec2((gl_PointCoord.x-0.5)*2.7,(0.5-gl_PointCoord.y)*2.7+0.15);
  float q=p.x*p.x+p.y*p.y-1.0;
  if(q*q*q-p.x*p.x*p.y*p.y*p.y>0.0)discard;
  gl_FragColor=vec4(vC,0.9*uOpacity);
  #else
  float d=length(gl_PointCoord-vec2(0.5))*2.0;
  if(d>1.0)discard;
  float a=pow(1.0-d,2.0)*0.55+smoothstep(0.4,0.0,d)*0.9;
  gl_FragColor=vec4(vC,clamp(a,0.0,1.0)*uOpacity);
  #endif
}`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
