import * as THREE from 'three'
import { mulberry32 } from './random'

function make(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!]
}
function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function glowTexture(rgb = '255,255,255', size = 64): THREE.CanvasTexture {
  const [c, x] = make(size)
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, `rgba(${rgb},1)`)
  g.addColorStop(0.22, `rgba(${rgb},0.6)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  return tex(c)
}

export function cloudTexture(rgb: string, seed: number): THREE.CanvasTexture {
  const [c, x] = make(256)
  const r = mulberry32(seed)
  x.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 40; i++) {
    const bx = 128 + (r() - 0.5) * 150, by = 128 + (r() - 0.5) * 150, br = 28 + r() * 64
    const g = x.createRadialGradient(bx, by, 0, bx, by, br)
    g.addColorStop(0, `rgba(${rgb},${0.08 + r() * 0.1})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    x.fillStyle = g
    x.fillRect(bx - br, by - br, br * 2, br * 2)
  }
  x.globalCompositeOperation = 'destination-in'
  const m = x.createRadialGradient(128, 128, 20, 128, 128, 128)
  m.addColorStop(0, 'rgba(0,0,0,1)')
  m.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = m
  x.fillRect(0, 0, 256, 256)
  return tex(c)
}

export function galaxyTexture(core: string, arm: string, seed: number, turns = 4.6, hii = '255,130,175', arms = 2): THREE.CanvasTexture {
  const [c, x] = make(512)
  const r = mulberry32(seed)
  const gauss = () => (r() + r() + r() - 1.5) / 1.5
  x.globalCompositeOperation = 'lighter'
  const disk = x.createRadialGradient(256, 256, 0, 256, 256, 250)
  disk.addColorStop(0, `rgba(${arm},0.22)`)
  disk.addColorStop(0.6, `rgba(${arm},0.07)`)
  disk.addColorStop(1, `rgba(${arm},0)`)
  x.fillStyle = disk
  x.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 260; i++) {
    const t = Math.pow(r(), 0.7)
    const th = t * turns + (i % arms) * (Math.PI * 2 / arms) + gauss() * 0.1
    const px = 256 + Math.cos(th) * (18 + t * 214), py = 256 + Math.sin(th) * (18 + t * 214), br = 10 + r() * 16
    const g = x.createRadialGradient(px, py, 0, px, py, br)
    g.addColorStop(0, `rgba(${arm},0.06)`)
    g.addColorStop(1, `rgba(${arm},0)`)
    x.fillStyle = g
    x.fillRect(px - br, py - br, br * 2, br * 2)
  }
  for (let i = 0; i < 26000; i++) {
    const t = Math.pow(r(), 0.6)
    const th = t * turns + (i % arms) * (Math.PI * 2 / arms) + gauss() * (0.12 + t * 0.4)
    const rad = 18 + t * 214
    const hot = t > 0.35 && r() < 0.05
    const rgb = hot ? hii : t < 0.28 ? core : arm
    x.fillStyle = `rgba(${rgb},${(hot ? 0.5 : 0.06 + (1 - t) * 0.2).toFixed(3)})`
    x.beginPath()
    x.arc(256 + Math.cos(th) * rad, 256 + Math.sin(th) * rad, hot ? 1.8 : r() < 0.05 ? 1.5 : 0.7, 0, Math.PI * 2)
    x.fill()
  }
  x.save()
  x.translate(256, 256)
  x.scale(1, 0.85)
  const bulge = x.createRadialGradient(0, 0, 0, 0, 0, 85)
  bulge.addColorStop(0, `rgba(${core},0.95)`)
  bulge.addColorStop(0.25, `rgba(${core},0.5)`)
  bulge.addColorStop(0.6, `rgba(${core},0.16)`)
  bulge.addColorStop(1, `rgba(${core},0)`)
  x.fillStyle = bulge
  x.fillRect(-95, -95, 190, 190)
  x.restore()
  x.globalCompositeOperation = 'destination-in'
  const mask = x.createRadialGradient(256, 256, 0, 256, 256, 256)
  mask.addColorStop(0, 'rgba(0,0,0,1)')
  mask.addColorStop(0.55, 'rgba(0,0,0,1)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = mask
  x.fillRect(0, 0, 512, 512)
  return tex(c)
}

export function ellipticalTexture(core: string, seed: number): THREE.CanvasTexture {
  const [c, x] = make(256)
  const r = mulberry32(seed)
  x.globalCompositeOperation = 'lighter'
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, `rgba(${core},0.95)`)
  g.addColorStop(0.15, `rgba(${core},0.55)`)
  g.addColorStop(0.45, `rgba(${core},0.14)`)
  g.addColorStop(1, `rgba(${core},0)`)
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 2500; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 1.6) * 110
    x.fillStyle = `rgba(255,240,215,${(0.1 + r() * 0.25).toFixed(3)})`
    x.fillRect(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 1, 1)
  }
  return tex(c)
}

export function rockTexture(seed: number): THREE.CanvasTexture {
  const [c, x] = make(256)
  const r = mulberry32(seed)
  x.fillStyle = '#a4a4a4'
  x.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 2600; i++) {
    const v = 90 + Math.floor(r() * 130)
    x.fillStyle = `rgba(${v},${v},${v},0.3)`
    x.beginPath()
    x.arc(r() * 256, r() * 256, 0.5 + r() * 2.6, 0, Math.PI * 2)
    x.fill()
  }
  for (let i = 0; i < 16; i++) {
    const cx = r() * 256, cy = r() * 256, cr = 6 + r() * 20
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, cr)
    g.addColorStop(0, 'rgba(0,0,0,0.38)')
    g.addColorStop(0.8, 'rgba(0,0,0,0.16)')
    g.addColorStop(1, 'rgba(255,255,255,0.3)')
    x.fillStyle = g
    x.beginPath()
    x.arc(cx, cy, cr, 0, Math.PI * 2)
    x.fill()
  }
  const t = tex(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function ringTexture(): THREE.CanvasTexture {
  const [c, x] = make(256, 4)
  const r = mulberry32(5)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    const band = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.21 + r() * 0.4))
    const gap = i > 110 && i < 124 ? 0.08 : 1
    const edge = Math.min(1, t * 8, (1 - t) * 6)
    x.fillStyle = `rgba(${200 + Math.floor(r() * 30)},${178 + Math.floor(r() * 24)},140,${(band * gap * edge * 0.85).toFixed(3)})`
    x.fillRect(i, 0, 1, 4)
  }
  return tex(c)
}

export function cometTexture(): THREE.CanvasTexture {
  const [c, x] = make(256, 32)
  const g = x.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, 'rgba(160,210,255,0)')
  g.addColorStop(0.85, 'rgba(190,225,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,1)')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(0, 16); x.lineTo(250, 10); x.lineTo(256, 16); x.lineTo(250, 22); x.closePath()
  x.fill()
  return tex(c)
}

export function fireTexture(): THREE.CanvasTexture {
  const [c, x] = make(256)
  const r = mulberry32(77)
  x.globalCompositeOperation = 'lighter'
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,250,230,1)')
  g.addColorStop(0.15, 'rgba(255,210,120,0.95)')
  g.addColorStop(0.4, 'rgba(255,120,40,0.6)')
  g.addColorStop(0.75, 'rgba(180,40,10,0.22)')
  g.addColorStop(1, 'rgba(80,10,5,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = r() * 70
    const bx = 128 + Math.cos(a) * d, by = 128 + Math.sin(a) * d, br = 20 + r() * 34
    const b = x.createRadialGradient(bx, by, 0, bx, by, br)
    b.addColorStop(0, 'rgba(255,170,70,0.35)')
    b.addColorStop(1, 'rgba(255,90,20,0)')
    x.fillStyle = b
    x.fillRect(bx - br, by - br, br * 2, br * 2)
  }
  return tex(c)
}

export function shockTexture(): THREE.CanvasTexture {
  const [c, x] = make(256)
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,200,140,0)')
  g.addColorStop(0.7, 'rgba(255,200,140,0)')
  g.addColorStop(0.86, 'rgba(255,190,120,0.85)')
  g.addColorStop(0.93, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  return tex(c)
}

export function beamTexture(rgb: string): THREE.CanvasTexture {
  const [c, x] = make(128, 32)
  const h = x.createLinearGradient(0, 0, 128, 0)
  h.addColorStop(0, 'rgba(255,255,255,1)')
  h.addColorStop(0.08, `rgba(${rgb},0.95)`)
  h.addColorStop(0.5, `rgba(${rgb},0.35)`)
  h.addColorStop(1, `rgba(${rgb},0)`)
  x.fillStyle = h
  x.fillRect(0, 0, 128, 32)
  x.globalCompositeOperation = 'destination-in'
  const v = x.createLinearGradient(0, 0, 0, 32)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(0.5, 'rgba(0,0,0,1)')
  v.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = v
  x.fillRect(0, 0, 128, 32)
  return tex(c)
}

export function clusterTexture(seed: number): THREE.CanvasTexture {
  const [c, x] = make(256)
  const r = mulberry32(seed)
  x.globalCompositeOperation = 'lighter'
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 110)
  g.addColorStop(0, 'rgba(255,235,200,0.85)')
  g.addColorStop(0.2, 'rgba(255,225,190,0.35)')
  g.addColorStop(1, 'rgba(255,225,190,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 3200; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 1.8) * 118
    const rgb = r() < 0.2 ? '170,200,255' : r() < 0.4 ? '255,200,150' : '255,245,225'
    x.fillStyle = `rgba(${rgb},${(0.25 + r() * 0.6).toFixed(2)})`
    x.fillRect(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r() < 0.06 ? 2 : 1, r() < 0.06 ? 2 : 1)
  }
  return tex(c)
}

export function ringNebulaTexture(inner: string, outer: string, seed: number): THREE.CanvasTexture {
  const [c, x] = make(256)
  const r = mulberry32(seed)
  x.globalCompositeOperation = 'lighter'
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0.45, `rgba(${inner},0)`)
  g.addColorStop(0.6, `rgba(${inner},0.5)`)
  g.addColorStop(0.74, `rgba(${outer},0.42)`)
  g.addColorStop(0.92, `rgba(${outer},0.06)`)
  g.addColorStop(1, `rgba(${outer},0)`)
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2, d = 78 + r() * 22
    const bx = 128 + Math.cos(a) * d, by = 128 + Math.sin(a) * d, br = 8 + r() * 14
    const b = x.createRadialGradient(bx, by, 0, bx, by, br)
    b.addColorStop(0, `rgba(${r() < 0.5 ? inner : outer},0.22)`)
    b.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = b
    x.fillRect(bx - br, by - br, br * 2, br * 2)
  }
  const star = x.createRadialGradient(128, 128, 0, 128, 128, 10)
  star.addColorStop(0, 'rgba(255,255,255,1)')
  star.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = star
  x.fillRect(108, 108, 40, 40)
  return tex(c)
}
