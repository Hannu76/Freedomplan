import clickWav from '../sounds/click.wav'
import bookWav from '../sounds/book.wav'

let clickAudio = null
let bookAudio = null

function getAudioInstance(src) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

/**
 * Checks whether sound is enabled in application settings
 */
export function isSoundEnabled() {
  try {
    const val = localStorage.getItem('freedomPlan.soundEnabled')
    if (val === null) return true
    return JSON.parse(val)
  } catch (e) {
    return true
  }
}

/**
 * Play Sound File 1 (click.wav)
 * Used for Overview number editing & Dashboard Download PDF
 */
export function playClickSound() {
  if (!isSoundEnabled()) return
  try {
    if (!clickAudio) {
      clickAudio = getAudioInstance(clickWav)
    }
    const playInstance = clickAudio.cloneNode()
    playInstance.volume = 0.6
    playInstance.play().catch(() => {})
  } catch (err) {
    // Ignore browser autoplay policy restrictions silently
  }
}

let lastClickTime = 0

/**
 * Throttled Click Sound (for continuous typing in numeric inputs)
 * Avoids repeated sound spam while typing continuously
 */
export function playThrottledClickSound(throttleMs = 250) {
  const now = Date.now()
  if (now - lastClickTime >= throttleMs) {
    lastClickTime = now
    playClickSound()
  }
}

/**
 * Play Sound File 2 (book.wav)
 * Used for Form Submissions (Basic Form, Registration Form, Existing Customer Form)
 */
export function playBookSound() {
  if (!isSoundEnabled()) return
  try {
    if (!bookAudio) {
      bookAudio = getAudioInstance(bookWav)
    }
    const playInstance = bookAudio.cloneNode()
    playInstance.volume = 0.7
    playInstance.play().catch(() => {})
  } catch (err) {
    // Ignore browser autoplay policy restrictions silently
  }
}
