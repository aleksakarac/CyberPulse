'use client'

import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AttackEvent, AttackType } from '@cyberpulse/shared'
import { createArcCurve } from '@/lib/arcGeometry'
import { getAttackColor } from '@/lib/colorScale'
import arcVert from '@/shaders/arc.vert'
import arcFrag from '@/shaders/arc.frag'

const MAX_ARCS = 300
const ARC_SEGMENTS = 64
const DRAW_DURATION = 1.0
const HOLD_DURATION = 0.5
const FADE_DURATION = 2.0
const TOTAL_DURATION = DRAW_DURATION + HOLD_DURATION + FADE_DURATION

interface ArcState {
  active: boolean
  startTime: number
  curve: THREE.QuadraticBezierCurve3 | null
  type: AttackType
}

interface AttackArcsProps {
  attacks: AttackEvent[]
}

export default function AttackArcs({ attacks }: AttackArcsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const arcsRef = useRef<ArcState[]>([])
  const linesRef = useRef<THREE.Line[]>([])
  const headsRef = useRef<THREE.Mesh[]>([])
  const processedRef = useRef(new Set<string>())
  const initializedRef = useRef(false)

  const headGeometry = useMemo(
    () => new THREE.SphereGeometry(0.008, 8, 8),
    []
  )

  // Initialize arc pool imperatively
  useEffect(() => {
    if (initializedRef.current || !groupRef.current) return
    initializedRef.current = true

    const group = groupRef.current

    for (let i = 0; i < MAX_ARCS; i++) {
      // Arc state
      arcsRef.current[i] = {
        active: false,
        startTime: 0,
        curve: null,
        type: 'scanning',
      }

      // Line object
      const geometry = new THREE.BufferGeometry()
      const material = new THREE.ShaderMaterial({
        vertexShader: arcVert,
        fragmentShader: arcFrag,
        uniforms: {
          uColor: { value: new THREE.Color('#ffffff') },
          uDrawProgress: { value: 0 },
          uFadeProgress: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const line = new THREE.Line(geometry, material)
      line.visible = false
      line.frustumCulled = false
      linesRef.current[i] = line
      group.add(line)

      // Particle head
      const headMat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        toneMapped: false,
      })
      const head = new THREE.Mesh(headGeometry, headMat)
      head.visible = false
      headsRef.current[i] = head
      group.add(head)
    }

    return () => {
      // Cleanup
      for (const line of linesRef.current) {
        line.geometry.dispose()
        ;(line.material as THREE.ShaderMaterial).dispose()
        group.remove(line)
      }
      for (const head of headsRef.current) {
        ;(head.material as THREE.MeshBasicMaterial).dispose()
        group.remove(head)
      }
      linesRef.current = []
      headsRef.current = []
      arcsRef.current = []
      initializedRef.current = false
    }
  }, [headGeometry])

  const getNextSlot = useCallback(() => {
    const arcs = arcsRef.current
    for (let i = 0; i < MAX_ARCS; i++) {
      if (!arcs[i].active) return i
    }
    let oldest = 0
    let oldestTime = Infinity
    for (let i = 0; i < MAX_ARCS; i++) {
      if (arcs[i].startTime < oldestTime) {
        oldestTime = arcs[i].startTime
        oldest = i
      }
    }
    return oldest
  }, [])

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime()

    // Spawn arcs for new attacks
    for (const attack of attacks) {
      if (processedRef.current.has(attack.id)) continue
      processedRef.current.add(attack.id)

      if (processedRef.current.size > 5000) {
        const ids = Array.from(processedRef.current)
        for (let i = 0; i < 2500; i++) {
          processedRef.current.delete(ids[i])
        }
      }

      const slot = getNextSlot()
      const curve = createArcCurve(
        attack.sourceLat,
        attack.sourceLon,
        attack.targetLat,
        attack.targetLon
      )

      arcsRef.current[slot] = {
        active: true,
        startTime: now,
        curve,
        type: attack.type,
      }

      // Update line geometry
      const line = linesRef.current[slot]
      if (line) {
        const points = curve.getPoints(ARC_SEGMENTS)
        const positions = new Float32Array(points.length * 3)
        const progress = new Float32Array(points.length)

        for (let j = 0; j < points.length; j++) {
          positions[j * 3] = points[j].x
          positions[j * 3 + 1] = points[j].y
          positions[j * 3 + 2] = points[j].z
          progress[j] = j / (points.length - 1)
        }

        line.geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3)
        )
        line.geometry.setAttribute(
          'arcProgress',
          new THREE.BufferAttribute(progress, 1)
        )

        const mat = line.material as THREE.ShaderMaterial
        mat.uniforms.uColor.value.copy(getAttackColor(attack.type))
        mat.uniforms.uDrawProgress.value = 0
        mat.uniforms.uFadeProgress.value = 0
        line.visible = true
      }
    }

    // Update all active arcs
    for (let i = 0; i < MAX_ARCS; i++) {
      const arc = arcsRef.current[i]
      if (!arc?.active) continue

      const elapsed = now - arc.startTime
      if (elapsed > TOTAL_DURATION) {
        arc.active = false
        linesRef.current[i].visible = false
        headsRef.current[i].visible = false
        continue
      }

      const line = linesRef.current[i]
      const head = headsRef.current[i]
      const mat = line.material as THREE.ShaderMaterial

      if (elapsed < DRAW_DURATION) {
        const t = elapsed / DRAW_DURATION
        mat.uniforms.uDrawProgress.value = t
        mat.uniforms.uFadeProgress.value = 0

        if (arc.curve) {
          const pos = arc.curve.getPointAt(Math.min(t, 0.999))
          head.position.copy(pos)
          head.visible = true
          ;(head.material as THREE.MeshBasicMaterial).color.copy(
            getAttackColor(arc.type)
          )
        }
      } else if (elapsed < DRAW_DURATION + HOLD_DURATION) {
        mat.uniforms.uDrawProgress.value = 1
        mat.uniforms.uFadeProgress.value = 0
        head.visible = false
      } else {
        mat.uniforms.uDrawProgress.value = 1
        mat.uniforms.uFadeProgress.value =
          (elapsed - DRAW_DURATION - HOLD_DURATION) / FADE_DURATION
        head.visible = false
      }
    }
  })

  return <group ref={groupRef} />
}
