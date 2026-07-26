import React from 'react'

export function GlowEffect({
  colors = ["#0DCE4D", "#00FF66", "#B6F36A", "#00E676", "#0DCE4D"],
  mode = "rotate",
  blur = "strong",
  duration = 5,
  scale = 1,
  className = ""
}) {
  const gradientString = `conic-gradient(from 0deg, ${colors.join(', ')})`
  
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <style>{`
        @keyframes glow-rotate {
          0% { transform: rotate(0deg) scale(${scale}); }
          100% { transform: rotate(360deg) scale(${scale}); }
        }
      `}</style>
      <div
        className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-85 transition-all pointer-events-none will-change-transform"
        style={{
          background: gradientString,
          animation: `glow-rotate ${duration}s linear infinite`,
          filter: blur === "strongest" ? "blur(4px)" : blur === "strong" ? "blur(2px)" : "blur(1px)",
        }}
      />
    </div>
  )
}
