import React, { useRef, useEffect } from 'react'
import { getProgressRGB, getProgressGradientCSS } from '../utils/liquidColors'

export { getProgressRGB, getProgressGradientCSS }

/**
 * LiquidProgressWave Component
 * 
 * Complete physical liquid water system:
 * - Direct vertical height corresponding to progress %
 * - Continuous Freedomplan brand color progression (Deep Cherry Red -> Dark Amber -> Brand Green)
 * - 3D volumetric water depth (Bright surface -> Saturated mid -> Deep dark base)
 * - 3 Overlapping wave layers for depth & translucency
 * - Internal rising bubble particle system scaling with progress
 * - Special "waiting to fill" empty state: Occasional single falling drop creating small ripples
 * - Physical cursor displacement & ripple with inertia & spring damping
 * - Strict clipping: All waves, bubbles, and drops remain 100% inside card boundaries
 */
export default function LiquidProgressWave({
  pctComplete = 0,
  status = 'Upcoming',
  isShortfall = false,
  isNoIncome = false,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  
  // Physical simulation & particle mutable state
  const stateRef = useRef({
    time: Math.random() * 100,
    width: 0,
    height: 0,
    dpr: 1,
    // Mouse tracking & spring physics
    mouseX: -1000,
    mouseY: -1000,
    smoothMouseX: -1000,
    lastCursorX: -1000,
    isHovered: false,
    springDisplacement: 0,
    springVelocity: 0,
    targetDisplacement: 0,
    // Smooth upward entrance fill animation: starts at 0 and smoothly rises to target
    fillLevel: 0, 
    targetFillLevel: 0,
    // Bubbles
    bubbles: [],
    // Empty state drop simulation
    drop: {
      active: false,
      x: 0,
      y: 0,
      vy: 0,
      timer: Math.random() * 60, // staggered initial drop
      interval: 180 + Math.random() * 60, // ~3-4s per drop
      rippleX: 0,
      rippleRadius: 0,
      rippleOpacity: 0,
    },
    animationFrameId: null,
    reducedMotion: false,
  })

  // 1. Calculate true water vertical height and trigger smooth upward fill rise
  useEffect(() => {
    let target = 0
    if (isNoIncome) {
      target = 0
    } else if (pctComplete >= 100) {
      target = 0.94 // 94% height for 100% completed
    } else if (pctComplete <= 0) {
      target = 0.05 // Subtle baseline waiting to fill
    } else {
      // Direct proportion with min baseline
      target = Math.min(0.92, Math.max(0.08, pctComplete / 100))
    }

    stateRef.current.targetFillLevel = target
  }, [pctComplete, isNoIncome])

  // 2. Initialize and manage bubble particles
  useEffect(() => {
    // Empty state (0%): No active bubbles (uses the falling drop instead)
    if (pctComplete <= 0 || isNoIncome) {
      stateRef.current.bubbles = []
      return
    }

    const numBubbles = pctComplete >= 95 
      ? 18 
      : pctComplete >= 75 
        ? 13 
        : pctComplete >= 50 
          ? 8 
          : pctComplete >= 25 
            ? 5 
            : 2

    const bubbles = []
    for (let i = 0; i < numBubbles; i++) {
      bubbles.push({
        x: Math.random(), // Normalized 0..1
        y: Math.random(), // Normalized 0..1 relative to water height
        radius: 1.2 + Math.random() * 2.5,
        speedY: 0.003 + Math.random() * 0.005,
        speedX: 0.0015 + Math.random() * 0.0025,
        baseSpeedX: 0.0015 + Math.random() * 0.0025,
        wobblePhase: Math.random() * Math.PI * 2,
        opacity: 0.35 + Math.random() * 0.55,
      })
    }
    stateRef.current.bubbles = bubbles
  }, [pctComplete, isNoIncome])

  // 3. Track cursor coordinates and velocity from parent container
  useEffect(() => {
    const container = containerRef.current?.parentElement
    if (!container) return

    // Check prefers-reduced-motion
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

      // Push water surface down with velocity proportional to mouse speed
      stateRef.current.targetDisplacement = -Math.min(24, 10 + speed * 0.7)
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

  // 4. High performance Canvas render loop
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

    // Compute continuous 3D depth palette
    const getPalette = () => {
      const [r, g, b] = getProgressRGB(pctComplete)
      const darkR = Math.max(0, Math.round(r * 0.7))
      const darkG = Math.max(0, Math.round(g * 0.7))
      const darkB = Math.max(0, Math.round(b * 0.7))

      return {
        rgb: `${r}, ${g}, ${b}`,
        darkRgb: `${darkR}, ${darkG}, ${darkB}`,
        surfaceGrad: `rgba(${r}, ${g}, ${b}, 0.32)`,  // Bright surface
        midGrad: `rgba(${r}, ${g}, ${b}, 0.38)`,      // Saturated body
        deepGrad: `rgba(${darkR}, ${darkG}, ${darkB}, 0.48)`, // Dark 3D depth
        midWave: `rgba(${r}, ${g}, ${b}, 0.16)`,       // Layer 2
        backWave: `rgba(${darkR}, ${darkG}, ${darkB}, 0.12)`, // Layer 1
        surfaceLine: `rgba(${r}, ${g}, ${b}, 0.85)`,   // Crisp surface crest
        crestGlow: `rgba(${r}, ${g}, ${b}, 0.55)`,     // Reflection highlight
        dropColor: `rgba(${r}, ${g}, ${b}, 0.75)`,     // Empty state drop
      }
    }

    const render = () => {
      if (!isMounted) return

      const { width, height, dpr = 1, reducedMotion } = stateRef.current
      if (width <= 0 || height <= 0) {
        stateRef.current.animationFrameId = requestAnimationFrame(render)
        return
      }

      // Smooth one-time bottom-to-top liquid entry interpolation
      stateRef.current.fillLevel += (stateRef.current.targetFillLevel - stateRef.current.fillLevel) * 0.04
      
      // Physics & animation updates
      if (!reducedMotion) {
        // Spring physics for cursor displacement & rebound inertia
        const springForce = -0.045 * (stateRef.current.springDisplacement - stateRef.current.targetDisplacement)
        stateRef.current.springVelocity = (stateRef.current.springVelocity + springForce) * 0.86
        stateRef.current.springDisplacement += stateRef.current.springVelocity

        // Smooth cursor X coordinate tracking
        if (stateRef.current.isHovered) {
          stateRef.current.smoothMouseX += (stateRef.current.mouseX - stateRef.current.smoothMouseX) * 0.14
        }

        // Advance ambient continuous time clock
        stateRef.current.time += 0.026
      }

      const t = stateRef.current.time
      const fill = stateRef.current.fillLevel
      const displacement = stateRef.current.springDisplacement
      const mouseX = stateRef.current.smoothMouseX

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      // If no income recorded, keep quiet clean surface
      if (isNoIncome) {
        ctx.restore()
        stateRef.current.animationFrameId = requestAnimationFrame(render)
        return
      }

      const palette = getPalette()
      const baseWaterY = height * (1 - fill)
      const step = 6 // Horizontal resolution in pixels

      // ─────────────────────────────────────────────────────────────
      // LAYER 1: Deep Back Wave (Continuous Left -> Right Flow)
      // ─────────────────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, height)
      for (let x = 0; x <= width; x += step) {
        const k1 = 0.010
        const k2 = 0.022
        const amp = reducedMotion ? 2 : Math.min(8, 3 + fill * 5)
        // Standard wave moving left to right: sin(k*x - omega*t)
        let yOffset = Math.sin(x * k1 - t * 0.8 + 2.0) * amp * 0.7 + Math.cos(x * k2 - t * 0.6) * (amp * 0.3)
        
        if (!reducedMotion && Math.abs(displacement) > 0.1) {
          const dist = Math.abs(x - mouseX)
          const gaussian = Math.exp(-(dist * dist) / (2 * 90 * 90))
          yOffset += displacement * 0.4 * gaussian
        }

        const y = Math.max(0, Math.min(height, baseWaterY + yOffset + 3))
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fillStyle = palette.backWave
      ctx.fill()

      // ─────────────────────────────────────────────────────────────
      // LAYER 2: Mid Wave (Intermediate Phase Flow: Left -> Right)
      // ─────────────────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, height)
      for (let x = 0; x <= width; x += step) {
        const k1 = 0.014
        const k2 = 0.028
        const amp = reducedMotion ? 2 : Math.min(10, 4 + fill * 6)
        // Mid wave moving left to right
        let yOffset = Math.sin(x * k1 - t * 1.1 + 1.2) * amp * 0.6 + Math.cos(x * k2 - t * 0.8) * (amp * 0.4)

        if (!reducedMotion && Math.abs(displacement) > 0.1) {
          const dist = Math.abs(x - mouseX)
          const gaussian = Math.exp(-(dist * dist) / (2 * 80 * 80))
          yOffset += displacement * 0.6 * gaussian
        }

        const y = Math.max(0, Math.min(height, baseWaterY + yOffset + 1.5))
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fillStyle = palette.midWave
      ctx.fill()

      // ─────────────────────────────────────────────────────────────
      // LAYER 3: Primary Surface Wave (Physical Liquid Surface: Left -> Right)
      // ─────────────────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, height)

      const surfacePoints = []
      for (let x = 0; x <= width; x += step) {
        const k1 = 0.016
        const k2 = 0.034
        const amp = reducedMotion ? 2 : Math.min(12, 5 + fill * 7)
        // Surface crest moving left to right: sin(k*x - omega*t)
        let yOffset = Math.sin(x * k1 - t * 1.4) * amp * 0.7 + Math.cos(x * k2 - t * 1.0) * (amp * 0.3)

        // Physical cursor displacement: Localized depression & rebound ripple
        if (!reducedMotion && Math.abs(displacement) > 0.1) {
          const dist = Math.abs(x - mouseX)
          const sigma = 75 // Influence radius
          const gaussian = Math.exp(-(dist * dist) / (2 * sigma * sigma))
          const rippleWave = Math.cos(dist * 0.08 - t * 5)
          yOffset += displacement * gaussian * (0.8 + 0.2 * rippleWave)
        }

        const y = Math.max(0, Math.min(height, baseWaterY + yOffset))
        surfacePoints.push({ x, y })
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()

      // 3D Volumetric liquid gradient: Surface -> Mid -> Dark depth
      const gradient = ctx.createLinearGradient(0, baseWaterY - 10, 0, height)
      gradient.addColorStop(0, palette.surfaceGrad)
      gradient.addColorStop(0.5, palette.midGrad)
      gradient.addColorStop(1, palette.deepGrad)
      ctx.fillStyle = gradient
      ctx.fill()

      // ─────────────────────────────────────────────────────────────
      // LAYER 4: Special "Waiting to Fill" Single Falling Drop (0% State)
      // ─────────────────────────────────────────────────────────────
      const drop = stateRef.current.drop
      if (!reducedMotion && pctComplete <= 0 && !isNoIncome) {
        drop.timer++

        // Trigger new drop every ~3-4 seconds
        if (!drop.active && drop.timer > drop.interval) {
          drop.active = true
          drop.x = width * (0.35 + Math.random() * 0.3) // Center 30-70% of card
          drop.y = 8
          drop.vy = 1.2
          drop.timer = 0
          drop.interval = 190 + Math.random() * 70
        }

        // Render falling drop
        if (drop.active) {
          drop.vy += 0.38 // Gravity acceleration
          drop.y += drop.vy

          // Find local surface water height at drop.x
          const nearestSurface = surfacePoints.find(p => Math.abs(p.x - drop.x) < step * 2)
          const surfaceY = nearestSurface ? nearestSurface.y : baseWaterY

          // When drop hits surface -> start ripple
          if (drop.y >= surfaceY) {
            drop.active = false
            drop.rippleX = drop.x
            drop.rippleRadius = 1
            drop.rippleOpacity = 0.8
          } else {
            // Draw falling liquid teardrop
            ctx.beginPath()
            ctx.ellipse(drop.x, drop.y, 2.2, 4.5, 0, 0, Math.PI * 2)
            ctx.fillStyle = palette.dropColor
            ctx.fill()

            // Micro trail
            ctx.beginPath()
            ctx.moveTo(drop.x, drop.y - 6)
            ctx.lineTo(drop.x, drop.y)
            ctx.strokeStyle = `rgba(${palette.rgb}, 0.35)`
            ctx.lineWidth = 1.2
            ctx.stroke()
          }
        }

        // Render drop impact ripple on water surface
        if (drop.rippleOpacity > 0.02) {
          drop.rippleRadius += 1.2
          drop.rippleOpacity *= 0.92

          const nearestSurface = surfacePoints.find(p => Math.abs(p.x - drop.rippleX) < step * 2)
          const rippleY = nearestSurface ? nearestSurface.y : baseWaterY

          ctx.beginPath()
          ctx.ellipse(drop.rippleX, rippleY, drop.rippleRadius * 1.6, drop.rippleRadius * 0.5, 0, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${palette.rgb}, ${drop.rippleOpacity})`
          ctx.lineWidth = 1.4
          ctx.stroke()
        }
      }

      // ─────────────────────────────────────────────────────────────
      // LAYER 5: Internal Rising Bubbles
      // ─────────────────────────────────────────────────────────────
      if (!reducedMotion && fill > 0.04 && pctComplete > 0) {
        const waterHeight = height * fill
        const bubbles = stateRef.current.bubbles

        bubbles.forEach((b) => {
          // Update bubble vertical rise
          b.y -= b.speedY
          b.wobblePhase += 0.04

          const currentX = b.x * width + Math.sin(b.wobblePhase) * 4
          const currentY = height - (b.y * waterHeight)

          // Find local surface water height at currentX
          const nearestSurface = surfacePoints.find(p => Math.abs(p.x - currentX) < step * 2)
          const surfaceY = nearestSurface ? nearestSurface.y : baseWaterY

          // If bubble reaches surface or goes out of bounds, respawn at bottom
          if (currentY <= surfaceY + 4 || b.y <= 0) {
            b.y = 1.0 + Math.random() * 0.1
            b.x = Math.random()
          } else {
            // Render bubble with translucent reflection
            const distFromSurface = currentY - surfaceY
            const fade = Math.min(1, distFromSurface / 20) * b.opacity

            ctx.beginPath()
            ctx.arc(currentX, currentY, b.radius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.45})`
            ctx.fill()
            ctx.strokeStyle = `rgba(${palette.rgb}, ${fade * 0.65})`
            ctx.lineWidth = 0.8
            ctx.stroke()

            // Micro highlight reflection spot
            ctx.beginPath()
            ctx.arc(currentX - b.radius * 0.3, currentY - b.radius * 0.3, b.radius * 0.35, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.85})`
            ctx.fill()
          }
        })
      }

      // ─────────────────────────────────────────────────────────────
      // LAYER 6: Surface Wave Crest Line & Light Reflection
      // ─────────────────────────────────────────────────────────────
      if (surfacePoints.length > 1) {
        ctx.beginPath()
        ctx.moveTo(surfacePoints[0].x, surfacePoints[0].y)
        for (let i = 1; i < surfacePoints.length; i++) {
          ctx.lineTo(surfacePoints[i].x, surfacePoints[i].y)
        }
        ctx.strokeStyle = palette.surfaceLine
        ctx.lineWidth = 1.8
        ctx.stroke()

        // Subtle glowing highlight around the cursor ripple center
        if (!reducedMotion && Math.abs(displacement) > 1.0 && mouseX >= 0 && mouseX <= width) {
          const nearestPoint = surfacePoints.find(p => Math.abs(p.x - mouseX) < step) || { y: baseWaterY }
          const glowGrad = ctx.createRadialGradient(mouseX, nearestPoint.y, 0, mouseX, nearestPoint.y, 45)
          glowGrad.addColorStop(0, palette.crestGlow)
          glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.fillStyle = glowGrad
          ctx.beginPath()
          ctx.arc(mouseX, nearestPoint.y, 45, 0, Math.PI * 2)
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
  }, [pctComplete, status, isShortfall, isNoIncome])

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[22px]"
      aria-hidden="true"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  )
}
