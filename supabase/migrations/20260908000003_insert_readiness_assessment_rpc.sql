-- readiness_assessments + readiness_answers se guardan de manera
-- transaccional (lo pide el brief explicitamente): un solo RPC en vez de
-- dos inserts sueltos desde la API route, para que un fallo insertando
-- las respuestas revierta tambien el assessment en vez de dejar un
-- registro a medio guardar. security definer porque corre sin sesion de
-- usuario (llamado con el cliente service_role desde
-- /api/readiness/submit); sin grant a anon/authenticated -- por default
-- solo el owner puede ejecutarla, que es exactamente el acceso que
-- necesita.
create function public.insert_readiness_assessment(
  p_id uuid,
  p_email text,
  p_name text,
  p_business_type public.readiness_business_type,
  p_presentation_status public.readiness_presentation_status,
  p_primary_goal public.readiness_primary_goal,
  p_total_points int,
  p_score_percentage int,
  p_readiness_status public.readiness_status,
  p_weakest_category public.readiness_category,
  p_strategy_score int,
  p_presentation_score int,
  p_recording_score int,
  p_evergreen_score int,
  p_followup_score int,
  p_measurement_score int,
  p_source text,
  p_medium text,
  p_campaign text,
  p_content text,
  p_affiliate text,
  p_ref text,
  p_marketing_consent boolean,
  p_ip_hash text,
  p_started_at timestamptz,
  -- array de {question_id, category, answer, score}
  p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.readiness_assessments (
    id, email, name, business_type, presentation_status, primary_goal,
    total_points, score_percentage, readiness_status, weakest_category,
    strategy_score, presentation_score, recording_score, evergreen_score,
    followup_score, measurement_score,
    source, medium, campaign, content, affiliate, ref,
    marketing_consent, ip_hash, started_at
  ) values (
    p_id, p_email, p_name, p_business_type, p_presentation_status, p_primary_goal,
    p_total_points, p_score_percentage, p_readiness_status, p_weakest_category,
    p_strategy_score, p_presentation_score, p_recording_score, p_evergreen_score,
    p_followup_score, p_measurement_score,
    p_source, p_medium, p_campaign, p_content, p_affiliate, p_ref,
    p_marketing_consent, p_ip_hash, p_started_at
  );

  insert into public.readiness_answers (assessment_id, category, question_id, answer, score)
  select
    p_id,
    (a->>'category')::public.readiness_category,
    a->>'question_id',
    (a->>'answer')::public.readiness_answer_value,
    (a->>'score')::smallint
  from jsonb_array_elements(p_answers) as a;
end;
$$;
