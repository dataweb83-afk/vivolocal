import './globals.css'
import Link from 'next/link'
import type { Viewport } from 'next'
import NavApp from '@/components/NavApp'

export const metadata = {
  title: 'VivoLocal – Vendé en vivo y armá tu tienda online',
  description: 'Armá tu página de ventas, mostrá tu mercadería en vivo y cobrá con tarjeta, transferencia, Lemon o efectivo.',
  appleWebApp: { capable: true, title: 'VivoLocal', statusBarStyle: 'black-translucent' as const },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport: Viewport = { themeColor: '#0b0b10', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b10]/85 backdrop-blur px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <span className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center"><span className="w-3 h-3 rounded-full bg-white" /></span>
            <span>Vivo<span className="text-brand">Local</span></span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/ingresar" className="hidden sm:block text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/10">Ingresar</Link>
            <Link href="/panel" className="text-sm bg-brand hover:bg-brand-dark px-5 py-2 rounded-full font-bold">Quiero vender</Link>
          </nav>
        </header>
        {children}
        <footer className="border-t border-white/10 mt-10 px-4 py-8 pb-28 sm:pb-8 text-center text-xs text-zinc-500 space-y-2">
          <div className="font-bold text-zinc-300">VivoLocal</div>
          <p>Cada vendedor es responsable de lo que publica y vende. VivoLocal es solo la plataforma.</p>
          <Link href="/terminos" className="underline">Términos y condiciones</Link>
        </footer>
        <NavApp />
      </body>
    </html>
  )
}
