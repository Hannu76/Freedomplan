import React from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BANKNOTE_URL } from './ui';
import { isLocalDevelopment } from '../utils/env';

/**
 * BlurGate: renders protected content with a clean, high-contrast security badge.
 * Replaces cartoon locks/emojis with an executive, modern access shield.
 */
export default function BlurGate({
  children,
  isLocked,
  title = "Exclusive Premium Capability",
  message = "Unlock Freedom Premium to access advanced amortization simulations, multi-currency trackers, and automated savings pipelines.",
  onUnlock
}) {
  if (!isLocked || isLocalDevelopment) {
    return children;
  }

  return (
    <div className="relative overflow-hidden w-full max-w-full">
      <div className="pointer-events-none select-none" style={{ filter: 'blur(8px)', userSelect: 'none' }}>
        {children}
      </div>
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-10 sm:pt-16 px-4">
        <div className="bg-white/95 dark:bg-[#0E1526]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-[24px] shadow-[0_12px_40px_rgba(0,28,68,0.12)] px-8 py-9 flex flex-col items-center gap-4 max-w-md w-full text-center">
          {/* Sleek Minimal Access Badge (No emoji / No 3D locker) */}
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#001C44] via-blue-900 to-indigo-800 text-white flex items-center justify-center shadow-lg border border-blue-400/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block mb-1">
              Freedom Premium Access Required
            </span>
            <p className="font-extrabold text-[#161C2D] dark:text-white text-lg tracking-tight">
              {title}
            </p>
            <p className="text-xs text-[#667085] dark:text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
              {message}
            </p>
          </div>

          {onUnlock && (
            <div className="relative group w-full mt-2">
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-[#00439F] blur-md rounded-full opacity-70 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
              <button
                onClick={onUnlock}
                className="relative z-10 w-full px-5 py-3 rounded-full font-extrabold uppercase tracking-wider text-xs text-white transition-all bg-[#00439F] hover:bg-[#00347B] shadow-xl border border-blue-900/50 text-center flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap active:scale-95"
                style={{
                  backgroundImage: BANKNOTE_URL,
                  backgroundPosition: 'center',
                  backgroundSize: 'auto 150%',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Unlock Premium Access</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
