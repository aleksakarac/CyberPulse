'use client'

import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('@/canvas/Scene'), { ssr: false })

export default function Home() {
  return (
    <main className="h-screen w-screen relative">
      <Scene />
    </main>
  )
}
