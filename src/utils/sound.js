import clickWav from '../sounds/click.wav'
import bookWav from '../sounds/book.wav'
import targetMp3 from '../sounds/target.mp3'

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
 * Helper to play audio files reliably without cloneNode issues
 */
function playAudioFile(src, volume = 0.7) {
  if (!isSoundEnabled()) return
  try {
    const audio = new Audio(src)
    audio.volume = volume
    const promise = audio.play()
    if (promise !== undefined) {
      promise.catch((err) => {
        console.warn('Audio play notice:', err)
      })
    }
  } catch (err) {
    // Ignore browser autoplay restrictions
  }
}

/**
 * Removed loading and done sound functions (no-op)
 */
export function playLoadingSound() {}
export function stopLoadingSound() {}
export function playDoneSound() {}

/**
 * Play Target Alert Sound (target.mp3)
 * Played when monthly target is not reached
 */
export function playTargetSound() {
  playAudioFile(targetMp3, 0.8)
}

/**
 * Play Sound File 1 (click.wav)
 */
export function playClickSound() {
  playAudioFile(clickWav, 0.6)
}

let lastClickTime = 0

/**
 * Throttled Click Sound
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
 */
export function playBookSound() {
  playAudioFile(bookWav, 0.7)
}



