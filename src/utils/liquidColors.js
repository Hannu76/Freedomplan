/**
 * Exact Anchor Color Specification Engine:
 * 
 * 🔴 0%–50% (Red range):
 *    Primary anchor: #FF0000 [255, 0, 0]
 *    Deep red -> #FF0000 -> richer red variations
 * 
 * 🟡 50%–75% (Yellow range):
 *    Primary anchor: #FFFF00 [255, 255, 0]
 *    Red/yellow transition -> #FFFF00 -> rich yellow variations (clearly yellow)
 * 
 * 🟢 75%–100% (Green range):
 *    Primary anchor: #4DFC5A [77, 252, 90]
 *    Yellow/green transition -> #4DFC5A -> deeper/richer green variations
 */
export const COLOR_STOPS = [
  [0,   [170, 0, 0]],      // 0%: Deep rich red
  [25,  [225, 0, 0]],      // 25%: Strong rich red
  [40,  [255, 0, 0]],      // 40%: Primary Anchor #FF0000 (Pure Red)
  [50,  [255, 120, 0]],    // 50%: Red -> Yellow smooth blend
  [60,  [255, 220, 0]],    // 60%: Bright Yellow
  [70,  [255, 255, 0]],    // 70%: Primary Anchor #FFFF00 (Pure Yellow)
  [75,  [190, 254, 30]],   // 75%: Yellow -> Green transition bridge
  [85,  [130, 253, 60]],   // 85%: Lime-Green transition
  [90,  [77, 252, 90]],    // 90%: Primary Anchor #4DFC5A (Strong Green)
  [95,  [70, 245, 80]],    // 95%: Vibrant #4DFC5A Green
  [100, [77, 252, 90]],    // 100%: Pure #4DFC5A Full Completion
]

export function getProgressRGB(pct) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0))
  if (clamped <= COLOR_STOPS[0][0]) return COLOR_STOPS[0][1]
  if (clamped >= COLOR_STOPS[COLOR_STOPS.length - 1][0]) {
    return COLOR_STOPS[COLOR_STOPS.length - 1][1]
  }

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const [t0, c0] = COLOR_STOPS[i]
    const [t1, c1] = COLOR_STOPS[i + 1]
    if (clamped >= t0 && clamped <= t1) {
      const factor = (clamped - t0) / (t1 - t0)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * factor),
        Math.round(c0[1] + (c1[1] - c0[1]) * factor),
        Math.round(c0[2] + (c1[2] - c0[2]) * factor),
      ]
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1][1]
}

export function getProgressGradientCSS(pct) {
  const [r, g, b] = getProgressRGB(pct)
  return `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0.85), rgb(${r}, ${g}, ${b}))`
}
