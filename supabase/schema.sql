-- =====================================================================
--  Revisión diaria de ciclomotores · Esquema de base de datos (Supabase)
--
--  Ejecutar en: Supabase > SQL Editor > New query > Run
--  Antes de ejecutarlo, sustituye 'admin@ejemplo.com' por el correo del
--  usuario administrador (creado en Authentication > Users).
-- =====================================================================

-- ---------------------------------------------------------------------
--  Tablas
-- ---------------------------------------------------------------------
create table if not exists public.empleados (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 1 and 80),
  pin text not null check (pin ~ '^[0-9]{4}$'),
  constraint empleados_pin_unico unique (pin)
);

create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('entrada', 'salida')),
  empleado_id uuid references public.empleados (id) on delete set null,
  conductor text not null check (char_length(conductor) between 1 and 80), -- nombre en el momento del registro
  matricula text not null check (char_length(matricula) between 3 and 15),
  checks jsonb,                       -- { neumaticos: true, frenos: false, ... } (solo entradas)
  incidencia text check (char_length(incidencia) <= 2000),
  afecta_seguridad boolean,
  actuacion text check (char_length(actuacion) <= 2000)
);

create index if not exists registros_created_idx on public.registros (created_at desc);
create index if not exists registros_matricula_idx on public.registros (matricula);
create index if not exists registros_empleado_idx on public.registros (empleado_id, created_at);

-- ---------------------------------------------------------------------
--  Seguridad a nivel de fila (RLS)
-- ---------------------------------------------------------------------
alter table public.empleados enable row level security;
alter table public.registros enable row level security;

-- Empleados: solo el administrador (crear, leer, modificar, borrar)
drop policy if exists "admin gestiona empleados" on public.empleados;
create policy "admin gestiona empleados" on public.empleados
  for all to authenticated
  using ((select auth.jwt() ->> 'email') = 'admin@ejemplo.com')
  with check ((select auth.jwt() ->> 'email') = 'admin@ejemplo.com');

-- Registros: los empleados NO acceden a la tabla; registran mediante registrar().
-- El administrador puede añadir registros pasados desde el panel.
drop policy if exists "insertar registros" on public.registros;
create policy "insertar registros" on public.registros
  for insert to authenticated
  with check ((select auth.jwt() ->> 'email') = 'admin@ejemplo.com');

drop policy if exists "admin lee" on public.registros;
create policy "admin lee" on public.registros
  for select to authenticated using (true);

drop policy if exists "admin borra" on public.registros;
create policy "admin borra" on public.registros
  for delete to authenticated using (true);

-- ---------------------------------------------------------------------
--  Funciones para los empleados (se ejecutan con permisos del servidor)
-- ---------------------------------------------------------------------

-- Devuelve el empleado que tiene ese PIN (sin exponer la tabla ni los PIN).
create or replace function public.verificar_pin(p_pin text)
returns table (id uuid, nombre text)
language sql
security definer
set search_path = public
as $$
  select e.id, e.nombre from public.empleados e where e.pin = p_pin order by e.nombre;
$$;

-- Registra una entrada o salida validando el PIN del empleado.
create or replace function public.registrar(
  p_pin text, p_empleado uuid, p_tipo text, p_matricula text,
  p_checks jsonb, p_incidencia text, p_afecta boolean, p_actuacion text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  select nombre into v_nombre from public.empleados where id = p_empleado and pin = p_pin;
  if v_nombre is null then
    raise exception 'PIN incorrecto' using errcode = '28000';
  end if;
  insert into public.registros (tipo, conductor, empleado_id, matricula, checks, incidencia, afecta_seguridad, actuacion)
  values (p_tipo, v_nombre, p_empleado, upper(trim(p_matricula)), p_checks,
          nullif(trim(coalesce(p_incidencia, '')), ''), coalesce(p_afecta, false),
          nullif(trim(coalesce(p_actuacion, '')), ''));
end;
$$;

revoke all on function public.verificar_pin(text) from public;
revoke all on function public.registrar(text, uuid, text, text, jsonb, text, boolean, text) from public;
grant execute on function public.verificar_pin(text) to anon, authenticated;
grant execute on function public.registrar(text, uuid, text, text, jsonb, text, boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------------
--  Datos de ejemplo (opcional, descomenta y cambia los PIN)
-- ---------------------------------------------------------------------
-- insert into public.empleados (nombre, pin) values
--   ('NOMBRE APELLIDO', '1234'),
--   ('OTRO EMPLEADO',   '5678');
