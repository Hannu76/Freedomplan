import React from 'react'
import { MINT_TEXT_URL, WHITE_TEXT_URL } from './ui';

export default function AnimatedDownloadButton({ onDownload, text = "Download my report", variant = "default" }) {
  const isWhite = variant === "white";
  const bgClass = isWhite ? "bg-[#ffffff]" : "bg-[#98CD3F]";
  const textClass = isWhite ? "text-[#0F172A]" : "text-[#052E16]";
  const borderClass = isWhite ? "border-slate-200" : "border-[#7DB425]/50";
  const bgImage = isWhite ? WHITE_TEXT_URL : MINT_TEXT_URL;

  const handleClick = (e) => {
    if (onDownload) {
      try {
        onDownload()
      } catch (err) {
        console.error('Download trigger error:', err)
      }
    }
  }

  return (
    <div className="relative group w-full max-w-[240px] mx-auto mt-2">
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
      <button
        type="button"
        className={`relative z-10 w-full px-4 py-3 rounded-full font-extrabold uppercase tracking-wide text-[12px] transition-all hover:opacity-90 shadow-xl border text-center flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap active:scale-95 ${bgClass} ${textClass} ${borderClass}`}
        onClick={handleClick}
        title={text}
        style={{
            backgroundImage: bgImage,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
        }}
      >
        <span>
          {text}
        </span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rounded-full opacity-90" />
      </button>
    </div>
  )
}

