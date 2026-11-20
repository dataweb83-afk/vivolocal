import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabase'

const err = (error: string, status = 400) => NextResponse.json({ error }, { status })

// modo "ver": cualquiera, solo suscripción. modo "emitir": solo el dueño del canal (verificado con su sesión).
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
    identity = `emisor-${canal.id}`
    puedeEmitir = true
  }

  const at = new AccessToken(key, secret, { identity, ttl: '4h' })
  at.addGrant({ room: canal.id, roomJoin: true, canPublish: puedeEmitir, canSubscribe: true, canPublishData: false })
  return NextResponse.json({ token: await at.toJwt(), url })
}
