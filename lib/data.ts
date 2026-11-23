export const COMISION = 0.08 // 8% para la plataforma

// Horas de transmisión propia (LiveKit) gratis por canal y por mes. Protege el cupo de LiveKit.
export const HORAS_VIVO_GRATIS = 20
export const MAX_HORAS_POR_VIVO = 6 // si alguien se olvida de cortar, se cuenta como máximo esto

// ── ABONO ──────────────────────────────────────────────────────────────
export const DIAS_PRUEBA = 30
export const DIAS_ABONO = 30
export const HORAS_PACK_VIDEO = 10 // horas que suma cada pack de video
// Datos de cobro de VivoLocal (se configuran como variables de entorno públicas)
export const PRECIO_ABONO = process.env.NEXT_PUBLIC_ABONO_PRECIO || 'a confirmar'
export const PRECIO_PACK = process.env.NEXT_PUBLIC_PACK_PRECIO || 'a confirmar'
export const COBRO_ALIAS = process.env.NEXT_PUBLIC_COBRO_ALIAS || ''
export const COBRO_WHATSAPP = (process.env.NEXT_PUBLIC_COBRO_WHATSAPP || '').replace(/\D/g, '')

export type EstadoPlan = { estado: 'prueba' | 'activo' | 'vencido'; hasta: Date | null; dias: number }

// El canal funciona mientras esté dentro de la prueba o del abono pagado.
export function estadoPlan(c: { prueba_hasta?: string | null; plan_hasta?: string | null }, ahora = Date.now()): EstadoPlan {
  const p = c.prueba_hasta ? new Date(c.prueba_hasta).getTime() : 0
  const a = c.plan_hasta ? new Date(c.plan_hasta).getTime() : 0
  const dias = (t: number) => Math.max(0, Math.ceil((t - ahora) / 86400000))
  if (a > ahora) return { estado: 'activo', hasta: new Date(a), dias: dias(a) }
  if (p > ahora) return { estado: 'prueba', hasta: new Date(p), dias: dias(p) }
  return { estado: 'vencido', hasta: new Date(Math.max(a, p)) , dias: 0 }
}
export const planVigente = (c: { prueba_hasta?: string | null; plan_hasta?: string | null }) => estadoPlan(c).estado !== 'vencido'

// Horas de video propio del mes: las gratis + las de los packs comprados este mes
export function horasTope(packs: { horas: number | null; creado: string }[], ahora = Date.now()) {
  const d = new Date(ahora)
  const inicioMes = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  return HORAS_VIVO_GRATIS + packs.filter((p) => new Date(p.creado).getTime() >= inicioMes).reduce((a, p) => a + (p.horas || 0), 0)
}

// Minutos usados este mes (UTC) a partir de los registros de vivos
export function minutosUsados(vivos: { inicio: string; fin: string | null }[], ahora = Date.now()) {
  const d = new Date(ahora)
  const inicioMes = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  let ms = 0
  for (const v of vivos) {
    const ini = Math.max(new Date(v.inicio).getTime(), inicioMes)
    const tope = new Date(v.inicio).getTime() + MAX_HORAS_POR_VIVO * 3600_000
    const fin = Math.min(v.fin ? new Date(v.fin).getTime() : ahora, tope)
    if (fin > ini) ms += fin - ini
  }
  return Math.round(ms / 60000)
}

export type Canal = {
  id: string
  slug: string
  nombre: string
  tipo: 'tienda' | 'persona'
  descripcion: string
  avatar: string | null
  whatsapp: string | null
  ciudad: string | null
  en_vivo: boolean
  formas_pago: string[]
  alias_transferencia: string | null
  billeteras: string | null
  vivo_modo: 'propio' | 'externo'
  vivo_url: string | null
  prueba_hasta: string | null
  plan_hasta: string | null
  portada: string | null
  color: string
  lema: string | null
  instagram: string | null
  rubro: string | null
}

export type Producto = {
  id: string
  canal_id: string
  nombre: string
  descripcion: string
  precio: number
  stock: number
  talles: string[]
  imagenes: string[]
  activo: boolean
}

export type Zona = { id: string; canal_id: string; nombre: string; costo: number; demora: string | null }

export type Publicacion = {
  id: string
  canal_id: string
  tipo: 'foto' | 'video'
  url: string
  titulo: string
  precio: number | null
}

export const FORMAS_PAGO: Record<string, string> = {
  mercadopago: 'Tarjeta Visa / Mastercard o dinero en cuenta (MercadoPago)',
  billetera: 'Billetera virtual (Lemon, Ualá, Belo, etc.)',
  efectivo: 'Efectivo al recibir',
  transferencia: 'Transferencia bancaria',
  retiro: 'Retiro en el local (pago ahí)',
}

export const RUBROS = ['Ropa y moda', 'Calzado', 'Accesorios', 'Belleza y cuidado', 'Comida y bebida', 'Hogar y deco', 'Tecnología', 'Deportes', 'Juguetes y niños', 'Arte y regalos', 'Servicios', 'Otro']

export const COLORES = ['#E11D48', '#F97316', '#EAB308', '#16A34A', '#0EA5E9', '#6366F1', '#A855F7', '#EC4899', '#14B8A6', '#F4F4F5']

// Color de texto legible (blanco o casi negro) sobre el color de marca elegido
export function textoSobre(hex: string) {
  const h = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#E11D48'
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111111' : '#ffffff'
}

export const colorSeguro = (hex?: string | null) => (hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#E11D48')

export const pesos =(n: number) => '$' + n.toLocaleString('es-AR')

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
