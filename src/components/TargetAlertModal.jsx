import React, { useEffect } from 'react'
import { playTargetSound } from '../utils/sound'

export default function TargetAlertModal({ isOpen, onClose, data }) {
  useEffect(() => {
    if (isOpen) {
      // Synchronize popup sound start with the entrance animation
      playTargetSound()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !data) return null

  const { monthlyTarget = 0, currentProgress = 0, remainingDifference = 0, currencySymbol = '£' } = data

  const progressPct = monthlyTarget > 0 ? Math.min(100, Math.max(0, (currentProgress / monthlyTarget) * 100)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F14]/75 backdrop-blur-md transition-opacity duration-300">
      <div
        className="relative w-full max-w-md rounded-[28px] border border-[#334155]/60 bg-[#161C2D] p-7 sm:p-8 shadow-2xl overflow-hidden animate-slide-up transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="target-modal-title"
      >
        {/* Glow backdrop accents */}
        <div className="absolute -top-20 -right-20 h-44 w-44 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-[#B6F36A]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header Icon & Title */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-2xl shadow-inner">
              ⚠️
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                Target Alert
              </span>
              <h3 id="target-modal-title" className="font-display text-xl font-black text-white tracking-tight">
                Monthly Target Not Reached
              </h3>
            </div>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed mb-6">
            Your current savings progress is below your calculated monthly target. Review your remaining difference below to keep your loan payoff plan on track.
          </p>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Monthly Target */}
            <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Target</span>
              <span className="text-base sm:text-lg font-black text-white figure mt-1">
                {currencySymbol}{Math.round(monthlyTarget).toLocaleString()}
              </span>
            </div>

            {/* Current Progress */}
            <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Saved</span>
              <span className="text-base sm:text-lg font-black text-[#B6F36A] figure mt-1">
                {currencySymbol}{Math.round(currentProgress).toLocaleString()}
              </span>
            </div>

            {/* Remaining Difference */}
            <div className="rounded-2xl bg-rose-500/15 border border-rose-500/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Deficit</span>
              <span className="text-base sm:text-lg font-black text-rose-400 figure mt-1">
                {currencySymbol}{Math.round(remainingDifference).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 space-y-1.5">
            <div className="flex justify-between text-xs font-bold figure text-neutral-300">
              <span>Overall Progress</span>
              <span className={progressPct >= 100 ? 'text-[#B6F36A]' : 'text-rose-400'}>
                {progressPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-neutral-900 p-0.5 border border-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  progressPct >= 100 ? 'bg-[#B6F36A]' : 'bg-rose-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800/80">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#B6F36A] text-[#161C2D] font-extrabold text-xs uppercase tracking-wider hover:bg-[#a3e652] transition-colors shadow-lg shadow-[#B6F36A]/20 cursor-pointer"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
