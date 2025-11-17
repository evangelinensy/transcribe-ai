import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Design Challenge Coach',
  description: '60-minute mock design interview with AI coaching',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
