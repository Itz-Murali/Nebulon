import * as THREE from 'three'

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
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}
const rgb = (hex: number, a: number) => `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${a})`

export const glowTexture = () => {
  const [c, x] = cv(128, 128)
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return tex(c)
}

export const streakTexture = () => {
  const [c, x] = cv(128, 16)
  const g = x.createLinearGradient(0, 0, 128, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(255,255,255,1)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 16)
  const v = x.createLinearGradient(0, 0, 0, 16)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(0.5, 'rgba(0,0,0,1)')
  v.addColorStop(1, 'rgba(0,0,0,0)')
  x.globalCompositeOperation = 'destination-in'
  x.fillStyle = v
  x.fillRect(0, 0, 128, 16)
  const t = tex(c)
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export const hullTexture = () => {
  const [c, x] = cv(512, 512)
  x.fillStyle = '#cfd2d8'
  x.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 260; i++) {
    const w = rnd(20, 120)
    const h = rnd(14, 70)
    const px = rnd(0, 512)
    const py = rnd(0, 512)
    const s = Math.floor(rnd(0.84, 1) * 255)
    x.fillStyle = `rgb(${s},${s},${s + 4})`
    x.fillRect(px, py, w, h)
    x.strokeStyle = 'rgba(40,44,56,0.8)'
    x.lineWidth = 1.5
    x.strokeRect(px, py, w, h)
  }
  for (let i = 0; i < 600; i++) {
    x.fillStyle = `rgba(30,34,44,${rnd(0.15, 0.5)})`
    x.fillRect(rnd(0, 512), rnd(0, 512), 2, 2)
  }
  x.strokeStyle = 'rgba(60,64,76,0.35)'
  for (let i = 0; i < 40; i++) {
    x.beginPath()
    const px = rnd(0, 512)
    const py = rnd(0, 512)
    x.moveTo(px, py)
    x.lineTo(px + rnd(-60, 60), py + rnd(-8, 8))
    x.stroke()
  }
  const t = tex(c)
  t.repeat.set(0.5, 0.5)
  return t
}

export const rockTexture = () => {
  const [c, x] = cv(256, 256)
  x.fillStyle = '#7a736b'
  x.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 260; i++) {
    const s = Math.floor(rnd(60, 160))
    x.fillStyle = `rgba(${s},${s - 6},${s - 12},${rnd(0.1, 0.4)})`
    x.beginPath()
    x.arc(rnd(0, 256), rnd(0, 256), rnd(3, 28), 0, Math.PI * 2)
    x.fill()
  }
  for (let i = 0; i < 18; i++) {
    const px = rnd(0, 256)
    const py = rnd(0, 256)
    const r = rnd(8, 26)
    const g = x.createRadialGradient(px, py, 0, px, py, r)
    g.addColorStop(0, 'rgba(20,18,16,0.7)')
    g.addColorStop(0.8, 'rgba(20,18,16,0.25)')
    g.addColorStop(1, 'rgba(200,190,180,0.35)')
    x.fillStyle = g
    x.beginPath()
    x.arc(px, py, r, 0, Math.PI * 2)
    x.fill()
  }
  return tex(c)
}

export const planetTexture = (pal: string[], gas: boolean) => {
  const [c, x] = cv(512, 256)
  const pick = () => pal[Math.floor(Math.random() * pal.length)]
  if (gas) {
    let y = 0
    while (y < 256) {
      const h = rnd(6, 32)
      x.fillStyle = pick()
      x.fillRect(0, y, 512, h)
      y += h
    }
    for (let i = 0; i < 500; i++) {
      x.globalAlpha = rnd(0.05, 0.2)
      x.fillStyle = pick()
      x.beginPath()
      x.ellipse(rnd(0, 512), rnd(0, 256), rnd(10, 70), rnd(1.5, 6), 0, 0, Math.PI * 2)
      x.fill()
    }
  } else {
    x.fillStyle = pal[0]
    x.fillRect(0, 0, 512, 256)
    for (let i = 0; i < 180; i++) {
      x.globalAlpha = rnd(0.15, 0.4)
      x.fillStyle = pick()
      x.beginPath()
      x.arc(rnd(0, 512), rnd(0, 256), rnd(8, 55), 0, Math.PI * 2)
      x.fill()
    }
    x.globalAlpha = 0.5
    const cap = x.createLinearGradient(0, 0, 0, 256)
    cap.addColorStop(0, 'rgba(255,255,255,0.8)')
    cap.addColorStop(0.12, 'rgba(255,255,255,0)')
    cap.addColorStop(0.88, 'rgba(255,255,255,0)')
    cap.addColorStop(1, 'rgba(255,255,255,0.8)')
    x.fillStyle = cap
    x.fillRect(0, 0, 512, 256)
  }
  x.globalAlpha = 1
  return tex(c)
}

export const ringTexture = (pal: string[]) => {
  const [c, x] = cv(256, 4)
  for (let i = 0; i < 70; i++) {
    x.globalAlpha = rnd(0.15, 0.85)
    x.fillStyle = pal[Math.floor(Math.random() * pal.length)]
    x.fillRect(rnd(0, 256), 0, rnd(2, 12), 4)
  }
  x.globalCompositeOperation = 'destination-in'
  const g = x.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.12, 'rgba(0,0,0,1)')
  g.addColorStop(0.85, 'rgba(0,0,0,1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 256, 4)
  const t = tex(c)
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export const diskTexture = (c1: string, c2: string) => {
  const [c, x] = cv(256, 16)
  const g = x.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, c2)
  g.addColorStop(0.2, c2)
  g.addColorStop(0.35, c1)
  g.addColorStop(0.7, 'rgba(120,40,10,0.45)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 256, 16)
  x.globalCompositeOperation = 'destination-out'
  for (let y = 0; y < 16; y++) {
    x.fillStyle = `rgba(0,0,0,${rnd(0, 0.55)})`
    x.fillRect(0, y, 256, 1)
  }
  const t = tex(c)
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export const galaxyTexture = (cols: number[]) => {
  const [c, x] = cv(512, 512)
  x.globalCompositeOperation = 'lighter'
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 2200; i++) {
      const t = rnd(0.04, 1)
      const a = t * 5.2 + arm * Math.PI
      const r = t * 230
      const px = 256 + Math.cos(a) * r + rnd(-22, 22) * t
      const py = 256 + Math.sin(a) * r + rnd(-22, 22) * t
      x.fillStyle = rgb(cols[Math.floor(Math.random() * cols.length)], rnd(0.06, 0.4))
      x.fillRect(px, py, 2, 2)
    }
  }
  const g = x.createRadialGradient(256, 256, 0, 256, 256, 90)
  g.addColorStop(0, 'rgba(255,240,220,0.95)')
  g.addColorStop(0.3, rgb(cols[0], 0.4))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 512, 512)
  const t = tex(c)
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export const windowTexture = () => {
  const [c, x] = cv(128, 128)
  x.fillStyle = '#10131c'
  x.fillRect(0, 0, 128, 128)
  for (let gy = 0; gy < 16; gy++) {
    for (let gx = 0; gx < 16; gx++) {
      if (Math.random() < 0.55) {
        x.fillStyle = Math.random() < 0.8 ? '#ffd27a' : '#8ad0ff'
        x.fillRect(gx * 8 + 2, gy * 8 + 2, 4, 3)
      }
    }
  }
  return tex(c)
}

export const ringGeo = (inner: number, outer: number) => {
  const g = new THREE.RingGeometry(inner, outer, 72, 1)
  const p = g.attributes.position as THREE.BufferAttribute
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i)
    const py = p.getY(i)
    uv.setXY(i, (Math.hypot(px, py) - inner) / (outer - inner), (Math.atan2(py, px) / (Math.PI * 2) + 1) % 1)
  }
  return g
}
