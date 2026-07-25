import clickWav from '../sounds/click.wav'
import bookWav from '../sounds/book.wav'
import doneMp3 from '../sounds/done.mp3'
import targetMp3 from '../sounds/target.mp3'
import loadingMp3 from '../sounds/loading.mp3'

let clickAudio = null
let bookAudio = null
let doneAudio = null
let targetAudio = null
let loadingAudio = null

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
 * Play Loading / Refresh Sound (loading.mp3)
 * Plays during loading animation
 */
export function playLoadingSound() {
  if (!isSoundEnabled()) return
  try {
    if (!loadingAudio) {
      loadingAudio = getAudioInstance(loadingMp3)
    }
    loadingAudio.currentTime = 0
    loadingAudio.volume = 0.7
    loadingAudio.play().catch(() => {})
  } catch (err) {
    // Ignore browser autoplay policy restrictions
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
 * Played ONCE after calculations and number updates complete successfully
 */
export function playDoneSound() {
  if (!isSoundEnabled()) return
  try {
    if (!doneAudio) {
      doneAudio = getAudioInstance(doneMp3)
    }
    const playInstance = doneAudio.cloneNode()
    playInstance.volume = 0.75
    playInstance.play().catch(() => {})
  } catch (err) {
    // Ignore browser autoplay policy restrictions
  }
}

/**
 * Play Target Alert Sound (target.mp3)
 * Played when monthly target validation fails and animated popup is shown
 */
export function playTargetSound() {
  if (!isSoundEnabled()) return
  try {
    if (!targetAudio) {
      targetAudio = getAudioInstance(targetMp3)
    }
    const playInstance = targetAudio.cloneNode()
    playInstance.volume = 0.8
    playInstance.play().catch(() => {})
  } catch (err) {
    // Ignore browser autoplay policy restrictions
  }
}

/**
 * Play Sound File 1 (click.wav)
 * Retained for button click events
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
 * Used for Form Submissions
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

