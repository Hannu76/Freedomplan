import clickWav from '../sounds/click.wav'
import bookWav from '../sounds/book.wav'
import doneMp3 from '../sounds/done.mp3'
import targetMp3 from '../sounds/target.mp3'
import loadingMp3 from '../sounds/loading.mp3'

let loadingAudio = null

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
 * Play Loading / Refresh Sound (loading.mp3)
 * Plays during loading animation
 */
export function playLoadingSound() {
  if (!isSoundEnabled()) return
  try {
    if (!loadingAudio) {
      loadingAudio = new Audio(loadingMp3)
      loadingAudio.preload = 'auto'
      loadingAudio.loop = true
    }
    loadingAudio.currentTime = 0
    loadingAudio.volume = 0.75
    const promise = loadingAudio.play()
    if (promise !== undefined) {
      promise.catch((err) => {
        console.warn('Loading sound autoplay notice:', err)
      })
    }
  } catch (err) {
    // Ignore browser autoplay restrictions
  }
}

/**
 * Stop Loading / Refresh Sound (loading.mp3)
 * Immediately stops audio when loading animation finishes or screen unmounts
 */
export function stopLoadingSound() {
  try {
    if (loadingAudio) {
      loadingAudio.pause()
      loadingAudio.currentTime = 0
    }
  } catch (err) {
    // Ignore errors
  }
}

/**
 * Play Completion Sound (done.mp3)
 * Played when calculations finish and target is met
 */
export function playDoneSound() {
  playAudioFile(doneMp3, 0.75)
}

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

// Unlock audio context on first user interaction for smooth browser autoplay
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      if (loadingAudio && loadingAudio.paused) {
        loadingAudio.play().catch(() => {})
      }
    } catch (e) {}
    window.removeEventListener('pointerdown', unlockAudio)
    window.removeEventListener('touchstart', unlockAudio)
    window.removeEventListener('keydown', unlockAudio)
  }
  window.addEventListener('pointerdown', unlockAudio)
  window.addEventListener('touchstart', unlockAudio)
  window.addEventListener('keydown', unlockAudio)
}


