import React, { useRef, useEffect } from 'react'

/**
 * DynamicFreedomPipeline
 * Hero 3-Color Interactive Liquid Pipeline Visualization.
 * 
 * Anchors:
 * 🔴 Left: Red (#FF0000) — Debt Gap
 * 🟡 Middle: Yellow (#FFFF00) — Active Savings Progress
 * 🟢 Right: Green (#4DFC5A) — Debt Freedom
 * 
 * Features:
 * - Continuous organic blending (Red -> Amber -> Yellow -> Lime -> #4DFC5A Green)
 * - 3 Overlapping physical wave layers for volumetric depth
 * - Internal rising translucent bubbles
 * - Spring-damped cursor displacement and ripple with momentum
 * - Save-event triggered wave pulse
 * - 100% strictly clipped to container boundary
 */
export default function DynamicFreedomPipeline({
  overallSaved = 0,
  overallTarget = 0,
  overallPct = '0.0',
  monthlyTarget = 0,
  lastSaveTimestamp = 0,
  yearFilterTabs = [],
  activeFilter = 0,
  setActiveFilter = () => {},
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  // Simulation state
  const stateRef = useRef({
    time: 0,
    width: 0,
    height: 0,
    dpr: 1,
    // Cursor physics
    mouseX: -1000,
    mouseY: -1000,
    smoothMouseX: -1000,
    lastCursorX: -1000,
    isHovered: false,
    springDisplacement: 0,
    springVelocity: 0,
    targetDisplacement: 0,
    // Save-event ripple pulse
    savePulseTime: 0,
    savePulseActive: false,
    savePulseX: 0,
    // Bubbles
    bubbles: [],
    animationFrameId: null,
    reducedMotion: false,
  })

  // Initialize pipeline bubble particles
  useEffect(() => {
    const bubbles = []
    const numBubbles = 20
    for (let i = 0; i < numBubbles; i++) {
      bubbles.push({
        x: Math.random(), // 0..1 normalized width
        y: Math.random(), // 0..1 normalized height
        radius: 1.5 + Math.random() * 2.8,
        speedY: 0.002 + Math.random() * 0.004,
        speedX: 0.0015 + Math.random() * 0.0025,
        wobblePhase: Math.random() * Math.PI * 2,
        opacity: 0.35 + Math.random() * 0.5,
      })
    }
    stateRef.current.bubbles = bubbles
  }, [])

  // Trigger ripple wave on save
  useEffect(() => {
    if (lastSaveTimestamp > 0) {
      stateRef.current.savePulseActive = true
      stateRef.current.savePulseTime = 0
      stateRef.current.savePulseX = 0
    }
  }, [lastSaveTimestamp])

  // Track cursor interaction
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    stateRef.current.reducedMotion = mediaQuery.matches

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const lastX = stateRef.current.lastCursorX
      const speed = lastX >= 0 ? Math.abs(x - lastX) : 0
      stateRef.current.lastCursorX = x

      stateRef.current.mouseX = x
      stateRef.current.mouseY = y
      stateRef.current.isHovered = true

      // Physical depression with velocity momentum
      stateRef.current.targetDisplacement = -Math.min(28, 12 + speed * 0.8)
    }

    const handleMouseLeave = () => {
      stateRef.current.isHovered = false
      stateRef.current.targetDisplacement = 0
      stateRef.current.lastCursorX = -1000
    }

    container.addEventListener('mousemove', handleMouseMove, { passive: true })
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true })

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  // High performance Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let isMounted = true

    const updateDimensions = () => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.floor(rect.width)
      const h = Math.floor(rect.height)

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      stateRef.current.width = w
      stateRef.current.height = h
      stateRef.current.dpr = dpr
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions, { passive: true })

    const render = () => {
      if (!isMounted) return

      const { width, height, dpr = 1, reducedMotion } = stateRef.current
      if (width <= 0 || height <= 0) {
        stateRef.current.animationFrameId = requestAnimationFrame(render)
        return
      }

      // Spring physics for cursor displacement & momentum
      if (!reducedMotion) {
        const springForce = -0.045 * (stateRef.current.springDisplacement - stateRef.current.targetDisplacement)
        stateRef.current.springVelocity = (stateRef.current.springVelocity + springForce) * 0.86
        stateRef.current.springDisplacement += stateRef.current.springVelocity

        // Smooth cursor X coordinate tracking
        if (stateRef.current.isHovered) {
          stateRef.current.smoothMouseX += (stateRef.current.mouseX - stateRef.current.smoothMouseX) * 0.14
        }
        // Advance continuous ambient time clock
        stateRef.current.time += 0.024

        // Advance save pulse
        if (stateRef.current.savePulseActive) {
          stateRef.current.savePulseTime += 0.03
          stateRef.current.savePulseX += width * 0.015
          if (stateRef.current.savePulseX > width * 1.5) {
            stateRef.current.savePulseActive = false
          }
        }
      }

      const t = stateRef.current.time
      const displacement = stateRef.current.springDisplacement
      const mouseX = stateRef.current.smoothMouseX
      const savePulseX = stateRef.current.savePulseX
      const isSavePulsing = stateRef.current.savePulseActive

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      // Base water line height (covers 78% of the card height for dramatic pipeline flow)
      const baseWaterY = height * 0.28
      const step = 8 // Horizontal resolution in pixels

      // ─────────────────────────────────────────────────────────────
      // 1. Create Organic 3-Color Horizontal Gradient: Red -> Yellow -> Green
      // 🔴 #FF0000 [255, 0, 0] -> 🟡 #FFFF00 [255, 255, 0] -> 🟢 #4DFC5A [77, 252, 90]
      // ─────────────────────────────────────────────────────────────
      const liquidGrad = ctx.createLinearGradient(0, 0, width, 0)
      liquidGrad.addColorStop(0.0, 'rgba(255, 0, 0, 0.38)')        // Red #FF0000
      liquidGrad.addColorStop(0.25, 'rgba(255, 80, 0, 0.38)')       // Red-Orange
      liquidGrad.addColorStop(0.48, 'rgba(255, 220, 0, 0.40)')      // Rich Golden Yellow #FFFF00
      liquidGrad.addColorStop(0.55, 'rgba(255, 255, 0, 0.42)')      // Pure Yellow #FFFF00
      liquidGrad.addColorStop(0.72, 'rgba(180, 254, 30, 0.42)')     // Lime transition
      liquidGrad.addColorStop(0.90, 'rgba(77, 252, 90, 0.45)')      // Freedom Green #4DFC5A
      liquidGrad.addColorStop(1.0, 'rgba(50, 230, 70, 0.48)')       // Vibrant #4DFC5A Green

      const backWaveGrad = ctx.createLinearGradient(0, 0, width, 0)
      backWaveGrad.addColorStop(0.0, 'rgba(180, 0, 0, 0.18)')
      backWaveGrad.addColorStop(0.5, 'rgba(220, 180, 0, 0.20)')
      backWaveGrad.addColorStop(1.0, 'rgba(40, 190, 60, 0.22)')

      const midWaveGrad = ctx.createLinearGradient(0, 0, width, 0)
      midWaveGrad.addColorStop(0.0, 'rgba(220, 20, 20, 0.24)')
      midWaveGrad.addColorStop(0.5, 'rgba(240, 210, 0, 0.26)')
      midWaveGrad.addColorStop(1.0, 'rgba(60, 220, 80, 0.28)')

      const crestGrad = ctx.createLinearGradient(0, 0, width, 0)
      crestGrad.addColorStop(0.0, 'rgba(255, 0, 0, 0.90)')
      crestGrad.addColorStop(0.5, 'rgba(255, 255, 0, 0.95)')
      crestGrad.addColorStop(1.0, 'rgba(77, 252, 90, 1.0)')

      // ─────────────────────────────────────────────────────────────
      // LAYER 1: Deep Back Wave
      // ─────────────────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, height)
      for (let x = 0; x <= width; x += step) {
        const k1 = 0.008
        const k2 = 0.018
        const amp = reducedMotion ? 2 : 7
        let yOffset = Math.sin(x * k1 + t * 0.8 + 2.0) * amp * 0.7 + Math.cos(x * k2 - t * 0.6) * (amp * 0.3)

        if (!reducedMotion && Math.abs(displacement) > 0.1) {
          const dist = Math.abs(x - mouseX)
          const gaussian = Math.exp(-(dist * dist) / (2 * 110 * 110))
          yOffset += displacement * 0.4 * gaussian
        }

        const y = Math.max(0, Math.min(height, baseWaterY + yOffset + 6))
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fillStyle = backWaveGrad
      ctx.fill()

      // ─────────────────────────────────────────────────────────────
      // LAYER 2: Mid Flow Wave
      // ─────────────────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, height)
      for (let x = 0; x <= width; x += step) {
        const k1 = 0.012
        const k2 = 0.024
        const amp = reducedMotion ? 2 : 9
        let yOffset = Math.sin(x * k1 - t * 1.0 + 1.2) * amp * 0.6 + Math.cos(x * k2 + t * 0.7) * (amp * 0.4)

        if (!reducedMotion && Math.abs(displacement) > 0.1) {
          const dist = Math.abs(x - mouseX)
          const gaussian = Math.exp(-(dist * dist) / (2 * 95 * 95))
          yOffset += displacement * 0.6 * gaussian
        }

        const y = Math.max(0, Math.min(height, baseWaterY + yOffset + 3))
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fillStyle = midWaveGrad
      ctx.fill()

      // ─────────────────────────────────────────────────────────────
      // LAYER 3: Primary Surface Wave & Physical Cursor Displacement
      // ─────────────────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, height)

      const surfacePoints = []
      for (let x = 0; x <= width; x += step) {
        const k1 = 0.014
        const k2 = 0.028
        const amp = reducedMotion ? 2 : 11
        let yOffset = Math.sin(x * k1 + t * 1.2) * amp * 0.7 + Math.cos(x * k2 + t * 0.9) * (amp * 0.3)

        // Physical cursor displacement: Localized depression & rebound ripple
        if (!reducedMotion && Math.abs(displacement) > 0.1) {
          const dist = Math.abs(x - mouseX)
          const sigma = 90 // Cursor influence radius
          const gaussian = Math.exp(-(dist * dist) / (2 * sigma * sigma))
          const rippleWave = Math.cos(dist * 0.07 - t * 5)
          yOffset += displacement * gaussian * (0.8 + 0.2 * rippleWave)
        }

        // Save event pulse traveling ripple
        if (isSavePulsing) {
          const pulseDist = Math.abs(x - savePulseX)
          const pulseGaussian = Math.exp(-(pulseDist * pulseDist) / (2 * 70 * 70))
          yOffset += Math.sin(pulseDist * 0.08 - stateRef.current.savePulseTime * 8) * (14 * pulseGaussian)
        }

        const y = Math.max(0, Math.min(height, baseWaterY + yOffset))
        surfacePoints.push({ x, y })
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()

      // Fill 3-color primary liquid
      ctx.fillStyle = liquidGrad
      ctx.fill()

      // ─────────────────────────────────────────────────────────────
      // LAYER 4: Internal Rising Bubbles
      // ─────────────────────────────────────────────────────────────
      if (!reducedMotion) {
        const bubbles = stateRef.current.bubbles
        bubbles.forEach((b) => {
          b.y -= b.speedY
          b.wobblePhase += 0.035
          const currentX = b.x * width + Math.sin(b.wobblePhase) * 5
          const currentY = height - b.y * (height - baseWaterY)

          const nearestSurface = surfacePoints.find(p => Math.abs(p.x - currentX) < step * 2)
          const surfaceY = nearestSurface ? nearestSurface.y : baseWaterY

          if (currentY <= surfaceY + 4 || b.y <= 0) {
            b.y = 1.0 + Math.random() * 0.1
            b.x = Math.random()
          } else {
            const distFromSurface = currentY - surfaceY
            const fade = Math.min(1, distFromSurface / 25) * b.opacity

            ctx.beginPath()
            ctx.arc(currentX, currentY, b.radius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.5})`
            ctx.fill()
            ctx.strokeStyle = `rgba(255, 255, 255, ${fade * 0.8})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        })
      }

      // ─────────────────────────────────────────────────────────────
      // LAYER 5: Surface Wave Crest Line & Reflection
      // ─────────────────────────────────────────────────────────────
      if (surfacePoints.length > 1) {
        ctx.beginPath()
        ctx.moveTo(surfacePoints[0].x, surfacePoints[0].y)
        for (let i = 1; i < surfacePoints.length; i++) {
          ctx.lineTo(surfacePoints[i].x, surfacePoints[i].y)
        }
        ctx.strokeStyle = crestGrad
        ctx.lineWidth = 2.0
        ctx.stroke()

        // Cursor ripple radiant reflection glow
        if (!reducedMotion && Math.abs(displacement) > 1.0 && mouseX >= 0 && mouseX <= width) {
          const nearestPoint = surfacePoints.find(p => Math.abs(p.x - mouseX) < step) || { y: baseWaterY }
          const glowGrad = ctx.createRadialGradient(mouseX, nearestPoint.y, 0, mouseX, nearestPoint.y, 50)
          glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)')
          glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.fillStyle = glowGrad
          ctx.beginPath()
          ctx.arc(mouseX, nearestPoint.y, 50, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore()
      stateRef.current.animationFrameId = requestAnimationFrame(render)
    }

    stateRef.current.animationFrameId = requestAnimationFrame(render)

    return () => {
      isMounted = false
      window.removeEventListener('resize', updateDimensions)
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId)
      }
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className="relative isolate overflow-hidden rounded-[26px] bg-white border border-[#E2E8F0] p-6 sm:p-7 shadow-sm transition-all duration-300 select-none"
    >
      {/* 3-Color Fluid Canvas Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[26px]" aria-hidden="true">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Content Overlay (Strict Black / Dark Navy Text with Frosted Glass Badges for 100% Readability) */}
      <div className="relative z-10 space-y-5">
        
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs">
              <span className="text-base font-black text-[#4DFC5A]">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]">
                  Dynamic Freedom Pipeline
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-black text-[#0F172A] tracking-tight">
                Continuous Debt Elimination Flow
              </h3>
            </div>
          </div>

          {/* Milestone Indicator */}
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-[#0F172A] text-xs font-black border border-black/10 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#4DFC5A]" />
              {overallPct}% Plan Complete
            </span>
          </div>
        </div>

        {/* 4 Connected Milestone Glass Cards: Pure Dark/Black High Contrast Text */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Node 1: Red Anchor (Debt Gap) */}
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3.5 space-y-1 shadow-xs hover:bg-white transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0F172A]">
                1. Monthly Target
              </span>
              <span className="h-2 w-2 rounded-full bg-[#FF0000]" title="Starting Base" />
            </div>
            <p className="text-base sm:text-lg font-black text-[#0F172A] figure">
              £{monthlyTarget.toLocaleString('en-GB')}/mo
            </p>
            <p className="text-[10px] font-extrabold text-[#475569]">
              Fixed Monthly Target
            </p>
          </div>

          {/* Node 2: Red/Yellow Bridge (Saved Ledger) */}
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3.5 space-y-1 shadow-xs hover:bg-white transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0F172A]">
                2. Total Saved
              </span>
              <span className="h-2 w-2 rounded-full bg-[#FF7700]" title="Active Contributions" />
            </div>
            <p className="text-base sm:text-lg font-black text-[#0F172A] figure">
              £{overallSaved.toLocaleString('en-GB')}
            </p>
            <p className="text-[10px] font-extrabold text-[#475569]">
              Committed in GBP
            </p>
          </div>

          {/* Node 3: Yellow Anchor (Lump Sum Prepayment) */}
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3.5 space-y-1 shadow-xs hover:bg-white transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0F172A]">
                3. Debt Reduction
              </span>
              <span className="h-2 w-2 rounded-full bg-[#FFFF00] border border-black/20" title="Principal Prepayment" />
            </div>
            <p className="text-base sm:text-lg font-black text-[#0F172A] figure">
              Yearly Prepay
            </p>
            <p className="text-[10px] font-extrabold text-[#475569]">
              Direct Principal Drop
            </p>
          </div>

          {/* Node 4: Green Anchor (Freedom Milestone) */}
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3.5 space-y-1 shadow-xs hover:bg-white transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0F172A]">
                4. Payoff Goal
              </span>
              <span className="h-2 w-2 rounded-full bg-[#4DFC5A]" title="100% Freedom" />
            </div>
            <p className="text-base sm:text-lg font-black text-[#0F172A] figure">
              100% Freedom
            </p>
            <p className="text-[10px] font-extrabold text-[#475569]">
              Target ₹0 Balance
            </p>
          </div>

        </div>

        {/* Centered Year Selector Tabs (Embedded at Bottom of 4-Card Pipeline Container) */}
        {yearFilterTabs && yearFilterTabs.length > 0 && (
          <div className="flex justify-center items-center w-full pt-3 border-t border-black/10">
            <div className="inline-flex items-center justify-center bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-black/10 shadow-xs text-xs overflow-x-auto max-w-full">
              {yearFilterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-4 sm:px-6 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer text-center ${
                    activeFilter === tab.id
                      ? 'bg-[#0F172A] text-white shadow-md'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
