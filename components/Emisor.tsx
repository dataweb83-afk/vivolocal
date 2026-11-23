'use client'
import { useRef, useState } from 'react'
import { Room } from 'livekit-client'
import { supabase } from '@/lib/supabase'

// Emisor: transmite desde la cámara del celular o la compu. Marca el canal como "en vivo" mientras dura.
export default function Emisor({ canalId, onCambio }: { canalId: string; onCambio: () => void }) {
  const room = useRef<Room | null>(null)
  const preview = useRef<HTMLVideoElement>(null)
  const [activo, setActivo] = useState(false)
  const [error, setError] = useState('')

  async function empezar() {
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      const r = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ canalId, modo: 'emitir' }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      const rm = new Room()
      await rm.connect(j.url, j.token)
      await rm.localParticipant.enableCameraAndMicrophone()
      const pub = rm.localParticipant.getTrackPublications().find((p) => p.kind === 'video')
      if (pub?.track && preview.current) pub.track.attach(preview.current)
      room.current = rm
      await supabase.from('canales').update({ en_vivo: true }).eq('id', canalId)
      setActivo(true); onCambio()
    } catch (e) { setError((e as Error).message || 'No se pudo iniciar') }
  }

  async function terminar() {
    room.current?.disconnect(); room.current = null
    const { data } = await supabase.auth.getSession()
    await fetch('/api/vivo-fin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ canalId }) })
    await supabase.from('canales').update({ en_vivo: false }).eq('id', canalId)
    setActivo(false); onCambio()
  }

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
      <div className="font-semibold">📡 Transmitir en vivo</div>
      <video ref={preview} autoPlay muted playsInline className={`w-full rounded-lg bg-black aspect-video ${activo ? '' : 'hidden'}`} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {activo
        ? <button onClick={terminar} className="bg-zinc-700 px-4 py-2 rounded-lg text-sm font-semibold">Terminar transmisión</button>
        : <button onClick={empezar} className="bg-brand hover:bg-brand-dark px-4 py-2 rounded-lg text-sm font-semibold">Empezar transmisión</button>}
      <p className="text-xs text-zinc-500">Usa tu cámara y micrófono. No se graba ni se guarda el video. Mantené esta pantalla abierta mientras transmitís.</p>
    </div>
  )
}
