import React from 'react'

export function FluidBlobs({
  lightColors = ["#0DCE4D", "#00FF66", "#B6F36A", "#00E676"],
  darkColors = ["#00E676", "#0DCE4D", "#00FF66", "#B6F36A"],
  mousePos = null,
  blur = 35,
}) {
  const colors = lightColors

  // Base ambient positions when not hovered
  const baseOrigins = [
    { x: 35, y: 20 },
    { x: 65, y: 15 },
    { x: 50, y: 45 },
    { x: 75, y: 35 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <style>{`
        @keyframes fluid-morph-1 {
          0%, 100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          50% {
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          }
        }
        @keyframes fluid-morph-2 {
          0%, 100% {
            border-radius: 40% 60% 60% 40% / 70% 30% 50% 50%;
          }
          50% {
            border-radius: 60% 40% 30% 70% / 40% 70% 30% 60%;
          }
        }
        @keyframes fluid-morph-3 {
          0%, 100% {
            border-radius: 50% 50% 40% 60% / 40% 60% 50% 50%;
          }
          50% {
            border-radius: 70% 30% 60% 40% / 60% 40% 70% 30%;
          }
        }
      `}</style>
      
      <div 
        className="w-full h-full relative"
        style={{ filter: `blur(${blur}px)` }}
      >
        {colors.map((color, idx) => {
          const base = baseOrigins[idx % baseOrigins.length]
          
          let targetX = base.x
          let targetY = base.y

          if (mousePos && mousePos.isHovered) {
            const mx = mousePos.xPct
            const my = mousePos.yPct

            if (idx === 0) {
              targetX = mx
              targetY = my
            } else if (idx === 1) {
              targetX = mx * 0.75 + 15
              targetY = my * 0.75 + 10
            } else if (idx === 2) {
              targetX = 100 - mx * 0.6
              targetY = my * 0.8 + 10
            } else {
              targetX = mx * 0.5 + 25
              targetY = 100 - my * 0.5
            }
          }

          const animName = `fluid-morph-${(idx % 3) + 1}`
          const animDuration = 4 + idx * 1.5

          return (
            <div
              key={idx}
              className="absolute opacity-90"
              style={{
                backgroundColor: color,
                width: `${210 + idx * 25}px`,
                height: `${210 + idx * 25}px`,
                left: `${targetX}%`,
                top: `${targetY}%`,
                transform: 'translate(-50%, -50%)',
                transition: mousePos && mousePos.isHovered 
                  ? 'left 0.15s ease-out, top 0.15s ease-out' 
                  : 'left 1.2s ease-in-out, top 1.2s ease-in-out',
                animation: `${animName} ${animDuration}s ease-in-out infinite`,
                willChange: 'left, top, border-radius',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
