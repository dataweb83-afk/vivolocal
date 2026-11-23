import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { esAdmin, usuarioDe } from '@/lib/auth-server'
import { DIAS_ABONO, HORAS_PACK_VIDEO } from '@/lib/data'

// Moderación: solo emails listados en ADMIN_EMAILS.
export async function POST(req: Request) {
  const user = await usuarioDe(req)
  if (!esAdmin(user?.email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const db = supabaseAdmin()

  if (b.accion === 'listar') {
    const [d, c] = await Promise.all([
      db.from('denuncias').select('id,motivo,creado,canal_id,canales(nombre,slug,suspendido)').order('creado', { ascending: false }).limit(100),
      db.from('canales').select('id,nombre,slug,tipo,suspendido,creado,prueba_hasta,plan_hasta,whatsapp').order('creado', { ascending: false }).limit(200),
    ])
    return NextResponse.json({ denuncias: d.data || [], canales: c.data || [] })
  }
  if (b.accion === 'suspender') {
    await db.from('canales').update({ suspendido: !!b.valor, en_vivo: false }).eq('id', b.canalId)
    return NextResponse.json({ ok: true })
  }
  // Registrar un pago recibido (por transferencia, etc.). El abono se suma DESPUÉS de lo que quede de prueba o de plan.
  if (b.accion === 'registrar') {
    const { data: canal } = await db.from('canales').select('id,prueba_hasta,plan_hasta').eq('id', b.canalId).maybeSingle()
    if (!canal) return NextResponse.json({ error: 'Canal inexistente' }, { status: 404 })
    const monto = Number.isFinite(Number(b.monto)) && Number(b.monto) > 0 ? Math.round(Number(b.monto)) : null
    const nota = String(b.nota ?? '').slice(0, 200) || null
    if (b.tipo === 'abono') {
      const base = Math.max(Date.now(), canal.plan_hasta ? new Date(canal.plan_hasta).getTime() : 0, canal.prueba_hasta ? new Date(canal.prueba_hasta).getTime() : 0)
      const nuevo = new Date(base + DIAS_ABONO * 86400000).toISOString()
      await db.from('canales').update({ plan_hasta: nuevo }).eq('id', canal.id)
      await db.from('abonos').insert({ canal_id: canal.id, tipo: 'abono', monto, nota })
      return NextResponse.json({ ok: true, plan_hasta: nuevo })
    }
    if (b.tipo === 'pack_video') {
      await db.from('abonos').insert({ canal_id: canal.id, tipo: 'pack_video', horas: HORAS_PACK_VIDEO, monto, nota })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }
  // Corrección manual del vencimiento del abono
  if (b.accion === 'ajustar-plan') {
    const f = new Date(b.plan_hasta)
    if (isNaN(f.getTime())) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    await db.from('canales').update({ plan_hasta: f.toISOString() }).eq('id', b.canalId)
    return NextResponse.json({ ok: true })
  }
  if (b.accion === 'borrar-denuncia') {
    await db.from('denuncias').delete().eq('id', b.id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
