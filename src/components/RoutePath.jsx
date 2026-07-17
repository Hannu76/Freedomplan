import React from 'react'

export default function RoutePath({ percent, label, onTrack, isDark = false }) {
  const clamped = Math.min(100, Math.max(0, percent))
  const milestones = [25, 50, 75, 100]

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-baseline mb-3">
          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-[#667085]'}`}>
            {label}
          </span>
          <span
            className={`figure text-xs font-bold px-3 py-1 rounded-full border ${
              isDark
                ? clamped >= 100
                  ? 'bg-lime-400 text-neutral-950 border-transparent font-extrabold shadow-[0_0_12px_rgba(163,230,53,0.5)]'
                  : onTrack
                  ? 'bg-lime-400/15 text-lime-400 border-lime-400/40 font-bold'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold'
                : clamped >= 100
                ? 'bg-[#B6F36A] text-[#161C2D] border-transparent font-extrabold'
                : onTrack
                ? 'bg-[#B6F36A]/20 text-[#161C2D] border-[#B6F36A]/40 font-bold'
                : 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold'
            }`}
          >
            {clamped >= 100 ? '100% COMPLETE' : `${clamped.toFixed(0)}% Complete`}
          </span>
        </div>
      )}

      <div className="relative flex items-center h-12 pt-3">
        {/* London endpoint */}
        <div className="flex flex-col items-center shrink-0 -mt-2">
          <span
            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
              isDark
                ? 'text-neutral-200 bg-neutral-900 border-neutral-800'
                : 'text-[#161C2D] bg-[#F9FBFD] border-[#EEF2F7]'
            }`}
            title="London, UK"
          >
            UK
          </span>
          <span className={`text-[10px] uppercase font-bold tracking-tighter mt-1 ${isDark ? 'text-neutral-500' : 'text-[#667085]'}`}>
            London
          </span>
        </div>

        {/* Dashed route line with filled progress overlay */}
        <div className="relative flex-1 mx-3 h-2 flex items-center">
          <div className={`w-full route-line ${isDark ? 'text-neutral-800' : 'text-[#EEF2F7]'}`} />
          
          {/* Active progress bar */}
          <div
            className={`route-line absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
              isDark
                ? onTrack
                  ? 'text-lime-400'
                  : 'text-rose-400'
                : onTrack
                ? 'text-[#B6F36A]'
                : 'text-rose-500'
            }`}
            style={{ width: `${clamped}%` }}
          />

          {/* Milestone checkpoints along the route */}
          {milestones.map((m) => {
            const reached = clamped >= m
            return (
              <div
                key={m}
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500"
                style={{ left: `${m}%` }}
              >
                <div
                  className={`h-3.5 w-3.5 rounded-full border-2 transition-transform duration-300 ${
                    reached
                      ? isDark
                        ? 'bg-lime-400 border-neutral-950 scale-125 shadow-[0_0_8px_rgba(163,230,53,0.6)]'
                        : 'bg-[#B6F36A] border-white scale-125 shadow-sm'
                      : isDark
                      ? 'bg-neutral-900 border-neutral-700'
                      : 'bg-[#F9FBFD] border-[#D0D5DD]'
                  }`}
                />
                <span
                  className={`text-[10px] figure mt-2 font-bold ${
                    reached
                      ? isDark
                        ? 'text-neutral-200'
                        : 'text-[#161C2D]'
                      : isDark
                      ? 'text-neutral-600'
                      : 'text-[#667085]/60'
                  }`}
                >
                  {m}%
                </span>
              </div>
            )
          })}

          {/* Progress marker */}
          <div
            className="absolute -top-2 transition-all duration-700 ease-out cursor-pointer"
            style={{ left: `calc(${clamped}% - 7px)` }}
            aria-hidden="true"
            title={`Trajectory: ${clamped.toFixed(0)}% toward target`}
          >
            <div
              className={`h-3.5 w-3.5 rounded-full border-2 shadow-sm ${
                isDark
                  ? 'bg-lime-400 border-neutral-950 shadow-[0_0_10px_rgba(163,230,53,0.8)] animate-pulse'
                  : 'bg-[#161C2D] border-white'
              }`}
            />
          </div>
        </div>

        {/* India endpoint */}
        <div className="flex flex-col items-center shrink-0 -mt-2">
          <span
            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
              isDark
                ? 'text-lime-400 bg-lime-400/10 border-lime-400/30'
                : 'text-[#161C2D] bg-[#B6F36A]/20 border-[#B6F36A]/40'
            }`}
            title="India"
          >
            IN
          </span>
          <span className={`text-[10px] uppercase font-bold tracking-tighter mt-1 ${isDark ? 'text-neutral-300' : 'text-[#161C2D]'}`}>
            India
          </span>
        </div>
      </div>
    </div>
  )
}
