import { reactive, watch } from 'vue'
import { SHIPS } from '~/game/config'
import type { Save, RunResult, RunReport } from '~/types'

const KEY = 'nebulon.save'
const SESSION = 'nebulon.session'
const VERSION = 2

const blank = (): Save => ({
  v: VERSION,
  pilot: 'PLT-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
  ship: 'aurora',
  stats: { runs: 0, totalDist: 0, totalEnergy: 0, maxSpeed: 0, bestDist: 0, bestScore: 0 },
  settings: { volume: 0.6, muted: false, quality: 'medium', sens: 1, reduceMotion: false, fpp: false, music: true },
  codex: []
})

const flags = reactive({ storage: true })

const read = (): Save => {
  const base = blank()
  if (!import.meta.client) return base
  try {
    localStorage.setItem('nebulon.probe', '1')
    localStorage.removeItem('nebulon.probe')
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<Save>
    if (!p || typeof p !== 'object' || p.v !== VERSION) return base
    const s: Save = { ...base, ...p, stats: { ...base.stats, ...p.stats }, settings: { ...base.settings, ...p.settings } }
    if (!SHIPS.some(x => x.id === s.ship)) s.ship = 'aurora'
    s.codex = Array.isArray(p.codex) ? p.codex.filter((x): x is string => typeof x === 'string') : []
    s.settings.fpp = s.settings.fpp === true
    s.settings.music = s.settings.music !== false
    return s
  } catch {
    flags.storage = false
    return base
  }
}

const save = reactive<Save>(read())

if (import.meta.client) {
  watch(
    save,
    v => {
      try {
        localStorage.setItem(KEY, JSON.stringify(v))
      } catch {
        flags.storage = false
      }
    },
    { deep: true }
  )
}

const sessionSeen = () => {
  try {
    const seen = sessionStorage.getItem(SESSION) === '1'
    sessionStorage.setItem(SESSION, '1')
    return seen
  } catch {
    return false
  }
}

const selectShip = (id: string) => {
  if (SHIPS.some(s => s.id === id)) save.ship = id
}

const applyRun = (r: RunResult): RunReport => {
  const st = save.stats
  const report: RunReport = { run: r, recordScore: r.score > st.bestScore, recordDist: r.dist > st.bestDist }
  st.runs++
  st.totalDist += r.dist
  st.totalEnergy += r.energy
  st.maxSpeed = Math.max(st.maxSpeed, r.maxSpeed)
  st.bestDist = Math.max(st.bestDist, r.dist)
  st.bestScore = Math.max(st.bestScore, r.score)
  return report
}

const recordFind = (id: string): boolean => {
  if (save.codex.includes(id)) return false
  save.codex.push(id)
  return true
}

const resetAll = () => {
  Object.assign(save, blank())
  try {
    localStorage.removeItem(KEY)
  } catch {
    flags.storage = false
  }
}

export function useSave() {
  return { save, flags, sessionSeen, selectShip, applyRun, recordFind, resetAll }
}
