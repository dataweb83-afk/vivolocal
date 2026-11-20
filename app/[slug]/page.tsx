import { notFound } from 'next/navigation'
import { supabase, supabaseListo } from '@/lib/supabase'
import type { Canal, Producto, Publicacion, Zona } from '@/lib/data'
import CanalVista from '@/components/Canal'

export const dynamic = 'force-dynamic'

export default async function CanalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!supabaseListo) notFound()
  const { data: canal } = await supabase.from('canales').select('*').eq('slug', slug).maybeSingle()
  if (!canal) notFound()
  const [p, z, pub] = await Promise.all([
    supabase.from('productos').select('*').eq('canal_id', canal.id).eq('activo', true).order('creado', { ascending: false }),
    supabase.from('zonas_envio').select('*').eq('canal_id', canal.id),
    supabase.from('publicaciones').select('*').eq('canal_id', canal.id).order('creado', { ascending: false }),
  ])
  return (
    <CanalVista
      canal={canal as Canal}
      productos={(p.data as Producto[]) || []}
      zonas={(z.data as Zona[]) || []}
      publicaciones={(pub.data as Publicacion[]) || []}
    />
  )
}
