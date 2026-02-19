'use client'

import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import type { AttackEvent } from '@cyberpulse/shared'
import Globe from './Globe'
import Atmosphere from './Atmosphere'
import Stars from './Stars'
import AttackArcs from './AttackArcs'
import ImpactRipple from './ImpactRipple'
import { generateAttack } from '@/lib/mockAttacks'

// Keep a rolling window of recent attacks
const MAX_VISIBLE_ATTACKS = 500

export default function Scene() {
  const [attacks, setAttacks] = useState<AttackEvent[]>([])

  // Mock attack generator — will be replaced by WebSocket
  useEffect(() => {
    const baseInterval = setInterval(() => {
      const count = Math.random() < 0.1 ? Math.floor(Math.random() * 8) + 3 : 1
      setAttacks((prev) => {
        const newAttacks = Array.from({ length: count }, () => generateAttack())
        const combined = [...prev, ...newAttacks]
        return combined.slice(-MAX_VISIBLE_ATTACKS)
      })
    }, 400)

    // Occasional burst (DDoS simulation)
    const burstInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const burst = Array.from(
          { length: Math.floor(Math.random() * 15) + 10 },
          () => generateAttack()
        )
        // Override type to DDoS for burst
        for (const a of burst) a.type = 'ddos'
        setAttacks((prev) => [...prev, ...burst].slice(-MAX_VISIBLE_ATTACKS))
      }
    }, 8000)

    return () => {
      clearInterval(baseInterval)
      clearInterval(burstInterval)
    }
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#050a12' }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} />

      <Globe />
      <Atmosphere />
      <Stars />
      <AttackArcs attacks={attacks} />
      <ImpactRipple attacks={attacks} />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.4}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={1.5}
        maxDistance={5}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.2}
        />
        <Vignette offset={0.3} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  )
}
