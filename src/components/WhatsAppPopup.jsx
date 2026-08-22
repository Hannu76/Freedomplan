import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/CFxYiXQfVKUAm9RJRddfwS';

export default function WhatsAppPopup({ onTriggerWhatsApp }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const isInteractedRef = useRef(false);

  // 1. Initial 10-second appearance timer
  useEffect(() => {
    const showTimer = setTimeout(() => {
      // Only show if user hasn't already clicked/dismissed it
      if (!isInteractedRef.current) {
        setIsVisible(true);
      }
    }, 10000);

    return () => clearTimeout(showTimer);
  }, []);

  // 2. Auto-hide the chat text bubble after 8 seconds of being seen
  useEffect(() => {
    if (isVisible) {
      const bubbleTimer = setTimeout(() => {
        setShowBubble(false);
      }, 8000);
      return () => clearTimeout(bubbleTimer);
    }
  }, [isVisible]);

  // 3. Automatically disappear when the user reaches or views the Hero section
  useEffect(() => {
    const handleScrollAndHeroCheck = () => {
      const heroEl = document.getElementById('hero-section') || document.querySelector('.hero-ribbon');
      if (heroEl) {
        const rect = heroEl.getBoundingClientRect();
        // If hero section is currently in viewport or user is scrolled near the top hero area
        const isHeroInView = rect.top < window.innerHeight && rect.bottom > 80;
        if (isHeroInView) {
          setIsVisible(false);
        }
      }
    };

    window.addEventListener('scroll', handleScrollAndHeroCheck, { passive: true });
    
    // Also use IntersectionObserver if hero-section exists
    let observer;
    const heroEl = document.getElementById('hero-section');
    if (heroEl && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
            setIsVisible(false);
          }
        }
      }, { threshold: [0.15, 0.5, 0.8] });
      observer.observe(heroEl);
    }

    return () => {
      window.removeEventListener('scroll', handleScrollAndHeroCheck);
      if (observer && heroEl) observer.unobserve(heroEl);
    };
  }, []);

  // 4. On Click: Disappear immediately and open WhatsApp Community Directly
  const handleClick = () => {
    isInteractedRef.current = true;
    setIsVisible(false); // Disappears immediately on click
    setShowBubble(false);
    window.open(WHATSAPP_COMMUNITY_URL, '_blank', 'noopener,noreferrer');
  };

  const handleDismissBubble = (e) => {
    e.stopPropagation();
    setShowBubble(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 15, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed bottom-5 left-5 sm:bottom-6 sm:left-6 z-[90] flex flex-col items-start gap-2 select-none pointer-events-auto max-w-[260px]"
        >
          {/* Minimal Chat / Message Bubble (Auto-fades after 8 seconds on seen) */}
          <AnimatePresence>
            {showBubble && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9, transition: { duration: 0.2 } }}
                onClick={handleClick}
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
            onClick={handleClick}
            className="relative cursor-pointer group flex items-center justify-center shrink-0 w-12 h-12 sm:w-14 sm:h-14"
            title="Join WhatsApp Community"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
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
                  onError={(e) => {
                    e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg';
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
