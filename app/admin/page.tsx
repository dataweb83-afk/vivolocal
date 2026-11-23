'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DIAS_ABONO, HORAS_PACK_VIDEO, estadoPlan } from '@/lib/data'

type Den = { id: string; motivo: string; creado: string; canal_id: string; canales: { nombre: string; slug: string; suspendido: boolean } | null }
type Can = { id: string; nombre: string; slug: string; tipo: string; suspendido: boolean; prueba_hasta: string | null; plan_hasta: string | null; whatsapp: string | null }

const fecha = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString('es-AR') : '—')

export default function Admin() {
  const [den, setDen] = useState<Den[]>([])
  const [can, setCan] = useState<Can[]>([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [montos, setMontos] = useState<Record<string, string>>({})

  const llamar = useCallback(async (body: object) => {
    const { data } = await supabase.auth.getSession()
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify(body) })
    const j = await r.json()
    if (!r.ok) { setError(j.error || 'Error'); return null }
    return j
  }, [])

  const cargar = useCallback(async () => {
    const j = await llamar({ accion: 'listar' })
    if (j) { setDen(j.denuncias); setCan(j.canales); setError('') }
  }, [llamar])
  useEffect(() => { cargar() }, [cargar])

  async function suspender(id: string, valor: boolean) { await llamar({ accion: 'suspender', canalId: id, valor }); cargar() }

  async function registrar(c: Can, tipo: 'abono' | 'pack_video') {
    const txt = tipo === 'abono' ? `¿Registrar el pago del abono de "${c.nombre}"? Suma ${DIAS_ABONO} días.` : `¿Registrar un pack de video (+${HORAS_PACK_VIDEO} h) para "${c.nombre}"?`
    if (!confirm(txt)) return
    const j = await llamar({ accion: 'registrar', canalId: c.id, tipo, monto: montos[c.id] || undefined })
    if (j) { setAviso(`Pago registrado para ${c.nombre}`); setMontos((m) => ({ ...m, [c.id]: '' })); cargar() }
  }

  async function ajustar(c: Can) {
    const f = prompt(`Nueva fecha de vencimiento del abono de "${c.nombre}" (AAAA-MM-DD):`, c.plan_hasta?.slice(0, 10) || '')
    if (!f) return
    const j = await llamar({ accion: 'ajustar-plan', canalId: c.id, plan_hasta: f })
    if (j) cargar()
  }

  if (error) return <p className="p-8 text-zinc-400">{error === 'No autorizado' ? 'No tenés acceso a esta página.' : error}</p>

  const orden = { vencido: 0, prueba: 1, activo: 2 }
  const cobros = [...can].sort((a, b) => orden[estadoPlan(a).estado] - orden[estadoPlan(b).estado])
  const etiqueta = { vencido: 'bg-red-600', prueba: 'bg-amber-600', activo: 'bg-green-600' }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-8">
      <h1 className="text-2xl font-extrabold">Administración</h1>
      {aviso && <p className="text-sm text-green-400">{aviso}</p>}

      <section className="space-y-2">
        <h2 className="font-bold">💳 Cobros ({can.length})</h2>
        <p className="text-xs text-zinc-500">Cuando un cliente te pague, registralo acá. El abono suma {DIAS_ABONO} días a continuación de lo que le quede de prueba o de plan. Los vencidos aparecen primero.</p>
        {cobros.map((c) => {
          const p = estadoPlan(c)
          return (
            <div key={c.id} className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm space-y-2">
              <div className="flex justify-between items-center gap-2">
                <Link href={`/${c.slug}`} target="_blank" className="font-semibold truncate">{c.nombre} <span className="text-xs text-zinc-500 font-normal">({c.tipo})</span></Link>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${etiqueta[p.estado]}`}>
                  {p.estado === 'prueba' ? `Prueba · ${p.dias} d` : p.estado === 'activo' ? `Activo · ${p.dias} d` : 'Vencido'}
                </span>
              </div>
              <div className="text-xs text-zinc-400">Prueba hasta {fecha(c.prueba_hasta)} · Abono hasta {fecha(c.plan_hasta)}{c.whatsapp && <> · <a className="underline text-green-400" href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a></>}</div>
              <div className="flex gap-2 flex-wrap items-center">
                <input value={montos[c.id] || ''} onChange={(e) => setMontos((m) => ({ ...m, [c.id]: e.target.value.replace(/\D/g, '') }))} placeholder="Monto $ (opcional)" className="w-36 bg-black/40 rounded px-2 py-1.5 text-xs" />
                <button onClick={() => registrar(c, 'abono')} className="bg-brand px-3 py-1.5 rounded-lg text-xs font-bold">+ Abono {DIAS_ABONO} días</button>
                <button onClick={() => registrar(c, 'pack_video')} className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold">+ Pack video {HORAS_PACK_VIDEO} h</button>
                <button onClick={() => ajustar(c)} className="text-xs underline text-zinc-400">Ajustar fecha</button>
              </div>
            </div>
          )
        })}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">🚩 Denuncias ({den.length})</h2>
        {den.map((d) => (
          <div key={d.id} className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
            <div className="flex justify-between"><b>{d.canales?.nombre ?? '(canal borrado)'}</b><span className="text-xs text-zinc-500">{new Date(d.creado).toLocaleString('es-AR')}</span></div>
            <p className="text-zinc-300 my-1">{d.motivo}</p>
            <div className="flex gap-3 text-xs">
              {d.canales && <Link href={`/${d.canales.slug}`} target="_blank" className="underline text-brand">Ver canal</Link>}
              {d.canales && <button onClick={() => suspender(d.canal_id, !d.canales!.suspendido)} className="underline text-red-400">{d.canales.suspendido ? 'Reactivar' : 'Suspender'}</button>}
              <button onClick={() => llamar({ accion: 'borrar-denuncia', id: d.id }).then(cargar)} className="underline text-zinc-400">Descartar</button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">Moderación de canales</h2>
        {can.map((c) => (
          <div key={c.id} className="flex justify-between items-center p-2 rounded bg-white/5 text-sm">
            <Link href={`/${c.slug}`} target="_blank" className={c.suspendido ? 'line-through text-zinc-500' : ''}>{c.nombre}</Link>
            <button onClick={() => suspender(c.id, !c.suspendido)} className="text-xs underline text-red-400">{c.suspendido ? 'Reactivar' : 'Suspender'}</button>
          </div>
        ))}
      </section>
    </main>
  )
}
