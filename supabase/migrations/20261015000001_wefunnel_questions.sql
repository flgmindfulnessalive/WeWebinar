-- =========================================================================
-- Hasta tres preguntas en el formulario, y ninguna si así se quiere.
--
-- Había una sola, en question_label. La página de alguien que vende
-- formación y la de quien vende un producto físico no preguntan lo mismo
-- ni la misma cantidad, y una sola casilla obligaba a meter tres cosas en
-- una línea o a renunciar a dos.
--
-- Tres es el límite, igual que en bullets y por el mismo motivo: un
-- formulario de captación con más campos de los que caben en una pantalla
-- de móvil deja de captar. El array vacío es un estado legítimo -- pedir
-- solo nombre y contacto es una decisión, no un olvido.
--
-- question_label se queda donde está. Ya no se escribe ni se lee, pero
-- borrarla tiraría lo que alguien escribió, y entre que se despliega el
-- código y corre esta migración hay una ventana en la que el código viejo
-- todavía la busca.
-- =========================================================================
-- Ninguna vacía y ninguna kilométrica. Sin esto, un (+) pulsado sin
-- querer guardaría una etiqueta en blanco que el formulario público
-- dibujaría como un campo sin nombre.
--
-- En una función y no escrito dentro del CHECK porque un CHECK no admite
-- subconsultas, y recorrer un array sin unnest() no se puede.
create or replace function public.wefunnel_questions_ok(p_questions text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(char_length(trim(q)) between 1 and 160), true)
  from unnest(coalesce(p_questions, '{}'::text[])) q;
$$;

alter table public.wefunnel_sites
  add column questions text[] not null default '{}'::text[]
    constraint wefunnel_sites_questions_max_three
    check (coalesce(array_length(questions, 1), 0) <= 3),
  add constraint wefunnel_sites_questions_shape
    check (public.wefunnel_questions_ok(questions));

comment on column public.wefunnel_sites.questions is
  'Las preguntas abiertas del formulario, de cero a tres, en el orden en que se muestran. Sustituye a question_label.';

comment on column public.wefunnel_sites.question_label is
  'OBSOLETA desde 20261015000001. La sustituye questions. Se conserva por los datos que ya tenía; nada la lee.';

-- Lo que ya había escrito no se pierde: pasa a ser la primera pregunta.
update public.wefunnel_sites
set questions = array[trim(question_label)]
where question_label is not null
  and char_length(trim(question_label)) between 1 and 160
  and coalesce(array_length(questions, 1), 0) = 0;

-- =========================================================================
-- Las respuestas, con su pregunta al lado.
--
-- No un array de texto alineado por posición con las preguntas del sitio:
-- esas se pueden editar mañana, y entonces las respuestas de ayer
-- quedarían colgando de una pregunta que ya no es la que se hizo. Cada
-- fila guarda lo que se preguntó Y lo que se respondió, igual que
-- wefunnel_referrals guarda el touched_at real.
--
-- answer se queda: lo usa la frase que registra a quien entra al curso
-- (ver wefunnel_course_lead_stats) y lo tienen todas las filas anteriores.
-- =========================================================================
-- Lo inserta un visitante anónimo directamente, así que la forma se
-- comprueba en la base y no solo en el servidor de la aplicación. Misma
-- razón que arriba para que viva en una función.
create or replace function public.wefunnel_answers_ok(p_answers jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(p_answers) = 'array'
     and jsonb_array_length(p_answers) <= 3
     and coalesce(
           (select bool_and(coalesce(
                     jsonb_typeof(e) = 'object'
                 and jsonb_typeof(e -> 'q') = 'string'
                 and jsonb_typeof(e -> 'a') = 'string'
                 and char_length(e ->> 'q') <= 160
                 and char_length(e ->> 'a') <= 1000,
                     -- Sin este coalesce, una clave ausente hace que
                     -- jsonb_typeof devuelva NULL, la conjunción entera
                     -- valga NULL y bool_and la ignore: {"q":"..."} sin
                     -- respuesta entraba sin que nada lo parase.
                     false
                   ))
            from jsonb_array_elements(p_answers) e),
           true
         );
$$;

alter table public.wefunnel_leads
  add column answers jsonb not null default '[]'::jsonb
    constraint wefunnel_leads_answers_shape
    check (public.wefunnel_answers_ok(answers));

comment on column public.wefunnel_leads.answers is
  'Lo que se preguntó y lo que se respondió, en pares {q, a}. La pregunta viaja con la respuesta para que editar el formulario después no reescriba lo ya contestado.';

-- =========================================================================
-- La moderación mira las tres.
--
-- Reemplaza la versión de 20261007000003, que leía question_label. Sin
-- esto, mover el texto a questions habría abierto un hueco por donde pasa
-- cualquier término bloqueado: bastaba escribirlo en una pregunta.
-- =========================================================================
create or replace function public.wefunnel_matched_rules(
  p_site public.wefunnel_sites,
  p_severity text
)
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(distinct t.rule), '{}'::text[])
  from public.wefunnel_blocked_terms t
  where t.severity = p_severity
    and public.wefunnel_fold(
      concat_ws(' ',
        p_site.display_name, p_site.location, p_site.headline,
        array_to_string(p_site.questions, ' '),
        array_to_string(p_site.bullets, ' ')
      )
    ) ~ ('(^|[^a-z0-9])' || t.term || '([^a-z0-9]|$)');
$$;
