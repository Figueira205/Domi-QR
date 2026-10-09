-- Ejecutar en Supabase: SQL Editor > New query > Run

create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('entrada', 'salida')),
  conductor text not null check (char_length(conductor) between 1 and 60),
  matricula text not null check (char_length(matricula) between 3 and 15),
  checks jsonb,                       -- { neumaticos: true, frenos: false, ... } (solo entrada)
  incidencia text check (char_length(incidencia) <= 2000),
  afecta_seguridad boolean,
  actuacion text check (char_length(actuacion) <= 2000)
);

create index if not exists registros_created_idx on public.registros (created_at desc);
create index if not exists registros_matricula_idx on public.registros (matricula);

alter table public.registros enable row level security;

-- Cualquiera con el enlace/QR puede CREAR registros, pero no leerlos ni modificarlos.
drop policy if exists "insertar registros" on public.registros;
create policy "insertar registros" on public.registros
  for insert to anon, authenticated
  with check (true);

-- Solo el administrador autenticado puede LEER (y borrar si hiciera falta).
drop policy if exists "admin lee" on public.registros;
create policy "admin lee" on public.registros
  for select to authenticated using (true);

drop policy if exists "admin borra" on public.registros;
create policy "admin borra" on public.registros
  for delete to authenticated using (true);
