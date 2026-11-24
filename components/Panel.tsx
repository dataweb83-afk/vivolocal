'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, supabaseListo } from '@/lib/supabase'
import { subirArchivo } from '@/lib/subir'
import Emisor from './Emisor'
import { vivoExterno } from '@/lib/embed'
import QRCode from 'qrcode'
import { COBRO_ALIAS, COBRO_WHATSAPP, COLORES, DIAS_ABONO, PRECIO_ABONO, PRECIO_PACK, HORAS_PACK_VIDEO, HORAS_VIVO_GRATIS, RUBROS, colorSeguro, estadoPlan, horasTope, minutosUsados, textoSobre } from '@/lib/data'
import { FORMAS_PAGO, pesos, slugify, type Canal, type Producto, type Publicacion, type Zona } from '@/lib/data'

type Tab = 'inicio' | 'plan' | 'diseno' | 'perfil' | 'productos' | 'publicaciones' | 'zonas' | 'pedidos'

const input = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none'
const btn = 'bg-brand hover:bg-brand-dark px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50'

export default function Panel() {
  const [uid, setUid] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [canal, setCanal] = useState<Canal | null>(null)
  const [tab, setTab] = useState<Tab>('inicio')

  const cargarCanal = useCallback(async (id: string) => {
    const { data } = await supabase.from('canales').select('*').eq('owner_id', id).maybeSingle()
    setCanal(data as Canal | null)
  }, [])

  useEffect(() => {
    if (!supabaseListo) { setListo(true); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id ?? null
      setUid(id)
      if (id) await cargarCanal(id)
      setListo(true)
    })
  }, [cargarCanal])

  if (!listo) return <p className="p-8 text-zinc-400">Cargando...</p>
  if (!supabaseListo) return <p className="p-8 text-zinc-400">Falta configurar Supabase (.env.local).</p>
  if (!uid)
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold mb-2">Empezá a vender en vivo</h1>
        <p className="text-zinc-400 mb-6">Creá tu cuenta para armar tu tienda o tu canal.</p>
        <Link href="/ingresar" className={btn + ' inline-block'}>Ingresar / Crear cuenta</Link>
      </main>
    )
  if (!canal) return <CrearCanal uid={uid} onListo={() => cargarCanal(uid)} />

  const tabs: [Tab, string][] = [
    ['inicio', '🏁 Inicio'], ['plan', '💳 Mi plan'], ['diseno', '🎨 Diseño'], ['productos', canal.tipo === 'tienda' ? '🛍️ Productos' : '🛍️ Productos (opc.)'],
    ['publicaciones', '📸 Fotos y videos'], ['zonas', '🚚 Envíos y pagos'], ['perfil', '📡 Datos y vivo'], ['pedidos', '🧾 Pedidos'],
  ]
  const plan = estadoPlan(canal)

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold">{canal.nombre}</h1>
          <Link href={`/${canal.slug}`} className="text-xs text-brand underline">Ver mi página pública</Link>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => location.reload())} className="text-xs text-zinc-400 underline">Salir</button>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-5 no-scrollbar">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${tab === k ? 'bg-brand' : 'bg-white/5'}`}>{l}</button>
        ))}
      </div>
      {(plan.estado === 'vencido' || (plan.estado === 'prueba' && plan.dias <= 7) || (plan.estado === 'activo' && plan.dias <= 5)) && tab !== 'plan' && (
        <button onClick={() => setTab('plan')} className={`w-full text-left mb-4 p-3 rounded-xl border text-sm ${plan.estado === 'vencido' ? 'bg-red-950/60 border-red-500/40' : 'bg-amber-950/60 border-amber-500/40'}`}>
          {plan.estado === 'vencido'
            ? <><b>Tu tienda está en pausa.</b> Tu abono venció: nadie puede comprarte ni ver tus vivos. Tocá acá para renovarlo.</>
            : <><b>{plan.estado === 'prueba' ? `Tu mes gratis termina en ${plan.dias} día${plan.dias === 1 ? '' : 's'}.` : `Tu abono vence en ${plan.dias} día${plan.dias === 1 ? '' : 's'}.`}</b> Tocá acá para ver cómo seguir.</>}
        </button>
      )}
      {tab === 'plan' && <MiPlan canal={canal} />}
      {tab === 'inicio' && <Inicio canal={canal} irA={setTab} />}
      {tab === 'diseno' && <Diseno canal={canal} uid={uid} onGuardado={() => cargarCanal(uid)} />}
      {tab === 'perfil' && <Perfil canal={canal} uid={uid} onGuardado={() => cargarCanal(uid)} />}
      {tab === 'productos' && <Productos canal={canal} uid={uid} />}
      {tab === 'publicaciones' && <Publicaciones canal={canal} uid={uid} />}
      {tab === 'zonas' && <ZonasPagos canal={canal} onGuardado={() => cargarCanal(uid)} />}
      {tab === 'pedidos' && <Pedidos canal={canal} />}
    </main>
  )
}

function CrearCanal({ uid, onListo }: { uid: string; onListo: () => void }) {
  const [tipo, setTipo] = useState<'tienda' | 'persona'>('tienda')
  const [nombre, setNombre] = useState('')
  const [acepto, setAcepto] = useState(false)
  const [error, setError] = useState('')

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!acepto) return setError('Tenés que aceptar los términos')
    if (['panel', 'ingresar', 'terminos', 'api', 'admin', 'manifest.webmanifest'].includes(slugify(nombre))) return setError('Ese nombre está reservado')
    const { error } = await supabase.from('canales').insert({ owner_id: uid, tipo, nombre, slug: slugify(nombre) })
    if (error) return setError(error.message.includes('duplicate') ? 'Ese nombre ya existe, probá otro' : error.message)
    onListo()
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold mb-4">Creá tu canal</h1>
      <form onSubmit={crear} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(['tienda', 'persona'] as const).map((t) => (
            <button type="button" key={t} onClick={() => setTipo(t)} className={`p-3 rounded-xl border text-left ${tipo === t ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/5'}`}>
              <div className="text-2xl">{t === 'tienda' ? '🛍️' : '☕'}</div>
              <div className="font-semibold text-sm">{t === 'tienda' ? 'Tienda' : 'Persona'}</div>
              <div className="text-xs text-zinc-400">{t === 'tienda' ? 'Catálogo, envíos y venta en vivo' : 'Transmití, subí contenido y recibí cafecitos'}</div>
            </button>
          ))}
        </div>
        <input required minLength={3} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de tu canal" className={input} />
        <p className="text-xs text-zinc-500">Tu dirección: vivolocal/{slugify(nombre) || '...'}</p>
        <label className="flex gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5" />
          <span>Soy mayor de 18 años, acepto los <Link href="/terminos" className="underline text-brand">términos</Link> y soy el único responsable de lo que publico y vendo.</span>
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className={btn + ' w-full'}>Crear canal</button>
      </form>
    </main>
  )
}

function MiPlan({ canal }: { canal: Canal }) {
  const plan = estadoPlan(canal)
  const [hist, setHist] = useState<{ id: string; tipo: string; monto: number | null; horas: number | null; creado: string }[]>([])
  useEffect(() => {
    supabase.from('abonos').select('id,tipo,monto,horas,creado').eq('canal_id', canal.id).order('creado', { ascending: false }).limit(20).then(({ data }) => setHist(data || []))
  }, [canal.id])

  const fecha = (d: Date | string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const wa = (msg: string) => COBRO_WHATSAPP ? `https://wa.me/${COBRO_WHATSAPP}?text=${encodeURIComponent(msg)}` : null
  const linkAbono = wa(`Hola! Quiero pagar el abono mensual de VivoLocal para mi canal "${canal.nombre}" (${canal.slug}).`)
  const linkPack = wa(`Hola! Quiero sumar un pack de video (+${HORAS_PACK_VIDEO} horas) de VivoLocal para mi canal "${canal.nombre}" (${canal.slug}).`)

  const color = plan.estado === 'vencido' ? 'from-red-700/40' : plan.estado === 'prueba' ? 'from-amber-600/30' : 'from-green-600/30'
  return (
    <div className="space-y-5">
      <div className={`p-5 rounded-2xl bg-gradient-to-br ${color} to-white/5 border border-white/10`}>
        <div className="text-sm text-zinc-300">Tu plan</div>
        <div className="text-2xl font-extrabold mt-1">
          {plan.estado === 'prueba' && `Mes gratis · te quedan ${plan.dias} día${plan.dias === 1 ? '' : 's'}`}
          {plan.estado === 'activo' && `Abono activo · ${plan.dias} día${plan.dias === 1 ? '' : 's'} restantes`}
          {plan.estado === 'vencido' && 'Abono vencido · tienda en pausa'}
        </div>
        <div className="text-sm text-zinc-300 mt-1">
          {plan.estado === 'vencido' ? `Venció el ${fecha(plan.hasta!)}. Mientras esté vencido nadie puede comprarte ni ver tus vivos.` : `Vigente hasta el ${fecha(plan.hasta!)}.`}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="font-bold">Abono mensual</div>
          <div className="text-2xl font-extrabold text-brand mt-1">{PRECIO_ABONO}</div>
          <ul className="text-sm text-zinc-300 mt-3 space-y-1 list-disc pl-4">
            <li>Tu página de ventas propia</li>
            <li>Productos, envíos y pagos a tu manera</li>
            <li>{HORAS_VIVO_GRATIS} horas de vivo por mes en VivoLocal</li>
            <li>Vivos ilimitados por YouTube, Facebook, Twitch o Kick</li>
            <li>Cobrás directo en tu cuenta, sin comisión por venta</li>
          </ul>
          {linkAbono && <a href={linkAbono} target="_blank" rel="noreferrer" className={btn + ' inline-block mt-4'}>Pagar el abono</a>}
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="font-bold">Pack de video</div>
          <div className="text-2xl font-extrabold text-brand mt-1">{PRECIO_PACK}</div>
          <p className="text-sm text-zinc-300 mt-3">Suma <b>{HORAS_PACK_VIDEO} horas</b> de transmisión directa en VivoLocal este mes. Lo necesitás si llegás al límite y querés seguir transmitiendo acá.</p>
          <p className="text-xs text-zinc-500 mt-2">Si no, podés seguir gratis con YouTube, Facebook u otra plataforma.</p>
          {linkPack && <a href={linkPack} target="_blank" rel="noreferrer" className={btn + ' inline-block mt-4'}>Sumar un pack</a>}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm">
        <div className="font-bold mb-1">¿Cómo pago?</div>
        <p className="text-zinc-300">{COBRO_ALIAS ? <>Transferí a <b>{COBRO_ALIAS}</b> y avisanos</> : 'Avisanos'} por WhatsApp con los botones de arriba. Cuando confirmemos tu pago, tu plan se activa y verás el cambio acá.</p>
        {!COBRO_WHATSAPP && !COBRO_ALIAS && <p className="text-amber-400 text-xs mt-2">Los datos de cobro todavía no están cargados.</p>}
      </div>

      {hist.length > 0 && (
        <div>
          <div className="font-bold mb-2">Historial</div>
          {hist.map((h) => (
            <div key={h.id} className="flex justify-between text-sm py-2 border-b border-white/5">
              <span>{h.tipo === 'abono' ? `Abono (${DIAS_ABONO} días)` : `Pack de video (+${h.horas} h)`}</span>
              <span className="text-zinc-400">{fecha(h.creado)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Inicio({ canal, irA }: { canal: Canal; irA: (t: Tab) => void }) {
  const [n, setN] = useState<{ productos: number; zonas: number; pubs: number } | null>(null)
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('id', { count: 'exact', head: true }).eq('canal_id', canal.id),
      supabase.from('zonas_envio').select('id', { count: 'exact', head: true }).eq('canal_id', canal.id),
      supabase.from('publicaciones').select('id', { count: 'exact', head: true }).eq('canal_id', canal.id),
    ]).then(([p, z, b]) => setN({ productos: p.count || 0, zonas: z.count || 0, pubs: b.count || 0 }))
  }, [canal.id])

  const esTienda = canal.tipo === 'tienda'
  const pasos: { ok: boolean; t: string; d: string; tab: Tab }[] = [
    { ok: !!canal.avatar, t: 'Subí tu logo o foto', d: 'Es lo primero que ve la gente.', tab: 'diseno' },
    { ok: !!canal.portada, t: 'Elegí una portada y tu color', d: 'Hacé que tu página sea inconfundible.', tab: 'diseno' },
    { ok: !!canal.whatsapp, t: 'Cargá tu WhatsApp', d: 'Para que te escriban y cerrar ventas.', tab: 'perfil' },
    ...(esTienda ? [
      { ok: (n?.productos || 0) >= 3, t: 'Cargá al menos 3 productos', d: `Tenés ${n?.productos ?? 0}. Con buenas fotos se vende más.`, tab: 'productos' as Tab },
      { ok: (n?.zonas || 0) >= 1, t: 'Definí tus zonas de envío', d: 'Con su costo y demora.', tab: 'zonas' as Tab },
    ] : [
      { ok: (n?.pubs || 0) >= 1, t: 'Subí tu primera foto o video', d: 'Mostrá lo que hacés.', tab: 'publicaciones' as Tab },
    ]),
    { ok: canal.formas_pago.length > 0, t: 'Elegí cómo te pagan', d: 'Tarjeta, transferencia, efectivo, Lemon, etc.', tab: 'zonas' },
  ]
  const hechos = pasos.filter((p) => p.ok).length
  const pct = Math.round((hechos / pasos.length) * 100)
  const url = typeof location !== 'undefined' ? `${location.origin}/${canal.slug}` : `/${canal.slug}`
  const [qr, setQr] = useState('')
  useEffect(() => {
    if (typeof location === 'undefined') return
    QRCode.toDataURL(`${location.origin}/${canal.slug}`, { width: 480, margin: 2, color: { dark: '#111111', light: '#ffffff' } }).then(setQr).catch(() => {})
  }, [canal.slug])

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl bg-gradient-to-br from-brand/30 to-white/5 border border-white/10">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-sm text-zinc-300">Tu página de ventas está al</div>
            <div className="text-4xl font-extrabold">{pct}%</div>
          </div>
          {pct === 100 && <span className="text-sm font-bold text-green-400">¡Lista para vender! 🎉</span>}
        </div>
        <div className="h-2.5 rounded-full bg-black/40 mt-3 overflow-hidden"><div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="space-y-2">
        {pasos.map((p) => (
          <button key={p.t} onClick={() => irA(p.tab)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${p.ok ? 'bg-green-600' : 'bg-white/10'}`}>{p.ok ? '✓' : '·'}</span>
            <span className="flex-1"><span className={`block font-semibold text-sm ${p.ok ? 'line-through text-zinc-500' : ''}`}>{p.t}</span><span className="block text-xs text-zinc-400">{p.d}</span></span>
            <span className="text-zinc-500">›</span>
          </button>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="font-bold mb-1">🔗 Tu link para vender</div>
        <p className="text-xs text-zinc-400 mb-2">Compartilo en Instagram, WhatsApp y donde quieras.</p>
        <div className="flex gap-2">
          <input readOnly value={url} className={input} onFocus={(e) => e.currentTarget.select()} />
          <button onClick={() => { navigator.clipboard?.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }} className={btn}>{copiado ? '¡Copiado!' : 'Copiar'}</button>
        </div>
        <div className="flex gap-3 mt-3 text-sm">
          <Link href={`/${canal.slug}`} target="_blank" className="underline text-brand">Ver mi página</Link>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Mirá mi tienda: ${url}`)}`} target="_blank" rel="noreferrer" className="underline text-green-400">Compartir por WhatsApp</a>
        </div>
        {qr && (
          <div className="mt-4 flex items-center gap-4 p-3 rounded-xl bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR de ${canal.nombre}`} className="w-28 h-28 rounded-lg bg-white" />
            <div className="text-sm">
              <div className="font-semibold">Tu código QR</div>
              <p className="text-xs text-zinc-400 mb-2">Ponelo en tu local, tus bolsas o tus videos. Quien lo escanea entra directo a tu tienda.</p>
              <a href={qr} download={`qr-${canal.slug}.png`} className="text-brand underline text-sm">Descargar QR</a>
            </div>
          </div>
        )}
        <div className="mt-4 p-3 rounded-xl bg-white/5 text-xs text-zinc-300">
          <b>💡 Vendé durante tus vivos de TikTok o Instagram:</b> transmití ahí con tu audiencia, decí &ldquo;mi tienda está en el link de mi bio&rdquo; y poné este link. La gente compra en tu tienda, con todos tus medios de pago.
        </div>
      </div>
    </div>
  )
}

function Diseno({ canal, uid, onGuardado }: { canal: Canal; uid: string; onGuardado: () => void }) {
  const [f, setF] = useState({ color: colorSeguro(canal.color), lema: canal.lema || '', instagram: canal.instagram || '', rubro: canal.rubro || '' })
  const [msg, setMsg] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  async function guardar(extra: Partial<Canal> = {}) {
    const { error } = await supabase.from('canales').update({ ...f, lema: f.lema || null, instagram: f.instagram || null, rubro: f.rubro || null, ...extra }).eq('id', canal.id)
    setMsg(error ? error.message : 'Guardado ✓'); onGuardado()
  }

  async function imagen(file: File | undefined, campo: 'portada' | 'avatar') {
    if (!file) return
    setSubiendo(true); setMsg('')
    try {
      const r = await subirArchivo(file, uid)
      if (r.tipo !== 'foto') throw new Error('Tiene que ser una imagen')
      await guardar({ [campo]: r.url })
    } catch (e) { setMsg((e as Error).message) }
    setSubiendo(false)
  }

  const portada = canal.portada
  return (
    <div className="space-y-5">
      {/* Vista previa */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0b0b10]" style={{ '--c': f.color, '--ct': textoSobre(f.color) } as React.CSSProperties}>
        <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${f.color}, #0b0b10 85%)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {portada && <img src={portada} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b10] to-transparent" />
        </div>
        <div className="px-4 pb-4 -mt-9 relative">
          <div className="w-16 h-16 rounded-full ring-4 ring-[#0b0b10] overflow-hidden flex items-center justify-center text-2xl font-extrabold bg-[var(--c)] text-[var(--ct)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {canal.avatar ? <img src={canal.avatar} alt="" className="w-full h-full object-cover" /> : canal.nombre.slice(0, 1).toUpperCase()}
          </div>
          <div className="font-extrabold text-xl mt-2">{canal.nombre}</div>
          <div className="text-sm text-zinc-300">{f.lema || 'Tu lema aparece acá'}</div>
          <button className="mt-3 bg-[var(--c)] text-[var(--ct)] font-bold px-5 py-2 rounded-full text-sm">Comprar ahora</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
          <div className="font-semibold mb-1">🖼️ Portada</div>
          <div className="text-xs text-zinc-400 mb-2">Imagen ancha, ideal 1600×600.</div>
          <input type="file" accept="image/*" disabled={subiendo} onChange={(e) => imagen(e.target.files?.[0], 'portada')} className="text-xs" />
        </label>
        <label className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
          <div className="font-semibold mb-1">👤 Logo o foto de perfil</div>
          <div className="text-xs text-zinc-400 mb-2">Cuadrada, se muestra en círculo.</div>
          <input type="file" accept="image/*" disabled={subiendo} onChange={(e) => imagen(e.target.files?.[0], 'avatar')} className="text-xs" />
        </label>
      </div>

      <div>
        <div className="font-semibold text-sm mb-2">🎨 Color de tu marca</div>
        <div className="flex gap-2 flex-wrap items-center">
          {COLORES.map((c) => <button key={c} type="button" aria-label={c} onClick={() => setF({ ...f, color: c })} className={`w-9 h-9 rounded-full border-2 ${f.color.toLowerCase() === c.toLowerCase() ? 'border-white scale-110' : 'border-transparent'}`} style={{ background: c }} />)}
          <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="w-9 h-9 rounded bg-transparent" aria-label="Color personalizado" />
        </div>
      </div>

      <input value={f.lema} maxLength={80} onChange={(e) => setF({ ...f, lema: e.target.value })} className={input} placeholder="Tu lema o frase (máx. 80 letras). Ej: Zapatillas originales al mejor precio" />
      <input value={f.instagram} maxLength={40} onChange={(e) => setF({ ...f, instagram: e.target.value.replace(/\s/g, '') })} className={input} placeholder="Tu Instagram (sin link). Ej: @zapasdelcentro" />
      <select value={f.rubro} onChange={(e) => setF({ ...f, rubro: e.target.value })} className={input}>
        <option value="">¿Qué vendés o hacés? (rubro)</option>
        {RUBROS.map((r) => <option key={r}>{r}</option>)}
      </select>

      <div className="flex items-center gap-3">
        <button onClick={() => guardar()} disabled={subiendo} className={btn}>Guardar diseño</button>
        <span className="text-sm text-zinc-400">{subiendo ? 'Subiendo...' : msg}</span>
      </div>
    </div>
  )
}

function Perfil({ canal, uid, onGuardado }: { canal: Canal; uid: string; onGuardado: () => void }) {
  const [f, setF] = useState({ nombre: canal.nombre, descripcion: canal.descripcion || '', whatsapp: canal.whatsapp || '', ciudad: canal.ciudad || '' })
  const [msg, setMsg] = useState('')
  async function guardar() {
    const { error } = await supabase.from('canales').update(f).eq('id', canal.id)
    setMsg(error ? error.message : 'Guardado ✓')
    onGuardado()
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {canal.avatar ? <img src={canal.avatar} alt="" className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl">{canal.tipo === 'tienda' ? '🛍️' : '☕'}</div>}
        <label className="text-xs text-zinc-400">Foto de perfil o logo<br />
          <input type="file" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return
            try {
              const r = await subirArchivo(file, uid)
              if (r.tipo !== 'foto') throw new Error('Tiene que ser una imagen')
              await supabase.from('canales').update({ avatar: r.url }).eq('id', canal.id)
              onGuardado()
            } catch (er) { setMsg((er as Error).message) }
          }} />
        </label>
      </div>
      <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={input} placeholder="Nombre" />
      <textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} className={input} rows={3} placeholder="Descripción" />
      <input value={f.ciudad} onChange={(e) => setF({ ...f, ciudad: e.target.value })} className={input} placeholder="Ciudad" />
      <input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value.replace(/\D/g, '') })} className={input} placeholder="WhatsApp (solo números, con código de área. Ej: 5491155551234)" />
      <button onClick={guardar} className={btn}>Guardar</button> <span className="text-sm text-zinc-400">{msg}</span>
      <VivoConfig canal={canal} onGuardado={onGuardado} />
    </div>
  )
}

function VivoConfig({ canal, onGuardado }: { canal: Canal; onGuardado: () => void }) {
  const [modo, setModo] = useState<'propio' | 'externo'>(canal.vivo_modo || 'propio')
  const [url, setUrl] = useState(canal.vivo_url || '')
  const [usados, setUsados] = useState(0)
  const [msg, setMsg] = useState('')
  const valido = typeof location !== 'undefined' ? !!vivoExterno(url, location.hostname) : true

  const [horasTotal, setHorasTotal] = useState(HORAS_VIVO_GRATIS)

  useEffect(() => {
    supabase.from('vivos').select('inicio,fin').eq('canal_id', canal.id).order('inicio', { ascending: false }).limit(500)
      .then(({ data }) => setUsados(minutosUsados(data || [])))
    supabase.from('abonos').select('horas,creado').eq('canal_id', canal.id).eq('tipo', 'pack_video')
      .then(({ data }) => setHorasTotal(horasTope(data || [])))
  }, [canal.id, canal.en_vivo])

  async function guardarModo(m: 'propio' | 'externo', nuevaUrl = url) {
    setModo(m)
    const { error } = await supabase.from('canales').update({ vivo_modo: m, vivo_url: nuevaUrl || null }).eq('id', canal.id)
    setMsg(error ? error.message : 'Guardado ✓'); onGuardado()
  }

  const tope = horasTotal * 60
  const card = (activo: boolean) => `p-3 rounded-xl border text-left text-sm ${activo ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/5'}`

  return (
    <div className="pt-4 space-y-3">
      <div className="font-semibold">📡 ¿Cómo querés transmitir?</div>
      <div className="grid sm:grid-cols-2 gap-2">
        <button type="button" onClick={() => guardarModo('externo')} className={card(modo === 'externo')}>
          <b>Por YouTube, Facebook, TikTok, Instagram, Twitch o Kick</b>
          <div className="text-xs text-zinc-400 mt-1">Sin límite de horas ni de público, y gratis. Transmitís en esa red con tu audiencia y la gente compra en tu tienda de acá. Tiene las reglas de esa red.</div>
        </button>
        <button type="button" onClick={() => guardarModo('propio')} className={card(modo === 'propio')}>
          <b>Directo en VivoLocal</b>
          <div className="text-xs text-zinc-400 mt-1">Más libertad: sin depender de las reglas de otra plataforma (siempre dentro de la ley). Tu abono incluye {HORAS_VIVO_GRATIS} horas por mes; si necesitás más, sumás un pack.</div>
        </button>
      </div>

      {modo === 'externo' ? (
        <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={input} placeholder="Pegá el link de tu vivo (YouTube, Facebook, TikTok, Instagram, Twitch o Kick)" />
          {url && !valido && <p className="text-xs text-amber-400">Ese link no es de una plataforma compatible.</p>}
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={() => guardarModo('externo', url)} disabled={!valido} className={btn}>Guardar link</button>
            <button
              onClick={async () => { await supabase.from('canales').update({ en_vivo: !canal.en_vivo, vivo_url: url || null, vivo_modo: 'externo' }).eq('id', canal.id); onGuardado() }}
              disabled={!valido || !url}
              className={`${canal.en_vivo ? 'bg-zinc-700' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50`}
            >{canal.en_vivo ? 'Terminar vivo' : 'Marcar como EN VIVO'}</button>
            <span className="text-sm text-zinc-400">{msg}</span>
          </div>
          <p className="text-xs text-zinc-500">Empezá tu vivo en esa red y, cuando esté al aire, tocá &ldquo;Marcar como EN VIVO&rdquo;. En YouTube, Facebook, Twitch y Kick el video se ve dentro de tu página; en TikTok e Instagram aparece un botón para ir a verlo. <b>Poné el link de tu tienda en tu bio o decilo en el vivo</b> para que la gente compre.</p>
        </div>
      ) : (
        <>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
            <div className="flex justify-between"><span>Horas usadas este mes</span><b>{(usados / 60).toFixed(1)} / {horasTotal} h</b></div>
            <div className="h-2 rounded bg-black/40 mt-2 overflow-hidden"><div className={`h-full ${usados >= tope ? 'bg-red-500' : 'bg-brand'}`} style={{ width: `${Math.min(100, (usados / tope) * 100)}%` }} /></div>
            {usados >= tope && <p className="text-xs text-red-400 mt-2">Llegaste al límite del mes. Para seguir transmitiendo en VivoLocal sumá un <b>pack de video</b> desde la pestaña <b>Mi plan</b>, o seguí gratis por YouTube, Facebook u otra plataforma.</p>}
          </div>
          <Emisor canalId={canal.id} onCambio={onGuardado} />
        </>
      )}
    </div>
  )
}

function Productos({ canal, uid }: { canal: Canal; uid: string }) {
  const [lista, setLista] = useState<Producto[]>([])
  const [f, setF] = useState({ nombre: '', descripcion: '', precio: '', stock: '1', talles: '' })
  const [imgs, setImgs] = useState<string[]>([])
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('productos').select('*').eq('canal_id', canal.id).order('creado', { ascending: false })
    setLista((data as Producto[]) || [])
  }, [canal.id])
  useEffect(() => { cargar() }, [cargar])

  async function fotos(files: FileList | null) {
    if (!files) return
    setSubiendo(true); setError('')
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        const r = await subirArchivo(file, uid)
        if (r.tipo === 'foto') setImgs((p) => [...p, r.url])
      }
    } catch (e) { setError((e as Error).message) }
    setSubiendo(false)
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const { error } = await supabase.from('productos').insert({
      canal_id: canal.id, nombre: f.nombre, descripcion: f.descripcion,
      precio: Number(f.precio), stock: Number(f.stock),
      talles: f.talles.split(',').map((t) => t.trim()).filter(Boolean), imagenes: imgs,
    })
    if (error) return setError(error.message)
    setF({ nombre: '', descripcion: '', precio: '', stock: '1', talles: '' }); setImgs([]); cargar()
  }

  async function cambiar(p: Producto, cambios: Partial<Producto>) {
    await supabase.from('productos').update(cambios).eq('id', p.id); cargar()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={agregar} className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="font-semibold">Nuevo producto</div>
        <input required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={input} placeholder="Nombre" />
        <textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} className={input} rows={2} placeholder="Descripción" />
        <div className="grid grid-cols-2 gap-2">
          <input required type="number" min={1} value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} className={input} placeholder="Precio $" />
          <input required type="number" min={0} value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} className={input} placeholder="Stock" />
        </div>
        <input value={f.talles} onChange={(e) => setF({ ...f, talles: e.target.value })} className={input} placeholder="Talles separados por coma (ej: 38,39,40 o S,M,L). Vacío si no aplica" />
        <input type="file" accept="image/*" multiple onChange={(e) => fotos(e.target.files)} className="text-xs" />
        <div className="flex gap-2 flex-wrap">{imgs.map((u) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={u} src={u} alt="" className="w-14 h-14 object-cover rounded" />)}</div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={subiendo} className={btn}>{subiendo ? 'Subiendo...' : 'Agregar producto'}</button>
      </form>

      {lista.map((p) => (
        <div key={p.id} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.imagenes[0] ? <img src={p.imagenes[0]} alt="" className="w-16 h-16 object-cover rounded" /> : <div className="w-16 h-16 rounded bg-white/10" />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{p.nombre} {!p.activo && <span className="text-xs text-zinc-500">(oculto)</span>}</div>
            <div className="text-sm text-brand">{pesos(p.precio)}</div>
            <div className="text-xs text-zinc-400 flex items-center gap-1">Stock:
              <input type="number" min={0} defaultValue={p.stock} onBlur={(e) => cambiar(p, { stock: Number(e.target.value) })} className="w-16 bg-black/40 rounded px-1" />
            </div>
          </div>
          <button onClick={() => cambiar(p, { activo: !p.activo })} className="text-xs underline text-zinc-400">{p.activo ? 'Ocultar' : 'Mostrar'}</button>
          <button onClick={() => confirm('¿Borrar producto?') && supabase.from('productos').delete().eq('id', p.id).then(cargar)} className="text-xs underline text-red-400">Borrar</button>
        </div>
      ))}
    </div>
  )
}

function Publicaciones({ canal, uid }: { canal: Canal; uid: string }) {
  const [lista, setLista] = useState<Publicacion[]>([])
  const [titulo, setTitulo] = useState('')
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('publicaciones').select('*').eq('canal_id', canal.id).order('creado', { ascending: false })
    setLista((data as Publicacion[]) || [])
  }, [canal.id])
  useEffect(() => { cargar() }, [cargar])

  async function subir(files: FileList | null) {
    if (!files?.[0]) return
    setSubiendo(true); setError('')
    try {
      const r = await subirArchivo(files[0], uid)
      const { error } = await supabase.from('publicaciones').insert({ canal_id: canal.id, tipo: r.tipo, url: r.url, titulo, precio: precio ? Number(precio) : null })
      if (error) throw error
      setTitulo(''); setPrecio(''); cargar()
    } catch (e) { setError((e as Error).message) }
    setSubiendo(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="font-semibold">Subir foto o video</div>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={input} placeholder="Título o descripción corta" />
        <input type="number" min={1} value={precio} onChange={(e) => setPrecio(e.target.value)} className={input} placeholder="Precio $ (opcional, si lo vendés)" />
        <input type="file" accept="image/*,video/*" disabled={subiendo} onChange={(e) => subir(e.target.files)} className="text-xs" />
        <p className="text-xs text-zinc-500">Fotos hasta 5 MB, videos hasta 50 MB. Sos el único responsable de lo que subís.</p>
        {subiendo && <p className="text-sm text-zinc-400">Subiendo...</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {lista.map((p) => (
          <div key={p.id} className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.tipo === 'foto' ? <img src={p.url} alt={p.titulo} className="aspect-square object-cover w-full" /> : <video src={p.url} className="aspect-square object-cover w-full" controls />}
            <div className="p-2 text-xs">
              <div className="truncate">{p.titulo || '—'}</div>
              <button onClick={() => supabase.from('publicaciones').delete().eq('id', p.id).then(cargar)} className="text-red-400 underline">Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ZonasPagos({ canal, onGuardado }: { canal: Canal; onGuardado: () => void }) {
  const [zonas, setZonas] = useState<Zona[]>([])
  const [z, setZ] = useState({ nombre: '', costo: '0', demora: '' })
  const [pagos, setPagos] = useState<string[]>(canal.formas_pago || [])
  const [alias, setAlias] = useState(canal.alias_transferencia || '')
  const [billeteras, setBilleteras] = useState(canal.billeteras || '')
  const [mpToken, setMpToken] = useState('')
  const [msg, setMsg] = useState('')

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('zonas_envio').select('*').eq('canal_id', canal.id)
    setZonas((data as Zona[]) || [])
  }, [canal.id])
  useEffect(() => { cargar() }, [cargar])

  async function addZona(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('zonas_envio').insert({ canal_id: canal.id, nombre: z.nombre, costo: Number(z.costo), demora: z.demora || null })
    setZ({ nombre: '', costo: '0', demora: '' }); cargar()
  }

  async function guardarPagos() {
    const { error } = await supabase.from('canales').update({ formas_pago: pagos, alias_transferencia: alias || null, billeteras: billeteras.trim() || null }).eq('id', canal.id)
    if (!error && mpToken) {
      const r = await supabase.from('canal_secretos').upsert({ canal_id: canal.id, mp_access_token: mpToken })
      if (r.error) return setMsg(r.error.message)
      setMpToken('')
    }
    setMsg(error ? error.message : 'Guardado ✓'); onGuardado()
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="font-bold">Zonas de entrega</h2>
        <form onSubmit={addZona} className="grid grid-cols-[1fr_90px_110px_auto] gap-2">
          <input required value={z.nombre} onChange={(e) => setZ({ ...z, nombre: e.target.value })} className={input} placeholder="Zona (ej: Centro)" />
          <input type="number" min={0} value={z.costo} onChange={(e) => setZ({ ...z, costo: e.target.value })} className={input} placeholder="Costo $" />
          <input value={z.demora} onChange={(e) => setZ({ ...z, demora: e.target.value })} className={input} placeholder="Demora" />
          <button className={btn}>+</button>
        </form>
        {zonas.map((x) => (
          <div key={x.id} className="flex justify-between text-sm p-2 rounded bg-white/5">
            <span>{x.nombre} · {x.costo ? pesos(x.costo) : 'Gratis'} {x.demora && `· ${x.demora}`}</span>
            <button onClick={() => supabase.from('zonas_envio').delete().eq('id', x.id).then(cargar)} className="text-red-400 text-xs underline">Quitar</button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">Formas de pago que aceptás</h2>
        {Object.entries(FORMAS_PAGO).map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pagos.includes(k)} onChange={(e) => setPagos(e.target.checked ? [...pagos, k] : pagos.filter((x) => x !== k))} /> {l}
          </label>
        ))}
        {pagos.includes('billetera') && (
          <div>
            <textarea value={billeteras} onChange={(e) => setBilleteras(e.target.value)} rows={3} className={input} placeholder={'Una por línea. Ej:\nLemon: $tuusuario\nUalá: tu.alias\nBelo: tu.alias'} />
            <p className="text-xs text-zinc-500 mt-1">El comprador te paga desde su app y te avisa. Confirmás el pago vos, en Pedidos.</p>
          </div>
        )}
        {pagos.includes('transferencia') && <input value={alias} onChange={(e) => setAlias(e.target.value)} className={input} placeholder="Alias o CBU para transferencias" />}
        {pagos.includes('mercadopago') && (
          <input value={mpToken} onChange={(e) => setMpToken(e.target.value)} className={input} placeholder="Access Token de tu MercadoPago (queda privado)" type="password" />
        )}
        <button onClick={guardarPagos} className={btn}>Guardar pagos</button> <span className="text-sm text-zinc-400">{msg}</span>
      </section>
    </div>
  )
}

type Pedido = { id: string; tipo: string; monto: number; envio: number; talle: string | null; zona: string | null; forma_pago: string | null; comprador_nombre: string | null; comprador_contacto: string | null; direccion: string | null; estado: string; creado: string }

function Pedidos({ canal }: { canal: Canal }) {
  const [lista, setLista] = useState<Pedido[]>([])
  const cargar = useCallback(async () => {
    const { data } = await supabase.from('pedidos').select('*').eq('canal_id', canal.id).order('creado', { ascending: false }).limit(100)
    setLista((data as Pedido[]) || [])
  }, [canal.id])
  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="space-y-2">
      {lista.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2 text-center">
          {[
            ['Cobrado', pesos(lista.filter((p) => p.estado !== 'cancelado' && p.estado !== 'pendiente').reduce((a, p) => a + p.monto + p.envio, 0))],
            ['Pendientes', String(lista.filter((p) => p.estado === 'pendiente').length)],
            ['Por enviar', String(lista.filter((p) => p.estado === 'pagado' || p.estado === 'armado').length)],
          ].map(([t, v]) => <div key={t} className="p-2 rounded-lg bg-white/5"><div className="text-xs text-zinc-400">{t}</div><div className="font-bold">{v}</div></div>)}
        </div>
      )}
      {lista.length === 0 && <p className="text-zinc-400 text-sm">Todavía no tenés pedidos.</p>}
      {lista.map((p) => (
        <div key={p.id} className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
          <div className="flex justify-between"><b>{p.tipo === 'propina' ? '☕ Cafecito' : '🛍️ Compra'} · {pesos(p.monto + p.envio)}</b><span className="text-xs text-zinc-500">{new Date(p.creado).toLocaleString('es-AR')}</span></div>
          <div className="text-zinc-400">{p.comprador_nombre} · {p.comprador_contacto}</div>
          {p.direccion && <div className="text-zinc-400">{p.zona}: {p.direccion}</div>}
          <div className="text-zinc-400">{p.forma_pago}{p.talle && ` · talle ${p.talle}`}</div>
          <select value={p.estado} onChange={async (e) => {
            const { data } = await supabase.auth.getSession()
            const r = await fetch('/api/pedido-estado', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ pedidoId: p.id, estado: e.target.value }) })
            if (!r.ok) alert((await r.json()).error || 'No se pudo cambiar')
            cargar()
          }} className="mt-1 bg-black/40 rounded px-2 py-1 text-xs">
            {['pendiente', 'pagado', 'armado', 'enviado', 'cancelado'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}
