-- VivoLocal: esquema v2  (ejecutar completo en el SQL Editor de Supabase)

create table if not exists canales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null unique,
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,40}$'),
  nombre text not null,
  tipo text not null check (tipo in ('tienda','persona')),
  descripcion text default '',
  avatar text,
  whatsapp text,
  ciudad text,
  en_vivo boolean default false,
  formas_pago text[] default '{}',        -- mercadopago, efectivo, transferencia, retiro
  alias_transferencia text,
  billeteras text,                        -- una por línea: "Lemon: $usuario", "Ualá: alias"
  acepto_terminos_at timestamptz not null default now(),
  suspendido boolean default false,
  creado timestamptz default now()
);

-- Datos privados del vendedor (nunca públicos)
create table if not exists canal_secretos (
  canal_id uuid primary key references canales(id) on delete cascade,
  mp_access_token text,
  mp_oauth boolean default false
);

create table if not exists zonas_envio (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid references canales(id) on delete cascade not null,
  nombre text not null,                   -- "Centro", "Zona Norte", "Todo el país"
  costo integer not null default 0 check (costo >= 0),
  demora text                              -- "24 hs", "2 a 4 días"
);

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid references canales(id) on delete cascade not null,
  nombre text not null,
  descripcion text default '',
  precio integer not null check (precio > 0),
  stock integer not null default 0 check (stock >= 0),
  talles text[] default '{}',
  imagenes text[] default '{}',
  activo boolean default true,
  creado timestamptz default now()
);

-- Fotos y videos que sube cualquier canal (el contenido es responsabilidad de quien lo sube)
create table if not exists publicaciones (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid references canales(id) on delete cascade not null,
  tipo text not null check (tipo in ('foto','video')),
  url text not null,
  titulo text default '',
  precio integer check (precio is null or precio > 0),   -- opcional, si lo vende
  creado timestamptz default now()
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid references canales(id) not null,
  producto_id uuid references productos(id),
  tipo text not null check (tipo in ('compra','propina')),
  monto integer not null,
  envio integer not null default 0,
  comision integer not null default 0,
  talle text,
  zona text,
  forma_pago text,
  comprador_nombre text,
  comprador_contacto text,
  direccion text,
  mp_payment_id text,
  estado text default 'pendiente' check (estado in ('pendiente','pagado','armado','enviado','cancelado')),
  creado timestamptz default now()
);

create table if not exists denuncias (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid references canales(id) on delete cascade,
  motivo text not null,
  creado timestamptz default now()
);

alter table canales enable row level security;
alter table canal_secretos enable row level security;
alter table zonas_envio enable row level security;
alter table productos enable row level security;
alter table publicaciones enable row level security;
alter table pedidos enable row level security;
alter table denuncias enable row level security;

create policy "canales públicos" on canales for select using (not suspendido or auth.uid() = owner_id);
create policy "dueño crea canal" on canales for insert with check (auth.uid() = owner_id);
create policy "dueño edita canal" on canales for update using (auth.uid() = owner_id);

create policy "dueño secretos" on canal_secretos for all
  using (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));

create policy "zonas públicas" on zonas_envio for select using (true);
create policy "dueño zonas" on zonas_envio for all
  using (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));

create policy "productos públicos" on productos for select using (activo or exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));
create policy "dueño productos" on productos for all
  using (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));

create policy "publicaciones públicas" on publicaciones for select using (true);
create policy "dueño publicaciones" on publicaciones for all
  using (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));

create policy "dueño ve pedidos" on pedidos for select
  using (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));
create policy "dueño actualiza pedidos" on pedidos for update
  using (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));

create policy "cualquiera denuncia" on denuncias for insert with check (true);

-- Storage: bucket público de lectura; cada usuario escribe solo en su carpeta (uid/archivo)
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
create policy "media lectura" on storage.objects for select using (bucket_id = 'media');
create policy "media subir propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media borrar propio" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Chat en vivo (se muestran los últimos mensajes; podés limpiar con un cron si querés)
create table if not exists mensajes (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid references canales(id) on delete cascade not null,
  autor text not null check (char_length(autor) between 1 and 30),
  texto text not null check (char_length(texto) between 1 and 300),
  creado timestamptz default now()
);
create index if not exists mensajes_canal_idx on mensajes (canal_id, creado desc);
alter table mensajes enable row level security;
create policy "chat público" on mensajes for select using (true);
create policy "cualquiera escribe en el chat" on mensajes for insert with check (true);
create policy "dueño modera chat" on mensajes for delete
  using (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));
alter publication supabase_realtime add table mensajes;

-- Permisos de tablas (los proyectos nuevos de Supabase ya no los dan automáticamente; RLS sigue protegiendo)
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
revoke all on table public.canal_secretos from anon;
grant insert on public.mensajes, public.denuncias to anon;

-- Migración para proyectos ya creados: billeteras virtuales (Lemon, Ualá, etc.)
alter table canales add column if not exists billeteras text;

-- Modo de vivo: 'propio' (LiveKit, con tope de horas) o 'externo' (YouTube/Facebook/Twitch/Kick incrustado, costo cero)
alter table canales add column if not exists vivo_modo text not null default 'propio' check (vivo_modo in ('propio','externo'));
alter table canales add column if not exists vivo_url text;

-- Registro de transmisiones propias, para limitar las horas gratis por mes
create table if not exists vivos (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid references canales(id) on delete cascade not null,
  inicio timestamptz not null default now(),
  fin timestamptz
);
alter table vivos enable row level security;
create policy "dueño ve sus vivos" on vivos for select
  using (exists (select 1 from canales c where c.id = canal_id and c.owner_id = auth.uid()));
grant select on public.vivos to authenticated;
grant all on public.vivos to service_role;

-- Personalización de la página de venta de cada canal
alter table canales add column if not exists portada text;
alter table canales add column if not exists color text not null default '#E11D48' check (color ~ '^#[0-9a-fA-F]{6}$');
alter table canales add column if not exists lema text check (char_length(lema) <= 80);
alter table canales add column if not exists instagram text check (char_length(instagram) <= 40);
alter table canales add column if not exists rubro text;
