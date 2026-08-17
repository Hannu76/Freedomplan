import React from 'react';
import { motion } from 'framer-motion';
import UNIVERSITIES_DATA from '../../data/universities';

// Single clean normalized university logo presentation with direct verified link to official website
function UniversityLogoItem({ university }) {
  return (
    <a
      href={university.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${university.name} - Official Website`}
      className="flex items-center justify-center shrink-0 px-7 sm:px-10 py-1.5 select-none group transition-transform duration-300 hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-xl"
    >
      <img
        src={university.logo}
        alt={`${university.name} logo`}
        loading="lazy"
        className="h-12 sm:h-14 md:h-16 max-h-[64px] max-w-[180px] sm:max-w-[240px] w-auto object-contain opacity-85 group-hover:opacity-100 transition-opacity duration-300 filter dark:brightness-110"
      />
    </a>
  );
}

export default function TrustedUniversities({ onContact }) {
  // Seamless loop with duplicated list
  const marqueeTrack = [...UNIVERSITIES_DATA, ...UNIVERSITIES_DATA];

  return (
    <section
      id="trusted-universities-section"
      className="relative z-30 w-full pt-10 sm:pt-12 md:pt-14 pb-7 sm:pb-8 md:pb-10 px-4 sm:px-6 flex flex-col items-center justify-center bg-[#ffffff] dark:bg-[#0B0F19] border-t border-b border-slate-200/60 dark:border-slate-800/80 transition-colors overflow-hidden"
    >
      {/* Background Subtle Depth Ambient Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[700px] h-[250px] sm:h-[320px] rounded-full pointer-events-none -z-10 opacity-50 dark:opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* ─── CENTRAL CONTENT ─────────────────────────────────────────────── */}
      <div className="w-full max-w-3xl mx-auto text-center flex flex-col items-center">
        
        {/* 1. Eyebrow Pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm mb-3"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-200">
            Trusted by Universities
          </span>
        </motion.div>

        {/* 2. Main Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.06, ease: 'easeOut' }}
          className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-slate-900 dark:text-white max-w-2xl mb-2.5"
        >
          <span>Plans built around </span>
          <span
            className="text-transparent bg-clip-text font-black"
            style={{
              backgroundImage: 'linear-gradient(135deg, #0052CC 0%, #002B5B 50%, #D91F3A 100%)',
            }}
          >
            your university
          </span>
        </motion.h2>

        {/* 3. Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.12, ease: 'easeOut' }}
          className="text-slate-600 dark:text-slate-300 font-medium text-xs sm:text-sm md:text-base leading-relaxed max-w-xl mb-2"
        >
          Every university has different requirements. We guide you with a plan tailored to your university and your repayment journey.
        </motion.p>

        {/* 4. Premium Guidance Note */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.16, ease: 'easeOut' }}
          className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-lg mb-4"
        >
          Free guidance is available. Choose <span className="text-blue-600 dark:text-blue-400 font-bold">Premium</span> for more accurate, personalized strategies and detailed month-by-month guidance.
        </motion.p>

        {/* 5. CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.2, ease: 'easeOut' }}
          className="relative group mb-3.5"
        >
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-2.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />

          <button
            onClick={() => onContact && onContact()}
            className="relative z-10 px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-black uppercase tracking-wider text-[11px] sm:text-xs transition-all bg-[#0B0F19] text-white hover:bg-black shadow-lg border border-slate-800 text-center flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap active:scale-95 group"
          >
            <span>Talk to Us</span>
            <span className="text-blue-400 group-hover:translate-x-1 transition-transform duration-300">
              →
            </span>
          </button>
        </motion.div>

        {/* 6. Security Trust Line */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.24 }}
          className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 mb-7 sm:mb-9"
        >
          <span>🔒</span>
          <span>Your information stays secure</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">No upfront payment</span>
        </motion.div>
      </div>

      {/* ─── 7. HORIZONTAL INFINITE LOGO MARQUEE ─────────────────────────── */}
      <div className="w-full relative max-w-7xl mx-auto overflow-hidden">
        {/* Left & Right Edge Gradient Fade Overlays */}
        <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#ffffff] dark:from-[#0B0F19] to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#ffffff] dark:from-[#0B0F19] to-transparent z-10 pointer-events-none" />

        {/* Continuous Seamless Infinite Marquee Track */}
        <div className="flex items-center animate-marquee-infinite py-1">
          {marqueeTrack.map((uni, idx) => (
            <UniversityLogoItem key={`${uni.id}-${idx}`} university={uni} />
          ))}
        </div>
      </div>
    </section>
  );
}
