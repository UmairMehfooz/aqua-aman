import React from 'react'
import type { Metadata, Viewport } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: {
    default: 'Aqua Aman',
    template: '%s · Aqua Aman',
  },
  description: 'Aqua Aman — clean drinking water, delivered to your door.',
  icons: { icon: '/images/water-drop.png' },
}

export const viewport: Viewport = {
  themeColor: '#0369a1',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body className="antialiased">
        <main>{children}</main>
      </body>
    </html>
  )
}
