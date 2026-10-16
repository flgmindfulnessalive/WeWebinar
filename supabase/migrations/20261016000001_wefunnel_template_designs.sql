-- =========================================================================
-- Los diseños descargables de las plantillas.
--
-- Las plantillas daban el texto: qué poner en la imagen y qué escribir
-- debajo. Faltaba la imagen. Un constructor que no sabe diseñar se
-- quedaba con instrucciones para un diseño que tenía que hacer él, que es
-- justo el trabajo que esto venía a quitarle.
--
-- Una dirección y no el fichero en la base: son imágenes de 1080 por 1350
-- y no tienen nada que hacer en una fila. Las que vienen de casa se
-- sirven desde public/, y las que se suban después van al bucket de
-- abajo; la columna admite las dos porque solo guarda a dónde mirar.
-- =========================================================================
alter table public.wefunnel_templates
  add column image_url text
    constraint wefunnel_templates_image_url_len
    check (image_url is null or char_length(image_url) <= 500);

comment on column public.wefunnel_templates.image_url is
  'A dónde está el diseño descargable, si lo tiene. Puede ser una ruta de la propia aplicación (/wefunnels/...) o una dirección completa del almacenamiento.';

-- =========================================================================
-- Dónde viven los diseños que se suben desde el Superadmin.
--
-- Público de lectura, igual que avatars y por el mismo motivo: el diseño
-- acaba publicado en Instagram, así que esconderlo no protege nada. La
-- escritura solo ocurre con el cliente de servicio, desde una acción que
-- ya comprobó que quien llama es administrador de plataforma, así que no
-- hacen falta políticas sobre storage.objects.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('wefunnels', 'wefunnels', true)
on conflict (id) do nothing;

-- =========================================================================
-- La RPC gana el parámetro. Reemplaza la de 20261015000002.
-- =========================================================================
create or replace function public.wefunnel_template_upsert(
  p_id uuid,
  p_kind text,
  p_title text,
  p_format_label text,
  p_art_text text,
  p_body text,
  p_notes text,
  p_position int,
  p_published boolean,
  p_image_url text default null
)
returns public.wefunnel_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.wefunnel_templates;
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  if p_id is null then
    insert into public.wefunnel_templates
      (kind, title, format_label, art_text, body, notes, position, published, image_url)
    values (
      p_kind, trim(p_title),
      nullif(trim(coalesce(p_format_label, '')), ''),
      nullif(trim(coalesce(p_art_text, '')), ''),
      trim(p_body),
      nullif(trim(coalesce(p_notes, '')), ''),
      coalesce(p_position, 0), coalesce(p_published, true),
      nullif(trim(coalesce(p_image_url, '')), '')
    )
    returning * into v_row;
  else
    update public.wefunnel_templates
    set kind = p_kind,
        title = trim(p_title),
        format_label = nullif(trim(coalesce(p_format_label, '')), ''),
        art_text = nullif(trim(coalesce(p_art_text, '')), ''),
        body = trim(p_body),
        notes = nullif(trim(coalesce(p_notes, '')), ''),
        position = coalesce(p_position, 0),
        published = coalesce(p_published, true),
        image_url = nullif(trim(coalesce(p_image_url, '')), '')
    where id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'wefunnel: no existe esa plantilla';
    end if;
  end if;

  return v_row;
end;
$$;

grant execute on function public.wefunnel_template_upsert(uuid, text, text, text, text, text, text, int, boolean, text) to authenticated;

-- La firma vieja se retira: con las dos vivas, PostgREST tendría que
-- elegir entre dos candidatas y el día que alguien llame sin image_url
-- resolvería a la antigua, que borraría el diseño sin decirlo.
drop function if exists public.wefunnel_template_upsert(uuid, text, text, text, text, text, text, int, boolean);

-- =========================================================================
-- Los diseños que vienen de casa, enganchados a sus plantillas.
--
-- Se buscan por título y no por id: los de 20261015000002 nacieron con
-- gen_random_uuid() y aquí no hay forma de saber cuáles salieron. El
-- `where image_url is null` deja intacto cualquiera que ya se haya
-- cambiado a mano desde el Superadmin.
--
-- La plantilla de la captura de pantalla no lleva diseño a propósito: lo
-- que enseña es la página del propio distribuidor, y un diseño genérico
-- sería exactamente lo contrario de lo que esa plantilla propone.
-- =========================================================================
update public.wefunnel_templates set image_url = '/wefunnels/plantillas/regalo-directo.png'
  where kind = 'post' and title = 'El regalo directo' and image_url is null;
update public.wefunnel_templates set image_url = '/wefunnels/plantillas/carrusel-portada.png'
  where kind = 'post' and title = 'Cinco láminas: el problema y la salida' and image_url is null;
update public.wefunnel_templates set image_url = '/wefunnels/plantillas/texto-plano.png'
  where kind = 'post' and title = 'Sin diseño, solo texto' and image_url is null;
update public.wefunnel_templates set image_url = '/wefunnels/plantillas/para-anuncio.png'
  where kind = 'post' and title = 'Para anuncio, con enlace directo' and image_url is null;
