import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { HORAS_VIVO_GRATIS, minutosUsados } from '@/lib/data'

const err = (error: string, status = 400) => NextResponse.json({ error }, { status })

// modo "ver": cualquiera, solo suscripción. modo "emitir": solo el dueño del canal (verificado con su sesión)
// y mientras no haya agotado sus horas gratis del mes.
export async function POST(req: Request) {
  const { LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret, NEXT_PUBLIC_LIVEKIT_URL: url } = process.env
  if (!key || !secret || !url) return err('El video en vivo todavía no está configurado', 503)

  const { canalId, modo } = await req.json()
  const db = supabaseAdmin()
  const { data: canal } = await db.from('canales').select('id,owner_id,suspendido').eq('id', canalId).maybeSingle()
  if (!canal || canal.suspendido) return err('Canal inexistente', 404)

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
    if (usados >= HORAS_VIVO_GRATIS * 60) {
      return err(`Llegaste al límite de ${HORAS_VIVO_GRATIS} horas gratis de transmisión directa este mes. Podés transmitir por YouTube, Facebook o Twitch sin límite, o esperar al mes que viene.`, 429)
    }
    await db.from('vivos').insert({ canal_id: canal.id })
    identity = `emisor-${canal.id}`
    puedeEmitir = true
  }

  const at = new AccessToken(key, secret, { identity, ttl: '4h' })
  at.addGrant({ room: canal.id, roomJoin: true, canPublish: puedeEmitir, canSubscribe: true, canPublishData: false })
  return NextResponse.json({ token: await at.toJwt(), url })
}
