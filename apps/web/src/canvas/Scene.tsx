'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import Globe from './Globe'
import Atmosphere from './Atmosphere'
import Stars from './Stars'
import AttackArcs from './AttackArcs'
import ImpactRipple from './ImpactRipple'
import { useAttackStore } from '@/lib/attackStore'
import { useAttackStream } from '@/hooks/useAttackStream'
import { useFallbackMockData } from '@/hooks/useFallbackMockData'

function SceneContent() {
  useAttackStream()
  useFallbackMockData()

  const attacks = useAttackStore((s) => s.attacks)

  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[5, 3, 5]} intensity={0.7} color="#aaccff" />
      <directionalLight position={[-3, -1, -5]} intensity={0.15} color="#4466aa" />

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
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          intensity={1.0}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0008, 0.0008] as any}
          radialModulation={true}
          modulationOffset={0.5}
        />
        <Noise
          blendFunction={BlendFunction.SOFT_LIGHT}
          opacity={0.04}
        />
        <Vignette offset={0.35} darkness={0.9} />
      </EffectComposer>
    </>
  )
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: '#050a12' }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}
