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
  dia date not null,                  -- día de trabajo (las salidas hasta la 1:30 cuentan para el día anterior)
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

-- Un registro de entrada y uno de salida por empleado y día
create unique index if not exists registros_unico_por_dia
  on public.registros (empleado_id, tipo, dia)
  where empleado_id is not null;

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

-- Registros: los empleados NO acceden a la tabla; registran mediante registrar_turno().
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

drop policy if exists "admin modifica" on public.registros;
create policy "admin modifica" on public.registros
  for update to authenticated
  using ((select auth.jwt() ->> 'email') = 'admin@ejemplo.com')
  with check ((select auth.jwt() ->> 'email') = 'admin@ejemplo.com');

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

-- Entrada del turno actual del empleado (el formulario de salida la usa para saber la moto).
create or replace function public.entrada_del_turno(p_pin text, p_empleado uuid)
returns table (matricula text, hora text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local timestamp := timezone('Europe/Madrid', now());
  v_dia date;
begin
  if not exists (select 1 from public.empleados where id = p_empleado and pin = p_pin) then
    raise exception 'PIN incorrecto' using errcode = '28000';
  end if;
  v_dia := v_local::date;
  if v_local::time < time '01:31' then
    v_dia := v_dia - 1;
  end if;
  return query
    select r.matricula, to_char(timezone('Europe/Madrid', r.created_at), 'HH24:MI')
    from public.registros r
    where r.empleado_id = p_empleado and r.tipo = 'entrada' and r.dia = v_dia
    order by r.created_at desc
    limit 1;
end;
$$;

-- Registra la entrada o salida del día validando el PIN del empleado.
--  · Un registro por empleado, tipo y día de trabajo.
--  · La salida exige una entrada ese día (error SE001) y usa la moto de la entrada.
--  · Las salidas hasta la 1:30 (hora de Madrid) cuentan para el día anterior.
--  · Si ya existe, lanza el error YA001 (con la hora del existente en `detail`);
--    con p_reemplazar = true, sustituye el registro existente por el nuevo.
create or replace function public.registrar_turno(
  p_pin text, p_empleado uuid, p_tipo text, p_matricula text,
  p_checks jsonb, p_incidencia text, p_afecta boolean, p_actuacion text,
  p_reemplazar boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_local timestamp := timezone('Europe/Madrid', now());
  v_dia date;
  v_id uuid;
  v_hora timestamptz;
  v_matricula text := upper(trim(p_matricula));
begin
  select nombre into v_nombre from public.empleados where id = p_empleado and pin = p_pin;
  if v_nombre is null then
    raise exception 'PIN incorrecto' using errcode = '28000';
  end if;
  if p_tipo not in ('entrada', 'salida') then
    raise exception 'Tipo no válido' using errcode = '22023';
  end if;

  -- Día de trabajo
  v_dia := v_local::date;
  if p_tipo = 'salida' and v_local::time < time '01:31' then
    v_dia := v_dia - 1;
  end if;

  -- La salida exige una entrada ese día y se registra con la moto de la entrada
  if p_tipo = 'salida' then
    select matricula into v_matricula
    from public.registros
    where empleado_id = p_empleado and tipo = 'entrada' and dia = v_dia
    order by created_at desc
    limit 1;
    if v_matricula is null then
      raise exception 'SIN_ENTRADA' using errcode = 'SE001';
    end if;
  end if;

  select id, created_at into v_id, v_hora
  from public.registros
  where empleado_id = p_empleado and tipo = p_tipo and dia = v_dia
  order by created_at desc
  limit 1;

  if v_id is not null then
    if not p_reemplazar then
      raise exception 'YA_EXISTE' using errcode = 'YA001',
        detail = to_char(timezone('Europe/Madrid', v_hora), 'HH24:MI');
    end if;
    update public.registros
    set conductor = v_nombre,
        matricula = v_matricula,
        checks = p_checks,
        incidencia = nullif(trim(coalesce(p_incidencia, '')), ''),
        afecta_seguridad = coalesce(p_afecta, false),
        actuacion = nullif(trim(coalesce(p_actuacion, '')), ''),
        created_at = now()
    where id = v_id;
  else
    insert into public.registros (tipo, conductor, empleado_id, matricula, checks, incidencia, afecta_seguridad, actuacion, dia)
    values (p_tipo, v_nombre, p_empleado, v_matricula, p_checks,
            nullif(trim(coalesce(p_incidencia, '')), ''), coalesce(p_afecta, false),
            nullif(trim(coalesce(p_actuacion, '')), ''), v_dia);
  end if;

  -- Si se cambia la moto de la entrada, la salida de ese día debe llevar la misma
  if p_tipo = 'entrada' then
    update public.registros set matricula = v_matricula
    where empleado_id = p_empleado and tipo = 'salida' and dia = v_dia and matricula <> v_matricula;
  end if;
end;
$$;

-- Toda salida (también las que crea el administrador) exige una entrada del mismo empleado
-- ese día y se guarda con la moto de la entrada.
create or replace function public.registros_salida_con_entrada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula text;
begin
  if new.tipo = 'salida' and new.empleado_id is not null then
    select matricula into v_matricula
    from public.registros
    where empleado_id = new.empleado_id and tipo = 'entrada' and dia = new.dia
    order by created_at desc
    limit 1;
    if v_matricula is null then
      raise exception 'SIN_ENTRADA' using errcode = 'SE001';
    end if;
    new.matricula := v_matricula;
  end if;
  return new;
end;
$$;

drop trigger if exists registros_salida_con_entrada on public.registros;
create trigger registros_salida_con_entrada
  before insert or update on public.registros
  for each row execute function public.registros_salida_con_entrada();

revoke all on function public.verificar_pin(text) from public;
revoke all on function public.entrada_del_turno(text, uuid) from public;
revoke all on function public.registrar_turno(text, uuid, text, text, jsonb, text, boolean, text, boolean) from public;
grant execute on function public.verificar_pin(text) to anon, authenticated;
grant execute on function public.entrada_del_turno(text, uuid) to anon, authenticated;
grant execute on function public.registrar_turno(text, uuid, text, text, jsonb, text, boolean, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
--  Datos de ejemplo (opcional, descomenta y cambia los PIN)
-- ---------------------------------------------------------------------
-- insert into public.empleados (nombre, pin) values
--   ('NOMBRE APELLIDO', '1234'),
--   ('OTRO EMPLEADO',   '5678');
