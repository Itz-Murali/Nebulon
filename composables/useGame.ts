import { ref, shallowRef, watch } from 'vue'
import { Engine } from '~/game/engine'
import { SHIPS } from '~/game/config'
import { Music } from '~/game/music'
import { useSave } from './useSave'
import type { Screen, ModeId, HudState, RunReport, RunResult } from '~/types'

const emptyHud: HudState = { dist: 0, score: 0, speed: 0, energy: 0, hyper: 100, hyperOn: false, level: 0, universe: '', warp: 0, notice: '', hp: 100, maxHp: 100, hit: 0, flash: '#ffffff', cheat: false, glitch: 0, storm: 0, glare: 0, tag: '', frost: 0, scramble: false, corrupt: 0, fpp: false, bank: 0 }

const ALLOWED: Record<Screen, Screen[]> = {
  loading: ['menu'],
  menu: ['playing', 'hangar', 'settings'],
  playing: ['paused', 'over'],
  paused: ['playing', 'menu', 'settings'],
  over: ['playing', 'hangar', 'menu'],
  hangar: ['menu'],
  settings: ['menu', 'paused']
}

const screen = ref<Screen>('loading')
const hud = shallowRef<HudState>(emptyHud)
const report = shallowRef<RunReport | null>(null)
const mode = ref<ModeId>('classic')
const fault = ref('')
const toast = ref<{ id: number; text: string } | null>(null)

let engine: Engine | null = null
let returnTo: Screen = 'menu'
let toastTimer = 0
let toastId = 0
let cleanup: (() => void) | null = null
let lastQuality = ''

const music = new Music()

const store = useSave()
const { save } = store

const flash = (text: string) => {
  toast.value = { id: ++toastId, text }
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = null), 2400)
}

const musicWanted = (): boolean => {
  const s = save.settings
  if (!s.music || s.muted || s.volume <= 0) return false
  if (screen.value === 'playing') return true
  return screen.value === 'settings' && returnTo === 'paused'
}

const syncMusic = () => {
  if (!import.meta.client) return
  const inRun = screen.value === 'playing' || screen.value === 'paused' || (screen.value === 'settings' && returnTo === 'paused')
  music.set(musicWanted(), save.settings.volume, !inRun)
}

const applySettings = () => {
  if (!engine) return
  const s = save.settings
  engine.audio.volume = s.volume
  engine.audio.muted = s.muted
  engine.audio.apply()
  engine.sens = s.sens
  if (s.quality !== lastQuality) {
    lastQuality = s.quality
    engine.setQuality(s.quality)
  }
  engine.setFpp(s.fpp)
  document.documentElement.classList.toggle('reduce-motion', s.reduceMotion)
  syncMusic()
}

const go = (next: Screen): boolean => {
  if (!ALLOWED[screen.value].includes(next)) return false
  const prev = screen.value
  screen.value = next
  if (!engine) return true
  switch (next) {
    case 'menu':
      if (prev === 'paused') {
        const r = engine.abandonRun()
        if (r) store.applyRun(r)
      }
      engine.setShip(save.ship)
      engine.setView('menu')
      break
    case 'hangar':
      engine.setView('hangar')
      engine.setShip(save.ship)
      break
    case 'settings':
      returnTo = prev === 'paused' ? 'paused' : 'menu'
      break
    case 'playing':
      if (prev === 'paused') engine.resume()
      else {
        hud.value = emptyHud
        engine.startRun(mode.value)
      }
      break
    case 'paused':
      engine.pause()
      break
  }
  return true
}

const onEnd = (r: RunResult) => {
  if (screen.value !== 'playing') return
  report.value = store.applyRun(r)
  engine?.audio.play('over')
  go('over')
}

const pause = () => {
  if (screen.value === 'playing' && engine?.pause()) screen.value = 'paused'
}

const resume = () => go('playing')

const restart = () => {
  if (screen.value !== 'paused' || !engine) return
  const r = engine.abandonRun()
  if (r) store.applyRun(r)
  music.restart()
  screen.value = 'playing'
  hud.value = emptyHud
  engine.restartRun()
}

const start = () => go('playing')

const back = () => {
  if (screen.value === 'settings') go(returnTo)
  else go('menu')
}

const choose = (id: string) => {
  store.selectShip(id)
  engine?.setShip(id)
}

const hyper = (v: boolean) => engine?.setHyper(v)

const suspend = (on: boolean) => {
  if (on && screen.value === 'playing') pause()
  engine?.suspend(on)
}

const cheat = () => {
  if (!engine) return
  flash(engine.toggleCheat() ? 'Cheat mode on' : 'Cheat mode off')
}

const reset = () => {
  store.resetAll()
  applySettings()
  engine?.setShip(save.ship)
  flash('All local data erased')
}

const init = (canvas: HTMLCanvasElement) => {
  if (engine) return
  try {
    engine = new Engine(canvas, { save: () => save, hud: h => (hud.value = h), end: onEnd, find: id => store.recordFind(id) })
    engine.initialize()
  } catch {
    engine = null
    fault.value = 'WebGL could not start. Enable hardware acceleration or try another browser.'
    return
  }
  applySettings()
  void music.load()
  watch(() => save.settings, applySettings, { deep: true })
  watch(screen, syncMusic)

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
  let seq: string[] = []
  const onKey = (e: KeyboardEvent) => {
    seq = [...seq, e.code].slice(-10)
    const word = seq.slice(-7).join('')
    if (seq.join() === KONAMI.join() || word === 'KeyNKeyEKeyBKeyUKeyLKeyOKeyN') {
      seq = []
      cheat()
      return
    }
    if (e.code !== 'Escape') return
    if (screen.value === 'playing') pause()
    else if (screen.value === 'paused') resume()
    else if (['hangar', 'settings'].includes(screen.value)) back()
  }
  const onHide = () => {
    if (document.hidden) pause()
  }
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onHide)
  cleanup = () => {
    window.removeEventListener('keydown', onKey)
    document.removeEventListener('visibilitychange', onHide)
  }

  const delay = store.sessionSeen() ? 120 : 1100
  window.setTimeout(() => {
    if (screen.value === 'loading') go('menu')
  }, delay)
}

const dispose = () => {
  cleanup?.()
  cleanup = null
  music.dispose()
  engine?.dispose()
  engine = null
}

export const shipName = (id: string) => SHIPS.find(s => s.id === id)?.name ?? ''

export function useGame() {
  return { screen, hud, report, mode, fault, toast, save, flags: store.flags, init, dispose, go, start, pause, resume, restart, back, choose, hyper, suspend, reset, cheat }
}
