export type VivoExterno = { tipo: 'embed'; src: string } | { tipo: 'link'; url: string; red: string }

// Vivo externo: se muestra incrustado (YouTube, Facebook, Twitch, Kick) o, si la red no permite incrustar
// (TikTok, Instagram), como botón que lleva al vivo. La compra siempre ocurre en la tienda de VivoLocal.
export function vivoExterno(link: string | null | undefined, hostname: string): VivoExterno | null {
  const e = embedUrl(link, hostname)
  if (e) return { tipo: 'embed', src: e }
  if (!link) return null
  let u: URL
  try { u = new URL(link.trim()) } catch { return null }
  if (u.protocol !== 'https:') return null
  const h = u.hostname.toLowerCase()
  if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return { tipo: 'link', url: u.toString(), red: 'TikTok' }
  if (h === 'instagram.com' || h.endsWith('.instagram.com')) return { tipo: 'link', url: u.toString(), red: 'Instagram' }
  return null
}

// Convierte un link de vivo en una URL de reproductor incrustable. Solo plataformas conocidas (nunca un iframe a cualquier sitio).
export function embedUrl(link: string | null | undefined, hostname: string): string | null {
  if (!link) return null
  let u: URL
  try { u = new URL(link.trim()) } catch { return null }
  const h = u.hostname.replace(/^www\.|^m\./, '')
  const id = (s: string | null | undefined) => (s && /^[\w-]{6,20}$/.test(s) ? s : null)

  if (h === 'youtube.com' || h === 'youtu.be') {
    const v = h === 'youtu.be' ? id(u.pathname.slice(1)) : id(u.searchParams.get('v')) || id(u.pathname.split('/').filter(Boolean)[1])
    return v ? `https://www.youtube.com/embed/${v}?autoplay=1` : null
  }
  if (h === 'twitch.tv') {
    const canal = u.pathname.split('/').filter(Boolean)[0]
    return canal && /^\w{3,25}$/.test(canal) ? `https://player.twitch.tv/?channel=${canal}&parent=${hostname}&muted=true` : null
  }
  if (h === 'kick.com') {
    const canal = u.pathname.split('/').filter(Boolean)[0]
    return canal && /^[\w-]{3,25}$/.test(canal) ? `https://player.kick.com/${canal}` : null
  }
  if (h === 'facebook.com' || h === 'fb.watch') {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.toString())}&show_text=false`
  }
  return null
}
