'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, supabaseListo } from '@/lib/supabase'

export default function Ingresar() {
  const router = useRouter()
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [acepto, setAcepto] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setAviso('')
    if (!supabaseListo) return setError('Falta configurar Supabase (.env.local)')
    if (modo === 'crear' && !acepto) return setError('Tenés que aceptar los términos para crear la cuenta')
    setCargando(true)
    const { data, error } =
      modo === 'crear'
        ? await supabase.auth.signUp({ email, password: pass })
        : await supabase.auth.signInWithPassword({ email, password: pass })
    setCargando(false)
    if (error) return setError(error.message)
    if (modo === 'crear' && !data.session) return setAviso('Te mandamos un mail para confirmar la cuenta.')
    router.push('/panel')
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-extrabold mb-1">{modo === 'entrar' ? 'Ingresar' : 'Crear cuenta'}</h1>
      <p className="text-sm text-zinc-400 mb-6">Para vender o transmitir en VivoLocal.</p>
      <form onSubmit={enviar} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none" />
        <input type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña (mín. 6)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none" />
        {modo === 'crear' && (
          <label className="flex gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5" />
            <span>
              Acepto los <Link href="/terminos" className="underline text-brand">términos y condiciones</Link>. Entiendo que todo lo que publique
              y venda es de mi exclusiva responsabilidad.
            </span>
          </label>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {aviso && <p className="text-sm text-green-400">{aviso}</p>}
        <button disabled={cargando} className="w-full bg-brand hover:bg-brand-dark py-2.5 rounded-lg font-semibold disabled:opacity-50">
          {cargando ? '...' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
      <button onClick={() => setModo(modo === 'entrar' ? 'crear' : 'entrar')} className="mt-4 text-sm text-zinc-400 underline">
        {modo === 'entrar' ? '¿No tenés cuenta? Creala' : '¿Ya tenés cuenta? Ingresá'}
      </button>
    </main>
  )
}
