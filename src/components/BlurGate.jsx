import React from 'react';
import { useStore } from '../context/StoreContext';

// BlurGate: renders content blurred with unlock overlay until condition is met
// For internal elements (where the page is already unlocked, but specific features are locked for Premium),
// it can check `isPremiumUnlocked`. For the general dashboard, it checks `isLoggedIn`.
export default function BlurGate({ children, isLocked, title = "🔒 Available after login", message = "Premium features will be introduced in a future update.", onUnlock }) {
  if (!isLocked) {
    return children;
  }
  return (
    <div className="relative overflow-hidden w-full max-w-full">
      <div className="pointer-events-none select-none" style={{ filter: 'blur(7px)', userSelect: 'none' }}>
        {children}
      </div>
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-8 sm:pt-12 px-4">
        <div className="bg-white/80 backdrop-blur-md border border-[#EEF2F7] rounded-[28px] shadow-2xl px-8 py-10 flex flex-col items-center gap-5 max-w-sm w-full text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
            style={{ background: '#F9FBFD', border: '1px solid #EEF2F7' }}
          >
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <p className="font-extrabold text-[#161C2D] text-lg tracking-tight">{title}</p>
            <p className="text-sm text-[#667085] mt-1 leading-relaxed">
              {message}
            </p>
          </div>
          {onUnlock && (
            <button
              onClick={onUnlock}
              className="w-full px-4 py-3 rounded-xl text-[13px] font-extrabold tracking-wide uppercase text-white transition-all duration-200 active:scale-95 text-center"
              style={{ background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)', boxShadow: '0px 2px 4px rgba(0,13,56,0.28), inset 0px 4px 5px #0070f0, inset 0px -4px 5px #002cbb' }}
            >
              Unlock Access
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
