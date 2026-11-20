import { supabase } from './supabase'

const MAX_FOTO = 5 * 1024 * 1024
const MAX_VIDEO = 50 * 1024 * 1024

export async function subirArchivo(file: File, uid: string): Promise<{ url: string; tipo: 'foto' | 'video' }> {
  const esVideo = file.type.startsWith('video/')
  const esFoto = file.type.startsWith('image/')
  if (!esVideo && !esFoto) throw new Error('Solo se permiten fotos o videos')
  if (esFoto && file.size > MAX_FOTO) throw new Error('La foto supera 5 MB')
  if (esVideo && file.size > MAX_VIDEO) throw new Error('El video supera 50 MB')

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return { url: data.publicUrl, tipo: esVideo ? 'video' : 'foto' }
}
