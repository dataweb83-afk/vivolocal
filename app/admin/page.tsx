'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Den = { id: string; motivo: string; creado: string; canal_id: string; canales: { nombre: string; slug: string; suspendido: boolean } | null }
type Can = { id: string; nombre: string; slug: string; tipo: string; suspendido: boolean }

export default function Admin() {
  const [den, setDen] = useState<Den[]>([])
  const [can, setCan] = useState<Can[]>([])
  const [error, setError] = useState('')

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

  if (error) return <p className="p-8 text-zinc-400">{error === 'No autorizado' ? 'No tenés acceso a esta página.' : error}</p>

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
      <h1 className="text-2xl font-extrabold">Moderación</h1>
      <section className="space-y-2">
        <h2 className="font-bold">Denuncias ({den.length})</h2>
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
        <h2 className="font-bold">Todos los canales ({can.length})</h2>
        {can.map((c) => (
          <div key={c.id} className="flex justify-between items-center p-2 rounded bg-white/5 text-sm">
            <Link href={`/${c.slug}`} target="_blank" className={c.suspendido ? 'line-through text-zinc-500' : ''}>{c.nombre} <span className="text-xs text-zinc-500">({c.tipo})</span></Link>
            <button onClick={() => suspender(c.id, !c.suspendido)} className="text-xs underline text-red-400">{c.suspendido ? 'Reactivar' : 'Suspender'}</button>
          </div>
        ))}
      </section>
    </main>
  )
}
