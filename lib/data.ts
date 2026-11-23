export const COMISION = 0.08 // 8% para la plataforma

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
