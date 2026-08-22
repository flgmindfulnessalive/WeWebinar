-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.user_role as enum ('owner', 'editor', 'viewer');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'suspended', 'canceled');
create type public.webinar_status as enum ('draft', 'published', 'archived');
create type public.schedule_mode as enum ('fixed', 'just_in_time');
create type public.cta_type as enum ('link', 'poll', 'overlay');
create type public.chat_message_type as enum ('message', 'question', 'host_reply');
create type public.viewer_event_type as enum ('join', 'heartbeat', 'leave', 'cta_click', 'poll_response');
create type public.email_template_type as enum ('registration_confirmation', 'reminder', 'replay_missed');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.lead_status as enum ('new', 'contacted', 'converted', 'closed');
