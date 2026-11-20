import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { COMISION } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'

const err = (error: string, status = 400) => NextResponse.json({ error }, { status })
const txt = (v: unknown, max = 200) => String(v ?? '').slice(0, max)

// Todo se valida en el servidor: precios, stock, envío y formas de pago salen de la base, nunca del cliente.
export async function POST(req: Request) {
  const b = await req.json()
  const db = supabaseAdmin()

  const { data: canal } = await db.from('canales').select('*').eq('id', b.canalId).maybeSingle()
  if (!canal || canal.suspendido) return err('Canal inexistente', 404)

  const nombre = txt(b.nombre, 80), contacto = txt(b.contacto, 120)
  if (!nombre || !contacto) return err('Completá tu nombre y contacto')

  let titulo: string, monto: number, envio = 0, productoId: string | null = null, zonaNombre: string | null = null
  const pago = txt(b.pago, 20)

  if (b.tipo === 'propina') {
    monto = Number(b.monto)
    if (!(monto >= 100 && monto <= 500000)) return err('Monto inválido')
    if (!canal.formas_pago.includes('mercadopago')) return err('Este canal no recibe cafecitos')
    titulo = `Cafecito para ${canal.nombre}`
  } else {
    if (!canal.formas_pago.includes(pago)) return err('Forma de pago no disponible')
    const { data: prod } = await db.from('productos').select('*').eq('id', b.productoId).eq('canal_id', canal.id).eq('activo', true).maybeSingle()
    if (!prod) return err('Producto inexistente', 404)
    if (prod.talles.length && !prod.talles.includes(b.talle)) return err('Talle inválido')

    if (pago !== 'retiro' && b.zonaId) {
      const { data: z } = await db.from('zonas_envio').select('*').eq('id', b.zonaId).eq('canal_id', canal.id).maybeSingle()
      if (!z) return err('Zona inválida')
      envio = z.costo; zonaNombre = z.nombre
      if (!txt(b.direccion)) return err('Falta la dirección')
    }

    // Descuento de stock atómico: solo si el stock no cambió desde que lo leímos
    const { data: ok } = await db.from('productos').update({ stock: prod.stock - 1 }).eq('id', prod.id).eq('stock', prod.stock).gte('stock', 1).select('id')
    if (!ok?.length) return err('Se acaba de agotar o cambió el stock, probá de nuevo', 409)

    titulo = prod.nombre + (b.talle ? ` (talle ${b.talle})` : '')
    monto = prod.precio
    productoId = prod.id
  }

  const comision = pago === 'mercadopago' || b.tipo === 'propina' ? Math.round(monto * COMISION) : 0

  const { data: pedido, error } = await db.from('pedidos').insert({
    canal_id: canal.id, producto_id: productoId, tipo: b.tipo, monto, envio, comision,
    talle: txt(b.talle, 20) || null, zona: zonaNombre, forma_pago: b.tipo === 'propina' ? 'mercadopago' : pago,
    comprador_nombre: nombre, comprador_contacto: contacto, direccion: txt(b.direccion) || null,
  }).select('id').single()
  if (error || !pedido) return err('No se pudo registrar el pedido', 500)

  if (b.tipo !== 'propina' && pago !== 'mercadopago') return NextResponse.json({ ok: true, pedidoId: pedido.id, total: monto + envio })

  // MercadoPago con el token del vendedor
  const { data: sec } = await db.from('canal_secretos').select('*').eq('canal_id', canal.id).maybeSingle()
  if (!sec?.mp_access_token) return err('El vendedor todavía no configuró MercadoPago', 503)

  const base = process.env.NEXT_PUBLIC_URL || 'http://localhost:6600'
  const items = [{ id: pedido.id, title: titulo, quantity: 1, unit_price: monto + envio, currency_id: 'ARS' }]
  const pref = await new Preference(new MercadoPagoConfig({ accessToken: sec.mp_access_token })).create({
    body: {
      items,
      external_reference: pedido.id,
      notification_url: `${base}/api/mp-webhook?canal=${canal.id}`,
      // La comisión automática solo funciona con el token obtenido por OAuth de la plataforma
      ...(sec.mp_oauth ? { marketplace_fee: comision } : {}),
      back_urls: { success: `${base}/${canal.slug}?ok=1`, failure: `${base}/${canal.slug}`, pending: `${base}/${canal.slug}` },
      auto_return: 'approved',
    },
  })
  return NextResponse.json({ url: pref.init_point, pedidoId: pedido.id, total: monto + envio })
}
