import React from 'react';
import { useStore } from '../context/StoreContext';
import { BANKNOTE_URL } from './ui';
import IMAGES from '../utils/images';
import { isLocalDevelopment } from '../utils/env';

// BlurGate: renders content blurred with unlock overlay until condition is met
// In Local Development: Always passes children through unblurred for seamless testing
// In Production: Renders blur overlay if isLocked is true
export default function BlurGate({ children, isLocked, title = "Available after login", message = "Premium features will be introduced in a future update.", onUnlock }) {
  if (!isLocked || isLocalDevelopment) {
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
            className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg overflow-hidden bg-[#F9FBFD] border border-[#EEF2F7]"
          >
            <img
              src={IMAGES.lock || "/images/lock-3d.png"}
              alt="Lock"
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div>
            <p className="font-extrabold text-[#161C2D] text-lg tracking-tight">{title}</p>
            <p className="text-sm text-[#667085] mt-1 leading-relaxed">
              {message}
            </p>
          </div>
          {onUnlock && (
            <div className="relative group w-full mt-2">
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-[#00439F] blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
              <button
                onClick={onUnlock}
                className="relative z-10 w-full px-4 py-3 rounded-full font-extrabold uppercase tracking-wide text-[13px] text-white transition-all bg-[#00439F] hover:opacity-90 shadow-xl border border-blue-900/50 text-center flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap active:scale-95"
                style={{
                    backgroundImage: BANKNOTE_URL,
                    backgroundPosition: 'center',
                    backgroundSize: 'auto 150%',
                }}
              >
                <span>Unlock Access</span>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
