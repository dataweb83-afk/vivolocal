'use client'
import { useEffect, useState } from 'react'
import { embedUrl } from '@/lib/embed'
import { supabase } from '@/lib/supabase'
import Chat from './Chat'
import VideoVivo from './VideoVivo'
import { FORMAS_PAGO, colorSeguro, pesos, textoSobre, type Canal, type Producto, type Publicacion, type Zona } from '@/lib/data'

const input = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--c)]'
const boton = 'bg-[var(--c)] text-[var(--ct)] font-bold hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40'

type Compra = { tipo: 'compra'; producto: Producto; talle?: string } | { tipo: 'propina'; monto: number }

const ICONO_PAGO: Record<string, string> = { mercadopago: '💳', efectivo: '💵', transferencia: '🏦', retiro: '🏪', billetera: '📱' }

export default function CanalVista({ canal, productos, zonas, publicaciones }: { canal: Canal; productos: Producto[]; zonas: Zona[]; publicaciones: Publicacion[] }) {
  const color = colorSeguro(canal.color)
  const tema = { '--c': color, '--ct': textoSobre(color) } as React.CSSProperties
  const [monto, setMonto] = useState(1000)
  const [compra, setCompra] = useState<Compra | null>(null)
  const [ficha, setFicha] = useState<Producto | null>(null)
  const [host, setHost] = useState('')
  const [copiado, setCopiado] = useState(false)
  useEffect(() => { setHost(location.hostname) }, [])
  const src = host ? embedUrl(canal.vivo_url, host) : null
  const aceptaMP = canal.formas_pago.includes('mercadopago')
  const puedeComprar = canal.formas_pago.length > 0

  async function denunciar() {
    const motivo = prompt('¿Por qué denunciás este canal?')
    if (!motivo) return
    await supabase.from('denuncias').insert({ canal_id: canal.id, motivo })
    alert('Gracias, lo vamos a revisar.')
  }

  async function compartir() {
    const url = location.href
    try {
      if (navigator.share) await navigator.share({ title: canal.nombre, text: canal.lema || canal.descripcion || '', url })
      else { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }
    } catch {}
  }

  const secciones = [
    productos.length > 0 && ['productos', 'Productos'],
    publicaciones.length > 0 && ['galeria', 'Fotos y videos'],
    ['info', 'Envíos y pagos'],
  ].filter(Boolean) as [string, string][]

  return (
    <div style={tema} className="pb-32">
      {/* Portada */}
      <div className="relative h-44 sm:h-64 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, #0b0b10 85%)` }}>
        {canal.portada && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={canal.portada} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b10] via-transparent to-black/20" />
      </div>

      {/* Perfil */}
      <section className="max-w-5xl mx-auto px-4 -mt-14 sm:-mt-16 relative">
        <div className="flex items-end gap-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-[#0b0b10] overflow-hidden shrink-0 flex items-center justify-center text-4xl bg-[var(--c)] text-[var(--ct)] font-extrabold shadow-xl">
            {canal.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={canal.avatar} alt={canal.nombre} className="w-full h-full object-cover" />
              : canal.nombre.slice(0, 1).toUpperCase()}
          </div>
          {canal.en_vivo && <span className="mb-2 inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse"><span className="w-2 h-2 rounded-full bg-white" />EN VIVO</span>}
        </div>

        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">{canal.nombre}</h1>
        {(canal.lema || canal.descripcion) && <p className="text-zinc-300 mt-1 max-w-2xl">{canal.lema || canal.descripcion}</p>}
        <div className="flex flex-wrap gap-2 mt-3 text-xs text-zinc-300">
          {canal.rubro && <span className="px-2.5 py-1 rounded-full bg-white/10">{canal.rubro}</span>}
          {canal.ciudad && <span className="px-2.5 py-1 rounded-full bg-white/10">📍 {canal.ciudad}</span>}
          <span className="px-2.5 py-1 rounded-full bg-white/10">{canal.tipo === 'tienda' ? '🛍️ Tienda' : '☕ Creador'}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {canal.whatsapp && <a href={`https://wa.me/${canal.whatsapp}`} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold">💬 WhatsApp</a>}
          {canal.instagram && <a href={`https://instagram.com/${canal.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-semibold">📷 {canal.instagram.startsWith('@') ? canal.instagram : '@' + canal.instagram}</a>}
          <button onClick={compartir} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-semibold">{copiado ? '¡Link copiado!' : '🔗 Compartir'}</button>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4">
        {/* Vivo */}
        {canal.en_vivo && (
          <section className="mt-6 grid lg:grid-cols-[1fr_330px] gap-3">
            <div className="aspect-video rounded-2xl bg-black border border-white/10 relative overflow-hidden flex items-center justify-center shadow-2xl">
              {canal.vivo_modo === 'externo'
                ? (src ? <iframe src={src} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen title={`Vivo de ${canal.nombre}`} /> : <p className="text-zinc-500 text-sm">Cargando el vivo...</p>)
                : <VideoVivo canalId={canal.id} />}
            </div>
            <Chat canalId={canal.id} />
          </section>
        )}

        {/* Navegación de secciones */}
        {secciones.length > 1 && (
          <nav className="sticky top-[57px] z-30 -mx-4 px-4 py-2 mt-6 bg-[#0b0b10]/90 backdrop-blur flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
            {secciones.map(([id, t]) => <a key={id} href={`#${id}`} className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm whitespace-nowrap">{t}</a>)}
          </nav>
        )}

        {/* Cafecito */}
        {aceptaMP && (
          <section className="mt-6 p-4 sm:p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02]">
            <div className="font-bold text-lg">☕ Invitale un cafecito a {canal.nombre}</div>
            <p className="text-sm text-zinc-400 mb-3">Apoyá lo que hace con un monto a tu elección.</p>
            <div className="flex gap-2 flex-wrap items-center">
              {[500, 1000, 2000, 5000].map((m) => (
                <button key={m} onClick={() => setMonto(m)} className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${monto === m ? 'bg-[var(--c)] text-[var(--ct)] border-transparent' : 'border-white/20 hover:border-white/40'}`}>{pesos(m)}</button>
              ))}
              <button onClick={() => setCompra({ tipo: 'propina', monto })} className={`${boton} sm:ml-auto px-5 py-2.5 rounded-full text-sm`}>Apoyar con {pesos(monto)}</button>
            </div>
          </section>
        )}

        {/* Productos */}
        {productos.length > 0 && (
          <section id="productos" className="mt-8 scroll-mt-28">
            <h2 className="text-2xl font-extrabold mb-4">Productos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {productos.map((p) => (
                <button key={p.id} onClick={() => setFicha(p)} className="group text-left rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-[var(--c)] transition">
                  <div className="aspect-[4/5] bg-white/5 relative overflow-hidden">
                    {p.imagenes[0]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.imagenes[0]} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🛍️</div>}
                    {p.stock === 0 && <span className="absolute top-2 left-2 bg-black/80 text-xs font-bold px-2 py-1 rounded-full">Agotado</span>}
                    {p.stock > 0 && p.stock <= 3 && <span className="absolute top-2 left-2 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">¡Últimas {p.stock}!</span>}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">{p.nombre}</div>
                    <div className="mt-1 text-lg font-extrabold text-[var(--c)]">{pesos(p.precio)}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Fotos y videos */}
        {publicaciones.length > 0 && (
          <section id="galeria" className="mt-10 scroll-mt-28">
            <h2 className="text-2xl font-extrabold mb-4">Fotos y videos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {publicaciones.map((p) => (
                <div key={p.id} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  {p.tipo === 'foto'
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.url} alt={p.titulo} className="aspect-square object-cover w-full" />
                    : <video src={p.url} controls preload="metadata" className="aspect-square object-cover w-full bg-black" />}
                  {(p.titulo || p.precio) && <div className="p-3 text-sm">{p.titulo} {p.precio && <b className="text-[var(--c)]">{pesos(p.precio)}</b>}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Info */}
        <section id="info" className="mt-10 scroll-mt-28 grid md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="font-bold mb-2">🚚 Envíos</div>
            {zonas.length === 0 ? <p className="text-sm text-zinc-400">Consultá por WhatsApp.</p> : zonas.map((z) => (
              <div key={z.id} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                <span>{z.nombre}{z.demora && <span className="text-zinc-500"> · {z.demora}</span>}</span><b>{z.costo ? pesos(z.costo) : 'Gratis'}</b>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="font-bold mb-2">💳 Formas de pago</div>
            {canal.formas_pago.length === 0 ? <p className="text-sm text-zinc-400">A coordinar con el vendedor.</p> : canal.formas_pago.map((k) => (
              <div key={k} className="text-sm py-1">{ICONO_PAGO[k]} {FORMAS_PAGO[k]}</div>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="font-bold mb-2">📞 Contacto</div>
            {canal.whatsapp ? <a href={`https://wa.me/${canal.whatsapp}`} target="_blank" rel="noreferrer" className="text-sm underline text-green-400">Escribir por WhatsApp</a> : <p className="text-sm text-zinc-400">Sin WhatsApp cargado.</p>}
            {canal.ciudad && <p className="text-sm text-zinc-400 mt-2">📍 {canal.ciudad}</p>}
            <button onClick={denunciar} className="text-xs text-zinc-500 underline mt-4 block">Denunciar este canal</button>
          </div>
        </section>

        <p className="text-xs text-zinc-600 mt-10">
          El contenido, los productos, precios, envíos y pagos de este canal son responsabilidad exclusiva de quien lo publica. VivoLocal es solo la plataforma.
        </p>
      </main>

      {/* WhatsApp flotante */}
      {canal.whatsapp && (
        <a href={`https://wa.me/${canal.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="fixed right-4 bottom-20 sm:bottom-6 z-40 w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 text-3xl flex items-center justify-center shadow-2xl">💬</a>
      )}

      {ficha && <FichaProducto p={ficha} puedeComprar={puedeComprar} onCerrar={() => setFicha(null)} onComprar={(talle) => { setCompra({ tipo: 'compra', producto: ficha, talle }); setFicha(null) }} />}
      {compra && <Checkout canal={canal} zonas={zonas} compra={compra} onCerrar={() => setCompra(null)} />}
    </div>
  )
}

function FichaProducto({ p, puedeComprar, onCerrar, onComprar }: { p: Producto; puedeComprar: boolean; onCerrar: () => void; onComprar: (talle?: string) => void }) {
  const [i, setI] = useState(0)
  const [talle, setTalle] = useState<string | undefined>(p.talles[0])
  const agotado = p.stock < 1
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-zinc-900 w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[94vh] overflow-y-auto grid sm:grid-cols-2">
        <div className="bg-black">
          <div className="aspect-square relative">
            {p.imagenes[i]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.imagenes[i]} alt={p.nombre} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">🛍️</div>}
          </div>
          {p.imagenes.length > 1 && (
            <div className="flex gap-2 p-2 overflow-x-auto">
              {p.imagenes.map((u, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" onClick={() => setI(k)} className={`w-14 h-14 object-cover rounded-lg cursor-pointer ${k === i ? 'ring-2 ring-[var(--c)]' : 'opacity-60'}`} />
              ))}
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col">
          <button onClick={onCerrar} className="self-end text-zinc-400 text-2xl leading-none -mt-1" aria-label="Cerrar">×</button>
          <h3 className="text-2xl font-extrabold leading-tight">{p.nombre}</h3>
          <div className="text-3xl font-extrabold text-[var(--c)] mt-1">{pesos(p.precio)}</div>
          {p.descripcion && <p className="text-sm text-zinc-300 mt-3 whitespace-pre-line">{p.descripcion}</p>}
          {p.talles.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Talle</div>
              <div className="flex gap-2 flex-wrap">
                {p.talles.map((t) => <button key={t} onClick={() => setTalle(t)} className={`min-w-11 px-3 py-2 rounded-lg text-sm font-semibold border ${talle === t ? 'bg-[var(--c)] text-[var(--ct)] border-transparent' : 'border-white/20'}`}>{t}</button>)}
              </div>
            </div>
          )}
          <div className="text-sm mt-4 text-zinc-400">{agotado ? 'Sin stock por ahora' : p.stock <= 3 ? `¡Quedan solo ${p.stock}!` : 'Disponible'}</div>
          <button disabled={agotado || !puedeComprar} onClick={() => onComprar(talle)} className={`${boton} mt-auto sm:mt-6 py-3.5 rounded-xl text-lg`}>
            {agotado ? 'Agotado' : puedeComprar ? 'Comprar ahora' : 'Consultá por WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Checkout({ canal, zonas, compra, onCerrar }: { canal: Canal; zonas: Zona[]; compra: Compra; onCerrar: () => void }) {
  const esCompra = compra.tipo === 'compra'
  const pagos = esCompra ? canal.formas_pago : ['mercadopago']
  const [f, setF] = useState({ nombre: '', contacto: '', talle: esCompra ? compra.talle || compra.producto.talles[0] || '' : '', zonaId: zonas[0]?.id || '', direccion: '', pago: pagos[0] || '' })
  const [estado, setEstado] = useState<'form' | 'enviando' | 'listo'>('form')
  const [error, setError] = useState('')
  const [info, setInfo] = useState<{ pago: string; total: number } | null>(null)

  const precio = esCompra ? compra.producto.precio : compra.monto
  const zona = zonas.find((z) => z.id === f.zonaId)
  const necesitaEnvio = esCompra && zonas.length > 0 && f.pago !== 'retiro'
  const total = precio + (necesitaEnvio ? zona?.costo ?? 0 : 0)

  async function confirmar(e: React.FormEvent) {
    e.preventDefault(); setError(''); setEstado('enviando')
    const r = await fetch('/api/pagar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canalId: canal.id, tipo: compra.tipo, productoId: esCompra ? compra.producto.id : undefined, monto: esCompra ? undefined : compra.monto,
        talle: f.talle, zonaId: necesitaEnvio ? f.zonaId : undefined, direccion: f.direccion, nombre: f.nombre, contacto: f.contacto, pago: f.pago,
      }),
    })
    const j = await r.json()
    if (!r.ok) { setError(j.error || 'Error'); setEstado('form'); return }
    if (j.url) { window.location.href = j.url; return }
    setInfo({ pago: f.pago, total: j.total }); setEstado('listo')
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto">
        {estado === 'listo' && info ? (
          <div className="text-center space-y-3">
            <div className="text-5xl">✅</div>
            <h3 className="font-extrabold text-xl">¡Pedido enviado!</h3>
            <p className="text-sm text-zinc-400">Total: <b className="text-white">{pesos(info.total)}</b>. {info.pago === 'transferencia' && canal.alias_transferencia ? `Transferí a: ${canal.alias_transferencia}. ` : ''}El vendedor se va a contactar con vos.</p>
            {info.pago === 'billetera' && canal.billeteras && (
              <div className="text-left text-sm bg-white/5 rounded-xl p-3">
                <div className="text-xs text-zinc-400 mb-1">Pagá desde tu app a:</div>
                <pre className="whitespace-pre-wrap font-sans">{canal.billeteras}</pre>
                <div className="text-xs text-zinc-500 mt-2">Cuando pagues, avisale al vendedor por WhatsApp para que confirme tu pedido.</div>
              </div>
            )}
            {canal.whatsapp && <a href={`https://wa.me/${canal.whatsapp}`} target="_blank" rel="noreferrer" className="inline-block bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-bold">Escribirle por WhatsApp</a>}
            <button onClick={onCerrar} className="block mx-auto text-sm underline text-zinc-400">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={confirmar} className="space-y-2.5">
            <div className="flex justify-between items-start">
              <h3 className="font-extrabold text-xl leading-tight">{esCompra ? compra.producto.nombre : `Cafecito para ${canal.nombre}`}</h3>
              <button type="button" onClick={onCerrar} className="text-zinc-400 text-2xl leading-none" aria-label="Cerrar">×</button>
            </div>
            <input required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={input} placeholder="Tu nombre" />
            <input required value={f.contacto} onChange={(e) => setF({ ...f, contacto: e.target.value })} className={input} placeholder="WhatsApp o email" />
            {esCompra && compra.producto.talles.length > 0 && (
              <select value={f.talle} onChange={(e) => setF({ ...f, talle: e.target.value })} className={input}>{compra.producto.talles.map((t) => <option key={t}>{t}</option>)}</select>
            )}
            {esCompra && (
              <select value={f.pago} onChange={(e) => setF({ ...f, pago: e.target.value })} className={input}>{pagos.map((k) => <option key={k} value={k}>{FORMAS_PAGO[k]}</option>)}</select>
            )}
            {necesitaEnvio && (
              <>
                <select value={f.zonaId} onChange={(e) => setF({ ...f, zonaId: e.target.value })} className={input}>
                  {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre} · {z.costo ? pesos(z.costo) : 'Envío gratis'}{z.demora ? ` · ${z.demora}` : ''}</option>)}
                </select>
                <input required value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} className={input} placeholder="Dirección de entrega" />
              </>
            )}
            {f.pago === 'mercadopago' && (
              <div className="flex gap-1.5 items-center text-[10px] font-bold text-zinc-300">
                <span className="px-2 py-0.5 rounded bg-blue-700">VISA</span>
                <span className="px-2 py-0.5 rounded bg-orange-600">MASTERCARD</span>
                <span className="text-zinc-500 font-normal">crédito, débito o dinero en cuenta</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-lg pt-2"><span>Total</span><span>{pesos(total)}</span></div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button disabled={estado === 'enviando'} className={`${boton} w-full py-3.5 rounded-xl text-lg`}>
              {estado === 'enviando' ? 'Procesando...' : f.pago === 'mercadopago' ? 'Ir a pagar' : 'Confirmar pedido'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
