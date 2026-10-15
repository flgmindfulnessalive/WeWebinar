-- =========================================================================
-- Plantillas de contenido, solo para quien tiene licencia.
--
-- La propuesta «te regalo tu embudo gratis de por vida» funciona cuando se
-- cuenta bien, y contarla bien es trabajo de copy que un constructor no
-- tiene por qué saber hacer. Esto le da el texto hecho: qué poner en la
-- imagen, qué escribir debajo y qué decir en cámara.
--
-- Solo para distribuidores, y es lo único de Recursos que lo es. Los
-- vídeos enseñan a llevar tráfico a tu propio funnel y eso le sirve a
-- cualquiera; esto es material para repartir funnels, que es justo lo que
-- compra la licencia.
--
-- Tabla aparte de wefunnel_resources: un vídeo tiene un identificador de
-- YouTube y una duración, una plantilla tiene un texto para la imagen y
-- otro para el pie. Meterlos en la misma tabla habría dejado media docena
-- de columnas nulas en cada fila, y un `kind` que decide qué columnas
-- valen es una tabla doble escrita en una.
-- =========================================================================

create table public.wefunnel_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    constraint wefunnel_templates_kind_allowed check (kind in ('post', 'reel')),
  title text not null
    constraint wefunnel_templates_title_len check (char_length(trim(title)) between 1 and 160),
  -- «Imagen única», «Carrusel», «Reel de 30 segundos». Es lo que decide si
  -- esta plantilla sirve hoy, antes de leerse el texto entero.
  format_label text
    constraint wefunnel_templates_format_len check (format_label is null or char_length(format_label) <= 60),
  -- El texto que va encima de la imagen. Nulo en los reels, que no tienen.
  art_text text
    constraint wefunnel_templates_art_len check (art_text is null or char_length(art_text) <= 2000),
  -- Lo que se pega: el pie del post, o el guion del reel.
  body text not null
    constraint wefunnel_templates_body_len check (char_length(trim(body)) between 1 and 6000),
  -- Cómo usarla y qué cambiar. No se copia: se lee.
  notes text
    constraint wefunnel_templates_notes_len check (notes is null or char_length(notes) <= 1200),
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wefunnel_templates_order_idx
  on public.wefunnel_templates (kind, position, created_at);

create trigger set_updated_at before update on public.wefunnel_templates
  for each row execute function public.set_updated_at();

alter table public.wefunnel_templates enable row level security;

-- Con licencia, o administrador. Se mira wefunnel_distributors porque esa
-- tabla es la que dice quién pagó, y es la misma que gobierna el resto
-- del tier.
--
-- SECURITY DEFINER, como el resto de ayudantes de RLS de este esquema: si
-- la política leyera la tabla directamente, lo haría con los permisos de
-- quien llama, y entonces dependería de que wefunnel_distributors siga
-- teniendo su grant y su política de lectura propia. El día que alguien
-- las ajuste, estas plantillas desaparecerían para todo el mundo sin que
-- nada avise.
create or replace function public.wefunnel_is_distributor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.wefunnel_distributors d
    where d.account_id = public.current_account_id()
  );
$$;

grant execute on function public.wefunnel_is_distributor() to authenticated;

create policy wefunnel_templates_select on public.wefunnel_templates
  for select to authenticated
  using (
    public.is_platform_admin()
    or (published and public.wefunnel_is_distributor())
  );

-- =========================================================================
-- Altas y bajas, desde el Superadmin. Mismo criterio que los recursos: la
-- comprobación vive en la base, no en la ruta.
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
  p_published boolean
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
      (kind, title, format_label, art_text, body, notes, position, published)
    values (
      p_kind, trim(p_title),
      nullif(trim(coalesce(p_format_label, '')), ''),
      nullif(trim(coalesce(p_art_text, '')), ''),
      trim(p_body),
      nullif(trim(coalesce(p_notes, '')), ''),
      coalesce(p_position, 0), coalesce(p_published, true)
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
        published = coalesce(p_published, true)
    where id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'wefunnel: no existe esa plantilla';
    end if;
  end if;

  return v_row;
end;
$$;

create or replace function public.wefunnel_template_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;
  delete from public.wefunnel_templates where id = p_id;
end;
$$;

grant execute on function public.wefunnel_template_upsert(uuid, text, text, text, text, text, text, int, boolean) to authenticated;
grant execute on function public.wefunnel_template_delete(uuid) to authenticated;

-- =========================================================================
-- El primer juego de plantillas.
--
-- Una línea gráfica y formatos distintos, para que cinco distribuidores
-- publicando a la vez no parezcan el mismo anuncio repetido.
--
-- Tres reglas que atraviesan todo lo que hay aquí abajo, y que no son de
-- estilo:
--
--   Nada promete ingresos. Ni una cifra, ni un «mi equipo creció», ni un
--   testimonio. Lo que se regala es una herramienta, y lo que se dice es
--   lo que la herramienta hace.
--
--   Nada menciona ganar por traer gente. Las normas de Meta sobre fraude
--   prohíben ofrecer una compensación basada en reclutar a otros, y el
--   modelo tampoco paga por eso: no hay comisión sobre la licencia.
--
--   El enlace que se reparte es el de la página de regalo, /<slug>/regalo,
--   que es el único que acredita quién lo dio.
--
-- {TU_ENLACE} y {TU_NOMBRE} se sustituyen al copiar, en el panel.
-- =========================================================================

insert into public.wefunnel_templates (kind, title, format_label, art_text, body, notes, position) values

('post', 'El regalo directo', 'Imagen única · comentario a mensaje privado',
$art$ETIQUETA DE ARRIBA:
¿HACES REDES DE MERCADEO?

TITULAR:
TE REGALO TU
EMBUDO DE PROSPECCIÓN
GRATIS
DE POR VIDA

LÍNEA DE APOYO:
Prospecta. Duplica. Crece.

BOTÓN:
COMENTA GRATIS

PIE DEL BOTÓN:
Y te envío el enlace para reclamar el tuyo.$art$,
$body$¿Haces redes de mercadeo y sigues prospectando desde una lista de contactos que ya se te acabó?

Te regalo tu embudo de prospección. Gratis, de por vida, sin tarjeta y sin mensualidad.

Es una página con tu nombre y tu foto, donde la gente deja sus datos porque quiere saber de ti, no porque le escribiste primero. Trae su panel con tus registros y un curso para aprender a llevarle tráfico.

No es una prueba ni una versión recortada. Es tuyo.

Comenta GRATIS y te mando el enlace por privado.$body$,
'La del ejemplo. El comentario a privado existe porque un enlace en el pie del post tiene menos alcance: la red premia que la gente se quede. Responde rápido, que el interés dura poco.',
 0),

('post', 'Cinco láminas: el problema y la salida', 'Carrusel',
$art$LÁMINA 1
Tu lista de contactos
se acaba.
Tu negocio no debería
acabarse con ella.

LÁMINA 2
Mandar mensajes a desconocidos
no es prospectar.
Es molestar más rápido.

LÁMINA 3
Lo que cambia la conversación:
que te escriban ellos.

LÁMINA 4
Una página con tu nombre.
Tus registros.
Tu curso para llevar gente.

LÁMINA 5
Te la regalo.
Gratis de por vida.
Comenta GRATIS$art$,
$body$La lista de contactos se acaba. A todos.

Lo que viene después suele ser mandar mensajes a desconocidos, y eso no es prospectar: es molestar más rápido.

La alternativa es tener un sitio al que mandar gente, donde dejen sus datos porque quieren saber de ti. Eso es un embudo, y te lo regalo: gratis de por vida, sin tarjeta.

Viene con tu panel de registros y con el curso para aprender a llevarle tráfico con contenido y con anuncios.

Comenta GRATIS y te paso el enlace.$body$,
'El carrusel se guarda y se comparte más que la imagen suelta. Cada lámina, una idea; si una necesita dos frases para entenderse, sobra una.',
 1),

('post', 'Sin diseño, solo texto', 'Texto plano · fondo de color',
$art$(Sin imagen, o fondo liso con una sola línea)

TE REGALO TU EMBUDO.
GRATIS DE POR VIDA.$art$,
$body$Llevo tiempo viendo lo mismo: gente buena en redes de mercadeo que se queda sin a quién hablarle.

No es falta de ganas. Es que la lista de contactos tiene un final, y nadie te enseñó qué hacer después.

Lo que hay después es esto: una página tuya, con tu nombre, donde la gente te deja sus datos. Tú dejas de perseguir y empiezas a atender.

Te la doy gratis, de por vida. No hay tarjeta, no hay mensualidad y no hay letra pequeña. Viene con el panel donde ves quién se registró y con un curso para aprender a llevarle gente.

Si te sirve, comenta GRATIS y te mando el enlace.$body$,
'Para quien no quiere diseñar nada. Funciona bien en Facebook y en grupos, donde el texto largo se lee. Cambia el primer párrafo por algo tuyo y será mejor que este.',
 2),

('post', 'Lo que ve quien entra', 'Captura de pantalla',
$art$Captura de tu propia página de regalo, tal como se ve en el móvil.
Encima, una sola línea:

ESTO ES LO QUE TE REGALO.$art$,
$body$Esto es literalmente lo que recibes. Sin maquillaje.

Una página con tu nombre y tu foto, un formulario que te trae registros, el panel donde los ves y un curso para aprender a llevar gente hasta ahí.

Gratis de por vida. Sin tarjeta, sin mensualidad, sin versión de prueba que caduca.

Comenta GRATIS y te paso el tuyo.$body$,
'Enseña tu página de verdad, no un montaje. Es lo más creíble que puedes publicar y lo único que nadie puede copiarte: la tuya lleva tu cara.',
 3),

('post', 'Para anuncio, con enlace directo', 'Imagen única · tráfico pagado',
$art$ETIQUETA:
PARA REDES DE MERCADEO

TITULAR:
TU EMBUDO DE PROSPECCIÓN
GRATIS DE POR VIDA

APOYO:
Tu página. Tus registros. Tu curso.

BOTÓN:
RECLAMA EL TUYO$art$,
$body$Tu embudo de prospección, gratis de por vida.

Una página con tu nombre donde la gente deja sus datos, el panel donde los ves y el curso para aprender a llevarle tráfico.

Sin tarjeta y sin mensualidad.

Reclama el tuyo: {TU_ENLACE}$body$,
'Esta es la de pagar. En un anuncio el enlace va dentro, no en comentarios, porque quien paga quiere el clic ya. Usa el objetivo de tráfico o de clientes potenciales y manda a tu página de regalo, nunca a tu perfil.',
 4),

('reel', 'Veinte segundos: la lista se acabó', 'Reel de 20 segundos',
null,
$body$[A CÁMARA, SIN RODEOS]

Si haces redes de mercadeo, esto te va a sonar.

Empezaste por tu lista de contactos. Familia, amigos, el grupo del colegio.

Y un día se acabó.

[CAMBIO DE PLANO O TEXTO EN PANTALLA]

Lo que viene después no es mandar mensajes a desconocidos.

Es tener una página tuya a la que mandar gente, donde te dejen sus datos porque quieren saber de ti.

Te la regalo. Gratis de por vida.

Comenta GRATIS y te paso el enlace.

[TEXTO FINAL EN PANTALLA]
COMENTA GRATIS$body$,
'Los tres primeros segundos deciden si alguien se queda. Empieza con la frase, sin saludar y sin presentarte. Graba en vertical y pon subtítulos: la mayoría lo ve sin sonido.',
 0),

('reel', 'Treinta segundos: enseñando la pantalla', 'Reel de 30 segundos · grabación de pantalla',
null,
$body$[GRABACIÓN DE PANTALLA, TU VOZ ENCIMA]

Te voy a enseñar lo que regalo, y lo ves tú mismo.

[ABRE TU PÁGINA DE REGALO]

Esta es una página de WeFunnels. Lleva tu nombre, tu foto y lo que tú decidas contar.

[BAJA HASTA EL FORMULARIO]

Aquí la gente deja sus datos. Eso es un registro.

[ENTRA A TU PANEL, PESTAÑA DE REGISTROS]

Y aquí los ves. Quién entró, qué contestó, y a quién ya le escribiste.

[VUELVE A CÁMARA O TEXTO EN PANTALLA]

Es gratis de por vida. Sin tarjeta y sin mensualidad.

Comenta GRATIS y te mando el tuyo.$body$,
'El más convincente de los tres, porque no pide que te crean nada. Graba la pantalla de tu móvil con tu propia página. Tapa los datos de tus registros antes de publicar: son personas reales que no dieron permiso para salir.',
 1),

('reel', 'Cuarenta y cinco segundos: por qué lo regalo', 'Reel de 45 segundos',
null,
$body$[A CÁMARA, TONO TRANQUILO]

Me preguntan por qué regalo esto, si a mí me costó.

Te lo explico.

[PAUSA]

En redes de mercadeo todo el mundo quiere hablar contigo de su oportunidad. Nadie quiere darte algo que te sirva hoy.

Así que yo hago lo contrario.

[CAMBIO DE PLANO]

Te doy una herramienta: tu propia página de prospección, con tu nombre, para que la gente te deje sus datos en vez de que tú persigas a nadie.

Es tuya. Gratis de por vida. No tienes que comprar nada, no tienes que entrar a nada, y si nunca vuelves a hablar conmigo, te la quedas igual.

[A CÁMARA, CIERRE]

Si después quieres que hablemos, hablamos. Y si no, también.

Comenta GRATIS y te paso el enlace.$body$,
'El más largo y el que mejor filtra: quien llega al final es quien de verdad quiere la herramienta. La frase que lo sostiene es «si nunca vuelves a hablar conmigo, te la quedas igual», y es verdad, así que dila mirando a cámara.',
 2);
