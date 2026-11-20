import { supabaseAdmin } from './supabase'

// Devuelve el usuario dueño de la sesión (Bearer token) o null. Solo servidor.
export async function usuarioDe(req: Request) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!jwt) return null
  const { data } = await supabaseAdmin().auth.getUser(jwt)
  return data.user ?? null
}

export function esAdmin(email?: string | null) {
  const lista = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return !!email && lista.includes(email.toLowerCase())
}
