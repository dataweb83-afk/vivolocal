export const COMISION = 0.08 // 8% para la plataforma

// Horas de transmisión propia (LiveKit) gratis por canal y por mes. Protege el cupo de LiveKit.
export const HORAS_VIVO_GRATIS = 20
export const MAX_HORAS_POR_VIVO = 6 // si alguien se olvida de cortar, se cuenta como máximo esto

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

export const pesos = (n: number) => '$' + n.toLocaleString('es-AR')

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
