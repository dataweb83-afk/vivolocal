'use client'
import { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'

// Espectador: se conecta solo a mirar. No se graba nada.
export default function VideoVivo({ canalId }: { canalId: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const [estado, setEstado] = useState<'conectando' | 'esperando' | 'viendo' | 'error'>('conectando')

  useEffect(() => {
    const room = new Room()
    let vivo = true

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Video && video.current) { track.attach(video.current); setEstado('viendo') }
      if (track.kind === Track.Kind.Audio && audio.current) track.attach(audio.current)
    })
    room.on(RoomEvent.TrackUnsubscribed, (track) => { track.detach(); setEstado('esperando') })

    ;(async () => {
      try {
        const r = await fetch('/api/livekit-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canalId, modo: 'ver' }) })
        const j = await r.json()
        if (!r.ok) throw new Error(j.error)
        await room.connect(j.url, j.token)
        if (vivo) setEstado((e) => (e === 'viendo' ? e : 'esperando'))
      } catch { if (vivo) setEstado('error') }
    })()

    return () => { vivo = false; room.disconnect() }
  }, [canalId])

  return (
    <>
      <video ref={video} autoPlay playsInline muted controls className={`w-full h-full object-contain ${estado === 'viendo' ? '' : 'hidden'}`} />
      <audio ref={audio} autoPlay />
      {estado !== 'viendo' && (
        <p className="text-zinc-500 text-sm absolute inset-0 flex items-center justify-center text-center px-4">
          {estado === 'conectando' ? 'Conectando...' : estado === 'esperando' ? 'Esperando que empiece la transmisión...' : 'El video en vivo no está disponible por ahora'}
        </p>
      )}
    </>
  )
}
