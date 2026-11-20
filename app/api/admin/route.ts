import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { esAdmin, usuarioDe } from '@/lib/auth-server'

// Moderación: solo emails listados en ADMIN_EMAILS.
export async function POST(req: Request) {
  const user = await usuarioDe(req)
  if (!esAdmin(user?.email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const db = supabaseAdmin()

  if (b.accion === 'listar') {
    const [d, c] = await Promise.all([
      db.from('denuncias').select('id,motivo,creado,canal_id,canales(nombre,slug,suspendido)').order('creado', { ascending: false }).limit(100),
      db.from('canales').select('id,nombre,slug,tipo,suspendido,creado').order('creado', { ascending: false }).limit(200),
    ])
    return NextResponse.json({ denuncias: d.data || [], canales: c.data || [] })
  }
  if (b.accion === 'suspender') {
    await db.from('canales').update({ suspendido: !!b.valor, en_vivo: false }).eq('id', b.canalId)
    return NextResponse.json({ ok: true })
  }
  if (b.accion === 'borrar-denuncia') {
    await db.from('denuncias').delete().eq('id', b.id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
