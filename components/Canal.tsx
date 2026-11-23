'use client'
import { useEffect, useState } from 'react'
import { embedUrl } from '@/lib/embed'
import { supabase } from '@/lib/supabase'
import Chat from './Chat'
import VideoVivo from './VideoVivo'
import { FORMAS_PAGO, pesos, type Canal, type Producto, type Publicacion, type Zona } from '@/lib/data'

const input = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none'

type Compra = { tipo: 'compra'; producto: Producto } | { tipo: 'propina'; monto: number }

export default function CanalVista({ canal, productos, zonas, publicaciones }: { canal: Canal; productos: Producto[]; zonas: Zona[]; publicaciones: Publicacion[] }) {
  const [monto, setMonto] = useState(1000)
  const [compra, setCompra] = useState<Compra | null>(null)
  const aceptaMP = canal.formas_pago.includes('mercadopago')
  const [host, setHost] = useState('')
  useEffect(() => { setHost(location.hostname) }, [])
  const src = host ? embedUrl(canal.vivo_url, host) : null

  async function denunciar() {
    const motivo = prompt('¿Por qué denunciás este canal?')
    if (!motivo) return
    await supabase.from('denuncias').insert({ canal_id: canal.id, motivo })
    alert('Gracias, lo vamos a revisar.')
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-28">
      <div className="grid lg:grid-cols-[1fr_320px] gap-3">
      <div className="aspect-video rounded-xl bg-black border border-white/10 flex items-center justify-center relative overflow-hidden">
        {canal.en_vivo ? (
          <>
            <span className="absolute top-3 left-3 z-10 bg-brand text-xs font-bold px-2 py-1 rounded">🔴 EN VIVO</span>
            {canal.vivo_modo === 'externo'
              ? (src ? <iframe src={src} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen title={`Vivo de ${canal.nombre}`} /> : <p className="text-zinc-500 text-sm">Cargando el vivo...</p>)
              : <VideoVivo canalId={canal.id} />}
          </>
        ) : (
          <p className="text-zinc-500">No está transmitiendo ahora</p>
        )}
      </div>
      <Chat canalId={canal.id} />
      </div>

      <div className="flex items-start justify-between mt-3">
        <div>
          <h1 className="text-2xl font-bold">{canal.nombre}</h1>
          <p className="text-zinc-400 text-sm">{canal.descripcion}</p>
          {canal.ciudad && <p className="text-zinc-500 text-xs mt-1">📍 {canal.ciudad}</p>}
        </div>
        <div className="flex flex-col gap-1 items-end">
          {canal.whatsapp && <a href={`https://wa.me/${canal.whatsapp}`} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">WhatsApp</a>}
          <button onClick={denunciar} className="text-xs text-zinc-500 underline">Denunciar</button>
        </div>
      </div>

      {aceptaMP && (
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="font-semibold mb-2">☕ Invitale un cafecito</div>
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000, 5000].map((m) => (
              <button key={m} onClick={() => setMonto(m)} className={`px-3 py-1.5 rounded-full text-sm border ${monto === m ? 'bg-brand border-brand' : 'border-white/20'}`}>{pesos(m)}</button>
            ))}
            <button onClick={() => setCompra({ tipo: 'propina', monto })} className="ml-auto bg-brand hover:bg-brand-dark px-4 py-1.5 rounded-full font-semibold text-sm">Apoyar con {pesos(monto)}</button>
          </div>
        </div>
      )}

      {productos.length > 0 && (
        <>
          <h2 className="font-bold mt-6 mb-3">🛍️ Productos</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {productos.map((p) => (
              <div key={p.id} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.imagenes[0] ? <img src={p.imagenes[0]} alt={p.nombre} className="w-24 h-24 object-cover rounded-lg" /> : <div className="w-24 h-24 rounded-lg bg-white/10" />}
                <div className="flex-1">
                  <div className="font-semibold">{p.nombre}</div>
                  <div className="text-brand font-bold">{pesos(p.precio)}</div>
                  <div className="text-xs text-zinc-400">{p.stock === 0 ? 'Sin stock' : p.stock <= 3 ? `¡Quedan ${p.stock}!` : `${p.stock} disponibles`}</div>
                  <button disabled={p.stock < 1 || canal.formas_pago.length === 0} onClick={() => setCompra({ tipo: 'compra', producto: p })} className="mt-2 bg-brand hover:bg-brand-dark px-3 py-1 rounded-full text-sm font-semibold disabled:opacity-40">Comprar ya</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {publicaciones.length > 0 && (
        <>
          <h2 className="font-bold mt-6 mb-3">📸 Fotos y videos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {publicaciones.map((p) => (
              <div key={p.id} className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.tipo === 'foto' ? <img src={p.url} alt={p.titulo} className="aspect-square object-cover w-full" /> : <video src={p.url} controls preload="metadata" className="aspect-square object-cover w-full" />}
                {(p.titulo || p.precio) && <div className="p-2 text-xs">{p.titulo} {p.precio && <b className="text-brand">{pesos(p.precio)}</b>}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-zinc-600 mt-10">
        El contenido, los productos, precios, envíos y pagos de este canal son responsabilidad exclusiva de quien lo publica. VivoLocal es solo la plataforma.
      </p>

      {compra && <Checkout canal={canal} zonas={zonas} compra={compra} onCerrar={() => setCompra(null)} />}
    </main>
  )
}

function Checkout({ canal, zonas, compra, onCerrar }: { canal: Canal; zonas: Zona[]; compra: Compra; onCerrar: () => void }) {
  const esCompra = compra.tipo === 'compra'
  const pagos = esCompra ? canal.formas_pago : ['mercadopago']
  const [f, setF] = useState({ nombre: '', contacto: '', talle: esCompra ? compra.producto.talles[0] || '' : '', zonaId: zonas[0]?.id || '', direccion: '', pago: pagos[0] || '' })
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
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-zinc-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        {estado === 'listo' && info ? (
          <div className="text-center space-y-3">
            <div className="text-4xl">✅</div>
            <h3 className="font-bold text-lg">¡Pedido enviado!</h3>
            <p className="text-sm text-zinc-400">Total: {pesos(info.total)}. {info.pago === 'transferencia' && canal.alias_transferencia ? `Transferí a: ${canal.alias_transferencia}. ` : ''}El vendedor se va a contactar con vos.</p>
            {info.pago === 'billetera' && canal.billeteras && (
              <div className="text-left text-sm bg-white/5 rounded-lg p-3">
                <div className="text-xs text-zinc-400 mb-1">Pagá desde tu app a:</div>
                <pre className="whitespace-pre-wrap font-sans">{canal.billeteras}</pre>
                <div className="text-xs text-zinc-500 mt-2">Cuando pagues, avisale al vendedor por WhatsApp para que confirme tu pedido.</div>
              </div>
            )}
            {canal.whatsapp && <a href={`https://wa.me/${canal.whatsapp}`} target="_blank" rel="noreferrer" className="inline-block bg-green-600 px-4 py-2 rounded-full text-sm font-semibold">Escribirle por WhatsApp</a>}
            <button onClick={onCerrar} className="block mx-auto text-sm underline text-zinc-400">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={confirmar} className="space-y-2">
            <h3 className="font-bold text-lg">{esCompra ? compra.producto.nombre : `Cafecito para ${canal.nombre}`}</h3>
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
            <div className="flex justify-between font-bold pt-2"><span>Total</span><span>{pesos(total)}</span></div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button disabled={estado === 'enviando'} className="w-full bg-brand hover:bg-brand-dark py-2.5 rounded-lg font-semibold disabled:opacity-50">
              {estado === 'enviando' ? '...' : f.pago === 'mercadopago' ? 'Ir a pagar' : 'Confirmar pedido'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
