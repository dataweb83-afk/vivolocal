import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { usuarioDe } from '@/lib/auth-server'

const ESTADOS = ['pendiente', 'pagado', 'armado', 'enviado', 'cancelado']

// Cambia el estado de un pedido (solo el dueño del canal). Si se cancela una compra, devuelve el stock.
export async function POST(req: Request) {
  const user = await usuarioDe(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { pedidoId, estado } = await req.json()
  if (!ESTADOS.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: pedido } = await db.from('pedidos').select('id,estado,tipo,producto_id,canal_id').eq('id', pedidoId).maybeSingle()
  if (!pedido) return NextResponse.json({ error: 'Pedido inexistente' }, { status: 404 })
  const { data: canal } = await db.from('canales').select('owner_id').eq('id', pedido.canal_id).maybeSingle()
  if (canal?.owner_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  if (pedido.estado === estado) return NextResponse.json({ ok: true })

  // Cancelar devuelve la unidad; reactivar un pedido cancelado la vuelve a descontar
  if (pedido.tipo === 'compra' && pedido.producto_id) {
    if (estado === 'cancelado') {
      const { data: p } = await db.from('productos').select('stock').eq('id', pedido.producto_id).maybeSingle()
      if (p) await db.from('productos').update({ stock: p.stock + 1 }).eq('id', pedido.producto_id).eq('stock', p.stock)
    } else if (pedido.estado === 'cancelado') {
      const { data: p } = await db.from('productos').select('stock').eq('id', pedido.producto_id).maybeSingle()
      if (!p || p.stock < 1) return NextResponse.json({ error: 'No hay stock para reactivar este pedido' }, { status: 409 })
      await db.from('productos').update({ stock: p.stock - 1 }).eq('id', pedido.producto_id).eq('stock', p.stock)
    }
  }
  await db.from('pedidos').update({ estado }).eq('id', pedido.id)
  return NextResponse.json({ ok: true })
}
