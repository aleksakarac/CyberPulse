'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('@/canvas/Scene'), { ssr: false })
const HUD = dynamic(() => import('@/hud/HUD'), { ssr: false })

function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050a12]">
      <div className="relative">
        <div className="w-16 h-16 border-2 border-cyan-900/30 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-2 border-t-cyan-400 rounded-full animate-spin" />
      </div>
      <h1 className="mt-6 text-xl font-mono text-cyan-400 tracking-widest uppercase">
        CyberPulse
      </h1>
      <p className="mt-2 text-xs text-gray-600 tracking-wider">
        Initializing threat monitor...
      </p>
    </div>
  )
}

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 opacity-[0.03]"
      style={{
        background:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
      }}
    />
  )
}

export default function Home() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="h-screen w-screen relative overflow-hidden">
      {loading && <LoadingScreen />}
      <Scene />
      <HUD />
      <ScanlineOverlay />
    </main>
  )
}
