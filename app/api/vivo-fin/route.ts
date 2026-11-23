import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { usuarioDe } from '@/lib/auth-server'

// El dueño cierra su transmisión propia: se registra la hora de fin (para contar las horas gratis).
export async function POST(req: Request) {
  const user = await usuarioDe(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { canalId } = await req.json()
  const db = supabaseAdmin()
  const { data: canal } = await db.from('canales').select('id').eq('id', canalId).eq('owner_id', user.id).maybeSingle()
  if (!canal) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  await db.from('vivos').update({ fin: new Date().toISOString() }).eq('canal_id', canal.id).is('fin', null)
  return NextResponse.json({ ok: true })
}
