-- Free-text context a host can give the AI chat agent (FAQ, prices, product
-- details) beyond the webinar's title/description/category, surfaced in the
-- wizard as "Entrena a tu agente AI".
alter table public.webinars
  add column ai_agent_training_info text;
