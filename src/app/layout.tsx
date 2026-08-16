import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'IM ÉNERGIE CRM',
    template: '%s — IM ÉNERGIE CRM',
  },
  description: 'IM ÉNERGIE — Système de gestion interne',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
  robots: 'noindex, nofollow',   // CRM privé — jamais indexé
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-surface-100 antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0B1F3A',
              color: '#F7F4EF',
              border: '1px solid rgba(217,164,65,.2)',
              borderRadius: '8px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
