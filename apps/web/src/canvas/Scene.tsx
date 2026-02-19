'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import Globe from './Globe'
import Atmosphere from './Atmosphere'
import Stars from './Stars'
import AttackArcs from './AttackArcs'
import ImpactRipple from './ImpactRipple'
import { useAttackStore } from '@/lib/attackStore'
import { useAttackStream } from '@/hooks/useAttackStream'
import { useFallbackMockData } from '@/hooks/useFallbackMockData'

export default function Scene() {
  // Connect to WebSocket — falls back to mock data if server unavailable
  useAttackStream()
  useFallbackMockData()

  const attacks = useAttackStore((s) => s.attacks)

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
