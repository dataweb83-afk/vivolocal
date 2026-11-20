# VivoLocal

Plataforma de vivos con venta en el momento (tiendas) y contenido + cafecitos (personas).
VivoLocal es solo intermediario: cada vendedor es responsable de lo que publica y vende.

Next.js 15 · Tailwind · Supabase (auth, base, storage, realtime) · LiveKit (video) · MercadoPago.

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # completar valores
npm run dev                  # http://localhost:6600
```

## Puesta en marcha

1. **Supabase**: crear proyecto, correr `supabase/schema.sql` completo en el SQL Editor.
   Cargar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
2. **LiveKit** (video en vivo): proyecto en livekit.io, cargar `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
3. **MercadoPago**: cada vendedor pega su Access Token en Panel → Zonas y pagos.
4. **Webhook MP**: `NEXT_PUBLIC_URL` debe ser la URL pública (en Vercel, la del dominio) para que MP pueda avisar los pagos.

## Deploy (Vercel u otro)

Cargar las mismas variables de `.env.example` en el hosting y `NEXT_PUBLIC_URL` con el dominio final.

## Pendiente

- OAuth de MercadoPago (para cobrar la comisión automática; hoy solo se registra).
- Reserva de stock con vencimiento para pagos de MP abandonados.
- Revisión legal de `/terminos`.
