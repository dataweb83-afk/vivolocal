import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { supabaseAdmin } from '@/lib/supabase'

// MercadoPago avisa acá. Nunca confiamos en el body: consultamos el pago con el token del vendedor.
export async function POST(req: Request) {
  const canalId = new URL(req.url).searchParams.get('canal')
  const body = await req.json().catch(() => ({}))
  const paymentId = body?.data?.id
  if (!canalId || !paymentId) return NextResponse.json({ ok: true })

  const db = supabaseAdmin()
  const { data: sec } = await db.from('canal_secretos').select('mp_access_token').eq('canal_id', canalId).maybeSingle()
  if (!sec?.mp_access_token) return NextResponse.json({ ok: true })

  const pago = await new Payment(new MercadoPagoConfig({ accessToken: sec.mp_access_token })).get({ id: paymentId })
  const pedidoId = pago.external_reference
  if (!pedidoId) return NextResponse.json({ ok: true })

  if (pago.status === 'approved') {
    await db.from('pedidos').update({ estado: 'pagado', mp_payment_id: String(paymentId) }).eq('id', pedidoId).eq('canal_id', canalId)
  } else if (pago.status === 'rejected' || pago.status === 'cancelled') {
    await db.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedidoId).eq('canal_id', canalId).eq('estado', 'pendiente')
  }
  return NextResponse.json({ ok: true })
}
