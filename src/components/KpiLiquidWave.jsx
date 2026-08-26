import React, { useRef, useEffect } from 'react'
import { getProgressRGB } from '../utils/liquidColors'

/**
 * KpiLiquidWave
 * High-performance, restrained liquid water visualizer for the top 3 KPI cards.
 * 
 * Variants:
 * - type="saved": Green liquid (#4DFC5A) + minimal falling drops & ripples (What you've achieved)
 * - type="progress": Yellow -> Green dynamic progress liquid (#FFFF00 -> #4DFC5A) + minimal drops (Overall plan journey)
 * - type="payoff": 3-Color flowing journey wave (#FF0000 -> #FFFF00 -> #4DFC5A) around payoff target (Debt -> Freedom journey)
 */
export default function KpiLiquidWave({
  type = 'saved', // 'saved' | 'progress' | 'payoff'
  pct = 0,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  const stateRef = useRef({
    time: Math.random() * 50,
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
    // Falling drop simulation
    drop: {
      active: false,
      x: 0,
      y: 0,
      vy: 0,
      timer: Math.random() * 80,
      interval: 220 + Math.random() * 80, // ~4-5s per subtle drop
      rippleX: 0,
      rippleRadius: 0,
      rippleOpacity: 0,
    },
    animationFrameId: null,
    reducedMotion: false,
  })

  // Track cursor interaction
  useEffect(() => {
    const container = containerRef.current?.parentElement
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

      // Gentle depression
      stateRef.current.targetDisplacement = -Math.min(16, 6 + speed * 0.5)
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

  // Canvas render loop
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

      // Spring physics
      if (!reducedMotion) {
        const springForce = -0.05 * (stateRef.current.springDisplacement - stateRef.current.targetDisplacement)
        stateRef.current.springVelocity = (stateRef.current.springVelocity + springForce) * 0.86
        stateRef.current.springDisplacement += stateRef.current.springVelocity

        if (stateRef.current.isHovered) {
          stateRef.current.smoothMouseX += (stateRef.current.mouseX - stateRef.current.smoothMouseX) * 0.14
        }
        stateRef.current.time += 0.022
      }

      const t = stateRef.current.time
      const displacement = stateRef.current.springDisplacement
      const mouseX = stateRef.current.smoothMouseX

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      // Base water line in lower 35% of card
      const fillHeightRatio = type === 'payoff' ? 0.32 : Math.min(0.40, Math.max(0.18, (Number(pct) || 0) / 100 * 0.40 + 0.12))
      const baseWaterY = height * (1 - fillHeightRatio)
      const step = 6

      // Determine color themes
      let liquidGrad = null
      let crestStroke = '#4DFC5A'
      let dropRGB = '77, 252, 90'

      if (type === 'saved') {
        // Card 1: Pure #4DFC5A Green Liquid
        liquidGrad = ctx.createLinearGradient(0, baseWaterY - 5, 0, height)
        liquidGrad.addColorStop(0, 'rgba(77, 252, 90, 0.25)')
        liquidGrad.addColorStop(0.6, 'rgba(50, 204, 75, 0.28)')
        liquidGrad.addColorStop(1, 'rgba(22, 163, 74, 0.38)')
        crestStroke = 'rgba(77, 252, 90, 0.85)'
        dropRGB = '77, 252, 90'
      } else if (type === 'progress') {
        // Card 2: Yellow -> Green Progress Liquid
        const [r, g, b] = getProgressRGB(pct)
        liquidGrad = ctx.createLinearGradient(0, baseWaterY - 5, 0, height)
        liquidGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`)
        liquidGrad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.30)`)
        liquidGrad.addColorStop(1, `rgba(${Math.round(r * 0.7)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.7)}, 0.40)`)
        crestStroke = `rgba(${r}, ${g}, ${b}, 0.85)`
        dropRGB = `${r}, ${g}, ${b}`
      } else if (type === 'payoff') {
        // Card 3: 3-Color Journey Liquid (Red -> Yellow -> Green)
        liquidGrad = ctx.createLinearGradient(0, 0, width, 0)
        liquidGrad.addColorStop(0.0, 'rgba(255, 0, 0, 0.26)')       // Red #FF0000
        liquidGrad.addColorStop(0.45, 'rgba(255, 220, 0, 0.28)')     // Amber-Yellow
        liquidGrad.addColorStop(0.55, 'rgba(255, 255, 0, 0.30)')     // Yellow #FFFF00
        liquidGrad.addColorStop(1.0, 'rgba(77, 252, 90, 0.32)')      // Green #4DFC5A

        const crestGradient = ctx.createLinearGradient(0, 0, width, 0)
        crestGradient.addColorStop(0.0, 'rgba(255, 0, 0, 0.85)')
        crestGradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.90)')
        crestGradient.addColorStop(1.0, 'rgba(77, 252, 90, 0.95)')
        crestStroke = crestGradient
        dropRGB = '77, 252, 90'
      }

      // ─────────────────────────────────────────────────────────────
      // LAYER 1: Deep Back Wave
      // ─────────────────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, height)
      for (let x = 0; x <= width; x += step) {
        const k1 = 0.012
        const k2 = 0.025
        const amp = reducedMotion ? 1.5 : 5
        let yOffset = Math.sin(x * k1 + t * 0.9 + 2.0) * amp * 0.7 + Math.cos(x * k2 - t * 0.7) * (amp * 0.3)

        if (!reducedMotion && Math.abs(displacement) > 0.1) {
          const dist = Math.abs(x - mouseX)
          const gaussian = Math.exp(-(dist * dist) / (2 * 80 * 80))
          yOffset += displacement * 0.4 * gaussian
        }

        const y = Math.max(0, Math.min(height, baseWaterY + yOffset + 3))
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fillStyle = type === 'payoff' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'
      ctx.fill()

      // ─────────────────────────────────────────────────────────────
      // LAYER 2: Primary Surface Wave
      // ─────────────────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, height)

      const surfacePoints = []
      for (let x = 0; x <= width; x += step) {
        const k1 = 0.016
        const k2 = 0.032
        const amp = reducedMotion ? 1.5 : 7
        let yOffset = Math.sin(x * k1 + t * 1.3) * amp * 0.7 + Math.cos(x * k2 + t * 0.9) * (amp * 0.3)

        if (!reducedMotion && Math.abs(displacement) > 0.1) {
          const dist = Math.abs(x - mouseX)
          const sigma = 70
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
      ctx.fillStyle = liquidGrad
      ctx.fill()

      // ─────────────────────────────────────────────────────────────
      // LAYER 3: Minimal Falling Drop Animation
      // ─────────────────────────────────────────────────────────────
      const drop = stateRef.current.drop
      if (!reducedMotion) {
        drop.timer++

        if (!drop.active && drop.timer > drop.interval) {
          drop.active = true
          drop.x = width * (0.25 + Math.random() * 0.5)
          drop.y = height * 0.35 // starts midway down card
          drop.vy = 1.0
          drop.timer = 0
          drop.interval = 240 + Math.random() * 90
        }

        if (drop.active) {
          drop.vy += 0.35
          drop.y += drop.vy

          const nearestSurface = surfacePoints.find(p => Math.abs(p.x - drop.x) < step * 2)
          const surfaceY = nearestSurface ? nearestSurface.y : baseWaterY

          if (drop.y >= surfaceY) {
            drop.active = false
            drop.rippleX = drop.x
            drop.rippleRadius = 1
            drop.rippleOpacity = 0.75
          } else {
            ctx.beginPath()
            ctx.ellipse(drop.x, drop.y, 1.8, 3.8, 0, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${dropRGB}, 0.75)`
            ctx.fill()
          }
        }

        if (drop.rippleOpacity > 0.02) {
          drop.rippleRadius += 1.0
          drop.rippleOpacity *= 0.92

          const nearestSurface = surfacePoints.find(p => Math.abs(p.x - drop.rippleX) < step * 2)
          const rippleY = nearestSurface ? nearestSurface.y : baseWaterY

          ctx.beginPath()
          ctx.ellipse(drop.rippleX, rippleY, drop.rippleRadius * 1.5, drop.rippleRadius * 0.45, 0, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${dropRGB}, ${drop.rippleOpacity})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
      }

      // ─────────────────────────────────────────────────────────────
      // LAYER 4: Surface Wave Crest Line
      // ─────────────────────────────────────────────────────────────
      if (surfacePoints.length > 1) {
        ctx.beginPath()
        ctx.moveTo(surfacePoints[0].x, surfacePoints[0].y)
        for (let i = 1; i < surfacePoints.length; i++) {
          ctx.lineTo(surfacePoints[i].x, surfacePoints[i].y)
        }
        ctx.strokeStyle = crestStroke
        ctx.lineWidth = 1.6
        ctx.stroke()
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
  }, [type, pct])

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[24px]"
      aria-hidden="true"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  )
}
