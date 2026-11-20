'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Msg = { id: string; autor: string; texto: string }

export default function Chat({ canalId }: { canalId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [texto, setTexto] = useState('')
  const [autor, setAutor] = useState('')
  const fin = useRef<HTMLDivElement>(null)
  const ultimo = useRef(0)

  useEffect(() => {
    try { setAutor(localStorage.getItem('vl_autor') || '') } catch {}
    supabase.from('mensajes').select('id,autor,texto').eq('canal_id', canalId).order('creado', { ascending: false }).limit(50)
      .then(({ data }) => setMsgs(((data as Msg[]) || []).reverse()))

    const ch = supabase.channel(`chat-${canalId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `canal_id=eq.${canalId}` },
        (p) => setMsgs((m) => [...m.filter((x) => x.id !== (p.new as Msg).id), p.new as Msg].slice(-100)))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [canalId])

  // Scrollea solo la caja del chat (scrollIntoView movía toda la página)
  useEffect(() => { const c = fin.current?.parentElement; if (c) c.scrollTop = c.scrollHeight }, [msgs])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const t = texto.trim(), a = autor.trim()
    if (!t || !a) return
    if (Date.now() - ultimo.current < 1500) return // freno simple anti-spam
    ultimo.current = Date.now()
    try { localStorage.setItem('vl_autor', a) } catch {}
    setTexto('')
    await supabase.from('mensajes').insert({ canal_id: canalId, autor: a.slice(0, 30), texto: t.slice(0, 300) })
  }

  return (
    <aside className="rounded-xl bg-white/5 border border-white/10 flex flex-col h-[420px] lg:h-[520px]">
      <div className="p-3 border-b border-white/10 font-semibold text-sm">Chat en vivo</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
        {msgs.length === 0 && <p className="text-zinc-500 text-xs">Sé el primero en escribir 👋</p>}
        {msgs.map((m) => <div key={m.id} className="break-words"><b className="text-brand">{m.autor}:</b> {m.texto}</div>)}
        <div ref={fin} />
      </div>
      <form onSubmit={enviar} className="p-3 border-t border-white/10 space-y-2">
        {!autor && <p className="text-xs text-zinc-500">Poné tu nombre para escribir</p>}
        <input value={autor} onChange={(e) => setAutor(e.target.value)} maxLength={30} placeholder="Tu nombre" className="w-full bg-black/40 rounded-lg px-3 py-1.5 text-sm outline-none" />
        <div className="flex gap-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder="Escribí algo..." className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-sm outline-none" />
          <button className="bg-brand px-3 rounded-lg text-sm font-semibold">Enviar</button>
        </div>
      </form>
    </aside>
  )
}
