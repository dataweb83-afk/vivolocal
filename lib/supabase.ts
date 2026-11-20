import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseListo = Boolean(url && anon)

// Cliente para navegador (sesión persistida en localStorage) y lecturas públicas
export const supabase = createClient(url || 'http://localhost', anon || 'sin-configurar')

// Solo servidor: ignora RLS. Usar únicamente en rutas /api.
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}
