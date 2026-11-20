import Link from 'next/link'
import { supabase, supabaseListo } from '@/lib/supabase'
import type { Canal } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let canales: Canal[] = []
  if (supabaseListo) {
    const { data } = await supabase.from('canales').select('*').order('en_vivo', { ascending: false }).order('creado', { ascending: false }).limit(60)
    canales = (data as Canal[]) || []
  }
  const envivo = canales.filter((c) => c.en_vivo)
  const resto = canales.filter((c) => !c.en_vivo)

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <section className="text-center py-8">
        <h1 className="text-3xl md:text-5xl font-extrabold">
          Vendé en vivo. <span className="text-brand">Recibí cafecitos.</span>
        </h1>
        <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
          Tiendas con catálogo, zonas de entrega y pagos propios. Personas que suben fotos, videos y transmiten.
          Cada uno es responsable de lo que publica y vende.
        </p>
        <Link href="/panel" className="inline-block mt-5 bg-brand hover:bg-brand-dark px-6 py-3 rounded-full font-bold">Crear mi tienda o canal</Link>
      </section>

      {!supabaseListo && <p className="text-center text-amber-400 text-sm">Falta configurar Supabase (.env.local) para ver canales.</p>}
      {supabaseListo && canales.length === 0 && <p className="text-center text-zinc-400">Todavía no hay canales. ¡Sé el primero!</p>}

      {envivo.length > 0 && (<>
        <h2 className="text-lg font-bold mb-3">🔴 En vivo ahora</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">{envivo.map((c) => <Tarjeta key={c.id} c={c} />)}</div>
      </>)}
      {resto.length > 0 && (<>
        <h2 className="text-lg font-bold mb-3">Canales</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{resto.map((c) => <Tarjeta key={c.id} c={c} />)}</div>
      </>)}
    </main>
  )
}

function Tarjeta({ c }: { c: Canal }) {
  return (
    <Link href={`/${c.slug}`} className="block rounded-xl bg-white/5 hover:bg-white/10 p-4 border border-white/10">
      <div className="aspect-video rounded-lg bg-gradient-to-br from-brand/40 to-zinc-900 flex items-center justify-center text-4xl mb-3 relative">
        {c.tipo === 'tienda' ? '🛍️' : '☕'}
        {c.en_vivo && <span className="absolute top-2 left-2 bg-brand text-xs font-bold px-2 py-0.5 rounded">EN VIVO</span>}
      </div>
      <div className="font-bold">{c.nombre}</div>
      <div className="text-sm text-zinc-400 line-clamp-2">{c.descripcion || (c.ciudad ?? '')}</div>
    </Link>
  )
}
