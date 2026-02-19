import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CyberPulse — Global Cyber Threat Monitor',
  description: 'Real-time 3D visualization of global cyber threat activity',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
