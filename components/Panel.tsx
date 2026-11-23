'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, supabaseListo } from '@/lib/supabase'
import { subirArchivo } from '@/lib/subir'
import Emisor from './Emisor'
import { FORMAS_PAGO, pesos, slugify, type Canal, type Producto, type Publicacion, type Zona } from '@/lib/data'

type Tab = 'perfil' | 'productos' | 'publicaciones' | 'zonas' | 'pedidos'

const input = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none'
const btn = 'bg-brand hover:bg-brand-dark px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50'

export default function Panel() {
  const [uid, setUid] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [canal, setCanal] = useState<Canal | null>(null)
  const [tab, setTab] = useState<Tab>('perfil')

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
    ['perfil', 'Perfil'], ['productos', canal.tipo === 'tienda' ? 'Productos' : 'Productos (opc.)'],
    ['publicaciones', 'Fotos y videos'], ['zonas', 'Zonas y pagos'], ['pedidos', 'Pedidos'],
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold">{canal.nombre}</h1>
          <Link href={`/${canal.slug}`} className="text-xs text-brand underline">Ver mi página pública</Link>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => location.reload())} className="text-xs text-zinc-400 underline">Salir</button>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-5">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${tab === k ? 'bg-brand' : 'bg-white/5'}`}>{l}</button>
        ))}
      </div>
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
      <div className="pt-4"><Emisor canalId={canal.id} onCambio={onGuardado} /></div>
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
