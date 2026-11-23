import Link from 'next/link'
import { supabase, supabaseListo } from '@/lib/supabase'
import { RUBROS, colorSeguro, textoSobre, type Canal } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; rubro?: string }> }) {
  const { q = '', tipo = '', rubro = '' } = await searchParams
  let canales: Canal[] = []
  if (supabaseListo) {
    let query = supabase.from('canales').select('*').order('en_vivo', { ascending: false }).order('creado', { ascending: false }).limit(60)
    if (tipo === 'tienda' || tipo === 'persona') query = query.eq('tipo', tipo)
    if (RUBROS.includes(rubro)) query = query.eq('rubro', rubro)
    const term = q.replace(/[%,()]/g, ' ').trim().slice(0, 40)
    if (term) query = query.or(`nombre.ilike.%${term}%,ciudad.ilike.%${term}%,descripcion.ilike.%${term}%,lema.ilike.%${term}%`)
    const { data } = await query
    canales = (data as Canal[]) || []
  }
  const envivo = canales.filter((c) => c.en_vivo)
  const resto = canales.filter((c) => !c.en_vivo)
  const filtrando = !!(q || tipo || rubro)
  const chip = (href: string, t: string, activo: boolean) => (
    <Link key={t} href={href} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition ${activo ? 'bg-white text-black border-white' : 'border-white/15 bg-white/5 hover:bg-white/10'}`}>{t}</Link>
  )

  return (
    <main className="pb-28">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_20%_0%,rgba(225,29,72,0.35),transparent),radial-gradient(50%_50%_at_90%_20%,rgba(99,102,241,0.25),transparent)]" />
        <div className="max-w-5xl mx-auto px-4 pt-12 pb-10 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full bg-white/10 border border-white/10"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Venta en vivo, hecha en Argentina</span>
          <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Tu tienda, <span className="bg-gradient-to-r from-rose-400 to-orange-300 bg-clip-text text-transparent">en vivo</span>.<br />Vendé mientras te miran.
          </h1>
          <p className="mt-4 text-zinc-300 text-lg max-w-2xl mx-auto">
            Armá tu página de ventas en minutos, mostrá tus productos en directo y cobrá con tarjeta, transferencia, Lemon o efectivo. Sin comisiones por ahora.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link href="/panel" className="bg-brand hover:bg-brand-dark px-7 py-3.5 rounded-full font-bold text-lg shadow-lg shadow-rose-900/40">Crear mi tienda gratis</Link>
            <a href="#canales" className="px-7 py-3.5 rounded-full font-semibold text-lg border border-white/20 hover:bg-white/10">Ver tiendas</a>
          </div>
          <form className="mt-8 flex gap-2 max-w-xl mx-auto" action="/">
            <input name="q" defaultValue={q} placeholder="Buscar tienda, rubro o ciudad..." className="flex-1 bg-white/10 border border-white/15 rounded-full px-5 py-3 outline-none focus:border-white/40" />
            <button className="bg-white text-black px-6 rounded-full font-bold">Buscar</button>
          </form>
        </div>
      </section>

      {/* Filtros */}
      <section id="canales" className="max-w-6xl mx-auto px-4 scroll-mt-4">
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {chip('/', 'Todo', !filtrando)}
          {chip('/?tipo=tienda', '🛍️ Tiendas', tipo === 'tienda')}
          {chip('/?tipo=persona', '☕ Creadores', tipo === 'persona')}
          {RUBROS.slice(0, 8).map((r) => chip(`/?rubro=${encodeURIComponent(r)}`, r, rubro === r))}
        </div>

        {!supabaseListo && <p className="text-center text-amber-400 text-sm mt-6">Falta configurar Supabase (.env.local) para ver canales.</p>}
        {supabaseListo && canales.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <div className="text-5xl mb-3">🔎</div>
            {filtrando ? 'No encontramos canales con esa búsqueda.' : <>Todavía no hay tiendas. <Link href="/panel" className="underline text-white">Sé la primera</Link>.</>}
          </div>
        )}

        {envivo.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> En vivo ahora</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{envivo.map((c) => <Tarjeta key={c.id} c={c} />)}</div>
          </div>
        )}
        {resto.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-extrabold mb-3">{envivo.length ? 'Más tiendas y creadores' : 'Tiendas y creadores'}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{resto.map((c) => <Tarjeta key={c.id} c={c} />)}</div>
          </div>
        )}
      </section>

      {/* Cómo funciona */}
      <section className="max-w-5xl mx-auto px-4 mt-20">
        <h2 className="text-3xl font-extrabold text-center">Vender en vivo es fácil</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            ['1', '🎨', 'Armá tu página', 'Subí tu logo y portada, elegí tu color y cargá tus productos con talles y stock.'],
            ['2', '📡', 'Transmití en vivo', 'Mostrá tu mercadería desde el celular o por YouTube. Tus clientes ven, preguntan y compran.'],
            ['3', '💸', 'Cobrá como quieras', 'Tarjeta Visa/Mastercard, transferencia, Lemon, efectivo. La plata va directo a vos.'],
          ].map(([n, ico, t, d]) => (
            <div key={n} className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-brand flex items-center justify-center font-extrabold">{n}</span><span className="text-3xl">{ico}</span></div>
              <h3 className="font-extrabold text-xl mt-4">{t}</h3>
              <p className="text-zinc-400 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 mt-16">
        <div className="rounded-3xl p-8 sm:p-12 text-center bg-gradient-to-br from-rose-600 to-orange-500">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Empezá a vender hoy</h2>
          <p className="mt-2 text-white/90 max-w-xl mx-auto">Tu tienda online lista en minutos, sin costos de arranque y sin que nadie te censure.</p>
          <Link href="/panel" className="inline-block mt-6 bg-white text-black px-8 py-3.5 rounded-full font-extrabold text-lg">Crear mi tienda gratis</Link>
        </div>
      </section>
    </main>
  )
}

function Tarjeta({ c }: { c: Canal }) {
  const color = colorSeguro(c.color)
  return (
    <Link href={`/${c.slug}`} className="group block rounded-3xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 hover:-translate-y-0.5 transition">
      <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${color}, #0b0b10 90%)` }}>
        {c.portada
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.portada} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
          : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {c.en_vivo && <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-red-600 text-xs font-bold px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-white" />EN VIVO</span>}
        {c.rubro && <span className="absolute top-3 right-3 text-[11px] font-semibold bg-black/50 backdrop-blur px-2.5 py-1 rounded-full">{c.rubro}</span>}
      </div>
      <div className="px-4 pb-4 -mt-8 relative">
        <div className="w-16 h-16 rounded-full ring-4 ring-[#14141c] overflow-hidden flex items-center justify-center text-2xl font-extrabold" style={{ background: color, color: textoSobre(color) }}>
          {c.avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.avatar} alt={c.nombre} className="w-full h-full object-cover" />
            : c.nombre.slice(0, 1).toUpperCase()}
        </div>
        <div className="font-extrabold text-lg mt-2 leading-tight">{c.nombre}</div>
        <div className="text-sm text-zinc-400 line-clamp-2 min-h-[2.5rem]">{c.lema || c.descripcion || (c.tipo === 'tienda' ? 'Tienda online' : 'Creador')}</div>
        <div className="text-xs text-zinc-500 mt-1">{c.ciudad ? `📍 ${c.ciudad}` : c.tipo === 'tienda' ? '🛍️ Tienda' : '☕ Creador'}</div>
      </div>
    </Link>
  )
}
