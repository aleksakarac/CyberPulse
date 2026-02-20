'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import atmosphereVert from '@/shaders/atmosphere.vert'
import atmosphereFrag from '@/shaders/atmosphere.frag'

export default function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVert,
        fragmentShader: atmosphereFrag,
        uniforms: {
          uColor: { value: new THREE.Color('#4da6ff') },
          uIntensity: { value: 0.7 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  )

  return (
    <mesh material={material}>
      <sphereGeometry args={[1.12, 64, 64]} />
    </mesh>
  )
}
