'use client'

import { useState } from 'react'

export default function TimeControls() {
  const [speed, setSpeed] = useState(1)
  const [isLive, setIsLive] = useState(true)

  return (
    <div className="absolute bottom-12 right-4 z-10 flex items-center gap-3 px-3 py-2 bg-[rgba(5,10,18,0.8)] backdrop-blur-sm border border-cyan-900/20 rounded-lg">
      <button
        onClick={() => setIsLive(!isLive)}
        className={`text-xs px-2 py-1 rounded ${
          isLive
            ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-700/50'
            : 'bg-gray-800/50 text-gray-400 border border-gray-700/30'
        }`}
      >
        {isLive ? 'LIVE' : 'PAUSED'}
      </button>

      <div className="flex items-center gap-1">
        {[0.5, 1, 2, 5, 10].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`text-xs px-1.5 py-0.5 rounded ${
              speed === s
                ? 'text-cyan-400 bg-cyan-900/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
