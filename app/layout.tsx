import './globals.css'
import Link from 'next/link'
import type { Viewport } from 'next'
import NavApp from '@/components/NavApp'

export const metadata = {
  title: 'VivoLocal – Vendé y recibí cafecitos en vivo',
  description: 'Tiendas que venden en vivo y personas que reciben apoyo de su comunidad.',
  appleWebApp: { capable: true, title: 'VivoLocal', statusBarStyle: 'black-translucent' as const },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport: Viewport = { themeColor: '#E11D48', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>
        <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold">
            Vivo<span className="text-brand">Local</span>
          </Link>
          <Link href="/panel" className="text-sm bg-brand hover:bg-brand-dark px-4 py-2 rounded-full font-semibold">
            Quiero vender
          </Link>
        </header>
        {children}
        <NavApp />
      </body>
    </html>
  )
}
