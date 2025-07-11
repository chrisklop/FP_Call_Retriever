import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Call Retriever',
  description: 'Clinic Call Metrics',
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