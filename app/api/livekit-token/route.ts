import { NextResponse } from 'next/server'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { MAX_ESPECTADORES, horasTope, minutosUsados, planVigente } from '@/lib/data'

const err = (error: string, status = 400) => NextResponse.json({ error }, { status })

// modo "ver": cualquiera, solo suscripción. modo "emitir": solo el dueño del canal (verificado con su sesión)
// y mientras no haya agotado sus horas gratis del mes.
export async function POST(req: Request) {
  const { LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret, NEXT_PUBLIC_LIVEKIT_URL: url } = process.env
  if (!key || !secret || !url) return err('El video en vivo todavía no está configurado', 503)

  const { canalId, modo } = await req.json()
  const db = supabaseAdmin()
  const { data: canal } = await db.from('canales').select('id,owner_id,suspendido,prueba_hasta,plan_hasta').eq('id', canalId).maybeSingle()
  if (!canal || canal.suspendido) return err('Canal inexistente', 404)
  if (!planVigente(canal)) return err('El abono de este canal está vencido. Renovalo desde Mi plan, o transmití por YouTube, Facebook u otra plataforma.', 402)

  let identity = `espectador-${Math.random().toString(36).slice(2, 10)}`
  let puedeEmitir = false

  if (modo === 'emitir') {
    const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
    const { data } = jwt ? await db.auth.getUser(jwt) : { data: { user: null } }
    if (!data.user || data.user.id !== canal.owner_id) return err('No autorizado', 403)

    // Cerrar vivos que quedaron abiertos y chequear el tope mensual
    const { data: vivos } = await db.from('vivos').select('id,inicio,fin').eq('canal_id', canal.id).order('inicio', { ascending: false }).limit(500)
    const abiertos = (vivos || []).filter((v) => !v.fin).map((v) => v.id)
    if (abiertos.length) await db.from('vivos').update({ fin: new Date().toISOString() }).in('id', abiertos)
    const usados = minutosUsados((vivos || []).map((v) => ({ inicio: v.inicio, fin: v.fin ?? new Date().toISOString() })))
    const { data: packs } = await db.from('abonos').select('horas,creado').eq('canal_id', canal.id).eq('tipo', 'pack_video')
    const tope = horasTope(packs || [])
    if (usados >= tope * 60) {
      return err(`Llegaste al límite de ${tope} horas de transmisión directa este mes. Para seguir transmitiendo en VivoLocal sumá un pack de video desde Mi plan, o transmití por YouTube, Facebook u otra plataforma sin límite.`, 429)
    }
    await db.from('vivos').insert({ canal_id: canal.id })
    // La sala se crea con tope de participantes: el emisor + MAX_ESPECTADORES. Si no se puede crear, el token igual funciona.
    try {
      await new RoomServiceClient(url.replace(/^wss:/, 'https:'), key, secret).createRoom({ name: canal.id, maxParticipants: MAX_ESPECTADORES + 1, emptyTimeout: 120 })
    } catch {}
    identity = `emisor-${canal.id}`
    puedeEmitir = true
  }

  const at = new AccessToken(key, secret, { identity, ttl: '4h' })
  at.addGrant({ room: canal.id, roomJoin: true, canPublish: puedeEmitir, canSubscribe: true, canPublishData: false })
  return NextResponse.json({ token: await at.toJwt(), url })
}
