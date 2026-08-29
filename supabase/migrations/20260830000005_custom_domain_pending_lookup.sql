-- =========================================================================
-- Custom domains Fase 3 ("pulido"): a foreign Host header that resolves to
-- a custom_domains row which ISN'T active yet (still pending/verifying, or
-- failed) currently just falls through to a bare 404 in proxy.ts -- from
-- the visitor's side that could well be a link someone already shared
-- before DNS finished propagating. This view lets proxy.ts tell "nobody
-- claimed this hostname" (real 404) apart from "somebody claimed it, DNS
-- just isn't there yet" (a friendlier "still configuring" page), without
-- exposing which account it belongs to -- unlike custom_domain_lookup,
-- that's not needed for this message and pre-verification account
-- association is worth keeping private.
-- =========================================================================
create view public.custom_domain_pending_lookup
with (security_invoker = false)
as
select hostname, status
from public.custom_domains
where status <> 'active';

grant select on public.custom_domain_pending_lookup to anon, authenticated;
