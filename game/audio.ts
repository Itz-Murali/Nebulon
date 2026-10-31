export type Sfx = 'click' | 'orb' | 'hyper' | 'shield' | 'crash' | 'over' | 'buy' | 'deny'

export class AudioFx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private drone: { o: OscillatorNode; f: BiquadFilterNode; g: GainNode } | null = null
  volume = 0.6
  muted = false

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.connect(this.ctx.destination)
      this.apply()
      const len = this.ctx.sampleRate
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = this.noise.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      const o = this.ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = 48
      const f = this.ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 220
      const g = this.ctx.createGain()
      g.gain.value = 0
      o.connect(f)
      f.connect(g)
      g.connect(this.master)
      o.start()
      this.drone = { o, f, g }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  apply() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume
  }

  setDrone(on: boolean, level: number) {
    if (!this.ctx || !this.drone) return
    const t = this.ctx.currentTime
    this.drone.g.gain.setTargetAtTime(on ? 0.05 + level * 0.06 : 0, t, 0.15)
    this.drone.o.frequency.setTargetAtTime(44 + level * 56, t, 0.2)
    this.drone.f.frequency.setTargetAtTime(180 + level * 520, t, 0.2)
  }

  private tone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime + delay
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private hiss(dur: number, vol: number, freq: number) {
    if (!this.ctx || !this.master || !this.noise) return
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(freq, t)
    f.frequency.exponentialRampToValueAtTime(60, t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + dur)
  }

  play(s: Sfx) {
    if (!this.ctx) return
    switch (s) {
      case 'click': this.tone(520, 380, 0.06, 'square', 0.04); break
      case 'orb': this.tone(660, 1320, 0.12, 'sine', 0.12); break
      case 'hyper': this.tone(120, 620, 0.5, 'sawtooth', 0.09); this.hiss(0.5, 0.12, 4000); break
      case 'shield': this.tone(300, 90, 0.35, 'triangle', 0.2); this.hiss(0.25, 0.12, 2500); break
      case 'crash': this.hiss(0.9, 0.5, 3000); this.tone(110, 28, 0.8, 'sawtooth', 0.25); break
      case 'over': this.tone(330, 110, 1, 'triangle', 0.14, 0.3); break
      case 'buy': this.tone(440, 660, 0.1, 'sine', 0.12); this.tone(660, 880, 0.12, 'sine', 0.12, 0.09); break
      case 'deny': this.tone(180, 140, 0.18, 'square', 0.08); break
    }
  }

  dispose() {
    this.drone?.o.stop()
    void this.ctx?.close()
    this.ctx = null
  }
}
