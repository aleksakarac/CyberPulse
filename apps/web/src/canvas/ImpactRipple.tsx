'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AttackEvent } from '@cyberpulse/shared'
import { latLonToVector3 } from '@/lib/geoUtils'
import { getAttackColor } from '@/lib/colorScale'
import rippleVert from '@/shaders/ripple.vert'
import rippleFrag from '@/shaders/ripple.frag'

const MAX_RIPPLES = 100
const RIPPLE_DURATION = 1.0
const RIPPLE_SIZE = 0.06

interface RippleState {
  active: boolean
  startTime: number
}

interface ImpactRippleProps {
  attacks: AttackEvent[]
}

export default function ImpactRipple({ attacks }: ImpactRippleProps) {
  const meshesRef = useRef<(THREE.Mesh | null)[]>(
    new Array(MAX_RIPPLES).fill(null)
  )
  const statesRef = useRef<RippleState[]>(
    Array.from({ length: MAX_RIPPLES }, () => ({
      active: false,
      startTime: 0,
    }))
  )
  const processedRef = useRef(new Set<string>())
  const nextSlotRef = useRef(0)

  const planeGeo = useMemo(
    () => new THREE.PlaneGeometry(RIPPLE_SIZE, RIPPLE_SIZE),
    []
  )

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime()

    // Spawn ripples for new attacks (delayed to match arc arrival)
    for (const attack of attacks) {
      const rippleId = `ripple-${attack.id}`
      if (processedRef.current.has(rippleId)) continue
      processedRef.current.add(rippleId)

      if (processedRef.current.size > 5000) {
        const ids = Array.from(processedRef.current)
        for (let i = 0; i < 2500; i++) {
          processedRef.current.delete(ids[i])
        }
      }

      const slot = nextSlotRef.current
      nextSlotRef.current = (nextSlotRef.current + 1) % MAX_RIPPLES

      statesRef.current[slot] = { active: true, startTime: now + 1.0 }

      const mesh = meshesRef.current[slot]
      if (mesh) {
        // Position on globe surface at target location
        const pos = latLonToVector3(attack.targetLat, attack.targetLon, 1.001)
        mesh.position.copy(pos)

        // Orient to face outward from globe center
        mesh.lookAt(pos.clone().multiplyScalar(2))

        const material = mesh.material as THREE.ShaderMaterial
        material.uniforms.uColor.value.copy(getAttackColor(attack.type))
        material.uniforms.uProgress.value = 0
      }
    }

    // Update all active ripples
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const state = statesRef.current[i]
      const mesh = meshesRef.current[i]
      if (!mesh) continue

      if (!state.active) {
        mesh.visible = false
        continue
      }

      const elapsed = now - state.startTime
      if (elapsed < 0) {
        // Not yet triggered (waiting for arc to arrive)
        mesh.visible = false
        continue
      }

      if (elapsed > RIPPLE_DURATION) {
        state.active = false
        mesh.visible = false
        continue
      }

      mesh.visible = true
      const material = mesh.material as THREE.ShaderMaterial
      material.uniforms.uProgress.value = elapsed / RIPPLE_DURATION
    }
  })

  return (
    <group>
      {Array.from({ length: MAX_RIPPLES }, (_, i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            meshesRef.current[i] = el
          }}
          geometry={planeGeo}
          visible={false}
        >
          <shaderMaterial
            vertexShader={rippleVert}
            fragmentShader={rippleFrag}
            uniforms={{
              uColor: { value: new THREE.Color('#ffffff') },
              uProgress: { value: 0 },
            }}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
