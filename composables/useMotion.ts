import { animate } from 'animejs'

type Targets = Element | ArrayLike<Element> | null | undefined

const els = (t: Targets): HTMLElement[] => {
  if (!t) return []
  if (t instanceof Element) return [t as HTMLElement]
  return Array.from(t as ArrayLike<Element>) as HTMLElement[]
}

export const motionReduced = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion'))

const settle = (list: HTMLElement[]) => {
  for (const e of list) {
    e.classList.remove('a-in')
    e.style.opacity = ''
    e.style.transform = ''
  }
}

interface RevealOpts {
  y?: number
  x?: number
  delay?: number
  step?: number
  duration?: number
}

export function reveal(targets: Targets, o: RevealOpts = {}) {
  const list = els(targets)
  if (!list.length) return
  if (motionReduced()) return settle(list)
  const base = o.delay ?? 0
  const step = o.step ?? 70
  try {
    animate(list, {
      opacity: [0, 1],
      ...(o.x ? { translateX: [o.x, 0] } : { translateY: [o.y ?? 16, 0] }),
      duration: o.duration ?? 650,
      delay: (_el: unknown, i: number) => base + i * step,
      ease: 'outExpo',
      onComplete: () => settle(list)
    })
  } catch {
    settle(list)
  }
}

export function pop(target: Targets) {
  const list = els(target)
  if (!list.length || motionReduced()) return
  try {
    animate(list, {
      scale: [{ to: 1.045, duration: 130, ease: 'outQuad' }, { to: 1, duration: 320, ease: 'outBack' }]
    })
  } catch {
  }
}

export function moveMarker(target: Targets, y: number, height: number) {
  const list = els(target)
  if (!list.length) return
  if (motionReduced()) {
    for (const e of list) {
      e.style.transform = `translateY(${y}px)`
      e.style.height = `${height}px`
    }
    return
  }
  try {
    animate(list, { translateY: y, height, duration: 380, ease: 'outQuart' })
  } catch {
    for (const e of list) {
      e.style.transform = `translateY(${y}px)`
      e.style.height = `${height}px`
    }
  }
}
