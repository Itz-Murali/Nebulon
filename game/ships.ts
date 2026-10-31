import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { hullTexture, glowTexture, streakTexture } from './textures'
import type { ShipDef } from '~/types'

export interface ShipRig {
  group: THREE.Group
  exhausts: THREE.Mesh[]
  flares: THREE.Sprite[]
  trails: THREE.Mesh[]
  trailMat: THREE.MeshBasicMaterial
  coreMat: THREE.MeshStandardMaterial
  stripMat: THREE.MeshStandardMaterial
  nav: THREE.MeshStandardMaterial[]
  light: THREE.PointLight
  spinners: THREE.Object3D[]
}

type P = [number, number][]

let shared: { panel: THREE.Texture; glow: THREE.Texture; streak: THREE.Texture } | null = null
const getShared = () => (shared ??= { panel: hullTexture(), glow: glowTexture(), streak: streakTexture() })

const plan = (half: P, nose: number, tail: number): P => [
  [0, nose],
  ...half,
  [0, tail],
  ...half.slice().reverse().map(([x, y]): [number, number] => [-x, y])
]
const scaleP = (p: P, sx: number, sy: number): P => p.map(([x, y]) => [x * sx, y * sy])
const shape = (pts: P) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))

const slab = (pts: P, depth: number, bevel = 0.035) => {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 })
  g.translate(0, 0, -depth / 2)
  g.rotateX(-Math.PI / 2)
  return g
}

const fin = (pts: P, depth: number) => {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 })
  g.translate(0, 0, -depth / 2)
  g.rotateY(Math.PI / 2)
  return g
}

const BODY: Record<number, { half: P; nose: number; tail: number }> = {
  0: { half: [[0.38, 2.9], [0.75, 1.2], [0.92, -0.4], [0.78, -1.7]], nose: 4.4, tail: -2.0 },
  1: { half: [[0.5, 2.6], [1.1, 0.6], [1.5, -1.0], [1.0, -1.9]], nose: 4.6, tail: -2.1 },
  2: { half: [[0.3, 3.4], [0.62, 1.4], [0.8, -0.6], [0.7, -1.8]], nose: 5.0, tail: -2.0 },
  3: { half: [[0.55, 2.4], [1.0, 0.9], [1.15, -0.8], [0.95, -1.8]], nose: 3.9, tail: -2.0 },
  4: { half: [[0.3, 3.0], [0.6, 1.0], [0.85, -0.5], [0.6, -1.9]], nose: 4.8, tail: -2.1 }
}

const wingFor = (S: number, span: number, sweep: number): { pts: P; depth: number } => {
  switch (S) {
    case 1: return { pts: [[0.9, 0.4], [span, -1.2], [span - 0.1, -1.7], [1.1, -1.9]], depth: 0.08 }
    case 2: return { pts: [[0.7, 0.2], [span, 0.9], [span - 0.3, 0.2], [1.0, -1.6]], depth: 0.12 }
    case 3: return { pts: [[0.9, 1.0], [span, -1.4], [span - 0.3, -1.9], [1.2, -2.0]], depth: 0.2 }
    default: return { pts: [[0.7, 1.3], [span, -0.4 - sweep], [span - 0.2, -1.5 - sweep], [1.0, -2.0]], depth: 0.14 }
  }
}

export function buildShip(def: ShipDef): ShipRig {
  const L = def.look
  const S = L.style
  const T = getShared()
  const group = new THREE.Group()

  const hull = new THREE.MeshPhysicalMaterial({ color: L.hull, metalness: 0.55, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.45, map: T.panel, bumpMap: T.panel, bumpScale: 0.08 })
  const hull2 = hull.clone()
  hull2.color = new THREE.Color(L.hull).multiplyScalar(0.7)
  hull2.polygonOffset = true
  hull2.polygonOffsetFactor = -1
  hull2.polygonOffsetUnits = -1
  const dark = new THREE.MeshStandardMaterial({ color: L.dark, metalness: 0.9, roughness: 0.42, map: T.panel })
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa0b0, metalness: 1, roughness: 0.22 })
  const emissive = (c: number, i: number) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i })
  const stripMat = emissive(L.accent, 2.4)
  const violet = emissive(L.glow, 1.8)
  const coreMat = emissive(0xcfd8ff, 3)
  const navR = emissive(0xff2a2a, 2.5)
  const navG = emissive(0x2aff6a, 2.5)
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x120a28, metalness: 0.1, roughness: 0.04, clearcoat: 1, emissive: L.glow, emissiveIntensity: 0.3, transparent: true, opacity: 0.94, depthWrite: false })
  const additive = (c: number, o: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  const exhaustMat = additive(L.glow, 0.5)
  const innerMat = additive(0xe8eeff, 0.8)
  const trailMat = new THREE.MeshBasicMaterial({ map: T.streak, color: L.glow, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  const flareMat = new THREE.SpriteMaterial({ map: T.glow, color: L.glow, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 })

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    group.add(m)
    return m
  }
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
  const cyl = (r1: number, r2: number, len: number, seg = 12) => {
    const g = new THREE.CylinderGeometry(r1, r2, len, seg)
    g.rotateX(Math.PI / 2)
    return g
  }
  const spinners: THREE.Object3D[] = []
  const B = BODY[S]

  add(slab(plan(scaleP(B.half, 0.96, 1), B.nose - 0.3, B.tail - 0.15), 0.5), dark, 0, -0.16, 0)
  add(slab(plan(B.half, B.nose, B.tail), 0.5), hull, 0, 0.1, 0)
  add(slab(plan(scaleP(B.half.slice(0, 3), 0.62, 0.78), B.nose * 0.68, B.tail * 0.75), 0.22), hull2, 0, 0.46, 0)
  add(slab(plan(scaleP(B.half.slice(0, 3), 0.34, 0.6), B.nose * 0.5, B.tail * 0.5), 0.14), dark, 0, 0.6, 0.2)
  add(box(0.08, 0.2, B.nose * 0.9), metal, 0, 0.72, -B.nose * 0.1)

  const spike = new THREE.ConeGeometry(0.2, 2.3, 6)
  spike.rotateX(-Math.PI / 2)
  add(spike, dark, 0, 0.1, -(B.nose + 1))
  add(cyl(0.025, 0.025, 1.4, 6), metal, 0, 0.1, -(B.nose + 2.2))
  add(new THREE.SphereGeometry(0.06, 8, 8), violet, 0, 0.1, -(B.nose + 2.9))

  const canopy = add(new THREE.SphereGeometry(0.5, 24, 16), glass, 0, 0.62, -0.7)
  canopy.scale.set(0.62, 0.42, 1.55)
  add(new THREE.SphereGeometry(0.22, 12, 10), violet, 0, 0.58, -0.8).scale.set(0.8, 0.5, 1.6)
  for (let i = -1; i <= 1; i++) {
    const arc = new THREE.TorusGeometry(0.31, 0.018, 6, 16, Math.PI)
    const a = add(arc, dark, 0, 0.6, -0.7 + i * 0.5)
    const f = Math.sqrt(1 - (i * 0.5 / 0.775) ** 2) * 1.08
    a.scale.set(f, f * 0.74, 1)
  }
  for (const s of [1, -1]) add(box(0.04, 0.05, 1.8), dark, s * 0.31, 0.6, -0.7)

  const wf = wingFor(S, L.span, L.sweep)
  const wp = wf.pts
  const plate: P = wp.map(([x, y]) => [x * 0.82 + 0.15, y * 0.8 - 0.1])
  const sdx = wp[1][0] - wp[0][0]
  const sdz = wp[0][1] - wp[1][1]
  const phi = Math.atan2(sdx, sdz)
  const slen = Math.hypot(sdx, sdz) * 0.75
  const mx = (wp[0][0] + wp[1][0]) / 2 - 0.12
  const mz = -(wp[0][1] + wp[1][1]) / 2

  for (const s of [1, -1]) {
    add(slab(wp, wf.depth), hull).scale.x = s
    add(slab(plate, wf.depth * 0.7), hull2, 0, wf.depth / 2 + 0.04, 0).scale.x = s
    add(slab(plate, wf.depth * 0.6), dark, 0, -wf.depth / 2 - 0.05, 0).scale.x = s
    const strip = add(box(0.05, 0.04, slen), stripMat, s * mx, wf.depth / 2 + 0.09, mz)
    strip.rotation.y = s * phi
    const tipX = s * wp[1][0]
    const tipZ = -wp[1][1]
    add(new THREE.SphereGeometry(0.06, 8, 8), s > 0 ? navG : navR, tipX, wf.depth, tipZ)

    const gx = s * L.span * 0.5
    const gz = 0.2 + L.sweep * 0.3
    add(cyl(0.1, 0.12, 2.2, 10), dark, gx, -0.05, gz)
    add(box(0.28, 0.22, 1.2), dark, gx, -0.05, gz + 0.3)
    add(new THREE.SphereGeometry(0.075, 8, 8), violet, gx, -0.05, gz - 1.15)

    add(box(0.4, 0.26, 1.1), dark, s * (B.half[1][0] * 0.95), 0.12, -0.3)
    add(box(0.3, 0.03, 0.9), stripMat, s * (B.half[1][0] * 0.95), 0.0, -0.3)
    add(box(0.04, 0.05, 2.4), stripMat, s * (B.half[2][0] + 0.01), 0.14, 0.2)
    for (let i = 0; i < 5; i++) add(box(0.5, 0.03, 0.07), i % 2 ? dark : stripMat, s * 0.3, 0.64, 0.6 + i * 0.22)

    if (S === 0 || S === 4) {
      const tip = add(fin([[0.6, 0], [-0.8, 0], [-1.1, L.fin], [-0.35, L.fin * 1.05]], 0.1), hull, s * (L.span - 0.25), 0.05, 0.95 + L.sweep)
      tip.rotation.z = s * -0.12
      add(box(0.03, L.fin * 0.75, 0.05), stripMat, s * (L.span - 0.3), 0.05 + L.fin * 0.45, 0.8 + L.sweep)
      const bf = add(fin([[0.7, 0], [-0.8, 0], [-1.0, 1.3], [-0.4, 1.4]], 0.08), hull, s * 0.52, 0.3, 1.1)
      bf.rotation.z = s * -0.28
    }
    if (S === 0 || S === 2) {
      for (let i = 0; i < 4; i++) {
        const px = s * (L.span * 0.7 + (i % 2) * 0.12)
        const py = -0.2 - Math.floor(i / 2) * 0.12
        add(cyl(0.05, 0.05, 0.9, 6), dark, px, py, 0.3)
        add(new THREE.SphereGeometry(0.045, 6, 6), violet, px, py, -0.18)
      }
    }
    if (S === 1) {
      const canard: P = [[0.6, 2.2], [1.7, 1.5], [1.5, 1.25], [0.6, 1.5]]
      add(slab(canard, 0.06), hull2, 0, 0.12, 0).scale.x = s
      const v = add(fin([[0.6, 0], [-0.7, 0], [-1.0, L.fin], [-0.3, L.fin]], 0.06), hull, s * 0.9, 0.2, 1.3)
      v.rotation.z = s * -0.65
    }
    if (S === 2) {
      const bl = add(fin([[0.9, 0], [-1.1, 0], [-1.4, L.fin], [-0.6, L.fin * 1.1]], 0.08), hull, s * 1.05, 0.25, 1.1)
      bl.rotation.z = s * -0.38
      add(box(0.03, L.fin * 0.8, 0.05), stripMat, s * (1.05 + L.fin * 0.38), 0.25 + L.fin * 0.45, 0.85)
    }
    if (S === 3) {
      for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.2, 0.035, 6, 16), stripMat, gx, -0.05, gz + 0.1 - i * 0.35).rotation.y = Math.PI / 2
      add(cyl(0.22, 0.22, 1.4, 12), hull2, s * L.span * 0.78, 0.1, 0.1)
      add(new THREE.SphereGeometry(0.2, 10, 8), violet, s * L.span * 0.78, 0.1, -0.7)
    }
    if (S === 4) {
      for (let i = 0; i < 3; i++) {
        const sp = new THREE.ConeGeometry(0.09, 3.2 - i * 0.5, 5)
        sp.translate(0, 1.6 - i * 0.25, 0)
        const m = add(sp, dark, s * (0.5 + i * 0.5), 0.2 + i * 0.05, 1.8)
        m.rotation.set(Math.PI / 2 + 0.1, 0, s * (-0.15 - i * 0.12))
      }
      add(new THREE.OctahedronGeometry(0.16), stripMat, tipX, wf.depth + 0.05, tipZ - 0.3).scale.y = 1.8
    }
  }
  for (let i = 0; i < 14; i++) {
    const s = i % 2 ? 1 : -1
    const h = Math.sin(i * 91.7) * 0.5 + 0.5
    add(box(0.1 + h * 0.1, 0.03, 0.25 + h * 0.3), i % 3 ? dark : stripMat, s * (0.12 + h * 0.3), 0.66, -1.9 + i * 0.28)
  }

  const xs = L.engines === 2 ? [-0.55, 0.55] : L.engines === 3 ? [-0.7, 0, 0.7] : [-0.9, -0.3, 0.3, 0.9]
  const r = L.engines === 4 ? 0.24 : 0.3
  const exhausts: THREE.Mesh[] = []
  const flares: THREE.Sprite[] = []
  const trails: THREE.Mesh[] = []
  const outer = new THREE.ConeGeometry(r * 0.8, 2.6, 14, 1, true)
  outer.translate(0, 1.3, 0)
  const inner = new THREE.ConeGeometry(r * 0.4, 1.7, 10, 1, true)
  inner.translate(0, 0.85, 0)
  const tlen = 9
  const t1 = new THREE.PlaneGeometry(tlen, 0.16)
  t1.rotateY(Math.PI / 2)
  t1.translate(0, 0, tlen / 2)
  const t2 = t1.clone()
  t2.rotateZ(Math.PI / 2)

  const mkEngine = (x: number, y: number, rad: number, k: number, trail: boolean) => {
    add(cyl(rad * 1.05, rad * 1.15, 1.1, 16), dark, x, y, 1.9)
    add(new THREE.TorusGeometry(rad * 0.82, 0.04, 8, 24), metal, x, y, 2.45)
    add(new THREE.TorusGeometry(rad * 1.24, 0.03, 8, 24), stripMat, x, y, 1.55)
    const nozzle = cyl(rad * 0.85, rad * 0.6, 0.4, 14)
    add(nozzle, metal, x, y, 2.3)
    add(new THREE.SphereGeometry(rad * 0.55, 12, 10), coreMat, x, y, 2.4).scale.z = 0.45
    const f = rad / r
    for (const [geo, mat, ik] of [[outer, exhaustMat, 1], [inner, innerMat, 0.7]] as [THREE.BufferGeometry, THREE.Material, number][]) {
      const ex = add(geo, mat, x, y, 2.45)
      ex.rotation.x = Math.PI / 2
      ex.userData.k = k * ik
      ex.scale.setScalar(f)
      exhausts.push(ex)
    }
    const fl = new THREE.Sprite(flareMat)
    fl.position.set(x, y, 2.55)
    fl.scale.setScalar(rad * 5)
    fl.userData.base = rad * 5
    group.add(fl)
    flares.push(fl)
    if (trail) {
      trails.push(add(t1, trailMat, x, y, 2.5), add(t2, trailMat, x, y, 2.5))
    }
  }
  xs.forEach(x => mkEngine(x, Math.abs(x) < 0.1 ? 0.18 : 0, r, 1, true))
  for (const s of [1, -1]) mkEngine(s * 1.45, -0.02, 0.14, 0.55, false)

  if (S === 3) {
    const arc = add(new THREE.TorusGeometry(1.6, 0.09, 8, 32, Math.PI * 1.2), stripMat, 0, 0.1, 3.0)
    arc.rotation.z = -Math.PI * 0.1 + Math.PI * 0.4
    add(new THREE.TorusGeometry(1.6, 0.04, 6, 32, Math.PI * 1.2), metal, 0, 0.1, 2.9).rotation.z = arc.rotation.z
  }
  if (S === 4) {
    const ring = add(new THREE.TorusGeometry(1.8, 0.05, 8, 64), stripMat, 0, 0.1, 0.2)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), violet)
      node.position.set(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0)
      ring.add(node)
    }
    spinners.push(ring)
  }

  const light = new THREE.PointLight(L.glow, 2, 12)
  light.position.set(0, 0.3, 3.2)
  group.add(light)

  bake(group, new Set<THREE.Object3D>([...exhausts, ...trails, ...spinners]))

  return { group, exhausts, flares, trails, trailMat, coreMat, stripMat, nav: [navR, navG], light, spinners }
}

function flipWinding(g: THREE.BufferGeometry) {
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name] as THREE.BufferAttribute
    const s = a.itemSize
    const arr = a.array as Float32Array
    for (let t = 0; t < a.count; t += 3) {
      for (let k = 0; k < s; k++) {
        const i1 = (t + 1) * s + k
        const i2 = (t + 2) * s + k
        const tmp = arr[i1]
        arr[i1] = arr[i2]
        arr[i2] = tmp
      }
    }
  }
}

function bake(group: THREE.Group, keep: Set<THREE.Object3D>) {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const gone: THREE.Mesh[] = []
  for (const c of group.children) {
    const m = c as THREE.Mesh
    if (!m.isMesh || keep.has(m) || Array.isArray(m.material)) continue
    m.updateMatrix()
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name)
    g.applyMatrix4(m.matrix)
    if (m.matrix.determinant() < 0) flipWinding(g)
    const list = byMat.get(m.material) ?? []
    list.push(g)
    byMat.set(m.material, list)
    gone.push(m)
  }
  for (const m of gone) {
    group.remove(m)
    m.geometry.dispose()
  }
  byMat.forEach((geos, mat) => {
    const merged = mergeGeometries(geos, false)
    geos.forEach(g => g.dispose())
    if (merged) group.add(new THREE.Mesh(merged, mat))
  })
}

export function updateRig(rig: ShipRig, t: number, thrust: number) {
  rig.exhausts.forEach((m, i) => {
    const k = (m.userData.k as number | undefined) ?? 1
    const flicker = 1 + Math.sin(t * 7 + i * 1.7) * 0.025
    const rad = m.scale.x
    m.scale.set(rad, (0.5 + thrust * 1.4) * k * flicker, rad)
  })
  const o = Math.min(0.85, 0.28 + thrust * 0.35)
  rig.exhausts.forEach(m => ((m.material as THREE.MeshBasicMaterial).opacity = (m.userData.k as number) < 0.8 && (m.userData.k as number) > 0.6 ? Math.min(0.9, o + 0.3) : o))
  rig.flares.forEach((f, i) => f.scale.setScalar((f.userData.base as number) * (0.9 + thrust * 0.7) * (1 + Math.sin(t * 6 + i) * 0.02)))
  rig.trailMat.opacity = 0.14 + thrust * 0.2
  rig.trails.forEach(m => (m.scale.z = 0.7 + thrust * 0.5))
  rig.coreMat.emissiveIntensity = 2 + thrust * 3.5
  rig.stripMat.emissiveIntensity = 2.3
  rig.nav[0].emissiveIntensity = 2
  rig.nav[1].emissiveIntensity = 2
  rig.light.intensity = 1.2 + thrust * 2.2
  rig.spinners.forEach(s => (s.rotation.z += 0.02))
}

export function disposeRig(rig: ShipRig) {
  const mats = new Set<THREE.Material>()
  rig.group.traverse(o => {
    const m = o as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => mats.add(x))
  })
  mats.forEach(m => m.dispose())
}
