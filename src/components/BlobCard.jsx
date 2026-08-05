import React, { useState, useRef } from 'react'
import { FluidBlobs } from './FluidBlobs'
import { GlowEffect } from './glow-effect'

const DEFAULT_LIGHT = ["#0DCE4D", "#00FF66", "#B6F36A", "#00E676"]
const DEFAULT_DARK = ["#00E676", "#0DCE4D", "#00FF66", "#B6F36A"]
const DEFAULT_GLOW = ["#0DCE4D", "#00FF66", "#B6F36A", "#00E676", "#0DCE4D"]

export function BlobCard({
  header,
  children,
  headerHeight = 210,
  lightColors = DEFAULT_LIGHT,
  darkColors = DEFAULT_DARK,
  glowColors = DEFAULT_GLOW,
  className = "",
}) {
  const [mousePos, setMousePos] = useState({ xPct: 50, yPct: 30, isHovered: false })
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setMousePos({ xPct, yPct, isHovered: true })
  }

  const handleMouseLeave = () => {
    setMousePos((prev) => ({ ...prev, isHovered: false }))
  }

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-80 shrink-0 flex flex-col p-[1px] ${className}`}
    >
      {/* Paper-Thin 1px Rotating Bright Green Glow Border */}
      <div className="absolute -inset-[1px] rounded-[24.5px] overflow-hidden z-0 pointer-events-none">
        <GlowEffect
          colors={glowColors}
          mode="rotate"
          blur="strong"
          duration={5}
          scale={1}
        />
      </div>

      {/* Main White Card Container with Bright Green Border */}
      <div className="relative z-10 rounded-[24px] overflow-hidden bg-white text-neutral-900 border border-[#0DCE4D]/40 shadow-md flex flex-col justify-between flex-1">
        {/* Animated Header Area with Cursor-Tracked Fluid Green Blobs */}
        <div
          className="relative overflow-hidden rounded-t-[24px] shrink-0"
          style={{ height: headerHeight }}
        >
          <FluidBlobs
            lightColors={lightColors}
            darkColors={darkColors}
            mousePos={mousePos}
            blur={35}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white pointer-events-none" />
          
          {/* FreedomPlan Brand Logo Badge on Hover */}
          <div 
            className={`absolute top-3 right-3 z-20 pointer-events-none transition-all duration-300 ease-out ${
              mousePos.isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1.5 scale-90'
            }`}
          >
            <div className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-emerald-400/30 flex items-center gap-1.5">
              <img 
                src="/images/freedom-plan-logo.png" 
                alt="FreedomPlan" 
                className="h-4 object-contain mix-blend-multiply" 
              />
            </div>
          </div>

          {header && <div className="relative z-10 p-6 pb-0">{header}</div>}
        </div>

        {/* Children Content */}
        {children && <div className="relative z-10 p-6 pt-2 flex-1 flex flex-col justify-between">{children}</div>}
      </div>
    </div>
  )
}
