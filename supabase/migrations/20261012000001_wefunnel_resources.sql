-- =========================================================================
-- Recursos: formación que no es el curso.
--
-- El curso de WeFunnels es uno y cerrado: enseña a llevar tráfico al
-- funnel y termina donde termina. Esto es otra cosa -- cursos de anuncios
-- y de contenido en redes que se suben cuando se graban, se reordenan y a
-- veces se retiran. Mezclarlos con el curso habría convertido una pieza
-- terminada en un contenedor que crece, y habría obligado a tocar código
-- cada vez que hay un vídeo nuevo.
--
-- Dos tablas y no una. Un solo nivel con una etiqueta de texto por fila
-- habría puesto el nombre del curso repetido en cada vídeo: renombrarlo
-- serían N escrituras, el orden de los cursos no tendría dónde vivir, y
-- una errata crearía un curso fantasma con un vídeo dentro.
--
-- Nadie es dueño de esto: lo carga la plataforma y lo ve todo el mundo que
-- tiene panel, gratuito o distribuidor. Por eso no hay account_id en
-- ninguna de las dos, y por eso escribir es solo de administrador.
-- =========================================================================

create table public.wefunnel_resource_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null constraint wefunnel_resource_sections_title_len check (char_length(trim(title)) between 1 and 120),
  description text constraint wefunnel_resource_sections_desc_len check (description is null or char_length(description) <= 600),
  position int not null default 0,
  -- Se crea despublicado. Un curso se sube vídeo a vídeo, y la alternativa
  -- es que la gente vea aparecer un curso de un solo vídeo y volver al día
  -- siguiente a ver si creció.
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wefunnel_resource_sections_order_idx
  on public.wefunnel_resource_sections (position, created_at);

create table public.wefunnel_resources (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.wefunnel_resource_sections (id) on delete cascade,
  title text not null constraint wefunnel_resources_title_len check (char_length(trim(title)) between 1 and 160),
  description text constraint wefunnel_resources_desc_len check (description is null or char_length(description) <= 600),
  -- El identificador, no la dirección pegada. Guardar la URL entera
  -- obligaría a cada lector a volver a parsearla, y dejaría entrar
  -- cualquier cosa que se pareciese a un enlace. Once caracteres del
  -- alfabeto de YouTube: lo que no encaje aquí no llega a la base.
  youtube_id text not null constraint wefunnel_resources_youtube_id_shape check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  -- Opcional y a mano: la duración real solo la da la API de YouTube, y
  -- pedir una clave para escribir "12 min" debajo de un vídeo no se paga.
  duration_label text constraint wefunnel_resources_duration_len check (duration_label is null or char_length(duration_label) <= 24),
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wefunnel_resources_section_idx
  on public.wefunnel_resources (section_id, position, created_at);

create trigger set_updated_at before update on public.wefunnel_resource_sections
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.wefunnel_resources
  for each row execute function public.set_updated_at();

alter table public.wefunnel_resource_sections enable row level security;
alter table public.wefunnel_resources enable row level security;

-- Lo publicado lo lee cualquiera con sesión. No hay nada que acotar por
-- cuenta: es el mismo material para todos, y acotarlo por panel obligaría
-- a una consulta de pertenencia por fila para proteger unos vídeos que de
-- todas formas están alojados en YouTube.
create policy wefunnel_resource_sections_select on public.wefunnel_resource_sections
  for select to authenticated
  using (published or public.is_platform_admin());

-- Un vídeo publicado dentro de un curso sin publicar no se ve: el curso
-- manda. Si no, despublicar un curso dejaría sus vídeos sueltos y
-- visibles sin nada que los agrupara.
create policy wefunnel_resources_select on public.wefunnel_resources
  for select to authenticated
  using (
    public.is_platform_admin()
    or (
      published
      and exists (
        select 1 from public.wefunnel_resource_sections s
        where s.id = section_id and s.published
      )
    )
  );

-- Escribir es de la plataforma. Sin políticas de insert/update/delete para
-- authenticated: las RPC de abajo son el único camino, y comprueban otra
-- vez quién llama.
-- =========================================================================
-- Altas y bajas, desde el Superadmin.
--
-- La comprobación vive aquí y no solo en la ruta por el mismo motivo que
-- en wefunnel_set_suspended: quien puede publicar formación a todos los
-- paneles no debería depender de qué ruta hizo la llamada.
-- =========================================================================
create or replace function public.wefunnel_resource_section_upsert(
  p_id uuid,
  p_title text,
  p_description text,
  p_position int,
  p_published boolean
)
returns public.wefunnel_resource_sections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.wefunnel_resource_sections;
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  if p_id is null then
    insert into public.wefunnel_resource_sections (title, description, position, published)
    values (trim(p_title), nullif(trim(coalesce(p_description, '')), ''), coalesce(p_position, 0), coalesce(p_published, false))
    returning * into v_row;
  else
    update public.wefunnel_resource_sections
    set title = trim(p_title),
        description = nullif(trim(coalesce(p_description, '')), ''),
        position = coalesce(p_position, 0),
        published = coalesce(p_published, false)
    where id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'wefunnel: no existe ese curso';
    end if;
  end if;

  return v_row;
end;
$$;

create or replace function public.wefunnel_resource_upsert(
  p_id uuid,
  p_section_id uuid,
  p_title text,
  p_description text,
  p_youtube_id text,
  p_duration_label text,
  p_position int,
  p_published boolean
)
returns public.wefunnel_resources
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.wefunnel_resources;
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  if p_id is null then
    insert into public.wefunnel_resources
      (section_id, title, description, youtube_id, duration_label, position, published)
    values (
      p_section_id, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
      p_youtube_id, nullif(trim(coalesce(p_duration_label, '')), ''),
      coalesce(p_position, 0), coalesce(p_published, true)
    )
    returning * into v_row;
  else
    update public.wefunnel_resources
    set section_id = p_section_id,
        title = trim(p_title),
        description = nullif(trim(coalesce(p_description, '')), ''),
        youtube_id = p_youtube_id,
        duration_label = nullif(trim(coalesce(p_duration_label, '')), ''),
        position = coalesce(p_position, 0),
        published = coalesce(p_published, true)
    where id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'wefunnel: no existe ese recurso';
    end if;
  end if;

  return v_row;
end;
$$;

create or replace function public.wefunnel_resource_delete(p_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  if p_kind = 'section' then
    -- Los vídeos caen con el curso por la clave foránea. Es lo que se
    -- espera al borrar un curso entero, y el Superadmin lo advierte antes.
    delete from public.wefunnel_resource_sections where id = p_id;
  elsif p_kind = 'resource' then
    delete from public.wefunnel_resources where id = p_id;
  else
    raise exception 'wefunnel: tipo desconocido';
  end if;
end;
$$;

grant execute on function public.wefunnel_resource_section_upsert(uuid, text, text, int, boolean) to authenticated;
grant execute on function public.wefunnel_resource_upsert(uuid, uuid, text, text, text, text, int, boolean) to authenticated;
grant execute on function public.wefunnel_resource_delete(uuid, text) to authenticated;
