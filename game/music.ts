export const MUSIC_URL = '/audio/nebulon-theme.mp3'

type Gesture = 'pointerdown' | 'keydown' | 'touchend'
const GESTURES: Gesture[] = ['pointerdown', 'keydown', 'touchend']

export class Music {
  private el: HTMLAudioElement | null = null
  private objectUrl = ''
  private loading: Promise<void> | null = null
  private ready = false
  private want = false
  private armed = false

  private async fetchBlob(url: string): Promise<Blob | null> {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const blob = await res.blob()
      if (blob.size < 2048 || (blob.type && !blob.type.startsWith('audio') && !blob.type.includes('octet-stream') && !blob.type.includes('mpeg'))) return null
      return blob
    } catch {
      return null
    }
  }

  private element(): HTMLAudioElement {
    if (!this.el) {
      const el = new Audio()
      el.loop = true
      el.preload = 'auto'
      this.el = el
    }
    return this.el
  }

  load(): Promise<void> {
    if (this.loading) return this.loading
    const el = this.element()
    this.loading = (async () => {
      const blob = await this.fetchBlob(MUSIC_URL)
      if (blob) {
        this.objectUrl = URL.createObjectURL(blob.type.startsWith('audio') ? blob : new Blob([blob], { type: 'audio/mpeg' }))
        el.src = this.objectUrl
      } else {
        el.src = MUSIC_URL
      }
      this.ready = true
    })()
    return this.loading
  }

  private arm() {
    if (this.armed || typeof window === 'undefined') return
    this.armed = true
    const retry = () => {
      for (const g of GESTURES) window.removeEventListener(g, retry)
      this.armed = false
      this.play()
    }
    for (const g of GESTURES) window.addEventListener(g, retry, { passive: true })
  }

  private play() {
    if (!this.want) return
    const el = this.element()
    if (!this.ready) {
      void this.load().then(() => this.play())
      return
    }
    el.play().catch(() => {
      if (this.want) this.arm()
    })
  }

  set(on: boolean, volume: number, rewind = false) {
    if (typeof window === 'undefined') return
    this.want = on
    const el = this.element()
    el.volume = Math.min(1, Math.max(0, volume))
    if (on) {
      this.play()
    } else {
      el.pause()
      if (rewind) el.currentTime = 0
    }
  }

  restart() {
    if (this.el) this.el.currentTime = 0
  }

  dispose() {
    this.want = false
    this.el?.pause()
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = ''
    this.el = null
    this.loading = null
    this.ready = false
  }
}
