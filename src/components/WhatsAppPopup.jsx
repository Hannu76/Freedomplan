import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/C0LgZSttstQK14lgFHSdWA';
const WEBSITE_URL = 'https://www.freedomplan.guru/';

export default function WhatsAppPopup({ onTriggerWhatsApp }) {
  // mode: 'whatsapp' | 'website' | 'none'
  const [activeMode, setActiveMode] = useState('none');
  const [showBubble, setShowBubble] = useState(true);
  const [isHeroInView, setIsHeroInView] = useState(true); // Default true so hero is quiet on load
  const [cycleKey, setCycleKey] = useState(0);
  const [copiedToast, setCopiedToast] = useState(false);
  const timerRef = useRef(null);

  // 1. Automatically detect hero section visibility (never show while on Hero section)
  useEffect(() => {
    const handleScrollAndHeroCheck = () => {
      const heroEl = document.getElementById('hero-section');
      if (heroEl) {
        const rect = heroEl.getBoundingClientRect();
        // If bottom of hero is visible in the upper viewport (within 180px of top), hero is active
        const inView = rect.bottom > 180 && rect.top <= 100;
        setIsHeroInView(inView);
      } else {
        setIsHeroInView(false);
      }
    };

    // Run immediately on mount
    handleScrollAndHeroCheck();

    window.addEventListener('scroll', handleScrollAndHeroCheck, { passive: true });
    window.addEventListener('resize', handleScrollAndHeroCheck, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollAndHeroCheck);
      window.removeEventListener('resize', handleScrollAndHeroCheck);
    };
  }, []);

  // 2. Alternating timer cycle: ONLY starts after user has scrolled past the hero section
  useEffect(() => {
    if (isHeroInView) {
      setActiveMode('none');
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const startCycle = () => {
      // Step 1: WhatsApp visible for 5s
      setActiveMode('whatsapp');

      timerRef.current = setTimeout(() => {
        // Step 2: 2s empty gap
        setActiveMode('none');

        timerRef.current = setTimeout(() => {
          // Step 3: Share popup visible for 5s
          setActiveMode('website');

          timerRef.current = setTimeout(() => {
            // Step 4: 2s empty gap
            setActiveMode('none');

            timerRef.current = setTimeout(() => {
              // Step 5: Restart cycle
              startCycle();
            }, 2000);
          }, 5000);
        }, 2000);
      }, 5000);
    };

    // Start cycle 1.5s after leaving hero section
    timerRef.current = setTimeout(startCycle, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cycleKey, isHeroInView]);

  // 3. On WhatsApp Click: immediately disappear and trigger post-click rotation
  const handleWhatsAppClick = () => {
    setActiveMode('none');
    setShowBubble(false);
    window.open(WHATSAPP_COMMUNITY_URL, '_blank', 'noopener,noreferrer');

    // Stop current timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // After 5 seconds, show Share button
    timerRef.current = setTimeout(() => {
      setActiveMode('website');

      timerRef.current = setTimeout(() => {
        setActiveMode('none');

        timerRef.current = setTimeout(() => {
          setCycleKey((k) => k + 1); // Resume normal rotation
        }, 2000);
      }, 5000);
    }, 5000);
  };

  // 4. On Share Button Click: Copy link to clipboard and open https://www.freedomplan.guru/
  const handleShareClick = (e) => {
    if (e) e.preventDefault();

    // 1. Reliable clipboard copy with fallback
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(WEBSITE_URL);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = WEBSITE_URL;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch (_) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }

    // 2. Open FreedomPlan share link in a new tab
    window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer');
  };

  const handleDismissBubble = (e) => {
    e.stopPropagation();
    setShowBubble(false);
  };

  return (
    <div className="fixed bottom-5 left-5 sm:bottom-6 sm:left-6 z-[90] pointer-events-none select-none max-w-[280px]">
      <AnimatePresence mode="wait">
        {/* State 1: WhatsApp Popup */}
        {activeMode === 'whatsapp' && (
          <motion.div
            key="whatsapp-popup"
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15, transition: { duration: 0.3 } }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="whatsapp-popup flex flex-col items-start gap-2 pointer-events-auto"
          >
            {/* Minimal Chat / Message Bubble */}
            <AnimatePresence>
              {showBubble && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.9, transition: { duration: 0.2 } }}
                  onClick={handleWhatsAppClick}
                  className="relative cursor-pointer bg-white/95 dark:bg-[#121826]/95 backdrop-blur-md border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl rounded-bl-sm px-3 py-2 shadow-lg shadow-black/10 text-slate-800 dark:text-slate-100 max-w-[220px] sm:max-w-[240px] hover:border-emerald-400 hover:shadow-emerald-500/10 transition-all duration-200 group flex items-start justify-between gap-1.5"
                >
                  <p className="text-[11.5px] sm:text-[12px] font-bold leading-snug tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pr-2">
                    Hi 👋 Join the community & share your notes.
                  </p>
                  <button
                    type="button"
                    onClick={handleDismissBubble}
                    aria-label="Close message"
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shrink-0 -mt-0.5"
                  >
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WhatsApp Circular Icon Button */}
            <div
              onClick={handleWhatsAppClick}
              className="relative cursor-pointer group flex items-center justify-center shrink-0 w-12 h-12 sm:w-14 sm:h-14"
              title="Join WhatsApp Community"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleWhatsAppClick(); }}
            >
              {/* Ambient Green Pulse Glow */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-md group-hover:bg-emerald-500/50 group-hover:blur-lg transition-all duration-300 pointer-events-none animate-pulse" />

              {/* Strict Fixed-Size Circular Container */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 min-w-[48px] min-h-[48px] max-w-[56px] max-h-[56px] rounded-full bg-gradient-to-tr from-emerald-600 via-[#25D366] to-teal-400 p-[2px] shadow-xl shadow-emerald-600/30 group-hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#0c121e] flex items-center justify-center p-2 sm:p-2.5">
                  <img
                    src="/images/whatsapp-3d.png"
                    alt="WhatsApp"
                    className="w-7 h-7 sm:w-8 sm:h-8 max-w-[32px] max-h-[32px] object-contain drop-shadow-sm transition-transform duration-200 group-hover:rotate-6"
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg';
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* State 2: FreedomPlan Circular Share Button with 3D Logo */}
        {activeMode === 'website' && (
          <motion.div
            key="website-popup"
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15, transition: { duration: 0.3 } }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="website-popup flex flex-col items-start gap-2 pointer-events-auto relative"
          >
            {/* Copied Toast Indicator */}
            {copiedToast && (
              <div className="absolute -top-10 left-0 bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-red-400/50 animate-bounce whitespace-nowrap z-30">
                ✓ Link Copied!
              </div>
            )}

            {/* Message Bubble: Open Share the FreedomPlan */}
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9, transition: { duration: 0.2 } }}
              onClick={handleShareClick}
              className="relative cursor-pointer bg-white/95 dark:bg-[#121826]/95 backdrop-blur-md border border-rose-500/25 dark:border-rose-500/35 rounded-2xl rounded-bl-sm px-3.5 py-2 shadow-lg shadow-black/10 text-slate-800 dark:text-slate-100 hover:border-rose-400 hover:shadow-rose-500/10 transition-all duration-200 group flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#E11438] animate-pulse shrink-0" />
              <p className="text-[11.5px] sm:text-[12px] font-bold leading-snug tracking-tight text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors whitespace-nowrap">
                Open Share the FreedomPlan
              </p>
            </motion.div>

            {/* Circular Share Button with 3D Logo */}
            <div
              onClick={handleShareClick}
              className="relative cursor-pointer group flex items-center justify-center shrink-0 w-12 h-12 sm:w-14 sm:h-14"
              title="Open Share the FreedomPlan"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleShareClick(e); }}
            >
              {/* Ambient Crimson/Red Pulse Glow */}
              <div className="absolute inset-0 rounded-full bg-red-500/35 blur-md group-hover:bg-red-500/55 group-hover:blur-lg transition-all duration-300 pointer-events-none animate-pulse" />

              {/* Strict Fixed-Size Circular Container matching WhatsApp button */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 min-w-[48px] min-h-[48px] max-w-[56px] max-h-[56px] rounded-full bg-gradient-to-tr from-red-600 via-[#E11438] to-rose-400 p-[2px] shadow-xl shadow-red-600/30 group-hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-full bg-[#D50419] flex items-center justify-center overflow-hidden p-0.5 sm:p-1">
                  <img
                    src="/images/freedom-share-icon.jpg"
                    alt="Open Share the FreedomPlan"
                    className="w-full h-full object-cover rounded-full drop-shadow-md transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>

              {/* Floating Speech Bubble Tooltip on Hover */}
              <div
                className="absolute opacity-0 group-hover:opacity-100 group-hover:-translate-y-[135%] -translate-y-[220%] duration-300 group-hover:delay-150 shadow-xl pointer-events-none z-20 whitespace-nowrap left-0"
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md border border-rose-200 dark:border-rose-800/60 backdrop-blur-md bg-white/95 dark:bg-[#121826]/95 text-slate-800 dark:text-slate-100"
                >
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    height="14px"
                    width="14px"
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-[#E11438] shrink-0"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span className="font-extrabold text-xs text-slate-800 dark:text-white tracking-tight">Open Share the FreedomPlan</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
