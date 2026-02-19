'use client'

import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('@/canvas/Scene'), { ssr: false })
const HUD = dynamic(() => import('@/hud/HUD'), { ssr: false })

export default function Home() {
  return (
    <main className="h-screen w-screen relative overflow-hidden">
      <Scene />
      <HUD />
    </main>
  )
}
