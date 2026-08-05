import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function createSliceShape(startAngle, endAngle, radius, innerRadius) {
  const shape = new THREE.Shape()
  const outerR = radius
  const innerR = innerRadius

  shape.moveTo(Math.cos(startAngle) * outerR, Math.sin(startAngle) * outerR)
  shape.absarc(0, 0, outerR, startAngle, endAngle, false)

  if (innerR > 0) {
    shape.lineTo(Math.cos(endAngle) * innerR, Math.sin(endAngle) * innerR)
    shape.absarc(0, 0, innerR, endAngle, startAngle, true)
  } else {
    shape.lineTo(0, 0)
  }

  shape.closePath()
  return shape
}

// Preset vibrant pastel palette matching Image 3 style
const PRESET_COLORS = [
  '#a7f3d0', // Mint Green (Apple style)
  '#f472b6', // Warm Pink (Samsung style)
  '#67e8f9', // Cyan Blue (Vivo style)
  '#c084fc', // Pastel Purple (OPPO style)
  '#fde047', // Peach Yellow (Xiaomi style)
  '#fb923c', // Orange
]

export default function ThreePieChart({ slices, donut = false }) {
  const containerRef = useRef(null)
  const [labelPositions, setLabelPositions] = useState([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const aspect = width / height

    // 1. Scene setup with subtle ambient ground lighting
    const scene = new THREE.Scene()

    // 2. Camera setup - isometric angle similar to Image 3
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 50)
    camera.position.set(0, 2.4, 3.6)
    camera.lookAt(0, 0, 0)

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // 4. Lighting setup for realistic 3D depth & soft shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4)
    mainLight.position.set(3, 6, 4)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    mainLight.shadow.bias = -0.0005
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xe0e7ff, 0.6)
    fillLight.position.set(-4, 3, -2)
    scene.add(fillLight)

    // Ground plane shadow receiver
    const shadowPlaneGeo = new THREE.PlaneGeometry(10, 10)
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.12 })
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat)
    shadowPlane.rotation.x = -Math.PI / 2
    shadowPlane.position.y = 0
    shadowPlane.receiveShadow = true
    scene.add(shadowPlane)

    const pieGroup = new THREE.Group()
    scene.add(pieGroup)

    const total = Math.max(slices.reduce((sum, item) => sum + (item.pct ?? item.amount ?? 0), 0), 0.0001)
    const radius = 1.35
    const innerRadius = donut ? 0.45 : 0
    let startAngle = -Math.PI / 2

    const labelPosList = []

    slices.forEach((slice, index) => {
      const value = Math.max(slice.pct ?? slice.amount ?? 0, 0.0001)
      const angle = (value / total) * Math.PI * 2
      const midAngle = startAngle + angle / 2

      const shape = createSliceShape(startAngle, startAngle + angle, radius, innerRadius)

      // Extrude settings with smooth rounded top beveling like Image 3
      const extrudeSettings = {
        depth: 0.32,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 2,
        bevelSize: 0.035,
        bevelThickness: 0.035,
        curveSegments: 64,
      }

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      geometry.rotateX(-Math.PI / 2)
      geometry.computeVertexNormals()

      const sliceColor = slice.color || slice.stroke || PRESET_COLORS[index % PRESET_COLORS.length]

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sliceColor),
        roughness: 0.28,
        metalness: 0.12,
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true

      // Slight radial explosion / gap between slices like Image 3
      const explodeOffset = 0.07
      mesh.position.x = Math.cos(midAngle) * explodeOffset
      mesh.position.z = Math.sin(midAngle) * explodeOffset
      mesh.position.y = 0.02

      mesh.userData = { index }
      pieGroup.add(mesh)

      // Calculate 3D center point for direct text label placement on top of slice
      const labelRadius = donut ? (radius + innerRadius) * 0.55 : radius * 0.58
      const centerPos3D = new THREE.Vector3(
        mesh.position.x + Math.cos(midAngle) * labelRadius,
        0.38,
        mesh.position.z + Math.sin(midAngle) * labelRadius
      )

      labelPosList.push({
        index,
        label: slice.label,
        pct: slice.pct ?? ((slice.amount / total) * 100),
        amount: slice.amount,
        pos3d: centerPos3D,
        color: sliceColor
      })

      startAngle += angle
    })

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5
    controls.minDistance = 2.5
    controls.maxDistance = 6
    controls.maxPolarAngle = Math.PI * 0.44

    // Screen projection loop for HTML 3D labels
    const updateLabels = () => {
      const updated = labelPosList.map((item) => {
        const tempV = item.pos3d.clone()
        tempV.project(camera)
        const x = (tempV.x * 0.5 + 0.5) * container.clientWidth
        const y = (-tempV.y * 0.5 + 0.5) * container.clientHeight
        return { ...item, x, y }
      })
      setLabelPositions(updated)
    }

    const handleResize = () => {
      if (!container) return
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      updateLabels()
    }

    window.addEventListener('resize', handleResize)

    let frameId = null
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      updateLabels()
      frameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (frameId) cancelAnimationFrame(frameId)
      controls.dispose()
      renderer.dispose()
      pieGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      })
      scene.remove(pieGroup)
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [slices, donut])

  return (
    <div className="relative w-full h-full min-h-[380px] select-none">
      <div
        ref={containerRef}
        className="w-full h-full rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ minHeight: 380 }}
      />

      {/* 3D Direct Overlay Labels (matching Image 3 output style) */}
      {labelPositions.map((lbl) => (
        <div
          key={lbl.index}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 ease-out"
          style={{ left: `${lbl.x}px`, top: `${lbl.y}px` }}
        >
          <div className="flex flex-col items-center bg-neutral-900/80 dark:bg-neutral-950/85 text-white px-3 py-1.5 rounded-xl border border-white/10 shadow-xl backdrop-blur-md">
            <span className="font-bold text-xs tracking-tight text-neutral-100 drop-shadow-sm">
              {lbl.label}
            </span>
            <span className="text-[11px] font-semibold text-lime-400">
              {lbl.pct.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
