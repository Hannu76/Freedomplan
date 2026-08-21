import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Vector University Crest Badge for crisp rendering & instant fallback
function UniversityCrestIcon({ crest, name, accentColor }) {
  const { shieldColor = '#002147', innerIcon = 'book', secondaryColor = '#D4AF37', initials = 'UK' } = crest || {};

  const renderIconGraphic = () => {
    switch (innerIcon) {
      case 'book':
        return (
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z M6 6h10 M6 10h10 M6 14h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'lion':
        return (
          <path d="M12 2l3 4.5h4L17 11l2 6-5-3-5 3 2-6-2-4.5h4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.8" />
        );
      case 'crown':
        return (
          <path d="M3 18h18M4 14l3-7 5 5 5-5 3 7H4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'dome':
        return (
          <path d="M4 20h16 M6 20V12a6 6 0 0 1 12 0v8 M12 2v4 M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'castle':
        return (
          <path d="M4 21V9l2-2v4h3V7l2-2 2 2v4h3V7l2 2v12H4z M9 21v-4h6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'sun':
        return (
          <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'ship':
        return (
          <path d="M2 17h20l-3 4H5l-3-4z M12 3v11 M7 6l5-3 5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'rose':
        return (
          <path d="M12 8c-2 0-4-2-4-4s2-2 4-2 4 0 4 2-2 4-4 4zm-4 4c0-2-2-4-4-4s-2 2-2 4 2 4 4 4 2-2 2-4zm8 0c0-2 2-4 4-4s2 2 2 4-2 4-4 4-2-2-2-4zm-4 4c-2 0-4 2-4 4s2 2 4 2 4 0 4-2-2-4-4-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      default:
        return (
          <path d="M12 2L3 7l9 5 9-5-9-5z M3 14l9 5 9-5 M3 10.5l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
    }
  };

  return (
    <div
      className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-md overflow-hidden shrink-0 border border-white/40"
      style={{
        background: `linear-gradient(135deg, ${shieldColor} 0%, ${accentColor || shieldColor} 100%)`
      }}
    >
      {/* Specular sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
      
      <div className="text-white flex flex-col items-center justify-center relative z-10">
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24">
          {renderIconGraphic()}
        </svg>
        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-0.5 text-white/90">
          {initials}
        </span>
      </div>
    </div>
  );
}

export default function UniversityCard({
  university,
  isTransitioning = false,
  customStyle = {},
  className = '',
  onHoverStart,
  onHoverEnd,
  onClick
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!university) return null;

  return (
    <motion.div
      layout
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
      style={customStyle}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{
        opacity: isTransitioning ? 0 : 1,
        scale: isTransitioning ? 0.94 : 1,
      }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative select-none cursor-pointer rounded-2xl sm:rounded-[20px] bg-white/95 dark:bg-[#111625]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] hover:border-blue-400/40 dark:hover:border-blue-500/40 transition-all duration-300 ${className}`}
    >
      {/* Subtle top gloss highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-slate-700/60 to-transparent rounded-t-2xl pointer-events-none" />

      <div className="flex items-center gap-3">
        {/* Logo / Crest Badge */}
        {!imgFailed && university.logo ? (
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 p-1.5 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
            <img
              src={university.logo}
              alt={`${university.name} logo`}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain filter group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <UniversityCrestIcon
            crest={university.crest}
            name={university.name}
            accentColor={university.accentColor}
          />
        )}

        {/* University Details */}
        <div className="flex flex-col min-w-0 pr-1">
          {/* Badge / Ranking Pill */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold tracking-wide uppercase bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              {university.ranking || 'UK Tier 4'}
            </span>
          </div>

          {/* University Name */}
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {university.name}
          </h4>

          {/* Location / Tailored Plan Snippet */}
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{university.location}</span>
          </p>
        </div>
      </div>

      {/* Plan Tag Footer */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-300 tracking-tight line-clamp-1 flex items-center gap-1">
          <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{university.badge || 'Tailored Plan Ready'}</span>
        </span>
        <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0">
          View Plan →
        </span>
      </div>
    </motion.div>
  );
}
