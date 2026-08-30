import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/C0LgZSttstQK14lgFHSdWA';
const WEBSITE_URL = 'https://freedomplan.guru';

export default function WhatsAppPopup({ onTriggerWhatsApp }) {
  // mode: 'whatsapp' | 'website' | 'none'
  const [activeMode, setActiveMode] = useState('whatsapp');
  const [showBubble, setShowBubble] = useState(true);
  const [isHeroInView, setIsHeroInView] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const [copiedToast, setCopiedToast] = useState(false);
  const timerRef = useRef(null);

  // 1. Alternating timer cycle: 5s WhatsApp -> 2s empty -> 5s Share button -> 2s empty -> repeat
  useEffect(() => {
    if (isHeroInView) {
      setActiveMode('none');
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

    startCycle();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cycleKey, isHeroInView]);

  // 2. Automatically disappear when the user reaches or views the Hero section
  useEffect(() => {
    const handleScrollAndHeroCheck = () => {
      const heroEl = document.getElementById('hero-section') || document.querySelector('.hero-ribbon');
      if (heroEl) {
        const rect = heroEl.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 80;
        setIsHeroInView(inView);
      }
    };

    window.addEventListener('scroll', handleScrollAndHeroCheck, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollAndHeroCheck);
  }, []);

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

  // 4. On Share Button Click: trigger Native Share or Copy link
  const handleShareClick = async (e) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'FreedomPlan - Financial Freedom Tracker',
          text: 'Manage loans, track savings, and navigate currency shifts with professional precision.',
          url: WEBSITE_URL
        });
      } catch (err) {
        // User dismissed share dialog
      }
    } else {
      try {
        await navigator.clipboard.writeText(WEBSITE_URL);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      } catch (err) {
        window.open(WEBSITE_URL, '_blank');
      }
    }
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

        {/* State 2: Platinum Glowing Share Button */}
        {activeMode === 'website' && (
          <motion.div
            key="website-popup"
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 15, transition: { duration: 0.3 } }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="website-popup pointer-events-auto relative"
          >
            {/* Copied Toast Indicator */}
            {copiedToast && (
              <div className="absolute -top-10 left-0 bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-sky-400/50 animate-bounce">
                ✓ Link Copied!
              </div>
            )}

            <div
              className="group relative flex justify-center items-center text-slate-800 dark:text-slate-100 text-sm font-bold cursor-pointer select-none"
              onClick={handleShareClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleShareClick(e); }}
            >
              {/* Floating Speech Bubble Tooltip in Platinum Theme */}
              <div
                className="absolute opacity-0 group-hover:opacity-100 group-hover:-translate-y-[150%] -translate-y-[300%] duration-500 group-hover:delay-500 skew-y-[20deg] group-hover:skew-y-0 shadow-xl pointer-events-none z-20"
              >
                <div
                  className="flex items-center gap-1.5 p-2 rounded-md shadow-md border border-[#a0d8ff] dark:border-sky-400/50 backdrop-blur-md"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(208, 231, 255, 0.95) 50%, rgba(160, 216, 255, 0.98) 100%)',
                    boxShadow: '0 0 16px rgba(160, 216, 255, 0.6), inset 0 0 8px rgba(255, 255, 255, 0.6)'
                  }}
                >
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    height="18px"
                    width="18px"
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-[#0284c7] shrink-0"
                  >
                    <circle strokeLinejoin="round" r="9" cy="12" cx="12"></circle>
                    <path
                      strokeLinejoin="round"
                      d="M12 3C12 3 8.5 6 8.5 12C8.5 18 12 21 12 21"
                    ></path>
                    <path
                      strokeLinejoin="round"
                      d="M12 3C12 3 15.5 6 15.5 12C15.5 18 12 21 12 21"
                    ></path>
                    <path strokeLinejoin="round" d="M3 12H21"></path>
                    <path strokeLinejoin="round" d="M19.5 7.5H4.5"></path>
                    <g filter="url(#filter0_d_15_556_plat)">
                      <path strokeLinejoin="round" d="M19.5 16.5H4.5"></path>
                    </g>
                    <defs>
                      <filter
                        colorInterpolationFilters="sRGB"
                        filterUnits="userSpaceOnUse"
                        height="3"
                        width="17"
                        y="16"
                        x="3.5"
                        id="filter0_d_15_556_plat"
                      >
                        <feFlood result="BackgroundImageFix" floodOpacity="0"></feFlood>
                        <feColorMatrix
                          result="hardAlpha"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          type="matrix"
                          in="SourceAlpha"
                        ></feColorMatrix>
                        <feOffset dy="1"></feOffset>
                        <feGaussianBlur stdDeviation="0.5"></feGaussianBlur>
                        <feColorMatrix
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
                          type="matrix"
                        ></feColorMatrix>
                        <feBlend
                          result="effect1_dropShadow_15_556_plat"
                          in2="BackgroundImageFix"
                          mode="normal"
                        ></feBlend>
                        <feBlend
                          result="shape"
                          in2="effect1_dropShadow_15_556_plat"
                          in="SourceGraphic"
                          mode="normal"
                        ></feBlend>
                      </filter>
                    </defs>
                  </svg>
                  <span className="font-extrabold text-xs text-[#0369a1] tracking-tight whitespace-nowrap">freedomplan.guru</span>
                </div>
                <div
                  className="shadow-md bg-[#d0e7ff] absolute bottom-0 translate-y-1/2 left-1/2 translate-x-full rotate-45 p-1 border-b border-r border-[#a0d8ff]"
                ></div>
                <div
                  className="rounded-md bg-white group-hover:opacity-0 group-hover:scale-[115%] group-hover:delay-700 duration-500 w-full h-full absolute top-0 left-0"
                >
                  <div
                    className="border-b border-r border-white bg-white absolute bottom-0 translate-y-1/2 left-1/2 translate-x-full rotate-45 p-1"
                  ></div>
                </div>
              </div>

              {/* Ambient Platinum Cyan/Blue Pulse Glow Ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#a0d8ff]/50 via-sky-400/40 to-[#d0e7ff]/60 blur-md group-hover:blur-lg group-hover:opacity-100 transition-all duration-300 pointer-events-none animate-pulse" />

              {/* Main Platinum Pill Button */}
              <div
                className="relative shadow-xl flex items-center group-hover:gap-2 p-3 rounded-full cursor-pointer duration-300 active:scale-95 border border-[#a0d8ff] dark:border-sky-300/80"
                style={{
                  background: 'linear-gradient(135deg, #d0e7ff 0%, #a0d8ff 100%)',
                  boxShadow: '0 0 20px rgba(160, 216, 255, 0.7), inset 0 0 10px rgba(255, 255, 255, 0.7), 0 6px 20px rgba(0, 0, 0, 0.15)'
                }}
              >
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  height="20px"
                  width="20px"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-[#0369a1] drop-shadow-sm shrink-0"
                >
                  <path
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    d="M15.4306 7.70172C7.55045 7.99826 3.43929 15.232 2.17021 19.3956C2.07701 19.7014 2.31139 20 2.63107 20C2.82491 20 3.0008 19.8828 3.08334 19.7074C6.04179 13.4211 12.7066 12.3152 15.514 12.5639C15.7583 12.5856 15.9333 12.7956 15.9333 13.0409V15.1247C15.9333 15.5667 16.4648 15.7913 16.7818 15.4833L20.6976 11.6784C20.8723 11.5087 20.8993 11.2378 20.7615 11.037L16.8456 5.32965C16.5677 4.92457 15.9333 5.12126 15.9333 5.61253V7.19231C15.9333 7.46845 15.7065 7.69133 15.4306 7.70172Z"
                  ></path>
                </svg>
                <span className="text-[0px] group-hover:text-sm text-[#0369a1] duration-300 font-black whitespace-nowrap overflow-hidden tracking-wide">
                  Share
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
