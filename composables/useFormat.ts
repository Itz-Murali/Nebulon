export const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
export const statPct = (v: number, a: number, b: number) => Math.round(Math.min(1, Math.max(0, (v - a) / (b - a))) * 100)
