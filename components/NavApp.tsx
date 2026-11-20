'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavApp() {
  const path = usePathname()

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  const item = (href: string, icon: string, label: string) => (
    <Link href={href} className={`flex flex-col items-center text-xs gap-0.5 ${path === href ? 'text-brand' : 'text-zinc-400'}`}>
      <span className="text-xl">{icon}</span>{label}
    </Link>
  )

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur border-t border-white/10 flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden">
      {item('/', '🏠', 'Inicio')}
      {item('/panel', '🛍️', 'Mi canal')}
      {item('/terminos', '📄', 'Términos')}
    </nav>
  )
}
